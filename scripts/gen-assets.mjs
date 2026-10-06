// Generates PWA icons, favicons and the social preview (og.jpg) from src/assets/logo.webp.
// Runs automatically before `npm run dev` and `npm run build`.
import path from 'node:path';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const logoPath = path.join(root, 'src', 'assets', 'logo.webp');
const outDir = path.join(root, 'public', 'icons');
const CREAM = { r: 255, g: 248, b: 236, alpha: 1 };

async function main() {
  let sharp;
  try {
    sharp = (await import('sharp')).default;
  } catch {
    console.warn('[gen-assets] sharp is not installed — icons skipped');
    return;
  }
  await mkdir(outDir, { recursive: true });
  // the big flask is the top-centre part of the logo
  const lm = await sharp(logoPath).metadata();
  const src = await sharp(logoPath)
    .extract({ left: Math.round(lm.width * 0.322), top: 0, width: Math.round(lm.width * 0.306), height: Math.round(lm.height * 0.52) })
    .trim()
    .png()
    .toBuffer();
  const meta = await sharp(src).metadata();

  async function icon(file, size, scale, radius = 0) {
    const h = Math.round(size * scale);
    const w = Math.round((meta.width * h) / meta.height);
    const flask = await sharp(src).resize(w, h, { kernel: 'lanczos3' }).png().toBuffer();
    let img = await sharp({ create: { width: size, height: size, channels: 4, background: CREAM } })
      .composite([{ input: flask, left: Math.round((size - w) / 2), top: Math.round((size - h) / 2) }])
      .png()
      .toBuffer();
    if (radius) {
      const mask = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}"><rect width="${size}" height="${size}" rx="${radius}" ry="${radius}"/></svg>`);
      img = await sharp(img).composite([{ input: mask, blend: 'dest-in' }]).png().toBuffer();
    }
    await sharp(img).png({ compressionLevel: 9, palette: size >= 180, quality: 92, effort: 8 }).toFile(path.join(outDir, file));
  }

  await icon('icon-512.png', 512, 0.8);
  await icon('icon-192.png', 192, 0.8);
  await icon('maskable-512.png', 512, 0.6);
  await icon('apple-touch-icon.png', 180, 0.78);
  await icon('favicon-64.png', 64, 0.86, 14);
  await icon('favicon-32.png', 32, 0.9, 7);

  // social preview for WhatsApp / Telegram links
  const W = 1200;
  const H = 630;
  const bg = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
    <defs>
      <radialGradient id="g" cx="25%" cy="0%" r="110%"><stop offset="0" stop-color="#fdefcf"/><stop offset="0.55" stop-color="#fff6ea"/><stop offset="1" stop-color="#ffeedd"/></radialGradient>
      <linearGradient id="r" x1="0" x2="1"><stop offset="0" stop-color="#2f8ff8"/><stop offset="0.25" stop-color="#31bdcc"/><stop offset="0.45" stop-color="#acca46"/><stop offset="0.6" stop-color="#fda71c"/><stop offset="0.8" stop-color="#f7646c"/><stop offset="1" stop-color="#a944f8"/></linearGradient>
    </defs>
    <rect width="100%" height="100%" fill="url(#g)"/>
    <rect x="${(W - 600) / 2}" y="36" width="600" height="520" rx="46" fill="#fffefb" stroke="#ead9c6" stroke-width="2"/>
    <rect x="${(W - 420) / 2}" y="582" width="420" height="12" rx="6" fill="url(#r)"/>
  </svg>`);
  const logo = await sharp(logoPath).resize({ height: 440 }).png().toBuffer();
  const lw = (await sharp(logo).metadata()).width;
  await sharp(bg)
    .composite([{ input: logo, left: Math.round((W - lw) / 2), top: 76 }])
    .flatten({ background: '#fff6ea' })
    .jpeg({ quality: 82, progressive: true })
    .toFile(path.join(root, 'public', 'og.jpg'));
  console.log('[gen-assets] icons + og.jpg ready');
}

main().catch((e) => {
  console.warn('[gen-assets] failed, continuing without icons:', e.message);
});

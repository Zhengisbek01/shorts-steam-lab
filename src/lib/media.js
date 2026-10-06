const VIDEO_EXT = { mp4: 'video/mp4', m4v: 'video/mp4', mov: 'video/quicktime', webm: 'video/webm', '3gp': 'video/3gpp', mkv: 'video/x-matroska', avi: 'video/x-msvideo' };
const IMAGE_EXT = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', gif: 'image/gif', heic: 'image/heic', heif: 'image/heif' };

export function fileExt(file) {
  const m = /\.([a-z0-9]{1,5})$/i.exec(file?.name || '');
  return m ? m[1].toLowerCase() : '';
}

/** Ensures the File has a proper MIME type (some Android pickers return an empty type). */
export function normalizeFile(file, kind) {
  const ext = fileExt(file);
  const map = kind === 'video' ? VIDEO_EXT : IMAGE_EXT;
  if (file.type && file.type.startsWith(kind + '/')) return file;
  const type = map[ext] || (kind === 'video' ? 'video/mp4' : 'image/jpeg');
  try {
    return new File([file], file.name || `file.${ext || 'bin'}`, { type, lastModified: file.lastModified });
  } catch {
    return file;
  }
}

export function isVideoFile(file) {
  return (file?.type || '').startsWith('video/') || !!VIDEO_EXT[fileExt(file)];
}
export function isImageFile(file) {
  return (file?.type || '').startsWith('image/') || !!IMAGE_EXT[fileExt(file)];
}

function waitFor(el, event, ms) {
  return new Promise((resolve, reject) => {
    let done = false;
    const t = setTimeout(() => {
      if (!done) { done = true; cleanup(); reject(new Error('timeout:' + event)); }
    }, ms);
    const ok = () => { if (!done) { done = true; cleanup(); resolve(); } };
    const bad = () => { if (!done) { done = true; cleanup(); reject(new Error('media error')); } };
    const cleanup = () => { clearTimeout(t); el.removeEventListener(event, ok); el.removeEventListener('error', bad); };
    el.addEventListener(event, ok, { once: true });
    el.addEventListener('error', bad, { once: true });
  });
}

function frameLooksBlank(ctx, w, h) {
  try {
    const pts = [[0.25, 0.25], [0.5, 0.5], [0.75, 0.75], [0.3, 0.7], [0.7, 0.3]];
    let sum = 0;
    for (const [x, y] of pts) {
      const d = ctx.getImageData(Math.floor(w * x), Math.floor(h * y), 1, 1).data;
      sum += d[0] + d[1] + d[2] + (d[3] === 0 ? 0 : 1);
    }
    return sum < 12;
  } catch {
    return false;
  }
}

/** Reads duration / size and grabs a JPEG poster frame from a local video file. */
export async function videoMeta(file) {
  const url = URL.createObjectURL(file);
  const v = document.createElement('video');
  v.muted = true;
  v.playsInline = true;
  v.setAttribute('playsinline', '');
  v.setAttribute('muted', '');
  v.preload = 'auto';
  v.src = url;
  const out = { thumb: null, duration: null, width: 0, height: 0 };
  try {
    await waitFor(v, 'loadedmetadata', 12000);
    out.duration = isFinite(v.duration) ? v.duration : null;
    out.width = v.videoWidth;
    out.height = v.videoHeight;
    const t = out.duration ? Math.min(1.2, out.duration * 0.25) : 0.3;
    try {
      v.currentTime = t;
      await waitFor(v, 'seeked', 8000);
    } catch { /* keep going with whatever frame is available */ }
    if (v.readyState < 2) await waitFor(v, 'loadeddata', 5000).catch(() => {});
    if (out.width && out.height) {
      const scale = Math.min(1, 720 / Math.max(out.width, out.height));
      const c = document.createElement('canvas');
      c.width = Math.round(out.width * scale);
      c.height = Math.round(out.height * scale);
      const ctx = c.getContext('2d', { willReadFrequently: true });
      ctx.drawImage(v, 0, 0, c.width, c.height);
      if (frameLooksBlank(ctx, c.width, c.height)) {
        // iOS sometimes needs a play() before frames are decoded
        await v.play().catch(() => {});
        await new Promise((r) => setTimeout(r, 350));
        v.pause();
        ctx.drawImage(v, 0, 0, c.width, c.height);
      }
      out.thumb = await new Promise((r) => c.toBlob(r, 'image/jpeg', 0.8));
    }
  } catch {
    /* metadata unavailable (e.g. codec unsupported in this browser) – upload still works */
  } finally {
    v.removeAttribute('src');
    try { v.load(); } catch { /* noop */ }
    URL.revokeObjectURL(url);
  }
  return out;
}

async function loadBitmap(file) {
  if (typeof createImageBitmap === 'function') {
    try {
      return await createImageBitmap(file);
    } catch { /* fall back */ }
  }
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.decoding = 'async';
    img.src = url;
    await img.decode();
    return img;
  } finally {
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}

/** Downscales a photo to max side `maxSide` and re-encodes as JPEG. */
export async function compressImage(file, maxSide = 1600, quality = 0.85) {
  try {
    const bmp = await loadBitmap(file);
    const w = bmp.width;
    const h = bmp.height;
    const scale = Math.min(1, maxSide / Math.max(w, h));
    const c = document.createElement('canvas');
    c.width = Math.round(w * scale);
    c.height = Math.round(h * scale);
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, c.width, c.height);
    ctx.drawImage(bmp, 0, 0, c.width, c.height);
    const blob = await new Promise((r) => c.toBlob(r, 'image/jpeg', quality));
    if (!blob) return file;
    return new File([blob], (file.name || 'image').replace(/\.[^.]+$/, '') + '.jpg', { type: 'image/jpeg' });
  } catch {
    return file;
  }
}

export const ytThumb = (id) => `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;

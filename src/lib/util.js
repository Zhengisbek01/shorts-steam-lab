export const MONTHS = [
  'қаңтар', 'ақпан', 'наурыз', 'сәуір', 'мамыр', 'маусым',
  'шілде', 'тамыз', 'қыркүйек', 'қазан', 'қараша', 'желтоқсан',
];

export function formatDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  const sameYear = d.getFullYear() === new Date().getFullYear();
  return `${d.getDate()} ${MONTHS[d.getMonth()]}${sameYear ? '' : ' ' + d.getFullYear()}`;
}

export function timeAgo(iso) {
  if (!iso) return '';
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return 'жаңа ғана';
  if (diff < 3600) return `${Math.floor(diff / 60)} мин бұрын`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} сағ бұрын`;
  if (diff < 172800) return 'кеше';
  if (diff < 604800) return `${Math.floor(diff / 86400)} күн бұрын`;
  return formatDate(iso);
}

export function fmtDuration(sec) {
  if (sec == null || !isFinite(sec)) return '';
  const total = Math.max(0, Math.round(sec));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function initials(name = '') {
  const parts = String(name).trim().split(/\s+/).filter(Boolean).slice(0, 2);
  return parts.map((p) => p[0]).join('').toUpperCase() || '?';
}

export function uid() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

export function parseYouTube(input = '') {
  const s = String(input).trim();
  const m = s.match(
    /(?:youtube\.com\/(?:shorts\/|watch\?(?:[^#]*&)?v=|embed\/|live\/|v\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/
  );
  if (m) return m[1];
  if (/^[A-Za-z0-9_-]{11}$/.test(s)) return s;
  return null;
}

export function isUrl(s = '') {
  return /^https?:\/\/\S+\.\S+/i.test(String(s).trim());
}

export function fmtBytes(n) {
  if (!n && n !== 0) return '';
  if (n < 1024 * 1024) return `${Math.max(1, Math.round(n / 1024))} КБ`;
  return `${(n / 1024 / 1024).toFixed(1)} МБ`;
}

export function clamp(n, a, b) {
  return Math.min(b, Math.max(a, n));
}

const AVATAR_GRADIENTS = [
  ['#FF8BC4', '#FFB35C'],
  ['#5EC3F7', '#7C7CFF'],
  ['#7FDB8A', '#2FC4B2'],
  ['#FFB35C', '#FF6F7A'],
  ['#B78CFF', '#FF8BC4'],
  ['#FFD45C', '#FF9A3D'],
];
export function avatarGradient(seed = '') {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  const [a, b] = AVATAR_GRADIENTS[h % AVATAR_GRADIENTS.length];
  return `linear-gradient(135deg, ${a}, ${b})`;
}

/** Human-friendly Kazakh error text for API / network errors. */
export function errText(e) {
  const raw = (e && (e.message || e.error_description || e.msg || String(e))) || '';
  const m = raw.toLowerCase();
  const code = e && (e.code || e.error_code);
  if (m.includes('invalid login credentials')) return 'Email немесе құпия сөз қате.';
  if (m.includes('user already registered') || m.includes('already been registered') || code === 'user_already_exists')
    return 'Бұл email бұрын тіркелген. «Кіру» батырмасын басыңыз.';
  if (m.includes('email not confirmed')) return 'Email расталмаған. Поштаңыздағы хатты ашыңыз немесе әкімшіге хабарласыңыз.';
  if (m.includes('password should be') || m.includes('weak_password') || code === 'weak_password')
    return 'Құпия сөз кемінде 6 таңбадан тұруы керек.';
  if (m.includes('unable to validate email') || m.includes('invalid email') || code === 'email_address_invalid')
    return 'Email дұрыс емес.';
  if (m.includes('email_address_not_authorized') || m.includes('not authorized'))
    return 'Поштаға хат жіберу мүмкін болмады. Мектеп әкімшісіне хабарласыңыз.';
  if (m.includes('rate limit') || m.includes('too many') || code === 'over_email_send_rate_limit')
    return 'Тым көп әрекет. Біраз уақыттан кейін қайталап көріңіз.';
  if (m.includes('blocked')) return 'Аккаунтыңыз уақытша бұғатталған. Әкімшіге хабарласыңыз.';
  if (m.includes('row-level security') || m.includes('permission denied') || m.includes('forbidden'))
    return 'Бұл әрекетке рұқсат жоқ.';
  if (m.includes('last_admin')) return 'Кемінде бір әкімші қалуы керек.';
  if (m.includes('self')) return 'Бұл әрекетті өзіңізге қолдануға болмайды.';
  if (m.includes('payload too large') || m.includes('maximum allowed size') || m.includes('exceeded the maximum'))
    return 'Файл тым үлкен.';
  if (m.includes('mime type') || m.includes('invalid_mime_type')) return 'Бұл файл түріне рұқсат жоқ.';
  if (m.includes('failed to fetch') || m.includes('network') || m.includes('load failed'))
    return 'Интернет байланысын тексеріңіз.';
  if (m.includes('quota') || m.includes('quotaexceeded')) return 'Браузер жадында орын жоқ.';
  return raw ? `Қате: ${raw}` : 'Қате орын алды. Қайталап көріңіз.';
}

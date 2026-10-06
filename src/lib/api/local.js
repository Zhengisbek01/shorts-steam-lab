// DEMO adapter: same interface as the Supabase adapter, data lives in this browser only
// (localStorage for records, IndexedDB for video/image files).
import { uid } from '../util.js';
import { fileExt } from '../media.js';
import { idbPut, idbGet, idbDel } from '../idb.js';
import { groupReports } from './supabase.js';

const K = {
  users: 'ssl_demo_users',
  posts: 'ssl_demo_posts',
  likes: 'ssl_demo_likes',
  reports: 'ssl_demo_reports',
  ann: 'ssl_demo_ann',
  session: 'ssl_demo_session',
  seeded: 'ssl_demo_seeded_v1',
};

const read = (k, def) => {
  try {
    const v = JSON.parse(localStorage.getItem(k));
    return v ?? def;
  } catch {
    return def;
  }
};
const write = (k, v) => localStorage.setItem(k, JSON.stringify(v));
const wait = (ms = 80) => new Promise((r) => setTimeout(r, ms));
const now = () => new Date().toISOString();
const ago = (h) => new Date(Date.now() - h * 3600 * 1000).toISOString();

async function hash(email, password) {
  const text = `${String(email).toLowerCase()}:${password}`;
  if (window.crypto?.subtle) {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
    return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
  }
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  return 'fnv' + (h >>> 0).toString(16);
}

function err(message, code) {
  const e = new Error(message);
  if (code) e.code = code;
  return e;
}

async function seed() {
  if (localStorage.getItem(K.seeded)) return;
  const admin = { id: uid(), email: 'admin@demo.kz', full_name: 'Демо Әкімші', subject: 'Әкімшілік', role: 'admin', is_blocked: false, created_at: ago(240), pass: await hash('admin@demo.kz', 'demo123') };
  const t1 = { id: uid(), email: 'aigerim@demo.kz', full_name: 'Айгерім Нұрланқызы', subject: 'Физика', role: 'teacher', is_blocked: false, created_at: ago(200), pass: await hash('aigerim@demo.kz', 'demo123') };
  const t2 = { id: uid(), email: 'erlan@demo.kz', full_name: 'Ерлан Сапарұлы', subject: 'Информатика', role: 'teacher', is_blocked: false, created_at: ago(150), pass: await hash('erlan@demo.kz', 'demo123') };
  const t3 = { id: uid(), email: 'dinara@demo.kz', full_name: 'Динара Қайратқызы', subject: 'Бейнелеу өнері', role: 'teacher', is_blocked: false, created_at: ago(90), pass: await hash('dinara@demo.kz', 'demo123') };
  const p = (author, section, title, description, h, extra = {}) => ({
    id: uid(), author_id: author.id, title, description, section, subject: author.subject, grade: '', kind: 'text',
    video_path: null, thumb_path: null, image_path: null, youtube_id: null, external_url: null, duration: null,
    is_lab: false, likes_count: 0, created_at: ago(h), ...extra,
  });
  const posts = [
    p(admin, 'science', 'Түсті сүт тәжірибесі', 'Сүт, тағамдық бояу және жуғыш зат арқылы беттік керілуді көрсетеміз. 5–7-сыныптарға арналған 3 минуттық тәжірибе.', 120, { is_lab: true, subject: 'Химия', likes_count: 4 }),
    p(admin, 'technology', 'Scratch-та 5 минуттық ойын', 'Оқушылар кейіпкерді пернетақтамен басқаратын қарапайым ойын құрастырады. Алгоритм ұғымын бекітуге ыңғайлы.', 100, { is_lab: true, subject: 'Информатика', likes_count: 2 }),
    p(admin, 'engineering', 'Қағаз көпір сынағы', 'А4 қағаздан көпір жасап, қанша тиын көтеретінін тексереміз. Командалық жарыс түрінде өткізуге болады.', 80, { is_lab: true, subject: 'Технология', likes_count: 3 }),
    p(admin, 'art', 'Табиғи бояулар', 'Қызылша, куркума және шпинаттан бояу жасап, сурет саламыз. Химия мен өнерді біріктіретін сабақ.', 60, { is_lab: true, subject: 'Бейнелеу өнері', likes_count: 1 }),
    p(admin, 'math', 'Оригамидегі геометрия', 'Қағазды бүктеу арқылы симметрия, бұрыштар және ұқсас үшбұрыштарды үйренеміз.', 40, { is_lab: true, subject: 'Геометрия', likes_count: 5 }),
    p(t1, 'science', 'Лава шамы — тығыздық туралы', 'Су, май және көпіршік таблетка арқылы тығыздық пен газ бөлінуін түсіндірдім. Оқушыларға қатты ұнады!', 30, { grade: '7', likes_count: 6 }),
    p(t2, 'technology', 'Micro:bit-пен қадам санағыш', 'Акселерометрді қолданып, қадам санайтын құрылғы жасадық. Сабақ 40 минутқа жетеді.', 20, { grade: '8', likes_count: 3 }),
    p(t3, 'art', 'Граттаж техникасы', 'Балауыз бен тушь арқылы сызып салатын сурет. 3-сыныппен өткіздім, нәтижесі керемет.', 8, { grade: '3', likes_count: 2 }),
  ];
  write(K.users, [admin, t1, t2, t3]);
  write(K.posts, posts);
  write(K.likes, []);
  write(K.reports, []);
  write(K.ann, [
    { id: 2, title: 'Үздік STEAM-идея байқауы', body: 'Ай соңына дейін сабақта қолданған ең қызықты идеяңызды жүктеңіз. Үздік үш жұмыс мектеп сайтында жарияланады.', author_id: admin.id, created_at: ago(26) },
    { id: 1, title: 'Платформаға қош келдіңіз!', body: 'Shorts STEAM Lab іске қосылды. Сабақтағы сәтті әдістеріңізді бейнеге түсіріп, әріптестеріңізбен бөлісіңіз.', author_id: admin.id, created_at: ago(230) },
  ]);
  localStorage.setItem(K.seeded, '1');
}

export function createLocalApi() {
  const listeners = new Set();
  const urlCache = new Map();
  const emit = (event, session) => listeners.forEach((cb) => cb(event, session));
  const users = () => read(K.users, []);
  const posts = () => read(K.posts, []);
  const currentUser = () => {
    const s = read(K.session, null);
    return s ? users().find((u) => u.id === s.userId) || null : null;
  };
  const requireUser = () => {
    const u = currentUser();
    if (!u) throw err('Сессия аяқталды. Қайта кіріңіз.');
    return u;
  };
  const requireAdmin = () => {
    const u = requireUser();
    if (u.role !== 'admin') throw err('forbidden');
    return u;
  };
  const publicProfile = (u) =>
    u ? { id: u.id, full_name: u.full_name, subject: u.subject, role: u.role, is_blocked: u.is_blocked, posts_count: posts().filter((p) => p.author_id === u.id).length, created_at: u.created_at } : null;
  const withAuthor = (p) => {
    const a = users().find((u) => u.id === p.author_id);
    return { ...p, author: a ? { id: a.id, full_name: a.full_name, subject: a.subject, role: a.role } : null };
  };
  const ready = seed();

  return {
    mode: 'local',

    // ---------- auth ----------
    async getSession() {
      await ready;
      const u = currentUser();
      return u ? { userId: u.id, email: u.email } : null;
    },
    onAuthChange(cb) {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    async signUp({ email, password, fullName, subject }) {
      await ready;
      await wait();
      email = String(email).trim().toLowerCase();
      if (!/^\S+@\S+\.\S+$/.test(email)) throw err('Unable to validate email address: invalid format');
      if (String(password).length < 6) throw err('Password should be at least 6 characters', 'weak_password');
      const list = users();
      if (list.some((u) => u.email === email)) throw err('User already registered', 'user_already_exists');
      const u = {
        id: uid(), email, full_name: fullName || email.split('@')[0], subject: subject || '',
        role: list.some((x) => x.role === 'admin') ? 'teacher' : 'admin', is_blocked: false,
        created_at: now(), pass: await hash(email, password),
      };
      write(K.users, [...list, u]);
      write(K.session, { userId: u.id });
      emit('SIGNED_IN', { userId: u.id, email: u.email });
      return { needsConfirm: false };
    },
    async signIn({ email, password }) {
      await ready;
      await wait();
      email = String(email).trim().toLowerCase();
      const u = users().find((x) => x.email === email);
      if (!u || u.pass !== (await hash(email, password))) throw err('Invalid login credentials');
      write(K.session, { userId: u.id });
      emit('SIGNED_IN', { userId: u.id, email: u.email });
    },
    async signOut() {
      localStorage.removeItem(K.session);
      emit('SIGNED_OUT', null);
    },
    async resetPassword() {
      throw err('Демо режимде поштаға хат жіберілмейді. Әкімші «Қолданушылар» бөлімінде жаңа құпия сөз бере алады.');
    },
    async updatePassword(password) {
      const u = requireUser();
      if (String(password).length < 6) throw err('Password should be at least 6 characters', 'weak_password');
      const pass = await hash(u.email, password);
      write(K.users, users().map((x) => (x.id === u.id ? { ...x, pass } : x)));
    },

    // ---------- profile ----------
    async getMyProfile(session) {
      await ready;
      const u = users().find((x) => x.id === session.userId);
      if (!u) throw err('Аккаунт табылмады');
      return { ...publicProfile(u), email: u.email };
    },
    async updateMyProfile(id, { full_name, subject }) {
      await wait();
      write(K.users, users().map((x) => (x.id === id ? { ...x, full_name, subject } : x)));
      return publicProfile(users().find((x) => x.id === id));
    },

    // ---------- posts ----------
    async listPosts({ lab, section, authorId, search, before, limit = 24 } = {}) {
      await ready;
      await wait(60);
      const s = String(search || '').trim().toLowerCase();
      return posts()
        .filter((p) => (lab === true ? p.is_lab : lab === false ? !p.is_lab : true))
        .filter((p) => !section || p.section === section)
        .filter((p) => !authorId || p.author_id === authorId)
        .filter((p) => !before || p.created_at < before)
        .filter((p) => !s || [p.title, p.description, p.subject].some((f) => (f || '').toLowerCase().includes(s)))
        .sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
        .slice(0, limit)
        .map(withAuthor);
    },
    async getPost(id) {
      await ready;
      const p = posts().find((x) => x.id === id);
      return p ? withAuthor(p) : null;
    },
    async sectionCounts(lab) {
      await ready;
      const out = {};
      posts().filter((p) => !!p.is_lab === !!lab).forEach((p) => { out[p.section] = (out[p.section] || 0) + 1; });
      return out;
    },
    async createPost({ fields, file, thumb, onProgress }) {
      const u = requireUser();
      if (u.is_blocked) throw err('blocked');
      const id = uid();
      let video_path = null;
      let thumb_path = null;
      let image_path = null;
      const fakeProgress = async () => {
        for (let i = 1; i <= 10; i++) {
          await wait(45);
          onProgress?.(i / 10);
        }
      };
      try {
        if (fields.kind === 'video') {
          video_path = `${u.id}/${id}.${fileExt(file) || 'mp4'}`;
          await idbPut(video_path, file);
          await fakeProgress();
          if (thumb) {
            thumb_path = `${u.id}/${id}_thumb.jpg`;
            await idbPut(thumb_path, thumb);
          }
        } else if (fields.kind === 'image') {
          image_path = `${u.id}/${id}.${fileExt(file) || 'jpg'}`;
          await idbPut(image_path, file);
          await fakeProgress();
        }
      } catch (e) {
        throw err(e?.name === 'QuotaExceededError' ? 'QuotaExceeded' : e?.message || 'Файлды сақтау мүмкін болмады');
      }
      const post = {
        id, author_id: u.id, title: fields.title, description: fields.description || '', section: fields.section,
        subject: fields.subject || '', grade: fields.grade || '', kind: fields.kind, video_path, thumb_path, image_path,
        youtube_id: fields.youtube_id || null, external_url: fields.external_url || null, duration: fields.duration || null,
        is_lab: u.role === 'admin' ? !!fields.is_lab : false, likes_count: 0, created_at: now(),
      };
      write(K.posts, [post, ...posts()]);
      return withAuthor(post);
    },
    async updatePost(id, { title, description, section, subject, grade }) {
      const u = requireUser();
      const p = posts().find((x) => x.id === id);
      if (!p || (p.author_id !== u.id && u.role !== 'admin')) throw err('forbidden');
      const next = { ...p, title, description, section, subject, grade };
      write(K.posts, posts().map((x) => (x.id === id ? next : x)));
      return withAuthor(next);
    },
    async deletePost(post) {
      const u = requireUser();
      const p = posts().find((x) => x.id === post.id);
      if (!p || (p.author_id !== u.id && u.role !== 'admin')) throw err('forbidden');
      write(K.posts, posts().filter((x) => x.id !== post.id));
      write(K.likes, read(K.likes, []).filter((l) => l.post_id !== post.id));
      write(K.reports, read(K.reports, []).filter((r) => r.post_id !== post.id));
      [p.video_path, p.thumb_path, p.image_path].filter(Boolean).forEach((k) => idbDel(k).catch(() => {}));
    },
    async setPostLab(id, lab) {
      requireAdmin();
      write(K.posts, posts().map((x) => (x.id === id ? { ...x, is_lab: !!lab } : x)));
    },
    mediaUrl(path) {
      if (!path) return '';
      if (urlCache.has(path)) return urlCache.get(path);
      const pr = idbGet(path).then((blob) => (blob ? URL.createObjectURL(blob) : ''));
      urlCache.set(path, pr);
      return pr;
    },

    // ---------- likes ----------
    async myLikes(userId) {
      return new Set(read(K.likes, []).filter((l) => l.user_id === userId).map((l) => l.post_id));
    },
    async setLike(postId, userId, liked) {
      const likes = read(K.likes, []);
      const has = likes.some((l) => l.user_id === userId && l.post_id === postId);
      if (liked && !has) likes.push({ user_id: userId, post_id: postId, created_at: now() });
      const next = liked ? likes : likes.filter((l) => !(l.user_id === userId && l.post_id === postId));
      write(K.likes, next);
      const delta = liked && !has ? 1 : !liked && has ? -1 : 0;
      if (delta) {
        write(K.posts, posts().map((p) => (p.id === postId ? { ...p, likes_count: Math.max(0, (p.likes_count || 0) + delta) } : p)));
      }
    },

    // ---------- reports ----------
    async reportPost(postId, userId, reason) {
      const list = read(K.reports, []);
      if (list.some((r) => r.post_id === postId && r.user_id === userId)) return { duplicate: true };
      list.push({ id: Date.now(), post_id: postId, user_id: userId, reason, status: 'pending', created_at: now() });
      write(K.reports, list);
      return { duplicate: false };
    },
    async listReports() {
      requireAdmin();
      const us = users();
      const rows = read(K.reports, [])
        .filter((r) => r.status === 'pending')
        .sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
        .map((r) => {
          const p = posts().find((x) => x.id === r.post_id);
          return { ...r, reporter: { full_name: us.find((u) => u.id === r.user_id)?.full_name || '' }, post: p ? withAuthor(p) : null };
        });
      return groupReports(rows);
    },
    async resolveReports(postId) {
      requireAdmin();
      write(K.reports, read(K.reports, []).map((r) => (r.post_id === postId ? { ...r, status: 'resolved' } : r)));
    },

    // ---------- announcements ----------
    async listAnnouncements() {
      await ready;
      const us = users();
      return read(K.ann, [])
        .sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
        .map((a) => ({ ...a, author: { full_name: us.find((u) => u.id === a.author_id)?.full_name || '' } }));
    },
    async createAnnouncement({ title, body }, userId) {
      requireAdmin();
      const list = read(K.ann, []);
      const a = { id: Date.now(), title, body, author_id: userId, created_at: now() };
      write(K.ann, [a, ...list]);
      return a;
    },
    async deleteAnnouncement(id) {
      requireAdmin();
      write(K.ann, read(K.ann, []).filter((a) => a.id !== id));
    },
    async countSince(sinceIso) {
      await ready;
      const since = sinceIso || '1970-01-01T00:00:00Z';
      return read(K.ann, []).filter((a) => a.created_at > since).length + posts().filter((p) => p.is_lab && p.created_at > since).length;
    },

    // ---------- admin ----------
    async adminStats() {
      requireAdmin();
      await wait(60);
      const reports = read(K.reports, []).filter((r) => r.status === 'pending');
      return {
        users: users().length,
        posts: posts().length,
        lab_posts: posts().filter((p) => p.is_lab).length,
        pending_reports: new Set(reports.map((r) => r.post_id)).size,
        announcements: read(K.ann, []).length,
      };
    },
    async listUsers() {
      requireAdmin();
      await wait(60);
      const ps = posts();
      return users()
        .map((u) => ({
          id: u.id, email: u.email, full_name: u.full_name, subject: u.subject, role: u.role, is_blocked: u.is_blocked,
          posts_count: ps.filter((p) => p.author_id === u.id).length,
          likes_received: ps.filter((p) => p.author_id === u.id).reduce((s, p) => s + (p.likes_count || 0), 0),
          created_at: u.created_at,
        }))
        .sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
    },
    async setUserRole(id, role) {
      requireAdmin();
      const list = users();
      const admins = list.filter((u) => u.role === 'admin');
      if (role === 'teacher' && admins.length <= 1 && admins[0]?.id === id) throw err('last_admin');
      write(K.users, list.map((u) => (u.id === id ? { ...u, role } : u)));
    },
    async setUserBlocked(id, blocked) {
      const me = requireAdmin();
      if (me.id === id) throw err('self');
      write(K.users, users().map((u) => (u.id === id ? { ...u, is_blocked: !!blocked } : u)));
    },
    async resetUserPassword(id, password) {
      requireAdmin();
      if (String(password).length < 6) throw err('weak_password', 'weak_password');
      const list = users();
      const target = list.find((u) => u.id === id);
      if (!target) throw err('Аккаунт табылмады');
      const pass = await hash(target.email, password);
      write(K.users, list.map((u) => (u.id === id ? { ...u, pass } : u)));
    },
    async deleteUser(id) {
      const me = requireAdmin();
      if (me.id === id) throw err('self');
      const theirPosts = posts().filter((p) => p.author_id === id);
      theirPosts.forEach((p) => [p.video_path, p.thumb_path, p.image_path].filter(Boolean).forEach((k) => idbDel(k).catch(() => {})));
      write(K.posts, posts().filter((p) => p.author_id !== id));
      write(K.likes, read(K.likes, []).filter((l) => l.user_id !== id));
      write(K.reports, read(K.reports, []).filter((r) => r.user_id !== id));
      write(K.users, users().filter((u) => u.id !== id));
    },
  };
}

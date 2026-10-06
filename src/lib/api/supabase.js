import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_KEY } from '../config.js';
import { uid } from '../util.js';
import { fileExt } from '../media.js';

const BUCKET = 'media';

export const POST_FIELDS =
  'id, author_id, title, description, section, subject, grade, kind, video_path, thumb_path, image_path, youtube_id, external_url, duration, is_lab, likes_count, created_at';
const POST_COLS = `${POST_FIELDS}, author:profiles!posts_author_id_fkey(id, full_name, subject, role)`;
const PROFILE_COLS = 'id, full_name, subject, role, is_blocked, posts_count, created_at';

function must({ data, error }) {
  if (error) throw error;
  return data;
}

function cleanSearch(s) {
  return String(s || '').replace(/[%,()*\\"'.:]/g, ' ').replace(/\s+/g, ' ').trim();
}

export function createSupabaseApi({ url = SUPABASE_URL, key = SUPABASE_KEY, options } = {}) {
  const sb = createClient(url, key, options || {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
  });

  const toSession = (s) => (s ? { userId: s.user.id, email: s.user.email } : null);

  async function accessToken() {
    const { data } = await sb.auth.getSession();
    if (!data.session) throw new Error('Сессия аяқталды. Қайта кіріңіз.');
    return data.session.access_token;
  }

  function uploadWithProgress(path, file, onProgress) {
    return accessToken().then(
      (token) =>
        new Promise((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.open('POST', `${url}/storage/v1/object/${BUCKET}/${path}`);
          xhr.setRequestHeader('Authorization', `Bearer ${token}`);
          xhr.setRequestHeader('apikey', key);
          xhr.setRequestHeader('x-upsert', 'false');
          xhr.upload.onprogress = (e) => {
            if (e.lengthComputable && onProgress) onProgress(e.loaded / e.total);
          };
          xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) return resolve();
            let msg = `HTTP ${xhr.status}`;
            try {
              const j = JSON.parse(xhr.responseText);
              msg = j.message || j.error || msg;
            } catch { /* not json */ }
            if (xhr.status === 413) msg = 'Payload too large';
            reject(new Error(msg));
          };
          xhr.onerror = () => reject(new Error('Network error'));
          const fd = new FormData();
          fd.append('cacheControl', '31536000');
          fd.append('', file);
          xhr.send(fd);
        })
    );
  }

  return {
    mode: 'supabase',

    // ---------- auth ----------
    async getSession() {
      const { data } = await sb.auth.getSession();
      return toSession(data.session);
    },
    onAuthChange(cb) {
      const { data } = sb.auth.onAuthStateChange((event, session) => cb(event, toSession(session)));
      return () => data.subscription.unsubscribe();
    },
    async signUp({ email, password, fullName, subject }) {
      const data = must(
        await sb.auth.signUp({
          email,
          password,
          options: { data: { full_name: fullName, subject }, emailRedirectTo: window.location.origin },
        })
      );
      if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
        throw new Error('User already registered');
      }
      return { needsConfirm: !data.session };
    },
    async signIn({ email, password }) {
      must(await sb.auth.signInWithPassword({ email, password }));
    },
    async signOut() {
      await sb.auth.signOut();
    },
    async resetPassword(email) {
      must(await sb.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin + '/' }));
    },
    async updatePassword(password) {
      must(await sb.auth.updateUser({ password }));
    },

    // ---------- profile ----------
    async getMyProfile(session) {
      let row = must(await sb.from('profiles').select(PROFILE_COLS).eq('id', session.userId).maybeSingle());
      if (!row) {
        const { data: u } = await sb.auth.getUser();
        const md = u?.user?.user_metadata || {};
        const ins = await sb
          .from('profiles')
          .insert({ id: session.userId, full_name: md.full_name || '', subject: md.subject || '' })
          .select(PROFILE_COLS)
          .single();
        if (ins.error) {
          row = must(await sb.from('profiles').select(PROFILE_COLS).eq('id', session.userId).maybeSingle());
          if (!row) throw ins.error;
        } else row = ins.data;
      }
      return { ...row, email: session.email };
    },
    async updateMyProfile(id, { full_name, subject }) {
      return must(
        await sb.from('profiles').update({ full_name, subject }).eq('id', id).select(PROFILE_COLS).single()
      );
    },

    // ---------- posts ----------
    async listPosts({ lab, section, authorId, search, before, limit = 24 } = {}) {
      let q = sb.from('posts').select(POST_COLS).order('created_at', { ascending: false }).limit(limit);
      if (lab === true) q = q.eq('is_lab', true);
      if (lab === false) q = q.eq('is_lab', false);
      if (section) q = q.eq('section', section);
      if (authorId) q = q.eq('author_id', authorId);
      if (before) q = q.lt('created_at', before);
      const s = cleanSearch(search);
      if (s) q = q.or(`title.ilike.%${s}%,description.ilike.%${s}%,subject.ilike.%${s}%`);
      return must(await q);
    },
    async getPost(id) {
      return must(await sb.from('posts').select(POST_COLS).eq('id', id).maybeSingle());
    },
    async sectionCounts(lab) {
      const rows = must(await sb.from('posts').select('section').eq('is_lab', !!lab).limit(5000));
      const out = {};
      rows.forEach((r) => { out[r.section] = (out[r.section] || 0) + 1; });
      return out;
    },
    async createPost({ userId, fields, file, thumb, onProgress }) {
      const id = uid();
      const paths = [];
      let video_path = null;
      let thumb_path = null;
      let image_path = null;
      try {
        if (fields.kind === 'video') {
          video_path = `${userId}/${id}.${fileExt(file) || 'mp4'}`;
          await uploadWithProgress(video_path, file, onProgress);
          paths.push(video_path);
          if (thumb) {
            thumb_path = `${userId}/${id}_thumb.jpg`;
            const r = await sb.storage.from(BUCKET).upload(thumb_path, thumb, { contentType: 'image/jpeg', cacheControl: '31536000' });
            if (r.error) thumb_path = null;
            else paths.push(thumb_path);
          }
        } else if (fields.kind === 'image') {
          image_path = `${userId}/${id}.${fileExt(file) || 'jpg'}`;
          await uploadWithProgress(image_path, file, onProgress);
          paths.push(image_path);
        }
        const row = {
          id,
          author_id: userId,
          title: fields.title,
          description: fields.description || '',
          section: fields.section,
          subject: fields.subject || '',
          grade: fields.grade || '',
          kind: fields.kind,
          video_path,
          thumb_path,
          image_path,
          youtube_id: fields.youtube_id || null,
          external_url: fields.external_url || null,
          duration: fields.duration || null,
          is_lab: !!fields.is_lab,
        };
        return must(await sb.from('posts').insert(row).select(POST_COLS).single());
      } catch (e) {
        if (paths.length) await sb.storage.from(BUCKET).remove(paths).catch(() => {});
        throw e;
      }
    },
    async updatePost(id, { title, description, section, subject, grade }) {
      const rows = must(
        await sb.from('posts').update({ title, description, section, subject, grade }).eq('id', id).select(POST_COLS)
      );
      if (!rows.length) throw new Error('forbidden');
      return rows[0];
    },
    async deletePost(post) {
      const rows = must(await sb.from('posts').delete().eq('id', post.id).select('id'));
      if (!rows.length) throw new Error('forbidden');
      const paths = [post.video_path, post.thumb_path, post.image_path].filter(Boolean);
      if (paths.length) await sb.storage.from(BUCKET).remove(paths).catch(() => {});
    },
    async setPostLab(id, lab) {
      must(await sb.rpc('admin_set_post_lab', { target: id, lab }));
    },
    mediaUrl(path) {
      if (!path) return '';
      return `${url}/storage/v1/object/public/${BUCKET}/${path}`;
    },

    // ---------- likes ----------
    async myLikes(userId) {
      const rows = must(await sb.from('likes').select('post_id').eq('user_id', userId).limit(10000));
      return new Set(rows.map((r) => r.post_id));
    },
    async setLike(postId, userId, liked) {
      if (liked) {
        const { error } = await sb.from('likes').insert({ post_id: postId, user_id: userId });
        if (error && error.code !== '23505') throw error;
      } else {
        must(await sb.from('likes').delete().eq('post_id', postId).eq('user_id', userId));
      }
    },

    // ---------- reports / moderation ----------
    async reportPost(postId, userId, reason) {
      const { error } = await sb.from('reports').insert({ post_id: postId, user_id: userId, reason });
      if (error && error.code === '23505') return { duplicate: true };
      if (error) throw error;
      return { duplicate: false };
    },
    async listReports() {
      const rows = must(
        await sb
          .from('reports')
          .select(`id, reason, status, created_at, post_id, reporter:profiles!reports_user_id_fkey(full_name), post:posts(${POST_COLS})`)
          .eq('status', 'pending')
          .order('created_at', { ascending: false })
          .limit(500)
      );
      return groupReports(rows);
    },
    async resolveReports(postId) {
      must(await sb.from('reports').update({ status: 'resolved' }).eq('post_id', postId).eq('status', 'pending'));
    },

    // ---------- announcements ----------
    async listAnnouncements() {
      return must(
        await sb
          .from('announcements')
          .select('id, title, body, created_at, author:profiles(full_name)')
          .order('created_at', { ascending: false })
          .limit(100)
      );
    },
    async createAnnouncement({ title, body }, userId) {
      return must(
        await sb.from('announcements').insert({ title, body, author_id: userId }).select('id, title, body, created_at').single()
      );
    },
    async deleteAnnouncement(id) {
      const rows = must(await sb.from('announcements').delete().eq('id', id).select('id'));
      if (!rows.length) throw new Error('forbidden');
    },
    async countSince(sinceIso) {
      const since = sinceIso || '1970-01-01T00:00:00Z';
      const [a, l] = await Promise.all([
        sb.from('announcements').select('id', { count: 'exact', head: true }).gt('created_at', since),
        sb.from('posts').select('id', { count: 'exact', head: true }).eq('is_lab', true).gt('created_at', since),
      ]);
      return (a.count || 0) + (l.count || 0);
    },

    // ---------- admin ----------
    async adminStats() {
      return must(await sb.rpc('admin_stats'));
    },
    async listUsers() {
      return must(await sb.rpc('admin_list_users'));
    },
    async setUserRole(id, role) {
      must(await sb.rpc('admin_set_role', { target: id, new_role: role }));
    },
    async setUserBlocked(id, blocked) {
      must(await sb.rpc('admin_set_blocked', { target: id, blocked }));
    },
    async resetUserPassword(id, password) {
      must(await sb.rpc('admin_reset_password', { target: id, new_password: password }));
    },
    async deleteUser(id) {
      must(await sb.rpc('admin_delete_user', { target: id }));
    },
  };
}

export function groupReports(rows) {
  const map = new Map();
  rows.forEach((r) => {
    if (!r.post) return;
    if (!map.has(r.post_id)) map.set(r.post_id, { post: r.post, reports: [] });
    map.get(r.post_id).reports.push({ id: r.id, reason: r.reason, created_at: r.created_at, reporter: r.reporter?.full_name || '' });
  });
  return [...map.values()];
}

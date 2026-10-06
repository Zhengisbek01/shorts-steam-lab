import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { api } from './api/index.js';

// ---------------------------------------------------------------------------
// Paged post lists with a shared cache (feed, lab folders, my posts ...)
// ---------------------------------------------------------------------------
const cache = new Map(); // key -> { items, done, loading, error, ts }
const subs = new Set();
let tick = 0;
const emit = () => {
  tick++;
  subs.forEach((f) => f());
};
const subscribe = (f) => {
  subs.add(f);
  return () => subs.delete(f);
};
const getTick = () => tick;

export function invalidatePosts() {
  cache.clear();
  emit();
}

export function patchPost(id, patch) {
  for (const [k, v] of cache) {
    if (v.items.some((p) => p.id === id)) {
      cache.set(k, { ...v, items: v.items.map((p) => (p.id === id ? { ...p, ...(typeof patch === 'function' ? patch(p) : patch) } : p)) });
    }
  }
  emit();
}

export function removePost(id) {
  for (const [k, v] of cache) {
    if (v.items.some((p) => p.id === id)) cache.set(k, { ...v, items: v.items.filter((p) => p.id !== id) });
  }
  emit();
}

const STALE_MS = 45000;

export function usePosts(params, { pageSize = 24, enabled = true } = {}) {
  useSyncExternalStore(subscribe, getTick);
  const key = JSON.stringify(params);
  const busy = useRef(false);
  const entry = cache.get(key);

  const load = useCallback(
    async (more) => {
      if (busy.current) return;
      const cur = cache.get(key);
      if (more && (!cur || cur.done || !cur.items.length)) return;
      busy.current = true;
      cache.set(key, { items: cur?.items || [], done: cur?.done || false, ts: cur?.ts || 0, loading: true, error: null });
      emit();
      try {
        const before = more ? cur.items[cur.items.length - 1].created_at : undefined;
        const page = await api.listPosts({ ...JSON.parse(key), before, limit: pageSize });
        const prev = more ? cache.get(key)?.items || [] : [];
        const seen = new Set(prev.map((p) => p.id));
        cache.set(key, {
          items: prev.concat(page.filter((p) => !seen.has(p.id))),
          done: page.length < pageSize,
          ts: Date.now(),
          loading: false,
          error: null,
        });
      } catch (e) {
        const c = cache.get(key) || {};
        cache.set(key, { items: c.items || [], done: c.done || false, ts: Date.now(), loading: false, error: e });
      } finally {
        busy.current = false;
        emit();
      }
    },
    [key, pageSize]
  );

  const missing = !entry;
  useEffect(() => {
    if (!enabled) return;
    const c = cache.get(key);
    if (!c || (!c.loading && Date.now() - c.ts > STALE_MS)) load(false);
  }, [key, enabled, load, missing]);

  return {
    items: entry?.items || [],
    loading: entry ? entry.loading : enabled,
    error: entry?.error || null,
    done: entry?.done || false,
    loadMore: () => load(true),
    refresh: () => load(false),
  };
}

// ---------------------------------------------------------------------------
// Likes of the signed-in user
// ---------------------------------------------------------------------------
let liked = new Set();
let likesUser = null;
const likeSubs = new Set();
let likeTick = 0;
const likeEmit = () => {
  likeTick++;
  likeSubs.forEach((f) => f());
};

export async function loadLikes(userId) {
  likesUser = userId;
  try {
    liked = await api.myLikes(userId);
  } catch {
    liked = new Set();
  }
  likeEmit();
}

export function clearLikes() {
  liked = new Set();
  likesUser = null;
  likeEmit();
}

export function useLiked(postId) {
  useSyncExternalStore(
    (f) => {
      likeSubs.add(f);
      return () => likeSubs.delete(f);
    },
    () => likeTick
  );
  return liked.has(postId);
}

export async function toggleLike(post, onCount) {
  if (!likesUser) return;
  const was = liked.has(post.id);
  const next = new Set(liked);
  if (was) next.delete(post.id);
  else next.add(post.id);
  liked = next;
  likeEmit();
  const delta = was ? -1 : 1;
  patchPost(post.id, (p) => ({ likes_count: Math.max(0, (p.likes_count || 0) + delta) }));
  onCount?.(delta);
  try {
    await api.setLike(post.id, likesUser, !was);
  } catch (e) {
    const back = new Set(liked);
    if (was) back.add(post.id);
    else back.delete(post.id);
    liked = back;
    likeEmit();
    patchPost(post.id, (p) => ({ likes_count: Math.max(0, (p.likes_count || 0) - delta) }));
    onCount?.(-delta);
    throw e;
  }
}

// ---------------------------------------------------------------------------
// Media URLs (sync for Supabase, async object URLs in demo mode)
// ---------------------------------------------------------------------------
export function useMediaUrl(path) {
  const [url, setUrl] = useState(() => {
    const r = path ? api.mediaUrl(path) : '';
    return typeof r === 'string' ? r : '';
  });
  useEffect(() => {
    if (!path) {
      setUrl('');
      return;
    }
    const r = api.mediaUrl(path);
    if (typeof r === 'string') {
      setUrl(r);
      return;
    }
    let alive = true;
    r.then((u) => alive && setUrl(u || '')).catch(() => alive && setUrl(''));
    return () => {
      alive = false;
    };
  }, [path]);
  return url;
}

// ---------------------------------------------------------------------------
// Generic async loader
// ---------------------------------------------------------------------------
export function useAsync(fn, deps = []) {
  const [state, setState] = useState({ data: null, loading: true, error: null });
  const run = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const data = await fn();
      setState({ data, loading: false, error: null });
    } catch (error) {
      setState((s) => ({ ...s, loading: false, error }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  useEffect(() => {
    run();
  }, [run]);
  return { ...state, reload: run, setData: (d) => setState((s) => ({ ...s, data: typeof d === 'function' ? d(s.data) : d })) };
}

// ---------------------------------------------------------------------------
// "Seen" marker for notifications badge
// ---------------------------------------------------------------------------
export const seenKey = (userId) => `ssl_seen_${userId}`;
export const getSeen = (userId) => localStorage.getItem(seenKey(userId)) || '';
export const markSeen = (userId) => {
  localStorage.setItem(seenKey(userId), new Date().toISOString());
  window.dispatchEvent(new Event('ssl-seen'));
};

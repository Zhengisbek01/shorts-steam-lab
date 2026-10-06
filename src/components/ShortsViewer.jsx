import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  ExternalLink, Flag, FlaskConical, Heart, MoreVertical, Pencil, Play, Share2, Trash2, Undo2, Volume2, VolumeX, X,
} from 'lucide-react';
import { sectionOf } from '../lib/steam.js';
import { removePost, patchPost, toggleLike, useLiked, useMediaUrl } from '../lib/store.js';
import { api } from '../lib/api/index.js';
import { useAuth } from '../context/auth.jsx';
import { Sheet, useUi } from '../context/ui.jsx';
import { clamp, errText, timeAgo } from '../lib/util.js';
import { Avatar, Spinner } from './bits.jsx';
import { EditPostSheet } from './PostForms.jsx';
import { navigate } from '../lib/router.js';

const REASONS = [
  'Тақырыпқа сай емес',
  'Сапасы нашар / көрінбейді',
  'Авторлық құқық бұзылған',
  'Әдепсіз мазмұн',
  'Басқа себеп',
];

export function shareUrl(post) {
  return `${window.location.origin}${window.location.pathname}#/p/${post.id}`;
}

export async function sharePost(post, toast) {
  const url = shareUrl(post);
  const data = { title: post.title, text: `${post.title} — Shorts STEAM Lab`, url };
  try {
    if (navigator.share && (!navigator.canShare || navigator.canShare(data))) {
      await navigator.share(data);
      return;
    }
  } catch (e) {
    if (e && e.name === 'AbortError') return;
  }
  try {
    await navigator.clipboard.writeText(url);
    toast('Сілтеме көшірілді');
  } catch {
    window.prompt('Сілтемені көшіріңіз:', url);
  }
}

/** "…" menu for a post: report, edit, delete, Lab toggle. */
export function PostMenu({ post, open, onClose, onRemoved, onChanged }) {
  const { user, isAdmin } = useAuth();
  const { toast, confirm } = useUi();
  const [mode, setMode] = useState('menu');
  const [editOpen, setEditOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const mine = user && post.author_id === user.id;

  useEffect(() => {
    if (open) setMode('menu');
  }, [open]);

  const report = async (reason) => {
    setBusy(true);
    try {
      const r = await api.reportPost(post.id, user.id, reason);
      toast(r.duplicate ? 'Сіз бұл жарияланымға бұрын шағымдандыңыз' : 'Шағым әкімшіге жіберілді');
      onClose();
    } catch (e) {
      toast(errText(e), 'err');
    } finally {
      setBusy(false);
    }
  };

  const del = async () => {
    onClose();
    const ok = await confirm({ title: 'Жарияланымды жою?', text: 'Видео мен сипаттама толық өшіріледі. Бұл әрекетті қайтару мүмкін емес.', okText: 'Жою', danger: true });
    if (!ok) return;
    try {
      await api.deletePost(post);
      removePost(post.id);
      window.dispatchEvent(new Event('ssl-refresh'));
      toast('Жойылды');
      onRemoved?.(post);
    } catch (e) {
      toast(errText(e), 'err');
    }
  };

  const toggleLab = async () => {
    onClose();
    try {
      await api.setPostLab(post.id, !post.is_lab);
      patchPost(post.id, { is_lab: !post.is_lab });
      onChanged?.({ ...post, is_lab: !post.is_lab });
      toast(post.is_lab ? 'Lab Shorts бөлімінен алынды' : 'Lab Shorts бөліміне қосылды');
      window.dispatchEvent(new Event('ssl-posts-changed'));
    } catch (e) {
      toast(errText(e), 'err');
    }
  };

  return (
    <>
      <Sheet open={open} onClose={onClose} title={mode === 'report' ? 'Шағым себебі' : 'Әрекеттер'}>
        {mode === 'menu' ? (
          <div className="menu">
            {post.kind === 'youtube' && post.youtube_id && (
              <a className="menu-item" href={`https://www.youtube.com/watch?v=${post.youtube_id}`} target="_blank" rel="noreferrer" onClick={onClose}>
                <span className="m-ico"><ExternalLink /></span>YouTube-та ашу
              </a>
            )}
            {(mine || isAdmin) && (
              <button className="menu-item" onClick={() => { onClose(); setEditOpen(true); }}>
                <span className="m-ico"><Pencil /></span>Өңдеу
              </button>
            )}
            {isAdmin && (
              <button className="menu-item" onClick={toggleLab}>
                <span className="m-ico">{post.is_lab ? <Undo2 /> : <FlaskConical />}</span>
                {post.is_lab ? 'Lab-тан Лентаға көшіру' : 'Lab Shorts-қа қосу'}
              </button>
            )}
            {!mine && (
              <button className="menu-item" onClick={() => setMode('report')}>
                <span className="m-ico"><Flag /></span>Шағымдану
              </button>
            )}
            {(mine || isAdmin) && (
              <button className="menu-item danger" onClick={del}>
                <span className="m-ico"><Trash2 /></span>Жою
              </button>
            )}
          </div>
        ) : (
          <div className="menu">
            {REASONS.map((r) => (
              <button key={r} className="menu-item" disabled={busy} onClick={() => report(r)}>
                <span className="m-ico"><Flag /></span>{r}
              </button>
            ))}
            {busy && <div className="loading-row"><Spinner /></div>}
          </div>
        )}
      </Sheet>
      {editOpen && (
        <EditPostSheet post={post} open={editOpen} onClose={() => setEditOpen(false)} onSaved={(u) => onChanged?.({ ...post, ...u })} />
      )}
    </>
  );
}

function ytEmbed(id, muted) {
  const q = new URLSearchParams({ autoplay: '1', playsinline: '1', rel: '0', modestbranding: '1', mute: muted ? '1' : '0', loop: '1', playlist: id });
  return `https://www.youtube-nocookie.com/embed/${id}?${q}`;
}

function Slide({ post, active, near, muted, setMuted, height, onRemoved, onChanged }) {
  const { toast } = useUi();
  const sec = sectionOf(post.section);
  const liked = useLiked(post.id);
  const videoUrl = useMediaUrl(near && post.kind === 'video' ? post.video_path : null);
  const thumbUrl = useMediaUrl(post.thumb_path || null);
  const imageUrl = useMediaUrl(post.kind === 'image' ? post.image_path : null);
  const videoRef = useRef(null);
  const [paused, setPaused] = useState(false);
  const [progress, setProgress] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const [menu, setMenu] = useState(false);
  const [failed, setFailed] = useState(false);
  const [buffering, setBuffering] = useState(false);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    if (active) {
      v.muted = muted;
      const p = v.play();
      if (p && p.then) {
        p.then(() => setPaused(false)).catch(() => {
          if (!v.muted) {
            v.muted = true;
            setMuted(true);
            v.play().then(() => setPaused(false)).catch(() => setPaused(true));
          } else setPaused(true);
        });
      }
    } else {
      v.pause();
      try {
        v.currentTime = 0;
      } catch { /* noop */ }
      setProgress(0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, videoUrl]);

  useEffect(() => {
    if (videoRef.current) videoRef.current.muted = muted;
  }, [muted]);

  const togglePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) {
      v.play().then(() => setPaused(false)).catch(() => {});
    } else {
      v.pause();
      setPaused(true);
    }
  };

  const like = () => toggleLike(post, (d) => onChanged({ ...post, likes_count: Math.max(0, (post.likes_count || 0) + d) })).catch((e) => toast(errText(e), 'err'));

  const author = post.author || {};
  const bg = post.kind === 'youtube' ? `https://i.ytimg.com/vi/${post.youtube_id}/hqdefault.jpg` : thumbUrl || imageUrl;

  return (
    <section className="slide" style={{ height }} aria-label={post.title}>
      <div className="slide-stage">
        {bg && <div className="slide-bg" style={{ backgroundImage: `url("${bg}")` }} />}

        {post.kind === 'video' && (
          <>
            {videoUrl && !failed ? (
              <video
                ref={videoRef}
                src={videoUrl}
                poster={thumbUrl || undefined}
                playsInline
                loop
                muted={muted}
                preload={active ? 'auto' : 'metadata'}
                onTimeUpdate={(e) => {
                  const v = e.currentTarget;
                  if (v.duration) setProgress(v.currentTime / v.duration);
                }}
                onWaiting={() => setBuffering(true)}
                onPlaying={() => setBuffering(false)}
                onCanPlay={() => setBuffering(false)}
                onError={() => setFailed(true)}
              />
            ) : failed ? (
              <div className="v-error">Видеоны ойнату мүмкін болмады. Файл форматы бұл құрылғыда қолдау таппауы мүмкін.</div>
            ) : (
              thumbUrl ? <img className="slide-img" src={thumbUrl} alt="" /> : <Spinner white />
            )}
            {videoUrl && !failed && <button className="tap-play" onClick={togglePlay} aria-label={paused ? 'Ойнату' : 'Тоқтату'} />}
            {active && paused && !failed && (
              <div className="big-play"><Play /></div>
            )}
            {active && buffering && !paused && (
              <div className="big-play" style={{ background: 'transparent' }}><Spinner white /></div>
            )}
            <div className="v-progress"><div style={{ width: `${progress * 100}%` }} /></div>
          </>
        )}

        {post.kind === 'youtube' && (
          active ? (
            <iframe
              key={post.id + (muted ? 'm' : 'u')}
              src={ytEmbed(post.youtube_id, muted)}
              title={post.title}
              allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
              allowFullScreen
            />
          ) : (
            <div className="yt-cover">
              <img src={`https://i.ytimg.com/vi/${post.youtube_id}/hqdefault.jpg`} alt="" />
              <div className="big-play"><Play /></div>
            </div>
          )
        )}

        {post.kind === 'image' && (imageUrl ? <img className="slide-img" src={imageUrl} alt={post.title} /> : <Spinner white />)}

        {post.kind === 'text' && (
          <div className="slide-text" style={{ background: sec.grad }}>
            <img src={sec.icon} alt="" />
            <div className="st-title">{post.title}</div>
            {post.description && <div className="st-body">{post.description}</div>}
          </div>
        )}
      </div>

      <div className="slide-info">
        <button
          className="si-author"
          onClick={() => navigate(`/feed?author=${author.id || post.author_id}&name=${encodeURIComponent(author.full_name || '')}`)}
        >
          <Avatar name={author.full_name} id={author.id} size="sm" />
          <span style={{ textAlign: 'left' }}>
            {author.full_name || 'Мұғалім'}
            <small>{[post.subject || author.subject, timeAgo(post.created_at)].filter(Boolean).join(' · ')}</small>
          </span>
        </button>
        {post.kind !== 'text' && (
          <>
            <div className="si-title">{post.title}</div>
            {post.description && (
              <div className={`si-desc ${expanded ? '' : 'clamp'}`} onClick={() => setExpanded((x) => !x)}>
                {post.description}
              </div>
            )}
          </>
        )}
        <div className="si-tags">
          <span><img src={sec.icon} alt="" />{sec.en} · {sec.kk}</span>
          {post.grade && <span>{post.grade}-сынып</span>}
          {post.is_lab && <span>LAB</span>}
        </div>
      </div>

      <div className="slide-actions">
        <button className={liked ? 'liked' : ''} onClick={like} aria-pressed={liked} aria-label="Ұнату">
          <span className="a-circle"><Heart /></span>
          {post.likes_count || 0}
        </button>
        <button onClick={() => sharePost(post, toast)} aria-label="Бөлісу">
          <span className="a-circle"><Share2 /></span>
          Бөлісу
        </button>
        <button onClick={() => setMenu(true)} aria-label="Әрекеттер">
          <span className="a-circle"><MoreVertical /></span>
          Тағы
        </button>
      </div>

      <PostMenu post={post} open={menu} onClose={() => setMenu(false)} onRemoved={onRemoved} onChanged={onChanged} />
    </section>
  );
}

export function ShortsViewer({ items, start = 0, onClose }) {
  const [list, setList] = useState(items);
  const [index, setIndex] = useState(clamp(start, 0, Math.max(0, items.length - 1)));
  const [muted, setMuted] = useState(false);
  const [height, setHeight] = useState(() => window.innerHeight);
  const [hint, setHint] = useState(items.length > 1);
  const scroller = useRef(null);
  const indexRef = useRef(index);
  indexRef.current = index;

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  useEffect(() => {
    const measure = () => {
      const el = scroller.current;
      const h = el ? el.clientHeight : window.innerHeight;
      setHeight(h);
      if (el) el.scrollTop = indexRef.current * h;
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);

  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const i = clamp(Math.round(el.scrollTop / Math.max(1, el.clientHeight)), 0, list.length - 1);
        if (i !== indexRef.current) {
          setIndex(i);
          setHint(false);
        }
      });
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      el.removeEventListener('scroll', onScroll);
      cancelAnimationFrame(raf);
    };
  }, [list.length]);

  useEffect(() => {
    if (!hint) return;
    const t = setTimeout(() => setHint(false), 3500);
    return () => clearTimeout(t);
  }, [hint]);

  const go = useCallback((d) => {
    const el = scroller.current;
    if (!el) return;
    const i = clamp(indexRef.current + d, 0, list.length - 1);
    el.scrollTo({ top: i * el.clientHeight, behavior: 'smooth' });
  }, [list.length]);

  useEffect(() => {
    const onKey = (e) => {
      if (document.querySelector('.sheet, .dialog')) return;
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowDown' || e.key === 'PageDown') { e.preventDefault(); go(1); }
      if (e.key === 'ArrowUp' || e.key === 'PageUp') { e.preventDefault(); go(-1); }
      if (e.key === 'm') setMuted((m) => !m);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [go, onClose]);

  const onRemoved = (post) => {
    const next = list.filter((p) => p.id !== post.id);
    setList(next);
    if (!next.length) onClose();
    else setIndex((i) => clamp(i, 0, next.length - 1));
  };
  const onChanged = (post) => setList((l) => l.map((p) => (p.id === post.id ? { ...p, ...post } : p)));

  return createPortal(
    <div className="viewer" role="dialog" aria-modal="true" aria-label="Бейнесабақтар">
      <div className="viewer-scroll" ref={scroller}>
        {list.map((p, i) => (
          <Slide
            key={p.id}
            post={p}
            active={i === index}
            near={Math.abs(i - index) <= 1}
            muted={muted}
            setMuted={setMuted}
            height={height}
            onRemoved={onRemoved}
            onChanged={onChanged}
          />
        ))}
      </div>
      <div className="viewer-top">
        <button className="v-btn" onClick={onClose} aria-label="Жабу"><X /></button>
        <div className="v-title">{list.length ? `${index + 1} / ${list.length}` : ''}</div>
        <button className="v-btn" onClick={() => setMuted((m) => !m)} aria-label={muted ? 'Дыбысты қосу' : 'Дыбысты өшіру'}>
          {muted ? <VolumeX /> : <Volume2 />}
        </button>
      </div>
      {hint && <div className="v-hint">Келесі видео үшін жоғары сырғытыңыз ↑</div>}
    </div>,
    document.body
  );
}

import { useEffect, useRef } from 'react';
import { Heart, Image as ImageIcon, Play } from 'lucide-react';
import { sectionOf } from '../lib/steam.js';
import { useLiked, useMediaUrl } from '../lib/store.js';
import { fmtDuration, timeAgo } from '../lib/util.js';
import { ytThumb } from '../lib/media.js';
import { Empty, ErrorBox, Spinner, YouTubeIcon } from './bits.jsx';

export function PostThumb({ post, big }) {
  const sec = sectionOf(post.section);
  const local = useMediaUrl(post.thumb_path || (post.kind === 'image' ? post.image_path : null));
  const src = post.kind === 'youtube' && post.youtube_id ? ytThumb(post.youtube_id) : local;
  if (src) return <img src={src} alt="" loading="lazy" decoding="async" draggable="false" />;
  return (
    <div className="text-cover" style={{ background: sec.grad }}>
      <img className="tc-icon" src={sec.icon} alt="" />
      {post.kind === 'text' ? (
        <div className="tc-text">{post.title}</div>
      ) : (
        <div className="tc-text" style={{ fontSize: big ? 18 : 15 }}>{post.title}</div>
      )}
    </div>
  );
}

export function PostCard({ post, onOpen, showLab = false }) {
  const sec = sectionOf(post.section);
  const liked = useLiked(post.id);
  const isPlayable = post.kind === 'video' || post.kind === 'youtube';
  return (
    <button type="button" className="pcard" onClick={onOpen} aria-label={post.title}>
      <div className="pcard-media">
        <PostThumb post={post} />
        <div className="shade" />
        <span className="sec">
          <img src={sec.icon} alt="" />
          {sec.en}
        </span>
        {showLab && post.is_lab && <span className="lab-badge">LAB</span>}
        {isPlayable && (post.thumb_path || post.kind === 'youtube') && (
          <span className="play">
            <Play fill="currentColor" />
          </span>
        )}
        {post.kind === 'video' && post.duration ? (
          <span className="dur">
            <Play fill="currentColor" />
            {fmtDuration(post.duration)}
          </span>
        ) : null}
        {post.kind === 'youtube' && (
          <span className="dur">
            <YouTubeIcon size={15} /> YouTube
          </span>
        )}
        {post.kind === 'image' && (
          <span className="dur">
            <ImageIcon /> Сурет
          </span>
        )}
      </div>
      <div className="pcard-body">
        <div className="pcard-title">{post.title}</div>
        <div className="pcard-meta">
          {post.author?.full_name || 'Мұғалім'}
          {(post.subject || post.author?.subject) && ` · ${post.subject || post.author?.subject}`}
        </div>
        <div className="pcard-foot">
          <Heart className={liked ? 'liked' : ''} fill={liked ? 'currentColor' : 'none'} />
          <span>{post.likes_count || 0}</span>
          <span>·</span>
          <span>{timeAgo(post.created_at)}</span>
        </div>
      </div>
    </button>
  );
}

function SkeletonCard() {
  return (
    <div className="pcard" aria-hidden="true">
      <div className="pcard-media skel" />
      <div className="pcard-body">
        <div className="skel skel-line" style={{ width: '90%' }} />
        <div className="skel skel-line" style={{ width: '60%' }} />
      </div>
    </div>
  );
}

export function PostGrid({ list, onOpen, empty, showLab }) {
  const { items, loading, error, done, loadMore, refresh } = list;
  const sentinel = useRef(null);
  useEffect(() => {
    const el = sentinel.current;
    if (!el || done || !items.length) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) loadMore();
      },
      { rootMargin: '600px 0px' }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [items.length, done, loadMore]);

  if (error && !items.length) return <ErrorBox error={error} onRetry={refresh} />;
  if (loading && !items.length) {
    return (
      <div className="grid">
        {Array.from({ length: 6 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    );
  }
  if (!items.length) return empty || <Empty title="Әзірге бос" text="Бұл жерде әлі жарияланым жоқ." />;
  return (
    <>
      <div className="grid">
        {items.map((p, i) => (
          <PostCard key={p.id} post={p} onOpen={() => onOpen(items, i)} showLab={showLab} />
        ))}
      </div>
      {!done && (
        <div ref={sentinel} className="loading-row">
          {loading ? <Spinner /> : <button className="btn btn-light btn-sm" onClick={loadMore}>Тағы жүктеу</button>}
        </div>
      )}
    </>
  );
}

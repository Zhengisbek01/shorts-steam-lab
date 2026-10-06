import { useEffect, useState } from 'react';
import { ArrowLeft, ChevronRight, Plus } from 'lucide-react';
import { Empty, Logo, RowCard } from '../components/bits.jsx';
import { PostGrid } from '../components/PostCard.jsx';
import { SECTIONS, SECTION_MAP } from '../lib/steam.js';
import { usePosts } from '../lib/store.js';
import { api } from '../lib/api/index.js';
import { useAuth } from '../context/auth.jsx';
import { useViewer } from '../context/viewer.jsx';

function useLabCounts() {
  const [counts, setCounts] = useState(null);
  useEffect(() => {
    let alive = true;
    const run = () => api.sectionCounts(true).then((c) => alive && setCounts(c)).catch(() => alive && setCounts({}));
    run();
    window.addEventListener('ssl-posts-changed', run);
    window.addEventListener('ssl-refresh', run);
    return () => {
      alive = false;
      window.removeEventListener('ssl-posts-changed', run);
      window.removeEventListener('ssl-refresh', run);
    };
  }, []);
  return counts;
}

export default function Lab({ section }) {
  if (section && SECTION_MAP[section]) return <LabFolder section={SECTION_MAP[section]} />;
  return <LabHome />;
}

function LabHome() {
  const { isAdmin } = useAuth();
  const counts = useLabCounts();
  return (
    <div className="wrap">
      <div className="card lab-hero mt-16">
        <Logo size="sm" tagline={false} />
        <h1 className="h1">Shorts STEAM Lab</h1>
        <p className="sub">Әр түрлі дереккөздерден жиналған зертханалық бейнесабақтар мен идеялар</p>
      </div>
      {isAdmin && (
        <a className="btn btn-orange btn-block mt-16" href="#/upload?lab=1">
          <Plus /> Lab-қа видео қосу
        </a>
      )}
      <div className="stack mt-16">
        {SECTIONS.map((s) => (
          <RowCard
            key={s.key}
            icon={s.icon}
            title={s.en}
            kk={s.kk}
            sub={counts ? `${counts[s.key] || 0} видео` : '…'}
            href={`#/lab/${s.key}`}
            chevron
          />
        ))}
      </div>
    </div>
  );
}

function LabFolder({ section }) {
  const { isAdmin } = useAuth();
  const { open } = useViewer();
  const list = usePosts({ lab: true, section: section.key });
  return (
    <div className="wrap wide">
      <a className="back-btn" href="#/lab"><ArrowLeft size={18} /> Lab Shorts</a>
      <div className="rcard folder-head mt-12" style={{ maxWidth: 640 }}>
        <img src={section.icon} alt="" />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="h2">
            {section.en} <span style={{ fontWeight: 600, color: 'var(--text-2)' }}>({section.kk})</span>
          </div>
          <div className="muted" style={{ fontWeight: 700, fontSize: 14 }}>Shorts STEAM Lab идеялары</div>
        </div>
      </div>
      <div className="row mt-12" style={{ flexWrap: 'wrap' }}>
        {isAdmin && (
          <a className="btn btn-orange btn-sm" href={`#/upload?lab=1&s=${section.key}`}><Plus /> Осы бөлімге қосу</a>
        )}
        <a className="btn btn-light btn-sm" href={`#/feed?s=${section.key}`}>
          Мұғалімдер видеолары <ChevronRight />
        </a>
      </div>
      <div className="mt-16">
        <PostGrid
          list={list}
          onOpen={open}
          empty={
            <Empty icon={section.icon} title="Бұл бума әзірге бос" text={isAdmin ? 'Осы бөлімге алғашқы зертханалық видеоны қосыңыз.' : 'Жақында әкімшілер жаңа идеялар қосады.'} />
          }
        />
      </div>
    </div>
  );
}

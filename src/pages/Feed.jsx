import { useEffect, useState } from 'react';
import { ArrowLeft, Search, X } from 'lucide-react';
import { Empty, ICONS } from '../components/bits.jsx';
import { PostGrid } from '../components/PostCard.jsx';
import { SECTIONS, sectionOf } from '../lib/steam.js';
import { usePosts } from '../lib/store.js';
import { buildQuery, navigate } from '../lib/router.js';
import { useViewer } from '../context/viewer.jsx';

export function SectionChips({ value, onChange, allLabel = 'Барлығы' }) {
  return (
    <div className="chips" role="tablist">
      <button className={`chip plain ${!value ? 'on' : ''}`} onClick={() => onChange('')} role="tab" aria-selected={!value}>
        {allLabel}
      </button>
      {SECTIONS.map((s) => (
        <button key={s.key} className={`chip ${value === s.key ? 'on' : ''}`} onClick={() => onChange(s.key)} role="tab" aria-selected={value === s.key}>
          <img src={s.icon} alt="" />
          {s.en}
        </button>
      ))}
    </div>
  );
}

export default function Feed({ query }) {
  const { open } = useViewer();
  const section = query.s || '';
  const authorId = query.author || '';
  const authorName = query.name || '';
  const [search, setSearch] = useState(query.q || '');
  const [q, setQ] = useState(query.q || '');

  useEffect(() => {
    const t = setTimeout(() => setQ(search.trim()), 350);
    return () => clearTimeout(t);
  }, [search]);

  const params = { lab: authorId ? undefined : false, section: section || undefined, authorId: authorId || undefined, search: q || undefined };
  const list = usePosts(params);

  const setSection = (s) => navigate(`/feed${buildQuery({ s, author: authorId, name: authorName })}`, { replace: true });
  const sec = section ? sectionOf(section) : null;

  return (
    <div className="wrap wide">
      {authorId ? (
        <>
          <a className="back-btn" href="#/feed"><ArrowLeft size={18} /> Барлық лента</a>
          <div className="page-head">
            <div>
              <h1 className="h1">{authorName || 'Мұғалім'}</h1>
              <div className="sub">Осы мұғалімнің барлық жарияланымдары</div>
            </div>
          </div>
        </>
      ) : (
        <div className="page-head">
          <div>
            <h1 className="h1">Лента</h1>
            <div className="sub">Мұғалімдердің сабақта қолданған әдістері мен бейнесабақтары</div>
          </div>
        </div>
      )}

      <div className="search mt-8">
        <Search />
        <input className="input" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Іздеу: тақырып, пән, сипаттама..." type="search" enterKeyHint="search" />
        {search && (
          <button className="clear" onClick={() => setSearch('')} aria-label="Тазалау"><X size={18} /></button>
        )}
      </div>

      <div className="mt-12">
        <SectionChips value={section} onChange={setSection} />
      </div>

      <div className="mt-12">
        <PostGrid
          list={list}
          onOpen={open}
          showLab={!!authorId}
          empty={
            <Empty
              icon={sec ? sec.icon : ICONS.camera}
              title={q ? 'Ештеңе табылмады' : 'Әзірге видео жоқ'}
              text={q ? 'Басқа сөзбен іздеп көріңіз.' : 'Сабақта қолданған әдісіңізді бірінші болып бөлісіңіз!'}
            >
              {!q && (
                <a className="btn btn-orange btn-sm mt-8" href={`#/upload${buildQuery({ s: section })}`}>Видео жүктеу</a>
              )}
            </Empty>
          }
        />
      </div>
    </div>
  );
}

import { ChevronRight } from 'lucide-react';
import { ICONS, Logo, RowCard } from '../components/bits.jsx';
import { About, Contacts, Notice, Quote } from '../components/InfoBlocks.jsx';
import { PostCard } from '../components/PostCard.jsx';
import { SECTIONS } from '../lib/steam.js';
import { usePosts } from '../lib/store.js';
import { useAuth } from '../context/auth.jsx';
import { useViewer } from '../context/viewer.jsx';

export default function Home() {
  const { user } = useAuth();
  const { open } = useViewer();
  const latest = usePosts({ lab: false }, { pageSize: 10 });
  const firstName = (user?.full_name || '').split(/\s+/)[0];

  return (
    <div className="wrap">
      <div className="page-head">
        <div>
          <h1 className="h1">Сәлем{firstName ? `, ${firstName}` : ''}!</h1>
          <div className="sub">Бүгін қандай идеямен бөлісесіз?</div>
        </div>
      </div>

      <div className="card hero mt-12">
        <Logo size="sm" />
        <p className="desc">Мектебіңнің STEAM зертханасы — идеяларды бөліс, тәжірибе жаса және бірге оқы.</p>
      </div>

      <div className="tiles mt-16">
        <a className="tile pastel" href="#/upload">
          <img src={ICONS.camera} alt="" />
          <span className="t-label">Жариялау</span>
        </a>
        <a className="tile" href="#/helper">
          <img src={ICONS.robot} alt="" />
          <span className="t-label">Көмекші</span>
        </a>
        <a className="tile" href="#/notifications">
          <img src={ICONS.bellring} alt="" />
          <span className="t-label">Хабарлан&shy;дырулар</span>
        </a>
      </div>

      {latest.items.length > 0 && (
        <section>
          <div className="section-title">
            <h2 className="h2">Жаңа видеолар</h2>
            <a href="#/feed">
              Барлығы <ChevronRight size={18} />
            </a>
          </div>
          <div className="rail">
            {latest.items.map((p, i) => (
              <PostCard key={p.id} post={p} onOpen={() => open(latest.items, i)} />
            ))}
          </div>
        </section>
      )}

      <div className="stack-lg mt-16">
        <About />

        <section>
          <h2 className="h2">STEAM бағыты</h2>
          <p className="muted mt-8" style={{ fontWeight: 700 }}>STEAM бағыты 5 негізгі сала бойынша жүзеге асырылады:</p>
          <div className="stack mt-12">
            {SECTIONS.map((s) => (
              <RowCard key={s.key} icon={s.icon} title={s.en} kk={s.kk} href={`#/lab/${s.key}`} chevron />
            ))}
          </div>
        </section>

        <Quote />
        <Notice />
        <Contacts />
      </div>
    </div>
  );
}

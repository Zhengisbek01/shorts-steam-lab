import { useEffect, useState } from 'react';
import { FlaskConical, House, Play, Plus, UserRound } from 'lucide-react';
import { ICONS, BrandText } from './bits.jsx';
import { navigate } from '../lib/router.js';
import { useAuth } from '../context/auth.jsx';
import { api } from '../lib/api/index.js';
import { getSeen } from '../lib/store.js';
import { IS_DEMO } from '../lib/config.js';

export function DemoBar({ onInfo }) {
  if (!IS_DEMO) return null;
  return (
    <div className="demobar">
      ДЕМО режим: деректер тек осы құрылғыда сақталады.
      <button onClick={onInfo}>Толығырақ</button>
    </div>
  );
}

function useUnread() {
  const { user } = useAuth();
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!user) return;
    let alive = true;
    const run = () =>
      api
        .countSince(getSeen(user.id))
        .then((n) => alive && setCount(n))
        .catch(() => {});
    run();
    const onVis = () => document.visibilityState === 'visible' && run();
    window.addEventListener('ssl-seen', run);
    window.addEventListener('ssl-refresh', run);
    document.addEventListener('visibilitychange', onVis);
    const t = setInterval(run, 120000);
    return () => {
      alive = false;
      clearInterval(t);
      window.removeEventListener('ssl-seen', run);
      window.removeEventListener('ssl-refresh', run);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [user]);
  return count;
}

export function TopBar() {
  const unread = useUnread();
  return (
    <header className="topbar">
      <div className="wrap wide topbar-in">
        <a className="brand" href="#/" aria-label="Басты бет">
          <img src={ICONS.mark} alt="" />
          <BrandText />
        </a>
        <div className="spacer" />
        <button className="icon-btn" onClick={() => navigate('/helper')} aria-label="Көмекші">
          <img src={ICONS.robot} alt="" />
        </button>
        <button className="icon-btn" onClick={() => navigate('/notifications')} aria-label="Хабарландырулар">
          <img src={ICONS.bell} alt="" />
          {unread > 0 && <span className="badge">{unread > 9 ? '9+' : unread}</span>}
        </button>
      </div>
    </header>
  );
}

const TABS = [
  { key: 'home', path: '/', label: 'Басты бет', Icon: House },
  { key: 'feed', path: '/feed', label: 'Лента', Icon: Play },
  { key: 'plus' },
  { key: 'lab', path: '/lab', label: 'Lab', Icon: FlaskConical },
  { key: 'me', path: '/me', label: 'Кабинет', Icon: UserRound },
];

export function BottomNav({ active }) {
  return (
    <nav className="nav" aria-label="Негізгі мәзір">
      <div className="nav-in">
        {TABS.map((t) =>
          t.key === 'plus' ? (
            <div key="plus" className="nav-plus-wrap">
              <button className="nav-plus" onClick={() => navigate('/upload')} aria-label="Жариялау">
                <Plus />
              </button>
            </div>
          ) : (
            <a key={t.key} href={'#' + t.path} className={`nav-item ${active === t.key ? 'active' : ''}`} aria-current={active === t.key ? 'page' : undefined}>
              <t.Icon strokeWidth={active === t.key ? 2.4 : 1.9} />
              <span>{t.label}</span>
            </a>
          )
        )}
      </div>
    </nav>
  );
}

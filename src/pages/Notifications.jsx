import { useEffect, useState } from 'react';
import { Empty, ErrorBox, ICONS, Spinner } from '../components/bits.jsx';
import { api } from '../lib/api/index.js';
import { getSeen, markSeen, useAsync } from '../lib/store.js';
import { sectionOf } from '../lib/steam.js';
import { timeAgo } from '../lib/util.js';
import { useAuth } from '../context/auth.jsx';
import { useViewer } from '../context/viewer.jsx';

export default function Notifications() {
  const { user, isAdmin } = useAuth();
  const { open } = useViewer();
  const [seen] = useState(() => getSeen(user.id));
  const data = useAsync(async () => {
    const [ann, lab] = await Promise.all([api.listAnnouncements(), api.listPosts({ lab: true, limit: 12 })]);
    return [
      ...ann.map((a) => ({ type: 'ann', key: 'a' + a.id, date: a.created_at, a })),
      ...lab.map((p) => ({ type: 'lab', key: 'p' + p.id, date: p.created_at, p })),
    ].sort((x, y) => (x.date < y.date ? 1 : -1));
  }, []);

  useEffect(() => {
    if (data.data) markSeen(user.id);
  }, [data.data, user.id]);

  const items = data.data || [];
  const labPosts = items.filter((i) => i.type === 'lab').map((i) => i.p);

  return (
    <div className="wrap">
      <div className="page-head">
        <div>
          <h1 className="h1">Хабарландырулар</h1>
          <div className="sub">Мектеп жаңалықтары және Lab Shorts-қа қосылған жаңа идеялар</div>
        </div>
      </div>
      {isAdmin && (
        <a className="btn btn-soft btn-sm mt-8" href="#/admin/announcements">+ Хабарландыру жазу</a>
      )}
      <div className="card mt-16" style={{ overflow: 'hidden' }}>
        {data.loading && !data.data ? (
          <div className="loading-row"><Spinner /></div>
        ) : data.error ? (
          <ErrorBox error={data.error} onRetry={data.reload} />
        ) : !items.length ? (
          <Empty icon={ICONS.bellring} title="Жаңа хабар жоқ" text="Әкімші хабарландыру жазғанда немесе Lab-қа жаңа идея қосылғанда, осында көрінеді." />
        ) : (
          items.map((it, idx) => {
            const isNew = !seen || it.date > seen;
            if (it.type === 'ann') {
              return (
                <div key={it.key} className={`notif ${isNew ? 'new' : ''}`} style={{ borderBottom: idx < items.length - 1 ? '1px solid #f3e7d9' : 0 }}>
                  <img src={ICONS.bell} alt="" />
                  <div className="n-main">
                    <div className="n-title">{isNew && <span className="dot-new" />}{it.a.title}</div>
                    {it.a.body && <div className="n-body">{it.a.body}</div>}
                    <div className="n-meta">Хабарландыру · {timeAgo(it.date)}</div>
                  </div>
                </div>
              );
            }
            const sec = sectionOf(it.p.section);
            return (
              <button
                key={it.key}
                className={`notif ${isNew ? 'new' : ''}`}
                style={{ borderBottom: idx < items.length - 1 ? '1px solid #f3e7d9' : 0 }}
                onClick={() => open(labPosts, labPosts.findIndex((p) => p.id === it.p.id))}
              >
                <img src={sec.icon} alt="" />
                <div className="n-main">
                  <div className="n-title">{isNew && <span className="dot-new" />}Lab-қа жаңа идея: {it.p.title}</div>
                  <div className="n-meta">{sec.en} ({sec.kk}) · {timeAgo(it.date)}</div>
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}

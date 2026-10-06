import { useMemo, useState } from 'react';
import { ArrowLeft, Ban, Crown, Eye, Flag, KeyRound, MoreVertical, Search, Send, Trash2, UserX, X, CircleCheck } from 'lucide-react';
import { Avatar, Empty, ErrorBox, ICONS, Spinner } from '../components/bits.jsx';
import { PostThumb } from '../components/PostCard.jsx';
import { PostMenu } from '../components/ShortsViewer.jsx';
import { AdminPanel } from './Cabinet.jsx';
import { api } from '../lib/api/index.js';
import { invalidatePosts, removePost, useAsync, usePosts } from '../lib/store.js';
import { errText, formatDate, timeAgo } from '../lib/util.js';
import { sectionOf } from '../lib/steam.js';
import { useAuth } from '../context/auth.jsx';
import { Sheet, useUi } from '../context/ui.jsx';
import { useViewer } from '../context/viewer.jsx';
import { navigate } from '../lib/router.js';

const changed = () => window.dispatchEvent(new Event('ssl-admin-changed'));

function Back({ to = '#/admin', label = 'Басқару панелі' }) {
  return <a className="back-btn" href={to}><ArrowLeft size={18} /> {label}</a>;
}

export default function Admin({ sub }) {
  const { isAdmin } = useAuth();
  if (!isAdmin) {
    return (
      <div className="wrap">
        <Empty icon={ICONS.moderation} title="Тек әкімшілерге" text="Бұл бөлімге кіру үшін әкімші құқығы қажет." />
      </div>
    );
  }
  if (sub === 'users') return <Users />;
  if (sub === 'posts') return <Posts />;
  if (sub === 'moderation') return <Moderation />;
  if (sub === 'announcements') return <Announcements />;
  return (
    <div className="wrap">
      <div className="mt-24"><AdminPanel /></div>
    </div>
  );
}

// ---------------------------------------------------------------------------
function Users() {
  const { user: me } = useAuth();
  const { toast, confirm, prompt } = useUi();
  const users = useAsync(() => api.listUsers(), []);
  const [q, setQ] = useState('');
  const [sel, setSel] = useState(null);

  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    const all = users.data || [];
    return s ? all.filter((u) => [u.full_name, u.email, u.subject].some((x) => (x || '').toLowerCase().includes(s))) : all;
  }, [users.data, q]);
  const totalUploads = (users.data || []).reduce((s, u) => s + (u.posts_count || 0), 0);

  const act = async (fn, okText) => {
    try {
      await fn();
      toast(okText);
      setSel(null);
      users.reload();
      changed();
    } catch (e) {
      toast(errText(e), 'err');
    }
  };

  const u = sel;
  return (
    <div className="wrap">
      <Back />
      <div className="page-head">
        <div>
          <h1 className="h1">Қолданушылар</h1>
          <div className="sub">
            {users.data ? `${users.data.length} қолданушы · барлығы ${totalUploads} жүктеу` : 'Жүктелуде…'}
          </div>
        </div>
      </div>
      <div className="search mt-8">
        <Search />
        <input className="input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Аты, email немесе пән бойынша іздеу" type="search" />
        {q && <button className="clear" onClick={() => setQ('')} aria-label="Тазалау"><X size={18} /></button>}
      </div>

      <div className="card mt-16" style={{ overflow: 'hidden' }}>
        {users.loading && !users.data ? (
          <div className="loading-row"><Spinner /></div>
        ) : users.error ? (
          <ErrorBox error={users.error} onRetry={users.reload} />
        ) : !list.length ? (
          <Empty title="Ешкім табылмады" />
        ) : (
          list.map((x) => (
            <button key={x.id} className="user-row" onClick={() => setSel(x)}>
              <Avatar name={x.full_name} id={x.id} />
              <div className="u-main">
                <div className="u-name">
                  {x.full_name || 'Атсыз'}
                  {x.role === 'admin' && <span className="tag">Әкімші</span>}
                  {x.is_blocked && <span className="tag red">Бұғатталған</span>}
                  {x.id === me.id && <span className="tag blue">Сіз</span>}
                </div>
                <div className="u-sub">{[x.subject, x.email].filter(Boolean).join(' · ')}</div>
              </div>
              <div className="u-count">
                <b>{x.posts_count || 0}</b>
                <span>жүктеу</span>
              </div>
            </button>
          ))
        )}
      </div>

      <Sheet open={!!u} onClose={() => setSel(null)} title="Қолданушы">
        {u && (
          <div className="stack">
            <div className="row">
              <Avatar name={u.full_name} id={u.id} />
              <div style={{ minWidth: 0 }}>
                <div className="h3">{u.full_name || 'Атсыз'}</div>
                <div className="muted" style={{ fontWeight: 600, fontSize: 14, overflowWrap: 'anywhere' }}>{u.email}</div>
              </div>
            </div>
            <div className="stats" style={{ marginTop: 0 }}>
              <div className="stat"><b>{u.posts_count || 0}</b><span>Жүктеу</span></div>
              <div className="stat"><b>{u.likes_received || 0}</b><span>Ұнату</span></div>
              <div className="stat"><b style={{ fontSize: 15, paddingTop: 6 }}>{formatDate(u.created_at)}</b><span>Тіркелді</span></div>
            </div>
            <div className="muted" style={{ fontWeight: 700, fontSize: 14 }}>
              Пәні: {u.subject || '—'} · Рөлі: {u.role === 'admin' ? 'Әкімші' : 'Мұғалім'}
            </div>
            <div className="menu">
              <button className="menu-item" onClick={() => { setSel(null); navigate(`/feed?author=${u.id}&name=${encodeURIComponent(u.full_name || '')}`); }}>
                <span className="m-ico"><Eye /></span>Жарияланымдарын көру
              </button>
              <button
                className="menu-item"
                onClick={() => act(() => api.setUserRole(u.id, u.role === 'admin' ? 'teacher' : 'admin'), u.role === 'admin' ? 'Әкімші құқығы алынды' : 'Әкімші етіп тағайындалды')}
              >
                <span className="m-ico"><Crown /></span>
                {u.role === 'admin' ? 'Әкімші құқығын алу' : 'Әкімші ету'}
              </button>
              {u.id !== me.id && (
                <button className="menu-item" onClick={() => act(() => api.setUserBlocked(u.id, !u.is_blocked), u.is_blocked ? 'Бұғаттан шығарылды' : 'Бұғатталды')}>
                  <span className="m-ico"><Ban /></span>
                  {u.is_blocked ? 'Бұғаттан шығару' : 'Бұғаттау (жариялай алмайды)'}
                </button>
              )}
              <button
                className="menu-item"
                onClick={async () => {
                  const pwd = await prompt({
                    title: 'Жаңа құпия сөз',
                    text: `${u.full_name || u.email} үшін уақытша құпия сөз жазыңыз (кемінде 6 таңба). Оны мұғалімге хабарлаңыз.`,
                    placeholder: 'Мысалы: steam2025',
                    okText: 'Сақтау',
                  });
                  if (pwd === null) return;
                  if (pwd.length < 6) return toast('Кемінде 6 таңба', 'err');
                  act(() => api.resetUserPassword(u.id, pwd), 'Құпия сөз өзгертілді');
                }}
              >
                <span className="m-ico"><KeyRound /></span>Құпия сөзді өзгерту
              </button>
              {u.id !== me.id && (
                <button
                  className="menu-item danger"
                  onClick={async () => {
                    const ok = await confirm({
                      title: 'Аккаунтты жою?',
                      text: `${u.full_name || u.email} және оның барлық жарияланымдары өшіріледі.`,
                      okText: 'Жою',
                      danger: true,
                    });
                    if (ok) act(async () => { await api.deleteUser(u.id); invalidatePosts(); }, 'Аккаунт жойылды');
                  }}
                >
                  <span className="m-ico"><UserX /></span>Аккаунтты жою
                </button>
              )}
            </div>
          </div>
        )}
      </Sheet>
    </div>
  );
}

// ---------------------------------------------------------------------------
function PostRow({ post, onOpen, extra }) {
  const sec = sectionOf(post.section);
  const [menu, setMenu] = useState(false);
  return (
    <div className="post-row">
      <button className="thumb" onClick={onOpen} aria-label="Көру">
        <PostThumb post={post} />
      </button>
      <button className="pr-main" style={{ textAlign: 'left' }} onClick={onOpen}>
        <div className="pr-title">{post.title}</div>
        <div className="pr-sub">{post.author?.full_name || '—'} · {timeAgo(post.created_at)}</div>
        <div className="row mt-8" style={{ gap: 6, flexWrap: 'wrap' }}>
          <span className="tag"><img src={sec.icon} alt="" style={{ width: 16, height: 16 }} />{sec.en}</span>
          {post.is_lab && <span className="tag dark">LAB</span>}
          <span className="tag blue">♥ {post.likes_count || 0}</span>
        </div>
      </button>
      {extra || (
        <button className="icon-btn" onClick={() => setMenu(true)} aria-label="Әрекеттер" style={{ boxShadow: 'none' }}>
          <MoreVertical size={20} />
        </button>
      )}
      <PostMenu post={post} open={menu} onClose={() => setMenu(false)} onRemoved={() => changed()} onChanged={() => changed()} />
    </div>
  );
}

function Posts() {
  const { open } = useViewer();
  const [tab, setTab] = useState('all');
  const params = { lab: tab === 'lab' ? true : tab === 'feed' ? false : undefined };
  const list = usePosts(params, { pageSize: 40 });
  return (
    <div className="wrap">
      <Back />
      <div className="page-head">
        <div>
          <h1 className="h1">Посттар</h1>
          <div className="sub">Барлық жарияланымдар: өңдеу, Lab-қа көшіру, жою</div>
        </div>
      </div>
      <div className="chips mt-8">
        {[
          ['all', 'Барлығы'],
          ['feed', 'Лента'],
          ['lab', 'Lab Shorts'],
        ].map(([k, l]) => (
          <button key={k} className={`chip plain ${tab === k ? 'on' : ''}`} onClick={() => setTab(k)}>{l}</button>
        ))}
      </div>
      <div className="card mt-12" style={{ overflow: 'hidden' }}>
        {list.loading && !list.items.length ? (
          <div className="loading-row"><Spinner /></div>
        ) : list.error && !list.items.length ? (
          <ErrorBox error={list.error} onRetry={list.refresh} />
        ) : !list.items.length ? (
          <Empty icon={ICONS.posts} title="Жарияланым жоқ" />
        ) : (
          list.items.map((p, i) => <PostRow key={p.id} post={p} onOpen={() => open(list.items, i)} />)
        )}
      </div>
      {!list.done && list.items.length > 0 && (
        <div className="loading-row">
          {list.loading ? <Spinner /> : <button className="btn btn-light btn-sm" onClick={list.loadMore}>Тағы жүктеу</button>}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
function Moderation() {
  const { toast, confirm } = useUi();
  const { open } = useViewer();
  const reports = useAsync(() => api.listReports(), []);

  const resolve = async (postId) => {
    try {
      await api.resolveReports(postId);
      reports.setData((d) => d.filter((g) => g.post.id !== postId));
      toast('Шағым жабылды');
      changed();
    } catch (e) {
      toast(errText(e), 'err');
    }
  };
  const del = async (post) => {
    const ok = await confirm({ title: 'Жарияланымды жою?', text: post.title, okText: 'Жою', danger: true });
    if (!ok) return;
    try {
      await api.deletePost(post);
      removePost(post.id);
      reports.setData((d) => d.filter((g) => g.post.id !== post.id));
      toast('Жойылды');
      changed();
    } catch (e) {
      toast(errText(e), 'err');
    }
  };

  const groups = reports.data || [];
  return (
    <div className="wrap">
      <Back />
      <div className="page-head">
        <div>
          <h1 className="h1">Модерация</h1>
          <div className="sub">Мұғалімдер шағымданған жарияланымдар</div>
        </div>
      </div>
      {reports.loading && !reports.data ? (
        <div className="loading-row"><Spinner /></div>
      ) : reports.error ? (
        <ErrorBox error={reports.error} onRetry={reports.reload} />
      ) : !groups.length ? (
        <Empty icon={ICONS.moderation} title="Шағым жоқ" text="Барлығы тәртіпте! Жаңа шағымдар осында шығады." />
      ) : (
        <div className="stack mt-12">
          {groups.map((g) => (
            <div key={g.post.id} className="rcard report-box">
              <PostRow post={g.post} onOpen={() => open([g.post], 0)} extra={<span className="tag red"><Flag size={12} /> {g.reports.length}</span>} />
              <div className="r-list">
                {g.reports.map((r) => (
                  <div key={r.id} className="r-item">«{r.reason}» — {r.reporter || 'Мұғалім'}, {timeAgo(r.created_at)}</div>
                ))}
              </div>
              <div className="row">
                <button className="btn btn-light btn-sm" style={{ flex: 1 }} onClick={() => resolve(g.post.id)}><CircleCheck /> Қалдыру</button>
                <button className="btn btn-danger btn-sm" style={{ flex: 1 }} onClick={() => del(g.post)}><Trash2 /> Жою</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
function Announcements() {
  const { user } = useAuth();
  const { toast, confirm } = useUi();
  const list = useAsync(() => api.listAnnouncements(), []);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);

  const create = async (e) => {
    e.preventDefault();
    if (!title.trim()) return toast('Тақырыбын жазыңыз', 'err');
    setBusy(true);
    try {
      await api.createAnnouncement({ title: title.trim(), body: body.trim() }, user.id);
      setTitle('');
      setBody('');
      toast('Хабарландыру жарияланды');
      list.reload();
      changed();
      window.dispatchEvent(new Event('ssl-refresh'));
    } catch (err) {
      toast(errText(err), 'err');
    } finally {
      setBusy(false);
    }
  };
  const remove = async (a) => {
    if (!(await confirm({ title: 'Хабарландыруды жою?', text: a.title, okText: 'Жою', danger: true }))) return;
    try {
      await api.deleteAnnouncement(a.id);
      list.setData((d) => d.filter((x) => x.id !== a.id));
      toast('Жойылды');
      changed();
    } catch (err) {
      toast(errText(err), 'err');
    }
  };

  return (
    <div className="wrap">
      <Back />
      <div className="page-head">
        <div>
          <h1 className="h1">Хабарландырулар</h1>
          <div className="sub">Барлық мұғалімдер қоңырауша белгісінен көреді</div>
        </div>
      </div>
      <form className="rcard card-pad stack mt-12" onSubmit={create}>
        <div className="field">
          <label>Тақырыбы</label>
          <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Мысалы: Әдістемелік апталық" maxLength={160} />
        </div>
        <div className="field">
          <label>Мәтіні</label>
          <textarea className="textarea" value={body} onChange={(e) => setBody(e.target.value)} placeholder="Толық ақпарат…" maxLength={4000} />
        </div>
        <button className="btn btn-orange btn-block" disabled={busy}>{busy ? <Spinner size="sm" white /> : (<><Send /> Жариялау</>)}</button>
      </form>
      <div className="stack mt-16">
        {list.loading && !list.data ? (
          <div className="loading-row"><Spinner /></div>
        ) : list.error ? (
          <ErrorBox error={list.error} onRetry={list.reload} />
        ) : !(list.data || []).length ? (
          <Empty icon={ICONS.bell} title="Әзірге хабарландыру жоқ" />
        ) : (
          list.data.map((a) => (
            <div key={a.id} className="card ann">
              <div className="a-title">{a.title}</div>
              {a.body && <div className="a-body">{a.body}</div>}
              <div className="a-meta">
                {formatDate(a.created_at)}{a.author?.full_name ? ` · ${a.author.full_name}` : ''}
                <span className="spacer" />
                <button className="btn btn-danger btn-xs" onClick={() => remove(a)}><Trash2 /> Жою</button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

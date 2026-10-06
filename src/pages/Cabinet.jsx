import { useEffect, useState } from 'react';
import { ChevronRight, KeyRound, LogOut, Pencil, Plus, ShieldCheck } from 'lucide-react';
import { Avatar, Empty, ICONS, RowCard, Spinner } from '../components/bits.jsx';
import { PostGrid } from '../components/PostCard.jsx';
import { SubjectInput } from '../components/PostForms.jsx';
import { PasswordInput } from './Auth.jsx';
import { api } from '../lib/api/index.js';
import { usePosts } from '../lib/store.js';
import { errText, formatDate } from '../lib/util.js';
import { useAuth } from '../context/auth.jsx';
import { Sheet, useUi } from '../context/ui.jsx';
import { useViewer } from '../context/viewer.jsx';
import { IS_DEMO } from '../lib/config.js';

export function useAdminStats() {
  const [stats, setStats] = useState(null);
  const [error, setError] = useState(null);
  useEffect(() => {
    let alive = true;
    const run = () =>
      api
        .adminStats()
        .then((s) => alive && (setStats(s), setError(null)))
        .catch((e) => alive && setError(e));
    run();
    window.addEventListener('ssl-refresh', run);
    window.addEventListener('ssl-admin-changed', run);
    return () => {
      alive = false;
      window.removeEventListener('ssl-refresh', run);
      window.removeEventListener('ssl-admin-changed', run);
    };
  }, []);
  return { stats, error };
}

export function AdminPanel({ title = 'Басқару панелі' }) {
  const { stats, error } = useAdminStats();
  const n = (k) => (stats ? stats[k] ?? 0 : '…');
  return (
    <section>
      <h2 className="h1" style={{ fontSize: 28 }}>{title}</h2>
      {error && <div className="form-error mt-12">{errText(error)}</div>}
      <div className="stack mt-16">
        <RowCard icon={ICONS.users} title="Қолданушылар" sub={<>Басқару →</>} num={n('users')} href="#/admin/users" />
        <RowCard icon={ICONS.posts} title="Посттар" sub={<>Басқару →</>} num={n('posts')} href="#/admin/posts" />
        <RowCard icon={ICONS.moderation} title="Модерация" sub={<>Басқару →</>} num={n('pending_reports')} href="#/admin/moderation" />
        <RowCard icon={ICONS.bell} title="Хабарландырулар" sub={<>Басқару →</>} num={n('announcements')} href="#/admin/announcements" />
      </div>
    </section>
  );
}

export default function Cabinet() {
  const { user, isAdmin, signOut, refreshProfile } = useAuth();
  const { confirm } = useUi();
  const { open } = useViewer();
  const mine = usePosts({ authorId: user.id }, { pageSize: 60 });
  const [editOpen, setEditOpen] = useState(false);
  const [pwdOpen, setPwdOpen] = useState(false);

  useEffect(() => {
    refreshProfile().catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const videos = mine.items.filter((p) => p.kind === 'video' || p.kind === 'youtube').length;
  const likes = mine.items.reduce((s, p) => s + (p.likes_count || 0), 0);

  const logout = async () => {
    if (await confirm({ title: 'Шығу', text: 'Аккаунттан шығасыз ба?', okText: 'Шығу' })) signOut();
  };

  return (
    <div className="wrap">
      <div className="page-head">
        <h1 className="h1">Жеке кабинет</h1>
      </div>

      <div className="rcard profile-card mt-12">
        <Avatar name={user.full_name} id={user.id} size="lg" />
        <div className="p-name">{user.full_name || 'Атыңызды жазыңыз'}</div>
        <div className="p-role">
          {isAdmin ? 'Әкімші' : 'Мұғалім'}
          {user.subject ? ` · ${user.subject}` : ''}
        </div>
        <div className="p-mail">{user.email}</div>
        {user.is_blocked && <span className="tag red mt-8">Аккаунт бұғатталған</span>}
        <div className="stats">
          <div className="stat"><b>{user.posts_count ?? mine.items.length}</b><span>Жүктелген</span></div>
          <div className="stat"><b>{videos}</b><span>Видео</span></div>
          <div className="stat"><b>{likes}</b><span>Ұнатулар</span></div>
        </div>
        <div className="muted mt-8" style={{ fontSize: 12.5, fontWeight: 700 }}>Тіркелген күні: {formatDate(user.created_at)}</div>
      </div>

      {isAdmin && (
        <div className="mt-24">
          <AdminPanel />
        </div>
      )}

      <section>
        <div className="section-title">
          <h2 className="h2">Менің жарияланымдарым</h2>
          <a href="#/upload"><Plus size={18} /> Қосу</a>
        </div>
        <PostGrid
          list={mine}
          onOpen={open}
          showLab
          empty={
            <Empty icon={ICONS.camera} title="Әзірге жарияланым жоқ" text="Сабақта сәтті шыққан әдісті бейнеге түсіріп, бөлісіңіз.">
              <a className="btn btn-orange btn-sm mt-8" href="#/upload">Бірінші видеоны жүктеу</a>
            </Empty>
          }
        />
      </section>

      <div className="card menu mt-24">
        <button className="menu-item" onClick={() => setEditOpen(true)}>
          <span className="m-ico"><Pencil /></span>Профильді өңдеу<ChevronRight className="chev" />
        </button>
        <button className="menu-item" onClick={() => setPwdOpen(true)}>
          <span className="m-ico"><KeyRound /></span>Құпия сөзді өзгерту<ChevronRight className="chev" />
        </button>
        {isAdmin && (
          <a className="menu-item" href="#/admin/users">
            <span className="m-ico"><ShieldCheck /></span>Қолданушылар және жүктеулер<ChevronRight className="chev" />
          </a>
        )}
        <button className="menu-item danger" onClick={logout}>
          <span className="m-ico"><LogOut /></span>Шығу
        </button>
      </div>
      {IS_DEMO && <p className="muted center mt-16" style={{ fontSize: 13, fontWeight: 700 }}>Демо режим · деректер осы браузерде</p>}

      {editOpen && <EditProfileSheet open={editOpen} onClose={() => setEditOpen(false)} />}
      <ChangePasswordSheet open={pwdOpen} onClose={() => setPwdOpen(false)} />
    </div>
  );
}

function EditProfileSheet({ open, onClose }) {
  const { user, setProfile } = useAuth();
  const { toast } = useUi();
  const [name, setName] = useState(user.full_name || '');
  const [subject, setSubject] = useState(user.subject || '');
  const [busy, setBusy] = useState(false);
  const save = async (e) => {
    e.preventDefault();
    if (name.trim().length < 3) return toast('Аты-жөніңізді толық жазыңыз', 'err');
    setBusy(true);
    try {
      const p = await api.updateMyProfile(user.id, { full_name: name.trim(), subject: subject.trim() });
      setProfile({ full_name: p.full_name, subject: p.subject });
      toast('Профиль сақталды');
      onClose();
    } catch (err) {
      toast(errText(err), 'err');
    } finally {
      setBusy(false);
    }
  };
  return (
    <Sheet open={open} onClose={onClose} title="Профильді өңдеу">
      <form className="stack" onSubmit={save}>
        <div className="field">
          <label>Аты-жөні</label>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} maxLength={80} />
        </div>
        <div className="field">
          <label>Пәні</label>
          <SubjectInput value={subject} onChange={setSubject} id="prof-subjects" />
        </div>
        <button className="btn btn-orange btn-block" disabled={busy}>{busy ? <Spinner size="sm" white /> : 'Сақтау'}</button>
      </form>
    </Sheet>
  );
}

function ChangePasswordSheet({ open, onClose }) {
  const { toast } = useUi();
  const [pwd, setPwd] = useState('');
  const [busy, setBusy] = useState(false);
  const save = async (e) => {
    e.preventDefault();
    if (pwd.length < 6) return toast('Құпия сөз кемінде 6 таңба', 'err');
    setBusy(true);
    try {
      await api.updatePassword(pwd);
      toast('Құпия сөз өзгертілді');
      setPwd('');
      onClose();
    } catch (err) {
      toast(errText(err), 'err');
    } finally {
      setBusy(false);
    }
  };
  return (
    <Sheet open={open} onClose={onClose} title="Құпия сөзді өзгерту">
      <form className="stack" onSubmit={save}>
        <PasswordInput value={pwd} onChange={setPwd} autoComplete="new-password" placeholder="Жаңа құпия сөз" />
        <button className="btn btn-orange btn-block" disabled={busy}>{busy ? <Spinner size="sm" white /> : 'Сақтау'}</button>
      </form>
    </Sheet>
  );
}

import { useState } from 'react';
import { ArrowLeft, Eye, EyeOff } from 'lucide-react';
import { Logo, Spinner } from '../components/bits.jsx';
import { SubjectInput } from '../components/PostForms.jsx';
import { api } from '../lib/api/index.js';
import { errText } from '../lib/util.js';
import { IS_DEMO, SCHOOL } from '../lib/config.js';
import { Sheet, useUi } from '../context/ui.jsx';
import { useAuth } from '../context/auth.jsx';
import { navigate } from '../lib/router.js';

function PasswordInput({ value, onChange, autoComplete, placeholder = 'Кемінде 6 таңба' }) {
  const [show, setShow] = useState(false);
  return (
    <div className="input-wrap">
      <input
        className="input"
        type={show ? 'text' : 'password'}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete={autoComplete}
        placeholder={placeholder}
        minLength={6}
        required
      />
      <button type="button" className="eye" onClick={() => setShow((s) => !s)} aria-label={show ? 'Жасыру' : 'Көрсету'}>
        {show ? <EyeOff size={20} /> : <Eye size={20} />}
      </button>
    </div>
  );
}

export function goAfterLogin() {
  const back = sessionStorage.getItem('ssl_return');
  sessionStorage.removeItem('ssl_return');
  navigate(back && !back.startsWith('/login') && !back.startsWith('/register') ? back : '/', { replace: true });
}

export default function AuthPage({ mode }) {
  const isReg = mode === 'register';
  const [f, setF] = useState({ fullName: '', subject: '', email: '', password: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [forgot, setForgot] = useState(false);
  const set = (k) => (v) => setF((s) => ({ ...s, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setInfo('');
    const email = f.email.trim();
    if (isReg && f.fullName.trim().length < 3) return setError('Аты-жөніңізді толық жазыңыз.');
    if (!/^\S+@\S+\.\S+$/.test(email)) return setError('Email дұрыс емес.');
    if (f.password.length < 6) return setError('Құпия сөз кемінде 6 таңбадан тұруы керек.');
    setBusy(true);
    try {
      if (isReg) {
        const r = await api.signUp({ email, password: f.password, fullName: f.fullName.trim(), subject: f.subject.trim() });
        if (r.needsConfirm) {
          setInfo('Тіркелу сәтті! Поштаңызға растау хаты жіберілді — хаттағы сілтемені ашып, содан кейін кіріңіз.');
          return;
        }
      } else {
        await api.signIn({ email, password: f.password });
      }
      goAfterLogin();
    } catch (err) {
      setError(errText(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="wrap" style={{ maxWidth: 480 }}>
      <a className="back-btn" href="#/">
        <ArrowLeft size={18} /> Артқа
      </a>
      <div className="welcome-card mt-12" style={{ textAlign: 'left' }}>
        <Logo size="xs" tagline={false} />
        <h1 className="h1 center mt-16">{isReg ? 'Тіркелу' : 'Кіру'}</h1>
        <p className="center muted mt-8" style={{ fontWeight: 700 }}>
          {isReg ? 'Email мен құпия сөз арқылы аккаунт ашыңыз' : 'Аккаунтыңызға кіріңіз'}
        </p>
        <form className="stack mt-16" onSubmit={submit} noValidate>
          {isReg && (
            <>
              <div className="field">
                <label htmlFor="fn">Аты-жөні</label>
                <input id="fn" className="input" value={f.fullName} onChange={(e) => set('fullName')(e.target.value)} placeholder="Мысалы: Айгерім Нұрланқызы" autoComplete="name" maxLength={80} />
              </div>
              <div className="field">
                <label>Пәні</label>
                <SubjectInput value={f.subject} onChange={set('subject')} id="reg-subjects" />
              </div>
            </>
          )}
          <div className="field">
            <label htmlFor="em">Электрондық пошта</label>
            <input id="em" className="input" type="email" inputMode="email" value={f.email} onChange={(e) => set('email')(e.target.value)} placeholder="name@mail.kz" autoComplete="email" autoCapitalize="none" />
          </div>
          <div className="field">
            <label>Құпия сөз</label>
            <PasswordInput value={f.password} onChange={set('password')} autoComplete={isReg ? 'new-password' : 'current-password'} />
          </div>
          {error && <div className="form-error" role="alert">{error}</div>}
          {info && <div className="form-ok">{info}</div>}
          <button className="btn btn-rainbow btn-block" disabled={busy} type="submit">
            {busy ? <Spinner size="sm" white /> : isReg ? 'Тіркелу' : 'Кіру'}
          </button>
        </form>
        <div className="center mt-16" style={{ fontWeight: 700 }}>
          {isReg ? (
            <>Аккаунтыңыз бар ма? <a className="link-btn" href="#/login">Кіру</a></>
          ) : (
            <>
              Аккаунт жоқ па? <a className="link-btn" href="#/register">Тіркелу</a>
              <div className="mt-12">
                <button type="button" className="link-btn" onClick={() => setForgot(true)}>Құпия сөзді ұмыттыңыз ба?</button>
              </div>
            </>
          )}
        </div>
        {IS_DEMO && !isReg && (
          <div className="form-ok mt-16" style={{ fontSize: 13.5 }}>
            Демо әкімші: <b>admin@demo.kz</b> / <b>demo123</b>
          </div>
        )}
      </div>
      <ForgotSheet open={forgot} onClose={() => setForgot(false)} initialEmail={f.email} />
    </div>
  );
}

function ForgotSheet({ open, onClose, initialEmail }) {
  const [email, setEmail] = useState(initialEmail || '');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);
  const send = async (e) => {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      await api.resetPassword(email.trim());
      setMsg({ ok: true, text: 'Поштаңызға құпия сөзді қалпына келтіру сілтемесі жіберілді.' });
    } catch (err) {
      setMsg({ ok: false, text: errText(err) });
    } finally {
      setBusy(false);
    }
  };
  return (
    <Sheet open={open} onClose={onClose} title="Құпия сөзді қалпына келтіру">
      <form className="stack" onSubmit={send}>
        <p className="muted" style={{ fontWeight: 600 }}>
          Email жазыңыз — сілтеме жібереміз. Хат келмесе, мектеп әкімшісіне хабарласыңыз: ол сізге уақытша құпия сөз бере алады.
        </p>
        <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@mail.kz" autoCapitalize="none" />
        {msg && <div className={msg.ok ? 'form-ok' : 'form-error'}>{msg.text}</div>}
        <button className="btn btn-orange btn-block" disabled={busy || !email.trim()}>
          {busy ? <Spinner size="sm" white /> : 'Сілтеме жіберу'}
        </button>
        <div className="muted center" style={{ fontSize: 13.5, fontWeight: 700 }}>
          Әкімші: <a className="link-btn" href={`mailto:${SCHOOL.email}`}>{SCHOOL.email}</a> · <a className="link-btn" href={SCHOOL.phoneHref}>{SCHOOL.phone}</a>
        </div>
      </form>
    </Sheet>
  );
}

export function RecoverySheet() {
  const { recovery, endRecovery } = useAuth();
  const { toast } = useUi();
  const [pwd, setPwd] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const save = async (e) => {
    e.preventDefault();
    if (pwd.length < 6) return setError('Құпия сөз кемінде 6 таңбадан тұруы керек.');
    setBusy(true);
    try {
      await api.updatePassword(pwd);
      toast('Жаңа құпия сөз сақталды');
      endRecovery();
    } catch (err) {
      setError(errText(err));
    } finally {
      setBusy(false);
    }
  };
  return (
    <Sheet open={recovery} onClose={endRecovery} title="Жаңа құпия сөз">
      <form className="stack" onSubmit={save}>
        <PasswordInput value={pwd} onChange={setPwd} autoComplete="new-password" />
        {error && <div className="form-error">{error}</div>}
        <button className="btn btn-orange btn-block" disabled={busy}>{busy ? <Spinner size="sm" white /> : 'Сақтау'}</button>
      </form>
    </Sheet>
  );
}

export { PasswordInput };

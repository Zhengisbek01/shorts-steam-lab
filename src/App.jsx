import { Component, useEffect, useState } from 'react';
import { AuthProvider, useAuth } from './context/auth.jsx';
import { Sheet, UiProvider } from './context/ui.jsx';
import { ViewerProvider } from './context/viewer.jsx';
import { useRoute, navigate } from './lib/router.js';
import { IS_DEMO } from './lib/config.js';
import { errText } from './lib/util.js';
import { BottomNav, DemoBar, TopBar } from './components/Chrome.jsx';
import { Logo, Spinner } from './components/bits.jsx';
import Welcome from './pages/Welcome.jsx';
import AuthPage, { RecoverySheet } from './pages/Auth.jsx';
import Home from './pages/Home.jsx';
import Feed from './pages/Feed.jsx';
import Lab from './pages/Lab.jsx';
import Upload from './pages/Upload.jsx';
import Cabinet from './pages/Cabinet.jsx';
import Admin from './pages/Admin.jsx';
import Notifications from './pages/Notifications.jsx';
import Helper from './pages/Helper.jsx';
import PostPage from './pages/PostPage.jsx';

export default function App() {
  return (
    <UiProvider>
      <AuthProvider>
        <ViewerProvider>
          <Shell />
        </ViewerProvider>
      </AuthProvider>
    </UiProvider>
  );
}

class PageBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error) {
    return { error };
  }
  componentDidCatch(error) {
    console.error(error);
  }
  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="wrap">
        <div className="card card-pad mt-24 center stack">
          <div className="h3">Бетті көрсету мүмкін болмады</div>
          <p className="muted" style={{ fontWeight: 600 }}>Бетті жаңартып көріңіз. Қате қайталанса, әкімшіге хабарласыңыз.</p>
          <button className="btn btn-orange btn-sm" onClick={() => window.location.reload()}>Жаңарту</button>
        </div>
      </div>
    );
  }
}

function Splash() {
  return (
    <div className="splash">
      <Logo size="sm" />
      <Spinner />
    </div>
  );
}

function DemoInfo({ open, onClose }) {
  return (
    <Sheet open={open} onClose={onClose} title="Демо режим туралы">
      <div className="stack" style={{ fontWeight: 600, color: 'var(--text-2)' }}>
        <p>Сайт әзірге дерекқорға қосылмаған, сондықтан тіркелу, видеолар мен посттар тек осы браузерде сақталады — басқа телефондан көрінбейді.</p>
        <p>Нақты жұмыс үшін Supabase (тегін) жобасын қосу керек: <b>supabase/schema.sql</b> файлын іске қосып, Project URL мен anon кілтін <b>config.js</b> файлына немесе Vercel баптауларына жазыңыз. Нұсқаулық — README.md.</p>
        <p>Демо әкімші: <b>admin@demo.kz</b> / <b>demo123</b></p>
      </div>
    </Sheet>
  );
}

function resolve(route) {
  const [a, b] = route.parts;
  switch (a) {
    case undefined:
      return ['home', <Home />];
    case 'feed':
      return ['feed', <Feed query={route.query} />];
    case 'lab':
      return ['lab', <Lab section={b} key={b || 'lab'} />];
    case 'upload':
      return ['plus', <Upload query={route.query} key={route.query.lab + (route.query.s || '')} />];
    case 'me':
      return ['me', <Cabinet />];
    case 'admin':
      return ['me', <Admin sub={b} key={b || 'admin'} />];
    case 'notifications':
      return ['', <Notifications />];
    case 'helper':
      return ['', <Helper />];
    case 'p':
      return ['feed', <PostPage id={b} key={b} />];
    default:
      return ['home', <Home />];
  }
}

const GUEST_PATHS = ['/', '/login', '/register', '/helper'];

function Shell() {
  const auth = useAuth();
  const route = useRoute();
  const [demoInfo, setDemoInfo] = useState(false);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [route.path]);

  // remember where a guest wanted to go (e.g. a shared post link) and return after login
  useEffect(() => {
    if (auth.status === 'guest' && !GUEST_PATHS.includes(route.path)) {
      sessionStorage.setItem('ssl_return', route.path + (Object.keys(route.query).length ? '?' + new URLSearchParams(route.query) : ''));
    }
    if (auth.status === 'ready' && (route.path === '/login' || route.path === '/register')) navigate('/', { replace: true });
  }, [auth.status, route.path, route.query]);

  const demo = <DemoBar onInfo={() => setDemoInfo(true)} />;
  const demoSheet = <DemoInfo open={demoInfo} onClose={() => setDemoInfo(false)} />;

  if (auth.status === 'loading') return <Splash />;

  if (auth.status === 'error') {
    return (
      <div className="splash">
        <Logo size="sm" />
        <div className="form-error" style={{ maxWidth: 360 }}>Профильді жүктеу мүмкін болмады. {errText(auth.error)}</div>
        <div className="row">
          <button className="btn btn-orange btn-sm" onClick={auth.retry}>Қайталау</button>
          <button className="btn btn-light btn-sm" onClick={auth.signOut}>Шығу</button>
        </div>
      </div>
    );
  }

  if (auth.status === 'guest') {
    let page = <Welcome />;
    if (route.path === '/login') page = <AuthPage mode="login" key="login" />;
    else if (route.path === '/register') page = <AuthPage mode="register" key="register" />;
    else if (route.path === '/helper') page = <Helper />;
    return (
      <div className={`app guest ${IS_DEMO ? 'has-demobar' : ''}`}>
        {demo}
        {page}
        {demoSheet}
      </div>
    );
  }

  const [tab, page] = resolve(route);
  return (
    <div className={`app ${IS_DEMO ? 'has-demobar' : ''}`}>
      {demo}
      <TopBar />
      <main>
        <PageBoundary key={route.path}>{page}</PageBoundary>
      </main>
      <BottomNav active={tab} />
      <RecoverySheet />
      {demoSheet}
    </div>
  );
}

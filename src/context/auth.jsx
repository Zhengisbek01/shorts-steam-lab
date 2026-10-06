import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../lib/api/index.js';
import { clearLikes, invalidatePosts, loadLikes } from '../lib/store.js';

const AuthCtx = createContext(null);
export const useAuth = () => useContext(AuthCtx);

export function AuthProvider({ children }) {
  const [state, setState] = useState({ status: 'loading', session: null, profile: null, error: null });
  const [recovery, setRecovery] = useState(false);
  const userRef = useRef(undefined);

  const load = useCallback(async (session) => {
    if (!session) {
      userRef.current = null;
      clearLikes();
      setState({ status: 'guest', session: null, profile: null, error: null });
      return;
    }
    userRef.current = session.userId;
    setState((s) => ({ ...s, session, status: s.profile && s.profile.id === session.userId ? 'ready' : 'loading' }));
    try {
      const profile = await api.getMyProfile(session);
      if (userRef.current !== session.userId) return;
      setState({ status: 'ready', session, profile, error: null });
      loadLikes(session.userId);
    } catch (error) {
      if (userRef.current !== session.userId) return;
      setState({ status: 'error', session, profile: null, error });
    }
  }, []);

  useEffect(() => {
    let alive = true;
    api
      .getSession()
      .then((s) => {
        if (alive && userRef.current === undefined) load(s);
      })
      .catch(() => alive && load(null));
    const off = api.onAuthChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') setRecovery(true);
      if (event === 'SIGNED_OUT') {
        setTimeout(() => load(null), 0);
        return;
      }
      if (session && session.userId !== userRef.current) {
        userRef.current = session.userId;
        setState((s) => ({ ...s, status: 'loading', session, profile: null }));
        // defer: supabase-js recommends not awaiting other calls inside this callback
        setTimeout(() => load(session), 0);
      }
    });
    return () => {
      alive = false;
      off();
    };
  }, [load]);

  const value = useMemo(
    () => ({
      ...state,
      user: state.profile,
      isAdmin: state.profile?.role === 'admin',
      recovery,
      endRecovery: () => setRecovery(false),
      retry: () => load(state.session),
      refreshProfile: async () => {
        if (!state.session) return;
        const profile = await api.getMyProfile(state.session);
        setState((s) => ({ ...s, profile }));
      },
      setProfile: (patch) => setState((s) => ({ ...s, profile: s.profile ? { ...s.profile, ...patch } : s.profile })),
      signOut: async () => {
        await api.signOut();
        invalidatePosts();
        load(null);
      },
    }),
    [state, recovery, load]
  );

  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}

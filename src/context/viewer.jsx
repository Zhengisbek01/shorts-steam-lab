import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { ShortsViewer } from '../components/ShortsViewer.jsx';

const ViewerCtx = createContext(null);
export const useViewer = () => useContext(ViewerCtx);

export function ViewerProvider({ children }) {
  const [state, setState] = useState(null);

  const open = useCallback((items, index = 0) => {
    if (!items || !items.length) return;
    window.history.pushState({ sslViewer: true }, '');
    setState({ items, index, key: Date.now() });
  }, []);

  const close = useCallback(() => {
    if (window.history.state && window.history.state.sslViewer) window.history.back();
    else setState(null);
  }, []);

  useEffect(() => {
    const onPop = () => setState(null);
    window.addEventListener('popstate', onPop);
    window.addEventListener('hashchange', onPop);
    return () => {
      window.removeEventListener('popstate', onPop);
      window.removeEventListener('hashchange', onPop);
    };
  }, []);

  return (
    <ViewerCtx.Provider value={{ open, close }}>
      {children}
      {state && <ShortsViewer key={state.key} items={state.items} start={state.index} onClose={close} />}
    </ViewerCtx.Provider>
  );
}

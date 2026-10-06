import { useEffect, useState } from 'react';

function parse() {
  const h = window.location.hash.replace(/^#/, '') || '/';
  const qIndex = h.indexOf('?');
  const path = (qIndex >= 0 ? h.slice(0, qIndex) : h) || '/';
  const qs = qIndex >= 0 ? h.slice(qIndex + 1) : '';
  const query = Object.fromEntries(new URLSearchParams(qs));
  return { path, query, parts: path.split('/').filter(Boolean) };
}

export function useRoute() {
  const [route, setRoute] = useState(parse);
  useEffect(() => {
    const on = () => setRoute(parse());
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  return route;
}

export function navigate(to, { replace = false } = {}) {
  const target = '#' + to;
  if (window.location.hash === target) {
    window.dispatchEvent(new HashChangeEvent('hashchange'));
    return;
  }
  if (replace) {
    window.history.replaceState(window.history.state, '', target);
    window.dispatchEvent(new HashChangeEvent('hashchange'));
  } else {
    window.location.hash = to;
  }
}

export function buildQuery(params) {
  const q = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') q.set(k, v);
  });
  const s = q.toString();
  return s ? `?${s}` : '';
}

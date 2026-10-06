import { useEffect, useState } from 'react';
import { Empty, ICONS, Spinner } from '../components/bits.jsx';
import { ShortsViewer } from '../components/ShortsViewer.jsx';
import { api } from '../lib/api/index.js';
import { navigate } from '../lib/router.js';

export default function PostPage({ id }) {
  const [state, setState] = useState({ loading: true, post: null });
  useEffect(() => {
    let alive = true;
    api
      .getPost(id)
      .then((post) => alive && setState({ loading: false, post }))
      .catch(() => alive && setState({ loading: false, post: null }));
    return () => {
      alive = false;
    };
  }, [id]);

  if (state.loading) return <div className="loading-row" style={{ paddingTop: 80 }}><Spinner /></div>;
  if (!state.post) {
    return (
      <div className="wrap">
        <Empty icon={ICONS.posts} title="Жарияланым табылмады" text="Мүмкін, ол өшірілген.">
          <a className="btn btn-orange btn-sm mt-8" href="#/feed">Лентаға өту</a>
        </Empty>
      </div>
    );
  }
  return (
    <ShortsViewer
      items={[state.post]}
      start={0}
      onClose={() => navigate(state.post.is_lab ? `/lab/${state.post.section}` : '/feed', { replace: true })}
    />
  );
}

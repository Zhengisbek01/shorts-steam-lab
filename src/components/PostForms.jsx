import { useState } from 'react';
import { SECTIONS, SUBJECTS, GRADES } from '../lib/steam.js';
import { Sheet, useUi } from '../context/ui.jsx';
import { api } from '../lib/api/index.js';
import { patchPost } from '../lib/store.js';
import { errText } from '../lib/util.js';
import { Spinner } from './bits.jsx';

export function SectionPicker({ value, onChange }) {
  return (
    <div className="sec-pick" role="radiogroup" aria-label="STEAM бөлімі">
      {SECTIONS.map((s) => (
        <button
          key={s.key}
          type="button"
          role="radio"
          aria-checked={value === s.key}
          className={value === s.key ? 'on' : ''}
          onClick={() => onChange(s.key)}
        >
          <img src={s.icon} alt="" />
          <span>
            {s.en}
            <small>{s.kk}</small>
          </span>
        </button>
      ))}
    </div>
  );
}

export function SubjectInput({ value, onChange, id = 'subject-list' }) {
  return (
    <>
      <input
        className="input"
        list={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Мысалы: Физика"
        maxLength={60}
        autoComplete="off"
      />
      <datalist id={id}>
        {SUBJECTS.map((s) => (
          <option key={s} value={s} />
        ))}
      </datalist>
    </>
  );
}

export function GradeSelect({ value, onChange }) {
  return (
    <select className="input select" value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="">Барлығы</option>
      {GRADES.map((g) => (
        <option key={g} value={g}>{g}-сынып</option>
      ))}
    </select>
  );
}

export function EditPostSheet({ post, open, onClose, onSaved }) {
  const { toast } = useUi();
  const [f, setF] = useState(() => ({
    title: post?.title || '',
    description: post?.description || '',
    section: post?.section || 'science',
    subject: post?.subject || '',
    grade: post?.grade || '',
  }));
  const [busy, setBusy] = useState(false);
  const set = (k) => (v) => setF((s) => ({ ...s, [k]: v }));

  const save = async (e) => {
    e.preventDefault();
    if (!f.title.trim()) return toast('Атауын жазыңыз', 'err');
    setBusy(true);
    try {
      const updated = await api.updatePost(post.id, { ...f, title: f.title.trim(), description: f.description.trim() });
      patchPost(post.id, updated);
      toast('Сақталды');
      onSaved?.(updated);
      onClose();
    } catch (err) {
      toast(errText(err), 'err');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet open={open} onClose={onClose} title="Жарияланымды өңдеу">
      <form className="stack" onSubmit={save}>
        <div className="field">
          <label>Атауы</label>
          <input className="input" value={f.title} onChange={(e) => set('title')(e.target.value)} maxLength={140} />
        </div>
        <div className="field">
          <label>Сипаттама</label>
          <textarea className="textarea" value={f.description} onChange={(e) => set('description')(e.target.value)} maxLength={4000} />
        </div>
        <div className="field">
          <label>STEAM бөлімі</label>
          <SectionPicker value={f.section} onChange={set('section')} />
        </div>
        <div className="row" style={{ alignItems: 'flex-start' }}>
          <div className="field" style={{ flex: 1.4 }}>
            <label>Пән</label>
            <SubjectInput value={f.subject} onChange={set('subject')} id="edit-subjects" />
          </div>
          <div className="field" style={{ flex: 1 }}>
            <label>Сынып</label>
            <GradeSelect value={f.grade} onChange={set('grade')} />
          </div>
        </div>
        <button className="btn btn-orange btn-block" disabled={busy}>
          {busy ? <Spinner size="sm" white /> : 'Сақтау'}
        </button>
      </form>
    </Sheet>
  );
}

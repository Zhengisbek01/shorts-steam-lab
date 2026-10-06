import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { CircleCheck, TriangleAlert, X } from 'lucide-react';

const UiCtx = createContext(null);
export const useUi = () => useContext(UiCtx);

export function UiProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const [dialog, setDialog] = useState(null);

  const toast = useCallback((text, type = 'ok') => {
    const id = Math.random().toString(36).slice(2);
    setToasts((t) => [...t.slice(-2), { id, text, type }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), type === 'err' ? 4200 : 2800);
  }, []);

  const confirm = useCallback((opts) => new Promise((resolve) => setDialog({ ...opts, resolve })), []);
  const prompt = useCallback((opts) => new Promise((resolve) => setDialog({ ...opts, input: true, resolve })), []);

  return (
    <UiCtx.Provider value={{ toast, confirm, prompt }}>
      {children}
      {createPortal(
        <div className="toasts" aria-live="polite">
          {toasts.map((t) => (
            <div key={t.id} className={`toast ${t.type}`}>
              {t.type === 'err' ? <TriangleAlert /> : <CircleCheck />}
              <span>{t.text}</span>
            </div>
          ))}
        </div>,
        document.body
      )}
      {dialog && <Dialog {...dialog} close={() => setDialog(null)} />}
    </UiCtx.Provider>
  );
}

function Dialog({ title, text, okText = 'Иә', cancelText = 'Болдырмау', danger, input, placeholder, initial = '', inputType = 'text', resolve, close }) {
  const [value, setValue] = useState(initial);
  const ref = useRef(null);
  useEffect(() => {
    if (input) setTimeout(() => ref.current?.focus(), 60);
  }, [input]);
  const done = (ok) => {
    resolve(input ? (ok ? value : null) : ok);
    close();
  };
  return createPortal(
    <>
      <div className="backdrop" onClick={() => done(false)} />
      <div className="dialog" role="dialog" aria-modal="true">
        <h3>{title}</h3>
        {text && <p>{text}</p>}
        {input && (
          <input
            ref={ref}
            className="input mt-12"
            type={inputType}
            value={value}
            placeholder={placeholder}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && done(true)}
          />
        )}
        <div className="d-actions">
          <button className="btn btn-light" onClick={() => done(false)}>{cancelText}</button>
          <button className={`btn ${danger ? 'btn-danger-solid' : 'btn-orange'}`} onClick={() => done(true)}>{okText}</button>
        </div>
      </div>
    </>,
    document.body
  );
}

export function Sheet({ open, onClose, title, children }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);
  if (!open) return null;
  return createPortal(
    <>
      <div className="backdrop" onClick={onClose} />
      <div className="sheet" role="dialog" aria-modal="true">
        <div className="sheet-handle" />
        {title && (
          <div className="row">
            <div className="sheet-title">{title}</div>
            <div className="spacer" />
            <button className="icon-btn" onClick={onClose} aria-label="Жабу" style={{ width: 36, height: 36, boxShadow: 'none' }}>
              <X size={18} />
            </button>
          </div>
        )}
        {children}
      </div>
    </>,
    document.body
  );
}

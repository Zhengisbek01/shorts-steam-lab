import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, Clapperboard, FileText, Link2, Trash2 } from 'lucide-react';
import { ICONS, Spinner, YouTubeIcon } from '../components/bits.jsx';
import { GradeSelect, SectionPicker, SubjectInput } from '../components/PostForms.jsx';
import { api } from '../lib/api/index.js';
import { compressImage, isImageFile, isVideoFile, normalizeFile, videoMeta, ytThumb } from '../lib/media.js';
import { invalidatePosts } from '../lib/store.js';
import { errText, fmtBytes, fmtDuration, parseYouTube } from '../lib/util.js';
import { MAX_VIDEO_MB } from '../lib/config.js';
import { sectionOf } from '../lib/steam.js';
import { useAuth } from '../context/auth.jsx';
import { useUi } from '../context/ui.jsx';
import { navigate } from '../lib/router.js';

const KINDS = [
  { key: 'video', label: 'Видео', Icon: Clapperboard },
  { key: 'youtube', label: 'Сілтеме', Icon: Link2 },
  { key: 'post', label: 'Пост', Icon: FileText },
];

export default function Upload({ query }) {
  const { user, isAdmin, refreshProfile } = useAuth();
  const { toast } = useUi();
  const [kind, setKind] = useState('video');
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState('');
  const [meta, setMeta] = useState(null);
  const [reading, setReading] = useState(false);
  const [yt, setYt] = useState('');
  const [f, setF] = useState({
    title: '',
    description: '',
    section: query.s && sectionOf(query.s).key === query.s ? query.s : '',
    subject: user?.subject || '',
    grade: '',
    is_lab: isAdmin && query.lab === '1',
  });
  const [progress, setProgress] = useState(null);
  const [error, setError] = useState('');
  const inputRef = useRef(null);
  const set = (k) => (v) => setF((s) => ({ ...s, [k]: v }));
  const ytId = parseYouTube(yt);

  useEffect(() => () => preview && URL.revokeObjectURL(preview), [preview]);

  const clearFile = () => {
    setFile(null);
    setMeta(null);
    setPreview('');
    if (inputRef.current) inputRef.current.value = '';
  };

  const switchKind = (k) => {
    if (k === kind) return;
    clearFile();
    setError('');
    setKind(k);
  };

  const pick = async (e) => {
    const raw = e.target.files && e.target.files[0];
    if (!raw) return;
    setError('');
    if (kind === 'video') {
      if (!isVideoFile(raw)) return setError('Видео файл таңдаңыз (MP4, MOV, WEBM).');
      if (raw.size > MAX_VIDEO_MB * 1024 * 1024) {
        return setError(`Видео тым үлкен (${fmtBytes(raw.size)}). Ең көбі ${MAX_VIDEO_MB} МБ. Видеоны қысқартыңыз немесе YouTube сілтемесін қосыңыз.`);
      }
      const vf = normalizeFile(raw, 'video');
      setFile(vf);
      setPreview(URL.createObjectURL(vf));
      setReading(true);
      const m = await videoMeta(vf);
      setMeta(m);
      setReading(false);
      if (!f.title) set('title')(vf.name.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').slice(0, 100));
    } else {
      if (!isImageFile(raw)) return setError('Сурет файлын таңдаңыз (JPG, PNG).');
      setReading(true);
      const img = await compressImage(normalizeFile(raw, 'image'));
      setReading(false);
      if (img.size > 15 * 1024 * 1024) return setError('Сурет тым үлкен.');
      setFile(img);
      setPreview(URL.createObjectURL(img));
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (user?.is_blocked) return setError('Аккаунтыңыз бұғатталған. Әкімшіге хабарласыңыз.');
    if (kind === 'video' && !file) return setError('Алдымен видео таңдаңыз.');
    if (kind === 'youtube' && !ytId) return setError('YouTube сілтемесі дұрыс емес. Мысалы: https://youtube.com/shorts/…');
    if (!f.title.trim()) return setError('Атауын жазыңыз.');
    if (!f.section) return setError('STEAM бөлімін таңдаңыз.');
    if (kind === 'post' && !file && !f.description.trim()) return setError('Пост мәтінін жазыңыз немесе сурет қосыңыз.');

    const realKind = kind === 'post' ? (file ? 'image' : 'text') : kind;
    setProgress(0);
    try {
      const post = await api.createPost({
        userId: user.id,
        fields: {
          ...f,
          title: f.title.trim(),
          description: f.description.trim(),
          subject: f.subject.trim(),
          kind: realKind,
          youtube_id: realKind === 'youtube' ? ytId : null,
          duration: realKind === 'video' ? meta?.duration : null,
          is_lab: isAdmin && f.is_lab,
        },
        file: realKind === 'video' || realKind === 'image' ? file : null,
        thumb: realKind === 'video' ? meta?.thumb : null,
        onProgress: setProgress,
      });
      invalidatePosts();
      window.dispatchEvent(new Event('ssl-refresh'));
      refreshProfile().catch(() => {});
      toast('Жарияланды! Рақмет 🎉');
      navigate(post.is_lab ? `/lab/${post.section}` : `/feed?s=${post.section}`, { replace: true });
    } catch (err) {
      setProgress(null);
      setError(errText(err));
    }
  };

  const uploading = progress !== null;

  return (
    <div className="wrap">
      <button className="back-btn" onClick={() => window.history.back()}><ArrowLeft size={18} /> Артқа</button>
      <div className="page-head">
        <div>
          <h1 className="h1">Жариялау</h1>
          <div className="sub">Сабақтағы идеяңызды әріптестеріңізбен бөлісіңіз</div>
        </div>
      </div>

      {user?.is_blocked && <div className="form-error mt-8">Аккаунтыңыз бұғатталған — жариялау мүмкін емес. Әкімшіге хабарласыңыз.</div>}

      <form className="stack-lg mt-12" onSubmit={submit}>
        <div className="seg" role="tablist">
          {KINDS.map(({ key, label, Icon }) => (
            <button type="button" key={key} className={kind === key ? 'on' : ''} onClick={() => switchKind(key)} role="tab" aria-selected={kind === key} disabled={uploading}>
              <Icon />
              {label}
            </button>
          ))}
        </div>

        {kind === 'video' && (
          <div className="stack">
            {!file ? (
              <button type="button" className="drop" onClick={() => inputRef.current?.click()}>
                <img src={ICONS.camera} alt="" />
                <b>Видео таңдау немесе түсіру</b>
                <span>MP4 / MOV · ең көбі {MAX_VIDEO_MB} МБ · тік (9:16) видео жақсы көрінеді</span>
              </button>
            ) : (
              <>
                <div className="preview">
                  <video src={preview} controls playsInline muted />
                  {!uploading && (
                    <button type="button" className="btn btn-light btn-xs remove" onClick={clearFile}><Trash2 /> Алып тастау</button>
                  )}
                </div>
                <div className="file-meta">
                  <span>{file.name}</span>
                  <span>{fmtBytes(file.size)}</span>
                  {meta?.duration ? <span>{fmtDuration(meta.duration)}</span> : null}
                  {reading && <span>Видео оқылуда…</span>}
                </div>
              </>
            )}
            <input ref={inputRef} type="file" accept="video/*" className="hidden" onChange={pick} />
          </div>
        )}

        {kind === 'youtube' && (
          <div className="field">
            <label htmlFor="yt">YouTube / Shorts сілтемесі</label>
            <input id="yt" className="input" value={yt} onChange={(e) => setYt(e.target.value)} placeholder="https://youtube.com/shorts/…" inputMode="url" autoCapitalize="none" />
            <span className="hint">Басқа дереккөздердегі пайдалы идеяларды файлсыз қосуға болады.</span>
            {ytId && (
              <div className="preview mt-8" style={{ maxWidth: 320 }}>
                <img src={ytThumb(ytId)} alt="" />
                <span className="tag dark" style={{ position: 'absolute', left: 10, bottom: 10 }}><YouTubeIcon size={14} /> YouTube</span>
              </div>
            )}
          </div>
        )}

        {kind === 'post' && (
          <div className="stack">
            {!file ? (
              <button type="button" className="drop" style={{ minHeight: 130 }} onClick={() => inputRef.current?.click()}>
                <img src={ICONS.posts} alt="" style={{ width: 56, height: 56 }} />
                <b>Сурет қосу (міндетті емес)</b>
                <span>Сабақ сәті, сызба, жұмыс парағы</span>
              </button>
            ) : (
              <div className="preview">
                <img src={preview} alt="" />
                {!uploading && <button type="button" className="btn btn-light btn-xs remove" onClick={clearFile}><Trash2 /> Алып тастау</button>}
              </div>
            )}
            <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={pick} />
          </div>
        )}

        <div className="field">
          <label htmlFor="title">Атауы</label>
          <input id="title" className="input" value={f.title} onChange={(e) => set('title')(e.target.value)} placeholder="Мысалы: Түсті сүт тәжірибесі" maxLength={140} />
        </div>

        <div className="field">
          <label htmlFor="desc">{kind === 'post' ? 'Пост мәтіні' : 'Сипаттама'}</label>
          <textarea
            id="desc"
            className="textarea"
            value={f.description}
            onChange={(e) => set('description')(e.target.value)}
            placeholder="Сабақта қалай қолдандыңыз? Қандай материалдар керек? Нәтижесі қандай?"
            maxLength={4000}
            rows={kind === 'post' ? 6 : 4}
          />
        </div>

        <div className="field">
          <label>STEAM бөлімі</label>
          <SectionPicker value={f.section} onChange={set('section')} />
        </div>

        <div className="row" style={{ alignItems: 'flex-start' }}>
          <div className="field" style={{ flex: 1.4, minWidth: 0 }}>
            <label>Пән</label>
            <SubjectInput value={f.subject} onChange={set('subject')} id="up-subjects" />
          </div>
          <div className="field" style={{ flex: 1, minWidth: 0 }}>
            <label>Сынып</label>
            <GradeSelect value={f.grade} onChange={set('grade')} />
          </div>
        </div>

        {isAdmin && (
          <button type="button" className={`switch ${f.is_lab ? 'on' : ''}`} onClick={() => set('is_lab')(!f.is_lab)} aria-pressed={f.is_lab}>
            <span className="knob" />
            <span>
              <div className="sw-title">Lab Shorts бөліміне жариялау</div>
              <div className="sw-sub">{f.is_lab ? 'Зертханалық идея ретінде Lab бумасында көрінеді' : 'Жалпы Лентада көрінеді'}</div>
            </span>
          </button>
        )}

        {error && <div className="form-error" role="alert">{error}</div>}

        {uploading ? (
          <div className="card card-pad stack">
            <div className="row">
              <Spinner size="sm" />
              <b>{progress < 1 ? `Жүктелуде… ${Math.round(progress * 100)}%` : 'Сақталуда…'}</b>
            </div>
            <div className="progress"><div style={{ width: `${Math.round(progress * 100)}%` }} /></div>
            <div className="muted" style={{ fontSize: 13, fontWeight: 700 }}>Бетті жаппаңыз — видео жүктеліп жатыр.</div>
          </div>
        ) : (
          <button className="btn btn-rainbow btn-block" type="submit" disabled={reading || user?.is_blocked}>
            Жариялау
          </button>
        )}
      </form>
    </div>
  );
}

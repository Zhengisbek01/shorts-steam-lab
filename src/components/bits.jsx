import { ChevronRight } from 'lucide-react';
import logo from '../assets/logo.webp';
import mark from '../assets/mark.webp';
import users from '../assets/icons/users.webp';
import posts from '../assets/icons/posts.webp';
import moderation from '../assets/icons/moderation.webp';
import bell from '../assets/icons/bell.webp';
import bellring from '../assets/icons/bellring.webp';
import camera from '../assets/icons/camera.webp';
import robot from '../assets/icons/robot.webp';
import { avatarGradient, initials } from '../lib/util.js';

export const ICONS = { users, posts, moderation, bell, bellring, camera, robot, mark, logo };

export function Ico({ name, src, size = 64, alt = '', className = '' }) {
  return (
    <img
      src={src || ICONS[name]}
      width={size}
      height={size}
      alt={alt}
      className={className}
      style={{ width: size, height: size, objectFit: 'contain' }}
      draggable="false"
    />
  );
}

export function Logo({ size = 'md', tagline = true }) {
  return (
    <div className={`logo ${size}`}>
      <img className="logo-img" src={logo} alt="Shorts STEAM Lab" width="900" height="767" draggable="false" />
      {tagline && (
        <>
          <div className="tagline">Бір идея — мың мүмкіндік!</div>
          <svg className="tagline-line" viewBox="0 0 300 10" preserveAspectRatio="none" aria-hidden="true">
            <defs>
              <linearGradient id="tl" x1="0" x2="1">
                <stop offset="0" stopColor="#f6c343" stopOpacity="0.15" />
                <stop offset="0.12" stopColor="#f2b52b" />
                <stop offset="0.88" stopColor="#f2b52b" />
                <stop offset="1" stopColor="#f6c343" stopOpacity="0.15" />
              </linearGradient>
            </defs>
            <path d="M4 7 C 80 2, 220 2, 296 6" stroke="url(#tl)" strokeWidth="3.4" fill="none" strokeLinecap="round" />
          </svg>
        </>
      )}
    </div>
  );
}

export function BrandText() {
  return (
    <span className="brand-text">
      Shorts{' '}
      <span className="s">S</span>
      <span className="t">T</span>
      <span className="e">E</span>
      <span className="a">A</span>
      <span className="m">M</span> <span className="lab">Lab</span>
    </span>
  );
}

export function Avatar({ name, id, size = '' }) {
  return (
    <div className={`avatar ${size}`} style={{ background: avatarGradient(id || name || '') }} aria-hidden="true">
      {initials(name)}
    </div>
  );
}

export function RowCard({ icon, title, kk, sub, num, onClick, href, chevron }) {
  const inner = (
    <>
      {icon && <img className="ico3d" src={icon} alt="" draggable="false" />}
      <div className="rc-main">
        <div className="rc-title">
          {title}
          {kk && <span className="kk"> ({kk})</span>}
        </div>
        {sub && <div className="rc-sub">{sub}</div>}
      </div>
      {num !== undefined && num !== null && <div className="rc-num">{num}</div>}
      {chevron && <ChevronRight className="rc-chev" size={24} />}
    </>
  );
  if (href) return <a className="rcard row-card" href={href}>{inner}</a>;
  if (onClick) return <button type="button" className="rcard row-card" onClick={onClick}>{inner}</button>;
  return <div className="rcard row-card">{inner}</div>;
}

export function Empty({ icon, title, text, children }) {
  return (
    <div className="empty">
      {icon && <img src={icon} alt="" />}
      {title && <div className="e-title">{title}</div>}
      {text && <div className="e-text">{text}</div>}
      {children}
    </div>
  );
}

export function Spinner({ size = '', white }) {
  return <div className={`spinner ${size} ${white ? 'white' : ''}`} role="status" aria-label="Жүктелуде" />;
}

export function YouTubeIcon({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <rect x="1.5" y="4.5" width="21" height="15" rx="4.5" fill="#FF0033" />
      <path d="M10 8.8v6.4l5.6-3.2z" fill="#fff" />
    </svg>
  );
}

export function ErrorBox({ error, onRetry, text }) {
  return (
    <div className="err-box">
      <p>{text || 'Деректерді жүктеу мүмкін болмады.'}</p>
      {error && <p className="muted" style={{ fontSize: 13, fontWeight: 600 }}>{String(error.message || error)}</p>}
      {onRetry && (
        <button className="btn btn-soft btn-sm" onClick={onRetry}>
          Қайталау
        </button>
      )}
    </div>
  );
}

import { ICONS, Logo } from '../components/bits.jsx';
import { Contacts, Notice } from '../components/InfoBlocks.jsx';

export default function Welcome() {
  return (
    <div className="wrap welcome">
      <div className="welcome-card">
        <Logo />
        <p className="desc">Мектебіңнің STEAM зертханасы — идеяларды бөліс, тәжірибе жаса және бірге оқы.</p>
        <div className="stack">
          <a className="btn btn-rainbow btn-block" href="#/register">Бастау</a>
          <a className="btn btn-outline btn-block" href="#/login">Кіру</a>
        </div>
      </div>

      <div className="tiles mt-16">
        <a className="tile pastel" href="#/register">
          <img src={ICONS.camera} alt="" />
          <span className="t-label">Жариялау</span>
        </a>
        <a className="tile" href="#/helper">
          <img src={ICONS.robot} alt="" />
          <span className="t-label">Көмекші</span>
        </a>
        <a className="tile" href="#/login">
          <img src={ICONS.bellring} alt="" />
          <span className="t-label">Хабарлан&shy;дырулар</span>
        </a>
      </div>

      <div className="stack mt-24">
        <Notice />
        <Contacts />
      </div>
    </div>
  );
}

import { Mail, MapPin, Phone, UserRound } from 'lucide-react';
import { SCHOOL } from '../lib/config.js';
import { ICONS } from './bits.jsx';

export function Notice() {
  return (
    <div className="notice">
      <img className="n-icon" src={ICONS.moderation} alt="" />
      <div>
        <b>Назар аударыңыз!</b>
        <p>
          Платформаға кіру мүмкіндігі тек {SCHOOL.name} мектебінің мұғалімдері мен пайдаланушыларына ғана арналған.
        </p>
      </div>
    </div>
  );
}

export function Contacts() {
  return (
    <section className="card card-pad">
      <h2 className="h3" style={{ marginBottom: 4 }}>Байланыс мәліметтері</h2>
      <div className="contact-list">
        <a className="contact" href={`mailto:${SCHOOL.email}`}>
          <span className="c-ico"><Mail /></span>
          <span>
            <div className="c-label">Электрондық пошта</div>
            <div className="c-value">{SCHOOL.email}</div>
          </span>
        </a>
        <div className="contact">
          <span className="c-ico"><MapPin /></span>
          <span>
            <div className="c-label">Мекенжайы</div>
            <div className="c-value">{SCHOOL.address}</div>
          </span>
        </div>
        <div className="contact">
          <span className="c-ico"><UserRound /></span>
          <span>
            <div className="c-label">Жоба авторы</div>
            <div className="c-value">{SCHOOL.author}</div>
          </span>
        </div>
        <a className="contact" href={SCHOOL.phoneHref}>
          <span className="c-ico"><Phone /></span>
          <span>
            <div className="c-label">Телефон</div>
            <div className="c-value">{SCHOOL.phone}</div>
          </span>
        </a>
      </div>
    </section>
  );
}

export function About() {
  return (
    <section className="card about">
      <h2 className="h2">Мұғалімдерге арналған идеялар мен бейнесабақтардың білім беру платформасы</h2>
      <p className="mt-12">
        Бұл — ұстаздардың өзара тәжірибе алмасуына арналған бірегей кеңістік. Платформада сіз өз сабағыңызға қажетті жаңа
        идеяларды тауып, тәжірибеде қолдана аласыз, сондай-ақ өзіңіздің үздік әзірлемелеріңіз бен пайдалы
        бейнесабақтарыңызды өзге әріптестеріңізбен бөлісе аласыз.
      </p>
      <p>Мұнда мұғалімдер әртүрлі пәндер бойынша пайдалы бейнероликтерді жариялай алады.</p>
    </section>
  );
}

export function Quote() {
  return (
    <div className="quote">
      <b>«Бір идея — мың мүмкіндік!»</b>
      <span>Shorts STEAM Lab</span>
    </div>
  );
}

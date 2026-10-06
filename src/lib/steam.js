import science from '../assets/icons/science.webp';
import technology from '../assets/icons/technology.webp';
import engineering from '../assets/icons/engineering.webp';
import art from '../assets/icons/art.webp';
import math from '../assets/icons/math.webp';

export const SECTIONS = [
  { key: 'science', en: 'Science', kk: 'Ғылым', icon: science, color: '#1FB5A3', grad: 'linear-gradient(160deg, #36cdb7 0%, #1f9fd8 100%)' },
  { key: 'technology', en: 'Technology', kk: 'Технология', icon: technology, color: '#3B7CF6', grad: 'linear-gradient(160deg, #5b9bff 0%, #7656e8 100%)' },
  { key: 'engineering', en: 'Engineering', kk: 'Инженерия', icon: engineering, color: '#F08A1C', grad: 'linear-gradient(160deg, #ffbe55 0%, #f06d1c 100%)' },
  { key: 'art', en: 'Art', kk: 'Өнер', icon: art, color: '#E2559B', grad: 'linear-gradient(160deg, #ff86b9 0%, #b05cf0 100%)' },
  { key: 'math', en: 'Mathematics', kk: 'Математика', icon: math, color: '#7656E8', grad: 'linear-gradient(160deg, #9b7cff 0%, #4c5be8 100%)' },
];

export const SECTION_MAP = Object.fromEntries(SECTIONS.map((s) => [s.key, s]));

export const sectionOf = (key) => SECTION_MAP[key] || SECTIONS[0];

export const SUBJECTS = [
  'Математика', 'Алгебра', 'Геометрия', 'Физика', 'Химия', 'Биология', 'География',
  'Жаратылыстану', 'Информатика', 'Робототехника', 'Технология', 'Көркем еңбек',
  'Бейнелеу өнері', 'Музыка', 'Қазақ тілі', 'Қазақ әдебиеті', 'Орыс тілі', 'Орыс әдебиеті',
  'Ағылшын тілі', 'Қазақстан тарихы', 'Дүниежүзі тарихы', 'Дене шынықтыру', 'Бастауыш сынып',
  'Өзін-өзі тану', 'Психолог', 'Кітапханашы', 'Әкімшілік',
];

export const GRADES = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11'];

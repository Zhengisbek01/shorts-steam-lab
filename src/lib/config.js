const runtime = (typeof window !== 'undefined' && window.SSL_CONFIG) || {};
const env = import.meta.env || {};

export const SUPABASE_URL = (env.VITE_SUPABASE_URL || runtime.supabaseUrl || '').replace(/\/+$/, '');
export const SUPABASE_KEY =
  env.VITE_SUPABASE_ANON_KEY || env.VITE_SUPABASE_PUBLISHABLE_KEY || runtime.supabaseKey || '';
export const MAX_VIDEO_MB = Number(env.VITE_MAX_VIDEO_MB || runtime.maxVideoMb || 50);
export const IS_DEMO = !(SUPABASE_URL && SUPABASE_KEY);

export const SCHOOL = {
  name: 'Мағжан Жұмабаев атындағы №19 орта мектеп-гимназия',
  email: 'nazym.beisenbaeva@gmail.com',
  address: 'Талдықорған қаласы, Мүшелтой шағын ауданы, 14-үй',
  author: 'Бейсенбаева Назым Амангелдиевна',
  phone: '+7 (705) 161-33-44',
  phoneHref: 'tel:+77051613344',
};

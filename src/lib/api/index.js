import { IS_DEMO } from '../config.js';
import { createSupabaseApi } from './supabase.js';
import { createLocalApi } from './local.js';

export const api = IS_DEMO ? createLocalApi() : createSupabaseApi();

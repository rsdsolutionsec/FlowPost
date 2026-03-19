import { createClient } from '@supabase/supabase-js';

// Variables de entorno para el backend (Node.js/Vercel)
// En el frontend, Vite las inyecta en import.meta.env
// Adaptador para variables de entorno (Vite / Node)
const getEnv = (key: string) => {
  // @ts-ignore
  if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env[key]) {
    return import.meta.env[key];
  }
  return process.env[key];
};

const supabaseUrl = getEnv('VITE_SUPABASE_URL') || getEnv('SUPABASE_URL') || 'https://placeholder-project.supabase.co';
const supabaseServiceKey = getEnv('SUPABASE_SERVICE_ROLE_KEY') || '';
const supabaseAnonKey = getEnv('VITE_SUPABASE_ANON_KEY') || getEnv('SUPABASE_ANON_KEY') || '';

// Cliente estandar para el frontend
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Cliente administrativo para el backend (con service role key)
export const supabaseAdmin = supabaseServiceKey 
  ? createClient(supabaseUrl, supabaseServiceKey) 
  : supabase;

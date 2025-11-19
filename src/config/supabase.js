const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;             
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_KEY;   

if (!SUPABASE_URL) {
  throw new Error('Falta SUPABASE_URL en .env');
}

/**
 * Cliente “con token de usuario” para que RLS reconozca auth.uid().
 * Úsalo en los endpoints que deben respetar RLS.
 */
function supabaseWithToken(accessToken) {
  if (!accessToken) throw new Error('Falta accessToken');
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } }
  });
}

/**
 * Cliente admin (omite RLS). Úsalo solo en procesos internos.
 * Asegúrate de que SUPABASE_SERVICE_KEY sea la **service role key** real
 * (el JWT debe traer "role":"service_role"), no la anon.
 */
function supabaseAdmin() {
  if (!SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Falta SUPABASE_SERVICE_KEY (service role) en .env');
  }
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
}

module.exports = { supabaseWithToken, supabaseAdmin };
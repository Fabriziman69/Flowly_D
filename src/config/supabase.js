require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Faltan las credenciales SUPABASE_URL o SUPABASE_ANON_KEY en el archivo .env');
}

// Cliente Estándar (Para uso general)
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Cliente Admin (Para AuthRoutes)
const supabaseAdmin = () => {
  if (!supabaseServiceKey) return supabase;
  return createClient(supabaseUrl, supabaseServiceKey);
};

// 📦 EXPORTACIÓN: Enviamos un objeto con ambas herramientas
module.exports = { supabase, supabaseAdmin };
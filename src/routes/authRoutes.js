// src/routes/authRoutes.js
const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs'); // lo dejamos si quisieras hash propio para otros usos, no es necesario para Auth
const { supabaseAdmin } = require('../config/supabase');

// ─────────────────────────────────────────────────────────────
// Clientes de Supabase
//  - supabaseAuth: para Supabase Auth (signUp/signIn), con anon key
//  - supabaseAdmin(): cliente admin (service role) para tabla public.usuarios (omite RLS)
// ─────────────────────────────────────────────────────────────
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error('Faltan SUPABASE_URL o SUPABASE_ANON_KEY en .env');
}
const supabaseAuth = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ─────────────────────────────────────────────────────────────
// POST /auth/register
// Crea usuario en Supabase Auth y sincroniza perfil en public.usuarios
// BODY: { email, password, username }
// ─────────────────────────────────────────────────────────────
router.post('/register', async (req, res) => {
  try {
    const { email, password, username } = req.body || {};

    if (!email || !password || !username) {
      return res.status(400).json({ success: false, error: 'Email, contraseña y nombre de usuario son requeridos' });
    }
    if (password.length < 6) {
      return res.status(400).json({ success: false, error: 'La contraseña debe tener al menos 6 caracteres' });
    }

    // 1) Crear usuario en Supabase Auth
    const { data: signUpData, error: signUpError } = await supabaseAuth.auth.signUp({ email, password });
    if (signUpError) return res.status(400).json({ success: false, error: signUpError.message });

    const authUser = signUpData.user;
    // Si tu proyecto requiere verificación por email, user puede venir null hasta que confirme:
    if (!authUser) {
      return res.json({
        success: true,
        message: 'Registro creado. Revisa tu correo y confirma la cuenta para iniciar sesión.'
      });
    }

    // 2) Crear/actualizar perfil en public.usuarios (omite RLS con service role)
    try {
      const admin = supabaseAdmin(); // requiere SUPABASE_SERVICE_KEY (service_role) real
      // Nota: usamos el MISMO id del usuario de Auth como id_usuarios
      const { error: upsertErr } = await admin
        .from('usuarios')
        .upsert(
          {
            id_usuarios: authUser.id,
            nombre_usuario: username,
            correo_electronico: email,
            // Guardar hash aquí NO es necesario si usas Supabase Auth para login.
            // Aun así dejamos la columna por compatibilidad si la tenías:
            contrasena: await bcrypt.hash(password, 10),
            fecha_registro: new Date().toISOString()
          },
          { onConflict: 'id_usuarios' }
        );

      if (upsertErr) console.error('Upsert usuarios error:', upsertErr);
    } catch (e) {
      console.error('Error creando perfil en usuarios:', e);
      // No abortamos el registro si falla el perfil
    }

    return res.json({
      success: true,
      user: { id: authUser.id, email: authUser.email, username },
      message: 'Usuario registrado. Ahora puedes iniciar sesión.'
    });
  } catch (error) {
    console.error('POST /auth/register error:', error);
    return res.status(500).json({ success: false, error: 'Error interno del servidor' });
  }
});

// ─────────────────────────────────────────────────────────────
// POST /auth/login
// Inicia sesión con Supabase Auth y devuelve access_token real
// BODY: { email, password }
// ─────────────────────────────────────────────────────────────
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ success: false, error: 'Email y contraseña son requeridos' });
    }

    const { data, error } = await supabaseAuth.auth.signInWithPassword({ email, password });
    if (error) return res.status(401).json({ success: false, error: error.message });

    const { session, user } = data;
    if (!session || !user) return res.status(401).json({ success: false, error: 'No se pudo crear la sesión' });

    // (Opcional) Obtener username desde public.usuarios usando admin (omite RLS)
    let username = null;
    try {
      const admin = supabaseAdmin();
      const { data: perfil, error: perfilErr } = await admin
        .from('usuarios')
        .select('nombre_usuario')
        .eq('id_usuarios', user.id)
        .maybeSingle();
      if (!perfilErr && perfil) username = perfil.nombre_usuario;
    } catch (e) {
      console.warn('No se pudo leer perfil de usuarios (no crítico):', e?.message || e);
    }

    return res.json({
      success: true,
      access_token: session.access_token,
      refresh_token: session.refresh_token,
      user: {
        id: user.id,
        email: user.email,
        username
      }
    });
  } catch (error) {
    console.error('POST /auth/login error:', error);
    return res.status(500).json({ success: false, error: 'Error interno del servidor' });
  }
});

// ─────────────────────────────────────────────────────────────
// POST /auth/logout
// (Opcional) En el front basta con borrar localStorage; aquí solo respondemos OK.
// ─────────────────────────────────────────────────────────────
router.post('/logout', async (_req, res) => {
  try {
    // Supabase no invalida tokens en server; el logout efectivo se maneja en el cliente.
    return res.json({ success: true, message: 'Logout exitoso' });
  } catch (error) {
    console.error('POST /auth/logout error:', error);
    return res.status(500).json({ success: false, error: 'Error interno del servidor' });
  }
});

// ─────────────────────────────────────────────────────────────
// GET /auth/debug-table  (solo dev)  → usa admin para evitar RLS
// ─────────────────────────────────────────────────────────────
router.get('/debug-table', async (_req, res) => {
  try {
    const admin = supabaseAdmin();
    const { data: users, error: usersError } = await admin.from('usuarios').select('*').limit(1);
    if (usersError) {
      return res.status(400).json({ success: false, error: `Error accediendo a la tabla: ${usersError.message}` });
    }
    const columnNames = users && users.length > 0 ? Object.keys(users[0]) : ['No hay datos'];

    const { data: allUsers, error: allError } = await admin.from('usuarios').select('*');
    if (allError) {
      return res.status(400).json({ success: false, error: `Error listando usuarios: ${allError.message}` });
    }

    res.json({
      success: true,
      table_structure: columnNames,
      sample_data: users && users.length > 0 ? users[0] : null,
      total_users: allUsers ? allUsers.length : 0,
      all_users: allUsers || []
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// ─────────────────────────────────────────────────────────────
// GET /auth/test-insert  (solo dev) → usa admin; inserta fila dummy
// ─────────────────────────────────────────────────────────────
router.get('/test-insert', async (_req, res) => {
  try {
    const admin = supabaseAdmin();
    const testData = {
      id_usuarios: cryptoRandomUuid(), // generamos un uuid random para la fila dummy
      nombre_usuario: 'usuario_test_' + Date.now(),
      correo_electronico: 'test' + Date.now() + '@ejemplo.com',
      contrasena: await bcrypt.hash('password123', 10),
      fecha_registro: new Date().toISOString()
    };

    const { data, error } = await admin.from('usuarios').insert([testData]).select();
    if (error) return res.status(400).json({ success: false, error: `Error en test: ${error.message}` });

    res.json({ success: true, message: 'Inserción de prueba exitosa', inserted_data: data });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// Utilidad rápida para UUID (sin dependencias)
function cryptoRandomUuid() {
  // no-crypto fallback simple para dev: NO para producción crítica
  const s4 = () => Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
  return `${s4()}${s4()}-${s4()}-${s4()}-${s4()}-${s4()}${s4()}${s4()}`;
}

module.exports = router;
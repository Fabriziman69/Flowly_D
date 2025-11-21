const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');
const { supabaseAdmin } = require('../config/supabase');

// Configuración del cliente de autenticación
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error('Faltan credenciales de Supabase en el archivo .env');
}

const supabaseAuth = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Registro de nuevos usuarios
router.post('/register', async (req, res) => {
  try {
    const { email, password, username } = req.body || {};

    if (!email || !password || !username) {
      return res.status(400).json({ success: false, error: 'Todos los campos son requeridos' });
    }
    if (password.length < 6) {
      return res.status(400).json({ success: false, error: 'La contraseña debe tener al menos 6 caracteres' });
    }

    // 1. Crear usuario en Supabase Auth
    const { data: signUpData, error: signUpError } = await supabaseAuth.auth.signUp({ email, password });
    
    if (signUpError) return res.status(400).json({ success: false, error: signUpError.message });

    const authUser = signUpData.user;
    if (!authUser) {
      return res.json({
        success: true,
        message: 'Registro creado. Por favor verifica tu correo.'
      });
    }

    // 2. Crear perfil en la tabla de usuarios
    try {
      const admin = supabaseAdmin();
      await admin.from('usuarios').upsert(
        {
          id_usuarios: authUser.id,
          nombre_usuario: username,
          correo_electronico: email,
          contrasena: await bcrypt.hash(password, 10),
          fecha_registro: new Date().toISOString()
        },
        { onConflict: 'id_usuarios' }
      );
    } catch (e) {
      // Error silencioso en creación de perfil secundario
    }

    return res.json({
      success: true,
      user: { id: authUser.id, email: authUser.email, username },
      message: 'Usuario registrado exitosamente.'
    });

  } catch (error) {
    return res.status(500).json({ success: false, error: 'Error interno del servidor' });
  }
});

// Inicio de sesión
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body || {};
    
    if (!email || !password) {
      return res.status(400).json({ success: false, error: 'Credenciales requeridas' });
    }

    // Autenticación con Supabase
    const { data, error } = await supabaseAuth.auth.signInWithPassword({ email, password });
    
    if (error) return res.status(401).json({ success: false, error: error.message });

    const { session, user } = data;
    if (!session || !user) return res.status(401).json({ success: false, error: 'Error al iniciar sesión' });

    // Obtener información adicional del perfil
    let username = null;
    try {
      const admin = supabaseAdmin();
      const { data: perfil } = await admin
        .from('usuarios')
        .select('nombre_usuario')
        .eq('id_usuarios', user.id)
        .maybeSingle();
        
      if (perfil) username = perfil.nombre_usuario;
    } catch (e) {
      // Error silencioso en lectura de perfil
    }

    return res.json({
      success: true,
      access_token: session.access_token,
      refresh_token: session.refresh_token,
      user: {
        id: user.id,
        email: user.email,
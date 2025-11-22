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
        username
      }
    });

  } catch (error) {
    return res.status(500).json({ success: false, error: 'Error interno del servidor' });
  }
});

// Cierre de sesión
router.post('/logout', async (_req, res) => {
  try {
    return res.json({ success: true, message: 'Sesión cerrada correctamente' });
  } catch (error) {
    return res.status(500).json({ success: false, error: 'Error interno del servidor' });
  }
});

// ─────────────────────────────────────────────────────────────
// RECUPERACIÓN DE CONTRASEÑA
// ─────────────────────────────────────────────────────────────

// 1. Solicitar correo de recuperación
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'El correo es obligatorio' });

    // Enviamos el correo con la URL de redirección a tu sitio local
    const { error } = await supabaseAuth.auth.resetPasswordForEmail(email, {
      redirectTo: 'http://localhost:3000/', // IMPORTANTE: Ajustar si subes a producción
    });

    if (error) return res.status(400).json({ error: error.message });

    res.json({ success: true, message: 'Correo de recuperación enviado.' });
  } catch (error) {
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// 2. Actualizar la contraseña (requiere token de acceso)
router.post('/update-password', async (req, res) => {
  try {
    const { new_password, access_token, refresh_token } = req.body;

    if (!new_password || !access_token) {
      return res.status(400).json({ error: 'Datos incompletos' });
    }

    // Establecemos la sesión con el token que llegó del correo
    const { error: sessionError } = await supabaseAuth.auth.setSession({
      access_token,
      refresh_token
    });

    if (sessionError) return res.status(401).json({ error: 'Sesión de recuperación inválida' });

    // Actualizamos la contraseña del usuario autenticado
    const { error: updateError } = await supabaseAuth.auth.updateUser({
      password: new_password
    });

    if (updateError) return res.status(400).json({ error: updateError.message });

    // También actualizamos el hash en la tabla de usuarios (para mantener sincronía)
    try {
      const user = (await supabaseAuth.auth.getUser()).data.user;
      if (user) {
        const admin = supabaseAdmin();
        const hashedPassword = await bcrypt.hash(new_password, 10);
        await admin.from('usuarios').update({ contrasena: hashedPassword }).eq('id_usuarios', user.id);
      }
    } catch (e) { /* Ignorar error secundario */ }

    res.json({ success: true, message: 'Contraseña actualizada correctamente' });
  } catch (error) {
    res.status(500).json({ error: 'Error al actualizar contraseña' });
  }
});

module.exports = router;
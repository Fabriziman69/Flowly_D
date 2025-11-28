const express = require('express');
const router = express.Router();
const { supabase, supabaseAdmin } = require('../config/supabase');

// Crear una nueva configuración de ciclo
router.post('/', async (req, res) => {
  try {
    // Validación de sesión
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'No autorizado' });

    const token = authHeader.split(' ')[1];
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
        return res.status(401).json({ error: 'Sesión inválida o expirada' });
    }

    // Insertar ciclo en la base de datos usando privilegios de admin
    const { fecha_inicio, duracion_ciclo, duracion_sangrado } = req.body;
    const admin = supabaseAdmin();

    const { data, error } = await admin
      .from('ciclos')
      .insert([
        { 
            fecha_inicio, 
            duracion_ciclo, 
            duracion_sangrado,
            fk_usuario: user.id
        }
      ])
      .select();

    if (error) throw error;

    res.status(201).json({ message: 'Ciclo configurado exitosamente', data });
  } catch (err) {
    console.error("Error creando ciclo:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// Obtener historial de ciclos del usuario
router.get('/', async (req, res) => {
  try {
    // Validación de sesión
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'No autorizado' });
    
    const token = authHeader.split(' ')[1];
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) return res.status(401).json({ error: 'Sesión inválida' });

    // Consulta de datos filtrada por usuario
    const admin = supabaseAdmin();
    const { data, error } = await admin
      .from('ciclos')
      .select('*')
      .eq('fk_usuario', user.id)
      .order('fecha_inicio', { ascending: false });

    if (error) throw error;

    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
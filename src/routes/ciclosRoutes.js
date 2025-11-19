// src/routes/ciclosRoutes.js
const express = require('express');
const router = express.Router();
const { supabaseWithToken } = require('../config/supabase');

function getAccessToken(req) {
  const auth = req.headers.authorization || '';
  return auth.startsWith('Bearer ') ? auth.slice(7) : null;
}

router.post('/ciclos', async (req, res) => {
  try {
    const token = getAccessToken(req);
    if (!token) return res.status(401).json({ error: 'Falta token' });

    const supabase = supabaseWithToken(token);
    const { fecha_inicio, duracion_ciclo, duracion_sangrado = 5 } = req.body;

    const { data, error } = await supabase
      .from('ciclos')
      .insert([{ fecha_inicio, duracion_ciclo, duracion_sangrado }])
      .select();

    if (error) return res.status(400).json({ error });
    res.json({ data });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/ciclos', async (req, res) => {
  try {
    const token = getAccessToken(req);
    if (!token) return res.status(401).json({ error: 'Falta token' });

    const supabase = supabaseWithToken(token);
    const { data, error } = await supabase
      .from('ciclos')
      .select('*')
      .order('fecha_inicio', { ascending: false });

    if (error) return res.status(400).json({ error });
    res.json({ data });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
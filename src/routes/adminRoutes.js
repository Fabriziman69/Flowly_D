// Archivo: routes/adminRoutes.js
const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');

// Configuración Supabase
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

// --- 1. RUTAS DE USUARIOS ---

// GET Usuarios
router.get('/users', async (req, res) => {
    const { data, error } = await supabase.from('usuarios').select('*').order('fecha_registro', { ascending: false });
    if (error) return res.status(400).json({ error: error.message });
    res.json(data);
});

// POST Usuario (Crear)
router.post('/users', async (req, res) => {
    const { nombre_usuario, correo_electronico, contrasena } = req.body;
    const hashedPassword = await bcrypt.hash(contrasena, 10);
    const { error } = await supabase.from('usuarios').insert([{ 
        nombre_usuario, correo_electronico, contrasena: hashedPassword, fecha_registro: new Date() 
    }]);
    if (error) return res.status(400).json({ error: error.message });
    res.json({ success: true });
});

// PUT Usuario (Editar) - OJO: Usa id_usuarios
router.put('/users/:id', async (req, res) => {
    const { id } = req.params;
    const { nombre_usuario, correo_electronico } = req.body;
    const { error } = await supabase.from('usuarios')
        .update({ nombre_usuario, correo_electronico })
        .eq('id_usuarios', id); // Clave específica
    if (error) return res.status(400).json({ error: error.message });
    res.json({ success: true });
});

// DELETE Usuario - OJO: Usa id_usuarios
router.delete('/users/:id', async (req, res) => {
    const { id } = req.params;
    const { error } = await supabase.from('usuarios').delete().eq('id_usuarios', id);
    if (error) return res.status(400).json({ error: error.message });
    res.json({ success: true });
});

// --- 2. RUTAS DE TARJETAS (INFO SALUD) ---

// GET Tarjetas
router.get('/tarjetas', async (req, res) => {
    const { data, error } = await supabase.from('info_tarjetas').select('*').order('orden', { ascending: true });
    if (error) return res.status(400).json({ error: error.message });
    res.json(data);
});

// POST Tarjeta
router.post('/tarjetas', async (req, res) => {
    const { titulo, descripcion, icono, orden } = req.body;
    const { error } = await supabase.from('info_tarjetas').insert([{ titulo, descripcion, icono, orden }]);
    if (error) return res.status(400).json({ error: error.message });
    res.json({ success: true });
});

// PUT Tarjeta
router.put('/tarjetas/:id', async (req, res) => {
    const { id } = req.params;
    const { titulo, descripcion, icono, orden } = req.body;
    const { error } = await supabase.from('info_tarjetas').update({ titulo, descripcion, icono, orden }).eq('id', id);
    if (error) return res.status(400).json({ error: error.message });
    res.json({ success: true });
});

// DELETE Tarjeta
router.delete('/tarjetas/:id', async (req, res) => {
    const { id } = req.params;
    const { error } = await supabase.from('info_tarjetas').delete().eq('id', id);
    if (error) return res.status(400).json({ error: error.message });
    res.json({ success: true });
});

// --- 3. RUTAS DE ACORDEÓN ---

// GET Acordeon
router.get('/acordeon', async (req, res) => {
    const { data, error } = await supabase.from('info_acordeon').select('*').order('orden', { ascending: true });
    if (error) return res.status(400).json({ error: error.message });
    res.json(data);
});

// POST Acordeon
router.post('/acordeon', async (req, res) => {
    const { titulo, contenido, orden } = req.body;
    const { error } = await supabase.from('info_acordeon').insert([{ titulo, contenido, orden }]);
    if (error) return res.status(400).json({ error: error.message });
    res.json({ success: true });
});

// PUT Acordeon
router.put('/acordeon/:id', async (req, res) => {
    const { id } = req.params;
    const { titulo, contenido, orden } = req.body;
    const { error } = await supabase.from('info_acordeon').update({ titulo, contenido, orden }).eq('id', id);
    if (error) return res.status(400).json({ error: error.message });
    res.json({ success: true });
});

// DELETE Acordeon
router.delete('/acordeon/:id', async (req, res) => {
    const { id } = req.params;
    const { error } = await supabase.from('info_acordeon').delete().eq('id', id);
    if (error) return res.status(400).json({ error: error.message });
    res.json({ success: true });
});

module.exports = router;
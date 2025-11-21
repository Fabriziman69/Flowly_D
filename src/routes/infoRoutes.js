const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');

// Cliente estándar para lecturas
const { supabase } = require('../config/supabase');

// Configuración del cliente administrativo
const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
    throw new Error("Faltan variables de entorno para la configuración de administración.");
}

const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// --- Rutas Públicas (Lectura) ---

// Obtener listado de tarjetas informativas
router.get('/tarjetas', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('info_tarjetas')
            .select('*')
            .order('orden', { ascending: true });

        if (error) throw error;
        res.json(data);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// Obtener contenido del acordeón
router.get('/acordeon', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('info_acordeon')
            .select('*')
            .order('orden', { ascending: true });

        if (error) throw error;
        res.json(data);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});


// --- Rutas Administrativas (Escritura) ---

// Crear nueva tarjeta
router.post('/admin/tarjetas', async (req, res) => {
    try {
        const { icono, titulo, descripcion, orden } = req.body;
        const { data, error } = await supabaseAdmin
            .from('info_tarjetas')
            .insert([{ icono, titulo, descripcion, orden }]);
            
        if (error) throw error;
        res.json({ message: "Tarjeta creada correctamente", data });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// Eliminar tarjeta
router.delete('/admin/tarjetas/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { error } = await supabaseAdmin
            .from('info_tarjetas')
            .delete()
            .eq('id', id);

        if (error) throw error;
        res.json({ message: "Tarjeta eliminada correctamente" });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// Crear elemento de acordeón
router.post('/admin/acordeon', async (req, res) => {
    try {
        const { titulo, contenido, orden } = req.body;
        const { data, error } = await supabaseAdmin
            .from('info_acordeon')
            .insert([{ titulo, contenido, orden }]);

        if (error) throw error;
        res.json({ message: "Elemento creado correctamente", data });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// Eliminar elemento de acordeón
router.delete('/admin/acordeon/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { error } = await supabaseAdmin
            .from('info_acordeon')
            .delete()
            .eq('id', id);

        if (error) throw error;
        res.json({ message: "Elemento eliminado correctamente" });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

module.exports = router;
const express = require('express');
const router = express.Router();
const { supabase, supabaseAdmin } = require('../config/supabase');

// Obtener el catálogo de síntomas disponibles
router.get('/lista-sintomas', async (req, res) => {
  try {
    const admin = supabaseAdmin(); 
    
    const { data, error } = await admin
      .from('sintomas')
      .select('id_sintomas, nombre_sintoma, categoria');

    if (error) throw error;
    
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Registrar un nuevo síntoma (o crear uno personalizado)
router.post('/', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'No autorizado' });
    
    const token = authHeader.split(' ')[1];
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) return res.status(401).json({ error: 'Sesión inválida' });

    let { fk_sintomas, nuevo_sintoma, fecha, intensidad, fk_ciclo } = req.body;

    if (!fecha || !intensidad) {
      return res.status(400).json({ error: 'Faltan datos obligatorios' });
    }

    const admin = supabaseAdmin();

    // Crear síntoma personalizado si es necesario
    if (nuevo_sintoma) {
        const { data: nuevoItem, error: errorCreacion } = await admin
            .from('sintomas')
            .insert([{ 
                nombre_sintoma: nuevo_sintoma, 
                categoria: 'Personalizado' 
            }])
            .select()
            .single();

        if (errorCreacion) {
            throw new Error(errorCreacion.message);
        }
        
        fk_sintomas = nuevoItem.id_sintomas;
    }

    // Guardar registro del usuario
    const { data, error } = await admin
      .from('registro_sintoma')
      .insert([{
        fk_sintomas,
        fecha,
        intensidad,
        fk_ciclo: fk_ciclo || null,
        fk_usuario: user.id
      }])
      .select();

    if (error) throw error;

    res.status(201).json({ message: 'Síntoma registrado correctamente', data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Obtener síntomas por fecha
router.get('/fecha/:fecha', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'No autorizado' });
    
    const token = authHeader.split(' ')[1];
    const { data: { user } } = await supabase.auth.getUser(token);

    if (!user) return res.status(401).json({ error: 'Sesión inválida' });

    const { fecha } = req.params;
    const admin = supabaseAdmin();

    const { data, error } = await admin
      .from('registro_sintoma')
      .select(`id_registro_sintoma, intensidad, fk_sintomas ( nombre_sintoma, categoria )`)
      .eq('fecha', fecha)
      .eq('fk_usuario', user.id);

    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Obtener historial completo
router.get('/mis-registros', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'No autorizado' });
    
    const token = authHeader.split(' ')[1];
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) return res.status(401).json({ error: 'Sesión inválida' });

    const admin = supabaseAdmin();
    const { data, error } = await admin
      .from('registro_sintoma')
      .select(`
        id_registro_sintoma,
        fecha,
        intensidad,
        fk_sintomas ( nombre_sintoma )
      `)
      .eq('fk_usuario', user.id);

    if (error) throw error;

    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
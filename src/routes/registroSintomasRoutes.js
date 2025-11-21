const express = require('express');
const router = express.Router();
const { supabase, supabaseAdmin } = require('../config/supabase');

// Obtener el catálogo de síntomas disponibles
router.get('/lista-sintomas', async (req, res) => {
  try {
    // Usamos el cliente admin para evitar restricciones de lectura si las hubiera
    const admin = supabaseAdmin(); 
    
    const { data, error } = await admin
      .from('sintomas')
      .select('id_sintomas, nombre_sintoma, categoria');

    if (error) throw error;
    
    res.json(data);
  } catch (err) {
    console.error("Error obteniendo lista de síntomas:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// Registrar un nuevo síntoma (o crear uno personalizado si no existe)
router.post('/', async (req, res) => {
  try {
    // 1. Validación de sesión
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'No autorizado' });
    
    const token = authHeader.split(' ')[1];
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) return res.status(401).json({ error: 'Sesión inválida' });

    // 2. Recepción de datos
    let { fk_sintomas, nuevo_sintoma, fecha, intensidad, fk_ciclo } = req.body;

    if (!fecha || !intensidad) {
      return res.status(400).json({ error: 'Faltan datos obligatorios' });
    }

    const admin = supabaseAdmin();

    // 3. Lógica para síntoma personalizado
    if (nuevo_sintoma) {
        // Insertar el nuevo síntoma en el catálogo
        const { data: nuevoItem, error: errorCreacion } = await admin
            .from('sintomas')
            .insert([{ 
                nombre_sintoma: nuevo_sintoma, 
                categoria: 'Personalizado' 
            }])
            .select()
            .single();

        if (errorCreacion) {
            throw new Error("Error creando el nuevo síntoma: " + errorCreacion.message);
        }
        
        // Asignar el ID del síntoma recién creado
        fk_sintomas = nuevoItem.id_sintomas;
    }

    // 4. Guardar el registro del usuario
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
    console.error("Error registrando síntoma:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// Obtener síntomas registrados en una fecha específica
router.get('/fecha/:fecha', async (req, res) => {
  try {
    // Validación de sesión
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'No autorizado' });
    
    const token = authHeader.split(' ')[1];
    const { data: { user } } = await supabase.auth.getUser(token);

    if (!user) return res.status(401).json({ error: 'Sesión inválida' });

    const { fecha } = req.params;
    const admin = supabaseAdmin();

    // Consulta filtrada por usuario y fecha
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

// Obtener historial completo de síntomas del usuario
router.get('/mis-registros', async (req, res) => {
  try {
    // Validación de sesión
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'No autorizado' });
    
    const token = authHeader.split(' ')[1];
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) return res.status(401).json({ error: 'Sesión inválida' });

    // Consulta de historial
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
    console.error("Error obteniendo historial:", err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
// src/routes/registroDiarioRoutes.js
const express = require('express');
const router = express.Router();
const { supabaseWithToken } = require('../config/supabase');

function getAccessToken(req) {
  const auth = req.headers.authorization || '';
  return auth.startsWith('Bearer ') ? auth.slice(7) : null;
}

async function obtenerCicloActual(supabase) {
  const { data, error } = await supabase
    .from('ciclos')
    .select('*')
    .order('fecha_inicio', { ascending: false })
    .limit(1);
  if (error) throw error;
  if (!data || !data[0]) return null;

  const row = data[0];
  const cicloIdKey = Object.keys(row).find(k => /^id(_ciclo|_ciclos)?$/.test(k)) || 'id_ciclos';
  return row[cicloIdKey];
}

router.post('/registro-diario', async (req, res) => {
  try {
    const token = getAccessToken(req);
    if (!token) return res.status(401).json({ error: 'Falta token' });

    const supabase = supabaseWithToken(token);
    const {
      fecha,
      flujo_cervical,
      temperatura_basal,
      nota_extra,
      fk_ciclo: fkCicloBody,
      sintomas = []
    } = req.body || {};

    if (!fecha) return res.status(400).json({ error: 'fecha es requerida (YYYY-MM-DD)' });

    let fk_ciclo = fkCicloBody ?? null;
    if (!fk_ciclo) {
      fk_ciclo = await obtenerCicloActual(supabase);
      if (!fk_ciclo) {
        return res.status(400).json({ error: 'No se encontró un ciclo para el usuario. Crea uno primero.' });
      }
    }

    const { data, error } = await supabase.rpc('fn_insert_registro_diario_con_sintomas', {
      p_fecha_actual: fecha,
      p_fk_ciclo: fk_ciclo,
      p_flujo_cervical: flujo_cervical,
      p_nota_extra: nota_extra,
      p_sintomas: sintomas,
      p_temperatura_basal: temperatura_basal
    });

    if (error) {
      console.error('RPC error:', error);
      return res.status(400).json({ error: error.message || 'Error en RPC' });
    }

    return res.json({ success: true, data });
  } catch (e) {
    console.error('POST /api/registro-diario exception:', e);
    return res.status(500).json({ error: 'Server error' });
  }
});

router.get('/registro-diario', async (req, res) => {
  try {
    const token = getAccessToken(req);
    if (!token) return res.status(401).json({ error: 'Falta token' });

    const supabase = supabaseWithToken(token);
    const { fecha } = req.query;

    let query = supabase
      .from('registro_diario')
      .select('id_registro_diario, fecha_actual, nota_extra, temperatura_basal, flujo_cervical');

    if (fecha) query = query.eq('fecha_actual', fecha);

    const { data: registros, error } = await query.order('fecha_actual', { ascending: false });
    if (error) return res.status(400).json({ error });

    const result = [];
    for (const reg of registros || []) {
      const { data: sintomasRel, error: errRel } = await supabase
        .from('registro_sintoma')
        .select('intensidad, sintomas(id_sintomas, nombre_sintoma, categoria)')
        .eq('fk_registro_diario', reg.id_registro_diario);

      if (errRel) return res.status(400).json({ error: errRel });
      result.push({ ...reg, sintomas: sintomasRel || [] });
    }

    return res.json({ success: true, data: result });
  } catch (e) {
    console.error('GET /api/registro-diario exception:', e);
    return res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
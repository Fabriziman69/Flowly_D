require('dotenv').config();

const express = require('express');
const path = require('path');

// ─────────────────────────────────────────────────────────────
// 1. IMPORTAR RUTAS (Aquí faltaba la de síntomas)
// ─────────────────────────────────────────────────────────────
const authRoutes = require('./routes/authRoutes');
const ciclosRoutes = require('./routes/ciclosRoutes');
const registroSintomasRoutes = require('./routes/registroSintomasRoutes'); // ✅ ESTA FALTABA
const infoRoutes = require('./routes/infoRoutes'); // La nueva de admin

const app = express();
const PORT = process.env.PORT || 3000;

// ─────────────────────────────────────────────────────────────
// 2. MIDDLEWARES
// ─────────────────────────────────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '../public')));

// ─────────────────────────────────────────────────────────────
// 3. MONTAR RUTAS API
// ─────────────────────────────────────────────────────────────
app.use('/auth', authRoutes);
app.use('/api/ciclos', ciclosRoutes);
app.use('/api/registro-sintomas', registroSintomasRoutes); // Ahora sí funcionará
app.use('/api/info', infoRoutes);

// ─────────────────────────────────────────────────────────────
// 4. RUTAS DE VISTAS (HTML)
// ─────────────────────────────────────────────────────────────
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

app.get('/menu', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/views/menu_inicio.html'));
});

// Ruta para el panel de administración
app.get('/admin-panel.html', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/views/admin_panel.html'));
});

app.get('/test-server', (req, res) => {
  res.json({
    message: 'Servidor funcionando correctamente',
    timestamp: new Date().toISOString(),
  });
});

// ─────────────────────────────────────────────────────────────
// 5. MANEJO DE ERRORES (404)
// ─────────────────────────────────────────────────────────────
app.use((req, res) => {
  return res.status(404).json({ error: 'Ruta no encontrada' });
});

app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  return res.status(500).json({ error: 'Error interno del servidor' });
});

// ─────────────────────────────────────────────────────────────
// 6. ARRANQUE
// ─────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
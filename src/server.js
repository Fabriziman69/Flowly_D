require('dotenv').config();
const express = require('express');
const path = require('path');

// ─────────────────────────────────────────────────────────────
// 1. INICIALIZAR APP (Esto debe ir antes de usar 'app')
// ─────────────────────────────────────────────────────────────
const app = express();
const PORT = process.env.PORT || 3000;

// ─────────────────────────────────────────────────────────────
// 2. IMPORTAR RUTAS
// ─────────────────────────────────────────────────────────────
const authRoutes = require('./routes/authRoutes');
const ciclosRoutes = require('./routes/ciclosRoutes');
const registroSintomasRoutes = require('./routes/registroSintomasRoutes');
const infoRoutes = require('./routes/infoRoutes'); 
const adminRoutes = require('./routes/adminRoutes'); //La nueva ruta unificada

// ─────────────────────────────────────────────────────────────
// 3. MIDDLEWARES
// ─────────────────────────────────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '../public')));

// ─────────────────────────────────────────────────────────────
// 4. MONTAR RUTAS API
// ─────────────────────────────────────────────────────────────
app.use('/auth', authRoutes);
app.use('/api/ciclos', ciclosRoutes);
app.use('/api/registro-sintomas', registroSintomasRoutes);
app.use('/api/info', infoRoutes); // Para la vista pública de Info Salud

// ✅ Ruta Admin Unificada (Usuarios, Tarjetas y Acordeón)
// Esto hace que las llamadas sean: /api/admin/users, /api/admin/tarjetas, etc.
app.use('/api/admin', adminRoutes); 

// ─────────────────────────────────────────────────────────────
// 5. RUTAS DE VISTAS (HTML)
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
// 6. MANEJO DE ERRORES (404)
// ─────────────────────────────────────────────────────────────
app.use((req, res) => {
  return res.status(404).json({ error: 'Ruta no encontrada' });
});

app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  return res.status(500).json({ error: 'Error interno del servidor' });
});

// ─────────────────────────────────────────────────────────────
// 7. ARRANQUE
// ─────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
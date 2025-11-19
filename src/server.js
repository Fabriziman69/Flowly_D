// src/server.js
require('dotenv').config();

const express = require('express');
const path = require('path');

// Importar routers
const authRoutes = require('./routes/authRoutes');
const ciclosRoutes = require('./routes/ciclosRoutes');
const registroDiarioRoutes = require('./routes/registroDiarioRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

// ─────────────────────────────────────────────────────────────
// Middlewares globales
// ─────────────────────────────────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '../public')));

// ─────────────────────────────────────────────────────────────
// Montar todas las rutas
// ─────────────────────────────────────────────────────────────
app.use('/auth', authRoutes);
app.use('/api', ciclosRoutes);           // ← Incluye /api/ciclos
app.use('/api', registroDiarioRoutes);   // ← Incluye /api/registro-diario

// ─────────────────────────────────────────────────────────────
// Rutas de vistas
// ─────────────────────────────────────────────────────────────
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

app.get('/menu', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/views/menu_inicio.html'));
});

app.get('/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/views/menu_inicio.html'));
});

app.get('/test-server', (req, res) => {
  res.json({
    message: 'Servidor funcionando correctamente',
    timestamp: new Date().toISOString(),
  });
});

// ─────────────────────────────────────────────────────────────
// 404 y manejador de errores
// ─────────────────────────────────────────────────────────────
app.use((req, res) => {
  return res.status(404).json({ error: 'Ruta no encontrada' });
});

app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  return res.status(500).json({ error: 'Error interno del servidor' });
});

// ─────────────────────────────────────────────────────────────
// Arranque
// ─────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
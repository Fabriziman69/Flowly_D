require('dotenv').config();
const express = require('express');
const path = require('path');


// 1. INICIALIZAR APP

const app = express();
const PORT = process.env.PORT || 3000;


// 2. IMPORTAR RUTAS

const authRoutes = require('./routes/authRoutes');
const ciclosRoutes = require('./routes/ciclosRoutes');
const registroSintomasRoutes = require('./routes/registroSintomasRoutes');
const infoRoutes = require('./routes/infoRoutes'); 
const adminRoutes = require('./routes/adminRoutes'); 


// 3. MIDDLEWARES GLOBALES

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '../public')));


// 4. MONTAR RUTAS API

app.use('/auth', authRoutes);
app.use('/api/ciclos', ciclosRoutes);
app.use('/api/registro-sintomas', registroSintomasRoutes);
app.use('/api/info', infoRoutes); 
app.use('/api/admin', adminRoutes); 


// 5. RUTAS DE VISTAS (HTML) Y CONTROL DE CACHÉ



const noCache = (req, res, next) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  next();
};

// Ruta pública (Login/Landing) 
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Rutas protegidas 
app.get('/menu', noCache, (req, res) => {
  res.sendFile(path.join(__dirname, '../public/views/menu_inicio.html'));
});

app.get('/admin-panel.html', noCache, (req, res) => {
    res.sendFile(path.join(__dirname, '../public/views/admin_panel.html'));
});

app.get('/test-server', (req, res) => {
  res.json({
    message: 'Servidor funcionando correctamente',
    timestamp: new Date().toISOString(),
  });
});


// 6. MANEJO DE ERRORES (404)

app.use((req, res) => {
  return res.status(404).json({ error: 'Ruta no encontrada' });
});

app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  return res.status(500).json({ error: 'Error interno del servidor' });
});


// 7. ARRANQUE

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
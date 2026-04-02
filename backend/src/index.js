const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const enseignantRoutes = require('./routes/enseignant');
const matiereRoutes = require('./routes/matiere');
const heureRoutes = require('./routes/heure');
const dashboardRoutes = require('./routes/dashboard');
const exportRoutes = require('./routes/export');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(helmet());
app.use(cors({ origin: 'http://localhost:5173', credentials: true }));
app.use(morgan('dev'));
app.use(express.json({ limit: '10mb' }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/enseignants', enseignantRoutes);
app.use('/api/matieres', matiereRoutes);
app.use('/api/heures', heureRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/exports', exportRoutes);

// Test
app.get('/api/health', (req, res) => {
  res.json({ message: 'API opérationnelle ✅' });
});

// Erreurs
app.use((err, req, res, next) => {
  console.error('❌ Erreur:', err.stack);
  res.status(500).json({ message: 'Erreur serveur' });
});

// Démarrage
app.listen(PORT, () => {
  console.log(`\n🚀 Serveur sur http://localhost:${PORT}\n`);
});
const express = require('express');
const router = express.Router();
const verificarToken = require('../middlewares/authMiddleware');
const {
  getDashboardData,
  unifiedSearch
} = require('../controllers/adicionaisController.js');

// Rotas adicionais
router.get('/dashboard', verificarToken, getDashboardData);
router.get('/search', verificarToken, unifiedSearch);

module.exports = router;
const express = require('express');
const router = express.Router();
const verificarToken = require('../middlewares/authMiddleware');
const validarMeta = require('../middlewares/validarMeta');
const {
  criarMeta,
  listarMetas,
  atualizarMeta,
  deletarMeta,
  listarMetasPorVendedor
} = require('../controllers/metaController.js');

// Rotas principais
router.post('/', verificarToken, validarMeta, criarMeta);
router.get('/', verificarToken, listarMetas);
router.put('/:id', verificarToken, validarMeta, atualizarMeta);
router.delete('/:id', verificarToken, deletarMeta);

// Rota específica para metas por vendedor
router.get('/usuarios/:id/metas', verificarToken, listarMetasPorVendedor);

module.exports = router;
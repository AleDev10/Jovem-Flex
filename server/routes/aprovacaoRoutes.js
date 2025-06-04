const express = require('express');
const router = express.Router();
const verificarToken = require('../middlewares/authMiddleware');
const {
  aprovarCompra,
  listarAprovacoes,
  buscarAprovacaoPorId
} = require('../controllers/aprovacaoController');

// Aprovação de compra
router.post('/compras/:id/aprovar', verificarToken, aprovarCompra);

// Listagem de aprovações
router.get('/', verificarToken, listarAprovacoes);

// Detalhes de aprovação
router.get('/:id', verificarToken, buscarAprovacaoPorId);

module.exports = router;
const express = require('express');
const router = express.Router();
const verificarToken = require('../middlewares/authMiddleware');
const {
  criarCompra,
  listarCompras,
  buscarCompraPorId,
  atualizarStatusCompra,
  historicoComprasUsuario
} = require('../controllers/compraController');

router.post('/', verificarToken, criarCompra);
router.get('/', verificarToken, listarCompras);
router.get('/:id', verificarToken, buscarCompraPorId);
router.put('/:id/status', verificarToken, atualizarStatusCompra);
router.get('/usuarios/:id/compras', verificarToken, historicoComprasUsuario);

module.exports = router;
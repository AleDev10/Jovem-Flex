const express = require('express');
const router = express.Router();
const verificarToken = require('../middlewares/authMiddleware');
const {
  criarLoja,
  listarLojas,
  buscarLojaPorId,
  atualizarLoja,
  deletarLoja,
  listarLojasPorVendedor,
  transferirLoja
} = require('../controllers/lojaController');


router.post('/', verificarToken, criarLoja);
router.get('/', listarLojas);
router.get('/:id', buscarLojaPorId);
router.get('/vendedor/:vendedorId', listarLojasPorVendedor);
router.put('/:id', verificarToken, atualizarLoja);
router.delete('/:id', verificarToken, deletarLoja);
router.post('/:id/transferir', verificarToken, transferirLoja);

module.exports = router;
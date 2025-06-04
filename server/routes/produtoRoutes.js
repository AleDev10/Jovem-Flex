const express = require('express');
const router = express.Router();
const verificarToken = require('../middlewares/authMiddleware');
const {
  criarProduto,
  listarProdutos,
  buscarProdutoPorId,
  atualizarProduto,
  deletarProduto
} = require('../controllers/produtoController');

router.post('/lojas/:id/produtos', verificarToken, criarProduto);
router.get('/', listarProdutos);
router.get('/:id', buscarProdutoPorId);
router.put('/:id', verificarToken, atualizarProduto);
router.delete('/:id', verificarToken, deletarProduto);

module.exports = router;
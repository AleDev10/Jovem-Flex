const express = require('express');
const router = express.Router();
const verificarToken = require('../middlewares/authMiddleware');
const {
  criarEndereco,
  listarEnderecosUsuario,
  atualizarEndereco,
  deletarEndereco
} = require('../controllers/enderecoController');

router.post('/', verificarToken, criarEndereco);
router.get('/usuario/:usuario_id', verificarToken, listarEnderecosUsuario);
router.put('/:id', verificarToken, atualizarEndereco);
router.delete('/:id', verificarToken, deletarEndereco);

module.exports = router;
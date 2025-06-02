const express = require('express');
const router = express.Router();
const verificarToken = require('../middlewares/authMiddleware');
const {listarUsuarios,buscarUsuario,atualizarUsuario,deletarUsuario} = require('../controllers/usuarioController');

// Rotas protegidas por JWT
router.get('/', verificarToken, listarUsuarios);
router.get('/:id', verificarToken, buscarUsuario);
router.put('/:id', verificarToken, atualizarUsuario);
router.delete('/:id', verificarToken, deletarUsuario);

module.exports = router;
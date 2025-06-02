const express = require('express');
const router = express.Router();
const { registrarUsuario, login, obterPerfil} = require('../controllers/authController');
const verificarToken = require('../middlewares/authMiddleware');

//TODO: Rotas de autenticação

// POST /auth/registro - Registrar novo usuário
router.post('/registro', registrarUsuario);
// POST /auth/login - Fazer login de usuário
router.post('/login', login);
// Rota protegida (exige token válido)
router.get('/perfil', verificarToken, obterPerfil);

module.exports = router;
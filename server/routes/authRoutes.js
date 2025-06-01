const express = require('express');
const router = express.Router();
const { registrarUsuario } = require('../controllers/authController');
const { login } = require('../controllers/authController');

//TODO: Rotas de autenticação

// POST /auth/registro - Registrar novo usuário
router.post('/registro', registrarUsuario);
// POST /auth/login - Fazer login de usuário
router.post('/login', login);

module.exports = router;
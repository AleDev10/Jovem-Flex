const express = require('express');
const router = express.Router();

router.post('/login', (req, res) => {
  // Lógica de login
  res.send('Login');
});

router.post('/cadastro', (req, res) => {
  // Lógica de cadastro
  res.send('Cadastro');
});

module.exports = router;
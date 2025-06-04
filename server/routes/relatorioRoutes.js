const express = require('express');
const router = express.Router();
const verificarToken = require('../middlewares/authMiddleware');
const {
  enviarRelatorio,
  listarRelatorios,
  obterRelatorio
} = require('../controllers/relatorioController.js');

router.post('/', verificarToken, enviarRelatorio);
router.get('/', verificarToken, listarRelatorios);
router.get('/:id', verificarToken, obterRelatorio);

module.exports = router;
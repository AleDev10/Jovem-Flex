// Importações essenciais
const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/authRoutes');
const PORT = process.env.PORT||3000;

// Inicializa o Express
const app = express();

// Middlewares básicos
app.use(express.json()); // Para receber JSON no body das requisições
app.use(cors()); // Permite conexões de outros domínios (frontend)
app.use('/auth', authRoutes);

// Exporta o app para ser usado em outros arquivos (ex: ao adicionar rotas)
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta http://localhost:${PORT}`);
});
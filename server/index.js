// Importações essenciais
const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/authRoutes');
const usuarioRoutes = require('./routes/usuarioRoutes');
const lojaRoutes = require('./routes/lojaRoutes');
const enderecoRoutes = require('./routes/enderecoRoutes');
const produtoRoutes = require('./routes/produtoRoutes');
const compraRoutes = require('./routes/compraRoutes');
const aprovacaoRoutes = require('./routes/aprovacaoRoutes.js');
require('./jobs/enviarRelatoriosWhatsApp');
const metaRoutes = require('./routes/metaRoutes.js');
const relatorioRoutes = require('./routes/relatorioRoutes');
const PORT = process.env.PORT||3000;


// Inicializa o Express
const app = express();

// Middlewares básicos
app.use(express.json()); // Para receber JSON no body das requisições
app.use(cors()); // Permite conexões de outros domínios (frontend)

//rotas principais
app.use('/auth', authRoutes);
app.use('/usuarios', usuarioRoutes);
app.use('/lojas', lojaRoutes); 
app.use('/enderecos', enderecoRoutes);
app.use('/produtos', produtoRoutes);
app.use('/compras', compraRoutes);
app.use('/aprovacoes', aprovacaoRoutes);
app.use('/metas', metaRoutes); 
app.use('/relatorios', relatorioRoutes);

// Exporta o app para ser usado em outros arquivos (ex: ao adicionar rotas)
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta http://localhost:${PORT}`);
});

// deve estar mesmo no final do arquivo
require('./jobs/relatoriosAutomaticos');
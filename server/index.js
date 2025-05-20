const express = require('express');
const app = express();
const authRoutes = require('./routes/auth');
const path = require('path');

app.use(express.json());
app.use(express.static(path.join(__dirname, '../client')));
app.use('/api', authRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));
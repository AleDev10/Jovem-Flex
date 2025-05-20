const express = require('express');
const app = express();
const authRoutes = require('./routes/auth');
const path = require('path');
require('dotenv').config(); // Carrega variáveis do .env
const { Client } = require('pg');

// 🔄 Obtém a URL do .env
const connectionString = process.env.DATABASE_URL;

const client = new Client({ connectionString });

async function dropAllTables() {
  try {
    await client.connect();
    console.log("Conectado ao banco de dados!");

    // 🔍 Pega todas as tabelas do schema 'public'
    const res = await client.query(`
      SELECT tablename FROM pg_tables WHERE schemaname = 'public';
    `);

    const tables = res.rows.map(row => row.tablename);

    if (tables.length === 0) {
      console.log("Nenhuma tabela encontrada.");
    } else {
      for (const table of tables) {
        console.log(`Eliminando tabela: ${table}`);
        await client.query(`DROP TABLE IF EXISTS "${table}" CASCADE`);
      }
      console.log("Todas as tabelas foram eliminadas com sucesso!");
    }
  } catch (error) {
    console.error("Erro ao eliminar as tabelas:", error);
  } finally {
    await client.end();
    console.log("Conexão encerrada.");
  }
}

async function createTables() {
  try {
    await client.connect();
    console.log("Conectado ao banco de dados!");

    // Criação das tabelas
    const query = `
      CREATE TABLE IF NOT EXISTS usuarios (
        id SERIAL PRIMARY KEY,
        nome TEXT,
        numero TEXT UNIQUE,
        senha TEXT,
        tipo TEXT
      );

      CREATE TABLE IF NOT EXISTS lojas (
        id SERIAL PRIMARY KEY,
        nome TEXT,
        descricao TEXT,
        dono_id INTEGER REFERENCES usuarios(id)
      );

      CREATE TABLE IF NOT EXISTS produtos (
        id SERIAL PRIMARY KEY,
        nome TEXT,
        preco NUMERIC,
        loja_id INTEGER REFERENCES lojas(id)
      );

      CREATE TABLE IF NOT EXISTS pedidos (
        id SERIAL PRIMARY KEY,
        cliente_id INTEGER REFERENCES usuarios(id),
        produto_id INTEGER REFERENCES produtos(id),
        data TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;

    await client.query(query);
    console.log("Tabelas criadas com sucesso!");
  } catch (error) {
    console.error("Erro ao criar as tabelas:", error);
  } finally {
    await client.end();
    console.log("Conexão encerrada.");
  }
}

createTables();

//dropAllTables();


app.use(express.json());
app.use(express.static(path.join(__dirname, '../client')));
app.use('/api', authRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));
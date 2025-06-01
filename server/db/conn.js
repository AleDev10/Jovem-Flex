const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: false, // Desabilita SSL para desenvolvimento local
});

module.exports = pool;
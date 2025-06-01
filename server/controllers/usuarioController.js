const pool = require('../db/conn');

// Criar usuário
const criarUsuario = async (req, res) => {
  const { nome, email, senha, tipo, telefone } = req.body;
  try {
    const query = `
      INSERT INTO usuarios (nome, email, senha, tipo, telefone)
      VALUES ($1, $2, $3, $4, $5) RETURNING *`;
    const values = [nome, email, senha, tipo, telefone];
    const result = await pool.query(query, values);
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
};

// Listar todos os usuários
const listarUsuarios = async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM usuarios');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
};

module.exports = { criarUsuario, listarUsuarios };
require('dotenv').config(); // 👈 Deve ser uma das primeiras linhas
const pool = require('../db/conn');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const registrarUsuario = async (req, res) => {
  const { nome, email, senha, tipo, telefone } = req.body;

  // 1. Validações básicas
  if (!nome || !email || !senha || !tipo || !telefone) {
    return res.status(400).json({ erro: "Preencha todos os campos obrigatórios (nome, email, senha, tipo)." });
  }

  if (!['cliente', 'vendedor', 'gerente'].includes(tipo)) {
    return res.status(400).json({ erro: "Tipo de usuário inválido (use: cliente, vendedor ou gerente)." });
  }

  try {
    // 2. Verifica se o email já existe
    const usuarioExistente = await pool.query(
      'SELECT * FROM usuarios WHERE email = $1',
      [email]
    );

    if (usuarioExistente.rows.length > 0) {
      return res.status(409).json({ erro: "Email já cadastrado." });
    }

    // 3. Criptografa a senha
    const senhaCriptografada = await bcrypt.hash(senha, 10); // 10 = salt rounds

    // 4. Insere o usuário no banco de dados
    let novoUsuario;

    if (tipo==='gerente') {
    novoUsuario = await pool.query(
      `INSERT INTO usuarios 
        (nome, email, senha, tipo, telefone, nivel_acesso) 
       VALUES ($1, $2, $3, $4, $5, 'admin') 
       RETURNING id, nome, email, tipo`,
      [nome, email, senhaCriptografada, tipo, telefone]
    );
    } else {
    novoUsuario = await pool.query(
      `INSERT INTO usuarios 
        (nome, email, senha, tipo, telefone) 
       VALUES ($1, $2, $3, $4, $5) 
       RETURNING id, nome, email, tipo`,
      [nome, email, senhaCriptografada, tipo, telefone]
    );
    }
    

    // 5. Gera token JWT
    const token = jwt.sign(
      { id: novoUsuario.rows[0].id, tipo: novoUsuario.rows[0].tipo },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    // 6. Retorna resposta
    res.status(201).json({
      mensagem: "Usuário registrado com sucesso!",
      usuario: novoUsuario.rows[0],
      token
    });

  } catch (err) {
    console.error("Erro no registro:", err);
    res.status(500).json({ erro: "Erro interno no servidor." });
  }
};

const login = async (req, res) => {
  const { email, senha } = req.body;

  // 1. Validação básica
  if (!email || !senha) {
    return res.status(400).json({ erro: "Email e senha são obrigatórios." });
  }

  try {
    // 2. Busca usuário no banco
    const usuario = await pool.query(
      'SELECT id, nome, email, senha, tipo FROM usuarios WHERE email = $1',
      [email]
    );

    // 3. Verifica se usuário existe
    if (usuario.rows.length === 0) {
      return res.status(401).json({ erro: "Email não cadastrado." });
    }

    // 4. Compara senha com hash do banco
    const senhaValida = await bcrypt.compare(senha, usuario.rows[0].senha);
    if (!senhaValida) {
      return res.status(401).json({ erro: "Senha incorreta." });
    }

    // 5. Gera token JWT
    const token = jwt.sign(
      { 
        id: usuario.rows[0].id, 
        tipo: usuario.rows[0].tipo 
      },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    // 6. Retorna resposta (excluindo a senha)
    const { senha: _, ...dadosUsuario } = usuario.rows[0];
    res.json({
      mensagem: "Login realizado com sucesso!",
      usuario: dadosUsuario,
      token
    });

  } catch (err) {
    console.error("Erro no login:", err);
    res.status(500).json({ erro: "Erro interno no servidor." });
  }
};

// Exporta as funções para serem usadas nas rotas
module.exports = { registrarUsuario, login };
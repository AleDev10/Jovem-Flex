const pool = require("../db/conn");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

// Listar todos os usuários (apenas gerentes)
const listarUsuarios = async (req, res) => {
  try {
    // Verifica se o usuário é gerente
    if (req.usuarioTipo !== "gerente") {
      return res
        .status(403)
        .json({ erro: "Acesso negado. Requer perfil de gerente." });
    }

    const result = await pool.query(
      "SELECT id, nome, email, tipo, telefone FROM usuarios"
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
};

// Buscar usuário por ID com validação de acesso
const buscarUsuario = async (req, res) => {
  try {
    const { id } = req.params;
    const usuario = await pool.query(
      "SELECT id, nome, email, tipo, telefone FROM usuarios WHERE id = $1",
      [id]
    );

    if (usuario.rows.length === 0) {
      return res.status(404).json({ erro: "Usuário não encontrado." });
    }

    // Só permite acesso ao próprio perfil ou a gerentes
    if (req.usuarioId !== parseInt(id) && req.usuarioTipo !== "gerente") {
      return res.status(403).json({ erro: "Acesso negado." });
    }

    res.json(usuario.rows[0]);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
};

// Atualizar usuário (apenas o próprio perfil ou gerentes)
const atualizarUsuario = async (req, res) => {
  const { id } = req.params;
  const { nome, email, telefone, tipo, senha, novaSenha } = req.body;

  try {
    // Verifica se o usuário tem permissão
    if (req.usuarioId !== parseInt(id) && req.usuarioTipo !== "gerente") {
      return res.status(403).json({ erro: "Acesso negado." });
    }

    // Busca o usuário atual
    const usuarioAtual = await pool.query(
      "SELECT * FROM usuarios WHERE id = $1",
      [id]
    );
    //console.log("Usuário atual:", id); // Debug

    if (usuarioAtual.rows.length === 0) {
      return res.status(404).json({ erro: "Usuário não encontrado." });
    }

    // Validações específicas
    if (email && email !== usuarioAtual.rows[0].email) {
      const emailExistente = await pool.query(
        "SELECT * FROM usuarios WHERE email = $1 AND id != $2",
        [email, id]
      );
      if (emailExistente.rows.length > 0) {
        return res.status(409).json({ erro: "Email já está em uso." });
      }
    }

    if (tipo && req.usuarioTipo !== "gerente") {
      return res
        .status(403)
        .json({ erro: "Apenas gerentes podem alterar o tipo." });
    }

    // Nova validação de transição de tipo
    if (tipo && tipo !== usuarioAtual.rows[0].tipo) {
      const tipoAtual = usuarioAtual.rows[0].tipo;
      // Só permite cliente -> vendedor
      if (!(tipoAtual === "cliente" && tipo === "vendedor")) {
        return res.status(400).json({
          erro: "Alteração de tipo não permitida.",
          detalhes: "Só é permitido alterar de cliente para vendedor.",
        });
      }
    }

    // Atualização de senha (requer senha atual)
    let senhaCriptografada = usuarioAtual.rows[0].senha;
    if (novaSenha) {
      if (!senha) {
        return res
          .status(400)
          .json({ erro: "Senha atual é obrigatória para alteração." });
      }
      const senhaValida = await bcrypt.compare(
        senha,
        usuarioAtual.rows[0].senha
      );
      if (!senhaValida) {
        return res.status(401).json({ erro: "Senha atual incorreta." });
      }
      senhaCriptografada = await bcrypt.hash(novaSenha, 10);
    }

    // Query de atualização dinâmica
    const result = await pool.query(
      `UPDATE usuarios 
       SET nome = COALESCE($1, nome),
           email = COALESCE($2, email),
           telefone = COALESCE($3, telefone),
           tipo = COALESCE($4, tipo),
           senha = COALESCE($5, senha)
       WHERE id = $6
       RETURNING id, nome, email, tipo, telefone`,
      [
        nome || null,
        email || null,
        telefone || null,
        tipo || null,
        senhaCriptografada || null,
        id,
      ]
    );

    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
};

// Deletar usuário (apenas gerentes)
const deletarUsuario = async (req, res) => {
  const { id } = req.params;

  try {
    // Apenas gerentes ou o próprio usuário (com confirmação)
    if (req.usuarioTipo !== "gerente" && req.usuarioId !== parseInt(id)) {
      return res.status(403).json({ erro: "Acesso negado." });
    }

    // Impede que gerentes se deletem
    const usuario = await pool.query(
      "SELECT tipo FROM usuarios WHERE id = $1",
      [id]
    );
    if (usuario.rows[0]?.tipo === "gerente" && req.usuarioId !== parseInt(id)) {
      return res
        .status(403)
        .json({
          erro: "Gerentes não podem ser deletados por outros usuários.",
        });
    }

    // Verifica se o usuário tem lojas/produtos ativos
    const lojas = await pool.query(
      "SELECT id FROM lojas WHERE vendedor_id = $1",
      [id]
    );
    if (lojas.rows.length > 0) {
      return res
        .status(400)
        .json({ erro: "Transfira as lojas antes de deletar a conta." });
    }

    await pool.query("DELETE FROM usuarios WHERE id = $1", [id]);
    res.json({ mensagem: "Usuário deletado com sucesso." });
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
};

module.exports = {
  listarUsuarios,
  buscarUsuario,
  atualizarUsuario,
  deletarUsuario,
};

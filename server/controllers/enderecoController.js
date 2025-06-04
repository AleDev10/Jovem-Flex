require('dotenv').config();
const pool = require('../db/conn');

// POST /enderecos
const criarEndereco = async (req, res) => {
  const { pais, provincia, municipio, bairro, coordenadas } = req.body;
  const usuarioId = req.usuarioId;

  // Validação básica
  if (!pais || !provincia || !municipio || !bairro) {
    return res.status(400).json({ 
      erro: "Campos obrigatórios faltando.",
      campos_necessarios: ["pais", "provincia", "municipio", "bairro"]
    });
  }

  try {
    const novoEndereco = await pool.query(
      `INSERT INTO enderecos 
       (usuario_id, pais, provincia, municipio, bairro, coordenadas) 
       VALUES ($1, $2, $3, $4, $5, $6) 
       RETURNING *`,
      [usuarioId, pais, provincia, municipio, bairro, coordenadas || null]
    );

    res.status(201).json({
      sucesso: true,
      mensagem: "Endereço criado com sucesso!",
      endereco: novoEndereco.rows[0]
    });

  } catch (err) {
    console.error("Erro ao criar endereço:", err);
    res.status(500).json({ 
      erro: "Erro ao cadastrar endereço.",
      detalhes: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};

// GET /enderecos/usuario/:usuario_id
const listarEnderecosUsuario = async (req, res) => {
  const { usuario_id } = req.params;
  const usuarioRequisitanteId = req.usuarioId;

  // Só permite listar os próprios endereços (exceto gerentes)
  if (usuarioRequisitanteId !== parseInt(usuario_id) && req.usuarioTipo !== 'gerente') {
    return res.status(403).json({
      erro: "Acesso negado.",
      detalhes: "Você só pode visualizar seus próprios endereços."
    });
  }

  try {
    const enderecos = await pool.query(
      'SELECT * FROM enderecos WHERE usuario_id = $1',
      [usuario_id]
    );

    res.json({
      sucesso: true,
      quantidade: enderecos.rows.length,
      enderecos: enderecos.rows
    });

  } catch (err) {
    console.error("Erro ao listar endereços:", err);
    res.status(500).json({ 
      erro: "Erro ao buscar endereços.",
      detalhes: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};

// PUT /enderecos/:id
const atualizarEndereco = async (req, res) => {
  const { id } = req.params;
  const { pais, provincia, municipio, bairro, coordenadas } = req.body;
  const usuarioId = req.usuarioId;

  try {
    // Verifica se o endereço existe e pertence ao usuário
    const enderecoExistente = await pool.query(
      'SELECT usuario_id FROM enderecos WHERE id = $1',
      [id]
    );

    if (enderecoExistente.rows.length === 0) {
      return res.status(404).json({ 
        erro: "Endereço não encontrado." 
      });
    }

    if (enderecoExistente.rows[0].usuario_id !== usuarioId && req.usuarioTipo !== 'gerente') {
      return res.status(403).json({
        erro: "Acesso negado.",
        detalhes: "Você só pode editar seus próprios endereços."
      });
    }

    const enderecoAtualizado = await pool.query(
      `UPDATE enderecos 
       SET pais = COALESCE($1, pais),
           provincia = COALESCE($2, provincia),
           municipio = COALESCE($3, municipio),
           bairro = COALESCE($4, bairro),
           coordenadas = COALESCE($5, coordenadas)
       WHERE id = $6
       RETURNING *`,
      [pais, provincia, municipio, bairro, coordenadas, id]
    );

    res.json({
      sucesso: true,
      mensagem: "Endereço atualizado com sucesso!",
      endereco: enderecoAtualizado.rows[0]
    });

  } catch (err) {
    console.error("Erro ao atualizar endereço:", err);
    res.status(500).json({ 
      erro: "Erro ao atualizar endereço.",
      detalhes: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};

// DELETE /enderecos/:id
const deletarEndereco = async (req, res) => {
  const { id } = req.params;
  const usuarioId = req.usuarioId;

  try {
    // Verifica se o endereço existe e pertence ao usuário
    const endereco = await pool.query(
      'SELECT usuario_id FROM enderecos WHERE id = $1',
      [id]
    );

    if (endereco.rows.length === 0) {
      return res.status(404).json({ 
        erro: "Endereço não encontrado." 
      });
    }

    if (endereco.rows[0].usuario_id !== usuarioId && req.usuarioTipo !== 'gerente') {
      return res.status(403).json({
        erro: "Acesso negado.",
        detalhes: "Você só pode remover seus próprios endereços."
      });
    }

    await pool.query('DELETE FROM enderecos WHERE id = $1', [id]);

    res.json({
      sucesso: true,
      mensagem: "Endereço removido permanentemente.",
      endereco_id: id
    });

  } catch (err) {
    console.error("Erro ao deletar endereço:", err);
    res.status(500).json({ 
      erro: "Erro ao remover endereço.",
      detalhes: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};

module.exports = {
  criarEndereco,
  listarEnderecosUsuario,
  atualizarEndereco,
  deletarEndereco
};
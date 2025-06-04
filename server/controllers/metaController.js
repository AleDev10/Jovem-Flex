require("dotenv").config();
const pool = require("../db/conn");

// POST /metas - Criar meta (apenas gerente pode criar para vendedores)
const criarMeta = async (req, res) => {
  const { vendedor_id, descricao, quantidade, prazo } = req.body;
  const usuarioId = req.usuarioId;
  const usuarioTipo = req.usuarioTipo;

  // Validações básicas
  if (!vendedor_id || !descricao || !quantidade || !prazo) {
    return res.status(400).json({
      erro: "Dados incompletos",
      campos_obrigatorios: ["vendedor_id", "descricao", "quantidade", "prazo"],
    });
  }

  // Verifica se a data é válida
  if (new Date(prazo) < new Date()) {
    return res.status(400).json({
      erro: "Data inválida",
      detalhes: "O prazo não pode ser anterior à data atual",
    });
  }

  // Permissão: apenas gerente pode criar metas
  if (usuarioTipo !== "gerente") {
    return res.status(403).json({
      erro: "Acesso negado",
      detalhes: "Apenas gerentes podem criar metas",
    });
  }

  // Verifica se o usuário de destino é realmente um vendedor ativo
  try {
    const usuarioDestino = await pool.query(
      "SELECT tipo, status FROM usuarios WHERE id = $1",
      [vendedor_id]
    );
    //console.log("Usuário destino:", usuarioDestino.rows);
    if (
      usuarioDestino.rows.length === 0 ||
      usuarioDestino.rows[0].tipo !== "vendedor" ||
      usuarioDestino.rows[0].status !== "ativo"
    ) {
      return res.status(400).json({
        erro: "Meta só pode ser atribuída a vendedores ativos",
        detalhes:
          "Não é permitido criar metas para clientes, gerentes ou vendedores inativos",
      });
    }
  } catch (err) {
    return res.status(500).json({
      erro: "Erro ao validar usuário de destino",
      detalhes:
        process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  }

  try {
    const novaMeta = await pool.query(
      `INSERT INTO metas 
       (vendedor_id, descricao, quantidade, prazo) 
       VALUES ($1, $2, $3, $4) 
       RETURNING *`,
      [vendedor_id, descricao, quantidade, prazo]
    );

    res.status(201).json({
      sucesso: true,
      mensagem: "Meta criada com sucesso",
      meta: novaMeta.rows[0],
    });
  } catch (err) {
    console.error("Erro ao criar meta:", err);
    res.status(500).json({
      erro: "Erro ao criar meta",
      detalhes:
        process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  }
};

// GET /metas - Listar metas com filtros
const listarMetas = async (req, res) => {
  const { vendedor_id, status } = req.query;
  const usuarioId = req.usuarioId;
  const usuarioTipo = req.usuarioTipo;

  // Bloqueia acesso para clientes
  if (usuarioTipo === "cliente") {
    return res.status(403).json({
      erro: "Acesso negado",
      detalhes: "Clientes não podem visualizar metas",
    });
  }

  try {
    let query = "SELECT * FROM metas WHERE 1=1";
    const params = [];

    if (usuarioTipo === "vendedor") {
      // Vendedor só pode ver suas próprias metas, sem filtros
      query += " AND vendedor_id = $1";
      params.push(usuarioId);
    } else if (usuarioTipo === "gerente") {
      // Gerente pode filtrar por vendedor_id
      if (vendedor_id) {
        query += " AND vendedor_id = $1";
        params.push(vendedor_id);
      }
      // Gerente pode filtrar por status
      if (status) {
        query +=
          params.length > 0
            ? " AND status = $" + (params.length + 1)
            : " AND status = $1";
        params.push(status);
      }
    }

    query += " ORDER BY prazo DESC";

    const resultado = await pool.query(query, params);

    res.json({
      sucesso: true,
      metas: resultado.rows,
    });
  } catch (err) {
    console.error("Erro ao listar metas:", err);
    res.status(500).json({
      erro: "Erro ao buscar metas",
      detalhes:
        process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  }
};

// PUT /metas/:id - Atualizar meta
const atualizarMeta = async (req, res) => {
  const { id } = req.params;
  const { descricao, quantidade, prazo, status } = req.body;
  const usuarioId = req.usuarioId;
  const usuarioTipo = req.usuarioTipo;

  // Bloqueia clientes de atualizar metas
  if (usuarioTipo === "cliente") {
    return res.status(403).json({
      erro: "Acesso negado",
      detalhes: "Clientes não podem atualizar metas",
    });
  }

  try {
    // Verifica se a meta existe
    const metaExistente = await pool.query(
      "SELECT * FROM metas WHERE id = $1",
      [id]
    );

    if (metaExistente.rows.length === 0) {
      return res.status(404).json({ erro: "Meta não encontrada" });
    }

    const meta = metaExistente.rows[0];

    // Verifica permissões (gerente ou o próprio vendedor)
    if (usuarioTipo !== "gerente" && meta.vendedor_id !== usuarioId) {
      return res.status(403).json({
        erro: "Acesso negado",
        detalhes: "Você só pode atualizar suas próprias metas",
      });
    }

    // Validações
    if (prazo && new Date(prazo) < new Date()) {
      return res.status(400).json({
        erro: "Data inválida",
        detalhes: "O prazo não pode ser anterior à data atual",
      });
    }

    // Atualiza a meta
    const metaAtualizada = await pool.query(
      `UPDATE metas 
       SET 
         descricao = COALESCE($1, descricao),
         quantidade = COALESCE($2, quantidade),
         prazo = COALESCE($3, prazo),
         status = COALESCE($4, status)
       WHERE id = $5
       RETURNING *`,
      [descricao, quantidade, prazo, status, id]
    );

    res.json({
      sucesso: true,
      mensagem: "Meta atualizada com sucesso",
      meta: metaAtualizada.rows[0],
    });
  } catch (err) {
    console.error("Erro ao atualizar meta:", err);
    res.status(500).json({
      erro: "Erro ao atualizar meta",
      detalhes:
        process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  }
};

// DELETE /metas/:id - Remover meta
const deletarMeta = async (req, res) => {
  const { id } = req.params;
  const usuarioTipo = req.usuarioTipo;

  // Permissão: apenas gerente pode deletar metas
  console.log("Tipo de usuário:", usuarioTipo);
  if (usuarioTipo !== "gerente") {
    return res.status(403).json({
      erro: "Acesso negado",
      detalhes: "Apenas gerentes podem remover metas",
    });
  }

  try {
    // Verifica se a meta existe
    const metaExistente = await pool.query(
      "SELECT * FROM metas WHERE id = $1",
      [id]
    );

    if (metaExistente.rows.length === 0) {
      return res.status(404).json({ erro: "Meta não encontrada" });
    }

    // Remove a meta
    await pool.query("DELETE FROM metas WHERE id = $1", [id]);

    res.json({
      sucesso: true,
      mensagem: "Meta removida com sucesso",
    });
  } catch (err) {
    console.error("Erro ao remover meta:", err);
    res.status(500).json({
      erro: "Erro ao remover meta",
      detalhes:
        process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  }
};

// GET /usuarios/:id/metas - Metas de um vendedor específico
const listarMetasPorVendedor = async (req, res) => {
  const { id } = req.params;
  const usuarioId = req.usuarioId;
  const usuarioTipo = req.usuarioTipo;

  // Bloqueia clientes de acessar metas de vendedores
  if (usuarioTipo === "cliente") {
    return res.status(403).json({
      erro: "Acesso negado",
      detalhes: "Clientes não podem visualizar metas de vendedores",
    });
  }

  // Verifica permissões (gerente ou o próprio vendedor)
  if (usuarioTipo !== "gerente" && parseInt(id) !== usuarioId) {
    return res.status(403).json({
      erro: "Acesso negado",
      detalhes: "Você só pode ver suas próprias metas",
    });
  }

  try {
    const metas = await pool.query(
      "SELECT * FROM metas WHERE vendedor_id = $1 ORDER BY prazo DESC",
      [id]
    );

    res.json({
      sucesso: true,
      metas: metas.rows,
    });
  } catch (err) {
    console.error("Erro ao buscar metas do vendedor:", err);
    res.status(500).json({
      erro: "Erro ao buscar metas",
      detalhes:
        process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  }
};

module.exports = {
  criarMeta,
  listarMetas,
  atualizarMeta,
  deletarMeta,
  listarMetasPorVendedor,
};

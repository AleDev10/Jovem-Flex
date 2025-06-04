const pool = require("../db/conn");

// POST /compras/:id/aprovar - Aprovar compra
const aprovarCompra = async (req, res) => {
  const { id: compra_id } = req.params;
  const gerente_id = req.usuarioId;
  const { status, observacoes } = req.body;

  // Validação básica
  if (!status || !["aprovado", "rejeitado"].includes(status)) {
    return res.status(400).json({
      erro: "Status inválido",
      status_validos: ["aprovado", "rejeitado"],
    });
  }

  try {
    // Verifica se o usuário é gerente
    if (req.usuarioTipo !== "gerente") {
      return res.status(403).json({
        erro: "Acesso negado",
        detalhes: "Apenas gerentes podem aprovar compras",
      });
    }

    // Verifica se a compra existe
    const compra = await pool.query(
      "SELECT id, status FROM compras WHERE id = $1",
      [compra_id]
    );

    if (compra.rows.length === 0) {
      return res.status(404).json({ erro: "Compra não encontrada" });
    }

    // Verifica se a compra já foi processada
    if (compra.rows[0].status !== "pendente") {
      return res.status(400).json({
        erro: "Compra já processada",
        status_atual: compra.rows[0].status,
      });
    }

    // Inicia transação
    await pool.query("BEGIN");

    // Atualiza status da compra
    await pool.query("UPDATE compras SET status = $1 WHERE id = $2", [
      status === "aprovado" ? "pago" : "rejeitado",
      compra_id,
    ]);

    // Registra a aprovação
    const aprovacao = await pool.query(
      `INSERT INTO aprovacoes 
       (compra_id, gerente_id, status, observacoes) 
       VALUES ($1, $2, $3, $4) 
       RETURNING *`,
      [compra_id, gerente_id, status, observacoes || null]
    );

    await pool.query("COMMIT");

    res.status(201).json({
      sucesso: true,
      mensagem: `Compra ${status} com sucesso`,
      aprovacao: aprovacao.rows[0],
      compra_id,
      novo_status: status === "aprovado" ? "pago" : "rejeitado",
    });
  } catch (err) {
    await pool.query("ROLLBACK");
    console.error("Erro ao aprovar compra:", err);
    res.status(500).json({
      erro: "Erro ao processar aprovação",
      detalhes:
        process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  }
};

// GET /aprovacoes - Listar aprovações
const listarAprovacoes = async (req, res) => {
  const { gerente_id, status, pagina = 1, limite = 10 } = req.query;

  // Apenas gerentes podem ver todas as aprovações
  if (!gerente_id && req.usuarioTipo !== "gerente") {
    return res.status(403).json({
      erro: "Acesso negado",
      detalhes: "Apenas gerentes podem visualizar todas as aprovações",
    });
  }

  try {
    let query = `
      SELECT a.*, 
             c.valor as compra_valor,
             u.nome as gerente_nome
      FROM aprovacoes a
      JOIN compras c ON a.compra_id = c.id
      JOIN usuarios u ON a.gerente_id = u.id
      WHERE 1=1
    `;
    const params = [];

    // Filtros
    if (gerente_id) {
      query += " AND a.gerente_id = $" + (params.length + 1);
      params.push(gerente_id);
    }

    if (status) {
      query += " AND a.status = $" + (params.length + 1);
      params.push(status);
    }

    // Paginação
    const offset = (pagina - 1) * limite;
    query += ` ORDER BY a.data_aprovacao DESC LIMIT $${
      params.length + 1
    } OFFSET $${params.length + 2}`;
    params.push(limite, offset);

    const [aprovacoes, total] = await Promise.all([
      pool.query(query, params),
      pool.query("SELECT COUNT(*) FROM aprovacoes"),
    ]);

    res.json({
      sucesso: true,
      meta: {
        total: parseInt(total.rows[0].count),
        pagina: parseInt(pagina),
        limite: parseInt(limite),
      },
      aprovacoes: aprovacoes.rows,
    });
  } catch (err) {
    console.error("Erro ao listar aprovações:", err);
    res.status(500).json({
      erro: "Erro ao buscar aprovações",
      detalhes:
        process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  }
};

// GET /aprovacoes/:id - Detalhes da aprovação
const buscarAprovacaoPorId = async (req, res) => {
  const { id } = req.params;

  try {
    const aprovacao = await pool.query(
      `SELECT a.*, 
              c.valor as compra_valor,
              c.status as compra_status,
              u.nome as gerente_nome,
              uc.nome as cliente_nome
       FROM aprovacoes a
       JOIN compras c ON a.compra_id = c.id
       JOIN usuarios u ON a.gerente_id = u.id
       JOIN usuarios uc ON c.cliente_id = uc.id
       WHERE a.id = $1`,
      [id]
    );

    if (aprovacao.rows.length === 0) {
      return res.status(404).json({ erro: "Aprovação não encontrada" });
    }

    res.json({
      sucesso: true,
      aprovacao: aprovacao.rows[0],
    });
  } catch (err) {
    console.error("Erro ao buscar aprovação:", err);
    res.status(500).json({
      erro: "Erro ao buscar aprovação",
      detalhes:
        process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  }
};

module.exports = {
  aprovarCompra,
  listarAprovacoes,
  buscarAprovacaoPorId,
};

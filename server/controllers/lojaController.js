require("dotenv").config();
const pool = require("../db/conn");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

// 1. Criação de Loja (POST /lojas)
const criarLoja = async (req, res) => {
  const { nome, descricao, imagem, latitude, longitude } = req.body;
  const vendedorId = req.usuarioId;
  const usuarioTipo = req.usuarioTipo;

  // 1. Verifica se o usuário é vendedor ou gerente
  if (usuarioTipo === "cliente") {
    return res.status(403).json({
      erro: "Acesso negado. Clientes não podem criar lojas.",
      solução: "Atualize seu perfil para vendedor ou gerente.",
    });
  }

  // 2. Validação básica dos campos
  if (!nome || !descricao) {
    return res.status(400).json({
      erro: "Campos obrigatórios faltando.",
      campos_necessarios: ["nome", "descricao"],
    });
  }

  try {
    // 3. Criação efetiva da loja
    const novaLoja = await pool.query(
      `INSERT INTO lojas 
       (nome, descricao, vendedor_id, imagem, latitude, longitude) 
       VALUES ($1, $2, $3, $4, $5, $6) 
       RETURNING id, nome, descricao, imagem, vendedor_id, data_criacao`,
      [nome, descricao, vendedorId, imagem, latitude, longitude]
    );

    res.status(201).json({
      sucesso: true,
      mensagem: "Loja criada com sucesso!",
      dados: novaLoja.rows[0],
    });
  } catch (err) {
    console.error("Erro ao criar loja:", err);
    res.status(500).json({
      erro: "Falha no servidor ao criar loja.",
      detalhes:
        process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  }
};

// 2. Listagem de Lojas (GET /lojas)
const listarLojas = async (req, res) => {
  try {
    const { vendedor_id, nome, pagina = 1, limite = 10 } = req.query;
    let query = "SELECT * FROM lojas WHERE 1=1";
    const params = [];

    // Filtros
    if (vendedor_id) {
      query += " AND vendedor_id = $" + (params.length + 1);
      params.push(vendedor_id);
    }

    if (nome) {
      query += " AND nome ILIKE $" + (params.length + 1);
      params.push(`%${nome}%`);
    }

    // Paginação
    const offset = (pagina - 1) * limite;
    query += ` LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limite, offset);

    const [lojas, total] = await Promise.all([
      pool.query(query, params),
      pool.query("SELECT COUNT(*) FROM lojas"),
    ]);

    res.json({
      dados: lojas.rows,
      meta: {
        total: parseInt(total.rows[0].count),
        pagina: parseInt(pagina),
        limite: parseInt(limite),
      },
    });
  } catch (err) {
    console.error("Erro ao listar lojas:", err);
    res.status(500).json({ erro: "Erro ao buscar lojas." });
  }
};

// 3. Busca de Loja por ID (GET /lojas/:id)
const buscarLojaPorId = async (req, res) => {
  try {
    const { id } = req.params;
    const loja = await pool.query(
      `SELECT l.*, u.nome as vendedor_nome 
       FROM lojas l
       JOIN usuarios u ON l.vendedor_id = u.id
       WHERE l.id = $1`,
      [id]
    );

    if (loja.rows.length === 0) {
      return res.status(404).json({ erro: "Loja não encontrada." });
    }

    res.json(loja.rows[0]);
  } catch (err) {
    console.error("Erro ao buscar loja:", err);
    res.status(500).json({ erro: "Erro ao buscar loja." });
  }
};

// 4. Atualização de Loja (PUT /lojas/:id)
const atualizarLoja = async (req, res) => {
  const { id } = req.params;
  const { nome, descricao, imagem, latitude, longitude } = req.body;
  const usuarioId = req.usuarioId;
  const usuarioTipo = req.usuarioTipo;

  try {
    // 1. Verifica se a loja existe
    const loja = await pool.query(
      "SELECT vendedor_id FROM lojas WHERE id = $1",
      [id]
    );

    if (loja.rows.length === 0) {
      return res.status(404).json({
        erro: "Loja não encontrada.",
        solucao: "Verifique o ID fornecido.",
      });
    }

    // 2. Verifica permissões (dono OU gerente)
    const vendedorId = loja.rows[0].vendedor_id;
    if (usuarioId !== vendedorId && usuarioTipo !== "gerente") {
      return res.status(403).json({
        erro: "Acesso negado.",
        detalhes: "Apenas o dono da loja ou um gerente podem atualizá-la.",
        info: `Dono da loja: ${vendedorId}, Seu ID: ${usuarioId}`,
      });
    }

    // 3. Atualização segura com COALESCE
    const lojaAtualizada = await pool.query(
      `UPDATE lojas 
       SET nome = COALESCE($1, nome),
           descricao = COALESCE($2, descricao),
           imagem = COALESCE($3, imagem),
           latitude = COALESCE($4, latitude),
           longitude = COALESCE($5, longitude),
           data_criacao = NOW()
       WHERE id = $6
       RETURNING *`,
      [nome, descricao, imagem, latitude, longitude, id]
    );

    // 4. Resposta detalhada
    res.json({
      sucesso: true,
      mensagem: "Loja atualizada com sucesso!",
      dados: lojaAtualizada.rows[0],
      permissoes: {
        ehDono: usuarioId === vendedorId,
        ehGerente: usuarioTipo === "gerente",
      },
    });
  } catch (err) {
    console.error("Erro ao atualizar loja:", err);
    res.status(500).json({
      erro: "Falha ao atualizar loja.",
      detalhes:
        process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  }
};

// 5. Exclusão de Loja (DELETE /lojas/:id)
const deletarLoja = async (req, res) => {
  const { id } = req.params;
  const { confirmacao } = req.body; // campo obrigatório
  const usuarioId = req.usuarioId;
  const usuarioTipo = req.usuarioTipo;

  try {
    // 1. Verifica se a loja existe
    const loja = await pool.query(
      "SELECT vendedor_id FROM lojas WHERE id = $1",
      [id]
    );

    if (loja.rows.length === 0) {
      return res.status(404).json({
        erro: "Loja não encontrada.",
        solucao: "Verifique o ID fornecido.",
      });
    }

    // 2. Verifica permissões (dono OU gerente)
    const vendedorId = loja.rows[0].vendedor_id;
    if (usuarioId !== vendedorId && usuarioTipo !== "gerente") {
      return res.status(403).json({
        erro: "Acesso negado.",
        detalhes: "Apenas o dono da loja ou um gerente podem deletá-la.",
      });
    }

    // 3. Exige confirmação explícita
    if (confirmacao !== "CONFIRMAR DELECAO TOTAL") {
      return res.status(400).json({
        erro: "Confirmação necessária.",
        detalhes: "Para deletar a loja e TODOS os seus produtos, envie:",
        corpo_requisicao_exemplo: {
          confirmacao: "CONFIRMAR DELECAO TOTAL",
        },
        risco:
          "Esta ação é irreversível e apagará todos os produtos vinculados!",
      });
    }

    // 4. Executa a deleção em transação
    await pool.query("BEGIN");

    // Primeiro deleta os produtos
    await pool.query("DELETE FROM produtos WHERE loja_id = $1", [id]);

    // Depois deleta a loja
    await pool.query("DELETE FROM lojas WHERE id = $1", [id]);

    await pool.query("COMMIT");

    // 5. Resposta de sucesso
    res.json({
      sucesso: true,
      mensagem:
        "Loja e todos os seus produtos foram deletados permanentemente.",
      dados: {
        loja_id: id,
        produtos_removidos: true,
      },
    });
  } catch (err) {
    await pool.query("ROLLBACK");
    console.error("Erro ao deletar loja:", err);
    res.status(500).json({
      erro: "Falha ao deletar loja.",
      detalhes:
        process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  }
};

// 6. Listar Lojas por Vendedor (GET /lojas/vendedor/:vendedorId)
const listarLojasPorVendedor = async (req, res) => {
  try {
    const { vendedorId } = req.params;
    const lojas = await pool.query(
      "SELECT * FROM lojas WHERE vendedor_id = $1",
      [vendedorId]
    );
    res.json(lojas.rows);
  } catch (err) {
    console.error("Erro ao listar lojas por vendedor:", err);
    res.status(500).json({ erro: "Erro ao buscar lojas." });
  }
};

// 7. Transferir Loja (POST /lojas/:id/transferir)
const transferirLoja = async (req, res) => {
  const { id } = req.params; // ID da loja
  const { novoVendedorId } = req.body; // ID do novo dono
  const usuarioId = req.usuarioId; // ID do usuário logado (vendedor atual)

  try {
    // 1. Validações iniciais
    if (!novoVendedorId) {
      return res
        .status(400)
        .json({ erro: "ID do novo vendedor é obrigatório." });
    }

    // 2. Verifica se a loja existe e pertence ao usuário logado
    const loja = await pool.query(
      "SELECT vendedor_id FROM lojas WHERE id = $1",
      [id]
    );

    if (loja.rows.length === 0) {
      return res.status(404).json({ erro: "Loja não encontrada." });
    }

    // Permite que o dono da loja OU gerente transfira
    if (
      loja.rows[0].vendedor_id !== usuarioId &&
      req.usuarioTipo !== "gerente"
    ) {
      return res
        .status(403)
        .json({
          erro: "Apenas o dono da loja ou um gerente podem transferi-la.",
        });
    }

    // 3. Verifica se o novo vendedor existe
    const novoVendedor = await pool.query(
      "SELECT id, tipo FROM usuarios WHERE id = $1",
      [novoVendedorId]
    );

    if (novoVendedor.rows.length === 0) {
      return res.status(404).json({ erro: "Novo vendedor não encontrado." });
    }

    if (novoVendedor.rows[0].tipo !== "vendedor") {
      return res
        .status(400)
        .json({ erro: "O novo dono deve ser um vendedor." });
    }

    // 4. Executa a transferência
    await pool.query("UPDATE lojas SET vendedor_id = $1 WHERE id = $2", [
      novoVendedorId,
      id,
    ]);

    // 5. Atualiza os produtos da loja (opcional)
    await pool.query("UPDATE produtos SET loja_id = $1 WHERE loja_id = $2", [
      novoVendedorId,
      id,
    ]);

    res.json({
      mensagem: "Loja transferida com sucesso!",
      lojaId: id,
      novoDonoId: novoVendedorId,
    });
  } catch (err) {
    console.error("Erro na transferência:", err);
    res.status(500).json({ erro: "Erro interno no servidor." });
  }
};

module.exports = {
  criarLoja,
  listarLojas,
  buscarLojaPorId,
  atualizarLoja,
  deletarLoja,
  listarLojasPorVendedor,
  transferirLoja,
};

// O código acima implementa as funcionalidades de gerenciamento de lojas, incluindo criação, listagem, busca por ID, atualização, exclusão, listagem por vendedor e transferência de loja. Cada função lida com validações e interações com o banco de dados usando a biblioteca `pg` para PostgreSQL. As respostas são formatadas em JSON para facilitar a integração com o frontend.

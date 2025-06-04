require("dotenv").config();
const pool = require("../db/conn");

// POST /lojas/:id/produtos
const criarProduto = async (req, res) => {
  const { id: loja_id } = req.params;
  const { nome, preco, descricao, categoria, imagem, stock } = req.body;
  const usuarioId = req.usuarioId;

  // Validação básica
  if (!nome || !preco || !categoria) {
    return res.status(400).json({
      erro: "Campos obrigatórios faltando.",
      campos_necessarios: ["nome", "preco", "categoria"],
    });
  }

  try {
    // Verifica se a loja pertence ao usuário (exceto gerentes)
    const loja = await pool.query(
      `SELECT vendedor_id FROM lojas 
       WHERE id = $1 AND (vendedor_id = $2 OR $3 = 'gerente')`,
      [loja_id, usuarioId, req.usuarioTipo]
    );

    if (loja.rows.length === 0) {
      return res.status(403).json({
        erro: "Acesso negado.",
        detalhes: "Você não tem permissão para adicionar produtos a esta loja.",
      });
    }

    const novoProduto = await pool.query(
      `INSERT INTO produtos 
       (nome, preco, descricao, categoria, loja_id, imagem, stock) 
       VALUES ($1, $2, $3, $4, $5, $6, $7) 
       RETURNING *`,
      [
        nome,
        parseFloat(preco),
        descricao,
        categoria,
        loja_id,
        imagem,
        parseInt(stock || 0),
      ]
    );

    res.status(201).json({
      sucesso: true,
      mensagem: "Produto criado com sucesso!",
      produto: novoProduto.rows[0],
    });
  } catch (err) {
    console.error("Erro ao criar produto:", err);
    res.status(500).json({
      erro: "Erro ao cadastrar produto.",
      detalhes:
        process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  }
};

// GET /produtos
const listarProdutos = async (req, res) => {
  const { categoria, loja_id, pagina = 1, limite = 10 } = req.query;

  try {
    let query = `
      SELECT p.*, l.nome as loja_nome, l.data_criacao as loja_data_criacao
      FROM produtos p
      JOIN lojas l ON p.loja_id = l.id
      WHERE 1=1
    `;
    const params = [];

    // Filtros
    if (categoria) {
      query += " AND p.categoria = $" + (params.length + 1);
      params.push(categoria);
    }

    if (loja_id) {
      query += " AND p.loja_id = $" + (params.length + 1);
      params.push(loja_id);
    }

    // Paginação
    const offset = (pagina - 1) * limite;

    query += ` ORDER BY p.id DESC LIMIT $${params.length + 1} OFFSET $${
      params.length + 2
    }`;
    params.push(limite, offset);

    // Consulta de contagem com os mesmos filtros
    let countQuery = `
      SELECT COUNT(*) 
      FROM produtos p
      JOIN lojas l ON p.loja_id = l.id
      WHERE 1=1
    `;
    const countParams = [];

    if (categoria) {
      countQuery += " AND p.categoria = $" + (countParams.length + 1);
      countParams.push(categoria);
    }

    if (loja_id) {
      countQuery += " AND p.loja_id = $" + (countParams.length + 1);
      countParams.push(loja_id);
    }

    const [produtos, total] = await Promise.all([
      pool.query(query, params),
      pool.query(countQuery, countParams),
    ]);

    res.json({
      sucesso: true,
      meta: {
        total: parseInt(total.rows[0].count),
        pagina: parseInt(pagina),
        limite: parseInt(limite),
        totalPaginas: Math.ceil(total.rows[0].count / limite),
      },
      produtos: produtos.rows,
    });
  } catch (err) {
    console.error("Erro ao listar produtos:", err);
    res.status(500).json({
      sucesso: false,
      erro: "Erro ao buscar produtos.",
      detalhes:
        process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  }
};

// GET /produtos/:id
const buscarProdutoPorId = async (req, res) => {
  const { id } = req.params;

  try {
    const produto = await pool.query(
      `SELECT p.*, l.nome as loja_nome, l.vendedor_id
       FROM produtos p
       JOIN lojas l ON p.loja_id = l.id
       WHERE p.id = $1`,
      [id]
    );

    if (produto.rows.length === 0) {
      return res.status(404).json({
        erro: "Produto não encontrado.",
      });
    }

    res.json({
      sucesso: true,
      produto: produto.rows[0],
    });
  } catch (err) {
    console.error("Erro ao buscar produto:", err);
    res.status(500).json({
      erro: "Erro ao buscar produto.",
      detalhes:
        process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  }
};

// PUT /produtos/:id
const atualizarProduto = async (req, res) => {
  const { id } = req.params;
  const { nome, preco, descricao, categoria, imagem, stock } = req.body;
  const usuarioId = req.usuarioId;

  try {
    // Verifica se o produto pertence a uma loja do usuário
    const produto = await pool.query(
      `SELECT p.id 
       FROM produtos p
       JOIN lojas l ON p.loja_id = l.id
       WHERE p.id = $1 AND (l.vendedor_id = $2 OR $3 = 'gerente')`,
      [id, usuarioId, req.usuarioTipo]
    );

    if (produto.rows.length === 0) {
      return res.status(403).json({
        erro: "Acesso negado.",
        detalhes: "Você não tem permissão para editar este produto.",
      });
    }

    const produtoAtualizado = await pool.query(
      `UPDATE produtos 
       SET nome = COALESCE($1, nome),
           preco = COALESCE($2, preco),
           descricao = COALESCE($3, descricao),
           categoria = COALESCE($4, categoria),
           imagem = COALESCE($5, imagem),
           stock = COALESCE($6, stock)
       WHERE id = $7
       RETURNING *`,
      [nome, preco, descricao, categoria, imagem, stock, id]
    );

    res.json({
      sucesso: true,
      mensagem: "Produto atualizado com sucesso!",
      produto: produtoAtualizado.rows[0],
    });
  } catch (err) {
    console.error("Erro ao atualizar produto:", err);
    res.status(500).json({
      erro: "Erro ao atualizar produto.",
      detalhes:
        process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  }
};

// DELETE /produtos/:id
const deletarProduto = async (req, res) => {
  const { id } = req.params;
  const usuarioId = req.usuarioId;

  try {
    // Verifica se o produto existe e permissões (dono da loja ou gerente)
    const produto = await pool.query(
      `SELECT p.id 
       FROM produtos p
       JOIN lojas l ON p.loja_id = l.id
       WHERE p.id = $1`,
      [id]
    );

    if (produto.rows.length === 0) {
      return res.status(404).json({
        erro: "Produto não encontrado.",
      });
    }

    // Verifica permissões
    const permissao = await pool.query(
      `SELECT p.id 
       FROM produtos p
       JOIN lojas l ON p.loja_id = l.id
       WHERE p.id = $1 AND (l.vendedor_id = $2 OR $3 = 'gerente')`,
      [id, usuarioId, req.usuarioTipo]
    );

    if (permissao.rows.length === 0) {
      return res.status(403).json({
        erro: "Acesso negado.",
        detalhes: "Você não tem permissão para remover este produto.",
      });
    }

    await pool.query("DELETE FROM produtos WHERE id = $1", [id]);

    res.json({
      sucesso: true,
      mensagem: "Produto removido permanentemente.",
      produto_id: id,
    });
  } catch (err) {
    console.error("Erro ao deletar produto:", err);
    res.status(500).json({
      erro: "Erro ao remover produto.",
      detalhes:
        process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  }
};

module.exports = {
  criarProduto,
  listarProdutos,
  buscarProdutoPorId,
  atualizarProduto,
  deletarProduto,
};

require("dotenv").config();
const pool = require("../db/conn");

// POST /compras - Registrar nova compra
const criarCompra = async (req, res) => {
  const { produto_id, quantidade } = req.body;
  const clienteId = req.usuarioId;

  // Permitir apenas clientes realizarem compras
  if (req.usuarioTipo !== "cliente") {
    return res.status(403).json({
      erro: "Apenas usuários do tipo cliente podem realizar compras.",
    });
  }

  // Validação básica
  if (!produto_id || !quantidade || quantidade <= 0) {
    return res.status(400).json({
      erro: "Dados inválidos.",
      detalhes: "produto_id e quantidade (maior que 0) são obrigatórios",
    });
  }

  try {
    // 1. Verifica disponibilidade do produto e obtém vendedor_id
    const produtoResult = await pool.query(
      `SELECT p.id, p.preco, p.stock, p.nome, l.vendedor_id 
       FROM produtos p 
       JOIN lojas l ON p.loja_id = l.id 
       WHERE p.id = $1`,
      [produto_id]
    );

    if (produtoResult.rows.length === 0) {
      return res.status(404).json({ erro: "Produto não encontrado." });
    }

    const produto = produtoResult.rows[0];

    if (produto.stock < quantidade) {
      return res.status(400).json({
        erro: "Estoque insuficiente.",
        stock_disponivel: produto.stock,
        produto: produto.nome,
      });
    }

    // 2. Busca município do CLIENTE (na tabela enderecos)
    const clienteEndereco = await pool.query(
      `SELECT municipio FROM enderecos WHERE usuario_id = $1`,
      [clienteId]
    );
    
    if (clienteEndereco.rows.length === 0) {
      return res.status(400).json({
        erro: "Endereço não cadastrado.",
        detalhes: "O cliente precisa ter um endereço registrado para realizar compras."
      });
    }
    const municipioCliente = clienteEndereco.rows[0].municipio;

    // 3. Busca município do VENDEDOR (na tabela enderecos)
    const vendedorEndereco = await pool.query(
      `SELECT municipio FROM enderecos WHERE usuario_id = $1`,
      [produto.vendedor_id]
    );
    
    if (vendedorEndereco.rows.length === 0) {
      return res.status(400).json({
        erro: "Vendedor sem endereço cadastrado.",
        detalhes: "O vendedor deste produto precisa ter um endereço registrado."
      });
    }
    const municipioVendedor = vendedorEndereco.rows[0].municipio;

    // 4. Verifica se cliente e vendedor estão no mesmo município
    if (municipioCliente !== municipioVendedor) {
      return res.status(403).json({
        erro: "Compra não permitida.",
        detalhes: "Cliente e vendedor não estão no mesmo município.",
        cliente_municipio: municipioCliente,
        vendedor_municipio: municipioVendedor
      });
    }

    // 5. Gera código da compra
    const codigoCompra = "CMP-" + Date.now() + "-" + Math.floor(Math.random() * 1000);

    // 6. Calcula valor total
    const valorTotal = produto.preco * quantidade;

    // 7. Transação para registrar compra e atualizar estoque
    await pool.query("BEGIN");

    const novaCompra = await pool.query(
      `INSERT INTO compras 
       (cliente_id, produto_id, quantidade, valor, status, codigo_compra) 
       VALUES ($1, $2, $3, $4, 'pendente', $5) 
       RETURNING *`,
      [clienteId, produto_id, quantidade, valorTotal, codigoCompra]
    );

    await pool.query("UPDATE produtos SET stock = stock - $1 WHERE id = $2", [
      quantidade,
      produto_id,
    ]);

    await pool.query("COMMIT");

    // 8. Resposta formatada
    res.status(201).json({
      sucesso: true,
      mensagem: "Compra registrada com sucesso!",
      compra: {
        ...novaCompra.rows[0],
        produto_nome: produto.nome,
        preco_unitario: produto.preco,
      },
    });
  } catch (err) {
    await pool.query("ROLLBACK");
    console.error("Erro ao registrar compra:", err);

    res.status(500).json({
      erro: "Erro ao processar compra.",
      detalhes: process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  }
};

// GET /compras - Listar compras (com filtros)
const listarCompras = async (req, res) => {
  const { status, pagina = 1, limite = 10 } = req.query;
  const usuarioId = req.usuarioId;
  const usuarioTipo = req.usuarioTipo;

  try {
    let query = `
      SELECT c.*, p.nome as produto_nome, p.imagem as produto_imagem 
      FROM compras c
      JOIN produtos p ON c.produto_id = p.id
      WHERE 1=1
    `;
    const params = [];

    // Filtros de permissão
    if (usuarioTipo === "cliente") {
      // Cliente só vê suas próprias compras
      query += " AND c.cliente_id = $" + (params.length + 1);
      params.push(usuarioId);
    } else if (usuarioTipo === "vendedor") {
      // Vendedor só vê compras de produtos das suas lojas
      query += ` AND p.loja_id IN (
        SELECT id FROM lojas WHERE vendedor_id = $${params.length + 1}
      )`;
      params.push(usuarioId);
    } else if (usuarioTipo !== "gerente") {
      // Outros tipos não têm permissão
      return res.status(403).json({
        erro: "Acesso negado.",
      });
    }
    // Gerente vê todas as compras (não aplica filtro)

    // Filtros opcionais
    if (status) {
      query += " AND c.status = $" + (params.length + 1);
      params.push(status);
    }

    // Paginação
    const offset = (pagina - 1) * limite;
    query += ` ORDER BY c.data DESC LIMIT $${params.length + 1} OFFSET $${
      params.length + 2
    }`;
    params.push(limite, offset);

    const [compras, total] = await Promise.all([
      pool.query(query, params),
      pool.query("SELECT COUNT(*) FROM compras"),
    ]);

    res.json({
      sucesso: true,
      meta: {
        total: parseInt(total.rows[0].count),
        pagina: parseInt(pagina),
        limite: parseInt(limite),
      },
      compras: compras.rows,
    });
  } catch (err) {
    console.error("Erro ao listar compras:", err);
    res.status(500).json({
      erro: "Erro ao buscar compras.",
      detalhes:
        process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  }
};

// GET /compras/:id - Detalhes da compra
const buscarCompraPorId = async (req, res) => {
  const { id } = req.params;
  const usuarioId = req.usuarioId;
  const usuarioTipo = req.usuarioTipo;

  try {
    const compra = await pool.query(
      `SELECT c.*, p.nome as produto_nome, p.descricao as produto_descricao,
       p.loja_id, l.nome as loja_nome, u.nome as cliente_nome
       FROM compras c
       JOIN produtos p ON c.produto_id = p.id
       JOIN lojas l ON p.loja_id = l.id
       JOIN usuarios u ON c.cliente_id = u.id
       WHERE c.id = $1`,
      [id]
    );

    if (compra.rows.length === 0) {
      return res.status(404).json({ erro: "Compra não encontrada." });
    }

    const compraData = compra.rows[0];

    // Cliente só pode ver suas próprias compras
    if (usuarioTipo === "cliente" && compraData.cliente_id !== usuarioId) {
      return res.status(403).json({
        erro: "Acesso negado.",
        detalhes: "Você só pode visualizar suas próprias compras.",
      });
    }

    // Vendedor só pode ver compras de produtos das suas lojas
    if (usuarioTipo === "vendedor") {
      // Verifica se o vendedor é dono da loja do produto comprado
      const loja = await pool.query(
        "SELECT vendedor_id FROM lojas WHERE id = $1",
        [compraData.loja_id]
      );
      if (loja.rows.length === 0 || loja.rows[0].vendedor_id !== usuarioId) {
        return res.status(403).json({
          erro: "Acesso negado.",
          detalhes:
            "Você só pode visualizar compras de produtos das suas lojas.",
        });
      }
    }

    // Gerente pode ver qualquer compra

    res.json({
      sucesso: true,
      compra: compraData,
    });
  } catch (err) {
    console.error("Erro ao buscar compra:", err);
    res.status(500).json({
      erro: "Erro ao buscar compra.",
      detalhes:
        process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  }
};

// PUT /compras/:id/status - Atualizar status
const atualizarStatusCompra = async (req, res) => {
  const { id } = req.params;
  const { status, codigo_compra } = req.body; // Adicione codigo_compra para validação do vendedor
  const usuarioId = req.usuarioId;
  const usuarioTipo = req.usuarioTipo;

  // Status válidos
  const statusValidos = [
    "pendente",
    "pago",
    "enviado",
    "entregue",
    "cancelado",
  ];
  if (!statusValidos.includes(status)) {
    return res.status(400).json({
      erro: "Status inválido.",
      status_validos: statusValidos,
    });
  }

  try {
    // Verifica permissões e existência da compra
    const compra = await pool.query(
      `SELECT c.*, p.loja_id 
       FROM compras c
       JOIN produtos p ON c.produto_id = p.id
       WHERE c.id = $1`,
      [id]
    );

    if (compra.rows.length === 0) {
      return res.status(404).json({ erro: "Compra não encontrada." });
    }

    const compraData = compra.rows[0];

    // Cliente só pode mudar para pendente ou cancelado (e só cancelar se pendente)
    if (usuarioTipo === "cliente") {
      if (compraData.cliente_id !== usuarioId) {
        return res.status(403).json({ erro: "Acesso negado." });
      }
      if (
        !["pendente", "cancelado"].includes(status) ||
        (status === "cancelado" && compraData.status !== "pendente")
      ) {
        return res.status(403).json({
          erro: "Ação não permitida.",
          detalhes:
            "Clientes só podem cancelar compras pendentes ou voltar para pendente.",
        });
      }
    }

    // Vendedor só pode mudar para pendente, cancelado ou entregue (entregue só se código correto)
    if (usuarioTipo === "vendedor") {
      const loja = await pool.query(
        "SELECT vendedor_id FROM lojas WHERE id = $1",
        [compraData.loja_id]
      );
      if (loja.rows[0].vendedor_id !== usuarioId) {
        return res.status(403).json({
          erro: "Acesso negado.",
          detalhes: "Você não tem permissão para esta compra.",
        });
      }
      if (!["pendente", "cancelado", "entregue"].includes(status)) {
        return res.status(403).json({
          erro: "Ação não permitida.",
          detalhes:
            "Vendedor só pode mudar para pendente, cancelado ou entregue.",
        });
      }
      if (status === "entregue") {
        // Só pode marcar como entregue se o código de compra for informado e correto
        if (!codigo_compra || codigo_compra !== compraData.codigo_compra) {
          return res.status(400).json({
            erro: "Código de compra inválido ou não informado.",
            detalhes: "Para marcar como entregue, informe o código correto.",
          });
        }
      }
    }

    // Gerente pode mudar para qualquer status

    const compraAtualizada = await pool.query(
      `UPDATE compras 
       SET status = $1
       WHERE id = $2
       RETURNING *`,
      [status, id]
    );

    // Se cancelada, devolve ao estoque
    if (status === "cancelado") {
      await pool.query("UPDATE produtos SET stock = stock + $1 WHERE id = $2", [
        compraData.quantidade,
        compraData.produto_id,
      ]);
    }

    res.json({
      sucesso: true,
      mensagem: "Status da compra atualizado!",
      compra: compraAtualizada.rows[0],
    });
  } catch (err) {
    console.error("Erro ao atualizar status:", err);
    res.status(500).json({
      erro: "Erro ao atualizar compra.",
      detalhes:
        process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  }
};

// GET /usuarios/:id/compras - Histórico do usuário
const historicoComprasUsuario = async (req, res) => {
  const { id } = req.params;
  const usuarioRequisitanteId = req.usuarioId;
  const usuarioTipo = req.usuarioTipo;

  // Verifica se o parâmetro ID é válido
  if (!id || isNaN(parseInt(id))) {
    return res.status(400).json({
      erro: "ID inválido.",
      detalhes: "O ID do usuário deve ser um número válido."
    });
  }

  try {
    // Verifica se o usuário existe
    const usuarioExiste = await pool.query(
      "SELECT id, tipo FROM usuarios WHERE id = $1",
      [id]
    );

    if (usuarioExiste.rows.length === 0) {
      return res.status(404).json({
        erro: "Usuário não encontrado.",
        detalhes: "O ID fornecido não corresponde a nenhum usuário cadastrado."
      });
    }

    const usuarioAlvo = usuarioExiste.rows[0];

    // Verifica permissões de acesso
    if (usuarioTipo === "cliente") {
      if (usuarioRequisitanteId !== parseInt(id)) {
        return res.status(403).json({
          erro: "Acesso negado.",
          detalhes: "Clientes só podem ver seu próprio histórico."
        });
      }
    } 
    else if (usuarioTipo === "vendedor") {
      // Vendedor só pode ver seu próprio histórico ou de clientes que compraram seus produtos
      if (usuarioRequisitanteId !== parseInt(id)) {
        // Verifica se o vendedor tem relação com as compras
        const temAcesso = await pool.query(
          `SELECT 1 FROM compras c
           JOIN produtos p ON c.produto_id = p.id
           JOIN lojas l ON p.loja_id = l.id
           WHERE c.cliente_id = $1 AND l.vendedor_id = $2
           LIMIT 1`,
          [id, usuarioRequisitanteId]
        );
        
        if (temAcesso.rows.length === 0) {
          return res.status(403).json({
            erro: "Acesso negado.",
            detalhes: "Vendedores só podem ver histórico de seus próprios clientes."
          });
        }
      }
    }
    // Gerentes podem ver qualquer histórico (não precisa de verificação adicional)

    // Construção da query base
    let query = `
      SELECT 
        c.id,
        c.codigo_compra,
        c.quantidade,
        c.valor,
        c.status,
        c.data,
        p.nome as produto_nome,
        p.imagem as produto_imagem,
        p.preco as preco_unitario,
        l.nome as loja_nome,
        l.vendedor_id
      FROM compras c
      JOIN produtos p ON c.produto_id = p.id
      JOIN lojas l ON p.loja_id = l.id
    `;

    const params = [];
    
    // Filtros específicos por tipo de usuário
    if (usuarioTipo === "cliente" || usuarioAlvo.tipo === "cliente") {
      query += ` WHERE c.cliente_id = $${params.length + 1}`;
      params.push(id);
    } 
    else if (usuarioTipo === "vendedor") {
      query += ` WHERE l.vendedor_id = $${params.length + 1}`;
      params.push(usuarioRequisitanteId);
      
      if (usuarioRequisitanteId !== parseInt(id)) {
        query += ` AND c.cliente_id = $${params.length + 1}`;
        params.push(id);
      }
    }
    // Gerente não precisa de filtro adicional

    query += ` ORDER BY c.data DESC`;

    // Executa a query
    const compras = await pool.query(query, params);

    // Formata os dados de resposta
    const resposta = {
      sucesso: true,
      usuario_id: parseInt(id),
      usuario_tipo: usuarioAlvo.tipo,
      total_compras: compras.rows.length,
      valor_total: compras.rows.reduce(
        (sum, compra) => sum + parseFloat(compra.valor),
        0
      ).toFixed(2),
      compras: compras.rows.map(compra => ({
        id: compra.id,
        codigo: compra.codigo_compra,
        data: compra.data,
        produto: {
          nome: compra.produto_nome,
          imagem: compra.produto_imagem,
          preco_unitario: parseFloat(compra.preco_unitario).toFixed(2)
        },
        loja: {
          nome: compra.loja_nome,
          vendedor_id: compra.vendedor_id
        },
        quantidade: compra.quantidade,
        valor_total: parseFloat(compra.valor).toFixed(2),
        status: compra.status
      }))
    };

    res.json(resposta);
  } catch (err) {
    console.error("Erro ao buscar histórico:", err);
    res.status(500).json({
      erro: "Erro ao buscar histórico.",
      detalhes: process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  }
};

module.exports = {
  criarCompra,
  listarCompras,
  buscarCompraPorId,
  atualizarStatusCompra,
  historicoComprasUsuario,
};

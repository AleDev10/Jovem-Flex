require('dotenv').config();
const pool = require('../db/conn');

// GET /dashboard - Dados consolidados
const getDashboardData = async (req, res) => {
  const usuarioTipo = req.usuarioTipo;

  try {
    // Verifica se é gerente
    if (usuarioTipo !== 'gerente') {
      return res.status(403).json({
        erro: "Acesso negado",
        detalhes: "Apenas gerentes podem acessar o dashboard"
      });
    }

    // Busca todos os dados em paralelo
    const [
      metricasVendas,
      usuariosAtivos,
      metasStatus,
      topProdutos
    ] = await Promise.all([
      getMetricasVendas(),
      getUsuariosAtivos(),
      getMetasStatus(),
      getTopProdutos()
    ]);

    res.json({
      sucesso: true,
      data: {
        periodo: new Date().toISOString().split('T')[0],
        ...metricasVendas,
        ...usuariosAtivos,
        ...metasStatus,
        topProdutos
      }
    });

  } catch (err) {
    console.error("Erro no dashboard:", err);
    res.status(500).json({
      erro: "Erro ao carregar dados",
      detalhes: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};

// GET /search - Busca unificada
const unifiedSearch = async (req, res) => {
  const { q } = req.query;
  const usuarioId = req.usuarioId;
  const usuarioTipo = req.usuarioTipo;

  if (!q || q.length < 3) {
    return res.status(400).json({
      erro: "Termo de busca inválido",
      detalhes: "Forneça pelo menos 3 caracteres"
    });
  }

  try {
    const termo = `%${q}%`;
    
    // Busca em múltiplas tabelas
    const [produtos, lojas] = await Promise.all([
      buscarProdutos(termo, usuarioTipo),
      buscarLojas(termo)
    ]);

    res.json({
      sucesso: true,
      resultados: {
        produtos,
        lojas,
        total: produtos.length + lojas.length
      }
    });

  } catch (err) {
    console.error("Erro na busca:", err);
    res.status(500).json({
      erro: "Erro na busca",
      detalhes: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};

// Funções auxiliares para dashboard
async function getMetricasVendas() {
  const result = await pool.query(`
    SELECT 
      COUNT(*) as total_vendas,
      SUM(valor) as faturamento,
      COUNT(DISTINCT vendedor_id) as vendedores_ativos,
      (SELECT SUM(valor) FROM vendas WHERE data_venda >= CURRENT_DATE - INTERVAL '30 days') as faturamento_30d
    FROM vendas
    WHERE data_venda >= CURRENT_DATE - INTERVAL '7 days'
  `);
  return result.rows[0];
}

async function getUsuariosAtivos() {
  const result = await pool.query(`
    SELECT 
      COUNT(*) FILTER (WHERE tipo = 'gerente') as total_gerentes,
      COUNT(*) FILTER (WHERE tipo = 'vendedor') as total_vendedores,
      COUNT(*) FILTER (WHERE ultimo_login >= CURRENT_DATE - INTERVAL '7 days') as usuarios_ativos
    FROM usuarios
  `);
  return result.rows[0];
}

async function getMetasStatus() {
  const result = await pool.query(`
    SELECT 
      COUNT(*) as total_metas,
      COUNT(*) FILTER (WHERE status = 'atingida') as metas_atingidas,
      COUNT(*) FILTER (WHERE prazo < CURRENT_DATE AND status = 'em_andamento') as metas_atrasadas
    FROM metas
  `);
  return result.rows[0];
}

async function getTopProdutos() {
  const result = await pool.query(`
    SELECT p.nome, COUNT(v.id) as vendas
    FROM produtos p
    LEFT JOIN vendas v ON v.produto_id = p.id
    GROUP BY p.id
    ORDER BY vendas DESC
    LIMIT 5
  `);
  return result.rows;
}

// Funções auxiliares para busca
async function buscarProdutos(termo, usuarioTipo) {
  let query = `
    SELECT p.id, p.nome, p.preco, p.estoque
    FROM produtos p
    WHERE p.nome ILIKE $1 OR p.descricao ILIKE $1
  `;

  // Vendedores só veem produtos com estoque
  if (usuarioTipo === 'vendedor') {
    query += ' AND p.estoque > 0';
  }

  query += ' LIMIT 10';
  
  const result = await pool.query(query, [termo]);
  return result.rows;
}

async function buscarLojas(termo) {
  const result = await pool.query(`
    SELECT id, nome, endereco, telefone
    FROM lojas
    WHERE nome ILIKE $1 OR endereco ILIKE $1
    LIMIT 5
  `, [termo]);
  return result.rows;
}

module.exports = {
  getDashboardData,
  unifiedSearch
};
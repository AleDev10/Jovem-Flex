const pool = require('../db/conn');
const cron = require('node-cron');
const { enviarViaWhatsApp } = require('../controllers/relatorioController');
const { format } = require('date-fns');

const gerarRelatoriosAutomaticos = async () => {
  try {
    // Relatório para vendedores (toda segunda-feira às 9h)
    if (new Date().getDay() === 1) { // Segunda-feira
      await gerarRelatoriosVendedores();
    }

    // Relatório para gerentes (toda sexta-feira às 18h)
    if (new Date().getDay() === 5) { // Sexta-feira
      await gerarRelatorioGerentes();
    }
  } catch (err) {
    console.error('Erro no job de relatórios:', err);
  }
};

async function gerarRelatoriosVendedores() {
  // Obter todos os vendedores ativos
  const vendedores = await pool.query(
    "SELECT id, nome, telefone FROM usuarios WHERE tipo = 'vendedor'"
  );

  for (const vendedor of vendedores.rows) {
    // Obter metas do vendedor
    const metas = await pool.query(
      `SELECT * FROM metas 
       WHERE vendedor_id = $1 
       AND status = 'em_andamento'`,
      [vendedor.id]
    );

    // Obter vendas da última semana
    const vendas = await pool.query(
      `SELECT COUNT(*) as total, SUM(valor) as valor_total 
       FROM vendas 
       WHERE vendedor_id = $1 
       AND data_venda >= NOW() - INTERVAL '7 days'`,
      [vendedor.id]
    );

    const conteudo = `*Resumo Semanal*\n\n` +
                     `Metas Ativas: ${metas.rows.length}\n` +
                     `Vendas na semana: ${vendas.rows[0].total || 0}\n` +
                     `Valor total: R$ ${vendas.rows[0].valor_total?.toFixed(2) || '0,00'}\n\n` +
                     `Detalhes das metas:\n${metas.rows.map(m => `- ${m.descricao}`).join('\n')}`;

    // Salva e envia o relatório
    await pool.query(
      `INSERT INTO relatorios 
       (usuario_id, tipo, conteudo) 
       VALUES ($1, $2, $3)`,
      [vendedor.id, 'vendedor_semanal', conteudo]
    );

    if (vendedor.telefone) {
      await enviarViaWhatsApp(vendedor.id, 'Relatório Semanal', conteudo);
    }
  }
}

async function gerarRelatorioGerentes() {
  // Obter todos os gerentes
  const gerentes = await pool.query(
    "SELECT id, nome, telefone FROM usuarios WHERE tipo = 'gerente'"
  );

  for (const gerente of gerentes.rows) {
    // Dados consolidados
    const resumoVendas = await pool.query(
      `SELECT 
         COUNT(*) as total_vendas, 
         SUM(valor) as valor_total,
         COUNT(DISTINCT vendedor_id) as vendedores_ativos
       FROM vendas
       WHERE data_venda >= NOW() - INTERVAL '7 days'`
    );

    const resumoMetas = await pool.query(
      `SELECT 
         COUNT(*) as total_metas,
         SUM(CASE WHEN status = 'atingida' THEN 1 ELSE 0 END) as metas_atingidas
       FROM metas`
    );

    const conteudo = `*Relatório Gerencial Semanal*\n\n` +
                     `Vendas na semana: ${resumoVendas.rows[0].total_vendas}\n` +
                     `Faturamento: R$ ${resumoVendas.rows[0].valor_total?.toFixed(2) || '0,00'}\n` +
                     `Vendedores ativos: ${resumoVendas.rows[0].vendedores_ativos}\n` +
                     `Metas: ${resumoMetas.rows[0].total_metas} (${resumoMetas.rows[0].metas_atingidas} atingidas)`;

    // Salva e envia o relatório
    await pool.query(
      `INSERT INTO relatorios 
       (usuario_id, tipo, conteudo) 
       VALUES ($1, $2, $3)`,
      [gerente.id, 'gerencial_semanal', conteudo]
    );

    if (gerente.telefone) {
      await enviarViaWhatsApp(gerente.id, 'Relatório Gerencial', conteudo);
    }
  }
}

// Agenda para rodar diariamente e verificar se é dia de relatório
cron.schedule('0 9 * * *', gerarRelatoriosAutomaticos);

module.exports = gerarRelatoriosAutomaticos;
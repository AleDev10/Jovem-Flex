// jobs/enviarRelatoriosWhatsApp.js
const pool = require('../db/conn');
const cron = require('node-cron');
const axios = require('axios'); // Supondo uso da API do WhatsApp

const enviarRelatorios = async () => {
  try {
    // Busca todas as metas ativas (em_andamento)
    const metas = await pool.query(
      `SELECT m.*, u.nome as vendedor_nome, u.telefone 
       FROM metas m
       JOIN usuarios u ON m.vendedor_id = u.id
       WHERE m.status = 'em_andamento'`
    );

    // Para cada meta, enviar relatório
    for (const meta of metas.rows) {
      const mensagem = `*Relatório Semanal de Meta*
      
Vendedor: ${meta.vendedor_nome}
Meta: ${meta.descricao}
Progresso: 0/${meta.quantidade} (0%)
Prazo: ${new Date(meta.prazo).toLocaleDateString()}

Continue assim!`;

      await axios.post('https://api.whatsapp.com/send', {
        phone: meta.telefone,
        message: mensagem
      });
    }

    console.log(`Relatórios enviados para ${metas.rows.length} vendedores`);
  } catch (err) {
    console.error('Erro ao enviar relatórios:', err);
  }
};

// Agenda para rodar toda segunda-feira às 9h
cron.schedule('0 9 * * 1', enviarRelatorios);

module.exports = enviarRelatorios;
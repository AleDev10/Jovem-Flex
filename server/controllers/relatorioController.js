require('dotenv').config();
const pool = require('../db/conn');
const axios = require('axios');
const { format } = require('date-fns');

// POST /relatorios - Enviar relatório
const enviarRelatorio = async (req, res) => {
  const { tipo, conteudo } = req.body;
  const usuarioId = req.usuarioId;
  const usuarioTipo = req.usuarioTipo;

  // Validação básica
  if (!tipo || !conteudo) {
    return res.status(400).json({
      erro: "Dados incompletos",
      campos_obrigatorios: ["tipo", "conteudo"]
    });
  }

  try {
    // Salva no banco de dados
    const novoRelatorio = await pool.query(
      `INSERT INTO relatorios 
       (usuario_id, tipo, conteudo) 
       VALUES ($1, $2, $3) 
       RETURNING *`,
      [usuarioId, tipo, conteudo]
    );

    // Envia via WhatsApp (opcional)
    await enviarViaWhatsApp(usuarioId, tipo, conteudo);

    res.status(201).json({
      sucesso: true,
      mensagem: "Relatório enviado com sucesso",
      relatorio: novoRelatorio.rows[0]
    });

  } catch (err) {
    console.error("Erro ao enviar relatório:", err);
    res.status(500).json({
      erro: "Erro ao enviar relatório",
      detalhes: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};

// GET /relatorios - Listar relatórios
const listarRelatorios = async (req, res) => {
  const { tipo, usuario_id } = req.query;
  const usuarioId = req.usuarioId;
  const usuarioTipo = req.usuarioTipo;

  try {
    let query = 'SELECT r.*, u.nome as usuario_nome FROM relatorios r JOIN usuarios u ON r.usuario_id = u.id WHERE 1=1';
    const params = [];

    // Filtro de permissão (vendedor só vê seus relatórios)
    if (usuarioTipo === 'vendedor') {
      query += ' AND r.usuario_id = $1';
      params.push(usuarioId);
    } 
    // Gerente pode filtrar por usuário
    else if (usuario_id) {
      query += ' AND r.usuario_id = $1';
      params.push(usuario_id);
    }

    // Filtro por tipo
    if (tipo) {
      query += params.length > 0 ? ' AND r.tipo = $2' : ' AND r.tipo = $1';
      params.push(tipo);
    }

    query += ' ORDER BY r.data_envio DESC';

    const resultado = await pool.query(query, params);
    
    res.json({
      sucesso: true,
      relatorios: resultado.rows
    });

  } catch (err) {
    console.error("Erro ao listar relatórios:", err);
    res.status(500).json({
      erro: "Erro ao buscar relatórios",
      detalhes: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};

// GET /relatorios/:id - Obter relatório específico
const obterRelatorio = async (req, res) => {
  const { id } = req.params;
  const usuarioId = req.usuarioId;
  const usuarioTipo = req.usuarioTipo;

  try {
    const relatorio = await pool.query(
      `SELECT r.*, u.nome as usuario_nome 
       FROM relatorios r 
       JOIN usuarios u ON r.usuario_id = u.id
       WHERE r.id = $1`,
      [id]
    );

    if (relatorio.rows.length === 0) {
      return res.status(404).json({ erro: "Relatório não encontrado" });
    }

    // Verifica permissão (vendedor só pode ver seus relatórios)
    if (usuarioTipo === 'vendedor' && relatorio.rows[0].usuario_id !== usuarioId) {
      return res.status(403).json({
        erro: "Acesso negado",
        detalhes: "Você só pode visualizar seus próprios relatórios"
      });
    }

    res.json({
      sucesso: true,
      relatorio: relatorio.rows[0]
    });

  } catch (err) {
    console.error("Erro ao obter relatório:", err);
    res.status(500).json({
      erro: "Erro ao buscar relatório",
      detalhes: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};

// Função auxiliar para enviar via WhatsApp
async function enviarViaWhatsApp(usuarioId, tipo, conteudo) {
  try {
    // Obter telefone do usuário
    const usuario = await pool.query(
      'SELECT telefone FROM usuarios WHERE id = $1',
      [usuarioId]
    );

    if (usuario.rows.length === 0 || !usuario.rows[0].telefone) {
      console.warn('Usuário sem telefone cadastrado para envio via WhatsApp');
      return;
    }

    const telefone = '+244'+usuario.rows[0].telefone;
    const dataEnvio = format(new Date(), 'dd/MM/yyyy HH:mm');

    const mensagem = `*Relatório ${tipo.toUpperCase()}*\n\n` +
                     `Data: ${dataEnvio}\n\n` +
                     `${conteudo}\n\n` +
                     `Este é um envio automático.`;

    await axios.post(process.env.WHATSAPP_API_URL + '/send', {
      phone: telefone,
      message: mensagem
    }, {
      headers: {
        'Authorization': `Bearer ${process.env.WHATSAPP_API_KEY}`
      }
    });

    console.log(`Relatório enviado para ${telefone}`);
  } catch (err) {
    console.error('Erro ao enviar relatório via WhatsApp:', err.message);
  }
}

module.exports = {
  enviarRelatorio,
  listarRelatorios,
  obterRelatorio
};
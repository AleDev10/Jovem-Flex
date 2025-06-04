const validarMeta = (req, res, next) => {
  const { quantidade, prazo } = req.body;

  // Valida quantidade
  if (quantidade && (isNaN(quantidade) || quantidade <= 0)) {
    return res.status(400).json({
      erro: "Quantidade inválida",
      detalhes: "A quantidade deve ser um número positivo"
    });
  }

  // Valida prazo
  if (prazo && isNaN(Date.parse(prazo))) {
    return res.status(400).json({
      erro: "Data inválida",
      detalhes: "O prazo deve ser uma data válida"
    });
  }

  next();
};

module.exports = validarMeta;
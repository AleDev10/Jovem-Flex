require('dotenv').config();
const jwt = require('jsonwebtoken');

const verificarToken = (req, res, next) => {
  // 1. Extrai o token do header 'Authorization' de forma mais robusta
  const authHeader = req.headers.authorization;
  
  if (!authHeader) {
    return res.status(403).json({ erro: "Cabeçalho de autorização não fornecido." });
  }

  // 2. Verifica se o cabeçalho está no formato correto
  const parts = authHeader.split(' ');
  
  if (parts.length !== 2) {
    return res.status(403).json({ erro: "Formato de token inválido." });
  }

  const [scheme, token] = parts;

  // 3. Verifica se começa com 'Bearer'
  if (!/^Bearer$/i.test(scheme)) {
    return res.status(403).json({ erro: "Formato de autorização inválido (deve ser 'Bearer token')." });
  }

  if (!token) {
    return res.status(403).json({ erro: "Token não fornecido." });
  }

  //console.log("Token recebido:", token); // Debug

  try {
    // 4. Verifica e decodifica o token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // 5. Adiciona os dados do usuário à requisição
    req.usuarioId = decoded.id;
    req.usuarioTipo = decoded.tipo;
    
    next();
  } catch (err) {
    console.error("Erro na verificação do token:", err.message);
    return res.status(401).json({ 
      erro: "Token inválido ou expirado.",
      detalhes: err.message 
    });
  }
};

module.exports = verificarToken;
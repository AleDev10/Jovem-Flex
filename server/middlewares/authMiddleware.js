const jwt = require('jsonwebtoken');

const verificarToken = (req, res, next) => {
  const token = req.headers['authorization'];
  if (!token) return res.status(403).json({ erro: 'Token não fornecido' });

  jwt.verify(token, 'seuSegredoJWT', (err, decoded) => {
    if (err) return res.status(401).json({ erro: 'Token inválido' });
    req.usuarioId = decoded.id;
    req.usuarioTipo = decoded.tipo;
    next();
  });
};

module.exports = verificarToken;
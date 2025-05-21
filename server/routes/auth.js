const express = require("express");
const pool = require("../db/conn");
const multer = require("multer");
const router = express.Router();

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

router.post("/login", async (req, res) => {
  const { numero, senha } = req.body;

  // Verifica se os campos foram enviados
  if (!numero || !senha) {
    return res.status(400).send({ erro: "Preencha todos os campos." });
  }

  try {
    // Busca usuário pelo número e senha
    const query = "SELECT * FROM usuarios WHERE numero = $1 AND senha = $2";
    const result = await pool.query(query, [numero, senha]);

    if (result.rows.length === 0) {
      return res.status(401).send({ erro: "Usuário ou senha inválidos." });
    }

    // Usuário encontrado, retorna informações do usuário (exceto a senha)
    const usuario = result.rows[0];
    delete usuario.senha; // Remove a senha do retorno

    res.send({
      mensagem: "Login realizado com sucesso!",
      usuario,
    });
  } catch (err) {
    console.error(err);
    res.status(500).send({ erro: "Erro ao realizar login" });
  }
});

router.post("/cadastro", async (req, res) => {
  const { nome, numero, senha, tipo, nomeLoja } = req.body;

  // Validação dos campos
  if (!nome || !numero || !senha || !tipo) {
    return res.status(400).send({ erro: "Todos os campos são obrigatórios." });
  }
  if (tipo === "vendedor" && !nomeLoja) {
    return res
      .status(400)
      .send({ erro: "O nome da loja é obrigatório para vendedores." });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // 1. Cria o usuário
    const userResult = await client.query(
      "INSERT INTO usuarios (nome, numero, senha, tipo) VALUES ($1, $2, $3, $4) RETURNING id",
      [nome, numero, senha, tipo]
    );
    const usuario_id = userResult.rows[0].id;

    // 2. Se for vendedor, cria a loja padrão
    if (tipo === "vendedor") {
      await client.query(
        "INSERT INTO lojas (nome, descricao, dono_id) VALUES ($1, $2, $3)",
        [nomeLoja, "Loja criada automaticamente no cadastro.", usuario_id]
      );
    }

    await client.query("COMMIT");
    res.send({ mensagem: "Cadastro realizado com sucesso!" });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error(err);
    res.status(500).send({ erro: "Erro ao cadastrar usuário" });
  } finally {
    client.release();
  }
});

// Rota para adicionar produto com imagem (salva imagem como large object)
router.post("/adicionarPro", upload.single("foto"), async (req, res) => {
  const { descricao, valor, usuario_id } = req.body;
  const foto = req.file;

  // Validação dos campos
  if (!foto || !descricao || !valor || !usuario_id) {
    return res.status(400).send({ erro: "Todos os campos são obrigatórios." });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // 1. Salva a imagem na tabela arquivo
    const arquivoQuery =
      "INSERT INTO arquivo (imagem) VALUES ($1) RETURNING id";
    const arquivoResult = await client.query(arquivoQuery, [foto.buffer]);
    const arquivo_id = arquivoResult.rows[0].id;

    // 2. Salva o produto na tabela produtos, relacionando com usuario e arquivo
    const produtoQuery = `
      INSERT INTO produtos (descricao, preco, usuario_id, arquivo_id)
      VALUES ($1, $2, $3, $4) RETURNING id
    `;
    const produtoResult = await client.query(produtoQuery, [
      descricao,
      valor, // valor será salvo em preco
      usuario_id,
      arquivo_id,
    ]);

    await client.query("COMMIT");
    res.status(201).send({
      mensagem: "Produto adicionado com sucesso!",
      produto_id: produtoResult.rows[0].id,
      arquivo_id: arquivo_id,
    });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error(err);
    res.status(500).send({ erro: "Erro ao adicionar produto." });
  } finally {
    client.release();
  }
});

// Rota para listar produtos, pedidos e imagens do vendedor
router.get("/listarProdutosVendedor/:usuario_id", async (req, res) => {
  const { usuario_id } = req.params;

  try {
    // Busca usuário
    const userResult = await pool.query(
      "SELECT * FROM usuarios WHERE id = $1",
      [usuario_id]
    );
    if (userResult.rows.length === 0) {
      return res.status(404).send({ erro: "Usuário não encontrado." });
    }
    const usuario = userResult.rows[0];
    if (usuario.tipo !== "vendedor") {
      return res
        .status(403)
        .send({ erro: "Acesso permitido apenas para vendedores." });
    }

    // Busca produtos
    const produtosResult = await pool.query(
      `SELECT p.*, a.imagem
       FROM produtos p
       LEFT JOIN arquivo a ON p.arquivo_id = a.id
       WHERE p.usuario_id = $1`,
      [usuario_id]
    );
    const produtos = produtosResult.rows || [];

    // Busca pedidos
    const pedidosResult = await pool.query(
      `SELECT ped.*, prod.descricao, prod.preco
       FROM pedidos ped
       INNER JOIN produtos prod ON ped.produto_id = prod.id
       WHERE prod.usuario_id = $1`,
      [usuario_id]
    );
    const pedidos = pedidosResult.rows || [];

    // Busca o nome da loja do vendedor
    const lojaResult = await pool.query(
      "SELECT nome FROM lojas WHERE dono_id = $1 LIMIT 1",
      [usuario_id]
    );
    const loja_nome = lojaResult.rows.length > 0 ? lojaResult.rows[0].nome : "";

    // Sempre retorna arrays e strings, nunca undefined
    res.send({
      usuario: {
        nome: usuario.nome || "",
        numero: usuario.numero || "",
        id: usuario.id,
      },
      produtos,
      pedidos,
      loja_nome: loja_nome || "",
    });
  } catch (err) {
    console.error(err);
    res.status(500).send({ erro: "Erro ao buscar produtos e pedidos." });
  }
});

// Rota para listar todas as lojas (com nome, descricao, imagem e id do dono)
router.get("/lojas", async (req, res) => {
  try {
    // Busca todas as lojas e o nome do dono (vendedor)
    const lojasResult = await pool.query(
      `SELECT 
         l.id, 
         l.nome, 
         l.descricao, 
         l.dono_id, 
         u.nome AS nome_dono
       FROM lojas l
       INNER JOIN usuarios u ON l.dono_id = u.id`
    );
    res.send(lojasResult.rows);
  } catch (err) {
    console.error(err);
    res.status(500).send({ erro: "Erro ao buscar lojas." });
  }
});

router.put("/marcarVendido/:produto_id", async (req, res) => {
  const { produto_id } = req.params;
  const { vendido } = req.body;

  try {
    await pool.query("UPDATE produtos SET vendido = $1 WHERE id = $2", [
      vendido,
      produto_id,
    ]);
    res.send({ mensagem: "Status do produto atualizado com sucesso!" });
  } catch (err) {
    console.error(err);
    res.status(500).send({ erro: "Erro ao atualizar status do produto." });
  }
});

module.exports = router;

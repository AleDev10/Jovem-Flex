-- Script para criação e simulação do funcionamento do banco de dados da plataforma Jovem Flex com melhorias

-- Drop tables if exist to recreate clean schema
DROP TABLE IF EXISTS assinaturas CASCADE;
DROP TABLE IF EXISTS planos CASCADE;
DROP TABLE IF EXISTS ideias_negocio CASCADE;
DROP TABLE IF EXISTS guias CASCADE;
DROP TABLE IF EXISTS eventos CASCADE;
DROP TABLE IF EXISTS relatorios CASCADE;
DROP TABLE IF EXISTS metas CASCADE;
DROP TABLE IF EXISTS aprovacoes CASCADE;
DROP TABLE IF EXISTS compras CASCADE;
DROP TABLE IF EXISTS produtos CASCADE;
DROP TABLE IF EXISTS lojas CASCADE;
DROP TABLE IF EXISTS enderecos CASCADE;
DROP TABLE IF EXISTS usuarios CASCADE;

-- Criar tabelas com melhorias

CREATE TABLE IF NOT EXISTS usuarios (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    senha TEXT NOT NULL,
    tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('cliente', 'vendedor', 'gerente')),
    telefone VARCHAR(20),
    data_cadastro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(20) DEFAULT 'ativo',
    nivel_acesso VARCHAR(20) DEFAULT 'usuario' -- ex: admin, usuario
);

CREATE TABLE IF NOT EXISTS enderecos (
    id SERIAL PRIMARY KEY,
    usuario_id INTEGER REFERENCES usuarios(id) ON DELETE CASCADE,
    pais VARCHAR(100) DEFAULT 'Angola',
    provincia VARCHAR(100),
    municipio VARCHAR(100),
    bairro VARCHAR(100),
    coordenadas VARCHAR(100)
);

CREATE TABLE IF NOT EXISTS lojas (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    descricao TEXT,
    vendedor_id INTEGER REFERENCES usuarios(id) ON DELETE CASCADE,
    imagem TEXT,
    data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    latitude NUMERIC(10,8),
    longitude NUMERIC(11,8)
);

CREATE TABLE IF NOT EXISTS produtos (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    preco NUMERIC(10,2) NOT NULL,
    descricao TEXT,
    categoria VARCHAR(50),
    loja_id INTEGER REFERENCES lojas(id) ON DELETE CASCADE,
    imagem TEXT,
    stock INTEGER,
	codigo INTEGER
);

CREATE TABLE IF NOT EXISTS compras (
    id SERIAL PRIMARY KEY,
    cliente_id INTEGER REFERENCES usuarios(id) ON DELETE CASCADE,
    produto_id INTEGER REFERENCES produtos(id) ON DELETE CASCADE,
    data TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(20) DEFAULT 'pendente',
    status_pagamento VARCHAR(20) DEFAULT 'pendente',
    valor NUMERIC(10,2),
    quantidade INTEGER
);

CREATE TABLE IF NOT EXISTS aprovacoes (
    id SERIAL PRIMARY KEY,
    compra_id INTEGER REFERENCES compras(id) ON DELETE CASCADE,
    gerente_id INTEGER REFERENCES usuarios(id) NOT NULL,
    data_aprovacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    observacoes TEXT
);

CREATE TABLE IF NOT EXISTS metas (
    id SERIAL PRIMARY KEY,
    vendedor_id INTEGER REFERENCES usuarios(id) ON DELETE CASCADE,
    descricao TEXT,
    quantidade INTEGER,
    prazo DATE,
    status VARCHAR(20) DEFAULT 'pendente'
);

CREATE TABLE IF NOT EXISTS relatorios (
    id SERIAL PRIMARY KEY,
    usuario_id INTEGER REFERENCES usuarios(id) ON DELETE CASCADE,
    tipo VARCHAR(20),
    conteudo TEXT,
    data_envio TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS eventos (
    id SERIAL PRIMARY KEY,
    titulo VARCHAR(100),
    descricao TEXT,
    data TIMESTAMPTZ,
    local VARCHAR(100)
);

CREATE TABLE IF NOT EXISTS guias (
    id SERIAL PRIMARY KEY,
    titulo VARCHAR(100),
    descricao TEXT,
    arquivo_url TEXT
);

CREATE TABLE IF NOT EXISTS ideias_negocio (
    id SERIAL PRIMARY KEY,
    vendedor_id INTEGER REFERENCES usuarios(id) ON DELETE CASCADE,
    titulo VARCHAR(100),
    descricao TEXT,
    status VARCHAR(20) DEFAULT 'rascunho'
);

CREATE TABLE IF NOT EXISTS planos (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(100),
    descricao TEXT,
    preco NUMERIC(10,2),
    recursos TEXT
);

CREATE TABLE IF NOT EXISTS assinaturas (
    id SERIAL PRIMARY KEY,
    usuario_id INTEGER REFERENCES usuarios(id) ON DELETE CASCADE,
    plano_id INTEGER REFERENCES planos(id),
    data_inicio DATE,
    data_fim DATE,
    status VARCHAR(20) DEFAULT 'ativo'
);

-- Criar índices para melhorar performance
CREATE INDEX idx_usuarios_email ON usuarios(email);
CREATE INDEX idx_produtos_nome ON produtos(nome);
CREATE INDEX idx_compras_data ON compras(data);

-- Inserção de dados para simulação do funcionamento

-- Usuários
INSERT INTO usuarios (nome, email, senha, tipo, telefone, nivel_acesso) VALUES
('Mendis Cliente', 'mendis@cliente.com', 'senha123', 'cliente', '939401284', 'usuario'),
('Paula Cliente', 'paula@cliente.com', 'senha123', 'cliente', '901837204', 'usuario'),
('Carlos Vendedor', 'carlos@vendedor.com', 'senha123', 'vendedor', '940193876', 'usuario'),
('Nelasta Cliente', 'nelasta@cliente.com', 'senha123', 'cliente', '929103381', 'usuario'),
('Suely Cliente', 'suely@cliente.com', 'senha123', 'cliente', '955102886', 'usuario'),
('Kerem Cliente', 'kerem@cliente.com', 'senha123', 'cliente', '991922837', 'usuario'),
('João Gerente', 'joao@gerente.com', 'senha123', 'gerente', '912345678', 'admin');

-- Endereços
INSERT INTO enderecos (usuario_id, pais, provincia, municipio, bairro, coordenadas) VALUES
(1, 'Angola', 'Cuanza-Sul', 'Sumbe', 'Bairro popular', NULL),
(2, 'Angola', 'Luanda', 'Talatona', 'Zona H', NULL),
(3, 'Angola', 'Cuanza-Sul', 'Sumbe', 'É-15', NULL),
(4, 'Angola', 'Cuanza-Sul', 'Sumbe', 'Cacute', NULL),
(5, 'Angola', 'Luanda', 'Cazenga', 'Rua 1', NULL),
(6, 'Angola', 'Cuanza-Sul', 'Sumbe', 'Bairro novo', NULL);

-- Planos
INSERT INTO planos (nome, descricao, preco, recursos) VALUES
('Estudante', 'Plano com recursos limitados', 0.00, 'Loja básica, produtos limitados'),
('Profissional', 'Plano completo com todos os recursos', 2000.00, 'Loja premium, relatórios, metas, eventos, guias');

-- Assinaturas
INSERT INTO assinaturas (usuario_id, plano_id, data_inicio, data_fim, status) VALUES
(3, 2, '2025-05-01', '2025-08-10', 'ativo');

-- Lojas
INSERT INTO lojas (nome, descricao, vendedor_id, imagem, latitude, longitude) VALUES
('Artes Lintas da Ana', 'Loja de artes digitais', 3, 'moda_ana.png', -9.172503, 13.837559),
('Perfumes do Carlos', 'Loja de perfumes', 3, 'perfumes_carlos.png', -9.172600, 13.837600);

-- Ideias de negócio
INSERT INTO ideias_negocio (vendedor_id, titulo, descricao) VALUES
(3, 'Venda de T-shirts Personalizadas', 'Criar T-shirts com frases motivacionais para jovens empreendedores');

-- Metas
INSERT INTO metas (vendedor_id, descricao, quantidade, prazo) VALUES
(3, 'Vender 5 perfumes na semana', 5, '2025-06-10');

-- Produtos
INSERT INTO produtos (nome, preco, descricao, categoria, loja_id, imagem, stock) VALUES
('Pacorrabano', 10500.00, 'Perfume francês Pacorrabano', 'Perfumes', 2, 'pacorrabano.png', 10),
('Quadros digitais', 5000.00, 'Quadros digitais personalizados', 'Artes', 1, 'quadrodigital.png', 5),
('Blusa Soft', 1000.00, 'Blusas softs femininas', 'Roupas', 1, 'blusasoft.png', 20),
('Blue Art', 8000.00, 'Perfume Angola masculino', 'Perfumes', 2, 'blueart.png', 15),
('Memorial da Amizade', 5000.00, 'Quadros com foto de momentos com amigos', 'Artes', 1, 'memorialamizade.png', 7),
('Pulseiras 1 and 1', 500.00, 'Pulseiras personalizadas para homens e mulheres', 'Acessórios', 1, 'pulseiras1and1.png', 30);

-- Compras
INSERT INTO compras (cliente_id, produto_id, valor, quantidade, status, status_pagamento) VALUES
(1, 1, 10500.00, 1, 'pendente', 'pendente'),
(1, 6, 8000.00, 2, 'pendente', 'pago'),
(5, 2, 2000.00, 5, 'pendente', 'pendente'),
(4, 3, 5000.00, 1, 'pendente', 'pago'),
(6, 6, 8000.00, 1, 'pendente', 'pendente'),
(2, 4, 5000.00, 1, 'pendente', 'pago');

-- Aprovações
INSERT INTO aprovacoes (compra_id, gerente_id, observacoes) VALUES
(1, 7, 'Compra aprovada e encaminhada para entrega'),
(2, 7, 'Compra verificada com sucesso');

-- Eventos
INSERT INTO eventos (titulo, descricao, data, local) VALUES
('Workshop de Marketing', 'Evento sobre estratégias de marketing para lojas online', '2025-06-15 15:00:00+00', 'Centro Politécnico Quibala');

-- Guias
INSERT INTO guias (titulo, descricao, arquivo_url) VALUES
('Como montar sua primeira loja', 'Passo a passo para novos empreendedores', 'guia_loja.pdf');

-- Relatórios
INSERT INTO relatorios (usuario_id, tipo, conteudo) VALUES
(3, 'vendas', 'Relatório semanal: 2 vendas realizadas, meta não cumprida.'),
(7, 'geral', 'Relatório geral da semana com 2 compras aprovadas.');

-- Selecionar dados para testar inserções
SELECT * FROM usuarios;
SELECT * FROM enderecos;
SELECT * FROM planos;
SELECT * FROM assinaturas;
SELECT * FROM lojas;
SELECT * FROM ideias_negocio;
SELECT * FROM metas;
SELECT * FROM produtos;
SELECT * FROM compras;
SELECT * FROM aprovacoes;
SELECT * FROM eventos;
SELECT * FROM guias;
SELECT * FROM relatorios;


document.addEventListener('DOMContentLoaded', function() {
    // Elementos da DOM
    const lojasContainer = document.getElementById('lojasContainer');
    const produtosContainer = document.getElementById('produtosContainer');
    const detalhesContainer = document.getElementById('detalhesContainer');
    const searchInput = document.getElementById('searchInput');
    const searchButton = document.getElementById('searchButton');
    
    // Templates
    const lojaTemplate = document.getElementById('lojaTemplate');
    const produtoTemplate = document.getElementById('produtoTemplate');
    const detalhesLojaTemplate = document.getElementById('detalhesLojaTemplate');
    
    // Estado da aplicação
    let currentView = 'lojas'; // 'lojas', 'produtos' ou 'detalhes'
    let currentLojaId = null;
    
    // Inicialização
    carregarLojas();
    
    // Event Listeners
    searchButton.addEventListener('click', pesquisar);
    searchInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') pesquisar();
    });
    
    // Função para carregar lojas
    async function carregarLojas() {
        mostrarCarregamento(lojasContainer);
        
        try {
            const response = await fetch('http://localhost:3000/lojas');
            const lojas = await response.json();
            
            lojasContainer.innerHTML = '';
            
            if (lojas.length === 0) {
                lojasContainer.innerHTML = '<p class="mensagem-carregamento">Nenhuma loja encontrada</p>';
                return;
            }
            
            lojas.forEach(loja => {
                const lojaCard = lojaTemplate.content.cloneNode(true);
                
                lojaCard.querySelector('.loja-imagem').src = loja.imagem || 'https://via.placeholder.com/300x200';
                lojaCard.querySelector('.loja-nome').textContent = loja.nome;
                lojaCard.querySelector('.loja-localizacao span').textContent = loja.localizacao;
                lojaCard.querySelector('.loja-descricao').textContent = loja.descricao || 'Sem descrição';
                
                const btnVisualizar = lojaCard.querySelector('.btn-visualizar');
                btnVisualizar.addEventListener('click', () => mostrarDetalhesLoja(loja.id));
                
                const btnFavoritar = lojaCard.querySelector('.btn-favoritar');
                btnFavoritar.addEventListener('click', function() {
                    this.classList.toggle('far');
                    this.classList.toggle('fas');
                    // Lógica para favoritar loja
                });
                
                lojasContainer.appendChild(lojaCard);
            });
            
        } catch (error) {
            console.error('Erro ao carregar lojas:', error);
            lojasContainer.innerHTML = '<p class="mensagem-carregamento">Erro ao carregar lojas</p>';
        }
    }
    
    // Função para mostrar detalhes da loja
    async function mostrarDetalhesLoja(lojaId) {
        mostrarCarregamento(detalhesContainer);
        currentLojaId = lojaId;
        
        try {
            // Carrega detalhes da loja
            const responseLoja = await fetch(`http://localhost:3000/lojas/${lojaId}`);
            const loja = await responseLoja.json();
            
            // Carrega produtos da loja
            const responseProdutos = await fetch(`http://localhost:3000/produtos?lojaId=${lojaId}`);
            const produtos = await responseProdutos.json();
            
            // Preenche o template de detalhes
            detalhesContainer.innerHTML = '';
            const detalhesLoja = detalhesLojaTemplate.content.cloneNode(true);
            
            detalhesLoja.querySelector('.loja-imagem-detalhes').src = loja.imagem || 'https://via.placeholder.com/300x200';
            detalhesLoja.querySelector('.loja-nome-detalhes').textContent = loja.nome;
            detalhesLoja.querySelector('.loja-localizacao-detalhes span').textContent = loja.localizacao;
            detalhesLoja.querySelector('.loja-contato span').textContent = loja.telefone || 'N/A';
            detalhesLoja.querySelector('.loja-avaliacao span').textContent = loja.avaliacao || 'Sem avaliações';
            detalhesLoja.querySelector('.loja-descricao-detalhes').textContent = loja.descricao || 'Sem descrição';
            
            const produtosLojaGrid = detalhesLoja.querySelector('.produtos-loja-grid');
            
            if (produtos.length === 0) {
                produtosLojaGrid.innerHTML = '<p>Nenhum produto disponível nesta loja</p>';
            } else {
                produtos.forEach(produto => {
                    const produtoCard = produtoTemplate.content.cloneNode(true);
                    
                    produtoCard.querySelector('.produto-imagem').src = produto.imagem || 'https://via.placeholder.com/150';
                    produtoCard.querySelector('.produto-nome').textContent = produto.nome;
                    produtoCard.querySelector('.produto-preco').textContent = formatarPreco(produto.preco);
                    produtoCard.querySelector('.produto-descricao').textContent = produto.descricao || 'Sem descrição';
                    
                    const btnComprar = produtoCard.querySelector('.btn-comprar');
                    btnComprar.addEventListener('click', () => efetuarCompra(produto.id));
                    
                    produtosLojaGrid.appendChild(produtoCard);
                });
            }
            
            // Configura botão de voltar
            detalhesLoja.querySelector('#voltarListaLojas').addEventListener('click', voltarParaLojas);
            
            detalhesContainer.appendChild(detalhesLoja);
            alternarVisualizacao('detalhes');
            
        } catch (error) {
            console.error('Erro ao carregar detalhes da loja:', error);
            detalhesContainer.innerHTML = '<p class="mensagem-carregamento">Erro ao carregar detalhes da loja</p>';
            alternarVisualizacao('detalhes');
        }
    }
    
    // Função para pesquisar lojas/produtos
    async function pesquisar() {
        const termo = searchInput.value.trim();
        if (!termo) return;
        
        mostrarCarregamento(lojasContainer);
        
        try {
            // Pesquisa tanto em lojas quanto em produtos
            const [responseLojas, responseProdutos] = await Promise.all([
                fetch(`http://localhost:3000/lojas?q=${termo}`),
                fetch(`http://localhost:3000/produtos?q=${termo}`)
            ]);
            
            const lojas = await responseLojas.json();
            const produtos = await responseProdutos.json();
            
            // Mostra resultados
            if (produtos.length > 0) {
                mostrarResultadosProdutos(produtos);
            } else if (lojas.length > 0) {
                mostrarResultadosLojas(lojas);
            } else {
                lojasContainer.innerHTML = '<p class="mensagem-carregamento">Nenhum resultado encontrado</p>';
                alternarVisualizacao('lojas');
            }
            
        } catch (error) {
            console.error('Erro na pesquisa:', error);
            lojasContainer.innerHTML = '<p class="mensagem-carregamento">Erro na pesquisa</p>';
            alternarVisualizacao('lojas');
        }
    }
    
    // Função auxiliar para mostrar resultados de lojas
    function mostrarResultadosLojas(lojas) {
        lojasContainer.innerHTML = '';
        
        if (lojas.length === 0) {
            lojasContainer.innerHTML = '<p class="mensagem-carregamento">Nenhuma loja encontrada</p>';
            return;
        }
        
        lojas.forEach(loja => {
            const lojaCard = lojaTemplate.content.cloneNode(true);
            
            lojaCard.querySelector('.loja-imagem').src = loja.imagem || 'https://via.placeholder.com/300x200';
            lojaCard.querySelector('.loja-nome').textContent = loja.nome;
            lojaCard.querySelector('.loja-localizacao span').textContent = loja.localizacao;
            lojaCard.querySelector('.loja-descricao').textContent = loja.descricao || 'Sem descrição';
            
            const btnVisualizar = lojaCard.querySelector('.btn-visualizar');
            btnVisualizar.addEventListener('click', () => mostrarDetalhesLoja(loja.id));
            
            lojasContainer.appendChild(lojaCard);
        });
        
        alternarVisualizacao('lojas');
    }
    
    // Função auxiliar para mostrar resultados de produtos
    function mostrarResultadosProdutos(produtos) {
        produtosContainer.innerHTML = '';
        
        produtos.forEach(produto => {
            const produtoCard = produtoTemplate.content.cloneNode(true);
            
            produtoCard.querySelector('.produto-imagem').src = produto.imagem || 'https://via.placeholder.com/150';
            produtoCard.querySelector('.produto-nome').textContent = produto.nome;
            produtoCard.querySelector('.produto-preco').textContent = formatarPreco(produto.preco);
            produtoCard.querySelector('.produto-descricao').textContent = produto.descricao || 'Sem descrição';
            
            const btnComprar = produtoCard.querySelector('.btn-comprar');
            btnComprar.addEventListener('click', () => efetuarCompra(produto.id));
            
            produtosContainer.appendChild(produtoCard);
        });
        
        alternarVisualizacao('produtos');
    }
    
    // Função para efetuar compra
    async function efetuarCompra(produtoId) {
        try {
            const response = await fetch('http://localhost:3000/compras', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    produtoId,
                    quantidade: 1
                })
            });
            
            const resultado = await response.json();
            
            if (response.ok) {
                alert('Compra realizada com sucesso!');
            } else {
                alert(`Erro: ${resultado.mensagem || 'Erro ao processar compra'}`);
            }
        } catch (error) {
            console.error('Erro ao efetuar compra:', error);
            alert('Erro ao conectar com o servidor');
        }
    }
    
    // Função para voltar para a lista de lojas
    function voltarParaLojas() {
        alternarVisualizacao('lojas');
    }
    
    // Função para alternar entre as visualizações
    function alternarVisualizacao(view) {
        currentView = view;
        
        lojasContainer.style.display = 'none';
        produtosContainer.style.display = 'none';
        detalhesContainer.style.display = 'none';
        
        if (view === 'lojas') {
            lojasContainer.style.display = 'grid';
        } else if (view === 'produtos') {
            produtosContainer.style.display = 'grid';
        } else if (view === 'detalhes') {
            detalhesContainer.style.display = 'block';
        }
    }
    
    // Função auxiliar para mostrar estado de carregamento
    function mostrarCarregamento(container) {
        container.innerHTML = '<p class="mensagem-carregamento"><i class="fas fa-spinner fa-spin"></i> Carregando...</p>';
    }
    
    // Função auxiliar para formatar preço
    function formatarPreco(valor) {
        return new Intl.NumberFormat('pt-AO', {
            style: 'currency',
            currency: 'AOA'
        }).format(valor);
    }
});

// Adicionar ao final do arquivo lojas.js

// Modal de compra
const modalCompra = document.createElement('div');
modalCompra.className = 'modal-compra';
modalCompra.innerHTML = `
    <div class="modal-conteudo">
        <button class="fechar-modal">&times;</button>
        <h3>Finalizar Compra</h3>
        <form class="form-compra" id="formCompra">
            <div class="grupo-formulario">
                <label for="quantidade">Quantidade:</label>
                <input type="number" id="quantidade" min="1" value="1" required>
            </div>
            <div class="grupo-formulario">
                <label for="observacoes">Observações:</label>
                <input type="text" id="observacoes" placeholder="Opcional">
            </div>
            <button type="submit" class="btn-confirmar-compra">
                <span id="textoConfirmar">Confirmar Compra</span>
                <div id="loaderCompra" class="loader-spinner" style="display:none;"></div>
            </button>
        </form>
    </div>
`;
document.body.appendChild(modalCompra);

// Notificação
const notificacao = document.createElement('div');
notificacao.className = 'notificacao';
document.body.appendChild(notificacao);

// Variáveis de estado
let produtoSelecionado = null;

// Event Listeners adicionais
modalCompra.querySelector('.fechar-modal').addEventListener('click', fecharModal);
document.getElementById('formCompra').addEventListener('submit', confirmarCompra);

// Funções adicionais
function abrirModalCompra(produtoId) {
    produtoSelecionado = produtoId;
    modalCompra.classList.add('aberto');
}

function fecharModal() {
    modalCompra.classList.remove('aberto');
}

async function confirmarCompra(e) {
    e.preventDefault();
    
    const quantidade = document.getElementById('quantidade').value;
    const observacoes = document.getElementById('observacoes').value;
    const textoConfirmar = document.getElementById('textoConfirmar');
    const loaderCompra = document.getElementById('loaderCompra');
    
    textoConfirmar.style.display = 'none';
    loaderCompra.style.display = 'block';
    
    try {
        const response = await fetch('http://localhost:3000/compras', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                produtoId: produtoSelecionado,
                quantidade,
                observacoes
            })
        });
        
        const resultado = await response.json();
        
        if (response.ok) {
            mostrarNotificacao('Compra realizada com sucesso!', 'sucesso');
            fecharModal();
        } else {
            mostrarNotificacao(resultado.mensagem || 'Erro ao processar compra', 'erro');
        }
    } catch (error) {
        console.error('Erro ao efetuar compra:', error);
        mostrarNotificacao('Erro ao conectar com o servidor', 'erro');
    } finally {
        textoConfirmar.style.display = 'inline';
        loaderCompra.style.display = 'none';
    }
}

function mostrarNotificacao(mensagem, tipo) {
    notificacao.textContent = mensagem;
    notificacao.className = `notificacao ${tipo}`;
    notificacao.classList.add('mostrar');
    
    setTimeout(() => {
        notificacao.classList.remove('mostrar');
    }, 3000);
}

// Modificar a função efetuarCompra para usar o modal
function efetuarCompra(produtoId) {
    abrirModalCompra(produtoId);
}

// Adicionar paginação
function criarPaginacao(totalPaginas, paginaAtual) {
    const paginacao = document.createElement('div');
    paginacao.className = 'paginacao';
    
    for (let i = 1; i <= totalPaginas; i++) {
        const btn = document.createElement('button');
        btn.className = `btn-paginacao ${i === paginaAtual ? 'ativo' : ''}`;
        btn.textContent = i;
        btn.addEventListener('click', () => carregarPaginaLojas(i));
        paginacao.appendChild(btn);
    }
    
    return paginacao;
}

async function carregarPaginaLojas(pagina) {
    mostrarCarregamento(lojasContainer);
    
    try {
        const response = await fetch(`http://localhost:3000/lojas?pagina=${pagina}`);
        const { lojas, totalPaginas } = await response.json();
        
        lojasContainer.innerHTML = '';
        
        lojas.forEach(loja => {
            const lojaCard = lojaTemplate.content.cloneNode(true);
            // ... (código existente para criar cards de loja)
            lojasContainer.appendChild(lojaCard);
        });
        
        if (totalPaginas > 1) {
            lojasContainer.appendChild(criarPaginacao(totalPaginas, pagina));
        }
        
    } catch (error) {
        console.error('Erro ao carregar página:', error);
        mostrarErro(lojasContainer, 'Erro ao carregar lojas');
    }
}

// Modificar a função carregarLojas para usar paginação
async function carregarLojas() {
    await carregarPaginaLojas(1);
}
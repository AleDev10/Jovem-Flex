document.addEventListener('DOMContentLoaded', function() {
    // Lógica para favoritar lojas
    document.querySelectorAll('.btn-favoritar').forEach(btn => {
        btn.addEventListener('click', function() {
            this.classList.toggle('far');
            this.classList.toggle('fas');
            if (this.classList.contains('fas')) {
                mostrarAlerta('Loja adicionada aos favoritos', 'sucesso');
            }
        });
    });

    // Lógica para visualizar loja
    document.querySelectorAll('.btn-visualizar').forEach(btn => {
        btn.addEventListener('click', function() {
            // Simulação de redirecionamento para página da loja
            console.log('Visualizar loja');
        });
    });

    // Lógica para comprar produto
    document.querySelectorAll('.btn-comprar').forEach(btn => {
        btn.addEventListener('click', function() {
            // Simulação de compra
            mostrarAlerta('Produto adicionado ao carrinho', 'sucesso');
        });
    });

    function mostrarAlerta(mensagem, tipo) {
        const alerta = document.createElement('div');
        alerta.className = `alerta ${tipo}`;
        alerta.textContent = mensagem;
        document.body.appendChild(alerta);
        
        setTimeout(() => {
            alerta.remove();
        }, 3000);
    }
});
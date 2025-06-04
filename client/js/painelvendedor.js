document.addEventListener('DOMContentLoaded', function() {
    // Lógica para criar nova loja
    document.querySelector('.btn-criar-loja').addEventListener('click', function() {
        // Simulação de modal para criar loja
        console.log('Abrir modal de criação de loja');
        mostrarAlerta('Funcionalidade de criar loja será implementada', 'info');
    });

    // Lógica para adicionar produto
    document.querySelector('.btn-adicionar-produto').addEventListener('click', function() {
        // Simulação de modal para adicionar produto
        console.log('Abrir modal de adicionar produto');
        mostrarAlerta('Funcionalidade de adicionar produto será implementada', 'info');
    });

    // Lógica para processar pedidos
    document.querySelectorAll('.btn-processar').forEach(btn => {
        btn.addEventListener('click', function() {
            // Simulação de processamento de pedido
            const row = this.closest('tr');
            row.querySelector('.status').textContent = 'Processado';
            row.querySelector('.status').className = 'status concluido';
            mostrarAlerta('Pedido processado com sucesso', 'sucesso');
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
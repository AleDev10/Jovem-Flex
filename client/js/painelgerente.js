document.addEventListener('DOMContentLoaded', function() {
    // Lógica para carregar dados do dashboard
    function carregarDadosDashboard() {
        // Simulação de requisição AJAX para buscar dados
        console.log('Carregando dados do dashboard...');
        
        // Em produção, seria uma chamada fetch() para a API
        setTimeout(() => {
            mostrarAlerta('Dados do dashboard carregados', 'sucesso');
        }, 1000);
    }

    // Inicialização
    carregarDadosDashboard();

    // Lógica para exportar relatórios (simulação)
    document.querySelectorAll('.grafico-card').forEach(card => {
        const btnExportar = document.createElement('button');
        btnExportar.className = 'btn-exportar';
        btnExportar.innerHTML = '<i class="fas fa-download"></i> Exportar';
        btnExportar.addEventListener('click', function() {
            mostrarAlerta(`Relatório ${card.querySelector('h3').textContent} exportado`, 'sucesso');
        });
        
        const header = card.querySelector('h3');
        header.insertAdjacentElement('afterend', btnExportar);
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
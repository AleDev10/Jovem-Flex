document.addEventListener('DOMContentLoaded', function() {
    const formulario = document.getElementById('formularioLogin');
    const botaoEsqueciSenha = document.getElementById('esqueciSenha');
    const botaoCriarConta = document.getElementById('criarConta');

    // Validação do formulário de login
    formulario.addEventListener('submit', function(evento) {
        evento.preventDefault();
        
        const email = document.getElementById('email').value;
        const senha = document.getElementById('senha').value;
        
        // Validação simples (pode ser expandida)
        if(email && senha) {
            console.log('Tentativa de login com:', { email, senha });
            // Aqui você pode adicionar a lógica de autenticação
            // Por exemplo, uma chamada AJAX para o backend
            
            // Simulação de login bem-sucedido (remover em produção)
            alert('Login realizado com sucesso! Redirecionando...');
            // window.location.href = 'dashboard.html';
        } else {
            alert('Por favor, preencha todos os campos.');
        }
    });

    // Ação para "Esqueci minha senha"
    botaoEsqueciSenha.addEventListener('click', function(evento) {
        evento.preventDefault();
        const email = prompt('Digite seu e-mail para redefinir a senha:');
        if(email) {
            console.log('Solicitação de redefinição para:', email);
            alert('Um link de redefinição foi enviado para seu e-mail.');
        }
    });

    // Ação para "Criar conta"
    botaoCriarConta.addEventListener('click', function(evento) {
        evento.preventDefault();
        console.log('Redirecionando para página de cadastro');
        // window.location.href = 'cadastro.html';
        alert('Redirecionando para página de cadastro...');
    });
});
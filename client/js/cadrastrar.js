document.addEventListener("DOMContentLoaded", function () {
  const formCadastro = document.getElementById("formCadastro");
  const alerta = document.getElementById("alerta");
  const loaderCadastro = document.getElementById("loaderCadastro");
  const textoBotaoCadastro = document.getElementById("textoBotaoCadastro");
  const passo1 = document.querySelector(".passo-1");
  const passo2 = document.querySelector(".passo-2");
  const botaoProximo = document.querySelector(".botao-proximo");
  const botaoVoltar = document.querySelector(".botao-voltar");
  const telefoneInput = document.getElementById("telefone");

  // Máscara para telefone
  // No arquivo script.js, substitua a função de máscara de telefone por:

  // Validação do formato +244XXXXXXXXX
  telefoneInput.addEventListener("input", function (e) {
    let value = e.target.value.replace(/\D/g, "");

    // Garante que comece com +244
    if (!value.startsWith("244")) {
      value = "244" + value.replace(/^244/, "");
    }

    // Limita a 12 dígitos (244 + 9 dígitos)
    value = value.substring(0, 12);

    // Formata para +244XXXXXXXXX
    if (value.length > 3) {
      e.target.value = `+${value.substring(0, 3)}${value.substring(3)}`;
    } else if (value.length > 0) {
      e.target.value = `+${value}`;
    } else {
      e.target.value = "";
    }
  });

  // Adicione esta validação antes do envio do formulário
  formCadastro.addEventListener("submit", async function (e) {
    e.preventDefault();

    const telefone = document.getElementById("telefone").value;

    // Validação do formato do telefone
    const regexTelefone = /^\+244[0-9]{9}$/;
    if (!regexTelefone.test(telefone)) {
      mostrarAlerta(
        "O telefone deve estar no formato +244 seguido por 9 dígitos",
        "erro"
      );
      return;
    }

    // Restante da lógica de submit...
  });

  // Alternar visibilidade da senha
  window.togglePassword = function (id) {
    const input = document.getElementById(id);
    const icone = input.nextElementSibling.querySelector("i");

    if (input.type === "password") {
      input.type = "text";
      icone.classList.replace("fa-eye", "fa-eye-slash");
    } else {
      input.type = "password";
      icone.classList.replace("fa-eye-slash", "fa-eye");
    }
  };

  // Navegação entre passos
  botaoProximo.addEventListener("click", function () {
    const tipoSelecionado = document.querySelector(
      'input[name="tipo"]:checked'
    );

    if (tipoSelecionado) {
      passo1.classList.remove("ativo");
      passo2.classList.add("ativo");
    } else {
      mostrarAlerta("Por favor, selecione um tipo de perfil", "erro");
    }
  });

  botaoVoltar.addEventListener("click", function () {
    passo2.classList.remove("ativo");
    passo1.classList.add("ativo");
  });

  // Lógica de cadastro
  formCadastro.addEventListener("submit", async function (e) {
    e.preventDefault();

    const nome = document.getElementById("nome").value;
    const email = document.getElementById("email").value;
    const telefone = document.getElementById("telefone").value;
    const senha = document.getElementById("senha").value;
    const confirmarSenha = document.getElementById("confirmarSenha").value;
    const tipo = document.querySelector('input[name="tipo"]:checked').value;

    // Validação básica
    if (senha !== confirmarSenha) {
      mostrarAlerta("As senhas não coincidem", "erro");
      return;
    }

    if (senha.length < 6) {
      mostrarAlerta("A senha deve ter pelo menos 6 caracteres", "erro");
      return;
    }

    // Mostrar loader
    textoBotaoCadastro.style.visibility = "hidden";
    loaderCadastro.style.display = "block";

    try {
      // Enviar dados para o backend
      const response = await fetch("http://localhost:3000/auth/registro", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          nome,
          email,
          telefone: telefone.replace(/\D/g, ""),
          senha,
          tipo,
        }),
      });

      const data = await response.json();

      // Esconder loader
      textoBotaoCadastro.style.visibility = "visible";
      loaderCadastro.style.display = "none";

      if (response.ok) {
        // Armazene o token e outros dados no localStorage
        if (data.token) {
          localStorage.setItem("token", data.token);
        }
        // Se quiser armazenar outros dados do usuário:
        localStorage.setItem("usuario", JSON.stringify(data.usuario || {}));

        mostrarAlerta(
          "Cadastro realizado com sucesso! Redirecionando...",
          "sucesso"
        );

        // Redirecionar após 2 segundos
        setTimeout(() => {
          window.location.href =
            tipo === "cliente"
              ? "painelcliente.html"
              : tipo === "vendedor"
              ? "painelvendedor.html"
              : "painelgerente.html";
        }, 2000);
      } else {
        mostrarAlerta(data.message || "Erro ao realizar cadastro", "erro");
      }
    } catch (error) {
      // Esconder loader
      textoBotaoCadastro.style.visibility = "visible";
      loaderCadastro.style.display = "none";

      console.error("Erro:", error);
      mostrarAlerta("Erro na conexão com o servidor. Tente novamente.", "erro");
    }
  });

  // Mostrar mensagem de alerta
  function mostrarAlerta(mensagem, tipo) {
    alerta.textContent = mensagem;
    alerta.className = "alerta mostrar " + tipo;

    setTimeout(() => {
      alerta.classList.remove("mostrar");
    }, 5000);
  }
});

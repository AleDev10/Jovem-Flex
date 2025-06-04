document.addEventListener("DOMContentLoaded", function () {
  const formLogin = document.getElementById("formLogin");
  const alerta = document.getElementById("alerta");
  const loader = document.getElementById("loader");
  const textoBotao = document.getElementById("textoBotao");
  const esqueciSenha = document.getElementById("esqueciSenha");

  // Alternar visibilidade da senha
  window.togglePassword = function () {
    const senhaInput = document.getElementById("senha");
    const icone = document.querySelector(".mostrar-senha i");

    if (senhaInput.type === "password") {
      senhaInput.type = "text";
      icone.classList.replace("fa-eye", "fa-eye-slash");
    } else {
      senhaInput.type = "password";
      icone.classList.replace("fa-eye-slash", "fa-eye");
    }
  };

  // Lógica de login
  formLogin.addEventListener("submit", async function (e) {
    e.preventDefault();

    const email = document.getElementById("email").value;
    const senha = document.getElementById("senha").value;
    const lembrar = document.getElementById("lembrar").checked;

    // Mostrar loader
    textoBotao.style.visibility = "hidden";
    loader.style.display = "block";

    try {
      const response = await fetch("http://localhost:3000/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, senha, lembrar }),
      });

      const data = await response.json();

      // Esconder loader
      textoBotao.style.visibility = "visible";
      loader.style.display = "none";

      if (response.ok) {
        // Login bem-sucedido
        mostrarAlerta(
          "Login realizado com sucesso! Redirecionando...",
          "sucesso"
        );

        // Salvar token se necessário
        if (data.token) {
          localStorage.setItem("jwtToken", data.token);
        }

        if (data.usuario) {
          localStorage.setItem("usuario", JSON.stringify(data.usuario));
        }

        // Redirecionar após 2 segundos
        setTimeout(() => {
          if (data.usuario && data.usuario.tipo) {
            if (data.usuario.tipo === "cliente") {
              window.location.href = "painelcliente.html";
            } else if (data.usuario.tipo === "vendedor") {
              window.location.href = "painelvendedor.html";
            } else if (data.usuario.tipo === "gerente") {
              window.location.href = "painelgerente.html";
            } else {
              window.location.href = "dashboard.html";
            }
          } else {
            window.location.href = "dashboard.html";
          }
        }, 2000);
      } else {
        // Erro no login
        mostrarAlerta(
          data.message || "Erro ao fazer login. Verifique suas credenciais.",
          "erro"
        );
      }
    } catch (error) {
      // Esconder loader
      textoBotao.style.visibility = "visible";
      loader.style.display = "none";

      console.error("Erro:", error);
      mostrarAlerta("Erro na conexão com o servidor. Tente novamente.", "erro");
    }
  });

  // Esqueci minha senha
  esqueciSenha.addEventListener("click", function (e) {
    e.preventDefault();
    const email = prompt(
      "Digite seu e-mail cadastrado para redefinir a senha:"
    );

    if (email) {
      // Simulação de requisição para redefinição de senha
      fetch("/esqueci-senha", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      })
        .then((response) => response.json())
        .then((data) => {
          if (data.success) {
            mostrarAlerta(
              "Um link para redefinir sua senha foi enviado para seu e-mail.",
              "sucesso"
            );
          } else {
            mostrarAlerta(
              data.message || "Erro ao solicitar redefinição de senha.",
              "erro"
            );
          }
        })
        .catch((error) => {
          console.error("Erro:", error);
          mostrarAlerta(
            "Erro na conexão com o servidor. Tente novamente.",
            "erro"
          );
        });
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

  // Verificar se há token salvo (auto-login)
  function verificarToken() {
    const token = localStorage.getItem("jwtToken");

    if (token) {
      // Validar token no backend
      fetch("/verificar-token", {
        headers: {
          Authorization: "Bearer " + token,
        },
      })
        .then((response) => {
          if (response.ok) {
            window.location.href = "dashboard.html";
          }
        })
        .catch((error) => console.error("Erro ao verificar token:", error));
    }
  }

  // Executar verificação de token ao carregar a página
  verificarToken();
});

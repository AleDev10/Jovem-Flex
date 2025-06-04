document.addEventListener("DOMContentLoaded", function () {
  // Efeito smooth scroll para links de navegação
  document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
    anchor.addEventListener("click", function (e) {
      e.preventDefault();

      const targetId = this.getAttribute("href");
      if (targetId === "#") return;

      const targetElement = document.querySelector(targetId);
      if (targetElement) {
        window.scrollTo({
          top: targetElement.offsetTop - 80,
          behavior: "smooth",
        });
      }
    });
  });

  // Efeito de animação ao rolar a página
  const observerOptions = {
    threshold: 0.1,
  };

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("animate");
      }
    });
  }, observerOptions);

  document
    .querySelectorAll(".card-funcionalidade, .item-numero")
    .forEach((element) => {
      observer.observe(element);
    });

  // Simulação de envio de formulário (para demonstração)
  const formDemo = document.querySelector("#demo-form");
  if (formDemo) {
    formDemo.addEventListener("submit", function (e) {
      e.preventDefault();
      alert(
        "Solicitação de demonstração enviada com sucesso! Entraremos em contato em breve."
      );
      this.reset();
    });
  }

  // Redirecionamento dos botões principais
  // Ver lojas
  const verLojas = document.querySelector(".botao-vermelho");
  if (verLojas) {
    verLojas.addEventListener("click", function (e) {
      e.preventDefault();
      window.location.href = "lojas.html";
    });
  }

  // Cadastre-se Gratuitamente
  const cadastrar = document.querySelector(".botao-azul");
  if (cadastrar) {
    cadastrar.addEventListener("click", function (e) {
      e.preventDefault();
      window.location.href = "cadastrar.html";
    });
  }

  // Login (caso queira garantir o redirecionamento pelo JS)
  const login = document.querySelector(".botao-login");
  if (login) {
    login.addEventListener("click", function (e) {
      e.preventDefault();
      window.location.href = "login.html";
    });
  }
});

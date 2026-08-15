// ============================================
// Central de Alunos — Navegação por abas
// ============================================

document.addEventListener("DOMContentLoaded", () => {
  const botoes = document.querySelectorAll(".tab-btn");
  const paineis = document.querySelectorAll(".tab-panel");

  botoes.forEach((btn) => {
    btn.addEventListener("click", () => {
      const alvo = btn.dataset.tab;

      botoes.forEach((b) => b.classList.remove("active"));
      paineis.forEach((p) => p.classList.remove("active"));

      btn.classList.add("active");
      document.querySelector(`.tab-panel[data-panel="${alvo}"]`).classList.add("active");
    });
  });
});

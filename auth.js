// ============================================
// Central de Alunos — Autenticação
// ============================================

/**
 * Faz login com email/senha via Supabase Auth e resolve
 * a pessoa correspondente na tabela `usuarios`.
 * ASSUME: `usuarios` tem colunas `auth_user_id` e `pessoa_id`
 * (conforme descrito no contexto do projeto). Confirme os
 * nomes exatos das colunas se o login falhar na etapa de
 * resolver a pessoa.
 */
async function fazerLogin(email, senha) {
  const { data: authData, error: authError } = await supabaseClient.auth.signInWithPassword({
    email,
    password: senha,
  });

  if (authError) {
    throw new Error("E-mail ou senha inválidos.");
  }

  const { data: usuario, error: usuarioError } = await supabaseClient
    .from("usuarios")
    .select("pessoa_id, pessoas ( id, nome )")
    .eq("auth_user_id", authData.user.id)
    .single();

  if (usuarioError || !usuario) {
    await supabaseClient.auth.signOut();
    throw new Error("Não encontramos um cadastro vinculado a este login.");
  }

  return usuario;
}

/**
 * Garante que existe uma sessão válida. Se não houver,
 * redireciona para a tela de login. Deve ser chamado no
 * topo de qualquer página protegida (ex: dashboard.html).
 */
async function exigirSessao() {
  const { data } = await supabaseClient.auth.getSession();
  if (!data.session) {
    window.location.href = "index.html";
    return null;
  }
  return data.session;
}

async function fazerLogout() {
  await supabaseClient.auth.signOut();
  window.location.href = "index.html";
}

// ---- Handler do formulário de login (index.html) ----
document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("login-form");
  if (!form) return; // não está na tela de login

  const errorBox = document.getElementById("login-error");
  const submitBtn = document.getElementById("login-submit");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    errorBox.classList.remove("visible");
    submitBtn.disabled = true;
    submitBtn.textContent = "Entrando...";

    const email = document.getElementById("email").value.trim();
    const senha = document.getElementById("senha").value;

    try {
      await fazerLogin(email, senha);
      window.location.href = "dashboard.html";
    } catch (err) {
      errorBox.textContent = err.message;
      errorBox.classList.add("visible");
      submitBtn.disabled = false;
      submitBtn.textContent = "Entrar";
    }
  });
});

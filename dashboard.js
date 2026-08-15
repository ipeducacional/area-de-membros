// ============================================
// Central de Alunos — Dashboard
// ============================================
// ATENÇÃO — suposições de schema a confirmar:
// - `lancamentos` tem uma coluna `contrato_id` ligando à parcela
//   ao contrato (não foi confirmado no contexto do projeto).
// - Uma parcela é considerada "paga" se existir pelo menos um
//   registro em `pagamentos` com esse `lancamento_id`.
// Se os nomes reais forem diferentes, ajuste as queries abaixo.
// ============================================

function formatarMoeda(valor) {
  return (valor ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatarData(dataStr) {
  if (!dataStr) return "—";
  const [ano, mes, dia] = dataStr.split("-");
  return `${dia}/${mes}/${ano}`;
}

async function carregarPessoaLogada() {
  const { data: { user } } = await supabaseClient.auth.getUser();
  if (!user) return null;

  const { data: usuario, error } = await supabaseClient
    .from("usuarios")
    .select("pessoa_id, pessoas ( id, nome )")
    .eq("auth_user_id", user.id)
    .single();

  if (error || !usuario) return null;
  return usuario.pessoas;
}

async function carregarParcelas(pessoaId) {
  // 1. Contratos da pessoa
  const { data: contratos, error: contratosError } = await supabaseClient
    .from("contratos")
    .select("id, tipo, status")
    .eq("pessoa_id", pessoaId);

  if (contratosError || !contratos || contratos.length === 0) return [];

  const contratoIds = contratos.map((c) => c.id);

  // 2. Lançamentos (parcelas) desses contratos, com pagamentos vinculados
  const { data: lancamentos, error: lancamentosError } = await supabaseClient
    .from("lancamentos")
    .select("id, valor, data_vencimento, numero_parcela, renegociado, contrato_id, pagamentos ( id, valor, data_pagamento )")
    .in("contrato_id", contratoIds)
    .order("data_vencimento", { ascending: true });

  if (lancamentosError) {
    console.error("Erro ao carregar lançamentos:", lancamentosError);
    return [];
  }

  return lancamentos || [];
}

function renderParcelas(lancamentos) {
  const container = document.getElementById("parcelas-container");

  if (!lancamentos || lancamentos.length === 0) {
    container.innerHTML = `<div class="empty-state">Nenhuma parcela encontrada.</div>`;
    return;
  }

  const linhas = lancamentos.map((l) => {
    const pago = l.pagamentos && l.pagamentos.length > 0;
    const statusHtml = pago
      ? `<span class="status-pill pago">Paga</span>`
      : `<span class="status-pill pendente">Pendente</span>`;

    return `
      <tr>
        <td>${l.numero_parcela ?? "—"}ª</td>
        <td>${formatarData(l.data_vencimento)}</td>
        <td class="valor">${formatarMoeda(l.valor)}</td>
        <td>${statusHtml}</td>
      </tr>
    `;
  }).join("");

  container.innerHTML = `
    <table class="lancamentos">
      <thead>
        <tr>
          <th>Parcela</th>
          <th>Vencimento</th>
          <th>Valor</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>${linhas}</tbody>
    </table>
  `;
}

async function iniciarDashboard() {
  const sessao = await exigirSessao();
  if (!sessao) return;

  const pessoa = await carregarPessoaLogada();
  if (!pessoa) {
    document.getElementById("parcelas-container").innerHTML =
      `<div class="empty-state">Não foi possível carregar seus dados.</div>`;
    return;
  }

  document.getElementById("user-name").textContent = pessoa.nome;

  const lancamentos = await carregarParcelas(pessoa.id);
  renderParcelas(lancamentos);
}

document.addEventListener("DOMContentLoaded", () => {
  iniciarDashboard();

  const logoutBtn = document.getElementById("logout-btn");
  if (logoutBtn) logoutBtn.addEventListener("click", fazerLogout);
});

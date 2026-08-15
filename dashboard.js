// ============================================
// Central de Alunos — Dashboard
// ============================================
// MODO TESTE: enquanto true, a tela abre sem exigir login e
// mostra dados fictícios, só pra visualizar o layout. Quando
// o login e o banco estiverem prontos pra testar de verdade,
// troque para false.
const MODO_TESTE = true;

const PARCELAS_FICTICIAS = [
  { numero_parcela: 1, data_vencimento: "2026-02-10", valor: 450, pagamentos: [{ id: 1 }] },
  { numero_parcela: 2, data_vencimento: "2026-03-10", valor: 450, pagamentos: [{ id: 2 }] },
  { numero_parcela: 3, data_vencimento: "2026-04-10", valor: 450, pagamentos: [] },
  { numero_parcela: 4, data_vencimento: "2026-05-10", valor: 450, pagamentos: [] },
];

const CONTRATOS_FICTICIOS = [
  { id: 1, tipo: "Curso", status: "ativo", turmas: { nome: "Harmonização Facial — Turma 12" } },
  { id: 2, tipo: "Pós-graduação", status: "ativo", turmas: { nome: "Pós em Estética Avançada" } },
  { id: 3, tipo: "Online", status: "concluido", turmas: { nome: "Curso Online de Skincare" } },
];

// EM MODO TESTE simulamos uma pessoa que também é professora.
const EH_PROFESSOR_TESTE = true;

const AULAS_FICTICIAS = [
  { id: 1, data: "2026-03-02", disciplinas: { nome: "Anatomia Facial" }, turmas: { nome: "Turma 12" } },
  { id: 2, data: "2026-03-09", disciplinas: { nome: "Toxina Botulínica — Prática" }, turmas: { nome: "Turma 12" } },
];

const CURSOS_FICTICIOS = [
  { id: 1, nome: "Harmonização Facial", tipo: "Curso", status: "aberta" },
  { id: 2, nome: "Pós em Estética Avançada", tipo: "Pós-graduação", status: "aberta" },
  { id: 3, nome: "Curso Online de Skincare", tipo: "Online", status: "aberta" },
  { id: 4, nome: "Workshop de Preenchimento Labial", tipo: "Workshop", status: "aberta" },
];

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

/**
 * ASSUME: `contratos` tem `turmas` relacionada via `turma_id`
 * (FK padrão do Supabase — ajuste o nome do relacionamento se
 * o Supabase reclamar de "could not find relationship").
 */
async function carregarContratos(pessoaId) {
  const { data, error } = await supabaseClient
    .from("contratos")
    .select("id, tipo, status, turma_id, turmas ( nome )")
    .eq("pessoa_id", pessoaId)
    .in("tipo", ["Curso", "Pós-graduação", "Online"]);

  if (error) {
    console.error("Erro ao carregar contratos:", error);
    return [];
  }
  return data || [];
}

function renderContratos(contratos) {
  const container = document.getElementById("contratos-container");

  if (!contratos || contratos.length === 0) {
    container.innerHTML = `<div class="empty-state">Nenhum contrato encontrado.</div>`;
    return;
  }

  container.innerHTML = contratos.map((c) => `
    <div class="list-item">
      <div>
        <div class="list-item-title">${c.turmas?.nome ?? "—"}</div>
        <div class="list-item-sub">${c.status ?? ""}</div>
      </div>
      <span class="tag">${c.tipo}</span>
    </div>
  `).join("");
}

/**
 * ASSUME: `aulas` tem coluna `professor_id` (ligando à pessoa que
 * ministrou) e uma coluna `data`. Se o nome real for diferente
 * (ex: `ministrante_id`), troque abaixo.
 * A aba só aparece se houver ao menos uma aula ministrada.
 */
async function carregarAulasMinistradas(pessoaId) {
  const { data, error } = await supabaseClient
    .from("aulas")
    .select("id, data, disciplinas ( nome ), turmas ( nome )")
    .eq("professor_id", pessoaId)
    .order("data", { ascending: false });

  if (error) {
    console.error("Erro ao carregar aulas ministradas:", error);
    return [];
  }
  return data || [];
}

function renderAulas(aulas) {
  const container = document.getElementById("aulas-container");

  if (!aulas || aulas.length === 0) {
    container.innerHTML = `<div class="empty-state">Nenhuma aula ministrada encontrada.</div>`;
    return;
  }

  container.innerHTML = aulas.map((a) => `
    <div class="list-item">
      <div>
        <div class="list-item-title">${a.disciplinas?.nome ?? "—"}</div>
        <div class="list-item-sub">${a.turmas?.nome ?? ""} · ${formatarData(a.data)}</div>
      </div>
    </div>
  `).join("");
}

/**
 * ASSUME: catálogo de "cursos à venda" vem de `turmas`, com uma
 * coluna `status` indicando disponibilidade (ex: "aberta"). Se
 * cursos à venda vier de outra tabela, troque a query abaixo.
 */
async function carregarCursos() {
  const { data, error } = await supabaseClient
    .from("turmas")
    .select("id, nome, tipo, status")
    .eq("status", "aberta");

  if (error) {
    console.error("Erro ao carregar cursos:", error);
    return [];
  }
  return data || [];
}

let CURSOS_CACHE = [];
let TURMA_IDS_COM_ACESSO = new Set();

function renderCursos(mostrarSoMeusCursos) {
  const container = document.getElementById("cursos-container");
  const lista = mostrarSoMeusCursos
    ? CURSOS_CACHE.filter((c) => TURMA_IDS_COM_ACESSO.has(c.id))
    : CURSOS_CACHE;

  if (lista.length === 0) {
    container.innerHTML = `<div class="empty-state">${mostrarSoMeusCursos ? "Você ainda não tem acesso a nenhum curso." : "Nenhum curso disponível no momento."}</div>`;
    return;
  }

  container.innerHTML = `<div class="cursos-grid">${lista.map((c) => {
    const temAcesso = TURMA_IDS_COM_ACESSO.has(c.id);
    return `
      <div class="curso-card ${temAcesso ? "tenho-acesso" : ""}">
        ${temAcesso ? '<span class="curso-acesso-badge">Você tem acesso</span>' : ""}
        <span class="tag">${c.tipo}</span>
        <h4>${c.nome}</h4>
      </div>
    `;
  }).join("")}</div>`;
}

function configurarFiltroCursos() {
  const checkbox = document.getElementById("filtro-meus-cursos");
  checkbox.addEventListener("change", () => renderCursos(checkbox.checked));
}

async function iniciarDashboard() {
  configurarFiltroCursos();

  if (MODO_TESTE) {
    document.getElementById("user-name").textContent = "Aluna Teste";
    renderParcelas(PARCELAS_FICTICIAS);
    renderContratos(CONTRATOS_FICTICIOS);

    if (EH_PROFESSOR_TESTE) {
      document.getElementById("tab-btn-aulas").hidden = false;
      renderAulas(AULAS_FICTICIAS);
    }

    CURSOS_CACHE = CURSOS_FICTICIOS;
    TURMA_IDS_COM_ACESSO = new Set(CONTRATOS_FICTICIOS.map((_, i) => i + 1)); // simula acesso aos 3 primeiros
    renderCursos(false);
    return;
  }

  const sessao = await exigirSessao();
  if (!sessao) return;

  const pessoa = await carregarPessoaLogada();
  if (!pessoa) {
    document.getElementById("parcelas-container").innerHTML =
      `<div class="empty-state">Não foi possível carregar seus dados.</div>`;
    return;
  }

  document.getElementById("user-name").textContent = pessoa.nome;

  const [lancamentos, contratos, aulas, cursos] = await Promise.all([
    carregarParcelas(pessoa.id),
    carregarContratos(pessoa.id),
    carregarAulasMinistradas(pessoa.id),
    carregarCursos(),
  ]);

  renderParcelas(lancamentos);
  renderContratos(contratos);

  if (aulas.length > 0) {
    document.getElementById("tab-btn-aulas").hidden = false;
    renderAulas(aulas);
  }

  CURSOS_CACHE = cursos;
  TURMA_IDS_COM_ACESSO = new Set(contratos.map((c) => c.turma_id).filter(Boolean));
  renderCursos(false);
}

document.addEventListener("DOMContentLoaded", () => {
  iniciarDashboard();

  const logoutBtn = document.getElementById("logout-btn");
  if (logoutBtn) logoutBtn.addEventListener("click", fazerLogout);
});

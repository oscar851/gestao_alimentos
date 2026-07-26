// ============================================================
// GESTÃO DE CAPITAÇÃO — APP.JS v2.0
// Melhorias visuais: transições, animações, micro-interações,
// contadores animados, badges dinâmicos, loading overlay,
// toasts com barra de progresso, empty states premium
// ============================================================

// ===== DADOS =====
let capitacaoItens = [];
let receitas = [];
let atividades = [];
let planoCaptacao = [];
let historicoCalculos = [];

let editandoId = null;
let editandoReceitaId = null;
let isMouseOverDropdown = false;

// Lista temporária dos itens (ingredientes) inseridos na receita
// enquanto o modal "Nova Receita" / "Editar Receita" está aberto
let ingredientesReceitaAtual = [];

// ===== PERFORMANCE UTILITIES =====
function debounce(fn, wait) {
  let t;
  return function (...args) {
    clearTimeout(t);
    t = setTimeout(() => fn.apply(this, args), wait);
  };
}

function throttle(fn, limit) {
  let inThrottle;
  return function (...args) {
    if (!inThrottle) {
      fn.apply(this, args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

let _salvarLocalTimeout = null;
function salvarLocalDebounced() {
  if (_salvarLocalTimeout) clearTimeout(_salvarLocalTimeout);
  _salvarLocalTimeout = setTimeout(() => {
    salvarLocal();
  }, 400);
}

// Cache de ordenação
let _itensOrdenados = null;
let _receitasOrdenadas = null;
function getItensOrdenados() {
  if (!_itensOrdenados) {
    _itensOrdenados = [...capitacaoItens].sort((a, b) =>
      (a.nome || "").localeCompare(b.nome || ""),
    );
  }
  return _itensOrdenados;
}
// ===== MEMOIZAÇÃO DE FORMATAÇÃO =====
const _fmtMoedaCache = new Map();
function formatarMoedaMemo(valor) {
  const k = valor;
  if (!_fmtMoedaCache.has(k)) {
    _fmtMoedaCache.set(k, formatarMoeda(valor));
  }
  return _fmtMoedaCache.get(k);
}

const _fmtNumCache = new Map();
function formatarNumeroMemo(valor) {
  const k = valor;
  if (!_fmtNumCache.has(k)) {
    _fmtNumCache.set(k, formatarNumero(valor));
  }
  return _fmtNumCache.get(k);
}

// ===== CACHE DE ELEMENTOS DOM =====
const DOM = {};
function getEl(id) {
  if (!DOM[id]) DOM[id] = document.getElementById(id);
  return DOM[id];
}

// Variáveis de performance / paginação já declaradas abaixo

function getReceitasOrdenadas() {
  if (!_receitasOrdenadas) {
    _receitasOrdenadas = [...receitas].sort((a, b) => {
      const g = (a.grupo || "").localeCompare(b.grupo || "");
      if (g !== 0) return g;
      const c = (a.categoria || "").localeCompare(b.categoria || "");
      if (c !== 0) return c;
      return (a.nome || "").localeCompare(b.nome || "");
    });
  }
  return _receitasOrdenadas;
}
function invalidateSortCache() {
  _itensOrdenados = null;
  _receitasOrdenadas = null;
}

// ===== SINCRONIZAÇÃO DE INGREDIENTES =====
// Remove ingredientes órfãos das receitas quando itens são excluídos da base
function sincronizarIngredientesReceitas(silencioso = false) {
  if (!receitas || receitas.length === 0) return { removidos: 0, receitasAfetadas: 0 };
  const idsValidos = new Set(capitacaoItens.map((i) => i.id));
  let totalRemovidos = 0;
  let receitasAfetadas = 0;

  receitas.forEach((rec) => {
    if (!rec.ingredientes || rec.ingredientes.length === 0) return;
    const antes = rec.ingredientes.length;
    rec.ingredientes = rec.ingredientes.filter((ing) => idsValidos.has(ing.id));
    const removidos = antes - rec.ingredientes.length;
    if (removidos > 0) {
      totalRemovidos += removidos;
      receitasAfetadas++;
    }
  });

  if (totalRemovidos > 0) {
    salvarLocalDebounced();
    if (!silencioso) {
      showToast(
        `Sincronização: ${totalRemovidos} ingrediente(s) removido(s) de ${receitasAfetadas} receita(s) porque os itens não existem mais na base de dados.`,
        "warning"
      );
    }
  } else if (!silencioso) {
    showToast("Todos os ingredientes estão sincronizados com a base de dados.", "success");
  }
  return { removidos: totalRemovidos, receitasAfetadas };
}

// Dashboard lazy state
let dashboardDirty = true;

// Receitas pagination
let receitasPaginaAtual = 1;
const RECEITAS_POR_PAGINA = 12;

// Histórico limits
const HISTORICO_MAX = 50;
function trimHistorico() {
  if (historicoCalculos.length > HISTORICO_MAX) {
    historicoCalculos = historicoCalculos.slice(-HISTORICO_MAX);
  }
}

// ===== UTILITÁRIOS VISUAIS =====

function showLoading(msg = "Carregando...") {
  const overlay = document.getElementById("loadingOverlay");
  const text = document.getElementById("loadingText");
  if (overlay) {
    if (text) text.textContent = msg;
    overlay.classList.add("show");
  }
}

function hideLoading() {
  const overlay = document.getElementById("loadingOverlay");
  if (overlay) overlay.classList.remove("show");
}

function animateEntry(el, delay = 0) {
  if (!el) return;
  el.style.opacity = "0";
  el.style.transform = "translateY(12px)";
  el.style.transition =
    "opacity 0.45s cubic-bezier(.4,0,.2,1), transform 0.45s cubic-bezier(.4,0,.2,1)";
  requestAnimationFrame(() => {
    setTimeout(() => {
      el.style.opacity = "1";
      el.style.transform = "translateY(0)";
    }, delay);
  });
}

function staggerAnimate(elements, baseDelay = 40) {
  const maxDelay = 600; // limitar animação para não travar com muitos itens
  elements.forEach((el, i) => {
    const delay = Math.min(i * baseDelay, maxDelay);
    el.style.opacity = "0";
    el.style.transform = "translateY(10px)";
    el.style.transition = `opacity 0.35s ease ${delay}ms, transform 0.35s ease ${delay}ms`;
    requestAnimationFrame(() => {
      setTimeout(() => {
        el.style.opacity = "1";
        el.style.transform = "translateY(0)";
      }, 20);
    });
  });
}

function animateCounter(el, target, duration = 900, suffix = "") {
  if (!el) return;
  const start = performance.now();
  const from = 0;
  const diff = target - from;

  function step(now) {
    const elapsed = now - start;
    const progress = Math.min(elapsed / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 4);
    const current = Math.round(from + diff * eased);
    el.textContent = current.toLocaleString("pt-BR") + suffix;
    if (progress < 1) requestAnimationFrame(step);
    else el.textContent = target.toLocaleString("pt-BR") + suffix;
  }
  requestAnimationFrame(step);
}

function updateSidebarBadges() {
  const badgeItens = document.getElementById("badgeItens");
  const badgeReceitas = document.getElementById("badgeReceitas");
  const badgePlano = document.getElementById("badgePlano");
  if (badgeItens) badgeItens.textContent = capitacaoItens.length;
  if (badgeReceitas) badgeReceitas.textContent = receitas.length;
  if (badgePlano) badgePlano.textContent = planoCaptacao.length;
}

function flashHighlight(el) {
  if (!el) return;
  el.classList.add("highlight-new");
  setTimeout(() => el.classList.remove("highlight-new"), 1800);
}

// ===== INIT =====
function toggleDarkMode() {
  document.body.classList.toggle("dark");
  const dark = document.body.classList.contains("dark");
  localStorage.setItem("darkMode", dark);
  const label = document.getElementById("darkModeLabel");
  if (label) label.textContent = dark ? "Modo Claro" : "Modo Escuro";
}

function aplicarTema() {
  const dark = localStorage.getItem("darkMode") === "true";
  if (dark) document.body.classList.add("dark");
  const label = document.getElementById("darkModeLabel");
  if (label) label.textContent = dark ? "Modo Claro" : "Modo Escuro";
}

document.addEventListener("DOMContentLoaded", () => {
  showLoading("Inicializando sistema...");
  aplicarTema();

  carregarDados();
  renderizarTabela();
  renderizarDashboard();
  carregarConfigSincronizacaoNaTela();

  // Event delegation para ações da tabela de itens
  const tbodyItens = document.querySelector("#itensTable tbody");
  if (tbodyItens) {
    tbodyItens.addEventListener("click", (e) => {
      const btn = e.target.closest(".btn-action");
      if (!btn) return;
      const tr = btn.closest("tr");
      const id = tr ? parseInt(tr.dataset.id) : null;
      if (!id) return;
      if (btn.dataset.action === "edit") editarItem(id);
      if (btn.dataset.action === "delete") excluirItem(id);
    });
  }

  // Event delegation para cards de receitas
  const receitasContainer = document.getElementById("receitasContainer");
  if (receitasContainer) {
    receitasContainer.addEventListener("click", (e) => {
      const btn = e.target.closest(".btn");
      if (!btn || !btn.dataset.action) return;
      const card = btn.closest(".receita-card");
      const id = card ? parseInt(card.dataset.id) : null;
      if (!id) return;
      if (btn.dataset.action === "edit") editarReceita(id);
      if (btn.dataset.action === "delete") excluirReceita(id);
    });
  }

  // Event delegation para plano de captação
  const planoList = document.getElementById("planoList");
  if (planoList) {
    planoList.addEventListener("click", (e) => {
      const btnLote = e.target.closest('[data-action="remove-plano-lote"]');
      if (btnLote) {
        const grupo = btnLote.closest(".plano-receita-group");
        const loteId = grupo ? grupo.dataset.loteId : null;
        if (loteId) removerLoteDoPlano(loteId);
        return;
      }
      const btn = e.target.closest(".btn-action");
      if (!btn || btn.dataset.action !== "remove-plano") return;
      const item = btn.closest(".plano-item");
      const id = item ? parseFloat(item.dataset.id) : null;
      if (id) removerDoPlano(id);
    });
  }

  // Event delegation para histórico
  const historicoList = document.getElementById("historicoList");
  if (historicoList) {
    historicoList.addEventListener("click", (e) => {
      const btn = e.target.closest(".btn-action");
      if (!btn || !btn.dataset.action) return;
      const item = btn.closest(".historico-item");
      const id = item ? parseInt(item.dataset.id) : null;
      if (!id) return;
      if (btn.dataset.action === "restaurar") restaurarHistorico(id);
      if (btn.dataset.action === "remover-historico") removerHistoricoItem(id);
    });
  }
  renderizarReceitas();
  renderizarPlano();
  carregarCalcItens();
  carregarCalcReceitas();
  carregarHistorico();
  renderizarHistorico();
  updateSidebarBadges();

  const buscaItensInput = document.getElementById("buscaItens");
  if (buscaItensInput) {
    buscaItensInput.addEventListener(
      "input",
      debounce(() => renderizarTabela(), 250),
    );
  }

  const searchInput = document.getElementById("calcReceitaSearch");
  const dropdownEl = document.getElementById("calcReceitaDropdown");
  if (searchInput) {
    searchInput.addEventListener(
      "input",
      debounce((e) => filtrarCalcReceitas(e.target.value), 200),
    );
    searchInput.addEventListener("keydown", (e) => {
      const dropdown = document.getElementById("calcReceitaDropdown");
      const isOpen = dropdown && dropdown.classList.contains("active");
      if (e.key === "ArrowDown") {
        e.preventDefault();
        if (!isOpen) filtrarCalcReceitas(searchInput.value);
        navegarAutocomplete(1);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        navegarAutocomplete(-1);
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (isOpen) confirmarAutocomplete();
      } else if (e.key === "Escape") {
        fecharAutocompleteDropdown();
      }
    });
    searchInput.addEventListener("blur", () => {
      setTimeout(() => {
        if (!isMouseOverDropdown) fecharAutocompleteDropdown();
      }, 150);
    });
  }
  if (dropdownEl) {
    dropdownEl.addEventListener("mouseenter", () => {
      isMouseOverDropdown = true;
    });
    dropdownEl.addEventListener("mouseleave", () => {
      isMouseOverDropdown = false;
    });
  }

  const inputGrupo = document.getElementById("receitaGrupo");
  const inputCategoria = document.getElementById("receitaCategoria");
  const inputPreparacao = document.getElementById("receitaPreparacao");
  const ddGrupo = document.getElementById("dropdownGrupo");
  const ddCategoria = document.getElementById("dropdownCategoria");
  const ddPreparacao = document.getElementById("dropdownPreparacao");

  let mouseOverModalDropdown = null;

  function setupModalDropdown(input, dropdown, getOpcoes, onSelect, key) {
    if (!input || !dropdown) return;

    input.addEventListener("input", () => {
      const opcoes = getOpcoes();
      const texto = input.value.trim().toLowerCase();
      const filtradas = opcoes.filter((o) => o.toLowerCase().includes(texto));
      abrirDropdownModal(dropdown.id, filtradas, input.id, onSelect);
    });

    input.addEventListener("focus", () => {
      const opcoes = getOpcoes();
      abrirDropdownModal(dropdown.id, opcoes, input.id, onSelect);
    });

    input.addEventListener("keydown", (e) => {
      const isOpen = dropdown.classList.contains("active");
      if (e.key === "ArrowDown") {
        e.preventDefault();
        if (!isOpen) {
          const opcoes = getOpcoes();
          abrirDropdownModal(dropdown.id, opcoes, input.id, onSelect);
        }
        navegarDropdownModal(dropdown.id, 1);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        navegarDropdownModal(dropdown.id, -1);
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (isOpen) confirmarDropdownModal(dropdown.id, input.id, onSelect);
      } else if (e.key === "Escape") {
        fecharDropdownModal(dropdown.id);
      }
    });

    input.addEventListener("blur", () => {
      setTimeout(() => {
        if (mouseOverModalDropdown !== key) fecharDropdownModal(dropdown.id);
      }, 150);
    });

    dropdown.addEventListener("mouseenter", () => {
      mouseOverModalDropdown = key;
    });
    dropdown.addEventListener("mouseleave", () => {
      mouseOverModalDropdown = null;
    });
  }

  setupModalDropdown(
    inputGrupo,
    ddGrupo,
    () => getGruposUnicos(),
    () => {
      if (inputCategoria) inputCategoria.value = "";
      if (inputPreparacao) inputPreparacao.value = "";
    },
    "grupo",
  );

  setupModalDropdown(
    inputCategoria,
    ddCategoria,
    () => getCategoriasPorGrupo(inputGrupo ? inputGrupo.value : ""),
    () => {
      if (inputPreparacao) inputPreparacao.value = "";
    },
    "categoria",
  );

  setupModalDropdown(
    inputPreparacao,
    ddPreparacao,
    () =>
      getPreparacoesPorCategoria(
        inputGrupo ? inputGrupo.value : "",
        inputCategoria ? inputCategoria.value : "",
      ),
    null,
    "preparacao",
  );

  setTimeout(hideLoading, 400);
});

function carregarDados() {
  console.log("[DEBUG] carregarDados() iniciado");
  const dadosItens = localStorage.getItem("capitacao_itens");
  const dadosReceitas = localStorage.getItem("capitacao_receitas");
  const dadosAtividades = localStorage.getItem("capitacao_atividades");
  const dadosPlano = localStorage.getItem("capitacao_plano");
  const dadosHistorico = localStorage.getItem("capitacao_historico");

  if (dadosItens) {
    try {
      capitacaoItens = JSON.parse(dadosItens) || [];
    } catch (e) {
      capitacaoItens = [];
    }
  } else if (typeof CAPITACAO_DATA !== "undefined") {
    capitacaoItens = JSON.parse(JSON.stringify(CAPITACAO_DATA));
  }
  if (!Array.isArray(capitacaoItens)) capitacaoItens = [];

  if (dadosReceitas) {
    try {
      receitas = JSON.parse(dadosReceitas) || [];
    } catch (e) {
      receitas = [];
    }
    console.log(
      "[DEBUG] Receitas carregadas do localStorage:",
      receitas.length,
    );
  } else if (typeof RECEITAS_DATA !== "undefined") {
    receitas = JSON.parse(JSON.stringify(RECEITAS_DATA));
    console.log(
      "[DEBUG] Receitas carregadas do RECEITAS_DATA:",
      receitas.length,
    );
  } else {
    console.log("[DEBUG] Nenhuma fonte de receitas encontrada!");
  }
  if (!Array.isArray(receitas)) receitas = [];
  console.log("[DEBUG] Estado final de receitas:", receitas);

  if (dadosAtividades) {
    try {
      atividades = JSON.parse(dadosAtividades) || [];
    } catch (e) {
      atividades = [];
    }
  } else atividades = [];
  if (dadosPlano) {
    try {
      planoCaptacao = JSON.parse(dadosPlano) || [];
    } catch (e) {
      planoCaptacao = [];
    }
  } else planoCaptacao = [];
  if (dadosHistorico) {
    try {
      historicoCalculos = JSON.parse(dadosHistorico) || [];
    } catch (e) {
      historicoCalculos = [];
    }
  } else historicoCalculos = [];

  // Garantir limite do histórico e atividades
  trimHistorico();
  if (atividades.length > 20) atividades = atividades.slice(0, 20);
  invalidateSortCache();
  dashboardDirty = true;
}

function salvarLocal() {
  trimHistorico();
  try {
    localStorage.setItem("capitacao_itens", JSON.stringify(capitacaoItens));
    localStorage.setItem("capitacao_receitas", JSON.stringify(receitas));
    localStorage.setItem("capitacao_atividades", JSON.stringify(atividades));
    localStorage.setItem("capitacao_plano", JSON.stringify(planoCaptacao));
    localStorage.setItem(
      "capitacao_historico",
      JSON.stringify(historicoCalculos),
    );
  } catch (e) {
    console.error("Erro ao salvar no localStorage:", e);
    if (e.name === "QuotaExceededError") {
      showToast(
        "Limite de armazenamento atingido! Exporte seus dados e limpe o histórico.",
        "warning",
      );
    }
  }
  updateSidebarBadges();
}

// ===== SINCRONIZAÇÃO COM GOOGLE SHEETS =====
// Permite enviar (backup) e baixar (restaurar) os dados do app usando uma
// planilha do Google como ponto de encontro entre dispositivos, sem precisar
// de servidor próprio. O backend é o arquivo CodigoGoogleSheets.gs, que deve
// ser implantado como "App da Web" no Google Apps Script — ver LEIAME.md.

function getConfigSincronizacao() {
  try {
    return JSON.parse(localStorage.getItem("capitacao_sync_config") || "{}");
  } catch (e) {
    return {};
  }
}

function obterNomeDispositivoPadrao() {
  const ua = navigator.userAgent || "";
  if (/Android/i.test(ua)) return "Android";
  if (/iPhone|iPad|iPod/i.test(ua)) return "iPhone/iPad";
  if (/Windows/i.test(ua)) return "Windows";
  if (/Macintosh/i.test(ua)) return "Mac";
  return "Dispositivo";
}

function carregarConfigSincronizacaoNaTela() {
  const cfg = getConfigSincronizacao();
  const inputUrl = getEl("syncUrl");
  const inputToken = getEl("syncToken");
  const inputDispositivo = getEl("syncDispositivo");
  if (inputUrl) inputUrl.value = cfg.url || "";
  if (inputToken) inputToken.value = cfg.token || "";
  if (inputDispositivo)
    inputDispositivo.value = cfg.dispositivo || obterNomeDispositivoPadrao();
}

function salvarConfigSincronizacaoDaTela() {
  const inputUrl = getEl("syncUrl");
  const inputToken = getEl("syncToken");
  const inputDispositivo = getEl("syncDispositivo");
  const url = (inputUrl.value || "").trim();
  const token = (inputToken.value || "").trim();
  const dispositivo =
    (inputDispositivo.value || "").trim() || obterNomeDispositivoPadrao();

  if (!url) {
    showToast(
      "Cole o link do Google Apps Script (termina em /exec) antes de salvar.",
      "warning",
    );
    return;
  }

  localStorage.setItem(
    "capitacao_sync_config",
    JSON.stringify({ url, token, dispositivo }),
  );
  showToast("Configuração de sincronização salva neste dispositivo.", "success");
  verificarStatusSincronizacao();
}

function formatarDataHoraSync(iso) {
  if (!iso) return "nunca";
  try {
    return new Date(iso).toLocaleString("pt-BR");
  } catch (e) {
    return iso;
  }
}

async function verificarStatusSincronizacao() {
  const cfg = getConfigSincronizacao();
  const statusEl = getEl("syncStatus");
  if (!statusEl) return;

  if (!cfg.url) {
    statusEl.innerHTML =
      '<i class="fas fa-info-circle"></i> Cole o link da planilha acima e clique em "Salvar" para começar.';
    return;
  }

  statusEl.innerHTML =
    '<i class="fas fa-spinner fa-spin"></i> Verificando dados na nuvem...';
  try {
    const resp = await fetch(
      `${cfg.url}?token=${encodeURIComponent(cfg.token || "")}`,
    );
    const json = await resp.json();
    if (!json.ok) {
      statusEl.innerHTML = `<i class="fas fa-exclamation-triangle"></i> ${
        json.erro || "Erro ao consultar a planilha."
      }`;
      return;
    }
    if (!json.dados) {
      statusEl.innerHTML =
        '<i class="fas fa-cloud"></i> Ainda não há nenhum backup nesta planilha. Use "Enviar para a nuvem" para criar o primeiro.';
      return;
    }
    statusEl.innerHTML = `<i class="fas fa-cloud-download-alt"></i> Último backup na nuvem: <strong>${formatarDataHoraSync(
      json.atualizadoEm,
    )}</strong> &mdash; enviado de: ${json.dispositivo || "desconhecido"}`;
  } catch (e) {
    statusEl.innerHTML =
      '<i class="fas fa-exclamation-triangle"></i> Não foi possível conectar à planilha. Confira o link e sua conexão com a internet.';
  }
}

async function enviarParaGoogleSheets() {
  const cfg = getConfigSincronizacao();
  if (!cfg.url) {
    showToast("Configure e salve o link de sincronização primeiro.", "warning");
    return;
  }
  const confirmar = confirm(
    "Isso vai enviar os dados deste dispositivo para a planilha, substituindo o backup que estiver lá. Continuar?",
  );
  if (!confirmar) return;

  showLoading("Enviando dados para a nuvem...");
  try {
    const dados = {
      capitacaoItens,
      receitas,
      atividades,
      planoCaptacao,
      historicoCalculos,
    };
    const resp = await fetch(cfg.url, {
      method: "POST",
      // text/plain evita o preflight de CORS que o Apps Script não trata bem;
      // o conteúdo enviado continua sendo JSON.
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({
        token: cfg.token || "",
        dispositivo: cfg.dispositivo || obterNomeDispositivoPadrao(),
        dados,
      }),
    });
    const json = await resp.json();
    hideLoading();
    if (!json.ok) {
      showToast(json.erro || "Erro ao enviar os dados.", "warning");
      return;
    }
    showToast("Dados enviados para a nuvem com sucesso!", "success");
    verificarStatusSincronizacao();
  } catch (e) {
    hideLoading();
    showToast(
      "Falha ao conectar com a planilha. Confira o link e sua internet.",
      "warning",
    );
  }
}

async function baixarDeGoogleSheets() {
  const cfg = getConfigSincronizacao();
  if (!cfg.url) {
    showToast("Configure e salve o link de sincronização primeiro.", "warning");
    return;
  }
  const confirmar = confirm(
    "Isso vai SUBSTITUIR todos os dados deste dispositivo pelos dados salvos na nuvem. Se você tiver alterações aqui que ainda não enviou, envie-as antes. Continuar mesmo assim?",
  );
  if (!confirmar) return;

  showLoading("Baixando dados da nuvem...");
  try {
    const resp = await fetch(
      `${cfg.url}?token=${encodeURIComponent(cfg.token || "")}`,
    );
    const json = await resp.json();
    hideLoading();
    if (!json.ok) {
      showToast(json.erro || "Erro ao baixar os dados.", "warning");
      return;
    }
    if (!json.dados) {
      showToast("Ainda não há nenhum backup salvo nessa planilha.", "info");
      return;
    }

    const d = json.dados;
    capitacaoItens = Array.isArray(d.capitacaoItens) ? d.capitacaoItens : [];
    receitas = Array.isArray(d.receitas) ? d.receitas : [];
    atividades = Array.isArray(d.atividades) ? d.atividades : [];
    planoCaptacao = Array.isArray(d.planoCaptacao) ? d.planoCaptacao : [];
    historicoCalculos = Array.isArray(d.historicoCalculos)
      ? d.historicoCalculos
      : [];

    salvarLocal();
    invalidateSortCache();
    dashboardDirty = true;

    renderizarTabela();
    renderizarReceitas();
    renderizarPlano();
    carregarHistorico();
    renderizarHistorico();
    renderizarDashboard();
    updateSidebarBadges();
    if (typeof renderizarPesquisaCaptacao === "function") {
      renderizarPesquisaCaptacao();
    }

    showToast(
      `Dados restaurados da nuvem (backup de ${formatarDataHoraSync(
        json.atualizadoEm,
      )}).`,
      "success",
    );
    verificarStatusSincronizacao();
  } catch (e) {
    hideLoading();
    showToast(
      "Falha ao conectar com a planilha. Confira o link e sua internet.",
      "warning",
    );
  }
}

// ===== NAVEGAÇÃO COM TRANSIÇÃO =====
function navigate(sectionId) {
  const current = document.querySelector(".section.active");
  const target = document.getElementById(sectionId);

  document
    .querySelectorAll(".sidebar-nav li")
    .forEach((li) => li.classList.remove("active"));
  const navItem = document.querySelector(`[data-section="${sectionId}"]`);
  if (navItem) navItem.classList.add("active");

  if (current && target && current !== target) {
    current.style.opacity = "0";
    current.style.transform = "translateY(8px)";
    current.style.transition = "opacity 0.25s ease, transform 0.25s ease";

    setTimeout(() => {
      current.classList.remove("active");
      current.style.opacity = "";
      current.style.transform = "";
      current.style.transition = "";

      target.classList.add("active");
      target.style.opacity = "0";
      target.style.transform = "translateY(8px)";
      requestAnimationFrame(() => {
        target.style.transition = "opacity 0.35s ease, transform 0.35s ease";
        target.style.opacity = "1";
        target.style.transform = "translateY(0)";
        setTimeout(() => {
          target.style.transition = "";
          target.style.opacity = "";
          target.style.transform = "";
        }, 360);
      });
    }, 250);
  } else if (target) {
    target.classList.add("active");
  }

  if (sectionId === "dashboard") {
    if (dashboardDirty) {
      setTimeout(() => {
        renderizarDashboard();
        renderizarAtividades();
        dashboardDirty = false;
      }, 300);
    } else {
      setTimeout(() => {
        renderizarAtividades();
      }, 300);
    }
  }
  if (sectionId === "itens") renderizarTabela();
  if (sectionId === "receitas") renderizarReceitas();
  if (sectionId === "calculadora") {
    carregarCalcItens();
    carregarCalcReceitas();
    renderizarHistorico();
  }
  if (sectionId === "plano") renderizarPlano();
  if (sectionId === "pesquisa") renderizarPesquisaCaptacao();
  if (sectionId === "sincronizacao") {
    carregarConfigSincronizacaoNaTela();
    verificarStatusSincronizacao();
  }

  document.getElementById("sidebar").classList.remove("open");
}

function toggleSidebar() {
  document.getElementById("sidebar").classList.toggle("open");
}

// ===== ITENS =====
function renderizarTabela() {
  const tbody = document.querySelector("#itensTable tbody");
  tbody.innerHTML = "";

  if (capitacaoItens.length === 0) {
    tbody.innerHTML = `
            <tr><td colspan="8">
                <div class="empty-state">
                    <div class="empty-state-icon"><i class="fas fa-inbox"></i></div>
                    <div class="empty-state-title">Nenhum item cadastrado</div>
                    <div class="empty-state-desc">Adicione itens de captação para começar a gerenciar seus dados.</div>
                    <button class="btn btn-primary" onclick="openNovoItem()" style="margin-top:12px;">
                        <i class="fas fa-plus"></i> Adicionar Item
                    </button>
                </div>
            </td></tr>`;
    return;
  }

  const termoBusca = (document.getElementById("buscaItens")?.value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  let filtrados = [...capitacaoItens];
  if (termoBusca) {
    filtrados = filtrados.filter((item) => {
      const nome = (item.nome || item.preparacao || "")
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");
      const grupo = (item.grupo || "")
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");
      const categoria = (item.categoria || "")
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");
      return (
        nome.includes(termoBusca) ||
        grupo.includes(termoBusca) ||
        categoria.includes(termoBusca)
      );
    });
  }

  if (filtrados.length === 0) {
    tbody.innerHTML = `
            <tr><td colspan="8">
                <div class="empty-state">
                    <div class="empty-state-icon"><i class="fas fa-search"></i></div>
                    <div class="empty-state-title">Nenhum item encontrado</div>
                    <div class="empty-state-desc">Tente ajustar os termos da busca.</div>
                </div>
            </td></tr>`;
    return;
  }

  const sorted = filtrados.sort(
    (a, b) =>
      a.grupo.localeCompare(b.grupo) || a.categoria.localeCompare(b.categoria),
  );

  const rows = [];
  sorted.forEach((item) => {
    const nomeDisplay = item.nome || item.preparacao;
    const obsAttr = item.observacao
      ? ` title="${item.observacao.replace(/"/g, "&quot;")}"`
      : "";
    const obsIcon = item.observacao
      ? ' <i class="fas fa-sticky-note" style="color:var(--accent);font-size:0.7em;cursor:help;"' +
        obsAttr +
        "></i>"
      : "";
    const tr = document.createElement("tr");
    tr.dataset.id = item.id;
    tr.innerHTML = `
            <td>${item.grupo}</td>
            <td>${item.categoria}</td>
            <td class="td-nome"><strong>${nomeDisplay}</strong>${obsIcon}</td>
            <td class="td-num">${formatarNumeroMemo(item.capitacao_minima)}</td>
            <td class="td-num" style="font-weight:700;color:var(--primary);">${formatarNumeroMemo(item.capitacao_media)}</td>
            <td class="td-num">${formatarNumeroMemo(item.capitacao_maxima)}</td>
            <td class="td-custo">${formatarMoedaMemo(item.custoUnitario)}</td>
            <td class="td-acoes">
                <button class="btn-action edit" data-action="edit" title="Editar item"><i class="fas fa-edit"></i></button>
                <button class="btn-action delete" data-action="delete" title="Excluir item"><i class="fas fa-trash"></i></button>
            </td>
        `;
    rows.push(tr);
  });

  const fragment = document.createDocumentFragment();
  rows.forEach((r) => fragment.appendChild(r));
  tbody.appendChild(fragment);
  staggerAnimate(rows, 35);
}

function salvarItem() {
  const grupo = document.getElementById("itemGrupo").value.trim();
  const categoria = document.getElementById("itemCategoria").value.trim();
  const preparacao = document.getElementById("itemPreparacao").value.trim();
  const minima = parseFloat(document.getElementById("itemMinima").value) || 0;
  const media = parseFloat(document.getElementById("itemMedia").value) || 0;
  const maxima = parseFloat(document.getElementById("itemMaxima").value) || 0;
  const custo = parseFloat(document.getElementById("itemCusto").value) || 0;
  const observacao = document.getElementById("itemObservacao").value.trim();

  if (!grupo || !categoria || !preparacao) {
    showToast("Preencha todos os campos obrigatórios!", "warning");
    return;
  }

  const editId = document.getElementById("editId").value;

  if (editId) {
    const idx = capitacaoItens.findIndex((i) => i.id == editId);
    if (idx !== -1) {
      capitacaoItens[idx] = {
        id: parseInt(editId),
        grupo,
        categoria,
        preparacao,
        nome: preparacao,
        capitacao_minima: minima,
        capitacao_media: media,
        capitacao_maxima: maxima,
        custoUnitario: custo,
        observacao,
      };
      registrarAtividade(`Item "${preparacao}" atualizado`, "edit");
    }
  } else {
    const novoId =
      capitacaoItens.length > 0
        ? Math.max(...capitacaoItens.map((i) => i.id)) + 1
        : 1;
    capitacaoItens.push({
      id: novoId,
      grupo,
      categoria,
      preparacao,
      nome: preparacao,
      capitacao_minima: minima,
      capitacao_media: media,
      capitacao_maxima: maxima,
      custoUnitario: custo,
      observacao,
    });
    registrarAtividade(`Item "${preparacao}" adicionado`, "add");
  }

  salvarLocal();
  renderizarTabela();
  dashboardDirty = true;
  closeModal("itemModal");
  showToast("Item salvo com sucesso!", "success");
}

function editarItem(id) {
  const item = capitacaoItens.find((i) => i.id === id);
  if (!item) return;

  resetItemModalInputs();

  document.getElementById("editId").value = item.id;
  document.getElementById("itemGrupo").value = item.grupo || "";
  document.getElementById("itemCategoria").value = item.categoria || "";
  document.getElementById("itemPreparacao").value =
    item.preparacao || item.nome || "";
  document.getElementById("itemMinima").value = item.capitacao_minima;
  document.getElementById("itemMedia").value = item.capitacao_media;
  document.getElementById("itemMaxima").value = item.capitacao_maxima;
  document.getElementById("itemCusto").value = item.custoUnitario;
  document.getElementById("itemObservacao").value = item.observacao || "";
  document.getElementById("modalTitle").textContent = "Editar Item";

  openModal("itemModal");
}

function excluirItem(id) {
  const item = capitacaoItens.find((i) => i.id === id);
  if (!item) return;
  if (
    !confirm(
      `Tem certeza que deseja excluir o item "${item.nome || item.preparacao}"?`,
    )
  )
    return;

  capitacaoItens = capitacaoItens.filter((i) => i.id !== id);
  salvarLocal();
  renderizarTabela();
  dashboardDirty = true;
  registrarAtividade(
    `Item "${item.nome || item.preparacao}" excluído`,
    "delete",
  );
  // Sincroniza receitas: remove ingredientes que usavam este item
  sincronizarIngredientesReceitas(true);
  showToast("Item excluído!", "info");
}

function popularSelectsItemModal(grupoFiltro = "", categoriaFiltro = "") {
  // deprecated
  return;
  const grupos = [
    ...new Set(capitacaoItens.map((i) => i.grupo).filter(Boolean)),
  ].sort();

  let itensFiltrados = capitacaoItens;
  if (grupoFiltro) {
    itensFiltrados = itensFiltrados.filter((i) => i.grupo === grupoFiltro);
  }
  const categorias = [
    ...new Set(itensFiltrados.map((i) => i.categoria).filter(Boolean)),
  ].sort();

  let itensFiltrados2 = itensFiltrados;
  if (categoriaFiltro) {
    itensFiltrados2 = itensFiltrados2.filter(
      (i) => i.categoria === categoriaFiltro,
    );
  }
  const preparacoes = [
    ...new Set(
      itensFiltrados2.map((i) => i.preparacao || i.nome).filter(Boolean),
    ),
  ].sort();

  const popSelect = (selId, valores, placeholder) => {
    const sel = document.getElementById(selId);
    if (!sel) return;
    const outroVal =
      sel.querySelector('option[value="__OUTRO__"]')?.outerHTML ||
      '<option value="__OUTRO__">+ Outro...</option>';
    sel.innerHTML = '<option value="">' + placeholder + "</option>";
    valores.forEach((v) => {
      const opt = document.createElement("option");
      opt.value = v;
      opt.textContent = v;
      sel.appendChild(opt);
    });
    sel.insertAdjacentHTML("beforeend", outroVal);
  };

  if (!grupoFiltro) {
    popSelect("itemGrupoSelect", grupos, "-- Selecione ou adicione novo --");
  }
  popSelect(
    "itemCategoriaSelect",
    categorias,
    grupoFiltro
      ? "-- Selecione ou adicione nova --"
      : "-- Selecione um grupo primeiro --",
  );
  popSelect(
    "itemPreparacaoSelect",
    preparacoes,
    categoriaFiltro
      ? "-- Selecione ou adicione nova --"
      : "-- Selecione uma categoria primeiro --",
  );
}

function onGrupoChange() {
  // deprecated
  return;
  const grupoSel = document.getElementById("itemGrupoSelect");
  const categoriaSel = document.getElementById("itemCategoriaSelect");
  if (!grupoSel) return;

  const grupo = grupoSel.value;
  if (grupo === "__OUTRO__") return;

  popularSelectsItemModal(grupo, "");

  if (categoriaSel) {
    categoriaSel.value = "";
    categoriaSel.disabled = !grupo;
  }
  const prepSel = document.getElementById("itemPreparacaoSelect");
  if (prepSel) {
    prepSel.value = "";
    prepSel.disabled = true;
  }

  const inpGrupo = document.getElementById("itemGrupo");
  if (inpGrupo) inpGrupo.value = grupo;
}

function onCategoriaChange() {
  // deprecated
  return;
  const grupoSel = document.getElementById("itemGrupoSelect");
  const categoriaSel = document.getElementById("itemCategoriaSelect");
  if (!grupoSel || !categoriaSel) return;

  const grupo = grupoSel.value;
  const categoria = categoriaSel.value;
  if (categoria === "__OUTRO__") return;

  popularSelectsItemModal(grupo, categoria);

  const prepSel = document.getElementById("itemPreparacaoSelect");
  if (prepSel) {
    prepSel.value = "";
    prepSel.disabled = !categoria;
  }

  const inpCategoria = document.getElementById("itemCategoria");
  if (inpCategoria) inpCategoria.value = categoria;
}

function toggleItemInput(campo) {
  // deprecated
  return;
  const sel = document.getElementById("item" + campo + "Select");
  const inp = document.getElementById("item" + campo);
  if (!sel || !inp) return;

  if (sel.value === "__OUTRO__") {
    sel.style.display = "none";
    inp.style.display = "block";
    inp.value = "";
    inp.focus();
    let btn = document.getElementById("btnVoltar" + campo);
    if (!btn) {
      btn = document.createElement("button");
      btn.id = "btnVoltar" + campo;
      btn.type = "button";
      btn.className = "btn btn-sm btn-secondary";
      btn.style.marginTop = "6px";
      btn.innerHTML = '<i class="fas fa-arrow-left"></i> Voltar à lista';
      btn.onclick = () => voltarSelectItem(campo);
      inp.parentNode.appendChild(btn);
    }
    btn.style.display = "inline-flex";
  } else {
    inp.value = sel.value;
  }
}

function voltarSelectItem(campo) {
  const sel = document.getElementById("item" + campo + "Select");
  const inp = document.getElementById("item" + campo);
  const btn = document.getElementById("btnVoltar" + campo);
  if (sel) sel.style.display = "block";
  if (inp) {
    inp.style.display = "none";
    inp.value = "";
  }
  if (btn) btn.style.display = "none";
  if (sel) sel.value = "";
}

function resetItemModalInputs() {
  [
    "itemGrupo",
    "itemCategoria",
    "itemPreparacao",
    "itemMinima",
    "itemMedia",
    "itemMaxima",
    "itemCusto",
    "itemObservacao",
  ].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.value = "";
  });
}

function openNovoItem() {
  document.getElementById("editId").value = "";
  document.getElementById("formItem").reset();
  resetItemModalInputs();
  popularSelectsItemModal();
  document.getElementById("modalTitle").textContent = "Novo Item";
  openModal("itemModal");
}

// ===== RECEITAS =====
function renderizarReceitas() {
  const container = document.getElementById("receitasContainer");
  container.innerHTML = "";

  if (receitas.length === 0) {
    container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon"><i class="fas fa-utensils"></i></div>
                <div class="empty-state-title">Nenhuma receita cadastrada</div>
                <div class="empty-state-desc">Cadastre receitas para utilizar na calculadora e planejamento.</div>
                <button class="btn btn-primary" onclick="abrirModalReceita()" style="margin-top:12px;">
                    <i class="fas fa-plus"></i> Nova Receita
                </button>
            </div>`;
    return;
  }

  const cards = [];
  const sorted = [...receitas].sort((a, b) => a.nome.localeCompare(b.nome));
  const totalPaginas = Math.ceil(sorted.length / RECEITAS_POR_PAGINA) || 1;
  if (receitasPaginaAtual > totalPaginas) receitasPaginaAtual = totalPaginas;
  const inicio = (receitasPaginaAtual - 1) * RECEITAS_POR_PAGINA;
  const paginadas = sorted.slice(inicio, inicio + RECEITAS_POR_PAGINA);

  paginadas.forEach((receita) => {
    const card = document.createElement("div");
    card.className = "receita-card";

    let ingTable = "";
    if (receita.ingredientes && receita.ingredientes.length > 0) {
      ingTable = `<table>
                <thead><tr><th>Item</th><th>Capitação</th><th>Un</th></tr></thead>
                <tbody>`;
      receita.ingredientes.forEach((ing) => {
        const item = capitacaoItens.find((i) => i.id === ing.id);
        if (item) {
          const qtdDisplay = ing.qtd
            ? `${ing.qtd}`
            : `${item.capitacao_media.toFixed(1)} g/pessoa`;
          ingTable += `<tr>
                        <td>${item.nome}</td>
                        <td>${qtdDisplay}</td>
                        <td>${ing.un || item.unidade || "kg"}</td>
                    </tr>`;
        }
      });
      ingTable += `</tbody></table>`;
    }

    card.dataset.id = receita.id;
    card.innerHTML = `
            <h4><i class="fas fa-utensils"></i> ${receita.nome}</h4>
            <div class="receita-meta">${(receita.ingredientes || []).length} ingrediente(s)</div>
            ${receita.preparo ? `<div style="margin:8px 0;font-size:0.85rem;color:var(--gray-600);white-space:pre-wrap;"><strong>Preparo:</strong><br>${receita.preparo}</div>` : ""}
            ${ingTable}
            <div style="display:flex;gap:8px;flex-wrap:wrap;">
                <button class="btn btn-sm btn-secondary" data-action="edit"><i class="fas fa-edit"></i> Editar</button>
                <button class="btn btn-sm btn-danger" data-action="delete"><i class="fas fa-trash"></i> Excluir</button>
            </div>
        `;
    cards.push(card);
  });

  const fragment = document.createDocumentFragment();
  cards.forEach((c) => fragment.appendChild(c));
  container.appendChild(fragment);

  // Controles de paginação
  if (totalPaginas > 1) {
    const paginacao = document.createElement("div");
    paginacao.style.cssText =
      "display:flex;justify-content:center;align-items:center;gap:8px;margin-top:16px;flex-wrap:wrap;";
    let pagHTML = `<button class="btn btn-sm btn-secondary" onclick="mudarPaginaReceitas(-1)" ${receitasPaginaAtual === 1 ? "disabled" : ""}><i class="fas fa-chevron-left"></i></button>`;
    pagHTML += `<span style="font-size:0.85rem;color:var(--gray-600);">Página ${receitasPaginaAtual} de ${totalPaginas}</span>`;
    pagHTML += `<button class="btn btn-sm btn-secondary" onclick="mudarPaginaReceitas(1)" ${receitasPaginaAtual === totalPaginas ? "disabled" : ""}><i class="fas fa-chevron-right"></i></button>`;
    paginacao.innerHTML = pagHTML;
    container.appendChild(paginacao);
  }

  staggerAnimate(cards, 60);
}

function mudarPaginaReceitas(direcao) {
  receitasPaginaAtual += direcao;
  if (receitasPaginaAtual < 1) receitasPaginaAtual = 1;
  renderizarReceitas();
}

function abrirModalReceita() {
  document.getElementById("editReceitaId").value = "";
  document.getElementById("formReceita").reset();
  document.getElementById("modalReceitaTitle").textContent = "Nova Receita";
  ingredientesReceitaAtual = [];
  renderizarIngredientesReceitaAtual();
  fecharDropdownModal("dropdownGrupo");
  fecharDropdownModal("dropdownCategoria");
  fecharDropdownModal("dropdownPreparacao");
  const unidadeInput = document.getElementById("receitaIngUnidade");
  if (unidadeInput) unidadeInput.value = "kg";
  openModal("receitaModal");
}

// Encontra, na base de itens de captação, o item que corresponde
// exatamente à combinação Grupo + Categoria + Preparação selecionada
function encontrarItemPorClassificacao(grupo, categoria, preparacao) {
  if (!grupo || !categoria || !preparacao) return null;
  const g = grupo.trim().toLowerCase();
  const c = categoria.trim().toLowerCase();
  const p = preparacao.trim().toLowerCase();
  return (
    capitacaoItens.find(
      (i) =>
        (i.grupo || "").toLowerCase() === g &&
        (i.categoria || "").toLowerCase() === c &&
        (i.preparacao || "").toLowerCase() === p,
    ) || null
  );
}

// Insere, na receita em edição, o item filtrado pelos campos
// Grupo / Categoria / Preparação, e limpa os campos para o próximo item
function adicionarItemNaReceita() {
  const inputGrupo = document.getElementById("receitaGrupo");
  const inputCategoria = document.getElementById("receitaCategoria");
  const inputPreparacao = document.getElementById("receitaPreparacao");
  const inputUnidade = document.getElementById("receitaIngUnidade");

  const grupo = inputGrupo.value.trim();
  const categoria = inputCategoria.value.trim();
  const preparacao = inputPreparacao.value.trim();
  const unidade = (inputUnidade.value || "kg").trim() || "kg";

  if (!grupo || !categoria || !preparacao) {
    showToast(
      "Selecione Grupo, Categoria e Preparação para inserir o item.",
      "warning",
    );
    return;
  }

  const item = encontrarItemPorClassificacao(grupo, categoria, preparacao);
  if (!item) {
    showToast(
      "Item não encontrado na base de dados. Verifique a seleção.",
      "error",
    );
    return;
  }

  if (ingredientesReceitaAtual.some((ing) => ing.id === item.id)) {
    showToast(`"${item.nome}" já foi inserido nesta receita.`, "warning");
    return;
  }

  ingredientesReceitaAtual.push({ id: item.id, un: unidade });
  renderizarIngredientesReceitaAtual();

  // Limpa os campos para permitir a inserção de um novo item
  inputGrupo.value = "";
  inputCategoria.value = "";
  inputPreparacao.value = "";
  inputUnidade.value = "kg";
  inputGrupo.focus();

  showToast(`"${item.nome}" adicionado à receita.`, "success");
}

// Renderiza a lista de ingredientes já inseridos na receita em edição
function renderizarIngredientesReceitaAtual() {
  const container = document.getElementById("ingredientesReceita");
  if (!container) return;
  container.innerHTML = "";

  if (ingredientesReceitaAtual.length === 0) {
    container.innerHTML = `
            <div class="empty-state" style="padding:16px 8px;">
                <div class="empty-state-desc" style="font-size:0.82rem;">
                    Nenhum item inserido ainda. Selecione Grupo, Categoria e
                    Preparação acima e clique em "Inserir Item na Receita".
                </div>
            </div>`;
    return;
  }

  const rows = [];
  ingredientesReceitaAtual.forEach((ing, idx) => {
    const item = capitacaoItens.find((i) => i.id === ing.id);
    const nomeDisplay = item ? item.nome : `ID ${ing.id} (item não encontrado)`;
    const metaDisplay = item
      ? `${item.grupo} &rsaquo; ${item.categoria} &rsaquo; ${item.preparacao}`
      : "";
    const div = document.createElement("div");
    div.className = "ingrediente-row";
    div.style.cssText =
      "display:grid;grid-template-columns:1fr auto auto;gap:10px;align-items:center;margin-bottom:8px;padding:10px 12px;background:var(--gray-50);border-radius:10px;";
    div.innerHTML = `
            <div>
                <div style="font-weight:600;color:var(--gray-800);font-size:0.88rem;">${nomeDisplay}</div>
                <div style="font-size:0.76rem;color:var(--gray-500);">${metaDisplay}</div>
            </div>
            <div style="font-size:0.85rem;color:var(--gray-600);font-weight:600;">${ing.un}</div>
            <button type="button" class="btn btn-danger btn-sm" onclick="removerItemDaReceita(${idx})" title="Remover item">
                <i class="fas fa-times"></i>
            </button>
        `;
    container.appendChild(div);
    rows.push(div);
  });

  staggerAnimate(rows, 30);
}

// Remove um item já inserido na lista de ingredientes da receita
function removerItemDaReceita(idx) {
  ingredientesReceitaAtual.splice(idx, 1);
  renderizarIngredientesReceitaAtual();
}

function salvarReceita() {
  const nome = document.getElementById("receitaNome").value.trim();
  const preparo = document.getElementById("receitaPreparo").value.trim();

  if (!nome) {
    showToast("Preencha o nome da receita!", "warning");
    return;
  }

  if (ingredientesReceitaAtual.length === 0) {
    showToast("Insira ao menos um ingrediente na receita!", "warning");
    return;
  }

  const ingredientes = ingredientesReceitaAtual.map((ing) => ({
    id: ing.id,
    un: ing.un,
  }));

  const editId = document.getElementById("editReceitaId").value;

  if (editId) {
    const idx = receitas.findIndex((r) => r.id == editId);
    if (idx !== -1) {
      receitas[idx] = {
        id: parseInt(editId),
        nome,
        preparo,
        ingredientes,
      };
      registrarAtividade(`Receita "${nome}" atualizada`, "edit");
    }
  } else {
    const novoId =
      receitas.length > 0 ? Math.max(...receitas.map((r) => r.id)) + 1 : 1;
    receitas.push({
      id: novoId,
      nome,
      preparo,
      ingredientes,
    });
    registrarAtividade(`Receita "${nome}" adicionada`, "add");
  }

  salvarLocal();
  renderizarReceitas();
  carregarCalcReceitas();
  closeModal("receitaModal");
  showToast("Receita salva com sucesso!", "success");
}

function editarReceita(id) {
  const rec = receitas.find((r) => r.id === id);
  if (!rec) return;

  document.getElementById("editReceitaId").value = rec.id;
  document.getElementById("receitaNome").value = rec.nome;
  document.getElementById("receitaPreparo").value = rec.preparo || "";
  document.getElementById("modalReceitaTitle").textContent = "Editar Receita";

  document.getElementById("receitaGrupo").value = "";
  document.getElementById("receitaCategoria").value = "";
  document.getElementById("receitaPreparacao").value = "";
  const unidadeInput = document.getElementById("receitaIngUnidade");
  if (unidadeInput) unidadeInput.value = "kg";

  ingredientesReceitaAtual = rec.ingredientes
    ? rec.ingredientes.map((ing) => ({ id: ing.id, un: ing.un || "kg" }))
    : [];
  renderizarIngredientesReceitaAtual();

  openModal("receitaModal");
}

function excluirReceita(id) {
  const rec = receitas.find((r) => r.id === id);
  if (!rec) return;
  if (!confirm(`Tem certeza que deseja excluir a receita "${rec.nome}"?`))
    return;

  receitas = receitas.filter((r) => r.id !== id);
  salvarLocal();
  renderizarReceitas();
  carregarCalcReceitas();
  registrarAtividade(`Receita "${rec.nome}" excluída`, "delete");
  showToast("Receita excluída!", "info");
}

// ===== CALCULADORA: POR ITEM =====
function carregarCalcItens() {
  const sel = document.getElementById("calcItem");
  sel.innerHTML = '<option value="">-- Selecione um item --</option>';

  if (capitacaoItens.length === 0) {
    sel.innerHTML +=
      '<option value="" disabled>Nenhum item cadastrado</option>';
    sel.disabled = true;
    return;
  }

  sel.disabled = false;
  capitacaoItens
    .sort(
      (a, b) =>
        a.grupo.localeCompare(b.grupo) ||
        a.categoria.localeCompare(b.categoria) ||
        a.nome.localeCompare(b.nome),
    )
    .forEach((i) => {
      const opt = document.createElement("option");
      opt.value = i.id;
      const nomeDisplay = i.nome || i.preparacao;
      const prepDisplay = i.preparacao || i.nome;
      opt.textContent = `${i.grupo} > ${i.categoria} > ${nomeDisplay} (${prepDisplay})`;
      sel.appendChild(opt);
    });
}

function atualizarCalcInfo() {
  calcularReceita();
}

function calcularReceita() {
  const itemId = parseInt(document.getElementById("calcItem").value);
  const pessoas = parseInt(document.getElementById("calcPessoas").value) || 1;
  const tipo = document.querySelector('input[name="calcTipo"]:checked').value;

  if (!itemId) {
    document.getElementById("calcResult").style.display = "none";
    return;
  }

  const item = capitacaoItens.find((i) => i.id === itemId);
  if (!item) return;

  let capitacao = item.capitacao_media;
  if (tipo === "minima") capitacao = item.capitacao_minima;
  if (tipo === "maxima") capitacao = item.capitacao_maxima;

  const totalKg = (capitacao * pessoas) / 1000;
  const nomeDisplay = item.nome || item.preparacao;

  document.getElementById("resItem").textContent =
    `${item.categoria} - ${nomeDisplay}`;
  document.getElementById("resGrupo").textContent =
    `${item.grupo} / ${item.categoria}`;
  document.getElementById("resPreparacao").textContent = nomeDisplay;
  document.getElementById("resPessoas").textContent = pessoas;
  document.getElementById("resCapitacao").textContent =
    `${capitacao.toFixed(1)} g`;
  document.getElementById("resTotal").textContent =
    `${totalKg.toFixed(2)} kg (${(totalKg * 1000).toFixed(0)} g)`;

  const result = document.getElementById("calcResult");
  result.style.display = "block";
  animateEntry(result, 80);
}

function adicionarAoPlano() {
  const itemId = parseInt(document.getElementById("calcItem").value);
  const pessoas = parseInt(document.getElementById("calcPessoas").value) || 1;
  const tipo = document.querySelector('input[name="calcTipo"]:checked').value;

  if (!itemId) {
    showToast("Selecione um item primeiro", "warning");
    return;
  }

  const item = capitacaoItens.find((i) => i.id === itemId);
  if (!item) return;

  let capitacao = item.capitacao_media;
  if (tipo === "minima") capitacao = item.capitacao_minima;
  if (tipo === "maxima") capitacao = item.capitacao_maxima;

  const totalKg = (capitacao * pessoas) / 1000;

  planoCaptacao.push({
    id: Date.now(),
    itemId: item.id,
    grupo: item.grupo,
    categoria: item.categoria,
    preparacao: item.nome || item.preparacao,
    pessoas: pessoas,
    tipo: tipo,
    capitacao: capitacao,
    totalKg: totalKg,
  });

  salvarLocal();
  renderizarPlano();
  registrarAtividade(
    `Cálculo adicionado ao plano: ${item.nome || item.preparacao}`,
    "calc",
  );
  showToast("Adicionado ao plano de captação!", "success");
}

// ===== CALCULADORA: POR RECEITA =====
let todasAsReceitasOptions = [];
let autocompleteIndex = -1;

function carregarCalcReceitas() {
  const sel = document.getElementById("calcReceitaSelect");
  const searchInput = document.getElementById("calcReceitaSearch");
  const emptyMsg = document.getElementById("calcReceitaEmptyMsg");
  const dropdown = document.getElementById("calcReceitaDropdown");

  if (!sel) return;

  sel.innerHTML = '<option value="">-- Selecione uma receita --</option>';
  todasAsReceitasOptions = [];
  if (dropdown) dropdown.classList.remove("active");

  if (!receitas || receitas.length === 0) {
    sel.innerHTML +=
      '<option value="" disabled>Nenhuma receita cadastrada</option>';
    sel.disabled = true;
    if (searchInput) searchInput.disabled = true;
    if (emptyMsg) emptyMsg.style.display = "block";
    return;
  }

  if (emptyMsg) emptyMsg.style.display = "none";
  sel.disabled = false;
  if (searchInput) {
    searchInput.disabled = false;
    searchInput.value = "";
  }

  const lista = [...receitas].sort((a, b) =>
    (a.nome || "").localeCompare(b.nome || ""),
  );

  lista.forEach((r) => {
    const opt = document.createElement("option");
    opt.value = r.id;
    opt.textContent = r.nome;
    const searchData = `${r.nome || ""}`.toLowerCase();
    const numIngredientes = (r.ingredientes || []).length;
    todasAsReceitasOptions.push({
      value: String(r.id),
      text: opt.textContent,
      search: searchData,
      nome: r.nome,
      numIngredientes,
    });
    sel.appendChild(opt);
  });
}

function normalizarTexto(str) {
  if (!str) return "";
  try {
    return String(str)
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
  } catch (e) {
    return String(str).toLowerCase();
  }
}

function textoCorrespondeBusca(searchText, termos) {
  if (!termos || termos.length === 0) return true;
  const st = normalizarTexto(searchText);
  return termos.every((t) => st.includes(t));
}

function abrirAutocompleteDropdown(resultados) {
  const dropdown = document.getElementById("calcReceitaDropdown");
  if (!dropdown) return;
  dropdown.innerHTML = "";
  autocompleteIndex = -1;

  if (resultados.length === 0) {
    dropdown.innerHTML =
      '<div class="autocomplete-no-results">Nenhuma receita encontrada</div>';
    dropdown.classList.add("active");
    return;
  }

  resultados.forEach((item, idx) => {
    const div = document.createElement("div");
    div.className = "autocomplete-item";
    div.dataset.index = idx;
    div.dataset.value = item.value;
    div.innerHTML = `<span>${item.nome}</span><span class="ac-grupo">${item.numIngredientes || 0} ingrediente(s)</span>`;
    div.addEventListener("click", () => {
      selecionarReceitaAutocomplete(item.value, item.nome);
    });
    dropdown.appendChild(div);
  });

  dropdown.classList.add("active");
}

function fecharAutocompleteDropdown() {
  const dropdown = document.getElementById("calcReceitaDropdown");
  if (dropdown) dropdown.classList.remove("active");
  autocompleteIndex = -1;
}

function selecionarReceitaAutocomplete(valor, nome) {
  const sel = document.getElementById("calcReceitaSelect");
  const searchInput = document.getElementById("calcReceitaSearch");
  if (sel) sel.value = valor;
  if (searchInput) {
    searchInput.value = nome;
    searchInput.classList.add("input-selected");
    setTimeout(() => searchInput.classList.remove("input-selected"), 900);
  }
  fecharAutocompleteDropdown();
  atualizarCalcReceitaInfo();
}

function filtrarCalcReceitas(texto) {
  const sel = document.getElementById("calcReceitaSelect");
  const emptyMsg = document.getElementById("calcReceitaEmptyMsg");
  const dropdown = document.getElementById("calcReceitaDropdown");
  if (!sel) return;

  const valorAtual = sel.value;
  sel.innerHTML = '<option value="">-- Selecione uma receita --</option>';

  let visiveis = 0;
  const resultadosAutocomplete = [];

  if (!todasAsReceitasOptions || todasAsReceitasOptions.length === 0) {
    if (emptyMsg) emptyMsg.style.display = "block";
    if (dropdown) dropdown.classList.remove("active");
    return;
  }

  const termos = normalizarTexto(texto)
    .split(/\s+/)
    .filter((t) => t.length > 0);

  todasAsReceitasOptions.forEach((optData) => {
    if (textoCorrespondeBusca(optData.search, termos)) {
      const opt = document.createElement("option");
      opt.value = optData.value;
      opt.textContent = optData.text;
      sel.appendChild(opt);
      visiveis++;
      resultadosAutocomplete.push(optData);
    }
  });

  if (dropdown) {
    if (texto && texto.trim().length > 0) {
      abrirAutocompleteDropdown(resultadosAutocomplete);
    } else {
      dropdown.classList.remove("active");
    }
  }

  if (termos.length > 0 && visiveis === 0) {
    const placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.disabled = true;
    placeholder.textContent = 'Nenhuma receita encontrada para "' + texto + '"';
    sel.appendChild(placeholder);
    if (emptyMsg) emptyMsg.style.display = "block";
  } else {
    if (emptyMsg) emptyMsg.style.display = "none";
    if (valorAtual) {
      const aindaExiste = Array.from(sel.options).some(
        (o) => o.value === valorAtual,
      );
      if (aindaExiste) sel.value = valorAtual;
    }
  }
}

function navegarAutocomplete(direcao) {
  const dropdown = document.getElementById("calcReceitaDropdown");
  if (!dropdown || !dropdown.classList.contains("active")) return;
  const items = dropdown.querySelectorAll(".autocomplete-item");
  if (items.length === 0) return;

  if (autocompleteIndex >= 0)
    items[autocompleteIndex].classList.remove("selected");

  autocompleteIndex += direcao;
  if (autocompleteIndex < 0) autocompleteIndex = items.length - 1;
  if (autocompleteIndex >= items.length) autocompleteIndex = 0;

  items[autocompleteIndex].classList.add("selected");
  items[autocompleteIndex].scrollIntoView({ block: "nearest" });
}

function confirmarAutocomplete() {
  const dropdown = document.getElementById("calcReceitaDropdown");
  if (!dropdown || !dropdown.classList.contains("active")) return;
  const items = dropdown.querySelectorAll(".autocomplete-item");
  if (autocompleteIndex >= 0 && items[autocompleteIndex]) {
    const valor = items[autocompleteIndex].dataset.value;
    const nome =
      items[autocompleteIndex].querySelector("span")?.textContent || "";
    selecionarReceitaAutocomplete(valor, nome);
  }
}

// ===== AUTOCOMPLETE MODAL RECEITA =====
let acModalIndex = -1;
let acModalTarget = null;

function getGruposUnicos() {
  const grupos = new Set();
  if (typeof capitacaoItens !== "undefined") {
    capitacaoItens.forEach((i) => {
      if (i.grupo) grupos.add(i.grupo);
    });
  }
  return Array.from(grupos).sort();
}

function getCategoriasPorGrupo(grupo) {
  const cats = new Set();
  if (!grupo) return [];
  const g = grupo.trim().toLowerCase();
  if (typeof capitacaoItens !== "undefined") {
    capitacaoItens.forEach((i) => {
      if (i.grupo && i.grupo.toLowerCase() === g && i.categoria)
        cats.add(i.categoria);
    });
  }
  return Array.from(cats).sort();
}

function getPreparacoesPorCategoria(grupo, categoria) {
  const preps = new Set();
  if (!grupo || !categoria) return [];
  const g = grupo.trim().toLowerCase();
  const c = categoria.trim().toLowerCase();
  if (typeof capitacaoItens !== "undefined") {
    capitacaoItens.forEach((i) => {
      if (
        i.grupo &&
        i.grupo.toLowerCase() === g &&
        i.categoria &&
        i.categoria.toLowerCase() === c &&
        i.preparacao
      ) {
        preps.add(i.preparacao);
      }
    });
  }
  return Array.from(preps).sort();
}

function abrirDropdownModal(dropdownId, opcoes, inputId, onSelect) {
  const dropdown = document.getElementById(dropdownId);
  if (!dropdown) return;
  dropdown.innerHTML = "";
  acModalIndex = -1;

  if (opcoes.length === 0) {
    dropdown.innerHTML =
      '<div class="autocomplete-no-results">Nenhum resultado encontrado</div>';
    dropdown.classList.add("active");
    return;
  }

  opcoes.forEach((texto, idx) => {
    const div = document.createElement("div");
    div.className = "autocomplete-item";
    div.dataset.index = idx;
    div.textContent = texto;
    const selecionarItem = (e) => {
      if (e) e.preventDefault();
      const input = document.getElementById(inputId);
      if (input) input.value = texto;
      dropdown.classList.remove("active");
      acModalIndex = -1;
      if (onSelect) onSelect(texto);
    };
    div.addEventListener("mousedown", selecionarItem);
    div.addEventListener("touchstart", selecionarItem, { passive: false });
    dropdown.appendChild(div);
  });

  dropdown.classList.add("active");
}

function fecharDropdownModal(dropdownId) {
  const dropdown = document.getElementById(dropdownId);
  if (dropdown) dropdown.classList.remove("active");
  acModalIndex = -1;
}

function navegarDropdownModal(dropdownId, direcao) {
  const dropdown = document.getElementById(dropdownId);
  if (!dropdown || !dropdown.classList.contains("active")) return;
  const items = dropdown.querySelectorAll(".autocomplete-item");
  if (items.length === 0) return;

  if (acModalIndex >= 0 && items[acModalIndex])
    items[acModalIndex].classList.remove("selected");
  acModalIndex += direcao;
  if (acModalIndex < 0) acModalIndex = items.length - 1;
  if (acModalIndex >= items.length) acModalIndex = 0;

  items[acModalIndex].classList.add("selected");
  items[acModalIndex].scrollIntoView({ block: "nearest" });
}

function confirmarDropdownModal(dropdownId, inputId, onSelect) {
  const dropdown = document.getElementById(dropdownId);
  if (!dropdown || !dropdown.classList.contains("active")) return;
  const items = dropdown.querySelectorAll(".autocomplete-item");
  if (acModalIndex >= 0 && items[acModalIndex]) {
    const texto = items[acModalIndex].textContent;
    const input = document.getElementById(inputId);
    if (input) input.value = texto;
    dropdown.classList.remove("active");
    acModalIndex = -1;
    if (onSelect) onSelect(texto);
  }
}

function filtrarDropdownModal(inputId, dropdownId, opcoesBase, onSelect) {
  const input = document.getElementById(inputId);
  if (!input) return;
  const texto = input.value.trim().toLowerCase();
  const filtradas = opcoesBase.filter((o) => o.toLowerCase().includes(texto));
  abrirDropdownModal(dropdownId, filtradas, inputId, onSelect);
}

function atualizarCalcReceitaInfo() {
  calcularReceitaCompleta();
}

function calcularReceitaCompleta() {
  const receitaId = parseInt(
    document.getElementById("calcReceitaSelect").value,
  );
  const pessoas =
    parseInt(document.getElementById("calcReceitaPessoas").value) || 1;
  const tipoEl = document.querySelector(
    'input[name="calcReceitaTipo"]:checked',
  );
  const tipo = tipoEl ? tipoEl.value : "media";
  const pane = document.getElementById("calcReceitaResult");
  const container = document.getElementById("receitaIngredientesResult");

  if (!receitaId) {
    pane.style.display = "none";
    return;
  }

  const rec = receitas.find((r) => r.id === receitaId);
  if (!rec) return;

  let html = "";
  let custoTotal = 0;
  let pesoTotal = 0;
  const ingredientesFaltantes = [];

  if (rec.ingredientes && rec.ingredientes.length > 0) {
    rec.ingredientes.forEach((ing) => {
      const item = capitacaoItens.find((i) => i.id === ing.id);
      if (item) {
        let capitacao = item.capitacao_media;
        if (tipo === "minima") capitacao = item.capitacao_minima;
        if (tipo === "maxima") capitacao = item.capitacao_maxima;
        const qtdG = capitacao * pessoas;
        const qtdKg = qtdG / 1000;
        const custo = item.custoUnitario * qtdKg;
        custoTotal += custo;
        pesoTotal += qtdKg;
        html += `<div class="receita-ingrediente-result">
                    <div class="ing-info">
                        <div class="ing-name">${item.nome}</div>
                        <div class="ing-meta">${formatarNumeroMemo(capitacao)} g/pessoa &times; ${pessoas} pessoas</div>
                    </div>
                    <div class="ing-total">${formatarNumeroMemo(qtdKg)} kg = ${formatarMoedaMemo(custo)}</div>
                </div>`;
      } else {
        ingredientesFaltantes.push(ing.nome || `ID ${ing.id}`);
      }
    });
  }

  if (ingredientesFaltantes.length > 0) {
    html += `<div class="receita-ingrediente-result" style="background:rgba(234,67,53,0.08);border-left:3px solid var(--danger)">
            <div class="ing-info">
                <div class="ing-name" style="color:var(--danger)">⚠️ Ingredientes não encontrados</div>
                <div class="ing-meta">${ingredientesFaltantes.join(", ")}</div>
            </div>
        </div>`;
    showToast(
      `Alguns ingredientes desta receita não foram encontrados: ${ingredientesFaltantes.join(", ")}. Importe os dados ou recrie os itens.`,
      "warning",
    );
  }

  const tipoLabel =
    tipo === "minima" ? "Mínima" : tipo === "maxima" ? "Máxima" : "Média";
  html += `<div class="receita-total-row">
        <span>Custo Total (${pessoas} pessoas, Capitação ${tipoLabel}) — ${formatarNumeroMemo(pesoTotal)} kg</span>
        <span>${formatarMoedaMemo(custoTotal)}</span>
    </div>`;

  container.innerHTML = html;
  pane.style.display = "block";
  animateEntry(pane, 60);
}

function adicionarReceitaAoPlano() {
  const receitaId = parseInt(
    document.getElementById("calcReceitaSelect").value,
  );
  const pessoas =
    parseInt(document.getElementById("calcReceitaPessoas").value) || 1;
  const tipoEl = document.querySelector(
    'input[name="calcReceitaTipo"]:checked',
  );
  const tipo = tipoEl ? tipoEl.value : "media";
  if (!receitaId) {
    showToast("Selecione uma receita", "warning");
    return;
  }

  const rec = receitas.find((r) => r.id === receitaId);
  if (!rec) return;

  const ingredientesFaltantes = [];
  if (rec.ingredientes && rec.ingredientes.length > 0) {
    rec.ingredientes.forEach((ing) => {
      const item = capitacaoItens.find((i) => i.id === ing.id);
      if (!item) ingredientesFaltantes.push(ing.nome || `ID ${ing.id}`);
    });
  }

  if (ingredientesFaltantes.length > 0) {
    showToast(
      `Não é possível adicionar: ingredientes ausentes (${ingredientesFaltantes.join(", ")}). Importe os dados ou recrie os itens.`,
      "warning",
    );
    return;
  }

  if (rec.ingredientes && rec.ingredientes.length > 0) {
    const loteId = Date.now() + Math.random();
    rec.ingredientes.forEach((ing) => {
      const item = capitacaoItens.find((i) => i.id === ing.id);
      if (item) {
        let capitacao = item.capitacao_media;
        if (tipo === "minima") capitacao = item.capitacao_minima;
        if (tipo === "maxima") capitacao = item.capitacao_maxima;
        const totalKg =
          Math.round(((capitacao * pessoas) / 1000) * 1000) / 1000;
        planoCaptacao.push({
          id: Date.now() + Math.random(),
          itemId: item.id,
          grupo: item.grupo,
          categoria: item.categoria,
          preparacao: item.nome,
          pessoas: pessoas,
          tipo: "receita_" + tipo,
          capitacao: capitacao,
          totalKg: totalKg,
          receitaId: rec.id,
          receitaNome: rec.nome,
          receitaPreparo: rec.preparo || "",
          loteId: loteId,
        });
      }
    });
    salvarLocal();
    renderizarPlano();
    dashboardDirty = true;
    registrarAtividade(
      `Receita "${rec.nome}" (${pessoas} pessoas) adicionada ao plano`,
      "add",
    );
    showToast("Receita adicionada ao plano de captação!", "success");
  }
}

// ===== HISTÓRICO DE CÁLCULOS =====
function salvarHistoricoItem() {
  const itemId = parseInt(document.getElementById("calcItem").value);
  const pessoas = parseInt(document.getElementById("calcPessoas").value) || 1;
  const tipo = document.querySelector('input[name="calcTipo"]:checked').value;

  if (!itemId) {
    showToast("Faça um cálculo primeiro", "warning");
    return;
  }

  const item = capitacaoItens.find((i) => i.id === itemId);
  if (!item) return;

  let capitacao = item.capitacao_media;
  if (tipo === "minima") capitacao = item.capitacao_minima;
  if (tipo === "maxima") capitacao = item.capitacao_maxima;
  const totalKg = (capitacao * pessoas) / 1000;

  const historico = {
    id: Date.now(),
    tipo: "item",
    nome: item.nome || item.preparacao,
    itemId: item.id,
    pessoas: pessoas,
    tipoCalculo: tipo,
    resultado: totalKg,
    unidade: "kg",
    data: new Date().toISOString(),
  };

  historicoCalculos.unshift(historico);
  if (historicoCalculos.length > 50)
    historicoCalculos = historicoCalculos.slice(0, 50);
  salvarLocal();
  renderizarHistorico();
  showToast("Cálculo salvo no histórico!", "success");
}

function salvarHistoricoReceita() {
  const receitaId = parseInt(
    document.getElementById("calcReceitaSelect").value,
  );
  const pessoas =
    parseInt(document.getElementById("calcReceitaPessoas").value) || 1;
  const tipoEl = document.querySelector(
    'input[name="calcReceitaTipo"]:checked',
  );
  const tipo = tipoEl ? tipoEl.value : "media";

  if (!receitaId) {
    showToast("Faça um cálculo de receita primeiro", "warning");
    return;
  }

  const rec = receitas.find((r) => r.id === receitaId);
  if (!rec) return;

  let custoTotal = 0;
  let pesoTotal = 0;
  if (rec.ingredientes) {
    rec.ingredientes.forEach((ing) => {
      const item = capitacaoItens.find((i) => i.id === ing.id);
      if (item) {
        let capitacao = item.capitacao_media;
        if (tipo === "minima") capitacao = item.capitacao_minima;
        if (tipo === "maxima") capitacao = item.capitacao_maxima;
        const qtdKg = (capitacao * pessoas) / 1000;
        custoTotal += item.custoUnitario * qtdKg;
        pesoTotal += qtdKg;
      }
    });
  }

  const historico = {
    id: Date.now(),
    tipo: "receita",
    nome: rec.nome,
    receitaId: rec.id,
    pessoas: pessoas,
    tipoCalculo: tipo,
    resultado: custoTotal,
    resultadoPeso: pesoTotal,
    unidade: "€",
    data: new Date().toISOString(),
  };

  historicoCalculos.unshift(historico);
  if (historicoCalculos.length > 50)
    historicoCalculos = historicoCalculos.slice(0, 50);
  salvarLocal();
  renderizarHistorico();
  showToast("Cálculo de receita salvo no histórico!", "success");
}

function renderizarHistorico() {
  const container = document.getElementById("historicoList");
  if (!container) return;

  if (historicoCalculos.length === 0) {
    container.innerHTML = `
            <div class="empty-state" style="padding:32px 16px;">
                <div class="empty-state-icon"><i class="fas fa-history"></i></div>
                <div class="empty-state-title">Nenhum cálculo salvo</div>
                <div class="empty-state-desc">Os cálculos realizados aparecerão aqui automaticamente.</div>
            </div>`;
    return;
  }

  container.innerHTML = "";
  const items = [];
  const fragment = document.createDocumentFragment();
  historicoCalculos.forEach((h) => {
    const data = new Date(h.data);
    const dataStr =
      data.toLocaleDateString("pt-BR") +
      " " +
      data.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
    const tipoLabel =
      h.tipoCalculo === "minima"
        ? "Mín"
        : h.tipoCalculo === "maxima"
          ? "Máx"
          : "Méd";
    const icon = h.tipo === "receita" ? "fa-book-open" : "fa-weight-hanging";
    const valorDisplay =
      h.tipo === "receita"
        ? `${formatarMoedaMemo(h.resultado)} / ${formatarNumeroMemo(h.resultadoPeso)} kg`
        : `${formatarNumeroMemo(h.resultado)} kg`;

    const div = document.createElement("div");
    div.className = "historico-item";
    div.dataset.id = h.id;
    div.innerHTML = `
            <div class="historico-item-info">
                <div class="historico-item-title"><i class="fas ${icon}" style="color:var(--primary);margin-right:6px;"></i>${h.nome}</div>
                <div class="historico-item-meta">${h.pessoas} pessoas &middot; ${tipoLabel} &middot; ${dataStr}</div>
            </div>
            <div class="historico-item-value">${valorDisplay}</div>
            <div class="historico-item-actions">
                <button class="btn-action" data-action="restaurar" title="Restaurar cálculo"><i class="fas fa-reply"></i></button>
                <button class="btn-action delete" data-action="remover-historico" title="Remover do histórico"><i class="fas fa-times"></i></button>
            </div>
        `;
    items.push(div);
    fragment.appendChild(div);
  });

  container.appendChild(fragment);
  staggerAnimate(items, 30);
}

function restaurarHistorico(id) {
  const h = historicoCalculos.find((x) => x.id === id);
  if (!h) return;

  if (h.tipo === "item") {
    document.getElementById("calcItem").value = h.itemId;
    document.getElementById("calcPessoas").value = h.pessoas;
    document.querySelectorAll('input[name="calcTipo"]').forEach((r) => {
      r.checked = r.value === h.tipoCalculo;
    });
    calcularReceita();
    showToast("Cálculo de item restaurado!", "info");
  } else {
    document.getElementById("calcReceitaSelect").value = h.receitaId;
    document.getElementById("calcReceitaPessoas").value = h.pessoas;
    document.querySelectorAll('input[name="calcReceitaTipo"]').forEach((r) => {
      r.checked = r.value === h.tipoCalculo;
    });
    calcularReceitaCompleta();
    showToast("Cálculo de receita restaurado!", "info");
  }
}

function removerHistoricoItem(id) {
  historicoCalculos = historicoCalculos.filter((h) => h.id !== id);
  salvarLocal();
  renderizarHistorico();
  showToast("Item removido do histórico", "info");
}

function limparHistorico() {
  if (historicoCalculos.length === 0) return;
  if (!confirm("Tem certeza que deseja limpar todo o histórico de cálculos?"))
    return;
  historicoCalculos = [];
  salvarLocal();
  renderizarHistorico();
  showToast("Histórico limpo!", "info");
}

function limparCalculadoraItem() {
  document.getElementById("calcItem").value = "";
  document.getElementById("calcPessoas").value = "30";
  document.querySelectorAll('input[name="calcTipo"]').forEach((r) => {
    r.checked = r.value === "media";
  });
  document.getElementById("calcResult").style.display = "none";
  showToast("Campos limpos!", "info");
}

function limparCalculadoraReceita() {
  document.getElementById("calcReceitaSearch").value = "";
  document.getElementById("calcReceitaSelect").value = "";
  document.getElementById("calcReceitaPessoas").value = "30";
  document.querySelectorAll('input[name="calcReceitaTipo"]').forEach((r) => {
    r.checked = r.value === "media";
  });
  document.getElementById("calcReceitaResult").style.display = "none";
  carregarCalcReceitas();
  showToast("Campos limpos!", "info");
}

function carregarHistorico() {
  const dados = localStorage.getItem("capitacao_historico");
  if (dados) historicoCalculos = JSON.parse(dados);
}

// ===== PLANO =====
function renderizarPlano() {
  const list = document.getElementById("planoList");
  const totalDiv = document.getElementById("planoTotal");

  if (planoCaptacao.length === 0) {
    list.innerHTML = `
            <div class="empty-state" style="padding:32px 16px;">
                <div class="empty-state-icon"><i class="fas fa-clipboard-list"></i></div>
                <div class="empty-state-title">Plano vazio</div>
                <div class="empty-state-desc">Adicione itens ou receitas à calculadora e envie para o plano.</div>
            </div>`;
    totalDiv.style.display = "none";
    return;
  }

  list.innerHTML = "";
  let totalGeral = 0;
  const blocks = [];
  const loteIdsProcessados = new Set();

  planoCaptacao.forEach((p) => {
    totalGeral += p.totalKg;

    if (p.loteId) {
      const loteKey = String(p.loteId);
      if (loteIdsProcessados.has(loteKey)) return;
      loteIdsProcessados.add(loteKey);

      const itensDoGrupo = planoCaptacao.filter(
        (x) => String(x.loteId) === loteKey,
      );
      const subtotal = itensDoGrupo.reduce((acc, x) => acc + x.totalKg, 0);
      blocks.push(criarBlocoReceitaPlano(p, itensDoGrupo, subtotal));
    } else {
      blocks.push(criarLinhaItemPlano(p));
    }
  });

  const fragment = document.createDocumentFragment();
  blocks.forEach((d) => fragment.appendChild(d));
  list.appendChild(fragment);
  staggerAnimate(blocks, 30);

  document.getElementById("totalItensPlano").textContent = planoCaptacao.length;
  document.getElementById("totalGeralPlano").textContent =
    totalGeral.toFixed(2) + " kg";
  totalDiv.style.display = "block";
  animateEntry(totalDiv, blocks.length * 30 + 50);
}

// Linha de um item avulso adicionado pela calculadora "Por Item"
function criarLinhaItemPlano(p) {
  const tipoLabel =
    p.tipo === "minima" ? "Mín" : p.tipo === "maxima" ? "Máx" : "Méd";
  const div = document.createElement("div");
  div.className = "plano-item";
  div.dataset.id = p.id;
  div.innerHTML = `
            <div class="plano-item-info">
                <div class="plano-item-name">${p.categoria} - ${p.preparacao}</div>
                <div class="plano-item-meta">${p.grupo} | ${p.pessoas} pessoas | ${tipoLabel}</div>
            </div>
            <div class="plano-item-value">${p.totalKg.toFixed(2)} kg</div>
            <button class="btn-action delete" data-action="remove-plano" title="Remover do plano">
                <i class="fas fa-times"></i>
            </button>
        `;
  return div;
}

// Bloco de uma receita inteira adicionada ao plano: nome no topo,
// modo de preparo (se houver) e a lista dos ingredientes da receita
function criarBlocoReceitaPlano(pRef, itens, subtotal) {
  const tipoLabel =
    pRef.tipo === "receita_minima"
      ? "Mín"
      : pRef.tipo === "receita_maxima"
        ? "Máx"
        : "Méd";
  const temPreparo =
    pRef.receitaPreparo && pRef.receitaPreparo.trim().length > 0;
  const preparoId = "planoPreparo_" + String(pRef.loteId).replace(/\./g, "_");

  const wrapper = document.createElement("div");
  wrapper.className = "plano-receita-group";
  wrapper.dataset.loteId = pRef.loteId;
  wrapper.style.cssText =
    "margin-bottom:16px;padding:14px 16px;background:var(--gray-50);border-radius:var(--radius);border:1px solid var(--gray-100);";

  let html = `
        <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px;margin-bottom:10px;flex-wrap:wrap;">
            <div>
                <div style="font-weight:700;font-size:1.02rem;color:var(--gray-800);font-family:'Plus Jakarta Sans',sans-serif;">
                    <i class="fas fa-utensils" style="color:var(--primary);margin-right:6px;"></i>${pRef.receitaNome || "Receita"}
                </div>
                <div class="plano-item-meta" style="margin-top:4px;">${pRef.pessoas} pessoas | Capitação ${tipoLabel} | ${itens.length} ingrediente(s)</div>
            </div>
            <div style="display:flex;align-items:center;gap:10px;">
                <div class="plano-item-value">${subtotal.toFixed(2)} kg</div>
                <button class="btn-action delete" data-action="remove-plano-lote" title="Remover receita do plano">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        </div>
    `;

  if (temPreparo) {
    html += `
        <button
            type="button"
            class="btn btn-secondary btn-sm"
            onclick="const el=document.getElementById('${preparoId}'); el.style.display = el.style.display === 'none' ? 'block' : 'none';"
            style="font-size:0.78rem;padding:5px 10px;margin-bottom:10px;"
        >
            <i class="fas fa-book-open"></i> Ver modo de preparo
        </button>
        <div
            id="${preparoId}"
            style="display:none;white-space:pre-wrap;font-size:0.85rem;line-height:1.5;color:var(--gray-600);background:#fff;border:1px solid var(--gray-100);border-radius:8px;padding:10px 12px;margin-bottom:12px;"
        >${pRef.receitaPreparo}</div>
    `;
  }

  itens.forEach((ing) => {
    html += `
        <div class="plano-item" style="background:#fff;" data-id="${ing.id}">
            <div class="plano-item-info">
                <div class="plano-item-name">${ing.categoria} - ${ing.preparacao}</div>
                <div class="plano-item-meta">${ing.grupo}</div>
            </div>
            <div class="plano-item-value">${ing.totalKg.toFixed(2)} kg</div>
            <button class="btn-action delete" data-action="remove-plano" title="Remover ingrediente">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `;
  });

  wrapper.innerHTML = html;
  return wrapper;
}

function removerDoPlano(id) {
  planoCaptacao = planoCaptacao.filter((p) => p.id !== id);
  salvarLocal();
  renderizarPlano();
}

function removerLoteDoPlano(loteId) {
  const loteKey = String(loteId);
  const ref = planoCaptacao.find((p) => String(p.loteId) === loteKey);
  const nome = ref ? ref.receitaNome : "receita";
  if (!confirm(`Remover toda a receita "${nome}" do plano?`)) return;
  planoCaptacao = planoCaptacao.filter((p) => String(p.loteId) !== loteKey);
  salvarLocal();
  renderizarPlano();
  dashboardDirty = true;
  showToast("Receita removida do plano!", "info");
}

function limparPlano() {
  if (planoCaptacao.length === 0) return;
  if (!confirm("Tem certeza que deseja limpar todo o plano?")) return;
  planoCaptacao = [];
  salvarLocal();
  renderizarPlano();
  showToast("Plano limpo!", "info");
}

// ===== EXPORTAR / IMPORTAR =====
function exportarDados() {
  const dados = {
    itens: capitacaoItens,
    receitas: receitas,
    plano: planoCaptacao,
    atividades: atividades,
    historico: historicoCalculos,
    exportado: new Date().toISOString(),
  };
  const blob = new Blob([JSON.stringify(dados, null, 2)], {
    type: "application/json",
  });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "gestao_capitacao_backup.json";
  link.click();
  showToast("Dados exportados!", "success");
}

function importarDados(input) {
  const file = input.files[0];
  if (!file) return;

  showLoading("Importando dados...");
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const dados = JSON.parse(e.target.result);
      if (dados.itens) capitacaoItens = dados.itens;
      if (dados.receitas) receitas = dados.receitas;
      if (dados.plano) planoCaptacao = dados.plano;
      if (dados.atividades) atividades = dados.atividades;
      if (dados.historico) historicoCalculos = dados.historico;

      // --- sanitização cross-browser: remove ingredientes órfãos ---
      const syncResult = sincronizarIngredientesReceitas(true);

      salvarLocal();
      renderizarTabela();
      renderizarDashboard();
      renderizarReceitas();
      renderizarPlano();
      carregarCalcReceitas();
      renderizarHistorico();
      hideLoading();
      if (syncResult.removidos > 0) {
        showToast(`Importado! ${syncResult.removidos} ingrediente(s) órfão(s) removido(s) por incompatibilidade de IDs entre navegadores.`, "warning");
      } else {
        showToast("Dados importados com sucesso!", "success");
      }
    } catch (err) {
      hideLoading();
      showToast("Erro ao importar arquivo!", "error");
    }
  };
  reader.readAsText(file);
  input.value = "";
}

function resetarDados() {
  const senha = prompt(
    "Digite a senha de administrador para resetar os dados:",
  );
  if (senha !== "admin2024") {
    showToast("Senha incorreta. Reset cancelado.", "error");
    return;
  }
  if (
    !confirm(
      "Tem certeza que deseja resetar todos os dados para o estado inicial?\n\nIsso apagará todas as alterações feitas e restaurará os dados de fábrica.",
    )
  ) {
    return;
  }
  showLoading("Resetando dados...");
  localStorage.removeItem("capitacao_itens");
  localStorage.removeItem("capitacao_receitas");
  localStorage.removeItem("capitacao_atividades");
  localStorage.removeItem("capitacao_plano");
  localStorage.removeItem("capitacao_historico");

  capitacaoItens =
    typeof CAPITACAO_DATA !== "undefined"
      ? JSON.parse(JSON.stringify(CAPITACAO_DATA))
      : [];
  receitas =
    typeof RECEITAS_DATA !== "undefined"
      ? JSON.parse(JSON.stringify(RECEITAS_DATA))
      : [];
  atividades = [];
  planoCaptacao = [];
  historicoCalculos = [];

  salvarLocal();
  renderizarTabela();
  renderizarDashboard();
  renderizarReceitas();
  renderizarPlano();
  carregarCalcReceitas();
  renderizarHistorico();
  hideLoading();
  showToast("Dados resetados com sucesso!", "success");
}

// ===== EXPORTAR CALCULOS =====
function exportarCalculo() {
  if (planoCaptacao.length === 0) {
    showToast("Plano vazio. Adicione itens primeiro.", "warning");
    return;
  }

  let csv = "Receita,Grupo,Categoria,Preparacao,Pessoas,Tipo,Capitacao(g),Total(kg)\n";
  planoCaptacao.forEach((p) => {
    csv += `"${p.receitaNome || ""}","${p.grupo}","${p.categoria}","${p.preparacao}",${p.pessoas},${p.tipo},${p.capitacao},${p.totalKg.toFixed(2)}\n`;
  });

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "plano_captacao.csv";
  link.click();
  showToast("Plano exportado!", "success");
}

function exportarCalculoReceita() {
  const receitaId = parseInt(
    document.getElementById("calcReceitaSelect").value,
  );
  if (!receitaId) {
    showToast("Selecione uma receita", "warning");
    return;
  }
  const rec = receitas.find((r) => r.id === receitaId);
  if (!rec) return;
  const pessoas =
    parseInt(document.getElementById("calcReceitaPessoas").value) || 1;
  const tipo =
    document.querySelector('input[name="calcReceitaTipo"]:checked')?.value ||
    "media";
  let csv =
    "Item,Capitacao (g/pessoa),Unidade,Quantidade Ajustada (kg),Custo Unitario,Custo Total\n";
  let custoTotal = 0;
  if (rec.ingredientes) {
    rec.ingredientes.forEach((ing) => {
      const item = capitacaoItens.find((i) => i.id === ing.id);
      if (item) {
        let capitacao = item.capitacao_media;
        if (tipo === "minima") capitacao = item.capitacao_minima;
        if (tipo === "maxima") capitacao = item.capitacao_maxima;
        const qtdKg = (capitacao * pessoas) / 1000;
        const custo = item.custoUnitario * qtdKg;
        custoTotal += custo;
        csv += `"${item.nome}",${capitacao.toFixed(1)},${ing.un || "kg"},${qtdKg.toFixed(3)},${item.custoUnitario},${custo.toFixed(2)}\n`;
      }
    });
  }
  csv += `"TOTAL",,,,,${custoTotal.toFixed(2)}\n`;
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `receita_${rec.nome.replace(/\s+/g, "_")}.csv`;
  link.click();
  showToast("Receita exportada!", "success");
}

function exportarCalculoItemExcel() {
  const itemId = parseInt(document.getElementById("calcItem").value);
  const pessoas = parseInt(document.getElementById("calcPessoas").value) || 1;
  const tipo = document.querySelector('input[name="calcTipo"]:checked').value;
  if (!itemId) {
    showToast("Selecione um item primeiro", "warning");
    return;
  }

  const item = capitacaoItens.find((i) => i.id === itemId);
  if (!item) return;

  let capitacao = item.capitacao_media;
  if (tipo === "minima") capitacao = item.capitacao_minima;
  if (tipo === "maxima") capitacao = item.capitacao_maxima;
  const totalKg = (capitacao * pessoas) / 1000;
  const nomeDisplay = item.nome || item.preparacao;
  const tipoLabel =
    tipo === "minima" ? "Mínima" : tipo === "maxima" ? "Máxima" : "Média";

  let html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/1999/xhtml"><head><meta charset="utf-8"><title>Calculo Item</title></head><body><table border="1">`;
  html += `<tr><th colspan="2" style="background:#134e4a;color:#fff;font-size:16px;">Cálculo de Capitação - ${nomeDisplay}</th></tr>`;
  html += `<tr><td><b>Grupo / Categoria</b></td><td>${item.grupo} / ${item.categoria}</td></tr>`;
  html += `<tr><td><b>Preparação</b></td><td>${nomeDisplay}</td></tr>`;
  html += `<tr><td><b>Número de Pessoas</b></td><td>${pessoas}</td></tr>`;
  html += `<tr><td><b>Tipo de Cálculo</b></td><td>${tipoLabel}</td></tr>`;
  html += `<tr><td><b>Capitação</b></td><td>${capitacao.toFixed(1)} g/pessoa</td></tr>`;
  html += `<tr><td><b>Total Necessário</b></td><td>${totalKg.toFixed(2)} kg</td></tr>`;
  html += `</table></body></html>`;

  const blob = new Blob([html], {
    type: "application/vnd.ms-excel;charset=utf-8;",
  });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `calculo_item_${nomeDisplay.replace(/\s+/g, "_")}.xls`;
  link.click();
  showToast("Excel exportado!", "success");
}

function exportarCalculoItemPDF() {
  const itemId = parseInt(document.getElementById("calcItem").value);
  const pessoas = parseInt(document.getElementById("calcPessoas").value) || 1;
  const tipo = document.querySelector('input[name="calcTipo"]:checked').value;
  if (!itemId) {
    showToast("Selecione um item primeiro", "warning");
    return;
  }

  const item = capitacaoItens.find((i) => i.id === itemId);
  if (!item) return;

  let capitacao = item.capitacao_media;
  if (tipo === "minima") capitacao = item.capitacao_minima;
  if (tipo === "maxima") capitacao = item.capitacao_maxima;
  const totalKg = (capitacao * pessoas) / 1000;
  const nomeDisplay = item.nome || item.preparacao;
  const tipoLabel =
    tipo === "minima" ? "Mínima" : tipo === "maxima" ? "Máxima" : "Média";
  const dataHora = new Date().toLocaleString("pt-PT");

  let html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Calculo Item</title><style>
        body{font-family:Arial,sans-serif;padding:40px;color:#333}
        h2{color:#134e4a;border-bottom:3px solid #134e4a;padding-bottom:10px}
        table{width:100%;border-collapse:collapse;margin-top:20px}
        th,td{padding:12px 15px;text-align:left;border-bottom:1px solid #ddd}
        th{background:#f8fafc;width:40%;font-weight:600}
        .total{background:#134e4a;color:#fff;font-weight:bold}
        .footer{margin-top:30px;font-size:12px;color:#666;text-align:right}
    </style></head><body>`;
  html += `<h2>Cálculo de Capitação</h2>`;
  html += `<table>`;
  html += `<tr><th>Item</th><td>${nomeDisplay}</td></tr>`;
  html += `<tr><th>Grupo / Categoria</th><td>${item.grupo} / ${item.categoria}</td></tr>`;
  html += `<tr><th>Preparação</th><td>${nomeDisplay}</td></tr>`;
  html += `<tr><th>Número de Pessoas</th><td>${pessoas}</td></tr>`;
  html += `<tr><th>Tipo de Cálculo</th><td>${tipoLabel}</td></tr>`;
  html += `<tr><th>Capitação</th><td>${capitacao.toFixed(1)} g/pessoa</td></tr>`;
  html += `<tr class="total"><th>Total Necessário</th><td>${totalKg.toFixed(2)} kg (${(totalKg * 1000).toFixed(0)} g)</td></tr>`;
  html += `</table>`;
  html += `<div class="footer">Exportado em ${dataHora} — Gestão Capitação</div>`;
  html += `</body></html>`;

  const win = window.open("", "_blank");
  win.document.write(html);
  win.document.close();
  setTimeout(() => win.print(), 300);
}

function exportarCalculoReceitaExcel() {
  const receitaId = parseInt(
    document.getElementById("calcReceitaSelect").value,
  );
  if (!receitaId) {
    showToast("Selecione uma receita primeiro", "warning");
    return;
  }
  const rec = receitas.find((r) => r.id === receitaId);
  if (!rec) return;
  const pessoas =
    parseInt(document.getElementById("calcReceitaPessoas").value) || 1;
  const tipoEl = document.querySelector(
    'input[name="calcReceitaTipo"]:checked',
  );
  const tipo = tipoEl ? tipoEl.value : "media";
  const tipoLabel =
    tipo === "minima" ? "Mínima" : tipo === "maxima" ? "Máxima" : "Média";

  let html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/1999/xhtml"><head><meta charset="utf-8"><title>Calculo Receita</title></head><body><table border="1">`;
  html += `<tr><th colspan="5" style="background:#134e4a;color:#fff;font-size:16px;">Cálculo de Receita - ${rec.nome}</th></tr>`;
  html += `<tr><td><b>Número de Pessoas</b></td><td colspan="4">${pessoas}</td></tr>`;
  html += `<tr><td><b>Tipo de Cálculo</b></td><td colspan="4">${tipoLabel}</td></tr>`;
  html += `<tr><th>Item</th><th>Capitação (g/pessoa)</th><th>Quantidade (kg)</th><th>Custo Unitário</th><th>Custo Total</th></tr>`;

  let custoTotal = 0;
  let pesoTotal = 0;
  if (rec.ingredientes && rec.ingredientes.length > 0) {
    rec.ingredientes.forEach((ing) => {
      const item = capitacaoItens.find((i) => i.id === ing.id);
      if (item) {
        let capitacao = item.capitacao_media;
        if (tipo === "minima") capitacao = item.capitacao_minima;
        if (tipo === "maxima") capitacao = item.capitacao_maxima;
        const qtdG = capitacao * pessoas;
        const qtdKg = qtdG / 1000;
        const custo = item.custoUnitario * qtdKg;
        custoTotal += custo;
        pesoTotal += qtdKg;
        html += `<tr><td>${item.nome}</td><td>${capitacao.toFixed(1)}</td><td>${qtdKg.toFixed(2)}</td><td>${item.custoUnitario.toFixed(2)}</td><td>${custo.toFixed(2)}</td></tr>`;
      }
    });
  }
  html += `<tr style="background:#134e4a;color:#fff;font-weight:bold;"><td><b>TOTAL</b></td><td></td><td>${pesoTotal.toFixed(2)} kg</td><td></td><td>${custoTotal.toFixed(2)}</td></tr>`;

  if (rec.preparo && rec.preparo.trim().length > 0) {
    html += `<tr><td colspan="5">&nbsp;</td></tr>`;
    html += `<tr><th colspan="5" style="background:#134e4a;color:#fff;">Modo de Preparo</th></tr>`;
    html += `<tr><td colspan="5" style="white-space:pre-wrap;">${rec.preparo.replace(/\n/g, "<br>")}</td></tr>`;
  }

  html += `</table></body></html>`;

  const blob = new Blob([html], {
    type: "application/vnd.ms-excel;charset=utf-8;",
  });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `calculo_receita_${rec.nome.replace(/\s+/g, "_")}.xls`;
  link.click();
  showToast("Excel exportado!", "success");
}

function exportarCalculoReceitaPDF() {
  const receitaId = parseInt(
    document.getElementById("calcReceitaSelect").value,
  );
  if (!receitaId) {
    showToast("Selecione uma receita primeiro", "warning");
    return;
  }
  const rec = receitas.find((r) => r.id === receitaId);
  if (!rec) return;
  const pessoas =
    parseInt(document.getElementById("calcReceitaPessoas").value) || 1;
  const tipoEl = document.querySelector(
    'input[name="calcReceitaTipo"]:checked',
  );
  const tipo = tipoEl ? tipoEl.value : "media";
  const tipoLabel =
    tipo === "minima" ? "Mínima" : tipo === "maxima" ? "Máxima" : "Média";
  const dataHora = new Date().toLocaleString("pt-PT");

  let html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Calculo Receita</title><style>
        body{font-family:Arial,sans-serif;padding:40px;color:#333}
        h2{color:#134e4a;border-bottom:3px solid #134e4a;padding-bottom:10px}
        .subtitle{color:#64748b;margin-bottom:20px}
        table{width:100%;border-collapse:collapse;margin-top:20px}
        th,td{padding:12px 15px;text-align:left;border-bottom:1px solid #ddd}
        th{background:#f8fafc;font-weight:600}
        tr.total th,tr.total td{background:#134e4a;color:#fff;font-weight:bold;border-bottom:none}
        .footer{margin-top:30px;font-size:12px;color:#666;text-align:right}
    </style></head><body>`;
  html += `<h2>${rec.nome}</h2>`;
  html += `<div class="subtitle">Número de pessoas: ${pessoas} | Tipo de cálculo: ${tipoLabel}</div>`;
  html += `<table><thead><tr><th>Item</th><th>Capitação (g/pessoa)</th><th>Quantidade (kg)</th><th>Custo Unitário</th><th>Custo Total</th></tr></thead><tbody>`;

  let custoTotal = 0;
  let pesoTotal = 0;
  if (rec.ingredientes && rec.ingredientes.length > 0) {
    rec.ingredientes.forEach((ing) => {
      const item = capitacaoItens.find((i) => i.id === ing.id);
      if (item) {
        let capitacao = item.capitacao_media;
        if (tipo === "minima") capitacao = item.capitacao_minima;
        if (tipo === "maxima") capitacao = item.capitacao_maxima;
        const qtdG = capitacao * pessoas;
        const qtdKg = qtdG / 1000;
        const custo = item.custoUnitario * qtdKg;
        custoTotal += custo;
        pesoTotal += qtdKg;
        html += `<tr><td>${item.nome}</td><td>${capitacao.toFixed(1)} g</td><td>${qtdKg.toFixed(2)}</td><td>${item.custoUnitario.toFixed(2)} €</td><td>${custo.toFixed(2)} €</td></tr>`;
      }
    });
  }
  html += `<tr class="total"><th>TOTAL</th><td></td><td>${pesoTotal.toFixed(2)} kg</td><td></td><td>${custoTotal.toFixed(2)} €</td></tr>`;
  html += `</tbody></table>`;

  if (rec.preparo && rec.preparo.trim().length > 0) {
    html += `<div style="margin-top:24px;">
        <h3 style="color:#134e4a;border-bottom:2px solid #134e4a;padding-bottom:8px;">Modo de Preparo</h3>
        <p style="white-space:pre-wrap;line-height:1.6;">${rec.preparo}</p>
    </div>`;
  }

  html += `<div class="footer">Exportado em ${dataHora} — Gestão Capitação</div>`;
  html += `</body></html>`;

  const win = window.open("", "_blank");
  win.document.write(html);
  win.document.close();
  setTimeout(() => win.print(), 300);
}

// ===== DASHBOARD =====
function renderizarDashboard() {
  dashboardDirty = false;
  const grupos = {};
  capitacaoItens.forEach((i) => {
    grupos[i.grupo] = (grupos[i.grupo] || 0) + 1;
  });

  animateCounter(
    document.getElementById("statTotalItens"),
    capitacaoItens.length,
    900,
  );
  animateCounter(
    document.getElementById("statTotalGrupos"),
    Object.keys(grupos).length,
    900,
  );
  animateCounter(
    document.getElementById("statTotalCategorias"),
    [...new Set(capitacaoItens.map((i) => i.categoria))].length,
    900,
  );
  animateCounter(
    document.getElementById("statTotalReceitas"),
    receitas.length,
    900,
  );

  renderizarGrafico(grupos);
  renderizarTop10();
  renderizarAtividades();
}

function renderizarGrafico(grupos) {
  const canvas = document.getElementById("grupoChart");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");

  const labels = Object.keys(grupos);
  const values = Object.values(grupos);
  const colors = [
    "#0d9488",
    "#3b82f6",
    "#f59e0b",
    "#ef4444",
    "#8b5cf6",
    "#10b981",
    "#ec4899",
    "#06b6d4",
  ];

  const dpr = window.devicePixelRatio || 1;
  const logicalWidth = canvas.offsetWidth || 300;
  const logicalHeight = 280;

  canvas.width = logicalWidth * dpr;
  canvas.height = logicalHeight * dpr;
  canvas.style.width = logicalWidth + "px";
  canvas.style.height = logicalHeight + "px";
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, logicalWidth, logicalHeight);

  const padding = 40;
  const chartW = logicalWidth - padding * 2;
  const chartH = logicalHeight - padding * 2 - 30;
  const maxVal = Math.max(...values);
  const barW = (chartW / values.length) * 0.6;
  const gap = (chartW / values.length) * 0.4;

  ctx.strokeStyle = "#e2e8f0";
  ctx.lineWidth = 1;
  for (let i = 0; i <= 5; i++) {
    const y = padding + chartH - (chartH / 5) * i;
    ctx.beginPath();
    ctx.moveTo(padding, y);
    ctx.lineTo(padding + chartW, y);
    ctx.stroke();
    ctx.fillStyle = "#94a3b8";
    ctx.font = "11px Inter, sans-serif";
    ctx.textAlign = "right";
    ctx.fillText(Math.round((maxVal / 5) * i), padding - 6, y + 4);
  }

  values.forEach((val, i) => {
    const x = padding + gap / 2 + i * (barW + gap);
    const h = (val / maxVal) * chartH;
    const y = padding + chartH - h;

    ctx.fillStyle = colors[i % colors.length];
    ctx.beginPath();
    if (ctx.roundRect) {
      ctx.roundRect(x, y, barW, h, 6);
    } else {
      ctx.rect(x, y, barW, h);
    }
    ctx.fill();

    ctx.fillStyle = "#475569";
    ctx.font = "10px Inter, sans-serif";
    ctx.textAlign = "center";
    const labelX = x + barW / 2;
    const labelY = padding + chartH + 16;
    if (logicalWidth < 500 && labels.length > 4) {
      ctx.save();
      ctx.translate(labelX, labelY);
      ctx.rotate(-Math.PI / 3);
      ctx.textAlign = "right";
      ctx.fillText(labels[i].substring(0, 12), 0, 0);
      ctx.restore();
    } else {
      ctx.fillText(labels[i].substring(0, 12), labelX, labelY);
    }
  });
}

function renderizarTop10() {
  const sorted = [...capitacaoItens]
    .sort((a, b) => b.capitacao_media - a.capitacao_media)
    .slice(0, 10);
  const container = document.getElementById("topCaptacao");
  container.innerHTML = "";

  const items = [];
  sorted.forEach((item, idx) => {
    const rankClass =
      idx === 0 ? "gold" : idx === 1 ? "silver" : idx === 2 ? "bronze" : "";
    const nomeDisplay = item.nome || item.preparacao;
    const div = document.createElement("div");
    div.className = "top-item";
    div.innerHTML = `
            <div class="top-rank ${rankClass}">${idx + 1}</div>
            <div class="top-info">
                <div class="name">${nomeDisplay}</div>
                <div class="meta">${item.grupo} &gt; ${item.categoria}</div>
            </div>
            <div class="top-value">${item.capitacao_media.toFixed(1)}g</div>
        `;
    container.appendChild(div);
    items.push(div);
  });

  staggerAnimate(items, 40);
}

// ===== ATIVIDADES =====
function registrarAtividade(texto, tipo) {
  atividades.unshift({
    texto: texto,
    tipo: tipo,
    tempo: new Date().toLocaleString("pt-BR"),
  });
  if (atividades.length > 20) atividades = atividades.slice(0, 20);
  salvarLocalDebounced();
  renderizarAtividades();
}

function renderizarAtividades() {
  const list = document.getElementById("activityList");
  if (atividades.length === 0) {
    list.innerHTML = `
            <div class="empty-state" style="padding:20px 8px;">
                <div class="empty-state-icon" style="width:48px;height:48px;font-size:1.2rem;"><i class="fas fa-clock"></i></div>
                <div class="empty-state-title" style="font-size:0.9rem;">Nenhuma atividade</div>
                <div class="empty-state-desc" style="font-size:0.78rem;">As ações realizadas aparecerão aqui.</div>
            </div>`;
    return;
  }

  list.innerHTML = "";
  const items = [];
  atividades.slice(0, 8).forEach((act) => {
    const icons = {
      add: "fa-plus",
      edit: "fa-edit",
      delete: "fa-trash",
      calc: "fa-calculator",
    };
    const div = document.createElement("div");
    div.className = "activity-item";
    div.innerHTML = `
            <div class="activity-icon ${act.tipo}"><i class="fas ${icons[act.tipo] || "fa-info"}"></i></div>
            <div class="activity-text">${act.texto}</div>
            <div class="activity-time">${act.tempo}</div>
        `;
    list.appendChild(div);
    items.push(div);
  });

  staggerAnimate(items, 35);
}

// ===== MODAL =====
function openModal(id) {
  const modal = document.getElementById(id);
  modal.classList.add("show");
  setTimeout(() => {
    const firstInput = modal.querySelector(
      'input:not([type="hidden"]), select, textarea',
    );
    if (firstInput) firstInput.focus();
  }, 100);
}

function closeModal(id) {
  document.getElementById(id).classList.remove("show");
}

document.querySelectorAll(".modal").forEach((modal) => {
  modal.addEventListener("click", (e) => {
    if (e.target === modal) closeModal(modal.id);
  });
});

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    document
      .querySelectorAll(".modal.show")
      .forEach((modal) => closeModal(modal.id));
  }
});

// ===== TOAST COM BARRA DE PROGRESSO =====
function showToast(msg, tipo) {
  const container = document.getElementById("toastContainer");
  const toast = document.createElement("div");
  toast.className = `toast ${tipo}`;
  const icons = {
    success: "fa-check-circle",
    error: "fa-times-circle",
    info: "fa-info-circle",
    warning: "fa-exclamation-circle",
  };
  toast.innerHTML = `
        <i class="fas ${icons[tipo]}"></i>
        <span>${msg}</span>
        <div class="toast-progress"><div class="toast-progress-bar"></div></div>
    `;
  container.appendChild(toast);

  requestAnimationFrame(() => {
    const bar = toast.querySelector(".toast-progress-bar");
    if (bar) bar.style.width = "0%";
  });

  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translateX(120%) scale(0.95)";
    toast.style.transition = "opacity 0.35s ease, transform 0.35s ease";
    setTimeout(() => toast.remove(), 400);
  }, 3500);
}

// ===== UTILITÁRIOS =====
function formatarNumero(valor) {
  if (valor === undefined || valor === null) return "-";
  return valor.toLocaleString("pt-BR", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 3,
  });
}

function formatarMoeda(valor) {
  if (valor === undefined || valor === null) return "-";
  return (
    "€ " +
    valor.toLocaleString("pt-BR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  );
}

// ===== PESQUISAR CAPTAÇÃO =====
function renderizarPesquisaCaptacao() {
  const selGrupo = document.getElementById("pesquisaGrupo");
  const selCategoria = document.getElementById("pesquisaCategoria");
  const selPreparacao = document.getElementById("pesquisaPreparacao");

  // Guardar valores atuais
  const valGrupo = selGrupo.value;
  const valCategoria = selCategoria.value;
  const valPreparacao = selPreparacao.value;

  // Popular Grupos
  const grupos = [...new Set(capitacaoItens.map(i => i.grupo).filter(Boolean))].sort();
  selGrupo.innerHTML = '<option value="">Todos</option>';
  grupos.forEach(g => {
    const opt = document.createElement("option");
    opt.value = g;
    opt.textContent = g;
    selGrupo.appendChild(opt);
  });
  selGrupo.value = valGrupo;

  // Popular Categorias (filtradas por grupo se selecionado)
  atualizarPesquisaCategorias(false);
  selCategoria.value = valCategoria;

  // Popular Preparações (filtradas)
  atualizarPesquisaPreparacoes(false);
  selPreparacao.value = valPreparacao;

  filtrarPesquisaCaptacao();
}

function atualizarPesquisaCategorias(deveFiltrar = true) {
  const selGrupo = document.getElementById("pesquisaGrupo");
  const selCategoria = document.getElementById("pesquisaCategoria");
  const selPreparacao = document.getElementById("pesquisaPreparacao");
  const grupo = selGrupo.value;

  const itensFiltrados = grupo
    ? capitacaoItens.filter(i => i.grupo === grupo)
    : capitacaoItens;
  const categorias = [...new Set(itensFiltrados.map(i => i.categoria).filter(Boolean))].sort();

  const valAtual = selCategoria.value;
  selCategoria.innerHTML = '<option value="">Todas</option>';
  categorias.forEach(c => {
    const opt = document.createElement("option");
    opt.value = c;
    opt.textContent = c;
    selCategoria.appendChild(opt);
  });

  // Se o valor anterior ainda for válido, mantém; senão reseta
  if (categorias.includes(valAtual)) {
    selCategoria.value = valAtual;
  } else {
    selCategoria.value = "";
    selPreparacao.value = "";
  }

  atualizarPesquisaPreparacoes(false);
  if (deveFiltrar) filtrarPesquisaCaptacao();
}

function atualizarPesquisaPreparacoes(deveFiltrar = true) {
  const selGrupo = document.getElementById("pesquisaGrupo");
  const selCategoria = document.getElementById("pesquisaCategoria");
  const selPreparacao = document.getElementById("pesquisaPreparacao");
  const grupo = selGrupo.value;
  const categoria = selCategoria.value;

  let itensFiltrados = capitacaoItens;
  if (grupo) itensFiltrados = itensFiltrados.filter(i => i.grupo === grupo);
  if (categoria) itensFiltrados = itensFiltrados.filter(i => i.categoria === categoria);

  const preparacoes = [...new Set(itensFiltrados.map(i => i.preparacao || i.nome).filter(Boolean))].sort();

  const valAtual = selPreparacao.value;
  selPreparacao.innerHTML = '<option value="">Todas</option>';
  preparacoes.forEach(p => {
    const opt = document.createElement("option");
    opt.value = p;
    opt.textContent = p;
    selPreparacao.appendChild(opt);
  });

  if (preparacoes.includes(valAtual)) {
    selPreparacao.value = valAtual;
  } else {
    selPreparacao.value = "";
  }

  if (deveFiltrar) filtrarPesquisaCaptacao();
}

function filtrarPesquisaCaptacao() {
  const texto = document.getElementById("pesquisaTexto").value.toLowerCase().trim();
  const grupo = document.getElementById("pesquisaGrupo").value;
  const categoria = document.getElementById("pesquisaCategoria").value;
  const preparacao = document.getElementById("pesquisaPreparacao").value;

  let resultados = capitacaoItens.filter(item => {
    const nome = (item.nome || item.preparacao || "").toLowerCase();
    const prep = (item.preparacao || item.nome || "").toLowerCase();
    const cat = (item.categoria || "").toLowerCase();
    const grp = (item.grupo || "").toLowerCase();

    const matchTexto = !texto || nome.includes(texto) || prep.includes(texto) || cat.includes(texto) || grp.includes(texto);
    const matchGrupo = !grupo || item.grupo === grupo;
    const matchCategoria = !categoria || item.categoria === categoria;
    const matchPreparacao = !preparacao || (item.preparacao === preparacao) || (item.nome === preparacao);

    return matchTexto && matchGrupo && matchCategoria && matchPreparacao;
  });

  // Ordenar por grupo > categoria > nome
  resultados.sort((a, b) =>
    (a.grupo || "").localeCompare(b.grupo || "") ||
    (a.categoria || "").localeCompare(b.categoria || "") ||
    (a.nome || a.preparacao || "").localeCompare(b.nome || b.preparacao || "")
  );

  document.getElementById("pesquisaContador").textContent = resultados.length;
  renderizarResultadosPesquisa(resultados);
}

function renderizarResultadosPesquisa(resultados) {
  const container = document.getElementById("pesquisaResultados");

  if (resultados.length === 0) {
    container.innerHTML = `
      <div class="card" style="text-align: center; padding: 40px 20px; color: var(--text-muted);">
        <i class="fas fa-inbox" style="font-size: 2.5rem; margin-bottom: 12px; opacity: 0.5;"></i>
        <p>Nenhum item encontrado com os filtros selecionados.</p>
      </div>
    `;
    return;
  }

  let html = '<div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 16px;">';

  resultados.forEach(item => {
    const nome = item.nome || item.preparacao || "Sem nome";
    const prep = item.preparacao || item.nome || "—";
    const min = item.capitacao_minima ?? 0;
    const med = item.capitacao_media ?? 0;
    const max = item.capitacao_maxima ?? 0;

    html += `
      <div class="card" style="padding: 0; overflow: hidden;">
        <div style="padding: 16px 18px; border-bottom: 1px solid var(--gray-200);">
          <div style="font-size: 1.1rem; font-weight: 700; color: var(--text); margin-bottom: 4px;">${nome}</div>
          <div style="font-size: 0.85rem; color: var(--text-muted);">
            <span style="display: inline-block; background: var(--primary-light); color: var(--primary); padding: 2px 8px; border-radius: 4px; margin-right: 6px; font-weight: 600;">${item.grupo || "—"}</span>
            ${item.categoria || "—"}
          </div>
        </div>
        <div style="padding: 14px 18px;">
          <div style="font-size: 0.8rem; color: var(--text-muted); margin-bottom: 10px;">
            <i class="fas fa-cut" style="margin-right: 4px;"></i> ${prep}
          </div>
          <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px;">
            <div style="text-align: center; padding: 10px 6px; background: rgba(16,185,129,0.08); border-radius: 8px; border: 1px solid rgba(16,185,129,0.15);">
              <div style="font-size: 0.7rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px;">Mínima</div>
              <div style="font-size: 1.15rem; font-weight: 800; color: #10b981;">${min.toFixed(1)} <span style="font-size: 0.75rem; font-weight: 500;">g</span></div>
            </div>
            <div style="text-align: center; padding: 10px 6px; background: rgba(59,130,246,0.08); border-radius: 8px; border: 1px solid rgba(59,130,246,0.15);">
              <div style="font-size: 0.7rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px;">Média</div>
              <div style="font-size: 1.15rem; font-weight: 800; color: #3b82f6;">${med.toFixed(1)} <span style="font-size: 0.75rem; font-weight: 500;">g</span></div>
            </div>
            <div style="text-align: center; padding: 10px 6px; background: rgba(245,158,11,0.08); border-radius: 8px; border: 1px solid rgba(245,158,11,0.15);">
              <div style="font-size: 0.7rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px;">Máxima</div>
              <div style="font-size: 1.15rem; font-weight: 800; color: #f59e0b;">${max.toFixed(1)} <span style="font-size: 0.75rem; font-weight: 500;">g</span></div>
            </div>
          </div>
        </div>
      </div>
    `;
  });

  html += '</div>';
  container.innerHTML = html;
}

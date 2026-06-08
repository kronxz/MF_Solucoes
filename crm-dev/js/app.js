// [MF-AI-CHANGE] app.js — Orquestrador CRM Dev — 2026-05-22
// Integra auth, realtime leads/eventos, e conecta todos os módulos

import { app, db, auth, waitForAuth } from '../firebase/config.js';
console.log('[ACTIVE_APP_FILE]', import.meta.url);

import {
  onAuthStateChanged, signOut
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';
import {
  collection, query, where, orderBy, limit, onSnapshot, getFirestore, doc, updateDoc
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';
import { getApps, initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js';
import { LEADS_LIMIT } from './crm-config.js';

// Módulos CRM Dev
import { iniciarNotepad, atualizarDashboardCompleto } from './crm-dashboard.js';
import { iniciarRealtimeEventos, pararRealtimeEventos } from './crm-events.js';
import { iniciarKanban, renderizarKanban, exportarBackup } from './crm-kanban.js';
import { iniciarLixeira, atualizarLeadsLixeira } from './crm-trash.js';
import { iniciarDetails, atualizarLeadsDetails, abrirDetalhes } from './crm-details.js';
import { renderizarStatsKits, renderizarGraficoLeads } from './crm-stats.js';
import { iniciarAnalytics, renderizarAnalytics } from './crm-analytics.js';
import { renderizarVisitas } from './crm-visitas.js';
import {
  toast, setGlobalLoading, flashSync, showKanbanSkeleton, showDashboardSkeleton,
  setSyncStatus, iniciarSidebarMobile, bindEscapeModals, iniciarMonitorConexao
} from './crm-utils.js';
import { initInstalacoes, carregarInstalacoes, carregarLeadsMap, renderizarListaInstalacoes, criarInstalacao, getLeadsMap, getInstalacoes } from './crm-instalacoes.js';
import { initTecnico, carregarDadosTecnico, pararTecnico, renderizarTecnicoPage, getTecnicoMap } from './crm-tecnico.js';
import { initFinanceiro, carregarDadosFinanceiro, pararFinanceiro, renderizarFinanceiroPage, getFinanceiroMap } from './crm-financeiro.js';
import { initNotificacoes, carregarNotificacoes, pararNotificacoes, renderizarNotificacoesPage } from './crm-notificacoes.js';
import { carregarQRCodes } from './crm-qrcodes.js';
import { iniciarArquivo } from './crm-arquivo.js';
// crm-leads-landing.js — módulo SPA removido; lp_leads integrado ao Kanban principal via iniciarRealtimeLanding

// ─── ESTADO GLOBAL ────────────────────────────────────────────
let leads = [];
let eventos = [];
let eventosSyncEm = null;
let unsubscribeLeads = null;
let unsubscribeEventos = null;
let _primeiraSync = true;
let _syncFlashTimer = null;
let _backupSaveTimer = null;
let _leadsMap = new Map();
let _atualizarTimer = null;
let landingLeads = [];
let unsubscribeLanding = null;

// ─── NAVEGAÇÃO ────────────────────────────────────────────────
function mostrarPagina(pageId) {
  document.querySelectorAll('.page').forEach(p => {
    p.classList.remove('active');
    p.setAttribute('aria-hidden', 'true');
  });
  const alvo = document.getElementById(pageId);
  if (alvo) {
    alvo.classList.add('active');
    alvo.removeAttribute('aria-hidden');
  }

  // Atualiza sidebar active state
  document.querySelectorAll('.sidebar-btn[data-page]').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.page === pageId);
    btn.setAttribute('aria-current', btn.dataset.page === pageId ? 'page' : 'false');
  });

  // Renderiza gráfico ao abrir stats (Chart.js precisa de elemento visível)
  if (pageId === 'statsPage') {
    renderizarStatsKits([...leads, ...landingLeads]);
    renderizarGraficoLeads([...leads, ...landingLeads]);
  }
  if (pageId === 'analyticsPage') renderizarAnalytics(eventos, leads, eventosSyncEm, landingLeads);
  if (pageId === 'visitasPage') renderizarVisitas(eventos);
  if (pageId === 'dashboardPage') atualizarDashboardCompleto(leads, eventos, landingLeads);
  if (pageId === 'leadsPage') {
    const leadsUnificados = [...leads, ...landingLeads];
    renderizarKanban(leadsUnificados);
  }
  if (pageId === 'instalacoesPage') {
    atualizarOpcoesInstalacao();
    renderizarListaInstalacoes('instalacoesLista');
  }
  if (pageId === 'tecnicoPage') {
    renderizarTecnicoPage();
  }
  if (pageId === 'financeiroPage') {
    renderizarFinanceiroPage();
  }
  if (pageId === 'notificacoesPage') {
    renderizarNotificacoesPage();
  }
  if (pageId === 'qrcodesPage') {
    carregarQRCodes();
  }
  // leadsLandingPage removido — leads landing aparecem na aba Leads principal
}

function iniciarNavegacao() {
  // Sidebar buttons
  document.querySelectorAll('.sidebar-btn[data-page]').forEach(btn => {
    btn.addEventListener('click', () => mostrarPagina(btn.dataset.page));
  });

  // Logout
  document.getElementById('btn-logout')?.addEventListener('click', () => {
    signOut(auth).then(() => {
      // window.location.href = 'login.html'; // REMOVIDO TEMPORARIAMENTE
    });
  });

  // Backup
  document.getElementById('btn-backup')?.addEventListener('click', () => {
    exportarBackup(leads, eventos);
    toast('Backup exportado', 'success');
  });
}

// ─── ATUALIZAR TUDO ───────────────────────────────────────────
function atualizarTudo() {
  showKanbanSkeleton(false);
  const paginaAtiva = document.querySelector('.page.active')?.id;
  if (paginaAtiva === 'leadsPage') {
    const leadsUnificados = [...leads, ...landingLeads];
    console.log('[UNIFICADO] renderizarKanban com', leadsUnificados.length, 'leads');
    renderizarKanban(leadsUnificados);
  }
  if (paginaAtiva === 'dashboardPage') atualizarDashboardCompleto(leads, eventos, landingLeads);

  // Lixeira e detalhes sempre sincronizados em segundo plano
  atualizarLeadsLixeira([...leads, ...landingLeads]);
  atualizarLeadsDetails([...leads, ...landingLeads]);

  // Sincroniza dados técnicos e financeiros
  carregarDadosTecnico([...leads, ...landingLeads], getInstalacoes());
  carregarDadosFinanceiro([...leads, ...landingLeads]);

  // Stats (somente se página visível)
  const statsAtiva = document.getElementById('statsPage')?.classList.contains('active');
  if (statsAtiva) {
    renderizarStatsKits([...leads, ...landingLeads]);
    renderizarGraficoLeads([...leads, ...landingLeads]);
  }

  const analyticsAtiva = document.getElementById('analyticsPage')?.classList.contains('active');
  if (analyticsAtiva) renderizarAnalytics(eventos, leads, eventosSyncEm, landingLeads);

  const visitasAtiva = document.getElementById('visitasPage')?.classList.contains('active');
  if (visitasAtiva) renderizarVisitas(eventos);

  const financeiroAtiva = document.getElementById('financeiroPage')?.classList.contains('active');
  if (financeiroAtiva) renderizarFinanceiroPage();

  const notifAtiva = document.getElementById('notificacoesPage')?.classList.contains('active');
  if (notifAtiva) renderizarNotificacoesPage();

  // Atualiza dados de notificações em memória (sem custo Firestore)
  carregarNotificacoes(leads, getInstalacoes(), getTecnicoMap(), getFinanceiroMap());

  // Backup localStorage com debounce leve para evitar gravações contínuas
  if (_backupSaveTimer) clearTimeout(_backupSaveTimer);
  _backupSaveTimer = setTimeout(() => {
    try { localStorage.setItem('backup_leads', JSON.stringify(leads)); } catch (err) { console.warn('[CRM] backup localStorage falhou', err); }
  }, 300);

  if (!_primeiraSync) {
    clearTimeout(_syncFlashTimer);
    _syncFlashTimer = setTimeout(() => flashSync(), 300);
  }
}

// ─── LISTENERS REALTIME ───────────────────────────────────────
function limparListeners() {
  if (typeof unsubscribeLeads === 'function') { unsubscribeLeads(); unsubscribeLeads = null; }
  if (typeof unsubscribeLanding === 'function') { unsubscribeLanding(); unsubscribeLanding = null; }
  pararRealtimeEventos();
  unsubscribeEventos = null;
  pararTecnico();
  pararFinanceiro();
  pararNotificacoes();
}

function iniciarRealtimeLeads(userId) {
  if (unsubscribeLeads) { unsubscribeLeads(); }
  // Permite que todos os leads públicos e privados apareçam no CRM.
  // Ordena por 'createdAt' para que os leads capturados no simulador apareçam corretamente.
  const leadsQuery = query(collection(db, 'leads'), orderBy('createdAt', 'desc'), limit(LEADS_LIMIT));

  // Keep a map for incremental updates to avoid full rebuilds on large datasets
  _leadsMap.clear();
  unsubscribeLeads = onSnapshot(
    leadsQuery,
    snapshot => {
      // Process incremental changes
      snapshot.docChanges().forEach(change => {
        const id = change.doc.id;
        const data = { id, ...change.doc.data({ serverTimestamps: 'estimate' }) };

        if (change.type === 'added' || change.type === 'modified') {
          // [ACTIVE_APP_FILE] app.js — todos os leads passam para o kanban sem filtro aqui
          console.log('[APP_SNAPSHOT] lead recebido:', id, '| nome:', data.nome, '| createdAt:', !!data.createdAt, '| deletado:', data.deletado);
          _leadsMap.set(id, { ...data, origemSistema: 'calculadora' });
        } else if (change.type === 'removed') {
          _leadsMap.delete(id);
        }
      });

      leads = Array.from(_leadsMap.values());
      console.log(`[REALTIME] snapshot recebido: ${leads.length} leads`);
      console.log("[LEAD_FLOW] snapshot recebido:", leads.length);
      leads.forEach(lead => {
        console.log('[DEBUG] lead pós-snapshot:', lead.id, lead.status);
      });

      if (_primeiraSync) {
        _primeiraSync = false;
        setGlobalLoading(false);
        showDashboardSkeleton(false);
        setSyncStatus('online', `${leads.length} leads`);
        toast(`${leads.length} leads sincronizados`, 'success');
      }

      // Debounce UI updates to avoid thrashing
      if (_atualizarTimer) clearTimeout(_atualizarTimer);
      _atualizarTimer = setTimeout(() => { atualizarTudo(); _atualizarTimer = null; }, 150);
    },
    err => {
      console.error('[CRM] onSnapshot leads erro:', err);
      setGlobalLoading(false);
      showDashboardSkeleton(false);
      setSyncStatus('error');
      toast('Erro ao sincronizar leads', 'error');
    }
  );
}

function iniciarRealtimeLanding() {
  if (unsubscribeLanding) { unsubscribeLanding(); }

  // db agora aponta para mf-solucoes-crm (PROD) — usar diretamente
  // O app secundário lp-prod era necessário quando config.js apontava para DEV.
  // Com config.js corrigido para PROD, db já é mf-solucoes-crm e carrega auth do usuário.
  const q = query(collection(db, 'lp_leads'), orderBy('createdAt', 'desc'));

  unsubscribeLanding = onSnapshot(q, snap => {
    landingLeads = snap.docs.map(d => {
      const data = d.data();
      const lead = {
        // defaults para campos que o Kanban espera
        nome:      data.nome      || '(sem nome)',
        telefone:  data.telefone  || '',
        valor:     data.valorConta || '',
        status:    (data.status && data.status !== 'excluido') ? data.status : 'novo',
        deletado:  data.status === 'excluido' || data.deletado || false,
        createdAt: data.createdAt || new Date().toISOString(),
        // dados originais (podem sobrescrever defaults)
        ...data,
        // campos de identidade — SEMPRE ao final para não serem sobrescritos por ...data
        id:            d.id,
        origemSistema: 'landing',
        origemTipo:    'landing',
        origemLabel:   'LANDING PAGE',
      };
      console.log('[LANDING_SOURCE]', d.id, lead.origemSistema);
      return lead;
    });

    console.log('[LANDING] landingLeads.length:', landingLeads.length);
    console.log('[UNIFICADO] total:', leads.length + landingLeads.length);

    // Atualiza o Kanban se estiver visível
    if (_atualizarTimer) clearTimeout(_atualizarTimer);
    _atualizarTimer = setTimeout(() => { atualizarTudo(); _atualizarTimer = null; }, 150);
  }, err => {
    console.error('[LANDING] onSnapshot lp_leads erro:', err);
  });
}

function iniciarRealtimeEventosCRM(userId) {
  unsubscribeEventos = iniciarRealtimeEventos(
    db,
    userId,
    lista => {
      eventos = lista;
      eventosSyncEm = new Date().toISOString();
      setSyncStatus('online', `${lista.length} eventos`);
      atualizarTudo();
    },
    () => {
      setSyncStatus('error');
      toast('Erro ao sincronizar eventos', 'error');
    }
  );
}

// ─── AUTH & RUNTIME GATE ──────────────────────────────────────
let isAppInitialized = false;

onAuthStateChanged(auth, async (user) => {
  console.log('[AUTH] onAuthStateChanged disparado. Usuário:', user ? user.email : 'nenhum');
  limparListeners();

  if (!user) {
    console.log('[AUTH] Sessão encerrada. Redirecionando para login.');
    setGlobalLoading(false);
    
    if (!window.location.pathname.includes('login.html')) {
      window.location.href = 'login.html';
    }
    return;
  }

  console.log('[AUTH] Sessão de usuário hidratada com sucesso:', user.email);
  setSyncStatus('syncing');
  setGlobalLoading(true, 'Conectando ao Firebase...');
  showKanbanSkeleton(true);
  showDashboardSkeleton(true);
  _primeiraSync = true;

  // Exibir email
  const emailEl = document.getElementById('userEmail');
  if (emailEl) emailEl.textContent = (user.email || '').split('@')[0];

  // Carregar leads do localStorage imediatamente (UX)
  const backup = localStorage.getItem('backup_leads');
  if (backup) {
    try {
      leads = JSON.parse(backup);
      atualizarTudo();
    } catch (_) { /* ignora backup corrompido */ }
  }

  // Iniciar notepad e listeners
  console.log('[FIRESTORE] Registrando listeners em tempo real para leads e eventos...');
  iniciarNotepad(db, user.uid);
  iniciarRealtimeLeads(user.uid);
  iniciarRealtimeLanding();
  iniciarRealtimeEventosCRM(user.uid);

  initInstalacoes(db);
  initTecnico(db);
  initFinanceiro(db);
  initNotificacoes(db);
  // iniciarLeadsLanding() removido — lp_leads carregado por iniciarRealtimeLanding()
  carregarInstalacoes(() => {
    if (document.getElementById('instalacoesPage')?.classList.contains('active')) {
      renderizarListaInstalacoes('instalacoesLista');
    }
    carregarDadosTecnico(leads, getInstalacoes());
    carregarDadosFinanceiro(leads);
  });
  carregarLeadsMap(() => atualizarOpcoesInstalacao());
});

// ─── BOOTSTRAP GATED BY AUTH ──────────────────────────────────
async function bootstrapApp() {
  console.log('[AUTH] Iniciando Runtime Gate do app.js...');
  const user = await waitForAuth();
  
  if (!user) {
    console.log('[AUTH] Runtime Gate: Usuário não autenticado no carregamento inicial.');
    setGlobalLoading(false);
    if (!window.location.pathname.includes('login.html')) {
      window.location.href = 'login.html';
    }
    return;
  }

  console.log('[AUTH] Runtime Gate liberado. Inicializando módulos...');

  // Inicializar módulos de forma segura
  iniciarSidebarMobile();
  bindEscapeModals();
  iniciarMonitorConexao();
  iniciarNavegacao();
  iniciarLixeira(db);
  iniciarArquivo(db);
  iniciarDetails(db);

  // Expor abrirDetalhes para uso externo (módulo arquivo)
  window.abrirDetalhesExterno = (id) => {
    window._crmLeadAberto = [...leads, ...landingLeads].find(l => l.id === id) || null;
    abrirDetalhes(id);
  };

  // Handler de seleção de kit para leads landing no modalDetalhes
  document.getElementById('modalDetalhes')?.addEventListener('click', async e => {
    const btn = e.target.closest('.btn-select-kit-crm');
    if (!btn) return;
    const lead = window._crmLeadAberto;
    if (!lead || lead.origemSistema !== 'landing') return;

    const kit = JSON.parse(btn.dataset.kit);
    // lp_leads está no mesmo projeto mf-solucoes-crm; usar db autenticado
    const leadDb = db;

    await updateDoc(doc(leadDb, 'lp_leads', lead.id), {
      kitSelecionado:    kit.nome,
      potenciaSistema:   kit.kwp,
      quantidadePlacas:  kit.placas,
      potenciaPlaca:     kit.potenciaPlaca || 580,
      inversor:          kit.inversor || '',
      economiaMensal:    kit.economia,
      investimento:      kit.investimento,
      payback:           kit.payback,
      // campos que crm-proposal.js lê
      kwp:               kit.kwp,
      placas:            kit.placas,
      geracao:           kit.geracao,
      economia:          kit.economia,
      kitEscolhido:      kit.nome,
      sistema:           kit.nome,
    });

    // Habilita botão Proposta
    const btnProposta = document.getElementById('btnPropostaModal');
    if (btnProposta) btnProposta.disabled = false;

    // Atualiza lead em memória
    Object.assign(lead, { kitSelecionado: kit.nome, kitEscolhido: kit.nome, sistema: kit.nome,
      kwp: kit.kwp, placas: kit.placas, geracao: kit.geracao, economia: kit.economia,
      investimento: kit.investimento, payback: kit.payback, inversor: kit.inversor || '' });

    // Re-abre modal para refletir kit selecionado
    window._crmLeadAberto = lead;
    abrirDetalhes(lead.id);
  });
  iniciarAnalytics();
  iniciarInstalacoesPage();

  // Botão de refresh na página QR Codes
  document.getElementById('btn-refresh-qr')?.addEventListener('click', () => carregarQRCodes());

  // Kanban: callback para abrir detalhes
  iniciarKanban(db, (leadId) => {
    // Armazena o lead atual (usado pelo handler de kit selection abaixo)
    window._crmLeadAberto = [...leads, ...landingLeads].find(l => l.id === leadId) || null;
    abrirDetalhes(leadId);
  });

  // Página inicial padrão
  mostrarPagina('dashboardPage');
  
  isAppInitialized = true;
  console.log('[AUTH] CRM totalmente inicializado e pronto.');
}

// Executar bootstrap do app
bootstrapApp().catch(err => {
  console.error('[AUTH] Erro crítico no bootstrap do CRM:', err);
});


function atualizarOpcoesInstalacao() {
  const select = document.getElementById('instalacaoLeadSelect');
  if (!select) return;
  select.innerHTML = '<option value="">Selecionar lead</option>';
  const leadsObj = getLeadsMap() || {};
  const STATUS_ATIVOS = ['novo','contato','proposta','fechado','instalacao','pos-venda','manutencao'];
  Object.values(leadsObj)
    .filter(l => {
      const del = l.deletado;
      const naoDeletado = del === false || del == null || String(del).toLowerCase() === 'false';
      const naoArquivado = !l.arquivado || String(l.arquivado).toLowerCase() === 'false';
      return naoDeletado && naoArquivado && STATUS_ATIVOS.includes(l.status);
    })
    .sort((a, b) => (a.nome || '').localeCompare(b.nome || ''))
    .forEach(lead => {
      const option = document.createElement('option');
      option.value = lead.id;
      option.textContent = `${lead.nome || 'Lead sem nome'} — ${lead.status || 'Sem status'}`;
      select.appendChild(option);
    });
}

function iniciarInstalacoesPage() {
  const btnCriar = document.getElementById('btnCriarInstalacao');
  btnCriar?.addEventListener('click', async () => {
    const leadId = document.getElementById('instalacaoLeadSelect')?.value;
    const dataInstalacao = document.getElementById('instalacaoData')?.value;
    const responsavel = document.getElementById('instalacaoResponsavel')?.value.trim();
    const observacoes = document.getElementById('instalacaoObservacoes')?.value.trim();

    if (!leadId || !dataInstalacao) {
      toast('Selecione lead e data da instalação', 'error');
      return;
    }

    setGlobalLoading(true, 'Agendando instalação...');
    try {
      await criarInstalacao(leadId, dataInstalacao, responsavel, observacoes);
      toast('Instalação agendada com sucesso', 'success');
      atualizarOpcoesInstalacao();
      if (document.getElementById('instalacoesPage')?.classList.contains('active')) {
        renderizarListaInstalacoes('instalacoesLista');
      }
    } catch (err) {
      console.error('[CRM] criarInstalacao', err);
      toast('Erro ao agendar instalação', 'error');
    } finally {
      setGlobalLoading(false);
    }
  });
}

// console.log('[CRM] App inicializado — MF Soluções Dev');

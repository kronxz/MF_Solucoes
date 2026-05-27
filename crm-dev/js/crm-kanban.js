// [MF-AI-CHANGE] crm-kanban.js — Kanban board, cards, drag-drop, progression — 2026-05-22
const CRM_KANBAN_VERSION = 'v1.0.3';
console.log('[CRM] crm-kanban version', CRM_KANBAN_VERSION);
// Handles: board render, card HTML, drag-and-drop, mover/voltar, excluir, whatsapp, proposta, fechar

import {
  doc, updateDoc, addDoc, collection, serverTimestamp, getDocs
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';
import { app, auth, waitForAuth } from '../firebase/config.js';
import {
  crmCardIntel,
  toDateFromFirestore
} from './crm-realtime.js';
import { abrirProposta as abrirPropostaLead } from './crm-proposal.js';
// KANBAN FILE REAL logging added below
console.log('KANBAN FILE REAL:', import.meta.url);
// deduplicação removida – bloco de descarte de lead desativado
/*
if (!COLUNAS.includes(col)) {
  console.log('[DEBUG] lead descartado: status não reconhecido', lead.status, lead.nome);
  return; // skip this lead
}
*/

// Pipeline CRM Novo — constante única de estágios válidos
const STATUS_VALIDOS = ['novo', 'contato', 'proposta', 'negociacao', 'fechado'];
const PIPELINE = STATUS_VALIDOS;
const COLUNAS  = PIPELINE; // alias semântico usado no restante do arquivo
const TITULOS  = {
  novo:       '🟡 Novos',
  contato:    '🔵 Contato',
  proposta:   '🟠 Proposta',
  negociacao: '🟣 Negociação',
  fechado:    '🟢 Fechado'
};

// ─── ESTADO INTERNO ───────────────────────────────────────────
let _db = null;
let _leads = [];
let _onDetalhes = null;
let _dragId = null;
let _filtro = { busca: '', status: '', ordenar: 'recente' };

// ─── NORMALIZAÇÃO DE STATUS ────────────────────────────────────
/**
 * Função única de normalização de status.
 * Usa NFD para ignorar acentos. Cobre todos os aliases legados e variantes.
 * Qualquer valor desconhecido retorna 'novo'.
 */
export function normalizarStatus(status) {
  if (!status) return 'novo';

  const s = String(status)
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, ''); // remove acentos

  // Mapa completo: canônicos + todos os aliases solicitados
  const mapa = {
    // → novo
    'novo':       'novo',
    'novos':      'novo',
    'lead':       'novo',
    'lead novo':  'novo',
    'new':        'novo',
    // → contato
    'contato':    'contato',
    'em contato': 'contato',
    'contact':    'contato',
    // → proposta
    'proposta':   'proposta',
    'orcamento':  'proposta',
    'quote':      'proposta',
    // → negociacao
    'negociacao': 'negociacao',
    'negocio':    'negociacao',
    'deal':       'negociacao',
    // → fechado (inclui todos os legados)
    'fechado':    'fechado',
    'instalacao': 'fechado',
    'pos-venda':  'fechado',
    'posvenda':   'fechado',
    'manutencao': 'fechado',
    'won':        'fechado',
    'closed':     'fechado'
  };

  const res = mapa[s] || 'novo';
  return STATUS_VALIDOS.includes(res) ? res : 'novo';
}

function alertaCard(statusColuna, dias) {
  if (statusColuna === 'proposta'    && dias >= 1) return { texto: '🔥 FECHAR HOJE', cor: '#ef4444' };
  if (statusColuna === 'negociacao'  && dias >= 3) return { texto: '⏰ FOLLOW-UP',   cor: '#8b5cf6' };
  if (dias >= 5) return { texto: '⚠️ PARADO', cor: '#f59e0b' };
  return { texto: '🟢 ANDAMENTO', cor: '#22c55e' };
}

// ─── HTML DO CARD ─────────────────────────────────────────────
function criarCardHtml(lead) {
  const refData = toDateFromFirestore(lead.lastAction || lead.createdAt || lead.data);
  const dias = refData ? Math.floor((Date.now() - refData.getTime()) / (1000 * 60 * 60 * 24)) : 0;
  const statusNorm = normalizarStatus(lead.status);
  const alerta = alertaCard(statusNorm, dias);
  const valor = lead.valor ?? lead.contaDeLuz ?? '-';
  const origem = lead.utm_source || lead.origem || 'direto';
  const campanha = lead.utm_campaign || '-';
  const meio = lead.utm_medium || '-';
  const kit = lead.kitEscolhido || lead.sistema || '-';

  return `
<div class="card lead-card" draggable="true" data-lead-id="${lead.id}">
  <b class="card-nome">${escHtml(lead.nome || 'Sem nome')}</b>
  ${crmCardIntel(lead)}
  <div class="card-alerta" style="color:${alerta.cor}">${alerta.texto}</div>
  <small>📞 ${escHtml(lead.telefone || '-')}</small><br>
  <div class="card-utm glass-card" style="margin-top:8px;padding:8px;font-size:11px;line-height:1.7">
    📍 Origem: <b style="color:#22c55e">${escHtml(origem)}</b><br>
    📢 Campanha: <b style="color:#38bdf8">${escHtml(campanha)}</b><br>
    Meio: <b style="color:#f59e0b">${escHtml(meio)}</b><br>
    🏷️ Kit: <b style="color:#e879f9">${escHtml(kit)}</b>
  </div>
  <small>💡 Conta: R$ ${escHtml(valor)}</small>
  <div class="card-actions">
    <button type="button" class="btn-card btn-whatsapp" data-whatsapp="${lead.id}">💬 WhatsApp</button>
    <button type="button" class="btn-card btn-avancar" data-mover="${lead.id}">👉 Avançar</button>
    <button type="button" class="btn-card btn-voltar" data-voltar="${lead.id}">👈 Voltar</button>
    <button type="button" class="btn-card btn-excluir" data-excluir="${lead.id}">🗑️ Excluir</button>
    <button type="button" class="btn-card btn-detalhes" data-detalhes="${lead.id}">📊 Detalhes</button>
    <button type="button" class="btn-card btn-proposta" data-proposta="${lead.id}">📄 Proposta</button>
    <button type="button" class="btn-card btn-fechar-venda" data-fechar="${lead.id}">💰 Fechar Venda</button>
  </div>
</div>`;
}

function tsLead(l) {
  const d = toDateFromFirestore(l.lastAction || l.createdAt || l.data || l.criadoEm);
  return d ? d.getTime() : 0;
}

function filtrarLeadsKanban(leads) {
  const leadsArray = Array.isArray(leads) ? leads : Object.values(leads || {});
  console.log('[ACTIVE_KANBAN_FILE] crm-kanban.js — filtrarLeadsKanban iniciado, total leads:', leadsArray.length);
  let lista = leadsArray.filter(l => {
    if (!l || typeof l !== 'object') return false;
    if (l.deletado === true || l.isDeleted === true || l.status === 'lixeira') {
      console.log('[KANBAN_FILTER] lead excluído (deletado/lixeira):', l?.id, l?.nome);
      return false;
    }
    if (!l.status) {
      l.status = 'novo';
    }
    console.log(`[KANBAN_FILTER] lead aceito: ${l.id} | nome: ${l.nome || '(sem nome)'} | status: ${l.status} | createdAt: ${!!l.createdAt}`);
    return true;
  });

  const busca = _filtro.busca.trim().toLowerCase();
  if (busca) {
    lista = lista.filter(l =>
      (l.nome || '').toLowerCase().includes(busca) ||
      String(l.telefone || '').includes(busca)
    );
  }
  if (_filtro.status) {
    lista = lista.filter(l => normalizarStatus(l.status) === _filtro.status);
  }

  lista.sort((a, b) => {
    const ta = a.createdAt?.seconds || 0;
    const tb = b.createdAt?.seconds || 0;
    return tb - ta;
  });

  return lista;
}

// ─── RENDERIZAR BOARD ─────────────────────────────────────────
export function renderizarKanban(leads) {
  console.log("[LEAD_FLOW] render kanban");
  if (!auth.currentUser) {
    console.warn('[KANBAN] Tentativa de renderizar Kanban sem usuário autenticado. Ignorando.');
    return;
  }
  window.__KANBAN_RENDER_COUNT = (window.__KANBAN_RENDER_COUNT || 0) + 1;
  console.log('[KANBAN] Render count:', window.__KANBAN_RENDER_COUNT);

  _leads = leads;
  const ativos = filtrarLeadsKanban(leads);
  console.log('[KANBAN] renderizando:', ativos.length, 'de', leads.length, 'leads');

  // Montar HTML de cada coluna (apenas as 5 do CRM novo)
  const colunaHtml = {};
  COLUNAS.forEach(col => { colunaHtml[col] = `<h2>${TITULOS[col]}</h2>`; });

  ativos.forEach(lead => {
    const col = normalizarStatus(lead.status); // sempre retorna um dos 5 válidos
    console.log(`[KANBAN_RENDER] lead.id: ${lead.id} | status: ${lead.status} | normalized: ${col}`);
// if (!COLUNAS.includes(col)) { // deduplication removed
//   console.log('[DEBUG] lead descartado: status não reconhecido', lead.status, lead.nome);
//   return; // skip this lead
// }
    colunaHtml[col] += criarCardHtml(lead);
  });

  // Atualizar DOM — cada coluna recebe innerHTML UMA única vez
  COLUNAS.forEach(col => {
    const el = document.getElementById(col);
    if (!el) {
      console.error(`[KANBAN_RENDER] ERROR: element for column '${col}' not found in DOM.`);
      return;
    }
    if (!colunaHtml[col].includes('class="card"')) {
      colunaHtml[col] += '<p class="crm-col-empty">Nenhum lead nesta coluna</p>';
    }
    console.log('[DEBUG] limpando coluna:', col);
    el.innerHTML = colunaHtml[col]; // limpeza + inserção atômica
    console.log('[DEBUG] coluna atualizada:', col);
  });

  console.log('[DEBUG] cards DOM:', document.querySelectorAll('.lead-card').length);

  // FASE 1 — NEGOCIAÇÃO: Investigação obrigatória de estilos computados
  const colNeg = document.getElementById('negociacao');
  if (colNeg) {
    const style = window.getComputedStyle(colNeg);
    console.log(`[KANBAN_NEGOCIACAO] Column Element:`, colNeg);
    console.log(`[KANBAN_NEGOCIACAO] Parent:`, colNeg.parentElement?.id || colNeg.parentElement);
    console.log(`[KANBAN_NEGOCIACAO] display: ${style.display} | opacity: ${style.opacity} | transform: ${style.transform} | z-index: ${style.zIndex} | pointer-events: ${style.pointerEvents} | overflow: ${style.overflow}`);
    const cards = colNeg.querySelectorAll('.lead-card');
    console.log(`[KANBAN_NEGOCIACAO] Total cards in Negociação column DOM: ${cards.length}`);
    cards.forEach(card => {
      const cs = window.getComputedStyle(card);
      console.log(`[KANBAN_NEGOCIACAO] Card ID: ${card.dataset.leadId} | Display: ${cs.display} | Opacity: ${cs.opacity} | Transform: ${cs.transform} | zIndex: ${cs.zIndex} | Pointer-Events: ${cs.pointerEvents}`);
    });
  } else {
    console.log(`[KANBAN_NEGOCIACAO] ERROR: Column element 'negociacao' not found in DOM!`);
  }

  if (window.matchMedia('(max-width: 768px)').matches) mostrarColunaMobile('novo');
}

// ─── INICIALIZAR BOARD (eventos delegados) ────────────────────
export function iniciarKanban(db, onDetalhes) {
  _db = db;
  _onDetalhes = onDetalhes;

  const board = document.getElementById('kanbanBoard');
  if (!board) return;

  // Delegação de eventos: todos os botões de card
  board.addEventListener('click', e => {
    const btn = e.target.closest('[data-mover],[data-voltar],[data-excluir],[data-detalhes],[data-proposta],[data-fechar],[data-whatsapp]');
    if (!btn) return;
    console.log('[KANBAN_CLICK] dataset', btn.dataset);
    console.log('[KANBAN_CLICK] proposta', btn.dataset.proposta);
    console.log('[KANBAN_CLICK] leadId', btn.dataset.leadId);

    if (btn.dataset.mover) moverLead(btn.dataset.mover);
    else if (btn.dataset.voltar) voltarLead(btn.dataset.voltar);
    else if (btn.dataset.excluir) excluirLead(btn.dataset.excluir);
    else if (btn.dataset.detalhes && _onDetalhes) _onDetalhes(btn.dataset.detalhes);
    else if (btn.dataset.proposta) {
      const leadId = btn.dataset.proposta || btn.dataset.leadId;
      console.log('[KANBAN_CLICK] resolved', leadId);
      const lead = _leads.find(l => l.id === leadId);
      console.log('[KANBAN_CLICK] lead', lead);
      if (lead) abrirProposta(lead.id); else console.warn('[KANBAN_CLICK] Lead not found for id', leadId);
    }
    else if (btn.dataset.fechar) fecharVenda(btn.dataset.fechar);
    else if (btn.dataset.whatsapp) whatsappLead(btn.dataset.whatsapp);
  });

  COLUNAS.forEach(col => {
    const el = document.getElementById(col);
    if (!el) return;
    el.addEventListener('dragenter', e => {
      e.preventDefault();
      el.classList.add('drag-over');
    });
    el.addEventListener('dragleave', e => {
      if (!el.contains(e.relatedTarget)) el.classList.remove('drag-over');
    });
    el.addEventListener('dragover', e => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
    });
    el.addEventListener('drop', e => {
      e.preventDefault();
      el.classList.remove('drag-over');
      const id = e.dataTransfer.getData('text/plain') || _dragId;
      if (id) moverParaColuna(id, col);
    });
  });

  board.addEventListener('dragstart', e => {
    if (e.target.closest('button')) {
      e.preventDefault();
      return;
    }
    const card = e.target.closest('.card[data-lead-id]');
    if (!card) return;
    _dragId = card.dataset.leadId;
    e.dataTransfer.setData('text/plain', _dragId);
    e.dataTransfer.effectAllowed = 'move';
    card.classList.add('dragging');
  });

  board.addEventListener('dragend', e => {
    const card = e.target.closest('.card');
    if (card) card.classList.remove('dragging');
    COLUNAS.forEach(c => document.getElementById(c)?.classList.remove('drag-over'));
    _dragId = null;
  });

  // Mobile tabs
  const tabs = document.getElementById('kanbanTabs');
  if (tabs) {
    tabs.addEventListener('click', e => {
      const btn = e.target.closest('[data-coluna]');
      if (!btn) return;
      tabs.querySelectorAll('.kanban-btn').forEach(b => {
        b.classList.remove('active-tab');
        b.setAttribute('aria-selected', 'false');
      });
      btn.classList.add('active-tab');
      btn.setAttribute('aria-selected', 'true');
      const col = btn.dataset.coluna;
      if (col === 'todos') mostrarTodasColunas();
      else mostrarColunaMobile(col);
    });
  }

  document.getElementById('btn-novo-lead')?.addEventListener('click', novoLead);

  document.getElementById('kanbanBusca')?.addEventListener('input', e => {
    _filtro.busca = e.target.value;
    renderizarKanban(_leads);
  });
  document.getElementById('kanbanFiltroStatus')?.addEventListener('change', e => {
    _filtro.status = e.target.value;
    renderizarKanban(_leads);
  });
  document.getElementById('kanbanOrdenar')?.addEventListener('change', e => {
    _filtro.ordenar = e.target.value;
    renderizarKanban(_leads);
  });
}

// ─── AÇÕES DOS LEADS ──────────────────────────────────────────
async function moverParaColuna(id, novoStatus) {
  if (!id) {
    console.warn('[KANBAN] moverParaColuna: id do lead não informado');
    return;
  }
  const lead = _leads.find(l => l.id === id);
  if (!lead) {
    console.warn('[KANBAN] moverParaColuna: lead não encontrado', id);
    return;
  }
  const statusAntes = lead.status;
  const statusAtual = normalizarStatus(lead.status);
  if (!STATUS_VALIDOS.includes(statusAtual)) {
    console.warn('[KANBAN] moverParaColuna: status atual corrompido ou inválido', statusAtual);
    return;
  }
  if (!STATUS_VALIDOS.includes(novoStatus)) {
    console.warn('[KANBAN] moverParaColuna: próximo status inválido', novoStatus);
    return;
  }

  console.log(`[KANBAN_MOVE] lead.id: ${id} | status antes: ${statusAntes} | status depois: ${novoStatus} | coluna destino: ${novoStatus}`);
  console.log(`[KANBAN_STATUS] lead.id: ${id} | normalizedStatus: ${statusAtual} -> ${novoStatus}`);

  const ref = doc(_db, 'leads', id);
  const historico = lead.historico || [];
  historico.push({ acao: 'Movido para ' + novoStatus, data: new Date().toISOString() });
  
  const payload = {
    status: novoStatus,
    historico,
    ultima_acao_nome: 'Movido para ' + novoStatus,
    lastAction: new Date().toISOString()
  };

  if (novoStatus === 'fechado') {
    payload.fechadoEm = serverTimestamp();
  }

  await updateDoc(ref, payload);
  console.log('[DEBUG] status salvo firestore:', id, novoStatus);
  toast(`Lead → ${novoStatus}`, 'success');
  
  // Atualiza estado local e força re-render
  lead.status = novoStatus;
  renderizarKanban(_leads);
}

async function moverLead(id) {
  const lead = _leads.find(l => l.id === id);
  if (!lead) return;
  const atual = normalizarStatus(lead.status);
  const i = PIPELINE.indexOf(atual);
  // Nunca vai além do último estágio; nunca produz status inválido
  if (i === -1 || i >= PIPELINE.length - 1) return;
  const proximo = PIPELINE[i + 1];
  console.log('[KANBAN] mover:', lead.nome, atual, '→', proximo);
  await moverParaColuna(id, proximo);
}

async function voltarLead(id) {
  const lead = _leads.find(l => l.id === id);
  if (!lead) return;
  const atual = normalizarStatus(lead.status);
  const i = PIPELINE.indexOf(atual);
  // Nunca vai abaixo do primeiro estágio; nunca some
  if (i <= 0) return;
  const anterior = PIPELINE[i - 1];
  console.log('[KANBAN] voltar:', lead.nome, atual, '→', anterior);
  await moverParaColuna(id, anterior);
}

async function excluirLead(id) {
  if (!confirm('Mover lead para a lixeira?')) return;
  const lead = _leads.find(l => l.id === id);
  const statusAnterior = lead ? normalizarStatus(lead.status) : 'novo';
  const ref = doc(_db, 'leads', id);
  await updateDoc(ref, { 
    deletado: true, 
    status: 'lixeira',
    statusAnterior: statusAnterior,
    deletadoEm: serverTimestamp() 
  });
  toast('Lead movido para lixeira', 'warn');
}

async function fecharVenda(id) {
  const lead = _leads.find(l => l.id === id);
  if (!lead) return;

  // Atualiza estatísticas locais por kit
  const est = JSON.parse(localStorage.getItem('estatisticas')) || {};
  const sistema = String(lead.sistema || lead.kitEscolhido || '');
  if (sistema.includes('Essencial')) est.essencialFechados = (est.essencialFechados || 0) + 1;
  if (sistema.includes('Recomendado')) est.recomendadoFechados = (est.recomendadoFechados || 0) + 1;
  if (sistema.includes('Premium')) est.premiumFechados = (est.premiumFechados || 0) + 1;
  localStorage.setItem('estatisticas', JSON.stringify(est));

  await updateDoc(doc(_db, 'leads', id), { 
    status: 'fechado',
    fechadoEm: serverTimestamp()
  });
  toast('🚀 Venda fechada!', 'success');
}

function whatsappLead(id) {
  const lead = _leads.find(l => l.id === id);
  if (!lead) return;
  const numero = String(lead.telefone || '').replace(/\D/g, '');
  const msg = `Olá ${lead.nome}, preparei sua proposta de energia solar.\n\nHoje ainda consigo manter as condições especiais.\n\nPosso te explicar em 2 minutos?`;
  window.open('https://wa.me/55' + numero + '?text=' + encodeURIComponent(msg));
}

function abrirProposta(id) {
  const lead = _leads.find(l => l.id === id);
  if (abrirPropostaLead(lead)) toast('Proposta aberta', 'info');
}

async function novoLead() {
  const nome = prompt('Nome do cliente:');
  if (nome === null) return;
  if (nome.trim().length < 3) {
    toast('Nome deve ter no mínimo 3 caracteres', 'error');
    return;
  }

  const telefone = prompt('Telefone:') || '';
  if (telefone === null) return;
  const telDigitos = String(telefone).replace(/\D/g, '');
  if (telDigitos.length < 10) {
    toast('Telefone deve ter no mínimo 10 dígitos', 'error');
    return;
  }

  const email    = prompt('E-mail (opcional):') || '';
  if (email === null) return;
  const valor    = prompt('Conta de luz (R$):') || '';
  if (valor === null) return;

  const user = await waitForAuth();
  const uid = user?.uid || null;
  if (!uid) {
    console.warn('[LEADS] Tentativa de salvar lead manual falhou: usuário não autenticado.');
    toast('Usuário não autenticado', 'error');
    return;
  }

  const agora = serverTimestamp();

  const payload = {
    nome:             nome.trim(),
    telefone:         telefone.trim(),
    telefoneDigitos:  telDigitos,
    email:            email.trim(),
    valor,
    origem:           'manual',
    status:           'novo',
    userId:           uid,
    createdAt:        agora,   // campo canonical — nunca usar 'data'
    updatedAt:        agora,
    lastAction:       agora
  };

  try {
    const ref = await addDoc(collection(_db, 'leads'), payload);
    console.log('[LEADS] Novo lead salvo com sucesso no Firestore:', ref.id, '| nome:', nome.trim());
    toast('Lead criado com sucesso!', 'success');
  } catch (err) {
    console.error('[LEADS] Erro ao salvar novo lead manual no Firestore:', err);
    toast('Erro ao criar lead', 'error');
  }
}

// ─── MOBILE KANBAN TABS ───────────────────────────────────────
export function mostrarColunaMobile(status) {
  COLUNAS.forEach(col => {
    const el = document.getElementById(col);
    if (!el) return;
    el.classList.remove('active-mobile', 'show-all');
  });
  const alvo = document.getElementById(status);
  if (alvo) alvo.classList.add('active-mobile');
}

export function mostrarTodasColunas() {
  COLUNAS.forEach(col => {
    const el = document.getElementById(col);
    if (!el) return;
    el.classList.remove('active-mobile');
    el.classList.add('show-all');
  });
}

// ─── EXPORTAR BACKUP ──────────────────────────────────────────
export function exportarBackup(leads, eventos) {
  if (!confirm('⚠️ Deseja baixar o backup do CRM?')) return;
  const blob = new Blob(
    [JSON.stringify({ leads, eventos, exportadoEm: new Date().toISOString() }, null, 2)],
    { type: 'application/json' }
  );
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `backup-crm-${new Date().toISOString()}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

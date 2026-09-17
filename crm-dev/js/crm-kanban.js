// [MF-AI-CHANGE] crm-kanban.js — Kanban board, cards, drag-drop, progression — 2026-05-22
// Handles: board render, card HTML, drag-and-drop, mover/voltar, excluir, whatsapp, proposta, fechar

import {
  doc, updateDoc, addDoc, collection, deleteDoc
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';
import { app } from '../firebase/config.js';

// ─── HELPER DE ORIGEM ─────────────────────────────────────────
function getLeadSource(lead) {
  if (lead?.origemSistema === 'landing') {
    return { db: _db, collection: 'lp_leads' };
  }
  return { db: _db, collection: 'leads' };
}
import {
  crmCardIntel,
  toDateFromFirestore
} from './crm-realtime.js';
import { abrirProposta as abrirPropostaLead } from './crm-proposal.js';
import { toast } from './crm-utils.js';

// ─── ESCAPE HTML (local implementation) ────────────────────────
function escHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export const COLUNAS = ['novo', 'contato', 'visita', 'proposta', 'fechado', 'instalacao', 'pos-venda', 'manutencao'];
export const TITULOS = {
  novo: '🟡 Novos',
  contato: '🔵 Contato',
  visita: '📅 Visita',
  proposta: '🟠 Proposta',
  fechado: '🟢 Fechado',
  instalacao: '🔧 Instalação',
  'pos-venda': '💼 Pós-Venda',
  manutencao: '🛠️ Manutenção'
};

// ─── ESTADO INTERNO ───────────────────────────────────────────
let _db = null;
let _leads = [];
let _onDetalhes = null;
let _dragId = null;
let _filtro = { busca: '', status: '', ordenar: 'recente' };
// Leads sendo reativados nesta sessão (evita gravação dupla enquanto o write propaga)
const _reativando = new Set();

// ─── ARQUIVO INTELIGENTE: reativação automática no re-contato ──
// O bot faz merge por telefone e bumpa `lastActivity` (ISO) quando o cliente volta a falar,
// mas PRESERVA o status — então um lead 'arquivado' que volta a escrever fica escondido.
// Regra limpa (sem falso positivo): `lastActivity` é gravado SÓ pelos bots (inbound); o CRM
// usa `lastAction`. Se lastActivity > arquivadoEm ⇒ o cliente voltou DEPOIS de arquivado ⇒
// reaquece e devolve ao funil, sem perder demandas_eletrica[] nem histórico (nunca tocados).
async function reativarPorRecontato(lead) {
  if (_reativando.has(lead.id)) return;
  _reativando.add(lead.id);
  const { db: leadDb, collection: col } = getLeadSource(lead);
  const agora = new Date().toISOString();
  const historico = Array.isArray(lead.historico) ? lead.historico.slice() : [];
  historico.push({ acao: '♻️ Reativado automaticamente — cliente voltou a falar', data: agora });
  try {
    await updateDoc(doc(leadDb, col, lead.id), {
      status: 'novo',
      arquivadoEm: null,
      reaquecido: true,
      reativadoEm: agora,
      historico,
    });
    toast('♻️ ' + (lead.nome || 'Lead') + ' voltou a falar — reativado no funil', 'success');
  } catch (err) {
    console.error('[CRM-Reativacao] erro', err);
    _reativando.delete(lead.id); // libera p/ tentar de novo no próximo snapshot
  }
}
function varrerReativacao(leads) {
  for (const l of (leads || [])) {
    if (l.status !== 'arquivado' || !l.arquivadoEm || !l.lastActivity) continue;
    const arq = toDateFromFirestore(l.arquivadoEm);
    const act = toDateFromFirestore(l.lastActivity);
    if (arq && act && act.getTime() > arq.getTime()) reativarPorRecontato(l);
  }
}

// ─── UTILITÁRIOS ──────────────────────────────────────────────
export function normalizarStatus(status) {
  const chave = String(status || 'novo')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
  const mapa = {
    novo: 'novo',
    contato: 'contato',
    visita: 'visita',
    agendado: 'visita',
    agendada: 'visita',
    agendamento: 'visita',
    'visita tecnica': 'visita',
    proposta: 'proposta',
    fechado: 'fechado',
    instalacao: 'instalacao',
    'pos-venda': 'pos-venda',
    'pos venda': 'pos-venda',
    'posvenda': 'pos-venda',
    manutencao: 'manutencao'
  };
  return mapa[chave] || 'novo';
}

function alertaCard(statusColuna, dias) {
  if (statusColuna === 'visita' && dias >= 2) return { texto: '📅 CONFIRMAR VISITA', cor: '#3b82f6' };
  if (statusColuna === 'proposta' && dias >= 1) return { texto: '🔥 FECHAR HOJE', cor: '#ef4444' };
  if (statusColuna === 'instalacao' && dias >= 7) return { texto: '⚠️ ATRASO', cor: '#f59e0b' };
  if (statusColuna === 'pos-venda' && dias >= 3) return { texto: '⏰ FOLLOW-UP', cor: '#8b5cf6' };
  if (dias >= 5) return { texto: '⚠️ PARADO', cor: '#f59e0b' };
  return { texto: '🟢 ANDAMENTO', cor: '#22c55e' };
}

// ─── HTML DO CARD ─────────────────────────────────────────────
function criarCardHtml(lead) {
  const refData = toDateFromFirestore(lead.lastAction || lead.createdAt || lead.data);
  const dias = refData ? Math.floor((Date.now() - refData.getTime()) / (1000 * 60 * 60 * 24)) : 0;
  const status = normalizarStatus(lead.status);
  const alerta = alertaCard(status, dias);
  const valor = lead.valor ?? lead.contaDeLuz ?? '-';
  const origem = lead.utm_source || 'direto';
  const campanha = lead.utm_campaign || '-';
  const meio = lead.utm_medium || '-';
  const kit = lead.kitEscolhido || lead.sistema || '-';

  const origemBadge = lead.origemSistema === 'landing'
    ? '<span style="display:inline-block;margin-bottom:4px;padding:2px 8px;border-radius:20px;font-size:10px;font-weight:700;background:#1e3a5f;color:#60a5fa;border:1px solid #2563eb">🔵 LANDING PAGE</span>'
    : '<span style="display:inline-block;margin-bottom:4px;padding:2px 8px;border-radius:20px;font-size:10px;font-weight:700;background:#052e16;color:#4ade80;border:1px solid #16a34a">🟢 CALCULADORA</span>';

  const isEletrica = String(lead.segmento || '').toLowerCase() === 'eletrica';
  const segBadge = isEletrica
    ? '<span style="display:inline-block;margin:0 0 4px 4px;padding:2px 8px;border-radius:20px;font-size:10px;font-weight:700;background:#3a2a05;color:#fbbf24;border:1px solid #d97706">⚡ ELÉTRICA</span>'
    : '';
  const emergBadge = lead.emergencia === true
    ? '<span class="card-emergencia" style="display:inline-block;margin:0 0 4px 4px;padding:2px 8px;border-radius:20px;font-size:10px;font-weight:800;background:#450a0a;color:#fca5a5;border:1px solid #ef4444">🚨 EMERGÊNCIA</span>'
    : '';
  const reaqBadge = lead.reaquecido === true
    ? '<span title="Cliente voltou a falar depois de arquivado" style="display:inline-block;margin:0 0 4px 4px;padding:2px 8px;border-radius:20px;font-size:10px;font-weight:800;background:#3a1d05;color:#fdba74;border:1px solid #f97316">♻️ REAQUECIDO</span>'
    : '';
  return `
<div class="card${lead.emergencia === true ? ' card--emergencia' : ''}" draggable="true" data-lead-id="${lead.id}">
  ${origemBadge}${segBadge}${emergBadge}${reaqBadge}
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
    <button type="button" class="btn-card btn-arquivar" data-arquivar="${lead.id}">📦 Arquivar</button>
    <button type="button" class="btn-card btn-detalhes" data-detalhes="${lead.id}">📊 Detalhes</button>
    <button type="button" class="btn-card btn-proposta" data-proposta="${lead.id}">📄 Proposta</button>
    <button type="button" class="btn-card btn-fechar-venda" data-fechar="${lead.id}">💰 Fechar Venda</button>
    <button type="button" class="btn-card btn-segmento" data-segmento="${lead.id}">${isEletrica ? '☀️ p/ Solar' : '⚡ p/ Elétrica'}</button>
  </div>
</div>`;
}

function tsLead(l) {
  const d = toDateFromFirestore(l.lastAction || l.createdAt || l.data || l.criadoEm);
  return d ? d.getTime() : 0;
}

function filtrarLeadsKanban(leads) {
  let lista = (leads || []).filter(l => {
    const deletado = l.deletado;
    const naoDeletado = deletado === false || deletado == null || String(deletado).toLowerCase() === 'false';
    const naoExcluido = l.status !== 'excluido' && l.status !== 'arquivado';
    return naoDeletado && naoExcluido;
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
    switch (_filtro.ordenar) {
      case 'antigo': return tsLead(a) - tsLead(b);
      case 'valor': return (parseFloat(b.valor) || 0) - (parseFloat(a.valor) || 0);
      case 'score': return (Number(b.score) || 0) - (Number(a.score) || 0);
      case 'nome': return (a.nome || '').localeCompare(b.nome || '', 'pt-BR');
      default: return tsLead(b) - tsLead(a);
    }
  });
  return lista;
}

// ─── RENDERIZAR BOARD ─────────────────────────────────────────
export function renderizarKanban(leads) {
  _leads = leads;
  varrerReativacao(leads); // arquivo inteligente: quem voltou a falar reaquece sozinho
  const ativos = filtrarLeadsKanban(leads);
  renderEmergenciasBanner(ativos);
  const colunaHtml = {};
  COLUNAS.forEach(col => { colunaHtml[col] = `<h2>${TITULOS[col]}</h2>`; });

  ativos.forEach(lead => {
    let col = normalizarStatus(lead.status);
    if (!Object.prototype.hasOwnProperty.call(colunaHtml, col)) {
      col = 'novo';
    }
    colunaHtml[col] += criarCardHtml(lead);
  });

  COLUNAS.forEach(col => {
    const el = document.getElementById(col);
    if (!el) return;
    if (!colunaHtml[col].includes('class="card"')) {
      colunaHtml[col] += '<p class="crm-col-empty">Nenhum lead nesta coluna</p>';
    }
    el.innerHTML = colunaHtml[col];
  });

  if (window.matchMedia('(max-width: 768px)').matches) mostrarColunaMobile('novo');
}

// Emergências que o Marcos já dispensou (X) — guardadas no navegador
function emergDispensadas() {
  try { return JSON.parse(localStorage.getItem('mf_emerg_dispensadas') || '[]'); } catch { return []; }
}
function dispensarEmerg(id) {
  try { const s = new Set(emergDispensadas()); s.add(id); localStorage.setItem('mf_emerg_dispensadas', JSON.stringify([...s])); } catch {}
}

// Faixa de emergências elétricas no topo do board (⚡ atender primeiro)
function renderEmergenciasBanner(ativos) {
  const el = document.getElementById('kanbanEmergencias');
  if (!el) return;
  const disp = new Set(emergDispensadas());
  const urgentes = (ativos || []).filter(l => l.emergencia === true && !disp.has(l.id));
  if (!urgentes.length) { el.hidden = true; el.innerHTML = ''; return; }
  el.hidden = false;
  const xStyle = 'background:rgba(0,0,0,.3);border:1px solid rgba(255,255,255,.4);color:#fff;border-radius:50%;width:22px;height:22px;line-height:20px;text-align:center;cursor:pointer;font-weight:bold;padding:0;flex:0 0 auto;';
  el.innerHTML = `
<div class="kanban-emergencias-box">
  <span class="kanban-emergencias-titulo">🚨 ${urgentes.length} emergência${urgentes.length > 1 ? 's' : ''} elétrica${urgentes.length > 1 ? 's' : ''} — atender primeiro</span>
  <div class="kanban-emergencias-lista">
    ${urgentes.map(l => `<span style="display:inline-flex;align-items:center;gap:6px;">
      <button type="button" class="kanban-emergencia-item" data-detalhes="${escHtml(l.id)}">${escHtml(l.nome || 'Sem nome')}${l.telefone ? ' · 📞 ' + escHtml(l.telefone) : ''}</button>
      <button type="button" data-dispensar="${escHtml(l.id)}" title="Já resolvi — dispensar esta emergência" aria-label="Dispensar" style="${xStyle}">✕</button>
    </span>`).join('')}
  </div>
</div>`;
}

// ─── INICIALIZAR BOARD (eventos delegados) ────────────────────
export function iniciarKanban(db, onDetalhes) {
  _db = db;
  _onDetalhes = onDetalhes;

  const board = document.getElementById('kanbanBoard');
  if (!board) return;

  // X da tarja de emergência (dispensar) + abrir detalhes pelo chip
  const emergEl = document.getElementById('kanbanEmergencias');
  if (emergEl && !emergEl._wired) {
    emergEl._wired = true;
    emergEl.addEventListener('click', e => {
      const x = e.target.closest('[data-dispensar]');
      if (x) {
        dispensarEmerg(x.dataset.dispensar);
        const item = x.closest('span'); if (item) item.remove();
        const lista = emergEl.querySelector('.kanban-emergencias-lista');
        if (lista && !lista.children.length) { emergEl.hidden = true; emergEl.innerHTML = ''; }
        return;
      }
      const det = e.target.closest('[data-detalhes]');
      if (det && _onDetalhes) _onDetalhes(det.dataset.detalhes);
    });
  }

  // Delegação de eventos: todos os botões de card
  board.addEventListener('click', e => {
    // MOBILE: toque no nome abre/fecha as opções do lead (só < 768px; PC intacto)
    const nome = e.target.closest('.card-nome');
    if (nome && window.matchMedia('(max-width: 768px)').matches) {
      const card = nome.closest('.card');
      if (card) card.classList.toggle('expanded');
      return;
    }

    const btn = e.target.closest('[data-mover],[data-voltar],[data-excluir],[data-arquivar],[data-detalhes],[data-proposta],[data-fechar],[data-whatsapp],[data-segmento]');
    if (!btn) return;

    if (btn.dataset.mover) moverLead(btn.dataset.mover);
    else if (btn.dataset.voltar) voltarLead(btn.dataset.voltar);
    else if (btn.dataset.excluir) excluirLead(btn.dataset.excluir);
    else if (btn.dataset.arquivar) arquivarLead(btn.dataset.arquivar);
    else if (btn.dataset.detalhes && _onDetalhes) _onDetalhes(btn.dataset.detalhes);
    else if (btn.dataset.proposta) abrirProposta(btn.dataset.proposta);
    else if (btn.dataset.fechar) fecharVenda(btn.dataset.fechar);
    else if (btn.dataset.whatsapp) whatsappLead(btn.dataset.whatsapp);
    else if (btn.dataset.segmento) alternarSegmento(btn.dataset.segmento);
  });

  // Faixa de emergências: clicar no nome abre os detalhes do lead
  document.getElementById('kanbanEmergencias')?.addEventListener('click', e => {
    const item = e.target.closest('[data-detalhes]');
    if (item && _onDetalhes) _onDetalhes(item.dataset.detalhes);
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
  // [MF-AI-CHANGE 2026-07-31] modal Novo Lead (substitui prompt() que nao roda no Electron)
  document.getElementById('formNovoLead')?.addEventListener('submit', salvarNovoLead);
  document.getElementById('btn-cancelar-novo-lead')?.addEventListener('click', fecharNovoLead);
  document.getElementById('modalNovoLead')?.addEventListener('click', e => {
    if (e.target.id === 'modalNovoLead') fecharNovoLead();
  });

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
  const lead = _leads.find(l => l.id === id);
  if (!lead) return;
  const { db: leadDb, collection: col } = getLeadSource(lead);
  console.log(`[LEAD_ACTION] origem=${lead.origemSistema || 'calculadora'} colecao=${col} id=${id} acao=mover→${novoStatus}`);
  const ref = doc(leadDb, col, id);
  const historico = lead.historico || [];
  historico.push({ acao: 'Movido para ' + novoStatus, data: new Date().toISOString() });
  await updateDoc(ref, {
    status: novoStatus,
    historico,
    ultima_acao_nome: 'Movido para ' + novoStatus,
    lastAction: new Date().toISOString()
  });
  toast(`Lead → ${novoStatus}`, 'success');
}

// Marca/alterna o segmento do lead (☀️ Solar ⇄ ⚡ Elétrica) — grava o campo.
async function alternarSegmento(id) {
  const lead = _leads.find(l => l.id === id);
  if (!lead) return;
  const atual = String(lead.segmento || '').toLowerCase() === 'eletrica' ? 'eletrica' : 'solar';
  const novo = atual === 'eletrica' ? 'solar' : 'eletrica';
  const { db: leadDb, collection: col } = getLeadSource(lead);
  await updateDoc(doc(leadDb, col, id), { segmento: novo, lastAction: new Date().toISOString() });
  lead.segmento = novo;
  toast('Segmento → ' + (novo === 'eletrica' ? '⚡ Elétrica' : '☀️ Solar'), 'success');
  renderizarKanban(_leads);
}

async function moverLead(id) {
  const lead = _leads.find(l => l.id === id);
  if (!lead) return;
  const atual = normalizarStatus(lead.status);
  const i = COLUNAS.indexOf(atual);
  if (i < COLUNAS.length - 1) await moverParaColuna(id, COLUNAS[i + 1]);
}

async function voltarLead(id) {
  const lead = _leads.find(l => l.id === id);
  if (!lead) return;
  const atual = normalizarStatus(lead.status);
  const i = COLUNAS.indexOf(atual);
  if (i > 0) await moverParaColuna(id, COLUNAS[i - 1]);
}

async function excluirLead(id) {
  if (!confirm('Mover lead para a lixeira?')) return;
  const lead = _leads.find(l => l.id === id);
  if (!lead) { toast('Lead não encontrado', 'error'); return; }
  const { db: leadDb, collection: col } = getLeadSource(lead);
  console.log(`[LEAD_ACTION] origem=${lead.origemSistema || 'calculadora'} colecao=${col} id=${id} acao=excluir`);
  // deletado:true sempre presente para garantir filtro do kanban funcione em ambas origens
  const payload = lead.origemSistema === 'landing'
    ? { status: 'excluido', deletado: true, deletadoEm: new Date().toISOString() }
    : { deletado: true, deletadoEm: new Date().toISOString() };
  try {
    await updateDoc(doc(leadDb, col, id), payload);
    console.log(`[LEAD_ACTION] excluirLead sucesso — id:${id} col:${col}`);
    toast('Lead movido para lixeira', 'warn');
  } catch (err) {
    console.error(`[LEAD_ACTION] excluirLead ERRO — id:${id} col:${col}`, err);
    toast('Não foi possível excluir o lead. Verifique o console.', 'error');
  }
}

async function arquivarLead(id) {
  if (!confirm('Arquivar este lead?')) return;
  const lead = _leads.find(l => l.id === id);
  if (!lead) { toast('Lead não encontrado', 'error'); return; }
  const { db: leadDb, collection: col } = getLeadSource(lead);
  try {
    await updateDoc(doc(leadDb, col, id), { status: 'arquivado', arquivadoEm: new Date().toISOString() });
    toast('Lead arquivado', 'info');
  } catch (err) {
    console.error('[LEAD_ACTION] arquivarLead ERRO', err);
    toast('Não foi possível arquivar o lead.', 'error');
  }
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

  const { db: leadDb, collection: col } = getLeadSource(lead);
  console.log(`[LEAD_ACTION] origem=${lead?.origemSistema || 'calculadora'} colecao=${col} id=${id} acao=fecharVenda`);
  await updateDoc(doc(leadDb, col, id), { status: 'fechado' });
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

// [MF-AI-CHANGE 2026-07-31] "Novo Lead" via MODAL — prompt() NÃO funciona no Electron.
// Bug: no app (Electron), window.prompt() retorna null na hora → a função saía calada
// e o botão "não fazia nada" (no Chrome funcionava). Modal HTML funciona nos dois.
function novoLead() {
  const modal = document.getElementById('modalNovoLead');
  if (!modal) return;
  const form = document.getElementById('formNovoLead');
  if (form) form.reset();
  modal.classList.add('ativo');
  modal.setAttribute('aria-hidden', 'false');
  setTimeout(() => document.getElementById('nl-nome')?.focus(), 50);
}

function fecharNovoLead() {
  const modal = document.getElementById('modalNovoLead');
  if (!modal) return;
  modal.classList.remove('ativo');
  modal.setAttribute('aria-hidden', 'true');
}

async function salvarNovoLead(e) {
  if (e) e.preventDefault();
  const nome = (document.getElementById('nl-nome')?.value || '').trim();
  if (!nome) { toast('Informe o nome do cliente', 'error'); return; }
  const telefone     = (document.getElementById('nl-telefone')?.value || '').trim();
  const valor        = (document.getElementById('nl-valor')?.value || '').trim();
  const investimento = (document.getElementById('nl-investimento')?.value || '').trim();
  const kwp          = (document.getElementById('nl-kwp')?.value || '').trim();

  const utm = JSON.parse(localStorage.getItem('utm') || '{}');
  const kit = JSON.parse(localStorage.getItem('kitSelecionado') || '{}');

  const uid = getAuth(app).currentUser?.uid || null;
  if (!uid) { toast('Usuário não autenticado', 'error'); return; }

  const tel = String(telefone || '').replace(/\D/g, '');
  const agora = new Date().toISOString();

  const btnSalvar = document.querySelector('#formNovoLead button[type="submit"]');
  if (btnSalvar) { btnSalvar.disabled = true; btnSalvar.textContent = 'Salvando...'; }

  try {
    await addDoc(collection(_db, 'leads'), {
      nome, telefone, telefoneDigitos: tel, valor,
      sistema: kit?.sistema || '-',
      investimento: kit?.investimento || investimento || 0,
      geracao: kit?.geracao || 0,
      geracaoMensal: kit?.geracao || 0,
      kwp: kit?.kwp || kwp || 0,
      payback: kit?.payback || '-',
      inversor: kit?.inversor || '-',
      overload: kit?.overload || '-',
      potenciaPlaca: kit?.potenciaPlaca || '-',
      placas: kit?.placas || 0,
      status: 'novo',
      userId: uid,
      data: agora,
      criadoEm: agora,
      createdAt: agora,   // [MF-AI-CHANGE] SEM isto o lead fica INVISÍVEL no kanban (orderBy createdAt) — mesmo bug dos 43 leads
      // [MF-AI-CHANGE] Firestore REJEITA undefined. Sem UTM salvo, utm.source é undefined
      // e o addDoc falhava ("Unsupported field value: undefined"). Coalescer p/ '' resolve.
      utm_source: utm.source || '',
      utm_campaign: utm.campaign || '',
      utm_medium: utm.medium || ''
    });
    fecharNovoLead();
    toast('Lead criado com sucesso', 'success');
  } catch (err) {
    console.error('Erro ao criar lead', err);
    toast('Erro ao criar lead: ' + (err?.message || err), 'error');
  } finally {
    if (btnSalvar) { btnSalvar.disabled = false; btnSalvar.textContent = 'Salvar lead'; }
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

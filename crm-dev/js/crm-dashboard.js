// [MF-AI-CHANGE] crm-dashboard.js — Dashboard metrics, notepad sync — 2026-05-22
// Handles: revenue metrics, conversion rate, traffic stats, debounced notepad (Firestore + localStorage)

import {
  doc, getDoc, setDoc
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';
import { formatBRL, parseDataFirestore } from './crm-utils.js';
import { COLUNAS, TITULOS, normalizarStatus } from './crm-kanban.js';
import { renderizarStatsKits, renderizarGraficoLeads } from './crm-stats.js';
import { calcularResumoFinanceiro } from './crm-financeiro.js';

// ─── MÉTRICAS DO KANBAN ────────────────────────────────────────
export function atualizarMetricas(leads) {
  const ativos = leads.filter(l => !l.deletado && l.status !== 'excluido' && l.status !== 'arquivado');
  const total = ativos.length;

  const negociacao = ativos.filter(l => {
    const s = String(l.status || '').toLowerCase();
    return s === 'contato' || s === 'proposta' || s === 'negociação' || s === 'negociacao';
  });

  const fechados = ativos.filter(l => String(l.status || '').toLowerCase() === 'fechado');

  const valorNegociacao = negociacao.reduce((acc, l) => acc + (parseFloat(l.valor) || 0), 0);
  const valorFechado = fechados.reduce((acc, l) => acc + (parseFloat(l.valor) || 0), 0);
  const conversao = total > 0 ? ((fechados.length / total) * 100).toFixed(0) : 0;

  const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };

  set('negociacao', formatBRL(valorNegociacao));
  set('fechadoTotal', formatBRL(valorFechado));
  set('totalLeads', total);
  set('conversao', conversao + '%');
}

// ─── FUNIL DE CONVERSÃO (contagem + R$ por estágio) ───────────
// Fonte única: reusa COLUNAS/TITULOS/normalizarStatus do kanban (sem drift).
export function calcularFunil(leads) {
  const ativos = (leads || []).filter(l => {
    const s = String(l.status || '').toLowerCase();
    return !l.deletado && s !== 'excluido' && s !== 'arquivado';
  });
  const base = {};
  COLUNAS.forEach(c => { base[c] = { count: 0, valor: 0 }; });
  ativos.forEach(l => {
    const s = normalizarStatus(l.status);
    if (!base[s]) base[s] = { count: 0, valor: 0 };
    base[s].count++;
    base[s].valor += parseFloat(l.valor) || 0;
  });
  return COLUNAS.map(c => ({
    stage: c,
    titulo: TITULOS[c] || c,
    count: base[c].count,
    valor: base[c].valor
  }));
}

export function renderFunilConversao(leads) {
  const el = document.getElementById('funilConversao');
  if (!el) return;
  const dados = calcularFunil(leads);
  const total = dados.reduce((a, d) => a + d.count, 0);
  const maxCount = Math.max(1, ...dados.map(d => d.count));
  el.innerHTML =
    `<div class="funil-head"><b>📊 Funil de Conversão</b><span class="funil-total">${total} leads ativos</span></div>` +
    dados.map(d => {
      const w = Math.round((d.count / maxCount) * 100);
      return `<div class="funil-linha">
        <span class="funil-nome">${d.titulo}</span>
        <span class="funil-barra"><span class="funil-fill" style="width:${w}%"></span></span>
        <span class="funil-num">${d.count}</span>
        <span class="funil-valor">${formatBRL(d.valor)}</span>
      </div>`;
    }).join('');
}

// ─── STATS DE TRÁFEGO (Visitas / Leads por período) ───────────
export function atualizarTrafico(leads, eventos) {
  const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
  const inicioSemana = new Date(hoje); inicioSemana.setDate(hoje.getDate() - hoje.getDay());
  const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
  const inicioAno = new Date(hoje.getFullYear(), 0, 1);

  // Visitas únicas por sessionId
  const visitasSet = { hoje: new Set(), semana: new Set(), mes: new Set(), ano: new Set() };

  (eventos || []).forEach(e => {
    if (e.evento !== 'pagina_abriu') return;
    const d = parseDataFirestore(e.criadoEm || e.data);
    if (!d) return;
    if (d >= hoje) visitasSet.hoje.add(e.sessionId);
    if (d >= inicioSemana) visitasSet.semana.add(e.sessionId);
    if (d >= inicioMes) visitasSet.mes.add(e.sessionId);
    if (d >= inicioAno) visitasSet.ano.add(e.sessionId);
  });

  // Leads por período
  let leadsHoje = 0, leadsSemana = 0, leadsMes = 0, leadsAno = 0;
  (leads || []).forEach(l => {
    if (l.deletado) return;
    const d = parseDataFirestore(l.data || l.createdAt || l.criadoEm);
    if (!d) return;
    if (d >= hoje) leadsHoje++;
    if (d >= inicioSemana) leadsSemana++;
    if (d >= inicioMes) leadsMes++;
    if (d >= inicioAno) leadsAno++;
  });

  const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };

  set('visitasHoje', visitasSet.hoje.size);
  set('visitasSemana', visitasSet.semana.size);
  set('visitasMes', visitasSet.mes.size);
  set('visitasAno', visitasSet.ano.size);

  set('leadsHoje', leadsHoje);
  set('leadsSemana', leadsSemana);
  set('leadsMes', leadsMes);
  set('leadsAno', leadsAno);
}

// ─── ANALYTICS MINI GRID NO DASHBOARD ─────────────────────────
export function atualizarAnalyticsMini(eventos) {
  const visitas = new Set(
    (eventos || []).filter(e => e.evento === 'pagina_abriu').map(e => e.sessionId)
  ).size;

  const scrolls = (eventos || []).filter(e => e.evento === 'scroll_profundo').length;
  const simulacoes = (eventos || []).filter(e => e.evento === 'clicou_simular').length;
  const telefones = (eventos || []).filter(e => e.evento === 'telefone_digitado').length;
  const propostas = (eventos || []).filter(e => e.evento === 'gerou_proposta').length;
  const whatsapp = (eventos || []).filter(e => e.evento === 'clicou_whatsapp').length;

  const el = document.getElementById('analytics');
  if (!el) return;

  const item = (icon, label, val) =>
    `<div class="glass-card metric-card"><b>${icon} ${label}</b><span class="metric-value">${val}</span></div>`;

  el.innerHTML =
    item('👁️', 'Visitas', visitas) +
    item('📜', 'Scroll', scrolls) +
    item('⚡', 'Simulações', simulacoes) +
    item('📞', 'Telefones', telefones) +
    item('📄', 'Propostas', propostas) +
    item('💬', 'WhatsApp', whatsapp);

}

// ─── SEGMENTO (Solar × Elétrica) — filtro do dashboard ─────────
let _dashTodos = [], _dashEventos = [];
let _segmento = 'todos';
let _periodo = 'tudo';
try { _segmento = localStorage.getItem('mf_segmento') || 'todos'; } catch (_) {}
try { _periodo = localStorage.getItem('mf_periodo') || 'tudo'; } catch (_) {}

function _dentroPeriodo(lead) {
  if (_periodo === 'tudo') return true;
  const d = parseDataFirestore(lead.data || lead.createdAt || lead.criadoEm);
  if (!d) return true; // sem data → não esconde
  const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
  if (_periodo === 'hoje') return d >= hoje;
  if (_periodo === 'semana') { const i = new Date(hoje); i.setDate(hoje.getDate() - hoje.getDay()); return d >= i; }
  if (_periodo === 'mes') return d >= new Date(hoje.getFullYear(), hoje.getMonth(), 1);
  if (_periodo === 'ano') return d >= new Date(hoje.getFullYear(), 0, 1);
  return true;
}

function renderResumoFinanceiro(leads) {
  const el = document.getElementById('resumoFinanceiroDash');
  if (!el) return;
  const r = calcularResumoFinanceiro(leads);
  const card = (t, v, cor) => `<div class="glass-card metric-card"><b>${t}</b><span class="metric-value" style="font-size:18px${cor ? ';color:' + cor : ''}">${formatBRL(v)}</span></div>`;
  el.innerHTML = card('📝 Contratos', r.totalContratos) + card('📈 Recebido', r.recebido, '#22c55e') + card('💸 Despesas', r.despesas, '#f59e0b') + card('⏳ A Receber', r.aReceber, '#60a5fa');
}

// Classificação de LEITURA (não grava): usa lead.segmento se existir, senão infere.
export function segmentoDe(lead) {
  const seg = String((lead && lead.segmento) || '').toLowerCase();
  if (seg === 'solar' || seg === 'eletrica') return seg;
  if (lead && lead.origemSistema === 'landing') return 'solar'; // landing = 100% solar
  if (lead && (lead.kwp || lead.kWp || lead.potencia || lead.geracao || lead.kitNome || lead.kit)) return 'solar';
  const txt = String((lead && (lead.observacao || lead.servico || lead.interesse || lead.mensagem)) || '').toLowerCase();
  if (/disjuntor|sem luz|sem energia|emerg|reforma|manuten|el[eé]tric|tomada|curto|padr[aã]o de entrada|quadro/.test(txt)) return 'eletrica';
  return 'solar'; // default histórico (CRM nasceu solar)
}

function _pintarBotoes() {
  document.querySelectorAll('.seg-btn').forEach(b => b.classList.toggle('ativo', b.dataset.seg === _segmento));
  document.querySelectorAll('.per-btn').forEach(b => b.classList.toggle('ativo', b.dataset.per === _periodo));
}

function _renderDash() {
  const base = _dashTodos.filter(_dentroPeriodo);
  const f = _segmento === 'todos' ? base : base.filter(l => segmentoDe(l) === _segmento);
  atualizarMetricas(f);
  renderFunilConversao(f);
  renderizarStatsKits(f, 'statsKitsDash');       // Performance por Kit (segment/período-aware)
  renderizarGraficoLeads(f, 'graficoLeadsDash'); // Leads por dia
  renderResumoFinanceiro(f);                     // Financeiro na Central
  atualizarOrigensLeads(f);
  atualizarTrafico(_dashTodos, _dashEventos);   // tráfego = visitas da landing → global
  atualizarAnalyticsMini(_dashEventos);
}

export function setSegmento(seg) {
  _segmento = seg;
  try { localStorage.setItem('mf_segmento', seg); } catch (_) {}
  _renderDash();
  _pintarBotoes();
}
if (typeof window !== 'undefined') window.mfSetSegmento = setSegmento;

export function setPeriodo(per) {
  _periodo = per;
  try { localStorage.setItem('mf_periodo', per); } catch (_) {}
  _renderDash();
  _pintarBotoes();
}
if (typeof window !== 'undefined') window.mfSetPeriodo = setPeriodo;

export function atualizarDashboardCompleto(leads, eventos, landingLeads = []) {
  _dashTodos = [...(leads || []), ...(landingLeads || [])];
  _dashEventos = eventos;
  _renderDash();
  _pintarBotoes();
}

/** Top origens e campanhas (leads ativos) */
export function atualizarOrigensLeads(leads) {
  const ativos = (leads || []).filter(l => !l.deletado);
  const origens = {};
  const campanhas = {};

  ativos.forEach(l => {
    const o = l.utm_source || 'direto';
    const c = l.utm_campaign || '-';
    origens[o] = (origens[o] || 0) + 1;
    campanhas[c] = (campanhas[c] || 0) + 1;
  });

  const topOrigem = Object.entries(origens).sort((a, b) => b[1] - a[1])[0];
  const topCampanha = Object.entries(campanhas).sort((a, b) => b[1] - a[1])[0];

  const el = document.getElementById('analytics');
  if (!el || !topOrigem) return;

  const extra = document.getElementById('analyticsOrigens');
  if (!extra) {
    const div = document.createElement('div');
    div.id = 'analyticsOrigens';
    div.className = 'dashboard-metrics';
    div.style.marginTop = '12px';
    el.parentNode?.insertBefore(div, el.nextSibling);
  }

  const box = document.getElementById('analyticsOrigens');
  if (box) {
    box.innerHTML =
      `<div class="glass-card metric-card"><b>📍 Top origem</b><span class="metric-value">${topOrigem[0]} (${topOrigem[1]})</span></div>` +
      `<div class="glass-card metric-card"><b>📢 Top campanha</b><span class="metric-value">${topCampanha ? topCampanha[0] : '-'} (${topCampanha ? topCampanha[1] : 0})</span></div>`;
  }
}

// ─── NOTEPAD COM DEBOUNCE E FALLBACK localStorage ─────────────
let _debounceNotas = null;

export function iniciarNotepad(db, userId) {
  const notasBox = document.getElementById('notasInternas');
  const notasStatus = document.getElementById('notasStatus');
  if (!notasBox || !db || !userId) return;

  const notasRef = doc(db, 'crm_config', userId);
  const storageKey = 'crm_notas_' + userId;

  // 1. Carrega imediatamente do localStorage
  const localNotas = localStorage.getItem(storageKey);
  if (localNotas) notasBox.value = localNotas;

  // 2. Carrega do Firestore (fonte verdadeira) e sincroniza
  getDoc(notasRef).then(snap => {
    if (snap.exists()) {
      const firestoreText = snap.data().texto || '';
      if (!localNotas || localNotas !== firestoreText) {
        notasBox.value = firestoreText;
        localStorage.setItem(storageKey, firestoreText);
      }
    }
    if (notasStatus) notasStatus.textContent = '✅ Sincronizado';
  }).catch(err => {
    console.warn('[CRM-Dashboard] Notas fetch erro:', err);
    if (notasStatus) notasStatus.textContent = '⚠️ Offline';
  });

  // 3. Autosave com debounce de 1s
  notasBox.addEventListener('input', () => {
    const val = notasBox.value;
    localStorage.setItem(storageKey, val);
    if (notasStatus) notasStatus.textContent = '💾 Salvando...';

    if (_debounceNotas) clearTimeout(_debounceNotas);
    _debounceNotas = setTimeout(async () => {
      try {
        await setDoc(notasRef, {
          texto: val,
          atualizadoEm: new Date().toISOString()
        });
        if (notasStatus) notasStatus.textContent = '✅ Salvo';
        console.log('[CRM-Dashboard] Notas sincronizadas.');
      } catch (e) {
        console.error('[CRM-Dashboard] Erro ao salvar notas:', e);
        if (notasStatus) notasStatus.textContent = '❌ Erro ao salvar';
      }
    }, 1000);
  });
}

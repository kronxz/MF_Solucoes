/**
 * action-center.js — MF Control Center
 * CC-10: Action Center — Painel operacional 100% determinístico.
 * Fonte exclusiva: coleções docs_* do Firestore (CC-9).
 * Sem IA. Sem inferência. Somente regras objetivas.
 */

import { db } from '../firebase-config.js';
import {
  collection, getDocs, query, orderBy,
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';

// ── Coleções (mesmas do CC-9) ─────────────────────────────────────────────────
const COL = {
  clientes:   'docs_clientes',
  propostas:  'docs_propostas',
  obras:      'docs_obras',
  laudos:     'docs_laudos',
  orcamentos: 'docs_orcamentos',
  midias:     'docs_midias',
};

// ── Estado ────────────────────────────────────────────────────────────────────
const D = {
  clientes:   [],
  propostas:  [],
  obras:      [],
  laudos:     [],
  orcamentos: [],
  midias:     [],
};

let _iniciado = false;

function esc(s) {
  if (s == null) return '';
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ── Init ──────────────────────────────────────────────────────────────────────
export async function actionCenterInit() {
  if (_iniciado) return;
  _iniciado = true;

  const container = document.getElementById('page-action-center');
  if (!container) return;

  _buildShell(container);
  await _loadAll(container);
}

// ── Recarregar (para o botão Atualizar) ──────────────────────────────────────
async function _reload(container) {
  const badge = document.getElementById('ac-status');
  if (badge) { badge.textContent = '⟳ Atualizando...'; badge.style.color = '#fbbf24'; }
  await _loadAll(container);
}

// ── Shell da UI ───────────────────────────────────────────────────────────────
function _buildShell(container) {
  container.innerHTML = `
    <div class="ac-wrap">

      <div class="dash-header">
        <div>
          <h2>⚡ Action Center</h2>
          <p class="dash-sub">Painel operacional em tempo real · Dados CC-9 · 100% determinístico</p>
        </div>
        <div style="display:flex;gap:8px;align-items:center;">
          <button id="ac-refresh-btn" class="btn-backup" style="font-size:11px;padding:4px 12px;">🔄 Atualizar</button>
          <span id="ac-status" class="badge-safe">⟳ Carregando...</span>
        </div>
      </div>

      <!-- 10.2 — Painel Comercial -->
      <div class="ac-section-title">📊 Painel Comercial</div>
      <div id="ac-comercial" class="ac-kpi-grid"></div>

      <!-- 10.3 — Painel Operacional -->
      <div class="ac-section-title">🏗️ Painel Operacional</div>
      <div id="ac-operacional" class="ac-kpi-grid"></div>

      <!-- 10.1 — O que exige atenção -->
      <div class="ac-section-title">⚠️ O que exige atenção</div>
      <div id="ac-atencao"></div>

      <!-- 10.4 — Ranking de Prioridades -->
      <div class="ac-section-title">🎯 Ranking de Prioridades — Top 10</div>
      <div id="ac-ranking"></div>

    </div>
  `;

  document.getElementById('ac-refresh-btn').addEventListener('click', () => _reload(container));
}

// ── Carregamento ──────────────────────────────────────────────────────────────
async function _loadAll(container) {
  try {
    const [sc, sp, so, sl, sor, sm] = await Promise.all([
      getDocs(query(collection(db, COL.clientes))),
      getDocs(query(collection(db, COL.propostas))),
      getDocs(query(collection(db, COL.obras))),
      getDocs(query(collection(db, COL.laudos))),
      getDocs(query(collection(db, COL.orcamentos))),
      getDocs(query(collection(db, COL.midias))),
    ]);

    D.clientes   = sc.docs.map(d => ({ id: d.id, ...d.data() }));
    D.propostas  = sp.docs.map(d => ({ id: d.id, ...d.data() }));
    D.obras      = so.docs.map(d => ({ id: d.id, ...d.data() }));
    D.laudos     = sl.docs.map(d => ({ id: d.id, ...d.data() }));
    D.orcamentos = sor.docs.map(d => ({ id: d.id, ...d.data() }));
    D.midias     = sm.docs.map(d => ({ id: d.id, ...d.data() }));

    _renderComercial();
    _renderOperacional();
    _renderAtencao();
    _renderRanking();

    const badge = document.getElementById('ac-status');
    if (badge) {
      const t = D.clientes.length + D.propostas.length + D.obras.length + D.laudos.length + D.orcamentos.length + D.midias.length;
      badge.textContent = `✅ ${t} registros`;
      badge.style.color = '#86efac';
      badge.style.background = '#14532d';
    }
  } catch (e) {
    console.error('[AC] load error:', e);
    const badge = document.getElementById('ac-status');
    if (badge) { badge.textContent = '⚠️ Erro: ' + e.message; badge.style.color = '#fca5a5'; }
  }
}

// ── 10.2 — Painel Comercial ───────────────────────────────────────────────────
function _renderComercial() {
  const el = document.getElementById('ac-comercial');
  if (!el) return;

  const kpis = [
    { icon: '👤', label: 'Clientes',    val: D.clientes.length,   cor: '#3b82f6' },
    { icon: '📄', label: 'Propostas',   val: D.propostas.length,  cor: '#f59e0b' },
    { icon: '🏗️', label: 'Obras',       val: D.obras.length,      cor: '#8b5cf6' },
    { icon: '📋', label: 'Laudos',      val: D.laudos.length,     cor: '#10b981' },
    { icon: '💰', label: 'Orçamentos',  val: D.orcamentos.length, cor: '#06b6d4' },
    { icon: '🖼️', label: 'Mídias',      val: D.midias.length,     cor: '#ec4899' },
  ];

  el.innerHTML = kpis.map(k => `
    <div class="ac-kpi-card" style="border-left:3px solid ${k.cor};">
      <div class="ac-kpi-icon">${k.icon}</div>
      <div class="ac-kpi-val" style="color:${k.cor};">${k.val}</div>
      <div class="ac-kpi-label">${k.label}</div>
    </div>
  `).join('');
}

// ── 10.3 — Painel Operacional ─────────────────────────────────────────────────
function _renderOperacional() {
  const el = document.getElementById('ac-operacional');
  if (!el) return;

  // Obras por status
  const statusCount = {};
  for (const o of D.obras) {
    const s = o.status || 'Sem status';
    statusCount[s] = (statusCount[s] || 0) + 1;
  }

  // Documentos pendentes: propostas sem arquivo
  const propSemArquivo   = D.propostas.filter(p => !p.arquivo).length;
  const laudosSemArquivo = D.laudos.filter(l => !l.arquivo).length;
  const orcSemArquivo    = D.orcamentos.filter(o => !o.arquivo).length;
  const docsPendentes    = propSemArquivo + laudosSemArquivo + orcSemArquivo;

  // Vínculos ausentes
  const vincAusentes = _contarVinculosAusentes();

  const statusItems = Object.entries(statusCount)
    .sort(([,a],[,b]) => b - a)
    .map(([s, n]) => {
      const cor = s === 'Concluída' ? '#22c55e'
                : s === 'Em Andamento' ? '#f59e0b'
                : s === 'Cancelada' ? '#ef4444'
                : '#94a3b8';
      return `<span class="ac-status-chip" style="border-color:${cor};color:${cor};">${esc(s)}: ${n}</span>`;
    })
    .join('');

  el.innerHTML = `
    <div class="ac-kpi-card" style="border-left:3px solid #8b5cf6;grid-column:span 2;">
      <div class="ac-kpi-icon">🏗️</div>
      <div>
        <div class="ac-kpi-label" style="margin-bottom:6px;">Obras por Status</div>
        <div class="ac-status-chips">
          ${D.obras.length === 0
            ? '<span class="ac-status-chip" style="color:#94a3b8;">Nenhuma obra</span>'
            : statusItems}
        </div>
      </div>
    </div>
    <div class="ac-kpi-card" style="border-left:3px solid #f59e0b;">
      <div class="ac-kpi-icon">📑</div>
      <div class="ac-kpi-val" style="color:${docsPendentes > 0 ? '#f59e0b' : '#22c55e'};">${docsPendentes}</div>
      <div class="ac-kpi-label">Docs sem arquivo</div>
    </div>
    <div class="ac-kpi-card" style="border-left:3px solid ${vincAusentes > 0 ? '#ef4444' : '#22c55e'};">
      <div class="ac-kpi-icon">🔗</div>
      <div class="ac-kpi-val" style="color:${vincAusentes > 0 ? '#ef4444' : '#22c55e'};">${vincAusentes}</div>
      <div class="ac-kpi-label">Vínculos ausentes</div>
    </div>
  `;
}

function _contarVinculosAusentes() {
  let n = 0;
  const clienteIds = new Set(D.clientes.map(c => c.id));
  const obraIds    = new Set(D.obras.map(o => o.id));
  const propostaIds= new Set(D.propostas.map(p => p.id));

  // Propostas sem cliente válido
  n += D.propostas.filter(p => p.clienteId && !clienteIds.has(p.clienteId)).length;
  // Obras sem cliente válido
  n += D.obras.filter(o => o.clienteId && !clienteIds.has(o.clienteId)).length;
  // Laudos sem obra válida
  n += D.laudos.filter(l => l.obraId && !obraIds.has(l.obraId)).length;
  // Orçamentos sem obra válida
  n += D.orcamentos.filter(r => r.obraId && !obraIds.has(r.obraId)).length;
  // Mídias sem obra válida
  n += D.midias.filter(m => m.obraId && !obraIds.has(m.obraId)).length;
  return n;
}

// ── 10.1 — O que exige atenção ────────────────────────────────────────────────
function _renderAtencao() {
  const el = document.getElementById('ac-atencao');
  if (!el) return;

  const alertas = _calcularAlertas();

  if (alertas.length === 0) {
    el.innerHTML = `
      <div class="ac-ok-banner">
        <span>✅</span>
        <span>Nenhuma pendência encontrada. Todos os registros estão completos e vinculados.</span>
      </div>`;
    return;
  }

  el.innerHTML = `
    <div class="ac-alerta-grid">
      ${alertas.map(a => `
        <div class="ac-alerta-card ac-alerta-card--${a.nivel}">
          <div class="ac-alerta-header">
            <span class="ac-alerta-icon">${a.icon}</span>
            <span class="ac-alerta-titulo">${esc(a.titulo)}</span>
            <span class="ac-alerta-count">${a.itens.length}</span>
          </div>
          <div class="ac-alerta-desc">${esc(a.desc)}</div>
          ${a.itens.length > 0 ? `
            <ul class="ac-alerta-lista">
              ${a.itens.slice(0, 5).map(i => `<li>${esc(i)}</li>`).join('')}
              ${a.itens.length > 5 ? `<li class="ac-alerta-mais">... e mais ${a.itens.length - 5} item(s)</li>` : ''}
            </ul>
          ` : ''}
        </div>
      `).join('')}
    </div>
  `;
}

function _calcularAlertas() {
  const alertas = [];
  const clienteIds  = new Set(D.clientes.map(c => c.id));
  const obraIds     = new Set(D.obras.map(o => o.id));
  const propostaIds = new Set(D.propostas.map(p => p.id));

  // 1. Propostas sem cliente
  const propSemCliente = D.propostas.filter(p => !p.clienteId);
  if (propSemCliente.length > 0) {
    alertas.push({
      nivel: 'alto',
      icon: '📄',
      titulo: 'Propostas sem cliente vinculado',
      desc: 'Estas propostas não estão associadas a nenhum cliente.',
      itens: propSemCliente.map(p => p.titulo || p.arquivoNome || p.id),
    });
  }

  // 2. Obras sem proposta
  const obrasSemProposta = D.obras.filter(o => !o.propostaId);
  if (obrasSemProposta.length > 0) {
    alertas.push({
      nivel: 'medio',
      icon: '🏗️',
      titulo: 'Obras sem proposta vinculada',
      desc: 'Estas obras não têm proposta de origem registrada.',
      itens: obrasSemProposta.map(o => o.titulo || o.id),
    });
  }

  // 3. Obras sem cliente
  const obrasSemCliente = D.obras.filter(o => !o.clienteId);
  if (obrasSemCliente.length > 0) {
    alertas.push({
      nivel: 'alto',
      icon: '🏗️',
      titulo: 'Obras sem cliente vinculado',
      desc: 'Estas obras não estão associadas a nenhum cliente.',
      itens: obrasSemCliente.map(o => o.titulo || o.id),
    });
  }

  // 4. Laudos sem obra
  const laudosSemObra = D.laudos.filter(l => !l.obraId);
  if (laudosSemObra.length > 0) {
    alertas.push({
      nivel: 'medio',
      icon: '📋',
      titulo: 'Laudos sem obra vinculada',
      desc: 'Estes laudos não estão associados a nenhuma obra.',
      itens: laudosSemObra.map(l => l.categoria || l.arquivoNome || l.id),
    });
  }

  // 5. Orçamentos sem obra
  const orcSemObra = D.orcamentos.filter(o => !o.obraId);
  if (orcSemObra.length > 0) {
    alertas.push({
      nivel: 'medio',
      icon: '💰',
      titulo: 'Orçamentos sem obra vinculada',
      desc: 'Estes orçamentos não estão associados a nenhuma obra.',
      itens: orcSemObra.map(o => o.categoria || o.arquivoNome || o.id),
    });
  }

  // 6. Mídias sem obra
  const midiasSemObra = D.midias.filter(m => !m.obraId);
  if (midiasSemObra.length > 0) {
    alertas.push({
      nivel: 'baixo',
      icon: '🖼️',
      titulo: 'Mídias sem obra vinculada',
      desc: 'Estas mídias foram importadas mas não foram associadas a nenhuma obra.',
      itens: midiasSemObra.map(m => m.legenda || m.arquivoNome || m.id).slice(0, 10),
    });
  }

  // 7. Clientes sem atividade (sem propostas e sem obras)
  const clientesSemAtividade = D.clientes.filter(c => {
    const temProposta = D.propostas.some(p => p.clienteId === c.id);
    const temObra     = D.obras.some(o => o.clienteId === c.id);
    return !temProposta && !temObra;
  });
  if (clientesSemAtividade.length > 0) {
    alertas.push({
      nivel: 'baixo',
      icon: '👤',
      titulo: 'Clientes sem atividade',
      desc: 'Estes clientes não possuem propostas nem obras registradas.',
      itens: clientesSemAtividade.map(c => c.nome || c.id),
    });
  }

  // 8. Propostas sem arquivo
  const propSemArquivo = D.propostas.filter(p => !p.arquivo);
  if (propSemArquivo.length > 0) {
    alertas.push({
      nivel: 'medio',
      icon: '📄',
      titulo: 'Propostas sem arquivo PDF',
      desc: 'Estas propostas foram cadastradas mas não têm arquivo vinculado.',
      itens: propSemArquivo.map(p => p.titulo || p.id),
    });
  }

  // 9. Obras em andamento sem laudos
  const obrasEmAndamentoSemLaudo = D.obras.filter(o => {
    const s = (o.status || '').toLowerCase();
    if (s !== 'em andamento' && s !== 'concluída' && s !== 'concluido') return false;
    return !D.laudos.some(l => l.obraId === o.id);
  });
  if (obrasEmAndamentoSemLaudo.length > 0) {
    alertas.push({
      nivel: 'medio',
      icon: '📋',
      titulo: 'Obras ativas sem laudo técnico',
      desc: 'Obras em andamento ou concluídas que não têm laudo técnico registrado.',
      itens: obrasEmAndamentoSemLaudo.map(o => o.titulo || o.id),
    });
  }

  // 10. Obras sem orçamento
  const obrasSemOrc = D.obras.filter(o => !D.orcamentos.some(r => r.obraId === o.id));
  if (obrasSemOrc.length > 0) {
    alertas.push({
      nivel: 'baixo',
      icon: '💰',
      titulo: 'Obras sem orçamento registrado',
      desc: 'Estas obras não têm nenhum orçamento vinculado.',
      itens: obrasSemOrc.map(o => o.titulo || o.id),
    });
  }

  return alertas;
}

// ── 10.4 — Ranking de Prioridades ────────────────────────────────────────────
function _renderRanking() {
  const el = document.getElementById('ac-ranking');
  if (!el) return;

  const itens = _calcularRanking();

  if (itens.length === 0) {
    el.innerHTML = `
      <div class="ac-ok-banner">
        <span>🎯</span>
        <span>Nenhuma pendência crítica. Sistema operacional está em ordem.</span>
      </div>`;
    return;
  }

  el.innerHTML = `
    <div class="ac-ranking-list">
      ${itens.map((item, i) => `
        <div class="ac-ranking-item">
          <div class="ac-rank-num ac-rank-num--${item.nivel}">${i + 1}</div>
          <div class="ac-rank-icon">${item.icon}</div>
          <div class="ac-rank-body">
            <div class="ac-rank-titulo">${esc(item.titulo)}</div>
            <div class="ac-rank-desc">${esc(item.desc)}</div>
          </div>
          <div class="ac-rank-impacto ac-rank-impacto--${item.nivel}">
            ${item.nivel === 'critico' ? '🔴 Crítico'
            : item.nivel === 'alto'   ? '🟠 Alto'
            : item.nivel === 'medio'  ? '🟡 Médio'
            :                           '🔵 Baixo'}
          </div>
        </div>
      `).join('')}
    </div>
  `;
}

function _calcularRanking() {
  const itens = [];
  const clienteIds  = new Set(D.clientes.map(c => c.id));
  const obraIds     = new Set(D.obras.map(o => o.id));

  // ─ Crítico ─
  // Proposta sem cliente — bloqueia rastreabilidade
  const n1 = D.propostas.filter(p => !p.clienteId).length;
  if (n1 > 0) itens.push({
    nivel: 'critico', icon: '📄',
    titulo: `${n1} proposta${n1>1?'s':''} sem cliente vinculado`,
    desc: 'Sem cliente, a proposta não pode ser rastreada nem faturada.',
  });

  // Obra sem cliente — sem responsável
  const n2 = D.obras.filter(o => !o.clienteId).length;
  if (n2 > 0) itens.push({
    nivel: 'critico', icon: '🏗️',
    titulo: `${n2} obra${n2>1?'s':''} sem cliente responsável`,
    desc: 'Obra sem cliente registrado compromete responsabilidade técnica e comercial.',
  });

  // ─ Alto ─
  // Obra sem proposta
  const n3 = D.obras.filter(o => !o.propostaId).length;
  if (n3 > 0) itens.push({
    nivel: 'alto', icon: '🏗️',
    titulo: `${n3} obra${n3>1?'s':''} sem proposta de origem`,
    desc: 'Obra sem proposta perde rastreabilidade comercial.',
  });

  // Obra ativa sem laudo
  const n4 = D.obras.filter(o => {
    const s = (o.status || '').toLowerCase();
    return (s === 'em andamento' || s.includes('conclu')) && !D.laudos.some(l => l.obraId === o.id);
  }).length;
  if (n4 > 0) itens.push({
    nivel: 'alto', icon: '📋',
    titulo: `${n4} obra${n4>1?'s':''} ativa${n4>1?'s':''} sem laudo técnico`,
    desc: 'Obras em andamento sem laudo técnico representam risco de conformidade.',
  });

  // Proposta sem arquivo
  const n5 = D.propostas.filter(p => !p.arquivo).length;
  if (n5 > 0) itens.push({
    nivel: 'alto', icon: '📄',
    titulo: `${n5} proposta${n5>1?'s':''} sem arquivo PDF`,
    desc: 'Propostas sem arquivo não podem ser apresentadas ao cliente.',
  });

  // ─ Médio ─
  // Laudo sem obra
  const n6 = D.laudos.filter(l => !l.obraId).length;
  if (n6 > 0) itens.push({
    nivel: 'medio', icon: '📋',
    titulo: `${n6} laudo${n6>1?'s':''} sem obra vinculada`,
    desc: 'Laudos órfãos não contribuem para o histórico técnico de nenhuma obra.',
  });

  // Orçamento sem obra
  const n7 = D.orcamentos.filter(o => !o.obraId).length;
  if (n7 > 0) itens.push({
    nivel: 'medio', icon: '💰',
    titulo: `${n7} orçamento${n7>1?'s':''} sem obra vinculada`,
    desc: 'Orçamentos sem obra não podem ser comparados ao custo real.',
  });

  // Obra sem orçamento
  const n8 = D.obras.filter(o => !D.orcamentos.some(r => r.obraId === o.id)).length;
  if (n8 > 0) itens.push({
    nivel: 'medio', icon: '💰',
    titulo: `${n8} obra${n8>1?'s':''} sem orçamento registrado`,
    desc: 'Obras sem orçamento não permitem controle de custo.',
  });

  // ─ Baixo ─
  // Cliente sem atividade
  const n9 = D.clientes.filter(c =>
    !D.propostas.some(p => p.clienteId === c.id) &&
    !D.obras.some(o => o.clienteId === c.id)
  ).length;
  if (n9 > 0) itens.push({
    nivel: 'baixo', icon: '👤',
    titulo: `${n9} cliente${n9>1?'s':''} sem atividade`,
    desc: 'Clientes sem propostas ou obras podem ser prospects não convertidos.',
  });

  // Mídias sem obra
  const n10 = D.midias.filter(m => !m.obraId).length;
  if (n10 > 0) itens.push({
    nivel: 'baixo', icon: '🖼️',
    titulo: `${n10} mídia${n10>1?'s':''} sem obra vinculada`,
    desc: 'Mídias órfãs não enriquecem o histórico de nenhuma obra.',
  });

  // Ordenar: critico > alto > medio > baixo, depois por título
  const ordem = { critico: 0, alto: 1, medio: 2, baixo: 3 };
  itens.sort((a, b) => (ordem[a.nivel] - ordem[b.nivel]) || a.titulo.localeCompare(b.titulo));

  return itens.slice(0, 10);
}

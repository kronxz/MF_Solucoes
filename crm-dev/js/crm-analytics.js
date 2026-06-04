// [MF-AI-CHANGE] crm-analytics.js — Traffic summary + IA event copy box — 2026-05-22

import { toast } from './crm-utils.js';
import { EVENTS_TEXTAREA_LIMIT } from './crm-config.js';

export function iniciarAnalytics() {
  // Toggle eventos brutos
  document.getElementById('toggleEventos')?.addEventListener('click', () => {
    const box = document.getElementById('eventosBrutos');
    if (!box) return;
    const aberto = box.style.display !== 'none';
    box.style.display = aberto ? 'none' : 'block';
    const btn = document.getElementById('toggleEventos');
    if (btn) btn.textContent = aberto ? '🧠 Ver eventos completos IA' : '🙈 Ocultar eventos';
  });

  // Copiar para IA
  document.getElementById('btn-copiar-eventos')?.addEventListener('click', () => {
    const textarea = document.getElementById('textoEventos');
    if (!textarea) return;
    textarea.select();
    try {
      navigator.clipboard.writeText(textarea.value).then(() => {
        const btn = document.getElementById('btn-copiar-eventos');
        if (btn) { btn.textContent = '✅ Copiado!'; setTimeout(() => { btn.textContent = '📋 Copiar para IA'; }, 2000); }
        toast('Eventos copiados para IA', 'success');
      });
    } catch {
      document.execCommand('copy');
    }
  });
}

// ─── RESUMO EXECUTIVO ────────────────────────────────────────
export function renderizarAnalytics(eventos, leads = [], updatedAt = null, landingLeads = []) {
  const ativos = [...(leads||[]), ...(landingLeads||[])].filter(l => !l.deletado);
  const fechados = ativos.filter(l => String(l.status || '').toLowerCase() === 'fechado');
  const taxaConversao = ativos.length ? ((fechados.length / ativos.length) * 100).toFixed(0) : 0;

  // Single-pass aggregation for events (calculadora) to reduce allocations
  const sessions = new Set();
  let totalSimulacoes = 0, totalWhatsapp = 0, totalPropostas = 0, totalScrolls = 0, totalTelefones = 0;
  (eventos || []).forEach(e => {
    const ev = e.evento;
    if (ev === 'pagina_abriu') sessions.add(e.sessionId);
    else if (ev === 'clicou_simular') totalSimulacoes += 1;
    else if (ev === 'clicou_whatsapp') totalWhatsapp += 1;
    else if (ev === 'gerou_proposta') totalPropostas += 1;
    else if (ev === 'scroll_profundo') totalScrolls += 1;
    else if (ev === 'telefone_digitado') totalTelefones += 1;
  });

  // Métricas landing (campos gravados em lp_leads)
  (landingLeads || []).filter(l => !l.deletado).forEach(l => {
    if (l.sessionId) sessions.add(l.sessionId);
    totalWhatsapp  += Number(l.cliquesWhatsapp) || 0;
    totalTelefones += l.digitouTelefone === true ? 1 : 0;
    totalScrolls   += (l.scrollMaximoPercentual || 0) >= 50 ? 1 : 0;
    if (String(l.status || '').toLowerCase() === 'proposta') totalPropostas += 1;
  });

  const totalVisitas = sessions.size;

  const el = document.getElementById('analyticsResumo');
  const live = document.getElementById('analyticsLive');
  if (!el) return;

  if (live) {
    const n = (eventos || []).length;
    const ts = updatedAt
      ? new Date(updatedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      : '—';
    live.textContent = `🟢 ${n} eventos · atualizado ${ts}`;
    live.classList.add('crm-live-pulse');
    setTimeout(() => live.classList.remove('crm-live-pulse'), 600);
  }

  const card = (icon, label, val, cor = '') =>
    `<div class="glass-card metric-card"><b>${icon} ${label}</b><span class="metric-value"${cor ? ` style="color:${cor}"` : ''}>${val}</span></div>`;

  // Breakdown de origens, campanhas e QR codes
  const origensMap = {};
  const campanhasMap = {};
  const qrMap = {};
  [...(leads||[]), ...(landingLeads||[])].filter(l => !l.deletado && l.status !== 'excluido').forEach(l => {
    const o = l.utm_source || 'direto';
    const c = l.utm_campaign || '-';
    const q = l.qr_code || l.utm_content || null;
    origensMap[o] = (origensMap[o] || 0) + 1;
    campanhasMap[c] = (campanhasMap[c] || 0) + 1;
    if (q) qrMap[q] = (qrMap[q] || 0) + 1;
  });

  const topN = (obj, n = 5) => Object.entries(obj).sort((a, b) => b[1] - a[1]).slice(0, n);
  const rankHtml = (items, label) => items.length
    ? items.map(([k, v]) => `<div style="display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px solid rgba(255,255,255,0.04)"><span>${escHtml(k)}</span><b style="color:#22c55e">${v}</b></div>`).join('')
    : `<p class="crm-timeline-empty">Sem dados de ${label}</p>`;

  function escHtml(s) {
    return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
  }

  el.innerHTML = `
<div class="glass-card" style="padding:24px; margin-bottom:20px">
  <h2 style="margin-top:0">📈 Resumo Executivo</h2>
  <div class="analytics-resumo-grid">
    ${card('👁️', 'Visitas', totalVisitas)}
    ${card('📜', 'Scrolls', totalScrolls)}
    ${card('⚡', 'Simulações', totalSimulacoes, '#f59e0b')}
    ${card('📞', 'Telefones', totalTelefones)}
    ${card('📄', 'Propostas', totalPropostas, '#38bdf8')}
    ${card('💬', 'WhatsApp', totalWhatsapp, '#22c55e')}
    ${card('🎯', 'Conversão CRM', taxaConversao + '%', '#a78bfa')}
    ${card('✅', 'Fechados', fechados.length, '#22c55e')}
  </div>
</div>
<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:16px;margin-bottom:20px">
  <div class="glass-card" style="padding:18px">
    <h3 style="margin-top:0;font-size:14px">📍 Top Origens</h3>
    ${rankHtml(topN(origensMap), 'origens')}
  </div>
  <div class="glass-card" style="padding:18px">
    <h3 style="margin-top:0;font-size:14px">📢 Top Campanhas</h3>
    ${rankHtml(topN(campanhasMap), 'campanhas')}
  </div>
  <div class="glass-card" style="padding:18px">
    <h3 style="margin-top:0;font-size:14px">📍 QR Codes</h3>
    ${rankHtml(topN(qrMap), 'QR codes')}
  </div>
</div>`;

  // Preenche o textarea de eventos brutos
  preencherEventosBrutos(eventos, EVENTS_TEXTAREA_LIMIT);
}

// ─── EVENTOS BRUTOS PARA IA ───────────────────────────────────
function preencherEventosBrutos(eventos, limit = 200) {
  const textarea = document.getElementById('textoEventos');
  if (!textarea) return;

  const out = [];
  const lista = (eventos || []).slice(-limit).reverse();
  for (let i = 0; i < lista.length; i++) {
    const ev = lista[i];
    out.push(`🔥 ${ev.evento}`);
    out.push(`Score: ${ev.score || 0}`);
    out.push(`Origem: ${ev.utm_source || 'direto'}`);
    out.push(`Campanha: ${ev.utm_campaign || '-'}`);
    out.push(`Sessão: ${ev.sessionId || '-'}`);
    out.push('━━━━━━━━━━━━━━');
    out.push('');
  }

  textarea.value = out.length ? out.join('\n') : 'Nenhum evento registrado ainda.';
}

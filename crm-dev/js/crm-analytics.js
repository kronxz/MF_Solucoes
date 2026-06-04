// [MF-AI-CHANGE] crm-analytics.js — Traffic summary + IA event copy box — 2026-05-22

import { toast, escHtml } from './crm-utils.js';
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
  const todosLeads = [...(leads || []), ...(landingLeads || [])];
  const ativos  = todosLeads.filter(l => !l.deletado && l.status !== 'excluido');
  const fechados = ativos.filter(l => String(l.status || '').toLowerCase() === 'fechado');
  const taxaConversao = ativos.length ? ((fechados.length / ativos.length) * 100).toFixed(0) : 0;

  // Agregação de eventos
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
  const totalVisitas = sessions.size;

  // QR / UTM breakdown por campanha
  const campanhas = {};
  ativos.forEach(l => {
    const camp = l.utm_campaign || l.utm_source || 'direto';
    if (!campanhas[camp]) campanhas[camp] = { leads: 0, fechados: 0, whatsapp: 0 };
    campanhas[camp].leads++;
    if (String(l.status || '').toLowerCase() === 'fechado') campanhas[camp].fechados++;
    if (l.cliquesWhatsapp > 0) campanhas[camp].whatsapp++;
  });
  const campTop = Object.entries(campanhas).sort((a, b) => b[1].leads - a[1].leads).slice(0, 8);

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

  const campRows = campTop.map(([camp, d]) => {
    const conv = d.leads > 0 ? ((d.fechados / d.leads) * 100).toFixed(0) : 0;
    return `<tr>
      <td style="padding:6px 12px;color:#e2e8f0">${escHtml(camp)}</td>
      <td style="padding:6px 12px;text-align:center;color:#38bdf8">${d.leads}</td>
      <td style="padding:6px 12px;text-align:center;color:#22c55e">${d.fechados}</td>
      <td style="padding:6px 12px;text-align:center;color:#f59e0b">${conv}%</td>
    </tr>`;
  }).join('');

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
    ${card('👥', 'Leads Ativos', ativos.length, '#94a3b8')}
  </div>
</div>
${campTop.length ? `
<div class="glass-card" style="padding:24px;margin-bottom:20px">
  <h2 style="margin-top:0">📍 Por Origem / QR Code</h2>
  <table style="width:100%;border-collapse:collapse;font-size:13px">
    <thead>
      <tr style="color:#64748b;border-bottom:1px solid rgba(255,255,255,0.08)">
        <th style="padding:6px 12px;text-align:left">Campanha / Origem</th>
        <th style="padding:6px 12px">Leads</th>
        <th style="padding:6px 12px">Fechados</th>
        <th style="padding:6px 12px">Conversão</th>
      </tr>
    </thead>
    <tbody>${campRows}</tbody>
  </table>
</div>` : ''}`;

  // Relatório completo para IA
  preencherRelatorioIA(eventos, ativos, fechados, campanhas, totalVisitas, totalSimulacoes, totalWhatsapp, EVENTS_TEXTAREA_LIMIT);
}

// ─── RELATÓRIO COMPLETO PARA IA ───────────────────────────────
function preencherRelatorioIA(eventos, ativos, fechados, campanhas, visitas, simulacoes, whatsapp, limit) {
  const textarea = document.getElementById('textoEventos');
  if (!textarea) return;

  const agora = new Date().toLocaleString('pt-BR');
  const out = [];

  out.push('══════════════════════════════════════════');
  out.push('  RELATÓRIO COMPLETO MF SOLUÇÕES — ' + agora);
  out.push('══════════════════════════════════════════');
  out.push('');

  // TRÁFEGO
  out.push('📊 TRÁFEGO');
  out.push(`  Visitas únicas: ${visitas}`);
  out.push(`  Simulações: ${simulacoes}`);
  out.push(`  Cliques WhatsApp: ${whatsapp}`);
  out.push(`  Total eventos: ${(eventos || []).length}`);
  out.push('');

  // LEADS
  out.push('👥 LEADS');
  out.push(`  Total ativos: ${ativos.length}`);
  out.push(`  Fechados: ${fechados.length}`);
  out.push(`  Taxa conversão: ${ativos.length ? ((fechados.length / ativos.length) * 100).toFixed(1) : 0}%`);
  const porStatus = {};
  ativos.forEach(l => { const s = l.status || 'novo'; porStatus[s] = (porStatus[s] || 0) + 1; });
  Object.entries(porStatus).forEach(([s, n]) => out.push(`  ${s}: ${n}`));
  out.push('');

  // ORIGENS / QR CODES
  out.push('📍 ORIGENS E QR CODES');
  Object.entries(campanhas).sort((a, b) => b[1].leads - a[1].leads).forEach(([camp, d]) => {
    const conv = d.leads > 0 ? ((d.fechados / d.leads) * 100).toFixed(1) : 0;
    out.push(`  ${camp}: ${d.leads} leads | ${d.fechados} fechados | ${conv}% conv.`);
  });
  out.push('');

  // LEADS RECENTES (últimos 10)
  out.push('🔖 ÚLTIMOS 10 LEADS ATIVOS');
  ativos.slice(0, 10).forEach(l => {
    out.push(`  ${l.nome || '—'} | ${l.telefone || '—'} | ${l.status || 'novo'} | origem: ${l.utm_source || 'direto'} | campanha: ${l.utm_campaign || '-'}`);
  });
  out.push('');

  // EVENTOS RECENTES
  out.push('🔥 ÚLTIMOS EVENTOS (' + Math.min(limit, (eventos || []).length) + ')');
  const lista = (eventos || []).slice(-limit).reverse();
  lista.forEach(ev => {
    out.push(`  ${ev.evento} | score:${ev.score || 0} | origem:${ev.utm_source || 'direto'} | campanha:${ev.utm_campaign || '-'} | sessão:${(ev.sessionId || '-').substring(0, 8)}`);
  });
  out.push('');
  out.push('══════════════════════════════════════════');

  textarea.value = out.join('\n');
}

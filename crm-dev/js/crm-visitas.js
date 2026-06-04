/**
 * crm-visitas.js — Sessões e visitas (eventos realtime)
 * Mostra: sessões, pageviews, scroll, simulações, telefone, WhatsApp, eventos
 */

import { escHtml, parseDataFirestore, emptyStateHtml } from './crm-utils.js';

function fmtData(ev) {
  const d = parseDataFirestore(ev.criadoEm || ev.data);
  if (!d) return '—';
  return d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}

export function renderizarVisitas(eventos) {
  const el   = document.getElementById('visitasConteudo');
  const meta = document.getElementById('visitasMeta');
  if (!el) return;

  const lista = eventos || [];
  if (!lista.length) {
    if (meta) meta.textContent = '0 sessões · 0 eventos';
    el.innerHTML = emptyStateHtml('👁️', 'Nenhuma visita ainda', 'Os eventos aparecem aqui em tempo real.');
    return;
  }

  // ── Totais gerais ──────────────────────────────────────
  let pageviews = 0, totalSimulacoes = 0, totalWhatsapp = 0;
  let totalScroll = 0, totalTelefone = 0, totalPropostas = 0;

  // ── Agrupamento por sessão ─────────────────────────────
  const sessoes = new Map(); // sessionId → { primeiroEv, eventos: [] }

  lista.forEach(ev => {
    const sid = ev.sessionId || ev.id || 'sem-sessao';
    if (!sessoes.has(sid)) {
      sessoes.set(sid, { primeiroEv: ev, eventos: [], sid });
    }
    sessoes.get(sid).eventos.push(ev);

    // Contadores globais
    switch (ev.evento) {
      case 'pagina_abriu':     pageviews++;          break;
      case 'clicou_simular':   totalSimulacoes++;     break;
      case 'clicou_whatsapp':  totalWhatsapp++;       break;
      case 'scroll_profundo':  totalScroll++;         break;
      case 'telefone_digitado':totalTelefone++;       break;
      case 'gerou_proposta':   totalPropostas++;      break;
    }
  });

  // ── Metadados no topo ─────────────────────────────────
  if (meta) {
    meta.textContent =
      `${sessoes.size} sessões · ${pageviews} pageviews · ` +
      `⚡ ${totalSimulacoes} simul. · 📜 ${totalScroll} scroll · ` +
      `📞 ${totalTelefone} tel · 💬 ${totalWhatsapp} wpp · 📄 ${totalPropostas} prop · ` +
      `${lista.length} eventos total`;
  }

  // Ordena sessões por timestamp mais recente
  const sessoesOrdenadas = [...sessoes.values()].sort((a, b) => {
    const ta = parseDataFirestore(a.primeiroEv?.criadoEm)?.getTime() || 0;
    const tb = parseDataFirestore(b.primeiroEv?.criadoEm)?.getTime() || 0;
    return tb - ta;
  }).slice(0, 40);

  el.innerHTML = sessoesOrdenadas.map(({ primeiroEv, eventos: evs, sid }) => {
    // Conta eventos da sessão
    const s  = evs.filter(e => e.evento === 'clicou_simular').length;
    const w  = evs.filter(e => e.evento === 'clicou_whatsapp').length;
    const sc = evs.filter(e => e.evento === 'scroll_profundo').length;
    const t  = evs.some(e => e.evento === 'telefone_digitado') ? 'Sim' : 'Não';
    const p  = evs.filter(e => e.evento === 'gerou_proposta').length;
    const origem = primeiroEv.utm_source || 'direto';
    const camp   = primeiroEv.utm_campaign || '—';
    const meio   = primeiroEv.utm_medium || '—';

    return `
<div class="visita-card glass-card">
  <div class="visita-head">
    <b>📍 ${escHtml(origem)}</b>
    <small>${fmtData(primeiroEv)}</small>
  </div>
  <p style="margin:4px 0;font-size:12px">📢 ${escHtml(camp)} · 📱 ${escHtml(meio)}</p>
  <p class="visita-sid" style="margin:4px 0">Sessão: <code>${escHtml(String(sid).slice(0, 16))}</code></p>
  <div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:8px;font-size:11px">
    <span style="background:#0f172a;padding:3px 8px;border-radius:12px">⚡ ${s} simul.</span>
    <span style="background:#0f172a;padding:3px 8px;border-radius:12px">📜 ${sc} scroll</span>
    <span style="background:#0f172a;padding:3px 8px;border-radius:12px">📞 tel: ${t}</span>
    <span style="background:#0f172a;padding:3px 8px;border-radius:12px">💬 ${w} wpp</span>
    ${p ? `<span style="background:#0f172a;padding:3px 8px;border-radius:12px">📄 ${p} prop.</span>` : ''}
    <span style="background:#1e293b;padding:3px 8px;border-radius:12px;color:#64748b">${evs.length} eventos</span>
  </div>
</div>`;
  }).join('');
}

/**
 * crm-visitas.js — Sessões e visitas (eventos realtime) — versão PRO (KPIs + gráficos)
 */

import { escHtml, parseDataFirestore, emptyStateHtml } from './crm-utils.js';
import { collection, getDocs, query, orderBy, limit } from
  'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';
import { db } from '../firebase/config.js';

// 06/11/2026: a tela lia SÓ a coleção antiga `eventos` (parou em maio/2026). A landing atual grava cada
// visita em `landing_visits` (js/visit-tracking.js). Agora junta as duas: landing_visits vira o mesmo
// formato de evento 'pagina_abriu'. Lê 1x a cada 2 min (custo: ~1 leitura por visita, limite 2000).
let _visitasLanding = null, _lidoEm = 0, _lendo = false, _ultimoRender = null;
async function carregarLandingVisits() {
  if (_lendo || (Date.now() - _lidoEm < 120000 && _visitasLanding)) return;
  _lendo = true;
  try {
    const snap = await getDocs(query(collection(db, 'landing_visits'), orderBy('timestamp', 'desc'), limit(2000)));
    _visitasLanding = snap.docs.map(d => {
      const v = d.data();
      return { id: d.id, evento: 'pagina_abriu', criadoEm: v.timestamp, sessionId: v.sessionId || d.id,
        utm_source: v.utm_source || 'direto', utm_medium: v.utm_medium || '', utm_campaign: v.utm_campaign || '' };
    });
    _lidoEm = Date.now();
    if (_ultimoRender) renderizarVisitas(_ultimoRender);   // redesenha com as visitas reais
  } catch (e) { console.warn('[visitas] landing_visits:', e.message); }
  finally { _lendo = false; }
}

const _charts = {};

function fmtData(ev) {
  const d = parseDataFirestore(ev.criadoEm || ev.data);
  if (!d) return '—';
  return d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}

function corOrigem(src) {
  const s = String(src || 'direto').toLowerCase();
  if (s.includes('insta')) return '#e1306c';
  if (s.includes('face')) return '#1877f2';
  if (s.includes('google') || s.includes('qr')) return '#22c55e';
  if (s.includes('whats')) return '#25d366';
  if (s === 'direto') return '#64748b';
  return '#0090D4';
}

function novoGrafico(id, config) {
  const canvas = document.getElementById(id);
  if (!canvas || typeof Chart === 'undefined') return;
  if (_charts[id]) { try { _charts[id].destroy(); } catch (_) {} }
  _charts[id] = new Chart(canvas, config);
}

export function renderizarVisitas(eventosAntigos) {
  const el = document.getElementById('visitasConteudo');
  if (!el) return;
  _ultimoRender = eventosAntigos || [];
  carregarLandingVisits();
  const eventos = [...(_visitasLanding || []), ...(eventosAntigos || [])];
  const meta = document.getElementById('visitasMeta');

  // ── agrega ──
  const sessoes = new Map();
  let pageviews = 0;
  const porDia = {};       // yyyy-mm-dd -> count
  const porHora = new Array(24).fill(0);
  const porOrigem = {};    // src -> count (por sessão)

  (eventos || []).forEach(ev => {
    if (ev.evento !== 'pagina_abriu') return;
    pageviews += 1;
    const d = parseDataFirestore(ev.criadoEm || ev.data);
    if (d) {
      const key = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
      porDia[key] = (porDia[key] || 0) + 1;
      porHora[d.getHours()] += 1;
    }
    const sid = ev.sessionId || ev.id;
    const prev = sessoes.get(sid);
    const tNew = d ? d.getTime() : 0;
    const tOld = prev ? (parseDataFirestore(prev.criadoEm)?.getTime() || 0) : 0;
    if (!prev || tNew > tOld) sessoes.set(sid, ev);
  });

  [...sessoes.values()].forEach(ev => {
    const src = ev.utm_source || 'direto';
    porOrigem[src] = (porOrigem[src] || 0) + 1;
  });

  const totalSessoes = sessoes.size;
  const origensOrdenadas = Object.entries(porOrigem).sort((a, b) => b[1] - a[1]);
  const topOrigem = origensOrdenadas[0] ? origensOrdenadas[0][0] : '—';

  // ── meta ──
  if (meta) meta.textContent = `${totalSessoes} sessões · ${pageviews} pageviews · ${origensOrdenadas.length} origens · tempo real · fonte: landing_visits + eventos`;

  // ── KPIs ──
  const kpis = document.getElementById('visitasKpis');
  if (kpis) {
    const card = (t, v, cor) => `<div class="glass-card metric-card"><b>${t}</b><span class="metric-value" style="font-size:22px${cor ? ';color:' + cor : ''}">${v}</span></div>`;
    kpis.innerHTML =
      card('👁️ Sessões', totalSessoes) +
      card('📄 Pageviews', pageviews) +
      card('🎯 Origens', origensOrdenadas.length) +
      card('🏆 Top origem', escHtml(topOrigem), corOrigem(topOrigem));
  }

  // ── gráfico: visitas por dia (14 dias, área com gradiente) ──
  const dias = [], labelsDia = [], dataDia = [];
  const hoje = new Date();
  for (let i = 13; i >= 0; i--) {
    const d = new Date(hoje); d.setDate(hoje.getDate() - i);
    const key = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    labelsDia.push(String(d.getDate()).padStart(2, '0') + '/' + String(d.getMonth() + 1).padStart(2, '0'));
    dataDia.push(porDia[key] || 0);
  }
  novoGrafico('visChartDia', {
    type: 'line',
    data: { labels: labelsDia, datasets: [{ label: 'Visitas', data: dataDia, borderColor: '#0090D4', backgroundColor: (ctx) => { const c = ctx.chart.ctx; const g = c.createLinearGradient(0, 0, 0, 220); g.addColorStop(0, 'rgba(0,144,212,.45)'); g.addColorStop(1, 'rgba(34,197,94,.04)'); return g; }, pointBackgroundColor: '#22c55e', pointRadius: 4, tension: .4, fill: true, borderWidth: 3 }] },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { ticks: { color: '#94a3b8', font: { size: 10 } }, grid: { color: 'rgba(255,255,255,.05)' } }, y: { ticks: { color: '#94a3b8', stepSize: 1 }, grid: { color: 'rgba(255,255,255,.05)' }, beginAtZero: true } } }
  });

  // ── gráfico: por origem (doughnut moderno) ──
  novoGrafico('visChartOrigem', {
    type: 'doughnut',
    data: { labels: origensOrdenadas.map(o => o[0]), datasets: [{ data: origensOrdenadas.map(o => o[1]), backgroundColor: origensOrdenadas.map(o => corOrigem(o[0])), borderColor: '#0b1220', borderWidth: 3, hoverOffset: 8 }] },
    options: { responsive: true, maintainAspectRatio: false, cutout: '62%', plugins: { legend: { position: 'right', labels: { color: '#cbd5e1', font: { size: 11 }, boxWidth: 12 } } } }
  });

  // ── gráfico: por hora (barras) ──
  novoGrafico('visChartHora', {
    type: 'bar',
    data: { labels: porHora.map((_, h) => String(h).padStart(2, '0') + 'h'), datasets: [{ label: 'Visitas', data: porHora, backgroundColor: 'rgba(0,144,212,.55)', borderRadius: 4 }] },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { ticks: { color: '#94a3b8', font: { size: 9 }, maxRotation: 0 }, grid: { display: false } }, y: { ticks: { color: '#94a3b8', stepSize: 1 }, grid: { color: 'rgba(255,255,255,.05)' }, beginAtZero: true } } }
  });

  // ── lista moderna de sessões ──
  const lista = [...sessoes.values()].sort((a, b) => (parseDataFirestore(b.criadoEm)?.getTime() || 0) - (parseDataFirestore(a.criadoEm)?.getTime() || 0)).slice(0, 40);
  if (!lista.length) {
    el.innerHTML = emptyStateHtml('👁️', 'Nenhuma visita ainda', 'Os eventos da landing aparecem aqui automaticamente.');
    return;
  }
  el.innerHTML = lista.map(ev => {
    const src = ev.utm_source || 'direto';
    const cor = corOrigem(src);
    return `
<div class="visita-card glass-card" style="border-left:3px solid ${cor}">
  <div class="visita-head">
    <b><span style="display:inline-block;width:9px;height:9px;border-radius:50%;background:${cor};margin-right:6px"></span>${escHtml(src)}</b>
    <small>${fmtData(ev)}</small>
  </div>
  <p>📢 ${escHtml(ev.utm_campaign || '—')} · 📱 ${escHtml(ev.utm_medium || '—')}</p>
  <p class="visita-sid">Sessão: <code>${escHtml(String(ev.sessionId || '').slice(0, 14))}</code></p>
</div>`;
  }).join('');
}

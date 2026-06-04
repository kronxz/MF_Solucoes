/**
 * crm-qrcodes.js — Métricas de QR Codes e Funil de Conversão
 * Lê landing_visits do Firestore (mf-solucoes-crm) e exibe por campanha.
 */

import { collection, getDocs, query, orderBy, limit } from
  'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';
import { db } from '../firebase/config.js';
import { toast } from './crm-utils.js';

// Campanhas dos QR Codes físicos
const QR_CAMPANHAS = [
  { id: 'itaipuacu',    label: '📍 Itaipuaçu' },
  { id: 'centro_marica', label: '🏙️ Centro Maricá' },
  { id: 'ponta_negra',  label: '🏖️ Ponta Negra' },
  { id: 'bambui',       label: '🌿 Bambuí' },
];

function pct(num, den) {
  if (!den) return '—';
  return (num / den * 100).toFixed(1) + '%';
}

function cardCampanha(camp, dados) {
  const taxa = pct(dados.leads, dados.visitas);
  const taxaWpp = pct(dados.whatsapp, dados.visitas);
  return `
<div class="glass-card" style="padding:20px;min-width:220px;flex:1">
  <h3 style="margin:0 0 16px;font-size:17px;color:#f1f5f9">${camp.label}</h3>
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
    <div style="background:#0f172a;border-radius:8px;padding:12px;text-align:center">
      <div style="font-size:28px;font-weight:700;color:#38bdf8">${dados.visitas}</div>
      <div style="font-size:11px;color:#64748b;margin-top:4px">Visitas</div>
    </div>
    <div style="background:#0f172a;border-radius:8px;padding:12px;text-align:center">
      <div style="font-size:28px;font-weight:700;color:#22c55e">${dados.whatsapp}</div>
      <div style="font-size:11px;color:#64748b;margin-top:4px">WhatsApp</div>
    </div>
    <div style="background:#0f172a;border-radius:8px;padding:12px;text-align:center">
      <div style="font-size:28px;font-weight:700;color:#f59e0b">${dados.leads}</div>
      <div style="font-size:11px;color:#64748b;margin-top:4px">Leads</div>
    </div>
    <div style="background:#0f172a;border-radius:8px;padding:12px;text-align:center">
      <div style="font-size:22px;font-weight:700;color:#e879f9">${taxa}</div>
      <div style="font-size:11px;color:#64748b;margin-top:4px">Conversão</div>
    </div>
  </div>
  <div style="margin-top:10px;font-size:12px;color:#64748b">
    WhatsApp/Visita: <b style="color:#94a3b8">${taxaWpp}</b>
  </div>
</div>`;
}

export async function carregarQRCodes() {
  const el = document.getElementById('qrcodesConteudo');
  if (!el) return;
  el.innerHTML = '<p style="color:#64748b;text-align:center;padding:40px">⏳ Carregando métricas...</p>';

  try {
    // db importado de config.js — mf-solucoes-crm com auth do usuário logado

    // Tenta landing_visits primeiro; faz fallback para lp_leads se vazia
    let visitas = [];
    try {
      const snap = await getDocs(query(collection(db, 'landing_visits'), orderBy('timestamp', 'desc'), limit(2000)));
      visitas = snap.docs.map(d => d.data());
    } catch (_) {}

    // Complementa com lp_leads se landing_visits estiver vazia
    if (!visitas.length) {
      const snapLP = await getDocs(query(collection(db, 'lp_leads'), limit(2000)));
      visitas = snapLP.docs.map(d => {
        const data = d.data();
        return {
          utm_campaign: data.utm_campaign || '',
          utm_source:   data.utm_source  || '',
          whatsappClicks: data.cliquesWhatsapp || 0,
          leadConvertido: true,
          timestamp:    data.createdAt || null,
          ...data
        };
      }).filter(v => !v.deletado && v.status !== 'excluido');
    }

    // Totais gerais
    const totalVisitas  = visitas.length;
    const totalWpp      = visitas.reduce((s, v) => s + (Number(v.whatsappClicks) || 0), 0);
    const totalLeads    = visitas.filter(v => v.leadConvertido === true).length;
    const taxaGeral     = pct(totalLeads, totalVisitas);

    // Por campanha
    const porCampanha = {};
    QR_CAMPANHAS.forEach(c => { porCampanha[c.id] = { visitas: 0, whatsapp: 0, leads: 0 }; });
    porCampanha['outros'] = { visitas: 0, whatsapp: 0, leads: 0 };

    visitas.forEach(v => {
      const camp = (v.utm_campaign || '').toLowerCase().trim();
      const bucket = porCampanha[camp] ? camp : 'outros';
      porCampanha[bucket].visitas++;
      porCampanha[bucket].whatsapp += Number(v.whatsappClicks) || 0;
      if (v.leadConvertido) porCampanha[bucket].leads++;
    });

    const ultimaAtt = new Date().toLocaleTimeString('pt-BR');

    el.innerHTML = `
<!-- Resumo geral -->
<div style="display:flex;gap:12px;flex-wrap:wrap;margin-bottom:24px">
  <div class="glass-card" style="flex:1;min-width:130px;padding:16px;text-align:center">
    <div style="font-size:32px;font-weight:700;color:#38bdf8">${totalVisitas}</div>
    <div style="font-size:12px;color:#64748b;margin-top:4px">Total Visitantes</div>
  </div>
  <div class="glass-card" style="flex:1;min-width:130px;padding:16px;text-align:center">
    <div style="font-size:32px;font-weight:700;color:#22c55e">${totalWpp}</div>
    <div style="font-size:12px;color:#64748b;margin-top:4px">Cliques WhatsApp</div>
  </div>
  <div class="glass-card" style="flex:1;min-width:130px;padding:16px;text-align:center">
    <div style="font-size:32px;font-weight:700;color:#f59e0b">${totalLeads}</div>
    <div style="font-size:12px;color:#64748b;margin-top:4px">Leads Gerados</div>
  </div>
  <div class="glass-card" style="flex:1;min-width:130px;padding:16px;text-align:center">
    <div style="font-size:32px;font-weight:700;color:#e879f9">${taxaGeral}</div>
    <div style="font-size:12px;color:#64748b;margin-top:4px">Taxa de Conversão</div>
  </div>
</div>

<!-- Cards por QR Code -->
<h3 style="color:#94a3b8;font-size:13px;font-weight:600;letter-spacing:1px;text-transform:uppercase;margin-bottom:12px">Por QR Code</h3>
<div style="display:flex;gap:16px;flex-wrap:wrap;margin-bottom:24px">
  ${QR_CAMPANHAS.map(c => cardCampanha(c, porCampanha[c.id])).join('')}
</div>

<!-- Outras origens -->
<details style="margin-top:8px">
  <summary style="cursor:pointer;color:#64748b;font-size:13px">Outras origens (${porCampanha['outros'].visitas} visitas)</summary>
  <div style="margin-top:12px">${cardCampanha({ label: '🌐 Outras origens' }, porCampanha['outros'])}</div>
</details>

<p style="margin-top:20px;font-size:11px;color:#475569;text-align:right">Atualizado às ${ultimaAtt}</p>`;

  } catch (err) {
    console.error('[CRM-QR] erro:', err);
    el.innerHTML = `<p style="color:#ef4444;padding:20px">Erro ao carregar métricas: ${err.message}</p>`;
    toast('Erro ao carregar métricas QR', 'error');
  }
}

/**
 * crm-eletrica.js — Módulo ELÉTRICA do lead (E1)
 * ============================================================================
 * Dono: mf-agente-crm. Segmento ⚡ Elétrica (≠ Solar).
 *
 * Entrega E1 (aba ⚡ Elétrica no modal de detalhes do lead):
 *   - Ficha técnica elétrica (tipo de serviço, fase, urgência, valor, foto do quadro, obs)
 *   - Catálogo de serviços elétricos (SERVICOS_ELETRICA — padroniza o nome; valor é digitado)
 *   - Histórico de demandas do cliente (lead.demandas_eletrica[], mais recente no topo)
 *   - Emergência em destaque: urgência "emergência" → marca lead.emergencia=true
 *     (o card do Kanban mostra 🚨 e a faixa no topo lista os urgentes)
 *
 * NÃO inventa preço: o valor de cada demanda é digitado pelo Marcos.
 * NÃO mexe no funil solar (E2 fará o fluxo próprio de elétrica).
 */

import { doc, updateDoc } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';
import { toast } from './crm-utils.js';

// Catálogo de serviços elétricos (nome padronizado; sem preço fixo).
export const SERVICOS_ELETRICA = [
  { id: 'emergencia',      nome: '🚨 Emergência — sem luz / curto',        urgenciaPadrao: 'emergência' },
  { id: 'troca_disjuntor', nome: 'Troca de disjuntor',                     urgenciaPadrao: 'normal' },
  { id: 'quadro',          nome: 'Troca / upgrade de quadro de distribuição', urgenciaPadrao: 'normal' },
  { id: 'padrao_entrada',  nome: 'Padrão de entrada (poste / medidor)',    urgenciaPadrao: 'normal' },
  { id: 'aterramento',     nome: 'Aterramento',                            urgenciaPadrao: 'normal' },
  { id: 'reforma',         nome: 'Reforma elétrica (residencial / predial)', urgenciaPadrao: 'normal' },
  { id: 'ponto',           nome: 'Instalação de ponto / tomada / chuveiro', urgenciaPadrao: 'normal' },
  { id: 'laudo',           nome: 'Laudo / vistoria elétrica',              urgenciaPadrao: 'normal' },
  { id: 'manutencao',      nome: 'Manutenção elétrica geral',              urgenciaPadrao: 'normal' },
  { id: 'outro',           nome: 'Outro (descrever nas observações)',      urgenciaPadrao: 'normal' },
];

const FASES = ['—', 'monofásico', 'bifásico', 'trifásico'];
const URGENCIAS = ['normal', 'urgente', 'emergência'];

let _db = null;
let _getLead = null;   // (id) => lead | undefined

function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}
function colDoLead(lead) {
  return lead?.origemSistema === 'landing' ? 'lp_leads' : 'leads';
}
function fmtData(iso) {
  try { return new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' }); }
  catch { return String(iso || '—'); }
}
function nomeServico(id) {
  return SERVICOS_ELETRICA.find(s => s.id === id)?.nome || id || '—';
}
function badgeUrg(urg) {
  const map = { 'emergência': ['🚨', '#ef4444'], 'urgente': ['⚠️', '#f59e0b'], 'normal': ['•', '#64748b'] };
  const [ic, cor] = map[urg] || map.normal;
  return `<span class="el-urg" style="color:${cor}">${ic} ${esc(urg)}</span>`;
}

/** true se o lead tem alguma demanda de emergência ainda aberta. */
function calcEmergencia(demandas) {
  return (demandas || []).some(d => d.urgencia === 'emergência' && d.status !== 'resolvida');
}

// ─── INIT: liga os botões da aba (delegação no modal) ─────────────────
export function iniciarEletrica(db, getLead) {
  _db = db;
  _getLead = typeof getLead === 'function' ? getLead : (() => null);
  const modal = document.getElementById('modalDetalhes');
  if (!modal || modal.dataset.eletricaLigada === '1') return;
  modal.dataset.eletricaLigada = '1';

  modal.addEventListener('click', async e => {
    const reg = e.target.closest('[data-eletrica-registrar]');
    const res = e.target.closest('[data-eletrica-resolver]');
    if (reg) { e.preventDefault(); await registrarDemanda(reg.dataset.eletricaRegistrar); }
    else if (res) { e.preventDefault(); await resolverDemanda(res.dataset.eletricaResolver, res.dataset.demandaId); }
  });
}

// ─── RENDER da aba ⚡ Elétrica ─────────────────────────────────────────
export function renderAbaEletrica(lead) {
  const el = document.getElementById('detalhe-eletrica');
  if (!el || !lead) return;
  const demandas = Array.isArray(lead.demandas_eletrica) ? lead.demandas_eletrica.slice() : [];
  demandas.sort((a, b) => new Date(b.data || 0) - new Date(a.data || 0));
  const emerg = calcEmergencia(demandas);

  el.innerHTML = `
${emerg ? `<div class="el-emergencia-aviso">🚨 EMERGÊNCIA ABERTA — atender primeiro</div>` : ''}

<h3 class="el-titulo">🛠️ Nova demanda elétrica</h3>
<div class="el-form">
  <label>Serviço
    <select id="elServico">
      ${SERVICOS_ELETRICA.map(s => `<option value="${s.id}">${esc(s.nome)}</option>`).join('')}
    </select>
  </label>
  <div class="el-form-row">
    <label>Fase
      <select id="elFase">${FASES.map(f => `<option value="${f}">${esc(f)}</option>`).join('')}</select>
    </label>
    <label>Urgência
      <select id="elUrgencia">${URGENCIAS.map(u => `<option value="${u}">${esc(u)}</option>`).join('')}</select>
    </label>
  </div>
  <div class="el-form-row">
    <label>Valor (R$) — você digita
      <input id="elValor" type="text" inputmode="decimal" placeholder="ex.: 350 (opcional)">
    </label>
    <label>Foto do quadro (link)
      <input id="elFoto" type="text" placeholder="cole um link (opcional)">
    </label>
  </div>
  <label>Observações
    <textarea id="elObs" rows="2" placeholder="o que o cliente pediu / o que precisa ser feito"></textarea>
  </label>
  <button type="button" class="btn-primary" data-eletrica-registrar="${esc(lead.id)}">➕ Registrar demanda</button>
</div>

<hr class="modal-divider">
<h3 class="el-titulo">📋 Histórico de demandas (${demandas.length})</h3>
${demandas.length ? `<div class="el-historico">${demandas.map(d => renderDemanda(lead.id, d)).join('')}</div>`
  : `<p class="crm-timeline-empty">Nenhuma demanda elétrica registrada ainda.</p>`}
`;

  // urgência acompanha o serviço escolhido (emergência já vem marcada)
  const selServ = el.querySelector('#elServico');
  const selUrg = el.querySelector('#elUrgencia');
  selServ?.addEventListener('change', () => {
    const s = SERVICOS_ELETRICA.find(x => x.id === selServ.value);
    if (s && selUrg) selUrg.value = s.urgenciaPadrao;
  });
}

function renderDemanda(leadId, d) {
  const resolvida = d.status === 'resolvida';
  return `
<div class="el-demanda${resolvida ? ' el-demanda--ok' : ''}">
  <div class="el-demanda-top">
    <b>${esc(nomeServico(d.tipo))}</b>
    ${badgeUrg(d.urgencia)}
    ${resolvida ? '<span class="el-ok">✅ resolvida</span>' : ''}
  </div>
  <div class="el-demanda-meta">
    🗓️ ${esc(fmtData(d.data))}
    ${d.fase && d.fase !== '—' ? ` · ⚡ ${esc(d.fase)}` : ''}
    ${d.valor ? ` · 💰 R$ ${esc(d.valor)}` : ''}
  </div>
  ${d.obs ? `<div class="el-demanda-obs">📝 ${esc(d.obs)}</div>` : ''}
  ${d.fotoQuadro ? `<div class="el-demanda-foto"><a href="${esc(d.fotoQuadro)}" target="_blank" rel="noopener">📷 foto do quadro</a></div>` : ''}
  ${!resolvida ? `<button type="button" class="btn-card el-resolver" data-eletrica-resolver="${esc(leadId)}" data-demanda-id="${esc(d.id)}">✅ Marcar resolvida</button>` : ''}
</div>`;
}

// ─── GRAVAÇÃO ─────────────────────────────────────────────────────────
async function registrarDemanda(leadId) {
  const lead = _getLead(leadId);
  if (!lead) { toast('Lead não encontrado', 'error'); return; }
  const tipo = document.getElementById('elServico')?.value || 'outro';
  const fase = document.getElementById('elFase')?.value || '—';
  const urgencia = document.getElementById('elUrgencia')?.value || 'normal';
  const valor = (document.getElementById('elValor')?.value || '').trim();
  const fotoQuadro = (document.getElementById('elFoto')?.value || '').trim();
  const obs = (document.getElementById('elObs')?.value || '').trim();

  const agora = new Date().toISOString();
  const demanda = {
    id: 'd' + Date.now(),
    tipo, tipoNome: nomeServico(tipo),
    fase, urgencia, valor, fotoQuadro, obs,
    status: 'aberta',
    data: agora,
  };
  const demandas = Array.isArray(lead.demandas_eletrica) ? lead.demandas_eletrica.slice() : [];
  demandas.push(demanda);
  const historico = Array.isArray(lead.historico) ? lead.historico.slice() : [];
  historico.push({ acao: `Demanda elétrica: ${demanda.tipoNome} (${urgencia})`, data: agora });

  try {
    await updateDoc(doc(_db, colDoLead(lead), leadId), {
      demandas_eletrica: demandas,
      segmento: 'eletrica',                 // demanda elétrica ⇒ marca o segmento
      emergencia: calcEmergencia(demandas),
      historico,
      ultima_acao_nome: `Demanda elétrica: ${demanda.tipoNome}`,
      lastAction: agora,
    });
    // reflete local + re-render imediato (realtime também vai reemitir)
    lead.demandas_eletrica = demandas;
    lead.segmento = 'eletrica';
    lead.emergencia = calcEmergencia(demandas);
    renderAbaEletrica(lead);
    toast(urgencia === 'emergência' ? '🚨 Emergência registrada!' : 'Demanda registrada', 'success');
  } catch (err) {
    console.error('[CRM-Elétrica] registrarDemanda erro:', err);
    toast('Erro ao registrar demanda', 'error');
  }
}

async function resolverDemanda(leadId, demandaId) {
  const lead = _getLead(leadId);
  if (!lead) return;
  const demandas = (Array.isArray(lead.demandas_eletrica) ? lead.demandas_eletrica : []).map(d =>
    d.id === demandaId ? { ...d, status: 'resolvida', resolvidaEm: new Date().toISOString() } : d
  );
  const agora = new Date().toISOString();
  const historico = Array.isArray(lead.historico) ? lead.historico.slice() : [];
  historico.push({ acao: 'Demanda elétrica resolvida', data: agora });
  try {
    await updateDoc(doc(_db, colDoLead(lead), leadId), {
      demandas_eletrica: demandas,
      emergencia: calcEmergencia(demandas),
      historico,
      lastAction: agora,
    });
    lead.demandas_eletrica = demandas;
    lead.emergencia = calcEmergencia(demandas);
    renderAbaEletrica(lead);
    toast('Demanda marcada como resolvida', 'success');
  } catch (err) {
    console.error('[CRM-Elétrica] resolverDemanda erro:', err);
    toast('Erro ao resolver', 'error');
  }
}

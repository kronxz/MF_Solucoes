// [MF-AI-CHANGE] crm-details.js — Modal de detalhes: 3 abas + fallback kits — 2026-05-22
// Handles: tab switching, lead info, inteligência score, financiamento com kitsDisponiveis ou fallback math

import {
  collection, query, where, getDocs, onSnapshot, orderBy, limit,
  doc, updateDoc
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';
import { TIMELINE_LIMIT } from './crm-config.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';
import { app } from '../firebase/config.js';
import { abrirProposta } from './crm-proposal.js';
import { toast, escHtml } from './crm-utils.js';
import { renderHtmlFinanciamento, renderHtmlKitResumo } from './crm-finance.js';
import {
  renderTimelineMiniHtml,
  formatTempoRelativo,
  badgeTemperaturaHtml,
  crmCardIntel,
  toDateFromFirestore
} from './crm-realtime.js';

let _db = null;
let _leads = [];
let _unsubTimeline = null;
let _leadAtualId = null;
let _debounceObs = null;

// ─── INIT ─────────────────────────────────────────────────────
export function iniciarDetails(db) {
  _db = db;

  // Fechar modal
  document.getElementById('btnFecharModal')?.addEventListener('click', fecharDetalhes);
  document.getElementById('modalDetalhes')?.addEventListener('click', e => {
    if (e.target.id === 'modalDetalhes') fecharDetalhes();
  });

  // Tabs do modal
  document.getElementById('abasLead')?.addEventListener('click', e => {
    const btn = e.target.closest('[data-aba]');
    if (!btn) return;
    trocarAba(btn.dataset.aba);
  });

  document.getElementById('btnPropostaModal')?.addEventListener('click', () => {
    const lead = _leads.find(l => l.id === _leadAtualId);
    if (abrirProposta(lead)) toast('Proposta aberta', 'info');
    else toast('Lead não encontrado', 'error');
  });

  // Edição de dados do lead
  document.getElementById('modalDetalhes')?.addEventListener('click', async e => {
    if (e.target.id === 'btnEditarLead') {
      const lead = _leads.find(l => l.id === _leadAtualId);
      if (lead) ativarModoEdicao(lead);
    } else if (e.target.id === 'btnCancelarEdicao') {
      const lead = _leads.find(l => l.id === _leadAtualId);
      if (lead) preencherAbaLead(lead);
    } else if (e.target.id === 'btnSalvarEdicao') {
      await salvarEdicaoLead();
    }
  });

  const obsBox = document.getElementById('detalhe-observacoes');
  const obsStatus = document.getElementById('detalhe-obs-status');
  obsBox?.addEventListener('input', () => {
    if (!_leadAtualId || !_db) return;
    if (obsStatus) obsStatus.textContent = '💾 Salvando...';
    if (_debounceObs) clearTimeout(_debounceObs);
    _debounceObs = setTimeout(async () => {
      try {
        await updateDoc(doc(_db, 'leads', _leadAtualId), {
          observacoes: obsBox.value,
          observacoesAtualizadoEm: new Date().toISOString()
        });
        if (obsStatus) obsStatus.textContent = '✅ Salvo';
      } catch (err) {
        console.error('[CRM-Details] observacoes:', err);
        if (obsStatus) obsStatus.textContent = '❌ Erro ao salvar';
      }
    }, 800);
  });
}

export function atualizarLeadsDetails(leads) {
  _leads = leads;
}

// ─── ABRIR DETALHES ────────────────────────────────────────────
export async function abrirDetalhes(id) {
  const lead = _leads.find(l => l.id === id);
  if (!lead) { console.warn('[CRM-Details] Lead não encontrado:', id); return; }
  _leadAtualId = id;

  const modal = document.getElementById('modalDetalhes');
  if (!modal) return;
  modal.classList.add('ativo');
  modal.setAttribute('aria-hidden', 'false');

  // Resetar abas
  trocarAba('abaLead');

  // Aba Lead
  preencherAbaLead(lead);

  // Aba Inteligência (async)
  preencherAbaInteligencia(lead);

  // Aba Financiamento
  preencherAbaFinanciamento(lead);
}

function fecharDetalhes() {
  _leadAtualId = null;
  pararTimelineRealtime();
  const modal = document.getElementById('modalDetalhes');
  if (modal) {
    modal.classList.remove('ativo');
    modal.setAttribute('aria-hidden', 'true');
  }
}

function pararTimelineRealtime() {
  if (_unsubTimeline) {
    _unsubTimeline();
    _unsubTimeline = null;
  }
}

function iniciarTimelineRealtime(leadId, el) {
  if (!_db || !el) return;
  pararTimelineRealtime();
  el.innerHTML = '<p class="crm-timeline-empty">Carregando timeline...</p>';
  const q = query(
    collection(_db, 'leads', leadId, 'timeline'),
    orderBy('criadoEm', 'desc'),
    limit(TIMELINE_LIMIT)
  );
  _unsubTimeline = onSnapshot(
    q,
    snap => {
      const eventos = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      el.innerHTML = renderTimelineMiniHtml(eventos);
    },
    err => {
      console.warn('[CRM-Details] timeline fallback:', err);
      getDocs(query(collection(_db, 'leads', leadId, 'timeline'), orderBy('criadoEm', 'desc'), limit(TIMELINE_LIMIT))).then(snap => {
        const eventos = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        el.innerHTML = renderTimelineMiniHtml(eventos);
      }).catch(() => {
        el.innerHTML = '<p class="crm-timeline-empty">Timeline indisponível.</p>';
      });
    }
  );
}

// ─── TROCA DE ABA ─────────────────────────────────────────────
function trocarAba(abaId) {
  if (abaId !== 'abaLead') pararTimelineRealtime();
  document.querySelectorAll('.aba-panel').forEach(p => p.style.display = 'none');
  document.querySelectorAll('.modal-tab').forEach(b => {
    b.classList.remove('active');
    b.setAttribute('aria-selected', 'false');
  });
  const painel = document.getElementById(abaId);
  if (painel) painel.style.display = 'block';
  const btn = document.querySelector(`[data-aba="${abaId}"]`);
  if (btn) { btn.classList.add('active'); btn.setAttribute('aria-selected', 'true'); }
}

// ─── HELPERS ──────────────────────────────────────────────────
const esc = escHtml;

function formatarData(valor) {
  const d = toDateFromFirestore(valor);
  if (!d) return '—';
  return `${d.getDate().toString().padStart(2,'0')}/${(d.getMonth()+1).toString().padStart(2,'0')}/${d.getFullYear()} - ${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')}`;
}

// ─── ABA LEAD ─────────────────────────────────────────────────
async function preencherAbaLead(lead) {
  const intel = document.getElementById('detalhe-intel');
  const ultimaAcao = document.getElementById('detalhe-ultima-acao');
  const timelineEl = document.getElementById('detalhe-timeline');
  const infoEl = document.getElementById('detalhe-info-lead');

  if (intel) intel.innerHTML = crmCardIntel(lead);
  if (ultimaAcao) ultimaAcao.innerHTML = `<b>Última ação:</b> ${esc(lead.ultima_acao_nome || '—')} · ${formatTempoRelativo(lead.lastAction || lead.data)}`;

  if (timelineEl) iniciarTimelineRealtime(lead.id, timelineEl);

  if (infoEl) {
    infoEl.innerHTML = `
<div style="margin-bottom:12px">
  <button id="btnEditarLead" type="button" style="background:#3b82f6;color:#fff;border:none;border-radius:8px;padding:8px 18px;font-size:14px;cursor:pointer;font-weight:600">✏️ Editar dados</button>
</div>
<p>👤 <b>Cliente:</b> ${esc(lead.nome)}</p>
<p>📞 <b>Telefone:</b> ${esc(lead.telefone || '—')}</p>
<p>📍 <b>Endereço:</b> ${esc(lead.endereco || '—')}</p>
<p>🗓 <b>Cadastro:</b> ${formatarData(lead.createdAt || lead.data)}</p>
<p>📍 <b>Origem:</b> ${esc(lead.utm_source || 'Direto')}</p>
<p>📢 <b>Campanha:</b> ${esc(lead.utm_campaign || '—')}</p>
<p>⚡ <b>Sistema:</b> ${esc(lead.sistema || '—')}</p>
<p>💰 <b>Investimento:</b> R$ ${Number(lead.investimento || 0).toFixed(0)}</p>
<p>💡 <b>Conta:</b> R$ ${esc(lead.valor || '—')}</p>
<p>⚡ <b>Consumo:</b> ${esc(lead.consumo || '—')} kWh</p>
<p>📈 <b>Geração:</b> ${Number(lead.geracao || 0).toFixed(0)} kWh/mês</p>
<p>🧩 <b>Placas:</b> ${esc(lead.placas || '—')}</p>
<p>🔌 <b>Potência da placa:</b> ${esc(lead.potenciaPlaca || '—')} W</p>
<p>⚡ <b>Potência do sistema:</b> ${esc(lead.kwp || '—')} kWp</p>
<p>⚙️ <b>Inversor:</b> ${esc(lead.inversor || '—')}</p>
<p>📊 <b>Overload:</b> ${Number(lead.overload || 0).toFixed(0)}%</p>
<p>⏳ <b>Payback:</b> ${Number(lead.payback || 0).toFixed(1)} anos</p>
<p>🌞 <b>HSP:</b> ${esc(lead.hsp || '—')}</p>
<p>💸 <b>Tarifa:</b> R$ ${esc(lead.tarifa || '—')}</p>
<hr class="modal-divider">
${renderHtmlKitResumo(lead, esc)}`;
  }

  const obs = document.getElementById('detalhe-observacoes');
  const obsSt = document.getElementById('detalhe-obs-status');
  if (obs) obs.value = lead.observacoes || lead.notas || '';
  if (obsSt) obsSt.textContent = '';
}

// ─── ABA INTELIGÊNCIA ─────────────────────────────────────────
async function preencherAbaInteligencia(lead) {
  const el = document.getElementById('analyticsLead');
  if (!el) return;

  const scoreFirestore = lead.score != null ? Number(lead.score) : null;
  const tempLabel = lead.temperatura || 'Fria';

  if (!lead.sessionId && scoreFirestore == null) {
    el.innerHTML = '<p class="crm-timeline-empty">Sem sessionId nem score no lead.</p>';
    return;
  }

  el.innerHTML = '<p class="crm-timeline-empty">Carregando eventos...</p>';

  try {
    let eventosLead = [];
    if (lead.sessionId) {
      const uid = getAuth(app).currentUser?.uid || null;
      const base = collection(_db, 'eventos');
      const q = uid
        ? query(base, where('sessionId', '==', lead.sessionId), where('userId', '==', uid), orderBy('criadoEm', 'desc'), limit(100))
        : query(base, where('sessionId', '==', lead.sessionId), orderBy('criadoEm', 'desc'), limit(100));
      const snap = await getDocs(q);
      eventosLead = snap.docs.map(d => d.data());
    }

    const simulacoes = eventosLead.filter(e => e.evento === 'clicou_simular').length;
    const whatsapp = eventosLead.filter(e => e.evento === 'clicou_whatsapp').length;
    const scroll = eventosLead.filter(e => e.evento === 'scroll_profundo').length;
    const telefone = eventosLead.some(e => e.evento === 'telefone_digitado');
    const tempo = eventosLead.some(e => e.evento === 'ficou_40_segundos');

    let score = scoreFirestore != null
      ? scoreFirestore
      : Math.min(100, simulacoes * 5 + whatsapp * 20 + scroll * 10 + (telefone ? 15 : 0) + (tempo ? 15 : 0));
    const nivel = tempLabel.includes('Quente') || score >= 70 ? '🔥 Quente' : (tempLabel.includes('Morno') || score >= 30) ? '🟡 Morno' : '🟢 Frio';
    const sugestao = score >= 70
      ? 'Lead pronto para abordagem imediata no WhatsApp.'
      : score >= 40
        ? 'Lead demonstrou interesse moderado. Agende follow-up.'
        : 'Lead ainda frio. Aguarde mais interações.';

    const corNivel = score >= 70 ? '#ef4444' : score >= 40 ? '#f59e0b' : '#22c55e';

    el.innerHTML = `
<div class="glass-card" style="padding:20px; margin-bottom:12px; border-left:4px solid ${corNivel}">
  <div style="font-size:22px;font-weight:bold;color:${corNivel};margin-bottom:12px">${nivel}</div>
  <div style="font-size:18px;margin-bottom:16px">🎯 Score: <b>${score}/100</b></div>
  <hr style="border-color:rgba(255,255,255,0.08);margin:12px 0">
  <p>🔥 Eventos: <b>${eventosLead.length}</b></p>
  <p>📈 Simulações: <b>${simulacoes}</b></p>
  <p>📜 Scroll profundo: <b>${scroll}</b></p>
  <p>💬 Cliques WhatsApp: <b>${whatsapp}</b></p>
  <p>📞 Digitou telefone: <b>${telefone ? 'Sim' : 'Não'}</b></p>
  <p>⏱ Ficou +40s: <b>${tempo ? 'Sim' : 'Não'}</b></p>
  <hr style="border-color:rgba(255,255,255,0.08);margin:12px 0">
  <p>💡 <b>Sugestão:</b> ${sugestao}</p>
</div>`;
  } catch (err) {
    console.error('[CRM-Details] Erro ao buscar eventos:', err);
    el.innerHTML = '<p class="crm-timeline-empty">Erro ao carregar inteligência.</p>';
  }
}

// ─── ABA FINANCIAMENTO ────────────────────────────────────────
function preencherAbaFinanciamento(lead) {
  const el = document.getElementById('detalhe-financiamento');
  if (!el) return;
  el.innerHTML = renderHtmlFinanciamento(lead, esc);
}

// ─── MODO EDIÇÃO ──────────────────────────────────────────────
const EDIT_INPUT_STYLE = 'width:100%;box-sizing:border-box;background:#1e293b;color:#f1f5f9;border:1px solid #334155;border-radius:6px;padding:6px 10px;font-size:14px;margin-top:2px';
const EDIT_LABEL_STYLE = 'display:flex;flex-direction:column;font-size:13px;color:#94a3b8;gap:2px';

function campoEdit(emoji, label, id, type, value, extra) {
  const safeVal = esc(String(value ?? ''));
  const extraAttr = extra || '';
  return `<label style="${EDIT_LABEL_STYLE}">${emoji} ${label}
    <input id="${id}" type="${type}" value="${safeVal}" style="${EDIT_INPUT_STYLE}" ${extraAttr} />
  </label>`;
}

function ativarModoEdicao(lead) {
  const infoEl = document.getElementById('detalhe-info-lead');
  if (!infoEl) return;

  infoEl.innerHTML = `
<div style="display:flex;gap:8px;margin-bottom:16px;flex-wrap:wrap">
  <button id="btnSalvarEdicao" type="button" style="background:#22c55e;color:#fff;border:none;border-radius:8px;padding:8px 20px;font-size:14px;cursor:pointer;font-weight:700">💾 Salvar</button>
  <button id="btnCancelarEdicao" type="button" style="background:#ef4444;color:#fff;border:none;border-radius:8px;padding:8px 18px;font-size:14px;cursor:pointer;font-weight:600">✖ Cancelar</button>
</div>
<div style="display:flex;flex-direction:column;gap:12px">
  ${campoEdit('👤', 'Nome', 'edit-nome', 'text', lead.nome)}
  ${campoEdit('📞', 'Telefone', 'edit-telefone', 'text', lead.telefone)}
  ${campoEdit('📍', 'Endereço / Cidade', 'edit-endereco', 'text', lead.endereco)}
  ${campoEdit('🏢', 'Concessionária', 'edit-concessionaria', 'text', lead.concessionaria || lead.distribuidora)}
  ${campoEdit('💡', 'Conta de Luz (R$)', 'edit-valor', 'number', lead.valor, 'min="0" step="0.01"')}
  ${campoEdit('⚡', 'Consumo (kWh/mês)', 'edit-consumo', 'number', lead.consumo, 'min="0"')}
  ${campoEdit('🔋', 'Potência do sistema (kWp)', 'edit-kwp', 'number', lead.kwp, 'min="0" step="0.01"')}
  ${campoEdit('📈', 'Geração Mensal (kWh)', 'edit-geracao', 'number', lead.geracao || lead.geracaoMensal, 'min="0"')}
  ${campoEdit('💰', 'Investimento (R$)', 'edit-investimento', 'number', lead.investimento, 'min="0" step="0.01"')}
  ${campoEdit('💸', 'Economia Mensal (R$)', 'edit-economia', 'number', lead.economia, 'min="0" step="0.01"')}
  ${campoEdit('⏳', 'Payback (anos)', 'edit-payback', 'number', lead.payback, 'min="0" step="0.1"')}
</div>`;
}

async function salvarEdicaoLead() {
  if (!_leadAtualId || !_db) return;

  const get = id => document.getElementById(id)?.value ?? '';

  const nome = get('edit-nome').trim();
  const telefone = get('edit-telefone').trim();
  const endereco = get('edit-endereco').trim();
  const concessionaria = get('edit-concessionaria').trim();
  const valorStr = get('edit-valor');
  const consumoStr = get('edit-consumo');
  const kwpStr = get('edit-kwp');
  const geracaoStr = get('edit-geracao');
  const investimentoStr = get('edit-investimento');
  const economiaStr = get('edit-economia');
  const paybackStr = get('edit-payback');

  if (!nome) { toast('Nome não pode ser vazio', 'error'); return; }
  if (!telefone) { toast('Telefone não pode ser vazio', 'error'); return; }
  if (valorStr !== '' && Number(valorStr) < 0) { toast('Conta de luz não pode ser negativa', 'error'); return; }
  if (investimentoStr !== '' && Number(investimentoStr) < 0) { toast('Investimento não pode ser negativo', 'error'); return; }

  const btnSalvar = document.getElementById('btnSalvarEdicao');
  if (btnSalvar) { btnSalvar.disabled = true; btnSalvar.textContent = '⏳ Salvando...'; }

  const toNum = s => s !== '' ? Number(s) : undefined;

  const updates = { nome, telefone, endereco, concessionaria, editadoEm: new Date().toISOString() };
  const valor = toNum(valorStr);
  const consumo = toNum(consumoStr);
  const kwp = toNum(kwpStr);
  const geracao = toNum(geracaoStr);
  const investimento = toNum(investimentoStr);
  const economia = toNum(economiaStr);
  const payback = toNum(paybackStr);

  if (valor !== undefined) { updates.valor = valor; updates.contaDeLuz = valor; }
  if (consumo !== undefined) { updates.consumo = consumo; updates.consumoMensal = consumo; }
  if (kwp !== undefined) updates.kwp = kwp;
  if (geracao !== undefined) { updates.geracao = geracao; updates.geracaoMensal = geracao; }
  if (investimento !== undefined) updates.investimento = investimento;
  if (economia !== undefined) updates.economia = economia;
  if (payback !== undefined) updates.payback = payback;

  try {
    await updateDoc(doc(_db, 'leads', _leadAtualId), updates);

    // Atualiza lead localmente para uso imediato (PDF não usa cache antigo)
    const lead = _leads.find(l => l.id === _leadAtualId);
    if (lead) Object.assign(lead, updates);

    toast('Lead atualizado com sucesso', 'success');
    const updated = _leads.find(l => l.id === _leadAtualId);
    if (updated) preencherAbaLead(updated);
  } catch (err) {
    console.error('[CRM-Details] salvarEdicaoLead:', err);
    toast('Erro ao salvar dados do lead', 'error');
    if (btnSalvar) { btnSalvar.disabled = false; btnSalvar.textContent = '💾 Salvar'; }
  }
}

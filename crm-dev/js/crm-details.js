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
      if (lead) {
        ativarModoEdicao(lead);
        // Rastreia quais campos foram editados manualmente pelo usuário
        const _editadoManual = new Set();
        ['edit-kwp','edit-geracao','edit-economia','edit-payback'].forEach(id => {
          document.getElementById(id)?.addEventListener('input', () => _editadoManual.add(id));
        });

        // Live recalc: só sobrescreve campos que o usuário NÃO editou manualmente
        const recalcKit = () => {
          const pot = parseFloat(document.getElementById('edit-potencia-placa')?.value) || 580;
          const pl  = parseFloat(document.getElementById('edit-placas')?.value) || 0;
          const tar = parseFloat(lead.tarifa) || 0.95;
          const hsp = parseFloat(lead.hsp) || 4.5;
          const inv = parseFloat(document.getElementById('edit-investimento')?.value) || parseFloat(lead.investimento) || 0;
          if (!pl) return;
          const kwp      = Math.round(pl * pot / 10) / 100;
          const geracao  = Math.round(kwp * hsp * 30 * 0.80);
          const economia = Math.round(geracao * tar * 100) / 100;
          const payback  = inv ? Math.round((inv / (economia * 12)) * 10) / 10 : 0;
          const set = (id, v) => {
            if (_editadoManual.has(id)) return; // respeita edição manual
            const el = document.getElementById(id);
            if (el) el.value = v;
          };
          set('edit-kwp', kwp);
          set('edit-geracao', geracao);
          set('edit-economia', economia);
          set('edit-payback', payback);
        };
        ['edit-potencia-placa','edit-placas','edit-investimento'].forEach(id => {
          document.getElementById(id)?.addEventListener('input', recalcKit);
          document.getElementById(id)?.addEventListener('change', recalcKit);
        });
      }
    } else if (e.target.id === 'btnCancelarEdicao') {
      const lead = _leads.find(l => l.id === _leadAtualId);
      if (lead) preencherAbaLead(lead);
    } else if (e.target.id === 'btnSalvarEdicao') {
      await salvarEdicaoLead();
    }

    // Seleção de kit na aba Financiamento
    const btnKit = e.target.closest('[data-selecionar-kit]');
    if (btnKit && _leadAtualId && _db) {
      const tipo = btnKit.dataset.selecionarKit;
      const kitUpdates = {
        kitEscolhido:    btnKit.dataset.kitNome,
        sistema:         btnKit.dataset.kitNome,
        kwp:             parseFloat(btnKit.dataset.kitKwp)    || 0,
        placas:          parseInt(btnKit.dataset.kitPlacas)   || 0,
        geracao:         parseFloat(btnKit.dataset.kitGeracao) || 0,
        investimento:    parseFloat(btnKit.dataset.kitInvestimento) || 0,
        economia:        parseFloat(btnKit.dataset.kitEconomia)     || 0,
        payback:         parseFloat(btnKit.dataset.kitPayback)      || 0,
        kitTipo:         tipo,
        kitSelecionadoEm: new Date().toISOString()
      };
      try {
        btnKit.disabled = true;
        btnKit.textContent = '⏳ Salvando...';
        const leadKit = _leads.find(l => l.id === _leadAtualId);
        const colKit  = leadKit?.origemSistema === 'landing' ? 'lp_leads' : 'leads';
        await updateDoc(doc(_db, colKit, _leadAtualId), kitUpdates);
        if (leadKit) Object.assign(leadKit, kitUpdates);
        btnKit.textContent = '✅ Kit selecionado!';
        toast(`Kit ${kitUpdates.kitEscolhido} selecionado`, 'success');
        preencherAbaLead(_leads.find(l => l.id === _leadAtualId));
      } catch (err) {
        console.error('[CRM-Details] selecionarKit:', err);
        btnKit.disabled = false;
        btnKit.textContent = '✅ Selecionar este kit';
        toast('Erro ao selecionar kit', 'error');
      }
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
        const leadObs = _leads.find(l => l.id === _leadAtualId);
        const colObs = leadObs?.origemSistema === 'landing' ? 'lp_leads' : 'leads';
        await updateDoc(doc(_db, colObs, _leadAtualId), {
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

  el.innerHTML = '<p class="crm-timeline-empty">Carregando...</p>';

  try {
    // Busca eventos por sessionId — sem filtro de userId (eventos landing são anônimos)
    let eventosLead = [];
    if (lead.sessionId) {
      const snap = await getDocs(
        query(collection(_db, 'eventos'), where('sessionId', '==', lead.sessionId), orderBy('criadoEm', 'desc'), limit(100))
      );
      eventosLead = snap.docs.map(d => d.data());
    }

    const simulacoes  = eventosLead.filter(e => e.evento === 'clicou_simular').length;
    const whatsappEv  = eventosLead.filter(e => e.evento === 'clicou_whatsapp').length;
    const scrollEv    = eventosLead.filter(e => e.evento === 'scroll_profundo').length;
    const telefoneEv  = eventosLead.some(e => e.evento === 'telefone_digitado');
    const tempoEv     = eventosLead.some(e => e.evento === 'ficou_40_segundos');

    // Dados de rastreamento gravados diretamente no lead (lp_leads)
    const tempoSite   = lead.tempoTotalSegundos != null ? lead.tempoTotalSegundos + 's' : '—';
    const scrollMax   = lead.scrollMaximoPercentual != null ? lead.scrollMaximoPercentual + '%' : '—';
    const wppLead     = lead.cliquesWhatsapp != null ? lead.cliquesWhatsapp : whatsappEv;
    const digitouNome = lead.digitouNome != null ? (lead.digitouNome ? 'Sim' : 'Não') : '—';
    const digitouTel  = lead.digitouTelefone != null ? (lead.digitouTelefone ? 'Sim' : 'Não') : (telefoneEv ? 'Sim' : '—');

    let score = scoreFirestore != null ? scoreFirestore
      : Math.min(100, simulacoes * 5 + wppLead * 20 + scrollEv * 10 + (telefoneEv ? 15 : 0) + (tempoEv ? 15 : 0));
    const nivel    = score >= 70 ? '🔥 Quente' : score >= 30 ? '🟡 Morno' : '🟢 Frio';
    const corNivel = score >= 70 ? '#ef4444' : score >= 40 ? '#f59e0b' : '#22c55e';
    const sugestao = score >= 70 ? 'Lead pronto — abordar agora no WhatsApp.'
      : score >= 40 ? 'Interesse moderado — agendar follow-up.'
      : 'Lead frio — aguardar mais interações.';

    const row = (icon, label, val) =>
      `<p style="margin:6px 0">${icon} <b style="color:#94a3b8">${label}:</b> ${escHtml(String(val ?? '—'))}</p>`;

    const el2 = document.createElement('div');
    el2.innerHTML = '';
    el.textContent = '';

    const scoreCard = document.createElement('div');
    scoreCard.className = 'glass-card';
    scoreCard.style.cssText = `padding:20px;margin-bottom:12px;border-left:4px solid ${corNivel}`;
    const scoreDiv = document.createElement('div');
    scoreDiv.innerHTML = `
      <div style="font-size:22px;font-weight:bold;color:${corNivel};margin-bottom:8px">${nivel}</div>
      <div style="font-size:18px;margin-bottom:12px">🎯 Score: <b>${score}/100</b></div>
      <hr style="border-color:rgba(255,255,255,0.08);margin:10px 0">
      <b style="color:#64748b;font-size:12px;letter-spacing:1px">COMPORTAMENTO</b>
      ${row('🔥','Eventos registrados', eventosLead.length)}
      ${row('📈','Simulações', simulacoes)}
      ${row('📜','Scroll profundo', scrollEv || scrollMax)}
      ${row('⏱','Tempo no site', tempoSite)}
      ${row('💬','Cliques WhatsApp', wppLead)}
      ${row('📞','Digitou telefone', digitouTel)}
      ${row('👤','Digitou nome', digitouNome)}
      <hr style="border-color:rgba(255,255,255,0.08);margin:10px 0">
      <b style="color:#64748b;font-size:12px;letter-spacing:1px">ORIGEM</b>
      ${row('📍','Origem', lead.utm_source || lead.referrer || 'direto')}
      ${row('📢','Campanha', lead.utm_campaign || '—')}
      ${row('🖥','Mídia', lead.utm_medium || '—')}
      ${row('🔗','QR / Bairro', lead.bairroQR || '—')}
      ${row('🌐','Landing', lead.landingPage || '—')}
      ${row('↩','Referrer', lead.referrer || '—')}
      <hr style="border-color:rgba(255,255,255,0.08);margin:10px 0">
      <p>💡 <b>Sugestão:</b> ${sugestao}</p>`;
    scoreCard.appendChild(scoreDiv);
    el.appendChild(scoreCard);
  } catch (err) {
    console.error('[CRM-Details] Erro ao buscar eventos:', err);
    el.textContent = 'Erro ao carregar inteligência.';
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
  <label style="${EDIT_LABEL_STYLE}">⚡ Potência da placa (Wp)
    <select id="edit-potencia-placa" style="${EDIT_INPUT_STYLE}">
      ${[400,450,500,540,580,600,650,700,750].map(w =>
        `<option value="${w}"${(lead.potenciaPlaca||580)==w?' selected':''}>${w} W</option>`
      ).join('')}
    </select>
  </label>
  ${campoEdit('🧩', 'Nº de placas', 'edit-placas', 'number', lead.placas || '', 'min="1" step="1"')}
  ${campoEdit('🔌', 'Inversor (kW)', 'edit-inversor-kw', 'number', lead.inversorKw || '', 'min="0" step="0.5"')}
  ${campoEdit('💰', 'Investimento (R$)', 'edit-investimento', 'number', lead.investimento, 'min="0" step="0.01"')}
  <hr style="border-color:#1e293b;margin:4px 0">
  <small style="color:#64748b;font-size:11px">🔄 Auto-calculados ao salvar — editáveis manualmente:</small>
  ${campoEdit('🔋', 'kWp total', 'edit-kwp', 'number', lead.kwp, 'min="0" step="0.01"')}
  ${campoEdit('📈', 'Geração Mensal (kWh)', 'edit-geracao', 'number', lead.geracao || lead.geracaoMensal, 'min="0"')}
  ${campoEdit('💸', 'Economia Real (R$/mês)', 'edit-economia', 'number', lead.economia, 'min="0" step="0.01"')}
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
  const investimentoStr = get('edit-investimento');
  const potenciaPlacaStr = get('edit-potencia-placa');
  const placasStr = get('edit-placas');
  const inversorKwStr = get('edit-inversor-kw');

  const potenciaPlaca = potenciaPlacaStr ? parseFloat(potenciaPlacaStr) : 0;
  const placas        = placasStr        ? parseFloat(placasStr)        : 0;
  const leadAtual     = _leads.find(l => l.id === _leadAtualId);
  const hsp = parseFloat(leadAtual?.hsp) || 4.5;

  // kWp: recalcula automaticamente se placas e potência foram definidos
  // Geração: recalcula se kWp mudou
  // Economia e Payback: SEMPRE usa o valor do campo (editado manualmente pelo usuário)
  let kwpCalc, geracaoCalc;
  if (placas && potenciaPlaca) {
    kwpCalc     = Math.round(placas * potenciaPlaca / 10) / 100;
    geracaoCalc = Math.round(kwpCalc * hsp * 30 * 0.80);
  }

  const kwpStr      = kwpCalc      !== undefined ? String(kwpCalc)      : get('edit-kwp');
  const geracaoStr  = geracaoCalc  !== undefined ? String(geracaoCalc)  : get('edit-geracao');
  const economiaStr = get('edit-economia'); // sempre respeita edição manual
  const paybackStr  = get('edit-payback');  // sempre respeita edição manual

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
  if (potenciaPlaca) updates.potenciaPlaca = potenciaPlaca;
  if (placas) updates.placas = placas;
  const inversorKw = inversorKwStr ? parseFloat(inversorKwStr) : undefined;
  if (inversorKw) updates.inversorKw = inversorKw;
  // Limpa kits salvos para que o motor recalcule com os novos valores
  if (placas || potenciaPlaca) updates.kitsDisponiveis = null;

  try {
    const leadSave = _leads.find(l => l.id === _leadAtualId);
    const colSave = leadSave?.origemSistema === 'landing' ? 'lp_leads' : 'leads';
    await updateDoc(doc(_db, colSave, _leadAtualId), updates);

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

// crm-leads-landing.js — Leads Landing SPA — MF CRM
import { initializeApp, getApps } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js';
import {
  getFirestore, collection, query, orderBy, onSnapshot, doc, updateDoc
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';
import { db as _dbPrimario } from '../firebase/config.js';
import { calcularKits } from '../../js/kits.js';

const PROD_CONFIG = {
  apiKey:            'AIzaSyD8OBOl1hUfsrWWT0-L19uuI-F273IvBgU',
  authDomain:        'mf-solucoes-crm.firebaseapp.com',
  projectId:         'mf-solucoes-crm',
  storageBucket:     'mf-solucoes-crm.firebasestorage.app',
  messagingSenderId: '492242482187',
  appId:             '1:492242482187:web:34c99a57f3b99c2260030e'
};

let _db = null;
let _unsub = null;
let _cache = [];      // todos os leads
let _iniciado = false;
let _abaAtiva = 'novos';  // 'novos' | 'lixeira'
let _leadModal = null;    // lead aberto no modal

// ── Utilitários ──────────────────────────────────────────────
function esc(v) {
  if (v == null || v === '') return '—';
  return String(v)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function formatData(iso) {
  if (!iso) return '—';
  try { return new Date(iso).toLocaleString('pt-BR'); } catch { return iso; }
}

function parseConta(v) {
  if (!v) return 0;
  return parseFloat(String(v).replace(/[^\d,\.]/g, '').replace(',', '.')) || 0;
}

function brl(n) {
  return Number(n).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

// ── Firestore ──────────────────────────────────────────────
async function setStatus(id, status) {
  try {
    await updateDoc(doc(_dbPrimario, 'lp_leads', id), { status });
  } catch (e) {
    console.error('[lp_leads] updateDoc:', e.message);
  }
}

async function salvarKit(id, kit) {
  try {
    await updateDoc(doc(_dbPrimario, 'lp_leads', id), {
      kitSelecionado:  kit.kit,
      potenciaSistema: kit.kwp,
      numeroPlacas:    kit.placas,
      inversor:        kit.inversor,
      economiaMensal:  kit.economia,
      investimento:    kit.investimento,
      payback:         kit.payback
    });
  } catch (e) {
    console.error('[lp_leads] salvarKit:', e.message);
  }
}

// ── Render cards ────────────────────────────────────────────
function cardHTML(lead) {
  const wpp = (lead.telefone || '').replace(/\D/g, '');
  const excluido = lead.status === 'excluido';
  return `
  <div class="ll-spa-card" data-id="${esc(lead.id)}">
    <div class="ll-spa-nome">${esc(lead.nome)}</div>
    <div class="ll-spa-row">📱 <span>${esc(lead.telefone)}</span></div>
    <div class="ll-spa-row">💡 <span>${esc(lead.valorConta)}</span></div>
    <div class="ll-spa-row">🔗 <span>${esc(lead.origem)}</span></div>
    <div class="ll-spa-row">📡 <span>${esc(lead.utm_source)}</span></div>
    <div class="ll-spa-data">🕐 ${esc(formatData(lead.createdAt))}</div>
    <div class="ll-spa-actions">
      ${wpp ? `<a class="ll-spa-btn ll-spa-btn--wpp" href="https://wa.me/55${esc(wpp)}" target="_blank" rel="noopener noreferrer">💬 WhatsApp</a>` : ''}
      <button class="ll-spa-btn ll-spa-btn--detail" data-action="detalhe" data-id="${esc(lead.id)}">🔍 Detalhes</button>
      ${excluido
        ? `<button class="ll-spa-btn ll-spa-btn--restore" data-action="restaurar" data-id="${esc(lead.id)}">♻️ Restaurar</button>`
        : `<button class="ll-spa-btn ll-spa-btn--del" data-action="excluir" data-id="${esc(lead.id)}">🗑️ Excluir</button>`
      }
    </div>
  </div>`;
}

function renderizar() {
  const grid    = document.getElementById('llspa-grid');
  const loading = document.getElementById('llspa-loading');
  if (!grid) return;
  if (loading) loading.style.display = 'none';
  // Leads landing agora aparecem na aba Leads principal do CRM.
  grid.innerHTML = '<p class="ll-spa-empty">✅ Leads da Landing Page agora aparecem na aba <strong>Leads</strong> do CRM.</p>';
}

// ── Modal detalhes + kits ───────────────────────────────────
function kitCardHTML(kit, leadId) {
  const destaque = kit.kit.includes('Recomendado') ? 'll-kit--destaque' : '';
  return `
  <div class="ll-kit-card ${destaque}">
    <div class="ll-kit-nome">${esc(kit.kit)}</div>
    <div class="ll-kit-row">⚡ <b>${kit.kwp} kWp</b></div>
    <div class="ll-kit-row">🔲 ${kit.placas} placas (${kit.potenciaPlaca}W)</div>
    <div class="ll-kit-row">🔌 Inversor ${esc(kit.inversor)}</div>
    <div class="ll-kit-row">☀️ Produção ${kit.geracao} kWh/mês</div>
    <div class="ll-kit-row">💰 Economia ${brl(kit.economia)}/mês</div>
    <div class="ll-kit-row">💳 Investimento ${brl(kit.investimento)}</div>
    <div class="ll-kit-row">📅 Payback ${kit.payback} anos</div>
    <button class="ll-spa-btn ll-spa-btn--kit" data-action="selecionarKit" data-id="${esc(leadId)}" data-kit='${JSON.stringify(kit).replace(/'/g, "&#39;")}'>
      ✅ Selecionar Kit
    </button>
  </div>`;
}

function abrirModal(lead) {
  _leadModal = lead;
  const m = document.getElementById('llspa-modal');
  if (!m) return;

  document.getElementById('llspa-modal-nome').textContent = lead.nome || '—';

  const campos = [
    ['Nome',         lead.nome],
    ['Telefone',     lead.telefone],
    ['Valor Conta',  lead.valorConta],
    ['Origem',       lead.origem],
    ['Status',       lead.status || 'novo'],
    ['UTM Source',   lead.utm_source],
    ['UTM Medium',   lead.utm_medium],
    ['UTM Campaign', lead.utm_campaign],
    ['Criado em',    formatData(lead.createdAt)],
    ['Kit Selecionado', lead.kitSelecionado],
    ['Potência',     lead.potenciaSistema ? lead.potenciaSistema + ' kWp' : null],
    ['Nº Placas',    lead.numeroPlacas],
    ['Inversor',     lead.inversor],
    ['Economia/mês', lead.economiaMensal ? brl(lead.economiaMensal) : null],
    ['Investimento', lead.investimento  ? brl(lead.investimento)  : null],
    ['Payback',      lead.payback       ? lead.payback + ' anos'  : null],
  ];

  const tbody = document.getElementById('llspa-modal-tabela');
  tbody.innerHTML = campos.map(([label, val]) =>
    `<tr><td class="ll-modal-label">${label}</td><td>${val != null && val !== '' ? esc(String(val)) : '—'}</td></tr>`
  ).join('');

  // Kits
  const conta = parseConta(lead.valorConta);
  const kitsSection = document.getElementById('llspa-kits-section');
  const gerarBtn    = document.getElementById('llspa-gerar-proposta');
  if (gerarBtn) gerarBtn.disabled = !lead.kitSelecionado;

  if (conta > 0) {
    try {
      const { kits } = calcularKits(conta);
      document.getElementById('llspa-kits-grid').innerHTML = kits.map(k => kitCardHTML(k, lead.id)).join('');
      if (kitsSection) kitsSection.style.display = 'block';
    } catch (e) {
      if (kitsSection) kitsSection.style.display = 'none';
    }
  } else {
    if (kitsSection) kitsSection.style.display = 'none';
  }

  m.style.display = 'flex';
}

// ── Eventos globais ─────────────────────────────────────────
function setupEventos() {
  // Delegação de eventos no grid
  document.getElementById('llspa-grid')?.addEventListener('click', async e => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    const { action, id } = btn.dataset;
    const lead = _cache.find(l => l.id === id);

    if (action === 'detalhe' && lead) {
      abrirModal(lead);
    } else if (action === 'excluir' && lead) {
      await setStatus(id, 'excluido');
    } else if (action === 'restaurar' && lead) {
      await setStatus(id, 'novo');
    } else if (action === 'selecionarKit') {
      const kit = JSON.parse(btn.dataset.kit);
      await salvarKit(id, kit);
      // Atualiza o lead em cache para refletir kit salvo
      const idx = _cache.findIndex(l => l.id === id);
      if (idx >= 0) Object.assign(_cache[idx], {
        kitSelecionado:  kit.kit,
        potenciaSistema: kit.kwp,
        numeroPlacas:    kit.placas,
        inversor:        kit.inversor,
        economiaMensal:  kit.economia,
        investimento:    kit.investimento,
        payback:         kit.payback
      });
      const gerarBtn = document.getElementById('llspa-gerar-proposta');
      if (gerarBtn) gerarBtn.disabled = false;
      // Atualiza tabela do modal
      if (_leadModal && _leadModal.id === id) abrirModal(_cache[idx]);
    }
  });

  // Modal — fechar
  document.getElementById('llspa-modal')?.addEventListener('click', e => {
    if (e.target.id === 'llspa-modal' || e.target.id === 'llspa-modal-fechar') {
      document.getElementById('llspa-modal').style.display = 'none';
      _leadModal = null;
    }
  });

  // Abas
  document.getElementById('llspa-tab-novos')?.addEventListener('click', () => trocarAba('novos'));
  document.getElementById('llspa-tab-lixeira')?.addEventListener('click', () => trocarAba('lixeira'));
}

function trocarAba(aba) {
  _abaAtiva = aba;
  document.getElementById('llspa-tab-novos')?.classList.toggle('ll-tab-ativa', aba === 'novos');
  document.getElementById('llspa-tab-lixeira')?.classList.toggle('ll-tab-ativa', aba === 'lixeira');
  renderizar();
}

// ── Init ─────────────────────────────────────────────────────
export function renderizarLeadsLanding() {
  renderizar();
}

export function iniciarLeadsLanding() {
  if (_iniciado) return;
  _iniciado = true;

  const existing = getApps().find(a => a.name === 'lp-prod');
  const prodApp  = existing || initializeApp(PROD_CONFIG, 'lp-prod');
  _db = getFirestore(prodApp);

  setupEventos();

  const q = query(collection(_db, 'lp_leads'), orderBy('createdAt', 'desc'));
  _unsub = onSnapshot(q, snap => {
    _cache = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    renderizar();
  }, err => {
    const loading = document.getElementById('llspa-loading');
    if (loading) { loading.style.display = 'block'; loading.textContent = 'Erro: ' + err.message; }
    console.error('[lp_leads] onSnapshot:', err);
  });
}

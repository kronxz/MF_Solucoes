// crm-leads-landing.js — Leads Landing integrado ao SPA CRM
import { initializeApp, getApps } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js';
import {
  getFirestore, collection, query, where, orderBy, onSnapshot
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';

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
let _cache = [];
let _iniciado = false;

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

function cardHTML(lead) {
  const wpp = (lead.telefone || '').replace(/\D/g, '');
  return `
  <div class="ll-spa-card">
    <div class="ll-spa-nome">${esc(lead.nome)}</div>
    <div class="ll-spa-row">📱 <span>${esc(lead.telefone)}</span></div>
    <div class="ll-spa-row">💡 <span>${esc(lead.valorConta)}</span></div>
    <div class="ll-spa-row">🔗 <span>${esc(lead.origem)}</span></div>
    <div class="ll-spa-row">📡 <span>${esc(lead.utm_source)}</span></div>
    <div class="ll-spa-data">🕐 ${esc(formatData(lead.createdAt))}</div>
    ${wpp ? `<a class="ll-spa-wpp" href="https://wa.me/55${esc(wpp)}" target="_blank" rel="noopener noreferrer">💬 WhatsApp</a>` : ''}
  </div>`;
}

function renderizar() {
  const grid    = document.getElementById('llspa-grid');
  const counter = document.getElementById('llspa-counter');
  const loading = document.getElementById('llspa-loading');
  if (!grid) return;

  if (loading) loading.style.display = 'none';
  if (counter) counter.textContent = _cache.length;
  grid.innerHTML = _cache.length
    ? _cache.map(cardHTML).join('')
    : '<p class="ll-spa-empty">Nenhum lead novo da Landing Page.</p>';
}

export function renderizarLeadsLanding() {
  renderizar();
}

export function iniciarLeadsLanding() {
  if (_iniciado) return;
  _iniciado = true;

  const existing = getApps().find(a => a.name === 'lp-prod');
  const prodApp  = existing || initializeApp(PROD_CONFIG, 'lp-prod');
  _db = getFirestore(prodApp);

  const q = query(
    collection(_db, 'lp_leads'),
    where('status', '==', 'novo'),
    orderBy('createdAt', 'desc')
  );

  _unsub = onSnapshot(q, snap => {
    _cache = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    renderizar();
  }, err => {
    const loading = document.getElementById('llspa-loading');
    if (loading) loading.textContent = 'Erro ao carregar: ' + err.message;
  });
}

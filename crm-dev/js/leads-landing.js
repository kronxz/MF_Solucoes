/**
 * Leads Landing — MF CRM
 * Lê exclusivamente lp_leads do projeto mf-solucoes-crm (PROD)
 * NÃO toca na coleção "leads" nem em nenhum outro módulo do CRM
 */
import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getFirestore, collection, query, orderBy, onSnapshot, doc, updateDoc } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const PROD_CONFIG = {
    apiKey:            "AIzaSyD8OBOl1hUfsrWWT0-L19uuI-F273IvBgU",
    authDomain:        "mf-solucoes-crm.firebaseapp.com",
    projectId:         "mf-solucoes-crm",
    storageBucket:     "mf-solucoes-crm.firebasestorage.app",
    messagingSenderId: "492242482187",
    appId:             "1:492242482187:web:34c99a57f3b99c2260030e"
};

const STATUS_LABEL = {
    novo:     { label: 'Novo',     color: '#3b82f6' },
    contato:  { label: 'Contato',  color: '#f59e0b' },
    proposta: { label: 'Proposta', color: '#8b5cf6' },
    fechado:  { label: 'Fechado',  color: '#22c55e' },
    perdido:  { label: 'Perdido',  color: '#ef4444' }
};

const STATUSES = ['novo', 'contato', 'proposta', 'fechado', 'perdido'];

function esc(v) {
    if (v == null || v === '') return '—';
    return String(v)
        .replace(/&/g,'&amp;')
        .replace(/</g,'&lt;')
        .replace(/>/g,'&gt;')
        .replace(/"/g,'&quot;');
}

function formatData(iso) {
    if (!iso) return '—';
    try { return new Date(iso).toLocaleString('pt-BR'); } catch { return iso; }
}

/* ── Firebase init ── */
let db;
function initDb() {
    const existing = getApps().find(a => a.name === 'lp-prod');
    const app = existing || initializeApp(PROD_CONFIG, 'lp-prod');
    db = getFirestore(app);
}

/* ── Cache para o modal ── */
let leadsCache = [];

/* ── Renderização ── */
function renderCards(leads) {
    const colNovos   = document.getElementById('col-novos');
    const colTodos   = document.getElementById('col-todos');
    const cntNovos   = document.getElementById('counter-novos');
    const cntTodos   = document.getElementById('counter-todos');

    const novos = leads.filter(l => (l.status || 'novo') === 'novo');

    cntNovos.textContent = novos.length;
    cntTodos.textContent = leads.length;

    colNovos.innerHTML = novos.length
        ? novos.map(cardHTML).join('')
        : '<p class="ll-empty">Não existem leads da Landing Page.</p>';

    colTodos.innerHTML = leads.length
        ? leads.map(cardHTML).join('')
        : '<p class="ll-empty">Não existem leads da Landing Page.</p>';
}

function cardHTML(lead) {
    const info = STATUS_LABEL[lead.status] || STATUS_LABEL.novo;
    const wpp  = (lead.telefone || '').replace(/\D/g,'');
    return `
    <div class="ll-card">
      <div class="ll-card-header">
        <span class="ll-badge" style="background:${info.color}22;color:${info.color};border:1px solid ${info.color}44">${esc(info.label)}</span>
        <span class="ll-card-data">${esc(formatData(lead.createdAt))}</span>
      </div>
      <div class="ll-card-nome">${esc(lead.nome)}</div>
      <div class="ll-card-row">📱 ${esc(lead.telefone)}</div>
      <div class="ll-card-row">💡 ${esc(lead.valorConta)}</div>
      <div class="ll-card-row">🔗 ${esc(lead.origem)}</div>
      <div class="ll-card-actions">
        <a class="ll-btn ll-btn-wpp" href="https://wa.me/55${esc(wpp)}" target="_blank" rel="noopener noreferrer">💬 WhatsApp</a>
        <button class="ll-btn ll-btn-detail" data-id="${esc(lead.id)}">🔍 Detalhes</button>
      </div>
      <div class="ll-status-row">
        <select class="ll-select" data-id="${esc(lead.id)}">
          ${STATUSES.map(s => `<option value="${s}"${lead.status===s?' selected':''}>${STATUS_LABEL[s].label}</option>`).join('')}
        </select>
      </div>
    </div>`;
}

/* ── Modal ── */
function abrirModal(lead) {
    const tbody = document.getElementById('ll-modal-body');
    tbody.innerHTML = '';
    [
        ['Nome',         lead.nome],
        ['Telefone',     lead.telefone],
        ['Conta',        lead.valorConta],
        ['Origem',       lead.origem],
        ['Status',       lead.status],
        ['UTM Source',   lead.utm_source],
        ['UTM Medium',   lead.utm_medium],
        ['UTM Campaign', lead.utm_campaign],
        ['GCLID',        lead.gclid],
        ['FBCLID',       lead.fbclid],
        ['Landing Page', lead.landingPage],
        ['Session ID',   lead.sessionId],
        ['Criado em',    formatData(lead.createdAt)],
    ].forEach(([label, val]) => {
        const tr  = document.createElement('tr');
        const td1 = document.createElement('td');
        const td2 = document.createElement('td');
        td1.textContent = label;
        td2.textContent = (val != null && val !== '') ? val : '—';
        tr.appendChild(td1);
        tr.appendChild(td2);
        tbody.appendChild(tr);
    });
    document.getElementById('ll-modal').style.display = 'flex';
}

async function atualizarStatus(id, novoStatus) {
    try {
        await updateDoc(doc(db, 'lp_leads', id), { status: novoStatus });
    } catch(e) {
        console.error('[lp_leads] update:', e.message);
    }
}

/* ── Listener Firestore ── */
function iniciarListener() {
    const q = query(collection(db, 'lp_leads'), orderBy('createdAt', 'desc'));
    onSnapshot(q, snap => {
        leadsCache = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        renderCards(leadsCache);
        document.getElementById('ll-loading').style.display = 'none';
    }, err => {
        console.error('[lp_leads]', err.message);
        document.getElementById('ll-loading').textContent = 'Erro ao carregar leads: ' + err.message;
    });
}

/* ── Event delegation ── */
function setupEvents() {
    document.body.addEventListener('click', e => {
        const btn = e.target.closest('.ll-btn-detail');
        if (btn) {
            const lead = leadsCache.find(l => l.id === btn.dataset.id);
            if (lead) abrirModal(lead);
        }
        if (e.target.closest('#ll-modal-close-btn') || e.target.id === 'll-modal') {
            document.getElementById('ll-modal').style.display = 'none';
        }
    });
    document.body.addEventListener('change', e => {
        const sel = e.target.closest('.ll-select');
        if (sel) atualizarStatus(sel.dataset.id, sel.value);
    });
    document.querySelectorAll('.ll-tab').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.ll-tab').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.ll-col').forEach(c => c.style.display = 'none');
            btn.classList.add('active');
            document.getElementById(btn.dataset.col).style.display = 'grid';
        });
    });
}

/* ── Init ── */
document.addEventListener('DOMContentLoaded', () => {
    initDb();
    setupEvents();
    iniciarListener();
});

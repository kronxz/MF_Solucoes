/**
 * Leads Landing — MF CRM
 * Lê exclusivamente lp_leads (mf-solucoes-crm PROD)
 */
import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getFirestore, collection, query, orderBy, onSnapshot, doc, updateDoc } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

const PROD_CONFIG = {
    apiKey: "AIzaSyD8OBOl1hUfsrWWT0-L19uuI-F273IvBgU",
    authDomain: "mf-solucoes-crm.firebaseapp.com",
    projectId: "mf-solucoes-crm",
    storageBucket: "mf-solucoes-crm.firebasestorage.app",
    messagingSenderId: "492242482187",
    appId: "1:492242482187:web:34c99a57f3b99c2260030e"
};

function esc(v) {
    if (v == null) return '—';
    return String(v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}

const STATUSES = ['novo', 'contato', 'proposta', 'fechado', 'perdido'];

const STATUS_LABEL = {
    novo:     { label: 'Novo',     color: '#3b82f6' },
    contato:  { label: 'Contato',  color: '#f59e0b' },
    proposta: { label: 'Proposta', color: '#8b5cf6' },
    fechado:  { label: 'Fechado',  color: '#22c55e' },
    perdido:  { label: 'Perdido',  color: '#ef4444' }
};

let app, db, auth;

function initFirebase() {
    const existing = getApps().find(a => a.name === 'lp-prod');
    app  = existing || initializeApp(PROD_CONFIG, 'lp-prod');
    db   = getFirestore(app);
    auth = getAuth(app);
}

function formatData(iso) {
    if (!iso) return '—';
    try { return new Date(iso).toLocaleString('pt-BR'); } catch { return iso; }
}

function renderCards(leads) {
    const col = document.getElementById('col-novos');
    const allCol = document.getElementById('col-todos');
    const counter = document.getElementById('counter-novos');
    const allCounter = document.getElementById('counter-todos');

    if (!col || !allCol) return;

    const novos = leads.filter(l => l.status === 'novo');
    counter.textContent = novos.length;
    allCounter.textContent = leads.length;

    col.innerHTML    = novos.map(cardHTML).join('');
    allCol.innerHTML = leads.map(cardHTML).join('');
}

function cardHTML(lead) {
    const statusInfo = STATUS_LABEL[lead.status] || STATUS_LABEL.novo;
    const wpp = (lead.telefone || '').replace(/\D/g, '');
    const safeId = esc(lead.id);
    return `
    <div class="ll-card" data-id="${safeId}">
        <div class="ll-card-header">
            <span class="ll-badge" style="background:${statusInfo.color}22;color:${statusInfo.color};border:1px solid ${statusInfo.color}44">
                ${esc(statusInfo.label)}
            </span>
            <span class="ll-card-data">${esc(formatData(lead.createdAt))}</span>
        </div>
        <div class="ll-card-nome">${esc(lead.nome)}</div>
        <div class="ll-card-tel">📱 ${esc(lead.telefone)}</div>
        <div class="ll-card-conta">💡 ${esc(lead.valorConta)}</div>
        <div class="ll-card-origem">🔗 ${esc(lead.origem)}</div>
        <div class="ll-card-actions">
            <a class="ll-btn ll-btn-wpp" href="https://wa.me/55${esc(wpp)}" target="_blank" rel="noopener noreferrer">
                💬 WhatsApp
            </a>
            <button class="ll-btn ll-btn-detail" data-id="${safeId}">
                🔍 Detalhes
            </button>
        </div>
        <div class="ll-status-row">
            <select class="ll-select" data-id="${safeId}">
                ${STATUSES.map(s => `<option value="${esc(s)}" ${lead.status === s ? 'selected' : ''}>${esc(STATUS_LABEL[s].label)}</option>`).join('')}
            </select>
        </div>
    </div>`;
}

function setRow(tbody, label, value) {
    const tr = document.createElement('tr');
    const td1 = document.createElement('td');
    const td2 = document.createElement('td');
    td1.textContent = label;
    td2.textContent = value || '—';
    tr.appendChild(td1);
    tr.appendChild(td2);
    tbody.appendChild(tr);
}

window.abrirModal = function(lead) {
    const el   = document.getElementById('ll-modal');
    const body = document.getElementById('ll-modal-body');
    body.innerHTML = '';
    const table = document.createElement('table');
    table.className = 'll-modal-table';
    const tbody = document.createElement('tbody');
    [
        ['Nome',        lead.nome],
        ['Telefone',    lead.telefone],
        ['Conta',       lead.valorConta],
        ['Origem',      lead.origem],
        ['Status',      lead.status],
        ['UTM Source',  lead.utm_source],
        ['UTM Medium',  lead.utm_medium],
        ['UTM Campaign',lead.utm_campaign],
        ['GCLID',       lead.gclid],
        ['FBCLID',      lead.fbclid],
        ['Landing Page',lead.landingPage],
        ['Session ID',  lead.sessionId],
        ['Criado em',   formatData(lead.createdAt)],
    ].forEach(([l, v]) => setRow(tbody, l, v));
    table.appendChild(tbody);
    body.appendChild(table);
    el.style.display = 'flex';
};

window.fecharModal = function() {
    document.getElementById('ll-modal').style.display = 'none';
};

window.atualizarStatus = async function(id, novoStatus) {
    try {
        await updateDoc(doc(db, 'lp_leads', id), { status: novoStatus });
    } catch(e) {
        console.error('[lp_leads] updateStatus:', e);
    }
};

let leadsCache = [];

function iniciarListener() {
    const q = query(collection(db, 'lp_leads'), orderBy('createdAt', 'desc'));
    onSnapshot(q, snap => {
        leadsCache = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        renderCards(leadsCache);
        document.getElementById('ll-loading').style.display = 'none';
    }, err => {
        console.error('[lp_leads]', err);
        document.getElementById('ll-loading').textContent = 'Erro ao carregar leads.';
    });
}

function setupDelegation() {
    document.body.addEventListener('click', e => {
        const btn = e.target.closest('.ll-btn-detail');
        if (btn) {
            const lead = leadsCache.find(l => l.id === btn.dataset.id);
            if (lead) abrirModal(lead);
        }
    });
    document.body.addEventListener('change', e => {
        const sel = e.target.closest('.ll-select');
        if (sel) atualizarStatus(sel.dataset.id, sel.value);
    });
}

document.addEventListener('DOMContentLoaded', () => {
    initFirebase();
    setupDelegation();
    onAuthStateChanged(auth, user => {
        if (!user) { window.location.href = 'login.html'; return; }
        document.getElementById('ll-user').textContent = user.email;
        iniciarListener();
    });

    // Tab switching
    document.querySelectorAll('.ll-tab').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.ll-tab').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.ll-col').forEach(c => c.style.display = 'none');
            btn.classList.add('active');
            document.getElementById(btn.dataset.col).style.display = 'block';
        });
    });

    // Close modal on backdrop click
    document.getElementById('ll-modal').addEventListener('click', e => {
        if (e.target === e.currentTarget) fecharModal();
    });
});

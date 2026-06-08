/**
 * firestore.js — MF Control Center
 * CC-6: Firestore Manager — Visualizador somente leitura.
 * Coleções: leads, lp_leads, instalacoes, financeiro_dados, eventos, analytics.
 * NÃO altera, NÃO deleta, NÃO restaura — apenas leitura e visualização.
 */

import { db } from '../firebase-config.js';
import {
  collection, getDocs, query, limit, orderBy, getCountFromServer,
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';

// Coleções a visualizar
const COLECOES = [
  { id: 'leads',            icon: '👥', label: 'Leads',           cor: '#1e3a5f' },
  { id: 'lp_leads',         icon: '🌐', label: 'LP Leads',        cor: '#1a3a2a' },
  { id: 'instalacoes',      icon: '⚡', label: 'Instalações',     cor: '#3a2a1a' },
  { id: 'financeiro_dados', icon: '💰', label: 'Financeiro',      cor: '#2a1a3a' },
  { id: 'eventos',          icon: '📅', label: 'Eventos',         cor: '#1a2a3a' },
  { id: 'analytics',        icon: '📈', label: 'Analytics',       cor: '#1a3a3a' },
];

const PAGE_SIZE = 50;

let _iniciado = false;
let _viewState = { mode: 'grid', colId: null, docs: [], total: 0, search: '' };

export function firestoreInit() {
  if (_iniciado) return;
  _iniciado = true;
  _build();
}

// ── Build ─────────────────────────────────────────────────────────────────────
function _build() {
  const container = document.getElementById('page-firestore');
  if (!container) return;
  container.innerHTML = '';

  // Header
  const hdr = document.createElement('div');
  hdr.className = 'dash-header';
  hdr.innerHTML = `
    <div>
      <h2>🔥 Firestore Manager</h2>
      <p class="dash-sub">Somente leitura · Dados ao vivo PROD · CC-6</p>
    </div>
    <div style="display:flex;gap:8px;align-items:center;">
      <span class="badge-safe" style="background:#1e3a1e;color:#4ade80;">🔒 READ-ONLY</span>
      <button class="btn-backup" id="fs-btn-refresh" style="font-size:11px;padding:4px 10px;">🔄 Atualizar</button>
    </div>
  `;
  container.appendChild(hdr);

  // Breadcrumb / nav
  const nav = document.createElement('div');
  nav.id = 'fs-breadcrumb';
  nav.style.cssText = 'font-size:12px;color:#94a3b8;margin:8px 0 4px;min-height:20px;';
  nav.textContent = 'Coleções disponíveis';
  container.appendChild(nav);

  // Main area
  const main = document.createElement('div');
  main.id = 'fs-main';
  container.appendChild(main);

  document.getElementById('fs-btn-refresh')?.addEventListener('click', () => {
    _iniciado = false;
    _viewState = { mode: 'grid', colId: null, docs: [], total: 0, search: '' };
    _build();
  });

  _showGrid();
}

// ── Grade de coleções ─────────────────────────────────────────────────────────
async function _showGrid() {
  _viewState.mode = 'grid';
  _viewState.colId = null;

  const main = document.getElementById('fs-main');
  if (!main) return;

  const nav = document.getElementById('fs-breadcrumb');
  if (nav) nav.textContent = 'Coleções disponíveis';

  main.innerHTML = `
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:12px;margin-top:8px;"
         id="fs-col-grid">
      ${COLECOES.map(c => `
        <div class="dash-card" id="fs-card-${c.id}" style="margin:0;cursor:pointer;border:1px solid ${c.cor};transition:border 0.2s;"
             data-col="${c.id}">
          <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px;">
            <span style="font-size:22px;">${c.icon}</span>
            <div>
              <div style="color:#e2e8f0;font-weight:600;font-size:14px;">${c.label}</div>
              <div style="color:#94a3b8;font-size:11px;font-family:monospace;">${c.id}</div>
            </div>
          </div>
          <div id="fs-count-${c.id}" style="font-size:20px;font-weight:700;color:#60a5fa;">⟳</div>
          <div style="font-size:11px;color:#475569;margin-top:2px;">documentos</div>
        </div>
      `).join('')}
    </div>
  `;

  // Click listeners nos cards
  document.querySelectorAll('#fs-col-grid [data-col]').forEach(card => {
    card.addEventListener('click', () => _showCollection(card.dataset.col));
    card.addEventListener('mouseenter', () => { card.style.borderColor = '#60a5fa'; card.style.transform = 'translateY(-1px)'; });
    card.addEventListener('mouseleave', () => {
      const col = COLECOES.find(c => c.id === card.dataset.col);
      card.style.borderColor = col?.cor || '#1e3a5f';
      card.style.transform = '';
    });
  });

  // Carrega contagens em paralelo
  await Promise.all(COLECOES.map(async c => {
    const el = document.getElementById('fs-count-' + c.id);
    if (!el) return;
    try {
      const snap = await getCountFromServer(collection(db, c.id));
      el.textContent = snap.data().count.toLocaleString('pt-BR');
      el.style.color = snap.data().count > 0 ? '#4ade80' : '#64748b';
    } catch (e) {
      // getCountFromServer pode não estar disponível — fallback
      try {
        const snap = await getDocs(query(collection(db, c.id), limit(500)));
        el.textContent = snap.size + (snap.size >= 500 ? '+' : '');
        el.style.color = snap.size > 0 ? '#4ade80' : '#64748b';
      } catch (e2) {
        el.textContent = '—';
        el.style.color = '#f87171';
        el.title = e2.message;
      }
    }
  }));
}

// ── Visualização de coleção ───────────────────────────────────────────────────
async function _showCollection(colId) {
  const col = COLECOES.find(c => c.id === colId);
  if (!col) return;

  _viewState.mode = 'collection';
  _viewState.colId = colId;
  _viewState.search = '';

  const nav = document.getElementById('fs-breadcrumb');
  if (nav) {
    nav.innerHTML = `
      <span style="cursor:pointer;color:#60a5fa;" id="fs-nav-home">🔥 Coleções</span>
      <span style="color:#475569;margin:0 6px;">›</span>
      <span style="color:#e2e8f0;">${_esc(col.icon)} ${_esc(col.label)}</span>
      <span style="color:#64748b;font-family:monospace;margin-left:6px;">(${_esc(col.id)})</span>
    `;
    document.getElementById('fs-nav-home')?.addEventListener('click', _showGrid);
  }

  const main = document.getElementById('fs-main');
  if (!main) return;
  main.innerHTML = `
    <div style="display:flex;gap:8px;align-items:center;margin:10px 0;">
      <input type="text" id="fs-search" placeholder="🔍 Buscar por ID ou valor..."
        style="background:#0d1f3c;border:1px solid #1e3a5f;color:#e2e8f0;padding:6px 10px;border-radius:4px;font-size:12px;flex:1;">
      <span id="fs-doc-count" style="color:#94a3b8;font-size:12px;white-space:nowrap;min-width:80px;text-align:right;">⟳ carregando...</span>
    </div>
    <div id="fs-table-wrap" style="overflow:auto;max-height:520px;background:#060f1e;border:1px solid #1e293b;border-radius:6px;">
      <div style="padding:20px;color:#94a3b8;font-size:12px;">⟳ Carregando ${col.label}...</div>
    </div>
    <div id="fs-doc-detail" style="display:none;margin-top:12px;"></div>
  `;

  document.getElementById('fs-search')?.addEventListener('input', e => {
    _viewState.search = e.target.value.toLowerCase().trim();
    _renderTable();
  });

  // Carrega docs
  await _loadDocs(colId);
}

// ── Carrega documentos ────────────────────────────────────────────────────────
async function _loadDocs(colId) {
  const col = COLECOES.find(c => c.id === colId);
  const countEl = document.getElementById('fs-doc-count');
  const wrap = document.getElementById('fs-table-wrap');
  if (!wrap) return;

  try {
    const q = query(collection(db, colId), limit(PAGE_SIZE));
    const snap = await getDocs(q);
    _viewState.docs = snap.docs.map(d => ({ _id: d.id, ..._serializeDoc(d.data()) }));
    _viewState.total = snap.size;

    if (countEl) {
      countEl.textContent = `${snap.size}${snap.size >= PAGE_SIZE ? '+' : ''} docs`;
      if (snap.size >= PAGE_SIZE) {
        countEl.title = `Mostrando primeiros ${PAGE_SIZE} — coleção pode ter mais`;
      }
    }
    _renderTable();
  } catch (e) {
    if (wrap) wrap.innerHTML = `<div style="padding:16px;color:#f87171;">❌ Erro ao carregar ${_esc(col?.label ?? colId)}: ${_esc(e.message)}</div>`;
    if (countEl) countEl.textContent = 'erro';
  }
}

// ── Renderiza tabela ──────────────────────────────────────────────────────────
function _renderTable() {
  const wrap = document.getElementById('fs-table-wrap');
  if (!wrap) return;

  const q = _viewState.search;
  const docs = q
    ? _viewState.docs.filter(d => JSON.stringify(d).toLowerCase().includes(q))
    : _viewState.docs;

  if (docs.length === 0) {
    wrap.innerHTML = `<div style="padding:20px;text-align:center;color:#94a3b8;font-size:13px;">${q ? '🔍 Nenhum resultado para "' + _esc(q) + '"' : '📭 Coleção vazia'}</div>`;
    return;
  }

  // Descobre colunas do primeiro documento
  const allKeys = new Set(['_id']);
  docs.slice(0, 20).forEach(d => Object.keys(d).forEach(k => allKeys.add(k)));
  const cols = [...allKeys].slice(0, 10); // máx 10 colunas visíveis

  wrap.innerHTML = `
    <table style="width:100%;border-collapse:collapse;font-size:11px;white-space:nowrap;">
      <thead>
        <tr style="background:#0d1f3c;position:sticky;top:0;z-index:1;">
          ${cols.map(c => `<th style="padding:6px 10px;text-align:left;color:#94a3b8;font-weight:600;border-bottom:1px solid #1e3a5f;">${_esc(c)}</th>`).join('')}
        </tr>
      </thead>
      <tbody>
        ${docs.map((d, i) => `
          <tr data-idx="${i}" class="fs-row" style="border-top:1px solid #0f1a2e;cursor:pointer;"
              onmouseenter="this.style.background='#0d1f3c'" onmouseleave="this.style.background=''">
            ${cols.map(c => {
              const v = d[c];
              const cell = v === undefined ? '<span style="color:#1e293b;">—</span>' :
                           typeof v === 'object' && v !== null ? `<span style="color:#a78bfa;">{…}</span>` :
                           typeof v === 'boolean' ? `<span style="color:${v?'#4ade80':'#f87171'};">${_esc(String(v))}</span>` :
                           `<span style="color:${c==='_id'?'#f59e0b':'#e2e8f0'};">${_esc(String(v).slice(0, 50))}${String(v).length > 50 ? '…' : ''}</span>`;
              return `<td style="padding:5px 10px;">${cell}</td>`;
            }).join('')}
          </tr>
        `).join('')}
      </tbody>
    </table>
    ${docs.length < _viewState.docs.length ? `
      <div style="padding:6px 10px;font-size:11px;color:#64748b;text-align:right;">
        Mostrando ${docs.length} de ${_viewState.docs.length} (filtro ativo)
      </div>` : ''}
  `;

  // Click em linha → expande JSON
  wrap.querySelectorAll('.fs-row').forEach(row => {
    row.addEventListener('click', () => {
      const idx = parseInt(row.dataset.idx);
      _showDocDetail(docs[idx]);
    });
  });
}

// ── Detalhe do documento ──────────────────────────────────────────────────────
function _showDocDetail(doc) {
  const area = document.getElementById('fs-doc-detail');
  if (!area) return;

  const isOpen = area.style.display !== 'none' && area.dataset.docId === doc._id;
  if (isOpen) {
    area.style.display = 'none';
    area.dataset.docId = '';
    return;
  }

  area.dataset.docId = doc._id;
  area.style.display = '';
  area.innerHTML = `
    <div class="dash-card" style="margin:0;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
        <h3 style="color:#f59e0b;font-size:13px;">
          📄 Documento: <code style="color:#fbbf24;">${_esc(doc._id)}</code>
        </h3>
        <div style="display:flex;gap:6px;">
          <button class="btn-backup" id="fs-copy-doc" style="font-size:11px;padding:3px 8px;">📋 Copiar JSON</button>
          <button class="btn-backup" id="fs-close-doc" style="font-size:11px;padding:3px 8px;background:#1e293b;">✕ Fechar</button>
        </div>
      </div>
      <pre style="background:#020812;border:1px solid #1e293b;border-radius:4px;padding:10px;font-size:11px;color:#94a3b8;overflow:auto;max-height:300px;white-space:pre-wrap;word-break:break-all;">${_esc(JSON.stringify(doc, null, 2))}</pre>
      <div style="margin-top:6px;font-size:10px;color:#475569;text-align:right;">🔒 Somente leitura — CC-6</div>
    </div>
  `;

  document.getElementById('fs-close-doc')?.addEventListener('click', () => {
    area.style.display = 'none';
    area.dataset.docId = '';
  });

  document.getElementById('fs-copy-doc')?.addEventListener('click', () => {
    navigator.clipboard?.writeText(JSON.stringify(doc, null, 2)).then(() => {
      const btn = document.getElementById('fs-copy-doc');
      if (btn) { btn.textContent = '✅ Copiado!'; setTimeout(() => { btn.textContent = '📋 Copiar JSON'; }, 1500); }
    }).catch(() => {});
  });
}

// ── Serializa doc Firestore (Timestamp → ISO) ─────────────────────────────────
function _serializeDoc(data) {
  if (!data || typeof data !== 'object') return data;
  const out = {};
  for (const [k, v] of Object.entries(data)) {
    if (v && typeof v.toDate === 'function') {
      out[k] = v.toDate().toISOString();
    } else if (v && typeof v === 'object' && v.seconds !== undefined) {
      out[k] = new Date(v.seconds * 1000).toISOString();
    } else if (Array.isArray(v)) {
      out[k] = v.map(i => (typeof i === 'object' ? _serializeDoc(i) : i));
    } else if (v && typeof v === 'object' && !Array.isArray(v)) {
      out[k] = _serializeDoc(v);
    } else {
      out[k] = v;
    }
  }
  return out;
}

// ── XSS escape ───────────────────────────────────────────────────────────────
function _esc(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

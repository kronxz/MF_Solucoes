/**
 * documentos.js — MF Control Center
 * CC-9: Document Manager — Clientes, Propostas, Obras, Laudos, Orçamentos, Mídias
 *
 * Persistência: Firestore (metadados) + filesystem local (arquivos)
 * Arquivos abertos com shell.openPath() via IPC docs:openFile
 * Upload = selecionar arquivo via dialog + salvar path no Firestore
 */

import { db } from '../firebase-config.js';
import {
  collection, addDoc, getDocs, getDoc, doc,
  updateDoc, deleteDoc, query, orderBy, where,
  serverTimestamp, Timestamp,
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';

// ── Coleções Firestore ─────────────────────────────────────────────────────────
const COL = {
  clientes:    'docs_clientes',
  propostas:   'docs_propostas',
  obras:       'docs_obras',
  laudos:      'docs_laudos',
  orcamentos:  'docs_orcamentos',
  midias:      'docs_midias',
};

// ── Estado ────────────────────────────────────────────────────────────────────
const S = {
  tab:       'clientes',   // aba ativa
  clientes:  [],
  propostas: [],
  obras:     [],
  laudos:    [],
  orcamentos:[],
  midias:    [],
  baseFiles: null,         // resultado do docs:scanBase
  loading:   false,
  iniciado:  false,
};

// ── Helpers ───────────────────────────────────────────────────────────────────
function esc(s) {
  if (s == null) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function fmtDate(v) {
  if (!v) return '—';
  let d;
  if (v instanceof Timestamp) d = v.toDate();
  else if (v?.seconds)        d = new Date(v.seconds * 1000);
  else                        d = new Date(v);
  if (isNaN(d)) return '—';
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function fmtSize(bytes) {
  if (!bytes) return '—';
  if (bytes < 1024)        return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

function extIcon(ext) {
  const m = {
    '.pdf': '📄', '.docx': '📝', '.doc': '📝',
    '.xlsx': '📊', '.xls': '📊',
    '.jpg': '🖼️', '.jpeg': '🖼️', '.png': '🖼️', '.gif': '🖼️', '.webp': '🖼️',
    '.mp4': '🎬', '.mov': '🎬', '.avi': '🎬',
    '.zip': '📦', '.rar': '📦',
  };
  return m[ext?.toLowerCase()] || '📎';
}

function statusBadge(status) {
  const m = {
    'ativo':       '<span class="doc-badge doc-badge--green">Ativo</span>',
    'concluida':   '<span class="doc-badge doc-badge--green">Concluída</span>',
    'concluído':   '<span class="doc-badge doc-badge--green">Concluído</span>',
    'em andamento':'<span class="doc-badge doc-badge--yellow">Em Andamento</span>',
    'pendente':    '<span class="doc-badge doc-badge--yellow">Pendente</span>',
    'cancelada':   '<span class="doc-badge doc-badge--red">Cancelada</span>',
    'cancelado':   '<span class="doc-badge doc-badge--red">Cancelado</span>',
  };
  const k = (status || '').toLowerCase();
  return m[k] || `<span class="doc-badge">${esc(status) || '—'}</span>`;
}

function showToast(msg, tipo = 'ok') {
  let t = document.getElementById('docs-toast');
  if (!t) {
    t = document.createElement('div');
    t.id = 'docs-toast';
    document.body.appendChild(t);
  }
  t.textContent = msg;
  t.className   = 'docs-toast docs-toast--' + tipo;
  t.style.opacity = '1';
  clearTimeout(t._timer);
  t._timer = setTimeout(() => { t.style.opacity = '0'; }, 3000);
}

function confirm2(msg) {
  return window.confirm(msg);
}

// ── Init ──────────────────────────────────────────────────────────────────────
let _iniciado = false;

export async function documentosInit() {
  if (_iniciado) return;
  _iniciado = true;

  const container = document.getElementById('page-documentos');
  if (!container) return;

  _buildUI(container);
  await _loadAll();
}

// ── Build da UI ───────────────────────────────────────────────────────────────
function _buildUI(container) {
  container.innerHTML = `
    <div class="docs-wrap">

      <!-- Header -->
      <div class="dash-header">
        <div>
          <h2>📁 Document Manager</h2>
          <p class="dash-sub">Clientes · Propostas · Obras · Laudos · Orçamentos · Mídias · CC-9</p>
        </div>
        <div style="display:flex;gap:8px;align-items:center;">
          <button id="docs-scan-btn" class="btn-backup" style="font-size:11px;padding:4px 12px;">
            🔍 Escanear Pasta
          </button>
          <span id="docs-status-badge" class="badge-safe">⟳ Carregando...</span>
        </div>
      </div>

      <!-- Abas -->
      <div class="docs-tabs" role="tablist">
        <button class="docs-tab active" data-tab="clientes"   role="tab">👤 Clientes</button>
        <button class="docs-tab"        data-tab="propostas"  role="tab">📄 Propostas</button>
        <button class="docs-tab"        data-tab="obras"      role="tab">🏗️ Obras</button>
        <button class="docs-tab"        data-tab="laudos"     role="tab">📋 Laudos</button>
        <button class="docs-tab"        data-tab="orcamentos" role="tab">💰 Orçamentos</button>
        <button class="docs-tab"        data-tab="midias"     role="tab">🖼️ Mídias</button>
      </div>

      <!-- Painéis -->
      <div class="docs-panels">
        <div id="docs-panel-clientes"   class="docs-panel active"></div>
        <div id="docs-panel-propostas"  class="docs-panel"></div>
        <div id="docs-panel-obras"      class="docs-panel"></div>
        <div id="docs-panel-laudos"     class="docs-panel"></div>
        <div id="docs-panel-orcamentos" class="docs-panel"></div>
        <div id="docs-panel-midias"     class="docs-panel"></div>
      </div>

    </div>
  `;

  // Bind abas
  container.querySelectorAll('.docs-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      container.querySelectorAll('.docs-tab').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const tab = btn.dataset.tab;
      container.querySelectorAll('.docs-panel').forEach(p =>
        p.classList.toggle('active', p.id === 'docs-panel-' + tab)
      );
      S.tab = tab;
    });
  });

  // Scan da pasta local
  document.getElementById('docs-scan-btn').addEventListener('click', async () => {
    const btn = document.getElementById('docs-scan-btn');
    btn.disabled = true;
    btn.textContent = '⟳ Escaneando...';
    const r = await window.MFControl?.docs?.scanBase();
    S.baseFiles = r;
    if (r?.ok) {
      showToast(`Escaneados ${r.total} arquivos (${r.propostas?.length || 0} propostas, ${r.midias?.length || 0} mídias)`);
      _renderPropostas();
      _renderLaudos();
      _renderOrcamentos();
      _renderMidias();
    } else {
      showToast('Erro ao escanear: ' + (r?.error || 'desconhecido'), 'err');
    }
    btn.disabled = false;
    btn.textContent = '🔍 Escanear Pasta';
  });
}

// ── Carregamento inicial de todos os dados ────────────────────────────────────
async function _loadAll() {
  const badge = document.getElementById('docs-status-badge');
  if (badge) badge.textContent = '⟳ Carregando...';

  try {
    await Promise.all([
      _loadClientes(),
      _loadPropostas(),
      _loadObras(),
      _loadLaudos(),
      _loadOrcamentos(),
      _loadMidias(),
    ]);
    _renderClientes();
    _renderPropostas();
    _renderObras();
    _renderLaudos();
    _renderOrcamentos();
    _renderMidias();
    if (badge) {
      const total = S.clientes.length + S.propostas.length + S.obras.length;
      badge.textContent = `✅ ${total} registros`;
      badge.style.background = '#14532d';
      badge.style.color = '#86efac';
    }
  } catch (e) {
    console.error('[Docs] loadAll error:', e);
    if (badge) { badge.textContent = '⚠️ Erro'; badge.style.color = '#fbbf24'; }
    showToast('Erro ao carregar dados: ' + e.message, 'err');
  }
}

// ── Firestore — Leitura ───────────────────────────────────────────────────────
async function _loadClientes() {
  const snap = await getDocs(query(collection(db, COL.clientes), orderBy('nome')));
  S.clientes = snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

async function _loadPropostas() {
  const snap = await getDocs(query(collection(db, COL.propostas), orderBy('createdAt', 'desc')));
  S.propostas = snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

async function _loadObras() {
  const snap = await getDocs(query(collection(db, COL.obras), orderBy('createdAt', 'desc')));
  S.obras = snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

async function _loadLaudos() {
  const snap = await getDocs(query(collection(db, COL.laudos), orderBy('createdAt', 'desc')));
  S.laudos = snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

async function _loadOrcamentos() {
  const snap = await getDocs(query(collection(db, COL.orcamentos), orderBy('createdAt', 'desc')));
  S.orcamentos = snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

async function _loadMidias() {
  const snap = await getDocs(query(collection(db, COL.midias), orderBy('createdAt', 'desc')));
  S.midias = snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

// ── CLIENTES ──────────────────────────────────────────────────────────────────
function _renderClientes(filtro = '') {
  const panel = document.getElementById('docs-panel-clientes');
  if (!panel) return;

  const lista = filtro
    ? S.clientes.filter(c =>
        c.nome?.toLowerCase().includes(filtro.toLowerCase()) ||
        c.email?.toLowerCase().includes(filtro.toLowerCase()) ||
        c.tel?.includes(filtro)
      )
    : S.clientes;

  panel.innerHTML = `
    <div class="docs-toolbar">
      <input id="docs-search-clientes" class="docs-search" type="text"
             placeholder="Pesquisar cliente..." value="${esc(filtro)}">
      <button id="docs-novo-cliente" class="btn-backup">+ Novo Cliente</button>
    </div>
    <div class="docs-count">${lista.length} cliente${lista.length !== 1 ? 's' : ''}</div>

    ${lista.length === 0 ? `
      <div class="docs-empty">
        <span>👤</span>
        <p>${filtro ? 'Nenhum cliente encontrado para "' + esc(filtro) + '"' : 'Nenhum cliente cadastrado ainda.'}</p>
        ${!filtro ? '<p class="muted">Clique em "+ Novo Cliente" para cadastrar.</p>' : ''}
      </div>
    ` : `
      <div class="docs-card-grid">
        ${lista.map(c => _clienteCard(c)).join('')}
      </div>
    `}
  `;

  // Busca
  panel.querySelector('#docs-search-clientes').addEventListener('input', e => {
    _renderClientes(e.target.value);
  });

  // Novo cliente
  panel.querySelector('#docs-novo-cliente').addEventListener('click', () => {
    _modalCliente(null);
  });

  // Ações dos cards
  panel.querySelectorAll('[data-edit-cliente]').forEach(btn => {
    const id = btn.dataset.editCliente;
    btn.addEventListener('click', () => _modalCliente(S.clientes.find(c => c.id === id)));
  });
  panel.querySelectorAll('[data-del-cliente]').forEach(btn => {
    const id = btn.dataset.delCliente;
    btn.addEventListener('click', () => _delCliente(id));
  });
  panel.querySelectorAll('[data-hist-cliente]').forEach(btn => {
    const id = btn.dataset.histCliente;
    btn.addEventListener('click', () => _historicoCliente(id));
  });
}

function _clienteCard(c) {
  const nPropostas = S.propostas.filter(p => p.clienteId === c.id).length;
  const nObras     = S.obras.filter(o => o.clienteId === c.id).length;
  const ini = (c.nome || '?').trim().charAt(0).toUpperCase();

  return `
    <div class="docs-card">
      <div class="docs-card-header">
        <div class="docs-avatar">${esc(ini)}</div>
        <div class="docs-card-info">
          <div class="docs-card-title">${esc(c.nome)}</div>
          <div class="docs-card-sub">${esc(c.email) || '—'}</div>
        </div>
      </div>
      <div class="docs-card-body">
        ${c.tel     ? `<div class="docs-field"><span>📞</span> ${esc(c.tel)}</div>` : ''}
        ${c.endereco? `<div class="docs-field"><span>📍</span> ${esc(c.endereco)}</div>` : ''}
        ${c.obs     ? `<div class="docs-field muted">${esc(c.obs)}</div>` : ''}
      </div>
      <div class="docs-card-links">
        <span class="doc-chip">📄 ${nPropostas} proposta${nPropostas !== 1 ? 's' : ''}</span>
        <span class="doc-chip">🏗️ ${nObras} obra${nObras !== 1 ? 's' : ''}</span>
      </div>
      <div class="docs-card-actions">
        <button class="btn-doc-sm" data-edit-cliente="${esc(c.id)}">✏️ Editar</button>
        <button class="btn-doc-sm" data-hist-cliente="${esc(c.id)}">📜 Histórico</button>
        <button class="btn-doc-sm btn-doc-sm--danger" data-del-cliente="${esc(c.id)}">🗑️</button>
      </div>
    </div>
  `;
}

function _modalCliente(cliente) {
  const isEdit = !!cliente;
  const modal = _createModal(isEdit ? 'Editar Cliente' : 'Novo Cliente', `
    <div class="docs-form">
      <div class="docs-form-group">
        <label>Nome *</label>
        <input id="mf-nome" class="docs-input" type="text" value="${esc(cliente?.nome || '')}" placeholder="Nome completo">
      </div>
      <div class="docs-form-group">
        <label>Email</label>
        <input id="mf-email" class="docs-input" type="email" value="${esc(cliente?.email || '')}" placeholder="email@exemplo.com">
      </div>
      <div class="docs-form-group">
        <label>Telefone</label>
        <input id="mf-tel" class="docs-input" type="text" value="${esc(cliente?.tel || '')}" placeholder="(21) 99999-9999">
      </div>
      <div class="docs-form-group">
        <label>Endereço</label>
        <input id="mf-endereco" class="docs-input" type="text" value="${esc(cliente?.endereco || '')}" placeholder="Rua, número, bairro, cidade">
      </div>
      <div class="docs-form-group">
        <label>Observações</label>
        <textarea id="mf-obs" class="docs-textarea" rows="3">${esc(cliente?.obs || '')}</textarea>
      </div>
    </div>
  `, async () => {
    const nome = document.getElementById('mf-nome').value.trim();
    if (!nome) { showToast('Nome é obrigatório', 'err'); return false; }

    const data = {
      nome,
      email:    document.getElementById('mf-email').value.trim(),
      tel:      document.getElementById('mf-tel').value.trim(),
      endereco: document.getElementById('mf-endereco').value.trim(),
      obs:      document.getElementById('mf-obs').value.trim(),
      updatedAt: serverTimestamp(),
    };

    if (isEdit) {
      await updateDoc(doc(db, COL.clientes, cliente.id), data);
      showToast('Cliente atualizado');
    } else {
      data.createdAt = serverTimestamp();
      await addDoc(collection(db, COL.clientes), data);
      showToast('Cliente cadastrado');
    }
    await _loadClientes();
    _renderClientes();
    return true;
  });
  setTimeout(() => document.getElementById('mf-nome')?.focus(), 100);
}

async function _delCliente(id) {
  const c = S.clientes.find(x => x.id === id);
  if (!c) return;
  const nP = S.propostas.filter(p => p.clienteId === id).length;
  const nO = S.obras.filter(o => o.clienteId === id).length;
  let msg = `Excluir cliente "${c.nome}"?`;
  if (nP || nO) msg += `\n\nAtenção: este cliente possui ${nP} proposta(s) e ${nO} obra(s) vinculadas.`;
  if (!confirm2(msg)) return;
  await deleteDoc(doc(db, COL.clientes, id));
  showToast('Cliente excluído');
  await _loadClientes();
  _renderClientes();
}

function _historicoCliente(id) {
  const c        = S.clientes.find(x => x.id === id);
  const propostas = S.propostas.filter(p => p.clienteId === id);
  const obras     = S.obras.filter(o => o.clienteId === id);

  const rows = [
    ...propostas.map(p => ({
      tipo: '📄 Proposta',
      desc: p.titulo || p.arquivoNome || '—',
      data: fmtDate(p.createdAt),
      status: p.status || '—',
    })),
    ...obras.map(o => ({
      tipo: '🏗️ Obra',
      desc: o.titulo || '—',
      data: fmtDate(o.createdAt),
      status: o.status || '—',
    })),
  ];
  rows.sort((a, b) => (a.data > b.data ? -1 : 1));

  _createModal(`📜 Histórico — ${c?.nome || ''}`, `
    <div style="min-width:480px;">
      ${rows.length === 0
        ? '<p class="muted" style="padding:16px;">Nenhum registro encontrado.</p>'
        : `<table class="docs-table">
            <thead><tr><th>Tipo</th><th>Descrição</th><th>Data</th><th>Status</th></tr></thead>
            <tbody>
              ${rows.map(r => `
                <tr>
                  <td>${r.tipo}</td>
                  <td>${esc(r.desc)}</td>
                  <td>${r.data}</td>
                  <td>${r.status}</td>
                </tr>`).join('')}
            </tbody>
           </table>`
      }
    </div>
  `, null);
}

// ── PROPOSTAS ─────────────────────────────────────────────────────────────────
function _renderPropostas(filtro = '') {
  const panel = document.getElementById('docs-panel-propostas');
  if (!panel) return;

  const lista = filtro
    ? S.propostas.filter(p =>
        (p.titulo || '').toLowerCase().includes(filtro.toLowerCase()) ||
        (p.arquivoNome || '').toLowerCase().includes(filtro.toLowerCase()) ||
        _nomeCliente(p.clienteId).toLowerCase().includes(filtro.toLowerCase())
      )
    : S.propostas;

  // Arquivos locais não vinculados (do scan)
  const vinculados = new Set(S.propostas.map(p => p.arquivo).filter(Boolean));
  const locais = (S.baseFiles?.propostas || []).filter(f => !vinculados.has(f.path));

  panel.innerHTML = `
    <div class="docs-toolbar">
      <input id="docs-search-propostas" class="docs-search" type="text"
             placeholder="Pesquisar proposta..." value="${esc(filtro)}">
      <button id="docs-nova-proposta" class="btn-backup">+ Nova Proposta</button>
    </div>
    <div class="docs-count">${lista.length} proposta${lista.length !== 1 ? 's' : ''} cadastrada${lista.length !== 1 ? 's' : ''}</div>

    ${lista.length === 0 ? `
      <div class="docs-empty"><span>📄</span>
        <p>${filtro ? 'Nenhuma proposta encontrada.' : 'Nenhuma proposta cadastrada.'}</p>
      </div>` : `
      <table class="docs-table">
        <thead>
          <tr>
            <th>Arquivo</th><th>Título</th><th>Cliente</th>
            <th>Valor</th><th>Status</th><th>Data</th><th>Ações</th>
          </tr>
        </thead>
        <tbody>
          ${lista.map(p => `
            <tr>
              <td title="${esc(p.arquivo)}">
                ${extIcon(p.ext)} ${esc(p.arquivoNome || '—')}
              </td>
              <td>${esc(p.titulo || '—')}</td>
              <td>${esc(_nomeCliente(p.clienteId))}</td>
              <td>${p.valor ? 'R$ ' + esc(String(p.valor)) : '—'}</td>
              <td>${statusBadge(p.status)}</td>
              <td>${fmtDate(p.createdAt)}</td>
              <td class="docs-actions-cell">
                ${p.arquivo ? `<button class="btn-doc-sm" data-open="${esc(p.arquivo)}" title="Abrir arquivo">📂</button>` : ''}
                <button class="btn-doc-sm" data-edit-proposta="${esc(p.id)}">✏️</button>
                <button class="btn-doc-sm btn-doc-sm--danger" data-del-proposta="${esc(p.id)}">🗑️</button>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `}

    ${locais.length > 0 ? `
      <div class="docs-section-sep">
        <span>📂 ${locais.length} arquivo${locais.length !== 1 ? 's' : ''} local${locais.length !== 1 ? 'is' : ''} não vinculado${locais.length !== 1 ? 's' : ''}</span>
      </div>
      <table class="docs-table docs-table--muted">
        <thead><tr><th>Nome</th><th>Tamanho</th><th>Data</th><th>Ação</th></tr></thead>
        <tbody>
          ${locais.map(f => `
            <tr>
              <td>${extIcon(f.ext)} ${esc(f.name)}</td>
              <td>${fmtSize(f.size)}</td>
              <td>${fmtDate(f.mtime)}</td>
              <td>
                <button class="btn-doc-sm" data-open="${esc(f.path)}" title="Abrir">📂</button>
                <button class="btn-doc-sm" data-import-proposta="${esc(f.path)}" data-import-nome="${esc(f.name)}" title="Importar">⬆️ Vincular</button>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    ` : ''}
  `;

  // Eventos
  panel.querySelector('#docs-search-propostas').addEventListener('input', e => {
    _renderPropostas(e.target.value);
  });
  panel.querySelector('#docs-nova-proposta').addEventListener('click', () => {
    _modalProposta(null);
  });
  panel.querySelectorAll('[data-open]').forEach(btn => {
    btn.addEventListener('click', () => _openFile(btn.dataset.open));
  });
  panel.querySelectorAll('[data-edit-proposta]').forEach(btn => {
    const id = btn.dataset.editProposta;
    btn.addEventListener('click', () => _modalProposta(S.propostas.find(p => p.id === id)));
  });
  panel.querySelectorAll('[data-del-proposta]').forEach(btn => {
    btn.addEventListener('click', () => _delProposta(btn.dataset.delProposta));
  });
  panel.querySelectorAll('[data-import-proposta]').forEach(btn => {
    btn.addEventListener('click', () => _importarProposta(btn.dataset.importProposta, btn.dataset.importNome));
  });
}

function _modalProposta(proposta) {
  const isEdit = !!proposta;
  _createModal(isEdit ? 'Editar Proposta' : 'Nova Proposta', `
    <div class="docs-form">
      <div class="docs-form-group">
        <label>Título</label>
        <input id="mf-titulo" class="docs-input" type="text" value="${esc(proposta?.titulo || '')}" placeholder="Ex: Proposta Solar 5kWp">
      </div>
      <div class="docs-form-group">
        <label>Cliente</label>
        <select id="mf-cliente" class="docs-input">
          <option value="">— Selecionar cliente —</option>
          ${S.clientes.map(c => `
            <option value="${esc(c.id)}" ${proposta?.clienteId === c.id ? 'selected' : ''}>${esc(c.nome)}</option>
          `).join('')}
        </select>
      </div>
      <div class="docs-form-group">
        <label>Valor (R$)</label>
        <input id="mf-valor" class="docs-input" type="text" value="${esc(proposta?.valor || '')}" placeholder="Ex: 15000">
      </div>
      <div class="docs-form-group">
        <label>Status</label>
        <select id="mf-status" class="docs-input">
          ${['Pendente','Em Andamento','Aprovada','Recusada','Expirada'].map(s =>
            `<option ${(proposta?.status || 'Pendente') === s ? 'selected' : ''}>${s}</option>`
          ).join('')}
        </select>
      </div>
      <div class="docs-form-group">
        <label>Arquivo (opcional)</label>
        <div style="display:flex;gap:8px;align-items:center;">
          <input id="mf-arquivo" class="docs-input" type="text" readonly
                 value="${esc(proposta?.arquivoNome || '')}" placeholder="Nenhum arquivo selecionado" style="flex:1;">
          <button id="mf-sel-arquivo" class="btn-backup" style="white-space:nowrap;">📂 Selecionar</button>
        </div>
        <input type="hidden" id="mf-arquivo-path" value="${esc(proposta?.arquivo || '')}">
      </div>
      <div class="docs-form-group">
        <label>Observações</label>
        <textarea id="mf-obs" class="docs-textarea" rows="2">${esc(proposta?.obs || '')}</textarea>
      </div>
    </div>
  `, async () => {
    const data = {
      titulo:      document.getElementById('mf-titulo').value.trim(),
      clienteId:   document.getElementById('mf-cliente').value,
      valor:       document.getElementById('mf-valor').value.trim(),
      status:      document.getElementById('mf-status').value,
      arquivo:     document.getElementById('mf-arquivo-path').value,
      arquivoNome: document.getElementById('mf-arquivo').value,
      obs:         document.getElementById('mf-obs').value.trim(),
      updatedAt:   serverTimestamp(),
    };
    const ext = data.arquivo ? data.arquivo.split('.').pop() : '';
    data.ext = ext ? '.' + ext.toLowerCase() : '';

    if (isEdit) {
      await updateDoc(doc(db, COL.propostas, proposta.id), data);
      showToast('Proposta atualizada');
    } else {
      data.createdAt = serverTimestamp();
      await addDoc(collection(db, COL.propostas), data);
      showToast('Proposta cadastrada');
    }
    await _loadPropostas();
    _renderPropostas();
    return true;
  });

  // Selecionar arquivo
  document.getElementById('mf-sel-arquivo')?.addEventListener('click', async () => {
    const r = await window.MFControl?.docs?.selectFile({
      title: 'Selecionar Proposta',
      filters: [{ name: 'PDF', extensions: ['pdf'] }, { name: 'Todos', extensions: ['*'] }],
    });
    if (r?.ok) {
      document.getElementById('mf-arquivo').value      = r.name;
      document.getElementById('mf-arquivo-path').value = r.path;
    }
  });
}

async function _importarProposta(filePath, fileName) {
  const data = {
    titulo:      fileName.replace(/\.pdf$/i, ''),
    arquivo:     filePath,
    arquivoNome: fileName,
    ext:         '.pdf',
    clienteId:   '',
    valor:       '',
    status:      'Pendente',
    obs:         'Importado da pasta local',
    createdAt:   serverTimestamp(),
    updatedAt:   serverTimestamp(),
  };
  await addDoc(collection(db, COL.propostas), data);
  showToast('Proposta importada. Edite para vincular ao cliente.');
  await _loadPropostas();
  _renderPropostas();
}

async function _delProposta(id) {
  if (!confirm2('Excluir esta proposta?')) return;
  await deleteDoc(doc(db, COL.propostas, id));
  showToast('Proposta excluída');
  await _loadPropostas();
  _renderPropostas();
}

// ── OBRAS ─────────────────────────────────────────────────────────────────────
function _renderObras(filtro = '') {
  const panel = document.getElementById('docs-panel-obras');
  if (!panel) return;

  const lista = filtro
    ? S.obras.filter(o =>
        (o.titulo || '').toLowerCase().includes(filtro.toLowerCase()) ||
        (o.endereco || '').toLowerCase().includes(filtro.toLowerCase()) ||
        _nomeCliente(o.clienteId).toLowerCase().includes(filtro.toLowerCase())
      )
    : S.obras;

  panel.innerHTML = `
    <div class="docs-toolbar">
      <input id="docs-search-obras" class="docs-search" type="text"
             placeholder="Pesquisar obra..." value="${esc(filtro)}">
      <button id="docs-nova-obra" class="btn-backup">+ Nova Obra</button>
    </div>
    <div class="docs-count">${lista.length} obra${lista.length !== 1 ? 's' : ''}</div>

    ${lista.length === 0 ? `
      <div class="docs-empty"><span>🏗️</span>
        <p>${filtro ? 'Nenhuma obra encontrada.' : 'Nenhuma obra cadastrada.'}</p>
      </div>` : `
      <div class="docs-card-grid docs-card-grid--obras">
        ${lista.map(o => _obraCard(o)).join('')}
      </div>
    `}
  `;

  panel.querySelector('#docs-search-obras').addEventListener('input', e => {
    _renderObras(e.target.value);
  });
  panel.querySelector('#docs-nova-obra').addEventListener('click', () => {
    _modalObra(null);
  });
  panel.querySelectorAll('[data-edit-obra]').forEach(btn => {
    btn.addEventListener('click', () => _modalObra(S.obras.find(o => o.id === btn.dataset.editObra)));
  });
  panel.querySelectorAll('[data-del-obra]').forEach(btn => {
    btn.addEventListener('click', () => _delObra(btn.dataset.delObra));
  });
}

function _obraCard(o) {
  const nLaudos   = S.laudos.filter(l => l.obraId === o.id).length;
  const nOrcs     = S.orcamentos.filter(r => r.obraId === o.id).length;
  const nMidias   = S.midias.filter(m => m.obraId === o.id).length;
  const proposta  = S.propostas.find(p => p.id === o.propostaId);

  return `
    <div class="docs-card">
      <div class="docs-card-header">
        <div class="docs-avatar docs-avatar--obra">🏗️</div>
        <div class="docs-card-info">
          <div class="docs-card-title">${esc(o.titulo || 'Obra sem título')}</div>
          <div class="docs-card-sub">👤 ${esc(_nomeCliente(o.clienteId))}</div>
        </div>
        <div>${statusBadge(o.status)}</div>
      </div>
      <div class="docs-card-body">
        ${o.endereco ? `<div class="docs-field"><span>📍</span> ${esc(o.endereco)}</div>` : ''}
        ${o.dataInicio ? `<div class="docs-field"><span>📅</span> Início: ${esc(o.dataInicio)}</div>` : ''}
        ${proposta ? `<div class="docs-field"><span>📄</span> Proposta: ${esc(proposta.titulo || proposta.arquivoNome || '—')}</div>` : ''}
        ${o.obs ? `<div class="docs-field muted">${esc(o.obs)}</div>` : ''}
      </div>
      <div class="docs-card-links">
        <span class="doc-chip">📋 ${nLaudos} laudo${nLaudos !== 1 ? 's' : ''}</span>
        <span class="doc-chip">💰 ${nOrcs} orç.</span>
        <span class="doc-chip">🖼️ ${nMidias} mídia${nMidias !== 1 ? 's' : ''}</span>
      </div>
      <div class="docs-card-actions">
        <button class="btn-doc-sm" data-edit-obra="${esc(o.id)}">✏️ Editar</button>
        <button class="btn-doc-sm btn-doc-sm--danger" data-del-obra="${esc(o.id)}">🗑️</button>
      </div>
    </div>
  `;
}

function _modalObra(obra) {
  const isEdit = !!obra;
  _createModal(isEdit ? 'Editar Obra' : 'Nova Obra', `
    <div class="docs-form">
      <div class="docs-form-group">
        <label>Título *</label>
        <input id="mf-titulo" class="docs-input" type="text" value="${esc(obra?.titulo || '')}" placeholder="Ex: Instalação Solar — Bairro">
      </div>
      <div class="docs-form-group">
        <label>Cliente</label>
        <select id="mf-cliente" class="docs-input">
          <option value="">— Selecionar cliente —</option>
          ${S.clientes.map(c => `
            <option value="${esc(c.id)}" ${obra?.clienteId === c.id ? 'selected' : ''}>${esc(c.nome)}</option>
          `).join('')}
        </select>
      </div>
      <div class="docs-form-group">
        <label>Proposta vinculada</label>
        <select id="mf-proposta" class="docs-input">
          <option value="">— Nenhuma —</option>
          ${S.propostas.map(p => `
            <option value="${esc(p.id)}" ${obra?.propostaId === p.id ? 'selected' : ''}>
              ${esc(p.titulo || p.arquivoNome || p.id)} — ${esc(_nomeCliente(p.clienteId))}
            </option>
          `).join('')}
        </select>
      </div>
      <div class="docs-form-group">
        <label>Endereço</label>
        <input id="mf-endereco" class="docs-input" type="text" value="${esc(obra?.endereco || '')}" placeholder="Endereço da obra">
      </div>
      <div class="docs-form-group">
        <label>Data de Início</label>
        <input id="mf-data-inicio" class="docs-input" type="date" value="${esc(obra?.dataInicio || '')}">
      </div>
      <div class="docs-form-group">
        <label>Status</label>
        <select id="mf-status" class="docs-input">
          ${['Pendente','Em Andamento','Concluída','Cancelada'].map(s =>
            `<option ${(obra?.status || 'Pendente') === s ? 'selected' : ''}>${s}</option>`
          ).join('')}
        </select>
      </div>
      <div class="docs-form-group">
        <label>Observações</label>
        <textarea id="mf-obs" class="docs-textarea" rows="2">${esc(obra?.obs || '')}</textarea>
      </div>
    </div>
  `, async () => {
    const titulo = document.getElementById('mf-titulo').value.trim();
    if (!titulo) { showToast('Título é obrigatório', 'err'); return false; }
    const data = {
      titulo,
      clienteId:  document.getElementById('mf-cliente').value,
      propostaId: document.getElementById('mf-proposta').value,
      endereco:   document.getElementById('mf-endereco').value.trim(),
      dataInicio: document.getElementById('mf-data-inicio').value,
      status:     document.getElementById('mf-status').value,
      obs:        document.getElementById('mf-obs').value.trim(),
      updatedAt:  serverTimestamp(),
    };
    if (isEdit) {
      await updateDoc(doc(db, COL.obras, obra.id), data);
      showToast('Obra atualizada');
    } else {
      data.createdAt = serverTimestamp();
      await addDoc(collection(db, COL.obras), data);
      showToast('Obra criada');
    }
    await _loadObras();
    _renderObras();
    return true;
  });
  setTimeout(() => document.getElementById('mf-titulo')?.focus(), 100);
}

async function _delObra(id) {
  const o = S.obras.find(x => x.id === id);
  if (!confirm2(`Excluir obra "${o?.titulo}"?`)) return;
  await deleteDoc(doc(db, COL.obras, id));
  showToast('Obra excluída');
  await _loadObras();
  _renderObras();
}

// ── LAUDOS ────────────────────────────────────────────────────────────────────
function _renderLaudos(filtro = '') {
  const panel = document.getElementById('docs-panel-laudos');
  if (!panel) return;

  const lista = filtro
    ? S.laudos.filter(l =>
        (l.arquivoNome || '').toLowerCase().includes(filtro.toLowerCase()) ||
        (l.categoria || '').toLowerCase().includes(filtro.toLowerCase()) ||
        _nomeCliente(l.clienteId).toLowerCase().includes(filtro.toLowerCase())
      )
    : S.laudos;

  // Arquivos locais
  const vinculados = new Set(S.laudos.map(l => l.arquivo).filter(Boolean));
  const locais = (S.baseFiles?.laudos || []).filter(f => !vinculados.has(f.path));

  panel.innerHTML = `
    <div class="docs-toolbar">
      <input id="docs-search-laudos" class="docs-search" type="text"
             placeholder="Pesquisar laudo..." value="${esc(filtro)}">
      <button id="docs-novo-laudo" class="btn-backup">+ Novo Laudo</button>
    </div>
    <div class="docs-count">${lista.length} laudo${lista.length !== 1 ? 's' : ''}</div>
    ${_tableArquivos(lista, 'laudo', 'Categoria')}
    ${locais.length > 0 ? `
      <div class="docs-section-sep"><span>📂 ${locais.length} arquivo(s) local(is) não vinculado(s)</span></div>
      ${_tableLocais(locais, 'laudo')}` : ''}
  `;

  panel.querySelector('#docs-search-laudos').addEventListener('input', e => _renderLaudos(e.target.value));
  panel.querySelector('#docs-novo-laudo').addEventListener('click', () => _modalDocSimples('laudos', null));
  _bindTableActions(panel, 'laudo', S.laudos, _modalDocSimples.bind(null, 'laudos'), _delDocSimples.bind(null, 'laudos'), _loadLaudos, _renderLaudos);
}

// ── ORÇAMENTOS ────────────────────────────────────────────────────────────────
function _renderOrcamentos(filtro = '') {
  const panel = document.getElementById('docs-panel-orcamentos');
  if (!panel) return;

  const lista = filtro
    ? S.orcamentos.filter(r =>
        (r.arquivoNome || '').toLowerCase().includes(filtro.toLowerCase()) ||
        (r.categoria || '').toLowerCase().includes(filtro.toLowerCase()) ||
        _nomeCliente(r.clienteId).toLowerCase().includes(filtro.toLowerCase())
      )
    : S.orcamentos;

  const vinculados = new Set(S.orcamentos.map(r => r.arquivo).filter(Boolean));
  const locais = (S.baseFiles?.orcamentos || []).filter(f => !vinculados.has(f.path));

  panel.innerHTML = `
    <div class="docs-toolbar">
      <input id="docs-search-orcamentos" class="docs-search" type="text"
             placeholder="Pesquisar orçamento..." value="${esc(filtro)}">
      <button id="docs-novo-orcamento" class="btn-backup">+ Novo Orçamento</button>
    </div>
    <div class="docs-count">${lista.length} orçamento${lista.length !== 1 ? 's' : ''}</div>
    ${_tableArquivos(lista, 'orcamento', 'Categoria')}
    ${locais.length > 0 ? `
      <div class="docs-section-sep"><span>📂 ${locais.length} arquivo(s) local(is) não vinculado(s)</span></div>
      ${_tableLocais(locais, 'orcamento')}` : ''}
  `;

  panel.querySelector('#docs-search-orcamentos').addEventListener('input', e => _renderOrcamentos(e.target.value));
  panel.querySelector('#docs-novo-orcamento').addEventListener('click', () => _modalDocSimples('orcamentos', null));
  _bindTableActions(panel, 'orcamento', S.orcamentos, _modalDocSimples.bind(null, 'orcamentos'), _delDocSimples.bind(null, 'orcamentos'), _loadOrcamentos, _renderOrcamentos);
}

// ── MÍDIAS ────────────────────────────────────────────────────────────────────
function _renderMidias(filtro = '', tipoFilt = '') {
  const panel = document.getElementById('docs-panel-midias');
  if (!panel) return;

  const locais  = S.baseFiles?.midias || [];
  const vinculados = new Set(S.midias.map(m => m.arquivo).filter(Boolean));
  const locaisNaoVinculados = locais.filter(f => !vinculados.has(f.path));

  const fotos   = locaisNaoVinculados.filter(f => ['.jpg','.jpeg','.png','.gif','.webp','.bmp'].includes(f.ext));
  const videos  = locaisNaoVinculados.filter(f => ['.mp4','.mov','.avi','.mkv'].includes(f.ext));

  let lista = S.midias;
  if (filtro) lista = lista.filter(m =>
    (m.legenda || '').toLowerCase().includes(filtro.toLowerCase()) ||
    (m.arquivoNome || '').toLowerCase().includes(filtro.toLowerCase())
  );
  if (tipoFilt) lista = lista.filter(m => m.tipo === tipoFilt);

  panel.innerHTML = `
    <div class="docs-toolbar">
      <input id="docs-search-midias" class="docs-search" type="text"
             placeholder="Pesquisar mídia..." value="${esc(filtro)}">
      <select id="docs-filter-tipo" class="docs-input" style="width:auto;">
        <option value="" ${!tipoFilt ? 'selected' : ''}>Todos os tipos</option>
        <option value="foto"  ${tipoFilt==='foto'  ? 'selected' : ''}>🖼️ Fotos</option>
        <option value="video" ${tipoFilt==='video' ? 'selected' : ''}>🎬 Vídeos</option>
        <option value="outro" ${tipoFilt==='outro' ? 'selected' : ''}>📎 Outros</option>
      </select>
      <button id="docs-nova-midia" class="btn-backup">+ Adicionar Mídia</button>
    </div>

    <div class="docs-midia-stats">
      <span class="doc-chip">🖼️ ${fotos.length} fotos locais</span>
      <span class="doc-chip">🎬 ${videos.length} vídeos locais</span>
      <span class="doc-chip">🔗 ${S.midias.length} vinculada${S.midias.length !== 1 ? 's' : ''}</span>
    </div>

    ${lista.length === 0 ? `
      <div class="docs-empty"><span>🖼️</span>
        <p>Nenhuma mídia vinculada. ${S.baseFiles ? '' : 'Clique em "Escanear Pasta" para detectar arquivos locais.'}</p>
      </div>` : `
      <table class="docs-table">
        <thead><tr><th>Arquivo</th><th>Tipo</th><th>Obra</th><th>Legenda</th><th>Data</th><th>Ações</th></tr></thead>
        <tbody>
          ${lista.map(m => `
            <tr>
              <td>${extIcon(m.ext)} ${esc(m.arquivoNome || '—')}</td>
              <td>${m.tipo === 'foto' ? '🖼️ Foto' : m.tipo === 'video' ? '🎬 Vídeo' : '📎 Outro'}</td>
              <td>${esc(_tituloObra(m.obraId))}</td>
              <td>${esc(m.legenda || '—')}</td>
              <td>${fmtDate(m.createdAt)}</td>
              <td class="docs-actions-cell">
                ${m.arquivo ? `<button class="btn-doc-sm" data-open="${esc(m.arquivo)}">📂</button>` : ''}
                <button class="btn-doc-sm" data-edit-midia="${esc(m.id)}">✏️</button>
                <button class="btn-doc-sm btn-doc-sm--danger" data-del-midia="${esc(m.id)}">🗑️</button>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `}

    ${locaisNaoVinculados.length > 0 ? `
      <div class="docs-section-sep">
        <span>📂 ${locaisNaoVinculados.length} arquivo(s) local(is) — clique em ⬆️ para vincular</span>
      </div>
      <table class="docs-table docs-table--muted">
        <thead><tr><th>Nome</th><th>Tipo</th><th>Tamanho</th><th>Ação</th></tr></thead>
        <tbody>
          ${locaisNaoVinculados.slice(0, 50).map(f => `
            <tr>
              <td>${extIcon(f.ext)} ${esc(f.name)}</td>
              <td>${['.mp4','.mov','.avi'].includes(f.ext) ? '🎬' : '🖼️'}</td>
              <td>${fmtSize(f.size)}</td>
              <td>
                <button class="btn-doc-sm" data-open="${esc(f.path)}">📂</button>
                <button class="btn-doc-sm" data-import-midia="${esc(f.path)}" data-import-nome="${esc(f.name)}" data-import-ext="${esc(f.ext)}">⬆️</button>
              </td>
            </tr>
          `).join('')}
          ${locaisNaoVinculados.length > 50 ? `
            <tr><td colspan="4" class="muted" style="text-align:center;">... e mais ${locaisNaoVinculados.length - 50} arquivo(s)</td></tr>
          ` : ''}
        </tbody>
      </table>
    ` : ''}
  `;

  panel.querySelector('#docs-search-midias').addEventListener('input', e => _renderMidias(e.target.value, tipoFilt));
  panel.querySelector('#docs-filter-tipo').addEventListener('change', e => _renderMidias(filtro, e.target.value));
  panel.querySelector('#docs-nova-midia').addEventListener('click', () => _modalMidia(null));
  panel.querySelectorAll('[data-open]').forEach(btn => btn.addEventListener('click', () => _openFile(btn.dataset.open)));
  panel.querySelectorAll('[data-edit-midia]').forEach(btn => {
    btn.addEventListener('click', () => _modalMidia(S.midias.find(m => m.id === btn.dataset.editMidia)));
  });
  panel.querySelectorAll('[data-del-midia]').forEach(btn => {
    btn.addEventListener('click', () => _delMidia(btn.dataset.delMidia));
  });
  panel.querySelectorAll('[data-import-midia]').forEach(btn => {
    btn.addEventListener('click', () => _importarMidia(btn.dataset.importMidia, btn.dataset.importNome, btn.dataset.importExt));
  });
}

async function _importarMidia(filePath, fileName, ext) {
  const isVideo = ['.mp4','.mov','.avi','.mkv'].includes(ext);
  const data = {
    arquivo: filePath,
    arquivoNome: fileName,
    ext,
    tipo: isVideo ? 'video' : 'foto',
    legenda: '',
    obraId: '',
    clienteId: '',
    obs: 'Importado da pasta local',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  await addDoc(collection(db, COL.midias), data);
  showToast('Mídia vinculada. Edite para associar a uma obra.');
  await _loadMidias();
  _renderMidias();
}

function _modalMidia(midia) {
  const isEdit = !!midia;
  _createModal(isEdit ? 'Editar Mídia' : 'Nova Mídia', `
    <div class="docs-form">
      <div class="docs-form-group">
        <label>Arquivo</label>
        <div style="display:flex;gap:8px;align-items:center;">
          <input id="mf-arquivo" class="docs-input" type="text" readonly
                 value="${esc(midia?.arquivoNome || '')}" placeholder="Nenhum arquivo selecionado" style="flex:1;">
          <button id="mf-sel-arquivo" class="btn-backup" style="white-space:nowrap;">📂 Selecionar</button>
        </div>
        <input type="hidden" id="mf-arquivo-path" value="${esc(midia?.arquivo || '')}">
      </div>
      <div class="docs-form-group">
        <label>Tipo</label>
        <select id="mf-tipo" class="docs-input">
          <option value="foto"  ${(midia?.tipo || 'foto') === 'foto'  ? 'selected' : ''}>🖼️ Foto</option>
          <option value="video" ${(midia?.tipo) === 'video' ? 'selected' : ''}>🎬 Vídeo</option>
          <option value="outro" ${(midia?.tipo) === 'outro' ? 'selected' : ''}>📎 Outro</option>
        </select>
      </div>
      <div class="docs-form-group">
        <label>Obra vinculada</label>
        <select id="mf-obra" class="docs-input">
          <option value="">— Nenhuma —</option>
          ${S.obras.map(o => `<option value="${esc(o.id)}" ${midia?.obraId === o.id ? 'selected' : ''}>${esc(o.titulo)} — ${esc(_nomeCliente(o.clienteId))}</option>`).join('')}
        </select>
      </div>
      <div class="docs-form-group">
        <label>Legenda</label>
        <input id="mf-legenda" class="docs-input" type="text" value="${esc(midia?.legenda || '')}" placeholder="Descrição da mídia">
      </div>
    </div>
  `, async () => {
    const arquivo = document.getElementById('mf-arquivo-path').value;
    const data = {
      arquivo,
      arquivoNome: document.getElementById('mf-arquivo').value,
      ext:    arquivo ? '.' + arquivo.split('.').pop().toLowerCase() : '',
      tipo:   document.getElementById('mf-tipo').value,
      obraId: document.getElementById('mf-obra').value,
      legenda:document.getElementById('mf-legenda').value.trim(),
      updatedAt: serverTimestamp(),
    };
    const obra = S.obras.find(o => o.id === data.obraId);
    data.clienteId = obra?.clienteId || '';
    if (isEdit) {
      await updateDoc(doc(db, COL.midias, midia.id), data);
      showToast('Mídia atualizada');
    } else {
      data.createdAt = serverTimestamp();
      await addDoc(collection(db, COL.midias), data);
      showToast('Mídia adicionada');
    }
    await _loadMidias();
    _renderMidias();
    return true;
  });
  document.getElementById('mf-sel-arquivo')?.addEventListener('click', async () => {
    const r = await window.MFControl?.docs?.selectFile({
      title: 'Selecionar Mídia',
      filters: [
        { name: 'Imagens', extensions: ['jpg','jpeg','png','gif','webp'] },
        { name: 'Vídeos',  extensions: ['mp4','mov','avi','mkv'] },
        { name: 'Todos',   extensions: ['*'] },
      ],
    });
    if (r?.ok) {
      document.getElementById('mf-arquivo').value      = r.name;
      document.getElementById('mf-arquivo-path').value = r.path;
    }
  });
}

async function _delMidia(id) {
  if (!confirm2('Remover esta mídia do Document Manager?')) return;
  await deleteDoc(doc(db, COL.midias, id));
  showToast('Mídia removida');
  await _loadMidias();
  _renderMidias();
}

// ── Helpers compartilhados — Laudos + Orçamentos ──────────────────────────────
function _tableArquivos(lista, tipo, col3Label) {
  if (lista.length === 0) return `
    <div class="docs-empty"><span>📋</span><p>Nenhum ${tipo} cadastrado.</p></div>`;
  return `
    <table class="docs-table">
      <thead>
        <tr><th>Arquivo</th><th>${col3Label}</th><th>Obra</th><th>Cliente</th><th>Data</th><th>Ações</th></tr>
      </thead>
      <tbody>
        ${lista.map(r => `
          <tr>
            <td title="${esc(r.arquivo)}">${extIcon(r.ext)} ${esc(r.arquivoNome || '—')}</td>
            <td>${esc(r.categoria || '—')}</td>
            <td>${esc(_tituloObra(r.obraId))}</td>
            <td>${esc(_nomeCliente(r.clienteId))}</td>
            <td>${fmtDate(r.createdAt)}</td>
            <td class="docs-actions-cell">
              ${r.arquivo ? `<button class="btn-doc-sm" data-open="${esc(r.arquivo)}">📂</button>` : ''}
              <button class="btn-doc-sm" data-edit-${tipo}="${esc(r.id)}">✏️</button>
              <button class="btn-doc-sm btn-doc-sm--danger" data-del-${tipo}="${esc(r.id)}">🗑️</button>
            </td>
          </tr>`).join('')}
      </tbody>
    </table>`;
}

function _tableLocais(locais, tipo) {
  return `
    <table class="docs-table docs-table--muted">
      <thead><tr><th>Nome</th><th>Tamanho</th><th>Data</th><th>Ação</th></tr></thead>
      <tbody>
        ${locais.map(f => `
          <tr>
            <td>${extIcon(f.ext)} ${esc(f.name)}</td>
            <td>${fmtSize(f.size)}</td>
            <td>${fmtDate(f.mtime)}</td>
            <td>
              <button class="btn-doc-sm" data-open="${esc(f.path)}">📂</button>
              <button class="btn-doc-sm" data-import-${tipo}="${esc(f.path)}" data-import-nome="${esc(f.name)}" data-import-ext="${esc(f.ext)}">⬆️ Vincular</button>
            </td>
          </tr>`).join('')}
      </tbody>
    </table>`;
}

function _bindTableActions(panel, tipo, lista, editFn, delFn, loadFn, renderFn) {
  panel.querySelectorAll('[data-open]').forEach(btn => btn.addEventListener('click', () => _openFile(btn.dataset.open)));
  panel.querySelectorAll(`[data-edit-${tipo}]`).forEach(btn => {
    btn.addEventListener('click', () => editFn(lista.find(r => r.id === btn.dataset[`edit${tipo.charAt(0).toUpperCase()}${tipo.slice(1)}`])));
  });
  panel.querySelectorAll(`[data-del-${tipo}]`).forEach(btn => {
    btn.addEventListener('click', () => delFn(btn.dataset[`del${tipo.charAt(0).toUpperCase()}${tipo.slice(1)}`]));
  });
  panel.querySelectorAll(`[data-import-${tipo}]`).forEach(btn => {
    const colName = tipo === 'laudo' ? COL.laudos : COL.orcamentos;
    btn.addEventListener('click', async () => {
      const fp  = btn.dataset[`import${tipo.charAt(0).toUpperCase()}${tipo.slice(1)}`];
      const nm  = btn.dataset.importNome;
      const ext = btn.dataset.importExt;
      await addDoc(collection(db, colName), {
        arquivo: fp, arquivoNome: nm, ext, categoria: '', obraId: '', clienteId: '',
        obs: 'Importado da pasta local', createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
      });
      showToast(`${tipo.charAt(0).toUpperCase() + tipo.slice(1)} importado. Edite para vincular.`);
      await loadFn();
      renderFn();
    });
  });
}

function _modalDocSimples(colKey, item) {
  const colId  = COL[colKey];
  const isEdit = !!item;
  const label  = colKey === 'laudos' ? 'Laudo' : 'Orçamento';
  const renderFn = colKey === 'laudos' ? _renderLaudos : _renderOrcamentos;
  const loadFn   = colKey === 'laudos' ? _loadLaudos   : _loadOrcamentos;

  _createModal(isEdit ? `Editar ${label}` : `Novo ${label}`, `
    <div class="docs-form">
      <div class="docs-form-group">
        <label>Arquivo</label>
        <div style="display:flex;gap:8px;align-items:center;">
          <input id="mf-arquivo" class="docs-input" type="text" readonly
                 value="${esc(item?.arquivoNome || '')}" placeholder="Nenhum arquivo selecionado" style="flex:1;">
          <button id="mf-sel-arquivo" class="btn-backup" style="white-space:nowrap;">📂 Selecionar</button>
        </div>
        <input type="hidden" id="mf-arquivo-path" value="${esc(item?.arquivo || '')}">
      </div>
      <div class="docs-form-group">
        <label>Categoria</label>
        <input id="mf-cat" class="docs-input" type="text" value="${esc(item?.categoria || '')}"
               placeholder="${colKey === 'laudos' ? 'Ex: Laudo Técnico Elétrico' : 'Ex: Orçamento Painel Solar'}">
      </div>
      <div class="docs-form-group">
        <label>Obra vinculada</label>
        <select id="mf-obra" class="docs-input">
          <option value="">— Nenhuma —</option>
          ${S.obras.map(o => `
            <option value="${esc(o.id)}" ${item?.obraId === o.id ? 'selected' : ''}>
              ${esc(o.titulo)} — ${esc(_nomeCliente(o.clienteId))}
            </option>`).join('')}
        </select>
      </div>
      <div class="docs-form-group">
        <label>Observações</label>
        <textarea id="mf-obs" class="docs-textarea" rows="2">${esc(item?.obs || '')}</textarea>
      </div>
    </div>
  `, async () => {
    const arquivo = document.getElementById('mf-arquivo-path').value;
    const obraId  = document.getElementById('mf-obra').value;
    const obra    = S.obras.find(o => o.id === obraId);
    const data = {
      arquivo,
      arquivoNome: document.getElementById('mf-arquivo').value,
      ext:      arquivo ? '.' + arquivo.split('.').pop().toLowerCase() : '',
      categoria:document.getElementById('mf-cat').value.trim(),
      obraId,
      clienteId: obra?.clienteId || '',
      obs:       document.getElementById('mf-obs').value.trim(),
      updatedAt: serverTimestamp(),
    };
    if (isEdit) {
      await updateDoc(doc(db, colId, item.id), data);
      showToast(`${label} atualizado`);
    } else {
      data.createdAt = serverTimestamp();
      await addDoc(collection(db, colId), data);
      showToast(`${label} adicionado`);
    }
    await loadFn();
    renderFn();
    return true;
  });

  document.getElementById('mf-sel-arquivo')?.addEventListener('click', async () => {
    const r = await window.MFControl?.docs?.selectFile({ title: `Selecionar ${label}` });
    if (r?.ok) {
      document.getElementById('mf-arquivo').value      = r.name;
      document.getElementById('mf-arquivo-path').value = r.path;
    }
  });
}

async function _delDocSimples(colKey, id) {
  const label = colKey === 'laudos' ? 'laudo' : 'orçamento';
  if (!confirm2(`Excluir este ${label}?`)) return;
  await deleteDoc(doc(db, COL[colKey], id));
  showToast(`${label.charAt(0).toUpperCase() + label.slice(1)} excluído`);
  const loadFn   = colKey === 'laudos' ? _loadLaudos   : _loadOrcamentos;
  const renderFn = colKey === 'laudos' ? _renderLaudos : _renderOrcamentos;
  await loadFn();
  renderFn();
}

// ── Utilitários ───────────────────────────────────────────────────────────────
function _nomeCliente(id) {
  if (!id) return '—';
  return S.clientes.find(c => c.id === id)?.nome || '—';
}

function _tituloObra(id) {
  if (!id) return '—';
  return S.obras.find(o => o.id === id)?.titulo || '—';
}

async function _openFile(fp) {
  if (!fp) return;
  const r = await window.MFControl?.docs?.openFile(fp);
  if (r && !r.ok) showToast('Erro ao abrir: ' + (r.error || 'desconhecido'), 'err');
}

// ── Modal genérico ────────────────────────────────────────────────────────────
function _createModal(titulo, bodyHtml, onConfirm) {
  // Remove modal anterior
  document.getElementById('docs-modal-overlay')?.remove();

  const overlay = document.createElement('div');
  overlay.id    = 'docs-modal-overlay';
  overlay.className = 'docs-modal-overlay';

  overlay.innerHTML = `
    <div class="docs-modal" role="dialog" aria-modal="true">
      <div class="docs-modal-header">
        <h3>${esc(titulo)}</h3>
        <button id="docs-modal-close" class="docs-modal-close" aria-label="Fechar">✕</button>
      </div>
      <div class="docs-modal-body">${bodyHtml}</div>
      ${onConfirm ? `
        <div class="docs-modal-footer">
          <button id="docs-modal-cancel" class="btn-backup" style="background:var(--bg-3);">Cancelar</button>
          <button id="docs-modal-ok"     class="btn-backup">💾 Salvar</button>
        </div>
      ` : `
        <div class="docs-modal-footer">
          <button id="docs-modal-cancel" class="btn-backup">Fechar</button>
        </div>
      `}
    </div>
  `;

  document.body.appendChild(overlay);

  function close() { overlay.remove(); }

  overlay.querySelector('#docs-modal-close').addEventListener('click', close);
  overlay.querySelector('#docs-modal-cancel').addEventListener('click', close);
  overlay.addEventListener('click', e => { if (e.target === overlay) close(); });

  if (onConfirm) {
    const btnOk = overlay.querySelector('#docs-modal-ok');
    btnOk.addEventListener('click', async () => {
      btnOk.disabled = true;
      btnOk.textContent = '⟳ Salvando...';
      try {
        const ok = await onConfirm();
        if (ok !== false) close();
      } catch (e) {
        console.error('[Docs] modal save error:', e);
        showToast('Erro ao salvar: ' + e.message, 'err');
      }
      btnOk.disabled = false;
      btnOk.textContent = '💾 Salvar';
    });
  }

  return overlay;
}

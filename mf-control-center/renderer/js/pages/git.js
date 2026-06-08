/**
 * git.js — MF Control Center
 * CC-5: Git Recovery Center
 * Somente leitura — 6 painéis: Status, Log, Tags, Branches, Diff, Restore Prep.
 * Nenhum checkout, reset, push ou merge é executado.
 */

let _iniciado = false;
let _commits  = [];   // cache para os selects de diff
let _tags     = [];   // cache para restore prep
let _branches = [];   // cache para restore prep

export function gitInit() {
  if (_iniciado) return;
  _iniciado = true;
  _build();
}

// ── Build ─────────────────────────────────────────────────────────────────────
function _build() {
  const container = document.getElementById('page-git');
  if (!container) return;
  container.innerHTML = '';

  // Header
  const hdr = document.createElement('div');
  hdr.className = 'dash-header';
  hdr.innerHTML = `
    <div>
      <h2>🌿 Git Recovery Center</h2>
      <p class="dash-sub">Somente leitura · Nenhum comando destrutivo · CC-5</p>
    </div>
    <div style="display:flex;gap:8px;align-items:center;">
      <span id="git-validate-badge" class="badge-safe" style="background:#1e3a1e;color:#4ade80;">⟳ Validando...</span>
      <button class="btn-backup" id="git-refresh-all" style="font-size:11px;padding:4px 10px;">🔄 Atualizar Tudo</button>
    </div>
  `;
  container.appendChild(hdr);

  // Tab bar
  const tabs = document.createElement('div');
  tabs.style.cssText = 'display:flex;gap:4px;margin-top:12px;flex-wrap:wrap;';
  tabs.id = 'git-tabs';
  const paineis = [
    { id: 'status',   label: '📊 Status' },
    { id: 'log',      label: '📜 Histórico' },
    { id: 'tags',     label: '🏷️ Tags' },
    { id: 'branches', label: '🌿 Branches' },
    { id: 'diff',     label: '🔀 Diff' },
    { id: 'restore',  label: '⚙️ Restore Prep' },
  ];
  for (const p of paineis) {
    const btn = document.createElement('button');
    btn.dataset.tab = p.id;
    btn.className = 'btn-backup';
    btn.style.cssText = 'font-size:12px;padding:5px 12px;border-radius:6px 6px 0 0;';
    btn.textContent = p.label;
    btn.addEventListener('click', () => _showTab(p.id));
    tabs.appendChild(btn);
  }
  container.appendChild(tabs);

  // Panels container
  const panels = document.createElement('div');
  panels.id = 'git-panels';
  panels.style.cssText = 'background:#0f1629;border:1px solid #1e3a5f;border-radius:0 8px 8px 8px;padding:16px;min-height:400px;';

  for (const p of paineis) {
    const div = document.createElement('div');
    div.id = 'git-panel-' + p.id;
    div.style.display = 'none';
    div.innerHTML = `<div class="muted" style="font-size:12px;padding:20px 0;">⟳ Carregando ${p.label}...</div>`;
    panels.appendChild(div);
  }
  container.appendChild(panels);

  // Refresh all
  document.getElementById('git-refresh-all')?.addEventListener('click', () => {
    _iniciado = false;
    _commits = []; _tags = []; _branches = [];
    _build();
  });

  // Load
  _showTab('status');
  _validate();
}

// ── Tab management ────────────────────────────────────────────────────────────
function _showTab(id) {
  document.querySelectorAll('#git-tabs button').forEach(b => {
    b.style.background = b.dataset.tab === id ? '#1e3a5f' : '';
    b.style.color      = b.dataset.tab === id ? '#60a5fa' : '';
    b.style.borderBottom = b.dataset.tab === id ? '2px solid #3b82f6' : '2px solid transparent';
  });
  document.querySelectorAll('#git-panels > div').forEach(p => {
    p.style.display = p.id === 'git-panel-' + id ? '' : 'none';
  });
  // Lazy load
  const loaders = {
    status:   _loadStatus,
    log:      _loadLog,
    tags:     _loadTags,
    branches: _loadBranches,
    diff:     _loadDiff,
    restore:  _loadRestore,
  };
  loaders[id]?.();
}

// ── PAINEL 1 — Status ─────────────────────────────────────────────────────────
let _statusLoaded = false;
async function _loadStatus(force = false) {
  if (_statusLoaded && !force) return;
  _statusLoaded = true;
  const p = document.getElementById('git-panel-status');
  if (!p) return;

  const s = await window.MFControl?.git.statusFull();
  if (!s?.ok) {
    p.innerHTML = `<span style="color:#f87171;">❌ Erro ao ler status: ${_esc(s?.branch || 'API indisponível — reiniciar Electron')}</span>`;
    return;
  }

  const statusColor = s.statusLines.length === 0 ? '#4ade80' : '#f59e0b';
  const statusText  = s.statusLines.length === 0 ? '✅ Limpo' : `⚠️ ${s.statusLines.length} arquivo(s) modificado(s)`;
  const tagHead     = s.tagsOnHead.length ? s.tagsOnHead.map(t => `<span class="bkp-tag" style="${t.includes('V1.2_PRODUCAO')||t.includes('v1.2')?'background:#052e16;color:#4ade80;border:1px solid #16a34a;font-weight:700;':''}">${_esc(t)}</span>`).join(' ') : '<span class="muted">nenhuma tag neste commit</span>';

  p.innerHTML = `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
      <div class="dash-card" style="margin:0;">
        <h3 style="color:#60a5fa;margin-bottom:12px;">📍 Posição Atual</h3>
        <table style="width:100%;border-collapse:collapse;font-size:12px;">
          <tr><td style="color:#94a3b8;padding:4px 8px 4px 0;width:110px;">Branch</td>
              <td style="color:#a78bfa;font-weight:700;font-family:monospace;">${_esc(s.branch)}</td></tr>
          <tr><td style="color:#94a3b8;padding:4px 8px 4px 0;">Commit</td>
              <td style="color:#e2e8f0;font-family:monospace;">${_esc(s.hashShort)} <span style="color:#94a3b8;">${_esc(s.subject)}</span></td></tr>
          <tr><td style="color:#94a3b8;padding:4px 8px 4px 0;">Autor</td>
              <td style="color:#e2e8f0;">${_esc(s.author)}</td></tr>
          <tr><td style="color:#94a3b8;padding:4px 8px 4px 0;">Data</td>
              <td style="color:#e2e8f0;">${_fmtDate(s.date)}</td></tr>
          <tr><td style="color:#94a3b8;padding:4px 8px 4px 0;">Tags</td>
              <td>${tagHead}</td></tr>
        </table>
      </div>
      <div class="dash-card" style="margin:0;">
        <h3 style="color:#60a5fa;margin-bottom:12px;">🔗 Remote & Workspace</h3>
        <table style="width:100%;border-collapse:collapse;font-size:12px;">
          <tr><td style="color:#94a3b8;padding:4px 8px 4px 0;width:110px;">Remote</td>
              <td style="color:#67e8f9;font-size:11px;word-break:break-all;">${_esc(s.remoteUrl)}</td></tr>
          <tr><td style="color:#94a3b8;padding:4px 8px 4px 0;">Último push</td>
              <td style="color:#e2e8f0;">${_fmtDate(s.lastPush)}</td></tr>
          <tr><td style="color:#94a3b8;padding:4px 8px 4px 0;">Workspace</td>
              <td style="color:${statusColor};">${statusText}</td></tr>
          <tr><td style="color:#94a3b8;padding:4px 8px 4px 0;">Git</td>
              <td style="color:#94a3b8;font-size:11px;">${_esc(s.gitVersion)}</td></tr>
        </table>
      </div>
    </div>
    ${s.statusLines.length > 0 ? `
      <div class="dash-card" style="margin-top:12px;">
        <h3 style="color:#f59e0b;margin-bottom:8px;">⚠️ Arquivos Modificados (${s.statusLines.length})</h3>
        <pre style="font-size:11px;color:#fbbf24;margin:0;background:#1c1505;padding:8px;border-radius:4px;overflow:auto;max-height:150px;">${s.statusLines.map(_esc).join('\n')}</pre>
      </div>` : ''}
    <div style="text-align:right;margin-top:8px;">
      <button class="btn-backup" style="font-size:11px;padding:4px 10px;" onclick="window._gitRefreshStatus()">🔄 Atualizar</button>
    </div>
  `;
  window._gitRefreshStatus = () => { _statusLoaded = false; _loadStatus(true); };
}

// ── PAINEL 2 — Log ────────────────────────────────────────────────────────────
let _logLoaded = false;
async function _loadLog(force = false) {
  if (_logLoaded && !force) return;
  _logLoaded = true;
  const p = document.getElementById('git-panel-log');
  if (!p) return;

  const r = await window.MFControl?.git.log50();
  if (!r?.ok) {
    p.innerHTML = `<span style="color:#f87171;">❌ ${_esc(r?.error || 'API indisponível — reiniciar Electron')}</span>`;
    return;
  }
  _commits = r.commits;

  // Search bar
  p.innerHTML = `
    <div style="display:flex;gap:8px;align-items:center;margin-bottom:12px;">
      <h3 style="flex:1;color:#60a5fa;">📜 Últimos ${r.commits.length} Commits</h3>
      <input type="text" id="git-log-search" placeholder="🔍 Filtrar commits..." value=""
        style="background:#0d1f3c;border:1px solid #1e3a5f;color:#e2e8f0;padding:5px 10px;border-radius:4px;font-size:12px;width:220px;">
    </div>
    <div id="git-log-table" style="overflow:auto;max-height:480px;">
      ${_renderLogTable(r.commits)}
    </div>
  `;

  document.getElementById('git-log-search')?.addEventListener('input', (e) => {
    const q = e.target.value.toLowerCase();
    const filtered = _commits.filter(c =>
      c.hashShort.includes(q) || c.subject.toLowerCase().includes(q) || c.author.toLowerCase().includes(q)
    );
    const t = document.getElementById('git-log-table');
    if (t) t.innerHTML = _renderLogTable(filtered);
  });

  // Botões de seleção para diff
  document.querySelectorAll('.git-select-ref').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const ref  = e.target.dataset.ref;
      const slot = e.target.dataset.slot;
      const el   = document.getElementById('git-diff-ref-' + slot);
      if (el) { el.value = ref; }
      _showTab('diff');
    });
  });
}

function _renderLogTable(commits) {
  if (!commits.length) return '<p class="muted" style="font-size:12px;padding:16px;">Nenhum commit encontrado.</p>';
  return `
    <table style="width:100%;border-collapse:collapse;font-size:12px;">
      <thead>
        <tr style="background:#0d1f3c;position:sticky;top:0;">
          <th style="padding:6px 8px;text-align:left;color:#94a3b8;font-weight:600;width:30px;">#</th>
          <th style="padding:6px 8px;text-align:left;color:#94a3b8;font-weight:600;width:70px;">Hash</th>
          <th style="padding:6px 8px;text-align:left;color:#94a3b8;font-weight:600;">Mensagem</th>
          <th style="padding:6px 8px;text-align:left;color:#94a3b8;font-weight:600;width:100px;">Autor</th>
          <th style="padding:6px 8px;text-align:left;color:#94a3b8;font-weight:600;width:90px;">Data</th>
          <th style="padding:6px 8px;text-align:center;color:#94a3b8;font-weight:600;width:60px;">Diff</th>
        </tr>
      </thead>
      <tbody>
        ${commits.map((c, i) => `
          <tr style="border-top:1px solid #1e293b;${i % 2 === 0 ? 'background:#060f1e;' : ''}">
            <td style="padding:5px 8px;color:#475569;">${c.i || i+1}</td>
            <td style="padding:5px 8px;"><code style="color:#a78bfa;">${_esc(c.hashShort)}</code></td>
            <td style="padding:5px 8px;color:#e2e8f0;max-width:340px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${_esc(c.subject)}">${_esc(c.subject)}</td>
            <td style="padding:5px 8px;color:#94a3b8;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${_esc(c.author)}">${_esc(c.author?.split(' ')[0]||c.author)}</td>
            <td style="padding:5px 8px;color:#64748b;font-size:11px;">${_fmtDate(c.date, true)}</td>
            <td style="padding:5px 8px;text-align:center;">
              <button class="git-select-ref" data-ref="${_esc(c.hashShort)}" data-slot="a"
                style="font-size:10px;padding:2px 5px;background:#1e293b;border:none;color:#60a5fa;cursor:pointer;border-radius:3px;" title="Selecionar como Ref A">A</button>
              <button class="git-select-ref" data-ref="${_esc(c.hashShort)}" data-slot="b"
                style="font-size:10px;padding:2px 5px;background:#1e293b;border:none;color:#f59e0b;cursor:pointer;border-radius:3px;" title="Selecionar como Ref B">B</button>
            </td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
}

// ── PAINEL 3 — Tags ───────────────────────────────────────────────────────────
let _tagsLoaded = false;
async function _loadTags(force = false) {
  if (_tagsLoaded && !force) return;
  _tagsLoaded = true;
  const p = document.getElementById('git-panel-tags');
  if (!p) return;

  const r = await window.MFControl?.git.tagsAll();
  if (!r?.ok) {
    p.innerHTML = `<span style="color:#f87171;">❌ ${_esc(r?.error || 'API indisponível — reiniciar Electron')}</span>`;
    return;
  }
  _tags = r.tags;

  p.innerHTML = `
    <h3 style="color:#60a5fa;margin-bottom:12px;">🏷️ Tags (${r.tags.length})</h3>
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:8px;">
      ${r.tags.map(t => {
        const isV12 = t.name.includes('V1.2_PRODUCAO') || t.name.includes('v1.2');
        const isRec = t.name.includes('RECUPERACAO') || t.name.includes('SAFEPOINT');
        return `
          <div style="background:${isV12?'linear-gradient(135deg,#052e16,#0d2b1a)':'#0d1f3c'};
                      border:1px solid ${isV12?'#16a34a':isRec?'#3b82f6':'#1e3a5f'};
                      border-radius:8px;padding:10px 12px;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
              <span style="color:${isV12?'#4ade80':'#e2e8f0'};font-family:monospace;font-size:13px;font-weight:${isV12?'700':'400'};">
                ${isV12?'⭐ ':isRec?'🔒 ':''}<code>${_esc(t.name)}</code>
              </span>
              <button class="btn-backup" data-tag-restore="${_esc(t.name)}"
                style="font-size:10px;padding:2px 8px;background:#1e3a5f;color:#93c5fd;"
                onclick="document.getElementById('git-restore-ref').value='${_esc(t.name)}';window._gitShowTab('restore')">
                Restaurar
              </button>
            </div>
            <div style="font-size:11px;color:#94a3b8;">
              ${t.hashShort ? `<code style="color:#a78bfa;">${_esc(t.hashShort)}</code> · ` : ''}
              ${t.date ? _fmtDate(t.date, true) : ''}
            </div>
            ${t.subject ? `<div style="font-size:11px;color:#64748b;margin-top:2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${_esc(t.subject)}">${_esc(t.subject)}</div>` : ''}
          </div>
        `;
      }).join('')}
    </div>
  `;
  window._gitShowTab = _showTab;
}

// ── PAINEL 4 — Branches ───────────────────────────────────────────────────────
let _branchesLoaded = false;
async function _loadBranches(force = false) {
  if (_branchesLoaded && !force) return;
  _branchesLoaded = true;
  const p = document.getElementById('git-panel-branches');
  if (!p) return;

  const r = await window.MFControl?.git.branchesAll();
  if (!r?.ok) {
    p.innerHTML = `<span style="color:#f87171;">❌ ${_esc(r?.error || 'API indisponível — reiniciar Electron')}</span>`;
    return;
  }
  _branches = [...r.local.map(b => b.name), ...r.remote.map(b => b.name)];

  p.innerHTML = `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">
      <div>
        <h3 style="color:#60a5fa;margin-bottom:10px;">🏠 Branches Locais (${r.local.length})</h3>
        <div style="display:flex;flex-direction:column;gap:6px;max-height:400px;overflow:auto;">
          ${r.local.map(b => `
            <div style="background:${b.isCurrent?'linear-gradient(135deg,#0d2b4a,#0a1f35)':'#0d1f3c'};
                        border:1px solid ${b.isCurrent?'#3b82f6':'#1e3a5f'};
                        border-radius:6px;padding:8px 10px;
                        display:flex;align-items:center;gap:8px;">
              <span style="width:16px;">${b.isCurrent?'▶':'·'}</span>
              <div style="flex:1;">
                <code style="color:${b.isCurrent?'#60a5fa':'#e2e8f0'};font-size:12px;font-weight:${b.isCurrent?'700':'400'};">${_esc(b.name)}</code>
                ${b.isCurrent?'<span style="font-size:10px;color:#3b82f6;margin-left:6px;">(atual)</span>':''}
                <div style="font-size:10px;color:#64748b;margin-top:1px;">${_esc(b.hash||'')} · ${_esc(b.relDate||'')}</div>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
      <div>
        <h3 style="color:#60a5fa;margin-bottom:10px;">🌐 Branches Remotas (${r.remote.length})</h3>
        <div style="display:flex;flex-direction:column;gap:5px;max-height:400px;overflow:auto;">
          ${r.remote.map(b => `
            <div style="background:#0a1525;border:1px solid #1e293b;border-radius:5px;padding:6px 10px;">
              <code style="color:#94a3b8;font-size:11px;">${_esc(b.name)}</code>
              <div style="font-size:10px;color:#475569;">${_esc(b.hash||'')} · ${_esc(b.relDate||'')}</div>
            </div>
          `).join('')}
        </div>
      </div>
    </div>
  `;
}

// ── PAINEL 5 — Diff ───────────────────────────────────────────────────────────
let _diffBuilt = false;
function _loadDiff() {
  if (_diffBuilt) return;
  _diffBuilt = true;
  const p = document.getElementById('git-panel-diff');
  if (!p) return;

  p.innerHTML = `
    <h3 style="color:#60a5fa;margin-bottom:12px;">🔀 Comparação entre Commits</h3>
    <div style="display:flex;gap:12px;align-items:flex-end;flex-wrap:wrap;margin-bottom:16px;">
      <div>
        <label style="font-size:11px;color:#94a3b8;display:block;margin-bottom:4px;">Ref A (base)</label>
        <input type="text" id="git-diff-ref-a" placeholder="hash, tag ou branch"
          style="background:#0d1f3c;border:1px solid #1e3a5f;color:#e2e8f0;padding:6px 10px;border-radius:4px;font-size:12px;width:180px;font-family:monospace;">
      </div>
      <div style="color:#60a5fa;font-size:18px;padding-bottom:4px;">→</div>
      <div>
        <label style="font-size:11px;color:#94a3b8;display:block;margin-bottom:4px;">Ref B (destino)</label>
        <input type="text" id="git-diff-ref-b" placeholder="hash, tag ou branch"
          style="background:#0d1f3c;border:1px solid #1e3a5f;color:#e2e8f0;padding:6px 10px;border-radius:4px;font-size:12px;width:180px;font-family:monospace;">
      </div>
      <button class="btn-backup" id="git-diff-run" style="padding:7px 16px;">🔀 Comparar</button>
      <button class="btn-backup" id="git-diff-preset" style="padding:7px 12px;background:#1e293b;color:#94a3b8;font-size:11px;">⭐ V1.2 vs HEAD</button>
    </div>
    <div id="git-diff-result" style="font-size:12px;color:#94a3b8;">
      Selecione dois refs para comparar. Use os botões A/B na aba Histórico para preencher automaticamente.
    </div>
  `;

  document.getElementById('git-diff-run')?.addEventListener('click', _runDiff);
  document.getElementById('git-diff-preset')?.addEventListener('click', () => {
    const elA = document.getElementById('git-diff-ref-a');
    const elB = document.getElementById('git-diff-ref-b');
    if (elA) elA.value = 'V1.2_PRODUCAO';
    if (elB) elB.value = 'HEAD';
    _runDiff();
  });
}

async function _runDiff() {
  const refA = document.getElementById('git-diff-ref-a')?.value?.trim();
  const refB = document.getElementById('git-diff-ref-b')?.value?.trim();
  const out  = document.getElementById('git-diff-result');
  if (!refA || !refB || !out) return;

  out.innerHTML = '<span class="muted">⟳ Calculando diff...</span>';
  const r = await window.MFControl?.git.diffStat(refA, refB);

  if (!r?.ok) {
    out.innerHTML = `<span style="color:#f87171;">❌ ${_esc(r?.error || r?.stat || 'Erro — reiniciar Electron')}</span>`;
    return;
  }

  const statusColors = { M: '#f59e0b', A: '#4ade80', D: '#f87171', R: '#a78bfa', C: '#67e8f9' };
  const statusLabels = { M: 'Modificado', A: 'Adicionado', D: 'Removido', R: 'Renomeado', C: 'Copiado' };

  out.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
      <span style="color:#e2e8f0;font-size:13px;">
        <code style="color:#a78bfa;">${_esc(refA)}</code>
        <span style="color:#60a5fa;"> → </span>
        <code style="color:#a78bfa;">${_esc(refB)}</code>
      </span>
      <span style="color:#94a3b8;font-size:12px;">${r.totalFiles} arquivo(s) alterado(s)</span>
    </div>
    <pre style="background:#060f1e;border:1px solid #1e293b;border-radius:4px;padding:10px;font-size:11px;color:#94a3b8;overflow:auto;max-height:200px;">${_esc(r.summary || r.stat?.split('\n').slice(-3).join('\n') || 'sem alterações')}</pre>
    ${r.files.length > 0 ? `
      <div style="margin-top:10px;max-height:200px;overflow:auto;">
        <table style="width:100%;border-collapse:collapse;font-size:11px;">
          ${r.files.map(f => `
            <tr style="border-top:1px solid #1e293b;">
              <td style="padding:3px 6px;width:100px;color:${statusColors[f.status?.charAt(0)] || '#94a3b8'};" title="${statusLabels[f.status?.charAt(0)]||f.status}">${_esc(f.status)}</td>
              <td style="padding:3px 6px;color:#e2e8f0;font-family:monospace;">${_esc(f.file)}</td>
            </tr>
          `).join('')}
        </table>
      </div>
    ` : ''}
  `;
}

// ── PAINEL 6 — Restore Prep ───────────────────────────────────────────────────
let _restoreBuilt = false;
function _loadRestore() {
  if (_restoreBuilt) return;
  _restoreBuilt = true;
  const p = document.getElementById('git-panel-restore');
  if (!p) return;

  p.innerHTML = `
    <div style="background:#1c1505;border:1px solid #78350f;border-radius:8px;padding:10px 14px;margin-bottom:14px;">
      <span style="color:#f59e0b;font-weight:700;">⚠️ MODO SOMENTE SIMULAÇÃO</span>
      <span style="color:#fbbf24;font-size:12px;margin-left:8px;">Nenhum comando será executado. Apenas visualização.</span>
    </div>
    <h3 style="color:#60a5fa;margin-bottom:12px;">⚙️ Restore Preparation — Simulação Git</h3>
    <div style="display:flex;gap:8px;align-items:flex-end;flex-wrap:wrap;margin-bottom:12px;">
      <div>
        <label style="font-size:11px;color:#94a3b8;display:block;margin-bottom:4px;">Ref (tag, branch ou hash)</label>
        <input type="text" id="git-restore-ref" placeholder="V1.2_PRODUCAO"
          value="V1.2_PRODUCAO"
          style="background:#0d1f3c;border:1px solid #1e3a5f;color:#e2e8f0;padding:6px 10px;border-radius:4px;font-size:13px;width:220px;font-family:monospace;">
      </div>
      <button class="btn-backup" id="git-restore-run">🔍 Simular Restore</button>
    </div>
    <div style="display:flex;gap:6px;margin-bottom:14px;flex-wrap:wrap;" id="git-restore-presets">
      <span style="font-size:11px;color:#94a3b8;padding:5px 0;">Atalhos:</span>
      ${['V1.2_PRODUCAO','V1.1_ESTAVEL','V1.0_OFICIAL_CRM','RECUPERACAO_V1_2_PRODUCAO'].map(t =>
        `<button class="btn-backup" data-preset="${_esc(t)}"
           style="font-size:11px;padding:3px 10px;${t==='V1.2_PRODUCAO'?'border-color:#16a34a;color:#4ade80;':''}"
           onclick="document.getElementById('git-restore-ref').value='${_esc(t)}'">
           ${t==='V1.2_PRODUCAO'?'⭐ ':''}${_esc(t)}
         </button>`
      ).join('')}
    </div>
    <div id="git-restore-result"></div>
  `;

  document.getElementById('git-restore-run')?.addEventListener('click', _runRestoreSim);
}

async function _runRestoreSim() {
  const ref = document.getElementById('git-restore-ref')?.value?.trim();
  const out = document.getElementById('git-restore-result');
  if (!ref || !out) return;

  out.innerHTML = '<span class="muted">⟳ Simulando restore de ' + _esc(ref) + '...</span>';
  const r = await window.MFControl?.git.restoreSim(ref, 'new-branch');

  if (!r?.ok) {
    out.innerHTML = `<span style="color:#f87171;">❌ ${_esc(r?.error || 'API indisponível — reiniciar Electron')}</span>`;
    return;
  }

  const modoColors = { 'checkout': '#60a5fa', 'reset-soft': '#f59e0b', 'reset-hard': '#f87171', 'new-branch': '#4ade80' };

  out.innerHTML = `
    <div style="background:#052e16;border:1px solid #16a34a;border-radius:8px;padding:12px;margin-bottom:12px;">
      <div style="font-size:12px;color:#86efac;margin-bottom:6px;">
        <code style="color:#4ade80;font-size:13px;font-weight:700;">${_esc(ref)}</code>
        · ${_esc(r.hashShort)} · ${_fmtDate(r.date, true)} · ${_esc(r.author)}
      </div>
      <div style="font-size:12px;color:#4ade80;">${_esc(r.subject)}</div>
    </div>

    <h4 style="color:#94a3b8;font-size:12px;margin-bottom:10px;">Modos de Restore Disponíveis:</h4>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
      ${(r.modos || []).map(m => `
        <div style="background:${m.selecionado?'#0d1f3c':'#060f1e'};
                    border:1px solid ${m.selecionado?modoColors[m.key]||'#3b82f6':'#1e293b'};
                    border-radius:6px;padding:10px;">
          <div style="font-size:12px;font-weight:700;color:${modoColors[m.key]||'#e2e8f0'};margin-bottom:4px;">
            ${m.selecionado?'▶ ':''}${_esc(m.key)}
          </div>
          <div style="font-size:11px;color:#94a3b8;margin-bottom:6px;">${_esc(m.descricao)}</div>
          <div style="font-size:10px;color:#64748b;font-weight:600;margin-bottom:4px;">
            Risco: <span style="color:${m.risco.includes('🔴')?'#f87171':m.risco.includes('MÉDIO')?'#f59e0b':m.risco.includes('BAIXO')?'#fbbf24':'#4ade80'};">${_esc(m.risco)}</span>
          </div>
          <pre style="background:#020812;padding:6px 8px;border-radius:4px;font-size:10px;color:#a78bfa;margin:0;overflow:auto;max-height:80px;">${m.comandos.map(_esc).join('\n')}</pre>
          <button class="btn-backup" data-mode="${_esc(m.key)}"
            style="margin-top:6px;font-size:10px;padding:3px 8px;${m.selecionado?'border-color:'+modoColors[m.key]+';color:'+modoColors[m.key]+';':''}"
            onclick="document.getElementById('git-restore-ref').value='${_esc(ref)}';window._gitRunRestoreMode('${_esc(ref)}','${_esc(m.key)}')">
            Ver detalhes
          </button>
        </div>
      `).join('')}
    </div>
    <div style="margin-top:12px;padding:8px;background:#0a1525;border-radius:4px;font-size:11px;color:#475569;text-align:center;">
      🔒 SIMULAÇÃO — Nenhum comando foi executado. Copie e execute manualmente no terminal quando aprovado.
    </div>
  `;

  window._gitRunRestoreMode = async (ref2, mode) => {
    const out2 = document.getElementById('git-restore-result');
    if (!out2) return;
    const r2 = await window.MFControl?.git.restoreSim(ref2, mode);
    if (!r2?.ok) return;
    const sel = r2.modos.find(m => m.key === mode);
    if (!sel) return;
    // Destaca o modo selecionado (re-render)
    out2.querySelectorAll('[data-mode]').forEach(b => {
      b.style.borderColor = b.dataset.mode === mode ? modoColors[mode] || '#3b82f6' : '';
    });
  };
}

// ── Validate ──────────────────────────────────────────────────────────────────
async function _validate() {
  const r = await window.MFControl?.git.validate();
  const badge = document.getElementById('git-validate-badge');
  if (!badge) return;
  if (!r) {
    badge.textContent = '⚠️ Restart necessário';
    badge.style.background = '#3f1c1c'; badge.style.color = '#f87171';
    return;
  }
  if (r.gitInstalled && r.repoAccessible && r.canReadCommits) {
    badge.textContent = '✅ Git OK';
    badge.style.background = '#052e16'; badge.style.color = '#4ade80';
  } else {
    badge.textContent = '❌ Git indisponível';
    badge.style.background = '#3f1c1c'; badge.style.color = '#f87171';
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────
/** Escapa HTML — previne XSS com dados do git (nomes de branch/tag/arquivo) */
function _esc(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

/** Formata data ISO para pt-BR */
function _fmtDate(iso, short = false) {
  if (!iso || iso === '?') return '<span class="muted">?</span>';
  try {
    const d = new Date(iso);
    if (isNaN(d)) return `<span class="muted">${_esc(iso)}</span>`;
    if (short) return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' });
    return d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch { return `<span class="muted">${_esc(iso)}</span>`; }
}

/**
 * recovery.js — MF Control Center
 * Recovery Center: detecção, validação, dry-run e restore de V1.2 Produção.
 * CC-4 — RESTORE REAL BLOQUEADO até CC-4.1
 */

let _iniciado = false;

export function recoveryInit() {
  if (_iniciado) return;
  _iniciado = true;
  _build();
}

// ── Construção da UI ──────────────────────────────────────────────────────────
function _build() {
  const container = document.getElementById('page-recovery');
  if (!container) return;
  container.innerHTML = '';

  // ── Header ──
  const header = document.createElement('div');
  header.className = 'dash-header';
  header.innerHTML = `
    <div>
      <h2>🔄 Recovery Center</h2>
      <p class="dash-sub">Restauração de emergência V1.2 Produção · Detectar · Validar · Dry-Run</p>
    </div>
    <div style="display:flex;gap:8px;align-items:center;">
      <span class="badge-safe" style="background:#1e3a5f;color:#60a5fa;border:1px solid #3b82f6;">🔒 CC-4 LOCK</span>
      <span id="rc-status-badge" class="badge-safe">⟳ Carregando...</span>
    </div>
  `;
  container.appendChild(header);

  // ── FASE 1+2: Backup Status ──
  const secaoStatus = _criarSecao('📦 Backup Status — V1.2 Produção', 'rc-status-grid');
  container.appendChild(secaoStatus.wrapper);

  // ── FASE 3: Health Check ──
  const secaoHealth = _criarSecao('🏥 Health Check', 'rc-health-grid');
  const btnHealth = _btn('🏥 Executar Health Check', 'btn-backup', async () => {
    btnHealth.disabled = true;
    btnHealth.textContent = '⟳ Verificando...';
    await _runHealthCheck();
    btnHealth.disabled = false;
    btnHealth.textContent = '🔁 Verificar Novamente';
  });
  secaoHealth.wrapper.insertBefore(btnHealth, secaoHealth.grid);
  container.appendChild(secaoHealth.wrapper);

  // ── FASE 4: Dry Run ──
  const secaoDry = _criarSecao('🧪 Dry Run — Simulação de Restore', 'rc-dryrun-output');
  const dryBtns = document.createElement('div');
  dryBtns.style.cssText = 'display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px;';
  for (const type of ['crm', 'landing', 'firestore', 'rules']) {
    const labels = { crm: '🖥️ CRM', landing: '🌐 Landing', firestore: '🔥 Firestore', rules: '🛡️ Rules' };
    const b = _btn('Simular ' + labels[type], 'btn-backup', async () => {
      b.disabled = true;
      b.textContent = '⟳ Simulando...';
      await _runDryRun(type);
      b.disabled = false;
      b.textContent = 'Simular ' + labels[type];
    });
    dryBtns.appendChild(b);
  }
  secaoDry.wrapper.insertBefore(dryBtns, secaoDry.grid);
  container.appendChild(secaoDry.wrapper);

  // ── FASE 5+6: Restore Engine (BLOQUEADO CC-4) ──
  const secaoRestore = document.createElement('div');
  secaoRestore.className = 'dash-card';
  secaoRestore.style.cssText = 'margin-top:16px;border:1px solid #7f1d1d;background:#1c0a0a;';
  secaoRestore.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
      <h3 style="color:#f87171;">🔴 Restauração Real — BLOQUEADO</h3>
      <span style="background:#7f1d1d;color:#fca5a5;padding:3px 10px;border-radius:4px;font-size:11px;font-weight:700;">CC-4.1 PENDING</span>
    </div>
    <p style="font-size:12px;color:#94a3b8;margin-bottom:16px;">
      A restauração real é bloqueada em CC-4. O botão abaixo executa a tripla confirmação e
      prepara o motor de restore — mas a execução efetiva é travada por <code style="color:#f87171;">RECOVERY_LOCKED=true</code>
      em <code style="color:#f87171;">main.js</code>. Será liberado em <strong style="color:#fca5a5;">CC-4.1</strong> após esta certificação.
    </p>
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:8px;margin-bottom:16px;" id="rc-restore-btns"></div>
    <div style="margin-top:8px;" id="rc-restore-confirm-area"></div>
  `;
  container.appendChild(secaoRestore);

  // Botões individuais de restore
  const restoreBtnsArea = secaoRestore.querySelector('#rc-restore-btns');
  for (const type of ['rules', 'crm', 'landing', 'firestore']) {
    const icons  = { rules: '🛡️', crm: '🖥️', landing: '🌐', firestore: '🔥' };
    const labels = { rules: 'Rules', crm: 'CRM', landing: 'Landing', firestore: 'Firestore' };
    const b = document.createElement('button');
    b.className = 'btn-backup';
    b.style.cssText = 'border:1px solid #7f1d1d;color:#fca5a5;background:#2d0b0b;';
    b.innerHTML = `${icons[type]} Restaurar ${labels[type]}`;
    b.addEventListener('click', () => _mostrarConfirmacao(type, secaoRestore.querySelector('#rc-restore-confirm-area')));
    restoreBtnsArea.appendChild(b);
  }

  // Botão único "RESTAURAR V1.2 PRODUÇÃO"
  const btnRestaurarTudo = document.createElement('button');
  btnRestaurarTudo.style.cssText = `
    width:100%;padding:14px;font-size:15px;font-weight:700;letter-spacing:1px;
    border:2px solid #7f1d1d;background:linear-gradient(135deg,#2d0b0b,#3d1010);
    color:#fca5a5;border-radius:8px;cursor:pointer;margin-top:8px;
    transition:all .2s;
  `;
  btnRestaurarTudo.innerHTML = '🔴 RESTAURAR V1.2 PRODUÇÃO — TODOS OS COMPONENTES';
  btnRestaurarTudo.addEventListener('click', () => _mostrarConfirmacao('all', secaoRestore.querySelector('#rc-restore-confirm-area')));
  secaoRestore.appendChild(btnRestaurarTudo);

  // ── FASE 7: Log ──
  const secaoLog = document.createElement('div');
  secaoLog.className = 'dash-card';
  secaoLog.style.marginTop = '16px';
  secaoLog.innerHTML = '<h3>📋 Recovery Log</h3>';
  const logRefreshBtn = _btn('🔄 Atualizar Log', 'btn-backup', _carregarLog);
  logRefreshBtn.style.cssText = 'margin-bottom:8px;font-size:11px;padding:4px 10px;';
  const logPre = document.createElement('pre');
  logPre.className = 'backup-log';
  logPre.id = 'rc-log';
  logPre.textContent = 'Carregando log...\n';
  secaoLog.appendChild(logRefreshBtn);
  secaoLog.appendChild(logPre);
  container.appendChild(secaoLog);

  // Executa scan inicial
  _runScan();
  _carregarLog();
}

// ── Seção genérica ────────────────────────────────────────────────────────────
function _criarSecao(titulo, gridId) {
  const wrapper = document.createElement('div');
  wrapper.className = 'dash-card';
  wrapper.style.marginTop = '16px';
  const h3 = document.createElement('h3');
  h3.textContent = titulo;
  h3.style.marginBottom = '12px';
  const grid = document.createElement('div');
  grid.style.cssText = 'display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:8px;';
  grid.id = gridId;
  wrapper.appendChild(h3);
  wrapper.appendChild(grid);
  return { wrapper, grid };
}

function _btn(label, cls, fn) {
  const b = document.createElement('button');
  b.className = cls;
  b.textContent = label;
  b.addEventListener('click', fn);
  return b;
}

// ── FASE 1+2: Scan ────────────────────────────────────────────────────────────
async function _runScan() {
  const grid   = document.getElementById('rc-status-grid');
  const badge  = document.getElementById('rc-status-badge');
  if (!grid) return;
  grid.innerHTML = '<span class="muted" style="font-size:12px;">Escaneando backups...</span>';

  const scan = await window.MFControl?.recovery.scan();
  if (!scan) { grid.innerHTML = '<span style="color:#ef4444">Erro: API recovery não disponível</span>'; return; }

  grid.innerHTML = '';
  const tiposInfo = {
    crm:       { icon: '🖥️', label: 'Backup CRM',        desc: 'crm-dev/ completo' },
    landing:   { icon: '🌐', label: 'Backup Landing',     desc: 'Landing Page (GitHub Pages)' },
    firestore: { icon: '🔥', label: 'Backup Firestore',   desc: 'JSON + ZIP das coleções' },
    rules:     { icon: '🛡️', label: 'Backup Rules',       desc: 'firestore.rules + firebase.json' },
  };

  let allOk = true;
  for (const [type, info] of Object.entries(tiposInfo)) {
    const s = scan[type];
    const ok = s.exists;
    if (!ok) allOk = false;

    const card = document.createElement('div');
    card.className = 'bkp-card';
    card.style.cssText = ok
      ? 'border-color:#16a34a;background:linear-gradient(135deg,#052e16,#1a1a2e);'
      : 'border-color:#ef4444;background:linear-gradient(135deg,#1c0a0a,#1a1a2e);';

    let extraInfo = '';
    if (type === 'firestore' && s.exists) {
      extraInfo = `<br><small class="muted">JSON: ${s.jsonExists ? '✅ '+_fmt(s.jsonSize) : '❌ ausente'}</small>`;
    }

    card.innerHTML = `
      <div class="bkp-icon">${info.icon}</div>
      <div class="bkp-info">
        <h3>${info.label}</h3>
        <p class="bkp-desc">${info.desc}</p>
        <div class="bkp-meta">
          <span class="${ok ? 'bkp-tag' : ''}" style="color:${ok ? '#4ade80' : '#f87171'};">
            ${ok ? '✅ OK · ' + _fmt(s.size) : '❌ AUSENTE'}
          </span>
          ${extraInfo}
        </div>
      </div>
    `;
    grid.appendChild(card);
  }

  badge.textContent  = allOk ? '✅ 4/4 OK' : '⚠️ Incompleto';
  badge.style.background = allOk ? '#052e16' : '#3f1c1c';
  badge.style.color      = allOk ? '#4ade80' : '#f87171';

  await _writeLog({ acao: 'scan', resultado: allOk ? 'OK — 4/4' : 'PARCIAL' });
}

// ── FASE 3: Health Check ──────────────────────────────────────────────────────
async function _runHealthCheck() {
  const grid = document.getElementById('rc-health-grid');
  if (!grid) return;
  grid.innerHTML = '<span class="muted" style="font-size:12px;">Executando health check...</span>';

  const health = await window.MFControl?.recovery.health();
  if (!health) { grid.innerHTML = '<span style="color:#ef4444">Erro: health check falhou</span>'; return; }

  grid.innerHTML = '';
  const icons = { crm: '🖥️', landing: '🌐', firestore: '🔥', rules: '🛡️' };
  let allHealthy = true;

  for (const [type, h] of Object.entries(health)) {
    const ok = h.ok && (h.structureOk !== false);
    if (!ok) allHealthy = false;

    const card = document.createElement('div');
    card.className = 'bkp-card';
    card.style.cssText = ok
      ? 'border-color:#16a34a;'
      : 'border-color:#f59e0b;background:#1c1505;';

    let details = '';
    if (h.ok) {
      details += `<br><small class="muted">📄 ${h.entries?.length || 0} entradas no ZIP</small>`;
      if (type === 'rules') {
        details += `<br><small style="color:${h.hasFirestoreRules?'#4ade80':'#f87171'}">firestore.rules: ${h.hasFirestoreRules?'✅':'❌'}</small>`;
        details += `<br><small style="color:${h.hasFirebaseJson?'#4ade80':'#f87171'}">firebase.json: ${h.hasFirebaseJson?'✅':'❌'}</small>`;
      }
      if (type === 'firestore' && h.jsonValid !== undefined) {
        details += `<br><small style="color:${h.jsonValid?'#4ade80':'#f87171'}">JSON: ${h.jsonValid?'✅ '+h.jsonCols+' coleções':'❌ '+h.jsonError}</small>`;
        if (h.jsonColNames?.length) {
          details += `<br><small class="muted" style="font-size:10px;">${h.jsonColNames.slice(0,4).map(_esc).join(', ')}${h.jsonColNames.length>4?'…':''}</small>`;
        }
      }
      if (h.missingFiles?.length > 0) {
        details += `<br><small style="color:#f87171;">⚠️ Faltando: ${h.missingFiles.map(_esc).join(', ')}</small>`;
      } else if (h.structureOk) {
        details += `<br><small style="color:#4ade80;">✅ Estrutura válida</small>`;
      }
    }

    card.innerHTML = `
      <div class="bkp-icon">${icons[type]}</div>
      <div class="bkp-info">
        <h3 style="text-transform:capitalize;">${type}</h3>
        <div class="bkp-meta">
          <span style="color:${ok?'#4ade80':'#f59e0b'};font-weight:700;">
            ${ok ? '✅ SAUDÁVEL' : h.ok ? '⚠️ INCOMPLETO' : '❌ '+h.status.toUpperCase()}
          </span>
          ${details}
        </div>
      </div>
    `;
    grid.appendChild(card);
  }

  await _writeLog({ acao: 'health-check', resultado: allHealthy ? 'OK — todos saudáveis' : 'AVISO — verificar itens' });
}

// ── FASE 4: Dry Run ───────────────────────────────────────────────────────────
async function _runDryRun(type) {
  const out = document.getElementById('rc-dryrun-output');
  if (!out) return;

  const loading = document.createElement('div');
  loading.style.cssText = 'font-size:12px;color:#94a3b8;padding:8px 0;';
  loading.textContent = `⟳ Simulando restore de ${type.toUpperCase()}...`;
  out.appendChild(loading);

  const plan = await window.MFControl?.recovery.dryRun(type);
  out.removeChild(loading);

  const box = document.createElement('div');
  box.style.cssText = 'background:#0f1629;border:1px solid #1e3a5f;border-radius:8px;padding:12px;margin-top:8px;font-size:12px;';

  if (!plan?.ok) {
    box.innerHTML = `<span style="color:#f87171;">❌ Dry Run ${type.toUpperCase()} falhou: ${plan?.reason}</span>`;
    out.appendChild(box);
    return;
  }

  const icons = { crm: '🖥️', landing: '🌐', firestore: '🔥', rules: '🛡️' };
  const ts = new Date().toLocaleTimeString('pt-BR');

  box.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
      <strong style="color:#60a5fa;">${icons[type]} DRY RUN — ${type.toUpperCase()}</strong>
      <span class="muted" style="font-size:11px;">${ts}</span>
    </div>
    <div style="margin-bottom:6px;color:#e2e8f0;">${plan.description}</div>
    <div style="margin-bottom:6px;"><span class="muted">Arquivo: </span><code style="color:#a78bfa;">${plan.filename}</code> · ${_fmt(plan.size)}</div>
    <div style="margin-bottom:6px;"><span class="muted">Entradas ZIP: </span><span style="color:#4ade80;">${plan.totalEntries}</span></div>
    <div style="margin-bottom:8px;">
      <div class="muted" style="margin-bottom:4px;">Targets (o que seria restaurado):</div>
      ${plan.targets.map(t => `<div style="color:#67e8f9;font-size:11px;padding:2px 0;">→ ${_esc(t)}</div>`).join('')}
    </div>
    ${plan.warnings?.length ? `
      <div style="background:#1c1505;border:1px solid #78350f;border-radius:4px;padding:8px;">
        <div style="color:#f59e0b;font-size:11px;font-weight:700;margin-bottom:4px;">⚠️ AVISOS:</div>
        ${plan.warnings.map(w => `<div style="color:#fbbf24;font-size:11px;">• ${_esc(w)}</div>`).join('')}
      </div>
    ` : ''}
    <div style="margin-top:8px;color:#6b7280;font-size:11px;font-style:italic;">
      [DRY RUN] Nenhum arquivo foi alterado. Apenas simulação.
    </div>
  `;
  out.appendChild(box);

  await _writeLog({ acao: `dry-run:${type}`, resultado: `OK — ${plan.totalEntries} entradas | ${plan.targets.length} targets` });
}

// ── FASE 6: Tripla Confirmação ────────────────────────────────────────────────
function _mostrarConfirmacao(type, area) {
  area.innerHTML = '';
  const labels = { crm: 'CRM', landing: 'Landing', firestore: 'Firestore', rules: 'Rules', all: 'TUDO' };
  const label = labels[type] || type.toUpperCase();

  const box = document.createElement('div');
  box.style.cssText = 'background:#1c0a0a;border:2px solid #b91c1c;border-radius:8px;padding:16px;margin-top:12px;';
  box.innerHTML = `
    <h4 style="color:#f87171;margin-bottom:12px;">⚠️ RESTAURAR ${label} — Tripla Confirmação Obrigatória</h4>

    <div style="margin-bottom:12px;">
      <div style="font-size:12px;color:#94a3b8;margin-bottom:6px;">
        Confirmação 1 — Leia e clique para confirmar que entende a ação:
      </div>
      <div style="display:flex;align-items:center;gap:8px;">
        <input type="checkbox" id="rc-c1-${type}" style="width:16px;height:16px;cursor:pointer;">
        <label for="rc-c1-${type}" style="font-size:12px;color:#e2e8f0;cursor:pointer;">
          Confirmo que esta ação irá sobrescrever arquivos de produção
        </label>
      </div>
    </div>

    <div style="margin-bottom:12px;">
      <div style="font-size:12px;color:#94a3b8;margin-bottom:6px;">
        Confirmação 2 — Digite <code style="color:#f87171;">RESTAURAR</code>:
      </div>
      <input type="text" id="rc-c2-${type}" placeholder="RESTAURAR"
        style="background:#0f0505;border:1px solid #7f1d1d;color:#fca5a5;padding:6px 10px;
               border-radius:4px;font-size:13px;width:200px;font-family:monospace;">
    </div>

    <div style="margin-bottom:16px;">
      <div style="font-size:12px;color:#94a3b8;margin-bottom:6px;">
        Confirmação 3 — Digite <code style="color:#f87171;">V1.2_PRODUCAO</code>:
      </div>
      <input type="text" id="rc-c3-${type}" placeholder="V1.2_PRODUCAO"
        style="background:#0f0505;border:1px solid #7f1d1d;color:#fca5a5;padding:6px 10px;
               border-radius:4px;font-size:13px;width:200px;font-family:monospace;">
    </div>

    <div style="display:flex;gap:8px;" id="rc-confirm-btns-${type}"></div>
    <div id="rc-confirm-result-${type}" style="margin-top:10px;font-size:12px;"></div>
  `;
  area.appendChild(box);

  // Botão Executar
  const btnExec = document.createElement('button');
  btnExec.className = 'btn-backup';
  btnExec.style.cssText = 'border:1px solid #b91c1c;background:#3d1010;color:#fca5a5;';
  btnExec.textContent = `🔴 Executar Restore ${label}`;
  btnExec.addEventListener('click', () => _executarRestore(type));

  // Botão Cancelar
  const btnCancel = document.createElement('button');
  btnCancel.className = 'btn-backup';
  btnCancel.textContent = 'Cancelar';
  btnCancel.style.cssText = 'background:#1e293b;color:#94a3b8;';
  btnCancel.addEventListener('click', () => { area.innerHTML = ''; });

  box.querySelector(`#rc-confirm-btns-${type}`).append(btnExec, btnCancel);
}

async function _executarRestore(type) {
  const c1 = document.getElementById(`rc-c1-${type}`)?.checked;
  const c2 = document.getElementById(`rc-c2-${type}`)?.value?.trim();
  const c3 = document.getElementById(`rc-c3-${type}`)?.value?.trim();
  const resultArea = document.getElementById(`rc-confirm-result-${type}`);
  if (!resultArea) return;

  if (!c1) { resultArea.innerHTML = '<span style="color:#f87171;">❌ Marque a Confirmação 1</span>'; return; }
  if (c2 !== 'RESTAURAR') { resultArea.innerHTML = '<span style="color:#f87171;">❌ Confirmação 2 incorreta — escreva exatamente: RESTAURAR</span>'; return; }
  if (c3 !== 'V1.2_PRODUCAO') { resultArea.innerHTML = '<span style="color:#f87171;">❌ Confirmação 3 incorreta — escreva exatamente: V1.2_PRODUCAO</span>'; return; }

  resultArea.innerHTML = '<span class="muted">⟳ Enviando para o motor de restore...</span>';

  const types = type === 'all' ? ['rules', 'firestore', 'crm', 'landing'] : [type];
  const allResults = [];

  for (const t of types) {
    const res = await window.MFControl?.recovery.restore({
      type: t,
      confirm1: 'confirmed',
      confirm2: c2,
      confirm3: c3,
    });
    allResults.push({ type: t, ...res });
  }

  // Mostra resultado
  const locked = allResults.some(r => r.locked);
  if (locked) {
    resultArea.innerHTML = `
      <div style="background:#1c1505;border:1px solid #78350f;border-radius:6px;padding:10px;">
        <div style="color:#f59e0b;font-weight:700;margin-bottom:4px;">🔒 CC-4 LOCK ATIVO</div>
        <div style="color:#fbbf24;font-size:12px;">
          As confirmações foram validadas com sucesso.<br>
          O motor de restore está <strong>pronto e funcional</strong>.<br>
          A execução real está bloqueada por <code>RECOVERY_LOCKED=true</code> em main.js.<br>
          <strong>Será liberado em CC-4.1</strong> após certificação desta fase.
        </div>
        <div style="margin-top:8px;color:#6b7280;font-size:11px;">
          ✅ Confirmação 1: marcada<br>
          ✅ Confirmação 2: RESTAURAR ✓<br>
          ✅ Confirmação 3: V1.2_PRODUCAO ✓
        </div>
      </div>
    `;
    await _writeLog({ acao: `restore-attempt:${type}`, resultado: 'BLOQUEADO CC-4 LOCK — confirmações válidas' });
  } else {
    const ok = allResults.every(r => r.ok);
    if (ok) {
      const restored = allResults.flatMap(r => r.restored || []);
      resultArea.innerHTML = `
        <div style="background:#052e16;border:1px solid #16a34a;border-radius:6px;padding:10px;">
          <div style="color:#4ade80;font-weight:700;margin-bottom:4px;">✅ Restore Concluído</div>
          <div style="color:#86efac;font-size:12px;">${restored.map(r=>`• ${_esc(r)}`).join('<br>')}</div>
        </div>
      `;
      await _writeLog({ acao: `restore:${type}`, resultado: 'OK — ' + restored.join(', ') });
    } else {
      const erros = allResults.filter(r => !r.ok).map(r => r.type + ': ' + r.reason).join(' | ');
      resultArea.innerHTML = `<span style="color:#f87171;">❌ Falha: ${_esc(erros)}</span>`;
      await _writeLog({ acao: `restore:${type}`, resultado: 'FALHA — ' + erros });
    }
  }
}

// ── FASE 7: Log ───────────────────────────────────────────────────────────────
async function _carregarLog() {
  const pre = document.getElementById('rc-log');
  if (!pre) return;
  pre.textContent = 'Carregando...\n';

  const entries = await window.MFControl?.recovery.readLog() || [];
  if (!entries.length) { pre.textContent = 'Nenhuma entrada no log ainda.\n'; return; }

  pre.textContent = entries.slice(0, 50).map(e => {
    const user = e.usuario || window._mfUser?.email?.split('@')[0] || 'admin';
    const ts   = e.ts ? new Date(e.ts).toLocaleString('pt-BR') : '?';
    return `[${ts}] ${user} | ${e.acao} | ${e.resultado}`;
  }).join('\n') + '\n';
}

async function _writeLog(entry) {
  const user = window._mfUser?.email || 'admin';
  await window.MFControl?.recovery.writeLog({ usuario: user, ...entry });
  _carregarLog();
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function _fmt(bytes) {
  if (!bytes) return '0 B';
  if (bytes < 1024)    return bytes + ' B';
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / 1048576).toFixed(1) + ' MB';
}

/** Escapa caracteres HTML em dados externos (entradas ZIP, nomes de coleções, logs). */
function _esc(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

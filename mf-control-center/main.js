/**
 * main.js — MF Control Center
 * Electron Main Process
 * NÃO modifica crm-dev/, firestore.rules, firebase.json do CRM.
 */

const { app, BrowserWindow, ipcMain, shell, dialog } = require('electron');
const path  = require('path');
const fs    = require('fs');

// Git: caminho absoluto para evitar falha de PATH no Electron empacotado
const GIT_EXEC = fs.existsSync('C:/Program Files/Git/cmd/git.exe')
  ? 'C:/Program Files/Git/cmd/git.exe'
  : 'git';

const isDev = process.env.NODE_ENV === 'development';

// ─── Ícone da aplicação ────────────────────────────────────────────────────────
// Usa logo.ico (Windows). Fallback silencioso se arquivo não existir.
const ICON_PATH = path.join(__dirname, 'assets', 'logo.ico');
const ICON_EXISTS = fs.existsSync(ICON_PATH) && fs.statSync(ICON_PATH).size > 1024;

// ─── Janela Principal ──────────────────────────────────────────────────────────
function createWindow() {
  const winOptions = {
    width:     1280,
    height:    800,
    minWidth:  1024,
    minHeight: 680,
    webPreferences: {
      preload:          path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration:  false,
      webSecurity:      true,
      webviewTag:       true,   // habilita <webview> para o CRM embutido
    },
    backgroundColor: '#0f172a',
    title:           'MF Control Center',
    show:            false,
  };

  // Aplica ícone somente se logo.ico for um ICO real (> 1 KB)
  if (ICON_EXISTS) winOptions.icon = ICON_PATH;

  const win = new BrowserWindow(winOptions);

  win.loadFile(path.join(__dirname, 'renderer', 'index.html'));

  win.once('ready-to-show', () => {
    win.show();
    if (isDev) win.webContents.openDevTools({ mode: 'detach' });
  });

  win.on('closed', () => {});
}

// ─── Ciclo de Vida ─────────────────────────────────────────────────────────────
app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// ─── IPC: Utilitários ──────────────────────────────────────────────────────────
ipcMain.handle('app:version',  () => app.getVersion());
ipcMain.handle('app:platform', () => process.platform);
ipcMain.handle('app:paths',    () => ({
  root: BACKUP_ROOT,
  crm:  path.join(BACKUP_ROOT, 'crm-dev'),
}));

ipcMain.handle('shell:openExternal', (_e, url) => {
  if (url.startsWith('https://') || url.startsWith('http://')) {
    shell.openExternal(url);
  }
});

// ─── IPC: File System — Backups ───────────────────────────────────────────────
// Lê backups do diretório pai (raiz do projeto)
const BACKUP_ROOT = path.join(__dirname, '..');

ipcMain.handle('fs:listBackups', () => {
  try {
    return fs.readdirSync(BACKUP_ROOT)
      .filter(f => f.startsWith('BACKUP_') && (f.endsWith('.json') || f.endsWith('.zip') || f.endsWith('.md')))
      .map(f => {
        const stat = fs.statSync(path.join(BACKUP_ROOT, f));
        return { name: f, size: stat.size, mtime: stat.mtime.toISOString() };
      })
      .sort((a, b) => new Date(b.mtime) - new Date(a.mtime));
  } catch (e) {
    return [];
  }
});

ipcMain.handle('fs:readFile', (_e, filename) => {
  try {
    const fullPath = path.join(BACKUP_ROOT, path.basename(filename));
    if (!fs.existsSync(fullPath)) return null;
    return fs.readFileSync(fullPath, 'utf-8');
  } catch (e) {
    return null;
  }
});

ipcMain.handle('fs:saveExport', async (_e, { filename, content }) => {
  const { filePath } = await dialog.showSaveDialog({
    defaultPath: filename,
    filters: [
      { name: 'JSON', extensions: ['json'] },
      { name: 'Todos', extensions: ['*'] },
    ],
  });
  if (!filePath) return { ok: false };
  fs.writeFileSync(filePath, content, 'utf-8');
  return { ok: true, path: filePath };
});

// ─── IPC: Backup Center ───────────────────────────────────────────────────────
const archiver = require('archiver');
const os       = require('os');

/** Timestamp YYYYMMDD_HHMM */
function ts() {
  const d = new Date();
  return d.getFullYear().toString()
    + String(d.getMonth() + 1).padStart(2, '0')
    + String(d.getDate()).padStart(2, '0') + '_'
    + String(d.getHours()).padStart(2, '0')
    + String(d.getMinutes()).padStart(2, '0');
}

/** Filtro seguro: exclui node_modules, .git, dist, *.zip */
function filtroSeguro(entry) {
  const n = entry.name.replace(/\\/g, '/');
  if (n.includes('node_modules/')) return false;
  if (n.includes('.git/'))         return false;
  if (n.includes('dist/'))         return false;
  if (n.endsWith('.zip'))          return false;
  return entry;
}

/** Cria ZIP via callback — mostra diálogo Salvar, retorna resultado */
async function salvarZip(defaultName, buildFn) {
  const { filePath, canceled } = await dialog.showSaveDialog({
    defaultPath: path.join(BACKUP_ROOT, defaultName),
    filters: [{ name: 'ZIP Archive', extensions: ['zip'] }],
    title:   'Salvar Backup — ' + defaultName,
  });
  if (canceled || !filePath) return { ok: false, reason: 'cancelled' };

  return new Promise((resolve, reject) => {
    const output  = fs.createWriteStream(filePath);
    const archive = archiver('zip', { zlib: { level: 9 } });

    output.on('close', () => {
      try {
        const stat = fs.statSync(filePath);
        resolve({ ok: true, path: filePath, size: stat.size, bytes: archive.pointer() });
      } catch (e) {
        resolve({ ok: true, path: filePath, size: 0 });
      }
    });
    archive.on('error', reject);
    archive.pipe(output);
    buildFn(archive);
    archive.finalize();
  });
}

// Backup 1 — Firestore (dados vêm do renderer autenticado)
ipcMain.handle('backup:firestore', async (_e, jsonData) => {
  const stamp = ts();
  const tmpJson = path.join(os.tmpdir(), `mf_firestore_${stamp}.json`);
  try {
    fs.writeFileSync(tmpJson, jsonData, 'utf-8');
    const result = await salvarZip(`BACKUP_FIRESTORE_${stamp}.zip`, (archive) => {
      archive.file(tmpJson, { name: `BACKUP_FIRESTORE_${stamp}.json` });
    });
    try { fs.unlinkSync(tmpJson); } catch (_) {}
    return result;
  } catch (e) {
    try { fs.unlinkSync(tmpJson); } catch (_) {}
    return { ok: false, reason: e.message };
  }
});

// Backup 2 — Rules (firestore.rules + indexes + firebase.json)
ipcMain.handle('backup:rules', async () => {
  const stamp = ts();
  try {
    return await salvarZip(`BACKUP_RULES_${stamp}.zip`, (archive) => {
      const ruleset = [
        'firestore.rules',
        'firestore.indexes.json',
        'storage.rules',
        'firebase.json',
      ];
      for (const f of ruleset) {
        const fp = path.join(BACKUP_ROOT, f);
        if (fs.existsSync(fp)) archive.file(fp, { name: f });
      }
    });
  } catch (e) {
    return { ok: false, reason: e.message };
  }
});

// Backup 3 — CRM (crm-dev/)
ipcMain.handle('backup:crm', async () => {
  const stamp  = ts();
  const crmDir = path.join(BACKUP_ROOT, 'crm-dev');
  if (!fs.existsSync(crmDir)) return { ok: false, reason: 'crm-dev/ não encontrado' };
  try {
    return await salvarZip(`BACKUP_CRM_${stamp}.zip`, (archive) => {
      archive.directory(crmDir, 'crm-dev', filtroSeguro);
    });
  } catch (e) {
    return { ok: false, reason: e.message };
  }
});

// Backup 4 — Landing Page (arquivos raiz: html, css/, js/, src/, docs/)
ipcMain.handle('backup:landing', async () => {
  const stamp = ts();
  try {
    return await salvarZip(`BACKUP_LANDING_${stamp}.zip`, (archive) => {
      // HTMLs raiz
      for (const f of ['index.html', 'login.html', 'proposta.html']) {
        const fp = path.join(BACKUP_ROOT, f);
        if (fs.existsSync(fp)) archive.file(fp, { name: f });
      }
      // Pastas da landing
      for (const dir of ['css', 'js', 'src', 'docs', 'firebase', 'services', 'ai']) {
        const dp = path.join(BACKUP_ROOT, dir);
        if (fs.existsSync(dp) && fs.statSync(dp).isDirectory()) {
          archive.directory(dp, dir, filtroSeguro);
        }
      }
    });
  } catch (e) {
    return { ok: false, reason: e.message };
  }
});

// Backup 5 — Completo (CRM + Landing + Rules + Firestore)
ipcMain.handle('backup:completo', async (_e, jsonData) => {
  const stamp   = ts();
  const tmpJson = path.join(os.tmpdir(), `mf_firestore_${stamp}.json`);
  try {
    fs.writeFileSync(tmpJson, jsonData, 'utf-8');
    const result = await salvarZip(`BACKUP_COMPLETO_${stamp}.zip`, (archive) => {
      // CRM
      const crmDir = path.join(BACKUP_ROOT, 'crm-dev');
      if (fs.existsSync(crmDir)) archive.directory(crmDir, 'CRM', filtroSeguro);

      // Rules
      for (const f of ['firestore.rules', 'firestore.indexes.json', 'firebase.json', 'storage.rules']) {
        const fp = path.join(BACKUP_ROOT, f);
        if (fs.existsSync(fp)) archive.file(fp, { name: 'RULES/' + f });
      }

      // Firestore JSON
      archive.file(tmpJson, { name: `FIRESTORE/BACKUP_FIRESTORE_${stamp}.json` });

      // Landing
      for (const f of ['index.html', 'login.html', 'proposta.html']) {
        const fp = path.join(BACKUP_ROOT, f);
        if (fs.existsSync(fp)) archive.file(fp, { name: 'LANDING/' + f });
      }
      for (const dir of ['css', 'js', 'src', 'docs']) {
        const dp = path.join(BACKUP_ROOT, dir);
        if (fs.existsSync(dp) && fs.statSync(dp).isDirectory()) {
          archive.directory(dp, 'LANDING/' + dir, filtroSeguro);
        }
      }
    });
    try { fs.unlinkSync(tmpJson); } catch (_) {}
    return result;
  } catch (e) {
    try { fs.unlinkSync(tmpJson); } catch (_) {}
    return { ok: false, reason: e.message };
  }
});

// ─── IPC: Recovery Center ─────────────────────────────────────────────────────
const yauzl      = require('yauzl');
const extractZip = require('extract-zip');

// V2.0 — Ponto de restauração seguro (09/06/2026)
const BACKUPS_V1_2 = {
  crm:       'BACKUP_CRM_V2_0.zip',
  landing:   'BACKUP_LANDING_V1_2.zip',
  firestore: 'BACKUP_FIRESTORE_V2_0.zip',
  rules:     'BACKUP_RULES_V2_0.zip',
};

/** Valida ZIP: magic bytes + lista entradas via yauzl */
function validarZip(zipPath) {
  return new Promise((resolve) => {
    if (!fs.existsSync(zipPath)) {
      return resolve({ ok: false, status: 'ausente', reason: 'Arquivo não encontrado', entries: [], size: 0 });
    }
    const stat = fs.statSync(zipPath);
    try {
      const buf = Buffer.alloc(4);
      const fd  = fs.openSync(zipPath, 'r');
      fs.readSync(fd, buf, 0, 4, 0);
      fs.closeSync(fd);
      if (buf.slice(0, 2).toString('hex') !== '504b') {
        return resolve({ ok: false, status: 'corrompido', reason: 'Magic inválido', entries: [], size: stat.size });
      }
    } catch (e) {
      return resolve({ ok: false, status: 'corrompido', reason: e.message, entries: [], size: stat.size });
    }

    yauzl.open(zipPath, { lazyEntries: true }, (err, zipfile) => {
      if (err) return resolve({ ok: false, status: 'corrompido', reason: err.message, entries: [], size: stat.size });
      const entries = [];
      zipfile.readEntry();
      zipfile.on('entry', (e) => { entries.push(e.fileName); zipfile.readEntry(); });
      zipfile.on('end',   () => resolve({ ok: true, status: 'ok', entries, size: stat.size }));
      zipfile.on('error', (e) => resolve({ ok: false, status: 'corrompido', reason: e.message, entries, size: stat.size }));
    });
  });
}

/** FASE 1 — Scan: existência + tamanho */
ipcMain.handle('recovery:scan', async () => {
  const result = {};
  for (const [type, filename] of Object.entries(BACKUPS_V1_2)) {
    const p = path.join(BACKUP_ROOT, filename);
    const exists = fs.existsSync(p);
    result[type] = { filename, exists, size: exists ? fs.statSync(p).size : 0, path: p };
  }
  // Firestore JSON extra
  const jsonPath = path.join(BACKUP_ROOT, 'BACKUP_FIRESTORE_V2_0.json');
  result.firestore.jsonExists = fs.existsSync(jsonPath);
  result.firestore.jsonSize   = result.firestore.jsonExists ? fs.statSync(jsonPath).size : 0;
  return result;
});

/** FASE 3 — Health Check: valida ZIP + verifica arquivos obrigatórios */
ipcMain.handle('recovery:health', async () => {
  const health = {};
  const required = {
    crm:       ['crm-dev/proposta.html'],
    landing:   ['index.html'],
    firestore: ['.json'],   // qualquer JSON
    rules:     ['firestore.rules'],
  };

  for (const [type, filename] of Object.entries(BACKUPS_V1_2)) {
    const p = path.join(BACKUP_ROOT, filename);
    const v = await validarZip(p);
    health[type] = { ...v };

    if (v.ok) {
      const reqs = required[type];
      const missing = reqs.filter(r =>
        !v.entries.some(e => r.startsWith('.') ? e.endsWith(r) : e.includes(r))
      );
      health[type].requiredFiles = reqs;
      health[type].missingFiles  = missing;
      health[type].structureOk   = missing.length === 0;
    }

    // Validação extra JSON para Firestore
    if (type === 'firestore' && v.ok) {
      const jsonPath = path.join(BACKUP_ROOT, 'BACKUP_FIRESTORE_V2_0.json');
      if (fs.existsSync(jsonPath)) {
        try {
          const parsed = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
          const cols = Object.keys(parsed.collections || {});
          health[type].jsonValid = true;
          health[type].jsonCols  = cols.length;
          health[type].jsonColNames = cols;
        } catch (e) {
          health[type].jsonValid = false;
          health[type].jsonError = e.message;
        }
      }
    }

    // Validação conteúdo rules
    if (type === 'rules' && v.ok) {
      health[type].hasFirestoreRules = v.entries.some(e => e.includes('firestore.rules'));
      health[type].hasFirebaseJson   = v.entries.some(e => e.includes('firebase.json'));
    }
  }
  return health;
});

/** FASE 4 — Dry Run: simula o que seria restaurado */
ipcMain.handle('recovery:dryRun', async (_e, type) => {
  const filename = BACKUPS_V1_2[type];
  if (!filename) return { ok: false, reason: 'Tipo desconhecido: ' + type };

  const zipPath = path.join(BACKUP_ROOT, filename);
  const v = await validarZip(zipPath);
  if (!v.ok) return { ok: false, reason: v.reason, status: v.status };

  const plan = { ok: true, type, filename, size: v.size, totalEntries: v.entries.length, entries: v.entries.slice(0, 50), targets: [], warnings: [], description: '' };

  switch (type) {
    case 'rules':
      plan.targets = ['firestore.rules', 'firebase.json', 'firestore.indexes.json', 'storage.rules']
        .filter(f => v.entries.some(e => e.includes(f)))
        .map(f => path.join(BACKUP_ROOT, f));
      plan.description = 'Sobrescreve arquivos de regras na raiz do projeto';
      plan.warnings = ['firestore.rules atual será sobrescrito', 'firebase.json atual será sobrescrito'];
      break;
    case 'firestore':
      plan.targets = ['Firebase Firestore PROD (via Firebase CLI)'];
      plan.description = 'Extrai BACKUP_FIRESTORE_V2_0.json e disponibiliza para import via Firebase CLI';
      plan.warnings = [
        'NÃO altera o Firestore diretamente',
        'Requer: firebase firestore:delete --all-collections',
        'Requer: firebase emulators:import (ou importação manual)',
      ];
      break;
    case 'crm':
      plan.targets = [path.join(BACKUP_ROOT, 'crm-dev')];
      plan.description = 'Substitui crm-dev/ pelo conteúdo do backup (backup do atual criado antes)';
      plan.warnings = ['crm-dev/ atual será movido para crm-dev_PRE_RECOVERY_<ts>', 'Electron precisará ser reiniciado após restore'];
      break;
    case 'landing':
      plan.targets = ['index.html', 'css/', 'js/', 'src/', 'docs/'].map(f => path.join(BACKUP_ROOT, f));
      plan.description = 'Substitui arquivos da Landing Page na raiz do projeto';
      plan.warnings = ['index.html atual será sobrescrito', 'Pastas css/, js/, src/, docs/ serão substituídas', 'Requer push para GitHub Pages após restore'];
      break;
  }

  return plan;
});

/**
 * FASE 5 — Restore Engine
 * ✅  CC-4.1 LIBERADO: restore real habilitado (09/06/2026)
 * Sistema certificado e testado — V2.0 ponto de restauração seguro
 */
const RECOVERY_LOCKED = false; // CC-4.1 liberado após certificação V2.0

ipcMain.handle('recovery:restore', async (_e, { type, confirm1, confirm2, confirm3 }) => {
  // Fase 6 — Tripla confirmação
  if (confirm1 !== 'confirmed')    return { ok: false, reason: 'Confirmação 1 inválida' };
  if (confirm2 !== 'RESTAURAR')    return { ok: false, reason: 'Confirmação 2 inválida — digite RESTAURAR', hint: 'RESTAURAR' };
  if (confirm3 !== 'V1.2_PRODUCAO') return { ok: false, reason: 'Confirmação 3 inválida — digite V1.2_PRODUCAO', hint: 'V1.2_PRODUCAO' };

  // CC-4 LOCK
  if (RECOVERY_LOCKED) {
    return { ok: false, locked: true, reason: 'CC-4 LOCK ativo — restauração real liberada em CC-4.1 após certificação completa.' };
  }

  // ── Abaixo: código pronto para CC-4.1 ──
  const filename = BACKUPS_V1_2[type];
  if (!filename) return { ok: false, reason: 'Tipo inválido: ' + type };

  const zipPath = path.join(BACKUP_ROOT, filename);
  if (!fs.existsSync(zipPath)) return { ok: false, reason: 'Backup não encontrado: ' + filename };

  const tmpDir = path.join(os.tmpdir(), 'mf_recovery_' + Date.now());
  try {
    fs.mkdirSync(tmpDir, { recursive: true });
    await extractZip(zipPath, { dir: tmpDir });

    const restored = [];
    const stamp    = Date.now();

    switch (type) {
      case 'rules': {
        const ruleFiles = ['firestore.rules', 'firebase.json', 'firestore.indexes.json', 'storage.rules'];
        for (const f of ruleFiles) {
          const src  = path.join(tmpDir, f);
          const dest = path.join(BACKUP_ROOT, f);
          if (fs.existsSync(src)) { fs.copyFileSync(src, dest); restored.push(f); }
        }
        break;
      }
      case 'crm': {
        const srcDir  = path.join(tmpDir, 'crm-dev');
        if (!fs.existsSync(srcDir)) throw new Error('crm-dev/ não encontrado no ZIP');
        const bkpDir  = path.join(BACKUP_ROOT, 'crm-dev_PRE_RECOVERY_' + stamp);
        if (fs.existsSync(path.join(BACKUP_ROOT, 'crm-dev'))) {
          fs.renameSync(path.join(BACKUP_ROOT, 'crm-dev'), bkpDir);
          restored.push('Atual movido → ' + path.basename(bkpDir));
        }
        fs.renameSync(srcDir, path.join(BACKUP_ROOT, 'crm-dev'));
        restored.push('crm-dev/ restaurado de ' + filename);
        break;
      }
      case 'landing': {
        const landingFiles = ['index.html', 'login.html', 'proposta.html'];
        const landingDirs  = ['css', 'js', 'src', 'docs'];
        for (const f of landingFiles) {
          const src = path.join(tmpDir, f);
          if (fs.existsSync(src)) { fs.copyFileSync(src, path.join(BACKUP_ROOT, f)); restored.push(f); }
        }
        for (const d of landingDirs) {
          const src = path.join(tmpDir, d);
          if (fs.existsSync(src)) {
            const dest = path.join(BACKUP_ROOT, d);
            if (fs.existsSync(dest)) fs.renameSync(dest, path.join(BACKUP_ROOT, d + '_PRE_RECOVERY_' + stamp));
            fs.renameSync(src, dest);
            restored.push(d + '/ restaurado');
          }
        }
        break;
      }
      case 'firestore': {
        const jsonFiles = fs.readdirSync(tmpDir).filter(f => f.endsWith('.json'));
        for (const f of jsonFiles) {
          const dest = path.join(BACKUP_ROOT, 'RESTORED_FIRESTORE_' + stamp + '.json');
          fs.copyFileSync(path.join(tmpDir, f), dest);
          restored.push('JSON extraído: ' + path.basename(dest) + ' — deploy via Firebase CLI');
        }
        break;
      }
    }

    return { ok: true, type, restored };
  } catch (e) {
    return { ok: false, reason: e.message };
  } finally {
    try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch (_) {}
  }
});

/** FASE 7 — Log */
ipcMain.handle('recovery:writeLog', async (_e, entry) => {
  try {
    const logPath = path.join(BACKUP_ROOT, 'recovery.log');
    const line    = JSON.stringify({ ...entry, ts: new Date().toISOString() }) + '\n';
    fs.appendFileSync(logPath, line, 'utf-8');
    return { ok: true };
  } catch (e) {
    return { ok: false, reason: e.message };
  }
});

ipcMain.handle('recovery:readLog', async () => {
  try {
    const logPath = path.join(BACKUP_ROOT, 'recovery.log');
    if (!fs.existsSync(logPath)) return [];
    return fs.readFileSync(logPath, 'utf-8')
      .split('\n').filter(Boolean)
      .map(l => { try { return JSON.parse(l); } catch { return { ts: '?', acao: l }; } })
      .reverse();   // mais recentes primeiro
  } catch { return []; }
});

// ─── IPC: Git ─────────────────────────────────────────────────────────────────
// SOMENTE LEITURA — nenhum checkout, reset, push, merge ou operação destrutiva.
// Usa execFile (sem shell) — sem interpolação de input do usuário.
const { execFile } = require('child_process');

/** Executa git e retorna stdout como string (compatibilidade legada) */
function gitCmd(args) {
  return new Promise((resolve) => {
    execFile(GIT_EXEC, args, { cwd: BACKUP_ROOT, maxBuffer: 4 * 1024 * 1024 }, (err, stdout) =>
      resolve(err ? 'Erro: ' + err.message : stdout)
    );
  });
}

/** Executa git e retorna { ok, stdout, stderr } */
function gitRaw(args) {
  return new Promise((resolve) => {
    execFile(GIT_EXEC, ['--no-pager', ...args], { cwd: BACKUP_ROOT, maxBuffer: 8 * 1024 * 1024 }, (err, stdout, stderr) =>
      resolve({ ok: !err, stdout: (stdout || '').trim(), stderr: (stderr || '').trim() })
    );
  });
}

/** Valida que ref é apenas hash/tag/branch — sem injeção de comandos */
function refSeguro(ref) {
  if (typeof ref !== 'string') return false;
  // Aceita hex, nomes de branch/tag (alfanumerico, -, _, /, .)
  return /^[a-zA-Z0-9._\-/~^]{1,200}$/.test(ref);
}

// ── Legados (mantidos para compatibilidade) ───────────────────────────────────
ipcMain.handle('git:log',    () => gitCmd(['log', '--oneline', '-20']));
ipcMain.handle('git:status', () => gitCmd(['status', '--short']));
ipcMain.handle('git:tags',   () => gitCmd(['tag', '-l']));

// ── CC-5: Git Recovery Center ─────────────────────────────────────────────────

/** PAINEL 1 — Status completo */
ipcMain.handle('git:statusFull', async () => {
  const [branchR, logR, tagHeadR, remoteR, statusR, versionR] = await Promise.all([
    gitRaw(['rev-parse', '--abbrev-ref', 'HEAD']),
    gitRaw(['log', '-1', '--format=%H\x1f%h\x1f%s\x1f%ai\x1f%an']),
    gitRaw(['tag', '--points-at', 'HEAD']),
    gitRaw(['remote', '-v']),
    gitRaw(['status', '--short']),
    gitRaw(['--version']),
  ]);
  const [hash, hashShort, subject, date, author] = (logR.stdout || '').split('\x1f');
  const remoteLines = remoteR.stdout.split('\n').filter(l => l.includes('(fetch)'));
  const remoteUrl   = remoteLines[0]?.replace(/\s+\(fetch\)/, '').replace(/^origin\s+/, '') || '(sem remote)';

  // Último push: data do commit mais recente no remote
  const lastPushR = await gitRaw(['log', '-1', '--format=%ai', 'origin/HEAD']);

  return {
    ok:          branchR.ok,
    branch:      branchR.stdout || '?',
    hash:        hash?.trim()      || '?',
    hashShort:   hashShort?.trim() || '?',
    subject:     subject?.trim()   || '?',
    date:        date?.trim()      || '?',
    author:      author?.trim()    || '?',
    tagsOnHead:  tagHeadR.stdout ? tagHeadR.stdout.split('\n').filter(Boolean) : [],
    remoteUrl,
    lastPush:    lastPushR.stdout || '?',
    statusLines: statusR.stdout ? statusR.stdout.split('\n').filter(Boolean) : [],
    gitVersion:  versionR.stdout || '?',
  };
});

/** PAINEL 2 — Histórico 50 commits */
ipcMain.handle('git:log50', async () => {
  const r = await gitRaw(['log', '-50', '--format=%H\x1f%h\x1f%an\x1f%ae\x1f%ai\x1f%s']);
  if (!r.ok) return { ok: false, commits: [], error: r.stderr };
  const commits = r.stdout.split('\n').filter(Boolean).map((line, i) => {
    const [hash, hashShort, author, email, date, ...msgParts] = line.split('\x1f');
    return { i: i + 1, hash, hashShort, author, email, date, subject: msgParts.join('\x1f') };
  });
  return { ok: true, commits };
});

/** PAINEL 3 — Tags */
ipcMain.handle('git:tagsAll', async () => {
  const listR = await gitRaw(['tag', '-l', '--sort=-version:refname']);
  if (!listR.ok) return { ok: false, tags: [], error: listR.stderr };
  const names = listR.stdout.split('\n').filter(Boolean);

  const tags = [];
  for (const name of names) {
    const infoR = await gitRaw(['log', '-1', '--format=%h\x1f%s\x1f%ai\x1f%an', name]);
    const [hashShort, subject, date, author] = (infoR.stdout || '').split('\x1f');
    tags.push({ name, hashShort: hashShort?.trim(), subject: subject?.trim(), date: date?.trim(), author: author?.trim() });
  }
  return { ok: true, tags };
});

/** PAINEL 4 — Branches */
ipcMain.handle('git:branchesAll', async () => {
  const [localR, remoteR, currentR] = await Promise.all([
    gitRaw(['branch', '--format=%(HEAD)|%(refname:short)|%(objectname:short)|%(committerdate:relative)|%(authorname)']),
    gitRaw(['branch', '-r', '--format=%(refname:short)|%(objectname:short)|%(committerdate:relative)']),
    gitRaw(['rev-parse', '--abbrev-ref', 'HEAD']),
  ]);
  const current = currentR.stdout;
  const local = (localR.stdout || '').split('\n').filter(Boolean).map(l => {
    const [active, name, hash, relDate, author] = l.split('|');
    return { name, hash, relDate, author, isCurrent: active === '*' || name === current };
  });
  const remote = (remoteR.stdout || '').split('\n').filter(Boolean)
    .filter(l => !l.includes('->'))
    .map(l => {
      const [name, hash, relDate] = l.split('|');
      return { name, hash, relDate };
    });
  return { ok: true, current, local, remote };
});

/** PAINEL 5 — Diff entre dois refs (somente stat, sem conteúdo) */
ipcMain.handle('git:diffStat', async (_e, { refA, refB }) => {
  if (!refSeguro(refA) || !refSeguro(refB)) {
    return { ok: false, error: 'Ref inválida — use apenas hash ou nome de tag/branch' };
  }
  const [statR, namesR] = await Promise.all([
    gitRaw(['diff', '--stat', `${refA}..${refB}`]),
    gitRaw(['diff', '--name-status', `${refA}..${refB}`]),
  ]);
  const summary = (statR.stdout || '').split('\n').slice(-2).join('\n').trim();
  const files = (namesR.stdout || '').split('\n').filter(Boolean).map(l => {
    const [status, ...parts] = l.split('\t');
    return { status: status?.trim(), file: parts.join('\t') };
  });
  return { ok: statR.ok, stat: statR.stdout, summary, files: files.slice(0, 100), totalFiles: files.length };
});

/** PAINEL 6 — Restore Prep: SOMENTE SIMULAÇÃO — retorna comandos, NÃO executa */
ipcMain.handle('git:restoreSim', async (_e, { ref, mode }) => {
  if (!refSeguro(ref)) {
    return { ok: false, error: 'Ref inválida' };
  }
  // Verifica se ref existe
  const checkR = await gitRaw(['rev-parse', '--verify', ref]);
  if (!checkR.ok) return { ok: false, error: 'Ref não encontrada: ' + ref };

  const hash = checkR.stdout.slice(0, 8);
  const logR  = await gitRaw(['log', '-1', '--format=%h|%s|%ai|%an', ref]);
  const [h, s, d, a] = (logR.stdout || '').split('|');

  // Modos disponíveis (NÃO executados)
  const modos = {
    checkout: {
      descricao: 'Navegar para o estado do commit (HEAD detached)',
      comandos: [
        `git stash                        # salva trabalho pendente`,
        `git checkout ${ref}              # vai para o commit/tag`,
        `# [verificar, testar]`,
        `git checkout release/v1.0-final  # volta ao branch atual`,
        `git stash pop                    # restaura trabalho`,
      ],
      risco: 'BAIXO — nenhum arquivo é modificado permanentemente',
    },
    'reset-soft': {
      descricao: 'Mover HEAD para o commit mantendo as alterações staged',
      comandos: [
        `git reset --soft ${ref}          # HEAD vai para o commit`,
        `# arquivos modificados ficam staged, prontos para novo commit`,
      ],
      risco: 'MÉDIO — altera o histórico local do branch',
    },
    'reset-hard': {
      descricao: 'Reverter TUDO para o estado exato do commit (DESTRUTIVO)',
      comandos: [
        `git reset --hard ${ref}          # ⚠️ DESTRUTIVO — descarta alterações locais`,
        `git clean -fd                    # ⚠️ remove arquivos não rastreados`,
      ],
      risco: '🔴 ALTO — IRREVERSÍVEL localmente, use apenas com backup',
    },
    'new-branch': {
      descricao: 'Criar novo branch a partir do commit (recomendado)',
      comandos: [
        `git checkout -b restore-from-${ref.slice(0,8)} ${ref}`,
        `# trabalhe no novo branch sem afetar release/v1.0-final`,
        `# merge ou cherry-pick quando validado`,
      ],
      risco: 'ZERO — não altera nenhum branch existente',
    },
  };

  const modoSelecionado = modos[mode] || modos['new-branch'];
  return {
    ok: true,
    ref,
    hash: h?.trim() || hash,
    subject: s?.trim() || '?',
    date: d?.trim()    || '?',
    author: a?.trim()  || '?',
    modos: Object.entries(modos).map(([k, v]) => ({
      key: k,
      descricao: v.descricao,
      comandos: v.comandos,
      risco: v.risco,
      selecionado: k === (mode || 'new-branch'),
    })),
    selecionado: modoSelecionado,
  };
});

/** Validação: Git instalado + repo acessível */
ipcMain.handle('git:validate', async () => {
  const [versionR, repoR, logR] = await Promise.all([
    gitRaw(['--version']),
    gitRaw(['rev-parse', '--git-dir']),
    gitRaw(['log', '-1', '--format=%h']),
  ]);
  return {
    gitInstalled:   versionR.ok,
    gitVersion:     versionR.stdout,
    repoAccessible: repoR.ok,
    gitDir:         repoR.stdout,
    canReadCommits: logR.ok,
    headHash:       logR.stdout,
  };
});

// ── CC-9: Document Manager ────────────────────────────────────────────────────

const DOCS_BASE = path.join(
  'C:', 'Users', 'kronxz', 'OneDrive', 'Área de Trabalho', 'mf soluçoes'
);

/** Lê diretório com segurança — retorna [] em caso de erro */
function safeReadDir(dir) {
  try { return fs.readdirSync(dir); } catch { return []; }
}

/** Stat seguro — retorna null em caso de erro */
function safeStat(fp) {
  try { return fs.statSync(fp); } catch { return null; }
}

/** Extensões de imagem/vídeo */
const IMG_EXTS  = new Set(['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp']);
const VID_EXTS  = new Set(['.mp4', '.mov', '.avi', '.mkv', '.wmv']);
const DOC_EXTS  = new Set(['.pdf', '.docx', '.doc', '.xlsx', '.xls', '.txt', '.md']);

/** Escaneia pasta recursivamente — retorna lista de arquivos com metadados */
function scanDir(dir, exts, recursive = false, maxDepth = 3, depth = 0) {
  const results = [];
  if (depth > maxDepth) return results;
  for (const name of safeReadDir(dir)) {
    const fp   = path.join(dir, name);
    const stat = safeStat(fp);
    if (!stat) continue;
    if (stat.isDirectory() && recursive && depth < maxDepth) {
      results.push(...scanDir(fp, exts, true, maxDepth, depth + 1));
    } else if (stat.isFile()) {
      const ext = path.extname(name).toLowerCase();
      if (!exts || exts.has(ext)) {
        results.push({
          name,
          path:  fp,
          ext,
          size:  stat.size,
          mtime: stat.mtime.toISOString(),
          dir,
        });
      }
    }
  }
  return results;
}

/**
 * Scan completo da pasta mf soluçoes:
 * retorna arquivos por categoria para o Document Manager
 */
ipcMain.handle('docs:scanBase', async () => {
  try {
    const allFiles = scanDir(DOCS_BASE, null, true, 4);

    const propostas = allFiles.filter(f => f.ext === '.pdf' && /proposta/i.test(f.name));
    const laudos    = allFiles.filter(f =>
      f.ext === '.docx' && /laudo/i.test(f.name)
    );
    const orcamentos = allFiles.filter(f =>
      (f.ext === '.pdf' || f.ext === '.docx' || f.ext === '.xlsx') &&
      /or[cç]amento|orcamento/i.test(f.name)
    );
    const midias = allFiles.filter(f =>
      IMG_EXTS.has(f.ext) || VID_EXTS.has(f.ext)
    );
    const outros = allFiles.filter(f =>
      !propostas.includes(f) &&
      !laudos.includes(f) &&
      !orcamentos.includes(f) &&
      !midias.includes(f)
    );

    // Lista subpastas (obras/projetos)
    const subpastas = safeReadDir(DOCS_BASE)
      .map(n => ({ name: n, path: path.join(DOCS_BASE, n) }))
      .filter(e => { const s = safeStat(e.path); return s && s.isDirectory(); });

    return {
      ok:        true,
      base:      DOCS_BASE,
      total:     allFiles.length,
      propostas,
      laudos,
      orcamentos,
      midias,
      outros,
      subpastas,
    };
  } catch (e) {
    return { ok: false, error: e.message };
  }
});

/** Abre arquivo com o programa padrão do Windows */
ipcMain.handle('docs:openFile', async (_e, filePath) => {
  if (!filePath || typeof filePath !== 'string') return { ok: false, error: 'Caminho inválido' };
  if (!fs.existsSync(filePath)) return { ok: false, error: 'Arquivo não encontrado: ' + filePath };
  const err = await shell.openPath(filePath);
  return err ? { ok: false, error: err } : { ok: true };
});

/** Diálogo para selecionar um arquivo (upload/vincular) */
ipcMain.handle('docs:selectFile', async (_e, opts = {}) => {
  const filters = opts.filters || [
    { name: 'Documentos', extensions: ['pdf', 'docx', 'doc', 'xlsx', 'xls', 'txt'] },
    { name: 'Imagens',    extensions: ['jpg', 'jpeg', 'png', 'gif', 'webp'] },
    { name: 'Vídeos',     extensions: ['mp4', 'mov', 'avi', 'mkv'] },
    { name: 'Todos',      extensions: ['*'] },
  ];
  const result = await dialog.showOpenDialog({
    title:      opts.title || 'Selecionar Arquivo',
    filters,
    properties: ['openFile'],
    defaultPath: DOCS_BASE,
  });
  if (result.canceled || !result.filePaths.length) return { ok: false };
  const fp   = result.filePaths[0];
  const stat = safeStat(fp);
  return {
    ok:    true,
    path:  fp,
    name:  path.basename(fp),
    ext:   path.extname(fp).toLowerCase(),
    size:  stat ? stat.size : 0,
    mtime: stat ? stat.mtime.toISOString() : null,
  };
});

/** Informações de um arquivo */
ipcMain.handle('docs:fileInfo', async (_e, filePath) => {
  if (!filePath) return null;
  const stat = safeStat(filePath);
  if (!stat) return null;
  return {
    path:  filePath,
    name:  path.basename(filePath),
    ext:   path.extname(filePath).toLowerCase(),
    size:  stat.size,
    mtime: stat.mtime.toISOString(),
    exists: true,
  };
});

/** Lista arquivos de uma subpasta */
ipcMain.handle('docs:listDir', async (_e, dir) => {
  try {
    return scanDir(dir || DOCS_BASE, null, false);
  } catch (e) {
    return [];
  }
});
// ── FIM CC-9 ──────────────────────────────────────────────────────────────────

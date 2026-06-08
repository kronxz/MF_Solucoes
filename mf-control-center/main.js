/**
 * main.js — MF Control Center
 * Electron Main Process
 * NÃO modifica crm-dev/, firestore.rules, firebase.json do CRM.
 */

const { app, BrowserWindow, ipcMain, shell, dialog } = require('electron');
const path  = require('path');
const fs    = require('fs');

const isDev = process.env.NODE_ENV === 'development';

// ─── Janela Principal ──────────────────────────────────────────────────────────
function createWindow() {
  const win = new BrowserWindow({
    width:     1280,
    height:    800,
    minWidth:  1024,
    minHeight: 680,
    webPreferences: {
      preload:         path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration:  false,
      webSecurity:      true,
    },
    backgroundColor: '#0f172a',
    title:           'MF Control Center',
    show:            false,
  });

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

// ─── IPC: Git ─────────────────────────────────────────────────────────────────
// Usa execFile (sem shell) — sem interpolação de input do usuário
const { execFile } = require('child_process');

function gitCmd(args) {
  return new Promise((resolve) => {
    execFile('git', args, { cwd: BACKUP_ROOT }, (err, stdout) =>
      resolve(err ? 'Erro: ' + err.message : stdout)
    );
  });
}

ipcMain.handle('git:log',    () => gitCmd(['log', '--oneline', '-20']));
ipcMain.handle('git:status', () => gitCmd(['status', '--short']));
ipcMain.handle('git:tags',   () => gitCmd(['tag', '-l']));

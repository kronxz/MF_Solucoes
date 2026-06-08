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

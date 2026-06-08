/**
 * updateService.js — MF Control Center
 * Serviço de Atualização Automática — ARQUITETURA PREPARADA
 *
 * Status: NÃO IMPLEMENTADO (Fase CC-3 estrutura).
 * Implementar quando: distribuição pública iniciar via GitHub Releases.
 *
 * Dependência necessária (quando ativar):
 *   npm install electron-updater --save
 *
 * GitHub Release URL esperada:
 *   https://github.com/[org]/mf-control-center/releases/latest
 */

// const { autoUpdater } = require('electron-updater');
// const { app, BrowserWindow } = require('electron');

// ─── Configuração (ativar quando implementar) ──────────────────────────────────
/*
autoUpdater.autoDownload        = false; // Download manual — não forçar
autoUpdater.autoInstallOnAppQuit = true;  // Instala ao fechar o app

autoUpdater.setFeedURL({
  provider: 'github',
  owner:    'mf-solucoes',
  repo:     'mf-control-center',
  private:  false,
});
*/

// ─── Eventos (ativar quando implementar) ──────────────────────────────────────
/*
autoUpdater.on('checking-for-update', () => {
  sendUpdateStatus('Verificando atualizações...');
});

autoUpdater.on('update-available', (info) => {
  sendUpdateStatus('Atualização disponível: v' + info.version);
  // Perguntar ao usuário antes de baixar
});

autoUpdater.on('update-not-available', () => {
  sendUpdateStatus('Você está na versão mais recente.');
});

autoUpdater.on('download-progress', (progress) => {
  sendUpdateStatus('Baixando: ' + Math.round(progress.percent) + '%');
});

autoUpdater.on('update-downloaded', (info) => {
  sendUpdateStatus('Pronto para instalar: v' + info.version);
  // Notificar renderer para exibir botão "Reiniciar e Atualizar"
});

autoUpdater.on('error', (err) => {
  console.error('[UpdateService] Erro:', err.message);
});
*/

// ─── Helpers ──────────────────────────────────────────────────────────────────
/*
function sendUpdateStatus(msg) {
  const win = BrowserWindow.getAllWindows()[0];
  if (win) win.webContents.send('update:status', msg);
}
*/

// ─── Verificação periódica (a cada 4 horas) ───────────────────────────────────
/*
function startUpdateCheck() {
  autoUpdater.checkForUpdates();
  setInterval(() => autoUpdater.checkForUpdates(), 4 * 60 * 60 * 1000);
}
*/

// ─── Exportação (quando ativar no main.js) ────────────────────────────────────
/*
module.exports = { startUpdateCheck };
*/

// Placeholder enquanto não implementado
module.exports = {
  startUpdateCheck: () => {
    console.log('[UpdateService] Auto-update não implementado nesta fase.');
  },
};

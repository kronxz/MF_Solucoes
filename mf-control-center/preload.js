/**
 * preload.js — MF Control Center
 * Context Bridge: expõe somente as APIs necessárias ao renderer.
 * NÃO expõe Node.js diretamente.
 */

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('MFControl', {

  // Utilitários do app
  getVersion:    () => ipcRenderer.invoke('app:version'),
  getPlatform:   () => ipcRenderer.invoke('app:platform'),
  openExternal:  (url) => ipcRenderer.invoke('shell:openExternal', url),

  // File System (listagem)
  fs: {
    listBackups: ()           => ipcRenderer.invoke('fs:listBackups'),
    readFile:    (filename)   => ipcRenderer.invoke('fs:readFile', filename),
    saveExport:  (opts)       => ipcRenderer.invoke('fs:saveExport', opts),
  },

  // Backup Center — 5 tipos
  backup: {
    firestore: (jsonData) => ipcRenderer.invoke('backup:firestore', jsonData),
    rules:     ()         => ipcRenderer.invoke('backup:rules'),
    crm:       ()         => ipcRenderer.invoke('backup:crm'),
    landing:   ()         => ipcRenderer.invoke('backup:landing'),
    completo:  (jsonData) => ipcRenderer.invoke('backup:completo', jsonData),
  },

  // Git (read-only)
  git: {
    log:    () => ipcRenderer.invoke('git:log'),
    status: () => ipcRenderer.invoke('git:status'),
    tags:   () => ipcRenderer.invoke('git:tags'),
  },

});

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
  getPaths:      () => ipcRenderer.invoke('app:paths'),
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

  // Git (read-only — CC-5 Git Recovery Center)
  git: {
    // Legados
    log:    () => ipcRenderer.invoke('git:log'),
    status: () => ipcRenderer.invoke('git:status'),
    tags:   () => ipcRenderer.invoke('git:tags'),
    // CC-5: Painéis completos
    statusFull:  ()              => ipcRenderer.invoke('git:statusFull'),
    log50:       ()              => ipcRenderer.invoke('git:log50'),
    tagsAll:     ()              => ipcRenderer.invoke('git:tagsAll'),
    branchesAll: ()              => ipcRenderer.invoke('git:branchesAll'),
    diffStat:    (refA, refB)    => ipcRenderer.invoke('git:diffStat',    { refA, refB }),
    restoreSim:  (ref, mode)     => ipcRenderer.invoke('git:restoreSim',  { ref, mode }),
    validate:    ()              => ipcRenderer.invoke('git:validate'),
  },

  // Recovery Center
  recovery: {
    scan:     ()            => ipcRenderer.invoke('recovery:scan'),
    health:   ()            => ipcRenderer.invoke('recovery:health'),
    dryRun:   (type)        => ipcRenderer.invoke('recovery:dryRun', type),
    restore:  (opts)        => ipcRenderer.invoke('recovery:restore', opts),
    writeLog: (entry)       => ipcRenderer.invoke('recovery:writeLog', entry),
    readLog:  ()            => ipcRenderer.invoke('recovery:readLog'),
  },

});

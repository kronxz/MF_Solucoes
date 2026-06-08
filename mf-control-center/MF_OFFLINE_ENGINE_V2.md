# MF Offline Engine V2 — Documentação Técnica

**Status:** ROADMAP — NÃO IMPLEMENTADO  
**Escopo:** MF Control Center (Electron) + CRM Web  
**Data:** 2026-06-08  
**Versão base:** V1.3 CRM Embutido  

---

## Objetivo

Permitir que o MF Control Center opere sem conexão à internet:
- Ler e registrar leads offline
- Sincronizar dados ao restaurar conexão
- Garantir que nenhum dado seja perdido durante instabilidades de rede

**Produção NÃO alterada.** Esta arquitetura é implementada somente no Electron.

---

## 1. Armazenamento Local — SQLite

### Biblioteca
```
npm install better-sqlite3
```

### Arquivo de banco
```
%APPDATA%\MF Control Center\mf-local.db
```

### Schema inicial

```sql
-- Leads capturados offline
CREATE TABLE IF NOT EXISTS leads_offline (
  id          TEXT PRIMARY KEY,
  payload     TEXT NOT NULL,          -- JSON do documento Firestore
  colecao     TEXT NOT NULL,          -- 'leads' ou 'lp_leads'
  criado_em   INTEGER NOT NULL,       -- timestamp local
  sincronizado INTEGER DEFAULT 0      -- 0=pendente, 1=sincronizado
);

-- Fila de operações pendentes
CREATE TABLE IF NOT EXISTS sync_queue (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  operacao    TEXT NOT NULL,          -- 'addDoc' | 'updateDoc' | 'setDoc'
  colecao     TEXT NOT NULL,
  doc_id      TEXT,                   -- null para addDoc
  payload     TEXT NOT NULL,
  tentativas  INTEGER DEFAULT 0,
  criado_em   INTEGER NOT NULL,
  erro_ultimo TEXT
);

-- Log de sincronização
CREATE TABLE IF NOT EXISTS sync_log (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  evento      TEXT NOT NULL,
  detalhes    TEXT,
  ts          INTEGER NOT NULL
);
```

---

## 2. Sync Queue — Operações Pendentes

### Fluxo de escrita offline

```
Usuário cria lead
  → SyncQueue.enqueue({ op: 'addDoc', col: 'leads', payload })
  → SQLite: INSERT INTO sync_queue
  → UI feedback: "Salvo localmente"

Conexão restaurada
  → SyncEngine.processQueue()
    → Para cada item na fila (ORDER BY criado_em ASC):
      → Executar operação no Firestore
      → Se sucesso: marcar sincronizado, remover da fila
      → Se falha: incrementar tentativas, registrar erro
```

### Interface IPC (main.js → renderer)

```javascript
// main.js
ipcMain.handle('sync:enqueue', (_e, item) => SyncQueue.enqueue(item));
ipcMain.handle('sync:status',  ()           => SyncQueue.getStatus());
ipcMain.handle('sync:flush',   ()           => SyncEngine.processQueue());
```

---

## 3. Detecção de Conectividade

```javascript
// services/connectivityService.js

const dns   = require('dns');
const CHECK_HOST = 'firestore.googleapis.com';
const CHECK_MS   = 30_000; // verifica a cada 30s

function isOnline() {
  return new Promise(resolve =>
    dns.lookup(CHECK_HOST, err => resolve(!err))
  );
}

// Ao detectar online:
//   1. Emite evento 'connection:restored'
//   2. SyncEngine.processQueue() automaticamente
//   3. Notifica renderer via webContents.send('connection:status', true)
```

---

## 4. Resolução de Conflitos

### Estratégia: Last-Write-Wins com timestamp local

```
Regra padrão:
  Se documento existe no Firestore E foi atualizado depois da operação offline
  → Merge: campos offline sobrescrevem somente campos modificados localmente
  → Campos remotos que não foram tocados offline: preservados

Campos protegidos (nunca sobrescrever):
  createdAt, lastAction, status (se mudou remotamente)

Campos sempre do offline:
  observacoes, dados do formulário preenchidos pelo usuário
```

### Tabela de decisão

| Situação | Ação |
|---|---|
| Doc não existe remotamente | Criar via addDoc |
| Doc existe, offline mais recente | Merge com setDoc({merge:true}) |
| Doc existe, remoto mais recente | Descartar offline, notificar usuário |
| Conflito crítico (status mudou) | Mover para `conflitos` — revisão manual |

---

## 5. Retry com Backoff Exponencial

```javascript
// services/retryService.js

const MAX_TENTATIVAS = 5;
const BASE_DELAY_MS  = 1_000;

async function comRetry(fn, tentativas = 0) {
  try {
    return await fn();
  } catch (err) {
    if (tentativas >= MAX_TENTATIVAS) throw err;
    const delay = BASE_DELAY_MS * Math.pow(2, tentativas);
    await new Promise(r => setTimeout(r, delay));
    return comRetry(fn, tentativas + 1);
  }
}
// Delays: 1s → 2s → 4s → 8s → 16s → falha permanente
```

---

## 6. Merge — Sincronização Final

```javascript
// services/mergeService.js

async function mergeDocumento(colecao, docId, payloadOffline) {
  const ref = doc(db, colecao, docId);
  const snap = await getDoc(ref);

  if (!snap.exists()) {
    await setDoc(ref, payloadOffline);
    return { acao: 'criado' };
  }

  const remoto = snap.data();
  const merged  = { ...remoto, ...payloadOffline };
  // Preserva campos protegidos do Firestore
  merged.createdAt  = remoto.createdAt;
  merged.lastAction = serverTimestamp();

  await updateDoc(ref, merged);
  return { acao: 'merged' };
}
```

---

## 7. Implementação — Fases Sugeridas

| Fase | Escopo | Estimativa |
|---|---|---|
| O-1 | SQLite + SyncQueue básico | 4h |
| O-2 | ConnectivityService + auto-flush | 2h |
| O-3 | RetryService + backoff | 2h |
| O-4 | MergeService + conflitos | 4h |
| O-5 | UI de status offline (indicator na sidebar) | 2h |
| O-6 | Testes de instabilidade de rede | 3h |

**Total estimado:** ~17h de desenvolvimento

---

## 8. Dependências (quando implementar)

```json
{
  "better-sqlite3": "^9.0.0",
  "electron-store":  "^8.0.0"
}
```

---

## Restrições

- NÃO implementar até V1.3 estar estável em produção
- NÃO alterar estrutura de coleções do Firestore
- NÃO alterar Firestore Rules
- NÃO usar Firebase Local Emulator (produção apenas)
- Dados offline ficam EXCLUSIVAMENTE no SQLite local (nunca no Firestore direto)

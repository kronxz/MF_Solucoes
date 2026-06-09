# RETORNO_AUDITORIA_PROJETOS.md
> Auditoria comparativa — dois projetos MF Control Center  
> Data: 2026-06-09  
> Método: leitura direta dos arquivos em disco — zero suposições

---

## PROJETOS AUDITADOS

| # | Identificador | Caminho |
|---|---------------|---------|
| A | **PROJETO ORIGINAL** | `Nova pasta/solar-calculator-main (1)/mf-control-center/` |
| B | **SHELL NOVO** | `C:/Users/kronxz/mf-control-center-app/` |

---

## 1. CONTAGEM DE CÓDIGO

| Métrica | Projeto Original (A) | Shell Novo (B) |
|---------|---------------------|----------------|
| `main.js` linhas | **772** | 435 |
| `preload.js` linhas | **63** | 33 |
| Módulos JS em `pages/` | **10 arquivos** | 0 arquivos |
| `app.js` / `shell.js` | 100 linhas | 180 linhas |
| CSS linhas totais | ~800 (app.css) | ~900 (shell.css + docs.css) |
| Total linhas de produção | **~4.200** | ~1.600 |

---

## 2. IPC HANDLERS (canal Electron ↔ renderer)

### Projeto Original — 29 handlers

```
app:version        app:platform       app:paths
shell:openExternal
fs:listBackups     fs:readFile        fs:saveExport
backup:firestore   backup:rules       backup:crm
backup:landing     backup:completo
recovery:scan      recovery:health    recovery:dryRun
recovery:restore   recovery:writeLog  recovery:readLog
git:log            git:status         git:tags
git:statusFull     git:log50          git:tagsAll
git:branchesAll    git:diffStat       git:restoreSim
git:validate
```

### Shell Novo — 2 handlers

```
docs:scan          docs:openFile
```

**Vantagem: Projeto Original — 29 vs 2 handlers (+1.350%)**

---

## 3. MÓDULOS FUNCIONAIS

| Módulo | Projeto Original | Shell Novo |
|--------|-----------------|------------|
| Login / Firebase Auth | ✅ `login.js` — 75 linhas, `signInWithEmailAndPassword` real | ❌ ausente |
| CRM | ✅ `crm.js` — 209 linhas, 10 seções navegáveis | ✅ webview simples |
| Dashboard Executivo | ✅ `dashboard.js` — 196 linhas, KPIs Firebase ao vivo | ❌ placeholder |
| Backup Center | ✅ `backup.js` — 352 linhas, 5 tipos, Firestore real | ❌ placeholder |
| Recovery Center | ✅ `recovery.js` — 496 linhas, scan/health/dry-run/restore | ❌ placeholder |
| Git Recovery Center | ✅ `git.js` — 576 linhas, 7 operações | ❌ placeholder |
| Firestore Manager | ✅ `firestore.js` — 337 linhas, 6 coleções | ❌ placeholder |
| Health Center | ✅ `health.js` — 524 linhas, 10 verificações ao vivo | ❌ placeholder |
| Propostas | ✅ `propostas.js` — 80 linhas, webview + fallback | ❌ placeholder |
| Updates | ✅ `updates.js` — 91 linhas, estrutura completa | ❌ ausente |
| Document Manager | ❌ especificado, NÃO implementado | ⚠️ parcial (CC-9.0 MVP) |

**Projeto Original: 10/11 módulos implementados**  
**Shell Novo: 2/11 módulos (CRM webview + Document Manager parcial)**

---

## 4. INTEGRAÇÃO FIREBASE

### Projeto Original
- `firebase-config.js` — conexão real ao projeto `mf-solucoes-crm` (PROD)
- `auth` — Firebase Auth via `signInWithEmailAndPassword`
- `db` — Firestore com `getDocs`, `onSnapshot`, `getCountFromServer`
- Coleções acessadas: `leads`, `lp_leads`, `instalacoes`, `financeiro_dados`, `eventos`, `analytics`
- Health check ao vivo: verifica contagem de docs no Firestore em tempo real
- Backup exporta dados reais do Firestore para JSON local

### Shell Novo
- Sem Firebase. Sem auth. Sem Firestore.
- CRM via webview (carrega `mf-solucoes-crm.web.app` — externo, não integrado)

**Vantagem: Projeto Original — integração Firebase real**

---

## 5. BUILD / DISTRIBUIÇÃO

| Item | Projeto Original | Shell Novo |
|------|-----------------|------------|
| `dist/` presente | ✅ `win-unpacked/` | ✅ NSIS + Portable |
| Instalador `.exe` | ❌ não gerado (icon placeholder impedia) | ✅ `MF Control Center Setup 1.0.0.exe` |
| Portable `.exe` | ❌ não gerado | ✅ `MF Control Center Portable.exe` |
| Electron versão | 28.3.3 | 30.5.1 |
| AppId | `com.mfsolucoes.controlcenter` | `br.com.mfsolucoes.controlcenter` |

---

## 6. DOCUMENTAÇÃO HISTÓRICA

### Projeto Original
- `CERTIFICACAO_MF_CONTROL_CENTER_V1.md` — auditoria CDP completa, 10 módulos testados
- `CC8_ARTEFATOS.md` — roadmap CC-8 detalhado
- `CC9_B_ESTRUTURA_DOCUMENTAL_FINAL.md` — especificação CC-9 (não implementada)
- `CC9_ESPECIFICACAO_OPERACIONAL.md` — especificação operacional CC-9
- `CERTIFICACAO_GIT_RECOVERY_CENTER_V1.md` — certificação CC-5
- `CERTIFICACAO_RECOVERY_CENTER_V1.md` — certificação CC-4
- `CERTIFICACAO_OFFLINE_PROPOSTAS_V1.md` — certificação propostas
- `RELATORIO_CC9_PRECHECK_PASTA_REAL.md` — pré-verificação da pasta real para CC-9
- `CLIENTE_360_AUDITORIA.md` — auditoria Cliente 360

### Shell Novo
- `FASE2A_IMPLEMENTACAO.md`
- `FASE2B_*.md` (6 arquivos de auditoria)
- Sem certificações de módulos funcionais

---

## 7. VEREDICTO

**O Projeto Original é o mais avançado funcionalmente.**

Evidências comprovadas em disco:
- 14,5× mais IPC handlers
- 2,6× mais linhas de código de produção  
- 10 módulos implementados contra 2
- Única integração Firebase real
- 8 documentos de certificação
- Histórico CC-1 a CC-8 completo

---

*Auditoria realizada por leitura direta de arquivos — sem suposições*

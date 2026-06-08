# MF Soluções CRM — Versão Oficial V1.1
**Data de congelamento:** 07/06/2026  
**Branch:** RECUPERACAO_V1_1_ESTAVEL  
**Tag:** V1.1_ESTAVEL  
**Deploy:** https://mf-solucoes-crm.web.app  
**Projeto Firebase:** mf-solucoes-crm (PROD)

---

## O que foi corrigido nesta versão

### Raiz do problema (causa única de todos os erros)
O padrão `initializeApp(PROD_CONFIG, 'lp-prod')` criava um app Firebase secundário **sem autenticação** do usuário logado. As regras do Firestore exigem `request.auth != null`. Resultado: todas as operações em `lp_leads` falhavam com `FirebaseError: Missing or insufficient permissions`.

### Correções aplicadas

| Arquivo | Problema | Correção |
|---------|----------|----------|
| `crm-kanban.js` | `getLeadSource()` usava app `lp-prod` sem auth | Retorna `{ db: _db, collection: 'lp_leads' }` diretamente |
| `app.js` | Handler de kit usava `getFirestore(lp-prod)` | `const leadDb = db` (app primário autenticado) |
| `crm-trash.js` | `getProdDb()` retornava app secundário sem auth | Removida a função; usa `_db` direto |
| `crm-details.js` | `getLeadDb()` retornava `getFirestore(lp-prod)` | Sempre retorna `_db` |
| `crm-details.js` | Observações hardcoded para coleção `leads` | Usa `getLeadDb()` + `getLeadCollection()` |
| `crm-instalacoes.js` | `carregarLeadsMap()` sem filtro — exibia deletados/arquivados | Filtro `STATUS_ATIVOS` aplicado |
| `proposal-engine.js` | `document.title` estático "Proposta Solar" | `buildDocTitle()` com nome do cliente + NFD sanitize |
| `MF_Landing_V2/js/visit-tracking.js` | Arquivo referenciado em index.html mas inexistente (404) | Criado — registra visita em `landing_visits` |

### Operações agora funcionando
- Excluir lead da landing page (Kanban) ✅
- Arquivar lead da landing page ✅
- Selecionar Kit para lead da landing ✅
- Restaurar lead da lixeira (landing) ✅
- Excluir permanente da lixeira (landing) ✅
- Lixeira exibe leads de ambas as coleções ✅
- Editar campos de leads landing ✅
- Salvar observações em leads landing ✅
- Instalações filtradas (só leads ativos) ✅
- Nome do PDF da proposta dinâmico (PROPOSTA_SOLAR_NOME_ID) ✅
- Visitas de landing registradas em `landing_visits` ✅

---

## Arquitetura Firebase (imutável)

| Coleção | Projeto | Quem escreve | Quem lê |
|---------|---------|-------------|---------|
| `leads` | mf-solucoes-crm | Calculadora (auth) | CRM (auth) |
| `lp_leads` | mf-solucoes-crm | Landing Page (público, regras) | CRM (auth) |
| `landing_visits` | mf-solucoes-crm | Landing Page (público, regras) | CRM (auth) |
| `instalacoes` | mf-solucoes-crm | CRM (auth) | CRM (auth) |
| `financeiro_dados` | mf-solucoes-crm | CRM (auth) | CRM (auth) |

---

## Deploy

**CRM:** Firebase Hosting — `firebase deploy --only hosting --project mf-solucoes-crm`  
**Landing:** GitHub Pages — branch `origin/main` (pendente merge de `visit-tracking.js`)

---

## Pendências pós-V1.1

1. **Landing Page — visit-tracking.js em produção:** Criar PR no GitHub de `RECUPERACAO_OFICIAL_MF_2026_06` → `main` para resolver o 404 em produção.

---

## Commits incluídos

| Hash | Descrição |
|------|-----------|
| `fb46e9d` | fix(crm): corrigir observacoes para leads landing (colecao errada) |
| `f0a0fd3` | fix(proposta): definir document.title dinamico para nome do PDF |
| `94c3bea` | fix(crm): estabilizacao final v1.0 — lixeira, detalhes, instalacoes |
| `8a11281` | fix(crm): corrigir salvarKit na SPA landing para usar db autenticado |
| `162173c` | fix(crm): corrigir excluir lead landing e selecionar kit |
| `d1a6641` | fix(auth): corrigir permissoes de arquivamento e qr codes |
| `5370587` | fix(arquivo): usar db autenticado para arquivar/restaurar leads landing |
| `8503dad` | feat(tracking): criar visit-tracking.js para landing_visits (Landing) |

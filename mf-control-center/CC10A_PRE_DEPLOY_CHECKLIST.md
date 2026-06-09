# CC10A_PRE_DEPLOY_CHECKLIST.md
> CC-10A — Validação Técnica Pré-Deploy  
> Data: 2026-06-09  
> Status: AGUARDANDO APROVAÇÃO DO MARCOS  

---

## 1. ARQUIVOS CRIADOS

| Arquivo | Caminho completo | Tamanho | Status |
|---------|-----------------|---------|--------|
| `index.js` | `MF_Solucoes/functions/index.js` | 9.677 bytes / 269 linhas | ✅ CRIADO |
| `package.json` | `MF_Solucoes/functions/package.json` | 314 bytes | ✅ CRIADO |
| `package-lock.json` | `MF_Solucoes/functions/package-lock.json` | 102.305 bytes (gerado pelo npm) | ✅ CRIADO |
| `node_modules/` | `MF_Solucoes/functions/node_modules/` | ~238 pacotes | ✅ CRIADO (local) |

> `node_modules/` **não vai para o deploy** — Firebase CLI ignora automaticamente via `.gitignore` padrão e empacota apenas o `package.json` para reinstalar no servidor.

---

## 2. ARQUIVOS ALTERADOS

| Arquivo | Tipo de alteração | Linhas afetadas |
|---------|------------------|-----------------|
| `MF_Solucoes/firebase.json` | Adição de seção `"functions"` no início | +4 linhas (novas) |

**Nenhum outro arquivo foi tocado.**  
CRM, Landing Page, Action Center, Bot WhatsApp, scoreService, leadService, firebase-leads.js — **todos intocados**.

---

## 3. DIFF COMPLETO DO firebase.json

### ANTES

```json
{
  "firestore": {
    "database": "(default)",
    "location": "southamerica-east1",
    "rules": "firestore.rules",
    "indexes": "firestore.indexes.json"
  },
  "hosting": { ... },
  "storage": {
    "rules": "storage.rules"
  }
}
```

### DEPOIS

```json
{
  "functions": {
    "source": "functions",
    "runtime": "nodejs18"
  },
  "firestore": {
    "database": "(default)",
    "location": "southamerica-east1",
    "rules": "firestore.rules",
    "indexes": "firestore.indexes.json"
  },
  "hosting": { ... },
  "storage": {
    "rules": "storage.rules"
  }
}
```

### Diff exato (linha a linha)

```diff
 {
+  "functions": {
+    "source": "functions",
+    "runtime": "nodejs18"
+  },
   "firestore": {
     "database": "(default)",
     "location": "southamerica-east1",
     "rules": "firestore.rules",
     "indexes": "firestore.indexes.json"
   },
   "hosting": { ... },
   "storage": {
     "rules": "storage.rules"
   }
 }
```

**4 linhas adicionadas. 0 linhas removidas. 0 linhas alteradas.**

---

## 4. CLOUD FUNCTIONS CRIADAS

### Inventário completo

```
grep "^exports\." functions/index.js

exports.alertarLeadLP  = functions...firestore.document('lp_leads/{leadId}').onCreate(...)
exports.alertarLeadCRM = functions...firestore.document('leads/{leadId}').onCreate(...)
```

**Total: 2 funções. Nenhuma outra.**

### Detalhamento

| Nome da função | Trigger | Coleção | Evento | Região |
|----------------|---------|---------|--------|--------|
| `alertarLeadLP` | Firestore | `lp_leads` | `onCreate` | `southamerica-east1` |
| `alertarLeadCRM` | Firestore | `leads` | `onCreate` | `southamerica-east1` |

---

## 5. CONFIRMAÇÃO: APENAS GATILHOS onCreate

```
grep "onCreate\|onUpdate\|onDelete\|onWrite" functions/index.js

Linha 260:  .onCreate((snap, context) => ...)   ← lp_leads
Linha 269:  .onCreate((snap, context) => ...)   ← leads
```

**Resultado:**

| Gatilho | Presente? |
|---------|:---------:|
| `onCreate` | ✅ SIM — apenas este |
| `onUpdate` | ❌ NÃO |
| `onDelete` | ❌ NÃO |
| `onWrite` (global) | ❌ NÃO |

---

## 6. CONFIRMAÇÃO: NENHUM TRIGGER PROIBIDO

```
grep -n "onUpdate\|onDelete\|onWrite" functions/index.js
→ [sem resultados]
```

**✅ Auditoria limpa. Zero triggers de update, delete ou write.**

---

## 7. CONFIRMAÇÃO: NENHUMA FUNÇÃO MODIFICA DOCUMENTOS

### Busca por operações de escrita Firestore no código

```
grep -n "\.set(\|\.update(\|\.add(\|\.delete(" functions/index.js
→ [sem resultados]

grep -n "collection(" functions/index.js
→ [sem resultados]

grep -n "admin\.firestore\|getFirestore\|getDatabase\|admin\.database" functions/index.js
→ [sem resultados]
```

**✅ Zero operações de escrita. Zero acesso à coleção via SDK Admin.**

O objeto `admin` é inicializado (`admin.initializeApp()`) pois é exigido pelo SDK do `firebase-functions` para bootstrap — mas nunca é usado para ler nem escrever dados.

---

## 8. CONFIRMAÇÃO: NENHUMA FUNÇÃO ESCREVE NO FIRESTORE

### Mapa completo do fluxo de dados

```
Firestore onCreate event
        ↓ snap.data() — LEITURA do documento recém-criado
normalizarLead(dados, colecao)
        ↓ processa campos localmente na memória
calcularPrioridade(dados, colecao)
        ↓ calcula localmente na memória
formatarMensagem(lead, prioridade, colecao)
        ↓ string local na memória
enviarTelegram(token, chatId, mensagem)
        ↓ POST https://api.telegram.org/...
                                        → Telegram
```

**O Firestore aparece APENAS como fonte do evento (leitura passiva do snap).**  
**Nenhum dado é gravado, atualizado ou deletado.**

---

## 9. CONFIRMAÇÃO: NENHUMA FUNÇÃO ALTERA O CRM

### Dependências externas do index.js

```javascript
const functions = require('firebase-functions');   // SDK Firebase Functions
const admin     = require('firebase-admin');        // SDK Admin (bootstrap apenas)
const https     = require('https');                  // Node.js nativo (HTTPS para Telegram)
```

**Nenhuma importação de:**
- `leadService.js` — ❌ não importado
- `scoreService.js` — ❌ não importado
- `firebase-leads.js` — ❌ não importado
- Qualquer arquivo do CRM — ❌ não importado
- Qualquer arquivo da Landing Page — ❌ não importado

**O destino da única chamada de rede é exclusivamente `api.telegram.org`:**

```javascript
hostname: 'api.telegram.org',
path:     `/bot${token}/sendMessage`,
```

---

## 10. ROLLBACK — PROCEDIMENTO COMPLETO

### O rollback é trivial e reversível em 60 segundos

#### Passo 1 — Remover seção functions do firebase.json

```json
// Remover estas 4 linhas do firebase.json:
"functions": {
  "source": "functions",
  "runtime": "nodejs18"
},
```

#### Passo 2 — Apagar diretório functions/

```bash
# Windows
rd /s /q "MF_Solucoes\functions"

# PowerShell
Remove-Item -Recurse -Force "MF_Solucoes\functions"
```

#### Passo 3 — (se já deployado) Desativar as funções no console

```
Firebase Console → Functions → alertarLeadLP → Excluir
Firebase Console → Functions → alertarLeadCRM → Excluir
```

Ou via CLI:

```bash
firebase functions:delete alertarLeadLP --region southamerica-east1
firebase functions:delete alertarLeadCRM --region southamerica-east1
```

### Garantia de rollback

> Após o rollback, o sistema volta ao estado de **antes da CC-10A**:
> - CRM: funcionando normalmente
> - Landing Page: funcionando normalmente
> - Action Center: funcionando normalmente
> - Firestore: sem alterações (as funções nunca escrevem dados)
> - Leads já criados: preservados (as funções nunca deletam)

---

## 11. ESTIMATIVA DE CUSTO MENSAL

### Plano Blaze (necessário para Cloud Functions)

O plano Blaze tem **free tier** generoso antes de cobrar:

| Recurso | Free Tier | Preço após free tier |
|---------|-----------|----------------------|
| Invocações | 2.000.000/mês | $0,40 por 1M |
| Tempo de processamento | 400.000 GB-seg/mês | $0,0000025/GB-seg |
| Rede de saída | 5 GB/mês | $0,12/GB |

### Perfil de uso MF Soluções

| Parâmetro | Valor estimado |
|-----------|---------------|
| Leads/mês (atual) | ~50–200 |
| Invocações/mês | 50–200 (1 por lead) |
| Duração média/invocação | ~800ms (processamento + chamada Telegram) |
| Memória/invocação | ~128 MB (padrão mínimo) |

### Cálculo (200 leads/mês — cenário pessimista atual)

```
Invocações:     200       vs  2.000.000 free → 0,01% do limite
Processamento:  200 × 0,8s × 0,128 GB = 20,48 GB-seg
                vs 400.000 free → 0,005% do limite
Rede saída:     200 × ~2 KB = 0,4 MB
                vs 5 GB free → 0,008% do limite
```

**CUSTO MENSAL ESTIMADO: R$ 0,00**

O uso está ~10.000× abaixo dos limites do free tier. Cobrança real só ocorreria com ~200.000 leads/mês.

---

## 12. SIMULAÇÃO DE EXECUÇÕES

### Simulação: 10 leads/mês

| Métrica | Valor |
|---------|-------|
| Invocações | 10 |
| Tempo total | ~8 segundos |
| GB-seg | 1,02 |
| Custo | R$ 0,00 |
| % do free tier usado | 0,0005% |

---

## 13. SIMULAÇÃO: 100 leads/mês

| Métrica | Valor |
|---------|-------|
| Invocações | 100 |
| Tempo total | ~80 segundos |
| GB-seg | 10,24 |
| Custo | R$ 0,00 |
| % do free tier usado | 0,005% |

---

## 14. SIMULAÇÃO: 1.000 leads/mês

| Métrica | Valor |
|---------|-------|
| Invocações | 1.000 |
| Tempo total | ~800 segundos |
| GB-seg | 102,4 |
| Custo | R$ 0,00 |
| % do free tier usado | 0,026% |

### Resumo das simulações

```
leads/mês │ invocações │ GB-seg │ % free tier │ custo
──────────┼────────────┼────────┼─────────────┼──────
       10 │         10 │   1,02 │    0,0005%  │ R$ 0
      100 │        100 │  10,24 │    0,003%   │ R$ 0
    1.000 │      1.000 │ 102,40 │    0,026%   │ R$ 0
   10.000 │     10.000 │  1.024 │    0,256%   │ R$ 0
  100.000 │    100.000 │ 10.240 │    2,56%    │ R$ 0
2.000.000 │  2.000.000 │ 204.800│   51,20%    │ R$ 0

→ Custo real começa a existir apenas acima de 2.000.000 leads/mês
→ Nem 10.000 leads/mês geraria custo
```

---

## 15. CHECKLIST DE SEGURANÇA E INTEGRIDADE — LINHA A LINHA

### Triggers

- [x] Apenas `onCreate` — linhas 260 e 269
- [x] Zero `onUpdate` — confirmado por grep sem resultados
- [x] Zero `onDelete` — confirmado por grep sem resultados
- [x] Zero `onWrite` — confirmado por grep sem resultados

### Escrita no Firestore

- [x] Zero `.set()` — confirmado por grep sem resultados
- [x] Zero `.update()` — confirmado por grep sem resultados
- [x] Zero `.add()` — confirmado por grep sem resultados
- [x] Zero `.delete()` — confirmado por grep sem resultados
- [x] Zero `collection()` chamadas — confirmado por grep sem resultados
- [x] Zero `admin.firestore` uso direto — confirmado por grep sem resultados

### Exports

- [x] Exatamente 2 exports: `alertarLeadLP` e `alertarLeadCRM`
- [x] Nenhum export inesperado

### Dependências

- [x] Apenas 3 requires: `firebase-functions`, `firebase-admin`, `https` (nativo Node.js)
- [x] Zero dependências de terceiros para HTTP (node-fetch, axios, etc.)
- [x] Zero dependências do CRM ou Landing Page

### Credenciais

- [x] Token e Chat ID lidos de `functions.config()` — nunca hardcoded
- [x] Se config ausente: log de erro + retorno null (não falha o sistema)

### Impacto nos sistemas existentes

- [x] CRM (`MF_Solucoes/`) — zero arquivos alterados
- [x] Landing Page (`MF_Landing_V2/`) — zero arquivos alterados
- [x] Action Center (`renderer/js/pages/action-center.js`) — zero arquivos alterados
- [x] Bot WhatsApp — zero arquivos alterados
- [x] scoreService.js — zero alterações
- [x] leadService.js — zero alterações
- [x] firebase-leads.js — zero alterações
- [x] Regras Firestore (`firestore.rules`) — zero alterações
- [x] Índices Firestore (`firestore.indexes.json`) — zero alterações
- [x] Coleção `lp_leads` — zero escritas
- [x] Coleção `leads` — zero escritas
- [x] Coleções `docs_*` (CC-9) — não monitoradas, não acessadas

---

## RISCOS FINAIS

| ID | Risco | Nível | Mitigação |
|----|-------|-------|-----------|
| RF-01 | Firebase Blaze não ativado → deploy bloqueado | 🟡 MÉDIO | Requer cadastro de cartão no Firebase Console (sem cobrança real) |
| RF-02 | Telegram token inválido → alertas silenciosos | 🟡 MÉDIO | Log de erro no Firebase Console; CRM continua 100% funcional |
| RF-03 | Marcos bloquear o bot → alertas param | 🔵 BAIXO | Reabrir conversa com o bot + teste com `/start` |
| RF-04 | Cold start no 1º lead → +200ms | 🔵 BAIXO | Aceitável; ainda dentro de 5s |
| RF-05 | Telegram fora do ar → alerta não chega | 🔵 BAIXO | Lead salvo no Firestore; CRM e Action Center funcionam normalmente |
| RF-06 | Credenciais expostas no código | ❌ NÃO EXISTE | Usamos `functions.config()` — nunca hardcoded |
| RF-07 | Retry duplicado | ❌ NÃO EXISTE | `failurePolicy` não configurada (sem retry automático) |
| RF-08 | Escrita acidental no Firestore | ❌ NÃO EXISTE | Auditoria grep confirma zero operações de escrita |

**Riscos críticos: 0**  
**Riscos médios: 2 (ambos operacionais, não técnicos)**  
**Riscos baixos: 4 (todos sem impacto no sistema principal)**

---

## ROLLBACK FINAL — RESUMO

```
TEMPO ESTIMADO PARA ROLLBACK: 60 segundos

PASSO 1 — Remover 4 linhas do firebase.json (seção "functions")
PASSO 2 — Apagar pasta MF_Solucoes/functions/ inteira
PASSO 3 — (se deployado) firebase functions:delete alertarLeadLP alertarLeadCRM

GARANTIA:
✅ Leads continuam sendo salvos normalmente
✅ CRM continua funcionando
✅ Action Center continua funcionando
✅ Landing Page continua funcionando
✅ Nenhum dado é perdido (função nunca escreve)
✅ Estado idêntico ao pré-CC-10A
```

---

## VEREDICTO TÉCNICO

```
╔══════════════════════════════════════════════════════════════╗
║  CC-10A — VALIDAÇÃO PRÉ-DEPLOY: APROVADA ✅                  ║
║                                                              ║
║  Arquivos criados:        3  (index.js, package.json, lock)  ║
║  Arquivos alterados:      1  (firebase.json — +4 linhas)     ║
║  Escrita no Firestore:    0                                  ║
║  Triggers proibidos:      0                                  ║
║  Dependências externas:   0  (apenas node nativo + Firebase) ║
║  Custo mensal estimado:   R$ 0,00                            ║
║  Tempo de rollback:       60 segundos                        ║
║  Risco crítico:           0                                  ║
║                                                              ║
║  Pronto para deploy após aprovação do Marcos.                ║
╚══════════════════════════════════════════════════════════════╝
```

---

## PRÓXIMO PASSO (após aprovação)

```
1. Ativar Blaze plan no Firebase Console (cartão de crédito — sem cobrança)
2. Marcos fornece: Bot Token do @BotFather
3. Marcos fornece: Chat ID pessoal no Telegram
4. Executar:
   firebase functions:config:set telegram.token="TOKEN" telegram.chat_id="CHAT_ID"
5. Executar:
   firebase deploy --only functions
6. Validação ao vivo:
   Criar lead de teste → confirmar alerta no Telegram < 5 segundos
```

---

*Validação técnica realizada em 2026-06-09 — sem deploy, sem alteração de Firestore, sem alteração de CRM*

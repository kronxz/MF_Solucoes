# T1_FASE1_MAPEAMENTO.md
> T-1 Telegram Alert Center — Fase 1: Mapeamento Completo  
> Data: 2026-06-09  
> Status: AGUARDANDO APROVAÇÃO PARA FASE 2  

---

## 1. ARQUIVO EXATO ONDE O LEAD NASCE

O sistema tem **DUAS origens de lead** — ambas precisam de alerta:

### ORIGEM A — Landing Page (mais comum, leads orgânicos)
```
Arquivo:   MF_Landing_V2/js/firebase-leads.js
Função:    salvarLead(dadosLead, callback)
Coleção:   lp_leads
Linha:     218 — db.collection('lp_leads').add(documento)
```

### ORIGEM B — CRM / Calculadora Solar (leads qualificados)
```
Arquivo:   MF_Solucoes/services/leadService.js
Função:    criarLeadBase(nome, telefone, endereco)
Coleção:   leads
Linha:     125 — addDoc(collection(db, "leads"), leadData)
```

**Conclusão:** 2 coleções Firestore distintas (`lp_leads` e `leads`). Para alertar Marcos sobre qualquer lead novo, é necessário monitorar as **duas coleções**.

---

## 2. EVENTO EXATO QUE DISPARA O ALERTA

| Origem | Evento | Trigger |
|--------|--------|---------|
| Landing Page | `db.collection('lp_leads').add(documento)` | Documento novo em `lp_leads` |
| CRM/Calculadora | `addDoc(collection(db, "leads"), leadData)` | Documento novo em `leads` |

O trigger ideal é o **Firestore `onCreate`** — dispara apenas quando um documento é criado (não em atualizações).

---

## 3. ARQUIVOS IMPACTADOS NA IMPLEMENTAÇÃO

### OPÇÃO RECOMENDADA — Electron Listener (sem Cloud Functions)

| Arquivo | Tipo de mudança |
|---------|----------------|
| `mf-control-center/main.js` | +1 IPC handler `telegram:send` + config TELEGRAM_TOKEN + CHAT_ID |
| `mf-control-center/preload.js` | Nenhuma (comunicação via IPC interno) |
| `mf-control-center/renderer/js/pages/telegram.js` | NOVO — background listener com Firestore onSnapshot |
| `mf-control-center/renderer/index.html` | +1 hidden div para background page do listener |
| `mf-control-center/renderer/js/app.js` | +1 import telegramInit() chamado no login |

### OPÇÃO ALTERNATIVA — Firebase Cloud Functions (melhor, requer Blaze plan)

| Arquivo | Tipo de mudança |
|---------|----------------|
| `MF_Solucoes/functions/index.js` | NOVO — 2 Firestore triggers (lp_leads, leads) |
| `MF_Solucoes/firebase.json` | +1 entry "functions" |
| `MF_Solucoes/functions/package.json` | NOVO — node-telegram-bot-api ou fetch |

**Nenhum arquivo do CRM, CC-9, CC-10 ou módulos existentes é alterado.**

---

## 4. CAMPOS DISPONÍVEIS POR COLEÇÃO

### coleção `lp_leads` (Landing Page)

| Campo | Tipo | Exemplo | Disponível para alerta |
|-------|------|---------|----------------------|
| `nome` | string | "João Silva" | ✅ |
| `telefone` | string | "(21) 99999-9999" | ✅ |
| `valorConta` | string | "850" | ✅ (R$ da conta de luz) |
| `origem` | string | "hero_form" | ✅ |
| `utm_source` | string | "instagram" | ✅ |
| `utm_campaign` | string | "mf_eletricidade" | ✅ |
| `score` | number | 60 | ✅ (calculado no envio) |
| `createdAt` | string ISO | "2026-06-09T14:03:00" | ✅ |
| `tempoTotalSegundos` | number | 120 | ✅ |
| `scrollMaximoPercentual` | number | 80 | ✅ |
| `cliquesWhatsapp` | number | 1 | ✅ |
| ~~`cidade`~~ | — | — | ❌ **NÃO EXISTE** nesta coleção |
| ~~`temperatura`~~ | — | — | ❌ **NÃO EXISTE** — deve ser calculada pelo score |
| ~~`prioridade`~~ | — | — | ❌ **NÃO EXISTE** — deve ser calculada pelo score |

### coleção `leads` (CRM/Calculadora)

| Campo | Tipo | Exemplo | Disponível para alerta |
|-------|------|---------|----------------------|
| `nome` | string | "João Silva" | ✅ |
| `telefone` | string | "(21) 99999-1234" | ✅ |
| `status` | string | "Novo" | ✅ |
| `score` | number | 10 | ✅ |
| `temperatura` | string | "Fria" | ✅ |
| `utm_source` | string | "instagram" | ✅ |
| `pagina_origem` | string | "/calculadora" | ✅ |
| `endereco` | string | "Maricá" | ⚠️ Opcional, pode estar vazio |
| `contaDeLuz` | number | 850 | ⚠️ Só disponível após simulação |
| ~~`cidade`~~ | — | — | ❌ **NÃO EXISTE** — usar `endereco` |
| ~~`prioridade`~~ | — | — | ❌ **NÃO EXISTE** — calcular pelo score |

### Regra de conversão score → temperatura + prioridade

```javascript
// De scoreService.js (já existente no código)
// 0-29  → Temperatura: Fria   / Prioridade: Normal
// 30-69 → Temperatura: Morno  / Prioridade: Alta
// 70-100→ Temperatura: Quente / Prioridade: URGENTE
```

---

## 5. ESTRUTURA DO BOT TELEGRAM

### O que é necessário

1. **Criar um Bot Telegram:**
   - Abrir o app Telegram
   - Buscar `@BotFather`
   - Enviar `/newbot`
   - Escolher nome: `MF Soluções Alertas`
   - Escolher username: `mf_solucoes_alertas_bot`
   - O BotFather retorna o **TOKEN**

2. **Obter o Chat ID do Marcos:**
   - Iniciar conversa com o bot criado (`/start`)
   - Acessar: `https://api.telegram.org/bot{TOKEN}/getUpdates`
   - O `chat.id` do usuário aparece na resposta JSON

3. **Chamada da API (sem biblioteca, apenas fetch):**
```javascript
// Envio de mensagem — chamada HTTP simples
const TOKEN   = 'SEU_BOT_TOKEN';
const CHAT_ID = 'SEU_CHAT_ID';

fetch(`https://api.telegram.org/bot${TOKEN}/sendMessage`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    chat_id: CHAT_ID,
    text: mensagem,
    parse_mode: 'HTML'
  })
});
```

### Modelo da mensagem (mapeamento campo a campo)

```
📥 NOVO LEAD SOLAR

👤 Nome: {lead.nome}
📱 Telefone: {lead.telefone}
📍 Cidade: {lead.endereco || 'Não informado'}
💡 Conta de Luz: R$ {lead.valorConta || lead.contaDeLuz || 'Não informado'}
📣 Origem: {lead.utm_source || lead.origem || 'Direto'}
🌡️ Temperatura: {calcularTemperatura(lead.score)}
⚡ Prioridade: {calcularPrioridade(lead.score)}
🕐 Recebido às: {formatarHora(lead.createdAt)}

⏱️ Ligar em até 5 minutos.
```

---

## 6. CUSTO OPERACIONAL

### Opção A — Electron Listener (GRATUITO)

| Item | Custo |
|------|-------|
| Firestore reads (onSnapshot) | Gratuito — Spark plan |
| Telegram Bot API | Gratuito — sem limite razoável |
| Hospedagem | Gratuito — roda dentro do Electron |
| **TOTAL MENSAL** | **R$ 0,00** |

⚠️ **Condição:** MF Control Center precisa estar aberto e logado para receber alertas.

### Opção B — Firebase Cloud Functions (MELHOR, custo mínimo)

| Item | Custo estimado |
|------|---------------|
| Firebase Blaze plan (obrigatório) | Gratuito nas primeiras 2M invocações/mês |
| Cloud Function executions (est. 300/mês) | Gratuito (dentro do free tier) |
| Telegram Bot API | Gratuito |
| **TOTAL MENSAL (realista)** | **R$ 0,00** (dentro do free tier) |

✅ **Vantagem:** Funciona 24/7, mesmo com o Electron fechado.  
⚠️ **Requer:** Ativar cobrança no Firebase (cartão cadastrado, mas sem cobranças reais).

### Comparativo

| Critério | Electron Listener | Cloud Functions |
|----------|:-----------------:|:---------------:|
| Custo | R$ 0 | R$ 0 |
| Funciona 24/7 | ❌ (só com app aberto) | ✅ |
| Token seguro | ✅ (main.js) | ✅ (env var) |
| Setup | 30 min | 60 min |
| Complexidade | Baixa | Média |
| Risco | Baixo | Mínimo |

---

## 7. TEMPO ESTIMADO DE IMPLEMENTAÇÃO

### Opção A — Electron Listener

| Etapa | Tempo |
|-------|-------|
| Criar bot no Telegram + obter token + chat_id | 10 min |
| Criar `renderer/js/pages/telegram.js` (Firestore listener) | 30 min |
| Adicionar IPC handler em `main.js` (HTTPS para Telegram) | 20 min |
| Testar com lead real | 10 min |
| **TOTAL** | **~70 minutos** |

### Opção B — Cloud Functions

| Etapa | Tempo |
|-------|-------|
| Criar bot no Telegram + token + chat_id | 10 min |
| Ativar Blaze plan no Firebase | 10 min |
| Instalar Firebase CLI + iniciar functions | 15 min |
| Escrever index.js com 2 triggers onCreate | 30 min |
| Deploy + teste com lead real | 20 min |
| **TOTAL** | **~85 minutos** |

---

## 8. FLUXOGRAMA COMPLETO

```
╔══════════════════════════════════════════════════════════════╗
║                    FLUXO DO LEAD                             ║
╚══════════════════════════════════════════════════════════════╝

┌─────────────────────┐    ┌─────────────────────┐
│   LANDING PAGE      │    │   CRM / CALCULADORA │
│  (GitHub Pages)     │    │  (Firebase Hosting) │
│                     │    │                     │
│  Usuário preenche   │    │  Usuário simula     │
│  nome + telefone    │    │  conta de luz       │
│  + conta de luz     │    │  + nome + telefone  │
└──────────┬──────────┘    └──────────┬──────────┘
           │                          │
           ▼                          ▼
   salvarLead()               criarLeadBase()
   firebase-leads.js          leadService.js
           │                          │
           ▼                          ▼
  db.collection('lp_leads')  addDoc(db, 'leads')
           │                          │
           └──────────┬───────────────┘
                      │
                      ▼
            ╔═════════════════╗
            ║   FIRESTORE     ║
            ║   PROD          ║
            ║  mf-solucoes-crm║
            ╚════════╤════════╝
                     │
          ┌──────────┴──────────┐
          │                     │
          ▼ OPÇÃO A             ▼ OPÇÃO B
   ┌─────────────┐       ┌──────────────────┐
   │  Electron   │       │ Cloud Function   │
   │  main.js    │       │ (Firebase)       │
   │  onSnapshot │       │ onCreate trigger │
   │  (renderer) │       │ (server-side)    │
   └──────┬──────┘       └────────┬─────────┘
          │                       │
          └──────────┬────────────┘
                     │
                     ▼
         fetch('api.telegram.org/...')
                     │
                     ▼
         ╔═══════════════════════╗
         ║  TELEGRAM BOT         ║
         ║  MF Soluções Alertas  ║
         ╚═══════════╤═══════════╝
                     │
                     ▼
         ╔═══════════════════════╗
         ║  📱 MARCOS — Telegram ║
         ║                       ║
         ║  📥 NOVO LEAD SOLAR   ║
         ║  👤 João Silva        ║
         ║  📱 (21) 99999-9999   ║
         ║  💡 Conta: R$ 850     ║
         ║  📣 Instagram         ║
         ║  🌡️ Temperatura: Morno ║
         ║  ⚡ Prioridade: Alta  ║
         ║  🕐 14:03             ║
         ║                       ║
         ║  ⏱️ Ligar em 5min.    ║
         ╚═══════════════════════╝

  Tempo total: Lead → Telegram < 5 segundos ✅
```

---

## SUMÁRIO EXECUTIVO

| Item | Detalhe |
|------|---------|
| Coleções monitoradas | `lp_leads` (Landing) + `leads` (CRM) |
| Função que cria lead LP | `salvarLead()` — firebase-leads.js:218 |
| Função que cria lead CRM | `criarLeadBase()` — leadService.js:125 |
| Campo cidade | ❌ Não existe — usar `endereco` (opcional) |
| Campo temperatura | Calculado: score 0-29=Fria, 30-69=Morno, 70-100=Quente |
| Campo prioridade | Calculado: score 0-29=Normal, 30-69=Alta, 70-100=URGENTE |
| Cloud Functions | ❌ NÃO configurado no projeto atual |
| Opção recomendada | **A — Electron Listener** (mais simples, gratuito, sem Blaze) |
| Custo mensal | **R$ 0,00** |
| Tempo estimado | **~70 minutos** (Opção A) |
| Latência esperada | **< 5 segundos** |
| Arquivos do CRM alterados | **0** |
| Arquivos CC-9/CC-10 alterados | **0** |

---

## PRÓXIMA AÇÃO NECESSÁRIA (pré-requisitos para Fase 2)

Antes da implementação, o usuário precisa fornecer:

1. **Token do Bot Telegram** — obter no @BotFather (10 min)
   - Exemplo: `7123456789:AAFxxxxxxxxxxxxxxxxxxxxx`

2. **Chat ID do Marcos** — obter após iniciar conversa com o bot
   - Exemplo: `123456789`

3. **Qual opção aprovar:**
   - ✅ **Opção A** — Electron Listener (sem Blaze, app precisa estar aberto)
   - ✅ **Opção B** — Cloud Functions (precisa ativar Blaze no Firebase)

---

## DECLARAÇÃO FASE 1

```
T-1 Telegram Alert Center — Fase 1: CONCLUÍDA
Mapeamento completo entregue.
Aguardando aprovação para Fase 2 — Implementação.
```

---

*Mapeamento realizado em 2026-06-09*

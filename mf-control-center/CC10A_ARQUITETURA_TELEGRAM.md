# CC10A_ARQUITETURA_TELEGRAM.md
> CC-10A — Fase 2B: Arquitetura da Cloud Function  
> Data: 2026-06-09  
> Status: PROJETO — sem implementação  

---

## ARQUITETURA APROVADA

```
Landing Page / CRM
       ↓
   Firestore
  ┌────┴────┐
lp_leads  leads
  └────┬────┘
       ↓
 Cloud Function
  onCreate trigger
       ↓
Telegram Bot API
       ↓
   📱 Marcos
```

---

## ESTRUTURA DA CLOUD FUNCTION

### Localização no projeto

```
MF_Solucoes/
└── functions/
    ├── index.js          ← Cloud Function principal
    └── package.json      ← { "node-fetch": "^3.0.0" }
```

### firebase.json — entrada a adicionar

```json
{
  "functions": {
    "source": "functions",
    "runtime": "nodejs18"
  }
}
```

---

## GATILHO (Trigger)

### Trigger 1 — Landing Page

```
Tipo:      Firestore onCreate
Coleção:   lp_leads
Evento:    document.onCreate
Condição:  qualquer documento novo
Região:    southamerica-east1  (mesma do Firestore)
```

### Trigger 2 — CRM / Calculadora

```
Tipo:      Firestore onCreate
Coleção:   leads
Evento:    document.onCreate
Condição:  qualquer documento novo
Região:    southamerica-east1
```

> **Por que southamerica-east1?** O Firestore está configurado nessa região (`firebase.json: "location": "southamerica-east1"`). Cloud Functions na mesma região eliminam latência cross-region e evitam cobrança de egress.

---

## PAYLOAD DA CLOUD FUNCTION

### Dados recebidos pelo trigger

```javascript
// snap.data() — documento recém-criado
// snap.id     — document ID gerado pelo Firestore
// context.params.leadId — ID do documento (para triggers com {leadId})
```

### Normalização dos campos (tratamento da diferença entre coleções)

```javascript
// Pseudocódigo — não implementado ainda

function normalizarLead(dados, colecao) {
  return {
    // ── Campos obrigatórios ──
    nome:        dados.nome      || 'Sem nome',
    telefone:    dados.telefone  || 'Sem telefone',
    origem:      dados.utm_source || dados.origem || 'Direto',
    score:       Number(dados.score) || 0,

    // ── Conta de luz (campos diferentes por coleção) ──
    conta: colecao === 'lp_leads'
      ? (dados.valorConta ? `R$ ${dados.valorConta}` : 'Não informado')
      : (dados.contaDeLuz ? `R$ ${dados.contaDeLuz}` : 'Não informado'),

    // ── Cidade (campos diferentes por coleção) ──
    cidade: colecao === 'lp_leads'
      ? 'Não informado'                           // lp_leads não tem cidade
      : (dados.endereco || 'Não informado'),

    // ── Temperatura ──
    temperatura: colecao === 'lp_leads'
      ? calcularTemperatura(dados.score)          // calcular do score
      : (dados.temperatura || calcularTemperatura(dados.score)),

    // ── createdAt — dois formatos ──
    createdAt: colecao === 'lp_leads'
      ? new Date(dados.createdAt)                 // string ISO
      : dados.createdAt.toDate()                  // Firestore Timestamp
  };
}
```

---

## FORMATAÇÃO DA MENSAGEM

```javascript
// Pseudocódigo — não implementado ainda

function formatarMensagem(lead, colecao) {
  const hora = lead.createdAt.toLocaleTimeString('pt-BR', {
    hour: '2-digit', minute: '2-digit',
    timeZone: 'America/Sao_Paulo'
  });

  const prioridade = calcularPrioridade(lead.score);    // ver CC10A_PRIORIZACAO.md
  const emoji      = emojiPrioridade(lead.score);

  const fonte = colecao === 'lp_leads' ? '🌐 Landing Page' : '📊 CRM/Calculadora';

  return `${emoji} <b>NOVO LEAD SOLAR</b>

👤 <b>Nome:</b> ${lead.nome}
📱 <b>Telefone:</b> ${lead.telefone}
📍 <b>Cidade:</b> ${lead.cidade}
💡 <b>Conta:</b> ${lead.conta}
📣 <b>Origem:</b> ${lead.origem}
🌡️ <b>Temperatura:</b> ${lead.temperatura}
⚡ <b>Prioridade:</b> ${prioridade}
📌 <b>Fonte:</b> ${fonte}
🕐 <b>Recebido às:</b> ${hora}

⏱️ <i>Ligar em até 5 minutos.</i>`;
}
```

---

## CHAMADA DA API TELEGRAM

```javascript
// Pseudocódigo — não implementado ainda

async function enviarTelegram(mensagem) {
  const TOKEN   = process.env.TELEGRAM_TOKEN;   // variável de ambiente segura
  const CHAT_ID = process.env.TELEGRAM_CHAT_ID; // variável de ambiente segura

  const url = `https://api.telegram.org/bot${TOKEN}/sendMessage`;

  const response = await fetch(url, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id:    CHAT_ID,
      text:       mensagem,
      parse_mode: 'HTML'
    })
  });

  if (!response.ok) {
    const erro = await response.text();
    throw new Error(`Telegram API error: ${response.status} — ${erro}`);
  }

  return response.json();
}
```

> **Segurança:** `TELEGRAM_TOKEN` e `TELEGRAM_CHAT_ID` são armazenados como **Firebase Functions Config** ou **Secret Manager** — nunca no código-fonte.

---

## TRATAMENTO DE ERROS

### Erros esperados e estratégia

| Erro | Causa | Estratégia |
|------|-------|-----------|
| Telegram 401 Unauthorized | Token inválido | Log de erro crítico + não retry |
| Telegram 400 Bad Request | Mensagem malformada | Log + fallback sem HTML |
| Telegram 429 Too Many Requests | Rate limit (raro) | Aguardar `retry_after` segundos |
| Telegram 403 Forbidden | Chat ID inválido / bot bloqueado | Log crítico + não retry |
| Firebase timeout | Cloud Function > 60s | Impossível (operação < 2s) |
| Lead com campos ausentes | Dado incompleto | Valores padrão via `normalizarLead()` |
| `createdAt` inválido | Formato inesperado | Usar `new Date()` como fallback |

### Pseudocódigo de tratamento

```javascript
// Pseudocódigo — não implementado ainda

try {
  const lead = normalizarLead(dados, colecao);
  const mensagem = formatarMensagem(lead, colecao);
  await enviarTelegram(mensagem);
  console.log(`[TelegramAlert] Lead enviado: ${snap.id} — ${colecao}`);

} catch (erro) {
  console.error(`[TelegramAlert] ERRO: ${colecao}/${snap.id}`, erro.message);

  // Tentar mensagem simplificada como fallback
  try {
    await enviarTelegram(
      `⚠️ NOVO LEAD — ${dados.nome || '?'} — ${dados.telefone || '?'}\n` +
      `Coleção: ${colecao} | Erro no formato original`
    );
  } catch (erroFallback) {
    console.error('[TelegramAlert] Fallback também falhou:', erroFallback.message);
    // Não relança — Cloud Function não deve falhar para não bloquear Firestore
  }
}
```

---

## RETRY POLICY

### Comportamento padrão das Cloud Functions

Por padrão, Cloud Functions **não fazem retry** em caso de falha. Isso é intencional para alertas de lead:

- Um alerta duplicado é **pior** que nenhum alerta (confusão operacional)
- O lead **já está salvo no Firestore** independente da notificação
- O CRM e Action Center **não dependem** do sucesso do alerta Telegram

### Configuração recomendada

```javascript
// Pseudocódigo — não implementado ainda

// SEM retry automático — padrão do Firebase (idempotência não garantida)
exports.alertarLeadLP = functions
  .region('southamerica-east1')
  .firestore
  .document('lp_leads/{leadId}')
  .onCreate(async (snap, context) => {
    // failurePolicy: NÃO configurar retry
    // ...
  });
```

> **Justificativa:** O objetivo é notificação comercial, não processamento crítico. Falha silenciosa é preferível a duplicata. O lead existe no CRM independentemente.

---

## LOGS

### O que logar em cada etapa

```javascript
// Pseudocódigo — não implementado ainda

// Ao receber o trigger
console.log(`[TelegramAlert] Trigger recebido: ${colecao}/${snap.id}`);

// Após normalização
console.log(`[TelegramAlert] Lead normalizado:`, {
  nome: lead.nome,
  telefone: lead.telefone.slice(0, 6) + '****',  // Mascarar por privacidade
  score: lead.score,
  temperatura: lead.temperatura,
  colecao
});

// Após envio com sucesso
console.log(`[TelegramAlert] Enviado com sucesso — message_id: ${result.message_id}`);

// Em caso de erro
console.error(`[TelegramAlert] Falha:`, { colecao, leadId: snap.id, erro: erro.message });
```

---

## LATÊNCIA ESPERADA

```
Lead criado no Firestore
        ↓ ~0ms (trigger instantâneo)
Cloud Function recebe evento
        ↓ ~200ms (cold start, primeira execução)
        ↓ ~10ms  (warm start, execuções subsequentes)
normalizarLead() + formatarMensagem()
        ↓ ~5ms
fetch para api.telegram.org
        ↓ ~300-800ms (latência de rede BR → Telegram)
Telegram entrega ao app
        ↓ ~1-3s (variável, depende da rede do celular)

TOTAL ESPERADO: < 5 segundos ✅
```

---

## VARIÁVEIS DE AMBIENTE (sem valor real — apenas estrutura)

```bash
# Configurar via Firebase CLI antes do deploy
firebase functions:config:set telegram.token="SEU_TOKEN_AQUI"
firebase functions:config:set telegram.chat_id="SEU_CHAT_ID_AQUI"

# Acessar na função
const TOKEN   = functions.config().telegram.token;
const CHAT_ID = functions.config().telegram.chat_id;
```

> Token e Chat ID **nunca** ficam no código — apenas em variáveis de ambiente do Firebase.

---

## DIAGRAMA COMPLETO DA FUNÇÃO

```
┌─────────────────────────────────────────────────────┐
│              CLOUD FUNCTION: alertarLead            │
│                                                     │
│  Triggers:                                          │
│  • lp_leads/{leadId}  onCreate                      │
│  • leads/{leadId}     onCreate                      │
│                                                     │
│  ┌─────────────────────────────────────────────┐   │
│  │  1. Receber snap.data() + identificar        │   │
│  │     coleção (lp_leads ou leads)              │   │
│  └───────────────────┬─────────────────────────┘   │
│                      ↓                              │
│  ┌─────────────────────────────────────────────┐   │
│  │  2. normalizarLead(dados, colecao)           │   │
│  │     • campos obrigatórios com fallback       │   │
│  │     • calcular temperatura se ausente        │   │
│  │     • converter createdAt para Date()        │   │
│  └───────────────────┬─────────────────────────┘   │
│                      ↓                              │
│  ┌─────────────────────────────────────────────┐   │
│  │  3. calcularPrioridade(lead.score)           │   │
│  │     (ver CC10A_PRIORIZACAO.md)               │   │
│  └───────────────────┬─────────────────────────┘   │
│                      ↓                              │
│  ┌─────────────────────────────────────────────┐   │
│  │  4. formatarMensagem(lead, colecao)          │   │
│  │     HTML com parse_mode: 'HTML'              │   │
│  └───────────────────┬─────────────────────────┘   │
│                      ↓                              │
│  ┌─────────────────────────────────────────────┐   │
│  │  5. enviarTelegram(mensagem)                 │   │
│  │     POST api.telegram.org/sendMessage        │   │
│  │     Token em variável de ambiente            │   │
│  └───────────────────┬─────────────────────────┘   │
│                      ↓                              │
│        ✅ OK → log sucesso                          │
│        ❌ Erro → log + fallback simples             │
│        (nunca relança — não bloqueia Firestore)     │
└─────────────────────────────────────────────────────┘
```

---

*Projeto documentado em 2026-06-09 — sem alteração de código*

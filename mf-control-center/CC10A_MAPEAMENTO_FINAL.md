# CC10A_MAPEAMENTO_FINAL.md
> CC-10A — Fase 2A: Mapeamento das Coleções Firestore  
> Data: 2026-06-09  
> Projeto: mf-solucoes-crm (Firebase PROD)  
> Status: DOCUMENTAÇÃO — sem alteração de código  

---

## VISÃO GERAL

O sistema MF Soluções grava leads em **duas coleções distintas** no mesmo projeto Firestore:

| Coleção | Origem | Volume atual | Função criadora |
|---------|--------|-------------|-----------------|
| `lp_leads` | Landing Page (GitHub Pages) | 12 documentos | `salvarLead()` — firebase-leads.js:218 |
| `leads` | CRM / Calculadora Solar | 0 documentos (Firestore CC-9) | `criarLeadBase()` — leadService.js:125 |

---

## COLEÇÃO: `lp_leads`

### Origem
**Arquivo:** `MF_Landing_V2/js/firebase-leads.js`  
**Função:** `salvarLead(dadosLead, callback)`  
**Evento de criação:** `db.collection('lp_leads').add(documento)` — linha 218  
**Quem chama:** formulário HTML da Landing Page (inputs `#lead-nome`, `#lead-telefone`)

### Estrutura completa do documento (ao criar)

```json
{
  "nome":                   "João Silva",
  "telefone":               "(21) 99999-9999",
  "valorConta":             "850",
  "origem":                 "hero_form",
  "status":                 "novo",
  "createdAt":              "2026-06-09T14:03:00.000Z",
  "lastActivity":           "2026-06-09T14:03:00.000Z",

  "landingPage":            "https://mf-solucoes.com/...",
  "referrer":               "https://instagram.com/...",
  "utm_source":             "instagram",
  "utm_medium":             "social",
  "utm_campaign":           "mf_eletricidade",
  "utm_content":            "",
  "utm_term":               "",
  "gclid":                  "",
  "fbclid":                 "Abc123...",
  "firstVisit":             "2026-06-09T13:58:00.000Z",
  "sessionId":              "mf_1749470520_x3k9",

  "tempoTotalSegundos":     120,
  "scrollMaximoPercentual": 75,
  "cliquesWhatsapp":        0,
  "digitouNome":            true,
  "digitouTelefone":        true,

  "score":                  80,
  "recaptchaToken":         "03AGdBq25..."
}
```

### Mapeamento campo → mensagem Telegram

| Campo Firestore | Campo na Notificação | Disponível? |
|-----------------|----------------------|-------------|
| `nome` | 👤 Nome | ✅ Sempre |
| `telefone` | 📱 Telefone | ✅ Sempre |
| `valorConta` | 💡 Conta de Luz | ✅ Sempre (pode ser "Não informado") |
| `utm_source` | 📣 Origem | ✅ Sempre (pode ser vazio → "Direto") |
| `score` | base para Temperatura + Prioridade | ✅ Sempre (0-100) |
| `createdAt` | 🕐 Recebido às | ✅ Sempre |
| ~~cidade~~ | 📍 Cidade | ❌ **NÃO EXISTE** nesta coleção |
| `sessionId` | (interno, não exibir) | ✅ para debug |

> **Cidade na `lp_leads`:** O formulário da landing page não coleta cidade. O campo `cidade` **não existe**. Na notificação, será exibido "Não informado" ou omitido.

---

## COLEÇÃO: `leads`

### Origem
**Arquivo:** `MF_Solucoes/services/leadService.js`  
**Função:** `criarLeadBase(nome, telefone, endereco)`  
**Evento de criação:** `addDoc(collection(db, "leads"), leadData)` — linha 125  
**Quem chama:** formulário da calculadora solar no CRM (mf-solucoes-crm.web.app)

### Estrutura completa do documento (ao criar — estado inicial)

```json
{
  "nome":              "João Silva",
  "telefone":          "(21) 99999-1234",
  "telefoneDigitos":   "21999991234",
  "status":            "Novo",
  "score":             0,
  "temperatura":       "Fria",

  "utm_source":        "instagram",
  "utm_medium":        "social",
  "utm_campaign":      "mf_eletricidade",
  "fbclid":            "",
  "gclid":             "",
  "sessionId":         "mf_1749470520_x3k9",
  "bairroQR":          "",
  "dispositivo":       "mobile",
  "pagina_origem":     "/calculadora",

  "createdAt":         "<serverTimestamp>",
  "lastAction":        "<serverTimestamp>",
  "ultima_acao_nome":  "Deixou Contato",

  "endereco":          "Maricá - RJ"
}
```

### Campos adicionados após criação (não presentes no onCreate)

```json
{
  "contaDeLuz":        850,
  "consumo":           450,
  "investimento":      18500,
  "kitEscolhido":      "Kit 5kWp",
  "kits":              [...],
  "kwp":               5.0
}
```

> ⚠️ Esses campos só existem **após** o usuário completar a simulação. No momento do `onCreate`, **apenas os campos do estado inicial** estão disponíveis.

### Mapeamento campo → mensagem Telegram

| Campo Firestore | Campo na Notificação | Disponível no onCreate? |
|-----------------|----------------------|------------------------|
| `nome` | 👤 Nome | ✅ Sempre |
| `telefone` | 📱 Telefone | ✅ Sempre |
| `endereco` | 📍 Cidade | ⚠️ Opcional (pode ser vazio) |
| `temperatura` | 🌡️ Temperatura | ✅ Sempre ("Fria" no início) |
| `utm_source` | 📣 Origem | ✅ Sempre |
| `score` | base para Prioridade | ✅ Sempre (0 no início) |
| `createdAt` | 🕐 Recebido às | ✅ Sempre (serverTimestamp) |
| ~~contaDeLuz~~ | 💡 Conta de Luz | ❌ **NÃO existe no onCreate** |

---

## SCORE — SISTEMA DE PONTUAÇÃO

### Pesos por evento (fonte: `scoreService.js`)

| Evento | Pontos | Quando ocorre |
|--------|--------|---------------|
| `criou_lead` | +10 | Ao preencher nome + telefone |
| `retornou_ao_site` | +5 | Lead voltou à página |
| `simulou` | +20 | Completou simulação solar |
| `atualizou_simulacao` | +10 | Refez a simulação |
| `escolheu_kit` | +25 | Escolheu um kit de instalação |
| `clicou_whatsapp` | +30 | Clicou no botão WhatsApp |
| **MÁXIMO POSSÍVEL** | **100** | — |

### Score no momento do onCreate

| Coleção | Score no onCreate | Justificativa |
|---------|-------------------|---------------|
| `lp_leads` | **30–80** | Score calculado no envio do form (scroll + tempo + inputs + envio = 30+) |
| `leads` | **10** | Só `criou_lead` foi aplicado (10 pontos) |

---

## TEMPERATURA (campo `temperatura`)

| Score | Temperatura | Definição no código |
|-------|-------------|---------------------|
| 0–29 | Fria | `scoreService.js:28` — score < 30 |
| 30–69 | Morno | `scoreService.js:30` — score >= 30 |
| 70–100 | Quente | `scoreService.js:29` — score >= 70 |

> **Na `lp_leads`:** campo `temperatura` **não existe** — deve ser calculado pela Cloud Function a partir do `score`.  
> **Na `leads`:** campo `temperatura` existe e é gravado como `"Fria"` no onCreate.

---

## ORIGEM (campo `utm_source` / `origem`)

| Coleção | Campo | Valores observados |
|---------|-------|-------------------|
| `lp_leads` | `utm_source` | `instagram`, `google`, `facebook`, `direto`, `""` |
| `lp_leads` | `origem` | `hero_form`, `calculadora`, `popup` |
| `leads` | `utm_source` | `instagram`, `google`, `""` |
| `leads` | `pagina_origem` | `/calculadora`, `/`, `/proposta` |

---

## RESUMO DOS CAMPOS DISPONÍVEIS PARA A NOTIFICAÇÃO

| Campo na Notificação | `lp_leads` | `leads` | Observação |
|----------------------|:----------:|:-------:|------------|
| Nome | ✅ `nome` | ✅ `nome` | Sempre presente |
| Telefone | ✅ `telefone` | ✅ `telefone` | Sempre presente |
| Cidade | ❌ ausente | ⚠️ `endereco` | LP: "Não informado"; CRM: opcional |
| Conta de Luz | ✅ `valorConta` | ❌ ausente no onCreate | LP: sempre; CRM: "Não informado" |
| Origem | ✅ `utm_source` | ✅ `utm_source` | Fallback: "Direto" |
| Score | ✅ `score` | ✅ `score` | Sempre presente |
| Temperatura | ❌ calcular do score | ✅ `temperatura` | LP: calcular; CRM: campo existe |
| Data/Hora | ✅ `createdAt` (ISO) | ✅ `createdAt` (Timestamp) | Formatos diferentes! |

> ⚠️ **Atenção importante:** `createdAt` em `lp_leads` é uma **string ISO** (`"2026-06-09T14:03:00.000Z"`), enquanto em `leads` é um **Firestore Timestamp**. A Cloud Function deve tratar os dois formatos.

---

*Mapeamento realizado em 2026-06-09 — código fonte auditado sem alterações*

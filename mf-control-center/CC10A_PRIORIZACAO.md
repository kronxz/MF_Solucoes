# CC10A_PRIORIZACAO.md
> CC-10A — Fase 2C: Sistema de Priorização de Leads  
> Data: 2026-06-09  
> Status: PROJETO — sem implementação  

---

## OBJETIVO

Classificar cada lead recebido em 4 níveis de prioridade para que Marcos saiba, ao receber o alerta no Telegram, qual ação tomar e com que urgência.

> **Restrição:** os níveis são calculados **exclusivamente** com campos existentes no momento do `onCreate` — nenhum campo novo é inventado.

---

## CAMPOS DISPONÍVEIS NO ONCREATE (base de cálculo)

| Campo | `lp_leads` | `leads` | Observação |
|-------|:----------:|:-------:|------------|
| `score` | ✅ 30–80 | ✅ 10 | Principal variável de priorização |
| `valorConta` | ✅ string numérica | ❌ ausente | Indica poder de compra |
| `utm_source` | ✅ | ✅ | Canal de origem |
| `cliquesWhatsapp` | ✅ number | ❌ ausente | Intenção imediata de compra |
| `tempoTotalSegundos` | ✅ number | ❌ ausente | Engajamento com a página |
| `scrollMaximoPercentual` | ✅ number | ❌ ausente | Leitura do conteúdo |
| `temperatura` | ❌ calcular | ✅ sempre "Fria" | CRM inicia fria; LP calculada |

---

## LÓGICA DE PRIORIZAÇÃO

### Regra principal: score

O score é o único campo numérico presente em **ambas** as coleções no `onCreate`. É a base da priorização.

```
score 70–100 → 🔴 ESCALDANTE
score 50–69  → 🟠 QUENTE
score 30–49  → 🟡 MORNO
score 0–29   → ⚪ FRIO
```

### Elevadores de prioridade (apenas para `lp_leads`)

Se a regra do score indicar `🟡 MORNO` ou `⚪ FRIO`, verificar:

| Condição | Efeito | Campo | Valor de referência |
|----------|--------|-------|---------------------|
| `cliquesWhatsapp >= 1` | +1 nível | `cliquesWhatsapp` | Número inteiro |
| `valorConta >= 500` | +1 nível | `valorConta` | String → converter para número |

> **Limite:** a prioridade sobe no máximo 1 nível por elevador; dois elevadores ativos = +2 níveis no total. Não ultrapassa 🔴.

> **Por que elevadores só em lp_leads?** `cliquesWhatsapp` e `valorConta` não existem no `leads` no onCreate. Aplicar elevadores em `leads` seria inventar dados.

### Regra especial: `leads` com score 10

Leads do CRM chegam sempre com score=10 (`criou_lead` = +10). Pela regra do score, seriam ⚪ FRIO. No entanto, esses leads são de pessoas que **já acessaram a calculadora solar** — contexto maior que um simples formulário de landing.

```
leads + score = 10 → 🟡 MORNO (elevação contextual fixa)
```

Justificativa: o usuário do CRM já interagiu com a ferramenta de simulação, mesmo que não tenha completado. O contexto é mais qualificado que um lead frio genérico.

---

## TABELA DE PRIORIDADE COMPLETA

### Coleção `lp_leads`

| Score | cliquesWhatsapp | valorConta | Prioridade Final |
|-------|:---------------:|:----------:|:----------------:|
| 70–100 | qualquer | qualquer | 🔴 ESCALDANTE |
| 50–69 | qualquer | qualquer | 🟠 QUENTE |
| 30–49 | ≥1 | ≥500 | 🔴 ESCALDANTE |
| 30–49 | ≥1 | < 500 | 🟠 QUENTE |
| 30–49 | 0 | ≥500 | 🟠 QUENTE |
| 30–49 | 0 | < 500 | 🟡 MORNO |
| 0–29 | ≥1 | ≥500 | 🟠 QUENTE |
| 0–29 | ≥1 | < 500 | 🟡 MORNO |
| 0–29 | 0 | ≥500 | 🟡 MORNO |
| 0–29 | 0 | < 500 | ⚪ FRIO |

### Coleção `leads`

| Score | Condição | Prioridade Final |
|-------|----------|:----------------:|
| 10 | (criação padrão — CRM) | 🟡 MORNO |
| > 10 | (improvável no onCreate) | calcular pelo score |

---

## DEFINIÇÃO DE CADA NÍVEL

### 🔴 ESCALDANTE

```
Score: 70–100 (ou lp_leads com elevadores que chegam ao topo)
Ação: Ligar AGORA — menos de 2 minutos
Perfil: Lead muito engajado. Passou muito tempo na página, fez scroll completo,
        clicou no WhatsApp ou tem conta alta. Altíssima intenção de compra.
Exemplo: score=80, clicouWhatsapp=1, valorConta=900
```

### 🟠 QUENTE

```
Score: 50–69 (ou elevado de MORNO)
Ação: Ligar em até 5 minutos
Perfil: Lead engajado com bom potencial. Passou tempo considerável na página.
        Não clicou no WhatsApp mas tem interesse claro.
Exemplo: score=60, valorConta=650
```

### 🟡 MORNO

```
Score: 30–49 (ou leads do CRM com score=10)
Ação: Ligar no mesmo dia, de preferência dentro de 1 hora
Perfil: Lead qualificado mas não urgente. Preencheu o formulário e tem interesse.
        No caso do CRM, chegou até a calculadora solar.
Exemplo (LP): score=35, valorConta=200
Exemplo (CRM): score=10, origem=calculadora
```

### ⚪ FRIO

```
Score: 0–29 (sem elevadores ativos)
Ação: Ligar em até 24 horas, na sequência da fila
Perfil: Lead de baixo engajamento. Pode ter chegado por anúncio e preenchido
        rapidamente sem explorar o conteúdo.
Exemplo: score=30 sem interações adicionais
```

---

## PSEUDOCÓDIGO DA FUNÇÃO DE PRIORIDADE

```javascript
// Pseudocódigo — não implementado ainda

function calcularPrioridade(lead, colecao) {
  const score = Number(lead.score) || 0;

  // ── Prioridade base pelo score ──
  let nivel;
  if (score >= 70)      nivel = 4; // 🔴 ESCALDANTE
  else if (score >= 50) nivel = 3; // 🟠 QUENTE
  else if (score >= 30) nivel = 2; // 🟡 MORNO
  else                  nivel = 1; // ⚪ FRIO

  // ── Elevação contextual: leads do CRM iniciam como MORNO ──
  if (colecao === 'leads' && score <= 10) {
    nivel = Math.max(nivel, 2); // garante mínimo MORNO
  }

  // ── Elevadores de prioridade: apenas lp_leads ──
  if (colecao === 'lp_leads') {
    const cliques    = Number(lead.cliquesWhatsapp) || 0;
    const valorConta = Number(String(lead.valorConta).replace(/\D/g, '')) || 0;

    if (cliques >= 1)    nivel = Math.min(nivel + 1, 4);
    if (valorConta >= 500) nivel = Math.min(nivel + 1, 4);
  }

  // ── Retornar label ──
  const labels = {
    4: { emoji: '🔴', label: 'ESCALDANTE', acao: 'Ligar AGORA' },
    3: { emoji: '🟠', label: 'QUENTE',     acao: 'Ligar em 5 min' },
    2: { emoji: '🟡', label: 'MORNO',      acao: 'Ligar hoje' },
    1: { emoji: '⚪', label: 'FRIO',        acao: 'Ligar em 24h' }
  };

  return labels[nivel];
}
```

---

## INTEGRAÇÃO COM A MENSAGEM TELEGRAM

```
// Exemplo de saída para cada nível (pseudocódigo)

🔴 NOVO LEAD SOLAR — ESCALDANTE
👤 João Silva
📱 (21) 99999-9999
💡 Conta: R$ 900
📣 Instagram
⚡ Prioridade: 🔴 ESCALDANTE
→ Ligar AGORA

---

🟠 NOVO LEAD SOLAR — QUENTE
👤 Maria Souza
📱 (21) 98888-8888
💡 Conta: R$ 650
📣 Google
⚡ Prioridade: 🟠 QUENTE
→ Ligar em 5 min

---

🟡 NOVO LEAD SOLAR — MORNO
👤 Pedro Lima
📱 (21) 97777-7777
📊 CRM/Calculadora
⚡ Prioridade: 🟡 MORNO
→ Ligar hoje

---

⚪ NOVO LEAD SOLAR — FRIO
👤 Ana Costa
📱 (21) 96666-6666
💡 Conta: R$ 200
📣 Direto
⚡ Prioridade: ⚪ FRIO
→ Ligar em 24h
```

---

## RESUMO DO SISTEMA

| Nível | Emoji | Score base | Elevadores | Ação |
|-------|-------|:----------:|:----------:|------|
| ESCALDANTE | 🔴 | 70–100 | N/A | Ligar AGORA |
| QUENTE | 🟠 | 50–69 | elevado de baixo | Ligar em 5 min |
| MORNO | 🟡 | 30–49 | elevado de baixo | Ligar hoje |
| FRIO | ⚪ | 0–29 | — | Ligar em 24h |

**Campos usados:** `score`, `cliquesWhatsapp`, `valorConta` (todos pré-existentes)  
**Campos novos criados:** nenhum  
**Coleções alteradas:** nenhuma  

---

*Projeto documentado em 2026-06-09 — sem alteração de código*

# CC10A_DEPLOY_GUIDE.md
> CC-10A — Guia Completo de Deploy  
> Data: 2026-06-09  
> Status: AGUARDANDO TOKEN + CHAT ID  

---

## CONFIRMAÇÃO FINAL DE IMPACTO ZERO

Antes de qualquer passo:

| Sistema | Status |
|---------|--------|
| Escrita no Firestore | ✅ ZERO — auditado por grep |
| CRM (`MF_Solucoes/`) | ✅ INTOCADO |
| Action Center (CC-10) | ✅ INTOCADO |
| CC-1 a CC-9 | ✅ INTOCADOS |
| Landing Page | ✅ INTOCADA |
| Bot WhatsApp | ✅ INTOCADO |
| Leads existentes | ✅ PRESERVADOS |

---

## ETAPA 1 — CRIAR BOT NO TELEGRAM (BotFather)

> Tempo estimado: 5 minutos  
> Pré-requisito: Telegram instalado no celular ou desktop

### Passo a passo

1. Abra o Telegram
2. Na barra de busca, pesquise: **`@BotFather`**
3. Abra a conversa e pressione **START** (ou envie `/start`)
4. Envie o comando:
   ```
   /newbot
   ```
5. O BotFather pergunta: **"Alright, a new bot. How are we going to call it?"**  
   Responda com o nome de exibição:
   ```
   MF Soluções Alertas
   ```
6. O BotFather pergunta: **"Good. Now let's choose a username..."**  
   Responda com o username (deve terminar em `bot`):
   ```
   mf_solucoes_alertas_bot
   ```
   > Se esse username já estiver em uso, tente: `mf_alertas_solar_bot` ou `mf_leads_bot`

7. O BotFather retorna uma mensagem assim:
   ```
   Done! Congratulations on your new bot. You will find it at t.me/mf_solucoes_alertas_bot.
   
   Use this token to access the HTTP API:
   7123456789:AAFxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   
   Keep your token secure and store it safely, it can be used by anyone to control your bot.
   ```

8. **Copie o token** — ele tem o formato:  
   `XXXXXXXXX:AAFxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`

---

## ETAPA 2 — OBTER SEU CHAT ID

> Tempo estimado: 2 minutos

### Passo a passo

1. No Telegram, busque o bot que você acabou de criar pelo username (ex: `@mf_solucoes_alertas_bot`)
2. Pressione **START** ou envie qualquer mensagem (ex: `oi`)
3. Abra o navegador e acesse esta URL (substituindo `SEU_TOKEN` pelo token obtido na Etapa 1):
   ```
   https://api.telegram.org/botSEU_TOKEN/getUpdates
   ```
   Exemplo real:
   ```
   https://api.telegram.org/bot7123456789:AAFxxx.../getUpdates
   ```
4. O navegador mostra um JSON. Encontre o campo `"id"` dentro de `"chat"`:
   ```json
   {
     "ok": true,
     "result": [
       {
         "message": {
           "chat": {
             "id": 123456789,   ← ESTE É O SEU CHAT ID
             "first_name": "Marcos",
             "type": "private"
           }
         }
       }
     ]
   }
   ```
5. **Copie o número** do campo `"id"` (ex: `123456789`)

> **Se o JSON retornar `"result": []`** — o bot ainda não recebeu mensagem. Volte ao Telegram, envie `/start` para o bot, então recarregue a URL.

---

## ETAPA 3 — ATIVAR BLAZE PLAN (se ainda não ativo)

> Necessário para Cloud Functions  
> **Custo: R$ 0,00** — dentro do free tier generoso do Firebase

1. Acesse: https://console.firebase.google.com/project/mf-solucoes-crm/usage/details
2. Clique em **"Fazer upgrade"** ou **"Modificar plano"**
3. Selecione **Blaze (pay as you go)**
4. Cadastre cartão de crédito (não haverá cobrança — uso fica 100% dentro do free tier)
5. Confirme o upgrade

---

## ETAPA 4 — CONFIGURAR VARIÁVEIS DE AMBIENTE

> Execute estes comandos no terminal dentro da pasta `MF_Solucoes/`

```bash
cd "C:/Users/kronxz/OneDrive/Área de Trabalho/MF_Solucoes"

# Configurar Token e Chat ID (substitua pelos valores reais)
firebase functions:config:set telegram.token="SEU_TOKEN_AQUI"
firebase functions:config:set telegram.chat_id="SEU_CHAT_ID_AQUI"

# Verificar se foram salvas corretamente
firebase functions:config:get
```

Saída esperada do `config:get`:
```json
{
  "telegram": {
    "token": "7123456789:AAFxxx...",
    "chat_id": "123456789"
  }
}
```

---

## ETAPA 5 — DEPLOY

```bash
cd "C:/Users/kronxz/OneDrive/Área de Trabalho/MF_Solucoes"

# Deploy SOMENTE das Cloud Functions (não afeta hosting, firestore, storage)
firebase deploy --only functions
```

Saída esperada:
```
=== Deploying to 'mf-solucoes-crm'...
i  deploying functions
i  functions: ensuring required API cloudfunctions.googleapis.com is enabled...
✔  functions: required API cloudfunctions.googleapis.com is enabled
i  functions: preparing functions directory for uploading...
i  functions: packaged functions (XX KB) for uploading
✔  functions[alertarLeadLP(southamerica-east1)]: Successful create operation.
✔  functions[alertarLeadCRM(southamerica-east1)]: Successful create operation.

✔  Deploy complete!
```

---

## ETAPA 6 — TESTE DE HOMOLOGAÇÃO

### Teste 1 — Lead via Landing Page (`lp_leads`)

1. Abra: https://mf-solucoes.github.io (ou URL da Landing Page)
2. Preencha o formulário com dados de teste:
   - Nome: `Teste Telegram LP`
   - Telefone: `(21) 99999-0001`
   - Conta de luz: `500`
3. Envie o formulário
4. **Aguarde até 5 segundos**
5. Verifique o Telegram — deve chegar a mensagem de alerta

### Teste 2 — Lead via CRM (`leads`)

1. Acesse: https://mf-solucoes-crm.web.app
2. Faça login
3. Use a calculadora solar para criar um lead de teste
4. **Aguarde até 5 segundos**
5. Verifique o Telegram — deve chegar o segundo alerta

### Verificar logs no Firebase Console

```
Firebase Console → Functions → Logs
Filtro: [TelegramAlert]
```

Logs esperados:
```
[TelegramAlert] Trigger recebido: lp_leads/xxxxxx
[TelegramAlert] Lead normalizado — nome: Teste Telegram LP | score: 65 | prioridade: QUENTE
[TelegramAlert] ✅ Enviado com sucesso — message_id: 12345
```

---

## ETAPA 7 — VERIFICAÇÃO PÓS-DEPLOY

```bash
# Listar funções deployadas
firebase functions:list

# Saída esperada:
# ┌─────────────────┬───────────────────────┬────────────┐
# │ Function        │ Trigger               │ Location   │
# ├─────────────────┼───────────────────────┼────────────┤
# │ alertarLeadLP   │ providers/cloud.firestore │ southamerica-east1 │
# │ alertarLeadCRM  │ providers/cloud.firestore │ southamerica-east1 │
# └─────────────────┴───────────────────────┴────────────┘
```

---

## ROLLBACK DE EMERGÊNCIA

Se algo sair errado após o deploy:

```bash
# Desativar funções imediatamente
firebase functions:delete alertarLeadLP --region southamerica-east1 --force
firebase functions:delete alertarLeadCRM --region southamerica-east1 --force
```

O sistema volta ao estado pré-CC-10A em segundos.  
**Nenhum lead é perdido. Nenhum dado é alterado.**

---

## CHECKLIST PRÉ-DEPLOY (executar antes do Passo 5)

- [ ] Bot criado no BotFather
- [ ] Token copiado
- [ ] Conversa iniciada com o bot (enviou `/start`)
- [ ] Chat ID obtido via `getUpdates`
- [ ] Blaze plan ativo no Firebase
- [ ] `firebase functions:config:set` executado com sucesso
- [ ] `firebase functions:config:get` confirmou os valores

---

*Guia criado em 2026-06-09 — aguardando TOKEN e CHAT_ID do Marcos*

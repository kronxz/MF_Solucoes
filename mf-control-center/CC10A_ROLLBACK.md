# CC10A_ROLLBACK.md
> CC-10A — Telegram Alert Center — Procedimento de Rollback  
> Data: 2026-06-09  
> Projeto: `mf-solucoes-crm`

---

## QUANDO USAR ESTE GUIA

Execute o rollback se:
- O sistema de alertas estiver causando comportamento inesperado no CRM
- As Cloud Functions estiverem consumindo cota acima do esperado
- Você quiser pausar os alertas temporariamente
- Houver qualquer motivo para remover as funções de produção

> ⚠️ **O rollback NÃO afeta nenhum lead existente. NENHUM dado é perdido. NENHUM sistema é alterado.**  
> As funções apenas "ouvem" o Firestore — removê-las é completamente seguro.

---

## ROLLBACK COMPLETO (recomendado)

### Passo 1 — Navegar até a pasta do projeto

```bash
cd "C:/Users/kronxz/OneDrive/Área de Trabalho/MF_Solucoes"
```

### Passo 2 — Confirmar projeto ativo

```bash
firebase use
```

Deve mostrar: `mf-solucoes-crm (active)`

Se não estiver, execute:
```bash
firebase use mf-solucoes-crm
```

### Passo 3 — Deletar as funções

```bash
firebase functions:delete alertarLeadLP --region southamerica-east1 --force
firebase functions:delete alertarLeadCRM --region southamerica-east1 --force
```

**Saída esperada:**
```
? Deleting function alertarLeadLP in region southamerica-east1...
✔  functions[alertarLeadLP(southamerica-east1)] Successful delete operation.

? Deleting function alertarLeadCRM in region southamerica-east1...
✔  functions[alertarLeadCRM(southamerica-east1)] Successful delete operation.
```

### Passo 4 — Verificar remoção

```bash
firebase functions:list
```

**Saída esperada após rollback:**
```
No functions found.
```

---

## ROLLBACK PARCIAL (pausar apenas um trigger)

Para pausar somente os alertas da Landing Page:
```bash
firebase functions:delete alertarLeadLP --region southamerica-east1 --force
```

Para pausar somente os alertas do CRM:
```bash
firebase functions:delete alertarLeadCRM --region southamerica-east1 --force
```

---

## LIMPEZA OPCIONAL DAS CONFIGURAÇÕES

Após deletar as funções, as variáveis de ambiente ficam armazenadas no Firebase mas não fazem nada. Para removê-las:

```bash
firebase functions:config:unset telegram
```

Verificar:
```bash
firebase functions:config:get
# Deve retornar: {}
```

---

## REVERTER `firebase.json` (opcional)

Se quiser remover a seção `functions` do `firebase.json`:

**Estado atual (com CC-10A):**
```json
{
  "functions": {
    "source": "functions",
    "runtime": "nodejs22"
  },
  "firestore": { ... },
  "hosting": { ... },
  "storage": { ... }
}
```

**Estado após rollback (remover bloco `functions`):**
```json
{
  "firestore": { ... },
  "hosting": { ... },
  "storage": { ... }
}
```

> ℹ️ Remover do `firebase.json` é opcional — não impacta nada enquanto as funções já estiverem deletadas.

---

## REATIVAR O SISTEMA APÓS ROLLBACK

Se quiser reativar o Telegram Alert Center depois de um rollback:

```bash
cd "C:/Users/kronxz/OneDrive/Área de Trabalho/MF_Solucoes"

# 1. Reconfigurar credenciais (se foram removidas)
firebase functions:config:set telegram.token="8753204975:AAHwnpvVIzUs4ALW9JL6Vkw6TIkKtW4viS8"
firebase functions:config:set telegram.chat_id="6518463776"

# 2. Redeployar
firebase deploy --only functions
```

O sistema volta a funcionar em ~2 minutos.

---

## TEMPO ESTIMADO DE ROLLBACK

| Etapa | Tempo |
|-------|-------|
| Deletar `alertarLeadLP` | ~30 segundos |
| Deletar `alertarLeadCRM` | ~30 segundos |
| **Total** | **~1 minuto** |

---

## GARANTIAS PÓS-ROLLBACK

| Item | Garantia |
|------|----------|
| Leads existentes em `lp_leads` | ✅ Preservados — não foram tocados |
| Leads existentes em `leads` | ✅ Preservados — não foram tocados |
| CRM (`mf-solucoes-crm.web.app`) | ✅ Continua funcionando normalmente |
| Landing Page | ✅ Continua funcionando normalmente |
| Bot WhatsApp | ✅ Continua funcionando normalmente |
| Novas inscrições na LP | ✅ Continuam salvando no Firestore — sem alertas Telegram |
| Blaze Plan | ✅ Permanece ativo (custo R$ 0,00 sem funções rodando) |

---

*Documento criado em 2026-06-09 — CC-10A Telegram Alert Center v1.0.0*

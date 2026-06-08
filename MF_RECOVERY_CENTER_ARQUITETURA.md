# MF RECOVERY CENTER — ARQUITETURA

**Status:** 📐 Arquitetura — NÃO IMPLEMENTADO  
**Versão Base para Restauração:** V1.2 PRODUÇÃO  
**Data:** 2026-06-08

---

## OBJETIVO

Sistema de recuperação automatizada que permite restaurar o ambiente
completo de produção (Firestore + Rules + CRM + Landing) a partir
de um backup congelado, com confirmação tripla e health check.

---

## BOTÃO PRINCIPAL

```
╔═══════════════════════════════════════╗
║                                       ║
║   ⚠️  RESTAURAR V1.2 PRODUÇÃO         ║
║                                       ║
║   Esta ação é IRREVERSÍVEL.           ║
║   Todos os dados atuais serão         ║
║   sobrescritos pelo backup.           ║
║                                       ║
╚═══════════════════════════════════════╝
```

---

## FLUXO COMPLETO DE RESTAURAÇÃO

```
ETAPA 1 — CONFIRMAR USUÁRIO
───────────────────────────
Input: "Digite seu nome completo para confirmar"
Validação: deve ser igual ao nome cadastrado no Firebase
Timeout: 60 segundos para digitar

        ↓ OK

ETAPA 2 — CONFIRMAR SENHA
──────────────────────────
Input: Senha do Firebase Auth
Validação: reauthenticateWithCredential()
Proteção: 3 tentativas máximo, bloqueio por 15 min após falha

        ↓ OK

ETAPA 3 — SELECIONAR BACKUP
────────────────────────────
Lista backups disponíveis:
  • V1.2_PRODUCAO (2026-06-08) — RECOMENDADO
  • [backups anteriores]

Mostra:
  - Hash do commit
  - Data do backup
  - Quantidade de documentos
  - Ruleset ID

        ↓ CONFIRMAR BACKUP

ETAPA 4 — RESTAURAR FIRESTORE
──────────────────────────────
Ações por coleção (em ordem segura):

  a) Exportar estado atual → BACKUP_PRE_RESTORE_[timestamp].json
  b) Para cada coleção no backup:
     - Listar docs atuais
     - Deletar docs NÃO presentes no backup
     - Upsert docs do backup (setDoc com merge:false)

  Ordem de restauração:
  1. crm_config
  2. lp_leads
  3. leads
  4. instalacoes
  5. financeiro_dados
  6. tecnico_dados
  7. notificacoes_logs
  8. landing_visits
  (eventos: somente append, nunca deletar)

  Progress bar: [████████░░] 80% — Restaurando lp_leads (8/11)

        ↓ OK

ETAPA 5 — RESTAURAR RULES
───────────────────────────
Ações:
  a) Ler conteúdo do backup BACKUP_RULES_V1_2.zip
  b) Comparar com rules atualmente em PROD
  c) Se diferente: deploy via firebase deploy --only firestore:rules
  d) Verificar novo Ruleset ID no PROD

  Log: "Rules V1.2 implantadas. Ruleset: [novo ID]"

        ↓ OK

ETAPA 6 — RESTAURAR CRM
──────────────────────────
Ações:
  a) Extrair BACKUP_CRM_V1_2.zip para pasta temporária
  b) Comparar com crm-dev/ atual (diff)
  c) Substituir crm-dev/ pelo backup
  d) firebase deploy --only hosting --project mf-solucoes-crm

  Log: "CRM V1.2 deployado. URL: https://mf-solucoes-crm.web.app"

        ↓ OK

ETAPA 7 — RESTAURAR LANDING
─────────────────────────────
Ações:
  a) Extrair BACKUP_LANDING_V1_2.zip para pasta temporária
  b) Comparar com MF_Landing_V2/ atual
  c) Substituir MF_Landing_V2/ pelo backup
  d) git push origin main (GitHub Pages rebuíld automático)

  Log: "Landing V1.2 publicada. URL: https://kronxz.github.io/..."

        ↓ OK

ETAPA 8 — HEALTH CHECK
──────────────────────
Verificações automáticas:

  ✓ Firebase Auth: login com conta de teste
  ✓ Firestore lp_leads: leitura via CRM auth → 200
  ✓ Firestore lp_leads: create público (payload válido) → 200
  ✓ Firestore lp_leads: create público (sem createdAt) → 403
  ✓ Firestore eventos: create público (payload válido) → 200
  ✓ Firestore landing_visits: create público → 200
  ✓ CRM hosting: GET https://mf-solucoes-crm.web.app → 200
  ✓ Landing hosting: GET https://[github-pages-url] → 200
  ✓ Ruleset ID PROD = ID esperado do backup

  Total: 9 verificações obrigatórias
  Meta: 9/9 PASS

        ↓ TODOS OK

ETAPA 9 — RELATÓRIO
─────────────────────
Emitir:

  ╔══════════════════════════════════════════╗
  ║  RESTAURAÇÃO V1.2 CONCLUÍDA              ║
  ║                                          ║
  ║  Data/Hora:     2026-XX-XX HH:MM         ║
  ║  Backup usado:  V1.2_PRODUCAO            ║
  ║  Firestore:     OK (654 docs restaurados)║
  ║  Rules:         OK (Ruleset: [ID])       ║
  ║  CRM:           OK (deploy #XXXX)        ║
  ║  Landing:       OK (commit [hash])       ║
  ║  Health Check:  9/9 PASS                 ║
  ║                                          ║
  ║  Salvo em: RESTORE_REPORT_[ts].md        ║
  ╚══════════════════════════════════════════╝

  Salvar relatório em disco (PDF + MD)
  Enviar notificação no sistema
```

---

## ESTADOS DO RECOVERY CENTER

```
IDLE        → Aguardando ação do usuário
CONFIRMING  → Etapas 1–3 (confirmações)
RESTORING   → Etapas 4–7 (operações ativas)
CHECKING    → Etapa 8 (health check)
DONE        → Etapa 9 (relatório)
FAILED      → Erro em qualquer etapa (mostra etapa + motivo)
ABORTED     → Usuário cancelou durante confirmações
```

---

## PROTEÇÕES DE SEGURANÇA

| Proteção | Implementação |
|---------|--------------|
| Autenticação tripla | Nome + Senha + Seleção explícita do backup |
| Backup pré-restore | Salva estado atual ANTES de sobrescrever |
| Rollback do rollback | Se o health check falhar, oferece restaurar o backup pré-restore |
| Idempotência | Cada etapa pode ser re-executada sem efeitos colaterais |
| Log imutável | Cada ação grava timestamp + resultado em arquivo local |
| Timeout | Cada etapa tem timeout máximo (ex: 120s por coleção) |
| Lock file | Previne duas restaurações simultâneas |

---

## ESTRUTURA DE ARQUIVOS

```
recovery-center/
│
├── recovery.js           # Orquestrador principal
├── steps/
│   ├── step1-auth.js     # Confirmação de usuário + senha
│   ├── step2-select.js   # Seleção de backup
│   ├── step3-firestore.js # Restaurar Firestore
│   ├── step4-rules.js    # Restaurar Rules
│   ├── step5-crm.js      # Restaurar + Deploy CRM
│   ├── step6-landing.js  # Restaurar + Deploy Landing
│   ├── step7-health.js   # Health Check
│   └── step8-report.js   # Relatório
│
├── backups/
│   ├── V1.2_PRODUCAO/
│   │   ├── BACKUP_FIRESTORE_V1_2.json
│   │   ├── BACKUP_RULES_V1_2.zip
│   │   ├── BACKUP_CRM_V1_2.zip
│   │   ├── BACKUP_LANDING_V1_2.zip
│   │   └── VERSAO_OFICIAL_V1_2_PRODUCAO.md
│   └── [futuras versões]
│
└── logs/
    ├── RESTORE_REPORT_[timestamp].md
    └── BACKUP_PRE_RESTORE_[timestamp].json
```

---

## FLUXO DE ERRO

```
Erro em qualquer etapa:
  1. Parar execução imediatamente
  2. Logar: [ETAPA] [TIMESTAMP] [ERRO]
  3. Exibir tela de erro com:
     - Qual etapa falhou
     - Mensagem técnica
     - Estado atual do sistema
     - Opção: "Tentar novamente esta etapa"
     - Opção: "Restaurar estado pré-restore"
     - Opção: "Cancelar e manter estado atual"
  4. Não executar etapas seguintes
```

---

## CONDIÇÕES DE USO

O Recovery Center DEVE ser usado quando:
- CRM apresenta erros funcionais após um deploy
- Firestore rules bloqueando operações legítimas
- Dados corrompidos ou perdidos acidentalmente
- Landing Page parou de capturar leads
- Atualização de sistema gerou regressão

O Recovery Center NÃO deve ser usado para:
- Desfazer mudanças de dados planejadas (ex: exclusão de leads)
- Restaurar dados individuais (use backup manual)
- Downgrade de versão por preferência (crie nova versão)

---

## INTEGRAÇÃO COM MF CONTROL CENTER

O Recovery Center é acessado dentro do MF Control Center
pela rota `/recovery`. Requer autenticação Firebase ativa.

O botão "RESTAURAR V1.2 PRODUÇÃO" é visível apenas para
o usuário administrador (`uid: gddlz2h2xrgcPvJyHMVYzdhfgCr2`).

---

*Arquitetura definida em 2026-06-08. Implementação: somente após aprovação explícita.*

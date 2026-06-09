# PLANO_RETORNADA_CC.md
> Plano de retomada do ponto exato onde o projeto foi interrompido  
> Data: 2026-06-09  
> Projeto canônico: `solar-calculator-main (1)/mf-control-center/`

---

## SITUAÇÃO ATUAL COMPROVADA

| Item | Estado |
|------|--------|
| CC-1 a CC-7 | ✅ 100% implementados e certificados |
| CC-8 | ⚠️ Parcial — falta logo.ico real → bloqueia NSIS |
| CC-9 | ❌ Especificado (3 documentos), não implementado |
| CC-10+ | ❌ Não iniciado |

---

## PASSO 1 — CONCLUIR CC-8 (pendência mínima)

### O que falta para CC-8 ser 100%:

**Item único:** `assets/logo.ico` real (256×256px, > 50KB)

Sem esse item, o `npm run build` gera aviso de ícone inválido e o instalador NSIS fica com ícone Electron padrão.

**Opções:**
1. Marcos fornece `logo.ico` (256px, ICO multi-size) → colocar em `assets/logo.ico`
2. Usar o script já existente: `npx electron assets/generate-icons.js` → converte PNG → ICO
3. Pular CC-8 final e avançar para CC-9, gerando build sem ícone MF (apenas funcional)

**Recomendação:** avançar para CC-9 agora. O ícone pode ser resolvido depois sem impacto em funcionalidade.

---

## PASSO 2 — IMPLEMENTAR CC-9 (Document Manager)

### Contexto já existente no projeto

Três documentos de especificação prontos no projeto original:
- `CC9_B_ESTRUTURA_DOCUMENTAL_FINAL.md` — arquitetura documental
- `CC9_ESPECIFICACAO_OPERACIONAL.md` — especificação operacional (48KB)
- `RELATORIO_CC9_PRECHECK_PASTA_REAL.md` — inventário real (30KB, 599 arquivos mapeados)

### O que implementar (conforme missão CC-9+CC-10):

**Módulo:** `renderer/js/pages/documentos.js` (novo)  
**Página:** adicionar `page-documentos` em `index.html`  
**IPC:** adicionar handlers em `main.js`

#### Subseções:
1. **Clientes** — derivados de propostas (extrair nome do PDF)
2. **Propostas** — 41 PDFs em `mf soluçoes/`
3. **Obras** — pasta `projetos/`, subpastas por cliente
4. **Laudos** — 6 DOCXs em `LAUDOS/`
5. **Orçamentos** — pasta `orcamentos/`
6. **Mídias** — 252 imagens + 19 vídeos
7. **Índices** — visão geral cruzada
8. **Relacionamentos** — cliente ↔ proposta ↔ obra ↔ laudo

#### Fase 1 (somente leitura):
- Escanear `mf soluçoes/` via `fs.readdirSync`
- Abrir arquivos com `shell.openPath()`
- Pesquisa e filtros por nome, data, tipo
- NÃO mover, NÃO renomear, NÃO apagar

---

## PASSO 3 — IMPLEMENTAR CC-10 (Action Center)

**Módulo:** `renderer/js/pages/action-center.js` (novo)

Funcionalidades:
- Pendências (lista de tarefas abertas)
- Follow-up (por cliente/lead)
- Agenda (próximos compromissos)
- Alertas (propostas vencidas, obras pendentes)
- Notificações (internas, sem push)
- Prioridades (alta/média/baixa)

---

## PASSO 4 — DASHBOARD REAL

Módulo `dashboard.js` já existe com Firebase ao vivo.

Expandir com:
- Dados do Document Manager (qtd propostas, obras, laudos)
- Dados do CRM (leads, conversões)
- Tarefas pendentes do Action Center

---

## PASSO 5 — BUILD FINAL

Após CC-9 e CC-10 concluídos:

```bash
cd "solar-calculator-main (1)/mf-control-center"
npx electron assets/generate-icons.js   # se logo.ico não estiver pronto
npm run build
```

Gera: NSIS + Portable com todos os módulos implementados.

---

## REGRAS DE RETOMADA

```
✅ Trabalhar somente em: solar-calculator-main (1)/mf-control-center/
✅ Adicionar módulos como novos arquivos em renderer/js/pages/
✅ Adicionar IPC handlers ao main.js existente
✅ Adicionar botões de navegação ao index.html existente
❌ NÃO criar novo projeto Electron
❌ NÃO migrar para mf-control-center-app
❌ NÃO alterar CRM (mf-solucoes-crm)
❌ NÃO alterar Firebase / Firestore
❌ NÃO alterar Bot WhatsApp
❌ NÃO reimplementar CC-1 a CC-7 (já prontos)
❌ NÃO criar nova arquitetura de shell
```

---

## LINHA DO TEMPO RECOMENDADA

```
AGORA:
  → Retornar ao projeto original
  → Implementar CC-9 Document Manager (Fase 1 — somente leitura)
  → Entregar CC9_IMPLEMENTACAO_COMPLETA.md

PRÓXIMO:
  → Implementar CC-10 Action Center
  → Entregar CC10_IMPLEMENTACAO_COMPLETA.md

DEPOIS:
  → Dashboard real com dados consolidados
  → Build NSIS final com logo MF Soluções
  → UNIFICACAO_FINAL_V2 (se necessário)
```

---

## DECLARAÇÃO FINAL

```
Estamos oficialmente na fase CC-8 (⚠️ parcial — logo.ico pendente)

Próxima implementação recomendada: CC-9 — Document Manager
```

---

*Plano baseado em evidências de código — 2026-06-09*

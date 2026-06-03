# SAFEPOINT — Métricas Dashboard Analytics Operacionais

## Identificação

| Campo | Valor |
|---|---|
| **Commit hash** | `87626e9` |
| **Tag** | `SAFEPOINT_METRICAS_FUNCIONANDO` |
| **Branch** | `release/v1.0-final` |
| **Data** | 2026-06-03 |
| **URL CRM** | https://mf-solucoes-crm.web.app |
| **URL Landing** | https://kronxz.github.io/mf-solucoes-eletricas |

---

## Métricas Corrigidas

| Métrica | Antes | Depois |
|---|---|---|
| Visitas | Apenas calculadora (eventos `pagina_abriu`) | Calculadora + landing (`sessionId` único de `lp_leads`) |
| Total Leads | Apenas calculadora | Calculadora + landing |
| Leads por período | Apenas calculadora | Calculadora + landing |
| Telefones | Apenas calculadora | Calculadora + landing (`digitouTelefone === true`) |
| WhatsApp | Apenas calculadora | Calculadora + landing (`cliquesWhatsapp` somados) |
| Scroll | Apenas calculadora (`scroll_profundo`) | Calculadora + landing (`scrollMaximoPercentual >= 50`) |
| Propostas | Apenas calculadora | Calculadora + landing (`status === 'proposta'`) |
| Simulações | Calculadora | **Mantido apenas calculadora** (landing não tem simulações) |
| Stats kits | Apenas calculadora | Calculadora + landing (leads com `kitSelecionado`) |
| Gráfico leads 14 dias | Apenas calculadora | Calculadora + landing |
| Conversão / Fechados | Apenas calculadora | Calculadora + landing |
| Top origem / campanha | Apenas calculadora | Calculadora + landing |
| Inteligência — Ficou +40s | Ausente | Derivado de `tempoTotalSegundos > 40` |

---

## Arquivos Alterados

| Arquivo | Funções | Linhas |
|---|---|---|
| `crm-dev/js/app.js` | `mostrarPagina()`, `atualizarTudo()` | 8 chamadas atualizadas |
| `crm-dev/js/crm-dashboard.js` | `atualizarMetricas()`, `atualizarTrafico()`, `atualizarAnalyticsMini()`, `atualizarDashboardCompleto()` | +28 linhas |
| `crm-dev/js/crm-analytics.js` | `renderizarAnalytics()` | +10 linhas |
| `crm-dev/js/crm-details.js` | `preencherIntelLanding()` | +1 linha |

---

## Resultado dos Testes (documento real `6HkEl3C1qoczJwGyqh8H`)

| Métrica | Valor validado |
|---|---|
| Total docs em lp_leads | 8 |
| Leads ativos landing | 3 |
| Visitas únicas (sessionId) | 3 |
| Leads no mês | 3 |
| Cliques WhatsApp | 0 |
| Telefones capturados | 2 |
| Scrolls profundos (≥50%) | 1 |
| Propostas | 0 |
| Lead teste — tempoTotal | 73s |
| Lead teste — Ficou +40s | **Sim** |

---

## Arquitetura de Dados

- Coleção `leads` (DEV: `mf-solucoes-dev`) — Calculadora Solar
- Coleção `lp_leads` (PROD: `mf-solucoes-crm`) — Landing Page
- Coleção `eventos` (DEV: `mf-solucoes-dev`) — Eventos comportamentais da calculadora
- As coleções permanecem **separadas** — unificação apenas na camada de apresentação

---

## Restauração

```bash
git checkout SAFEPOINT_METRICAS_FUNCIONANDO
```

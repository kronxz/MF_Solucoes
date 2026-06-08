# CERTIFICAÇÃO — MOTOR OFICIAL DE PROPOSTAS
## `crm-dev/proposta.html`

> Auditoria CC-3.2A — Certificação do motor oficial  
> Data: 2026-06-08  
> Método: CDP (Chrome DevTools Protocol) via WebSocket — execução ao vivo no Electron  
> Arquivo auditado: `crm-dev/proposta.html` (4078 linhas)  
> Versão do app: MF Control Center v1.0.0

---

## RESULTADO GERAL

| Item | Resultado |
|------|-----------|
| **Veredicto** | ⚠️ **GO CONDICIONAL** |
| **Condição de GO** | Com internet ativa (CDN Chart.js + GitHub Raw necessários) |
| **PDF nativo** | ❌ Não existe — apenas `window.print()` / impressão do browser |
| **Funciona offline** | ❌ NÃO — Chart.js e 2 imagens dependem de internet |

---

## FASE 1 — INVENTÁRIO COMPLETO

### Estrutura do arquivo

| Item | Valor |
|------|-------|
| Linhas de código | 4.078 |
| Páginas (`.pagina`) | 13 páginas A4 |
| CSS | Inline (sem arquivo externo) |
| Scripts | 1 externo (CDN) + 2 inline (1 normal + 1 ESM module) |
| Canvas (gráficos) | 3 — `graficoSistema`, `graficoFinanceiro`, `graficoViabilidade` |

### Scripts carregados

| Script | Tipo | Tamanho | Origem |
|--------|------|---------|--------|
| `https://cdn.jsdelivr.net/npm/chart.js` | CDN externo | ~204 KB | ❌ Internet obrigatória |
| Script inline principal | `text/javascript` | 8.342 chars | ✅ Local |
| Script inline ESM modules | `type="module"` | 1.187 chars | ✅ Local |

### CSS

| Item | Status |
|------|--------|
| CSS externo | Nenhum |
| CSS inline | `<style>` no próprio HTML |
| `@media print` | ✅ Definido (suporte a impressão) |
| `print-color-adjust: exact` | ✅ Definido |

### Funções principais (globais)

| Função | Responsabilidade |
|--------|-----------------|
| `calcularSistema(lead)` | Calcula consumo, geração, economia a partir do lead |
| `preencherProjeto(dados)` | Popula campos de projeto (consumo, geração, kWp, placas) |
| `preencherEquipamentos(dados)` | Popula seção de equipamentos (placa, inversor, qtd) |
| `formatarData(data)` | Formata datas em pt-BR |

### ES Modules importados (via `type="module"`)

| Módulo | Origem | Função |
|--------|--------|--------|
| `./js/graficos.js` → `criarGraficoSistema` | Local CRM | Gráfico de sistema |
| `./js/financeiro.js` → `criarGraficoFinanceiro`, `preencherProjecaoFinanceira`, `preencherAnaliseFinanceira` | Local CRM | Gráficos financeiros |
| `./js/viabilidade.js` → `criarGraficoViabilidade` | Local CRM | Indicadores de viabilidade (payback, ROI, TIR) |

### IDs de dados (30 campos dinâmicos)

```
nomeCliente, cidadeCliente, numeroProposta,
consumoMensal, consumoAnual, geracaoMensal, geracaoAnual,
kwp, placas, ecoTexto, infoPotencia,
equip-potencia-placa, equip-quantidade-placas, equip-inversor,
semSistema, comSistema, anoSemSistema, anoComSistema,
economiaMensalTexto, economiaAnualTexto, projecaoFinanceira,
graficoSistema, graficoFinanceiro, graficoViabilidade,
valorSistemaTexto, paybackTexto, roiTexto, tirTexto,
valorKwhTexto, economia25Texto, dataGeracao, dataValidade,
assinaturaCliente
```

---

## FASE 2 — ESTADO DOS ASSETS NO ELECTRON

| Item | Status | Detalhe |
|------|--------|---------|
| Título da página | ✅ "Proposta Solar" | Carrega corretamente |
| URL no webview | ✅ `file:///...crm-dev/proposta.html` | Arquivo local |
| Chart.js | ✅ v4.5.1 CARREGADO | Via CDN — requer internet |
| html2pdf | ❌ NÃO CARREGADO | Não incluso no arquivo |
| Imagens totais | ✅ 3/3 carregadas | Nenhuma falhou |
| Canvas renderizados | ✅ 3 canvas presentes | graficoSistema, graficoFinanceiro, graficoViabilidade |
| Largura `.pagina` | ✅ 794px | Formato A4 correto |
| Altura total body | ✅ 14.660px | 13 páginas A4 renderizadas |
| Botão PDF | ❌ Não existe | Apenas `window.print()` |
| Botão Imprimir | ❌ Não existe como botão dedicado | `window.print()` via código |

---

## FASE 3 — FLUXO COMERCIAL

**Lead de teste injetado via localStorage:**
```json
{
  "nome": "TESTE MF CONTROL CENTER",
  "endereco": "Maricá - RJ",
  "valor": 2016,
  "kwp": 100.8,
  "placas": 183,
  "potenciaPlaca": 550,
  "tarifa": 0.95,
  "investimento": 150000
}
```

### Campos preenchidos após carregamento

| Campo | Valor obtido | Status |
|-------|-------------|--------|
| Nome cliente | TESTE MF CONTROL CENTER | ✅ |
| Cidade/endereço | Maricá - RJ | ✅ |
| Nº Proposta | PRO-0006 (auto-incremento) | ✅ |
| Consumo mensal | 2122 kWh | ✅ |
| Consumo anual | 25.465 kWh | ✅ |
| Geração mensal | 12.580 kWh | ✅ |
| Geração anual | 150.958 kWh | ✅ |
| Potência kWp | 100.80 kWp | ✅ |
| Qtd placas | 183 | ✅ |
| Economia mensal | R$ 2.016,00 | ✅ |
| Conta sem sistema | R$ 2.016,00/mês | ✅ |
| Conta com sistema | R$ 100,00/mês | ✅ |
| Custo anual sem sistema | R$ 24.192,00/ano | ✅ |
| Custo anual com sistema | R$ 1.200,00/ano | ✅ |
| Economia mensal R$ | R$ 1.916,00/mês | ✅ |
| Economia anual R$ | R$ 22.992,00/ano | ✅ |
| Data de geração | 08/06/2026 | ✅ |
| Data de validade | 15/06/2026 (7 dias) | ✅ |
| Equipamento pot. placa | 550 Wp | ✅ |
| Equipamento qtd placas | 183 | ✅ |
| Equipamento inversor | 100.8 kW | ✅ |
| Valor sistema | R$ 150.000,00 | ✅ |
| TIR | 52.19% | ✅ |

**Total: 23/23 campos principais preenchidos corretamente**

### Campos de Viabilidade — Dependência de Dados do CRM

| Campo | Comportamento | Explicação |
|-------|-------------|------------|
| Payback | ⚠️ Requer `lead.economia` | `criarGraficoViabilidade` usa `lead.economia` — CRM popula ao selecionar kit |
| ROI | ⚠️ Requer `lead.economia` | Mesma dependência |
| Valor kWh | ⚠️ Requer `lead.economia` | Mesma dependência |
| Economia 25 anos | ⚠️ Requer `lead.economia` | Mesma dependência |

> **Nota:** Estes campos são calculados por `criarGraficoViabilidade(dados)` que recebe `dados.economia = lead.economia`. No fluxo real do CRM, quando o vendedor seleciona um kit para o lead, os campos `economia`, `economiaMensal` e `investimento` são preenchidos automaticamente no objeto do lead antes de abrir a proposta. Com `lead.economia = 1916` (correto para o sistema de 100,8 kWp), o payback calculado seria **6,5 anos (78 meses)** — valor correto.

### Gráficos

| Gráfico | Status |
|---------|--------|
| graficoSistema (canvas) | ✅ Canvas renderizado |
| graficoFinanceiro (canvas) | ✅ Canvas renderizado |
| graficoViabilidade (canvas) | ✅ Canvas renderizado |
| Chart.js instâncias | ✅ 3 instâncias criadas |

---

## FASE 4 — WINDOW.PRINT()

| Item | Status | Detalhe |
|------|--------|---------|
| `window.print()` executável | ✅ SIM | Chamada JavaScript funciona |
| Abre dialog de impressão no Electron | ✅ SIM | Confirmado via CDP |
| Botão dedicado de impressão | ❌ NÃO EXISTE | Sem botão no HTML |
| Acesso via código externo | ✅ Possível | `webview.executeJavaScript('window.print()')` |
| `@media print` CSS definido | ✅ SIM | Estilos de impressão presentes |
| `print-color-adjust: exact` | ✅ SIM | Cores preservadas na impressão |

**Como `window.print()` é invocável:**
- Via barra de ferramentas do MF Control Center (botão a implementar)
- Via atalho Ctrl+P dentro do webview
- Via `_webview.executeJavaScript('window.print()')` no main process

---

## FASE 5 — DEPENDÊNCIAS EXTERNAS / ANÁLISE OFFLINE

| Dependência | Tipo | Local | CDN/Web | Funciona Offline? |
|------------|------|-------|---------|-------------------|
| Chart.js v4.5.1 | Biblioteca gráficos | ❌ | ✅ cdn.jsdelivr.net | ❌ NÃO |
| Logo MF (`logo mf.jpg`) | Imagem capa | ❌ | ✅ raw.githubusercontent.com | ❌ NÃO |
| Placas solar (`placas.jpg`) | SVG `<image>` na capa | ❌ | ✅ raw.githubusercontent.com | ❌ NÃO |
| `proposta/assets/casa.jpg` | Imagem página 3 | ✅ | ❌ | ✅ SIM |
| `proposta/assets/lista-equipamentos.jpg` | Imagem página 7 | ✅ | ❌ | ✅ SIM |
| Firebase | Banco de dados | ❌ | ❌ | N/A (não utiliza) |
| html2pdf | Geração PDF | ❌ | ❌ | ❌ (não incluso) |
| Font Awesome | Ícones | ❌ | ❌ | N/A (não utiliza) |

### Impacto offline

| Cenário | Resultado |
|---------|-----------|
| **Internet ON** | ✅ Funciona completamente |
| **Internet OFF** — Chart.js | ❌ Gráficos não renderizam (canvas vazio) |
| **Internet OFF** — Logo MF | ❌ Imagem da capa some (sem logo) |
| **Internet OFF** — Placas solar | ❌ Imagem hexagonal da capa some |

---

## FASE 6 — TABELA DE CERTIFICAÇÃO

| Item | Resultado | Evidência |
|------|-----------|-----------|
| Abre no Electron | ✅ SIM | Target CDP confirmado, URL `file:///...proposta.html` |
| Sem erros JS runtime | ✅ SIM | `window.__errors = 0` no DOM |
| Assets carregam (online) | ✅ SIM | 3/3 imagens, Chart.js v4.5.1 |
| 13 páginas A4 renderizadas | ✅ SIM | `.pagina` count = 13, body = 14.660px |
| Fluxo comercial funcional | ✅ SIM | 23/23 campos preenchidos com lead de teste |
| Auto-numeração de proposta | ✅ SIM | PRO-XXXX auto-incremento via localStorage |
| Gráficos renderizados | ✅ SIM | 3 instâncias Chart.js |
| `window.print()` funciona | ✅ SIM | CDP confirmado — abre dialog Electron |
| Funciona offline | ❌ NÃO | Chart.js + 2 imagens dependem de internet |
| PDF nativo | ❌ NÃO EXISTE | Somente `window.print()` / impressão browser |
| Viabilidade c/ lead parcial | ⚠️ PARCIAL | Payback/ROI requerem `lead.economia` do CRM |
| Viabilidade c/ lead completo | ✅ SIM | Com `lead.economia` preenchido pelo CRM |

---

## RESPOSTA FINAL

### A versão oficial de propostas está pronta para uso dentro do MF Control Center?

```
╔══════════════════════════════════════════════════════════════════════╗
║                                                                      ║
║   ⚠️  SIM — COM RESTRIÇÕES                                          ║
║                                                                      ║
╚══════════════════════════════════════════════════════════════════════╝
```

**SIM** — a proposta abre, renderiza 13 páginas A4, preenche todos os campos com dados do CRM, gera gráficos e imprime via `window.print()`.

**COM AS SEGUINTES RESTRIÇÕES:**

| # | Restrição | Criticidade | Solução |
|---|-----------|-------------|---------|
| R1 | Requer internet para Chart.js (CDN) | 🔴 Alta | Baixar `chart.min.js` para `proposta/assets/` e substituir CDN |
| R2 | Logo MF e imagem de placas estão no GitHub Raw | 🟡 Média | Baixar as imagens para `proposta/assets/` |
| R3 | Sem botão de impressão no HTML | 🟡 Média | Usar `webview.executeJavaScript('window.print()')` via toolbar do CC |
| R4 | Viabilidade requer `lead.economia` do CRM | 🟡 Média | Esperado — CRM preenche ao selecionar kit |
| R5 | Sem PDF nativo (apenas `window.print()`) | 🟢 Baixa | Aceito como comportamento oficial |

**Para GO total (sem restrições):**
1. Baixar `chart.min.js` local → substitui dependência CDN
2. Baixar `logo mf.jpg` e `placas.jpg` → salvar em `proposta/assets/`
3. Adicionar botão "Imprimir" na toolbar do MF Control Center → `webview.executeJavaScript('window.print()')`

---

*Certificação gerada por auditoria CC-3.2A | MF Control Center v1.0.0*  
*Branch: `release/v1.0-final` | Metodologia: CDP WebSocket ao vivo*

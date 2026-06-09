# RELATÓRIO CC-9 PRECHECK — AUDITORIA DA PASTA OPERACIONAL REAL
## MF Soluções · `C:\Users\kronxz\OneDrive\Área de Trabalho\mf soluçoes`
### Auditoria de Engenharia · 08/06/2026 · Sem alterações nos arquivos

---

> **Escopo**: leitura completa e análise da pasta operacional real da empresa.
> **Arquivos alterados**: zero. **Commits**: zero. **Código escrito**: zero.
> **Método**: varredura recursiva via Node.js → inventário de 10.489 entradas → análise de 599 arquivos reais.

---

## 1. RESUMO EXECUTIVO

| Métrica | Valor |
|---|---|
| **Pasta raiz** | `C:\Users\kronxz\OneDrive\Área de Trabalho\mf soluçoes` |
| **Arquivos totais** (incluindo node_modules) | 10.489 |
| **Arquivos reais** (excluindo node_modules e .git) | **599** |
| **Tamanho total real** | **471 MB** |
| **PDFs** | **85** |
| **DOCX** | **23** |
| **Imagens (JPEG + JPG + PNG)** | **252** |
| **Vídeos (MP4)** | **19** |
| **CAD (DWG + DXF)** | **10** |
| **Propostas identificadas** | **41 PDFs** |
| **Laudos** | **5 DOCX** (templates — nenhum preenchido por cliente) |
| **Orçamentos** | **3 documentos** (2 DOCX + 1 PDF) |
| **Subpastas com organização real** | **8** |
| **Arquivos na raiz (sem pasta)** | **~430** (72% do total) |

**Diagnóstico de uma linha**: a operação da empresa está 72% concentrada em um único nível de pasta — a raiz — sem hierarquia por cliente, por tipo ou por data. A organização existe em intenção (subpastas criadas) mas não em prática (maioria dos arquivos soltos na raiz).

---

## 2. MAPA COMPLETO DA ESTRUTURA ATUAL

```
mf soluçoes\                                                    599 arquivos  471 MB
│
├── (raiz — arquivos soltos)                                    ~430 arquivos  ← PROBLEMA CENTRAL
│   ├── Propostas (variados)                     41 PDFs
│   ├── Documentos pessoais/empresa              12 PDFs
│   ├── Imagens de marca / solar                 70+ JPEG/PNG
│   ├── Vídeos WhatsApp                          19 MP4
│   ├── Arquivos CAD                             10 DWG/DXF
│   ├── Cotações de fornecedores                  2 PDFs
│   ├── Laudos templates                          5 DOCX
│   ├── Formulários / fichas                      4 DOCX
│   ├── Arquivos temporários Word (~$)             2
│   ├── Arquivos de download incompleto           112 .transferir + 58 .baixados
│   └── Lixo acumulado (acad.err, .lnk etc.)      vários
│
├── LAUDOS\                                                      6 arquivos  (templates)
│   ├── Ficha Técnica de Levantamento de Projeto Fotovoltaico.docx
│   ├── LAUDO TÉCNICO DE ANÁLISE DE EQUIPAMENTO DANIFICADO.docx
│   ├── LAUDO TÉCNICO DE INSPEÇÃO ELÉTRICA.docx
│   ├── LAUDO TÉCNICO PERICIAL EM INSTALAÇÕES ELÉTRICAS.docx
│   ├── LAUDO TÉCNICO PLUS FULL.docx
│   └── LAUDO TÉCNICO – ANÁLISE DE QUEDA DE TENSÃO.docx
│       → TODOS SÃO TEMPLATES VAZIOS. Nenhum laudo preenchido por cliente encontrado.
│
├── projetos\                                                    41 arquivos reais
│   ├── html\                                    (projeto web antigo)
│   ├── mf-solucoes-eletricas-main\              (repositório de código)
│   ├── proposta-solar\                          (projeto de desenvolvimento)
│   │   ├── PROPOSTA SOLAR - JANINE SEU AMOR.pdf
│   │   ├── PROPOSTA SOLAR - KRONXZ.pdf         (teste)
│   │   ├── PROPOSTA SOLAR - LEAD TESTE 01.pdf  (teste)
│   │   ├── proposta.html                       (template HTML em desenvolvimento)
│   │   ├── proposta.pdf                        (5.1 MB — versão de desenvolvimento)
│   │   └── server.js, package.json             (infraestrutura do projeto)
│   ├── ORÇAMENTO DE MATERIAIS Mattheus Chagas.pdf     ← cliente real
│   ├── ORÇAMENTO DE MATERIAIS Mattheus Chagas.docx    ← original editável
│   ├── ORÇAMENTO DE MATERIAIS Mattheus Chagas..docx   ← cópia acidental (com ponto extra)
│   ├── ORÇAMENTO ELÉTRICO Rodrigo-luiz sol -ubatiba.docx  ← cliente real
│   ├── Projeto solar Roberto.pdf
│   └── 6 × "Proposta [N]kwh [KWp] simples.pdf"       ← templates de referência
│
├── documentos\                                                  23 arquivos
│   ├── Contratos de prestação (CPF e CNPJ)     DOCX modelos
│   ├── Procurações (CPF e CNPJ)                DOCX modelos
│   ├── Ficha DADOS DO CLIENTE.docx             formulário de captação
│   ├── Ficha Técnica de Levantamento.docx      formulário técnico
│   ├── Documentos pessoais (MEI, CNH, TRT)     PDFs
│   ├── Currículos                              PDF + DOCX
│   ├── Notas fiscais (NFE Alex, Gabriel)       PDFs
│   ├── IRPJ, CNIS                              PDFs pessoais/empresa
│   └── Scanner_20250617 (laudos físicos?)      PDFs escaneados
│
├── diagama unifilar  fotovoltaico enel\                         14 arquivos
│   ├── DWG ENEL.dwg                            (projeto homologação ENEL)
│   ├── Diagrama Unifilar Modelo c/ Inversor    DWG + PDF
│   ├── Diagrama Unifilar Modelo c/ Micro Inv.  DWG + PDF
│   ├── Projeto Microgeração Fotovoltaica.dwg
│   ├── Exemplo Geração Distribuída.dwg + PDF
│   ├── 02-16-PLANTA DE IMPLANTAÇÃO.dwg
│   ├── Sistema solar bombeamento água.dwg + PDF
│   ├── blocos_fotovoltaicos.dxf
│   └── acad.err                                (erro AutoCAD — lixo)
│
├── panfletos qr code\                                           6 arquivos
│   ├── PANFLETO QR CODE CENTRO.pdf
│   ├── PANFLETO QR CODE PONTA NEGRA.pdf
│   ├── PANFLETO QR CODE ITAIPUAÇU.pdf
│   └── QR codes (PNG)
│
├── imagens divulgacao\                                         (não inventariado em detalhe)
├── imagens solar\                                              (não inventariado em detalhe)
└── MF Serviços Elétricos...Instagram_files\                    (arquivos de página web salva)
```

---

## 3. INVENTÁRIO DOCUMENTAL DETALHADO

### 3.1 Propostas — 41 PDFs identificados

**Quatro padrões de nomenclatura coexistem:**

---

**PADRÃO A — "Proposta de Energia Solar Fotovoltaica [CLIENTE]"**
27 arquivos · Formato histórico principal · Mai/2025 a Mai/2026

```
Proposta de Energia Solar Fotovoltaica Acir de Castro.pdf        (ago/25)
Proposta de Energia Solar Fotovoltaica alexandre (xandao).pdf    (jun/25)
Proposta de Energia Solar Fotovoltaica Anderson Titonelli.pdf    (set/25)
Proposta de Energia Solar Fotovoltaica Andreia Pimenta.pdf       (nov/25)
Proposta de Energia Solar Fotovoltaica andreia Rua cento e tres.pdf (mai/25)
Proposta de Energia Solar Fotovoltaica Andreia.pdf               (mai/25) ← DUPLICATA do anterior
Proposta de Energia Solar Fotovoltaica Antonio Carlos.pdf        (jun/25)
Proposta de Energia Solar Fotovoltaica  Antonio Carlos.pdf       (jun/25) ← DUPLICATA (espaço extra)
Proposta de Energia Solar Fotovoltaica Arnaldo Rua 69.pdf        (mar/26)
Proposta de Energia Solar Fotovoltaica de Antonio.pdf            (jun/25) ← versão anterior de Antonio?
Proposta de Energia Solar Fotovoltaica Edson de Lemos.pdf        (jun/25)
Proposta de Energia Solar Fotovoltaica Fernando.pdf              (dez/25)
Proposta de Energia Solar Fotovoltaica Gessilda.pdf              (nov/25)
Proposta de Energia Solar Fotovoltaica Jandira _Condominio.pdf   (mar/26)
Proposta de Energia Solar Fotovoltaica Luiz pinho _Leo.pdf       (mar/26)
Proposta de Energia Solar Fotovoltaica Luiz pinho _Leo - Copia.pdf (mar/26) ← CÓPIA EXPLÍCITA
Proposta de Energia Solar Fotovoltaica Luiz Pinho.pdf            (fev/26) ← versão anterior de Luiz?
Proposta de Energia Solar Fotovoltaica Maikon Monteiro.pdf       (set/25)
Proposta de Energia Solar Fotovoltaica Marcos Resenhas.pdf       (jul/25)
Proposta de Energia Solar Fotovoltaica pimenta.pdf               (mai/25)
Proposta de Energia Solar Fotovoltaica R Silveira.pdf            (jul/25)
Proposta de Energia Solar Fotovoltaica Roberto.pdf               (jul/25)
Proposta de Energia Solar Fotovoltaica Romulo Silveira.pdf       (jul/25)
Proposta de Energia Solar Fotovoltaica Russo.pdf                 (nov/25)
Proposta de Energia Solar Fotovoltaica Leila Pacheco .pdf        (mai/26) ← espaço no nome
♣○•Proposta de Energia Solar Fotovoltaica analise financeira.pdf (mar/26) ← caracteres especiais
Proposta de Energia Solar Fotovoltaica.pdf                       (mai/25) ← sem cliente
```

---

**PADRÃO B — "Proposta [N]kwh [KWp] simples"**
6 arquivos · Templates por faixa de consumo · Janeiro/2026

```
Proposta 400kwh 3.6kwp simples.pdf
Proposta 600kwh 5.4kwp simples.pdf
Proposta 800kwh  7,43 kWp simples.pdf
Proposta 1000kwh  9,29 kWp simples.pdf
Proposta 1200kwh  11,15 kWp simples.pdf
Proposta 1500kwh  13,93 kWp simples.pdf
```
→ Esses não são propostas de clientes. São **templates prontos por faixa de consumo** que Marcos usa como referência ou envia diretamente quando não precisa personalizar.

---

**PADRÃO C — "PROPOSTA SOLAR - [CLIENTE]"**
3 arquivos · Gerados pelo novo sistema (CRM app) · Mai/2026

```
PROPOSTA SOLAR - JANINE SEU AMOR.pdf    (mai/26)
PROPOSTA SOLAR - KRONXZ.pdf             (mai/26) ← teste
PROPOSTA SOLAR - LEAD TESTE 01.pdf      (mai/26) ← teste
```
→ Esses são os primeiros arquivos gerados pelo novo sistema web. A convenção mudou: MAIÚSCULAS, "PROPOSTA SOLAR" em vez de "Proposta de Energia Solar Fotovoltaica". Transição de padrão em andamento.

---

**PADRÃO D — Sem padrão**
5 arquivos · Arquivos de desenvolvimento/versões

```
Proposta Solar.pdf               (mai/26 e abr/26 — 2 cópias em locais diferentes)
Proposta Solar versao 1.0.pdf    (mar/26)
proposta.pdf                     (mai/26 — 5,1 MB — desenvolvimento)
```

---

**LINHA DO TEMPO DAS PROPOSTAS:**

```
Mai/2025 ──┐  Padrão A — primeiras propostas (ferramentas externas / Word / outro sistema)
Jun/2025 ──┤  Padrão A continua — geração manual de PDFs
Jul/2025 ──┤  Padrão A — volume aumentando
Set/2025 ──┤  Padrão A
Nov/2025 ──┤  Padrão A
Dez/2025 ──┤  Padrão A
Jan/2026 ──┤  Padrão B — templates por consumo criados (nova ferramenta?)
Feb/2026 ──┤  Padrão A + B coexistem
Mar/2026 ──┤  Padrão A + desenvolvimento do novo sistema
Mai/2026 ───┘  Padrão C aparece — sistema CRM novo gerando PDFs
```

**Conclusão**: há uma evolução em 3 gerações de ferramentas. O Padrão C (novo sistema) ainda não substituiu os anteriores.

---

### 3.2 Laudos — 5 DOCX (todos templates)

```
Ficha Técnica de Levantamento de Projeto Fotovoltaico.docx  (formulário de levantamento)
LAUDO TÉCNICO DE ANÁLISE DE EQUIPAMENTO DANIFICADO.docx     (template — queima)
LAUDO TÉCNICO DE INSPEÇÃO ELÉTRICA.docx                     (template)
LAUDO TÉCNICO PERICIAL EM INSTALAÇÕES ELÉTRICAS.docx        (template)
LAUDO TÉCNICO PLUS FULL.docx                                (template completo)
LAUDO TÉCNICO – ANÁLISE DE QUEDA DE TENSÃO.docx             (template)
```

**Descoberta crítica**: **nenhum laudo preenchido por cliente foi encontrado**. Existem apenas templates. Isso significa que:
1. Laudos preenchidos podem estar em outro local (pendente de Marcos informar)
2. Laudos são feitos diretamente nos templates sem salvar cópia do cliente
3. Laudos são entregues por WhatsApp sem salvar localmente
4. O serviço de laudos é recente e ainda não tem histórico acumulado

---

### 3.3 Orçamentos — 3 documentos (2 clientes reais)

```
ORÇAMENTO DE MATERIAIS Mattheus Chagas.docx          (jun/25) ← original
ORÇAMENTO DE MATERIAIS Mattheus Chagas..docx         (jun/25) ← cópia acidental (ponto extra)
ORÇAMENTO DE MATERIAIS Mattheus Chagas pdf.pdf       (jun/25) ← versão PDF gerada
ORÇAMENTO ELÉTRICO Rodrigo-luiz sol -ubatiba.docx    (out/25)
```

**Descoberta**: apenas 2 orçamentos formais em 13+ meses de operação. Possíveis explicações:
1. Orçamentos informais são enviados por WhatsApp sem registro formal
2. Orçamentos são incorporados dentro das propostas (o PDF da proposta já inclui valor)
3. O serviço de orçamento separado de instalação elétrica é menos frequente

---

### 3.4 Projetos CAD — 10 arquivos técnicos

```
02-16-PLANTA DE IMPLANTAÇÃO E ESTUDO SOLAR.dwg
DWG ENEL.dwg                                     ← homologação ENEL (cópia em 2 locais)
Diagrama Unifilar energia solar_copel.dwg
Diagrama Unifilar Modelo com Inversor.dwg + .pdf
Diagrama Unifilar Modelo com Micro Inversor.dwg + .pdf
Exemplo Geração Distribuida Residencial_ENERGISA.dwg + .pdf
Projeto Microgeração Fotovoltaica 24,0 kWp.dwg
Sistema solar de bombeamento de água - 3CV.dwg + .pdf
blocos_fotovoltaicos.dxf
```

**Importância**: esses arquivos DWG são usados para **homologação junto às distribuidoras (ENEL, COPEL, ENERGISA)**. São documentos técnicos críticos, não operacionais do dia a dia. Precisam de tratamento especial na estrutura futura.

---

### 3.5 Templates e Formulários — documentos vivos

```
🟦 ficha de DADOS DO CLIENTE.docx       ← formulário de captação de dados
Ficha Técnica de Levantamento.docx       ← formulário técnico fotovoltaico
Contrato de Prestação para CNPJ.docx    ← template contrato pessoa jurídica
Contrato Prestação para CPF.docx        ← template contrato pessoa física
CONTRATO... LIMPEZA DE PLACAS.docx      ← contrato específico para limpeza
Procuração CNPJ.docx                    ← template procuração
Procuração CPF.docx                     ← template procuração
proposta_solar_profissional_template.pptx ← template PowerPoint (gen anterior)
```

**Descoberta importante**: existe uma **ficha de DADOS DO CLIENTE** em uso ativo. Isso indica que o processo atual inclui uma etapa de coleta de dados que pode preceder a geração da proposta — e que esse dado não está sendo armazenado de forma estruturada.

---

### 3.6 Vídeos — 19 arquivos MP4

Todos os vídeos são do WhatsApp (Jun/2025). Análise de datas sugere que são **registros de obra/instalação** de um serviço específico. Existem em dois locais diferentes (5 cópias duplicadas).

---

### 3.7 Imagens — 252 arquivos (JPEG + JPG + PNG)

Categorias identificadas:
- Imagens de banco solar (casa-solar, economia, energia, qualidade, placas)
- Logos de bancos financeiros (Bradesco, BV, Caixa, Itaú, Santander, Sicoob, Solfácil)
- Logos MF Soluções
- Capturas de tela de desenvolvimento (2024-2026)
- QR Codes dos panfletos
- Post do Instagram

---

### 3.8 Arquivos problemáticos identificados

| Arquivo | Problema |
|---|---|
| `~$oposta de Energia Solar Fotovoltaica Andreia.pdf` | Arquivo temporário Word (lock) — não é PDF real |
| `~$rriculo Marcos Felipe.pdf` | Arquivo temporário Word |
| `acad.err` (2 cópias) | Log de erro do AutoCAD — lixo |
| `♣○•Proposta de Energia Solar Fotovoltaica analise financeira.pdf` (2 cópias) | Caracteres especiais no nome + duplicata |
| `Proposta de Energia Solar Fotovoltaica.pdf` | Sem nome de cliente |
| 112 arquivos `.transferir` | Downloads incompletos (OneDrive/Chrome) |
| 58 arquivos `.baixados` | Downloads incompletos |
| `BlueStacks Store.lnk` | Atalho de aplicativo sem relação com o negócio |

---

## 4. PADRÕES OPERACIONAIS REAIS IDENTIFICADOS

### 4.1 Como uma proposta nasce hoje

```
FLUXO REAL OBSERVADO (baseado nos arquivos e suas datas):

Etapa 1 — Captação do cliente
  Marcos preenche a "🟦 ficha de DADOS DO CLIENTE.docx" (ou coleta por WhatsApp)
  ↓
Etapa 2 — Geração da proposta (3 ferramentas diferentes identificadas)
  Geração A (mai/25 a mar/26): ferramenta externa ou Word → PDF nomeado manualmente
  Geração B (jan/26): templates prontos por faixa de consumo → enviados diretamente
  Geração C (mai/26): novo sistema web (CRM app) → PDF com novo padrão de nome
  ↓
Etapa 3 — Salvamento
  PDF salvo manualmente na pasta raiz "mf soluçoes"
  (sem subpasta por cliente, sem data no nome, sem número sequencial)
  ↓
Etapa 4 — Envio
  Envio por WhatsApp (provável — nenhum sistema de email identificado)
  ↓
Etapa 5 — Resultado
  Não existe registro formal de status (aceita/recusada/expirada)
  Para encontrar depois: busca manual no Explorer por nome do cliente
```

### 4.2 Como uma proposta é localizada hoje

```
Marcos abre o Explorer → navega para "mf soluçoes\projetos" ou raiz
→ busca pelo nome do cliente na barra de pesquisa do Windows
→ problema: "Andreia" retorna 3 arquivos (Andreia, Andreia Pimenta, andreia Rua cento e tres)
→ não há data no nome do arquivo para identificar qual é a mais recente
→ solução atual: verificar data de modificação do arquivo (LastWriteTime)
```

### 4.3 Quem salva e como

- Única pessoa: Marcos
- Processo: manual em 100% dos casos
- Não há nomenclatura padronizada consistente
- A transição do Padrão A para o Padrão C ainda não foi completada

---

## 5. DUPLICATAS ENCONTRADAS

| Arquivo | Locais | Tipo |
|---|---|---|
| `Proposta Solar.pdf` | raiz + projetos/proposta-solar | Cópia de desenvolvimento |
| `♣○•Proposta...analise financeira.pdf` | raiz + projetos | Cópia acidental |
| `Proposta de Energia Solar...Andreia.pdf` | `Andreia.pdf` e `andreia Rua cento e tres.pdf` | Versões do mesmo cliente |
| `Proposta de Energia Solar...Antonio Carlos.pdf` | Dois arquivos com datas diferentes | Versão atualizada sem renomear |
| `Proposta de Energia Solar...Luiz Pinho.pdf` | `Luiz Pinho.pdf` (fev/26) e `Luiz pinho _Leo.pdf` (mar/26) | Atualização do cliente |
| `ORÇAMENTO Mattheus Chagas.docx` | `.docx` e `..docx` (ponto extra) | Cópia acidental |
| `MEI.pdf`, `Scanner_20250617.pdf` etc. | raiz e documentos/ | Duplicatas entre raiz e subpasta |
| 5 vídeos MP4 | imagens solar + imagens divulgacao | Cópias duplicadas |

**Total estimado de duplicatas**: ~15 arquivos representam cópias desnecessárias.

---

## 6. ANÁLISE DA PASTA RAIZ — O PROBLEMA CENTRAL

```
Arquivos na raiz: ~430 de 599 (72%)
```

A pasta raiz funciona como uma "área de trabalho permanente" — tudo que entra fica lá porque não existe um fluxo definido de onde salvar cada tipo de documento.

**Por que isso acontece?**
1. Sem sistema formal → atalho cognitivo: "salva aqui, acho depois"
2. A busca do Windows funciona para volumes pequenos — até agora tem funcionado
3. Criação de subpastas (LAUDOS/, documentos/, projetos/) foi uma tentativa de organização que não foi adotada sistematicamente
4. O OneDrive sincroniza tudo — então não há pressão de perder arquivos

**Quando esse modelo quebra?**
- Volume > 200 arquivos: a busca começa a retornar muitos resultados
- Troca de computador: OneDrive pode demorar para sincronizar tudo
- Segundo colaborador: não sabe onde encontrar nada
- Auditoria: impossível saber qual proposta foi enviada e qual foi aceita

---

## 7. DECISÃO DA PASTA RAIZ — ANÁLISE TÉCNICA

### Opção A — `%APPDATA%\MF Control Center\`
```
C:\Users\kronxz\AppData\Roaming\MF Control Center\
```

| Critério | Avaliação |
|---|---|
| **Backup OneDrive** | ⚠️ Depende de configuração. OneDrive **não sincroniza AppData por padrão** no Windows 11. Precisa configurar backup de pasta manualmente. |
| **Visibilidade** | ❌ Pasta oculta — usuário não encontra sem digitar o caminho |
| **Acesso manual** | ❌ Requer navegar até AppData (pasta oculta por padrão) |
| **Suporte remoto** | ⚠️ Técnico precisa habilitar pastas ocultas para acessar |
| **Padrão Electron** | ✅ Padrão industry — apps como VSCode, Discord usam AppData |
| **Permissões** | ✅ Sempre tem permissão de escrita |
| **Migração de máquina** | ⚠️ Requer exportar manualmente ou configurar OneDrive Backup |
| **Conflito com outros apps** | ✅ Sem conflito — pasta exclusiva do app |

### Opção B — `Documentos\MF Soluções\`
```
C:\Users\kronxz\Documents\MF Soluções\
```

| Critério | Avaliação |
|---|---|
| **Backup OneDrive** | ✅ OneDrive sincroniza Documentos por padrão no Windows 11 |
| **Visibilidade** | ✅ Marcos vê e acessa normalmente pelo Explorer |
| **Acesso manual** | ✅ Abre pelo Explorer sem configuração extra |
| **Suporte remoto** | ✅ Técnico encontra facilmente |
| **Padrão Windows** | ✅ Padrão de apps profissionais (Word, Excel salvam em Documentos) |
| **Permissões** | ✅ Sempre tem permissão de escrita |
| **Migração de máquina** | ✅ OneDrive sincroniza automaticamente — zero esforço |
| **Acesso paralelo** | ✅ Marcos pode abrir os PDFs pelo Explorer quando o app está fechado |

### Opção C — Onde já está: `Desktop\mf soluçoes\`

| Critério | Avaliação |
|---|---|
| **Backup OneDrive** | ✅ Desktop é sincronizado pelo OneDrive |
| **Visibilidade** | ✅ Marcos já conhece e usa esta pasta |
| **Organização** | ❌ Já está desorganizada — herdar o problema atual |
| **Migração** | ✅ Zero custo — os arquivos já estão lá |
| **Escalabilidade** | ❌ Desktop não é local adequado para repositório empresarial |

### Veredicto técnico

**Recomendação: Opção B — `Documentos\MF Soluções\`**

Justificativa:
1. OneDrive sincroniza automaticamente sem configuração adicional
2. Marcos pode acessar seus documentos mesmo com o Control Center fechado
3. A estrutura é visível, auditável, e entendível por um técnico de suporte
4. Migração de máquina é zero-esforço via OneDrive
5. A transição da pasta `Desktop\mf soluçoes\` atual é simples: importar os documentos existentes para a nova estrutura durante CC-9.4

**Caminho definitivo proposto:**
```
C:\Users\kronxz\Documents\MF Soluções\
  (sincronizado pelo OneDrive para a nuvem automaticamente)
```

---

## 8. MAPA DE MIGRAÇÃO

### 8.1 O que será reaproveitado sem alteração

| Tipo | Qtd | Ação |
|---|---|---|
| Propostas Padrão A (clientes reais) | ~25 PDFs únicos | Importar para `Propostas/PDF/[ano]/` com metadados extraídos do nome |
| Templates Padrão B (por consumo) | 6 PDFs | Mover para `Propostas/Templates/` (categoria especial) |
| Laudos (templates DOCX) | 5 DOCX | Mover para `Laudos/Templates/` — base para o módulo de laudos |
| Orçamentos (clientes reais) | 2 DOCX + 1 PDF | Importar para `Orcamentos/` |
| Projetos CAD (DWG) | 10 arquivos | Mover para `Projetos/CAD/` |
| Contratos (templates) | 5 DOCX | Mover para `Documentos/Contratos/Templates/` |
| Fichas de dados do cliente | 2 DOCX | Mover para `Documentos/Formularios/` |
| Panfletos QR | 6 PDF/PNG | Mover para `Marketing/Panfletos/` |
| Imagens de marca / logo | ~15 | Mover para `Marketing/Logos/` |
| Diagramas unifilares | 4 PDF | Mover para `Projetos/Unifilares/` |

### 8.2 O que será reorganizado

| Situação atual | Situação futura |
|---|---|
| Proposta de Energia Solar Fotovoltaica Andreia.pdf (raiz) | PROP-2025-001_ANDREIA.pdf (Propostas/2025/05/) |
| Proposta sem nome de cliente | Arquivado em Propostas/Incompletas/ + solicitação de complemento |
| Duplicatas explícitas (`- Copia.pdf`) | Uma cópia mantida, outra descartada (Lixeira/ do Control Center) |
| Versões do mesmo cliente com datas diferentes | Todas mantidas como v1, v2 do mesmo ID |

### 8.3 O que deve permanecer intocado

| Tipo | Motivo |
|---|---|
| Documentos pessoais (CNH, curriculo, MEI, TRT) | Não pertencem ao repositório operacional da empresa |
| Arquivos de desenvolvimento (node_modules, .git) | Código-fonte — não migrar para repositório documental |
| Vídeos WhatsApp de instalação | Manter em `Laudos/[cliente]/fotos/` quando o módulo estiver ativo |
| Cotações de fornecedores | Mover para `Orcamentos/Cotacoes/` |

### 8.4 O que será descartado (para Lixeira/)

| Tipo | Quantidade |
|---|---|
| Arquivos `.transferir` e `.baixados` (downloads incompletos) | ~170 arquivos |
| Arquivos temporários Word (`~$`) | 2 arquivos |
| `acad.err` | 2 arquivos |
| Duplicatas confirmadas pelo hash | ~15 arquivos |

---

## 9. RISCOS

| Risco | Probabilidade | Impacto | Mitigação |
|---|---|---|---|
| Marcos tem propostas em outras pastas não auditadas | ALTA | ALTO | Perguntar explicitamente antes da migração |
| Propostas enviadas por WhatsApp sem salvar em disco | ALTA | MÉDIO | Impossível recuperar — só propostas futuras serão rastreadas |
| Laudos preenchidos existem em outro local | MÉDIA | ALTO | Confirmar com Marcos onde laudos por cliente são salvos |
| Padrão A e Padrão C coexistindo após migração | ALTA | MÉDIO | CC-9.4 normaliza todos para o padrão único |
| Duplicatas com conteúdo diferente (não detectável pelo nome) | BAIXA | MÉDIO | Hash SHA-256 detecta cópias exatas; versões diferentes são mantidas |
| Proposta de Andreia tem 2 versões — qual é a correta? | CONFIRMADA | BAIXO | Ambas serão importadas como v1 e v2 do mesmo cliente |
| proposta.pdf (5.1 MB) é arquivo de desenvolvimento, não proposta real | CONFIRMADA | BAIXO | Identificado — não migrar para Propostas/ |

---

## 10. OPORTUNIDADES IDENTIFICADAS

1. **Templates por consumo (Padrão B)** são um ativo subutilizado. O Control Center pode integrá-los como "propostas rápidas" — o usuário seleciona a faixa de consumo e o PDF já está pronto. Sem geração dinâmica necessária.

2. **Ficha de DADOS DO CLIENTE.docx** é um formulário que já existe e funciona. O módulo de criação de proposta do Control Center pode replicar exatamente esses campos — facilitando a adoção porque Marcos já conhece o fluxo.

3. **Laudos templates DOCX** são bem estruturados. O Control Center pode digitalizar esses campos como formulários nativos, eliminando o Word do processo.

4. **A pasta `projetos/proposta-solar/`** contém o estado mais recente do sistema de geração (Padrão C). Os arquivos PROPOSTA SOLAR - JANINE e PROPOSTA SOLAR - KRONXZ provam que o novo sistema já gerou PDFs reais. A migração para o Control Center pode aproveitar exatamente esse motor de geração.

5. **Histórico real de 13 meses**: 27 propostas Padrão A entre Mai/2025 e Mar/2026 representam a carteira ativa real. Ao importar e indexar esses arquivos no Control Center, Marcos terá imediatamente uma visão histórica da empresa.

---

## 11. RESPOSTAS ÀS PERGUNTAS DO PRECHECK

| Pergunta | Resposta |
|---|---|
| **Proposta pelo celular continua existindo?** | Não identificado no disco. Provável que propostas pelo celular são feitas no CRM web (navegador mobile) e salvas como PDF na câmera ou enviadas direto pelo WhatsApp. O Control Center deve receber esses PDFs via importação manual ou sincronização Firebase. |
| **Proposta pelo navegador continua existindo?** | Sim — o Padrão C (novo sistema) continua sendo gerado pelo navegador. O Control Center pode receber o PDF gerado e indexar automaticamente, sem substituir o motor de geração imediatamente. |
| **Control Center apenas indexa ou se torna gerador oficial?** | **Estratégia em 2 fases recomendada**: Fase 1 (CC-9.1 a CC-9.4) → Control Center indexa e organiza PDFs existentes e futuros. Fase 2 (CC-9.2 e CC-9.3) → Control Center se torna o gerador oficial, eliminando o navegador do fluxo. |

---

## 12. PERGUNTAS PENDENTES PARA MARCOS

Antes de iniciar CC-9.0, confirmar:

1. **Existe outra pasta de propostas?** Além de `mf soluçoes\`, há propostas em `Downloads\`, em outro HD, no celular, ou compartilhadas via Google Drive?

2. **Laudos por cliente existem?** Os templates DOCX encontrados em `LAUDOS\` são preenchidos e salvos como cliente? Se sim, onde? Ou são editados no Word e enviados por WhatsApp sem salvar?

3. **A pasta `mf soluçoes\` é a única pasta operacional?** Ou há também pastas em `Documentos\`, na área de trabalho em outro caminho, ou no OneDrive diretamente?

4. **Os vídeos MP4 são de instalação de algum cliente específico?** Se sim, eles devem ser vinculados ao laudo correspondente.

5. **Confirmação da pasta raiz do Control Center**: `Documentos\MF Soluções\` é aceitável? Ou prefere outro caminho?

6. **A Ficha de DADOS DO CLIENTE.docx** — ela é preenchida por cada cliente antes de gerar a proposta? Onde esse dado vai depois de preenchido?

---

## 13. PROPOSTA DE ESTRUTURA FUTURA (baseada na realidade observada)

```
Documentos\MF Soluções\               ← NOVA RAIZ (sincronizada OneDrive)
│
├── Propostas\
│   ├── 2025\
│   │   ├── 05\  Andreia, Pimenta, Pablo...
│   │   ├── 06\  Antonio Carlos, Edson, Alexandre...
│   │   ├── 07\  Roberto, Marcos Resenhas, R Silveira...
│   │   ├── 08\  Acir de Castro
│   │   ├── 09\  Anderson Titonelli, Maikon Monteiro
│   │   ├── 11\  Gessilda, Russo, Andreia Pimenta
│   │   └── 12\  Fernando
│   ├── 2026\
│   │   ├── 02\  Luiz Pinho
│   │   ├── 03\  Arnaldo, Jandira, Luiz pinho Leo, analise financeira
│   │   └── 05\  Leila Pacheco, Janine, testes
│   └── Templates\    ← 6 propostas por faixa de consumo (400kwh a 1500kwh)
│
├── Laudos\
│   └── Templates\    ← 5 modelos DOCX existentes
│
├── Orcamentos\
│   ├── 2025\  Mattheus Chagas
│   └── 2025\  Rodrigo-luiz (orçamento elétrico)
│
├── Projetos\
│   ├── CAD\          ← 10 arquivos DWG/DXF
│   ├── Unifilares\   ← diagramas PDF
│   └── Solar\        ← memoriais, relatórios técnicos
│
├── Documentos\
│   ├── Empresa\      ← MEI, IRPJ, CNPJ, certificações
│   ├── Contratos\    ← templates CPF/CNPJ, limpeza
│   ├── Procuracoes\  ← templates CPF/CNPJ, engenheiro
│   └── Formularios\  ← Ficha Dados do Cliente, Ficha Técnica
│
└── Marketing\
    ├── Logos\
    ├── Panfletos\    ← QR codes Centro, Ponta Negra, Itaipuaçu
    └── Imagens\
```

---

*Relatório gerado em: 08/06/2026 · CC-9 PRECHECK · Pasta auditada: `mf soluçoes`*
*Zero arquivos alterados · Zero commits · Zero código escrito*
*Status: AGUARDANDO CONFIRMAÇÕES → então CC-9.0*

# ARQUITETURA DOCUMENTAL V1 — MF SOLUÇÕES
## MF Control Center · Centro Documental Oficial da Empresa
### Documento de Engenharia · 08/06/2026 · Sem implementação

---

> **Base**: auditoria completa de `C:\Users\kronxz\OneDrive\Área de Trabalho\mf soluçoes` + varredura de Downloads e Desktop.
> **Arquivos auditados**: 599 reais + 21 documentos fora da pasta principal.
> **Status**: AGUARDANDO APROVAÇÃO para iniciar CC-9.0.

---

## PARTE 1 — TABELA DEFINITIVA DE PROPOSTAS

### 1.1 Propostas Padrão A — Clientes reais (27 arquivos)

| # | Cliente | Data | Tamanho | Localização atual | Observação |
|---|---|---|---|---|---|
| 01 | Andreia (Rua Cento e Três) | 23/05/2025 | 703 KB | `projetos/` | Versão 1 de Andreia |
| 02 | Andreia | 23/05/2025 | 703 KB | `projetos/` | **DUPLICATA** de #01 (mesmo tamanho, mesmo dia) |
| 03 | Pimenta | 23/05/2025 | 453 KB | `projetos/` | Formato anterior (menor) |
| 04 | De Antonio | 21/06/2025 | 706 KB | `projetos/` | Versão rascunho de Antonio Carlos |
| 05 | Antonio Carlos | 23/06/2025 | 463 KB | `projetos/` | Versão menor — possível formato anterior |
| 06 | Antonio Carlos | 23/06/2025 | 711 KB | `projetos/` | **DUPLICATA** de #05 (mesmo dia, tamanho diferente = versão diferente) |
| 07 | Edson de Lemos | 23/06/2025 | 719 KB | `projetos/` | — |
| 08 | Alexandre (Xandão) | 26/06/2025 | 708 KB | `projetos/` | — |
| 09 | Marcos Resenhas | 16/07/2025 | 752 KB | `projetos/` | — |
| 10 | Roberto | 16/07/2025 | 744 KB | `projetos/` | — |
| 11 | R Silveira | 21/07/2025 | 760 KB | `projetos/` | Possível = Romulo Silveira? |
| 12 | Romulo Silveira | 22/07/2025 | 759 KB | `projetos/` | — |
| 13 | Acir de Castro | 31/08/2025 | 756 KB | `projetos/` | — |
| 14 | Maikon Monteiro | 27/09/2025 | 749 KB | `projetos/` | — |
| 15 | Anderson Titonelli / Solange | 30/09/2025 | 753 KB | `projetos/` | Condomínio? |
| 16 | Gessilda | 03/11/2025 | 752 KB | `projetos/` | — |
| 17 | Russo | 03/11/2025 | 754 KB | `projetos/` | — |
| 18 | Andreia Pimenta | 26/11/2025 | 749 KB | `projetos/` | Cliente diferente de #01/#02 |
| 19 | Fernando | 16/12/2025 | 748 KB | `projetos/` | — |
| 20 | Luiz Pinho | 10/02/2026 | 748 KB | `projetos/` | Versão anterior de Luiz |
| 21 | Jandira (Condomínio) | 06/03/2026 | 649 KB | `projetos/` | — |
| 22 | Luiz Pinho / Leo | 06/03/2026 | 656 KB | `projetos/` | Versão atualizada de #20 |
| 23 | Luiz Pinho / Leo — Cópia | 06/03/2026 | 656 KB | **raiz** | **CÓPIA EXPLÍCITA** de #22 — fora da pasta |
| 24 | Arnaldo Rua 69 | 11/03/2026 | 650 KB | `projetos/` | — |
| 25 | Análise financeira (♣○•) | 11/03/2026 | 367 KB | `projetos/` | Caracteres especiais no nome |
| 26 | Análise financeira (♣○•) | 11/03/2026 | 367 KB | **raiz** | **DUPLICATA EXATA** de #25 |
| 27 | Leila Pacheco | 10/05/2026 | 648 KB | `projetos/proposta-solar/` | Primeira do subprojeto novo |

**Propostas únicas de clientes reais: 22** (descontando duplicatas confirmadas: #02, #06, #23, #26)

### 1.2 Propostas Padrão B — Templates por consumo (6 arquivos)

| Faixa | kWp | Data criação | Tamanho |
|---|---|---|---|
| 400 kWh/mês | 3,6 kWp | 06/01/2026 | 750 KB |
| 600 kWh/mês | 5,4 kWp | 06/01/2026 | 755 KB |
| 800 kWh/mês | 7,43 kWp | 06/01/2026 | 752 KB |
| 1000 kWh/mês | 9,29 kWp | 06/01/2026 | 754 KB |
| 1200 kWh/mês | 11,15 kWp | 06/01/2026 | 753 KB |
| 1500 kWh/mês | 13,93 kWp | 06/01/2026 | 749 KB |

→ Todos criados no mesmo dia (06/01/2026). Usados como resposta rápida para clientes onde não há personalização necessária.

### 1.3 Propostas Padrão C — Sistema novo (fora de `mf soluçoes`)

Encontradas no **Desktop** — geradas pelo CRM app:

| Cliente | Data | Tamanho | Localização |
|---|---|---|---|
| IG MOBILE TESTE | 20/05/2026 | 1.543 KB | Desktop |
| TESTE PC QR BAMBUI | 20/05/2026 | 1.548 KB | Desktop |
| TESTE PC QR BAMBUI (10) | 27/05/2026 | 1.548 KB | Desktop (10ª cópia) |

Encontradas na **pasta `projetos/proposta-solar/`**:

| Cliente | Data | Tamanho |
|---|---|---|
| JANINE SEU AMOR | 13/05/2026 | 1.359 KB |
| KRONXZ (teste) | 12/05/2026 | 1.357 KB |
| LEAD TESTE 01 (teste) | 14/05/2026 | 1.595 KB |

**Descoberta crítica — Downloads:**
```
proposta-1779919967247.pdf   100 MB   27/05/2026  ← PDF corrompido/gigante de teste
proposta-1779919985868.pdf   100 MB   27/05/2026  ← mesmo arquivo duplicado
```
Esses arquivos têm 100 MB cada — tamanho impossível para proposta normal (as reais têm ~750 KB). São artefatos de desenvolvimento/bug de html2pdf. **Não representam propostas reais.**

### 1.4 Screenshots da proposta no sistema (Desktop)

```
FireShot Capture 006 - Proposta Solar - [mf-solucoes-dev.web.app].png   569 KB  26/05/2026
FireShot Capture 008 - Proposta Solar - [mf-solucoes-dev.web.app].png   570 KB  27/05/2026
FireShot Capture 009 - Proposta Solar - [mf-solucoes-dev.web.app].png   448 KB  28/05/2026
FireShot Capture 012 - Proposta Solar - [mf-solucoes-dev.web.app].png   489 KB  02/06/2026
FireShot Capture 013 - PROPOSTA SOLAR - ALMEIDA - [mf-solucoes-dev.web.app].png  1.644 KB  02/06/2026
FireShot Capture 014 - PROPOSTA SOLAR - ALMEIDA - [mf-solucoes-dev.web.app].png  1.797 KB  02/06/2026
```

→ **ALMEIDA** aparece como cliente em screenshots de 02/06/2026 — **proposta gerada recentemente que não foi salva como PDF**. Confirma que existe produção recente não capturada em disco.

---

## PARTE 2 — LAUDOS: SITUAÇÃO REAL

### 2.1 O que existe

**Templates encontrados** (5 DOCX na pasta `LAUDOS/`):

| Template | Data criação | Tipo |
|---|---|---|
| Ficha Técnica de Levantamento de Projeto Fotovoltaico.docx | — | Formulário pré-vistoria |
| LAUDO TÉCNICO DE ANÁLISE DE EQUIPAMENTO DANIFICADO POR DISTÚRBIO ELÉTRICO.docx | 09/03/2026 | Queima/surto |
| LAUDO TÉCNICO DE INSPEÇÃO ELÉTRICA.docx | 20/02/2026 | Inspeção geral |
| LAUDO TÉCNICO PERICIAL EM INSTALAÇÕES ELÉTRICAS.docx | 20/02/2026 | Laudo pericial |
| LAUDO TÉCNICO PLUS FULL.docx | 20/02/2026 | Versão completa |
| LAUDO TÉCNICO – ANÁLISE DE QUEDA DE TENSÃO.docx | 20/02/2026 | Queda de tensão |

**Laudos preenchidos por cliente: ZERO encontrado em todo o computador.**

### 2.2 O que isso significa operacionalmente

O processo atual de laudos é provavelmente:
1. Marcos abre o template DOCX no Word
2. Preenche os dados do cliente diretamente no Word
3. Gera PDF → envia por WhatsApp
4. **Fecha sem salvar** o arquivo preenchido com o nome do cliente

Resultado: zero histórico de laudos. Cada atendimento começa do zero.

### 2.3 Pistas nas imagens WhatsApp

116 imagens/vídeos WhatsApp identificados, concentrados em:
- Jun/2025: **98 arquivos** (maior concentração — claramente um trabalho de campo)
- Abr/2026: **12 arquivos** (outro trabalho)

Esses arquivos são **provavelmente fotos de instalação ou vistoria** enviadas por WhatsApp. Se vinculados ao cliente correto, formariam o corpo visual de um laudo.

---

## PARTE 3 — MAPA COMPLETO DE MÍDIA

| Categoria | Quantidade | Tamanho | Localização |
|---|---|---|---|
| **Vídeos WhatsApp** | 19 (14 únicos) | 74,3 MB | `imagens solar/` e `imagens divulgacao/` |
| **Imagens WhatsApp** | 97 | 109,2 MB | `imagens solar/` e `imagens divulgacao/` |
| **Imagens de marketing** | 23 | ~40 MB | raiz + pastas |
| **Logos marca e bancos** | 12 | ~1 MB | raiz |
| **Imagens solar (banco)** | 29 | ~15 MB | raiz |
| **QR codes** | 6 | ~0,3 MB | `panfletos qr code/` |
| **IA geradas (ChatGPT)** | 2 | ~3,7 MB | raiz |
| **Screenshots sistema** | 4 | ~1,7 MB | raiz |
| **TOTAL MÍDIA** | **192 arquivos** | **~244 MB** | — |

**Descoberta**: 5 vídeos estão duplicados entre as duas pastas de imagens. Os vídeos de Jun/2025 são quase certamente registros de uma instalação fotovoltaica específica — o maior conjunto contínuo de mídia no computador.

---

## PARTE 4 — DECISÃO ARQUITETURAL: A ou B?

### Pergunta: por cliente ou por tipo de documento?

**Opção A — Por cliente primeiro**
```
Clientes/
  João Silva/
    Proposta/    ← 1 proposta
    Laudos/      ← 0 laudos
    Orçamentos/  ← 0 orçamentos
    Mídia/       ← fotos
```

**Opção B — Por tipo de documento primeiro**
```
Propostas/
  2025/05/ João Silva/
  2025/06/ Antonio Carlos/
Laudos/
  (vazio)
Orçamentos/
  Mattheus Chagas/
```

### Análise técnica comparativa

| Critério | Opção A (por cliente) | Opção B (por tipo) |
|---|---|---|
| **Como Marcos pensa hoje** | ❌ Marcos pensa em "propostas" não em "clientes" | ✅ "Onde estão minhas propostas?" |
| **Um cliente com múltiplos docs** | ✅ Tudo junto: proposta + laudo + fotos | ❌ Disperso em 3 pastas |
| **Pesquisa por tipo** | ❌ Precisa entrar em cada pasta de cliente | ✅ Uma pasta, filtro por data/status |
| **Pesquisa por cliente** | ✅ Uma pasta, tudo dentro | ❌ Precisa buscar em Propostas + Laudos |
| **Volume por cliente** | ✅ Equilibrado (1-3 docs por cliente em média) | ⚠️ Propostas cresce mais rápido que laudos |
| **Onboarding de novo colaborador** | ✅ Intuitivo: cada cliente = uma pasta | ⚠️ Menos óbvio |
| **Índice mestre** | ✅ Um índice por cliente vincula tudo | ✅ Índice por tipo é mais simples |
| **Relatórios gerenciais** | ❌ "Quantas propostas enviadas em junho?" exige scan de todos os clientes | ✅ Direto na pasta Propostas/2026/06/ |
| **Realidade hoje** | ⚠️ Nenhuma organização por cliente existe ainda | ✅ As propostas já estão separadas dos laudos |

### Veredicto: **Modelo Híbrido com Tipo como raiz e Cliente como referência cruzada**

Nem A nem B puro. O modelo ideal para o MF Control Center:

```
ESTRUTURA: organizada por TIPO DE DOCUMENTO + ANO + MÊS
ÍNDICE: vincula cada documento a um CLIENT_ID
VISTA: o Control Center oferece AMBAS as visualizações via software
```

**Analogia**: como o Spotify — os arquivos ficam em servidores por tipo (áudio, capa, metadado), mas a interface mostra "Minhas músicas por artista". O usuário vê por artista, o sistema armazena por tipo.

Justificativa técnica:
1. Os relatórios operacionais mais frequentes são por tipo: "propostas deste mês", "laudos pendentes de assinatura", "orçamentos aprovados"
2. A vista por cliente ("o histórico do João Silva") é gerada dinamicamente pelo índice — não precisa de pasta física por cliente
3. Escala melhor: uma pasta `Propostas/2026/06/` com 15 arquivos é mais gerenciável que 15 pastas `Clientes/[x]/Proposta/` com 1 arquivo cada
4. Migração mais simples: os 27 PDFs existentes já estão "por tipo" — é só organizar por ano/mês

---

## PARTE 5 — ARQUITETURA DOCUMENTAL DEFINITIVA

### 5.1 Raiz e localização

```
C:\Users\kronxz\Documents\MF Soluções\
(sincronizado pelo OneDrive automaticamente)
```

**Por que `Documents` e não `AppData`:**
- OneDrive sincroniza `Documentos` por padrão no Windows 11 — zero configuração
- Marcos pode abrir os PDFs pelo Explorer mesmo com o app fechado
- Técnico de suporte encontra sem habilitar pastas ocultas
- Migração de máquina = zero esforço (OneDrive sincroniza tudo)

### 5.2 Árvore completa definitiva

```
Documents\MF Soluções\                          ← RAIZ OFICIAL
│
├── _sistema\                                    ← controle interno do Control Center
│   ├── config.json                             configurações globais
│   ├── schema.json                             versão do schema (semver)
│   ├── sequencias.json                         próximo ID por tipo/ano
│   └── migration.log                           histórico de migrações
│
├── Indices\                                     ← fonte de verdade do Control Center
│   ├── propostas.json                          índice mestre de todas as propostas
│   ├── laudos.json                             índice mestre de todos os laudos
│   ├── orcamentos.json                         índice mestre de todos os orçamentos
│   └── clientes.json                           índice de clientes (cross-reference)
│
├── Propostas\
│   ├── 2025\
│   │   ├── 05\
│   │   │   ├── PROP-2025-001_ANDREIA\
│   │   │   │   ├── meta.json                  dados estruturados completos
│   │   │   │   ├── v1\
│   │   │   │   │   └── PROP-2025-001_v1_RASCUNHO.pdf
│   │   │   │   └── atual\
│   │   │   │       └── PROP-2025-001_ANDREIA.pdf
│   │   │   └── PROP-2025-002_PIMENTA\
│   │   │       └── ...
│   │   ├── 06\  → 4 propostas (Antonio Carlos, Edson, Alexandre, de Antonio)
│   │   ├── 07\  → 4 propostas (Marcos Resenhas, Roberto, R Silveira, Romulo Silveira)
│   │   ├── 08\  → 1 proposta (Acir de Castro)
│   │   ├── 09\  → 2 propostas (Maikon Monteiro, Anderson Titonelli)
│   │   ├── 11\  → 3 propostas (Gessilda, Russo, Andreia Pimenta)
│   │   └── 12\  → 1 proposta (Fernando)
│   ├── 2026\
│   │   ├── 02\  → 1 proposta (Luiz Pinho)
│   │   ├── 03\  → 3 propostas (Jandira, Luiz pinho Leo, Arnaldo)
│   │   ├── 05\  → 2 propostas (Leila Pacheco, Janine)
│   │   └── 06\  → novas propostas
│   └── Templates\                              ← propostas modelo (Padrão B)
│       ├── TMPL-400kwh_3.6kwp.pdf
│       ├── TMPL-600kwh_5.4kwp.pdf
│       ├── TMPL-800kwh_7.43kwp.pdf
│       ├── TMPL-1000kwh_9.29kwp.pdf
│       ├── TMPL-1200kwh_11.15kwp.pdf
│       └── TMPL-1500kwh_13.93kwp.pdf
│
├── Laudos\
│   ├── Templates\                              ← 5 DOCX existentes
│   │   ├── TMPL_LAUDO_QUEIMA.docx
│   │   ├── TMPL_LAUDO_INSPECAO.docx
│   │   ├── TMPL_LAUDO_PERICIAL.docx
│   │   ├── TMPL_LAUDO_PLUS_FULL.docx
│   │   └── TMPL_LAUDO_QUEDA_TENSAO.docx
│   └── 2026\
│       └── 06\
│           └── LAUD-2026-001_CLIENTE\
│               ├── meta.json
│               ├── dados.json
│               ├── fotos\
│               │   ├── foto-001.jpg
│               │   └── thumb\
│               ├── assinatura\
│               │   └── assinatura.png
│               └── PDF\
│                   └── LAUD-2026-001_CLIENTE_QUEIMA.pdf
│
├── Orcamentos\
│   ├── Templates\
│   └── 2025\
│       ├── 06\
│       │   └── ORC-2025-001_MATTHEUS-CHAGAS\
│       │       ├── meta.json
│       │       ├── itens.json
│       │       └── PDF\
│       │           └── ORC-2025-001_MATTHEUS-CHAGAS.pdf
│       └── 10\
│           └── ORC-2025-002_RODRIGO-LUIZ\
│               ├── meta.json
│               └── ...
│
├── Projetos\                                   ← documentação técnica fotovoltaica
│   ├── CAD\
│   │   ├── DWG_ENEL.dwg
│   │   ├── Diagrama_Unifilar_Inversor.dwg
│   │   ├── Diagrama_Unifilar_MicroInversor.dwg
│   │   ├── Projeto_Microgercao_24kwp.dwg
│   │   ├── Planta_Implantacao_Solar.dwg
│   │   ├── Sistema_Bombeamento_3CV.dwg
│   │   ├── Diagrama_Copel.dwg
│   │   ├── Geracao_Distribuida_ENERGISA.dwg
│   │   └── blocos_fotovoltaicos.dxf
│   └── Unifilares\
│       ├── Diagrama_Unifilar_Inversor.pdf
│       ├── Diagrama_Unifilar_MicroInversor.pdf
│       ├── Exemplo_Geracao_Distribuida.pdf
│       └── Sistema_Bombeamento.pdf
│
├── Documentos\                                 ← documentos institucionais da empresa
│   ├── Empresa\
│   │   ├── MEI.pdf
│   │   ├── IRPJ.pdf
│   │   └── Carteira_Profissional_CFT_CRT.pdf
│   ├── Contratos\
│   │   ├── Templates\
│   │   │   ├── Contrato_Prestacao_CPF.docx
│   │   │   ├── Contrato_Prestacao_CNPJ.docx
│   │   │   └── Contrato_Limpeza_Placas.docx
│   │   └── Assinados\
│   │       └── procuracao_engenheiro_pimenta.pdf
│   ├── Procuracoes\
│   │   ├── Templates\
│   │   │   ├── Procuracao_CPF.docx
│   │   │   └── Procuracao_CNPJ.docx
│   │   └── Assinadas\
│   └── Formularios\
│       ├── Ficha_Dados_do_Cliente.docx
│       └── Ficha_Tecnica_Levantamento_Fotovoltaico.docx
│
├── Marketing\
│   ├── Logos\
│   │   ├── logo_mf.jpg
│   │   └── [logos bancos financeiros]
│   ├── Imagens\
│   │   └── [imagens solar, casa, qualidade...]
│   ├── Panfletos\
│   │   ├── PANFLETO_QR_CENTRO.pdf
│   │   ├── PANFLETO_QR_PONTA_NEGRA.pdf
│   │   └── PANFLETO_QR_ITAIPUACU.pdf
│   └── Social\
│       └── [posts Instagram...]
│
├── Midia\                                      ← fotos e vídeos de instalação/vistoria
│   └── 2025\
│       └── 06\
│           └── instalacao-junho-2025\          ← 98 imagens + 14 vídeos WhatsApp
│               ├── fotos\
│               └── videos\
│
├── Importados\                                 ← PDFs externos sem categorização
│   ├── sem-cliente\
│   └── [leadId]\
│
├── Backups\
│   ├── automaticos\   ← backup diário (índices + meta.json)
│   ├── completos\     ← backup semanal (tudo)
│   └── firebase\      ← snapshots Firestore
│
├── Sync\
│   ├── fila-upload\
│   ├── fila-download\
│   └── estado.json
│
└── Logs\
    ├── app-2026-06.log
    └── erros-2026-06.log
```

### 5.3 Convenção de IDs definitiva

```
PROPOSTAS:  PROP-[AAAA]-[NNN]    ex: PROP-2026-043
LAUDOS:     LAUD-[AAAA]-[NNN]    ex: LAUD-2026-017
ORÇAMENTOS: ORC-[AAAA]-[NNN]     ex: ORC-2026-003
TEMPLATES:  TMPL-[TIPO]-[DESC]   ex: TMPL-600kwh_5.4kwp
```

- Sequencial reinicia por ano por tipo
- Nunca é reaproveitado
- Nunca inclui nome do cliente (evita problema de encoding)

### 5.4 Nomenclatura de PDFs definitiva

```
[ID]_[NOME-CLIENTE-NORMALIZADO].pdf           ← versão atual
[ID]_v[N]_[STATUS].pdf                        ← dentro da pasta de versão

Normalização do nome:
  - Sem acentos (ã→a, ç→c, é→e)
  - Maiúsculas
  - Espaços e hifens → hífen único
  - Máx 30 chars para o nome
  - Remove: / \ : * ? " < > | ( ) [ ] { }

Exemplos:
  PROP-2025-001_ANDREIA.pdf
  PROP-2025-006_ANTONIO-CARLOS.pdf
  PROP-2026-022_LUIZ-PINHO-LEO.pdf
  LAUD-2026-001_JOAO-SILVA_QUEIMA.pdf
  ORC-2025-001_MATTHEUS-CHAGAS.pdf
```

### 5.5 Schema do `meta.json` de proposta

```json
{
  "id": "PROP-2025-001",
  "tipo": "proposta",
  "versaoAtual": 1,
  "versoes": [
    {
      "numero": 1,
      "criadaEm": "2025-05-23T19:37:00.000Z",
      "status": "desconhecido",
      "pdfRelativo": "v1/PROP-2025-001_v1.pdf",
      "pdfHash": "sha256:...",
      "pdfTamanho": 719847,
      "motivo": "Importado do histórico"
    }
  ],
  "cliente": {
    "nome": "Andreia",
    "nomeNormalizado": "andreia",
    "telefone": null,
    "endereco": null,
    "leadId": null
  },
  "tecnico": {
    "kwp": null,
    "placas": null,
    "inversor": null,
    "consumoMensal": null
  },
  "financeiro": {
    "investimento": null,
    "economia": null,
    "payback": null
  },
  "operacional": {
    "status": "desconhecido",
    "vendedor": "Marcos",
    "criadaEm": "2025-05-23T19:37:00.000Z",
    "editadaEm": "2025-05-23T19:37:00.000Z",
    "enviadaEm": null,
    "fechadaEm": null,
    "canalEnvio": null,
    "motivoRecusa": null,
    "validadeExpira": null
  },
  "sync": {
    "firebaseSync": false,
    "firebaseDocId": null,
    "firebaseStorageUrl": null
  },
  "importacao": {
    "importado": true,
    "origemOriginal": "C:/Users/kronxz/OneDrive/Área de Trabalho/mf soluçoes/projetos/...",
    "nomeOriginal": "Proposta de Energia Solar Fotovoltaica Andreia.pdf",
    "importadoEm": "2026-06-08T00:00:00.000Z"
  }
}
```

---

## PARTE 6 — ESFORÇO DE MIGRAÇÃO

### 6.1 Inventário de migração

| Categoria | Qtd | Ação | Esforço |
|---|---|---|---|
| Propostas A — únicas | 22 PDFs | Copiar + criar meta.json + indexar | Alto (manual para cada) |
| Propostas A — duplicatas | 4 PDFs | Arquivar em Lixeira/ | Baixo |
| Propostas B — templates | 6 PDFs | Copiar para Templates/ | Muito baixo |
| Propostas C — sistema novo | 3 PDFs (reais) | Copiar + indexar | Baixo |
| Laudos — templates | 5 DOCX | Copiar para Laudos/Templates/ | Muito baixo |
| Orçamentos | 3 docs | Copiar + indexar | Baixo |
| Projetos CAD | 10 DWG/DXF | Copiar para Projetos/CAD/ | Muito baixo |
| Contratos templates | 5 DOCX | Copiar para Documentos/Contratos/ | Muito baixo |
| Formulários | 2 DOCX | Copiar para Documentos/Formularios/ | Muito baixo |
| Panfletos | 6 PDF/PNG | Copiar para Marketing/Panfletos/ | Muito baixo |
| Mídia WhatsApp | 116 arqs | Copiar para Midia/2025/06/ | Baixo |
| Documentos pessoais | ~15 PDFs | NÃO MIGRAR | Zero |
| Lixo digital | ~170 arqs | NÃO MIGRAR | Zero |

**Total documentos a migrar: ~200 arquivos** (excluindo lixo e pessoal)
**Tempo estimado de migração assistida: 2-4h** (com assistente de importação do Control Center)

### 6.2 Campos que serão null nos registros históricos

Para as 22 propostas históricas, os seguintes campos ficarão em `null` porque não existem no nome do arquivo:
- `telefone`, `endereco`, `leadId`
- `kwp`, `placas`, `investimento`, `economia`, `payback`
- `status` → ficará como `"desconhecido"` (não sabemos se foram aceitas ou não)
- `enviadaEm`, `canalEnvio`, `fechadaEm`

**Esses campos podem ser preenchidos retroativamente** se Marcos recordar ou se o cliente aparecer no CRM.

### 6.3 O que a migração NÃO faz

- **Não apaga nenhum arquivo original** — a pasta `mf soluçoes` permanece intacta
- **Não renomeia nenhum arquivo na pasta original** — cópia para nova estrutura
- **Não requer internet** — operação 100% local
- **Não exige que o Control Center esteja online** — pode ser feito offline

---

## PARTE 7 — VANTAGENS E RISCOS

### 7.1 Vantagens da arquitetura proposta

| Vantagem | Impacto |
|---|---|
| Pesquisa instantânea por cliente, data, status, valor | Elimina busca manual no Explorer |
| Histórico visual de propostas por cliente (27 históricos migrados imediatamente) | Visão 360° na primeira semana |
| Templates Padrão B integrados como "proposta rápida" | Fluxo de atendimento 2x mais rápido |
| Laudos com campo de fotos estruturado | Elimina perda de fotos de vistoria |
| OneDrive sincroniza automaticamente | Backup sem custo adicional |
| Marcas ALMEIDA e outros clientes recentes que não foram salvos serão capturados | Fechamento de gap de histórico |
| PDFs duplicados eliminados do índice (mas preservados no disco) | Clareza operacional |

### 7.2 Riscos

| Risco | Probabilidade | Mitigação |
|---|---|---|
| Marcos continua salvando PDFs no Desktop por hábito | ALTA | Notificação do Control Center: "PDF detectado fora da estrutura MF. Importar?" |
| ALMEIDA e outros clientes recentes sem PDF salvo | CONFIRMADA | Regenerar a partir dos dados do CRM ou WhatsApp |
| Propostas geradas pelo celular não chegam ao Control Center | ALTA | Etapa CC-9.8: sync Firebase — proposta gerada em qualquer device vai para Firebase e é baixada pelo Control Center |
| proposta-*.pdf (100 MB) confunde importação automática | CONFIRMADA | Filtro por tamanho: ignorar PDFs > 20 MB na importação de propostas |
| Campos null nos registros históricos | CONFIRMADA | Aceitar como estado inicial — enriquecer gradualmente |
| Sequências de vídeos WhatsApp sem cliente vinculado | CONFIRMADA | Mover para `Midia/sem-cliente/` e aguardar Marcos identificar manualmente |

---

## PARTE 8 — PLANO DE IMPLEMENTAÇÃO ATUALIZADO

### CC-9.0 — Infraestrutura base

**Cria a estrutura de pastas em `Documents\MF Soluções\` e os índices vazios.**

Tarefas:
- Detecta/cria `Documents\MF Soluções\`
- Cria toda a árvore de subpastas
- Inicializa `Indices/propostas.json`, `laudos.json`, `orcamentos.json` vazios
- Inicializa `_sistema/sequencias.json` com contadores em 0
- Expõe via IPC: `getDataPath()`, `readIndex()`, `writeIndex()`, `nextId()`, `atomicWrite()`
- Testa atomic write (`.tmp` → rename)

**Entrega**: pasta criada + índices prontos. Nenhuma migração ainda.
**Esforço**: 3-4h · **Risco**: Baixo

---

### CC-9.1 — Assistente de Importação Histórica

**Importa os 22 PDFs de clientes reais para a nova estrutura.**

Tarefas:
- Tela: "Selecionar pasta de origem" → aponta para `mf soluçoes\projetos\`
- Varre recursivamente, encontra PDFs
- Filtra: ignora > 20 MB, ignora temporários (~$), ignora templates (Padrão B)
- Para cada PDF candidato: extrai nome do cliente do nome do arquivo
- Mostra lista: "Encontrei 27 propostas. Revise e confirme:"
  - Cliente detectado ← editável
  - Data de criação (mtime) ← editável
  - Ação: Importar / Ignorar / É duplicata de:
- Ao confirmar: copia para estrutura correta, cria meta.json, atualiza índice
- Relatório final: "22 importadas, 4 ignoradas (duplicatas), 1 pendente de confirmação"

**Entrega**: 22 propostas indexadas no Control Center.
**Esforço**: 6-8h · **Risco**: Médio (parsing de nomes pode errar)

---

### CC-9.2 — Central de Propostas: Listagem e Pesquisa

**Interface nativa que substitui o webview atual.**

Tarefas:
- Lê `Indices/propostas.json` ao abrir
- Grid: ID · Cliente · kWp · Valor · Status · Data
- Filtros: Status, Ano/Mês, Vendedor
- Busca por nome (substring, sem acento)
- Botões: Abrir PDF · Ver detalhes · Nova proposta
- Vista por cliente: "Ver tudo de João Silva"

**Entrega**: Central de Propostas funcional com 22 propostas históricas.
**Esforço**: 6-8h · **Risco**: Baixo

---

### CC-9.3 — Criação e Geração de PDF

**Formulário nativo + geração de PDF salvo na estrutura.**

Tarefas:
- Formulário multi-etapa: Cliente → Técnico → Financeiro → Revisão
- Auto-save em `payload.json`
- Geração PDF: `proposta.html` em BrowserWindow offscreen → pdf
- PDF salvo em `Propostas/[ANO]/[MES]/[ID]/v1/` automaticamente
- Hash SHA-256 calculado e salvo no meta.json
- Fluxo de versão: nova edição → pergunta "Criar v2 ou editar rascunho?"
- Status workflow: RASCUNHO → GERADA → ENVIADA → ACEITA/RECUSADA

**Entrega**: criação completa de proposta dentro do Control Center.
**Esforço**: 8-12h · **Risco**: Médio

---

### CC-9.4 — Templates Padrão B Integrados

**"Proposta rápida" sem personalização de campos técnicos.**

Tarefas:
- Tela com os 6 templates por consumo (400 a 1500 kWh)
- Usuário seleciona faixa → informa nome do cliente
- Control Center pega o PDF template + gera versão com capa personalizada
- Salva na estrutura como proposta normal

**Entrega**: envio de proposta em <1 minuto para casos simples.
**Esforço**: 3-4h · **Risco**: Baixo

---

### CC-9.5 — Central de Laudos

**Formulário digital por tipo de laudo + fotos + assinatura + PDF.**

Tarefas:
- 6 tipos de laudo com formulários específicos
- Upload de fotos + geração de thumbnails
- Canvas de assinatura digital
- Template HTML por tipo de laudo
- Geração de PDF + estrutura `Laudos/[ANO]/[MES]/[ID]/`
- Importação dos 5 templates DOCX como referência (não como interface)

**Entrega**: processo de laudo 100% digital, com histórico por cliente.
**Esforço**: 12-16h · **Risco**: Médio-Alto

---

### CC-9.6 — Central de Orçamentos

**Formulário de serviços + materiais + valor final + PDF.**

Tarefas:
- Lista de serviços (descrição, qtd, valor unitário, desconto)
- Lista de materiais (produto, unidade, qtd, valor)
- Cálculo automático de subtotais e total
- Opções de pagamento
- Geração de PDF
- Importar os 2 orçamentos históricos (Mattheus Chagas, Rodrigo)

**Entrega**: orçamento formal em minutos.
**Esforço**: 8-10h · **Risco**: Baixo

---

### CC-9.7 — Backup Automático

**Backup diário de índices + backup semanal completo.**

Tarefas:
- Backup automático ao fechar: zip de `Indices/` + todos os `meta.json`
- Backup semanal: zip completo de `Documents\MF Soluções\` (exceto `Backups/`)
- Retenção: 30 dias automáticos, indefinido manuais
- Manifest com SHA-256 de cada arquivo
- Integração Health Center: alerta se > 7 dias sem backup

**Entrega**: proteção automática dos dados.
**Esforço**: 4-6h · **Risco**: Baixo

---

### CC-9.8 — Sincronização Firebase

**Metadados no Firestore + PDFs no Storage sob demanda.**

Tarefas:
- Upload de `meta.json` de cada novo documento para Firestore `propostas/{id}`
- Botão "Enviar link" → upload PDF para Firebase Storage → URL copiada
- Fila de sync offline: operações pendentes processadas ao reconectar
- Barra de status: 🟢 Sincronizado · 🟡 N pendentes · 🔴 Offline
- Propostas geradas no celular (via CRM web): aparecem no Control Center via download do Firebase

**Entrega**: acesso de qualquer device + compartilhamento por link.
**Esforço**: 8-10h · **Risco**: Médio

---

### CC-9.9 — Painel Unificado do Cliente

**Busca que retorna propostas + laudos + orçamentos de um cliente.**

Tarefas:
- Campo de busca global: "João Silva" → lista todos os documentos deste cliente
- Página do cliente: foto do histórico, total de propostas, status atual
- Estatísticas: taxa de conversão, valor médio de proposta, tempo médio de fechamento
- Export: "Baixar todos os documentos de João Silva" → ZIP

**Entrega**: visão 360° de cada cliente.
**Esforço**: 8-10h · **Risco**: Baixo

---

### Tabela resumo

| Etapa | Nome | Esforço | Sequência |
|---|---|:---:|---|
| CC-9.0 | Infraestrutura base | 3-4h | **1º — bloqueia tudo** |
| CC-9.1 | Importação histórica | 6-8h | 2º |
| CC-9.2 | Listagem e pesquisa | 6-8h | 3º |
| CC-9.3 | Criação e geração PDF | 8-12h | 4º |
| CC-9.4 | Templates rápidos | 3-4h | junto com 9.3 |
| CC-9.5 | Central de laudos | 12-16h | 5º |
| CC-9.6 | Central de orçamentos | 8-10h | junto com 9.5 |
| CC-9.7 | Backup automático | 4-6h | qualquer momento após 9.0 |
| CC-9.8 | Sync Firebase | 8-10h | 6º |
| CC-9.9 | Painel do cliente | 8-10h | 7º |
| **TOTAL** | | **66-88h** | |

### Marcos de entrega de valor

```
Após CC-9.0 + CC-9.1 + CC-9.2 (≈15-20h):
  → Control Center mostra os 22 anos de propostas históricas
  → Pesquisa funciona: "Andreia" → encontra em <1s
  → VERSÃO MÍNIMA UTILIZÁVEL

Após CC-9.3 + CC-9.4 (≈11-16h adicionais):
  → Criar e enviar proposta 100% dentro do Control Center
  → Templates prontos por faixa de consumo
  → VERSÃO OPERACIONAL COMPLETA

Após CC-9.5 + CC-9.6 + CC-9.7 (≈24-32h adicionais):
  → Laudos, orçamentos, backup automático
  → CENTRO DOCUMENTAL COMPLETO

Após CC-9.8 + CC-9.9 (≈16-20h adicionais):
  → Sync Firebase, painel de cliente
  → PRODUTO FINAL
```

---

*Documento gerado em: 08/06/2026 · CC-9.1 Auditoria Complementar + Arquitetura V1*
*Zero arquivos alterados · Zero commits · Zero código escrito*
*Status: AGUARDANDO APROVAÇÃO → CC-9.0*

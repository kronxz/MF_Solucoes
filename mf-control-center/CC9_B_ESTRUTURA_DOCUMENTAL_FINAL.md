# CC-9B — ESTRUTURA DOCUMENTAL FINAL
## Revisão Arquitetural Complementar · MF Soluções · Junho 2026

> **Status:** AGUARDANDO APROVAÇÃO — Pré-requisito para CC-9.0  
> **Escopo:** Modelo de entidades, relacionamentos, indexação e migração  
> **Baseado em:** CC-9A (CLIENTE_360_AUDITORIA.md) + CC9_ESPECIFICACAO_OPERACIONAL.md  
> **Restrições:** NÃO IMPLEMENTAR — documentação arquitetural apenas  
> **Gerado em:** 2026-06-09

---

## 1. O PROBLEMA DO MODELO ANTERIOR

O modelo da CC-9A relacionava apenas:

```
CLIENTE ──→ ARQUIVOS
```

Isso era plano demais. Perguntas operacionais reais não funcionam assim:

- *"Quais obras estão sem laudo?"* → precisa de OBRA como entidade
- *"A proposta 003 do Antonio Carlos virou obra?"* → PROPOSTA deve se ligar a OBRA
- *"Quais mídias pertencem à instalação do Pimenta?"* → MÍDIA deve se ligar a OBRA, não apenas a CLIENTE
- *"O laudo do Roberto foi emitido antes ou depois da proposta?"* → relação temporal entre PROPOSTA → OBRA → LAUDO
- *"Qual o orçamento de materiais que foi aprovado para o Silveira?"* → ORÇAMENTO deve se ligar a PROPOSTA ou OBRA

O índice correto deve ser:

```
CLIENTE
  └── PROPOSTA(s)
        └── OBRA (quando proposta vira instalação)
              ├── LAUDO(s)
              ├── ORÇAMENTO(s)
              └── MÍDIA(s)
```

---

## 2. MODELO DE ENTIDADES — DEFINIÇÕES

### 2.1 CLIENTE

> **O que é:** A pessoa física ou jurídica que recebeu ou irá receber um serviço da MF Soluções.

**Não é:** um arquivo. Não é uma pasta. É uma entidade lógica com ID próprio.

**Atributos canônicos:**

| Campo | Tipo | Obrigatório | Exemplo |
|---|---|:---:|---|
| `id` | string (slug) | ✅ | `antonio-carlos` |
| `nome` | string | ✅ | `Antonio Carlos` |
| `nome_alternativo` | string[] | ❌ | `["Antonio", "Toninho"]` |
| `cpf_cnpj` | string | ❌ | `123.456.789-00` |
| `telefone` | string | ❌ | `(21) 99999-9999` |
| `email` | string | ❌ | — |
| `endereco` | string | ❌ | `Rua X, 103, Maricá` |
| `cidade` | string | ❌ | `Maricá` |
| `status` | enum | ✅ | `lead` \| `negociacao` \| `obra` \| `concluido` \| `inativo` |
| `criado_em` | date | ✅ | `2025-06-21` |
| `atualizado_em` | date | ✅ | `2026-06-09` |
| `origem` | enum | ✅ | `landing_page` \| `indicacao` \| `instagram` \| `direto` |
| `firebase_lead_id` | string | ❌ | ID no Firestore `lp_leads` |

**Regra de unicidade:** Um cliente é identificado pelo `id` (slug). Duplicatas como `r-silveira` e `romulo-silveira` são mescladas em tempo de importação — o sistema deve detectar por similaridade de nome e propor unificação.

---

### 2.2 PROPOSTA

> **O que é:** Um documento formal enviado ao cliente descrevendo o sistema solar proposto, com valores, dimensionamento e condições comerciais.

**Não é:** um orçamento de materiais. Não é um contrato. É a proposta comercial.

**Atributos canônicos:**

| Campo | Tipo | Obrigatório | Exemplo |
|---|---|:---:|---|
| `id` | string | ✅ | `PROP-2025-001` |
| `cliente_id` | string (FK) | ✅ | `antonio-carlos` |
| `versao` | integer | ✅ | `3` |
| `arquivo` | string (path) | ✅ | `Documentos/Propostas/2025/06/...pdf` |
| `tamanho_bytes` | integer | ✅ | `728378` |
| `data_geracao` | date | ✅ | `2025-06-23` |
| `kwp` | float | ❌ | `7.43` |
| `investimento_brl` | float | ❌ | `35000.00` |
| `status` | enum | ✅ | `rascunho` \| `enviada` \| `aceita` \| `recusada` \| `expirada` |
| `gerou_obra` | boolean | ✅ | `false` |
| `obra_id` | string (FK) | ❌ | `OBRA-2025-001` (se aceita) |
| `sha256` | string | ✅ | hash para dedup |
| `padrao_nome` | enum | ✅ | `A` \| `B` \| `C` \| `D` |

**Regra de versão:** Múltiplas propostas para o mesmo cliente são versões do mesmo produto. A proposta com `status: aceita` é a que gerou ou poderá gerar uma Obra.

---

### 2.3 ORÇAMENTO

> **O que é:** O levantamento de custos de materiais e mão de obra para execução de um serviço. Pode existir associado a uma Proposta aceita ou diretamente a uma Obra.

**Não é:** a proposta comercial. Não é o laudo. É o documento interno de custo.

**Distinção importante:**
- **Proposta** → para o cliente (valor de venda)
- **Orçamento** → interno (custo de materiais + serviço)

**Atributos canônicos:**

| Campo | Tipo | Obrigatório | Exemplo |
|---|---|:---:|---|
| `id` | string | ✅ | `ORC-2025-001` |
| `cliente_id` | string (FK) | ✅ | `pimenta` |
| `proposta_id` | string (FK) | ❌ | `PROP-2025-007` |
| `obra_id` | string (FK) | ❌ | `OBRA-2025-003` |
| `arquivo` | string (path) | ✅ | `Documentos/Orcamentos/2025/07/...pdf` |
| `data_emissao` | date | ✅ | `2025-07-10` |
| `valor_materiais_brl` | float | ❌ | `18500.00` |
| `valor_mao_obra_brl` | float | ❌ | `5000.00` |
| `valor_total_brl` | float | ❌ | `23500.00` |
| `fornecedor` | string | ❌ | `Cotação WEB-003930589` |
| `status` | enum | ✅ | `aberto` \| `aprovado` \| `executado` \| `cancelado` |

> **Nota sobre cotações de fornecedor:** `Cotação WEB-003930589 silveira R.pdf` encontrada na auditoria é uma **cotação de fornecedor**, não um orçamento para o cliente. É vinculada ao cliente Silveira mas como tipo `cotacao_fornecedor`, subcategoria de Orçamento.

---

### 2.4 LAUDO

> **O que é:** Um documento técnico formal emitido por engenheiro ou técnico habilitado, descrevendo o estado de uma instalação elétrica ou fotovoltaica.

**Tipos identificados na auditoria:**

| Tipo | ID | Descrição | Template encontrado |
|---|---|---|:---:|
| Queima | `laudo-queima` | Análise de equipamento danificado por distúrbio elétrico | ✅ |
| Inspeção Elétrica | `laudo-inspecao` | Inspeção técnica de instalação elétrica | ✅ |
| Pericial | `laudo-pericial` | Laudo técnico pericial em instalações elétricas | ✅ |
| Full Plus | `laudo-full` | Laudo completo com análise aprofundada | ✅ |
| Queda de Tensão | `laudo-tensao` | Análise de queda de tensão | ✅ |
| Fotovoltaico | `laudo-fv` | Específico para sistemas solares | ❌ (não encontrado) |
| Residencial | `laudo-residencial` | Inspeção residencial geral | ❌ |
| Comercial | `laudo-comercial` | Inspeção comercial | ❌ |

**Atributos canônicos:**

| Campo | Tipo | Obrigatório | Exemplo |
|---|---|:---:|---|
| `id` | string | ✅ | `LAUD-2025-001` |
| `cliente_id` | string (FK) | ✅ | `roberto` |
| `obra_id` | string (FK) | ❌ | `OBRA-2025-002` |
| `tipo` | enum | ✅ | `queima` \| `inspecao` \| `pericial` \| `full` \| `tensao` \| `fv` |
| `arquivo_pdf` | string (path) | ✅ | `Documentos/Laudos/2025/07/...pdf` |
| `arquivo_docx` | string (path) | ❌ | rascunho editável |
| `data_emissao` | date | ✅ | `2025-07-15` |
| `engenheiro` | string | ❌ | `Marcos Felipe` |
| `art_numero` | string | ❌ | número da ART/RRT |
| `status` | enum | ✅ | `rascunho` \| `emitido` \| `assinado` \| `entregue` |
| `fotos_vinculadas` | string[] | ❌ | IDs de Mídia |

---

### 2.5 OBRA

> **O que é:** O projeto de execução de um sistema solar (ou serviço elétrico) que foi contratado pelo cliente. É o elo que une todos os outros documentos.

**A Obra é a entidade pivô do modelo.** Ela existe quando uma Proposta é aceita e o serviço entra em execução.

**Uma Obra pode ter:**
- 1 Proposta (que gerou o contrato)
- 1+ Orçamentos de material
- 1+ Laudos técnicos
- N Mídias (fotos e vídeos de instalação)
- 1 Projeto DWG / elétrico

**Atributos canônicos:**

| Campo | Tipo | Obrigatório | Exemplo |
|---|---|:---:|---|
| `id` | string | ✅ | `OBRA-2025-001` |
| `cliente_id` | string (FK) | ✅ | `r-silveira` |
| `proposta_id` | string (FK) | ✅ | `PROP-2025-005` |
| `descricao` | string | ❌ | `Sistema Solar 7,43 kWp - Residencial` |
| `kwp` | float | ❌ | `7.43` |
| `data_inicio` | date | ❌ | `2025-07-28` |
| `data_conclusao` | date | ❌ | `2025-08-05` |
| `endereco_obra` | string | ❌ | pode diferir do cliente |
| `status` | enum | ✅ | `agendada` \| `em_andamento` \| `concluida` \| `cancelada` \| `garantia` |
| `laudos` | string[] | ❌ | IDs de Laudo |
| `orcamentos` | string[] | ❌ | IDs de Orçamento |
| `midias` | string[] | ❌ | IDs de Mídia |
| `projeto_dwg` | string (path) | ❌ | `Documentos/Projetos/...dwg` |
| `concessionaria` | string | ❌ | `ENEL` \| `ENERGISA` \| `COPEL` |

---

### 2.6 MÍDIA

> **O que é:** Qualquer arquivo de imagem ou vídeo que documenta uma obra, instalação, ou evento da empresa.

**Distinção de subcategorias:**

| Subcategoria | Origem | Vinculação | Exemplos encontrados |
|---|---|---|---|
| `foto_obra` | WhatsApp / câmera | Obra específica | 116 fotos Jun/2025 |
| `video_obra` | WhatsApp | Obra específica | 19 vídeos Jun/2025 |
| `foto_produto` | Stock / banco | Nenhuma (marketing) | `photo-*.jpeg` |
| `social_media` | Canva / criação | Campanha | Story Instagram *.png |
| `documento_foto` | Scanner | Documento específico | `Scanner_20250617.pdf` |
| `logo_marca` | Design | Empresa | `logo mf.jpg` |

**Atributos canônicos:**

| Campo | Tipo | Obrigatório | Exemplo |
|---|---|:---:|---|
| `id` | string | ✅ | `MID-2025-001` |
| `arquivo` | string (path) | ✅ | `Media/Obras/2025/06/WhatsApp...jpeg` |
| `tipo` | enum | ✅ | `foto_obra` \| `video_obra` \| `social_media` \| `logo` \| `stock` |
| `obra_id` | string (FK) | ❌ | `OBRA-2025-001` |
| `cliente_id` | string (FK) | ❌ | inferido via obra |
| `data_captura` | date | ✅ | do nome do arquivo WhatsApp |
| `tamanho_bytes` | integer | ✅ | — |
| `sha256` | string | ✅ | dedup |
| `descricao` | string | ❌ | `Vista frontal dos painéis` |
| `origem` | enum | ✅ | `whatsapp` \| `camera` \| `canva` \| `stock` \| `ia` |

---

## 3. MODELO DE RELACIONAMENTOS

### 3.1 Diagrama de Entidade-Relacionamento

```
┌─────────────┐
│   CLIENTE   │
│─────────────│
│ id (PK)     │
│ nome        │
│ status      │
│ origem      │
└──────┬──────┘
       │ 1
       │ tem N
       ▼
┌─────────────┐       ┌─────────────────┐
│   PROPOSTA  │──────►│     OBRA        │
│─────────────│  0..1 │─────────────────│
│ id (PK)     │       │ id (PK)         │
│ cliente_id  │       │ cliente_id      │
│ versao      │       │ proposta_id     │
│ status      │       │ status          │
│ kwp         │       │ kwp             │
│ investimento│       │ data_inicio     │
│ gerou_obra  │       │ data_conclusao  │
└─────────────┘       └────────┬────────┘
                               │
              ┌────────────────┼────────────────┐
              │                │                │
              ▼                ▼                ▼
    ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
    │   ORÇAMENTO  │  │    LAUDO     │  │    MÍDIA     │
    │──────────────│  │──────────────│  │──────────────│
    │ id (PK)      │  │ id (PK)      │  │ id (PK)      │
    │ cliente_id   │  │ cliente_id   │  │ obra_id      │
    │ obra_id (FK) │  │ obra_id (FK) │  │ cliente_id   │
    │ proposta_id  │  │ tipo         │  │ tipo         │
    │ valor_total  │  │ status       │  │ data_captura │
    │ status       │  │ art_numero   │  │ origem       │
    └──────────────┘  └──────────────┘  └──────────────┘
```

### 3.2 Regras de relacionamento

| Regra | Descrição |
|---|---|
| R1 | Todo documento pertence a um CLIENTE (direto ou via Obra) |
| R2 | Uma PROPOSTA pertence a exatamente 1 CLIENTE |
| R3 | Uma PROPOSTA pode gerar 0 ou 1 OBRA |
| R4 | Uma OBRA sempre tem 1 PROPOSTA de origem |
| R5 | LAUDO, ORÇAMENTO e MÍDIA podem se ligar a OBRA **ou** diretamente a CLIENTE |
| R6 | Quando vinculados a OBRA, herdam o CLIENTE da OBRA |
| R7 | MÍDIA de subcategoria `social_media` ou `stock` não requer vínculo com CLIENTE |
| R8 | Templates (DOCX de laudo/contrato) não pertencem a nenhum CLIENTE — ficam em `/Templates` |
| R9 | Documentos pessoais de Marcos não são entidades do sistema — ficam em `/Pessoal` |

### 3.3 Matriz de vínculo por categoria

| Arquivo pode se vincular a → | CLIENTE | PROPOSTA | OBRA | NENHUM |
|---|:---:|:---:|:---:|:---:|
| PDF de proposta | ✅ (direto) | ✅ (é a proposta) | ❌ | ❌ |
| PDF de orçamento | ✅ | ✅ (opcional) | ✅ (opcional) | ❌ |
| PDF de laudo | ✅ | ❌ | ✅ (preferencial) | ❌ |
| DWG de projeto | ✅ (via obra) | ❌ | ✅ (preferencial) | Template* |
| Foto de obra | ✅ (via obra) | ❌ | ✅ (preferencial) | ❌ |
| Vídeo de obra | ✅ (via obra) | ❌ | ✅ (preferencial) | ❌ |
| DOCX de template | ❌ | ❌ | ❌ | ✅ (Templates/) |
| NF-e / NFS-e | ✅ (direto) | ✅ (opcional) | ✅ (opcional) | ❌ |
| Foto de marketing | ❌ | ❌ | ❌ | ✅ (Media/Marketing/) |
| Documento pessoal | ❌ | ❌ | ❌ | ✅ (Pessoal/) |

*DWG genérico como `Diagrama Unifilar Modelo.dwg` vai para Templates/

---

## 4. ÁRVORE DEFINITIVA DE PASTAS

```
Documents\MF Soluções\
│
├── _Sistema\                          ← Metadados e índices (nunca editar manualmente)
│   ├── clientes.json                  ← Master index de todos os clientes
│   ├── propostas.json                 ← Master index de todas as propostas
│   ├── obras.json                     ← Master index de todas as obras
│   ├── laudos.json                    ← Master index de todos os laudos
│   ├── orcamentos.json                ← Master index de todos os orçamentos
│   ├── midias.json                    ← Master index de todas as mídias
│   ├── logs\
│   │   └── YYYY-MM-DD_import.log
│   └── backups\
│       └── YYYY-MM-DD_clientes.json.bak
│
├── Documentos\
│   ├── Propostas\
│   │   ├── 2025\
│   │   │   ├── 05\
│   │   │   ├── 06\
│   │   │   │   ├── PROP-2025-001_antonio-carlos_v1.pdf
│   │   │   │   ├── PROP-2025-002_antonio-carlos_v2.pdf
│   │   │   │   └── PROP-2025-003_antonio-carlos_v3.pdf
│   │   │   ├── 07\
│   │   │   └── ...
│   │   └── 2026\
│   │       ├── 05\
│   │       │   └── PROP-2026-001_almeida_v1.pdf  ← (a ser gerada quando sistema ativo)
│   │       └── 06\
│   │
│   ├── Laudos\
│   │   ├── 2025\
│   │   │   └── MM\
│   │   │       └── LAUD-2025-001_roberto_inspecao.pdf
│   │   └── 2026\
│   │
│   ├── Orcamentos\
│   │   ├── 2025\
│   │   │   └── MM\
│   │   │       └── ORC-2025-001_pimenta_materiais.pdf
│   │   └── 2026\
│   │
│   └── Projetos\                      ← DWGs de clientes específicos
│       ├── 2025\
│       │   └── MM\
│       │       └── PROJ-2025-001_silveira_unifilar.dwg
│       └── 2026\
│
├── Obras\                             ← Pasta por obra (agrega tudo da execução)
│   ├── OBRA-2025-001_r-silveira\
│   │   ├── obra.json                  ← metadados da obra
│   │   ├── Fotos\
│   │   │   ├── MID-2025-001.jpeg
│   │   │   └── MID-2025-002.jpeg
│   │   └── Videos\
│   │       └── MID-2025-010.mp4
│   └── OBRA-2026-001_[cliente]\
│
├── Media\
│   ├── Marketing\
│   │   ├── Social\                    ← Stories Instagram, posts
│   │   │   └── 2026\
│   │   ├── Panfletos\
│   │   └── QRCodes\
│   ├── Banco\                         ← Stock photos, imagens de IA
│   └── Empresa\
│       └── Marca\                     ← logos, assets de marca
│
├── Templates\
│   ├── Propostas\                     ← Padrão B: Proposta 400kwh, 600kwh...
│   ├── Laudos\                        ← 5 templates DOCX encontrados
│   ├── Contratos\                     ← Contrato CPF, Contrato CNPJ
│   ├── Juridico\                      ← Procuração CPF, Procuração CNPJ
│   ├── Formularios\                   ← Fichas de cliente, levantamento FV
│   └── Tecnicos\                      ← DWGs genéricos, diagramas modelo
│
├── Empresa\
│   ├── Fiscal\                        ← IRPJ, MEI, NF-e da empresa
│   ├── Administrativo\                ← Procurações, ARTs, scanner docs
│   └── Portfolio\                     ← Portfólio institucional, apresentações
│
└── Pessoal\                           ← Currículo Marcos, CNIS, CNH, etc.
```

---

## 5. REGRAS DE INDEXAÇÃO

### 5.1 Identificadores — padrão

| Entidade | Formato | Exemplo |
|---|---|---|
| Cliente | `[nome-slug]` | `antonio-carlos` |
| Proposta | `PROP-YYYY-NNN` | `PROP-2025-003` |
| Obra | `OBRA-YYYY-NNN` | `OBRA-2025-001` |
| Laudo | `LAUD-YYYY-NNN` | `LAUD-2025-001` |
| Orçamento | `ORC-YYYY-NNN` | `ORC-2025-001` |
| Mídia | `MID-YYYY-NNNN` | `MID-2025-0042` |

`NNN` = sequencial anual reiniciado em 001 a cada 1º de janeiro.

### 5.2 Nomenclatura de arquivos no disco

Após import, os arquivos recebem prefixo de ID + nome original preservado:

```
PROP-2025-003_antonio-carlos_v3.pdf
LAUD-2025-001_roberto_inspecao.pdf
ORC-2025-001_pimenta_materiais.pdf
MID-2025-0042_obra-silveira.jpeg
```

**O nome original é preservado como campo `nome_original` no JSON — nunca perdido.**

### 5.3 Estrutura do clientes.json (master index)

```json
{
  "versao": "1.0",
  "gerado_em": "2026-06-09T00:00:00Z",
  "total": 25,
  "clientes": [
    {
      "id": "antonio-carlos",
      "nome": "Antonio Carlos",
      "status": "lead",
      "propostas": ["PROP-2025-001", "PROP-2025-002", "PROP-2025-003"],
      "obras": [],
      "laudos": [],
      "orcamentos": [],
      "midias": []
    }
  ]
}
```

### 5.4 Estrutura do obras.json (master index)

```json
{
  "versao": "1.0",
  "obras": [
    {
      "id": "OBRA-2025-001",
      "cliente_id": "r-silveira",
      "proposta_id": "PROP-2025-005",
      "status": "concluida",
      "kwp": 7.43,
      "data_inicio": "2025-07-28",
      "data_conclusao": "2025-08-05",
      "laudos": [],
      "orcamentos": ["ORC-2025-001"],
      "midias": ["MID-2025-0001", "MID-2025-0002"]
    }
  ]
}
```

### 5.5 Regras de atualização do índice

| Evento | Ação no índice |
|---|---|
| Nova proposta gerada pelo CRM | Adicionar em `propostas.json` + atualizar `clientes.json` |
| Proposta aceita → cria Obra | Adicionar em `obras.json` + setar `proposta.gerou_obra = true` |
| Laudo emitido | Adicionar em `laudos.json` + adicionar ID em `obra.laudos[]` |
| Fotos importadas | Adicionar em `midias.json` + adicionar IDs em `obra.midias[]` |
| Cliente unificado | Redirecionar todos os FKs + manter alias no `nome_alternativo` |

---

## 6. EXEMPLOS REAIS — CLIENTES DA AUDITORIA

### 6.1 Antonio Carlos — Múltiplas versões de proposta

**Situação hoje:** 3 PDFs de proposta (Jun/2025), sem obra, sem laudo.

**No novo modelo:**

```
_Sistema/clientes.json
└── "antonio-carlos"
    ├── status: "lead"  (proposta não evoluiu para obra)
    └── propostas: ["PROP-2025-001", "PROP-2025-002", "PROP-2025-003"]

Documentos/Propostas/2025/06/
├── PROP-2025-001_antonio-carlos_v1.pdf  (474 KB — versão enxuta, 21/06)
├── PROP-2025-002_antonio-carlos_v2.pdf  (723 KB — versão completa, 23/06)
└── PROP-2025-003_antonio-carlos_v3.pdf  (728 KB — versão final, 23/06)

Visualização no Control Center:
┌─────────────────────────────────────────────────┐
│ 👤 Antonio Carlos                    [lead]     │
├─────────────────────────────────────────────────┤
│ 📄 Propostas (3)                                │
│   PROP-2025-001  21/06/2025  463 KB  v1  [PDF] │
│   PROP-2025-002  23/06/2025  707 KB  v2  [PDF] │
│   PROP-2025-003  23/06/2025  711 KB  v3  [PDF] ← atual
│ 🏗️ Obras (0)  📋 Laudos (0)  💰 Orçamentos (0) │
└─────────────────────────────────────────────────┘
```

---

### 6.2 R. Silveira / Romulo Silveira — Cliente unificado com cotação de fornecedor

**Situação hoje:** 2 entidades separadas + 1 cotação de fornecedor órfã.

**No novo modelo:**

```
_Sistema/clientes.json
└── "romulo-silveira"
    ├── nome: "Romulo Silveira"
    ├── nome_alternativo: ["R. Silveira", "R Silveira"]
    ├── status: "lead"
    └── propostas: ["PROP-2025-004", "PROP-2025-005"]

Documentos/Propostas/2025/07/
├── PROP-2025-004_romulo-silveira_v1.pdf  (R Silveira, 21/07)
└── PROP-2025-005_romulo-silveira_v2.pdf  (Romulo Silveira, 22/07)

Documentos/Orcamentos/2025/07/
└── ORC-2025-001_romulo-silveira_cotacao-fornecedor.pdf
    (Cotação WEB-003930589 silveira R.pdf — cotação de material do fornecedor)
    └── tipo: "cotacao_fornecedor"
    └── fornecedor: "WEB-003930589"

Visualização no Control Center:
┌─────────────────────────────────────────────────┐
│ 👤 Romulo Silveira (R. Silveira)     [lead]     │
├─────────────────────────────────────────────────┤
│ 📄 Propostas (2)                                │
│   PROP-2025-004  21/07/2025  760 KB  v1  [PDF] │
│   PROP-2025-005  22/07/2025  759 KB  v2  [PDF] │
│ 💰 Orçamentos (1)                               │
│   ORC-2025-001  Cotação fornecedor  [PDF]       │
│ 🏗️ Obras (0)  📋 Laudos (0)  📸 Fotos (0)      │
└─────────────────────────────────────────────────┘
```

---

### 6.3 Pimenta — Proposta + Procuração de Engenheiro

**Situação hoje:** 1 proposta + 1 procuração de engenheiro assinada.

**No novo modelo:**

```
_Sistema/clientes.json
└── "pimenta"
    ├── nome: "Pimenta"  (verificar nome completo)
    ├── status: "negociacao"  (tem procuração = avanço comercial)
    └── propostas: ["PROP-2025-006"]

Documentos/Propostas/2025/05/
└── PROP-2025-006_pimenta_v1.pdf

Empresa/Administrativo/
└── procuração engenheiro assinada pimenta.pdf
    ← vinculada ao cliente Pimenta via index, mas não é proposta nem laudo
    └── tipo: "procuracao_engenheiro"
    └── cliente_id: "pimenta"
```

---

### 6.4 Roberto — Proposta + Projeto Solar

**Situação hoje:** 1 proposta + 1 "Projeto solar Roberto.pdf" (564 KB).

**Análise do `Projeto solar Roberto.pdf`:**
- Nome sugere projeto executivo de instalação
- Tamanho (564 KB) é compatível com memorial descritivo ou projeto elétrico simplificado
- Pode ser: (a) layout do sistema, (b) memorial de cálculo, (c) diagrama unifilar personalizado

**No novo modelo:**

```
_Sistema/clientes.json
└── "roberto"
    ├── status: "obra"  (tem projeto = instalação em andamento)
    └── propostas: ["PROP-2025-007"]

Documentos/Propostas/2025/07/
└── PROP-2025-007_roberto_v1.pdf

Obras/OBRA-2025-002_roberto/
└── obra.json
    └── {
          "id": "OBRA-2025-002",
          "cliente_id": "roberto",
          "proposta_id": "PROP-2025-007",
          "projeto_tecnico": "Documentos/Projetos/2025/07/PROJ-2025-001_roberto.pdf"
        }

Documentos/Projetos/2025/07/
└── PROJ-2025-001_roberto.pdf  (renomeado de "Projeto solar Roberto.pdf")
```

---

### 6.5 Almeida — Cliente fantasma (proposta gerada, nunca salva)

**Situação hoje:** Screenshot da proposta `PROPOSTA SOLAR - ALMEIDA` no Desktop. Nenhum PDF salvo.

**No novo modelo — como registrar:**

```
_Sistema/clientes.json
└── "almeida"
    ├── nome: "Almeida"
    ├── status: "lead"
    ├── observacao: "Proposta gerada em 02/06/2026 via CRM. PDF nunca salvo em disco."
    └── propostas: []  ← vazio até que o PDF seja recuperado ou regenerado

Ação necessária:
  → Abrir CRM, localizar lead Almeida, regenerar proposta, salvar como PDF
  → Registrar como PROP-2026-001_almeida_v1.pdf
```

> Este é o caso de uso que valida toda a arquitetura: sem o sistema de rastreamento, a proposta de Almeida seria simplesmente perdida. Com o novo modelo, o cliente existe no índice, a ausência do PDF é explícita, e a ação de recuperação é clara.

---

### 6.6 Obra hipotética — Jun/2025 (116 fotos WhatsApp)

**Situação hoje:** 116 fotos WhatsApp de 20/06/2025 e 25/06/2025 sem cliente vinculado.

**Hipótese:** Data de 20-25/Jun/2025 coincide com propostas de Roberto (proposta Jul/2025) e Silveira (proposta Jul/2025). Pode ser obra realizada antes da proposta formal (prática comum em instaladores).

**Estratégia de importação:**

```
Fase 1 — Import sem vínculo:
  Media/Marketing/Obras_Sem_Cliente/2025/06/
  └── [116 arquivos WhatsApp]
  └── status: "orfao_pendente"

Fase 2 — Triagem no assistente de importação:
  → Marcos seleciona bloco de fotos Jun/2025
  → Sistema sugere: "Esses arquivos têm data 20-25/06/2025.
     Clientes com atividade nesse período: Roberto, Silveira, Marcos Resenhas.
     Vincular a qual obra?"
  → Marcos seleciona → fotos movidas para Obras/OBRA-2025-00X_[cliente]/Fotos/
```

---

## 7. PLANO DE MIGRAÇÃO — FASES

### 7.1 Visão geral

| Fase | Nome | O que faz | Modo | Esforço |
|:---:|---|---|---|:---:|
| CC-9.0 | Assistente de Importação | Cria estrutura de pastas, importa e indexa documentos existentes | Manual assistido | 6h Marcos |
| CC-9.1 | Integração CRM→Proposta | Intercepta `exportPdf()` no CRM e registra automaticamente | Automático | — |
| CC-9.2 | Módulo de Laudos | Interface para preencher e emitir laudos vinculados a obras | Manual | — |
| CC-9.3 | Módulo de Obras | Criar/gerenciar obras, vincular propostas aceitas | Manual | — |
| CC-9.4 | Módulo de Mídia | Triagem e vínculo de fotos/vídeos a obras | Manual assistido | — |
| CC-9.5 | Orçamentos | Criar orçamentos de materiais vinculados a obras | Manual | — |

### 7.2 Ordem de execução da migração (dentro do CC-9.0)

```
Passo 1 — Criar estrutura de pastas vazia
  Documents\MF Soluções\ + todas as subpastas + _Sistema\

Passo 2 — Copiar (não mover) propostas (Pattern A + C)
  27 PDFs → Documentos/Propostas/YYYY/MM/
  Auto-renomear com prefixo PROP-YYYY-NNN
  Gerar propostas.json com 27 entradas

Passo 3 — Criar clientes.json com 25 entradas
  Unificar Silveira (2→1)
  Sinalizar Andreia (verificar se 2 ou 3 pessoas distintas)
  Marcar Almeida como "proposta não salva"

Passo 4 — Copiar templates
  5 DOCX laudos → Templates/Laudos/
  3 DOCX contratos → Templates/Contratos/
  6 PDFs Padrão B → Templates/Propostas/
  DWGs genéricos → Templates/Tecnicos/

Passo 5 — Triagem de mídia (manual)
  116 + 45 fotos WhatsApp → triagem com sugestão de data
  19 vídeos WhatsApp → idem
  Social media → Media/Marketing/Social/

Passo 6 — Documentos pessoais e da empresa
  Currículos, CNIS, MEI → Pessoal/
  IRPJ, portfólio, panfletos → Empresa/

Passo 7 — Excluir/isolar
  2 PDFs de 100MB (bug artifacts) → não importar, deletar dos Downloads
  `senha firebase site mf.png` → deletar após rotação de senha
  Duplicatas confirmadas (5 PDFs) → manter 1, descartar cópia
```

### 7.3 Critérios de conclusão da migração

- [ ] `_Sistema/clientes.json` com 25 entradas válidas
- [ ] `_Sistema/propostas.json` com 27 propostas indexadas
- [ ] Todas as propostas com prefixo `PROP-YYYY-NNN` no disco
- [ ] Templates separados de documentos de cliente
- [ ] Mídia WhatsApp triada (vinculada ou marcada como `orfao_pendente`)
- [ ] Senha Firebase rotacionada e `senha firebase site mf.png` excluído
- [ ] 2 PDFs de 100MB excluídos dos Downloads
- [ ] Zero arquivos em `/Pessoal` vinculados a clientes

---

## 8. DECISÕES ARQUITETURAIS EXPLÍCITAS

| # | Decisão | Justificativa |
|:---:|---|---|
| D1 | OBRA é entidade obrigatória, não opcional | Sem ela, laudo e mídia ficam pendurados em CLIENTE sem contexto temporal |
| D2 | Templates ficam em `/Templates`, separados de `/Documentos` | Templates não têm cliente. Misturá-los polui o índice |
| D3 | Arquivos copiados, não movidos, durante import | Segurança: original intacto até validação completa |
| D4 | IDs sequenciais por ano (`PROP-2025-NNN`) | Permite consultar por período sem abrir arquivo |
| D5 | Nome original preservado como metadado | Auditabilidade: sempre saber de onde veio o arquivo |
| D6 | Mídia vincula a OBRA, não diretamente a CLIENTE | Uma obra pode ter centenas de fotos; cliente pode ter N obras |
| D7 | SHA-256 em todos os arquivos | Detecção de duplicatas e integridade de backup |
| D8 | `_Sistema/` nunca editado manualmente | Integridade do índice só via aplicação |
| D9 | Cotação de fornecedor é subtipo de ORÇAMENTO | Semanticamente diferente de proposta; pertence ao contexto de custo da obra |
| D10 | Clientes com `status: lead` sem obra podem existir indefinidamente | Histórico comercial preservado mesmo sem conversão |

---

## 9. O QUE ESTE DOCUMENTO AUTORIZA

Com a aprovação deste documento, o CC-9.0 poderá implementar:

1. **Criação da estrutura de pastas** em `Documents\MF Soluções\`
2. **Assistente de Importação** que lê a pasta atual e executa o plano de migração da Seção 7
3. **Geração dos 6 arquivos de índice** (`clientes.json`, `propostas.json`, `obras.json`, `laudos.json`, `orcamentos.json`, `midias.json`)
4. **Tela de Cliente 360°** no MF Control Center que lê esses índices e exibe as entidades relacionadas

O que **não** está autorizado por este documento (requer aprovação separada por etapa):
- CC-9.1: Integração com CRM (interceptar `exportPdf()`)
- CC-9.2 a CC-9.5: Módulos de criação de Laudos, Obras, Mídias, Orçamentos
- CC-9.8: Sincronização com Firebase Storage/Firestore

---

## RESUMO PARA APROVAÇÃO

> **Entidades definidas:** 6 (Cliente, Proposta, Obra, Laudo, Orçamento, Mídia)  
> **Relacionamentos documentados:** Cliente → Proposta → Obra → {Laudo, Orçamento, Mídia}  
> **Árvore de pastas:** definitiva, com 12 seções organizadas por tipo  
> **Regras de indexação:** formato de ID, nomenclatura, atualização de índice  
> **Exemplos reais:** Antonio Carlos, Silveira, Pimenta, Roberto, Almeida  
> **Plano de migração:** 7 passos sequenciais, ~6h de trabalho manual assistido  
> **Decisões explícitas:** 10 decisões arquiteturais registradas e justificadas  

---

*Documento gerado em 2026-06-09 · MF Control Center · CC-9B*  
*Pré-requisito para CC-9.0 — Assistente de Importação*

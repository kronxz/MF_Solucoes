# CC-9 — ESPECIFICAÇÃO OPERACIONAL
## Central de Propostas, Laudos e Orçamentos — MF Control Center
### Documento de Engenharia · Versão 1.0 · 08/06/2026

---

> **Status**: AGUARDANDO APROVAÇÃO PARA IMPLEMENTAÇÃO
> **Escopo**: Documentação técnica de engenharia. Nenhum código foi escrito. Nenhum arquivo foi alterado.
> **Próxima etapa**: Aprovação → iniciar CC-9.0

---

## ÍNDICE

1. [Visão Geral](#1-visão-geral)
2. [Estrutura de Pastas Definitiva](#2-estrutura-de-pastas-definitiva)
3. [Fluxograma Completo](#3-fluxograma-completo)
4. [Ciclo de Vida dos Documentos](#4-ciclo-de-vida-dos-documentos)
5. [Estrutura de Indexação Definitiva](#5-estrutura-de-indexação-definitiva)
6. [Estratégia Offline Definitiva](#6-estratégia-offline-definitiva)
7. [Estratégia de Sincronização Definitiva](#7-estratégia-de-sincronização-definitiva)
8. [Estratégia de Backup Definitiva](#8-estratégia-de-backup-definitiva)
9. [Estratégia de Recuperação Definitiva](#9-estratégia-de-recuperação-definitiva)
10. [Prevenção de Duplicatas e Versionamento](#10-prevenção-de-duplicatas-e-versionamento)
11. [Integração Firebase Futura](#11-integração-firebase-futura)
12. [Riscos e Mitigações](#12-riscos-e-mitigações)
13. [Plano de Implementação CC-9.0 a CC-9.9](#13-plano-de-implementação-cc-90-a-cc-99)

---

## 1. VISÃO GERAL

### 1.1 Declaração de missão

O MF Control Center deixa de ser um painel de controle de ferramentas externas e passa a ser o **repositório documental oficial da empresa MF Soluções**.

Todo documento comercial — proposta, laudo, orçamento, anexo, PDF — nasce, vive, é versionado e morre dentro do MF Control Center. O CRM, o Firebase e o navegador são fontes de dados auxiliares, nunca de documentos.

### 1.2 Princípios de design

| Princípio | Significado prático |
|---|---|
| **Local-first** | Todos os documentos existem no disco antes de qualquer sincronização |
| **Offline-capable** | Criar, editar e visualizar documentos sem internet |
| **Rastreável** | Todo documento tem ID único, autor, versão e histórico |
| **Não-destrutivo** | Nenhum documento é apagado — apenas arquivado |
| **Sincronizável** | Qualquer documento pode ser enviado ao Firebase sob demanda |
| **Recuperável** | Qualquer documento pode ser restaurado de backup |

### 1.3 Três pilares documentais

```
┌─────────────────────────────────────────────────────────────────┐
│                    MF Control Center                             │
│                                                                  │
│   ┌──────────────┐   ┌──────────────┐   ┌──────────────┐       │
│   │  PROPOSTAS   │   │    LAUDOS    │   │  ORÇAMENTOS  │       │
│   │              │   │              │   │              │       │
│   │ Solar        │   │ Queima       │   │ Serviços     │       │
│   │ Comercial    │   │ Técnico      │   │ Materiais    │       │
│   │ Residencial  │   │ Residencial  │   │ Valor final  │       │
│   │              │   │ Comercial    │   │              │       │
│   │ → PDF        │   │ Jurídico     │   │ → PDF        │       │
│   │ → Versões    │   │ Fotovoltaico │   │ → Versões    │       │
│   │ → Histórico  │   │              │   │ → Histórico  │       │
│   │              │   │ → Fotos      │   │              │       │
│   └──────────────┘   │ → Assinatura │   └──────────────┘       │
│                      │ → PDF        │                           │
│                      └──────────────┘                           │
│                                                                  │
│   Indexação única · Pesquisa unificada · Backup unificado       │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2. ESTRUTURA DE PASTAS DEFINITIVA

### 2.1 Localização raiz

```
Raiz: app.getPath('userData')
      ↓
Windows: C:\Users\[usuario]\AppData\Roaming\MF Control Center\
```

**Por que `userData`?**
- Padrão Electron — sem configuração adicional
- Por usuário — não compartilhado entre usuários Windows
- Preservado na desinstalação por padrão
- OneDrive sincroniza `AppData\Roaming` quando habilitado
- Permissões de escrita garantidas sem elevação de admin

### 2.2 Árvore completa

```
MF Control Center\          ← app.getPath('userData')
│
├── _sistema\
│   ├── config.json          ← configurações globais do app
│   ├── schema.json          ← versão do esquema de dados (semver)
│   ├── session.json         ← última sessão (usuário logado, página ativa)
│   └── migration.log        ← registro de migrações de schema aplicadas
│
├── Dados\
│   ├── indices\
│   │   ├── propostas.json   ← índice mestre de propostas
│   │   ├── laudos.json      ← índice mestre de laudos
│   │   ├── orcamentos.json  ← índice mestre de orçamentos
│   │   └── clientes.json    ← índice de clientes conhecidos
│   └── contadores\
│       └── sequencias.json  ← próximo número sequencial por tipo/ano
│
├── Propostas\
│   ├── 2026\
│   │   ├── 01\              ← mês
│   │   │   ├── PROP-2026-001_JOAO-SILVA\
│   │   │   │   ├── meta.json            ← metadados completos
│   │   │   │   ├── payload.json         ← dados técnicos completos
│   │   │   │   ├── v1\
│   │   │   │   │   └── PROP-2026-001_v1_RASCUNHO.pdf
│   │   │   │   ├── v2\
│   │   │   │   │   └── PROP-2026-001_v2_ENVIADA.pdf
│   │   │   │   └── atual\              ← symlink ou cópia da versão atual
│   │   │   │       └── PROP-2026-001_JOAO-SILVA_ENVIADA.pdf
│   │   │   └── PROP-2026-002_MARIA-ANDRADE\
│   │   │       └── ...
│   │   └── 06\
│   │       └── ...
│   └── 2025\
│       └── ...
│
├── Laudos\
│   ├── 2026\
│   │   └── 06\
│   │       └── LAUD-2026-001_JOAO-SILVA_QUEIMA\
│   │           ├── meta.json
│   │           ├── dados.json           ← campos do laudo preenchidos
│   │           ├── fotos\
│   │           │   ├── foto-01.jpg
│   │           │   ├── foto-02.jpg
│   │           │   └── thumbnail\
│   │           │       ├── foto-01_thumb.jpg
│   │           │       └── foto-02_thumb.jpg
│   │           ├── anexos\
│   │           │   └── nota-fiscal.pdf
│   │           ├── assinatura\
│   │           │   └── assinatura.png   ← imagem da assinatura
│   │           └── PDF\
│   │               └── LAUD-2026-001_JOAO-SILVA_QUEIMA.pdf
│   └── 2025\
│       └── ...
│
├── Orcamentos\
│   ├── 2026\
│   │   └── 06\
│   │       └── ORC-2026-001_JOAO-SILVA\
│   │           ├── meta.json
│   │           ├── itens.json           ← serviços + materiais + valores
│   │           └── PDF\
│   │               └── ORC-2026-001_JOAO-SILVA.pdf
│   └── 2025\
│       └── ...
│
├── Clientes\
│   └── [leadId-firestore]\              ← uma pasta por cliente
│       ├── perfil.json                  ← snapshot do lead no momento do doc
│       ├── documentos.json              ← lista de todos os docs deste cliente
│       └── historico.json               ← timeline de ações no Control Center
│
├── Importados\                          ← PDFs externos importados manualmente
│   ├── nao-identificados\               ← importados sem cliente vinculado
│   └── [leadId]\
│       └── [arquivo-original.pdf]
│
├── Lixeira\                             ← documentos "excluídos" (nunca apaga de verdade)
│   └── [id]\
│       ├── meta.json                    ← metadados + motivo + data
│       └── [arquivo.pdf]
│
├── Backups\
│   ├── automaticos\
│   │   ├── backup-2026-06-08.zip
│   │   └── backup-2026-06-01.zip
│   ├── manuais\
│   │   └── backup-manual-2026-06-08.zip
│   └── firebase\                        ← snapshots Firestore (já existentes)
│       └── ...
│
├── Sync\
│   ├── fila-upload\
│   │   └── [id]-[timestamp].json        ← operação pendente
│   ├── fila-download\
│   │   └── [id]-[timestamp].json
│   ├── confirmados\                     ← log de operações bem-sucedidas
│   │   └── sync-2026-06.log
│   └── estado.json                      ← último sync + hash dos índices
│
├── Logs\
│   ├── app-2026-06.log
│   ├── propostas-2026-06.log
│   ├── laudos-2026-06.log
│   └── erros-2026-06.log
│
└── Downloads\                           ← área temporária de recepção
    └── [arquivo-recebido]
```

### 2.3 Convenção de nomenclatura — IDs e nomes de arquivo

**Formato do ID de documento:**
```
[TIPO]-[ANO]-[SEQUENCIAL]

Exemplos:
  PROP-2026-001
  LAUD-2026-017
  ORC-2026-003
```

- `TIPO`: PROP | LAUD | ORC
- `ANO`: 4 dígitos
- `SEQUENCIAL`: 3 dígitos, reinicia por ano, por tipo

**Formato do nome de arquivo PDF:**
```
[ID]_[NOME-CLIENTE]_[STATUS].pdf
[ID]_[NOME-CLIENTE]_[TIPO-LAUDO].pdf

Exemplos:
  PROP-2026-001_JOAO-SILVA_ENVIADA.pdf
  PROP-2026-001_v2_JOAO-SILVA_ACEITA.pdf
  LAUD-2026-017_MARIA-ANDRADE_QUEIMA.pdf
  ORC-2026-003_PEDRO-COSTA_APROVADO.pdf
```

**Regras de normalização do nome:**
- Remover acentos: `ã→a`, `ç→c`, `é→e`, etc.
- Maiúsculas
- Espaços → hífen
- Remover caracteres especiais: `/ \ : * ? " < > |`
- Máximo 40 caracteres para o nome do cliente

---

## 3. FLUXOGRAMA COMPLETO

### 3.1 Fluxo de Proposta

```
┌─────────────────────────────────────────────────────────────────┐
│                    NASCIMENTO DA PROPOSTA                        │
└─────────────────────────────────────────────────────────────────┘

ORIGEM A — Via CRM (lead existente)
  CRM → usuário clica "Gerar Proposta" no lead
    ↓
  MF Control Center recebe leadId + dados do lead
    ↓
  Verifica se já existe proposta para este leadId
    ↓ (sim)                      ↓ (não)
  Pergunta: "Criar nova          Gera novo ID sequencial
  versão ou abrir a              PROP-[ANO]-[N]
  existente?"                      ↓
    ↓                           Cria pasta em
  Cria nova versão              Propostas/[ANO]/[MES]/[ID]/
  do mesmo PROP-ID                ↓
                                Cria meta.json + payload.json
                                  ↓
                                Status inicial: RASCUNHO

ORIGEM B — Proposta nova direta (sem lead)
  Botão "+ Nova Proposta" na Central
    ↓
  Formulário de dados do cliente (nome, telefone, endereço)
    ↓
  Busca opcional: "Este cliente já existe no CRM?" → vincula leadId
    ↓
  Gera PROP-[ANO]-[N] + cria estrutura de pasta
    ↓
  Status inicial: RASCUNHO

                    ┌─────────────────┐
                    │   EDIÇÃO        │
                    └─────────────────┘

Dados técnicos preenchidos no Control Center:
  consumo, geração, kWp, placas, inversor
  investimento, economia, payback
  financiamentos, kits disponíveis
  observações, validade
    ↓
  payload.json atualizado a cada mudança (auto-save)
  meta.json atualizado: ultimaEdicao, usuarioEditor

                    ┌─────────────────┐
                    │   GERAÇÃO PDF   │
                    └─────────────────┘

Usuário clica "Gerar PDF"
    ↓
  Control Center carrega proposta.html em webview offscreen
    ↓
  Injeta payload.json via localStorage (ou postMessage)
    ↓
  Aguarda dom-ready
    ↓
  Executa html2pdf ou window.print() com destino forçado
    ↓
  PDF salvo em: Propostas/[ANO]/[MES]/[ID]/v[N]/[NOME].pdf
    ↓
  Copia para: Propostas/[ANO]/[MES]/[ID]/atual/[NOME].pdf
    ↓
  Índice atualizado: pdfPath, pdfSize, pdfHash (SHA-256), versão
    ↓
  Status muda para: GERADA

                    ┌─────────────────┐
                    │   ENVIO         │
                    └─────────────────┘

Usuário clica "Enviar"
    ↓
  Opções: WhatsApp | Email | Link Firebase Storage
    ↓
  Se WhatsApp: shell.openExternal com wa.me + número + texto
  Se Email: mailto: com PDF em anexo (via shell)
  Se Firebase: upload para Storage → URL pública → copiar link
    ↓
  Status muda para: ENVIADA
  meta.json: enviadaEm, canalEnvio, destinatario
  Fila sync: registra operação de upload se firebase

                    ┌─────────────────┐
                    │   FECHAMENTO    │
                    └─────────────────┘

Usuário registra resultado:
  ACEITA → contrato feito
  RECUSADA → motivo (campo texto)
  EXPIRADA → data expirou (automático após validade)
    ↓
  meta.json: status final, dataFechamento, motivoRecusa
  Índice atualizado
  Lead no CRM atualizado (se online): campo propostaStatus
```

---

### 3.2 Fluxo de Laudo

```
┌─────────────────────────────────────────────────────────────────┐
│                    NASCIMENTO DO LAUDO                           │
└─────────────────────────────────────────────────────────────────┘

Usuário clica "+ Novo Laudo"
    ↓
  Seleciona tipo:
  [ ] Queima de equipamento
  [ ] Laudo técnico elétrico
  [ ] Laudo residencial
  [ ] Laudo comercial
  [ ] Laudo jurídico
  [ ] Laudo fotovoltaico
    ↓
  Vincula a cliente (busca por nome ou leadId)
    ↓
  Gera LAUD-[ANO]-[N]
  Cria pasta: Laudos/[ANO]/[MES]/[ID]/

                    ┌─────────────────┐
                    │  PREENCHIMENTO  │
                    └─────────────────┘

Formulário específico por tipo de laudo:
  Campos comuns a todos:
    - Cliente, endereço, data da vistoria
    - Técnico responsável
    - Número de série dos equipamentos
    - Observações gerais

  Campos específicos — Queima:
    - Equipamento danificado (modelo, série)
    - Causa provável
    - Valor estimado do dano
    - Cobertura por garantia (sim/não)
    - Recomendação (substituição, reparo, vistoria externa)

  Campos específicos — Técnico elétrico:
    - Tensão medida, corrente, potência
    - Conformidade com normas (ABNT NBR 16274, NR-10)
    - Não-conformidades encontradas
    - Prazo para correção

  Campos específicos — Fotovoltaico:
    - Performance ratio (PR%)
    - Geração real vs. esperada
    - Estado dos painéis (sujidade, danos físicos)
    - Estado do inversor
    - Temperatura operacional

                    ┌─────────────────┐
                    │  FOTOS          │
                    └─────────────────┘

Usuário adiciona fotos:
    ↓
  Origem: câmera local | upload de arquivo | arrastar
    ↓
  Foto salva em: Laudos/[ANO]/[MES]/[ID]/fotos/foto-[N].jpg
  Thumbnail gerado: fotos/thumbnail/foto-[N]_thumb.jpg
    ↓
  Cada foto tem: legenda, timestamp, GPS (se disponível)
  Metadados em dados.json: fotos[]

                    ┌─────────────────┐
                    │  ASSINATURA     │
                    └─────────────────┘

Usuário assina (ou responsável técnico):
    ↓
  Opção A: Canvas de assinatura digital no Control Center
  Opção B: Upload de imagem da assinatura
  Opção C: Assinatura postponed (laudo fica como RASCUNHO)
    ↓
  Salvo em: Laudos/[ANO]/[MES]/[ID]/assinatura/assinatura.png
  meta.json: assinadoPor, assinadoEm

                    ┌─────────────────┐
                    │  GERAÇÃO PDF    │
                    └─────────────────┘

Usuário clica "Gerar Laudo PDF"
    ↓
  Template HTML específico por tipo de laudo
    ↓
  Dados injetados: dados.json + fotos (base64) + assinatura
    ↓
  PDF salvo em: Laudos/[ANO]/[MES]/[ID]/PDF/[NOME].pdf
    ↓
  Índice laudos.json atualizado
  Status: FINALIZADO
```

---

### 3.3 Fluxo de Orçamento

```
┌─────────────────────────────────────────────────────────────────┐
│                    NASCIMENTO DO ORÇAMENTO                       │
└─────────────────────────────────────────────────────────────────┘

Usuário clica "+ Novo Orçamento"
    ↓
  Vincula a cliente (busca)
    ↓
  Gera ORC-[ANO]-[N]

                    ┌─────────────────┐
                    │  SERVIÇOS       │
                    └─────────────────┘

Lista de serviços prestados:
  [+] Adicionar serviço
    - Descrição do serviço
    - Quantidade
    - Valor unitário
    - Desconto (%)
    - Total do item
    ↓
  Subtotal serviços calculado

                    ┌─────────────────┐
                    │  MATERIAIS      │
                    └─────────────────┘

Lista de materiais:
  [+] Adicionar material
    - Produto (nome + código)
    - Unidade (un, m, kg, m²)
    - Quantidade
    - Valor unitário
    - Total do item
    ↓
  Subtotal materiais calculado

                    ┌─────────────────┐
                    │  VALOR FINAL    │
                    └─────────────────┘

Resumo automático:
  Subtotal serviços:    R$ ___
  Subtotal materiais:   R$ ___
  Desconto geral (%):   R$ ___
  ─────────────────────────────
  TOTAL:                R$ ___

Forma de pagamento:
  [ ] À vista
  [ ] Parcelado: [N] x R$ ___
  [ ] Financiado: banco, parcelas, taxa

Validade do orçamento: [data]
Observações: [campo livre]

                    ┌─────────────────┐
                    │  GERAÇÃO PDF    │
                    └─────────────────┘

Usuário clica "Gerar Orçamento PDF"
    ↓
  Template HTML de orçamento
    ↓
  PDF salvo em: Orcamentos/[ANO]/[MES]/[ID]/PDF/[NOME].pdf
    ↓
  Status: GERADO → ENVIADO → APROVADO | RECUSADO
```

---

## 4. CICLO DE VIDA DOS DOCUMENTOS

### 4.1 Estados de uma Proposta

```
RASCUNHO → GERADA → ENVIADA → ACEITA
                            → RECUSADA
                            → EXPIRADA (automático)
```

| Estado | Descrição | Ação possível |
|---|---|---|
| RASCUNHO | Dados preenchidos, sem PDF | Editar, gerar PDF, excluir |
| GERADA | PDF gerado, não enviado | Editar dados (cria v2), enviar, visualizar |
| ENVIADA | PDF enviado ao cliente | Registrar resultado, gerar nova versão |
| ACEITA | Cliente aceitou | Vincular instalação, arquivar |
| RECUSADA | Cliente recusou | Arquivar, motivo registrado |
| EXPIRADA | Prazo de validade passou | Renovar (cria nova versão) |

### 4.2 Estados de um Laudo

```
RASCUNHO → EM VISTORIA → AGUARDANDO ASSINATURA → FINALIZADO → ENTREGUE
```

### 4.3 Estados de um Orçamento

```
RASCUNHO → GERADO → ENVIADO → APROVADO
                             → RECUSADO
                             → EXPIRADO
```

---

## 5. ESTRUTURA DE INDEXAÇÃO DEFINITIVA

### 5.1 Índice de Propostas (`Dados/indices/propostas.json`)

```
{
  "versao": "1.0",
  "schema": "propostas-v1",
  "totalDocumentos": 47,
  "ultimaAtualizacao": "2026-06-08T14:30:00.000Z",
  "documentos": [
    {
      // ── IDENTIFICAÇÃO ──────────────────────────────
      "id": "PROP-2026-001",
      "tipo": "proposta",
      "versaoAtual": 2,

      // ── CLIENTE ────────────────────────────────────
      "clienteNome": "João Silva",
      "clienteTelefone": "84999990001",
      "clienteNomeNormalizado": "joao silva",
      "leadId": "abc123def456",          // null se não vinculado ao CRM

      // ── TÉCNICO ────────────────────────────────────
      "kwp": 5.5,
      "placas": 10,
      "investimento": 12000.00,
      "economia": 850.00,
      "payback": 14,

      // ── STATUS E DATAS ─────────────────────────────
      "status": "enviada",
      "criadaEm": "2026-01-15T10:00:00.000Z",
      "editadaEm": "2026-01-15T10:25:00.000Z",
      "geradaEm": "2026-01-15T10:28:00.000Z",
      "enviadaEm": "2026-01-15T10:31:00.000Z",
      "validadeExpira": "2026-02-15T23:59:59.000Z",
      "fechadaEm": null,

      // ── ARQUIVO ────────────────────────────────────
      "pastaRelativa": "Propostas/2026/01/PROP-2026-001_JOAO-SILVA",
      "pdfAtualRelativo": "Propostas/2026/01/PROP-2026-001_JOAO-SILVA/atual/PROP-2026-001_JOAO-SILVA_ENVIADA.pdf",
      "pdfTamanho": 245120,
      "pdfHash": "sha256:a1b2c3...",

      // ── OPERACIONAL ────────────────────────────────
      "vendedor": "Marcos",
      "canalEnvio": "whatsapp",
      "tags": ["residencial", "financiamento"],
      "motivoRecusa": null,

      // ── SYNC ───────────────────────────────────────
      "firebaseSync": false,
      "firebaseDocId": null,
      "firebaseStorageUrl": null,
      "syncPendente": false
    }
  ]
}
```

### 5.2 Índice de Laudos (`Dados/indices/laudos.json`)

```
{
  "versao": "1.0",
  "documentos": [
    {
      "id": "LAUD-2026-001",
      "tipo": "laudo",
      "subtipo": "queima",         // queima|tecnico|residencial|comercial|juridico|fotovoltaico
      "clienteNome": "João Silva",
      "clienteNomeNormalizado": "joao silva",
      "leadId": "abc123def456",
      "status": "finalizado",
      "tecnicoResponsavel": "Marcos",
      "criadaEm": "...",
      "vistoriaEm": "...",
      "finalizadaEm": "...",
      "qtdFotos": 6,
      "temAssinatura": true,
      "pastaRelativa": "Laudos/2026/06/LAUD-2026-001_JOAO-SILVA_QUEIMA",
      "pdfRelativo": "...",
      "pdfHash": "sha256:...",
      "firebaseSync": false
    }
  ]
}
```

### 5.3 Índice de Orçamentos (`Dados/indices/orcamentos.json`)

```
{
  "versao": "1.0",
  "documentos": [
    {
      "id": "ORC-2026-001",
      "tipo": "orcamento",
      "clienteNome": "João Silva",
      "clienteNomeNormalizado": "joao silva",
      "leadId": "abc123def456",
      "status": "aprovado",
      "totalValor": 8500.00,
      "qtdItens": 12,
      "criadaEm": "...",
      "aprovadoEm": "...",
      "pastaRelativa": "Orcamentos/2026/06/ORC-2026-001_JOAO-SILVA",
      "pdfRelativo": "...",
      "pdfHash": "sha256:...",
      "firebaseSync": false
    }
  ]
}
```

### 5.4 Sequenciador (`Dados/contadores/sequencias.json`)

```
{
  "PROP": {
    "2025": 12,
    "2026": 47
  },
  "LAUD": {
    "2025": 3,
    "2026": 8
  },
  "ORC": {
    "2025": 7,
    "2026": 3
  }
}
```

**Regra do sequenciador**:
- Lê o valor atual → incrementa → salva → usa o novo valor
- Operação deve ser atômica: escreve em `.tmp` depois renomeia
- Em caso de falha: lê o maior sequencial existente nos índices e recalcula

### 5.5 `meta.json` — Documento individual (dentro de cada pasta)

```
{
  "id": "PROP-2026-001",
  "tipo": "proposta",
  "versaoAtual": 2,
  "versoes": [
    {
      "numero": 1,
      "criadaEm": "2026-01-15T10:28:00.000Z",
      "status": "rascunho",
      "pdfRelativo": "v1/PROP-2026-001_v1_RASCUNHO.pdf",
      "pdfHash": "sha256:...",
      "motivo": "Versão inicial"
    },
    {
      "numero": 2,
      "criadaEm": "2026-01-15T10:25:00.000Z",
      "status": "enviada",
      "pdfRelativo": "v2/PROP-2026-001_v2_ENVIADA.pdf",
      "pdfHash": "sha256:...",
      "motivo": "Ajuste no valor do kit premium"
    }
  ],
  "clienteNome": "João Silva",
  "clienteTelefone": "84999990001",
  "leadId": "abc123def456",
  "vendedor": "Marcos",
  "criadaEm": "2026-01-15T10:00:00.000Z",
  "editadaEm": "2026-01-15T10:25:00.000Z",
  "status": "enviada",
  "enviadaEm": "2026-01-15T10:31:00.000Z",
  "canalEnvio": "whatsapp",
  "validadeExpira": "2026-02-15T23:59:59.000Z",
  "tags": ["residencial", "financiamento"],
  "firebaseSync": false
}
```

---

## 6. ESTRATÉGIA OFFLINE DEFINITIVA

### 6.1 O que funciona sem internet

| Operação | Offline | Mecanismo |
|---|:---:|---|
| Listar todas as propostas | ✅ | propostas.json em memória |
| Pesquisar propostas | ✅ | Filtro em array local |
| Abrir PDF existente | ✅ | shell.openPath() — arquivo local |
| Criar nova proposta | ✅ | Dados locais + sequenciador local |
| Editar proposta existente | ✅ | Edição de payload.json local |
| Gerar PDF | ✅ | proposta.html local + html2pdf |
| Criar laudo | ✅ | Tudo local |
| Adicionar fotos ao laudo | ✅ | Cópia para pasta local |
| Criar orçamento | ✅ | Tudo local |
| Ver histórico do cliente | ✅ | historico.json local |
| Buscar lead no CRM | ❌ | Firestore requer internet |
| Sincronizar índice com Firebase | ❌ | Requer internet |
| Enviar PDF por link Firebase | ❌ | Storage requer internet |
| Receber novos leads do CRM | ❌ | Firestore requer internet |

### 6.2 Indicadores visuais de modo offline

O Control Center detecta conectividade via `navigator.onLine` + ping periódico a Firebase:

```
Barra de status global:
  🟢 Online — sincronizado há 5min
  🟡 Online — 3 documentos aguardando sync
  🔴 Offline — 5 documentos em fila local
```

### 6.3 Comportamento ao detectar offline durante operação

| Operação em andamento | Comportamento |
|---|---|
| Salvar proposta | Salva local + adiciona à fila de sync |
| Gerar PDF | Salva local + fila de upload Firebase se solicitado |
| Enviar por WhatsApp | Abre WhatsApp (não precisa de internet do Control Center) |
| Enviar por link Firebase | Bloqueia: "Sem conexão. PDF salvo localmente." |
| Buscar lead novo | Cache local: busca nos dados offline do CRM (se disponível) |

---

## 7. ESTRATÉGIA DE SINCRONIZAÇÃO DEFINITIVA

### 7.1 O que sincronizar com Firebase

| Dado | Firebase destino | Quando | Direção |
|---|---|---|---|
| Metadados da proposta | Firestore `propostas/{id}` | Ao criar/atualizar | → Upload |
| PDF binário | Storage `propostas/{id}/v{N}.pdf` | Sob demanda (botão "Enviar link") | → Upload |
| Status da proposta | Firestore `leads/{leadId}` campo `propostaStatus` | Ao mudar status | → Upload |
| Dados do lead | Firestore `leads/{id}` | Leitura ao vincular | ← Download |
| Metadados do laudo | Firestore `laudos/{id}` | Ao finalizar | → Upload |
| Metadados do orçamento | Firestore `orcamentos/{id}` | Ao gerar | → Upload |

**O que NUNCA vai para Firebase:**
- Fotos brutas de laudos (muito volume, Storage sob demanda)
- Logs internos do app
- Arquivos temporários
- Índices completos (Firebase não é sistema de arquivos)

### 7.2 Fila de sincronização (`Sync/fila-upload/`)

Cada item da fila é um arquivo JSON:

```
{
  "operacaoId": "sync-1749381600000-abc",
  "tipo": "proposta-metadata",
  "documentoId": "PROP-2026-001",
  "payload": { ... },       // dados a sincronizar
  "criadaEm": "2026-06-08T14:00:00.000Z",
  "tentativas": 0,
  "maxTentativas": 5,
  "proximaTentativa": "2026-06-08T14:01:00.000Z"
}
```

### 7.3 Processo de sincronização ao reconectar

```
internet volta (evento online)
    ↓
ping Firebase → confirma conectividade real
    ↓
lê Sync/fila-upload/ → ordena por criadaEm
    ↓
para cada item na fila:
    ↓
  tenta operação Firebase
    ↓ (sucesso)              ↓ (falha)
  move para               incrementa tentativas
  Sync/confirmados/       se tentativas >= 5:
  atualiza meta.json         move para fila-erros/
  firebaseSync = true        notifica usuário
    ↓
atualiza Sync/estado.json: ultimoSync, hashIndices
    ↓
barra de status: "🟢 Online — sincronizado agora"
```

### 7.4 Estratégia de conflito (multiusuário futuro)

Por enquanto o sistema é single-user. Quando multiusuário:
- `editadaEm` timestamp usado como last-write-wins
- Versões conflitantes salvas como `v[N]-conflito` e apresentadas ao usuário

---

## 8. ESTRATÉGIA DE BACKUP DEFINITIVA

### 8.1 Três camadas de backup

```
CAMADA 1 — Backup automático local (diário)
  Horário: ao fechar o app ou às 23:59 se ficou aberto
  Conteúdo: zip dos índices + meta.json de cada documento
  NÃO inclui PDFs (muito volume)
  Destino: MF Control Center\Backups\automaticos\
  Retenção: 30 dias (31º arquivo apaga o mais antigo)
  Nome: backup-auto-2026-06-08.zip

CAMADA 2 — Backup completo local (semanal)
  Horário: domingo às 23:59 ou sob demanda
  Conteúdo: zip COMPLETO incluindo todos os PDFs
  Destino: MF Control Center\Backups\manuais\
  Retenção: 12 semanas
  Nome: backup-full-2026-W23.zip

CAMADA 3 — Sync Firebase (contínuo)
  Conteúdo: metadados + PDFs selecionados
  Destino: Firebase Firestore + Storage
  Retenção: ilimitada (Firebase)
  Gatilho: ao criar/atualizar documento
```

### 8.2 O que o backup automático contém

```
backup-auto-2026-06-08.zip
├── Dados/
│   ├── indices/
│   │   ├── propostas.json
│   │   ├── laudos.json
│   │   ├── orcamentos.json
│   │   └── clientes.json
│   └── contadores/
│       └── sequencias.json
├── [para cada documento — apenas meta.json]
│   Propostas/2026/01/PROP-2026-001_JOAO-SILVA/meta.json
│   Laudos/2026/06/LAUD-2026-001_JOAO-SILVA_QUEIMA/meta.json
│   Orcamentos/2026/06/ORC-2026-001_JOAO-SILVA/meta.json
└── backup-manifest.json   ← hash de cada arquivo, data, versão schema
```

### 8.3 Verificação de integridade do backup

Ao gerar o backup:
1. Calcula SHA-256 de cada arquivo incluído
2. Salva manifest.json com todos os hashes
3. Salva o hash do manifest no nome do arquivo: `backup-auto-2026-06-08_[hash8].zip`

Ao restaurar: valida todos os hashes antes de aplicar.

---

## 9. ESTRATÉGIA DE RECUPERAÇÃO DEFINITIVA

### 9.1 Cenários de perda e resposta

| Cenário | Dados perdidos | Recuperação |
|---|---|---|
| Índice corrompido | Metadados | Reconstruir de meta.json de cada pasta (scan completo) |
| Pasta de um documento apagada | Proposta específica | Restaurar do backup + Firebase Storage |
| %APPDATA% apagado | Tudo local | Restaurar do backup + reconstruir meta do Firebase |
| HD formatado | Tudo local | Restaurar do backup externo + Firebase |
| Firebase indisponível | Nada local | Continua offline; sync quando voltar |
| Backup corrompido | Backup antigo | Tenta backup anterior; usa Firebase como fonte |

### 9.2 Reconstrução automática do índice

Se `propostas.json` não existir ou estiver corrompido:

```
Detecta ausência/corrupção do índice
    ↓
Alerta: "Índice corrompido. Iniciando reconstrução."
    ↓
Varre recursivamente pasta Propostas/
    ↓
Para cada pasta encontrada com meta.json:
  lê meta.json → extrai campos do índice → adiciona ao array
    ↓
Ordena por criadaEm
    ↓
Salva propostas.json reconstruído
    ↓
Alerta: "Índice reconstruído. X documentos recuperados."
```

### 9.3 Fluxo de restauração de backup

```
Usuário aciona "Restaurar Backup"
    ↓
Lista backups disponíveis (local + Firebase)
    ↓
Usuário seleciona
    ↓
Validação de integridade (hash manifest)
    ↓ (válido)               ↓ (inválido)
Extrai em pasta temp        Alerta: "Backup corrompido.
    ↓                        Tente outro ponto."
Compara com dados atuais
    ↓
Mostra diff: "X propostas serão restauradas, Y mantidas"
    ↓
Usuário confirma
    ↓
Aplica restauração
    ↓
Recria índices
    ↓
Reinicia módulo de documentos
```

---

## 10. PREVENÇÃO DE DUPLICATAS E VERSIONAMENTO

### 10.1 Prevenção de duplicatas por hash

Ao gerar qualquer PDF:
1. Calcula SHA-256 do arquivo gerado
2. Busca no índice por `pdfHash` igual
3. Se encontrar: "Este PDF já existe como [PROP-2026-001]. Deseja criar versão nova?"
4. Se não encontrar: salva normalmente

Ao importar PDF externo:
1. Calcula SHA-256 do arquivo
2. Busca no índice
3. Se encontrado: "Arquivo já importado como [PROP-2026-001]. Exibir?"
4. Se não encontrado: inicia fluxo de importação

### 10.2 Prevenção de duplicatas por cliente

Ao criar nova proposta para um cliente:
1. Normaliza nome + telefone
2. Busca no índice por `clienteNomeNormalizado` + `clienteTelefone`
3. Se encontrar propostas existentes para este cliente:
   - "João Silva já tem 2 propostas: PROP-2026-001 (Enviada), PROP-2025-012 (Aceita). Criar nova mesmo assim?"
4. Se confirmar: cria nova proposta independente (não nova versão)

### 10.3 Versionamento de propostas

Uma nova **versão** é criada quando:
- Usuário edita dados de uma proposta que já tem PDF gerado
- Usuário clica "Nova versão" manualmente

Uma nova **proposta** é criada quando:
- É um cliente diferente
- É o mesmo cliente mas para um sistema diferente (residencial → comercial)
- Usuário explicitamente escolhe "Nova proposta"

**Regra de versionamento:**
```
Proposta PROP-2026-001 com v1 (RASCUNHO) e v2 (ENVIADA):

PROP-2026-001_JOAO-SILVA\
  ├── v1\
  │   └── PROP-2026-001_v1_RASCUNHO.pdf    ← preservado, somente leitura
  ├── v2\
  │   └── PROP-2026-001_v2_ENVIADA.pdf     ← atual
  └── atual\
      └── PROP-2026-001_JOAO-SILVA.pdf     ← cópia da v2 (para acesso rápido)
```

- Versões anteriores: nunca apagadas, somente leitura
- `versaoAtual` no meta.json sempre aponta para a mais recente
- Interface mostra histórico de versões com diff de campos alterados

---

## 11. INTEGRAÇÃO FIREBASE FUTURA

### 11.1 Estrutura Firebase planejada

```
Firestore:
  propostas/
    {propostaId}/
      id, clienteNome, clienteTelefone, leadId
      kwp, investimento, economia, payback
      status, criadaEm, enviadaEm, fechadaEm
      vendedor, versaoAtual
      firebaseStorageUrls: { v1: "gs://...", v2: "gs://..." }

  laudos/
    {laudoId}/
      id, subtipo, clienteNome, leadId
      status, tecnicoResponsavel
      criadaEm, finalizadaEm
      qtdFotos, temAssinatura
      pdfUrl: "gs://..."

  orcamentos/
    {orcamentoId}/
      id, clienteNome, leadId
      totalValor, qtdItens
      status, criadaEm, aprovadaEm
      pdfUrl: "gs://..."

Firebase Storage:
  propostas/
    PROP-2026-001/
      v1.pdf
      v2.pdf
  laudos/
    LAUD-2026-001/
      laudo.pdf
      fotos/
        foto-01.jpg
        foto-02.jpg
  orcamentos/
    ORC-2026-001/
      orcamento.pdf
```

### 11.2 Regras de segurança Firebase (projeção)

```javascript
// Regra: apenas usuário autenticado da empresa pode ler/escrever
match /propostas/{docId} {
  allow read, write: if request.auth != null
    && request.auth.token.email.matches('.*@mfsolucoes\\.com\\.br');
}
```

### 11.3 Fluxo de sincronização bidirecional (futuro multiusuário)

```
Vendedor A (Marcos — no escritório):
  Cria PROP-2026-050 → local → sync Firebase

Vendedor B (futuro colaborador — em campo):
  Abre Control Center → detecta PROP-2026-050 no Firebase
  → baixa meta + PDF para local
  → Atualiza status: ENVIADA
  → sync de volta ao Firebase

Marcos vê o update:
  barra de status: "1 documento atualizado remotamente"
  → baixa atualização
```

---

## 12. RISCOS E MITIGAÇÕES

### 12.1 Riscos técnicos

| Risco | Probabilidade | Impacto | Mitigação |
|---|:---:|:---:|---|
| `propostas.json` corrompido por falha de energia | Baixa | Alto | Atomic write: `.tmp` → rename; reconstrução automática de meta.json |
| Sequenciador gera IDs duplicados em crash | Muito baixa | Médio | Validação: nunca emitir ID que já existe no índice |
| PDF gerado com dados incompletos | Baixa | Médio | Validação mínima antes de gerar: nome e pelo menos 1 campo técnico |
| Pasta %APPDATA% sem permissão de escrita | Muito baixa | Crítico | Detectar na inicialização; fallback para Documents\MF Control Center |
| Crescimento descontrolado da pasta (muitos PDFs) | Média | Baixo | Alerta quando > 2GB; ferramenta de arquivamento de anos antigos |
| Lead excluído do CRM — proposta fica "órfã" | Baixa | Baixo | leadId armazenado localmente; proposta continua acessível |
| Dois documentos com mesmo hash (colisão SHA-256) | Desprezível | Baixo | Probabilidade astronomicamente baixa; tratar como não-duplicata |

### 12.2 Riscos operacionais

| Risco | Probabilidade | Impacto | Mitigação |
|---|:---:|:---:|---|
| Usuário continua salvando PDFs no Desktop por hábito | Alta | Médio | Assistente de importação; alerta "PDF fora da estrutura MF" |
| Nome do cliente digitado diferente (João vs Joao) | Alta | Baixo | Normalização + fuzzy match na busca |
| Proposta enviada mas status não atualizado | Média | Baixo | Lembrete: "Esta proposta está GERADA há 3 dias. Já enviou?" |
| Backup automático falha silenciosamente | Baixa | Alto | Log de backup + alerta na Health Center se > 7 dias sem backup |
| Migração da pasta atual cria duplicatas | Alta | Médio | Hash check em todos os PDFs importados |

### 12.3 Riscos de negócio

| Risco | Mitigação |
|---|---|
| Marcos formata o computador sem exportar backup | OneDrive sincroniza %APPDATA%; backup Firebase como segunda camada |
| Computador roubado com propostas de clientes | Dados em %APPDATA% são do usuário Windows; backup Firebase é a cópia segura |
| Necessidade de acessar propostas de outro dispositivo | Firebase Storage com PDFs torna isso possível via CC instalado em outro PC |

---

## 13. PLANO DE IMPLEMENTAÇÃO CC-9.0 a CC-9.9

### CC-9.0 — Infraestrutura base (FOUNDATION)

**Objetivo**: Criar a estrutura de pastas e o sistema de indexação no disco.

**O que faz**:
- Detecta (ou cria) a pasta raiz `%APPDATA%\MF Control Center\`
- Cria toda a árvore de subpastas na primeira execução
- Cria arquivos de índice vazios se não existirem: `propostas.json`, `laudos.json`, `orcamentos.json`, `clientes.json`, `sequencias.json`
- Expõe via IPC: `getDataPath()`, `readIndex(tipo)`, `writeIndex(tipo, dados)`, `nextId(tipo)`
- Implementa atomic write (`.tmp` → rename)
- Implementa reconstrução de índice por scan

**Esforço**: 4-6h
**Impacto**: CRÍTICO — bloqueia todas as etapas seguintes
**Risco**: BAIXO
**Dependência**: Nenhuma

---

### CC-9.1 — Central de Propostas: Listagem e Pesquisa

**Objetivo**: Interface que lista e pesquisa propostas do índice local.

**O que faz**:
- Substitui o webview atual por interface nativa
- Lê `propostas.json` ao abrir o módulo
- Grid: ID · Cliente · kWp · Investimento · Status · Data
- Filtros: Status, Período, Vendedor
- Busca: por nome (parcial), telefone, ID
- Botões: Abrir PDF, Ver detalhes, Nova proposta
- Exibe: "Nenhuma proposta ainda. Importe ou crie a primeira."

**Esforço**: 6-8h
**Impacto**: ALTO
**Risco**: BAIXO
**Dependência**: CC-9.0

---

### CC-9.2 — Criação de Proposta Nativa

**Objetivo**: Formulário no Control Center para criar proposta sem precisar do CRM.

**O que faz**:
- Formulário multi-etapa: Cliente → Técnico → Financeiro → Revisão
- Busca opcional de lead no CRM (vincula leadId)
- Salva `meta.json` + `payload.json` na estrutura de pastas
- Atualiza `propostas.json` com novo registro
- Status inicial: RASCUNHO

**Esforço**: 8-12h
**Impacto**: ALTO
**Risco**: MÉDIO (formulário complexo com muitos campos)
**Dependência**: CC-9.0, CC-9.1

---

### CC-9.3 — Geração de PDF Nativa

**Objetivo**: Gerar PDF da proposta dentro do Control Center, salvo na estrutura.

**O que faz**:
- Botão "Gerar PDF" na Central
- Abre `proposta.html` em BrowserWindow offscreen
- Injeta `payload.json` via localStorage
- Gera PDF e salva em `Propostas/[ANO]/[MES]/[ID]/v[N]/[NOME].pdf`
- Calcula hash SHA-256 do PDF
- Atualiza `meta.json` e `propostas.json`
- Status muda: RASCUNHO → GERADA

**Esforço**: 4-6h
**Impacto**: ALTO
**Risco**: MÉDIO (offscreen rendering pode ter edge cases)
**Dependência**: CC-9.2

---

### CC-9.4 — Importação de PDFs Históricos

**Objetivo**: Assistente para importar propostas existentes da pasta atual de Marcos.

**O que faz**:
- Diálogo "Selecionar pasta de propostas"
- Varre pasta recursivamente, lista todos os PDFs
- Para cada PDF: extrai data (metadata Windows), tenta identificar cliente pelo nome
- Tela de confirmação: "Encontrei 23 PDFs. Confirme os dados:"
- Copia para estrutura interna (original preservado)
- Cria entradas no índice com `status: "importada"` e `leadId: null`
- Oferece: vincular cada proposta a um lead do CRM

**Esforço**: 6-8h
**Impacto**: ALTO (resolve o histórico)
**Risco**: MÉDIO (nomes inconsistentes nos arquivos)
**Dependência**: CC-9.0, CC-9.1

---

### CC-9.5 — Central de Laudos

**Objetivo**: Módulo completo para criar, fotografar, assinar e gerar laudo em PDF.

**O que faz**:
- Lista de laudos com filtros por tipo e status
- Formulário por tipo de laudo (campos específicos)
- Upload e organização de fotos com legenda
- Canvas de assinatura digital
- Geração de PDF do laudo
- Estrutura de pastas `Laudos/`

**Esforço**: 12-16h
**Impacto**: ALTO
**Risco**: MÉDIO-ALTO (fotos + assinatura + PDF complexo)
**Dependência**: CC-9.0, CC-9.3

---

### CC-9.6 — Central de Orçamentos

**Objetivo**: Módulo para criar orçamentos com serviços, materiais e PDF final.

**O que faz**:
- Lista de orçamentos
- Formulário: adicionar serviços e materiais com cálculo automático
- Formas de pagamento
- Geração de PDF do orçamento
- Estrutura de pastas `Orcamentos/`

**Esforço**: 8-10h
**Impacto**: ALTO
**Risco**: BAIXO
**Dependência**: CC-9.0, CC-9.3

---

### CC-9.7 — Backup e Recuperação Integrados

**Objetivo**: Backup automático diário + interface de restauração.

**O que faz**:
- Backup automático ao fechar o app: zip dos índices + meta.json
- Backup completo semanal: zip de tudo incluindo PDFs
- Interface de restauração: lista backups, mostra data/tamanho, valida hash
- Integração com Health Center: alerta se backup > 7 dias
- Log de backups em `Logs/backup-[mes].log`

**Esforço**: 6-8h
**Impacto**: ALTO
**Risco**: BAIXO
**Dependência**: CC-9.0

---

### CC-9.8 — Sincronização Firebase

**Objetivo**: Upload de metadados para Firestore e PDFs para Storage.

**O que faz**:
- Botão "Enviar por link" → upload para Firebase Storage → URL copiada
- Sync automático de metadados ao criar/atualizar documento
- Fila offline: operações pendentes sincronizadas ao reconectar
- Barra de status de sync
- Registro de `firebaseSync`, `firebaseDocId`, `firebaseStorageUrl`

**Esforço**: 8-10h
**Impacto**: MÉDIO (online funciona sem isso)
**Risco**: MÉDIO
**Dependência**: CC-9.3, CC-9.4, credenciais Firebase Storage habilitadas

---

### CC-9.9 — Busca Unificada e Painel Documental

**Objetivo**: Pesquisa única que retorna propostas + laudos + orçamentos de um cliente.

**O que faz**:
- Campo de busca global: "João Silva" → lista todas as propostas, laudos e orçamentos deste cliente
- Aba "Cliente": página unificada com todo o histórico documental
- Exportar histórico do cliente (ZIP com todos os documentos)
- Estatísticas: total de propostas geradas, aceitas, valor médio, taxa de conversão

**Esforço**: 8-10h
**Impacto**: MUITO ALTO (visão 360° do cliente)
**Risco**: BAIXO
**Dependência**: CC-9.1 a CC-9.6

---

### Tabela resumo do roadmap CC-9

| Etapa | Nome | Esforço | Impacto | Risco | Depende de |
|---|---|:---:|:---:|:---:|---|
| CC-9.0 | Infraestrutura base | 4-6h | CRÍTICO | Baixo | — |
| CC-9.1 | Listagem e Pesquisa | 6-8h | Alto | Baixo | 9.0 |
| CC-9.2 | Criação de Proposta | 8-12h | Alto | Médio | 9.0, 9.1 |
| CC-9.3 | Geração de PDF | 4-6h | Alto | Médio | 9.2 |
| CC-9.4 | Importação Histórica | 6-8h | Alto | Médio | 9.0, 9.1 |
| CC-9.5 | Central de Laudos | 12-16h | Alto | Médio-Alto | 9.0, 9.3 |
| CC-9.6 | Central de Orçamentos | 8-10h | Alto | Baixo | 9.0, 9.3 |
| CC-9.7 | Backup e Recuperação | 6-8h | Alto | Baixo | 9.0 |
| CC-9.8 | Sync Firebase | 8-10h | Médio | Médio | 9.3, 9.4 |
| CC-9.9 | Busca Unificada | 8-10h | Muito Alto | Baixo | 9.1-9.6 |
| **TOTAL** | | **70-94h** | | | |

### Sequência recomendada de execução

```
SPRINT 1 — Base operacional (CC-9.0 + CC-9.1 + CC-9.7)
  Resultado: estrutura criada, lista de propostas visível, backup automático
  ETA: 1-2 dias de trabalho

SPRINT 2 — Propostas completas (CC-9.2 + CC-9.3 + CC-9.4)
  Resultado: criar proposta, gerar PDF, importar histórico
  ETA: 3-4 dias de trabalho

SPRINT 3 — Laudos e Orçamentos (CC-9.5 + CC-9.6)
  Resultado: Centro documental completo
  ETA: 3-4 dias de trabalho

SPRINT 4 — Firebase e busca (CC-9.8 + CC-9.9)
  Resultado: sync, compartilhamento por link, painel 360°
  ETA: 2-3 dias de trabalho

VERSÃO 1.0 FUNCIONAL: após SPRINT 2
VERSÃO COMPLETA: após SPRINT 4
```

---

## PERGUNTA PENDENTE ANTES DE CC-9.0

Antes de iniciar a implementação, necessário confirmar com Marcos:

1. **Caminho da pasta atual de propostas** — onde os PDFs estão salvos hoje
2. **Convenção de nomes usada** — padrão manual existente (ex: "PROPOSTA SOLAR - CLIENTE CIDADE")
3. **Volume aproximado** — quantos PDFs existem hoje (10? 50? 500?)
4. **Outros formatos** — existem DOCX, XLSX, ou somente PDF?
5. **Decisão sobre %APPDATA%** — confirmar que este caminho é aceitável, ou se prefere uma pasta visível como `Documentos\MF Soluções\`

---

*Documento gerado em: 08/06/2026 · CC-9 Especificação Operacional V1.0*
*Nenhum código foi escrito. Nenhum arquivo do projeto foi alterado. Nenhum commit realizado.*
*Status: AGUARDANDO APROVAÇÃO PARA INICIAR CC-9.0*

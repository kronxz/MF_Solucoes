# CC-8 — Preparação para Produção
## Artefatos: Etapas 2 · 3 · 4 · 6

---

## ETAPA 2 — INSTALADOR PROFISSIONAL

### Estado atual
- `dist/win-unpacked/MF Control Center.exe` — **176 MB** — executável desempacotado ✅
- Instalador NSIS: **não gerado ainda** (último build foi `--dir`, não `--win`)
- `package.json` já tem config completa para NSIS + Portable

### Pré-requisitos para gerar o instalador

| Item | Status | Ação necessária |
|---|---|---|
| `logo.ico` real (>1KB, 256px) | ❌ Placeholder 991B | Executar `npx electron assets/generate-icons.js` |
| electron-builder configurado | ✅ | — |
| NSIS target configurado | ✅ | — |
| Portuguese language (1046) | ✅ | — |
| shortcutName = "MF Control Center" | ✅ | — |
| menuCategory = "MF Soluções" | ✅ | — |
| createDesktopShortcut = true | ✅ | — |
| createStartMenuShortcut = true | ✅ | — |
| deleteAppDataOnUninstall = false | ✅ | — |
| Portable artifact também gerado | ✅ | — |

### Checklist de validação do instalador

```
ANTES DO BUILD
□ Executar: npx electron assets/generate-icons.js
□ Verificar: assets/logo.ico > 50KB (ICO válido multi-size)
□ Verificar: assets/logo.png existe (512x512)
□ Confirmar versão em package.json (atualmente 1.0.0)

BUILD
□ Executar: npm run build
□ Verificar: dist/MF-Control-Center-Setup-1.0.0.exe gerado
□ Verificar: dist/MF-Control-Center-Portable-1.0.0.exe gerado

INSTALAÇÃO (testar em VM limpa)
□ Executar Setup como usuário comum (não admin)
□ Tela de instalação exibe logo MF Soluções (não Electron)
□ Idioma PT-BR na tela do instalador
□ Pasta de destino selecionável pelo usuário
□ Atalho criado na Área de Trabalho
□ Entrada no Menu Iniciar → "MF Soluções" → "MF Control Center"
□ Ícone da taskbar: MF Soluções (não Electron)
□ Ícone da janela: MF Soluções (não Electron)

EXECUÇÃO PÓS-INSTALAÇÃO
□ App abre normalmente
□ Login Firebase funciona
□ CRM carrega no webview
□ Backup Center acessível
□ Health Center mostra ≥6 OK

DESINSTALAÇÃO
□ Painel de Controle → Programas → MF Control Center → Desinstalar
□ OU Menu Iniciar → MF Soluções → Desinstalar MF Control Center
□ Confirmar que app fecha e pasta é removida
□ Confirmar que dados de usuário (AppData) são preservados
□ Confirmar que atalhos são removidos da área de trabalho e menu

PORTABLE
□ Executar MF-Control-Center-Portable-1.0.0.exe sem instalação
□ Confirmar que não cria entradas no registro
□ Confirmar que fecha sem deixar rastros
```

### Comando de build
```bash
# 1. Gerar ícones (requer Electron)
cd mf-control-center
npx electron assets/generate-icons.js

# 2. Build completo (NSIS + Portable)
npm run build

# Saída esperada:
# dist/MF-Control-Center-Setup-1.0.0.exe   (~120 MB)
# dist/MF-Control-Center-Portable-1.0.0.exe (~120 MB)
# dist/win-unpacked/                         (pasta desempacotada)
```

---

## ETAPA 3 — EXPERIÊNCIA OFFLINE

### Classificação por módulo

| Módulo | Classe | Funciona Offline | Detalhe |
|---|:---:|---|---|
| **Login** | C | ❌ Não | Firebase Auth exige internet para autenticação inicial |
| **CRM Webview** | C | ❌ Não | mf-solucoes-crm.web.app é remote — requer internet |
| **Dashboard (MF)** | C | ❌ Não | Dados de Firestore em tempo real |
| **Firestore Manager** | C | ❌ Não | Depende de Firestore em tempo real |
| **Backup Center — Criar** | B | ⚠️ Parcial | Backup Firestore precisa de internet; backup CRM/Landing usa arquivos locais |
| **Backup Center — Listar** | A | ✅ Sim | Lista arquivos locais — não precisa de internet |
| **Recovery Center** | A | ✅ Sim | Restaura de arquivos locais — não precisa de internet |
| **Git Recovery** | A | ✅ Sim | Opera no repositório git local — não precisa de internet |
| **Propostas** | C | ❌ Não | Tenta carregar proposta.html do CRM remoto (fallback para local) |
| **Health Center** | B | ⚠️ Parcial | Checks locais OK; fetch CRM/Landing falha offline |
| **Atualizações** | C | ❌ Não | Verifica versão e releases no GitHub |
| **Dev Tools** | A | ✅ Sim | Ferramentas locais — independente de internet |

### Legenda
- **A — Funciona offline**: Nenhuma dependência de rede
- **B — Parcialmente offline**: Funções locais OK, funções de rede degradadas
- **C — Não funciona offline**: Requer internet para operação básica

### Módulos críticos que dependem de internet
1. **Login** — Único ponto de falha total. Sem autenticação, nada funciona.
2. **CRM** — Toda a operação diária está aqui. 100% remote.
3. **Firestore** — Dados dos leads vivem na nuvem.

### Ação futura (não implementar agora)
- Habilitar Firestore offline persistence (`enableIndexedDbPersistence`)
- Session token caching para login offline
- Service Worker para CRM (escopo do time CRM, não do Control Center)

---

## ETAPA 4 — CENTRAL DE PROPOSTAS

### Diagnóstico do estado atual

**Comportamento atual (`propostas.js`):**
1. Abre `proposta.html` do CRM (remoto ou local via `crm-dev/`)
2. Sempre abre a **mesma** tela de nova proposta
3. Não há listagem de propostas existentes
4. Não há histórico, pesquisa ou seleção de proposta

**Problema**: O módulo atual é um webview simples para criar propostas. Não é uma central.

---

### Design: Central de Propostas

#### Visão geral
A Central de Propostas deve ser um módulo nativo no renderer (não webview) que:
- Lê propostas do Firestore (`proposta_dados` ou coleção equivalente)
- Exibe lista com status, cliente, valor
- Permite abrir, duplicar, criar nova

#### Estrutura de dados esperada (Firestore)
```
Coleção: propostas
Documento: {
  id: string,
  cliente: string,
  email: string,
  valor: number,
  status: 'rascunho' | 'enviada' | 'aceita' | 'recusada',
  criadaEm: Timestamp,
  atualizadaEm: Timestamp,
  itens: [...],
  observacoes: string
}
```

#### Interface desejada

```
┌─────────────────────────────────────────────────────┐
│ 📄 Central de Propostas          [+ Nova] [🔄]       │
├─────────────┬───────────────────────────────────────┤
│ 🔍 Buscar   │ Status: [Todas ▾] Período: [2026 ▾]   │
├─────────────┴───────────────────────────────────────┤
│ CLIENTE          VALOR    STATUS    DATA    AÇÕES    │
│ João Silva       R$12.000 Enviada   03/06   👁 📋    │
│ Maria Andrade    R$ 8.500 Aceita    01/06   👁 📋    │
│ Pedro Costa      R$21.600 Rascunho  31/05   👁 ✏️    │
│ ...                                                  │
├─────────────────────────────────────────────────────┤
│ Totais: 12 propostas · R$124.000 em aberto           │
└─────────────────────────────────────────────────────┘
```

#### Funcionalidades planejadas

| Funcionalidade | Prioridade | Descrição |
|---|:---:|---|
| Listar propostas | P1 | Grid com cliente, valor, status, data |
| Pesquisar | P1 | Busca por nome, valor, status |
| Abrir proposta | P1 | Abre webview do CRM na proposta específica |
| Criar nova | P1 | Navega para formulário de nova proposta |
| Visualizar histórico | P2 | Timeline de mudanças de status |
| Filtrar por período | P2 | Propostas do mês/trimestre |
| Exportar lista | P3 | CSV ou impressão |
| Duplicar proposta | P3 | Copia dados para nova proposta |

#### Implementação técnica planejada

**Arquivo**: `renderer/js/pages/propostas.js` (reescrever)

**Fonte de dados**: Firestore — coleção `propostas` (verificar nome real via Firestore Manager)

**Fluxo**:
1. `propostasInit()` → carrega lista do Firestore
2. Renderiza grid nativo (não webview)
3. Click em "Abrir" → abre CRM webview na URL da proposta específica
4. Click em "+ Nova" → abre CRM webview no formulário de nova proposta

**Dependências**: Firebase SDK (já disponível), sem IPC adicional

#### Pré-requisito
Verificar nome real da coleção de propostas no Firestore Manager antes de implementar.

---

## ETAPA 6 — ROADMAP FINAL

### CC-8.1 — Identidade Visual Completa
**Objetivo**: App visualmente pronto para uso profissional
**Esforço**: PEQUENO (2-4h)
**Impacto**: ALTO — elimina aparência genérica Electron
**Risco**: BAIXO
**Dependências**: Logo PNG/ICO real do cliente MF Soluções

**Tarefas**:
1. Gerar ícones reais: `npx electron assets/generate-icons.js`
2. Adicionar logo.png ao sidebar (substituir texto "MF Control")
3. Adicionar tray icon com menu contextual (abrir/fechar/sair)
4. Criar splash screen básica (logo + barra de progresso)
5. Build e validação do instalador NSIS completo

**Critério de conclusão**: Build gera Setup.exe com ícone MF Soluções; instalação limpa funciona.

---

### CC-8.2 — Estabilidade e Restart Automático
**Objetivo**: Fechar o gap dos IPC não registrados sem exigir restart manual
**Esforço**: MÉDIO (4-8h)
**Impacto**: ALTO — Recovery/Git/Backup ficam operacionais sem instrução
**Risco**: BAIXO-MÉDIO
**Dependências**: Nenhuma (código já está em main.js)

**Problema atual**: Os handlers IPC de Recovery (CC-4), Git (CC-5) e Backup estão em main.js mas requerem que o Electron seja reiniciado para registrá-los (foram adicionados depois do boot atual).

**Solução**:
1. Reiniciar o processo Electron uma vez para ativar todos os 14+ handlers
2. Após restart: Health Center deve mostrar ≥8/10 OK
3. Opcional: `app.relaunch() + app.quit()` no botão "Reiniciar App" na Health Center

**Tarefas**:
1. Adicionar botão "🔄 Reiniciar aplicativo" na Health Center quando IPC está inativo
2. Implementar `window.MFControl.relaunchApp()` no preload.js
3. `ipcMain.handle('app:relaunch', () => { app.relaunch(); app.quit(); })` no main.js
4. Testar Recovery Center com handlers ativos
5. Testar Git Recovery com handlers ativos
6. Validar Health Center: ≥9/10 OK esperado

**Critério de conclusão**: Health Center ≥9/10 OK em boot fresco do instalador.

---

### CC-8.3 — Central de Propostas
**Objetivo**: Transformar módulo de propostas em painel operacional real
**Esforço**: GRANDE (8-16h)
**Impacto**: ALTO — funcionalidade de uso diário
**Risco**: MÉDIO (depende da estrutura do Firestore)
**Dependências**: CC-8.1 (identidade visual), verificação da coleção Firestore

**Tarefas**:
1. Verificar coleção de propostas no Firestore Manager (nome real, estrutura)
2. Reescrever `propostas.js` como Central nativa (grid + pesquisa)
3. Integrar leitura do Firestore com paginação (50 propostas por vez)
4. Botão "+ Nova" → CRM webview no formulário correto
5. Click em proposta → CRM webview na proposta específica
6. Totalizadores (valor total, por status)
7. Filtro por período e status
8. Testes com dados reais de produção

**Critério de conclusão**: Usuário consegue ver, pesquisar e abrir qualquer proposta sem usar o CRM diretamente.

---

### Resumo do Roadmap

| Etapa | Nome | Esforço | Impacto | Risco | Dependência |
|---|---|:---:|:---:|:---:|---|
| CC-8.1 | Identidade Visual | Pequeno | Alto | Baixo | Logo do cliente |
| CC-8.2 | Restart + Estabilidade | Médio | Alto | Baixo | Reiniciar Electron |
| CC-8.3 | Central de Propostas | Grande | Alto | Médio | CC-8.1 + Firestore |

### Sequência recomendada
```
AGORA (sem custo):
  → Reiniciar o MF Control Center
  → Health Center deve mostrar ≥8/10 OK automaticamente

PRÓXIMO (CC-8.1, ~2-4h):
  → Receber logo PNG do Marcos
  → Gerar ICO
  → Build instalador final
  → Validar instalação limpa

DEPOIS (CC-8.2, ~4-8h):
  → Implementar btn Reiniciar no Health Center
  → Testar Recovery Center funcional
  → Testar Git Recovery funcional

DEPOIS (CC-8.3, ~8-16h):
  → Verificar Firestore de propostas
  → Implementar Central de Propostas
  → Testes com dados reais

VERSÃO INSTALÁVEL FINAL:
  Estimativa: CC-8.1 + CC-8.2 + CC-8.3 concluídos
  ETA: 2-4 semanas de trabalho
```

---

*Gerado em: 08/06/2026 · MF Control Center v1.0.0 · CC-8 Preparação para Produção*

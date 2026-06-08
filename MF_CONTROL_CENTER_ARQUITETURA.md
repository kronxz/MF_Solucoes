# MF CONTROL CENTER — ARQUITETURA

**Status:** 📐 Arquitetura — NÃO IMPLEMENTADO  
**Versão Base:** V1.2 PRODUÇÃO  
**Data:** 2026-06-08

---

## VISÃO GERAL

O MF Control Center é um aplicativo desktop Windows que consolida
todos os sistemas MF Soluções em uma única interface nativa.

- **Runtime:** Electron (Node.js + Chromium)
- **Autenticação:** Firebase Auth (email/senha)
- **Backend:** Firebase (mesmo projeto `mf-solucoes-crm`)
- **Distribuição:** Executável `.exe` (NSIS installer)

---

## STACK TECNOLÓGICA

| Camada | Tecnologia |
|--------|-----------|
| Shell | Electron 28+ |
| Renderer | HTML/CSS/JS (ES Modules) |
| Backend | Firebase SDK v9 modular |
| Auth | Firebase Authentication |
| Database | Cloud Firestore |
| Build | electron-builder |
| Installer | NSIS (Windows) |
| Auto-update | electron-updater |

---

## MÓDULOS

### 1. LOGIN

```
Tela:     Login Firebase
Campos:   Email + Senha
Auth:     firebase.auth().signInWithEmailAndPassword()
Erro:     Toast + retry (max 3)
Sessão:   Persistência LOCAL (fica logado)
```

### 2. DASHBOARD

```
Fonte:    lp_leads + leads (dual-collection)
Métricas: Total leads, Leads novos hoje, Taxa de conversão,
          Faturamento estimado, Leads por status
Gráficos: Barras (status) + Linha (leads/semana)
Update:   onSnapshot em tempo real
```

### 3. CRM — KANBAN

```
Colunas:  novo → contato → proposta → fechado → instalacao → pos-venda
Fonte:    leads (calculadora) + lp_leads (landing)
Actions:  Mover, Arquivar, Excluir, WhatsApp, Proposta
Filtros:  Status, Data, Score
```

### 4. ANALYTICS

```
Fonte:    eventos (600+ docs)
Métricas: Eventos/dia, Top eventos, Funil de conversão,
          Score médio, UTM breakdown
Período:  7d / 30d / 90d / custom
```

### 5. QR CODES

```
Fonte:    landing_visits
Ações:    Gerar QR, Ver métricas, Download PNG/SVG
UTMs:     Pré-populados no QR gerado
```

### 6. FINANCEIRO

```
Fonte:    financeiro_dados (por leadId)
Views:    Tabela leads com dados financeiros
          Totais: receita bruta, custos, margem
Export:   CSV, PDF
```

### 7. TÉCNICO

```
Fonte:    tecnico_dados + instalacoes
Views:    Checklist técnico por instalação
          Timeline por instalação
Status:   agendado → em_andamento → concluido
```

### 8. LOGS / NOTIFICAÇÕES

```
Fonte:    notificacoes_logs
Views:    Feed cronológico de logs do CRM
Filtros:  Módulo, Data, Tipo
Retenção: 90 dias (cleanup automático)
```

### 9. BACKUP

```
Ações:    Exportar Firestore (JSON)
          Exportar Rules
          Exportar código CRM
Destino:  Pasta local (escolha do usuário)
          Google Drive (futuro)
Nomeação: BACKUP_YYYY-MM-DD_HH-MM.zip
```

### 10. RECOVERY CENTER

```
(Ver documento MF_RECOVERY_CENTER_ARQUITETURA.md)
Integrado como aba no MF Control Center.
Requer confirmação dupla + senha para executar.
```

---

## ARQUITETURA DE PASTAS

```
mf-control-center/
├── main.js                 # Electron main process
├── preload.js              # Context bridge (segurança)
├── package.json
├── electron-builder.yml    # Config build
│
├── renderer/               # Renderer process (UI)
│   ├── index.html          # Shell principal
│   ├── app.js              # Router + estado global
│   │
│   ├── pages/
│   │   ├── login.html
│   │   ├── dashboard.html
│   │   ├── crm.html
│   │   ├── analytics.html
│   │   ├── qrcodes.html
│   │   ├── financeiro.html
│   │   ├── tecnico.html
│   │   ├── logs.html
│   │   ├── backup.html
│   │   └── recovery.html
│   │
│   ├── modules/
│   │   ├── firebase/
│   │   │   ├── config.js     # PROD config
│   │   │   └── auth.js       # Auth listeners
│   │   ├── crm-kanban.js     # Reusar de crm-dev/
│   │   ├── crm-analytics.js
│   │   ├── crm-financeiro.js
│   │   ├── crm-tecnico.js
│   │   ├── crm-qrcodes.js
│   │   ├── crm-notificacoes.js
│   │   ├── backup.js         # Novo módulo
│   │   └── recovery.js       # Novo módulo
│   │
│   └── assets/
│       ├── logo.png
│       └── styles.css
│
└── build/
    ├── icon.ico              # Windows
    └── installer.nsh         # NSIS script
```

---

## SEGURANÇA

| Medida | Implementação |
|--------|--------------|
| Context Isolation | `contextIsolation: true` em BrowserWindow |
| Node Integration | `nodeIntegration: false` no renderer |
| Preload bridge | Apenas APIs necessárias expostas via `contextBridge` |
| CSP | Content-Security-Policy no renderer HTML |
| Auth | Firebase Auth — token renovado automaticamente |
| Firestore | Rules V1.2 (auth obrigatório para CRM) |
| Auto-update | Verificação de assinatura no installer |

---

## FLUXO DE AUTENTICAÇÃO

```
Início
  │
  ├─ Token Firebase válido em disco? → Sim → Dashboard
  │
  └─ Não → Tela Login
               │
               ├─ signInWithEmailAndPassword()
               │
               ├─ Sucesso → Persistir token → Dashboard
               │
               └─ Falha → Toast de erro → Retry
```

---

## COMUNICAÇÃO MAIN ↔ RENDERER

```
main.js (Node.js)                    renderer (Browser)
     │                                      │
     │  ← ipcRenderer.invoke('backup')      │
     │                                      │
     │  → ipcMain.handle('backup', ...)     │
     │    [acessa sistema de arquivos]       │
     │                                      │
     │  → result → ipcRenderer.invoke()     │
```

Apenas operações de sistema de arquivos (backup, recovery) passam
pelo main process. Toda a lógica Firebase fica no renderer.

---

## BUILD E DISTRIBUIÇÃO

```
npm run build
  └─ electron-builder
       ├─ NSIS installer (.exe) — Windows
       ├─ Portable (.exe) — Windows sem instalação
       └─ Auto-updater channel: latest.yml

Tamanho estimado: ~150 MB (Chromium + Node.js + assets)
```

---

## DEPENDÊNCIAS PRINCIPAIS

```json
{
  "electron": "^28.0.0",
  "electron-builder": "^24.0.0",
  "electron-updater": "^6.0.0",
  "firebase": "^10.12.0"
}
```

---

## FASES DE IMPLEMENTAÇÃO

| Fase | Módulos | Prioridade |
|------|---------|-----------|
| CC-1 | Shell Electron + Login + Dashboard | Alta |
| CC-2 | CRM Kanban + Analytics | Alta |
| CC-3 | QR Codes + Financeiro + Técnico | Média |
| CC-4 | Logs + Backup | Média |
| CC-5 | Recovery Center | Alta (segurança) |
| CC-6 | Auto-update + Installer | Alta (distribuição) |

---

*Arquitetura definida em 2026-06-08. Implementação: somente após aprovação explícita.*

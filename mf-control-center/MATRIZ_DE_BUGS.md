# MATRIZ_DE_BUGS.md
> CC-10H — Matriz de Bugs  
> Data: 2026-06-09  
> Sistema: MF Control Center — CC-1 a CC-10  

---

## RESUMO

| Criticidade | Quantidade |
|-------------|------------|
| 🔴 CRÍTICO | 0 |
| 🟠 ALTO | 0 |
| 🟡 MÉDIO | 0 |
| 🔵 BAIXO | 2 |
| ℹ️ INFO | 1 |
| **TOTAL** | **3** |

---

## BUGS BAIXO

### BUG-001
| Campo | Valor |
|-------|-------|
| **ID** | BUG-001 |
| **Criticidade** | 🔵 BAIXO |
| **Módulo** | Health Check (CC-7) |
| **Descrição** | "IPC listBackups não disponível" reportado mesmo quando Backup Center funciona normalmente |
| **Reprodução** | 1. Abrir Health Check direto após login → Badge de aviso no card Backup Center |
| **Causa raiz** | O Health Check verifica o IPC `listBackups` antes do módulo `backupInit()` ser chamado pela primeira vez. O IPC existe mas o handler precisa ser registrado via inicialização do módulo. |
| **Impacto** | Cosmético — badge amarelo no Health Check; Backup Center funciona 100% ao acessar diretamente |
| **Correção sugerida** | Chamar `backupInit()` no startup do app OU o Health Check deve verificar somente após navegação para Backup Center OU remover essa verificação do Health Check |
| **Status** | ⏳ Pendente — não bloqueante |

---

### BUG-002
| Campo | Valor |
|-------|-------|
| **ID** | BUG-002 |
| **Criticidade** | 🔵 BAIXO |
| **Módulo** | Health Check (CC-7) |
| **Descrição** | "Integridade Offline" — "Sem backups locais · localStorage: sem cache offline · indexedDB Firestore: 2 bancos" |
| **Reprodução** | Abrir Health Check → Card "Integridade Offline" com badge amarelo |
| **Causa raiz** | O sistema usa Firestore online (PROD) sem configuração de persistência offline (IndexedDB). Nenhum backup foi gerado para cache local. |
| **Impacto** | Zero impacto operacional — sistema funciona online. Apenas indica ausência de fallback offline. |
| **Correção sugerida** | Executar backup completo no Backup Center OU ativar `enableIndexedDbPersistence()` no Firebase config para CC-11 |
| **Status** | ⏳ Pendente — não bloqueante |

---

## INFO

### INFO-001
| Campo | Valor |
|-------|-------|
| **ID** | INFO-001 |
| **Tipo** | Informativo |
| **Módulo** | Login / Firebase Auth |
| **Descrição** | Após reinício completo do Electron, a tela de login é exibida (sessão não persistida automaticamente) |
| **Causa raiz** | Firebase Auth em Electron usa session persistence padrão (in-memory). Sem `setPersistence(browserLocalPersistence)` explícito, a sessão expira com o processo. |
| **Impacto** | Usuário precisa fazer login após cada reinício do app. Não é perda de dados. |
| **Correção sugerida** | Adicionar `setPersistence(browserLocalPersistence)` na inicialização do Firebase Auth em `firebase-config.js` |
| **Status** | ⏳ Melhoria futura — CC-11 |

---

## BUGS NÃO ENCONTRADOS (negativo confirmado)

Os seguintes problemas foram investigados e **não encontrados**:

| Verificação | Resultado |
|-------------|-----------|
| Erros JS no console renderer | ✅ Nenhum |
| Imports quebrados (action-center.js, documentos.js) | ✅ Nenhum |
| Promises rejeitadas não tratadas | ✅ Nenhum |
| Rotas de navegação quebradas | ✅ Nenhum |
| Memory leak após navegação intensiva | ✅ Não detectado |
| Crash após cliques rápidos em Atualizar | ✅ Nenhum |
| Dados incorretos no Action Center | ✅ Dados corretos |
| Coleções CC-9 inacessíveis | ✅ Todas acessíveis |
| Módulos antigos CC-1 a CC-8 quebrados por CC-9/CC-10 | ✅ Intactos |
| Conflito de CSS entre CC-9 e CC-10 | ✅ Nenhum |

---

*Gerado em 2026-06-09*

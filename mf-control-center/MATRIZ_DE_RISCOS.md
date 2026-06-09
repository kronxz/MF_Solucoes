# MATRIZ_DE_RISCOS.md
> CC-10H — Matriz de Riscos  
> Data: 2026-06-09  
> Sistema: MF Control Center — CC-1 a CC-10  

---

## MAPA DE RISCOS

| ID | Risco | Probabilidade | Impacto | Nível | Mitigação |
|----|-------|---------------|---------|-------|-----------|
| R-01 | Perda de dados Firestore PROD | Baixa | Alto | 🟡 MÉDIO | Backup Center com 4 tipos de backup disponíveis |
| R-02 | Sessão expirada sem aviso | Média | Médio | 🟡 MÉDIO | Login screen exibida automaticamente pelo Firebase Auth |
| R-03 | CC-9/CC-10 sem commit no Git | Alta | Baixo | 🔵 BAIXO | 23 arquivos modificados, sem tag — fazer commit CC-10 |
| R-04 | Electron sem empacotamento (.exe) | Alta | Baixo | 🔵 BAIXO | App rodando via node_modules — não é risco operacional até UNIFICACAO_FINAL_V2 |
| R-05 | Firebase PROD único ambiente | Alta | Médio | 🟡 MÉDIO | Sem ambiente de staging — mudanças vão direto para PROD |
| R-06 | allowpopups=true na webview CRM | Baixa | Baixo | 🔵 BAIXO | Warning de segurança do Electron; webview interna e confiável |
| R-07 | Sem persistência offline Firebase | Média | Baixo | 🔵 BAIXO | Sistema funciona apenas online; sem fallback se Firebase cair |
| R-08 | RECOVERY_LOCKED bloqueado (CC-4.1) | Intencional | Nenhum | ✅ CONTROLADO | Bloqueio proposital — não é risco |
| R-09 | 41 PDFs locais não vinculados | Média | Baixo | 🔵 BAIXO | Arquivos detectados pelo scan mas sem vinculação no Firestore |
| R-10 | Dados CC-9 apenas com 1 cliente teste | Alta | Baixo | 🔵 BAIXO | Sistema pronto para produção mas sem dados reais inseridos |

---

## DETALHAMENTO DOS RISCOS MÉDIOS

### R-01 — Perda de dados Firestore PROD
- **Cenário:** Exclusão acidental de documentos, corrupção de dados, conta Firebase comprometida
- **Probabilidade:** Baixa — Firestore tem redundância nativa
- **Impacto:** Alto — dados de clientes, propostas e obras perderiam histórico
- **Mitigação atual:** Backup Center exporta JSON completo; 7 backups detectados no MF Dashboard
- **Ação recomendada:** Agendar backup automático periódico (CC-11 ou posterior)

### R-02 — Sessão expirada sem aviso
- **Cenário:** Usuário trabalhando no app, Firebase token expira, próxima ação para Firestore falha silenciosamente
- **Probabilidade:** Média — tokens Firebase expiram em 1h por padrão
- **Impacto:** Médio — operações de escrita podem falhar sem feedback claro
- **Mitigação atual:** `onAuthStateChanged` redireciona para login se sessão expirar
- **Ação recomendada:** Adicionar `setPersistence(browserLocalPersistence)` + toast de reconexão

### R-05 — Firebase PROD como único ambiente
- **Cenário:** Bug introduzido em CC-11+ grava dados incorretos diretamente no Firestore de produção
- **Probabilidade:** Alta — qualquer commit vai para PROD
- **Impacto:** Médio — dados de clientes reais afetados
- **Mitigação atual:** Não há ambiente de staging
- **Ação recomendada:** Criar projeto Firebase de staging (firebase-dev) para desenvolvimento CC-11+

---

## RISCOS CONTROLADOS

| Risco | Por quê está controlado |
|-------|------------------------|
| Recovery Center destrutivo | RECOVERY_LOCKED=true, botão de restauração BLOQUEADO |
| Sobrescrita do CRM | NÃO TOCAR NO CRM — regra hard constraint |
| Migração prematura para Electron empacotado | UNIFICACAO_FINAL_V2 adiada até CC-X final |
| Módulos CC-1 a CC-8 quebrados | Verificados ao vivo — todos intactos |

---

## CONCLUSÃO DE RISCO

> **O sistema está em nível de risco ACEITÁVEL para continuar o desenvolvimento.**  
> Nenhum risco crítico identificado.  
> Os 2 riscos médios (R-01, R-02, R-05) têm mitigação existente ou planejada.  
> CC-11 pode ser iniciado.

---

*Gerado em 2026-06-09*

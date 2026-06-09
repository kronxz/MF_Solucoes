# PROJETO_CANONICO_OFICIAL.md
> Definição oficial do projeto canônico — MF Control Center  
> Data: 2026-06-09  
> Baseado em auditoria direta de código

---

## DECISÃO OFICIAL

```
╔══════════════════════════════════════════════════════════════════════════╗
║                                                                          ║
║   PROJETO CANÔNICO OFICIAL:                                             ║
║                                                                          ║
║   solar-calculator-main (1) / mf-control-center                         ║
║                                                                          ║
║   Caminho completo:                                                      ║
║   C:\Users\kronxz\OneDrive\Área de Trabalho\Nova pasta\                 ║
║   solar-calculator-main (1)\mf-control-center\                          ║
║                                                                          ║
╚══════════════════════════════════════════════════════════════════════════╝
```

---

## JUSTIFICATIVA (baseada em evidências de código)

### Por que este e não o shell novo?

| Critério | Projeto Original | Shell Novo | Vencedor |
|----------|-----------------|------------|---------|
| IPC handlers | 29 | 2 | **Original** |
| Módulos funcionais | 10 | 2 | **Original** |
| Firebase Auth real | ✅ | ❌ | **Original** |
| Firestore integrado | ✅ | ❌ | **Original** |
| Login implementado | ✅ | ❌ | **Original** |
| Backup Center real | ✅ | ❌ | **Original** |
| Recovery Center real | ✅ | ❌ | **Original** |
| Git Recovery Center | ✅ | ❌ | **Original** |
| Health Center ao vivo | ✅ | ❌ | **Original** |
| Certificações emitidas | 5 | 0 | **Original** |
| Histórico CC documentado | CC-1 a CC-8 | Fase 2A/2B | **Original** |

---

## O QUE FAZER COM O SHELL NOVO

O `mf-control-center-app` pode ser **descartado** ou mantido como referência.

**Único elemento aproveitável:** o instalador NSIS + Portable já gerado (`dist/`).
- Quando o Projeto Original precisar de build, usar a configuração do `mf-control-center-app/package.json` como referência para o `electron-builder`.
- Electron v30.5.1 (mais recente) pode ser migrado no futuro.

**NÃO fazer:**
- NÃO migrar código do Original para o Shell Novo
- NÃO fundir os dois projetos agora
- NÃO reescrever módulos existentes

---

## IDENTIFICAÇÃO DO CANÔNICO

```
Nome:        MF Control Center
Pasta:       solar-calculator-main (1)/mf-control-center/
AppId:       com.mfsolucoes.controlcenter
Versão:      1.0.0
Electron:    28.3.3
Branch:      release/v1.0-final (último commit certificado: 25dc164)
Firebase:    mf-solucoes-crm (PROD)
```

---

## REGRA PERMANENTE

> **Todo o trabalho futuro de CC-9 em diante ocorre exclusivamente no Projeto Original.**  
> O Shell Novo (`mf-control-center-app`) está suspenso.

---

*Definição baseada em auditoria de código — 2026-06-09*

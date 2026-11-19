# Passagem de bastão — cotação e tipo de telhado

**Data:** 19/11/2026  
**Estado:** correção no código local; ainda não publicada.

## Problema

Um lead configurado como `Cerâmica / colonial` podia gerar cotação identificando o telhado como fibrocimento e incluindo fixadores incompatíveis. A seleção era gravada num campo enquanto a aba Documentos lia uma cópia antiga aninhada em `projeto`; o payload que abria a cotação também não carregava o valor atual; por fim, `cotacao-kit.html` usava fibrocimento como fallback silencioso.

## O que foi alterado

- `crm-dev/js/crm-telhado.mjs`: módulo compartilhado que normaliza aliases para valor canônico e resolve o telhado do lead/projeto/qualificação com prioridade para edição atual.
- `crm-dev/js/crm-telhado.test.mjs`: testes de alias, precedência e fallback.
- `crm-dev/js/crm-cotacao-kit.js`: inclui `telhado` explicitamente no payload da cotação.
- `crm-dev/js/crm-details.js`: mantém o valor editado sincronizado ao projeto.
- `crm-dev/js/crm-documentos.js`: a cotação/documentos priorizam o telhado atual do lead; vazio aparece como confirmação pendente.
- `crm-dev/cotacao-kit.html`: consome o payload atual, converte valores legados, mostra “A confirmar” quando faltar informação e não escolhe fibrocimento por padrão.

## Como validar localmente

```powershell
node --test crm-dev/js/crm-telhado.test.mjs
```

Resultado já observado: **3 testes passaram, 0 falharam**. O teste de interface com navegador também foi executado localmente para Cerâmica/colonial e telhado sem confirmação.

## Publicação ainda pendente

Não houve publicação nesta retomada. A documentação do projeto identifica `mf-solucoes-dev` como DEV e `mf-solucoes-crm` como PROD. Próximo fluxo recomendado:

1. Revisar os arquivos alterados e validar a cotação com um lead de teste no DEV/preview, incluindo o rótulo e a lista de materiais.
2. Se o teste estiver correto, publicar **apenas Hosting** no alvo correto, seguindo `docs-dev/DEPLOY.md`; não publicar rules/indexes pois não fazem parte da correção.
3. Reabrir a URL publicada com cache limpo e confirmar telhado colonial e caso sem confirmação.
4. Registrar data, URL/target, revisão publicada e resultado neste arquivo e em `docs-dev/CHANGELOG.md`.

Não executar deploy de produção sem autorização explícita do responsável. O relatório maior da auditoria ENEL e o estado do instalador 1.2.61 ficam no outro repositório em `C:\Users\kronxz\mf-control-center-app\eng-cad\AUDITORIA_ENEL_DOCUMENTOS_2026-11-19.md`.

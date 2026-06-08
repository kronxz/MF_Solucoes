MF Control Center — Assets / Identidade Visual
================================================

Adicione os arquivos abaixo nesta pasta para aplicar a marca MF Soluções.
O electron-builder usa estes arquivos automaticamente na hora do build.

ARQUIVOS NECESSÁRIOS
─────────────────────────────────────────────────────────────
logo.ico      Windows installer icon + atalho desktop
              Tamanho recomendado: 256x256 (multi-size ICO)
              Ferramenta: https://convertico.com

logo.png      Tray icon + barra superior do app
              Tamanho recomendado: 512x512 PNG fundo transparente

splash.png    Splash screen (tela de abertura)
              Tamanho recomendado: 800x600 PNG
              (implementação futura)

─────────────────────────────────────────────────────────────

ONDE SÃO APLICADOS
─────────────────────────────────────────────────────────────
logo.ico  →  janela Electron (titlebar)
             atalho desktop gerado pelo instalador
             menu iniciar
             executável MF-Control-Center-Setup.exe
             área de notificação (system tray)

logo.png  →  barra lateral do app (src="../../assets/logo.png")
             about dialog

splash.png → splash screen ao iniciar o app (futuro)

─────────────────────────────────────────────────────────────

COMO GERAR O ICO A PARTIR DO LOGO MF SOLUÇÕES
─────────────────────────────────────────────────────────────
1. Exporte o logo em PNG 512x512 fundo transparente
2. Acesse https://convertico.com ou use ImageMagick:
   magick logo.png -define icon:auto-resize=256,128,64,48,32,16 logo.ico
3. Coloque logo.ico nesta pasta
4. Execute: npm run build

─────────────────────────────────────────────────────────────
Status: Aguardando arquivos do cliente MF Soluções.

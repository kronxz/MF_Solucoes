/**
 * generate-icons.js — MF Control Center
 * Gera logo.png e logo.ico a partir do logo.svg usando Electron + offscreen canvas.
 *
 * EXECUÇÃO:
 *   npx electron assets/generate-icons.js
 *
 * SAÍDA:
 *   assets/logo.png  — 512x512 PNG (tray, barra lateral)
 *   assets/logo.ico  — 256x256 ICO multi-size (instalador, atalho, executável)
 *
 * ALTERNATIVA sem Electron (requer ImageMagick instalado):
 *   magick assets/logo.svg -resize 512x512 assets/logo.png
 *   magick assets/logo.png -define icon:auto-resize=256,128,64,48,32,16 assets/logo.ico
 *
 * ALTERNATIVA online:
 *   1. Abra https://cloudconvert.com/svg-to-png → logo.svg → 512x512 → logo.png
 *   2. Abra https://convertico.com → logo.png → logo.ico (256x256 multi-size)
 *   3. Coloque os arquivos em mf-control-center/assets/
 */

const { app, nativeImage } = require('electron');
const path = require('path');
const fs   = require('fs');

const ASSETS = path.join(__dirname);
const SVG    = fs.readFileSync(path.join(ASSETS, 'logo.svg'), 'utf8');

app.whenReady().then(async () => {
  // Usa BrowserWindow offscreen para renderizar o SVG
  const { BrowserWindow } = require('electron');
  const win = new BrowserWindow({
    width: 512, height: 512,
    show: false,
    webPreferences: { offscreen: true, nodeIntegration: false, contextIsolation: true },
  });

  const svgB64 = Buffer.from(SVG).toString('base64');
  const html = `
    <html><body style="margin:0;background:transparent;">
      <img id="img" width="512" height="512" src="data:image/svg+xml;base64,${svgB64}">
    </body></html>
  `;
  win.loadURL('data:text/html;base64,' + Buffer.from(html).toString('base64'));

  win.webContents.once('did-finish-load', async () => {
    await new Promise(r => setTimeout(r, 500));

    // Captura como PNG 512x512
    const image = await win.webContents.capturePage({ x: 0, y: 0, width: 512, height: 512 });
    const pngBuf = image.toPNG();
    fs.writeFileSync(path.join(ASSETS, 'logo.png'), pngBuf);
    console.log('✅ logo.png gerado:', pngBuf.length, 'bytes');

    // Gera ICO (256x256) usando nativeImage
    const img256 = nativeImage.createFromBuffer(pngBuf).resize({ width: 256, height: 256 });
    // ICO header manual (1 imagem 256x256)
    const pngData = img256.toPNG();
    const ico = buildIco(pngData, 256, 256);
    fs.writeFileSync(path.join(ASSETS, 'logo.ico'), ico);
    console.log('✅ logo.ico gerado:', ico.length, 'bytes');

    win.close();
    app.quit();
  });
});

/**
 * Constrói um ICO válido com uma única imagem PNG embutida.
 * Formato ICO: ICONDIR (6 bytes) + ICONDIRENTRY (16 bytes) + dados PNG
 */
function buildIco(pngData, w, h) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type: ICO
  header.writeUInt16LE(1, 4); // count: 1 image

  const entry = Buffer.alloc(16);
  entry.writeUInt8(w > 255 ? 0 : w, 0);  // width (0 = 256)
  entry.writeUInt8(h > 255 ? 0 : h, 1);  // height (0 = 256)
  entry.writeUInt8(0, 2);                  // color count (0 = no palette)
  entry.writeUInt8(0, 3);                  // reserved
  entry.writeUInt16LE(1, 4);              // planes
  entry.writeUInt16LE(32, 6);             // bits per pixel
  entry.writeUInt32LE(pngData.length, 8); // size of image data
  entry.writeUInt32LE(22, 12);            // offset of image data (6 + 16)

  return Buffer.concat([header, entry, pngData]);
}

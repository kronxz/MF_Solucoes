const { chromium } = require('playwright');

(async () => {
  console.log('🧪 Starting Playwright simulation to gather real forensic proof...');
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  const context = await browser.newContext();
  const page = await context.newPage();

  // Print all matching browser logs
  page.on('console', msg => {
    const text = msg.text();
    if (text.includes('[END_')) {
      console.log(`\n📣 FORENSIC LOG: ${text}`);
    } else {
      console.log(`BROWSER: ${text}`);
    }
  });

  page.on('pageerror', err => {
    console.error('🔴 BROWSER EXCEPTION:', err.message);
  });

  try {
    console.log('🌐 Opening local server http://localhost:3000 ...');
    await page.goto('http://localhost:3000/', { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(2000);

    console.log('📝 Typing client details...');
    await page.fill('#clienteNome', 'Marcos Forense');
    await page.fill('#clienteTelefone', '21999998888');
    await page.fill('#endereco', 'Rua Floresta Verde, 123 - Maricá');
    await page.waitForTimeout(1000);

    console.log('⚡ Blurring telephone field to trigger criouLeadBase...');
    await page.dispatchEvent('#clienteTelefone', 'blur');
    await page.waitForTimeout(4000); // Allow lead creation to fully finish

    console.log('📝 Typing bill amount...');
    await page.fill('#bill', '500');
    await page.waitForTimeout(1000);

    console.log('⚡ Clicking button to calculate simulation...');
    await page.click('#btnCalcular');

    console.log('⏳ Waiting for simulation calculation and Firestore updateDoc (10 seconds)...');
    await page.waitForTimeout(10000);

    console.log('✅ Simulation completed successfully!');
  } catch (err) {
    console.error('❌ SIMULATION FAILED:', err);
  } finally {
    await browser.close();
  }
})();

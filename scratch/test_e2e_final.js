/**
 * Teste ponta-a-ponta: Calculadora → Firestore → prova do documento
 * Lead: TESTE ENDERECO FINAL | Endereço: Rua Teste Final 999
 */

const { chromium } = require('playwright');
const https = require('https');

const BASE_URL = 'http://localhost:3000';
const FIRESTORE_REST = 'https://firestore.googleapis.com/v1/projects/mf-solucoes-dev/databases/(default)/documents/leads';
const TS = Date.now();
const TELEFONE_TEST = '21911199900';
const ENDERECO_TEST = 'Rua Teste Final 999';
const NOME_TEST = 'Teste Endereco Final';

async function lerDocFirestore(docId) {
    return new Promise((resolve, reject) => {
        const url = `${FIRESTORE_REST}/${docId}`;
        https.get(url, res => {
            let body = '';
            res.on('data', d => body += d);
            res.on('end', () => {
                try {
                    const parsed = JSON.parse(body);
                    const fields = parsed.fields || {};
                    const out = {};
                    for (const [k, v] of Object.entries(fields)) {
                        out[k] = v.stringValue ?? v.integerValue ?? v.doubleValue ?? v.booleanValue ?? v.timestampValue ?? '(tipo complexo)';
                    }
                    resolve({ id: docId, ...out });
                } catch(e) { reject(e); }
            });
        }).on('error', reject);
    });
}

(async () => {
    console.log('='.repeat(60));
    console.log('TESTE PONTA A PONTA — ENDEREÇO FINAL');
    console.log('='.repeat(60));
    console.log(`Nome:     ${NOME_TEST}`);
    console.log(`Telefone: ${TELEFONE_TEST}`);
    console.log(`Endereço: ${ENDERECO_TEST}`);
    console.log('='.repeat(60));

    const browser = await chromium.launch({ headless: false, slowMo: 100 });
    const page = await browser.newPage();
    const logs = [];
    page.on('console', m => {
        logs.push(m.text());
        console.log('[PAGE LOG]', m.text());
    });

    await page.goto(BASE_URL, { waitUntil: 'networkidle' });

    // Preenche nome
    await page.fill('#clienteNome', NOME_TEST);
    console.log('\n✅ Nome preenchido:', NOME_TEST);

    // Preenche telefone (dispara foco em #endereco automaticamente)
    await page.fill('#clienteTelefone', TELEFONE_TEST);
    console.log('✅ Telefone preenchido:', TELEFONE_TEST);
    await page.waitForTimeout(500);

    // Preenche endereço
    await page.fill('#endereco', ENDERECO_TEST);
    console.log('✅ Endereço preenchido:', ENDERECO_TEST);
    await page.waitForTimeout(500);

    // Sai do campo endereço (dispara blur → atualizarEndereco)
    await page.press('#endereco', 'Tab');
    console.log('✅ Blur do #endereco disparado');
    await page.waitForTimeout(3000);

    // Preenche conta de luz e clica em simular
    await page.fill('#bill', '500');
    console.log('✅ Conta de luz preenchida: 500');

    await page.click('#btnCalcular');
    console.log('✅ Botão Simular clicado');
    await page.waitForTimeout(5000);

    // Coleta leadId dos logs
    const saveLog = logs.find(l => l.includes('Lead base criado (novo):') || l.includes('Lead reutilizado (dedupe):'));
    let leadId = null;
    if (saveLog) {
        if (saveLog.includes('Lead base criado (novo):')) {
            leadId = saveLog.split('Lead base criado (novo):')[1]?.trim();
        } else {
            leadId = saveLog.split('Lead reutilizado (dedupe):')[1]?.trim();
        }
    }

    // Também verifica log de atualização de endereço
    const enderecoLog = logs.find(l => l.includes('Endereço atualizado com sucesso no Firestore para o ID:'));
    if (enderecoLog && !leadId) {
        leadId = enderecoLog.split('para o ID:')[1]?.trim();
    }

    console.log('\n' + '='.repeat(60));
    console.log('RESULTADO COLETA DE LOGS');
    console.log('='.repeat(60));
    console.log('leadId detectado:', leadId);

    // Screenshot da calculadora com resultados
    await page.screenshot({ path: 'scratch/screenshot_calculadora.png', fullPage: true });
    console.log('✅ Screenshot salvo: scratch/screenshot_calculadora.png');

    await browser.close();

    if (!leadId) {
        console.error('\n❌ FALHA: leadId não encontrado nos logs do console.');
        console.log('Logs coletados:', logs.filter(l => l.includes('[leadService]') || l.includes('[LEAD_FLOW]')));
        process.exit(1);
    }

    // Lê documento do Firestore
    console.log('\n' + '='.repeat(60));
    console.log('DOCUMENTO FIRESTORE (leitura direta)');
    console.log('='.repeat(60));
    await new Promise(r => setTimeout(r, 2000));
    const docData = await lerDocFirestore(leadId);
    console.log(JSON.stringify(docData, null, 2));

    console.log('\n' + '='.repeat(60));
    console.log('VERIFICAÇÃO DO CAMPO endereco');
    console.log('='.repeat(60));
    const enderecoNoDoc = docData.endereco;
    if (enderecoNoDoc) {
        console.log(`✅ CAMPO endereco PRESENTE: "${enderecoNoDoc}"`);
        const bate = enderecoNoDoc === ENDERECO_TEST;
        console.log(bate ? `✅ Valor BATE com o preenchido: "${ENDERECO_TEST}"` : `⚠️  Valor DIFERENTE do preenchido. Esperado: "${ENDERECO_TEST}"`);
    } else {
        console.error(`❌ CAMPO endereco AUSENTE no documento ${leadId}`);
    }

    process.exit(enderecoNoDoc ? 0 : 1);
})();

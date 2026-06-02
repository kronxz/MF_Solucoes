/**
 * TEST: fix persist address during lead base creation
 * 3 cenários:
 *   1. Usuário preenche endereço ANTES do blur do telefone → lead criado COM endereco
 *   2. Usuário NÃO preenche endereço → lead criado SEM endereco (comportamento original mantido)
 *   3. Usuário abandona sem simular, mas tinha endereço → lead contém endereco
 */

const { chromium } = require('playwright');

const BASE_URL = 'http://localhost:3000';
const FIRESTORE_REST = 'https://firestore.googleapis.com/v1/projects/mf-solucoes-dev/databases/(default)/documents/leads';

const results = [];

async function lerDocFirestore(docId) {
    const url = `${FIRESTORE_REST}/${docId}`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const json = await res.json();
    const fields = json.fields || {};
    const out = {};
    for (const [k, v] of Object.entries(fields)) {
        out[k] = v.stringValue ?? v.integerValue ?? v.doubleValue ?? v.booleanValue ?? v.timestampValue ?? '(tipo complexo)';
    }
    return out;
}

async function runTest(label, fn) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`TESTE: ${label}`);
    console.log('='.repeat(60));
    try {
        const result = await fn();
        results.push({ label, ...result });
    } catch (e) {
        console.error(`ERRO no teste: ${e.message}`);
        results.push({ label, erro: e.message });
    }
}

(async () => {
    const browser = await chromium.launch({ headless: true });

    // ─── TESTE 1: Endereço preenchido ANTES do blur do telefone ────────────
    await runTest('Cenário 1: Endereço preenchido antes do blur', async () => {
        const page = await browser.newPage();
        const logs = [];
        page.on('console', m => logs.push(m.text()));
        await page.goto(BASE_URL, { waitUntil: 'networkidle' });

        const ts = Date.now();
        await page.fill('#clienteNome', `Ana Cenario Um`);
        await page.fill('#clienteTelefone', '21988887771');
        // Preenche endereço ANTES de sair do campo telefone
        await page.fill('#endereco', `Rua Cenario Um Numero ${ts}`);
        // Blur do telefone → dispara criarLeadBase com endereco
        await page.click('#clienteNome');
        await page.waitForTimeout(3000);

        const saveLog = logs.find(l => l.includes('Lead base criado (novo):') || l.includes('Lead reutilizado (dedupe):'));
        const leadId = saveLog 
            ? (saveLog.includes('Lead base criado (novo):') 
                ? saveLog.split('Lead base criado (novo):')[1]?.trim() 
                : saveLog.split('Lead reutilizado (dedupe):')[1]?.trim())
            : null;
        console.log('leadId criado/reutilizado:', leadId);
        console.log('logs relevantes:', logs.filter(l => l.includes('[LEAD')));

        if (!leadId) {
            await page.close();
            return { ok: false, motivo: 'leadId não encontrado nos logs', logs };
        }

        await page.waitForTimeout(1500);
        const doc = await lerDocFirestore(leadId);
        console.log('Documento Firestore:', JSON.stringify(doc, null, 2));

        const ok = doc?.endereco && doc.endereco.includes(`${ts}`);
        console.log(ok ? '✅ PASSOU — endereco salvo na criação' : '❌ FALHOU — endereco ausente');

        await page.close();
        return { ok, leadId, endereco_no_doc: doc?.endereco || 'AUSENTE' };
    });

    // ─── TESTE 2: Endereço em branco no blur → sem endereco no doc inicial ─
    await runTest('Cenário 2: Endereço vazio no blur (comportamento original)', async () => {
        const page = await browser.newPage();
        const logs = [];
        page.on('console', m => logs.push(m.text()));
        await page.goto(BASE_URL, { waitUntil: 'networkidle' });

        const ts = Date.now();
        await page.fill('#clienteNome', `Bruno Cenario Dois`);
        await page.fill('#clienteTelefone', '21988887772');
        // Endereço VAZIO — não preenche
        await page.click('#clienteNome');
        await page.waitForTimeout(3000);

        const saveLog = logs.find(l => l.includes('Lead base criado (novo):') || l.includes('Lead reutilizado (dedupe):'));
        const leadId = saveLog 
            ? (saveLog.includes('Lead base criado (novo):') 
                ? saveLog.split('Lead base criado (novo):')[1]?.trim() 
                : saveLog.split('Lead reutilizado (dedupe):')[1]?.trim())
            : null;
        console.log('leadId criado/reutilizado:', leadId);

        if (!leadId) {
            await page.close();
            return { ok: false, motivo: 'leadId não encontrado nos logs', logs };
        }

        await page.waitForTimeout(1500);
        const doc = await lerDocFirestore(leadId);
        console.log('Documento Firestore:', JSON.stringify(doc, null, 2));

        // Deve NÃO ter endereco no doc inicial
        const ok = !doc?.endereco;
        console.log(ok ? '✅ PASSOU — sem endereco (correto para campo vazio)' : '❌ FALHOU — endereco presente quando não deveria');

        await page.close();
        return { ok, leadId, endereco_no_doc: doc?.endereco || 'AUSENTE (correto)' };
    });

    // ─── TESTE 3: Abandono após blur (com endereço preenchido) ─────────────
    await runTest('Cenário 3: Abandono sem simular — endereço deve estar no lead', async () => {
        const page = await browser.newPage();
        const logs = [];
        page.on('console', m => logs.push(m.text()));
        await page.goto(BASE_URL, { waitUntil: 'networkidle' });

        const ts = Date.now();
        await page.fill('#clienteNome', `Carlos Cenario Tres`);
        await page.fill('#clienteTelefone', '21988887773');
        await page.fill('#endereco', `Rua Abandono Numero ${ts}`);
        // Blur sem simular
        await page.click('#clienteNome');
        await page.waitForTimeout(3000);
        // Fecha sem clicar em Simular

        const saveLog = logs.find(l => l.includes('Lead base criado (novo):') || l.includes('Lead reutilizado (dedupe):'));
        const leadId = saveLog 
            ? (saveLog.includes('Lead base criado (novo):') 
                ? saveLog.split('Lead base criado (novo):')[1]?.trim() 
                : saveLog.split('Lead reutilizado (dedupe):')[1]?.trim())
            : null;
        console.log('leadId criado/reutilizado:', leadId);

        if (!leadId) {
            await page.close();
            return { ok: false, motivo: 'leadId não encontrado nos logs', logs };
        }

        await page.waitForTimeout(1500);
        const doc = await lerDocFirestore(leadId);
        console.log('Documento Firestore:', JSON.stringify(doc, null, 2));

        const ok = doc?.endereco && doc.endereco.includes(`${ts}`);
        console.log(ok ? '✅ PASSOU — endereco salvo mesmo sem simulação' : '❌ FALHOU — endereco perdido no abandono');

        await page.close();
        return { ok, leadId, endereco_no_doc: doc?.endereco || 'AUSENTE' };
    });

    await browser.close();

    console.log('\n' + '='.repeat(60));
    console.log('RESUMO FINAL');
    console.log('='.repeat(60));
    let allPassed = true;
    for (const r of results) {
        const status = r.ok ? '✅ PASSOU' : '❌ FALHOU';
        console.log(`${status} | ${r.label}`);
        if (r.leadId) console.log(`         leadId=${r.leadId} | endereco="${r.endereco_no_doc}"`);
        if (!r.ok) allPassed = false;
    }

    console.log('\n' + (allPassed ? '✅ TODOS OS TESTES PASSARAM' : '❌ ALGUM TESTE FALHOU'));
    process.exit(allPassed ? 0 : 1);
})();

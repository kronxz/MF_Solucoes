const https = require('https');

const url = 'https://firestore.googleapis.com/v1/projects/mf-solucoes-dev/databases/(default)/documents/leads?pageSize=100';

https.get(url, res => {
  let body = '';
  res.on('data', chunk => body += chunk);
  res.on('end', () => {
    try {
      const parsed = JSON.parse(body);
      const docs = parsed.documents || [];
      console.log(`Encontrados ${docs.length} leads no Firestore.`);
      const julios = docs.filter(d => {
        const fields = d.fields || {};
        const nome = fields.nome?.stringValue || '';
        return nome.toLowerCase().includes('julio');
      });
      console.log('Resultados para Julio:');
      julios.forEach(d => {
        const fields = d.fields || {};
        const out = {};
        for (const [k, v] of Object.entries(fields)) {
          out[k] = v.stringValue ?? v.integerValue ?? v.doubleValue ?? v.booleanValue ?? v.timestampValue ?? '(tipo complexo)';
        }
        const docId = d.name.split('/').pop();
        console.log(`\nID: ${docId}`);
        console.log(JSON.stringify(out, null, 2));
      });
    } catch (e) {
      console.error('Falha ao processar resposta:', e);
    }
  });
}).on('error', err => {
  console.error('ERROR:', err.message);
});

const https = require('https');

const url = `https://firestore.googleapis.com/v1/projects/mf-solucoes-dev/databases/(default)/documents/leads?pageSize=1000`;

https.get(url, res => {
  let body = '';
  res.on('data', chunk => body += chunk);
  res.on('end', () => {
    try {
      const parsed = JSON.parse(body);
      if (parsed.error) {
        console.error('API Error:', parsed.error);
        return;
      }
      const documents = parsed.documents || [];
      console.log(`Total documents fetched: ${documents.length}`);
      
      const counts = {};
      const matchingLeads = [];
      
      documents.forEach(doc => {
        const fields = doc.fields || {};
        const status = fields.status && fields.status.stringValue ? fields.status.stringValue : 'undefined';
        counts[status] = (counts[status] || 0) + 1;
        
        if (status.toLowerCase() === 'negociação' || status.toLowerCase() === 'negociacao') {
          const nome = fields.nome && fields.nome.stringValue ? fields.nome.stringValue : 'Sem Nome';
          matchingLeads.push({ id: doc.name.split('/').pop(), nome, status });
        }
      });
      
      console.log('\nStatus counts in Firestore:');
      console.log(JSON.stringify(counts, null, 2));
      
      console.log(`\nLeads to be migrated (Negociação): ${matchingLeads.length}`);
      matchingLeads.forEach(l => {
        console.log(`- ID: ${l.id}, Nome: ${l.nome}, Status Atual: ${l.status}`);
      });
    } catch (e) {
      console.error('Parse Error:', e);
      console.log(body);
    }
  });
}).on('error', err => {
  console.error('Fetch Error:', err);
});

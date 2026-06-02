const https = require('https');
const fs = require('fs');

const docId = 'NCGvLEgaKfbOtJrebRpH';
const url = `https://firestore.googleapis.com/v1/projects/mf-solucoes-dev/databases/(default)/documents/leads/${docId}`;

https.get(url, res => {
  let body = '';
  res.on('data', chunk => body += chunk);
  res.on('end', () => {
    try {
      const parsed = JSON.parse(body);
      fs.writeFileSync('scratch/doc_dump.json', JSON.stringify(parsed, null, 2));
      console.log('SUCCESS');
    } catch (e) {
      fs.writeFileSync('scratch/doc_dump.json', body);
      console.log('PARSE_ERROR');
    }
  });
}).on('error', err => {
  fs.writeFileSync('scratch/doc_dump.json', err.message);
  console.log('FETCH_ERROR');
});

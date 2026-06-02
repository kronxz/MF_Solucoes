const https = require('https');

const docId = 'NCGvLEgaKfbOtJrebRpH';
const url = `https://firestore.googleapis.com/v1/projects/mf-solucoes-dev/databases/(default)/documents/leads/${docId}`;

https.get(url, res => {
  let body = '';
  res.on('data', chunk => body += chunk);
  res.on('end', () => {
    console.log(`STATUS: ${res.statusCode}`);
    try {
      const parsed = JSON.parse(body);
      console.log('RAW FIRESTORE DOCUMENT:', JSON.stringify(parsed, null, 2));
    } catch (e) {
      console.log('BODY:', body);
    }
  });
}).on('error', err => {
  console.error('ERROR:', err.message);
});

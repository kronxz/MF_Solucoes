/**
 * firebase-config.js — MF Control Center
 * Conecta ao mesmo projeto PROD mf-solucoes-crm.
 * NÃO cria banco novo. NÃO toca em crm-dev.
 */

import { initializeApp, getApps, getApp }
  from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js';
import { getAuth }
  from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';
import { getFirestore }
  from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';

// PROD — mf-solucoes-crm (mesmo do CRM Web V1.2)
const firebaseConfig = {
  apiKey:            'AIzaSyD8OBOl1hUfsrWWT0-L19uuI-F273IvBgU',
  authDomain:        'mf-solucoes-crm.firebaseapp.com',
  projectId:         'mf-solucoes-crm',
  storageBucket:     'mf-solucoes-crm.firebasestorage.app',
  messagingSenderId: '492242482187',
  appId:             '1:492242482187:web:34c99a57f3b99c2260030e',
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db   = getFirestore(app);
export { app };

/**
 * app.js — MF Control Center
 * Gerencia auth state, roteamento entre páginas e inicialização de módulos.
 */

import { auth }
  from './firebase-config.js';
import { onAuthStateChanged, signOut }
  from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';

import { loginInit }     from './pages/login.js';
import { dashboardInit } from './pages/dashboard.js';
import { backupInit }    from './pages/backup.js';

// ─── Estado Global ─────────────────────────────────────────────────────────────
window._mfUser   = null;
window._mfPage   = null;

// ─── Router ────────────────────────────────────────────────────────────────────
function showPage(pageId) {
  document.querySelectorAll('.page').forEach(p => {
    p.style.display = p.id === 'page-' + pageId ? 'block' : 'none';
  });
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.page === pageId);
  });
  window._mfPage = pageId;

  if (pageId === 'dashboard') dashboardInit();
  if (pageId === 'backup')    backupInit();
}

// ─── Auth State ────────────────────────────────────────────────────────────────
onAuthStateChanged(auth, (user) => {
  window._mfUser = user;

  if (user) {
    // Autenticado: mostra app
    document.getElementById('screen-login').style.display = 'none';
    document.getElementById('screen-app').style.display   = 'flex';
    document.getElementById('user-email-display').textContent = user.email;
    showPage('dashboard');
    console.log('[MFControl] Sessão ativa:', user.email);
  } else {
    // Não autenticado: mostra login
    document.getElementById('screen-login').style.display = 'flex';
    document.getElementById('screen-app').style.display   = 'none';
    loginInit();
    console.log('[MFControl] Aguardando login');
  }
});

// ─── Navegação Sidebar ─────────────────────────────────────────────────────────
document.querySelectorAll('.nav-btn').forEach(btn => {
  btn.addEventListener('click', () => showPage(btn.dataset.page));
});

// ─── Logout ────────────────────────────────────────────────────────────────────
document.getElementById('btn-logout').addEventListener('click', async () => {
  await signOut(auth);
});

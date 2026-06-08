/**
 * app.js — MF Control Center
 * Gerencia auth state, roteamento entre páginas e inicialização de módulos.
 */

import { auth }
  from './firebase-config.js';
import { onAuthStateChanged, signOut }
  from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';

import { loginInit }      from './pages/login.js';
import { dashboardInit }  from './pages/dashboard.js';
import { backupInit }     from './pages/backup.js';
import { recoveryInit }   from './pages/recovery.js';
import { gitInit }        from './pages/git.js';
import { crmInit }        from './pages/crm.js';
import { propostasInit }  from './pages/propostas.js';
import { updatesInit }    from './pages/updates.js';

// ─── Estado Global ─────────────────────────────────────────────────────────────
window._mfUser   = null;
window._mfPage   = null;

// ─── Router ────────────────────────────────────────────────────────────────────
export function showPage(pageId) {
  document.querySelectorAll('.page').forEach(p => {
    p.style.display = p.id === 'page-' + pageId ? '' : 'none';
  });
  document.querySelectorAll('.nav-btn').forEach(btn => {
    // Match active state — para CRM, verifica data-page
    const btnPage = btn.dataset.page;
    btn.classList.toggle('active', btnPage === pageId);
  });
  window._mfPage = pageId;

  // Inicializadores de módulo
  if (pageId === 'mfcc-dashboard') dashboardInit();
  if (pageId === 'backup')         backupInit();
  if (pageId === 'recovery')       recoveryInit();
  if (pageId === 'git')            gitInit();
  if (pageId === 'updates')        updatesInit();
}

// ─── Auth State ────────────────────────────────────────────────────────────────
onAuthStateChanged(auth, (user) => {
  window._mfUser = user;

  if (user) {
    document.getElementById('screen-login').style.display = 'none';
    document.getElementById('screen-app').style.display   = 'flex';
    document.getElementById('user-email-display').textContent = user.email;
    showPage('crm');                // Abre direto no CRM ao fazer login
    // Marca somente o botão Dashboard CRM como ativo
    document.querySelectorAll('.crm-nav-btn').forEach(b =>
      b.classList.toggle('active', b.dataset.crm === 'dashboard')
    );
    crmInit('dashboard');           // Seção inicial: Dashboard CRM
    console.log('[MFControl] Sessão ativa:', user.email);
  } else {
    document.getElementById('screen-login').style.display = 'flex';
    document.getElementById('screen-app').style.display   = 'none';
    loginInit();
    console.log('[MFControl] Aguardando login');
  }
});

// ─── Navegação Sidebar — botões padrão ────────────────────────────────────────
document.querySelectorAll('.nav-btn:not(.crm-nav-btn)').forEach(btn => {
  btn.addEventListener('click', () => {
    const page = btn.dataset.page;
    if (page === 'propostas') {
      propostasInit();
      showPage('propostas');
    } else {
      showPage(page);
    }
  });
});

// ─── Navegação Sidebar — botões CRM ──────────────────────────────────────────
document.querySelectorAll('.crm-nav-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const section = btn.dataset.crm;
    showPage('crm');   // showPage primeiro (mostra a página e limpa ativos)
    // Corrige: marcar somente a seção clicada como ativa
    document.querySelectorAll('.crm-nav-btn').forEach(b =>
      b.classList.toggle('active', b.dataset.crm === section)
    );
    crmInit(section);
  });
});

// ─── Logout ────────────────────────────────────────────────────────────────────
document.getElementById('btn-logout').addEventListener('click', async () => {
  await signOut(auth);
});

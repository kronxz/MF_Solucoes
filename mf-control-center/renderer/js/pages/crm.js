/**
 * crm.js — MF Control Center
 * CRM Operacional embutido via webview.
 * Carrega https://mf-solucoes-crm.web.app e navega pelas seções.
 * NÃO altera crm-dev/. NÃO duplica código do CRM.
 */

const CRM_URL = 'https://mf-solucoes-crm.web.app';

// Mapeamento seção → seletor do botão no CRM DOM
const SECAO_BTN = {
  dashboard:   null,              // página inicial — sem clique, já está no estado default
  leads:       '#btn-leads',
  visitas:     '#btn-visitas',
  instalacoes: '#btn-instalacoes',
  tecnico:     '#btn-tecnico',
  financeiro:  '#btn-financeiro',
  notificacoes:'#btn-notificacoes',
  estatisticas:'#btn-stats',      // CRM usa #btn-stats (não #btn-estatisticas)
  analytics:   '#btn-analytics',
  qr:          '#btn-qrcodes',    // CRM usa #btn-qrcodes (não #btn-qr)
};

const SECAO_LABEL = {
  dashboard:    '📊 CRM — Dashboard',
  leads:        '👥 CRM — Leads',
  visitas:      '📍 CRM — Visitas',
  instalacoes:  '⚡ CRM — Instalações',
  tecnico:      '🔧 CRM — Área Técnica',
  financeiro:   '💰 CRM — Financeiro',
  notificacoes: '🔔 CRM — Notificações',
  estatisticas: '📈 CRM — Estatísticas',
  analytics:    '📉 CRM — Analytics',
  qr:           '📱 CRM — QR Codes',
};

// ── Estado ────────────────────────────────────────────────────────────────────
let _webview       = null;
let _ready         = false;
let _pendingSection = null;

// ── Inicialização (chamada no primeiro acesso e a cada clique de nav) ─────────
export function crmInit(section) {
  if (!_webview) _setupWebview();

  _updateLabel(section);
  _navigate(section);
}

// ── Setup do webview (executado apenas uma vez) ───────────────────────────────
function _setupWebview() {
  _webview = document.getElementById('crm-webview');
  if (!_webview) return;

  // Toolbar actions
  const reload   = document.getElementById('crm-reload');
  const devtools = document.getElementById('crm-devtools');
  const external = document.getElementById('crm-external');

  if (reload)   reload.addEventListener('click',   () => _webview.reload());
  if (devtools) devtools.addEventListener('click',  () => _webview.openDevTools());
  if (external) external.addEventListener('click',  () => {
    window.MFControl?.openExternal(CRM_URL);
  });

  // Eventos do webview
  _webview.addEventListener('dom-ready', () => {
    _ready = true;
    if (_pendingSection) {
      _navigate(_pendingSection);
      _pendingSection = null;
    }
    console.log('[CRM] webview pronto');
  });

  _webview.addEventListener('did-start-loading', () => {
    const lbl = document.getElementById('crm-section-label');
    if (lbl) lbl.textContent = '⟳ CRM — Carregando...';
  });

  _webview.addEventListener('did-stop-loading', () => {
    // Restaura label após carregamento
    const lbl = document.getElementById('crm-section-label');
    if (lbl) lbl.textContent = SECAO_LABEL[_currentSection] || '⚡ CRM';
  });

  _webview.addEventListener('did-fail-load', (_e) => {
    console.warn('[CRM] falha ao carregar webview — verificar conexão');
  });
}

let _currentSection = 'dashboard';

// ── Navega para uma seção no CRM ──────────────────────────────────────────────
function _navigate(section) {
  _currentSection = section;

  if (!_webview) return;

  // Se ainda não carregou, guarda para depois do dom-ready
  if (!_ready) {
    _pendingSection = section;
    return;
  }

  const seletor = SECAO_BTN[section];

  if (section === 'dashboard') {
    // Dashboard: navega para a URL raiz (sem hash)
    const currentSrc = _webview.getURL ? _webview.getURL() : '';
    if (!currentSrc.startsWith(CRM_URL)) {
      _webview.src = CRM_URL;
    } else {
      _webview.executeJavaScript(
        'window.scrollTo(0,0); ' +
        'const home = document.querySelector("[data-section=\'dashboard\'], #btn-dashboard, .btn-home"); ' +
        'if (home) home.click();'
      ).catch(() => {});
    }
    return;
  }

  if (seletor) {
    _webview.executeJavaScript(
      'const btn = document.querySelector("' + seletor + '"); ' +
      'if (btn) { btn.click(); } ' +
      'else { console.warn("[MFControl] botão CRM não encontrado: ' + seletor + '"); }'
    ).catch((err) => {
      console.warn('[CRM] executeJavaScript falhou:', err.message);
    });
  }
}

// ── Atualiza label da toolbar ─────────────────────────────────────────────────
function _updateLabel(section) {
  const lbl = document.getElementById('crm-section-label');
  if (lbl) lbl.textContent = SECAO_LABEL[section] || '⚡ CRM';
}

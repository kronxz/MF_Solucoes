/**
 * crm.js — MF Control Center
 * CRM Operacional embutido via webview.
 * Carrega https://mf-solucoes-crm.web.app e navega pelas seções.
 * NÃO altera crm-dev/. NÃO duplica código do CRM.
 *
 * FIX (CRM-SYNC): Corrige race condition onde dom-ready disparava antes
 * de _setupWebview() adicionar o listener, deixando _ready = false para sempre.
 * Solução: checar getURL() + retry de verificação após clique.
 */

const CRM_URL = 'https://mf-solucoes-crm.web.app';

// Mapeamento seção → seletor do botão no CRM DOM (verificado via CDP)
const SECAO_BTN = {
  dashboard:    null,               // página inicial — navega para URL raiz
  leads:        '#btn-leads',
  visitas:      '#btn-visitas',
  instalacoes:  '#btn-instalacoes',
  tecnico:      '#btn-tecnico',
  financeiro:   '#btn-financeiro',
  notificacoes: '#btn-notificacoes',
  estatisticas: '#btn-stats',       // CRM usa #btn-stats
  analytics:    '#btn-analytics',
  qr:           '#btn-qrcodes',
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
let _webview        = null;
let _ready          = false;
let _pendingSection = null;
let _currentSection = 'dashboard';
let _retryTimer     = null;   // timer de retry de navegação

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

  // ─── FIX PRINCIPAL ────────────────────────────────────────────────────────
  // Se o webview já carregou o CRM antes de _setupWebview() ser chamado
  // (cenário comum: usuário demora a logar, webview carrega em paralelo),
  // o dom-ready já disparou e _ready nunca seria true.
  // Solução: detectar estado carregado via getURL().
  const urlAtual = _webview.getURL?.();
  if (urlAtual && urlAtual.startsWith(CRM_URL)) {
    _ready = true;
    console.log('[CRM] webview já estava carregado — _ready = true imediato');
  }
  // ─────────────────────────────────────────────────────────────────────────

  // Toolbar actions
  const reload   = document.getElementById('crm-reload');
  const devtools = document.getElementById('crm-devtools');
  const external = document.getElementById('crm-external');

  if (reload)   reload.addEventListener('click',  () => _webview.reload());
  if (devtools) devtools.addEventListener('click', () => _webview.openDevTools());
  if (external) external.addEventListener('click', () => window.MFControl?.openExternal(CRM_URL));

  // ── Eventos do ciclo de vida do webview ─────────────────────────────────
  _webview.addEventListener('dom-ready', () => {
    _ready = true;
    console.log('[CRM] dom-ready — URL:', _webview.getURL?.());
    if (_pendingSection) {
      const sec = _pendingSection;
      _pendingSection = null;
      // Pequeno delay para o SPA do CRM registrar seus handlers internos
      setTimeout(() => _navigate(sec), 300);
    }
  });

  _webview.addEventListener('did-start-loading', () => {
    const lbl = document.getElementById('crm-section-label');
    if (lbl) lbl.textContent = '⟳ CRM — Carregando...';
    // NÃO resetamos _ready aqui: navegações SPA internas também disparam este evento.
    // O reset só ocorre em did-fail-load (falha real de carregamento).
  });

  _webview.addEventListener('did-stop-loading', () => {
    const lbl = document.getElementById('crm-section-label');
    if (lbl) lbl.textContent = SECAO_LABEL[_currentSection] || '⚡ CRM';
    // Garante que _ready seja true após qualquer carregamento bem-sucedido
    if (!_ready) {
      _ready = true;
      if (_pendingSection) {
        const sec = _pendingSection;
        _pendingSection = null;
        setTimeout(() => _navigate(sec), 300);
      }
    }
  });

  _webview.addEventListener('did-fail-load', () => {
    console.warn('[CRM] falha ao carregar webview — verificar conexão');
    _ready = false;  // Reset apenas em falha real
  });
}

// ── Navega para uma seção no CRM ──────────────────────────────────────────────
function _navigate(section) {
  _currentSection = section;

  if (!_webview) return;

  // ─── FIX SECUNDÁRIO ───────────────────────────────────────────────────────
  // Fallback: se _ready ainda não foi setado, verifica getURL() diretamente.
  // Cobre o caso de setupWebview() ter sido chamado durante carregamento parcial.
  if (!_ready) {
    const url = _webview.getURL?.();
    if (url && url.startsWith(CRM_URL)) {
      _ready = true;
      console.log('[CRM] _navigate: detectou webview carregado via getURL()');
    } else {
      _pendingSection = section;   // Guarda e aguarda dom-ready
      return;
    }
  }
  // ─────────────────────────────────────────────────────────────────────────

  // Cancela retry anterior se houver
  if (_retryTimer) { clearTimeout(_retryTimer); _retryTimer = null; }

  // Dashboard: navega para a URL raiz
  if (section === 'dashboard') {
    const current = _webview.getURL?.() || '';
    if (!current.startsWith(CRM_URL)) {
      _ready = false;
      _webview.src = CRM_URL;
    } else {
      _webview.executeJavaScript(
        'window.scrollTo(0,0);' +
        'const h=document.querySelector("[data-section=\'dashboard\'],#btn-dashboard,.btn-home");' +
        'if(h)h.click();'
      ).catch(() => {});
    }
    return;
  }

  const seletor = SECAO_BTN[section];
  if (!seletor) return;

  // ── Primeira tentativa: clique direto ─────────────────────────────────────
  _webview.executeJavaScript(
    `(function(){
      const btn = document.querySelector('${seletor}');
      if (!btn) return 'not-found';
      btn.click();
      return 'clicked';
    })()`
  ).then(result => {
    if (result === 'not-found') {
      console.warn('[CRM] botão não encontrado no DOM:', seletor);
      return;
    }
    console.log('[CRM] clique enviado para', seletor);

    // ── Retry de verificação: confirma que a seção ficou ativa ─────────────
    _retryTimer = setTimeout(() => {
      if (_currentSection !== section) return; // usuário já foi para outra seção
      _webview.executeJavaScript(
        `(function(){
          const btn = document.querySelector('${seletor}');
          if (!btn) return null;
          return btn.classList.contains('active');
        })()`
      ).then(isActive => {
        if (isActive === false) {
          // Seção não ativou — retry
          console.log('[CRM] retry nav →', seletor, '(seção não estava ativa)');
          _webview.executeJavaScript(
            `const b=document.querySelector('${seletor}');if(b)b.click();`
          ).catch(() => {});
        } else if (isActive === true) {
          console.log('[CRM] ✅ seção confirmada ativa:', section);
        }
      }).catch(() => {});
    }, 500);

  }).catch(err => {
    console.warn('[CRM] executeJavaScript falhou:', err.message);
  });
}

// ── Atualiza label da toolbar ─────────────────────────────────────────────────
function _updateLabel(section) {
  const lbl = document.getElementById('crm-section-label');
  if (lbl) lbl.textContent = SECAO_LABEL[section] || '⚡ CRM';
}

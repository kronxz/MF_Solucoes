/**
 * propostas.js — MF Control Center
 * Módulo de Propostas: reutiliza proposta.html do CRM local.
 * NÃO duplica motor de propostas. NÃO altera crm-dev/.
 */

let _webview   = null;
let _ready     = false;
let _crmPath   = null;
let _iniciado  = false;

export async function propostasInit() {
  if (_iniciado) return;
  _iniciado = true;

  // Resolve o caminho do crm-dev/ local via IPC
  const paths = await window.MFControl?.getPaths();
  if (paths?.crm) {
    _crmPath = paths.crm.replace(/\\/g, '/');
  }

  _setupWebview();
}

function _setupWebview() {
  _webview = document.getElementById('propostas-webview');
  if (!_webview) return;

  // Carrega proposta.html local
  const src = _crmPath
    ? 'file:///' + _crmPath + '/proposta.html'
    : 'https://mf-solucoes-crm.web.app/proposta.html';

  _webview.src = src;

  // Toolbar
  const btnNova     = document.getElementById('prop-nova');
  const btnReload   = document.getElementById('prop-reload');
  const btnExternal = document.getElementById('prop-external');

  if (btnNova) {
    btnNova.addEventListener('click', () => {
      if (!_ready) return;
      // Tenta criar nova proposta via DOM do webview
      _webview.executeJavaScript(
        'const btn = document.querySelector("#btn-nova-proposta, [data-action=nova-proposta], .btn-nova"); ' +
        'if (btn) btn.click(); else { console.warn("botão nova proposta não encontrado"); }'
      ).catch(() => {});
    });
  }

  if (btnReload) {
    btnReload.addEventListener('click', () => {
      _ready = false;
      _webview.reload();
    });
  }

  if (btnExternal) {
    btnExternal.addEventListener('click', () => {
      const url = _crmPath
        ? 'file:///' + _crmPath + '/proposta/proposal.html'
        : 'https://mf-solucoes-crm.web.app/proposta/proposal.html';
      window.MFControl?.openExternal(url);
    });
  }

  _webview.addEventListener('dom-ready', () => {
    _ready = true;
    console.log('[Propostas] webview pronto:', _webview.getURL?.());
  });

  _webview.addEventListener('did-fail-load', () => {
    // Fallback para URL web se arquivo local não existir
    if (_webview.src !== 'https://mf-solucoes-crm.web.app/proposta.html') {
      console.warn('[Propostas] local load failed, tentando URL web');
      _webview.src = 'https://mf-solucoes-crm.web.app/proposta.html';
    }
  });
}

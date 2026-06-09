/**
 * login.js — MF Control Center v2.0
 * Sistema híbrido: senha local (Firebase Auth) + reset via email
 *
 * Fluxo:
 *  - Usuário digita apenas a senha
 *  - Email está embutido (oculto) — marcos_felipe_eng@hotmail.com
 *  - "Esqueci minha senha" → Firebase envia link de reset pro email
 */

import { auth }
  from '../firebase-config.js';
import {
  signInWithEmailAndPassword,
  sendPasswordResetEmail
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';

// Email embutido — oculto do usuário final
const EMAIL_FIXO = 'marcos_felipe_eng@hotmail.com';

export function loginInit() {
  // ── Elementos do login ──────────────────────────────────────────
  const inputEmail   = document.getElementById('input-email');
  const inputSenha   = document.getElementById('input-senha');
  const btnLogin     = document.getElementById('btn-login');
  const btnText      = document.getElementById('btn-login-text');
  const spinner      = document.getElementById('btn-login-spinner');
  const errorDiv     = document.getElementById('login-error');

  // ── Elementos do reset ──────────────────────────────────────────
  const btnResetLink    = document.getElementById('btn-reset-senha');
  const painelReset     = document.getElementById('painel-reset');
  const btnEnviarReset  = document.getElementById('btn-enviar-reset');
  const btnCancelar     = document.getElementById('btn-cancelar-reset');
  const btnResetText    = document.getElementById('btn-reset-text');
  const resetSpinner    = document.getElementById('btn-reset-spinner');
  const resetSuccess    = document.getElementById('reset-success');
  const resetError      = document.getElementById('reset-error');

  if (!btnLogin) return;

  // Garante email fixo no campo hidden
  if (inputEmail) inputEmail.value = EMAIL_FIXO;

  // Foca senha ao abrir
  setTimeout(() => inputSenha?.focus(), 150);

  // Enter na senha dispara login
  inputSenha?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') btnLogin.click();
  });

  // ── Login ───────────────────────────────────────────────────────
  btnLogin.onclick = async () => {
    const senha = inputSenha.value;

    esconderErro();

    if (!senha) {
      mostrarErro('Digite sua senha.');
      return;
    }

    setLoadingLogin(true);

    try {
      await signInWithEmailAndPassword(auth, EMAIL_FIXO, senha);
      // onAuthStateChanged em app.js cuida do redirecionamento
    } catch (err) {
      console.error('[Login] Erro:', err.code, err.message);
      mostrarErro(traduzirErro(err.code));
      setLoadingLogin(false);
    }
  };

  // ── Abrir painel de reset ───────────────────────────────────────
  btnResetLink?.addEventListener('click', () => {
    painelReset.style.display  = 'block';
    btnResetLink.style.display = 'none';
    resetSuccess.style.display = 'none';
    resetError.style.display   = 'none';
  });

  // ── Cancelar reset ──────────────────────────────────────────────
  btnCancelar?.addEventListener('click', () => {
    painelReset.style.display  = 'none';
    btnResetLink.style.display = 'block';
    resetSuccess.style.display = 'none';
    resetError.style.display   = 'none';
  });

  // ── Enviar email de reset ───────────────────────────────────────
  btnEnviarReset?.addEventListener('click', async () => {
    resetSuccess.style.display = 'none';
    resetError.style.display   = 'none';
    setLoadingReset(true);

    try {
      await sendPasswordResetEmail(auth, EMAIL_FIXO);
      resetSuccess.style.display = 'block';
      btnEnviarReset.disabled    = true;
      console.log('[Login] Email de reset enviado para', EMAIL_FIXO);
    } catch (err) {
      console.error('[Login] Erro no reset:', err.code, err.message);
      resetError.textContent   = traduzirErroReset(err.code);
      resetError.style.display = 'block';
    } finally {
      setLoadingReset(false);
    }
  });

  // ── Helpers ─────────────────────────────────────────────────────
  function setLoadingLogin(loading) {
    btnLogin.disabled      = loading;
    btnText.style.display  = loading ? 'none'   : 'inline';
    spinner.style.display  = loading ? 'inline' : 'none';
  }

  function setLoadingReset(loading) {
    btnEnviarReset.disabled      = loading;
    btnResetText.style.display   = loading ? 'none'   : 'inline';
    resetSpinner.style.display   = loading ? 'inline' : 'none';
  }

  function mostrarErro(msg) {
    errorDiv.textContent   = msg;
    errorDiv.style.display = 'block';
  }

  function esconderErro() {
    errorDiv.style.display = 'none';
    errorDiv.textContent   = '';
  }

  function traduzirErro(code) {
    const map = {
      'auth/wrong-password':         '❌ Senha incorreta.',
      'auth/invalid-credential':     '❌ Senha incorreta.',
      'auth/too-many-requests':      '⚠️ Muitas tentativas. Tente em alguns minutos.',
      'auth/network-request-failed': '📡 Sem conexão. Verifique a internet.',
      'auth/user-disabled':          '🚫 Conta desativada.',
    };
    return map[code] || '❌ Erro ao autenticar (' + code + ')';
  }

  function traduzirErroReset(code) {
    const map = {
      'auth/network-request-failed': '📡 Sem conexão. Verifique a internet.',
      'auth/too-many-requests':      '⚠️ Muitas solicitações. Tente mais tarde.',
    };
    return map[code] || '❌ Não foi possível enviar o email (' + code + ')';
  }
}

/**
 * login.js — MF Control Center
 * Gerencia o formulário de login Firebase.
 */

import { auth }
  from '../firebase-config.js';
import { signInWithEmailAndPassword }
  from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';

export function loginInit() {
  const btnLogin  = document.getElementById('btn-login');
  const inputEmail = document.getElementById('input-email');
  const inputSenha = document.getElementById('input-senha');
  const errorDiv  = document.getElementById('login-error');
  const btnText   = document.getElementById('btn-login-text');
  const spinner   = document.getElementById('btn-login-spinner');

  if (!btnLogin) return;

  // Foca email ao abrir
  setTimeout(() => inputEmail?.focus(), 100);

  // Enter no campo senha dispara login
  inputSenha?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') btnLogin.click();
  });

  btnLogin.onclick = async () => {
    const email = inputEmail.value.trim();
    const senha = inputSenha.value;

    errorDiv.style.display = 'none';
    errorDiv.textContent   = '';

    if (!email || !senha) {
      showError('Preencha email e senha.');
      return;
    }

    setLoading(true);

    try {
      await signInWithEmailAndPassword(auth, email, senha);
      // onAuthStateChanged em app.js cuida do redirecionamento
    } catch (err) {
      console.error('[Login] Erro:', err.code, err.message);
      showError(traduzirErro(err.code));
      setLoading(false);
    }
  };

  function setLoading(loading) {
    btnLogin.disabled       = loading;
    btnText.style.display   = loading ? 'none'   : 'inline';
    spinner.style.display   = loading ? 'inline' : 'none';
  }

  function showError(msg) {
    errorDiv.textContent   = msg;
    errorDiv.style.display = 'block';
  }

  function traduzirErro(code) {
    const map = {
      'auth/invalid-email':          'Email inválido.',
      'auth/user-not-found':         'Usuário não encontrado.',
      'auth/wrong-password':         'Senha incorreta.',
      'auth/invalid-credential':     'Email ou senha incorretos.',
      'auth/too-many-requests':      'Muitas tentativas. Tente mais tarde.',
      'auth/network-request-failed': 'Sem conexão. Verifique a internet.',
    };
    return map[code] || 'Erro ao autenticar (' + code + ')';
  }
}

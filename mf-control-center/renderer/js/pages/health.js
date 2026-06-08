/**
 * health.js — MF Control Center
 * CC-7 / CC-8 Health Center V2 — 10 verificações funcionais reais.
 * Status: ✅ OK | ⚠️ AVISO | 🔴 CRÍTICO
 * Recomendações automáticas por falha.
 * Nenhum stub. Nenhum placeholder. Verificações ao vivo.
 */

import { auth } from '../firebase-config.js';
import { db }   from '../firebase-config.js';
import {
  collection, getCountFromServer,
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';

// URLs do ecossistema MF Soluções
const CRM_URL     = 'https://mf-solucoes-crm.web.app';
const LANDING_URL = 'https://kronxz.github.io/mf-solucoes-eletricas';

let _iniciado = false;

export function healthInit() {
  if (_iniciado) {
    // Ao navegar de volta, reexecuta os checks
    _runChecks();
    return;
  }
  _iniciado = true;
  _build();
}

// ── Build da UI ───────────────────────────────────────────────────────────────
function _build() {
  const container = document.getElementById('page-health');
  if (!container) return;
  container.innerHTML = '';

  // Header
  const hdr = document.createElement('div');
  hdr.className = 'dash-header';
  hdr.innerHTML = `
    <div>
      <h2>❤️ Health Center</h2>
      <p class="dash-sub">10 verificações funcionais ao vivo · CC-8 V2</p>
    </div>
    <div style="display:flex;gap:8px;align-items:center;">
      <span id="hc-summary" style="font-size:12px;color:#94a3b8;">⟳ Verificando...</span>
      <button class="btn-backup" id="hc-btn-refresh" style="font-size:11px;padding:4px 10px;">🔄 Re-verificar</button>
    </div>
  `;
  container.appendChild(hdr);

  // Painel de recomendações (aparece só se houver críticos/avisos)
  const recBox = document.createElement('div');
  recBox.id = 'hc-recommendations';
  recBox.style.cssText = 'display:none;margin:10px 0;background:#1a0a0a;border:1px solid #7f1d1d;border-radius:6px;padding:10px 14px;';
  container.appendChild(recBox);

  // Grid de checks
  const grid = document.createElement('div');
  grid.id = 'hc-grid';
  grid.style.cssText = 'display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:10px;margin-top:12px;';
  container.appendChild(grid);

  document.getElementById('hc-btn-refresh')?.addEventListener('click', _runChecks);

  _runChecks();
}

// ── Definição dos 10 checks ───────────────────────────────────────────────────
// status: 'ok' | 'warn' | 'critico'
// rec: recomendação automática (aparece no painel superior quando status != ok)
const CHECKS = [
  {
    id: 'firebase-auth',
    icon: '🔐',
    title: 'Firebase Auth',
    desc: 'Sessão ativa e token válido',
    run: async () => {
      const user = auth.currentUser;
      if (!user) return {
        status: 'critico',
        detail: 'Nenhum usuário autenticado',
        rec: 'Firebase Auth falhou → faça login novamente ou verifique conexão com internet.',
      };
      try {
        const token = await user.getIdToken(true);
        if (!token) return {
          status: 'critico',
          detail: 'Token inválido ou expirado',
          rec: 'Token Firebase expirado → saia e entre novamente na conta.',
        };
        return { status: 'ok', detail: `Autenticado: ${user.email}` };
      } catch (e) {
        return {
          status: 'warn',
          detail: 'Token refresh falhou: ' + e.message.slice(0, 60),
          rec: 'Renovação de token falhou → verifique conexão e tente recarregar.',
        };
      }
    },
  },
  {
    id: 'firestore',
    icon: '🔥',
    title: 'Firestore',
    desc: 'Leitura da coleção lp_leads',
    run: async () => {
      try {
        const snap = await getCountFromServer(collection(db, 'lp_leads'));
        const n = snap.data().count;
        return { status: 'ok', detail: `lp_leads: ${n} documento${n !== 1 ? 's' : ''}` };
      } catch (e) {
        return {
          status: 'critico',
          detail: 'Firestore inacessível: ' + e.message.slice(0, 55),
          rec: 'Firestore indisponível → verifique regras de segurança e conexão com internet.',
        };
      }
    },
  },
  {
    id: 'crm-online',
    icon: '🌐',
    title: 'CRM Online',
    desc: 'Firebase Hosting acessível',
    run: async () => {
      try {
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), 6000);
        const res = await fetch(CRM_URL, { method: 'HEAD', signal: ctrl.signal });
        clearTimeout(timer);
        if (res.ok || res.status === 301 || res.status === 302 || res.status === 200) {
          return { status: 'ok', detail: `HTTP ${res.status} — ${CRM_URL.slice(8, 40)}` };
        }
        return {
          status: 'warn',
          detail: `HTTP ${res.status} inesperado`,
          rec: `CRM retornou HTTP ${res.status} → verifique deploy no Firebase Hosting.`,
        };
      } catch (e) {
        if (e.name === 'AbortError') return {
          status: 'critico',
          detail: 'Timeout (6s) — CRM sem resposta',
          rec: 'CRM offline (timeout) → verifique internet ou status do Firebase Hosting.',
        };
        return {
          status: 'critico',
          detail: e.message.slice(0, 70),
          rec: 'CRM inacessível → verifique internet e status do Firebase.',
        };
      }
    },
  },
  {
    id: 'crm-webview',
    icon: '🖥️',
    title: 'CRM Webview',
    desc: 'Webview carregado e responsivo',
    run: async () => {
      const wv = document.getElementById('crm-webview');
      if (!wv) return {
        status: 'critico',
        detail: 'Elemento crm-webview não encontrado no DOM',
        rec: 'Webview CRM ausente → reinicie o aplicativo.',
      };
      const url = wv.getURL?.() || '';
      if (!url.startsWith(CRM_URL)) {
        return {
          status: 'warn',
          detail: 'Webview não carregado — acesse CRM primeiro',
          rec: 'Clique em "Dashboard" no menu para carregar o CRM.',
        };
      }
      try {
        const title = await wv.executeJavaScript('document.title');
        return { status: 'ok', detail: `Carregado · "${(title || '').slice(0, 40)}"` };
      } catch {
        return { status: 'warn', detail: 'Carregado mas executeJavaScript restrito' };
      }
    },
  },
  {
    id: 'landing-page',
    icon: '🌱',
    title: 'Landing Page',
    desc: 'GitHub Pages acessível',
    run: async () => {
      try {
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), 8000);
        const res = await fetch(LANDING_URL, { method: 'HEAD', signal: ctrl.signal });
        clearTimeout(timer);
        if (res.ok || res.status === 200) {
          return { status: 'ok', detail: `HTTP ${res.status} · GitHub Pages ativo` };
        }
        return {
          status: 'warn',
          detail: `HTTP ${res.status} · verificar GitHub Pages`,
          rec: `GitHub Pages retornou ${res.status} → verifique configuração em github.com/kronxz/mf-solucoes-eletricas.`,
        };
      } catch (e) {
        if (e.name === 'AbortError') return {
          status: 'critico',
          detail: 'Timeout (8s) — Landing Page sem resposta',
          rec: 'Landing Page offline → verifique GitHub Pages em github.com/kronxz/mf-solucoes-eletricas/settings.',
        };
        return {
          status: 'warn',
          detail: e.message.slice(0, 70),
          rec: 'Landing Page inacessível → verifique conexão ou status do GitHub.',
        };
      }
    },
  },
  {
    id: 'backup-center',
    icon: '💾',
    title: 'Backup Center',
    desc: 'Backups locais disponíveis',
    run: async () => {
      try {
        const list = await window.MFControl?.listBackups?.();
        if (!list) return {
          status: 'warn',
          detail: 'IPC listBackups não disponível',
          rec: 'Backup Center IPC não registrado → reinicie o MF Control Center.',
        };
        if (list.error) return {
          status: 'critico',
          detail: list.error.slice(0, 60),
          rec: 'Erro na pasta de backups → verifique permissões do diretório.',
        };
        const count = Array.isArray(list) ? list.length : 0;
        if (count === 0) return {
          status: 'warn',
          detail: 'Nenhum backup encontrado na pasta local',
          rec: 'Sem backups locais → acesse Backup Center e execute um backup completo.',
        };
        const recent = list[list.length - 1];
        const name = typeof recent === 'string' ? recent.split(/[\\/]/).pop() : JSON.stringify(recent).slice(0, 40);
        return { status: 'ok', detail: `${count} backup${count !== 1 ? 's' : ''} · Recente: ${name.slice(0, 45)}` };
      } catch (e) {
        return {
          status: 'warn',
          detail: e.message.slice(0, 70),
          rec: 'Erro ao acessar backups → reinicie o aplicativo.',
        };
      }
    },
  },
  {
    id: 'recovery-center',
    icon: '🔄',
    title: 'Recovery Center',
    desc: 'IPC recovery:health respondendo',
    run: async () => {
      try {
        const result = await window.MFControl?.recovery?.health?.();
        if (!result) return {
          status: 'warn',
          detail: 'IPC não registrado',
          rec: 'Recovery Center IPC inativo → reinicie o MF Control Center para ativar.',
        };
        if (result.error) return {
          status: 'warn',
          detail: result.error.slice(0, 60),
          rec: 'Recovery Center com erro → verifique integridade do sistema.',
        };
        const locked = result.locked ?? result.RECOVERY_LOCKED ?? true;
        return {
          status: 'ok',
          detail: `Handlers OK · Restore: ${locked ? '🔒 LOCKED' : '🔓 DESBLOQUEADO'}`,
        };
      } catch (e) {
        const msg = e.message || String(e);
        if (msg.includes('No handler') || msg.includes('not registered')) {
          return {
            status: 'warn',
            detail: 'IPC não registrado — reiniciar Electron para ativar',
            rec: 'Recovery IPC inativo → reinicie o MF Control Center.',
          };
        }
        return {
          status: 'warn',
          detail: msg.slice(0, 70),
          rec: 'Erro no Recovery Center → reinicie o aplicativo.',
        };
      }
    },
  },
  {
    id: 'git-recovery',
    icon: '🌿',
    title: 'Git Recovery',
    desc: 'Repositório git e IPC acessíveis',
    run: async () => {
      try {
        const result = await window.MFControl?.git?.statusFull?.();
        if (!result) return {
          status: 'warn',
          detail: 'IPC não registrado',
          rec: 'Git Recovery IPC inativo → reinicie o MF Control Center para ativar.',
        };
        if (result.error) return {
          status: 'warn',
          detail: result.error.slice(0, 60),
          rec: 'Erro no repositório Git → verifique se o projeto está num repositório git válido.',
        };
        const clean = (result.stdout || result.output || '').includes('nothing to commit');
        const branch = (result.stdout || result.output || '').match(/On branch (\S+)/)?.[1] || '?';
        return {
          status: 'ok',
          detail: `Branch: ${branch} · ${clean ? 'Working tree clean' : 'Mudanças pendentes'}`,
        };
      } catch (e) {
        const msg = e.message || String(e);
        if (msg.includes('No handler') || msg.includes('not registered')) {
          return {
            status: 'warn',
            detail: 'IPC não registrado — reiniciar Electron para ativar',
            rec: 'Git IPC inativo → reinicie o MF Control Center.',
          };
        }
        return {
          status: 'warn',
          detail: msg.slice(0, 70),
          rec: 'Erro no Git Recovery → reinicie o aplicativo.',
        };
      }
    },
  },
  {
    id: 'propostas',
    icon: '📄',
    title: 'Propostas',
    desc: 'Módulo de propostas no DOM',
    run: async () => {
      // Verifica existência dos elementos DOM sem depender do webview inicializado
      const wv    = document.getElementById('propostas-webview');
      const page  = document.getElementById('page-propostas');
      const btnNova = document.getElementById('prop-nova');

      if (!page) return { status: 'error', detail: 'page-propostas não encontrado no DOM' };
      if (!wv)   return { status: 'error', detail: 'propostas-webview não encontrado no DOM' };

      // Tenta ler URL se o webview já foi inicializado
      let urlInfo = 'webview presente (não inicializado ainda)';
      try {
        const url = wv.getURL?.() || '';
        if (url) urlInfo = 'Carregado · ' + url.slice(0, 50);
      } catch {
        // webview ainda não attached ao DOM = ainda não inicializado
      }

      const extras = [];
      if (btnNova)           extras.push('btn "+ Nova" presente');
      if (page.style.display !== 'none' || !page.style.display) extras.push('page visível');

      return {
        status: 'ok',
        detail: urlInfo + (extras.length ? ' · ' + extras.join(' · ') : ''),
      };
    },
  },
  {
    id: 'offline-integridade',
    icon: '📴',
    title: 'Integridade Offline',
    desc: 'Backup local e dados offline prontos',
    run: async () => {
      const checks = [];
      // Check 1: backup list count
      try {
        const list = await window.MFControl?.listBackups?.();
        if (Array.isArray(list) && list.length > 0) {
          checks.push(`${list.length} backup${list.length !== 1 ? 's' : ''} local`);
        } else {
          checks.push('⚠️ Sem backups locais');
        }
      } catch {
        checks.push('IPC indisponível');
      }
      // Check 2: localStorage offline cache
      try {
        const offlineKeys = Object.keys(localStorage).filter(k => k.includes('offline') || k.includes('mf_'));
        if (offlineKeys.length > 0) {
          checks.push(`localStorage: ${offlineKeys.length} chave${offlineKeys.length !== 1 ? 's' : ''} offline`);
        } else {
          checks.push('localStorage: sem cache offline');
        }
      } catch {
        checks.push('localStorage inacessível');
      }
      // Check 3: Firebase offline persistence (IndexedDB presence)
      try {
        const dbs = await indexedDB.databases?.();
        const firestore = dbs?.filter(d => d.name?.includes('firestore') || d.name?.includes('firebase'));
        if (firestore?.length > 0) {
          checks.push(`IndexedDB Firestore: ${firestore.length} banco${firestore.length !== 1 ? 's' : ''}`);
        }
      } catch {
        // indexedDB.databases() may not be available everywhere
      }

      const hasWarn = checks.some(c => c.includes('⚠️') || c.includes('indisponível'));
      return {
        status: hasWarn ? 'warn' : 'ok',
        detail: checks.join(' · '),
        rec: hasWarn ? 'Execute um backup completo no Backup Center e ative offline persistence.' : undefined,
      };
    },
  },
];

// ── Executa todos os checks ───────────────────────────────────────────────────
async function _runChecks() {
  const grid = document.getElementById('hc-grid');
  if (!grid) return;

  const summary = document.getElementById('hc-summary');
  const recBox  = document.getElementById('hc-recommendations');
  if (summary) summary.textContent = '⟳ Verificando...';
  if (recBox)  recBox.style.display = 'none';

  // Renderiza cards em estado "verificando"
  // Nota: c.icon, c.title, c.desc, c.id são constantes hardcoded em CHECKS (não input externo).
  // _esc() aplicado por padronização com outros módulos.
  grid.innerHTML = CHECKS.map(c => `
    <div class="dash-card hc-card" id="hc-${_esc(c.id)}" style="margin:0;border-left:3px solid #1e3a5f;transition:border-color 0.3s;">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">
        <span style="font-size:20px;">${_esc(c.icon)}</span>
        <div>
          <div style="color:#e2e8f0;font-weight:600;font-size:13px;">${_esc(c.title)}</div>
          <div style="color:#475569;font-size:11px;">${_esc(c.desc)}</div>
        </div>
        <div style="margin-left:auto;">
          <span id="hc-status-${_esc(c.id)}" style="font-size:18px;">⟳</span>
        </div>
      </div>
      <div id="hc-detail-${_esc(c.id)}" style="font-size:11px;color:#94a3b8;min-height:16px;">Verificando...</div>
    </div>
  `).join('');

  // Executa checks em paralelo, atualiza UI conforme chegam
  const recs = [];
  const statusList = await Promise.all(
    CHECKS.map(async c => {
      try {
        const r = await c.run();
        _updateCard(c.id, r.status, r.detail);
        if (r.rec && r.status !== 'ok') recs.push({ status: r.status, text: r.rec, title: c.title });
        return r.status;
      } catch (e) {
        _updateCard(c.id, 'critico', 'Exceção: ' + e.message.slice(0, 60));
        return 'critico';
      }
    })
  );

  // Painel de recomendações
  if (recBox && recs.length > 0) {
    recBox.style.display = '';
    recBox.innerHTML = `
      <div style="color:#fca5a5;font-weight:600;font-size:12px;margin-bottom:8px;">
        ⚡ Recomendações automáticas (${recs.length})
      </div>
      ${recs.map(r => `
        <div style="display:flex;gap:8px;margin-bottom:6px;align-items:flex-start;">
          <span style="flex-shrink:0;">${r.status === 'critico' ? '🔴' : '⚠️'}</span>
          <div>
            <span style="color:${r.status === 'critico' ? '#fca5a5' : '#fcd34d'};font-size:11px;font-weight:600;">${_esc(r.title)}:</span>
            <span style="color:#e2e8f0;font-size:11px;margin-left:4px;">${_esc(r.text)}</span>
          </div>
        </div>
      `).join('')}
    `;
  }

  // Atualiza resumo
  const ok      = statusList.filter(r => r === 'ok').length;
  const warn    = statusList.filter(r => r === 'warn').length;
  const critico = statusList.filter(r => r === 'critico').length;

  if (summary) {
    if (critico > 0) {
      summary.textContent = `🔴 ${critico} crítico${critico !== 1 ? 's' : ''} · ⚠️ ${warn} aviso${warn !== 1 ? 's' : ''} · ✅ ${ok} OK`;
      summary.style.color = '#f87171';
    } else if (warn > 0) {
      summary.textContent = `⚠️ ${warn} aviso${warn !== 1 ? 's' : ''} · ✅ ${ok} OK`;
      summary.style.color = '#fbbf24';
    } else {
      summary.textContent = `✅ ${ok}/10 OK — Sistema saudável`;
      summary.style.color = '#4ade80';
    }
  }
}

// ── XSS escape (mesma implementação dos outros módulos) ───────────────────────
function _esc(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

// ── Atualiza um card com o resultado ─────────────────────────────────────────
function _updateCard(id, status, detail) {
  const card   = document.getElementById('hc-' + id);
  const icon   = document.getElementById('hc-status-' + id);
  const detEl  = document.getElementById('hc-detail-' + id);
  if (!card || !icon || !detEl) return;

  const cfg = {
    ok:      { emoji: '✅', color: '#4ade80', border: '#166534', bg: 'rgba(22,101,52,0.08)' },
    warn:    { emoji: '⚠️', color: '#fbbf24', border: '#92400e', bg: 'rgba(146,64,14,0.08)' },
    critico: { emoji: '🔴', color: '#f87171', border: '#7f1d1d', bg: 'rgba(127,29,29,0.12)' },
  }[status] || { emoji: '❓', color: '#94a3b8', border: '#1e3a5f', bg: '' };

  icon.textContent            = cfg.emoji;
  card.style.borderLeftColor  = cfg.border;
  card.style.background       = cfg.bg || '';
  detEl.style.color           = cfg.color;
  detEl.textContent           = detail;
}

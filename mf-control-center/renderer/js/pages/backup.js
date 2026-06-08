/**
 * backup.js — MF Control Center
 * Backup Center: exportação segura de todos os componentes do ecossistema.
 * Regras: somente exportação. Nenhuma exclusão. Nenhum overwrite automático.
 */

import { db } from '../firebase-config.js';
import {
  collection, getDocs
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';

// Coleções do Firestore a exportar
const COLECOES = [
  'leads',
  'lp_leads',
  'eventos',
  'landing_visits',
  'instalacoes',
  'financeiro_dados',
  'tecnico_dados',
  'notificacoes_logs',
  'crm_config',
  'returno_ao_site',
];

let _iniciado = false;

export function backupInit() {
  if (_iniciado) return;
  _iniciado = true;

  const container = document.getElementById('page-backup');
  if (!container) return;

  container.innerHTML = '';

  // ── Header ──
  const header = document.createElement('div');
  header.className = 'dash-header';
  header.innerHTML = `
    <div>
      <h2>💾 Backup Center</h2>
      <p class="dash-sub">Exportação segura · Somente leitura · Nenhum dado alterado</p>
    </div>
    <span class="badge-safe">🔒 READ-ONLY</span>
  `;
  container.appendChild(header);

  // ── Cards Grid ──
  const grid = document.createElement('div');
  grid.className = 'backup-grid';
  container.appendChild(grid);

  // ── Log de Operações ──
  const logSection = document.createElement('div');
  logSection.className = 'dash-card';
  logSection.style.marginTop = '16px';
  logSection.innerHTML = '<h3>📋 Log de Operações</h3>';
  const logPre = document.createElement('pre');
  logPre.className = 'backup-log';
  logPre.id = 'backup-log';
  logPre.textContent = 'Aguardando ação...\n';
  logSection.appendChild(logPre);
  container.appendChild(logSection);

  // ── Define os 5 cards ──
  const cards = [
    {
      id:    'firestore',
      icon:  '🔥',
      title: 'Backup Firestore',
      desc:  '10 coleções · leads, lp_leads, eventos, instalacoes…',
      nota:  'Exporta JSON completo do Firebase PROD',
      acao:  'Gerar Firestore',
      fn:    executarBackupFirestore,
    },
    {
      id:    'rules',
      icon:  '🛡️',
      title: 'Backup Rules',
      desc:  'firestore.rules · indexes · firebase.json · storage.rules',
      nota:  'Exporta regras de segurança V1.2',
      acao:  'Gerar Rules',
      fn:    executarBackupRules,
    },
    {
      id:    'crm',
      icon:  '🖥️',
      title: 'Backup CRM',
      desc:  'crm-dev/ · HTML, JS, CSS, Services',
      nota:  'Exclui node_modules e dist automaticamente',
      acao:  'Gerar CRM',
      fn:    executarBackupCRM,
    },
    {
      id:    'landing',
      icon:  '🌐',
      title: 'Backup Landing',
      desc:  'index.html · css/ · js/ · src/ · docs/',
      nota:  'Landing Page (GitHub Pages)',
      acao:  'Gerar Landing',
      fn:    executarBackupLanding,
    },
    {
      id:    'completo',
      icon:  '📦',
      title: 'Backup Completo',
      desc:  'CRM + Landing + Rules + Firestore',
      nota:  'ZIP único com subpastas organizadas',
      acao:  'Gerar Completo',
      fn:    executarBackupCompleto,
      destaque: true,
    },
  ];

  for (const card of cards) {
    const el = criarCard(card);
    grid.appendChild(el);
  }

  // Carrega último backup de cada tipo
  carregarUltimosBackups();
}

// ── Cria card de backup ──────────────────────────────────────────────────────
function criarCard(cfg) {
  const card = document.createElement('div');
  card.className = 'bkp-card' + (cfg.destaque ? ' bkp-card--destaque' : '');
  card.id = 'bkp-card-' + cfg.id;

  const icon = document.createElement('div');
  icon.className = 'bkp-icon';
  icon.textContent = cfg.icon;

  const info = document.createElement('div');
  info.className = 'bkp-info';

  const title = document.createElement('h3');
  title.textContent = cfg.title;

  const desc = document.createElement('p');
  desc.className = 'bkp-desc';
  desc.textContent = cfg.desc;

  const nota = document.createElement('small');
  nota.className = 'bkp-nota muted';
  nota.textContent = cfg.nota;

  const meta = document.createElement('div');
  meta.className = 'bkp-meta';
  meta.id = 'bkp-meta-' + cfg.id;
  const metaSpan = document.createElement('span');
  metaSpan.className = 'muted';
  metaSpan.textContent = 'Verificando...';
  meta.appendChild(metaSpan);

  info.appendChild(title);
  info.appendChild(desc);
  info.appendChild(nota);
  info.appendChild(meta);

  const btn = document.createElement('button');
  btn.className = 'btn-backup' + (cfg.destaque ? ' btn-backup--destaque' : '');
  btn.id = 'btn-bkp-' + cfg.id;
  btn.textContent = cfg.acao;

  btn.addEventListener('click', async () => {
    btn.disabled = true;
    btn.textContent = '⟳ Gerando...';
    log(`[${cfg.title}] Iniciando...`);
    try {
      await cfg.fn(btn, cfg.id);
    } catch (e) {
      log(`[${cfg.title}] ERRO: ${e.message}`);
    } finally {
      btn.disabled = false;
      btn.textContent = cfg.acao;
      carregarUltimosBackups();
    }
  });

  card.appendChild(icon);
  card.appendChild(info);
  card.appendChild(btn);
  return card;
}

// ── Log ──────────────────────────────────────────────────────────────────────
function log(msg) {
  const pre = document.getElementById('backup-log');
  if (!pre) return;
  const ts = new Date().toLocaleTimeString('pt-BR');
  pre.textContent += `[${ts}] ${msg}\n`;
  pre.scrollTop = pre.scrollHeight;
}

function setMeta(id, { text, ok }) {
  const el = document.getElementById('bkp-meta-' + id);
  if (!el) return;
  el.textContent = '';
  const span = document.createElement('span');
  span.className = ok ? 'bkp-tag' : 'muted';
  span.textContent = text;   // textContent — sem risco XSS
  el.appendChild(span);
}

// ── Últimos backups ──────────────────────────────────────────────────────────
async function carregarUltimosBackups() {
  const backups = await window.MFControl?.fs.listBackups() || [];

  const tipos = {
    firestore: backups.filter(b => b.name.startsWith('BACKUP_FIRESTORE_')),
    rules:     backups.filter(b => b.name.startsWith('BACKUP_RULES_')),
    crm:       backups.filter(b => b.name.startsWith('BACKUP_CRM_')),
    landing:   backups.filter(b => b.name.startsWith('BACKUP_LANDING_')),
    completo:  backups.filter(b => b.name.startsWith('BACKUP_COMPLETO_')),
  };

  for (const [id, lista] of Object.entries(tipos)) {
    if (lista.length === 0) {
      setMeta(id, { text: 'Nenhum backup encontrado', ok: false });
    } else {
      const ultimo = lista[0];
      const data   = new Date(ultimo.mtime).toLocaleString('pt-BR');
      const size   = formatBytes(ultimo.size);
      setMeta(id, { text: `Último: ${data} · ${size}`, ok: true });
    }
  }
}

// ── 1. Backup Firestore ──────────────────────────────────────────────────────
async function executarBackupFirestore() {
  log('[Firestore] Lendo coleções do Firebase PROD...');
  const exportData = { exportedAt: new Date().toISOString(), collections: {} };
  let totalDocs = 0;

  for (const col of COLECOES) {
    try {
      const snap = await getDocs(collection(db, col));
      exportData.collections[col] = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      totalDocs += snap.size;
      log(`  ✓ ${col}: ${snap.size} docs`);
    } catch (e) {
      log(`  ✗ ${col}: ${e.message}`);
      exportData.collections[col] = [];
    }
  }

  log(`[Firestore] Total: ${totalDocs} docs em ${COLECOES.length} coleções`);
  log('[Firestore] Gerando ZIP...');

  const jsonData = JSON.stringify(exportData, serializeFirestore, 2);
  const result   = await window.MFControl?.backup.firestore(jsonData);

  if (result?.ok) {
    log(`[Firestore] ✅ Salvo: ${result.path} (${formatBytes(result.size)})`);
  } else if (result?.reason === 'cancelled') {
    log('[Firestore] Operação cancelada pelo usuário.');
  } else {
    log(`[Firestore] ❌ Erro: ${result?.reason}`);
  }
}

// ── 2. Backup Rules ──────────────────────────────────────────────────────────
async function executarBackupRules() {
  log('[Rules] Exportando regras Firestore V1.2...');
  const result = await window.MFControl?.backup.rules();
  if (result?.ok) {
    log(`[Rules] ✅ Salvo: ${result.path} (${formatBytes(result.size)})`);
  } else if (result?.reason === 'cancelled') {
    log('[Rules] Operação cancelada.');
  } else {
    log(`[Rules] ❌ Erro: ${result?.reason}`);
  }
}

// ── 3. Backup CRM ────────────────────────────────────────────────────────────
async function executarBackupCRM() {
  log('[CRM] Compactando crm-dev/ (excluindo node_modules)...');
  const result = await window.MFControl?.backup.crm();
  if (result?.ok) {
    log(`[CRM] ✅ Salvo: ${result.path} (${formatBytes(result.size)})`);
  } else if (result?.reason === 'cancelled') {
    log('[CRM] Operação cancelada.');
  } else {
    log(`[CRM] ❌ Erro: ${result?.reason}`);
  }
}

// ── 4. Backup Landing ────────────────────────────────────────────────────────
async function executarBackupLanding() {
  log('[Landing] Compactando Landing Page...');
  const result = await window.MFControl?.backup.landing();
  if (result?.ok) {
    log(`[Landing] ✅ Salvo: ${result.path} (${formatBytes(result.size)})`);
  } else if (result?.reason === 'cancelled') {
    log('[Landing] Operação cancelada.');
  } else {
    log(`[Landing] ❌ Erro: ${result?.reason}`);
  }
}

// ── 5. Backup Completo ───────────────────────────────────────────────────────
async function executarBackupCompleto() {
  log('[Completo] Iniciando backup total...');

  // Lê Firestore primeiro
  log('[Completo] Lendo Firestore...');
  const exportData = { exportedAt: new Date().toISOString(), collections: {} };
  let totalDocs = 0;
  for (const col of COLECOES) {
    try {
      const snap = await getDocs(collection(db, col));
      exportData.collections[col] = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      totalDocs += snap.size;
    } catch (e) {
      exportData.collections[col] = [];
    }
  }
  log(`[Completo] Firestore: ${totalDocs} docs lidos`);

  log('[Completo] Gerando ZIP completo (CRM + Landing + Rules + Firestore)...');
  const jsonData = JSON.stringify(exportData, serializeFirestore, 2);
  const result   = await window.MFControl?.backup.completo(jsonData);

  if (result?.ok) {
    log(`[Completo] ✅ Salvo: ${result.path} (${formatBytes(result.size)})`);
  } else if (result?.reason === 'cancelled') {
    log('[Completo] Operação cancelada.');
  } else {
    log(`[Completo] ❌ Erro: ${result?.reason}`);
  }
}

// ── Helpers ──────────────────────────────────────────────────────────────────
function formatBytes(bytes) {
  if (!bytes) return '0 B';
  if (bytes < 1024)    return bytes + ' B';
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / 1048576).toFixed(1) + ' MB';
}

// Serializa Firestore Timestamps para ISO string no JSON
function serializeFirestore(key, val) {
  if (val && typeof val === 'object') {
    if (typeof val.toDate === 'function') return val.toDate().toISOString();
    if (val.seconds !== undefined && val.nanoseconds !== undefined) {
      return new Date(val.seconds * 1000).toISOString();
    }
  }
  return val;
}

/**
 * dashboard.js — MF Control Center
 * Dashboard Executivo: métricas em tempo real do ecossistema MF.
 */

import { db }
  from '../firebase-config.js';
import {
  collection, getDocs, query, where, orderBy, limit, onSnapshot,
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';

let _iniciado = false;

export async function dashboardInit() {
  if (_iniciado) return;
  _iniciado = true;

  const container = document.getElementById('page-mfcc-dashboard');
  if (!container) return;

  container.innerHTML = `
    <div class="dash-header">
      <div>
        <h2>📊 Dashboard Executivo</h2>
        <p class="dash-sub">Ecossistema MF Soluções · Firebase PROD</p>
      </div>
      <span id="dash-timestamp" class="dash-ts">—</span>
    </div>

    <div class="kpi-grid">
      <div class="kpi-card" id="kpi-leads">
        <div class="kpi-icon">👥</div>
        <div class="kpi-info">
          <span class="kpi-value" id="kpi-leads-val">—</span>
          <span class="kpi-label">Leads CRM</span>
        </div>
      </div>
      <div class="kpi-card" id="kpi-lp-leads">
        <div class="kpi-icon">🌐</div>
        <div class="kpi-info">
          <span class="kpi-value" id="kpi-lp-leads-val">—</span>
          <span class="kpi-label">Leads Landing</span>
        </div>
      </div>
      <div class="kpi-card" id="kpi-eventos">
        <div class="kpi-icon">⚡</div>
        <div class="kpi-info">
          <span class="kpi-value" id="kpi-eventos-val">—</span>
          <span class="kpi-label">Eventos Analytics</span>
        </div>
      </div>
      <div class="kpi-card" id="kpi-fechados">
        <div class="kpi-icon">✅</div>
        <div class="kpi-info">
          <span class="kpi-value" id="kpi-fechados-val">—</span>
          <span class="kpi-label">Leads Fechados</span>
        </div>
      </div>
    </div>

    <div class="dash-row">
      <div class="dash-card">
        <h3>⚙️ Status do Sistema</h3>
        <ul class="status-list" id="status-list">
          <li class="status-item"><span class="dot dot-ok"></span> CRM Web — <a href="#" id="link-crm">mf-solucoes-crm.web.app</a></li>
          <li class="status-item"><span class="dot dot-ok"></span> Firebase Auth — PROD</li>
          <li class="status-item"><span class="dot dot-ok"></span> Firestore — mf-solucoes-crm</li>
          <li class="status-item"><span class="dot dot-ok"></span> Rules V1.2 — Hardened</li>
          <li class="status-item"><span class="dot dot-ok"></span> Tag Git — V1.2_PRODUCAO</li>
        </ul>
      </div>

      <div class="dash-card">
        <h3>🗂️ Backups Disponíveis</h3>
        <ul class="backup-list" id="backup-list">
          <li class="muted">Carregando...</li>
        </ul>
      </div>
    </div>

    <div class="dash-card">
      <h3>🌿 Git — Commits Recentes</h3>
      <pre class="git-log" id="git-log-out">Carregando...</pre>
    </div>
  `;

  // Link CRM
  document.getElementById('link-crm')?.addEventListener('click', (e) => {
    e.preventDefault();
    window.MFControl?.openExternal('https://mf-solucoes-crm.web.app');
  });

  // Carrega dados em paralelo
  await Promise.all([
    carregarKPIs(),
    carregarBackups(),
    carregarGitLog(),
  ]);

  atualizarTimestamp();
}

// ─── KPIs Firestore ───────────────────────────────────────────────────────────
async function carregarKPIs() {
  try {
    const [leadsSnap, lpLeadsSnap, eventosSnap, fechadosSnap] = await Promise.all([
      getDocs(collection(db, 'leads')),
      getDocs(collection(db, 'lp_leads')),
      getDocs(collection(db, 'eventos')),
      getDocs(query(collection(db, 'leads'), where('status', '==', 'fechado'))),
    ]);

    setKPI('kpi-leads-val',    leadsSnap.size);
    setKPI('kpi-lp-leads-val', lpLeadsSnap.size);
    setKPI('kpi-eventos-val',  eventosSnap.size);
    setKPI('kpi-fechados-val', fechadosSnap.size);

    // Listener em tempo real para leads
    onSnapshot(collection(db, 'leads'), snap => setKPI('kpi-leads-val', snap.size));
    onSnapshot(collection(db, 'lp_leads'), snap => setKPI('kpi-lp-leads-val', snap.size));
  } catch (e) {
    console.error('[Dashboard] Erro KPIs:', e);
  }
}

function setKPI(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}

// ─── Backups ──────────────────────────────────────────────────────────────────
async function carregarBackups() {
  const lista = document.getElementById('backup-list');
  if (!lista) return;

  lista.textContent = ''; // limpa sem innerHTML

  try {
    const backups = await window.MFControl?.fs.listBackups() || [];

    if (!backups.length) {
      const li = document.createElement('li');
      li.className = 'muted';
      li.textContent = 'Nenhum backup encontrado.';
      lista.appendChild(li);
      return;
    }

    for (const b of backups) {
      const li   = document.createElement('li');
      li.className = 'backup-item';

      const nome = document.createElement('span');
      nome.className   = 'backup-name';
      nome.textContent = b.name;          // textContent — sem risco XSS

      const size = document.createElement('span');
      size.className   = 'backup-size muted';
      size.textContent = formatBytes(b.size);

      li.appendChild(nome);
      li.appendChild(size);
      lista.appendChild(li);
    }
  } catch (e) {
    const li = document.createElement('li');
    li.className   = 'muted';
    li.textContent = 'Erro ao listar backups.';
    lista.appendChild(li);
  }
}

// ─── Git Log ──────────────────────────────────────────────────────────────────
async function carregarGitLog() {
  const pre = document.getElementById('git-log-out');
  if (!pre) return;

  try {
    const log = await window.MFControl?.git.log() || 'Não disponível';
    pre.textContent = log;
  } catch (e) {
    pre.textContent = 'Erro ao carregar git log.';
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatBytes(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / 1048576).toFixed(1) + ' MB';
}

function atualizarTimestamp() {
  const el = document.getElementById('dash-timestamp');
  if (el) el.textContent = 'Atualizado: ' + new Date().toLocaleTimeString('pt-BR');
}

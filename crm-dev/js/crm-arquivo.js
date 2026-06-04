/**
 * crm-arquivo.js — Arquivo de leads (não é lixeira, não é exclusão)
 * Arquivar: lead some do Kanban, mas continua salvo com arquivado:true
 * Restaurar: lead volta ao status original
 */

import {
  collection, doc, getDocs, updateDoc
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';
import { toast, escHtml } from './crm-utils.js';

// _db é mf-solucoes-crm com auth (setado via iniciarArquivo(db))
// Não usar app secundário lp-prod: não tem auth do usuário logado
function getLeadSource(lead) {
  if (lead?.origemSistema === 'landing') return { db: _db, col: 'lp_leads' };
  return { db: _db, col: 'leads' };
}

let _db = null;
let _leads = [];
let _busca = '';
let _debounce = null;

function formatarData(iso) {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '—';
    return `${d.getDate().toString().padStart(2,'0')}/${(d.getMonth()+1).toString().padStart(2,'0')}/${d.getFullYear()} ${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')}`;
  } catch { return '—'; }
}

async function carregarArquivados() {
  if (!_db) return;
  const [snapCalc, snapLanding] = await Promise.all([
    getDocs(collection(_db, 'leads')),
    getDocs(collection(_db, 'lp_leads')).catch(() => ({ docs: [] }))
  ]);

  const calc = snapCalc.docs.map(d => ({ id: d.id, origemSistema: 'calculadora', ...d.data() }));
  const land = snapLanding.docs.map(d => ({ id: d.id, origemSistema: 'landing', ...d.data() }));

  _leads = [...calc, ...land].filter(l =>
    l.arquivado === true || String(l.arquivado).toLowerCase() === 'true'
  );
}

function renderArquivo() {
  const lista = document.getElementById('listaArquivo');
  if (!lista) return;

  const busca = _busca.toLowerCase();
  const filtrados = _leads
    .filter(l =>
      (l.nome || '').toLowerCase().includes(busca) ||
      (l.telefone || '').includes(busca)
    )
    .sort((a, b) => new Date(b.arquivadoEm || 0) - new Date(a.arquivadoEm || 0));

  if (!filtrados.length) {
    lista.innerHTML = '<div style="text-align:center;padding:30px;color:#64748b">Nenhum lead arquivado.</div>';
    return;
  }

  lista.innerHTML = filtrados.map(l => {
    const origem = l.origemSistema === 'landing' ? '🔵 Landing' : '🟢 Calc';
    const statusAnterior = l.statusAnterior || l.status || '—';
    return `
<div class="lixeira-card glass-card" role="listitem">
  <div class="lixeira-info">
    <b>${escHtml(l.nome || 'Sem nome')}</b>
    <small>📞 ${escHtml(l.telefone || '—')}</small>
    <small>${origem} · 📍 ${escHtml(l.utm_source || 'direto')}</small>
    <small>Status anterior: <b>${escHtml(statusAnterior)}</b></small>
    <small style="color:var(--texto-secundario)">Arquivado: ${formatarData(l.arquivadoEm)}</small>
  </div>
  <div class="lixeira-actions">
    <button type="button" class="btn-card btn-whatsapp" data-restaurar-arq="${escHtml(l.id)}">♻️ Restaurar</button>
    <button type="button" class="btn-card btn-detalhes" data-detalhes-arq="${escHtml(l.id)}">📊 Detalhes</button>
  </div>
</div>`;
  }).join('');
}

async function restaurarLead(id) {
  const lead = _leads.find(l => l.id === id);
  if (!lead) return;
  const { db: leadDb, col } = getLeadSource(lead);
  try {
    await updateDoc(doc(leadDb, col, id), {
      arquivado: false,
      arquivadoEm: null,
      statusAnterior: null
    });
    _leads = _leads.filter(l => l.id !== id);
    renderArquivo();
    toast('Lead restaurado ao Kanban', 'success');
  } catch (e) {
    console.error('[CRM-Arquivo] restaurar:', e);
    toast('Erro ao restaurar lead', 'error');
  }
}

export async function arquivarLead(lead, db) {
  if (!lead) return;
  const { db: leadDb, col } = getLeadSource(lead);
  try {
    await updateDoc(doc(leadDb, col, lead.id), {
      arquivado: true,
      arquivadoEm: new Date().toISOString(),
      statusAnterior: lead.status || 'novo'
    });
    toast('Lead arquivado', 'info');
  } catch (e) {
    console.error('[CRM-Arquivo] arquivar:', e);
    toast('Erro ao arquivar lead', 'error');
  }
}

export function iniciarArquivo(db) {
  _db = db;

  const btnAbrir  = document.getElementById('btn-arquivo');
  const btnFechar = document.getElementById('btn-fechar-arquivo');
  const modal     = document.getElementById('modalArquivo');
  const pesquisa  = document.getElementById('pesquisaArquivo');
  const lista     = document.getElementById('listaArquivo');

  btnAbrir?.addEventListener('click', abrirArquivo);
  btnFechar?.addEventListener('click', fecharArquivo);

  modal?.addEventListener('click', e => {
    if (e.target.id === 'modalArquivo') fecharArquivo();
  });

  pesquisa?.addEventListener('input', () => {
    _busca = pesquisa.value || '';
    if (_debounce) clearTimeout(_debounce);
    _debounce = setTimeout(() => renderArquivo(), 200);
  });

  lista?.addEventListener('click', e => {
    const btnRestore  = e.target.closest('[data-restaurar-arq]');
    const btnDetalhes = e.target.closest('[data-detalhes-arq]');
    if (btnRestore)  restaurarLead(btnRestore.dataset.restaurarArq);
    if (btnDetalhes) {
      const lead = _leads.find(l => l.id === btnDetalhes.dataset.detalhesArq);
      if (lead && window.abrirDetalhesExterno) window.abrirDetalhesExterno(lead.id);
    }
  });

  window.abrirArquivo  = abrirArquivo;
  window.fecharArquivo = fecharArquivo;
}

export async function abrirArquivo() {
  const modal = document.getElementById('modalArquivo');
  if (!modal) return;
  modal.classList.add('ativo');
  modal.setAttribute('aria-hidden', 'false');
  const pesquisa = document.getElementById('pesquisaArquivo');
  if (pesquisa) { pesquisa.value = ''; _busca = ''; }
  await carregarArquivados();
  renderArquivo();
}

export function fecharArquivo() {
  const modal = document.getElementById('modalArquivo');
  if (!modal) return;
  modal.classList.remove('ativo');
  modal.setAttribute('aria-hidden', 'true');
}

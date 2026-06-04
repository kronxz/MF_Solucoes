/**
 * crm-trash.js — Lixeira: busca, restaurar, excluir permanente
 */

import { collection, doc, getDocs, updateDoc, deleteDoc } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';
import { toast, escHtml } from './crm-utils.js';

// _db já aponta para mf-solucoes-crm (mesmo banco de leads e lp_leads)
function getLeadSource(lead) {
  if (lead?.origemSistema === 'landing') return { db: _db, col: 'lp_leads' };
  return { db: _db, col: 'leads' };
}

let _db = null;
let _leads = [];
let _debounce = null;

function formatarData(dataISO) {
  if (!dataISO) return '—';
  const d = new Date(dataISO);
  if (Number.isNaN(d.getTime())) return '—';
  return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()} - ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
}

async function carregarLeadsLixeira() {
  if (!_db) return;
  const [snapCalc, snapLanding] = await Promise.all([
    getDocs(collection(_db, 'leads')),
    getDocs(collection(_db, 'lp_leads')).catch(() => ({ docs: [] }))
  ]);
  const calc    = snapCalc.docs.map(d => ({ id: d.id, origemSistema: 'calculadora', ...d.data() }));
  const landing = snapLanding.docs.map(d => {
    const data = d.data();
    return { id: d.id, origemSistema: 'landing', ...data, deletado: data.status === 'excluido' || data.deletado || false };
  });
  _leads = [...calc, ...landing];
}

export function iniciarLixeira(db) {
  _db = db;
  const btnAbrir = document.getElementById('btn-lixeira');
  const btnFechar = document.getElementById('btn-fechar-lixeira');
  const modal = document.getElementById('modalLixeira');
  const pesquisa = document.getElementById('pesquisaLixeira');
  const lista = document.getElementById('listaLixeira');

  if (!btnAbrir) console.warn('[CRM-Trash] botão Lixeira não encontrado');
  if (!btnFechar) console.warn('[CRM-Trash] botão fechar lixeira não encontrado');
  if (!modal) console.warn('[CRM-Trash] modal da lixeira não encontrado');
  if (!pesquisa) console.warn('[CRM-Trash] campo de pesquisa da lixeira não encontrado');
  if (!lista) console.warn('[CRM-Trash] lista da lixeira não encontrada');

  btnAbrir?.addEventListener('click', abrirLixeira);
  btnFechar?.addEventListener('click', fecharLixeira);
  modal?.addEventListener('click', e => {
    if (e.target.id === 'modalLixeira') fecharLixeira();
  });
  pesquisa?.addEventListener('input', () => {
    if (_debounce) clearTimeout(_debounce);
    _debounce = setTimeout(() => renderLixeira(), 300);
  });
  lista?.addEventListener('click', e => {
    const btnRestore = e.target.closest('[data-restaurar]');
    const btnDelete = e.target.closest('[data-excluir-perm]');
    if (btnRestore) restaurarLead(btnRestore.dataset.restaurar);
    if (btnDelete) excluirPermanentemente(btnDelete.dataset.excluirPerm);
  });

  window.abrirLixeira = abrirLixeira;
  window.fecharLixeira = fecharLixeira;
}

export const iniciarTrash = iniciarLixeira;

export function atualizarLeadsLixeira(leads) {
  _leads = leads;
  const modal = document.getElementById('modalLixeira');
  if (modal?.classList.contains('ativo')) renderLixeira();
}

export const atualizarLeadsTrash = atualizarLeadsLixeira;

export async function abrirLixeira() {
  const modal = document.getElementById('modalLixeira');
  if (!modal) return;
  modal.classList.add('ativo');
  modal.setAttribute('aria-hidden', 'false');
  const inp = document.getElementById('pesquisaLixeira');
  if (inp) inp.value = '';
  // Render imediato com dados ao vivo (listeners realtime)
  renderLixeira();
  // Fetch background do Firestore para incluir leads sem createdAt (mais antigos)
  await carregarLeadsLixeira();
  renderLixeira();
}

export function fecharLixeira() {
  const modal = document.getElementById('modalLixeira');
  if (!modal) return;
  modal.classList.remove('ativo');
  modal.setAttribute('aria-hidden', 'true');
}

function renderLixeira() {
  const lista = document.getElementById('listaLixeira');
  if (!lista) return;

  const busca = (document.getElementById('pesquisaLixeira')?.value || '').toLowerCase();
  const excluidos = _leads
    .filter(l => l.deletado === true || String(l.deletado).toLowerCase() === 'true')
    .filter(l =>
      (l.nome || '').toLowerCase().includes(busca) ||
      (l.telefone || '').includes(busca)
    )
    .sort((a, b) => new Date(b.deletadoEm || 0) - new Date(a.deletadoEm || 0));

  if (!excluidos.length) {
    lista.innerHTML = '<div class="lixeira-vazia" role="status">Nenhum lead na lixeira.</div>';
    return;
  }

  lista.innerHTML = excluidos.map(l => `
<div class="lixeira-card glass-card" role="listitem">
  <div class="lixeira-info">
    <b>${escHtml(l.nome || 'Sem nome')}</b>
    <small>📞 ${escHtml(l.telefone || '-')}</small>
    <small>💰 R$ ${escHtml(l.valor || '-')}</small>
    <small style="color:var(--texto-secundario)">Excluído: ${formatarData(l.deletadoEm)}</small>
  </div>
  <div class="lixeira-actions">
    <button type="button" class="btn-card btn-whatsapp" data-restaurar="${l.id}">♻️ Restaurar</button>
    <button type="button" class="btn-card btn-excluir" data-excluir-perm="${l.id}">❌ Excluir</button>
  </div>
</div>`).join('');
}

async function restaurarLead(id) {
  if (!_db) {
    console.error('[CRM-Trash] banco não inicializado');
    toast('Erro interno ao restaurar lead', 'error');
    return;
  }
  const lead = _leads.find(l => l.id === id);
  const { db: leadDb, col } = getLeadSource(lead);
  const payload = lead?.origemSistema === 'landing'
    ? { status: 'novo', deletado: false, restauradoEm: new Date().toISOString() }
    : { deletado: false, restauradoEm: new Date().toISOString() };
  try {
    await updateDoc(doc(leadDb, col, id), payload);
    if (lead) { lead.deletado = false; lead.restauradoEm = new Date().toISOString(); }
    renderLixeira();
    toast('Lead restaurado', 'success');
  } catch (e) {
    console.error('[CRM-Trash]', e);
    toast('Erro ao restaurar lead', 'error');
  }
}

async function excluirPermanentemente(id) {
  if (!confirm('Excluir permanentemente? Esta ação não pode ser desfeita.')) return;
  if (!_db) {
    console.error('[CRM-Trash] banco não inicializado');
    toast('Erro interno ao excluir lead', 'error');
    return;
  }

  try {
    await deleteDoc(doc(_db, 'leads', id));
    _leads = _leads.filter(l => l.id !== id);
    renderLixeira();
    toast('Lead excluído permanentemente', 'warn');
  } catch (e) {
    console.error('[CRM-Trash]', e);
    toast('Erro ao excluir lead', 'error');
  }
}

/**
 * crm-arquivados.js — Leads arquivados: visualizar, restaurar, excluir permanente
 */

import { collection, doc, getDocs, updateDoc, deleteDoc } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';
import { toast, escHtml } from './crm-utils.js';

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

async function carregarLeadsArquivados() {
  if (!_db) return;
  const [snapCalc, snapLanding] = await Promise.all([
    getDocs(collection(_db, 'leads')),
    getDocs(collection(_db, 'lp_leads')).catch(() => ({ docs: [] }))
  ]);
  const calc    = snapCalc.docs.map(d => ({ id: d.id, origemSistema: 'calculadora', ...d.data() }));
  const landing = snapLanding.docs.map(d => ({ id: d.id, origemSistema: 'landing', ...d.data() }));
  _leads = [...calc, ...landing];
}

export function iniciarArquivados(db) {
  _db = db;
  const btnAbrir  = document.getElementById('btn-arquivados');
  const btnFechar = document.getElementById('btn-fechar-arquivados');
  const modal     = document.getElementById('modalArquivados');
  const pesquisa  = document.getElementById('pesquisaArquivados');
  const lista     = document.getElementById('listaArquivados');

  btnAbrir?.addEventListener('click', abrirArquivados);
  btnFechar?.addEventListener('click', fecharArquivados);
  modal?.addEventListener('click', e => {
    if (e.target.id === 'modalArquivados') fecharArquivados();
  });
  pesquisa?.addEventListener('input', () => {
    if (_debounce) clearTimeout(_debounce);
    _debounce = setTimeout(() => renderArquivados(), 300);
  });
  lista?.addEventListener('click', e => {
    const btnRestore = e.target.closest('[data-restaurar-arq]');
    const btnDelete  = e.target.closest('[data-excluir-arq]');
    if (btnRestore) restaurarLead(btnRestore.dataset.restaurarArq);
    if (btnDelete)  excluirPermanentemente(btnDelete.dataset.excluirArq);
  });

  window.abrirArquivados  = abrirArquivados;
  window.fecharArquivados = fecharArquivados;
}

export function atualizarLeadsArquivados(leads) {
  _leads = leads;
  const modal = document.getElementById('modalArquivados');
  if (modal?.classList.contains('ativo')) renderArquivados();
}

export async function abrirArquivados() {
  const modal = document.getElementById('modalArquivados');
  if (!modal) return;
  modal.classList.add('ativo');
  modal.setAttribute('aria-hidden', 'false');
  const inp = document.getElementById('pesquisaArquivados');
  if (inp) inp.value = '';
  renderArquivados();
  await carregarLeadsArquivados();
  renderArquivados();
}

export function fecharArquivados() {
  const modal = document.getElementById('modalArquivados');
  if (!modal) return;
  modal.classList.remove('ativo');
  modal.setAttribute('aria-hidden', 'true');
}

function renderArquivados() {
  const lista = document.getElementById('listaArquivados');
  if (!lista) return;

  const busca = (document.getElementById('pesquisaArquivados')?.value || '').toLowerCase();
  const arquivados = _leads
    .filter(l => l.status === 'arquivado')
    .filter(l =>
      (l.nome || '').toLowerCase().includes(busca) ||
      (l.telefone || '').includes(busca)
    )
    .sort((a, b) => new Date(b.arquivadoEm || 0) - new Date(a.arquivadoEm || 0));

  if (!arquivados.length) {
    lista.innerHTML = '<div class="lixeira-vazia" role="status">Nenhum lead arquivado.</div>';
    return;
  }

  lista.innerHTML = arquivados.map(l => `
<div class="lixeira-card glass-card" role="listitem">
  <div class="lixeira-info">
    <b>${escHtml(l.nome || 'Sem nome')}</b>
    <small>📞 ${escHtml(l.telefone || '-')}</small>
    <small>💰 R$ ${escHtml(l.valor || l.contaDeLuz || '-')}</small>
    <small style="color:var(--texto-secundario)">Arquivado: ${formatarData(l.arquivadoEm)}</small>
  </div>
  <div class="lixeira-actions">
    <button type="button" class="btn-card btn-whatsapp" data-restaurar-arq="${l.id}">♻️ Restaurar</button>
    <button type="button" class="btn-card btn-excluir" data-excluir-arq="${l.id}">❌ Excluir</button>
  </div>
</div>`).join('');
}

async function restaurarLead(id) {
  const lead = _leads.find(l => l.id === id);
  if (!lead) return;
  const { db: leadDb, col } = getLeadSource(lead);
  try {
    await updateDoc(doc(leadDb, col, id), { status: 'novo', arquivadoEm: null });
    if (lead) lead.status = 'novo';
    renderArquivados();
    toast('Lead restaurado para o kanban', 'success');
  } catch (e) {
    console.error('[CRM-Arquivados]', e);
    toast('Erro ao restaurar lead', 'error');
  }
}

async function excluirPermanentemente(id) {
  if (!confirm('Excluir permanentemente? Esta ação não pode ser desfeita.')) return;
  const lead = _leads.find(l => l.id === id);
  if (!lead) return;
  const { db: leadDb, col } = getLeadSource(lead);
  try {
    await deleteDoc(doc(leadDb, col, id));
    _leads = _leads.filter(l => l.id !== id);
    renderArquivados();
    toast('Lead excluído permanentemente', 'warn');
  } catch (e) {
    console.error('[CRM-Arquivados]', e);
    toast('Erro ao excluir lead', 'error');
  }
}

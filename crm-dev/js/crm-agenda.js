/**
 * crm-agenda.js — Aba AGENDA do CRM (PASSO 4 / F2) — agendar + editar
 * ============================================================================
 * Dono: mf-agente-crm. Consome o slotEngine (mf-agente-agendamento).
 *
 * F1 (ver) + F2 (agendar/editar). Fonte da verdade: coleção `agendamentos`.
 * Cockpit PRIVADO do dono (ADR-0008) — o cliente não escolhe horário aqui.
 *
 * NORMALIZAÇÃO (②): a lista `agendamentos` tem DOIS formatos convivendo:
 *   - V1 (criado aqui): { clienteNome, inicio:ISO(-03:00), endereco:{bairro}, zona, tipo, status:'confirmado', historico[] }
 *   - antigo (bot Telegram): { nome, endereco:"texto", data:'DD/MM/YYYY', hora:'HH:MM', timestamp, status:'agendado' }
 * `normalizarAgendamento()` funde os dois num shape único p/ exibir E p/ alimentar o motor.
 */

import {
  collection, query, orderBy, limit, onSnapshot,
  doc, getDoc, setDoc, addDoc, updateDoc, serverTimestamp
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';

import { calcularSlotsLivres, proximosSlots, MF_CONFIG } from './slotEngine.esm.js';

const AGENDAMENTOS_LIMIT = 500;
const OFFSET_BR = '-03:00';

let _db = null;
let _unsub = null;
let _agendamentos = [];   // docs crus de `agendamentos`
let _config = null;       // crm_config/agenda (ou MF_CONFIG)
let _leads = [];          // leads disponíveis p/ o seletor (setados pelo app.js)
let _onChange = null;     // callback p/ o app re-renderizar

// ── util local ────────────────────────────────────────────────────────
function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}
function pad(n) { return String(n).padStart(2, '0'); }

/** Firestore Timestamp | Date | número → epoch ms (ou null). */
function tsParaMs(ts) {
  if (ts == null) return null;
  if (typeof ts === 'number') return ts;
  if (typeof ts.toDate === 'function') return ts.toDate().getTime();
  if (typeof ts.seconds === 'number') return ts.seconds * 1000;
  const d = new Date(ts);
  return isNaN(d) ? null : d.getTime();
}
/** 'DD/MM/YYYY' + 'HH:MM' → ISO com offset -03:00 (ou null). */
function brParaISO(dataBR, hora) {
  if (!dataBR) return null;
  const [d, m, y] = String(dataBR).split('/').map(Number);
  const [h = 0, min = 0] = String(hora || '00:00').split(':').map(Number);
  if (!y || !m || !d) return null;
  return `${y}-${pad(m)}-${pad(d)}T${pad(h)}:${pad(min)}:00${OFFSET_BR}`;
}
/** epoch ms → ISO com offset -03:00 (aprox., mantém horário local BR). */
function msParaISO(ms) {
  // Assume relógio local já em BR; formata sem converter fuso.
  const d = new Date(ms);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:00${OFFSET_BR}`;
}
function fmtHora(iso) {
  try {
    return new Date(iso).toLocaleString('pt-BR', {
      weekday: 'short', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'
    });
  } catch { return String(iso); }
}

// ── NORMALIZAÇÃO (②): funde V1 + antigo (bot) ─────────────────────────
const STATUS_OCUPAM = ['confirmado', 'agendado']; // 'agendado' = legado do bot

export function normalizarAgendamento(a) {
  const inicioISO = a.inicio || brParaISO(a.data, a.hora) || (a.timestamp ? msParaISO(tsParaMs(a.timestamp)) : null);
  const inicioMs = inicioISO ? new Date(inicioISO).getTime() : (tsParaMs(a.timestamp) ?? null);
  const bairro = (a.endereco && typeof a.endereco === 'object' ? a.endereco.bairro : (typeof a.endereco === 'string' ? a.endereco : '')) || a.zona || '';
  const statusReal = a.status || 'pendente';
  return {
    id: a.id,
    clienteNome: a.clienteNome || a.nome || '(sem nome)',
    telefone: a.telefone || '',
    inicioISO, inicioMs,
    tipo: a.tipo || 'visita_tecnica',
    statusReal,
    ocupa: STATUS_OCUPAM.includes(statusReal),
    bairro,
    zona: a.zona || null,
    obs: a.observacoes || a.obs || '',
    origem: a.origem || '—',
    raw: a,
  };
}
/** Lista normalizada p/ o motor (só o que ocupa, status mapeado p/ 'confirmado'). */
function compromissosParaMotor() {
  return _agendamentos.map(normalizarAgendamento)
    .filter(n => n.ocupa && n.inicioISO)
    .map(n => ({ inicio: n.inicioISO, zona: n.zona, tipo: n.tipo, status: 'confirmado', diaInteiro: n.raw.diaInteiro === true }));
}

// ── 1. REALTIME ───────────────────────────────────────────────────────
export function pararRealtimeAgendamentos() { if (_unsub) { _unsub(); _unsub = null; } }

export function iniciarRealtimeAgendamentos(db, onUpdate, onError) {
  pararRealtimeAgendamentos();
  _db = db;
  if (!db || typeof onUpdate !== 'function') return null;
  _onChange = onUpdate;
  // Sem orderBy (os docs do bot não têm 'inicio'); ordenamos no cliente.
  const q = query(collection(db, 'agendamentos'), limit(AGENDAMENTOS_LIMIT));
  _unsub = onSnapshot(q,
    snap => {
      _agendamentos = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      onUpdate(_agendamentos, { total: _agendamentos.length, fromCache: snap.metadata.fromCache });
    },
    err => { console.error('[CRM-Agenda] onSnapshot erro:', err); if (typeof onError === 'function') onError(err); }
  );
  return _unsub;
}

export function setLeadsDisponiveis(lista) { _leads = Array.isArray(lista) ? lista : []; }

// ── 2. CONFIG ─────────────────────────────────────────────────────────
export async function carregarConfigAgenda(db) {
  _db = db;
  try {
    const snap = await getDoc(doc(db, 'crm_config', 'agenda'));
    _config = snap.exists() ? snap.data() : { ...MF_CONFIG, _origem: 'MF_CONFIG (default, ainda não salvo)' };
  } catch (err) {
    console.error('[CRM-Agenda] carregarConfigAgenda erro:', err);
    _config = { ...MF_CONFIG, _origem: 'MF_CONFIG (fallback)' };
  }
  return _config;
}
export async function salvarConfigAgenda(db, novaConfig) {
  await setDoc(doc(db, 'crm_config', 'agenda'), { ...novaConfig, atualizadoEm: serverTimestamp() }, { merge: true });
  _config = novaConfig; return true;
}

// ── 3. SLOTS LIVRES ───────────────────────────────────────────────────
export async function proximosHorariosLivres({ tipo = 'visita_tecnica', zona = null, n = 6, horizonteDias = 14 } = {}) {
  return proximosSlots({ config: _config || MF_CONFIG, compromissos: compromissosParaMotor(), tipo, zona, n, horizonteDias });
}
export async function horariosLivresNaJanela({ tipo = 'visita_tecnica', zona = null, deMs, ateMs, limite } = {}) {
  return calcularSlotsLivres({ config: _config || MF_CONFIG, compromissos: compromissosParaMotor(), tipo, zona, deMs, ateMs, limite });
}

// ── 4. GRAVAÇÃO (esquema V1) ──────────────────────────────────────────
export async function criarAgendamentoManual(db, dados) {
  const agora = new Date().toISOString();
  const status = dados.status || 'confirmado';
  const doc0 = {
    clienteNome: dados.clienteNome || '',
    telefone: dados.telefone || '',
    leadRef: dados.leadRef || null,
    tipo: dados.tipo || 'visita_tecnica',
    inicio: dados.inicio,                         // ISO -03:00
    fimEstimado: dados.fimEstimado || null,
    diaInteiro: dados.diaInteiro === true,
    endereco: dados.endereco || { bairro: dados.bairro || '', rua: '', lat: null, lng: null },
    zona: dados.zona || null,
    status,
    origem: 'crm_manual',
    observacoes: dados.observacoes || '',
    googleEventId: null,
    criadoEm: agora, atualizadoEm: agora,
    historico: [{ em: agora, de: null, para: status, por: 'marcos' }],
  };
  const ref = await addDoc(collection(db, 'agendamentos'), doc0);
  return ref.id;
}

export async function mudarStatusAgendamento(db, id, novoStatus, por = 'marcos') {
  const ref = doc(db, 'agendamentos', id);
  const atual = _agendamentos.find(a => a.id === id);
  const agora = new Date().toISOString();
  const historico = Array.isArray(atual?.historico) ? atual.historico.slice() : [];
  historico.push({ em: agora, de: atual?.status || null, para: novoStatus, por });
  await updateDoc(ref, { status: novoStatus, atualizadoEm: agora, historico });
  return true;
}

/** Edita campos de um agendamento (nome/telefone/obs/tipo/início). */
export async function editarAgendamento(db, id, campos) {
  const ref = doc(db, 'agendamentos', id);
  const patch = { atualizadoEm: new Date().toISOString() };
  // aceita chaves V1; se o doc for legado, grava as V1 (passa a ser híbrido consistente)
  ['clienteNome', 'telefone', 'tipo', 'inicio', 'observacoes', 'zona'].forEach(k => {
    if (campos[k] !== undefined) patch[k] = campos[k];
  });
  if (campos.bairro !== undefined) patch['endereco'] = { ...(campos.endereco || {}), bairro: campos.bairro };
  await updateDoc(ref, patch);
  return true;
}

// ── 5. RENDER da lista ────────────────────────────────────────────────
const BADGE = {
  confirmado: 'confirmado', agendado: 'confirmado', pendente: 'pendente',
  cancelado: 'cancelado', concluido: 'concluido', reagendar: 'pendente',
};

export function renderizarAgenda(agendamentos = _agendamentos) {
  const el = document.getElementById('agendaConteudo');
  const meta = document.getElementById('agendaMeta');
  if (!el) return;
  const norm = agendamentos.map(normalizarAgendamento)
    .sort((a, b) => (b.inicioMs || 0) - (a.inicioMs || 0));
  const ocup = norm.filter(n => n.ocupa).length;
  if (meta) meta.textContent = `${norm.length} agendamentos · ${ocup} ocupando a agenda · tempo real`;

  if (!norm.length) {
    el.innerHTML = `<div class="empty-state"><h3>📅 Nenhum agendamento</h3>
      <p>Clique num horário livre acima para agendar, ou use o bot Telegram.</p></div>`;
    return;
  }
  el.innerHTML = norm.map(n => {
    const badge = BADGE[n.statusReal] || 'pendente';
    const cancelado = n.statusReal === 'cancelado';
    return `
<div class="agenda-card glass-card${cancelado ? ' agenda-card--off' : ''}" data-id="${esc(n.id)}">
  <div class="agenda-head">
    <b>${esc(n.clienteNome)}</b>
    <span class="agenda-status agenda-status--${esc(badge)}">${esc(n.statusReal)}</span>
  </div>
  <p>🗓️ ${esc(fmtHora(n.inicioISO))} · ${esc(n.tipo)}</p>
  <p>📍 ${esc(n.bairro || '—')} · 📱 ${esc(n.telefone || '—')} · <span class="agenda-origem">${esc(n.origem)}</span></p>
  ${n.obs ? `<p class="agenda-obs">📝 ${esc(n.obs)}</p>` : ''}
  <div class="agenda-acoes">
    ${cancelado ? '' : `<button class="agenda-btn" data-acao="concluir" data-id="${esc(n.id)}">✅ Concluir</button>
    <button class="agenda-btn" data-acao="reagendar" data-id="${esc(n.id)}">🔁 Reagendar</button>
    <button class="agenda-btn" data-acao="editar" data-id="${esc(n.id)}">✏️ Editar</button>
    <button class="agenda-btn agenda-btn--danger" data-acao="cancelar" data-id="${esc(n.id)}">✖ Cancelar</button>`}
  </div>
</div>`;
  }).join('');
}

export async function renderizarSlotsLivres(opts = {}) {
  const el = document.getElementById('agendaSlotsLivres');
  if (!el) return;
  let slots = [];
  try { slots = await proximosHorariosLivres(opts); }
  catch (err) { el.innerHTML = `<p class="agenda-erro">Erro ao calcular slots: ${esc(err.message)}</p>`; return; }
  if (!slots.length) { el.innerHTML = `<p>Sem horários livres no horizonte pedido.</p>`; return; }
  el.innerHTML = slots.map(s =>
    `<button class="slot-livre" data-inicio="${esc(s.inicio)}" data-fim="${esc(s.fim || '')}">${esc(fmtHora(s.inicio))}</button>`
  ).join('');
}

// ── 6. MODAL de agendar / editar ──────────────────────────────────────
function buscarLeads(termo) {
  const t = (termo || '').toLowerCase().trim();
  if (!t) return [];
  return _leads.filter(l =>
    (l.nome || '').toLowerCase().includes(t) || (l.telefone || '').includes(t)
  ).slice(0, 6);
}

function fecharModalAgenda() {
  const m = document.getElementById('modalAgenda');
  if (m) { m.classList.remove('ativo'); m.setAttribute('aria-hidden', 'true'); }
}

/**
 * Abre o modal de agendamento.
 * @param {{inicio?:string, tipo?:string, editId?:string}} ctx
 */
export function abrirModalAgenda(ctx = {}) {
  let m = document.getElementById('modalAgenda');
  if (!m) {
    m = document.createElement('div');
    m.id = 'modalAgenda';
    m.className = 'modal-overlay';
    m.setAttribute('role', 'dialog');
    m.setAttribute('aria-modal', 'true');
    document.body.appendChild(m);
  }
  const editando = !!ctx.editId;
  const atual = editando ? normalizarAgendamento(_agendamentos.find(a => a.id === ctx.editId) || {}) : null;
  const inicioISO = ctx.inicio || atual?.inicioISO || '';

  m.innerHTML = `
  <div class="modal-box modal-agenda-box">
    <div class="modal-header">
      <h2 class="modal-title">${editando ? '✏️ Editar agendamento' : '📅 Novo agendamento'}</h2>
      <button type="button" class="btn-fechar" data-agenda-fechar aria-label="Fechar">✕</button>
    </div>
    <div class="modal-agenda-body">
      <label>Horário
        <input id="agInicio" type="text" value="${esc(inicioISO)}" placeholder="ISO -03:00" ${ctx.inicio ? 'readonly' : ''}>
        <small>${inicioISO ? esc(fmtHora(inicioISO)) : 'preencha o ISO ou volte e clique num horário livre'}</small>
      </label>
      <label>Cliente (busca lead ou digite nome novo)
        <input id="agCliente" type="text" autocomplete="off" value="${esc(atual?.clienteNome && atual.clienteNome !== '(sem nome)' ? atual.clienteNome : '')}" placeholder="ex.: Lucas Potter">
        <div id="agLeadSug" class="agenda-lead-sug"></div>
      </label>
      <label>Telefone
        <input id="agTelefone" type="text" value="${esc(atual?.telefone || '')}" placeholder="(21) 9...">
      </label>
      <div class="modal-agenda-row">
        <label>Tipo
          <select id="agTipo">
            ${['visita_tecnica', 'manutencao', 'laudo', 'homologacao'].map(t =>
              `<option value="${t}"${(ctx.tipo || atual?.tipo) === t ? ' selected' : ''}>${t}</option>`).join('')}
          </select>
        </label>
        <label>Bairro/zona
          <input id="agBairro" type="text" value="${esc(atual?.bairro || '')}" placeholder="ex.: Itaipuaçu">
        </label>
      </div>
      <label>Observações
        <textarea id="agObs" rows="2" placeholder="opcional">${esc(atual?.obs || '')}</textarea>
      </label>
    </div>
    <div class="modal-agenda-footer">
      <button type="button" class="btn-secondary" data-agenda-fechar>Cancelar</button>
      <button type="button" class="btn-primary" id="agSalvar" data-edit-id="${esc(ctx.editId || '')}">${editando ? 'Salvar alterações' : 'Agendar'}</button>
    </div>
  </div>`;
  m.classList.add('ativo');
  m.setAttribute('aria-hidden', 'false');

  // typeahead de leads
  const inpCliente = m.querySelector('#agCliente');
  const sug = m.querySelector('#agLeadSug');
  inpCliente?.addEventListener('input', () => {
    const achados = buscarLeads(inpCliente.value);
    sug.innerHTML = achados.map(l =>
      `<button type="button" class="agenda-lead-item" data-nome="${esc(l.nome || '')}" data-tel="${esc(l.telefone || '')}" data-id="${esc(l.id)}">
         ${esc(l.nome || '(sem nome)')} · ${esc(l.telefone || '')}</button>`).join('');
  });
  sug?.addEventListener('click', e => {
    const b = e.target.closest('.agenda-lead-item');
    if (!b) return;
    inpCliente.value = b.dataset.nome;
    m.querySelector('#agTelefone').value = b.dataset.tel;
    inpCliente.dataset.leadRef = b.dataset.id;
    sug.innerHTML = '';
  });
  m.querySelectorAll('[data-agenda-fechar]').forEach(b => b.addEventListener('click', fecharModalAgenda));
  m.addEventListener('click', e => { if (e.target === m) fecharModalAgenda(); });
}

/** Lê o modal e grava (novo ou edição). Retorna true/erro. */
export async function salvarDoModal() {
  const inicio = document.getElementById('agInicio')?.value.trim();
  const clienteNome = document.getElementById('agCliente')?.value.trim();
  const telefone = document.getElementById('agTelefone')?.value.trim();
  const tipo = document.getElementById('agTipo')?.value;
  const bairro = document.getElementById('agBairro')?.value.trim();
  const observacoes = document.getElementById('agObs')?.value.trim();
  const leadRef = document.getElementById('agCliente')?.dataset.leadRef || null;
  const editId = document.getElementById('agSalvar')?.dataset.editId || '';

  if (!inicio) throw new Error('Sem horário — clique num horário livre.');
  if (!clienteNome) throw new Error('Informe o cliente.');

  if (editId) {
    await editarAgendamento(_db, editId, { clienteNome, telefone, tipo, inicio, observacoes, bairro });
  } else {
    await criarAgendamentoManual(_db, { clienteNome, telefone, tipo, inicio, observacoes, bairro, leadRef, status: 'confirmado' });
  }
  fecharModalAgenda();
  return true;
}

// Getters
export function getAgendamentos() { return _agendamentos; }
export function getConfigAgenda() { return _config; }

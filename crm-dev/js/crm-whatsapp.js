// crm-whatsapp.js — [17/11/2026] Aba 💬 WhatsApp na ficha do lead (caminho A: robô Baileys da MF).
// Lê wa_conversas/{chave}/mensagens (o robô grava tudo) e envia criando wa_outbox/{id} (o robô manda pelo
// número da MF e PAUSA a IA nessa conversa). Todo texto vai para a tela com textContent (nunca innerHTML).
import {
  collection, doc, query, orderBy, limitToLast, onSnapshot, addDoc, updateDoc,
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';
import { toast } from './crm-utils.js';

let _db = null, _getLead = () => null, _unsubMsgs = null, _unsubConv = null, _chaveAtual = '';

export function chaveDe(tel) {
  const d = String(tel || '').replace(/\D/g, '');
  if (/^55\d{2}9\d{8}$/.test(d)) return d.slice(2);
  return /^\d{2}9\d{8}$/.test(d) ? d : '';   // só celular BR — nunca corta número estrangeiro
}

const ROTULO = { cliente: '👤 Cliente', robo: '🤖 Robô', marcos: '📱 Você (celular)', crm: '💻 Você (CRM)' };

function el(tag, attrs = {}, text) {
  const e = document.createElement(tag);
  Object.entries(attrs).forEach(([k, v]) => { if (k === 'style') e.style.cssText = v; else e.setAttribute(k, v); });
  if (text != null) e.textContent = text;
  return e;
}

function montarAba(box) {
  box.textContent = '';
  const topo = el('div', { style: 'display:flex;gap:6px;flex-wrap:wrap;align-items:center;margin-bottom:8px' });
  const info = el('span', { id: 'waInfo', style: 'font-size:12px;opacity:.8;flex:1' }, '');
  const bPausar = el('button', { type: 'button', class: 'btn-card', 'data-wa': 'pausar' }, '⏸️ Pausar robô nesta conversa');
  const bVoltar = el('button', { type: 'button', class: 'btn-card', 'data-wa': 'retomar' }, '▶️ Devolver ao robô');
  topo.append(info, bPausar, bVoltar);
  const lista = el('div', { id: 'waLista', style: 'height:340px;overflow:auto;padding:8px;border-radius:10px;background:rgba(0,0,0,.25);display:flex;flex-direction:column;gap:6px' });
  const form = el('div', { style: 'display:flex;gap:6px;margin-top:8px' });
  const txt = el('textarea', { id: 'waTexto', rows: '2', maxlength: '1500', placeholder: 'Escreva para o cliente… (vai pelo WhatsApp da MF e pausa o robô nesta conversa)', class: 'notas-internas', style: 'flex:1' });
  const bEnv = el('button', { type: 'button', class: 'btn-card', 'data-wa': 'enviar', style: 'background:#16a34a;color:#fff;border:none;min-width:90px' }, '📤 Enviar');
  form.append(txt, bEnv);
  const aviso = el('small', { style: 'opacity:.7;display:block;margin-top:4px' }, 'Fotos e áudios aparecem como "📎 mídia" — veja no celular. Envio sai em segundos; se o WhatsApp estiver desconectado, aparece ❌ com o motivo.');
  box.append(topo, lista, form, aviso);
  txt.addEventListener('keydown', (e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); bEnv.click(); } });
}

function renderMsgs(docs) {
  const lista = document.getElementById('waLista');
  if (!lista) return;
  lista.textContent = '';
  if (!docs.length) { lista.append(el('p', { style: 'opacity:.7;text-align:center;margin:auto' }, 'Nenhuma mensagem registrada ainda. As conversas passam a aparecer aqui a partir de 17/11/2026.')); return; }
  for (const m of docs) {
    const meu = m.de !== 'cliente';
    const b = el('div', { style: `max-width:80%;align-self:${meu ? 'flex-end' : 'flex-start'};background:${meu ? (m.de === 'robo' ? '#1e3a5f' : '#14532d') : '#334155'};padding:7px 10px;border-radius:10px;white-space:pre-wrap;word-break:break-word;font-size:13px` });
    b.append(el('div', { style: 'font-size:10px;opacity:.75;margin-bottom:2px' }, `${ROTULO[m.de] || m.de} · ${m.em ? new Date(m.em).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : ''}`));
    b.append(document.createTextNode(String(m.texto || '')));
    lista.append(b);
  }
  lista.scrollTop = lista.scrollHeight;
}

function parar() {
  if (_unsubMsgs) { _unsubMsgs(); _unsubMsgs = null; }
  if (_unsubConv) { _unsubConv(); _unsubConv = null; }
}

// Abre a conversa do lead atual (chamado quando a aba é aberta).
export function abrirConversa() {
  const box = document.getElementById('detalhe-whatsapp');
  const lead = _getLead();
  if (!box || !lead) return;
  parar();
  montarAba(box);
  const k = chaveDe(lead.telefone);
  _chaveAtual = k;
  const info = document.getElementById('waInfo');
  if (!k) { info.textContent = '⚠️ Telefone do lead inválido para WhatsApp.'; return; }
  info.textContent = '+55 ' + k.slice(0, 2) + ' ' + k.slice(2, 7) + '-' + k.slice(7);
  const conv = doc(_db, 'wa_conversas', k);
  _unsubMsgs = onSnapshot(query(collection(conv, 'mensagens'), orderBy('em'), limitToLast(150)),
    (s) => renderMsgs(s.docs.map(d => d.data())),
    (e) => { console.error('[CRM-WA]', e); renderMsgs([]); });
  _unsubConv = onSnapshot(conv, (s) => {
    if (s.exists() && (s.data().naoLidas || 0) > 0) updateDoc(conv, { naoLidas: 0, lidoEm: new Date().toISOString() }).catch(() => {});
  }, () => {});
}

// Pede ao robô para enviar (ou pausar/retomar). Devolve a promessa do resultado.
export async function pedirEnvio(lead, tipo, texto) {
  const k = chaveDe(lead && lead.telefone);
  if (!k) throw new Error('Telefone inválido');
  const pedido = { telefone: '55' + k, tipo, status: 'pendente', criadoEm: new Date().toISOString(), leadId: String(lead.id || '').slice(0, 40) };
  if (tipo === 'texto') pedido.texto = String(texto || '').slice(0, 1500);
  const ref = await addDoc(collection(_db, 'wa_outbox'), pedido);
  return new Promise((resolve) => {
    const t = setTimeout(() => { un(); resolve({ status: 'demorando' }); }, 45000);
    const un = onSnapshot(ref, (s) => {
      const st = s.exists() && s.data().status;
      if (st === 'enviado' || st === 'erro') { clearTimeout(t); un(); resolve(s.data()); }
    }, () => { clearTimeout(t); resolve({ status: 'erro', erro: 'sem permissão de leitura' }); });
  });
}

async function onClick(e) {
  const b = e.target.closest('[data-wa]');
  if (!b) return;
  const lead = _getLead();
  if (!lead) return;
  const acao = b.dataset.wa;
  b.disabled = true;
  try {
    if (acao === 'enviar') {
      const txt = document.getElementById('waTexto');
      const t = txt.value.trim();
      if (!t) return;
      if (/\bzer(ar|a|ou|ando)\b|conta\s+zerada/i.test(t) && !confirm('O texto fala em "zerar" a conta (regra da marca: "reduz até 95%"). Enviar mesmo assim?')) return;
      b.textContent = '⏳';
      const r = await pedirEnvio(lead, 'texto', t);
      if (r.status === 'enviado') { txt.value = ''; toast('Enviado pelo WhatsApp da MF — robô pausado nesta conversa', 'success'); }
      else if (r.status === 'demorando') toast('O robô ainda não confirmou — confira em instantes', 'info');
      else toast('❌ Não enviou: ' + (r.erro || 'erro'), 'error');
    } else {
      const r = await pedirEnvio(lead, acao);
      toast(r.status === 'enviado' ? (acao === 'pausar' ? 'Robô pausado nesta conversa' : 'Conversa devolvida ao robô') : ('❌ ' + (r.erro || 'sem confirmação')), r.status === 'enviado' ? 'success' : 'error');
    }
  } catch (err) { console.error('[CRM-WA]', err); toast('Erro: ' + (err.message || err), 'error'); }
  finally { b.disabled = false; if (acao === 'enviar') b.textContent = '📤 Enviar'; }
}

export function iniciarWhatsapp(db, getLeadAtual) {
  _db = db; _getLead = getLeadAtual;
  document.getElementById('modalDetalhes')?.addEventListener('click', onClick);
  document.getElementById('abasLead')?.addEventListener('click', (e) => {
    const t = e.target.closest('[data-aba]');
    if (!t) return;
    if (t.dataset.aba === 'abaWhatsapp') abrirConversa(); else parar();
  });
  document.getElementById('btnFecharModal')?.addEventListener('click', parar);
}

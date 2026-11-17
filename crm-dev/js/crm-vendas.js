// crm-vendas.js — [16/11/2026] Vendas automáticas (ideias da reunião com a gestora de tráfego).
// 1) Pré-orçamento curto no WhatsApp (com acréscimos fixos: telhado colonial, distância…)
// 2) Follow-up automático pós-proposta (o MOTOR roda no servidor dos bots: bot-shared/followUp.js).
//    Aqui o Marcos escreve/APROVA as mensagens, liga/desliga e vê o painel (qual mensagem faz o cliente responder).
// 3) Financiamento: status do pedido de simulação (Belenus agora; SolFácil depois). CPF NÃO é guardado no CRM.
// Leis MF: nunca "zerar" a conta (até 95%); técnico CFT (nunca engenheiro); o robô não inventa preço.
import { doc, getDoc, setDoc, updateDoc, deleteField } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';
import { toast, escHtml as esc } from './crm-utils.js';
import { pedirEnvio } from './crm-whatsapp.js';
import { BANCOS_PADRAO, definirTaxasBancos, taxasBancos, simularBancos, valorKit, resolverKitsLead } from './crm-finance.js';

const PROIBIDO = /\bzer(ar|a|ou|ando)\b|conta\s+zerada|\bengenheir/i;

export const ACRESCIMOS_PADRAO = [
  { nome: 'Telhado colonial (cerâmica)', valor: 300 },
  { nome: 'Distância > 20 km', valor: 100 },
  { nome: 'Estrutura elevada / laje', valor: 400 },
];

export const BOASVINDAS_PADRAO = { ativo: false, modoTeste: true, aprovado: false,
  texto: 'Oi, {nome}! Aqui é o Marcos, técnico responsável da MF Soluções Elétricas ☀️ Recebi o seu pedido de simulação pelo site e já estou montando o seu orçamento. Para ficar certinho, me manda por aqui uma foto da sua conta de luz e me diz o bairro do imóvel. Qualquer dúvida, é só falar!' };

export const FOLLOWUP_PADRAO = {
  ativo: false, modoTeste: true, horaIni: 9, horaFim: 19, maxPorRodada: 5,
  etapas: [
    { dia: 1,  aprovado: false, tema: 'Recebeu a proposta?', texto: 'Oi, {nome}! Aqui é o Marcos, da MF Soluções Elétricas. Conseguiu olhar a proposta que te mandei? Se ficou alguma dúvida, me fala que eu te explico por aqui ou por áudio.' },
    { dia: 3,  aprovado: false, tema: 'Parcela × conta de luz', texto: '{nome}, uma coisa que vale olhar na proposta: com o financiamento, a parcela costuma ficar perto do que você já paga hoje de luz. É trocar um gasto que vai embora todo mês por um sistema que fica seu. Quer que eu faça essa conta certinha para o seu caso?' },
    { dia: 6,  aprovado: false, tema: 'O técnico que fica', texto: '{nome}, aqui quem projeta, instala e assina o projeto sou eu, técnico responsável (CFT), e continuo atendendo depois da instalação. Nada de empresa que some depois da venda. Posso te ajudar em alguma dúvida?' },
    { dia: 10, aprovado: false, tema: 'Visita sem compromisso', texto: '{nome}, se preferir, faço uma visita sem compromisso para olhar o seu telhado e o seu padrão de entrada. Muitas vezes, na visita, consigo ajustar o projeto e melhorar o valor. Qual dia fica bom para você?' },
    { dia: 15, aprovado: false, tema: 'Obra recente em Maricá', texto: '{nome}, esta semana finalizamos mais uma instalação aqui na região. Se quiser, te mando fotos do serviço e como ficou a conta de luz desse cliente.' },
    { dia: 21, aprovado: false, tema: 'Lei 14.300 (Fio B)', texto: '{nome}, um detalhe importante: pela Lei 14.300, a parte da taxa de uso da rede (Fio B) que quem tem energia solar paga sobe a cada ano até 2028. Quanto antes o sistema estiver ligado, melhor. Quer que eu atualize a sua proposta?' },
    { dia: 30, aprovado: false, tema: 'Tirar dúvidas', texto: '{nome}, tudo bem? Ficou alguma dúvida sobre a energia solar que eu possa te ajudar? Garantia, manutenção, como funciona em dia nublado… pode perguntar à vontade.' },
    { dia: 45, aprovado: false, tema: 'Ainda tem interesse?', texto: '{nome}, passando para saber se você ainda tem interesse em reduzir a sua conta de luz. Se o momento não for agora, sem problema — me avisa que eu deixo para mais à frente.' },
    { dia: 60, aprovado: false, tema: 'Encerrar com educação', texto: '{nome}, vou encerrar o seu orçamento por aqui para não te incomodar. Quando quiser retomar, é só me chamar que eu atualizo os valores. Obrigado pela confiança!' },
  ],
  etapasFinanciamento: [
    { dia: 1,  aprovado: false, tema: 'Financiamento aprovado', texto: '{nome}, boa notícia: o seu financiamento foi aprovado! Quer que eu te mostre como fica a parcela comparada com a sua conta de luz de hoje?' },
    { dia: 4,  aprovado: false, tema: 'Marcar a visita', texto: '{nome}, com o financiamento aprovado, o próximo passo é a visita técnica para confirmar o projeto. Qual dia fica melhor para você?' },
    { dia: 8,  aprovado: false, tema: 'Garantir a condição', texto: '{nome}, a aprovação do banco não fica válida para sempre. Se quiser garantir essa condição, me avisa que eu já organizo tudo.' },
    { dia: 14, aprovado: false, tema: 'Alguma dúvida?', texto: '{nome}, ainda tenho a sua aprovação aqui. Ficou alguma dúvida que eu possa resolver para você seguir?' },
  ],
};

const ROT_TELHADO = { ceramica: 'cerâmica/colonial', colonial: 'cerâmica/colonial', fibrocimento: 'fibrocimento (Eternit)', metalico: 'metálico', laje: 'laje', solo: 'solo', outro: 'outro' };
const ROT_LIGACAO = { monofasico: 'monofásico', bifasico: 'bifásico', trifasico: 'trifásico' };
const ROT_ANDARES = { '1': '1 andar (térrea)', '2': '2 andares', '3+': '3 ou mais andares' };
const ROT_PAG = { vista: 'à vista', financiado: 'financiado', indefinido: 'ainda não sei' };
const ROT_FIN = { '': '—', nao: 'não pediu', pedido: 'simulação pedida', aprovado: 'aprovado ✅', negado: 'negado ❌' };

let _db = null, _getLead = () => null, _cfgVendas = null, _cfgFU = null, _getLeads = () => [];

const colDo = (lead) => (lead && lead.origemSistema === 'landing') ? 'lp_leads' : 'leads';
const num = (v) => { const n = parseFloat(String(v ?? '').replace(',', '.')); return Number.isFinite(n) ? n : 0; };
const brl = (v) => 'R$ ' + Math.round(v).toLocaleString('pt-BR');

async function lerCfg() {
  if (_cfgVendas && _cfgFU) return;
  try { const s = await getDoc(doc(_db, 'crm_config', 'vendas')); _cfgVendas = s.exists() ? s.data() : { acrescimos: ACRESCIMOS_PADRAO }; }
  catch (_) { _cfgVendas = { acrescimos: ACRESCIMOS_PADRAO }; }
  try { const s = await getDoc(doc(_db, 'crm_config', 'financiamento')); if (s.exists()) definirTaxasBancos(s.data()); } catch (_) {}
  try { const s = await getDoc(doc(_db, 'crm_config', 'followup')); _cfgFU = s.exists() ? s.data() : JSON.parse(JSON.stringify(FOLLOWUP_PADRAO)); }
  catch (_) { _cfgFU = JSON.parse(JSON.stringify(FOLLOWUP_PADRAO)); }
}

// ─── PRÉ-ORÇAMENTO ───────────────────────────────────────────────
export function montarPreOrcamento(lead, acrescimosEscolhidos = []) {
  const q = lead.qualificacao || {};
  const base = num(lead.investimento);
  const extra = acrescimosEscolhidos.reduce((s, a) => s + num(a.valor), 0);
  const local = [lead.bairro || q.bairro, lead.cidade || q.cidade].filter(Boolean).join(' – ') || 'Maricá e região';
  const telhado = ROT_TELHADO[lead.telhado || q.telhado] || lead.telhado || q.telhado || 'a confirmar na visita';
  const linhas = [
    '☀️ *PRÉ-ORÇAMENTO — MF Soluções Elétricas*',
    '',
    `📍 Local: ${local}`,
    `🏠 Telhado: ${telhado}`,
    lead.ligacao ? `🔌 Medidor: ${ROT_LIGACAO[lead.ligacao]}` : null,
    lead.geracao ? `⚡ Geração estimada: ~${Math.round(num(lead.geracao))} kWh/mês` : null,
    lead.placas ? `🔆 Módulos: ${lead.placas} placas${lead.kwp ? ` (${String(lead.kwp).replace('.', ',')} kWp)` : ''}` : null,
    `🔌 Inversor: ${lead.inversor ? lead.inversor : 'on-grid homologado na Enel (marca confirmada na visita)'}`,
    base ? `💰 Valor estimado: *${brl(base + extra)}*${extra ? ` (inclui ${acrescimosEscolhidos.map(a => a.nome.toLowerCase()).join(', ')})` : ''}` : '💰 Valor: envio após confirmar o consumo',
    '',
    'Reduz até 95% da sua conta de luz — sobra só a taxa mínima da Enel.',
    'Projeto assinado por técnico responsável (CFT) e homologado na Enel.',
    '',
    'É um pré-orçamento: o valor final sai na visita técnica, sem compromisso. Muitas vezes, na visita, consigo melhorar o valor.',
    '',
    '*Te atende?*',
  ].filter(l => l !== null);
  return linhas.join('\n');
}

function abrirWhatsTexto(lead, msg) {
  const numero = String(lead.telefone || '').replace(/\D/g, '').replace(/^55(?=\d{10,11}$)/, '');
  try { navigator.clipboard?.writeText(msg); } catch (_) {}
  if (numero.length >= 10) window.open('https://wa.me/55' + numero + '?text=' + encodeURIComponent(msg));
  else toast('Telefone inválido — texto copiado, cole no WhatsApp', 'info');
}

// ─── BLOCO NA FICHA DO LEAD ──────────────────────────────────────
export function renderBlocoVendas(lead) {
  const q = lead.qualificacao || {};
  const f = lead.followup || {};
  const fin = lead.financiamento || {};
  const acres = (_cfgVendas?.acrescimos || ACRESCIMOS_PADRAO);
  const status = String(lead.status || '').toLowerCase();
  let fuTxt = 'desligado para este lead (só roda nas colunas Proposta e Financiamento aprovado)';
  if (f.parado) fuTxt = '⏸️ pausado' + (f.motivoParada ? ` — ${esc(f.motivoParada)}` : '');
  else if (f.respondeuEm) fuTxt = `💬 cliente respondeu depois da mensagem ${Number.isInteger(f.respondeuNaEtapa) ? f.respondeuNaEtapa : '?'} — sequência parou`;
  else if (f.concluido) fuTxt = '✅ sequência concluída';
  else if (status === 'proposta' || status === 'financiamento') fuTxt = `🤖 ativo — ${Array.isArray(f.enviados) ? f.enviados.length : 0} mensagem(ns) enviada(s)${f.ultimoEnvioEm && !isNaN(Date.parse(f.ultimoEnvioEm)) ? ' · última ' + new Date(f.ultimoEnvioEm).toLocaleDateString('pt-BR') : ''}`;
  return `
<hr class="modal-divider">
<h3 style="margin:12px 0 6px;font-size:15px">🎯 Qualificação</h3>
<p>🔌 <b>Medidor:</b> ${esc(ROT_LIGACAO[lead.ligacao] || '—')} · 🏠 <b>Telhado:</b> ${esc(ROT_TELHADO[lead.telhado || q.telhado] || lead.telhado || q.telhado || '—')} · 🏢 <b>Andares:</b> ${esc(ROT_ANDARES[lead.andares] || '—')}</p>
<p>📍 <b>Bairro:</b> ${esc(lead.bairro || q.bairro || '—')} · 💳 <b>Pagamento:</b> ${esc(ROT_PAG[lead.pagamento || q.pagamento] || '—')}${(!lead.ligacao || !(lead.telhado || q.telhado) || !lead.andares) ? ' · <span style="color:#f59e0b">⚠️ complete em ✏️ Editar dados para precificar</span>' : ''}</p>

<h3 style="margin:14px 0 6px;font-size:15px">📲 Pré-orçamento rápido (WhatsApp)</h3>
<div id="vendasAcrescimos" style="display:flex;flex-wrap:wrap;gap:6px 14px;margin-bottom:8px;font-size:13px">
  ${acres.map((a, i) => `<label style="cursor:pointer"><input type="checkbox" data-acrescimo="${i}"> ${esc(a.nome)} (+${brl(num(a.valor))})</label>`).join('')}
</div>
<button type="button" data-vendas="preorcamento" class="btn-card" style="width:100%;background:#16a34a;color:#fff;border:none">📲 Enviar pré-orçamento pelo WhatsApp</button>
<small style="opacity:.7">Usa o kit selecionado + acréscimos marcados. Termina com "Te atende?". O texto também vai para a área de transferência.</small>

<h3 style="margin:14px 0 6px;font-size:15px">🤖 Follow-up automático</h3>
<p style="font-size:13px">${fuTxt}</p>
<div style="display:flex;gap:6px;flex-wrap:wrap">
  ${f.parado ? '<button type="button" data-vendas="fu-retomar" class="btn-card">▶️ Retomar</button>' : '<button type="button" data-vendas="fu-pausar" class="btn-card">⏸️ Pausar para este lead</button>'}
  <button type="button" data-vendas="fu-reiniciar" class="btn-card">🔁 Recomeçar sequência</button>
</div>

<h3 style="margin:14px 0 6px;font-size:15px">🏦 Financiamento</h3>
<div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;font-size:13px">
  <label>Situação<br><select id="vendasFinStatus" class="input-busca" style="width:100%">${Object.entries(ROT_FIN).map(([k, v]) => `<option value="${k}"${(fin.status || '') === k ? ' selected' : ''}>${v}</option>`).join('')}</select></label>
  <label>Banco<br><input id="vendasFinBanco" class="input-busca" style="width:100%" maxlength="40" value="${esc(fin.banco || '')}"></label>
  <label>Parcela (R$)<br><input id="vendasFinParcela" class="input-busca" style="width:100%" inputmode="decimal" value="${esc(fin.parcela || '')}"></label>
  <label>Nº de parcelas<br><input id="vendasFinPrazo" class="input-busca" style="width:100%" inputmode="numeric" value="${esc(fin.prazo || '')}"></label>
</div>
<div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:6px">
  <button type="button" data-vendas="fin-salvar" class="btn-card">💾 Salvar financiamento</button>
  <button type="button" data-vendas="fin-pedir" class="btn-card">📨 Texto p/ pedir simulação (Belenus)</button>
</div>
<small style="opacity:.7">O CPF do cliente NÃO fica no CRM: peça ao cliente e envie direto ao fornecedor. Marcar "aprovado" move o lead para a coluna 🏦 Financ. aprovado (follow-up próprio).</small>

<h3 style="margin:14px 0 6px;font-size:15px">🗓️ Fechamento futuro</h3>
<div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap">
  <input id="vendasRetorno" type="date" class="input-busca" value="${esc(lead.dataRetorno || '')}">
  <button type="button" data-vendas="futuro" class="btn-card">🗓️ Mover p/ Fechamento futuro e lembrar nesta data</button>
</div>`;
}

async function atualizarLead(lead, upd, msg) {
  await updateDoc(doc(_db, colDo(lead), lead.id), { ...upd, lastAction: new Date().toISOString() });
  Object.entries(upd).forEach(([k, v]) => {
    if (!k.includes('.')) { lead[k] = v; return; }
    const [a, b] = k.split('.'); lead[a] = lead[a] || {}; lead[a][b] = v;
  });
  if (msg) toast(msg, 'success');
}

async function onClickModal(e) {
  const btn = e.target.closest('[data-vendas]');
  if (!btn) return;
  const lead = _getLead();
  if (!lead) return toast('Lead não encontrado', 'error');
  const acao = btn.dataset.vendas;
  try {
    if (acao === 'preorcamento') {
      await lerCfg();
      const acres = (_cfgVendas.acrescimos || []);
      const marcados = [...document.querySelectorAll('#vendasAcrescimos [data-acrescimo]:checked')].map(c => acres[+c.dataset.acrescimo]).filter(Boolean);
      const msg = montarPreOrcamento(lead, marcados);
      if (PROIBIDO.test(msg)) return toast('Texto bloqueado pela regra da marca', 'error');
      // [17/11] Envia direto pelo WhatsApp da MF (robô) ou, se preferir, abre no seu WhatsApp.
      if (confirm('Enviar este pré-orçamento DIRETO pelo WhatsApp da MF?\n\nOK = o robô envia agora\nCancelar = abrir no seu WhatsApp\n\n' + msg)) {
        const r = await pedirEnvio(lead, 'texto', msg);
        if (r.status === 'enviado') toast('Pré-orçamento enviado pelo WhatsApp da MF', 'success');
        else { toast('Robô não confirmou (' + (r.erro || r.status) + ') — abrindo no seu WhatsApp', 'info'); abrirWhatsTexto(lead, msg); }
      } else abrirWhatsTexto(lead, msg);
      const hist = Array.isArray(lead.historico) ? lead.historico.slice() : [];
      hist.push({ acao: 'Pré-orçamento enviado pelo WhatsApp', data: new Date().toISOString() });
      await atualizarLead(lead, { preOrcamentoEm: new Date().toISOString(), historico: hist, ultima_acao_nome: 'Pré-orçamento enviado' });
    } else if (acao === 'fu-pausar') {
      await atualizarLead(lead, { 'followup.parado': true, 'followup.motivoParada': 'pausado pelo Marcos' }, 'Follow-up pausado para este lead');
    } else if (acao === 'fu-retomar') {
      await atualizarLead(lead, { 'followup.parado': false, 'followup.motivoParada': deleteField() }, 'Follow-up retomado');
    } else if (acao === 'fu-reiniciar') {
      if (!confirm('Recomeçar a sequência de follow-up deste lead do zero?')) return;
      await atualizarLead(lead, { followup: { inicioEm: new Date().toISOString(), trilha: String(lead.status) === 'financiamento' ? 'etapasFinanciamento' : 'etapas', etapa: 0 } }, 'Sequência recomeçada');
    } else if (acao === 'fin-salvar') {
      const st = document.getElementById('vendasFinStatus').value;
      const fin = { status: st, banco: document.getElementById('vendasFinBanco').value.trim().slice(0, 40),
        parcela: document.getElementById('vendasFinParcela').value.trim().slice(0, 12), prazo: document.getElementById('vendasFinPrazo').value.trim().slice(0, 4),
        atualizadoEm: new Date().toISOString() };
      const upd = { financiamento: fin };
      if (st === 'aprovado' && String(lead.status) !== 'financiamento') {
        upd.status = 'financiamento';
        upd.followup = { inicioEm: new Date().toISOString(), trilha: 'etapasFinanciamento', etapa: 0 };
        upd.ultima_acao_nome = 'Financiamento aprovado';
      }
      await atualizarLead(lead, upd, st === 'aprovado' ? 'Financiamento aprovado — lead na coluna 🏦' : 'Financiamento salvo');
    } else if (acao === 'fin-mandar') {
      const { kits } = resolverKitsLead(lead);
      const tipo = (lead.kitTipo && kits[lead.kitTipo]) ? lead.kitTipo : (kits.recomendado ? 'recomendado' : Object.keys(kits)[0]);
      const kit = kits[tipo];
      const valor = num(lead.investimento) || valorKit(kit);
      if (!valor) return toast('Sem valor de investimento — selecione um kit primeiro', 'error');
      const porBanco = {};
      simularBancos(valor).forEach(x => { if (!porBanco[x.banco] || x.parcela < porBanco[x.banco].parcela) porBanco[x.banco] = x; });
      const top = Object.values(porBanco).sort((a, b) => a.parcela - b.parcela).slice(0, 3);
      if (!top.length) return toast('Configure as taxas dos bancos em 🤖 Vendas automáticas', 'error');
      const conta = num(lead.valor || lead.contaDeLuz);
      const tx = taxasBancos();
      const dataTx = tx.atualizadoEm ? new Date(tx.atualizadoEm).toLocaleDateString('pt-BR') : new Date().toLocaleDateString('pt-BR');
      const nome = String(lead.nome || '').trim().split(/\s+/)[0] || '';
      const msg = [
        `☀️ *Simulação de financiamento — MF Soluções Elétricas*${nome ? `\n${nome}, segue como fica:` : ''}`,
        '',
        `Sistema: ${lead.kwp || kit?.kwp ? String(lead.kwp || kit.kwp).replace('.', ',') + ' kWp · ' : ''}valor ${brl(valor)}`,
        ...top.map(x => `🏦 ${x.banco}: ${x.prazo}x de *${brl(x.parcela)}*`),
        '',
        conta ? `Hoje sua conta é de ~${brl(conta)}. Com o sistema ela reduz até 95% (fica só a taxa mínima da Enel) — a parcela entra no lugar da conta.` : 'Com o sistema, a sua conta reduz até 95% (fica só a taxa mínima da Enel).',
        '',
        `_Simulação com as taxas de ${dataTx}. A parcela final depende da aprovação de crédito do banco._`,
        'Quer que eu peça a aprovação para você?',
      ].join('\n');
      if (PROIBIDO.test(msg)) return toast('Texto bloqueado pela regra da marca', 'error');
      if (confirm('Enviar esta simulação DIRETO pelo WhatsApp da MF?\n\nOK = o robô envia agora\nCancelar = abrir no seu WhatsApp\n\n' + msg)) {
        const r = await pedirEnvio(lead, 'texto', msg);
        if (r.status === 'enviado') toast('Simulação enviada pelo WhatsApp da MF', 'success');
        else { toast('Robô não confirmou (' + (r.erro || r.status) + ') — abrindo no seu WhatsApp', 'info'); abrirWhatsTexto(lead, msg); }
      } else abrirWhatsTexto(lead, msg);
      const hist = Array.isArray(lead.historico) ? lead.historico.slice() : [];
      hist.push({ acao: 'Simulação de financiamento enviada (' + top.map(x => x.banco + ' ' + x.prazo + 'x ' + x.parcela).join(' · ') + ')', data: new Date().toISOString() });
      await atualizarLead(lead, { simulacaoEnviadaEm: new Date().toISOString(), historico: hist });
    } else if (acao === 'fin-pedir') {
      const txt = `Olá! Pode simular um financiamento de energia solar para um cliente meu?\n\nValor do sistema: ${lead.investimento ? brl(num(lead.investimento)) : '(informar)'}\nPotência: ${lead.kwp ? lead.kwp + ' kWp' : '(informar)'}\nCidade: ${lead.cidade || 'Maricá-RJ'}\n\nO CPF do cliente vai na mensagem seguinte. Obrigado!`;
      try { await navigator.clipboard.writeText(txt); } catch (_) {}
      toast('Texto copiado — cole na conversa com o vendedor da Belenus', 'info');
      if (!lead.financiamento || !lead.financiamento.status) await atualizarLead(lead, { financiamento: { status: 'pedido', atualizadoEm: new Date().toISOString() } });
    } else if (acao === 'futuro') {
      const data = document.getElementById('vendasRetorno').value;
      if (!/^\d{4}-\d{2}-\d{2}$/.test(data)) return toast('Escolha a data de retorno', 'error');
      await atualizarLead(lead, { status: 'futuro', dataRetorno: data, ultima_acao_nome: 'Fechamento futuro (' + data.split('-').reverse().join('/') + ')' }, 'Lead em Fechamento futuro — aviso no Telegram nesta data');
    }
  } catch (err) {
    console.error('[CRM-Vendas]', acao, err);
    toast('Erro: ' + (err.message || err), 'error');
  }
}

// ─── PAINEL "VENDAS AUTOMÁTICAS" (config + estatística) ──────────
function estatisticas(leads) {
  const por = {};
  for (const l of leads) {
    const f = l.followup; if (!f || !Array.isArray(f.enviados)) continue;
    for (const env of f.enviados) {
      if (env.teste) continue;
      const k = (f.trilha || 'etapas') + ':' + env.etapa; por[k] = por[k] || { enviados: 0, respostas: 0 }; por[k].enviados++;
    }
    if (f.respondeuEm && Number.isInteger(f.respondeuNaEtapa) && f.respondeuNaEtapa > 0) {
      const k = (f.trilha || 'etapas') + ':' + (f.respondeuNaEtapa - 1); por[k] = por[k] || { enviados: 0, respostas: 0 }; por[k].respostas++;
    }
  }
  return por;
}

function htmlEtapas(lista, trilha, stats) {
  return lista.map((e, i) => {
    const s = stats[trilha + ':' + i] || { enviados: 0, respostas: 0 };
    const taxa = s.enviados ? Math.round((s.respostas / s.enviados) * 100) + '%' : '—';
    return `<div class="glass-card" style="padding:10px;margin-bottom:8px">
  <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;font-size:13px">
    <b>${i + 1}.</b> Dia <input data-fu="${trilha}:${i}:dia" type="number" min="0" max="120" value="${num(e.dia)}" style="width:60px" class="input-busca">
    <input data-fu="${trilha}:${i}:tema" value="${esc(e.tema || '')}" maxlength="40" class="input-busca" style="flex:1;min-width:140px" placeholder="assunto">
    <label style="cursor:pointer"><input data-fu="${trilha}:${i}:aprovado" type="checkbox"${e.aprovado ? ' checked' : ''}> <b>Aprovado</b></label>
    <span title="enviadas / responderam" style="opacity:.8">📊 ${s.enviados} env. · ${s.respostas} resp. · <b>${taxa}</b></span>
  </div>
  <textarea data-fu="${trilha}:${i}:texto" rows="3" maxlength="700" style="width:100%;margin-top:6px" class="notas-internas">${esc(e.texto || '')}</textarea>
</div>`;
  }).join('');
}

async function abrirPainel() {
  await lerCfg();
  const fu = _cfgFU;
  const bv = Object.assign({}, BOASVINDAS_PADRAO, fu.boasVindas || {});
  const stats = estatisticas(_getLeads());
  let m = document.getElementById('modalVendas');
  if (!m) {
    m = document.createElement('div'); m.id = 'modalVendas'; m.className = 'modal-overlay';
    m.setAttribute('role', 'dialog'); m.setAttribute('aria-modal', 'true');
    document.body.appendChild(m);
    m.addEventListener('click', (e) => { if (e.target === m || e.target.closest('[data-vendas-fechar]')) m.style.display = 'none'; });
    m.addEventListener('click', salvarPainel);
  }
  const ativosFU = _getLeads().filter(l => ['proposta', 'financiamento'].includes(String(l.status)) && !(l.followup && (l.followup.parado || l.followup.respondeuEm))).length;
  m.innerHTML = `<div class="modal-detalhes-box" style="max-width:860px">
  <div class="modal-header"><h2 class="modal-title">🤖 Vendas automáticas</h2><button type="button" class="btn-fechar" data-vendas-fechar aria-label="Fechar">✕</button></div>
  <div class="aba-scroll" style="padding:12px 16px;max-height:78vh;overflow:auto">
    <div class="glass-card" style="padding:12px;margin-bottom:12px;font-size:14px">
      <label style="cursor:pointer;margin-right:16px"><input id="fuAtivo" type="checkbox"${fu.ativo ? ' checked' : ''}> <b>Follow-up LIGADO</b></label>
      <label style="cursor:pointer;margin-right:16px"><input id="fuTeste" type="checkbox"${fu.modoTeste !== false ? ' checked' : ''}> <b>Modo teste</b> (manda a prévia só para o seu Telegram)</label>
      Horário: <input id="fuIni" type="number" min="6" max="20" value="${num(fu.horaIni) || 9}" style="width:52px" class="input-busca">h às <input id="fuFim" type="number" min="8" max="22" value="${num(fu.horaFim) || 19}" style="width:52px" class="input-busca">h (sábado só de manhã; domingo nunca)
      <p style="margin:8px 0 0;opacity:.8">${ativosFU} lead(s) hoje nas colunas Proposta/Financiamento. Só mensagens <b>Aprovadas</b> são enviadas; quando o cliente responde, a sequência para, o lead vai para 💬 Em negociação e você é avisado no Telegram. "{nome}" vira o primeiro nome do cliente.</p>
    </div>
    <h3 style="font-size:15px;margin:6px 0">👋 Boas-vindas a quem preenche o formulário do site</h3>
    <div class="glass-card" style="padding:10px;margin-bottom:12px;font-size:13px">
      <label style="cursor:pointer;margin-right:14px"><input id="bvAtivo" type="checkbox"${bv.ativo ? ' checked' : ''}> <b>Ligado</b></label>
      <label style="cursor:pointer;margin-right:14px"><input id="bvTeste" type="checkbox"${bv.modoTeste !== false ? ' checked' : ''}> <b>Modo teste</b> (prévia só no seu Telegram)</label>
      <label style="cursor:pointer"><input id="bvAprovado" type="checkbox"${bv.aprovado ? ' checked' : ''}> <b>Aprovado</b></label>
      <p style="margin:6px 0;opacity:.8">1 mensagem, ~2 min depois do envio do formulário (só quem enviou com o aviso de consentimento; nunca o "parcial"). Se o cliente já escreveu no WhatsApp, não manda. Das 8h às 21h — fora disso, sai às 8h.</p>
      <textarea id="bvTexto" rows="4" maxlength="700" style="width:100%" class="notas-internas">${esc(bv.texto || '')}</textarea>
    </div>
    <h3 style="font-size:15px;margin:6px 0">🟠 Depois da proposta (para quem não responde)</h3>
    ${htmlEtapas(fu.etapas || [], 'etapas', stats)}
    <h3 style="font-size:15px;margin:14px 0 6px">🏦 Financiamento aprovado</h3>
    ${htmlEtapas(fu.etapasFinanciamento || [], 'etapasFinanciamento', stats)}
    <h3 style="font-size:15px;margin:14px 0 6px">🏦 Taxas dos bancos (aba Financiamento)</h3>
    <p style="font-size:12px;opacity:.75;margin:0 0 6px">Atualize com a taxa do mês que o fornecedor/banco te passa. Prazos separados por vírgula. A aba Financiamento e a simulação enviada ao cliente usam estes números.</p>
    <div id="vendasBancosCfg">${(taxasBancos().bancos || BANCOS_PADRAO).map((b, i) => `<div style="display:flex;gap:6px;margin-bottom:6px;flex-wrap:wrap;align-items:center">
      <input data-bco="${i}:nome" value="${esc(b.nome)}" maxlength="30" class="input-busca" style="flex:1;min-width:110px" placeholder="Banco">
      <input data-bco="${i}:taxa" type="number" min="0" max="10" step="0.01" value="${num(b.taxaMes)}" class="input-busca" style="width:95px" title="% ao mês"> <span style="font-size:12px">% a.m.</span>
      <input data-bco="${i}:prazos" value="${esc((b.prazos || []).join(', '))}" maxlength="40" class="input-busca" style="width:140px" placeholder="24, 36, 48">
      <label style="font-size:12px;cursor:pointer"><input data-bco="${i}:ativo" type="checkbox"${b.ativo !== false ? ' checked' : ''}> ativo</label></div>`).join('')}
      <div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center"><input data-bco="novo:nome" maxlength="30" class="input-busca" style="flex:1;min-width:110px" placeholder="novo banco (opcional)"><input data-bco="novo:taxa" type="number" min="0" max="10" step="0.01" class="input-busca" style="width:95px" placeholder="%"> <span style="font-size:12px">% a.m.</span><input data-bco="novo:prazos" maxlength="40" class="input-busca" style="width:140px" placeholder="60, 72"><label style="font-size:12px"><input data-bco="novo:ativo" type="checkbox" checked> ativo</label></div>
    </div>
    <h3 style="font-size:15px;margin:14px 0 6px">➕ Acréscimos fixos do pré-orçamento</h3>
    <div id="vendasAcresCfg">${(_cfgVendas.acrescimos || []).map((a, i) => `<div style="display:flex;gap:6px;margin-bottom:6px"><input data-acr="${i}:nome" value="${esc(a.nome)}" maxlength="40" class="input-busca" style="flex:1"><input data-acr="${i}:valor" type="number" min="0" step="50" value="${num(a.valor)}" class="input-busca" style="width:110px"></div>`).join('')}
      <div style="display:flex;gap:6px"><input data-acr="novo:nome" placeholder="novo acréscimo (opcional)" maxlength="40" class="input-busca" style="flex:1"><input data-acr="novo:valor" type="number" min="0" step="50" placeholder="R$" class="input-busca" style="width:110px"></div>
    </div>
    <button type="button" data-vendas-salvar class="btn-card" style="width:100%;margin-top:14px;background:#16a34a;color:#fff;border:none;font-size:15px">💾 Salvar</button>
  </div></div>`;
  m.style.display = 'flex';
}

async function salvarPainel(e) {
  if (!e.target.closest('[data-vendas-salvar]')) return;
  const fu = JSON.parse(JSON.stringify(_cfgFU));
  fu.ativo = document.getElementById('fuAtivo').checked;
  fu.modoTeste = document.getElementById('fuTeste').checked;
  fu.horaIni = Math.min(20, Math.max(6, num(document.getElementById('fuIni').value) || 9));
  fu.horaFim = Math.min(22, Math.max(fu.horaIni + 1, num(document.getElementById('fuFim').value) || 19));
  fu.boasVindas = { ativo: document.getElementById('bvAtivo').checked, modoTeste: document.getElementById('bvTeste').checked,
    aprovado: document.getElementById('bvAprovado').checked, texto: document.getElementById('bvTexto').value.trim().slice(0, 700) };
  if (PROIBIDO.test(fu.boasVindas.texto)) return toast('Regra da marca: tire "zerar"/"engenheiro" da mensagem de boas-vindas', 'error');
  const erros = [];
  document.querySelectorAll('#modalVendas [data-fu]').forEach(el => {
    const [trilha, i, campo] = el.dataset.fu.split(':');
    const et = fu[trilha][+i];
    if (campo === 'aprovado') et.aprovado = el.checked;
    else if (campo === 'dia') et.dia = Math.max(0, Math.min(120, Math.round(num(el.value))));
    else et[campo] = el.value.trim();
    if (campo === 'texto' && PROIBIDO.test(et.texto)) erros.push(`${trilha === 'etapas' ? 'Proposta' : 'Financiamento'} ${+i + 1}`);
  });
  if (erros.length) return toast('Regra da marca: tire "zerar"/"engenheiro" das mensagens ' + erros.join(', '), 'error');
  ['etapas', 'etapasFinanciamento'].forEach(t => fu[t].sort((a, b) => a.dia - b.dia));
  const acres = [];
  const linhas = {};
  document.querySelectorAll('#modalVendas [data-acr]').forEach(el => { const [i, c] = el.dataset.acr.split(':'); (linhas[i] = linhas[i] || {})[c] = el.value; });
  Object.values(linhas).forEach(a => { if (String(a.nome || '').trim() && num(a.valor) > 0) acres.push({ nome: a.nome.trim().slice(0, 40), valor: Math.round(num(a.valor)) }); });
  try {
    await setDoc(doc(_db, 'crm_config', 'followup'), { ...fu, atualizadoEm: new Date().toISOString() });
    await setDoc(doc(_db, 'crm_config', 'vendas'), { acrescimos: acres, atualizadoEm: new Date().toISOString() });
    const bl = {};
    document.querySelectorAll('#modalVendas [data-bco]').forEach(el => { const [i, c] = el.dataset.bco.split(':'); (bl[i] = bl[i] || {})[c] = el.type === 'checkbox' ? el.checked : el.value; });
    const bancos = Object.values(bl).map(b => ({ nome: String(b.nome || '').trim().slice(0, 30), taxaMes: Math.max(0, Math.min(10, num(b.taxa))),
      prazos: String(b.prazos || '').split(/[,; ]+/).map(n => Math.round(num(n))).filter(n => n >= 6 && n <= 120).slice(0, 8), ativo: b.ativo !== false }))
      .filter(b => b.nome && b.taxaMes > 0 && b.prazos.length);
    if (bancos.length) { const finCfg = { bancos, atualizadoEm: new Date().toISOString() }; await setDoc(doc(_db, 'crm_config', 'financiamento'), finCfg); definirTaxasBancos(finCfg); }
    _cfgFU = fu; _cfgVendas = { acrescimos: acres };
    toast(fu.ativo ? (fu.modoTeste ? 'Salvo — follow-up em MODO TESTE (prévias no Telegram)' : 'Salvo — follow-up LIGADO para clientes') : 'Salvo — follow-up desligado', 'success');
    document.getElementById('modalVendas').style.display = 'none';
  } catch (err) { console.error('[CRM-Vendas] salvar', err); toast('Erro ao salvar: ' + err.message, 'error'); }
}

export function iniciarVendas(db, getLeadAtual, getLeads) {
  _db = db; _getLead = getLeadAtual; _getLeads = getLeads || (() => []);
  lerCfg();
  document.getElementById('modalDetalhes')?.addEventListener('click', onClickModal);
  document.getElementById('btnVendasAuto')?.addEventListener('click', abrirPainel);
}

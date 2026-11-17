/**
 * crm-documentos.js — Aba "📂 Documentos" do lead (Fase 1, 11/11/2026).
 *
 * Um lugar só por cliente: os DADOS DO PROJETO (conta, maior mês, kit, preço, telhado, ligação) ficam no próprio
 * lead (campo `projeto`) e TODOS os documentos usam os mesmos números — acabou proposta dizendo uma coisa e cotação
 * outra. Cada documento gerado entra no histórico do lead (`documentos[]`).
 *
 * Regras da MF que este módulo aplica (não mudar sem o Marcos):
 *  - Dimensionamento = MAIOR mês do histórico + 50 kWh de folga.
 *  - Geração Maricá ≈ 96,8 kWh por kWp/mês (calibrado no projeto do Jasson, PVGIS) — mesma do motor de propostas.
 *  - A conta NUNCA zera: economia = mín(geração × tarifa ; conta − piso da ligação). Piso ~R$80 mono / ~R$105 bi / ~R$200 tri.
 *  - `leads` ≠ `lp_leads`: grava na coleção de origem do lead.
 */
import { doc, updateDoc, arrayUnion } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';
import { abrirProposta } from './crm-proposal.js';
import { abrirCotacaoKit } from './crm-cotacao-kit.js';
import { toast, escHtml as esc } from './crm-utils.js';

export const GERACAO_KWH_KWP_MES = 96.8;
export const MARGEM_FOLGA_KWH = 50;
export const TARIFA_PADRAO = 1.54916;
export const PISO_LIGACAO = { monofasico: 80, bifasico: 105, trifasico: 200 };
const INVERSORES_KW = [3, 5, 6, 7.5, 10, 15];

let _db = null;
let _getLead = () => null;

const num = (v) => {
  if (typeof v === 'number') return isFinite(v) ? v : 0;
  const n = Number(String(v ?? '').replace(/[^\d,.-]/g, '').replace(/\.(?=\d{3}(\D|$))/g, '').replace(',', '.'));
  return isFinite(n) ? n : 0;
};
const brl = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const colecao = (lead) => (lead?.origemSistema === 'landing' ? 'lp_leads' : 'leads');

/** Cálculo puro (testável): maior mês + 50 → placas, kWp, inversor, geração, economia. */
export function calcularKit({ maiorMes, wp = 710, conta = 0, ligacao = 'bifasico', tarifa = TARIFA_PADRAO, placas = 0 }) {
  const alvo = num(maiorMes) > 0 ? num(maiorMes) + MARGEM_FOLGA_KWH : 0;
  const w = num(wp) || 710;
  const n = num(placas) || (alvo ? Math.ceil((alvo / GERACAO_KWH_KWP_MES) * 1000 / w) : 0);
  const kwp = Math.round(n * w / 10) / 100;
  const geracao = Math.round(kwp * GERACAO_KWH_KWP_MES);
  const inversorKw = INVERSORES_KW.find((k) => kwp / k <= 1.30) || INVERSORES_KW[INVERSORES_KW.length - 1];
  const piso = PISO_LIGACAO[ligacao] ?? PISO_LIGACAO.bifasico;
  const c = num(conta);
  const economia = c ? Math.round(Math.min(geracao * (num(tarifa) || TARIFA_PADRAO), Math.max(0, c - piso)) * 100) / 100 : 0;
  return { alvo, placas: n, kwp, geracao, inversorKw, piso, economia };
}

export function iniciarDocumentos(db, getLead) {
  _db = db;
  _getLead = getLead;
}

function campo(label, id, value, attrs = '') {
  return `<label style="display:flex;flex-direction:column;gap:3px;font-size:12px;color:#94a3b8">${label}
    <input id="${id}" value="${esc(value ?? '')}" ${attrs}
      style="padding:7px 9px;border-radius:7px;border:1px solid #334155;background:#0f172a;color:#e2e8f0;font-size:14px"></label>`;
}
function select(label, id, value, opcoes) {
  return `<label style="display:flex;flex-direction:column;gap:3px;font-size:12px;color:#94a3b8">${label}
    <select id="${id}" style="padding:7px 9px;border-radius:7px;border:1px solid #334155;background:#0f172a;color:#e2e8f0;font-size:14px">
    ${opcoes.map(([v, t]) => `<option value="${v}" ${v === value ? 'selected' : ''}>${t}</option>`).join('')}</select></label>`;
}
const BTN = 'padding:10px;border:none;border-radius:8px;font-weight:700;cursor:pointer;color:#fff;font-size:13px';

export function renderAbaDocumentos(lead) {
  const el = document.getElementById('detalhe-documentos');
  if (!el || !lead) return;
  const p = lead.projeto || {};
  const conta = p.conta ?? lead.valor ?? lead.contaDeLuz ?? '';
  const docs = Array.isArray(lead.documentos) ? [...lead.documentos].reverse() : [];

  el.innerHTML = `
    <h3 style="margin:4px 0 10px;font-size:15px">📐 Projeto deste cliente <small style="color:#94a3b8;font-weight:400">— os documentos usam estes números</small></h3>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
      ${campo('💡 Conta de luz (R$/mês)', 'doc-conta', conta, 'inputmode="decimal"')}
      ${campo('📈 Maior mês do histórico (kWh)', 'doc-maiormes', p.maiorMes ?? lead.consumoMensal ?? '', 'inputmode="numeric"')}
      ${campo('🔆 Potência da placa (Wp)', 'doc-wp', p.wp ?? lead.potenciaPlaca ?? 710, 'inputmode="numeric"')}
      ${campo('🧩 Nº de placas', 'doc-placas', p.placas ?? lead.placas ?? '', 'inputmode="numeric"')}
      ${campo('⚡ Inversor (marca / modelo)', 'doc-inversor', p.inversor ?? lead.inversor ?? 'Deye SUN-5K-G05P1 — 5 kW — 2 MPPT — 220 V')}
      ${campo('💰 Valor de venda (R$)', 'doc-preco', p.preco ?? lead.investimento ?? '', 'inputmode="decimal"')}
      ${select('🏠 Telhado', 'doc-telhado', p.telhado || ({ ceramica: 'colonial' }[lead.telhado] || lead.telhado) || 'fibrocimento', [['fibrocimento', 'Fibrocimento'], ['colonial', 'Colonial (cerâmica)'], ['metalico', 'Metálico / zipado'], ['laje', 'Laje'], ['solo', 'Solo']])}
      ${select('🔌 Ligação', 'doc-ligacao', p.ligacao || lead.ligacao || 'bifasico', [['monofasico', 'Monofásico'], ['bifasico', 'Bifásico'], ['trifasico', 'Trifásico']])}
    </div>
    <div id="doc-resumo" style="margin:10px 0;padding:10px;border-radius:8px;background:#0b1220;border:1px solid #1e293b;font-size:13px;line-height:1.6"></div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
      <button type="button" id="doc-calcular" style="${BTN};background:#7c3aed">🧮 Calcular kit (maior mês + 50)</button>
      <button type="button" id="doc-salvar" style="${BTN};background:#16a34a">💾 Salvar projeto</button>
    </div>

    <h3 style="margin:18px 0 8px;font-size:15px">📂 Gerar documentos</h3>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
      <button type="button" data-doc="ambos" style="${BTN};background:#2563eb;grid-column:1/-1">📄📦 Proposta + Cotação (os 2 do cliente)</button>
      <button type="button" data-doc="proposta" style="${BTN};background:#1d4ed8">📄 Proposta</button>
      <button type="button" data-doc="cotacao" style="${BTN};background:#0090d4">📦 Cotação de materiais</button>
      <button type="button" disabled title="Fase 2 — via MF Control Center no PC" style="${BTN};background:#334155;opacity:.6;cursor:not-allowed">📐 Diagrama unifilar (em breve)</button>
      <button type="button" disabled title="Fase 2" style="${BTN};background:#334155;opacity:.6;cursor:not-allowed">📑 Laudos / orçamento (em breve)</button>
    </div>

    <h3 style="margin:18px 0 8px;font-size:15px">🗂️ Histórico de documentos</h3>
    <div id="doc-historico" style="font-size:13px">${docs.length ? docs.map((d) => `
      <div style="display:flex;justify-content:space-between;gap:8px;padding:7px 0;border-bottom:1px solid #1e293b">
        <span>${d.tipo === 'cotacao' ? '📦 Cotação' : d.tipo === 'ambos' ? '📄📦 Proposta + Cotação' : '📄 Proposta'} · ${esc(String(d.kwp ?? '—'))} kWp · ${brl(d.valor)}</span>
        <span style="color:#94a3b8">${esc(new Date(d.em).toLocaleString('pt-BR'))}</span></div>`).join('')
      : '<p style="color:#64748b">Nenhum documento gerado ainda.</p>'}</div>`;

  const ler = () => ({
    conta: num(document.getElementById('doc-conta').value),
    maiorMes: num(document.getElementById('doc-maiormes').value),
    wp: num(document.getElementById('doc-wp').value) || 710,
    placas: num(document.getElementById('doc-placas').value),
    inversor: document.getElementById('doc-inversor').value.trim(),
    preco: num(document.getElementById('doc-preco').value),
    telhado: document.getElementById('doc-telhado').value,
    ligacao: document.getElementById('doc-ligacao').value,
  });
  const resumo = () => {
    const f = ler(); const k = calcularKit(f);
    document.getElementById('doc-resumo').innerHTML = k.placas
      ? `☀️ <b>${k.placas} × ${f.wp} Wp = ${String(k.kwp).replace('.', ',')} kWp</b> · gera ≈ <b>${k.geracao} kWh/mês</b>` +
        (k.alvo ? ` <small style="color:#94a3b8">(alvo ${k.alvo} kWh)</small>` : '') +
        `<br>💸 Economia ≈ <b>${brl(k.economia)}/mês</b> · conta fica ≈ <b>${brl(Math.max(f.conta - k.economia, 0))}</b> <small style="color:#94a3b8">(piso ENEL ${brl(k.piso)} — não zera)</small>` +
        (f.preco && k.economia ? `<br>⏳ Retorno ≈ <b>${(f.preco / (k.economia * 12)).toFixed(1).replace('.', ',')} anos</b>` : '')
      : '<span style="color:#94a3b8">Informe o maior mês da conta e clique em 🧮 Calcular kit.</span>';
  };
  el.querySelectorAll('input,select').forEach((i) => i.addEventListener('input', resumo));
  resumo();

  document.getElementById('doc-calcular').onclick = () => {
    const f = ler();
    if (!f.maiorMes) { toast('Informe o maior mês do histórico (kWh)', 'error'); return; }
    const k = calcularKit({ ...f, placas: 0 });
    document.getElementById('doc-placas').value = k.placas;
    if (!document.getElementById('doc-inversor').value.trim() || /deye/i.test(document.getElementById('doc-inversor').value)) {
      document.getElementById('doc-inversor').value = `Deye — ${String(k.inversorKw).replace('.', ',')} kW — 2 MPPT — 220 V`;
    }
    resumo(); toast(`Kit: ${k.placas} placas · ${k.kwp} kWp`, 'success');
  };

  document.getElementById('doc-salvar').onclick = () => salvarProjeto(lead.id, ler());
  el.querySelectorAll('[data-doc]').forEach((b) => { b.onclick = () => gerar(lead.id, b.dataset.doc, ler()); });
}

/** Grava o projeto no lead e espelha nos campos que a proposta/cotação já leem. */
async function salvarProjeto(id, f, silencioso = false) {
  const lead = _getLead(id);
  if (!lead || !_db) return null;
  const k = calcularKit(f);
  if (!k.placas) { toast('Calcule o kit (ou informe o nº de placas) antes de salvar', 'error'); return null; }
  const kit = { nome: 'Kit do projeto', kwp: k.kwp, placas: k.placas, geracao: k.geracao, investimento: f.preco,
    economia: k.economia, payback: f.preco && k.economia ? +(f.preco / (k.economia * 12)).toFixed(1) : 0, inversor: f.inversor };
  const updates = {
    projeto: { ...f, kwp: k.kwp, geracao: k.geracao, economia: k.economia, piso: k.piso, atualizadoEm: new Date().toISOString() },
    valor: f.conta, contaDeLuz: f.conta, consumoMensal: f.maiorMes || lead.consumoMensal || null,
    placas: k.placas, potenciaPlaca: f.wp, kwp: k.kwp, geracao: k.geracao, geracaoMensal: k.geracao,
    investimento: f.preco, economia: k.economia, payback: kit.payback, inversor: f.inversor, tarifa: TARIFA_PADRAO, piso: k.piso,
    kitsDisponiveis: { recomendado: kit }, kitEscolhido: 'recomendado', telhado: f.telhado,
  };
  try {
    await updateDoc(doc(_db, colecao(lead), id), updates);
    Object.assign(lead, updates);
    if (!silencioso) toast('Projeto salvo no lead', 'success');
    return lead;
  } catch (e) {
    console.error('[CRM-Documentos] salvar:', e);
    toast('Erro ao salvar o projeto', 'error');
    return null;
  }
}

async function gerar(id, tipo, f) {
  const lead = await salvarProjeto(id, f, true);
  if (!lead) return;
  if (!f.preco) { toast('Informe o valor de venda antes de gerar', 'error'); return; }
  localStorage.setItem('cotacaoTelhado', f.telhado);
  let ok = true;
  if (tipo === 'proposta' || tipo === 'ambos') ok = abrirProposta(lead) && ok;
  if (tipo === 'cotacao' || tipo === 'ambos') {
    const c = abrirCotacaoKit(lead);
    if (!c && tipo === 'ambos') toast('O navegador bloqueou a 2ª janela — clique em 📦 Cotação', 'info');
  }
  try {
    await updateDoc(doc(_db, colecao(lead), id), {
      documentos: arrayUnion({ tipo, em: new Date().toISOString(), kwp: lead.kwp, valor: f.preco, placas: lead.placas }),
    });
    (lead.documentos = lead.documentos || []).push({ tipo, em: new Date().toISOString(), kwp: lead.kwp, valor: f.preco });
  } catch (e) { console.warn('[CRM-Documentos] histórico:', e.message); }
  if (ok) toast('Documento(s) gerado(s) — use 🖨️ para salvar o PDF', 'success');
  renderAbaDocumentos(lead);
}

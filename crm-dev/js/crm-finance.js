/**
 * crm-finance.js — Kits, financiamentos e render da aba financeira
 */

import { margemKit, CUSTO } from './crm-custo.js';

export function resolverKitsLead(lead) {
  if (lead?.kitsDisponiveis && typeof lead.kitsDisponiveis === 'object') {
    return { kits: lead.kitsDisponiveis, estimado: false };
  }
  if (lead?.kits && typeof lead.kits === 'object') {
    return { kits: lead.kits, estimado: false };
  }
  return { kits: calcularKitsFallback(lead), estimado: true };
}

export function calcularKitsFallback(lead) {
  const conta = parseFloat(lead?.valor || lead?.contaDeLuz) || 500;
  const tarifa = parseFloat(lead?.tarifa) || 0.95;
  const hsp = parseFloat(lead?.hsp) || 4.5;
  const potPlaca = parseFloat(lead?.potenciaPlaca) || 580;
  const consumoMensal = conta / tarifa;
  const fatorGeracao = 107;
  const baseKwp = consumoMensal / fatorGeracao;

  const calcInv = k => {
    if (k <= 4) return k * 3600;
    if (k <= 8) return k * 3400;
    if (k <= 12) return k * 3200;
    if (k <= 20) return k * 3000;
    return k * 2850;
  };

  const RESIDUO_MINIMO = 85; // CIP (~R$30) + mínimo bifásico ENEL (~R$55)

  const buildKit = (fator, nome) => {
    const kwp = (Math.ceil((baseKwp * fator * 1000) / potPlaca) * potPlaca) / 1000;
    const placas = Math.ceil((baseKwp * fator * 1000) / potPlaca);
    const geracao = kwp * hsp * 30 * 0.80;
    const economia = Math.min(geracao * tarifa, Math.max(conta - RESIDUO_MINIMO, 0));
    const investimento = calcInv(kwp);
    const payback = investimento / (economia * 12);
    return {
      nome,
      kwp: +kwp.toFixed(2),
      geracao: +geracao.toFixed(0),
      economia: +economia.toFixed(0),
      investimento: +investimento.toFixed(0),
      payback: +payback.toFixed(1),
      placas
    };
  };

  return {
    essencial: buildKit(0.8, 'Essencial'),
    recomendado: buildKit(1.1, 'Recomendado ⭐'),
    premium: buildKit(1.3, 'Premium')
  };
}

function calcularParcela(valor, taxa, meses) {
  const v = Number(valor) || 0;
  if (!v) return '0';
  return ((v * taxa) / (1 - Math.pow(1 + taxa, -meses))).toFixed(0);
}

// [17/11/2026] Taxas por banco configuráveis no CRM (🤖 Vendas automáticas → 🏦 Taxas dos bancos).
// Padrão = as taxas que estavam fixas no código. A parcela final SEMPRE depende da análise de crédito do banco.
export const BANCOS_PADRAO = [
  { nome: 'Santander', taxaMes: 1.99, prazos: [24, 36, 48], ativo: true },
  { nome: 'BV', taxaMes: 2.15, prazos: [48], ativo: true },
  { nome: 'Sicoob', taxaMes: 1.85, prazos: [60], ativo: true },
  { nome: 'Bradesco', taxaMes: 2.20, prazos: [72], ativo: true },
];
let _taxas = { bancos: BANCOS_PADRAO, atualizadoEm: null };
export function definirTaxasBancos(cfg) { if (cfg && Array.isArray(cfg.bancos) && cfg.bancos.length) _taxas = cfg; }
export function taxasBancos() { return _taxas; }
export function valorKit(kit) { return Number(String(kit?.investimento ?? '').replace(/[^\d.,]/g, '').replace(',', '.')) || Number(kit?.investimento) || 0; }
// Lista [{ banco, prazo, parcela, taxaMes }] para um valor, com as taxas configuradas.
export function simularBancos(valor) {
  const v = Number(valor) || 0; const out = [];
  if (!v) return out;
  for (const b of (_taxas.bancos || [])) {
    if (b.ativo === false) continue;
    const taxa = (Number(b.taxaMes) || 0) / 100;
    for (const n of (b.prazos || [])) {
      const meses = Number(n) || 0; if (!meses) continue;
      const parcela = taxa > 0 ? (v * taxa) / (1 - Math.pow(1 + taxa, -meses)) : v / meses;
      out.push({ banco: String(b.nome || 'Banco'), prazo: meses, parcela: Math.round(parcela), taxaMes: Number(b.taxaMes) || 0 });
    }
  }
  return out;
}

export function gerarFinanciamentos(kits, contaDeLuz) {
  const bancos = { santander: 0.0199, bv: 0.0215, sicoob: 0.0185, bradesco: 0.0220 };
  const result = {};
  Object.entries(kits || {}).forEach(([tipo, kit]) => {
    const v = Number(String(kit.investimento).replace(/\D/g, '')) || Number(kit.investimento) || 0;
    result[tipo] = {
      santander24: calcularParcela(v, bancos.santander, 24),
      santander36: calcularParcela(v, bancos.santander, 36),
      santander48: calcularParcela(v, bancos.santander, 48),
      bv48: calcularParcela(v, bancos.bv, 48),
      sicoob60: calcularParcela(v, bancos.sicoob, 60),
      bradesco72: calcularParcela(v, bancos.bradesco, 72),
      contaLuz: contaDeLuz
    };
  });
  return result;
}

export function renderHtmlKitResumo(lead, esc) {
  const { kits, estimado } = resolverKitsLead(lead);
  const escolhido = lead.kitEscolhido || lead.sistema || lead.sistemaEscolhido || '—';
  const inv = Number(lead.investimento || 0);
  const tag = estimado ? ' <small style="color:#f59e0b">(estimado)</small>' : '';

  const deslText = CUSTO.deslocamento.filter(d => d.valor > 0).map(d => `${d.regiao} −R$${d.valor}`).join(' · ');
  const cards = Object.entries(kits).map(([tipo, kit]) => {
    const m = margemKit(kit.kwp, kit.investimento);
    return `
<div class="glass-card" style="padding:12px;margin-bottom:8px;font-size:13px">
  <b style="color:var(--verde-acento)">${esc(kit.nome)}</b>
  <p style="margin:6px 0 0">📦 ${kit.kwp} kWp · 🧩 ${kit.placas} placas · ⚡ ${kit.geracao} kWh/mês</p>
  <p style="margin:4px 0 0">💰 R$ ${Number(kit.investimento).toLocaleString('pt-BR')} · 💸 R$ ${kit.economia}/mês · ⏳ ${kit.payback}a</p>
  <button data-selecionar-kit="${tipo}"
    data-kit-nome="${esc(kit.nome)}"
    data-kit-kwp="${kit.kwp}"
    data-kit-placas="${kit.placas}"
    data-kit-geracao="${kit.geracao}"
    data-kit-investimento="${kit.investimento}"
    data-kit-economia="${kit.economia}"
    data-kit-payback="${kit.payback}"
    style="margin-top:8px;padding:5px 14px;background:#22c55e;color:#fff;border:none;border-radius:6px;font-size:12px;font-weight:700;cursor:pointer">
    ✅ Selecionar
  </button>
  <button type="button" onclick="const d=this.nextElementSibling;d.style.display=d.style.display==='none'?'block':'none'"
    style="margin-top:8px;margin-left:6px;padding:5px 12px;background:#334155;color:#fff;border:none;border-radius:6px;font-size:12px;font-weight:700;cursor:pointer">
    🔒 Ver custo
  </button>
  <div style="display:none;margin-top:8px;padding:8px;border:1px dashed #f59e0b;border-radius:6px;font-size:12px;line-height:1.6">
    <b style="color:#f59e0b">🔒 Interno — NÃO mostrar ao cliente</b><br>
    Custo do kit (Bel Energy): <b>R$ ${m.custo.toLocaleString('pt-BR')}</b> <small style="color:#9ca3af">(~R$ ${String(CUSTO.custoWpKit.completo).replace('.', ',')}/Wp)</small><br>
    Margem (Maricá, sem deslocamento): <b style="color:#22c55e">R$ ${m.margem.toLocaleString('pt-BR')} (${m.pct}%)</b><br>
    <small style="color:#9ca3af">Deslocamento (subtrair da margem): ${deslText}</small>
  </div>
</div>`;
  }).join('');

  return `
<h3 style="margin:16px 0 8px;font-size:15px">🏷️ Kit selecionado</h3>
<p><b>${esc(escolhido)}</b>${inv ? ` · Investimento lead: <b>R$ ${inv.toLocaleString('pt-BR')}</b>` : ''}</p>
<h3 style="margin:16px 0 8px;font-size:15px">📦 Kits disponíveis${tag}</h3>
${cards}`;
}

export function renderHtmlFinanciamento(lead, esc) {
  const { kits, estimado } = resolverKitsLead(lead);
  const conta = parseFloat(lead.valor || lead.contaDeLuz) || 0;
  const tx = taxasBancos();
  const dataTaxas = tx.atualizadoEm ? new Date(tx.atualizadoEm).toLocaleDateString('pt-BR') : 'padrão do sistema (configure em 🤖 Vendas automáticas)';

  const kitHtml = Object.entries(kits).map(([tipo, kit]) => `
<div class="glass-card" style="padding:16px;margin-bottom:12px">
  <div style="font-size:18px;font-weight:700;color:var(--verde-acento);margin-bottom:10px">⚡ ${esc(kit.nome)}</div>
  <p>📦 Potência: <b>${kit.kwp} kWp</b></p>
  <p>⚡ Geração: <b>${kit.geracao} kWh/mês</b></p>
  <p>💰 Investimento: <b>R$ ${Number(kit.investimento).toLocaleString('pt-BR')}</b></p>
  <p>💸 Economia: <b>R$ ${kit.economia}/mês</b></p>
  <p>🧩 Placas: <b>${kit.placas}</b></p>
  <p>⏳ Payback: <b>${kit.payback} anos</b></p>
  <button data-selecionar-kit="${tipo}"
    data-kit-nome="${esc(kit.nome)}"
    data-kit-kwp="${kit.kwp}"
    data-kit-placas="${kit.placas}"
    data-kit-geracao="${kit.geracao}"
    data-kit-investimento="${kit.investimento}"
    data-kit-economia="${kit.economia}"
    data-kit-payback="${kit.payback}"
    style="margin-top:10px;padding:7px 18px;background:#22c55e;color:#fff;border:none;border-radius:8px;font-size:13px;font-weight:700;cursor:pointer">
    ✅ Selecionar este kit
  </button>
</div>`).join('');

  const parcColor = (parcela, c) => Number(parcela) <= c ? '#22c55e' : '#f59e0b';

  const finHtml = Object.entries(kits).map(([tipo, kit]) => {
    const sims = simularBancos(valorKit(kit));
    const linhas = sims.length ? sims.map(x => `<div class="glass-card" style="padding:10px;display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap">
      <span>🏦 <b>${esc(x.banco)}</b> <small style="color:#94a3b8">${String(x.taxaMes).replace('.', ',')}% a.m.</small></span>
      <span>${x.prazo}x de <b style="color:${x.parcela <= conta ? '#22c55e' : '#f59e0b'}">R$ ${x.parcela.toLocaleString('pt-BR')}</b></span></div>`).join('')
      : '<p style="color:#94a3b8">Sem valor de investimento neste kit.</p>';
    return `
<div class="glass-card" style="padding:16px;margin-bottom:12px">
  <div style="font-size:16px;font-weight:700;color:var(--verde-acento);margin-bottom:12px">💳 ${esc(kit?.nome || tipo.toUpperCase())} <small style="color:#94a3b8;font-weight:400">— R$ ${valorKit(kit).toLocaleString('pt-BR')}</small></div>
  <div style="display:grid;gap:8px">${linhas}</div>
  <p style="margin-top:8px;font-size:12px;color:#9ca3af">Conta atual: R$ ${conta.toFixed(0)}/mês — verde = parcela ≤ conta</p>
</div>`;
  }).join('');
  const avisoTaxas = `<div class="glass-card" style="padding:10px 12px;margin-bottom:12px;font-size:12px;line-height:1.5">
  📅 Taxas de: <b>${esc(dataTaxas)}</b>. Simulação — a parcela final depende da análise de crédito do banco (registre o valor aprovado na ficha do lead, seção 🏦 Financiamento).
  <div style="margin-top:8px"><button type="button" data-vendas="fin-mandar" style="padding:8px 14px;border:none;border-radius:8px;background:#16a34a;color:#fff;font-weight:700;font-size:13px;cursor:pointer">📲 Mandar simulação ao cliente</button></div>
</div>`;

  const melhor = Object.entries(kits).sort((a, b) => a[1].payback - b[1].payback)[0];
  const rec = melhor ? `<p style="margin-bottom:16px">⭐ <b>Recomendação:</b> ${esc(melhor[1].nome)} (menor payback: ${melhor[1].payback}a)</p>` : '';

  return `
<h2 style="margin:0 0 16px">⚡ Dimensionamento${estimado ? ' <small style="color:#f59e0b;font-size:12px">(estimado)</small>' : ''}</h2>
${rec}
${kitHtml}
<hr style="border-color:rgba(255,255,255,0.08);margin:20px 0">
<h2 style="margin:0 0 16px">💳 Financiamentos</h2>
${avisoTaxas}
${finHtml}`;
}

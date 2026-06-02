/**
 * crm-proposal.js — Abre proposta.html com dados reais do lead
 */

import { resolverKitsLead, gerarFinanciamentos } from './crm-finance.js';

export function montarPayloadProposta(lead) {
  const { kits } = resolverKitsLead(lead);
  const conta = lead.valor ?? lead.contaDeLuz ?? 0;
  const geracao = Number(lead.geracaoMensal || lead.geracao || kits?.recomendado?.geracao || 0);
  const inv = lead.investimento || kits?.recomendado?.investimento || 0;
  return {
    ...lead,
    nome: lead.nome || 'Cliente',
    telefone: lead.telefone || '',
    endereco: lead.endereco || '',
    valor: lead.valor ?? lead.contaDeLuz ?? 0,
    contaDeLuz: lead.contaDeLuz ?? lead.valor ?? 0,
    consumo: lead.consumoMensal ?? lead.consumo ?? '',
    consumoMensal: lead.consumoMensal ?? lead.consumo ?? '',
    geracao,
    geracaoMensal: geracao,
    kwp: lead.kwp || kits?.recomendado?.kwp || 0,
    placas: lead.placas || kits?.recomendado?.placas || 0,
    potenciaPlaca: lead.potenciaPlaca || 550,
    inversor: lead.inversor || lead.sistemaEscolhido || '-',
    investimento: inv,
    economia: lead.economia || kits?.recomendado?.economia || 0,
    payback: lead.payback || kits?.recomendado?.payback || 0,
    kitsDisponiveis: kits,
    kits,
    financiamentos: lead.financiamentos || gerarFinanciamentos(kits, conta),
    tarifa: lead.tarifa || 0.95,
    hsp: lead.hsp || 4.5,
    kitEscolhido: lead.kitEscolhido || '',
    sistema: lead.sistema || lead.sistemaEscolhido || '',
    utm_source: lead.utm_source || 'direto',
    utm_campaign: lead.utm_campaign || '-'
  };
}

export function abrirProposta(lead) {
  if (!lead) {
    return false;
  }

  const payload = montarPayloadProposta(lead);

  localStorage.setItem('leadSelecionado', JSON.stringify(payload));
  localStorage.setItem('geracaoMensal', String(payload.geracaoMensal || 1200));
  localStorage.setItem('nomePdf', `PROPOSTA SOLAR - ${(payload.nome || 'CLIENTE').toUpperCase()}`);

  if (payload.kitsDisponiveis) {
    localStorage.setItem('kitsDisponiveis', JSON.stringify(payload.kitsDisponiveis));
  }
  if (payload.kits) {
    localStorage.setItem('kitsCalculados', JSON.stringify(payload.kits));
  }
  if (payload.financiamentos) {
    localStorage.setItem('financiamentosLead', JSON.stringify(payload.financiamentos));
  }

  localStorage.setItem('propostaAbertaEm', new Date().toISOString());

  // Ensure explicit field mapping required by the legacy proposta.html
  try {
    localStorage.setItem('nome', String(payload.nome || ''));
    localStorage.setItem('telefone', String(payload.telefone || ''));
    localStorage.setItem('endereco', String(payload.endereco || ''));
    localStorage.setItem('consumo', String(payload.consumoMensal || payload.consumo || ''));
    localStorage.setItem('geracao', String(payload.geracaoMensal || payload.geracao || ''));
    localStorage.setItem('kwp', String(payload.kwp || ''));
    localStorage.setItem('placas', String(payload.placas || ''));
    localStorage.setItem('investimento', String(payload.investimento || ''));
    localStorage.setItem('economia', String(payload.economia || ''));
    localStorage.setItem('payback', String(payload.payback || ''));
  } catch (e) {
    // ignore storage errors
  }

  // open proposal page from CRM public root (explicit absolute path)
  window.open(location.origin + '/proposta.html', '_blank');
  return true;
}

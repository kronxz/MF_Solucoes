/**
 * crm-cotacao-kit.js — Abre cotacao-kit.html (lista de materiais do kit) com dados do lead.
 * Mesmo padrão do crm-proposal.js: monta payload → localStorage → abre a página.
 * Documento p/ o cliente (lista de materiais, SEM preço interno).
 */
import { resolverKitsLead } from './crm-finance.js';
import { telhadoDoLead } from './crm-telhado.mjs';

export function abrirCotacaoKit(lead) {
  if (!lead) return false;

  const { kits } = resolverKitsLead(lead);
  const tipo = lead.kitEscolhido || lead.sistema || 'recomendado';
  const kit = kits[tipo] || kits.recomendado || kits.essencial || Object.values(kits)[0] || {};

  const payload = {
    cliente: lead.nome || 'Cliente',
    telefone: lead.telefone || '',
    endereco: lead.endereco || '',
    concessionaria: lead.concessionaria || 'ENEL RJ',
    kitNome: kit.nome || 'Kit Fotovoltaico',
    kwp: Number(kit.kwp) || 0,
    placas: Number(kit.placas) || 0,
    geracao: Number(kit.geracao) || 0,
    potenciaPlaca: Number(lead.potenciaPlaca) || 550,
    investimento: Number(String(lead.investimento || kit.investimento || 0).replace(/[^\d,.-]/g, '').replace(/\.(?=\d{3}(\D|$))/g, '').replace(',', '.')) || 0,
    inversor: kit.inversor || lead.inversor || '',
    // Envia o telhado junto do kit; a página não depende de uma preferência global/localStorage.
    telhado: telhadoDoLead(lead),
    numero: 'COT-' + new Date().getFullYear() + '-' + String(lead.id || '').slice(-5).toUpperCase(),
    geradoEm: new Date().toISOString()
  };

  localStorage.setItem('cotacaoKit', JSON.stringify(payload));
  if (payload.telhado) localStorage.setItem('cotacaoTelhado', payload.telhado);
  localStorage.setItem('nomePdfCotacao', `COTACAO KIT - ${(payload.cliente || 'CLIENTE').toUpperCase()}`);
  const w = window.open('cotacao-kit.html', '_blank');
  return !!w;
}

/** Normaliza os valores de telhado usados pelas diferentes telas do CRM. */
export function normalizarTipoTelhado(valor) {
  const texto = String(valor ?? '').trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  if (!texto) return '';
  if (texto.includes('colonial') || texto.includes('ceramica')) return 'colonial';
  if (texto.includes('fibrocimento') || texto.includes('eternit')) return 'fibrocimento';
  if (texto.includes('metal') || texto.includes('zinco') || texto.includes('zipad') || texto.includes('aco')) return 'metalico';
  if (texto.includes('laje')) return 'laje';
  if (texto.includes('solo')) return 'solo';
  return '';
}

/** A edição do lead é a fonte mais recente; projeto é fallback para cadastros antigos. */
export function telhadoDoLead(lead) {
  return normalizarTipoTelhado(lead?.telhado)
    || normalizarTipoTelhado(lead?.projeto?.telhado)
    || normalizarTipoTelhado(lead?.qualificacao?.telhado);
}

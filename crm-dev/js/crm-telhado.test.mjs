import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizarTipoTelhado, telhadoDoLead } from './crm-telhado.mjs';

test('normaliza rótulos de cerâmica e colonial para o valor consumido pela cotação', () => {
  assert.equal(normalizarTipoTelhado('ceramica'), 'colonial');
  assert.equal(normalizarTipoTelhado('Cerâmica / colonial'), 'colonial');
  assert.equal(normalizarTipoTelhado('Telha colonial (cerâmica)'), 'colonial');
});

test('prioriza o telhado editado no lead quando o projeto guardou um valor antigo', () => {
  assert.equal(telhadoDoLead({ telhado: 'ceramica', projeto: { telhado: 'fibrocimento' } }), 'colonial');
});

test('usa o telhado do projeto e da qualificação como fallback', () => {
  assert.equal(telhadoDoLead({ telhado: '', projeto: { telhado: 'Telha colonial' } }), 'colonial');
  assert.equal(telhadoDoLead({ qualificacao: { telhado: 'Eternit' } }), 'fibrocimento');
  assert.equal(telhadoDoLead({}), '');
});

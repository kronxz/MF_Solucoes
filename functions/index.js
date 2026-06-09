/**
 * CC-10A — Telegram Alert Center
 * MF Soluções — Cloud Functions
 *
 * Observa: lp_leads (Landing Page) + leads (CRM/Calculadora)
 * Entrega: mensagem Telegram para Marcos em < 5 segundos
 *
 * REGRAS:
 * - Não escreve no Firestore
 * - Não altera documentos
 * - Não cria coleções
 * - Não interfere com CRM, LP, Action Center ou Bot WhatsApp
 */

const functions = require('firebase-functions');
const admin     = require('firebase-admin');
const https     = require('https');

admin.initializeApp();

// ── Configurações (firebase functions:config:set telegram.token="..." telegram.chat_id="...") ──
function getTelegramConfig() {
  const cfg = functions.config().telegram || {};
  return {
    token:  cfg.token  || '',
    chatId: cfg.chat_id || ''
  };
}

// ─────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────

/**
 * Calcula temperatura a partir do score (mesma lógica do scoreService.js)
 * score >= 70 → Quente | score >= 30 → Morno | else → Fria
 */
function calcularTemperatura(score) {
  if (score >= 70) return 'Quente';
  if (score >= 30) return 'Morno';
  return 'Fria';
}

/**
 * Calcula prioridade conforme CC10A_PRIORIZACAO.md
 * Retorna { nivel, emoji, label, acao }
 */
function calcularPrioridade(lead, colecao) {
  const score = Number(lead.score) || 0;

  // Prioridade base pelo score
  let nivel;
  if (score >= 70)      nivel = 4; // 🔴 ESCALDANTE
  else if (score >= 50) nivel = 3; // 🟠 QUENTE
  else if (score >= 30) nivel = 2; // 🟡 MORNO
  else                  nivel = 1; // ⚪ FRIO

  // Elevação contextual: leads do CRM chegam como MORNO mínimo
  if (colecao === 'leads' && score <= 10) {
    nivel = Math.max(nivel, 2);
  }

  // Elevadores: apenas lp_leads (cliquesWhatsapp e valorConta)
  if (colecao === 'lp_leads') {
    const cliques    = Number(lead.cliquesWhatsapp) || 0;
    const valorConta = Number(String(lead.valorConta || '0').replace(/\D/g, '')) || 0;
    if (cliques    >= 1)   nivel = Math.min(nivel + 1, 4);
    if (valorConta >= 500) nivel = Math.min(nivel + 1, 4);
  }

  const labels = {
    4: { emoji: '🔴', label: 'ESCALDANTE', acao: 'Ligar AGORA' },
    3: { emoji: '🟠', label: 'QUENTE',     acao: 'Ligar em 5 min' },
    2: { emoji: '🟡', label: 'MORNO',      acao: 'Ligar hoje' },
    1: { emoji: '⚪', label: 'FRIO',        acao: 'Ligar em 24h' }
  };
  return labels[nivel];
}

/**
 * Normaliza campos entre as duas coleções para formato unificado
 */
function normalizarLead(dados, colecao) {
  // createdAt: lp_leads usa string ISO, leads usa Firestore Timestamp
  let criadoEm;
  try {
    if (colecao === 'lp_leads') {
      criadoEm = dados.createdAt ? new Date(dados.createdAt) : new Date();
    } else {
      criadoEm = dados.createdAt ? dados.createdAt.toDate() : new Date();
    }
  } catch (_) {
    criadoEm = new Date();
  }

  return {
    nome:        dados.nome       || 'Não informado',
    telefone:    dados.telefone   || 'Não informado',
    score:       Number(dados.score) || 0,
    origem:      dados.utm_source || dados.origem || 'Direto',
    temperatura: colecao === 'lp_leads'
      ? calcularTemperatura(Number(dados.score) || 0)
      : (dados.temperatura || calcularTemperatura(Number(dados.score) || 0)),
    conta: colecao === 'lp_leads'
      ? (dados.valorConta   ? `R$ ${dados.valorConta}`   : 'Não informado')
      : (dados.contaDeLuz   ? `R$ ${dados.contaDeLuz}`   : 'Não informado'),
    cidade: colecao === 'lp_leads'
      ? 'Não informado'
      : (dados.endereco || 'Não informado'),
    cliquesWhatsapp: Number(dados.cliquesWhatsapp) || 0,
    criadoEm
  };
}

/**
 * Formata a mensagem HTML para o Telegram
 */
function formatarMensagem(lead, prioridade, colecao, docId) {
  const hora = lead.criadoEm.toLocaleTimeString('pt-BR', {
    hour: '2-digit', minute: '2-digit',
    timeZone: 'America/Sao_Paulo'
  });
  const data = lead.criadoEm.toLocaleDateString('pt-BR', {
    day: '2-digit', month: '2-digit',
    timeZone: 'America/Sao_Paulo'
  });

  const fonte = colecao === 'lp_leads' ? '🌐 Landing Page' : '📊 CRM/Calculadora';

  return (
    `${prioridade.emoji} <b>NOVO LEAD SOLAR — ${prioridade.label}</b>\n` +
    `\n` +
    `👤 <b>Nome:</b> ${lead.nome}\n` +
    `📱 <b>Telefone:</b> ${lead.telefone}\n` +
    `📍 <b>Cidade:</b> ${lead.cidade}\n` +
    `💡 <b>Conta de Luz:</b> ${lead.conta}\n` +
    `📣 <b>Origem:</b> ${lead.origem}\n` +
    `🌡️ <b>Temperatura:</b> ${lead.temperatura}\n` +
    `⚡ <b>Prioridade:</b> ${prioridade.emoji} ${prioridade.label}\n` +
    `📌 <b>Fonte:</b> ${fonte}\n` +
    `🕐 <b>Recebido:</b> ${data} às ${hora}\n` +
    `\n` +
    `<i>→ ${prioridade.acao}</i>`
  );
}

/**
 * Envia mensagem via Telegram Bot API (usando https nativo — sem dependências extras)
 */
function enviarTelegram(token, chatId, mensagem) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify({
      chat_id:    chatId,
      text:       mensagem,
      parse_mode: 'HTML'
    });

    const options = {
      hostname: 'api.telegram.org',
      path:     `/bot${token}/sendMessage`,
      method:   'POST',
      headers:  {
        'Content-Type':   'application/json',
        'Content-Length': Buffer.byteLength(payload)
      }
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', chunk => { body += chunk; });
      res.on('end', () => {
        try {
          const json = JSON.parse(body);
          if (json.ok) {
            resolve(json.result);
          } else {
            reject(new Error(`Telegram API error ${res.statusCode}: ${json.description || body}`));
          }
        } catch (e) {
          reject(new Error(`Telegram parse error: ${body}`));
        }
      });
    });

    req.on('error', reject);
    req.setTimeout(10000, () => {
      req.destroy(new Error('Telegram request timeout (10s)'));
    });

    req.write(payload);
    req.end();
  });
}

// ─────────────────────────────────────────────────────────────────
// HANDLER PRINCIPAL (compartilhado pelas duas coleções)
// ─────────────────────────────────────────────────────────────────

async function processarNovoLead(snap, context, colecao) {
  const docId = snap.id;
  const dados = snap.data();

  console.log(`[TelegramAlert] Trigger recebido: ${colecao}/${docId}`);

  // Validação mínima
  if (!dados) {
    console.warn(`[TelegramAlert] Documento vazio: ${colecao}/${docId}`);
    return null;
  }

  // Normalização
  const lead      = normalizarLead(dados, colecao);
  const prioridade = calcularPrioridade(dados, colecao);

  console.log(`[TelegramAlert] Lead normalizado — nome: ${lead.nome} | score: ${lead.score} | prioridade: ${prioridade.label} | colecao: ${colecao}`);

  // Credenciais
  const { token, chatId } = getTelegramConfig();
  if (!token || !chatId) {
    console.error('[TelegramAlert] ERRO: telegram.token ou telegram.chat_id não configurados. Execute: firebase functions:config:set telegram.token="..." telegram.chat_id="..."');
    return null;
  }

  // Formatar mensagem
  const mensagem = formatarMensagem(lead, prioridade, colecao, docId);

  // Enviar com fallback
  try {
    const result = await enviarTelegram(token, chatId, mensagem);
    console.log(`[TelegramAlert] ✅ Enviado com sucesso — message_id: ${result.message_id} | ${colecao}/${docId}`);
    return result;
  } catch (erro) {
    console.error(`[TelegramAlert] ❌ Falha no envio principal: ${erro.message}`);

    // Fallback: mensagem simplificada sem HTML
    const fallback = `⚠️ NOVO LEAD — ${lead.nome} | ${lead.telefone}\nFonte: ${colecao} | Erro no formato original`;
    try {
      const result = await enviarTelegram(token, chatId, fallback);
      console.log(`[TelegramAlert] ✅ Fallback enviado — message_id: ${result.message_id}`);
      return result;
    } catch (erroFallback) {
      // Não relança — Cloud Function não deve falhar para não acionar retry indesejado
      console.error(`[TelegramAlert] ❌ Fallback também falhou: ${erroFallback.message} | ${colecao}/${docId}`);
      return null;
    }
  }
}

// ─────────────────────────────────────────────────────────────────
// FASE 3 — TRIGGERS FIRESTORE
// ─────────────────────────────────────────────────────────────────

/**
 * Trigger 1: Landing Page → lp_leads
 */
exports.alertarLeadLP = functions
  .region('southamerica-east1')
  .firestore
  .document('lp_leads/{leadId}')
  .onCreate((snap, context) => processarNovoLead(snap, context, 'lp_leads'));

/**
 * Trigger 2: CRM / Calculadora → leads
 */
exports.alertarLeadCRM = functions
  .region('southamerica-east1')
  .firestore
  .document('leads/{leadId}')
  .onCreate((snap, context) => processarNovoLead(snap, context, 'leads'));

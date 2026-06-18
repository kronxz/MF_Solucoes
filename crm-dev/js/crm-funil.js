/**
 * crm-funil.js — Funil de Vendas: mensagens WhatsApp prontas por categoria
 */

import { toast } from './crm-utils.js';

const CATEGORIAS = [
  {
    id: 'primeiro-contato',
    titulo: '👋 Primeiro Contato',
    cor: '#3b82f6',
    mensagens: [
      {
        label: 'Apresentação inicial',
        texto: `Olá! Tudo bem? 😊 Aqui é o Marcos da *MF Soluções Elétricas*! Vi que você tem interesse em energia solar. Posso te ajudar com uma simulação gratuita da economia que você pode ter na sua conta de luz. Tem um momento?`
      },
      {
        label: 'Retorno de lead frio',
        texto: `Oi! Aqui é o Marcos da *MF Soluções*. Você entrou em contato conosco sobre energia solar. Conseguiu verificar as informações que te enviei? Posso responder qualquer dúvida! 🌞`
      },
      {
        label: 'Após visita ao site',
        texto: `Olá! Vi que você visitou nosso site e se interessou por energia solar. Sou o Marcos da *MF Soluções Elétricas* e posso montar uma proposta personalizada pra você. Qual é sua conta de luz média por mês?`
      }
    ]
  },
  {
    id: 'qualificacao',
    titulo: '🔍 Qualificação',
    cor: '#8b5cf6',
    mensagens: [
      {
        label: 'Perguntar conta de luz',
        texto: `Para montar a sua simulação exata, preciso de uma informação: qual o valor médio da sua conta de luz por mês? 💡 Com isso consigo te mostrar exatamente quanto você vai economizar!`
      },
      {
        label: 'Perguntar tipo de imóvel',
        texto: `Perfeito! Só mais uma pergunta: o imóvel é *próprio ou alugado*? E é *residencial ou comercial*? Isso faz diferença no tipo de sistema que vou recomendar pra você. 🏠`
      },
      {
        label: 'Perguntar sobre financiamento',
        texto: `Você prefere pagar à vista ou está pensando em financiamento? Trabalhamos com *financiamento em até 84x* com juros bem baixos. Posso te mostrar as duas opções na proposta! 💰`
      }
    ]
  },
  {
    id: 'proposta',
    titulo: '📋 Envio de Proposta',
    cor: '#f59e0b',
    mensagens: [
      {
        label: 'Enviar proposta',
        texto: `Olá! Segue sua proposta personalizada de energia solar! 🌞\n\nMontei com base nas suas informações e garanto que você vai gostar dos números. Qualquer dúvida pode perguntar à vontade. Quando podemos conversar para fechar? 😊`
      },
      {
        label: 'Follow-up proposta (1 dia)',
        texto: `Oi! Conseguiu verificar a proposta que te enviei ontem? 📋 Fico à disposição para explicar qualquer detalhe ou ajustar alguma coisa. O que achou dos números?`
      },
      {
        label: 'Follow-up proposta (3 dias)',
        texto: `Olá! Passando para saber se ficou alguma dúvida sobre a proposta de energia solar. 🌞 Tenho alguns clientes na sua região que já instalaram e estão com uma economia incrível na conta de luz. Posso te contar mais?`
      }
    ]
  },
  {
    id: 'fechamento',
    titulo: '🤝 Fechamento',
    cor: '#10b981',
    mensagens: [
      {
        label: 'Confirmar fechamento',
        texto: `Que ótima notícia! 🎉 Vamos dar início ao processo! Preciso de alguns documentos:\n\n📄 *RG ou CNH*\n📄 *CPF*\n📄 *Comprovante de endereço*\n📄 *Conta de luz recente*\n\nPode me enviar por aqui mesmo. Assim já acelero tudo para você!`
      },
      {
        label: 'Agendamento de visita técnica',
        texto: `Perfeito! Vamos agendar a *visita técnica gratuita* para o engenheiro avaliar seu telhado e confirmar o melhor posicionamento dos painéis. 🔧\n\nQual o melhor dia para você? Manhã ou tarde?`
      },
      {
        label: 'Pós-fechamento boas-vindas',
        texto: `Bem-vindo à família MF Soluções! ☀️🎉\n\nSua instalação de energia solar está sendo processada. Vou te mantendo informado de cada etapa. Em caso de dúvidas pode me chamar a qualquer hora. Obrigado pela confiança!`
      }
    ]
  },
  {
    id: 'objecoes',
    titulo: '💬 Contornar Objeções',
    cor: '#ef4444',
    mensagens: [
      {
        label: 'Objeção: preço alto',
        texto: `Entendo que o investimento inicial parece alto, mas pensa assim: você vai continuar pagando a conta de luz *pra sempre* ou prefere pagar uma vez e economizar pelos próximos *25 a 30 anos*? 💡\n\nA maioria dos clientes recupera o investimento em 3 a 4 anos. Depois disso é lucro puro!`
      },
      {
        label: 'Objeção: vou pensar mais',
        texto: `Claro, é uma decisão importante! 😊 Enquanto você pensa, posso te contar que a conta de luz aumentou em média *20% ao ano*. Quanto mais tempo passa, mais você paga à distribuidora. Mas sem pressa — estou aqui quando quiser conversar!`
      },
      {
        label: 'Objeção: não confio em empresa',
        texto: `Totalmente compreensível ter essa preocupação! 🤝 A *MF Soluções* atua em Maricá e região com CNPJ regularizado, engenheiro responsável e garantia de 25 anos nos painéis. Posso te mostrar fotos de instalações recentes e depoimentos de clientes. Quer ver?`
      }
    ]
  },
  {
    id: 'pos-venda',
    titulo: '⭐ Pós-Venda',
    cor: '#06b6d4',
    mensagens: [
      {
        label: 'Check-in pós-instalação',
        texto: `Oi! Passando para saber como está funcionando seu sistema solar! ☀️ Está conseguindo acompanhar a geração pelo aplicativo? Qualquer dúvida técnica pode me chamar!`
      },
      {
        label: 'Solicitar indicação',
        texto: `Fico feliz que esteja satisfeito com sua instalação! 😊🌞\n\nVocê conhece alguém — amigo, familiar, vizinho — que também gostaria de economizar na conta de luz? Se você indicar e fecharmos, tenho um *benefício especial* pra você como agradecimento!`
      },
      {
        label: 'Solicitar avaliação Google',
        texto: `Olá! Espero que esteja aproveitando bastante a energia solar! ☀️\n\nSe puder nos ajudar com uma avaliação no Google, ficamos muito gratos. São só 2 minutinhos e nos ajuda muito a chegar em mais pessoas:\n👉 [link da avaliação]\n\nObrigado pela confiança!`
      }
    ]
  }
];

export function iniciarFunil() {
  const page = document.getElementById('funilPage');
  if (!page) return;
  renderFunil(page);
}

function renderFunil(page) {
  page.innerHTML = `
<div class="funil-header">
  <h1 class="page-title">💬 Conversas / Funil de Vendas</h1>
  <p class="funil-subtitulo">Mensagens prontas para WhatsApp — clique para copiar</p>
</div>
<div class="funil-grid">
${CATEGORIAS.map(cat => `
<div class="funil-categoria glass-card" style="--cat-cor: ${cat.cor}">
  <div class="funil-cat-header">
    <span class="funil-cat-titulo">${cat.titulo}</span>
    <span class="funil-cat-badge">${cat.mensagens.length}</span>
  </div>
  <div class="funil-mensagens">
    ${cat.mensagens.map((msg, i) => `
    <div class="funil-msg-card">
      <div class="funil-msg-label">${msg.label}</div>
      <div class="funil-msg-preview">${escapeHtml(msg.texto.substring(0, 80))}${msg.texto.length > 80 ? '…' : ''}</div>
      <div class="funil-msg-actions">
        <button type="button" class="btn-copiar" data-cat="${cat.id}" data-idx="${i}">📋 Copiar</button>
        <button type="button" class="btn-ver-msg" data-cat="${cat.id}" data-idx="${i}">👁️ Ver</button>
      </div>
    </div>`).join('')}
  </div>
</div>`).join('')}
</div>

<!-- Modal ver mensagem completa -->
<div id="modalFunilMsg" class="modal-overlay" aria-hidden="true" role="dialog">
  <div class="modal-box glass-card" style="max-width:520px">
    <div class="modal-header">
      <h3 id="funilMsgTitulo">Mensagem</h3>
      <button type="button" id="btnFecharFunilMsg" class="modal-close" aria-label="Fechar">✕</button>
    </div>
    <div id="funilMsgTexto" class="funil-msg-completa"></div>
    <div style="margin-top:16px;display:flex;gap:10px">
      <button type="button" id="btnCopiarFunilMsg" class="btn-primary" style="flex:1">📋 Copiar mensagem</button>
      <button type="button" id="btnWaFunilMsg" class="btn-whatsapp" style="flex:1">💬 Abrir WhatsApp</button>
    </div>
  </div>
</div>`;

  page.addEventListener('click', e => {
    const btnCopiar = e.target.closest('.btn-copiar');
    const btnVer    = e.target.closest('.btn-ver-msg');

    if (btnCopiar) {
      const msg = getMensagem(btnCopiar.dataset.cat, +btnCopiar.dataset.idx);
      if (msg) copiarMensagem(msg.texto);
    }
    if (btnVer) {
      const msg = getMensagem(btnVer.dataset.cat, +btnVer.dataset.idx);
      if (msg) abrirModal(msg);
    }
  });

  const btnFechar = page.querySelector('#btnFecharFunilMsg');
  const modal     = page.querySelector('#modalFunilMsg');
  btnFechar?.addEventListener('click', () => fecharModal(modal));
  modal?.addEventListener('click', e => { if (e.target === modal) fecharModal(modal); });

  const btnCopiarModal = page.querySelector('#btnCopiarFunilMsg');
  const btnWa          = page.querySelector('#btnWaFunilMsg');
  btnCopiarModal?.addEventListener('click', () => {
    const txt = page.querySelector('#funilMsgTexto')?.dataset.texto || '';
    copiarMensagem(txt);
  });
  btnWa?.addEventListener('click', () => {
    const txt = page.querySelector('#funilMsgTexto')?.dataset.texto || '';
    const encoded = encodeURIComponent(txt);
    window.open(`https://wa.me/?text=${encoded}`, '_blank');
  });
}

function getMensagem(catId, idx) {
  const cat = CATEGORIAS.find(c => c.id === catId);
  return cat?.mensagens[idx] || null;
}

async function copiarMensagem(texto) {
  try {
    await navigator.clipboard.writeText(texto);
    toast('Mensagem copiada! 📋', 'success');
  } catch {
    toast('Erro ao copiar. Tente manualmente.', 'error');
  }
}

function abrirModal(msg) {
  const modal    = document.querySelector('#funilPage #modalFunilMsg');
  const titulo   = document.querySelector('#funilPage #funilMsgTitulo');
  const textoEl  = document.querySelector('#funilPage #funilMsgTexto');
  if (!modal) return;
  if (titulo) titulo.textContent = msg.label;
  if (textoEl) {
    textoEl.textContent = msg.texto;
    textoEl.dataset.texto = msg.texto;
  }
  modal.classList.add('ativo');
  modal.setAttribute('aria-hidden', 'false');
}

function fecharModal(modal) {
  modal?.classList.remove('ativo');
  modal?.setAttribute('aria-hidden', 'true');
}

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

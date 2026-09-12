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
        texto: `Perfeito! Vamos agendar a *visita técnica gratuita* pra eu avaliar seu telhado e confirmar o melhor posicionamento dos painéis. 🔧\n\nQual o melhor dia para você? Manhã ou tarde?`
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
        texto: `Totalmente compreensível ter essa preocupação! 🤝 A *MF Soluções* atua em Maricá e região com CNPJ regularizado, técnico responsável (CFT/ART) e garantia de 25 anos nos painéis. Posso te mostrar fotos de instalações recentes e depoimentos de clientes. Quer ver?`
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
  },

  // ─── 50 QUEBRAS DE OBJEÇÃO (por etapa do funil) — Brand Brain MF ───
  // label = a objeção do cliente · texto = a resposta MF pronta pra copiar
  {
    id: 'obj-topo',
    titulo: '🛡️ Objeções — Topo (1º contato)',
    cor: '#3b82f6',
    mensagens: [
      { label: '"Não tenho interesse."', texto: `Tranquilo. Só uma pergunta: sua conta de luz tá acima de R$250? Se tiver, vale 2 min ver quanto dá pra reduzir — sem compromisso.` },
      { label: '"Só tô olhando / pesquisando."', texto: `Perfeito, pesquisar é o certo. Me manda sua conta que eu te mando um cálculo real da SUA casa pra você comparar com os outros.` },
      { label: '"Manda tudo por escrito."', texto: `Mando sim. Pra ser exato (e não chute), me diz a média da sua conta — aí o número é seu, não genérico.` },
      { label: '"Energia solar é furada / não funciona."', texto: `Entendo a desconfiança — tem muita empresa ruim. Por isso eu mostro obra real e assino o projeto com ART. Quer ver uma instalação que fiz aqui em Maricá?` },
      { label: '"Vi que taxaram o sol / mudou a lei."', texto: `Mudou sim, e é justo saber: hoje ainda dá pra reduzir até ~95% da conta. Quem instala antes trava condição melhor. Te explico em 1 print?` },
      { label: '"Meu vizinho instalou e não economizou."', texto: `Isso acontece quando o projeto é mal dimensionado ou mal instalado. Eu calculo pelo seu consumo real e assino — não é kit no chute. Posso te mostrar a diferença?` },
      { label: '"Isso não é golpe?"', texto: `Pergunta boa — golpe existe. Eu sou técnico com CFT, CNPJ e ART, mostro obra e nota. Pode conferir meu perfil no Google (5★). Quer o link?` },
      { label: '"Agora não é a hora."', texto: `Sem pressa. Só lembrando: a conta sobe no verão e a fila de homologação atrasa. Deixa eu te mandar o cálculo pra quando você decidir já estar pronto?` },
      { label: '"Não conheço sua empresa."', texto: `Justo. MF Soluções, Maricá, 5★ no Google, CNPJ 48.929.808/0001-84, técnico Marcos Felipe (CFT). Te mando obras reais pra você ver com quem tá falando.` },
      { label: '"Já pedi orçamento com outros."', texto: `Ótimo, compara mesmo. Só te peço: veja quem assina o projeto (ART) e mostra obra real — muitos são revendedores que somem depois. Quer um 2º olhar gratuito?` }
    ]
  },
  {
    id: 'obj-meio',
    titulo: '🛡️ Objeções — Meio (qualificação)',
    cor: '#8b5cf6',
    mensagens: [
      { label: '"E se chover / dia nublado?"', texto: `Gera menos, não para. O sistema é dimensionado pela média do ano e o crédito de energia cobre os dias fracos. Por isso o cálculo é pelo consumo, não pelo sol de um dia.` },
      { label: '"Gera de noite?"', texto: `De noite você usa o crédito que gerou de dia (a rede vira sua "bateria"). Por isso a conta cai, mesmo usando à noite.` },
      { label: '"Estraga o telhado?"', texto: `Não — a fixação é feita pela norma, com vedação. Bem instalado, ainda protege a área. Eu mostro como faço no seu tipo de telha.` },
      { label: '"E se eu vender/mudar de casa?"', texto: `O sistema valoriza o imóvel (comprador adora conta baixa) ou dá pra transferir. Não é dinheiro perdido.` },
      { label: '"Moro de aluguel."', texto: `Aí a gente vê a parte elétrica (o que melhora já) ou um sistema que você leva. Me conta a situação que eu te digo o que compensa.` },
      { label: '"Meu telhado é pequeno / tem sombra."', texto: `Por isso faço visita técnica e projeto sob medida — às vezes usa outra face do telhado ou solo. Não prometo antes de ver.` },
      { label: '"Quanto tempo dura?"', texto: `Painel com garantia de 25 anos, inversor ~10. É investimento de longo prazo, não gambiarra.` },
      { label: '"Dá muita manutenção?"', texto: `Pouca: limpeza e revisão de vez em quando. E a MF faz — placa suja chega a roubar 25% da geração, a gente cuida disso.` },
      { label: '"A conta não zera mesmo, né?"', texto: `Correto, e eu sou honesto: não zera — sobram ~R$105 de taxas fixas da Enel (iluminação + disponibilidade). O resto o sol paga. Prefiro te falar a verdade do que prometer milagre.` },
      { label: '"E se faltar peça / a marca sumir?"', texto: `Trabalho com equipamento sério e garantia de fábrica. E, sendo local, eu continuo aqui pra dar suporte — diferente de vendedor de fora.` },
      { label: '"É complicado de instalar / muita obra?"', texto: `Não. Instalação limpa, em geral poucos dias, eu cuido de tudo — projeto, homologação e obra.` },
      { label: '"Preciso trocar meu padrão/relógio?"', texto: `Às vezes sim, e eu já verifico isso na visita e incluo no orçamento — pra você não ter surpresa depois.` }
    ]
  },
  {
    id: 'obj-fundo',
    titulo: '🛡️ Objeções — Fundo (preço/decisão)',
    cor: '#f59e0b',
    mensagens: [
      { label: '"Tá muito caro."', texto: `Entendo. Só que hoje você já paga esse valor — pra Enel, todo mês, pra sempre. Com solar, o dinheiro vira o SEU sistema. Te mostro o payback?` },
      { label: '"Não tenho o valor à vista."', texto: `Não precisa. Dá pra financiar em até 120x com zero de entrada — a parcela costuma caber no que você já paga de luz.` },
      { label: '"Financiamento tem juro alto."', texto: `Comparo com você: mesmo com juro, a parcela fica menor que a conta atual e some depois de quitado. Faço a conta real da sua situação.` },
      { label: '"Achei mais barato em outro lugar."', texto: `Pode ser. Confere 3 coisas: quem assina o projeto (ART), a marca do equipamento e se mostram obra real. Barato que some depois sai caro. Quer que eu revise o outro orçamento?` },
      { label: '"Vou pensar."', texto: `Claro. Só pra eu te ajudar a pensar com número certo: o que tá pesando mais — o valor, a confiança, ou o momento?` },
      { label: '"Preciso falar com meu esposo(a)."', texto: `Perfeito, decisão de casa é a dois. Quer que eu faça uma call rápida com vocês dois pra tirar as dúvidas de uma vez?` },
      { label: '"E se eu não economizar o que prometeram?"', texto: `Por isso eu dimensiono pelo seu consumo real e mostro a conta. Nada de promessa redonda — número defensável, por escrito.` },
      { label: '"O payback é muito longo."', texto: `Costuma ser 3–4 anos, e o sistema dura 25. Depois disso é energia quase de graça por mais de 20 anos.` },
      { label: '"Prefiro investir esse dinheiro em outra coisa."', texto: `Faz sentido comparar. Só que solar rende (economia mensal garantida) e ainda valoriza o imóvel — poucos investimentos fazem os dois.` },
      { label: '"E se a tarifa/inflação mudar tudo?"', texto: `Aí é a seu favor: quanto mais a Enel sobe, mais você economiza. Solar te protege do aumento.` },
      { label: '"Quero desconto."', texto: `Trabalho com preço justo (não inflo pra depois "dar desconto"). O que dá pra ajustar é condição/parcela — vamos ver o que cabe no seu bolso?` },
      { label: '"Esse kit é bom mesmo?"', texto: `É o dimensionado pra sua casa, com equipamento sério. Te explico peça por peça — transparência é meu diferencial.` }
    ]
  },
  {
    id: 'obj-fechamento',
    titulo: '🛡️ Objeções — Fechamento (medo/confiança)',
    cor: '#10b981',
    mensagens: [
      { label: '"E se a empresa sumir depois da venda?"', texto: `Esse é o maior medo — com razão. Eu sou local, técnico responsável (CFT/ART), e faço O&M/manutenção depois. Não vendo e sumo.` },
      { label: '"Como sei que vocês são confiáveis?"', texto: `Google 5★, CNPJ, ART assinada, obras reais em Maricá e você fala direto comigo (Marcos), não com call center.` },
      { label: '"Quero garantia por escrito."', texto: `É assim que trabalho: contrato, garantia de fábrica (25 anos painel) e responsabilidade técnica no papel.` },
      { label: '"A homologação na Enel demora?"', texto: `Tem um prazo real e eu cuido de todo o processo. Quem fecha agora liga o sistema antes do próximo ciclo de conta alta.` },
      { label: '"E se a Enel reprovar o projeto?"', texto: `Por isso o projeto é assinado por técnico e feito na norma — é o que evita reprovação. É meu trabalho, não gambiarra.` },
      { label: '"E se der problema na obra?"', texto: `Responsabilidade técnica é minha, com ART. Deu algo, eu resolvo — é o que a assinatura significa.` },
      { label: '"Quero ver obras que vocês já fizeram."', texto: `Show, prova é o que mais importa. Te mando fotos/vídeos reais de instalações aqui da região agora.` },
      { label: '"Vocês emitem nota / têm CNPJ?"', texto: `Sim: CNPJ 48.929.808/0001-84, nota e tudo formal. Segurança sua e minha.` }
    ]
  },
  {
    id: 'obj-pos',
    titulo: '🛡️ Objeções — Pós-venda + Elétrica',
    cor: '#06b6d4',
    mensagens: [
      { label: '"Minha conta veio errada mesmo com solar."', texto: `Acontece — a Enel às vezes cobra classificação/ICMS errado. A MF faz auditoria da fatura e recupera o cobrado a mais. Me manda a conta.` },
      { label: '"A usina não tá gerando o que prometeram."', texto: `Vamos verificar: pode ser sujeira, sombra ou inversor. Faço a revisão técnica e te digo o motivo real.` },
      { label: '"Preciso de limpeza/manutenção."', texto: `A MF faz. Placa suja rouba até 25% — a revisão se paga sozinha.` },
      { label: '"Meu integrador sumiu, ninguém atende."', texto: `Comigo não rola. Mesmo que a instalação não tenha sido minha, eu assumo a manutenção. Me conta o que tá acontecendo.` },
      { label: '"Quanto custa trocar o disjuntor / quadro?"', texto: `Depende do que a casa pede — mas faço na norma e explico antes. Me manda uma foto do quadro que eu já te oriento.` },
      { label: '"Tô sem luz, é urgente!"', texto: `Emergência a gente prioriza. Me diz o endereço e o que houve (disjuntor, padrão, curto) que eu te encaixo o mais rápido possível.` },
      { label: '"Faz reforma elétrica / instalação também?"', texto: `Faço: elétrica predial e residencial, quadro, aterramento, padrão de entrada — tudo na norma, assinado. Solar é uma parte, elétrica é a base.` },
      { label: '"Posso confiar num eletricista qualquer?"', texto: `Não — instalação elétrica errada pega fogo. Eu sou Técnico em Eletrotécnica (CFT) e assino o serviço. Segurança não é lugar de improviso.` }
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
  <p class="funil-subtitulo">Mensagens prontas + 50 quebras de objeção — clique para copiar e colar no WhatsApp</p>
  <input id="funilBusca" class="funil-busca input-busca" type="search" autocomplete="off"
         placeholder="🔎 Buscar objeção ou mensagem (ex.: caro, chuva, vou pensar, golpe, sem luz)…">
  <p id="funilBuscaVazio" class="funil-busca-vazio" hidden>Nada encontrado — tente outra palavra.</p>
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
    <div class="funil-msg-card" data-busca="${escapeHtml((msg.label + ' ' + msg.texto).toLowerCase())}">
      <div class="funil-msg-label">${escapeHtml(msg.label)}</div>
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

  // ── Busca: filtra cards por objeção/mensagem e esconde categorias vazias ──
  const busca = page.querySelector('#funilBusca');
  const avisoVazio = page.querySelector('#funilBuscaVazio');
  busca?.addEventListener('input', () => {
    const termo = busca.value.trim().toLowerCase();
    let visiveis = 0;
    page.querySelectorAll('.funil-categoria').forEach(cat => {
      let catTem = 0;
      cat.querySelectorAll('.funil-msg-card').forEach(card => {
        const bate = !termo || (card.dataset.busca || '').includes(termo);
        card.hidden = !bate;
        if (bate) catTem++;
      });
      cat.hidden = termo && catTem === 0;   // esconde categoria sem resultado
      visiveis += catTem;
    });
    if (avisoVazio) avisoVazio.hidden = !(termo && visiveis === 0);
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

/* ============================================================
   slotEngine.esm.js — BUILD ESM (GERADO por build-esm.mjs).
   NÃO EDITAR AQUI. Fonte única = slotEngine.js (CommonJS, 30 testes).
   Regenerar após mudar o motor:  node build-esm.mjs
   ============================================================ */
/**
 * slotEngine.js — motor de slots da agenda (função pura)
 *
 * Mesmo princípio do flowLogic.js: módulo PURO. Nenhuma chamada de rede,
 * nenhuma dependência de Firestore/Firebase. Recebe regras + compromissos
 * existentes e devolve a lista de horários livres. Quem chama (bot, CRM, n8n)
 * é responsável por ler os agendamentos e a config do Firestore e por gravar.
 *
 * ⚠️ ARQUITETURA (ADR-0008): o consumidor deste motor é o COCKPIT PRIVADO do
 * dono (Telegram), NÃO o cliente. O cliente nunca escolhe horário. O motor em
 * si é neutro — só calcula horários livres dado um conjunto de regras.
 *
 * Regras respeitadas (todas configuráveis — ver ESQUEMA_AGENDAMENTOS_V1.md §6):
 *   - janela de trabalho por dia da semana (com almoço 12–13 e sábado só de manhã)
 *   - buffer de deslocamento entre visitas (menor na mesma zona)
 *   - deslocamento desde a base (1ª visita do dia sai de Bambuí)
 *   - limite de N visitas por dia
 *   - "nunca visita em dia de instalação" (compromisso diaInteiro trava o dia)
 *   - blocos protegidos de escritório (sexta à tarde; o motor nunca os oferece)
 *   - antecedência mínima e granularidade dos horários de início
 *   - mapa bairro→zona (decide o buffer 20 vs 45 por par de visitas)
 *
 * ✅ VALORES DA MF (config oficial `MF_CONFIG`): todos CONFIRMADOS pelo Marcos em
 * 2026-07-08 — janela seg–sex 08–17 (almoço 12–13), sábado 08–12, domingo fechado,
 * escritório sexta 13–17, buffers 20/45, base = Bambuí (zona local), duração 60min,
 * granularidade 30min, só `confirmado` reserva. Sem regra pendente.
 *
 * FUSO: todos os timestamps são ISO 8601 COM offset explícito (ex.: -03:00),
 * como o documento diretor exige. O motor não faz conversão de fuso mágica:
 * compara instantes (epoch ms) e deriva o dia/horário-local a partir do offset
 * fixo da config (offsetMin). Isso evita depender de bibliotecas de timezone
 * e mantém o módulo puro e testável em qualquer máquina.
 */
'use strict';

// Offset padrão de America/Sao_Paulo em minutos (UTC-3). Configurável porque o
// Brasil pode reintroduzir horário de verão; o chamador passa o offset vigente.
const DEFAULT_OFFSET_MIN = -180;

// ── MAPA DE ZONAS (bairro → zona) ──────────────────────────────────────────
// Modelo de DOIS NÍVEIS de proximidade confirmado pelo Marcos (2026-07-08):
//   • ZONA "local": Bambuí, Cordeirinho, Ponta Negra, Araçatiba e Barra (de
//     Maricá) contam TODAS como a MESMA zona entre si → buffer de 20 min.
//   • ZONAS "distantes": Centro de Maricá, Inoã, São José (de Imbassaí),
//     Itaipuaçu, Jaconé, Saquarema, Niterói e São Gonçalo são cada uma uma zona
//     DISTINTA → buffer de 45 min entre elas e em relação à "local".
// A chave normalizada (minúscula, sem acento) do bairro mapeia para a chave de
// zona. O motor decide 20 vs 45 comparando as zonas de duas visitas seguidas.
//
// ✅ Grafia CONFIRMADA pelo Marcos (2026-07-08): é ARAÇATIBA. Mantemos também o
// alias "guaratiba" (defensivo) apontando para a mesma zona local, sem prejuízo.
// NÃO presumimos bairros que o Marcos não citou.
const ZONA_LOCAL = 'local_marica_sul';
const MAPA_BAIRRO_ZONA = {
  // ── zona "local" (todos = mesma zona → buffer 20 min) ────────────────────
  'bambui': ZONA_LOCAL,      // base do Marcos (sai daqui de manhã)
  'cordeirinho': ZONA_LOCAL,
  'ponta negra': ZONA_LOCAL,
  'aracatiba': ZONA_LOCAL,   // ✅ grafia confirmada: Araçatiba
  'guaratiba': ZONA_LOCAL,   // alias defensivo → mesma zona local
  'barra': ZONA_LOCAL,       // Barra de Maricá
  'barra de marica': ZONA_LOCAL,

  // ── zonas "distantes" (cada uma é distinta → buffer 45 min) ──────────────
  'centro': 'centro_marica',
  'centro de marica': 'centro_marica',
  'inoa': 'inoa',
  'sao jose': 'sao_jose_imbassai',       // São José de Imbassaí
  'sao jose de imbassai': 'sao_jose_imbassai',
  'itaipuacu': 'itaipuacu',
  'jacone': 'jacone',
  'saquarema': 'saquarema',
  'niteroi': 'niteroi',
  'sao goncalo': 'sao_goncalo',
};

// normaliza bairro: minúsculo, sem acento, trim. Base do lookup no mapa.
function normalizarBairro(b) {
  return String(b || '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().trim();
}

// Resolve a zona de um compromisso: usa `zona` explícita se veio; senão tenta
// derivar do bairro pelo mapa de zonas. Retorna null se não souber (o buffer
// cai no conservador de 45 min quando alguma das zonas é desconhecida).
// `mapa` é opcional (default = MAPA_BAIRRO_ZONA); o chamador pode passar o seu.
function resolverZona(compromissoOuBairro, mapa) {
  const M = mapa || MAPA_BAIRRO_ZONA;
  if (compromissoOuBairro == null) return null;
  if (typeof compromissoOuBairro === 'string') {
    return M[normalizarBairro(compromissoOuBairro)] || null;
  }
  const c = compromissoOuBairro;
  if (c.zona) return c.zona;
  const bairro = c.endereco && c.endereco.bairro;
  if (bairro) return M[normalizarBairro(bairro)] || null;
  return null;
}

// MF_CONFIG — CONFIG OFICIAL DA MF (valores reais confirmados pelo Marcos em
// 2026-07-08). Substitui o antigo DEFAULT_CONFIG de exemplo. Todas as regras
// estão confirmadas — sem itens pendentes (ver ESQUEMA_AGENDAMENTOS_V1.md §6).
const MF_CONFIG = {
  timezone: 'America/Sao_Paulo',
  offsetMin: DEFAULT_OFFSET_MIN,
  // Janela CONFIRMADA (Marcos, 2026-07-08):
  //   • seg–sex: 08:00–17:00 com ALMOÇO bloqueado 12:00–13:00 (dois períodos).
  //   • sábado: 08:00–12:00 (só de manhã, sem quebra de almoço).
  //   • domingo (0): não atende.
  // O almoço é modelado como duas janelas por dia (o motor nunca oferece 12–13).
  // 0=domingo ... 6=sábado. Ausente/vazio = dia sem atendimento.
  janelaTrabalho: {
    1: [{ inicio: '08:00', fim: '12:00' }, { inicio: '13:00', fim: '17:00' }],
    2: [{ inicio: '08:00', fim: '12:00' }, { inicio: '13:00', fim: '17:00' }],
    3: [{ inicio: '08:00', fim: '12:00' }, { inicio: '13:00', fim: '17:00' }],
    4: [{ inicio: '08:00', fim: '12:00' }, { inicio: '13:00', fim: '17:00' }],
    5: [{ inicio: '08:00', fim: '12:00' }, { inicio: '13:00', fim: '17:00' }],
    6: [{ inicio: '08:00', fim: '12:00' }], // sábado só de manhã (sem almoço)
  },
  // Durações CONFIRMADAS (60 min). visita_tecnica: o Marcos deu faixa 40–90;
  // 60 é o default AJUSTÁVEL. manutencao e laudo = 60 (confirmado).
  duracaoPorTipoMin: {
    visita_tecnica: 60,   // ajustável (faixa 40–90 informada pelo Marcos)
    manutencao: 60,
    laudo: 60,
    homologacao: 60,      // não citado explicitamente; alinhado aos demais
    instalacao: 'dia_inteiro',
  },
  bufferMesmaZonaMin: 20,       // CONFIRMADO
  bufferZonaDiferenteMin: 45,   // CONFIRMADO
  maxVisitasPorDia: 3,
  antecedenciaMinimaHoras: 24,
  // Granularidade de início: 30 min — CONFIRMADO pelo Marcos (2026-07-08).
  granularidadeMin: 30,
  // RESERVA DE SLOT — CONFIRMADO: apenas `confirmado` ocupa horário.
  // `pendente` NÃO reserva. (Antes o default incluía pendente/lembrado.)
  statusQueOcupam: ['confirmado'],
  // mapa bairro→zona usado quando o compromisso não traz `zona` explícita.
  mapaBairroZona: MAPA_BAIRRO_ZONA,
  // DESLOCAMENTO DESDE A BASE (Marcos, 2026-07-08): a PRIMEIRA visita do dia
  // soma o tempo de estrada da base até a zona da visita. O primeiro slot numa
  // zona distante só pode começar após esse buffer (ex.: Itaipuaçu ~08:45), e
  // numa zona local começa mais cedo. Usa o MESMO buffer (20 local / 45 distante).
  //   ✅ CONFIRMADO: a base é BAMBUÍ (o Marcos sai de Bambuí de manhã). Bambuí
  //   pertence à zona "local", então zonaBase = a chave dessa zona.
  zonaBase: ZONA_LOCAL, // Bambuí → local_marica_sul
  // BLOCO DE ESCRITÓRIO — CONFIRMADO (Marcos, 2026-07-08): SEXTA À TARDE
  // (13:00–17:00) é bloco de escritório protegido — o motor não oferece visitas.
  // blocos de escritório protegidos: { diaSemana, inicio, fim, label }
  bloqueiosRecorrentes: [
    { diaSemana: 5, inicio: '13:00', fim: '17:00', label: 'escritório (sexta à tarde)' },
  ],
};

// Alias retrocompatível: código/testes antigos que importam DEFAULT_CONFIG
// continuam funcionando, mas agora recebem os valores reais da MF.
const DEFAULT_CONFIG = MF_CONFIG;

const MIN_MS = 60 * 1000;

// ── helpers de tempo (puros, sem dependência de fuso do SO) ────────────────

// "HH:MM" -> minutos desde 00:00
function hhmmToMin(hhmm) {
  const parts = String(hhmm).split(':');
  return parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
}

// epoch ms -> componentes do horário LOCAL, dado o offset fixo em minutos.
// Somamos o offset e lemos os campos em UTC: assim "14:00-03:00" sempre lê 14:00
// independentemente do fuso da máquina que roda o teste.
function localParts(epochMs, offsetMin) {
  const d = new Date(epochMs + offsetMin * MIN_MS);
  return {
    weekday: d.getUTCDay(),          // 0..6
    minutesOfDay: d.getUTCHours() * 60 + d.getUTCMinutes(),
    // epoch ms da meia-noite local daquele dia
    dayStartMs: epochMs - ((d.getUTCHours() * 60 + d.getUTCMinutes()) * MIN_MS + d.getUTCSeconds() * 1000 + d.getUTCMilliseconds()),
    ymd: d.getUTCFullYear() + '-' + String(d.getUTCMonth() + 1).padStart(2, '0') + '-' + String(d.getUTCDate()).padStart(2, '0'),
  };
}

// minutos-do-dia local (num certo dia) -> epoch ms
function localMinutesToEpoch(dayStartMs, minutesOfDay) {
  return dayStartMs + minutesOfDay * MIN_MS;
}

// aceita ISO string com offset OU epoch ms; devolve epoch ms
function toEpoch(v) {
  if (typeof v === 'number') return v;
  const ms = Date.parse(v);
  if (Number.isNaN(ms)) throw new Error('Data inválida: ' + v);
  return ms;
}

// ── normalização dos compromissos existentes ──────────────────────────────

// Mantém só o que ocupa a agenda e calcula início/fim em epoch ms.
// fim ausente => usa a duração do tipo (config). instalação/diaInteiro => dia todo.
function normalizarCompromissos(compromissos, config) {
  const ocupam = config.statusQueOcupam;
  const out = [];
  for (let i = 0; i < compromissos.length; i++) {
    const c = compromissos[i];
    if (c.status && ocupam.indexOf(c.status) === -1) continue;
    const inicioMs = toEpoch(c.inicio);
    const dur = config.duracaoPorTipoMin[c.tipo];
    const isDiaInteiro = c.diaInteiro === true || dur === 'dia_inteiro';
    let fimMs;
    if (c.fimEstimado != null) fimMs = toEpoch(c.fimEstimado);
    else if (isDiaInteiro) fimMs = inicioMs; // fim real é derivado como "o dia todo" abaixo
    else fimMs = inicioMs + (typeof dur === 'number' ? dur : 60) * MIN_MS;
    out.push({
      inicioMs: inicioMs,
      fimMs: fimMs,
      // zona explícita tem prioridade; senão deriva do bairro via mapa de zonas.
      zona: resolverZona(c, config.mapaBairroZona),
      tipo: c.tipo || null,
      diaInteiro: isDiaInteiro,
      contaComoVisita: c.tipo === 'visita_tecnica',
    });
  }
  return out;
}

function overlaps(aIni, aFim, bIni, bFim) {
  return aIni < bFim && bIni < aFim;
}

// há algum compromisso ocupante que COMEÇA no mesmo dia [dayStart, dayEnd) e
// antes do candidato? Se sim, a primeira visita do dia já aconteceu e o piso de
// deslocamento-desde-a-base não se aplica ao candidato.
function temCompromissoAntes(candIniMs, dayStartMs, dayEndMs, compromissos) {
  for (let i = 0; i < compromissos.length; i++) {
    const c = compromissos[i];
    if (c.inicioMs >= dayStartMs && c.inicioMs < dayEndMs && c.inicioMs < candIniMs) return true;
  }
  return false;
}

// buffer (min) entre um slot candidato e um compromisso vizinho, conforme a zona
function bufferMin(zonaCandidato, zonaVizinho, config) {
  if (zonaCandidato && zonaVizinho && zonaCandidato === zonaVizinho) return config.bufferMesmaZonaMin;
  return config.bufferZonaDiferenteMin;
}

// tempo de estrada (min) da BASE do Marcos até a zona da visita. Mesmo critério
// de buffer: 20 min se a visita é na própria zona da base, 45 min se distante.
// Se a base não está configurada, retorna 0 (sem empurrão desde a base).
function bufferDesdeBase(zonaVisita, config) {
  if (!config.zonaBase) return 0;
  return bufferMin(config.zonaBase, zonaVisita, config);
}

// ── núcleo: gera candidatos de um dia e valida cada um contra as regras ────

/**
 * Calcula os slots livres.
 *
 * @param {Object} args
 * @param {Object} args.config      regras (mescladas sobre DEFAULT_CONFIG)
 * @param {Array}  args.compromissos agendamentos existentes (crus, ver ESQUEMA §4)
 * @param {string} args.tipo        tipo do compromisso a encaixar (ex.: 'visita_tecnica')
 * @param {string} [args.zona]      zona do novo compromisso (para o buffer)
 * @param {number|string} args.deMs início da busca (epoch ms ou ISO)
 * @param {number|string} args.ateMs fim da busca (epoch ms ou ISO)
 * @param {number|string} [args.agoraMs] "agora" p/ antecedência mínima (default: deMs)
 * @param {number} [args.limite]    máx. de slots a devolver (default: sem limite)
 * @returns {Array<{inicio:string, fim:string, inicioMs:number, fimMs:number, zona:(string|null)}>}
 */
function calcularSlotsLivres(args) {
  const config = mergeConfig(args.config);
  const tipo = args.tipo || 'visita_tecnica';
  const zona = args.zona || null;
  const offsetMin = config.offsetMin;

  const durVal = config.duracaoPorTipoMin[tipo];
  if (durVal === 'dia_inteiro') {
    // Encaixar instalação (dia inteiro) é outro problema (dias totalmente livres),
    // fora do escopo do motor de slots de visita. Sinalizamos explicitamente.
    throw new Error('calcularSlotsLivres não encaixa tipos de dia inteiro (ex.: instalacao). Use um tipo com duração em minutos.');
  }
  const duracaoMin = typeof durVal === 'number' ? durVal : 60;

  const deMs = toEpoch(args.deMs);
  const ateMs = toEpoch(args.ateMs);
  const agoraMs = args.agoraMs != null ? toEpoch(args.agoraMs) : deMs;
  const inicioMinimoMs = agoraMs + config.antecedenciaMinimaHoras * 60 * MIN_MS;

  const compromissos = normalizarCompromissos(args.compromissos || [], config);

  // dias com instalação/diaInteiro => sem visitas ("nunca visita em dia de instalação")
  const diasBloqueados = {};
  // contagem de visitas já marcadas por dia (para o limite diário)
  const visitasPorDia = {};
  for (let i = 0; i < compromissos.length; i++) {
    const c = compromissos[i];
    const p = localParts(c.inicioMs, offsetMin);
    if (c.diaInteiro) diasBloqueados[p.ymd] = true;
    if (c.contaComoVisita) visitasPorDia[p.ymd] = (visitasPorDia[p.ymd] || 0) + 1;
  }

  const slots = [];
  const step = config.granularidadeMin * MIN_MS;
  const novoContaComoVisita = tipo === 'visita_tecnica';

  // itera dia a dia dentro da janela [de, ate]
  let cursorDayStart = localParts(deMs, offsetMin).dayStartMs;
  const fimDayStart = localParts(ateMs, offsetMin).dayStartMs;

  while (cursorDayStart <= fimDayStart) {
    const dayParts = localParts(cursorDayStart + 12 * 60 * MIN_MS, offsetMin); // meio-dia = seguro contra bordas
    const ymd = dayParts.ymd;
    const weekday = dayParts.weekday;
    const janelas = config.janelaTrabalho[weekday] || config.janelaTrabalho[String(weekday)] || [];

    const diaTemInstalacao = diasBloqueados[ymd] === true;
    const jaNoLimite = novoContaComoVisita && (visitasPorDia[ymd] || 0) >= config.maxVisitasPorDia;

    if (!diaTemInstalacao && !jaNoLimite && janelas.length > 0) {
      // DESLOCAMENTO DESDE A BASE: a PRIMEIRA visita do dia sai da base do Marcos,
      // então não pode começar antes de (abertura do dia + estrada até a zona).
      // Ex.: Itaipuaçu (distante) => 08:00 + 45 = 08:45 é o piso do dia.
      // Se já houver compromisso mais cedo no dia, a posição vem dele (buffer
      // normal), não da base — por isso o piso só vale para candidatos sem
      // compromisso ocupante antes deles nesse dia.
      const aberturaDoDiaMin = hhmmToMin(janelas[0].inicio);
      const aberturaDoDiaMs = localMinutesToEpoch(cursorDayStart, aberturaDoDiaMin);
      const pisoBaseMs = aberturaDoDiaMs + bufferDesdeBase(zona, config) * MIN_MS;
      const fimDoDiaMs = cursorDayStart + 24 * 60 * MIN_MS;

      for (let j = 0; j < janelas.length; j++) {
        const janIniMin = hhmmToMin(janelas[j].inicio);
        const janFimMin = hhmmToMin(janelas[j].fim);
        // horários de início candidatos, de granularidade em granularidade
        let candIniMs = localMinutesToEpoch(cursorDayStart, janIniMin);
        const ultimoInicioMs = localMinutesToEpoch(cursorDayStart, janFimMin) - duracaoMin * MIN_MS;
        for (; candIniMs <= ultimoInicioMs; candIniMs += step) {
          const candFimMs = candIniMs + duracaoMin * MIN_MS;
          if (candIniMs < deMs || candFimMs > ateMs) continue;
          if (candIniMs < inicioMinimoMs) continue; // antecedência mínima
          // piso de deslocamento-desde-a-base: só quando NÃO há compromisso
          // ocupante antes do candidato nesse dia (senão é o buffer dele que vale).
          if (candIniMs < pisoBaseMs &&
              !temCompromissoAntes(candIniMs, cursorDayStart, fimDoDiaMs, compromissos)) {
            continue;
          }
          if (slotValido(candIniMs, candFimMs, zona, compromissos, config, cursorDayStart)) {
            slots.push({
              inicio: isoComOffset(candIniMs, offsetMin),
              fim: isoComOffset(candFimMs, offsetMin),
              inicioMs: candIniMs,
              fimMs: candFimMs,
              zona: zona,
            });
            if (args.limite && slots.length >= args.limite) return slots;
          }
        }
      }
    }
    cursorDayStart += 24 * 60 * MIN_MS;
  }
  return slots;
}

// um slot é válido se: não colide com bloqueio de escritório, e respeita o
// buffer de deslocamento contra TODOS os compromissos do dia (não só o adjacente).
function slotValido(candIniMs, candFimMs, zona, compromissos, config, dayStartMs) {
  // bloqueios recorrentes de escritório (por dia da semana)
  const p = localParts(candIniMs, config.offsetMin);
  const bloqueios = config.bloqueiosRecorrentes || [];
  for (let i = 0; i < bloqueios.length; i++) {
    const b = bloqueios[i];
    if (Number(b.diaSemana) !== p.weekday) continue;
    const bIni = localMinutesToEpoch(dayStartMs, hhmmToMin(b.inicio));
    const bFim = localMinutesToEpoch(dayStartMs, hhmmToMin(b.fim));
    if (overlaps(candIniMs, candFimMs, bIni, bFim)) return false;
  }
  // compromissos existentes: sem sobreposição e com buffer de deslocamento
  for (let i = 0; i < compromissos.length; i++) {
    const c = compromissos[i];
    if (overlaps(candIniMs, candFimMs, c.inicioMs, c.fimMs)) return false;
    const buf = bufferMin(zona, c.zona, config) * MIN_MS;
    // buffer aplicado como zona morta em volta do compromisso existente
    if (overlaps(candIniMs, candFimMs, c.inicioMs - buf, c.fimMs + buf)) return false;
  }
  return true;
}

// epoch ms -> ISO 8601 com o offset fixo (ex.: 2026-07-09T14:00:00-03:00)
function isoComOffset(epochMs, offsetMin) {
  const d = new Date(epochMs + offsetMin * MIN_MS);
  const sign = offsetMin <= 0 ? '-' : '+';
  const abs = Math.abs(offsetMin);
  const oh = String(Math.floor(abs / 60)).padStart(2, '0');
  const om = String(abs % 60).padStart(2, '0');
  return d.getUTCFullYear() + '-' +
    String(d.getUTCMonth() + 1).padStart(2, '0') + '-' +
    String(d.getUTCDate()).padStart(2, '0') + 'T' +
    String(d.getUTCHours()).padStart(2, '0') + ':' +
    String(d.getUTCMinutes()).padStart(2, '0') + ':' +
    String(d.getUTCSeconds()).padStart(2, '0') +
    sign + oh + ':' + om;
}

// mescla config do chamador sobre os defaults (shallow no topo é suficiente,
// mas janelaTrabalho/duracaoPorTipoMin são substituídos por inteiro quando vêm).
function mergeConfig(userConfig) {
  const c = Object.assign({}, DEFAULT_CONFIG, userConfig || {});
  if (!userConfig || !userConfig.janelaTrabalho) c.janelaTrabalho = DEFAULT_CONFIG.janelaTrabalho;
  if (!userConfig || !userConfig.duracaoPorTipoMin) c.duracaoPorTipoMin = DEFAULT_CONFIG.duracaoPorTipoMin;
  if (!userConfig || !userConfig.statusQueOcupam) c.statusQueOcupam = DEFAULT_CONFIG.statusQueOcupam;
  if (!userConfig || !userConfig.bloqueiosRecorrentes) c.bloqueiosRecorrentes = DEFAULT_CONFIG.bloqueiosRecorrentes;
  if (!userConfig || !userConfig.mapaBairroZona) c.mapaBairroZona = DEFAULT_CONFIG.mapaBairroZona;
  return c;
}

/**
 * Açúcar para o cockpit: devolve os N próximos slots livres a partir de agora.
 * O default N=3 casa com "oferecer 2–3 janelas válidas" do documento diretor.
 */
function proximosSlots(args) {
  const n = args.n || 3;
  const agoraMs = args.agoraMs != null ? toEpoch(args.agoraMs) : Date.now();
  const config = mergeConfig(args.config);
  const horizonteDias = args.horizonteDias || 14;
  return calcularSlotsLivres({
    config: config,
    compromissos: args.compromissos,
    tipo: args.tipo,
    zona: args.zona,
    deMs: agoraMs,
    ateMs: agoraMs + horizonteDias * 24 * 60 * MIN_MS,
    agoraMs: agoraMs,
    limite: n,
  });
}

export {
  MF_CONFIG,             // config oficial da MF (valores reais do Marcos)
  DEFAULT_CONFIG,        // alias retrocompatível de MF_CONFIG
  DEFAULT_OFFSET_MIN,
  MAPA_BAIRRO_ZONA,      // mapa bairro→zona (dois níveis: local vs distantes)
  ZONA_LOCAL,
  calcularSlotsLivres,
  proximosSlots,
  // exportados para teste / reuso
  hhmmToMin,
  localParts,
  normalizarBairro,
  resolverZona,
  normalizarCompromissos,
  mergeConfig,
  isoComOffset,
};

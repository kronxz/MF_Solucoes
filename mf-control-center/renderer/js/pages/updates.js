/**
 * updates.js — MF Control Center
 * Módulo de Atualizações — estrutura preparada, implementação pendente.
 * Quando implementado: usa electron-updater + GitHub Releases.
 */

let _iniciado = false;

export function updatesInit() {
  if (_iniciado) return;
  _iniciado = true;

  const container = document.getElementById('page-updates');
  if (!container) return;

  container.innerHTML = '';

  // Header
  const header = document.createElement('div');
  header.className = 'dash-header';
  const headerInner = document.createElement('div');
  const h2 = document.createElement('h2');
  h2.textContent = '🔔 Atualizações';
  const sub = document.createElement('p');
  sub.className = 'dash-sub';
  sub.textContent = 'Gerenciamento de versões do MF Control Center';
  headerInner.appendChild(h2);
  headerInner.appendChild(sub);
  header.appendChild(headerInner);
  container.appendChild(header);

  // Card de versão atual
  const card = document.createElement('div');
  card.className = 'dash-card';
  container.appendChild(card);

  const title = document.createElement('h3');
  title.textContent = '📦 Versão Instalada';
  card.appendChild(title);

  const verEl = document.createElement('p');
  verEl.className = 'muted';
  verEl.textContent = 'Carregando...';
  card.appendChild(verEl);

  window.MFControl?.getVersion().then(v => {
    verEl.textContent = 'MF Control Center v' + v;
  });

  // Badge de status
  const statusBadge = document.createElement('div');
  statusBadge.style.marginTop = '16px';
  const span = document.createElement('span');
  span.className = 'bkp-tag';
  span.textContent = '✅ Você está na versão mais recente';
  statusBadge.appendChild(span);
  card.appendChild(statusBadge);

  // Roadmap
  const roadmapCard = document.createElement('div');
  roadmapCard.className = 'dash-card';
  roadmapCard.style.marginTop = '16px';
  container.appendChild(roadmapCard);

  const roadTitle = document.createElement('h3');
  roadTitle.textContent = '🗺️ Auto-Update — Arquitetura Preparada';
  roadmapCard.appendChild(roadTitle);

  const items = [
    '📦 electron-updater — integração pendente',
    '🏠 GitHub Releases — canal de distribuição',
    '🔒 Assinatura digital do instalador — pendente',
    '🔔 Notificação silenciosa em background',
    '⚙️ Configuração em updateService.js',
  ];

  const ul = document.createElement('ul');
  ul.style.cssText = 'margin-top:12px; padding-left:20px; color: var(--text-muted); font-size:13px; line-height:1.9';
  for (const item of items) {
    const li = document.createElement('li');
    li.textContent = item;
    ul.appendChild(li);
  }
  roadmapCard.appendChild(ul);

  const nota = document.createElement('p');
  nota.className = 'muted';
  nota.style.cssText = 'margin-top:12px; font-size:12px;';
  nota.textContent = 'Auto-update não implementado nesta fase. Ver services/updateService.js.';
  roadmapCard.appendChild(nota);
}

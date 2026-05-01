// notifications.js — sininho do topbar.
// Plug-and-play: importa em qualquer pagina, monta dropdown ao clicar,
// puxa via RPC my_notifications(), marca como lida no click.
// So roda quando user esta logado.

import { supabase } from '../supabase-client.js';

const escapeHtml = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

const TYPE_ICON = {
  announcement: 'megaphone',
  feature: 'sparkles',
  bugfix: 'wrench',
  promo: 'gift',
};
const TYPE_LABEL = {
  announcement: 'Aviso',
  feature: 'Novidade',
  bugfix: 'Correção',
  promo: 'Promo',
};

let user = null;
let unreadCount = 0;
let panelOpen = false;
let panelEl = null;

function fmtRelative(iso) {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.round(diff / 60000);
  if (min < 1) return 'agora';
  if (min < 60) return `${min}min`;
  const h = Math.round(min / 60);
  if (h < 24) return `${h}h`;
  const d = Math.round(h / 24);
  if (d < 7) return `${d}d`;
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
}

async function refreshUnread() {
  const btn = document.querySelector('.topbar-btn[title="Notificações"]');
  if (!btn) return;
  const { data } = await supabase.rpc('unread_notifications_count');
  unreadCount = data || 0;

  // Badge
  let badge = btn.querySelector('.notif-badge');
  if (unreadCount > 0) {
    if (!badge) {
      badge = document.createElement('span');
      badge.className = 'notif-badge';
      btn.appendChild(badge);
    }
    badge.textContent = unreadCount > 99 ? '99+' : String(unreadCount);
  } else if (badge) {
    badge.remove();
  }
}

async function openPanel() {
  if (panelOpen) { closePanel(); return; }
  panelOpen = true;

  const btn = document.querySelector('.topbar-btn[title="Notificações"]');
  if (!btn) return;

  panelEl = document.createElement('div');
  panelEl.className = 'notif-panel';
  panelEl.innerHTML = `
    <div class="notif-head">
      <strong>Notificações</strong>
      <button class="notif-mark-all" type="button">Marcar todas como lidas</button>
    </div>
    <div class="notif-list" id="notifList">
      <div class="notif-loading"><span class="gal-spinner"></span> Carregando…</div>
    </div>
  `;
  document.body.appendChild(panelEl);
  positionPanel(btn);

  // Pega lista
  const { data: items, error } = await supabase.rpc('my_notifications', { p_limit: 30 });
  const list = panelEl.querySelector('#notifList');
  if (error) {
    list.innerHTML = '<div class="notif-empty">Erro ao carregar</div>';
    return;
  }
  if (!items || items.length === 0) {
    list.innerHTML = `
      <div class="notif-empty">
        <i data-lucide="bell-off"></i>
        <p>Sem novidades por aqui</p>
        <small>Avisos do Innova aparecem aqui quando rolam.</small>
      </div>`;
    if (window.lucide) lucide.createIcons();
    return;
  }

  list.innerHTML = items.map(n => `
    <a class="notif-item ${n.is_read ? '' : 'unread'}" data-id="${n.id}" href="${escapeHtml(n.link || '#')}" ${n.link ? '' : 'data-nolink="1"'}>
      <span class="notif-icon notif-${n.type}">
        <i data-lucide="${TYPE_ICON[n.type] || 'bell'}"></i>
      </span>
      <div class="notif-body">
        <div class="notif-title-row">
          <span class="notif-tag">${TYPE_LABEL[n.type] || n.type}</span>
          <span class="notif-time">${fmtRelative(n.created_at)}</span>
        </div>
        <strong>${escapeHtml(n.title)}</strong>
        ${n.body ? `<p>${escapeHtml(n.body)}</p>` : ''}
      </div>
      ${!n.is_read ? '<span class="notif-dot"></span>' : ''}
    </a>
  `).join('');

  if (window.lucide) lucide.createIcons();

  // Click handlers
  list.querySelectorAll('.notif-item').forEach(item => {
    item.addEventListener('click', async (e) => {
      const id = item.dataset.id;
      // Marca lido
      if (item.classList.contains('unread')) {
        await supabase.rpc('mark_notification_read', { p_id: id });
        item.classList.remove('unread');
        item.querySelector('.notif-dot')?.remove();
        refreshUnread();
      }
      // Sem link? bloqueia navegacao
      if (item.dataset.nolink === '1') {
        e.preventDefault();
        return;
      }
    });
  });

  // Mark all
  panelEl.querySelector('.notif-mark-all').addEventListener('click', async () => {
    await supabase.rpc('mark_all_notifications_read');
    list.querySelectorAll('.notif-item.unread').forEach(i => {
      i.classList.remove('unread');
      i.querySelector('.notif-dot')?.remove();
    });
    refreshUnread();
  });

  // Click fora fecha
  setTimeout(() => {
    document.addEventListener('click', outsideClick);
  }, 50);
}

function positionPanel(btn) {
  const rect = btn.getBoundingClientRect();
  panelEl.style.top = `${rect.bottom + 8}px`;
  panelEl.style.right = `${window.innerWidth - rect.right}px`;
}

function closePanel() {
  panelOpen = false;
  panelEl?.remove();
  panelEl = null;
  document.removeEventListener('click', outsideClick);
}

function outsideClick(e) {
  if (!panelEl) return;
  if (panelEl.contains(e.target)) return;
  if (e.target.closest('.topbar-btn[title="Notificações"]')) return;
  closePanel();
}

// Init: anexa handler ao botao do sininho
function attachBellHandler() {
  const btn = document.querySelector('.topbar-btn[title="Notificações"]');
  if (!btn) return;
  btn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    openPanel();
  });
}

async function init() {
  // Espera supabase carregar (modulo)
  if (!window.supabase) {
    await new Promise(r => document.addEventListener('supabase-ready', r, { once: true }));
  }
  const { data: { user: u } } = await supabase.auth.getUser();
  user = u;
  if (!user) return;
  attachBellHandler();
  refreshUnread();
  // Polling leve a cada 90s
  setInterval(refreshUnread, 90000);
}

init();

// Lista os prompts favoritados pelo usuario logado.

import { supabase } from '../supabase-client.js';

const $ = (id) => document.getElementById(id);
const escapeHtml = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmtNumber = (n) => n == null ? '0' : (n >= 1000 ? (n/1000).toFixed(1).replace(/\.0$/,'') + 'k' : String(n));

const state = {
  user: null,
  q: '',
  sort: 'recent', // recent | popular | copies
  items: [],      // todos os favoritos (cache)
  searchDebounce: null,
};

function showToast(msg, isError) {
  const host = $('toastHost');
  const t = document.createElement('div');
  t.className = 'gal-toast' + (isError ? ' error' : '');
  t.textContent = msg;
  host.appendChild(t);
  requestAnimationFrame(() => t.classList.add('show'));
  setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 300); }, 2200);
}

async function loadFavorites() {
  const { data: favs } = await supabase
    .from('prompt_favorites')
    .select('prompt_id, created_at')
    .eq('user_id', state.user.id)
    .order('created_at', { ascending: false });

  if (!favs || favs.length === 0) return [];
  const ids = favs.map(f => f.prompt_id);
  const favTimes = Object.fromEntries(favs.map(f => [f.prompt_id, f.created_at]));

  const { data: posts } = await supabase
    .from('prompt_posts_public')
    .select('*')
    .in('id', ids);

  // Anexa quando foi favoritado pra ordenacao "recent"
  return (posts || []).map(p => ({ ...p, _faved_at: favTimes[p.id] }));
}

function filterAndSort() {
  let arr = [...state.items];

  if (state.q) {
    const q = state.q.toLowerCase();
    arr = arr.filter(p =>
      (p.title || '').toLowerCase().includes(q) ||
      (p.prompt_text || '').toLowerCase().includes(q) ||
      (p.tags || []).some(t => t.toLowerCase().includes(q))
    );
  }

  if (state.sort === 'popular')      arr.sort((a, b) => (b.likes_count - a.likes_count) || (b.copies_count - a.copies_count));
  else if (state.sort === 'copies')  arr.sort((a, b) => (b.copies_count - a.copies_count) || (b.likes_count - a.likes_count));
  else                               arr.sort((a, b) => new Date(b._faved_at) - new Date(a._faved_at));

  return arr;
}

function renderCard(p) {
  const cover = p.cover_image_url || `https://picsum.photos/seed/${encodeURIComponent(p.slug)}/600/750`;
  const author = p.author_username || p.author_display_name || 'anônimo';
  const card = document.createElement('article');
  card.className = 'gal-card';
  card.dataset.id = p.id;
  card.dataset.slug = p.slug;
  card.dataset.pro = p.is_pro ? '1' : '0';

  card.innerHTML = `
    <a href="prompt.html?slug=${encodeURIComponent(p.slug)}" class="gal-card-img" aria-label="Ver ${escapeHtml(p.title)}">
      <img src="${cover}" alt="" loading="lazy">
      ${p.is_pro ? '<span class="gal-pro-badge"><i data-lucide="lock"></i> PRO</span>' : ''}
      <span class="my-fav-badge"><i data-lucide="bookmark"></i></span>
    </a>
    <div class="gal-card-body">
      <h3>${escapeHtml(p.title)}</h3>
      <div class="gal-card-meta">
        <span class="gal-card-author"><i data-lucide="user"></i> @${escapeHtml(author)}</span>
        <span class="gal-card-actions">
          <button class="my-unfav-btn" type="button" title="Remover dos favoritos">
            <i data-lucide="bookmark-minus"></i>
          </button>
        </span>
      </div>
    </div>
  `;
  $('grid').appendChild(card);
  if (window.lucide) lucide.createIcons();
}

function reloadGrid() {
  $('grid').innerHTML = '';
  $('emptyMsg').hidden = true;
  const arr = filterAndSort();
  if (!arr.length) {
    $('emptyMsg').hidden = false;
    return;
  }
  arr.forEach(renderCard);
}

async function unfavorite(card) {
  const id = card.dataset.id;
  const { error } = await supabase
    .from('prompt_favorites')
    .delete()
    .eq('prompt_id', id)
    .eq('user_id', state.user.id);
  if (error) { showToast('Erro: ' + error.message, true); return; }
  state.items = state.items.filter(p => p.id !== id);
  card.style.opacity = '0.4';
  setTimeout(() => {
    card.remove();
    if (!state.items.length) $('emptyMsg').hidden = false;
  }, 200);
  showToast('Removido dos favoritos');
}

function setupListeners() {
  $('searchInput').addEventListener('input', e => {
    clearTimeout(state.searchDebounce);
    state.q = e.target.value.trim();
    state.searchDebounce = setTimeout(reloadGrid, 200);
  });
  $('topSearch')?.addEventListener('input', e => {
    $('searchInput').value = e.target.value;
    $('searchInput').dispatchEvent(new Event('input'));
  });
  $('sortSel').addEventListener('change', e => { state.sort = e.target.value; reloadGrid(); });

  $('grid').addEventListener('click', e => {
    const btn = e.target.closest('.my-unfav-btn');
    if (btn) {
      e.preventDefault();
      e.stopPropagation();
      const card = btn.closest('.gal-card');
      unfavorite(card);
    }
  });
}

async function init() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    $('authGate').hidden = false;
    $('goLogin').href = `login.html?return=${encodeURIComponent(location.pathname)}`;
    return;
  }
  state.user = user;
  $('favApp').hidden = false;

  setupListeners();
  $('loader').hidden = false;
  state.items = await loadFavorites();
  $('loader').hidden = true;
  reloadGrid();
}

init();

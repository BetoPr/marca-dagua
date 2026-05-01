// Lista os prompts favoritados pelo usuario logado.

import { supabase } from '../supabase-client.js';
import { renderPromptCard } from './cards.js';

const $ = (id) => document.getElementById(id);

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
  const card = renderPromptCard(p, { mode: 'fav' });
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

  $('grid').addEventListener('click', async e => {
    const copyBtn = e.target.closest('.gal-card-copy');
    if (copyBtn) {
      e.preventDefault();
      e.stopPropagation();
      const card = copyBtn.closest('.gal-card');
      await handleCopy(card);
      return;
    }
    const unfavBtn = e.target.closest('.my-unfav-btn');
    if (unfavBtn) {
      e.preventDefault();
      e.stopPropagation();
      const card = unfavBtn.closest('.gal-card');
      unfavorite(card);
    }
  });
}

async function handleCopy(card) {
  const slug = card.dataset.slug;
  const { data: text, error } = await supabase.rpc('get_prompt_text', { p_slug: slug });
  if (error || !text) { showToast('Prompt indisponível', true); return; }
  try { await navigator.clipboard.writeText(text); }
  catch { showToast('Falha ao copiar', true); return; }
  await supabase.from('prompt_copies').insert({ prompt_id: card.dataset.id, user_id: state.user.id });
  const btn = card.querySelector('.gal-card-copy');
  if (btn) {
    btn.classList.add('copied');
    btn.innerHTML = '<i data-lucide="check"></i> Copiado!';
    if (window.lucide) lucide.createIcons();
    setTimeout(() => {
      btn.classList.remove('copied');
      btn.innerHTML = '<i data-lucide="copy"></i> Copiar';
      if (window.lucide) lucide.createIcons();
    }, 1800);
  }
  showToast('Prompt copiado ✓');
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

// Galeria publica de prompts.
// Le `prompt_posts_public` (view com autor) via supabase com filtros.
// Copia conteudo via RPC `get_prompt_text` (gateia Pro server-side).

import { supabase } from '../supabase-client.js';
import { CATEGORIES, MODELS, TONES, LANGS } from './options.js';

// ===== Config =====
const PAGE_SIZE = 24;

// ===== State =====
const state = {
  q: '',
  period: 'all',   // all | 24h | 7d | 30d | 90d
  proOnly: false,
  sort: 'recent',  // recent | popular | copies
  categories: [],
  models: [],
  tones: [],
  langs: [],
  page: 0,
  loading: false,
  done: false,
  user: null,
  searchDebounce: null,
};

const $ = (id) => document.getElementById(id);

// ===== URL sync =====
function readURL() {
  const p = new URLSearchParams(location.search);
  state.q = p.get('q') || '';
  state.period = p.get('period') || 'all';
  state.proOnly = p.get('pro') === '1';
  state.sort = p.get('sort') || 'recent';
  state.categories = (p.get('cat') || '').split(',').filter(Boolean);
  state.models = (p.get('model') || '').split(',').filter(Boolean);
  state.tones = (p.get('tone') || '').split(',').filter(Boolean);
  state.langs = (p.get('lang') || '').split(',').filter(Boolean);
}

function writeURL() {
  const p = new URLSearchParams();
  if (state.q) p.set('q', state.q);
  if (state.period !== 'all') p.set('period', state.period);
  if (state.proOnly) p.set('pro', '1');
  if (state.sort !== 'recent') p.set('sort', state.sort);
  if (state.categories.length) p.set('cat', state.categories.join(','));
  if (state.models.length) p.set('model', state.models.join(','));
  if (state.tones.length) p.set('tone', state.tones.join(','));
  if (state.langs.length) p.set('lang', state.langs.join(','));
  const qs = p.toString();
  history.replaceState(null, '', qs ? '?' + qs : location.pathname);
}

// ===== Helpers =====
function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

function showToast(msg, isError) {
  const host = $('toastHost');
  const t = document.createElement('div');
  t.className = 'gal-toast' + (isError ? ' error' : '');
  t.textContent = msg;
  host.appendChild(t);
  requestAnimationFrame(() => t.classList.add('show'));
  setTimeout(() => {
    t.classList.remove('show');
    setTimeout(() => t.remove(), 300);
  }, 2200);
}

function fmtNumber(n) {
  if (n == null) return '—';
  if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
  return String(n);
}

// ===== Build query =====
function buildQuery({ count = false } = {}) {
  let q = supabase.from('prompt_posts_public').select('*', count ? { count: 'exact' } : undefined);

  if (state.q) {
    const term = state.q.replace(/[%_]/g, ''); // escapa wildcards
    q = q.or(`title.ilike.%${term}%,prompt_text.ilike.%${term}%`);
  }
  if (state.proOnly) q = q.eq('is_pro', true);
  if (state.categories.length) q = q.in('category', state.categories);
  if (state.models.length)     q = q.in('model_used', state.models);
  if (state.tones.length)      q = q.in('tone', state.tones);
  if (state.langs.length)      q = q.in('language', state.langs);

  if (state.period !== 'all') {
    const days = { '24h': 1, '7d': 7, '30d': 30, '90d': 90 }[state.period];
    if (days) {
      const since = new Date(Date.now() - days * 86400 * 1000).toISOString();
      q = q.gte('created_at', since);
    }
  }

  if (state.sort === 'popular')      q = q.order('likes_count', { ascending: false }).order('created_at', { ascending: false });
  else if (state.sort === 'copies')  q = q.order('copies_count', { ascending: false }).order('created_at', { ascending: false });
  else                               q = q.order('created_at', { ascending: false });

  return q;
}

// ===== Render cards =====
function clearGrid() {
  $('grid').innerHTML = '';
  $('emptyMsg').hidden = true;
  $('endMsg').hidden = true;
  state.page = 0;
  state.done = false;
}

function renderCard(p) {
  const cover = p.cover_image_url || `https://picsum.photos/seed/${encodeURIComponent(p.slug)}/600/750`;
  const author = p.author_username || p.author_display_name || 'anônimo';
  const previewLen = 160;
  const preview = (p.prompt_text || '').slice(0, previewLen) + ((p.prompt_text || '').length > previewLen ? '…' : '');

  const card = document.createElement('article');
  card.className = 'gal-card';
  card.dataset.id = p.id;
  card.dataset.slug = p.slug;
  card.dataset.pro = p.is_pro ? '1' : '0';

  card.innerHTML = `
    <a href="prompt.html?slug=${encodeURIComponent(p.slug)}" class="gal-card-img" aria-label="Ver detalhes do prompt ${escapeHtml(p.title)}">
      <img src="${cover}" alt="" loading="lazy">
      ${p.is_pro ? '<span class="gal-pro-badge"><i data-lucide="lock"></i> PRO</span>' : ''}
      ${p.is_validated ? '<span class="gal-validated-badge" title="Testado pela curadoria"><i data-lucide="badge-check"></i></span>' : ''}
      <div class="gal-card-overlay">
        <p class="gal-card-preview">${escapeHtml(preview)}</p>
        <button class="gal-card-copy" type="button">
          <i data-lucide="copy"></i> Copiar prompt
        </button>
      </div>
    </a>
    <div class="gal-card-body">
      <h3>${escapeHtml(p.title)}</h3>
      <div class="gal-card-meta">
        <span class="gal-card-author"><i data-lucide="user"></i> @${escapeHtml(author)}</span>
        <span class="gal-card-likes" title="Curtidas">
          <i data-lucide="heart"></i> ${fmtNumber(p.likes_count)}
        </span>
      </div>
    </div>
  `;
  $('grid').appendChild(card);
  if (window.lucide) lucide.createIcons();
}

// ===== Load page (infinite scroll) =====
async function loadPage() {
  if (state.loading || state.done) return;
  state.loading = true;
  $('loader').hidden = false;

  const from = state.page * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;
  const { data, error } = await buildQuery().range(from, to);

  $('loader').hidden = true;
  state.loading = false;

  if (error) {
    console.error('Galeria load error:', error);
    showToast('Erro ao carregar prompts', true);
    return;
  }

  if (!data || data.length === 0) {
    state.done = true;
    if (state.page === 0) $('emptyMsg').hidden = false;
    else $('endMsg').hidden = false;
    return;
  }
  if (data.length < PAGE_SIZE) state.done = true;

  state.page++;
  data.forEach(renderCard);
}

async function reload() {
  clearGrid();
  await loadPage();
}

// ===== Stats =====
async function loadStats() {
  const { data, error } = await supabase.rpc('gallery_stats');
  if (error || !data) return;
  $('statPrompts').textContent  = fmtNumber(data.total_prompts);
  $('statCreators').textContent = fmtNumber(data.total_creators);
  $('statCopies').textContent   = fmtNumber(data.total_copies);
}

// ===== Copy handler =====
async function handleCopy(card) {
  const slug = card.dataset.slug;
  const isPro = card.dataset.pro === '1';

  const { data: text, error } = await supabase.rpc('get_prompt_text', { p_slug: slug });
  if (error) {
    showToast('Erro ao copiar', true);
    console.error(error);
    return;
  }
  if (!text) {
    if (isPro) openProModal();
    else showToast('Prompt indisponível', true);
    return;
  }

  try {
    await navigator.clipboard.writeText(text);
  } catch {
    showToast('Falha ao copiar', true);
    return;
  }

  // Telemetria de copia
  await supabase.from('prompt_copies').insert({
    prompt_id: card.dataset.id,
    user_id: state.user?.id || null,
  });

  // Feedback visual
  const btn = card.querySelector('.gal-card-copy');
  if (btn) {
    btn.classList.add('copied');
    btn.innerHTML = '<i data-lucide="check"></i> Copiado!';
    if (window.lucide) lucide.createIcons();
    setTimeout(() => {
      btn.classList.remove('copied');
      btn.innerHTML = '<i data-lucide="copy"></i> Copiar prompt';
      if (window.lucide) lucide.createIcons();
    }, 1800);
  }

  showToast('Prompt copiado ✓');
}

// ===== Pro modal =====
function openProModal() { $('proModal').hidden = false; }
function closeProModal() { $('proModal').hidden = true; }

// ===== Filter UI builders =====
function buildChipGrid(containerId, options, stateKey) {
  const c = $(containerId);
  c.innerHTML = options.map(([v, label]) =>
    `<button type="button" class="gal-fchip${state[stateKey].includes(v) ? ' active' : ''}" data-value="${v}">${label}</button>`
  ).join('');
  c.addEventListener('click', e => {
    const btn = e.target.closest('.gal-fchip');
    if (!btn) return;
    const v = btn.dataset.value;
    const arr = state[stateKey];
    const idx = arr.indexOf(v);
    if (idx === -1) arr.push(v); else arr.splice(idx, 1);
    btn.classList.toggle('active');
    onFiltersChanged();
  });
}

function syncFilterUI() {
  $('searchInput').value = state.q;
  $('proOnly').checked = state.proOnly;
  $('sortSel').value = state.sort;
  document.querySelectorAll('#periodChips .gal-chip').forEach(b => {
    b.classList.toggle('active', b.dataset.period === state.period);
  });
}

function hasActiveFilters() {
  return state.q || state.period !== 'all' || state.proOnly ||
    state.sort !== 'recent' || state.categories.length || state.models.length ||
    state.tones.length || state.langs.length;
}

function updateClearBtn() {
  $('clearBtn').hidden = !hasActiveFilters();
}

function onFiltersChanged() {
  writeURL();
  updateClearBtn();
  reload();
}

// ===== Listeners =====
function setupListeners() {
  $('searchInput').addEventListener('input', e => {
    clearTimeout(state.searchDebounce);
    state.q = e.target.value.trim();
    state.searchDebounce = setTimeout(onFiltersChanged, 300);
  });

  $('topSearch')?.addEventListener('input', e => {
    $('searchInput').value = e.target.value;
    $('searchInput').dispatchEvent(new Event('input'));
  });

  $('periodChips').addEventListener('click', e => {
    const b = e.target.closest('.gal-chip');
    if (!b) return;
    state.period = b.dataset.period;
    document.querySelectorAll('#periodChips .gal-chip').forEach(x => x.classList.toggle('active', x === b));
    onFiltersChanged();
  });

  $('proOnly').addEventListener('change', e => {
    state.proOnly = e.target.checked;
    onFiltersChanged();
  });

  $('sortSel').addEventListener('change', e => {
    state.sort = e.target.value;
    onFiltersChanged();
  });

  $('clearBtn').addEventListener('click', () => {
    Object.assign(state, { q: '', period: 'all', proOnly: false, sort: 'recent',
      categories: [], models: [], tones: [], langs: [] });
    syncFilterUI();
    buildChipGrid('categoryChips', CATEGORIES, 'categories');
    buildChipGrid('modelChips', MODELS, 'models');
    buildChipGrid('toneChips', TONES, 'tones');
    buildChipGrid('langChips', LANGS, 'langs');
    onFiltersChanged();
  });

  // Click delegation no grid: botao Copiar nao navega; resto do card vai pro detalhe
  $('grid').addEventListener('click', async e => {
    const copyBtn = e.target.closest('.gal-card-copy');
    if (copyBtn) {
      e.preventDefault();
      e.stopPropagation();
      const card = copyBtn.closest('.gal-card');
      if (card) await handleCopy(card);
    }
  });

  // Salva URL atual pra "Voltar" preservar filtros do detalhe
  document.addEventListener('click', e => {
    const a = e.target.closest('.gal-card-img');
    if (a) {
      try { sessionStorage.setItem('gal-last-url', location.pathname + location.search); } catch {}
    }
  });

  // Pro modal
  $('proClose').addEventListener('click', closeProModal);
  $('proCancel').addEventListener('click', closeProModal);
  $('proModal').addEventListener('click', e => {
    if (e.target.id === 'proModal') closeProModal();
  });
  $('proGoUpgrade').addEventListener('click', () => {
    showToast('Plano Pro chega em breve. Te avisamos no e-mail.');
    closeProModal();
  });
}

// ===== Infinite scroll =====
function setupInfiniteScroll() {
  const obs = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) loadPage();
    });
  }, { rootMargin: '300px' });
  obs.observe($('sentinel'));
}

// ===== Init =====
async function init() {
  readURL();
  buildChipGrid('categoryChips', CATEGORIES, 'categories');
  buildChipGrid('modelChips', MODELS, 'models');
  buildChipGrid('toneChips', TONES, 'tones');
  buildChipGrid('langChips', LANGS, 'langs');
  syncFilterUI();
  updateClearBtn();
  setupListeners();
  setupInfiniteScroll();

  // Auth (so pra registrar copy com user_id)
  try {
    const { data: { user } } = await supabase.auth.getUser();
    state.user = user;
  } catch {}

  await Promise.all([loadStats(), loadPage()]);
}

init();

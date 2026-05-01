// Area pessoal: Publicados / Rascunhos / Testados.

import { supabase } from '../supabase-client.js';

const $ = (id) => document.getElementById(id);
const escapeHtml = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmtNumber = (n) => n == null ? '0' : (n >= 1000 ? (n/1000).toFixed(1).replace(/\.0$/,'') + 'k' : String(n));

const state = {
  user: null,
  tab: 'published',
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

// ===== Stats =====
async function loadStats() {
  const { data, error } = await supabase.rpc('my_stats');
  if (error || !data) return;
  $('statPub').textContent       = fmtNumber(data.published);
  $('statCopies').textContent    = fmtNumber(data.copies_received);
  $('statLikes').textContent     = fmtNumber(data.likes_received);
  $('statValidated').textContent = fmtNumber(data.validated_count);

  $('cntPub').textContent   = fmtNumber(data.published);
  $('cntDraft').textContent = fmtNumber(data.drafts);
  $('cntVal').textContent   = fmtNumber(data.validated_count);

  // Top prompt
  if (data.top_copied?.slug) {
    const top = data.top_copied;
    $('myTopCard').hidden = false;
    $('myTopCard').href = `prompt.html?slug=${encodeURIComponent(top.slug)}`;
    $('myTopTitle').textContent = top.title;
    $('myTopCount').textContent = fmtNumber(top.copies_count);
    if (top.cover) {
      $('myTopCover').style.backgroundImage = `url('${top.cover}')`;
    } else {
      $('myTopCover').style.backgroundImage = `url('https://picsum.photos/seed/${encodeURIComponent(top.slug)}/300/200')`;
    }
  }
}

// ===== Card render =====
function renderOwnCard(p, ctx) {
  const cover = p.cover_image_url || `https://picsum.photos/seed/${encodeURIComponent(p.slug)}/600/750`;
  const draft = !p.is_published;
  const card = document.createElement('article');
  card.className = 'gal-card my-own-card';
  card.dataset.id = p.id;
  card.dataset.slug = p.slug;

  card.innerHTML = `
    <a href="prompt.html?slug=${encodeURIComponent(p.slug)}" class="gal-card-img" aria-label="Ver ${escapeHtml(p.title)}">
      <img src="${cover}" alt="" loading="lazy">
      ${p.is_pro ? '<span class="gal-pro-badge"><i data-lucide="lock"></i> PRO</span>' : ''}
      ${draft ? '<span class="my-draft-badge"><i data-lucide="file-edit"></i> RASCUNHO</span>' : ''}
      <div class="my-own-overlay">
        <div class="my-own-stats">
          <span><i data-lucide="eye"></i> ${fmtNumber(p.views_count)}</span>
          <span><i data-lucide="copy"></i> ${fmtNumber(p.copies_count)}</span>
          <span><i data-lucide="heart"></i> ${fmtNumber(p.likes_count)}</span>
        </div>
        <div class="my-own-actions">
          <button class="my-act-edit" type="button" title="Editar">
            <i data-lucide="pencil"></i> Editar
          </button>
          <button class="my-act-delete" type="button" title="Excluir">
            <i data-lucide="trash-2"></i>
          </button>
        </div>
      </div>
    </a>
    <div class="gal-card-body">
      <h3>${escapeHtml(p.title)}</h3>
      <div class="gal-card-meta">
        <span><i data-lucide="clock"></i> ${new Date(p.created_at).toLocaleDateString('pt-BR')}</span>
        ${draft ? '<span class="my-draft-pill">não publicado</span>' : ''}
      </div>
    </div>
  `;
  $('grid').appendChild(card);
  if (window.lucide) lucide.createIcons();
}

function renderPublicCard(p) {
  const cover = p.cover_image_url || `https://picsum.photos/seed/${encodeURIComponent(p.slug)}/600/750`;
  const author = p.author_username || p.author_display_name || 'anônimo';
  const card = document.createElement('article');
  card.className = 'gal-card';
  card.dataset.slug = p.slug;
  card.innerHTML = `
    <a href="prompt.html?slug=${encodeURIComponent(p.slug)}" class="gal-card-img" aria-label="Ver ${escapeHtml(p.title)}">
      <img src="${cover}" alt="" loading="lazy">
      ${p.is_pro ? '<span class="gal-pro-badge"><i data-lucide="lock"></i> PRO</span>' : ''}
      <span class="my-tested-badge"><i data-lucide="badge-check"></i> Testado</span>
    </a>
    <div class="gal-card-body">
      <h3>${escapeHtml(p.title)}</h3>
      <div class="gal-card-meta">
        <span class="gal-card-author"><i data-lucide="user"></i> @${escapeHtml(author)}</span>
        <span class="gal-card-likes"><i data-lucide="heart"></i> ${fmtNumber(p.likes_count)}</span>
      </div>
    </div>
  `;
  $('grid').appendChild(card);
  if (window.lucide) lucide.createIcons();
}

// ===== Loaders por aba =====
async function loadPublished() {
  const { data, error } = await supabase
    .from('prompt_posts_public')
    .select('*')
    .eq('author_id', state.user.id)
    .eq('is_published', true)
    .order('created_at', { ascending: false });
  if (error) { showToast('Erro ao carregar', true); return []; }
  return data || [];
}

async function loadDrafts() {
  const { data, error } = await supabase
    .from('prompt_posts_public')
    .select('*')
    .eq('author_id', state.user.id)
    .eq('is_published', false)
    .order('updated_at', { ascending: false });
  if (error) { showToast('Erro ao carregar', true); return []; }
  return data || [];
}

async function loadValidated() {
  // Pega prompt_ids que o user validou
  const { data: vals } = await supabase
    .from('prompt_validations')
    .select('prompt_id, created_at')
    .eq('user_id', state.user.id)
    .order('created_at', { ascending: false });
  if (!vals || vals.length === 0) return [];
  const ids = vals.map(v => v.prompt_id);
  const { data: posts } = await supabase
    .from('prompt_posts_public')
    .select('*')
    .in('id', ids);
  // Mantem ordem de validacao (mais recente primeiro)
  const map = Object.fromEntries((posts || []).map(p => [p.id, p]));
  return ids.map(id => map[id]).filter(Boolean);
}

async function reloadGrid() {
  const grid = $('grid');
  grid.innerHTML = '';
  $('loader').hidden = false;
  $('emptyMsg').hidden = true;

  let items = [];
  let isOwn = true;
  if (state.tab === 'published') items = await loadPublished();
  else if (state.tab === 'drafts') items = await loadDrafts();
  else if (state.tab === 'validated') { items = await loadValidated(); isOwn = false; }

  $('loader').hidden = true;

  if (!items.length) {
    showEmpty();
    return;
  }

  items.forEach(p => isOwn ? renderOwnCard(p) : renderPublicCard(p));
}

function showEmpty() {
  $('emptyMsg').hidden = false;
  if (state.tab === 'published') {
    $('emptyTitle').textContent = 'Você ainda não publicou nenhum prompt';
    $('emptySub').textContent = 'Compartilhe seu primeiro prompt pra começar.';
  } else if (state.tab === 'drafts') {
    $('emptyTitle').textContent = 'Sem rascunhos';
    $('emptySub').textContent = 'Quando você salvar um prompt sem publicar, ele aparece aqui.';
  } else if (state.tab === 'validated') {
    $('emptyTitle').textContent = 'Você ainda não testou nenhum prompt';
    $('emptySub').textContent = 'Marque um prompt como testado direto na página de detalhe.';
  }
}

// ===== Actions =====
async function deletePost(card) {
  const slug = card.dataset.slug;
  const id = card.dataset.id;
  if (!confirm('Excluir este prompt? Essa ação não pode ser desfeita.')) return;

  const { error } = await supabase.from('prompt_posts').delete().eq('id', id);
  if (error) { showToast('Erro ao excluir: ' + error.message, true); return; }
  card.remove();
  showToast('Prompt excluído ✓');
  await loadStats();
  if (!$('grid').children.length) showEmpty();
}

function setupTabs() {
  document.querySelectorAll('.my-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.my-tab').forEach(b => b.classList.toggle('active', b === btn));
      state.tab = btn.dataset.tab;
      reloadGrid();
    });
  });
}

function setupGridDelegation() {
  $('grid').addEventListener('click', e => {
    const editBtn = e.target.closest('.my-act-edit');
    if (editBtn) {
      e.preventDefault();
      e.stopPropagation();
      const card = editBtn.closest('.gal-card');
      location.href = `compartilhar.html?edit=${encodeURIComponent(card.dataset.slug)}`;
      return;
    }
    const delBtn = e.target.closest('.my-act-delete');
    if (delBtn) {
      e.preventDefault();
      e.stopPropagation();
      const card = delBtn.closest('.gal-card');
      deletePost(card);
      return;
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
  $('myApp').hidden = false;

  setupTabs();
  setupGridDelegation();

  await Promise.all([loadStats(), reloadGrid()]);
}

init();

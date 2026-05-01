// Painel admin: disparar notificacoes + ver historico + metricas.
// So usuarios com profiles.is_admin = true acessam.

import { supabase } from '../supabase-client.js';

const $ = (id) => document.getElementById(id);
const escapeHtml = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmtDateTime = (iso) => new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });

function showToast(msg, isError) {
  const host = $('toastHost');
  const t = document.createElement('div');
  t.className = 'gal-toast' + (isError ? ' error' : '');
  t.textContent = msg;
  host.appendChild(t);
  requestAnimationFrame(() => t.classList.add('show'));
  setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 300); }, 2400);
}

const TYPE_LABEL = {
  announcement: '📢 Aviso',
  feature: '✨ Feature',
  bugfix: '🔧 Bugfix',
  promo: '🎁 Promo',
};
const AUDIENCE_LABEL = { all: 'Todos', free: 'Free', pro: 'Pro' };

// ===== Send notification =====
async function send() {
  const title = $('notifTitle').value.trim();
  const body = $('notifBody').value.trim();
  const link = $('notifLink').value.trim();
  const type = $('notifType').value;
  const audience = $('notifAudience').value;

  if (title.length < 4) {
    $('sendStatus').textContent = 'Título muito curto';
    $('sendStatus').className = 'up-checkout-status error';
    return;
  }

  $('sendStatus').textContent = '';
  const btn = $('sendBtn');
  btn.disabled = true;
  btn.innerHTML = '<span class="gal-spinner"></span> Disparando…';

  try {
    const { data, error } = await supabase.rpc('broadcast_notification', {
      p_title: title,
      p_body: body || null,
      p_link: link || null,
      p_type: type,
      p_audience: audience,
    });
    if (error) throw error;
    showToast('Notificação disparada ✓');
    $('notifTitle').value = '';
    $('notifBody').value = '';
    $('notifLink').value = '';
    $('titleCount').textContent = '0';
    $('bodyCount').textContent = '0';
    await loadHistory();
  } catch (err) {
    $('sendStatus').textContent = 'Erro: ' + (err.message || err);
    $('sendStatus').className = 'up-checkout-status error';
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<i data-lucide="send"></i> Disparar agora';
    if (window.lucide) lucide.createIcons();
  }
}

// ===== History =====
async function loadHistory() {
  const { data, error } = await supabase
    .from('notifications')
    .select('id, type, title, body, audience, created_at, expires_at')
    .order('created_at', { ascending: false })
    .limit(20);
  const list = $('historyList');
  if (error) { list.innerHTML = '<div class="notif-empty">Erro ao carregar</div>'; return; }
  if (!data || data.length === 0) {
    list.innerHTML = '<div class="notif-empty"><i data-lucide="inbox"></i><p>Nenhuma notificação enviada ainda</p></div>';
    if (window.lucide) lucide.createIcons();
    return;
  }
  list.innerHTML = data.map(n => `
    <div class="adm-hist-item" data-id="${n.id}">
      <div class="adm-hist-meta">
        <span class="adm-hist-type">${TYPE_LABEL[n.type] || n.type}</span>
        <span class="adm-hist-aud">${AUDIENCE_LABEL[n.audience] || n.audience}</span>
        <span class="adm-hist-time">${fmtDateTime(n.created_at)}</span>
        <button class="adm-hist-del" type="button" data-id="${n.id}" title="Excluir">
          <i data-lucide="trash-2"></i>
        </button>
      </div>
      <strong>${escapeHtml(n.title)}</strong>
      ${n.body ? `<p>${escapeHtml(n.body)}</p>` : ''}
    </div>
  `).join('');
  if (window.lucide) lucide.createIcons();

  list.querySelectorAll('.adm-hist-del').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (!confirm('Excluir esta notificação? Não vai mais aparecer pros usuários.')) return;
      const { error } = await supabase.from('notifications').delete().eq('id', btn.dataset.id);
      if (error) { showToast('Erro: ' + error.message, true); return; }
      showToast('Excluída');
      loadHistory();
    });
  });
}

// ===== Metricas =====
async function loadStats() {
  const [{ count: users }, { count: pro }, { count: posts }, { count: copies }] = await Promise.all([
    supabase.from('profiles').select('id', { count: 'exact', head: true }),
    supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('plan', 'pro'),
    supabase.from('prompt_posts').select('id', { count: 'exact', head: true }).eq('is_published', true),
    supabase.from('prompt_copies').select('id', { count: 'exact', head: true }),
  ]);
  $('statUsers').textContent = users || 0;
  $('statPro').textContent = pro || 0;
  $('statPosts').textContent = posts || 0;
  $('statCopies').textContent = copies || 0;
}

// ===== Init =====
async function init() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    $('authGate').hidden = false;
    $('goLogin').href = `login.html?return=${encodeURIComponent(location.pathname)}`;
    return;
  }
  // Checa is_admin
  const { data: prof } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .maybeSingle();
  if (!prof?.is_admin) {
    $('authGate').hidden = false;
    $('authGate').innerHTML = `
      <i data-lucide="shield-x"></i>
      <h2>Acesso negado</h2>
      <p>Esta área é só pra administradores.</p>
      <a class="gal-btn-primary" href="index.html">Voltar</a>
    `;
    if (window.lucide) lucide.createIcons();
    return;
  }
  $('adminApp').hidden = false;

  $('notifTitle').addEventListener('input', e => $('titleCount').textContent = e.target.value.length);
  $('notifBody').addEventListener('input', e => $('bodyCount').textContent = e.target.value.length);
  $('sendBtn').addEventListener('click', send);

  await Promise.all([loadHistory(), loadStats()]);
}

init();

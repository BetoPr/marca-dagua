// /upgrade — escolha de plano + waitlist Studio.
// Pagamento Asaas em breve (depende de Edge Function).

import { supabase } from '../supabase-client.js';

const $ = (id) => document.getElementById(id);

function showToast(msg, isError) {
  const host = $('toastHost');
  const t = document.createElement('div');
  t.className = 'gal-toast' + (isError ? ' error' : '');
  t.textContent = msg;
  host.appendChild(t);
  requestAnimationFrame(() => t.classList.add('show'));
  setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 300); }, 2400);
}

// ===== Pro CTA =====
$('goPro').addEventListener('click', async () => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    showToast('Faça login pra continuar');
    setTimeout(() => location.href = `login.html?return=${encodeURIComponent(location.pathname)}`, 800);
    return;
  }
  // TODO Fase 8B: chamar Edge Function asaas-create-subscription
  // Por enquanto: modal "em breve"
  $('soonModal').hidden = false;
});

$('soonClose').addEventListener('click', () => $('soonModal').hidden = true);
$('soonOk').addEventListener('click', () => $('soonModal').hidden = true);
$('soonModal').addEventListener('click', e => {
  if (e.target.id === 'soonModal') $('soonModal').hidden = true;
});

// ===== Studio waitlist =====
$('waitlistForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = $('waitlistEmail').value.trim().toLowerCase();
  if (!email) return;
  const msg = $('waitlistMsg');
  msg.textContent = 'Enviando…';
  msg.className = 'up-card-foot';

  const { data: { user } } = await supabase.auth.getUser();

  const { error } = await supabase
    .from('studio_waitlist')
    .insert({ email, user_id: user?.id || null });

  if (error) {
    if (String(error.message || '').includes('duplicate')) {
      msg.textContent = '✓ Você já está na lista!';
      msg.className = 'up-card-foot ok';
    } else {
      msg.textContent = 'Erro: ' + error.message;
      msg.className = 'up-card-foot error';
    }
    return;
  }

  msg.textContent = '✓ Adicionado à lista. Te avisamos no lançamento.';
  msg.className = 'up-card-foot ok';
  $('waitlistEmail').value = '';
});

// ===== Render plano atual (se logado) =====
async function showCurrentPlan() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  const { data: prof } = await supabase
    .from('profiles')
    .select('plan, pro_until')
    .eq('id', user.id)
    .maybeSingle();
  const isPro = (prof?.plan === 'pro' || prof?.plan === 'studio')
    && prof?.pro_until && new Date(prof.pro_until) > new Date();
  if (isPro) {
    document.querySelector('.up-pro').classList.add('current');
    $('goPro').innerHTML = '<i data-lucide="check"></i> Plano atual';
    $('goPro').disabled = true;
    if (window.lucide) lucide.createIcons();
  }
}

showCurrentPlan();

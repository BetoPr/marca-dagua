// /assinatura — gestão da assinatura do user.

import { supabase, SUPABASE_URL, SUPABASE_ANON_KEY } from '../supabase-client.js';

const $ = (id) => document.getElementById(id);

function showToast(msg, isError) {
  const host = document.getElementById('toastHost');
  if (!host) return;
  const t = document.createElement('div');
  t.className = 'gal-toast' + (isError ? ' error' : '');
  t.textContent = msg;
  host.appendChild(t);
  requestAnimationFrame(() => t.classList.add('show'));
  setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 300); }, 2400);
}

function fmtDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
}

async function cancelSubscription() {
  if (!confirm('Cancelar assinatura? Você continuará com Pro até o fim do ciclo já pago.')) return;
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) { showToast('Sessão expirada', true); return; }
  try {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/asaas-cancel-subscription`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
        'apikey': SUPABASE_ANON_KEY,
      },
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json?.error || `Erro ${res.status}`);
    showToast('Assinatura cancelada ✓');
    setTimeout(() => location.reload(), 1000);
  } catch (err) {
    showToast('Erro: ' + (err.message || err), true);
  }
}

async function init() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    $('authGate').hidden = false;
    $('goLogin').href = `login.html?return=${encodeURIComponent(location.pathname)}`;
    return;
  }
  $('subApp').hidden = false;

  const { data: prof } = await supabase
    .from('profiles')
    .select('plan, pro_until, asaas_subscription_id')
    .eq('id', user.id)
    .maybeSingle();

  const isPro = (prof?.plan === 'pro' || prof?.plan === 'studio')
    && prof?.pro_until && new Date(prof.pro_until) > new Date();

  if (isPro) {
    $('planName').textContent = prof.plan === 'studio' ? 'Studio' : 'Pro';
    $('planDesc').textContent = 'Você tem acesso a todos os prompts curados, construtor completo e benefícios Pro.';
    $('upgradeBtn').textContent = 'Gerenciar plano';
    $('proDetails').hidden = false;

    // Lê subscription
    const { data: sub } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (sub) {
      $('nextDue').textContent = fmtDate(sub.next_due_date);
      $('planValue').textContent = `R$ ${Number(sub.value).toFixed(2).replace('.', ',')}`;
      const statusLabel = {
        pending: 'Pendente', active: 'Ativa', overdue: 'Em atraso',
        canceled: 'Cancelada', expired: 'Expirada',
      }[sub.status] || sub.status;
      $('planStatus').textContent = statusLabel;
      $('planCycle').textContent = sub.cycle === 'YEARLY' ? 'Anual' : 'Mensal';
    }

    $('cancelSub').addEventListener('click', cancelSubscription);
  } else {
    // Lazy check: se profile diz Pro mas pro_until passou, rebaixa
    if (prof?.plan && prof.plan !== 'free' && prof?.pro_until && new Date(prof.pro_until) <= new Date()) {
      await supabase.from('profiles').update({ plan: 'free', pro_until: null }).eq('id', user.id);
    }
  }
}

init();

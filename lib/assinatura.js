// /assinatura — gestão da assinatura do user.
// Por enquanto mostra plano atual; pagamento real entra na Fase 8B com Asaas.

import { supabase } from '../supabase-client.js';

const $ = (id) => document.getElementById(id);

function fmtDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
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
  }
}

init();

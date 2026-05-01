// asaas-cancel-subscription
// Cancela a assinatura no Asaas. User mantem pro_until ate o fim do ciclo.
//
// POST /functions/v1/asaas-cancel-subscription
// Headers: Authorization: Bearer <user-jwt>

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';

const ASAAS_API_KEY = Deno.env.get('ASAAS_API_KEY')!;
const ASAAS_API_URL = Deno.env.get('ASAAS_API_URL') || 'https://sandbox.asaas.com/api/v3';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405, headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return jsonRes({ error: 'no auth' }, 401);

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return jsonRes({ error: 'invalid user' }, 401);

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { data: profile } = await admin
      .from('profiles')
      .select('asaas_subscription_id')
      .eq('id', user.id)
      .maybeSingle();

    if (!profile?.asaas_subscription_id) {
      return jsonRes({ error: 'sem assinatura ativa' }, 404);
    }

    // DELETE no Asaas
    const res = await fetch(`${ASAAS_API_URL}/subscriptions/${profile.asaas_subscription_id}`, {
      method: 'DELETE',
      headers: { 'access_token': ASAAS_API_KEY },
    });
    if (!res.ok) {
      const t = await res.text();
      return jsonRes({ error: 'asaas delete failed', details: t.slice(0, 200) }, 502);
    }

    await admin.from('subscriptions').update({ status: 'canceled' })
      .eq('asaas_subscription_id', profile.asaas_subscription_id);
    // pro_until fica intocado — cliente Pro ate o fim do ciclo

    return jsonRes({ ok: true });
  } catch (err) {
    return jsonRes({ error: String(err.message || err) }, 500);
  }
});

function jsonRes(obj: any, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

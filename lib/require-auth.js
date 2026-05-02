// Gating de auth simples — redireciona pra login.html?return=<atual> se anon.
// Uso: <script type="module" src="lib/require-auth.js"></script> antes do conteúdo da página.
// login.html já tem CTA "Criar conta grátis" pra quem ainda não tem conta.

import { supabase } from '../supabase-client.js';

(async () => {
  // Esconde body até resolver auth pra evitar flash do conteúdo restrito.
  const style = document.createElement('style');
  style.id = 'requireAuthGuard';
  style.textContent = 'body { visibility: hidden; }';
  document.head.appendChild(style);

  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      const back = location.pathname + location.search;
      location.replace(`login.html?return=${encodeURIComponent(back)}`);
      return;
    }
  } catch {
    // Em caso de erro, segue silenciosamente — a própria página pode lidar.
  }

  // Auth OK: revela o body.
  style.remove();
})();

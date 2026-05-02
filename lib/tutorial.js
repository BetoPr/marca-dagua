// Tooltips de primeiro uso (Camada 1).
// Roda em paginas chave; mostra tip 1x e salva flag em localStorage.

const TIPS = {
  galeria: {
    storageKey: 'tut-galeria-v1',
    title: 'Bem-vindo à Galeria',
    body: 'Cada imagem vem com o prompt que a criou. Click no card pra ver detalhes ou copiar direto. Pra saber mais, leia o <a href="guia.html">guia rápido</a>.',
    show: () => location.pathname.endsWith('galeria.html'),
    target: () => document.querySelector('.gal-grid'),
  },
  construtor: {
    storageKey: 'tut-construtor-v1',
    title: 'Como usar o Construtor',
    body: 'Comece pelo bloco 1 (Sujeito) e vá descendo. Cada chip que você marca aparece no preview ao lado em tempo real. <a href="guia.html#construtor">Ver guia completo</a>.',
    show: () => location.pathname.endsWith('construtor.html'),
    target: () => document.querySelector('.cb-block'),
  },
  chatia: {
    storageKey: 'tut-chatia-v1',
    title: 'Configure sua chave Groq',
    body: 'O Chat IA usa <strong>sua própria chave</strong> (Groq tem free tier generoso). <a href="https://console.groq.com/keys" target="_blank">Pegar chave grátis</a> · <a href="guia.html">ler guia</a>.',
    show: () => location.pathname.endsWith('chat-ia.html'),
    target: () => document.querySelector('#openSettings'),
  },
};

(function setupTutorial() {
  // Espera DOM
  setTimeout(() => {
    Object.entries(TIPS).forEach(([key, tip]) => {
      if (!tip.show()) return;
      if (localStorage.getItem(tip.storageKey)) return;
      const target = tip.target();
      if (!target) return;
      showTip(key, tip, target);
    });
  }, 1500); // espera UI carregar (auth check, etc)
})();

function showTip(key, tip, target) {
  const tipEl = document.createElement('div');
  tipEl.className = 'tut-tip';
  tipEl.innerHTML = `
    <div class="tut-tip-head">
      <strong><i data-lucide="sparkles"></i> ${escapeHtml(tip.title)}</strong>
      <button class="tut-tip-close" type="button"><i data-lucide="x"></i></button>
    </div>
    <p>${tip.body}</p>
  `;
  document.body.appendChild(tipEl);

  // Posiciona próximo do target
  const rect = target.getBoundingClientRect();
  const tipRect = tipEl.getBoundingClientRect();
  let top = rect.bottom + 12;
  let left = rect.left;
  // Se sai da tela, ajusta
  if (left + tipRect.width > window.innerWidth - 16) left = window.innerWidth - tipRect.width - 16;
  if (left < 16) left = 16;
  if (top + tipRect.height > window.innerHeight - 16) top = rect.top - tipRect.height - 12;
  tipEl.style.top = `${Math.max(16, top)}px`;
  tipEl.style.left = `${left}px`;

  if (window.lucide) lucide.createIcons();

  function close() {
    localStorage.setItem(tip.storageKey, '1');
    tipEl.remove();
    document.removeEventListener('click', outside);
  }

  function outside(e) {
    if (!tipEl.contains(e.target)) close();
  }

  tipEl.querySelector('.tut-tip-close').addEventListener('click', close);
  // Fecha ao clicar fora (com pequeno delay pra evitar fechar logo)
  setTimeout(() => document.addEventListener('click', outside), 300);
}

function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

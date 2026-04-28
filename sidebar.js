(function buildSidebar() {
  const items = [
    { type: 'section', label: 'Geral' },
    { href: 'index.html', icon: '🏠', label: 'Início' },
    { type: 'section', label: 'Ferramentas' },
    { href: 'marca-dagua.html', icon: '💧', label: "Marca d'água" },
    { href: 'remove-bg.html', icon: '✂️', label: 'Remover fundo' },
    { href: '#', icon: '📐', label: 'Redimensionar', disabled: true, badge: 'Em breve' },
    { href: '#', icon: '🏷️', label: 'Renomear lote', disabled: true, badge: 'Em breve' },
    { href: '#', icon: '🗜️', label: 'Comprimir', disabled: true, badge: 'Em breve' },
    { href: '#', icon: '🖼️', label: 'Mockups', disabled: true, badge: 'Em breve' },
  ];

  const aside = document.querySelector('aside.sidebar');
  if (!aside) return;

  const path = (location.pathname.split('/').pop() || 'index.html').toLowerCase();

  let html = `
    <div class="brand">
      <div class="brand-text">
        <span class="b1">INNOVA</span>
        <span class="b-amp">&amp;</span>
        <span class="b2">AI</span>
      </div>
      <div class="brand-tag">Studio</div>
    </div>
    <nav>
  `;

  items.forEach(it => {
    if (it.type === 'section') {
      html += `<div class="nav-section">${it.label}</div>`;
      return;
    }
    const isActive = it.href.toLowerCase() === path;
    const cls = [isActive ? 'active' : '', it.disabled ? 'disabled' : ''].filter(Boolean).join(' ');
    html += `<a href="${it.href}" class="${cls}">
      <span class="icon">${it.icon}</span>
      <span>${it.label}</span>
      ${it.badge ? `<span class="badge">${it.badge}</span>` : ''}
    </a>`;
  });

  html += `</nav>
    <div class="sidebar-footer">
      <div><strong style="color:var(--text);">100% local</strong></div>
      <div>Suas imagens não saem do navegador.</div>
    </div>
  `;

  aside.innerHTML = html;
})();

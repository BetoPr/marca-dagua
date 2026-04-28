(function buildSidebar() {
  const sections = [
    {
      label: 'Principal',
      icon: 'layout-grid',
      color: 'green',
      items: [
        { href: 'index.html', icon: 'home', label: 'Início' },
      ],
    },
    {
      label: 'Ferramentas',
      icon: 'wrench',
      color: 'blue',
      items: [
        { href: 'marca-dagua.html', icon: 'droplet', label: "Marca d'água" },
        { href: 'remove-bg.html', icon: 'scissors', label: 'Remover fundo' },
        { href: 'comprimir.html', icon: 'package', label: 'Comprimir' },
        { href: 'converter.html', icon: 'repeat', label: 'Converter formato' },
      ],
    },
    {
      label: 'IA',
      icon: 'sparkles',
      color: 'purple',
      items: [
        { href: 'chat-ia.html', icon: 'message-circle', label: 'Chat IA' },
      ],
    },
    {
      label: 'Em breve',
      icon: 'clock',
      color: 'gray',
      items: [
        { href: '#', icon: 'maximize-2', label: 'Redimensionar', disabled: true },
        { href: '#', icon: 'tag', label: 'Renomear', disabled: true },
        { href: '#', icon: 'frame', label: 'Mockups', disabled: true },
      ],
    },
  ];

  const aside = document.querySelector('aside.sidebar');
  if (!aside) return;

  const path = (location.pathname.split('/').pop() || 'index.html').toLowerCase();
  const collapsed = localStorage.getItem('sidebar-collapsed') === '1';
  if (collapsed) document.body.classList.add('sidebar-collapsed');

  let html = `
    <div class="sidebar-header">
      <div class="brand-text">
        <span class="b1">INNOVA</span>
        <span class="b-amp">&amp;</span>
        <span class="b2">AI</span>
      </div>
      <button class="toggle-btn" id="sidebarToggle" aria-label="Recolher menu">
        <i data-lucide="${collapsed ? 'panel-left-open' : 'panel-left-close'}"></i>
      </button>
    </div>
    <nav>
  `;

  sections.forEach((sec, sIdx) => {
    const sectionHasActive = sec.items.some(it => it.href.toLowerCase() === path);
    const collapsedKey = `sidebar-section-${sIdx}-collapsed`;
    const sectionCollapsed = !sectionHasActive && localStorage.getItem(collapsedKey) === '1';
    html += `
      <button class="nav-section" data-section="${sIdx}" aria-expanded="${!sectionCollapsed}">
        <span class="icon-circle ${sec.color}"><i data-lucide="${sec.icon}"></i></span>
        <span class="label">${sec.label}</span>
        <span class="chevron"><i data-lucide="chevron-right"></i></span>
      </button>
      <div class="nav-items ${sectionCollapsed ? 'collapsed' : ''}" data-items="${sIdx}">
    `;
    sec.items.forEach(it => {
      const isActive = it.href.toLowerCase() === path;
      const cls = [isActive ? 'active' : '', it.disabled ? 'disabled' : ''].filter(Boolean).join(' ');
      html += `<a href="${it.href}" class="${cls}">
        <span class="icon"><i data-lucide="${it.icon}"></i></span>
        <span>${it.label}</span>
        ${it.disabled ? '<span class="badge">Em breve</span>' : ''}
      </a>`;
    });
    html += `</div>`;
  });

  html += `</nav>
    <div class="sidebar-footer">
      <button class="footer-item" id="themeToggle">
        <span class="icon-circle"><i data-lucide="moon"></i></span>
        <span class="info">
          <div class="title">Modo Escuro</div>
          <div class="sub">Tema atual</div>
        </span>
      </button>
      <button class="footer-item" id="accountBtn">
        <span class="icon-circle user-avatar">A</span>
        <span class="info">
          <div class="title">Conta</div>
          <div class="sub">Local · sem login</div>
        </span>
      </button>
    </div>
  `;

  aside.innerHTML = html;

  // Render icons
  if (window.lucide) lucide.createIcons();

  function setToggleIcon(isCollapsed) {
    const t = aside.querySelector('#sidebarToggle');
    const i = t?.querySelector('[data-lucide], svg');
    if (i) {
      i.outerHTML = `<i data-lucide="${isCollapsed ? 'panel-left-open' : 'panel-left-close'}"></i>`;
      if (window.lucide) lucide.createIcons();
    }
  }

  function expandSidebar() {
    document.body.classList.remove('sidebar-collapsed');
    localStorage.setItem('sidebar-collapsed', '0');
    setToggleIcon(false);
  }

  // Section accordion toggle (com lógica especial pra sidebar colapsada)
  aside.querySelectorAll('.nav-section').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = btn.dataset.section;
      const items = aside.querySelector(`.nav-items[data-items="${idx}"]`);
      const sidebarCollapsed = document.body.classList.contains('sidebar-collapsed');

      if (sidebarCollapsed) {
        // Sidebar colapsada: clicar no ícone abre a sidebar E expande essa seção
        expandSidebar();
        items.classList.remove('collapsed');
        btn.setAttribute('aria-expanded', 'true');
        localStorage.setItem(`sidebar-section-${idx}-collapsed`, '0');
      } else {
        // Sidebar expandida: comportamento normal de accordion
        const isCollapsed = items.classList.toggle('collapsed');
        btn.setAttribute('aria-expanded', !isCollapsed);
        localStorage.setItem(`sidebar-section-${idx}-collapsed`, isCollapsed ? '1' : '0');
      }
    });
  });

  // Sidebar collapse/expand pelo botão do topo
  const toggle = aside.querySelector('#sidebarToggle');
  toggle?.addEventListener('click', () => {
    const isCollapsed = document.body.classList.toggle('sidebar-collapsed');
    localStorage.setItem('sidebar-collapsed', isCollapsed ? '1' : '0');
    setToggleIcon(isCollapsed);
  });
})();

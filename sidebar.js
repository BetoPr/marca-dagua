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

  const savedTheme = localStorage.getItem('innova-theme') || 'dark';
  if (savedTheme === 'light') document.body.classList.add('light-mode');

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

  // Esconde o botão de conta na homepage; só mostra em tools onde faz sentido (chat, etc.)
  const isHome = path === 'index.html' || path === '';
  const isLight = document.body.classList.contains('light-mode');
  html += `</nav>
    <div class="sidebar-footer">
      <button class="footer-item" id="themeToggle">
        <span class="icon-circle"><i data-lucide="${isLight ? 'sun' : 'moon'}"></i></span>
        <span class="info">
          <div class="title" id="themeTitle">${isLight ? 'Modo Claro' : 'Modo Escuro'}</div>
          <div class="sub">Clique pra alternar</div>
        </span>
      </button>
      ${!isHome ? `
      <button class="footer-item" id="accountBtn" type="button">
        <span class="icon-circle user-avatar" id="accountAvatar">?</span>
        <span class="info">
          <div class="title" id="accountTitle">Entrar</div>
          <div class="sub" id="accountSub">Sincronizar histórico</div>
        </span>
      </button>` : ''}
    </div>
  `;

  aside.innerHTML = html;
  setupAuthFooter();

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

  // Theme toggle (dark/light)
  const themeBtn = aside.querySelector('#themeToggle');
  themeBtn?.addEventListener('click', () => {
    const isLightNow = document.body.classList.toggle('light-mode');
    localStorage.setItem('innova-theme', isLightNow ? 'light' : 'dark');
    const icon = themeBtn.querySelector('.icon-circle');
    const title = themeBtn.querySelector('#themeTitle');
    if (icon) icon.innerHTML = `<i data-lucide="${isLightNow ? 'sun' : 'moon'}"></i>`;
    if (title) title.textContent = isLightNow ? 'Modo Claro' : 'Modo Escuro';
    if (window.lucide) lucide.createIcons();
  });

  // Estado de login no rodapé (só roda se o botão existir — ele é escondido na homepage)
  function setupAuthFooter() {
    let currentUser = null;
    const sidebarBtn = document.getElementById('accountBtn');
    const topbarAvatar = document.querySelector('.topbar-avatar');

    const apply = async (user) => {
      currentUser = user;
      const avatar = document.getElementById('accountAvatar');
      const title = document.getElementById('accountTitle');
      const sub = document.getElementById('accountSub');
      const photoUrl = user ? await loadAvatarUrl(user) : null;
      const initial = user ? ((user.user_metadata?.display_name || user.email || '?')[0] || '?').toUpperCase() : '?';
      const name = user ? (user.user_metadata?.display_name || (user.email || '?').split('@')[0]) : '';

      // Sidebar bottom (only on tool pages)
      if (sidebarBtn) {
        if (user) {
          if (photoUrl) avatar.innerHTML = `<img src="${photoUrl}" alt="" style="width:100%;height:100%;border-radius:50%;object-fit:cover;">`;
          else avatar.textContent = initial;
          title.textContent = name;
          sub.textContent = 'Conectado ao sistema';
        } else {
          avatar.textContent = '?';
          title.textContent = 'Entrar';
          sub.textContent = 'Sincronizar histórico';
        }
      }

      // Topbar avatar (right top)
      if (topbarAvatar) {
        if (user) {
          if (photoUrl) topbarAvatar.innerHTML = `<img src="${photoUrl}" alt="" style="width:100%;height:100%;border-radius:50%;object-fit:cover;">`;
          else topbarAvatar.textContent = initial;
          topbarAvatar.title = name + ' — clique pra abrir perfil';
        } else {
          topbarAvatar.textContent = '?';
          topbarAvatar.title = 'Entrar';
        }
      }
    };

    sidebarBtn?.addEventListener('click', (e) => {
      e.preventDefault();
      if (currentUser) openProfileModal(currentUser);
      else location.href = 'login.html';
    });

    topbarAvatar?.addEventListener('click', (e) => {
      e.preventDefault();
      if (currentUser) openProfileModal(currentUser);
      else location.href = 'login.html';
    });

    if (window.whenSupabaseReady) {
      window.whenSupabaseReady(async (sb) => {
        const { data: { user } } = await sb.auth.getUser();
        apply(user);
        sb.auth.onAuthStateChange((_event, session) => apply(session?.user || null));
      });
    }
  }

  async function loadAvatarUrl(user) {
    const path = user.user_metadata?.avatar_path;
    if (!path || !window.supabase) return null;
    try {
      const { data, error } = await window.supabase.storage.from('avatars').createSignedUrl(path, 3600);
      if (error) return null;
      return data.signedUrl;
    } catch { return null; }
  }

  function openProfileModal(user) {
    let modal = document.getElementById('profileModal');
    if (modal) { modal.remove(); }
    const name = user.user_metadata?.display_name || (user.email || '?').split('@')[0];
    modal = document.createElement('div');
    modal.id = 'profileModal';
    modal.className = 'profile-modal-overlay';
    modal.innerHTML = `
      <div class="profile-modal">
        <div class="profile-modal-header">
          <h3>Configurações de perfil</h3>
          <button class="profile-modal-close" id="profileClose"><i data-lucide="x"></i></button>
        </div>
        <div class="profile-modal-body">
          <div class="profile-avatar-wrap">
            <div class="profile-avatar-big" id="profileAvatarBig">${(name[0]||'?').toUpperCase()}</div>
            <label class="profile-avatar-edit" for="profilePhotoInput">
              <i data-lucide="camera"></i>
              <input type="file" id="profilePhotoInput" accept="image/*" style="display:none;">
            </label>
          </div>
          <div class="profile-field">
            <label>Nome</label>
            <input type="text" id="profileName" value="${name.replace(/"/g,'&quot;')}" maxlength="60">
          </div>
          <div class="profile-field">
            <label>E-mail</label>
            <input type="email" value="${user.email || ''}" disabled>
          </div>
          <div class="profile-actions">
            <button class="profile-btn-save" id="profileSave">Salvar alterações</button>
            <button class="profile-btn-logout" id="profileLogout">Sair da conta</button>
          </div>
          <div class="profile-status" id="profileStatus"></div>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
    if (window.lucide) lucide.createIcons();

    loadAvatarUrl(user).then(url => {
      if (url) {
        const big = document.getElementById('profileAvatarBig');
        if (big) big.innerHTML = `<img src="${url}" alt="" style="width:100%;height:100%;border-radius:50%;object-fit:cover;">`;
      }
    });

    const close = () => modal.remove();
    document.getElementById('profileClose').onclick = close;
    modal.addEventListener('click', (e) => { if (e.target === modal) close(); });

    const status = document.getElementById('profileStatus');
    const setStatus = (msg, isError) => {
      status.textContent = msg;
      status.className = 'profile-status ' + (isError ? 'error' : 'ok');
    };

    document.getElementById('profilePhotoInput').onchange = async (e) => {
      const file = e.target.files?.[0];
      if (!file || !window.supabase) return;
      setStatus('Enviando foto…');
      try {
        const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
        const path = `${user.id}/avatar-${Date.now()}.${ext}`;
        const { error: upErr } = await window.supabase.storage.from('avatars').upload(path, file, { upsert: true, contentType: file.type });
        if (upErr) throw upErr;
        const { error: updErr } = await window.supabase.auth.updateUser({ data: { avatar_path: path } });
        if (updErr) throw updErr;
        const { data } = await window.supabase.storage.from('avatars').createSignedUrl(path, 3600);
        const big = document.getElementById('profileAvatarBig');
        if (big && data?.signedUrl) big.innerHTML = `<img src="${data.signedUrl}" alt="" style="width:100%;height:100%;border-radius:50%;object-fit:cover;">`;
        const sidebarAvatar = document.getElementById('accountAvatar');
        if (sidebarAvatar && data?.signedUrl) sidebarAvatar.innerHTML = `<img src="${data.signedUrl}" alt="" style="width:100%;height:100%;border-radius:50%;object-fit:cover;">`;
        setStatus('✓ Foto atualizada');
      } catch (err) {
        setStatus('Erro: ' + (err.message || err), true);
      }
    };

    document.getElementById('profileSave').onclick = async () => {
      const newName = document.getElementById('profileName').value.trim();
      if (!newName || !window.supabase) return;
      setStatus('Salvando…');
      try {
        const { error } = await window.supabase.auth.updateUser({ data: { display_name: newName } });
        if (error) throw error;
        const t = document.getElementById('accountTitle');
        if (t) t.textContent = newName;
        setStatus('✓ Salvo');
      } catch (err) {
        setStatus('Erro: ' + (err.message || err), true);
      }
    };

    document.getElementById('profileLogout').onclick = async () => {
      if (!confirm('Sair da conta?')) return;
      await window.innovaAuth?.signOut();
      close();
    };
  }
})();

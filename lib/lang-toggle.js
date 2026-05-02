// Botao de idioma + dropdown — injetado em qualquer .topbar-actions.
// Consome lib/i18n.js.

import { SUPPORTED_LANGS, getCurrentLang, setLang, applyTranslations } from './i18n.js';

(function setupLangToggle() {
  // Aplica idioma salvo logo
  applyTranslations();
  document.body.dataset.lang = getCurrentLang();
  document.documentElement.lang = getCurrentLang() === 'pt' ? 'pt-BR' : getCurrentLang();

  // Espera DOM ter topbar-actions; evita race condition
  function inject() {
    const actions = document.querySelector('.topbar-actions');
    if (!actions || actions.querySelector('.lang-toggle')) return;

    const wrapper = document.createElement('div');
    wrapper.className = 'lang-toggle';
    wrapper.innerHTML = `
      <button class="topbar-btn lang-btn" id="langBtn" type="button" title="Idioma" aria-haspopup="true">
        <span class="lang-current">${getLabel()}</span>
        <i data-lucide="chevron-down" class="lang-chev"></i>
      </button>
      <div class="lang-menu">
        ${SUPPORTED_LANGS.map(l => `
          <button class="lang-opt${l.code === getCurrentLang() ? ' active' : ''}" data-lang="${l.code}" type="button">
            <span class="lang-flag">${l.flag}</span>
            <span class="lang-name">${l.name}</span>
            <span class="lang-code">${l.label}</span>
          </button>
        `).join('')}
      </div>
    `;

    // Insere antes do primeiro link/avatar (depois do theme se houver)
    const themeBtn = actions.querySelector('[id^="themeToggle"]');
    if (themeBtn) themeBtn.insertAdjacentElement('afterend', wrapper);
    else actions.insertBefore(wrapper, actions.firstChild);

    if (window.lucide) lucide.createIcons();

    // Handlers
    const btn = wrapper.querySelector('#langBtn');
    const menu = wrapper.querySelector('.lang-menu');

    btn.addEventListener('click', e => {
      e.stopPropagation();
      menu.classList.toggle('open');
    });

    menu.querySelectorAll('.lang-opt').forEach(opt => {
      opt.addEventListener('click', () => {
        const code = opt.dataset.lang;
        setLang(code);
        wrapper.querySelector('.lang-current').textContent = getLabel();
        menu.querySelectorAll('.lang-opt').forEach(o => o.classList.toggle('active', o.dataset.lang === code));
        menu.classList.remove('open');
      });
    });

    document.addEventListener('click', e => {
      if (!wrapper.contains(e.target)) menu.classList.remove('open');
    });
  }

  function getLabel() {
    const cur = SUPPORTED_LANGS.find(l => l.code === getCurrentLang()) || SUPPORTED_LANGS[0];
    return cur.label;
  }

  // Tenta injetar imediatamente, e de novo após sidebar.js poder ter inserido topbar custom
  inject();
  setTimeout(inject, 50);
  setTimeout(inject, 200);
  document.addEventListener('supabase-ready', () => setTimeout(inject, 100), { once: true });
})();

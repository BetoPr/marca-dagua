// Galeria de avatares pre-feitos (DiceBear API — free, SVG).
// Url deterministica: https://api.dicebear.com/7.x/{style}/svg?seed=NOME&backgroundColor=COR

const BG = 'b6e3f4'; // azul claro como nas referencias

// Estilo 1: avataaars (humanos cartoon)
const HUMANS = ['Alex','Bia','Carlos','Daniela','Eduardo','Fernanda','Guilherme','Helena',
                'Igor','Julia','Kaue','Larissa','Mateus','Natalia']
  .map(seed => ({
    style: 'avataaars',
    url: `https://api.dicebear.com/7.x/avataaars/svg?seed=${seed}&backgroundColor=${BG}`,
  }));

// Estilo 2: fun-emoji (animais e emoji 3D-style)
const ANIMALS = ['Tiger','Bear','Fox','Panda','Rabbit','Lion','Wolf','Penguin','Owl','Cat']
  .map(seed => ({
    style: 'fun-emoji',
    url: `https://api.dicebear.com/7.x/fun-emoji/svg?seed=${seed}&backgroundColor=${BG}`,
  }));

export const PRESET_AVATARS = [...HUMANS, ...ANIMALS]; // 24 total

/**
 * Renderiza grid de avatares dentro de um container.
 * @param {HTMLElement} container
 * @param {string|null} currentUrl - se houver, marca como selecionado
 * @param {Function} onPick - callback(url) ao clicar
 */
export function renderAvatarGrid(container, currentUrl, onPick) {
  container.innerHTML = PRESET_AVATARS.map((a, i) => {
    const active = currentUrl === a.url;
    return `<button type="button" class="avt-pick${active ? ' active' : ''}" data-url="${a.url}" data-i="${i}" title="Avatar ${i + 1}">
      <img src="${a.url}" alt="">
    </button>`;
  }).join('');
  container.addEventListener('click', e => {
    const btn = e.target.closest('.avt-pick');
    if (!btn) return;
    container.querySelectorAll('.avt-pick').forEach(b => b.classList.toggle('active', b === btn));
    onPick(btn.dataset.url);
  });
}

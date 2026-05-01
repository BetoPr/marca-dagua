// Construtor visual de prompts: blocos -> texto em ingles em tempo real.
// Free: 5 blocos. Pro: +6 blocos avancados.

import { supabase } from '../supabase-client.js';

const $ = (id) => document.getElementById(id);
const escapeHtml = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

// ===== Presets =====
// (key) -> { mode: 'single' | 'multi', items: [{value, label}] }
const PRESETS = {
  subject: {
    mode: 'single',
    items: [
      ['a confident man', 'Homem'],
      ['a confident woman', 'Mulher'],
      ['a young couple', 'Casal'],
      ['a child', 'Criança'],
      ['a small group of friends', 'Grupo'],
      ['a pet dog', 'Cachorro'],
      ['a pet cat', 'Gato'],
      ['a single object', 'Objeto'],
      ['__custom__', 'Personalizar'],
    ],
  },
  pose: {
    mode: 'single',
    items: [
      ['standing confidently', 'Em pé (confiante)'],
      ['sitting casually', 'Sentado (casual)'],
      ['walking towards the camera', 'Caminhando'],
      ['looking away thoughtfully', 'Olhando ao longe'],
      ['looking directly at camera', 'Olhando pra câmera'],
      ['leaning against a wall', 'Encostado na parede'],
      ['hands in pockets', 'Mãos no bolso'],
      ['arms crossed', 'Braços cruzados'],
      ['mid-action movement', 'Em movimento'],
      ['close-up portrait', 'Close-up'],
      ['__custom__', 'Personalizar'],
    ],
  },
  environment: {
    mode: 'single',
    items: [
      ['in a clean minimalist studio', 'Estúdio minimalista'],
      ['on a busy urban street', 'Rua urbana'],
      ['on a beach at sunset', 'Praia ao pôr-do-sol'],
      ['in a dense forest', 'Floresta'],
      ['in a modern office', 'Escritório moderno'],
      ['in a cozy home interior', 'Em casa'],
      ['on a mountain trail', 'Montanha'],
      ['in a stylish café', 'Café'],
      ['on a rooftop with city skyline', 'Rooftop com skyline'],
      ['in a neon-lit alley at night', 'Beco neon (noite)'],
      ['in a quiet library', 'Biblioteca'],
      ['__custom__', 'Personalizar'],
    ],
  },
  style: {
    mode: 'single',
    items: [
      ['cinematic', 'Cinematográfico'],
      ['editorial fashion', 'Editorial / fashion'],
      ['lifestyle', 'Lifestyle'],
      ['candid documentary', 'Candid / documentário'],
      ['minimalist', 'Minimalista'],
      ['vintage 35mm film', 'Vintage 35mm'],
      ['hyperrealistic', 'Hiperrealista'],
      ['cyberpunk', 'Cyberpunk'],
      ['dreamy ethereal', 'Etéreo / dreamy'],
    ],
  },
  aspect: {
    mode: 'single',
    items: [
      ['1:1', '1:1 quadrado'],
      ['4:5', '4:5 vertical'],
      ['9:16', '9:16 stories'],
      ['3:4', '3:4 retrato'],
      ['16:9', '16:9 wide'],
      ['4:3', '4:3 clássico'],
    ],
  },
  outfit: {
    mode: 'single',
    pro: true,
    items: [
      ['wearing a tailored navy suit with white shirt', 'Terno (navy)'],
      ['wearing a tailored black suit', 'Terno preto'],
      ['wearing an oversized cream knit sweater', 'Tricô oversized'],
      ['wearing casual streetwear', 'Streetwear'],
      ['wearing a flowing emerald silk dress', 'Vestido fluido'],
      ['wearing a white shirt and dark jeans', 'Camisa branca + jeans'],
      ['wearing professional business attire', 'Business'],
      ['wearing athletic activewear', 'Esportivo'],
      ['__custom__', 'Personalizar'],
    ],
  },
  lens: {
    mode: 'single',
    pro: true,
    items: [
      ['shot on 24mm wide-angle lens', '24mm wide'],
      ['shot on 35mm lens', '35mm'],
      ['shot on 50mm lens at f/1.8', '50mm f/1.8'],
      ['shot on 85mm portrait lens at f/1.4', '85mm portrait'],
      ['shot on 100mm macro lens', '100mm macro'],
      ['drone aerial shot', 'Drone aéreo'],
      ['shot on Hasselblad medium format', 'Hasselblad medium'],
      ['shot on Arri Alexa Mini, anamorphic', 'Arri anamorphic'],
      ['shot on Sony A7R IV', 'Sony A7R IV'],
    ],
  },
  lighting: {
    mode: 'single',
    pro: true,
    items: [
      ['soft natural window light', 'Luz natural suave'],
      ['warm golden hour light', 'Hora dourada'],
      ['blue hour twilight', 'Hora azul'],
      ['cinematic side light with deep shadows', 'Lateral cinemática'],
      ['three-point studio strobe', 'Estúdio (3 pontos)'],
      ['hard noon sunlight', 'Sol do meio-dia'],
      ['rim backlight separating subject from background', 'Backlight rim'],
      ['neon practical lights', 'Neon prático'],
      ['candlelight ambient', 'Luz de vela'],
      ['overcast diffused', 'Nublado difuso'],
    ],
  },
  atmosphere: {
    mode: 'multi',
    pro: true,
    items: [
      ['mysterious', 'Misterioso'],
      ['dreamy', 'Dreamy'],
      ['dramatic', 'Dramático'],
      ['serene', 'Sereno'],
      ['energetic', 'Energético'],
      ['nostalgic', 'Nostálgico'],
      ['luxurious', 'Luxuoso'],
      ['raw', 'Cru / direto'],
      ['intimate', 'Íntimo'],
      ['epic', 'Épico'],
    ],
  },
  textures: {
    mode: 'multi',
    pro: true,
    items: [
      ['fine film grain', 'Film grain'],
      ['ultra-detailed skin texture', 'Pele detalhada'],
      ['detailed fabric texture', 'Tecido detalhado'],
      ['wet glossy surfaces', 'Superfícies molhadas'],
      ['matte finish', 'Acabamento fosco'],
      ['volumetric fog', 'Neblina volumétrica'],
      ['floating dust particles', 'Partículas de poeira'],
      ['anamorphic lens flare', 'Lens flare anamórfico'],
      ['light bokeh', 'Bokeh leve'],
    ],
  },
  modifiers: {
    mode: 'multi',
    pro: true,
    items: [
      ['ultra-detailed', 'Ultra-detailed'],
      ['8K resolution', '8K'],
      ['shallow depth of field', 'Shallow DOF'],
      ['tack-sharp focus', 'Foco tack-sharp'],
      ['photorealistic', 'Photorealistic'],
      ['award-winning photography', 'Premiado'],
      ['Behance featured', 'Behance featured'],
      ['ArtStation trending', 'ArtStation trending'],
      ['shot on Hasselblad', 'Shot on Hasselblad'],
    ],
  },
};

// ===== State =====
const state = {
  user: null,
  isPro: false,
  values: {
    subject: '',         // string (single)
    pose: '',
    environment: '',
    style: '',
    aspect: '',
    outfit: '',
    lens: '',
    lighting: '',
    atmosphere: [],      // array (multi)
    textures: [],
    modifiers: [],
  },
  extras: { subject: '', pose: '', environment: '', outfit: '' },
  isCustom: { subject: false, pose: false, environment: false, outfit: false },
};

// ===== Toast =====
function showToast(msg, isError) {
  const host = $('toastHost');
  const t = document.createElement('div');
  t.className = 'gal-toast' + (isError ? ' error' : '');
  t.textContent = msg;
  host.appendChild(t);
  requestAnimationFrame(() => t.classList.add('show'));
  setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 300); }, 2200);
}

// ===== Render chips =====
function renderBlock(key) {
  const cfg = PRESETS[key];
  const wrapper = document.querySelector(`[data-key="${key}"]`);
  if (!wrapper) return;

  const isMulti = cfg.mode === 'multi';
  const current = state.values[key];

  wrapper.innerHTML = cfg.items.map(([value, label]) => {
    const active = isMulti ? current.includes(value) : current === value;
    return `<button type="button" class="cb-chip${active ? ' active' : ''}${value === '__custom__' ? ' cb-chip-custom' : ''}" data-value="${escapeHtml(value)}">${escapeHtml(label)}</button>`;
  }).join('');

  wrapper.onclick = (e) => {
    const btn = e.target.closest('.cb-chip');
    if (!btn) return;
    const v = btn.dataset.value;

    // Custom chip toggles custom mode (extra input vira o valor)
    if (v === '__custom__') {
      state.isCustom[key] = !state.isCustom[key];
      // Single: limpa value se ativou custom
      if (state.isCustom[key]) state.values[key] = '__custom__';
      else { state.values[key] = ''; state.extras[key] = ''; }
      renderBlock(key);
      updatePreview();
      return;
    }

    if (isMulti) {
      const arr = state.values[key];
      const idx = arr.indexOf(v);
      if (idx === -1) arr.push(v); else arr.splice(idx, 1);
    } else {
      state.values[key] = state.values[key] === v ? '' : v;
      state.isCustom[key] = false;
    }
    renderBlock(key);
    updatePreview();
  };
}

function setupExtraInputs() {
  document.querySelectorAll('.cb-extra').forEach(input => {
    const key = input.dataset.extra;
    input.addEventListener('input', () => {
      state.extras[key] = input.value;
      updatePreview();
    });
  });
}

// ===== Build prompt =====
function buildPrompt() {
  const v = state.values;
  const x = state.extras;

  // Sujeito principal
  let subject = state.isCustom.subject && x.subject ? x.subject : v.subject;
  if (subject === '__custom__') subject = x.subject || '';
  if (!subject) return '';

  const extraSubject = !state.isCustom.subject && x.subject ? `, ${x.subject}` : '';

  // Pose
  let pose = state.isCustom.pose && x.pose ? x.pose : v.pose;
  if (pose === '__custom__') pose = x.pose || '';
  const extraPose = !state.isCustom.pose && x.pose && pose ? ` (${x.pose})` : '';

  // Environment
  let env = state.isCustom.environment && x.environment ? x.environment : v.environment;
  if (env === '__custom__') env = x.environment || '';
  const extraEnv = !state.isCustom.environment && x.environment && env ? `, ${x.environment}` : '';

  // Outfit
  let outfit = state.isCustom.outfit && x.outfit ? x.outfit : v.outfit;
  if (outfit === '__custom__') outfit = x.outfit || '';

  // Pieces
  const pieces = [];

  let mainLine = `${subject}${extraSubject}`;
  if (pose) mainLine += `, ${pose}${extraPose}`;
  if (env) mainLine += ` ${env.startsWith('on ') || env.startsWith('in ') ? '' : 'in '}${env}${extraEnv}`;
  pieces.push(mainLine + '.');

  if (outfit) pieces.push(`Wearing ${outfit.replace(/^wearing /i, '')}.`);

  if (v.lens || v.lighting) {
    const cam = [v.lens, v.lighting].filter(Boolean).join(', ');
    pieces.push(`${cam}.`);
  }

  if (v.atmosphere.length) pieces.push(`Atmosphere: ${v.atmosphere.join(', ')}.`);
  if (v.textures.length) pieces.push(`Details: ${v.textures.join(', ')}.`);
  if (v.style) pieces.push(`Style: ${v.style}.`);
  if (v.modifiers.length) pieces.push(v.modifiers.join(', ') + '.');
  if (v.aspect) pieces.push(`Aspect ratio ${v.aspect}.`);

  return pieces.join(' ');
}

function updatePreview() {
  const text = buildPrompt();
  const previewEl = $('promptPreview');
  if (!text) {
    previewEl.textContent = 'Escolha um sujeito pra começar…';
    previewEl.classList.add('cb-preview-empty');
  } else {
    previewEl.textContent = text;
    previewEl.classList.remove('cb-preview-empty');
  }
  $('charCount').textContent = text.length;
}

// ===== Pro gating =====
function applyProGating() {
  document.querySelectorAll('.cb-block-pro').forEach(b => {
    b.classList.toggle('locked', !state.isPro);
    if (!state.isPro) {
      b.addEventListener('click', proLockedHandler, { once: false });
    }
  });
  $('proCta').hidden = state.isPro;
}

function proLockedHandler(e) {
  if (state.isPro) return;
  // Click em qualquer bloco Pro abre CTA
  if (!e.target.closest('button') && !e.target.closest('input')) return;
  e.preventDefault();
  e.stopPropagation();
  location.href = 'upgrade.html';
}

// ===== Actions =====
async function copyPrompt() {
  const text = buildPrompt();
  if (!text) { showToast('Construa um prompt primeiro', true); return; }
  try {
    await navigator.clipboard.writeText(text);
    showToast('Copiado ✓');
    const btn = $('copyBtn');
    btn.classList.add('copied');
    btn.innerHTML = '<i data-lucide="check"></i> Copiado!';
    if (window.lucide) lucide.createIcons();
    setTimeout(() => {
      btn.classList.remove('copied');
      btn.innerHTML = '<i data-lucide="copy"></i> Copiar';
      if (window.lucide) lucide.createIcons();
    }, 1800);
  } catch { showToast('Falha ao copiar', true); }
}

async function polish() {
  const text = buildPrompt();
  if (!text) { showToast('Construa um prompt primeiro', true); return; }
  const groqKey = localStorage.getItem('chat-key-groq');
  if (!groqKey) {
    showToast('Configure sua chave Groq em Configurações primeiro');
    setTimeout(() => location.href = 'configuracoes.html', 900);
    return;
  }

  const btn = $('polishBtn');
  btn.disabled = true;
  btn.innerHTML = '<span class="gal-spinner"></span> Polindo…';

  try {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${groqKey}` },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: 'You polish AI image prompts. Take the user prompt and rewrite it as one fluid, vivid, cinematic English paragraph. Keep all details. NO commentary, output ONLY the polished prompt.' },
          { role: 'user', content: text },
        ],
        temperature: 0.5,
        max_tokens: 700,
      }),
    });
    if (!res.ok) throw new Error(`Groq ${res.status}`);
    const json = await res.json();
    const polished = json?.choices?.[0]?.message?.content?.trim() || '';
    if (!polished) throw new Error('resposta vazia');
    $('promptPreview').textContent = polished;
    $('charCount').textContent = polished.length;
    // Override builder pra que copy/publish use polished
    overridePrompt = polished;
    showToast('Prompt polido ✓');
  } catch (err) {
    showToast('Erro ao polir: ' + (err.message || err), true);
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<i data-lucide="wand-2"></i> Polir com IA';
    if (window.lucide) lucide.createIcons();
  }
}

let overridePrompt = null; // se user polir, usa esse texto pro copy/publish

function getCurrentPrompt() { return overridePrompt || buildPrompt(); }

function publishToShare() {
  const text = getCurrentPrompt();
  if (!text) { showToast('Construa um prompt primeiro', true); return; }
  location.href = `compartilhar.html?seed=${encodeURIComponent(text)}`;
}

function clearAll() {
  if (!confirm('Limpar todos os blocos?')) return;
  Object.keys(state.values).forEach(k => {
    state.values[k] = Array.isArray(state.values[k]) ? [] : '';
  });
  Object.keys(state.extras).forEach(k => state.extras[k] = '');
  Object.keys(state.isCustom).forEach(k => state.isCustom[k] = false);
  document.querySelectorAll('.cb-extra').forEach(i => i.value = '');
  overridePrompt = null;
  Object.keys(PRESETS).forEach(renderBlock);
  updatePreview();
  showToast('Limpo');
}

// Re-build prompt overrides whenever user changes blocos
function clearOverrideOnChange() {
  // chamado no updatePreview indireto: se mudou inputs/chips, descarta polish anterior
  overridePrompt = null;
}

// ===== Init =====
async function init() {
  // Auth
  try {
    const { data: { user } } = await supabase.auth.getUser();
    state.user = user;
    if (user) {
      const { data: prof } = await supabase
        .from('profiles')
        .select('plan, pro_until')
        .eq('id', user.id)
        .maybeSingle();
      state.isPro = (prof?.plan === 'pro' || prof?.plan === 'studio')
        && prof?.pro_until && new Date(prof.pro_until) > new Date();
    }
  } catch {}

  // Render todos os blocos
  Object.keys(PRESETS).forEach(renderBlock);
  setupExtraInputs();

  // Hook: cada mudanca de chip ou input limpa override do polish
  document.querySelectorAll('.cb-chip, .cb-extra').forEach(el => {
    el.addEventListener('change', clearOverrideOnChange);
    el.addEventListener('input', clearOverrideOnChange);
    el.addEventListener('click', clearOverrideOnChange);
  });

  applyProGating();

  $('copyBtn').addEventListener('click', copyPrompt);
  $('polishBtn').addEventListener('click', polish);
  $('publishBtn').addEventListener('click', publishToShare);
  $('clearBtn').addEventListener('click', clearAll);
  $('proCtaBtn').addEventListener('click', () => location.href = 'upgrade.html');

  updatePreview();
}

init();

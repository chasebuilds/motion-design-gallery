const PIECES = [
  ['hero-text-reveal', 'Hero text reveal', 'Headline words slide up out of a mask, one after another.'],
  ['scroll-reveal', 'Scroll-triggered reveals', 'Sections fade in as they enter the screen, using IntersectionObserver.'],
  ['animated-counters', 'Animated counters', 'Numbers count up once, when they scroll into view.'],
  ['card-tilt', 'Card hover tilt', 'A card leans toward the pointer with a moving highlight.'],
  ['loading-skeleton', 'Loading skeleton', 'A shimmering placeholder that holds the layout while data loads.'],
  ['svg-logo-draw', 'SVG logo line drawing', 'A logo draws itself stroke by stroke, then fills in.'],
  ['gradient-background', 'Animated gradient background', 'Slow drifting color blobs, moved with transform only.'],
  ['button-micro-interactions', 'Button micro-interactions', 'Ripple, magnetic pull and a loading-to-done state.'],
  ['particle-header', 'Canvas particle header', 'Linked dots on a canvas that pause when offscreen.'],
  ['page-transition', 'Page transition', 'Slide between views with the View Transitions API and a fallback.'],
  ['sliding-tabs', 'Sliding tab indicator', 'An accessible tab bar with a bar that glides to the active tab.'],
];

const grid = document.getElementById('gallery');

function el(tag, props = {}, ...kids) {
  const node = Object.assign(document.createElement(tag), props);
  node.append(...kids);
  return node;
}

function buildCard([id, title, desc], source) {
  const frame = el('iframe', { title: `${title} demo`, loading: 'lazy' });
  frame.setAttribute('sandbox', 'allow-scripts');
  const stage = el('div', { className: 'stage' }, frame);
  const code = el('pre', { className: 'code', tabIndex: 0 }, el('code', { textContent: source }));
  code.hidden = true;

  const demoBtn = el('button', { type: 'button', textContent: 'Demo' });
  const codeBtn = el('button', { type: 'button', textContent: 'Code' });
  const copyBtn = el('button', { type: 'button', textContent: 'Copy the code' });
  const replayBtn = el('button', { type: 'button', textContent: 'Replay' });

  function show(which) {
    const isDemo = which === 'demo';
    stage.hidden = !isDemo;
    code.hidden = isDemo;
    demoBtn.setAttribute('aria-pressed', isDemo);
    codeBtn.setAttribute('aria-pressed', !isDemo);
  }

  demoBtn.addEventListener('click', () => show('demo'));
  codeBtn.addEventListener('click', () => show('code'));
  replayBtn.addEventListener('click', () => { show('demo'); frame.srcdoc = source; });
  copyBtn.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(source);
      copyBtn.textContent = 'Copied';
    } catch {
      copyBtn.textContent = 'Press Ctrl+C in Code view';
      show('code');
    }
    setTimeout(() => { copyBtn.textContent = 'Copy the code'; }, 1800);
  });

  // Start each demo only when its card is near the screen.
  const io = new IntersectionObserver(([entry]) => {
    if (!entry.isIntersecting) return;
    frame.srcdoc = source;
    io.disconnect();
  }, { rootMargin: '200px' });
  io.observe(stage);

  show('demo');
  return el('article', { className: 'card', id: id },
    el('div', { className: 'card-head' },
      el('h2', { textContent: title }),
      el('div', { className: 'seg' }, demoBtn, codeBtn)),
    el('p', { className: 'desc', textContent: desc }),
    stage, code,
    el('div', { className: 'actions' }, replayBtn, copyBtn));
}

async function init() {
  try {
    const sources = await Promise.all(PIECES.map(async ([id]) => {
      const res = await fetch(`pieces/${id}.html`);
      if (!res.ok) throw new Error(`${id}: ${res.status}`);
      return res.text();
    }));
    grid.replaceChildren(...PIECES.map((p, i) => buildCard(p, sources[i])));
  } catch (err) {
    grid.replaceChildren(el('p', {
      className: 'loading-msg',
      textContent: `Could not load the pieces (${err.message}). Serve this folder over http, for example with: npx serve .`,
    }));
  }
}

init();

import { fingerSide } from './map-zones.js';

export function applyWorld(subject) {
  const w = subject.world;
  document.body.dataset.world = w.id;
  document.body.style.setProperty('--accent', w.accent);
  document.body.style.setProperty('--accent-soft', w.accentSoft);
  document.body.dataset.drift = w.drift;
}

// Presentation lives in a head stylesheet: map markup and play HTML remain unchanged.
export function mapAtmosphere(app, map, zones, image) {
  app.style.setProperty('--map-image', `url("${image}")`);
  let sheet = document.getElementById('map-atmosphere');
  if (!sheet) { sheet = document.createElement('style'); sheet.id = 'map-atmosphere'; document.head.appendChild(sheet); }
  const positions = {
    top: 'left:50%!important;top:-58px!important;bottom:auto!important;translate:-50% 0!important;rotate:180deg!important',
    bottom: 'left:50%!important;top:auto!important;bottom:-58px!important;translate:-50% 0!important;rotate:0deg!important',
    left: 'left:-58px!important;top:50%!important;bottom:auto!important;translate:0 -50%!important;rotate:90deg!important',
    right: 'left:100%!important;top:50%!important;bottom:auto!important;translate:0 -50%!important;rotate:-90deg!important',
  };
  const nodes = [...map.querySelectorAll('.zone')];
  const width = map.getBoundingClientRect().width;
  sheet.textContent = nodes.map((node, i) => {
    const attr = node.dataset.id ? `data-id="${node.dataset.id}"` : `data-n="${node.dataset.n}"`;
    return `.${map.className} [${attr}] .arrow { ${positions[fingerSide(zones, i, { size: 58 / width * 100 })]} }`;
  }).join('\n');
  // Use the existing progress angle, changing only its two world accent colours.
  for (const node of app.querySelectorAll('.unit, .island > div')) {
    const bg = node.style.background;
    if (bg.includes('conic-gradient') && /#ff8fb1|rgb\(255, 143, 177\)/i.test(bg)) {
      const selector = node.classList.contains('unit') ? `.unit[data-u="${node.dataset.u}"]` : `.island[data-n="${node.parentElement.dataset.n}"] > div:last-child`;
      sheet.textContent += `\n${selector} { background: ${bg.replace(/#ff8fb1|rgb\(255, 143, 177\)/ig, 'var(--accent-soft)')}!important; }`;
    }
  }
}

(() => {
  'use strict';
  const query = matchMedia('(max-width:1024px)');
  const wrap = document.querySelector('.wrap');
  if (!wrap) return;
  const viewport = document.createElement('div');
  viewport.className = 'novaMobileViewport';
  wrap.before(viewport);
  viewport.append(wrap);
  let scale = 1;
  const fit = () => {
    // Match the CSS viewport, not visualViewport: preserve native pinch zoom.
    const width = document.documentElement.clientWidth, height = window.innerHeight;
    const style = getComputedStyle(document.documentElement);
    const safeHeight = (parseFloat(style.getPropertyValue('--nova-mobile-safe-top')) || 0) + (parseFloat(style.getPropertyValue('--nova-mobile-safe-bottom')) || 0);
    scale = Math.min(600, Math.max(1, width - 16)) / 960;
    if (width > height && height <= 600) scale = Math.min(scale, Math.max(1, height - 148 - safeHeight) / 550);
    document.documentElement.style.setProperty('--nova-mobile-scale', String(scale));
    if (query.matches) document.getElementById('pageScrollSpacer')?.style.setProperty('height', '0px');
  };
  window.NovaMobile = Object.freeze({active:() => query.matches, scale:() => scale});
  fit();
  window.addEventListener('resize', fit, {passive:true});
  query.addEventListener('change', fit);

  const controls = document.createElement('nav');
  controls.className = 'novaMobileControls';
  controls.setAttribute('aria-label', 'スロット操作');
  const machine = document.getElementById('machine');
  const locked = target => {
    const freeze = machine?.dataset.oumaFreeze;
    return !target || target.disabled || ['lift','hold','fail'].includes(freeze)
      || (freeze === 'bet' && target.id !== 'spinBtn') || getComputedStyle(target).pointerEvents === 'none';
  };
  const mappings = [['spinBtn','BET'], ['stop0','左'], ['stop1','中'], ['stop2','右'], ['quickAutoBtn','AUTO']];
  const pairs = mappings.map(([id,label]) => {
    const target = document.getElementById(id);
    const button = document.createElement('button');
    button.type = 'button';
    button.dataset.target = id;
    button.textContent = label;
    button.setAttribute('aria-label', id.startsWith('stop') ? label+'リール停止' : label);
    // Forward the same click path as the cabinet: keep locks, stop order and audio unlock intact.
    button.addEventListener('click', event => {
      event.stopPropagation();
      if (!locked(target)) target.click();
    });
    controls.append(button);
    return {target,button,id,label};
  });
  const sync = () => {
    for (const {target,button,id,label} of pairs) {
      button.disabled = locked(target);
      button.textContent = id.startsWith('stop') ? label : target?.textContent || label;
      if (id === 'quickAutoBtn') button.setAttribute('aria-pressed', String(!!target?.classList.contains('on')));
    }
  };
  const observer = new MutationObserver(sync);
  for (const {target} of pairs) if (target) observer.observe(target, {attributes:true, childList:true, characterData:true, subtree:true});
  if (machine) observer.observe(machine, {attributes:true, attributeFilter:['data-ouma-freeze']});
  document.body.append(controls);
  sync();
})();

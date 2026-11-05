/* Read-only guide: never reads or mutates game state, storage or lottery RNG. */
(() => {
  'use strict';
  const button = document.getElementById('flowToggleBtn');
  const dialog = document.getElementById('novaFlowGuide');
  if (!button || !dialog) return;
  const article = dialog.querySelector('.novaGuideArticle');
  const index = dialog.querySelector('.novaGuideIndex');
  const links = [...index.querySelectorAll('a')];
  const sections = links.map(link => dialog.querySelector(link.getAttribute('href')));
  const mobile = matchMedia('(max-width: 720px)');
  const image = document.getElementById('novaFlowGuideImage');
  const viewport = dialog.querySelector('.novaFlowGuideViewport');
  const tabs = [...dialog.querySelectorAll('[data-flow-page]')];
  const zoom = document.getElementById('novaFlowGuideZoom');
  const status = document.getElementById('novaFlowGuideStatus');
  const retry = document.getElementById('novaFlowGuideRetry');
  const diagram = dialog.querySelector('.novaGuideDiagram');
  const pages = [
    {src:'assets/guide/game-flow-20261014-1.webp',alt:'通常時からCZ、BIG、AT初当たりまでのゲームフロー'},
    {src:'assets/guide/game-flow-20261014-2.webp',alt:'AT、上乗せ特化、出陣チャレンジ、上位AT、引き戻しのゲームフロー'}
  ];
  let current = 0;
  const setActive = section => links.forEach((link, i) => {
    if (sections[i] === section) link.setAttribute('aria-current', 'location');
    else link.removeAttribute('aria-current');
  });
  const syncLayout = () => { index.open = !mobile.matches; };
  syncLayout();
  setActive(sections[0]);
  index.querySelector('summary').addEventListener('click', event => {
    if (!mobile.matches) event.preventDefault();
  });
  mobile.addEventListener('change', syncLayout);
  links.forEach((link, i) => link.addEventListener('click', event => {
    event.preventDefault();
    if (mobile.matches) index.open = false;
    const top = sections[i].getBoundingClientRect().top - article.getBoundingClientRect().top + article.scrollTop;
    article.scrollTo({top:top - 16, behavior:'instant'});
    sections[i].querySelector('h3').focus({preventScroll:true});
    setActive(sections[i]);
  }));
  article.addEventListener('scroll', () => {
    const edge = article.getBoundingClientRect().top + 64;
    let active = sections[0];
    for (const section of sections) {
      if (section.getBoundingClientRect().top <= edge) active = section;
    }
    setActive(active);
  }, {passive:true});
  function select(page, force = false) {
    current = page;
    tabs.forEach((tab, i) => tab.setAttribute('aria-pressed', String(i === current)));
    viewport.scrollTo(0, 0);
    if (!force && image.getAttribute('src') === pages[page].src) return;
    status.textContent = '画像を読み込んでいます…'; status.hidden = false; retry.hidden = true;
    image.hidden = true; image.alt = pages[page].alt; image.src = pages[page].src;
  }
  image.addEventListener('load', () => { status.hidden = true; retry.hidden = true; image.hidden = false; });
  image.addEventListener('error', () => {
    image.hidden = true; status.hidden = false;
    status.textContent = '画像を読み込めませんでした。再読み込みしてください。'; retry.hidden = false;
  });
  // The large diagrams load only when expanded, not when starting the game.
  diagram.addEventListener('toggle', () => { if (diagram.open) select(current); });
  button.addEventListener('click', () => {
    if (dialog.open) return;
    syncLayout();
    dialog.showModal();
    article.scrollTop = 0;
    index.scrollTop = 0;
    setActive(sections[0]);
    button.setAttribute('aria-expanded', 'true');
  });
  document.getElementById('novaFlowGuideClose').addEventListener('click', () => dialog.close());
  dialog.addEventListener('close', () => {
    button.setAttribute('aria-expanded', 'false'); button.focus({preventScroll:true});
  });
  dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });
  dialog.addEventListener('keydown', event => {
    // Keep navigation/space keys away from the cabinet's BET/stop shortcuts.
    event.stopPropagation();
    if (event.key === 'Escape') { event.preventDefault(); dialog.close(); }
  });
  tabs.forEach((tab, i) => tab.addEventListener('click', () => select(i)));
  zoom.addEventListener('click', () => {
    const expanded = viewport.classList.toggle('isZoomed');
    zoom.setAttribute('aria-pressed', String(expanded)); zoom.textContent = expanded ? '縮小' : '拡大';
  });
  retry.addEventListener('click', () => select(current, true));
})();

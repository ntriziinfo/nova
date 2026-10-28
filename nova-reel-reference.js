/* Static reference: use the live strips and renderer without touching game state. */
(() => {
  'use strict';
  window.NovaReelReference = Object.freeze({
    mount({strips, renderSymbol}) {
      const panel = document.getElementById('novaReelReference');
      const rows = document.getElementById('novaReelReferenceRows');
      const toggle = document.getElementById('novaReelReferenceToggle');
      if (!panel || !rows || !toggle || panel.dataset.ready) return;
      const fragment = document.createDocumentFragment();
      for (let index = 0; index < Math.max(...strips.map(strip => strip.length)); index++) {
        const row = document.createElement('tr');
        const number = document.createElement('th');
        number.scope = 'row';
        number.textContent = String(index + 1).padStart(2, '0');
        row.append(number);
        for (const strip of strips) {
          const cell = document.createElement('td');
          cell.innerHTML = renderSymbol(strip[index]);
          cell.querySelector('svg')?.setAttribute('preserveAspectRatio', 'xMidYMid meet');
          row.append(cell);
        }
        fragment.append(row);
      }
      rows.replaceChildren(fragment);
      panel.dataset.ready = 'true';
      // Every page starts visible; this control changes presentation only.
      toggle.addEventListener('click', () => {
        panel.hidden = !panel.hidden;
        toggle.setAttribute('aria-expanded', String(!panel.hidden));
        toggle.textContent = panel.hidden ? 'リール配列を表示' : 'リール配列を隠す';
      });
    }
  });
})();

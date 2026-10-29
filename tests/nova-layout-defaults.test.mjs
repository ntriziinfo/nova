import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

test('committed display defaults match the approved Chrome layout',()=>{
 const game=fs.readFileSync('nova-game.js','utf8');
 const gameCss=fs.readFileSync('nova-game.css','utf8');
 const cabinet=fs.readFileSync('nova-cabinet.css','utf8');
 const counter=fs.readFileSync('nova-data-counter.css','utf8');
 const html=fs.readFileSync('jag.html','utf8');
 assert.match(game,/const PAGE_ZOOM_STORAGE_KEY = "nova_unified_page_zoom_v5";/);
 assert.match(game,/const PAGE_PAN_STORAGE_KEY = "nova_unified_page_pan_x_v5";/);
 assert.match(game,/const LAYOUT_EDIT_STORAGE_KEY = "nova_layout_editor_locked_20261027d";/);
 assert.match(game,/const LAYOUT_DEFAULT_STORAGE_KEY = "nova_layout_default_locked_20261027d";/);
 assert.match(game,/const PAGE_ZOOM_DEFAULT = 0\.55;/);
 assert.match(game,/const PAGE_PAN_DEFAULT = -260;/);
 assert.match(gameCss,/--wd-page-zoom:\.55;/);
 assert.match(gameCss,/--wd-cabinet-x-offset:-260px;/);
 assert.match(html,/id="pageZoomRange"[^>]*value="55"/);
 assert.match(html,/id="pageZoomView">55%/);
 assert.match(html,/id="pagePanRange"[^>]*value="-260"/);
 assert.match(html,/id="pagePanView">-260/);
 assert.match(game,/let pageZoom = PAGE_ZOOM_DEFAULT;/);
 assert.match(game,/let pagePanX = PAGE_PAN_DEFAULT;/);
 assert.match(game,/syncZoomAnchorToSlotTop\(\);\s*pageZoom = PAGE_ZOOM_DEFAULT;\s*applyPageZoom\(true\);/);
 assert.match(game,/flowstatus:\{x:38,y:92\.6,w:40\}/);
 assert.match(game,/reels:\{x:22\.3, y:35\.6, w:55\.7, h:36\.9, gap:1\.6\}/);
 assert.match(game,/chance:\{x:22\.0, y:85\.8, w:11\.9, h:11\.0\}/);
 assert.match(game,/credit:\{x:38\.0, y:85\.8, w:12\.2, h:11\.0\}/);
 assert.match(game,/count:\{x:51\.6, y:85\.8, w:12\.2, h:11\.0\}/);
 assert.match(game,/payout:\{x:66\.0, y:85\.8, w:11\.0, h:11\.0\}/);
 assert.match(game,/playdata:\{x:19\.8,y:13\.5,w:60\.5,h:11\.5\}/);
 assert.match(game,/cabinetmask:\{x:20\.3,y:29\.5,w:58\.9,h:25\.7\}/);
 assert.match(game,/lampmovie:\{x:20\.4,y:29\.6,w:59\.1,h:10\.7\}/);
 assert.match(game,/backgroundmovie:\{x:20\.4,y:29\.4,w:58\.9,h:25\.7\}/);
 assert.match(game,/sortievideo:\{x:20\.4,y:29\.4,w:58\.9,h:25\.7\}/);
 assert.match(game,/raw = \{\.\.\.raw, sortievideo:\{\.\.\.raw\.backgroundmovie\}\};/);
 assert.match(game,/zonepresentation:\{x:22\.3,y:31\.8,w:55\.7,h:8\.3\}/);
 assert.match(game,/sortieaimbg:\{"x":20\.3,"y":29\.4,"w":59\.1,"h":25\.4\}/);
 assert.match(game,/sortieaimmiddle:\{"x":21\.5,"y":32\.7,"w":19\.4,"h":5\.8\}/);
 assert.match(game,/sortieaimsymbol:\{"x":41\.5,"y":28,"w":16\.7,"h":14\.4,"compact":37\.6\}/);
 assert.match(game,/sortieaimaim:\{"x":58\.7,"y":32\.6,"w":20,"h":5\.5\}/);
 assert.match(game,/const key='nova_sortie_aim_layout_20261028b';/);
 assert.match(game,/for\(const target of \['sortieaimbg','sortieaimmiddle','sortieaimsymbol','sortieaimaim'\]\)state\[target\]=\{\.\.\.LAYOUT_DEFAULTS\[target\]\};/);
 assert.match(game,/supertitle:\{x:21\.5,y:29\.6,w:56\.7,h:10\.7\}/);
 assert.match(game,/displaygroup:\{x:0\.1,y:-0\.5,s:122\.4\}/);
 assert.match(counter,/--layout-playdata-x,19\.8%/);
 assert.match(counter,/--layout-playdata-y,13\.5%/);
 assert.match(counter,/--layout-playdata-w,60\.5%/);
 assert.match(counter,/--layout-playdata-h,11\.5%/);
 assert.match(cabinet,/--layout-displaygroup-x,0\.1%/);
 assert.match(cabinet,/--layout-displaygroup-y,-0\.5%/);
 assert.match(cabinet,/--displaygroup-scale,1\.224/);
 assert.match(cabinet,/--layout-lampmovie-x,20\.4%/);
 assert.match(cabinet,/--layout-lampmovie-y,29\.6%/);
 assert.match(cabinet,/--layout-lampmovie-w,59\.1%/);
 assert.match(cabinet,/--layout-lampmovie-h,10\.7%/);
 assert.match(cabinet,/--layout-backgroundmovie-x,20\.4%/);
 assert.match(cabinet,/--layout-backgroundmovie-y,29\.4%/);
 assert.match(cabinet,/--layout-backgroundmovie-w,58\.9%/);
 assert.match(cabinet,/--layout-backgroundmovie-h,25\.7%/);
 assert.match(cabinet,/--layout-sortievideo-x,20\.4%/);
 assert.match(cabinet,/--layout-sortievideo-y,29\.4%/);
 assert.match(cabinet,/--layout-sortievideo-w,58\.9%/);
 assert.match(cabinet,/--layout-sortievideo-h,25\.7%/);
 assert.match(cabinet,/--layout-supertitle-x,21\.5%/);
 assert.match(cabinet,/--layout-zonepresentation-x,22\.3%/);
 assert.match(cabinet,/--layout-zonepresentation-y,31\.8%/);
 assert.match(cabinet,/--layout-zonepresentation-w,55\.7%/);
 assert.match(cabinet,/--layout-zonepresentation-h,8\.3%/);
 assert.match(cabinet,/--layout-sortieaimsymbol-y,28%/);
 assert.match(cabinet,/--layout-sortieaimsymbol-compact,37\.6%/);
 assert.match(cabinet,/--layout-sortieaimaim-y,32\.6%/);
 assert.match(html,/nova-game\.css\?v=20261028-auto-stop-control/);
 assert.match(html,/nova-data-counter\.css\?v=20261027-cherry-reels/);
 assert.match(html,/nova-cabinet\.css\?v=20261030-sortie-challenge-video/);
 assert.match(html,/nova-aim-presentation\.js\?v=20261030-sortie-challenge-video/);
 assert.match(html,/nova-game\.js\?v=20261030-sortie-challenge-video-layout/);
 assert.match(html,/出陣チャレンジ動画/);
 for(const [label,prop] of [['横位置','x'],['縦位置','y'],['幅','w'],['高さ','h']]){
  assert.match(html,new RegExp(`<span>${label}</span><input[^>]+data-layout-target="sortievideo"[^>]+data-layout-prop="${prop}"`));
 }
 assert.match(html,/id="sortieVideoPreview"[^>]*aria-pressed="false"/);
 const sortieVideo='assets/media/nova/sortie-challenge-fire-20261030.mp4';
 assert.ok(fs.existsSync(sortieVideo));
 assert.ok(fs.statSync(sortieVideo).size>5_000_000);
 const navi=fs.readFileSync('nova-bell-navi.js','utf8');
 const remaining=fs.readFileSync('nova-remaining-counters.js','utf8');
 assert.match(navi,/const defaults=Object\.freeze\(\{x:\.5,y:44\.3,w:100,h:7\.9,gap:0\}\);/);
 assert.match(remaining,/remainingcounter:Object\.freeze\(\{x:21\.7,y:85\.8,w:15\.9,h:11\}\)/);
});

test('licensed character defaults and stacking keep Sosuke and Kushuri behind',()=>{
 const artwork=fs.readFileSync('nova-artwork.js','utf8');
 assert.match(artwork,/const originals = \['ouma1','sosuke','sora1','kushuri','toto','urapi','giru1','nito'\]/);
 for(const coordinates of [
  'ouma1:{x:37.3395,y:29.4353,w:16.7}',
  'sora1:{x:45.6599,y:32.7559,w:16.7}',
  'sosuke:{x:54.5241,y:29.6733,w:12.6}',
  'toto:{x:61.5383,y:33.9498,w:10.1}',
  'urapi:{x:23.1599,y:29.4657,w:17.7}',
  'giru1:{x:31.6654,y:33.6099,w:15.1}',
  'kushuri:{x:66.0111,y:30.8193,w:15.5}',
  'nito:{x:18.8457,y:33.2418,w:13.9}'
 ])assert.ok(artwork.includes(coordinates),coordinates);
});

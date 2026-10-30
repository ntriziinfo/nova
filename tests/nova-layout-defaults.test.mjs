import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

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
 assert.match(game,/credit:\{x:38\.8, y:87\.7, w:21\.2, h:7\.6\}/);
 assert.match(game,/count:\{x:21\.8, y:24\.1, w:15\.2, h:13\.7\}/);
 assert.match(game,/payout:\{x:63\.7, y:87\.7, w:13\.6, h:7\.6\}/);
 assert.match(game,/playdata:\{x:19\.8,y:13\.5,w:60\.5,h:11\.5\}/);
 assert.match(game,/cabinetmask:\{x:20\.3,y:29\.5,w:58\.9,h:25\.7\}/);
 assert.match(game,/lampmovie:\{x:20\.4,y:29\.6,w:59\.1,h:10\.7\}/);
 assert.match(game,/backgroundmovie:\{x:20\.4,y:29\.4,w:58\.9,h:25\.7\}/);
 assert.match(game,/sortievideo:\{x:32\.7,y:29\.4,w:35\.6,h:11\.4\}/);
 assert.match(game,/raw = \{\.\.\.raw, sortievideo:\{\.\.\.raw\.backgroundmovie\}\};/);
 assert.match(game,/zonepresentation:\{x:22\.3,y:31\.8,w:55\.7,h:8\.3\}/);
 assert.match(game,/sortieaimbg:\{"x":20\.3,"y":29\.4,"w":59\.1,"h":25\.4\}/);
 assert.match(game,/sortieaimmiddle:\{"x":21\.5,"y":32\.7,"w":19\.4,"h":5\.8\}/);
 assert.match(game,/sortieaimsymbol:\{"x":41\.5,"y":28,"w":16\.7,"h":14\.4,"compact":37\.6\}/);
 assert.match(game,/sortieaimaim:\{"x":58\.7,"y":32\.6,"w":20,"h":5\.5\}/);
 assert.match(game,/const key='nova_sortie_aim_layout_20261028b';/);
 assert.match(game,/for\(const target of \['sortieaimbg','sortieaimmiddle','sortieaimsymbol','sortieaimaim'\]\)state\[target\]=\{\.\.\.LAYOUT_DEFAULTS\[target\]\};/);
 assert.match(game,/const key='nova_sortie_fire_layout_20261030a';/);
 assert.match(game,/state\.sortievideo=\{\.\.\.LAYOUT_DEFAULTS\.sortievideo\};/);
 assert.match(game,/migrateSortieAimLayout\(\);\s*migrateSortieFireLayout\(\);/);
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
 assert.match(cabinet,/--layout-sortievideo-x,32\.7%/);
 assert.match(cabinet,/--layout-sortievideo-y,29\.4%/);
 assert.match(cabinet,/--layout-sortievideo-w,35\.6%/);
 assert.match(cabinet,/--layout-sortievideo-h,11\.4%/);
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
 assert.match(html,/nova-cabinet\.css\?v=20261030-count-outline/);
 assert.match(html,/nova-aim-presentation\.js\?v=20261030-aim-ready/);
 assert.match(html,/nova-sortie-aim\.js\?v=20261030-prewarm/);
 assert.match(html,/nova-game\.js\?v=20261030-meter-final/);
 assert.match(html,/出陣トリガー：炎エフェクト動画/);
 for(const [label,prop] of [['横位置','x'],['縦位置','y'],['幅','w'],['高さ','h']]){
  assert.match(html,new RegExp(`<span>${label}</span><input[^>]+data-layout-target="sortievideo"[^>]+data-layout-prop="${prop}"`));
 }
 assert.doesNotMatch(html,/id="sortieVideoPreview"/);
 assert.match(html,/id="sortieAimPreview"[^>]*aria-pressed="false"/);
 const fireGroup=html.indexOf('<div class="layoutEditGroupTitle">出陣トリガー：炎エフェクト動画</div>');
 const triggerStart=html.indexOf('<div class="layoutEditGroupTitle">出陣トリガー：背景ムービー</div>');
 const triggerPreview=html.indexOf('id="sortieAimPreview"');
 assert.ok(fireGroup>triggerStart&&fireGroup<triggerPreview,'the fire movie controls must stay inside the Sortie trigger controls');
 assert.match(cabinet,/\.novaSortieAimFire\{[^}]*--layout-sortievideo-x,32\.7%[^}]*--layout-sortievideo-y,29\.4%[^}]*--layout-sortievideo-w,35\.6%[^}]*--layout-sortievideo-h,11\.4%/);
 const aimPresentation=fs.readFileSync('nova-aim-presentation.js','utf8');
 assert.match(aimPresentation,/assets\/media\/nova\/sortie-fire-round-20261011\.mp4/);
 assert.doesNotMatch(aimPresentation,/sortie-challenge-fire-20261030\.mp4/);
 const sortieVideo='assets/media/nova/sortie-challenge-fire-20261030.mp4';
 assert.ok(fs.existsSync(sortieVideo));
 assert.ok(fs.statSync(sortieVideo).size>5_000_000);
 const navi=fs.readFileSync('nova-bell-navi.js','utf8');
 const remaining=fs.readFileSync('nova-remaining-counters.js','utf8');
 assert.match(navi,/const defaults=Object\.freeze\(\{x:\.5,y:44\.3,w:100,h:7\.9,gap:0\}\);/);
 assert.match(remaining,/remainingcounter:Object\.freeze\(\{x:21\.7,y:85\.8,w:15\.9,h:11\}\)/);
});

test('Sortie fire layout migration replaces only the saved fire rectangle once',()=>{
 const game=fs.readFileSync('nova-game.js','utf8');
 const start=game.indexOf('  function migrateSortieFireLayout(){');
 const end=game.indexOf('\n  function loadLayoutDefaultState(){',start);
 const migration=game.slice(start,end);
 const storage=new Map([
  ['default',JSON.stringify({sortievideo:{x:20.4,y:29.4,w:58.9,h:25.7},reels:{x:11}})],
  ['edit',JSON.stringify({sortievideo:{x:1,y:2,w:3,h:4},reels:{x:22}})]
 ]);
 const context=vm.createContext({
  LAYOUT_DEFAULT_STORAGE_KEY:'default',LAYOUT_EDIT_STORAGE_KEY:'edit',
  LAYOUT_DEFAULTS:{sortievideo:{x:32.7,y:29.4,w:35.6,h:11.4}},
  safeStorageGet:key=>storage.get(key)??null,safeStorageSet:(key,value)=>storage.set(key,value)
 });
 vm.runInContext(`${migration}\nmigrateSortieFireLayout();`,context);
 assert.deepEqual(JSON.parse(storage.get('default')),{sortievideo:{x:32.7,y:29.4,w:35.6,h:11.4},reels:{x:11}});
 assert.deepEqual(JSON.parse(storage.get('edit')),{sortievideo:{x:32.7,y:29.4,w:35.6,h:11.4},reels:{x:22}});
 assert.equal(storage.get('nova_sortie_fire_layout_20261030a'),'1');
 storage.set('edit',JSON.stringify({sortievideo:{x:9,y:9,w:9,h:9},reels:{x:22}}));
 vm.runInContext('migrateSortieFireLayout();',context);
 assert.deepEqual(JSON.parse(storage.get('edit')).sortievideo,{x:9,y:9,w:9,h:9});
});

test('approved meter layout migrates once and preserves unrelated saved positions',()=>{
 const game=fs.readFileSync('nova-game.js','utf8');
 const start=game.indexOf('  function migrateAtCountLayout(){');
 const end=game.indexOf('\n  function loadLayoutDefaultState(){',start);
 const storage=new Map([
  ['default',JSON.stringify({count:{x:51.6,y:85.8,w:12.2,h:11},credit:{x:31},reels:{y:34},flowstatus:{x:39}})],
  ['edit',JSON.stringify({count:{x:52,y:88,w:13,h:12},credit:{x:29},reels:{y:33},flowstatus:{x:41}})],
  ['nova_at_count_lamp_layout_20261030','1']
 ]);
 const defaults={count:{x:21.8,y:24.1,w:15.2,h:13.7},credit:{x:38.8,y:87.7,w:21.2,h:7.6},payout:{x:63.7,y:87.7,w:13.6,h:7.6},reels:{x:22.3,y:35.6,w:55.7,h:36.9,gap:1.6}};
 const context=vm.createContext({
  LAYOUT_DEFAULT_STORAGE_KEY:'default',LAYOUT_EDIT_STORAGE_KEY:'edit',
  LAYOUT_DEFAULTS:defaults,
  safeStorageGet:key=>storage.get(key)??null,safeStorageSet:(key,value)=>storage.set(key,value)
 });
 vm.runInContext(`${game.slice(start,end)}\nmigrateAtCountLayout();`,context);
 assert.deepEqual(JSON.parse(storage.get('default')),{...defaults,flowstatus:{x:39}});
 assert.deepEqual(JSON.parse(storage.get('edit')),{...defaults,flowstatus:{x:41}});
 storage.set('edit',JSON.stringify({count:{x:40,y:10,w:30,h:15}}));
 vm.runInContext('migrateAtCountLayout();',context);
 assert.deepEqual(JSON.parse(storage.get('edit')).count,{x:40,y:10,w:30,h:15});
 storage.delete('nova_meter_layout_20261030d');
 storage.set('nova_meter_layout_20261030b','1');
 storage.set('nova_meter_layout_20261030c','1');
 storage.set('edit',JSON.stringify({count:{x:21.3,y:0.8,w:9.6,h:6.9},credit:{x:44},reels:{y:34}}));
 vm.runInContext('migrateAtCountLayout();',context);
 assert.deepEqual(JSON.parse(storage.get('edit')),{count:defaults.count,credit:defaults.credit,payout:defaults.payout,reels:{y:34}});
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

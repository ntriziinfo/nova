import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

test('committed display defaults match the approved Chrome layout',()=>{
 const game=fs.readFileSync('nova-game.js','utf8');
 const cabinet=fs.readFileSync('nova-cabinet.css','utf8');
 assert.match(game,/const PAGE_ZOOM_DEFAULT = 1\.35;/);
 assert.match(game,/let pageZoom = PAGE_ZOOM_DEFAULT;/);
 assert.match(game,/lampmovie:\{x:20\.4,y:29\.6,w:59\.1,h:10\.7\}/);
 assert.match(cabinet,/--layout-lampmovie-x,20\.4%/);
 assert.match(cabinet,/--layout-lampmovie-y,29\.6%/);
 assert.match(cabinet,/--layout-lampmovie-w,59\.1%/);
 assert.match(cabinet,/--layout-lampmovie-h,10\.7%/);
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

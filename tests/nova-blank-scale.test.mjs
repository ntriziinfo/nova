import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

test('blank artwork matches the visible replay core in every presentation',()=>{
 const cabinet=fs.readFileSync('nova-cabinet.css','utf8');
 const reference=fs.readFileSync('nova-reel-reference.css','utf8');
 const html=fs.readFileSync('jag.html','utf8');
 assert.match(cabinet,/blankSymImg[^}]*width:75%!important;height:75%!important;max-width:75%!important;max-height:75%!important/);
 assert.match(cabinet,/#novaSymbolPreviewGrid img\.blankSymImg\{width:59%!important;height:59%!important;max-width:59%!important;max-height:59%!important;\}/);
 assert.match(cabinet,/\.novaSortieAimStack>\.sortieBlank\{width:83%;height:83%;\}/);
 assert.match(reference,/#novaReelReference \.blankSymImg \{ width:83%; height:83%; margin:auto; \}/);
 assert.match(html,/nova-cabinet\.css\?v=20261028-blank-replay-scale/);
 assert.match(html,/nova-reel-reference\.css\?v=20261028-blank-replay-scale/);
});

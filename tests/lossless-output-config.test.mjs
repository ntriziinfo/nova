import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {outputConfig} from '../scripts/lossless-output-config.mjs';
test('lossless output preserves public routes, admin redirects and RTP CORS/cache policy',()=>{
 const source=JSON.parse(fs.readFileSync('vercel.json','utf8')),config=outputConfig(source,{'assets/sound.wav':{contentType:'audio/flac'}});
 for(const row of source.redirects){const match=config.routes.find(r=>r.src&&new RegExp(r.src).test(row.source));assert.equal(match.headers.Location,row.destination);assert.equal(match.status,row.permanent?308:307);}
 for(const row of source.rewrites){const match=config.routes.find(r=>r.src&&new RegExp(r.src).test(row.source));assert.equal(match.dest,row.destination);}
 const rtp=config.routes.find(r=>r.continue&&new RegExp(r.src).test('/nova-rtp-current.json'));assert.equal(rtp.headers['Access-Control-Allow-Origin'],'*');assert.equal(rtp.headers['Cache-Control'],'no-store');
 assert.deepEqual(config.overrides['assets/sound.wav'],{contentType:'audio/flac'});assert.deepEqual(config.routes.at(-1),{handle:'filesystem'});
});

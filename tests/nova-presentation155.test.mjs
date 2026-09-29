import {readGameSource} from '../scripts/game-source.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {createHash} from 'node:crypto';

const html=readGameSource();
test('Ouma lighting switches all eight CZ lamps to fast rainbow; clearing CZ restores normal modes',()=>{
 const c=vm.createContext({});
 vm.runInContext(fs.readFileSync('nova-flow.js','utf8'),c);
 const order=c.NovaFlow.lampCharacters;
 assert.equal(order.length,8);assert.equal(order.at(-1),'ouma1');
 c.items=new Map(order.map(id=>[id,{dataset:{}}]));
 c.machine={dataset:{czLamp:'7',czBlink:'2'},classList:{contains:()=>false}};
 c.chance={classList:{contains:()=>false}};c.layer={dataset:{}};c.lampMode={value:'auto'};
 const source=fs.readFileSync('nova-artwork.js','utf8');
 vm.runInContext(source.match(/  function syncLamp\(\)\{[^]*?\n  }/)[0],c);
 c.syncLamp();assert.equal(c.layer.dataset.lamp,'cz');assert.equal(c.items.get('ouma1').dataset.czLit,'false');
 c.machine.dataset.czLamp='8';c.syncLamp();assert.equal(c.layer.dataset.lamp,'cz-rainbow');
 for(const item of c.items.values()){assert.equal(item.dataset.czLit,'true');assert.equal(item.dataset.czPending,'false');}
 c.machine.dataset={czLamp:'0'};c.syncLamp();assert.equal(c.layer.dataset.lamp,'dim');
 c.machine.classList.contains=()=>true;c.syncLamp();assert.equal(c.layer.dataset.lamp,'rainbow');
 c.machine.dataset={czLamp:'2',czRainbow:'true'};c.syncLamp();assert.equal(c.layer.dataset.lamp,'cz-rainbow');
});

test('each displayed rare navigation plays the supplied effect once on BET in manual and AUTO',()=>{
 const sounds=[],c=vm.createContext({debugFastSpinActive:false,speedToBonusActive:false,sfxOutputVolume:()=>.37,playOneShotSound:(...args)=>sounds.push(args)});
 vm.runInContext(fs.readFileSync('nova-bell-navi.js','utf8'),c);
 vm.runInContext(html.match(/  function playRareNaviSound\([^]*?\n  }/)[0],c);
 const variants=new Set();
 for(const autoStopAtStart of [false,true])for(const result of ['WEAK_SUICA','STRONG_SUICA','CHANCE_A','CHANCE_B','WEAK_NOVA','STRONG_NOVA','SUPER_NOVA'])for(const roll of [0,.999]){
  const spin={result,autoStopAtStart,resolved:{flowBefore:{phase:'art'}}};
  spin.rareNavi=c.NovaBellNavi.drawRareNavi(spin,()=>roll);assert(spin.rareNavi);
  variants.add(spin.rareNavi.color+spin.rareNavi.mark);
  const before=sounds.length;c.playRareNaviSound(spin);c.playRareNaviSound(spin);
  assert.equal(sounds.length,before+1);assert.equal(spin.rareNaviSoundPlayed,true);
  assert.equal(sounds.at(-1)[0],'assets/media/nova/rare-navi.mp3');assert.equal(sounds.at(-1)[1],.37);
 }
 assert.equal(variants.size,6);
 const count=sounds.length;
 for(const spin of [null,{}, {result:'WEAK_SUICA'},{result:'BELL',bellNaviOrder:[0,1,2]}])c.playRareNaviSound(spin);
 for(const flag of ['debugFastSpinActive','speedToBonusActive']){c[flag]=true;c.playRareNaviSound({rareNavi:{color:'red',mark:'!!'}});c[flag]=false;}
 assert.equal(sounds.length,count);
 const begin=html.indexOf('NovaBellNavi.begin(currentSpin)');
 assert(begin>0&&html.indexOf('playRareNaviSound(currentSpin);',begin)>begin);
 const meta=JSON.parse(fs.readFileSync('assets/media/nova/rare-navi.source.json','utf8'));
 const bytes=fs.readFileSync('assets/media/nova/rare-navi.mp3');
 assert.equal(createHash('sha256').update(bytes).digest('hex'),meta.sha256);assert.equal(bytes.length,meta.bytes);
 assert.equal(meta.loop,false);assert.equal(meta.originalUnmodified,true);
});

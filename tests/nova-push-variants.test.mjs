import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';
const c=vm.createContext({Math:Object.create(Math)});c.Math.random=()=>{throw Error('Game RNG consumed');};
vm.runInContext(fs.readFileSync('nova-cz-push.js','utf8'),c);
const cue=c.NovaCzPresentation.pushCue;
test('CZ and reverse PUSH share exact winning weights and 80% red confidence',()=>{
 for(const p of [.15,.3,.5,.7,.85,.95]){
  const wins={white:0,big:0,red:0,gold:0},losses={white:0,big:0,red:0,gold:0};
  for(let seed=0;seed<100000;seed++){
   const win=cue({won:true,probability:p,seed}),loss=cue({won:false,probability:p,seed});wins[win.variant]++;losses[loss.variant]++;
   assert.equal(win.variant==='white',win.voice==='default');
   assert.equal(loss.voice,loss.variant==='red'?'chance':'default');
  }
  for(const [v,expected]of Object.entries({white:.69,big:.1,red:.2,gold:.01}))assert(Math.abs(wins[v]/100000-expected)<.003);
  assert.equal(losses.big+losses.gold,0);assert(Math.abs(p*wins.red/(p*wins.red+(1-p)*losses.red)-.8)<.006);
 }
});
test('shared selector preserves every existing CZ cue and does not mutate its input',()=>{
 const rates=[.27317164880616657,.2836866010598032,.31678578327216533,.30022044640396806,.326671511627907,.32773931366646597];
 for(let setting=1;setting<=6;setting++)for(const won of [false,true])for(let seed=0;seed<1000;seed++){
  const input=Object.freeze({won,seed,probability:rates[setting-1]});
  assert.deepEqual(cue(input),c.NovaCzPresentation.cue({czLamp:{timingSeed:seed},bonusHit:won},setting));
 }
});
test('Ouma uses isolated browser entropy once per offer and applies all variants/voices',()=>{
 let seed=0,entropy=0,revealed=0,offer;const nodes={};
 const ctx=vm.createContext({crypto:{getRandomValues(a){entropy++;a[0]=seed;return a;}},NovaCzPresentation:c.NovaCzPresentation,
  document:{getElementById:id=>nodes[id],createElement:()=>({setAttribute(){}}),querySelector:()=>({append:b=>nodes[b.id]=b})},setTimeout(){throw Error('manual offer should not auto');},clearTimeout(){}});
 vm.runInContext(fs.readFileSync('nova-ouma-push.js','utf8'),ctx);
 for(const won of [true,false])for(const expected of won?['white','big','red','gold']:['white','red']){
  seed=Array.from({length:10000},(_,i)=>i).find(i=>cue({won,probability:.6,seed:i}).variant===expected);
  const before=entropy;ctx.NovaOumaPush.show({valid:()=>true,auto:()=>false,won,probability:.6,onOffer:c=>offer=c,reveal:()=>revealed++});
  assert.equal(entropy,before+1);assert.equal(nodes.novaOumaPush.className,expected);assert.deepEqual(offer,cue({won,probability:.6,seed}));
  const click=nodes.novaOumaPush.onclick,previous=revealed;click();click();assert.equal(revealed,previous+1);assert.equal(nodes.novaOumaPush.hidden,true);
 }
});

import test from 'node:test';import assert from 'node:assert/strict';import {loadModel} from '../scripts/zone-v2-model.mjs';
test('AT4 award thinning applies only to weak roles and preserves strong-role awards',()=>{
 loadModel();const a=NovaArt;assert.deepEqual(a.weakAtAwardScales,[.49,.67,.46,.775,.79,.84]);
 for(let setting=1;setting<=6;setting++)for(const upper of [false,true])for(const role of ['WEAK_SUICA','WEAK_NOVA'])for(const [last,keep]of [[a.weakAtAwardScales[setting-1]-1e-9,true],[a.weakAtAwardScales[setting-1],false]]){
  const draws=[.99,0,0,.99,last];const out=a.resolveAtRole({researchUpper:upper},role,setting,()=>{assert(draws.length);return draws.shift();});assert.equal(draws.length,0);assert.equal(out.direct,keep&&upper?50:0);assert.equal(out.zone,keep&&!upper?'sosuke':'');assert.equal(!!out.fixed50,keep&&!upper);
 }
 for(let setting=1;setting<=6;setting++){const draws=[.1,0];const out=a.resolveAtRole({},'STRONG_NOVA',setting,()=>{assert(draws.length);return draws.shift();});assert.equal(out.fixed50,true);assert.equal(draws.length,0);}
});
test('setting 3 and 5 CZ improvements leaves fake, guaranteed, strong CZ and other settings intact',()=>{
 loadModel();const f=NovaFlow;for(let s=1;s<=6;s++)assert.equal(f.forSetting({},s).czChance,[.5504,.556,.68,.5792,.66,.6336][s-1]);
 assert.equal(f.forSetting({},5).strongChance,.7966);assert.equal(f.forSetting({czChance:0},5).czChance,0);assert.equal(f.forSetting({czChance:1},5).czChance,1);
 assert.equal(f.enterCZ(false,f.forSetting({},5),()=>.65999).success,true);assert.equal(f.enterCZ(false,f.forSetting({},5),()=>.66).success,false);
});

test('setting 3 CZ threshold preserves fake and guaranteed overrides',()=>{loadModel();const f=NovaFlow;assert.equal(f.enterCZ(false,f.forSetting({},3),()=>.679999).success,true);assert.equal(f.enterCZ(false,f.forSetting({},3),()=>.68).success,false);assert.equal(f.forSetting({czChance:0},3).czChance,0);assert.equal(f.forSetting({czChance:1},3).czChance,1);assert.equal(f.forSetting({},3).strongChance,.7794);});

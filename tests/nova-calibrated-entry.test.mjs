import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';
const ctx=vm.createContext({});vm.runInContext(fs.readFileSync('nova-tuning.js','utf8')+'\n'+fs.readFileSync('nova-art.js','utf8'),ctx);const a=ctx.NovaArt;
test('weak NOVA obeys the common response threshold and the profiled quality distribution',()=>{
 for(let setting=1;setting<=6;setting++){
  const profile=ctx.NovaTuning.balanceProfile(setting),weights=a.weakQualityWeights(setting,false),total=weights.reduce((sum,value)=>sum+value,0);
  assert.equal(a.weakAtResponseChance(setting,false,false),profile.weakResponse);assert.equal(profile.weakResponse,.06);
  assert.equal(a.drawWeakAtReward(setting,{},()=>profile.weakResponse).quality,-1);
  let edge=0;
  for(let quality=0;quality<weights.length;quality++){
   const weight=weights[quality];if(!weight)continue;
   const values=[profile.weakResponse-1e-9,(edge+weight/2)/total,0],out=a.drawWeakAtReward(setting,{},()=>values.shift()??.999);
   assert.equal(out.quality,quality);
   if(quality===0)assert.equal(out.direct,10);
   else if(quality===1){assert.equal(out.zone,'sosuke');assert.equal(out.fixed50,true);}
   else assert.ok(out.zone);
   edge+=weight;
  }
 }
});

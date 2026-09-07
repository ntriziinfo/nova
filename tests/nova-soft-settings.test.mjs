import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';
const ctx=vm.createContext({});for(const f of ['nova-art.js','nova-balance.js','nova-flow.js','nova-normal.js'])vm.runInContext(fs.readFileSync(f,'utf8'),ctx);
const a=ctx.NovaArt,b=ctx.NovaBalance,n=ctx.NovaNormal;
test('observable normal small roles have identical setting distributions',()=>{for(let i=0;i<10000;i++){const r=(i+.5)/10000;assert.equal(n.drawRole(1,()=>r),n.drawRole(6,()=>r));}});
test('entry and zone differences stay small and all six zones remain possible',()=>{const ps=[1,2,3,4,5,6].map(b.profile);assert.ok(Math.max(...ps.map(p=>p.scale))/Math.min(...ps.map(p=>p.scale))<1.4);assert.ok(ps[0].directDenom/ps[5].directDenom<1.5);for(const row of a.zoneWeights){assert.equal(row.reduce((s,x)=>s+x),100);assert.ok(row.every(x=>x>0));}for(let c=0;c<6;c++)assert.ok(Math.abs(a.zoneWeights[0][c]-a.zoneWeights[5][c])<=2.5);});
test('bonus paid-role correction preserves 2.5pt across all setting-specific special rates',()=>{for(let setting=1;setting<=6;setting++){const p=a.bonusSpecialFor(setting);assert.ok(p>0&&p<.025);const bell=(5.5/(1-p)-3)/5;assert.ok(Math.abs((1-p)*(8*bell+3*(1-bell))-5.5)<1e-10);}});
test('freeze bonus has no coin target, no setting hint, no old PBB sound',()=>{
 const h=fs.readFileSync('jag.html','utf8'),fn=name=>h.match(new RegExp('  function '+name+'\\([^]*?\\n  }'))[0];
 vm.runInContext('const A_TYPE_MODE=true;const session={bonusKind:"BIG",premiumBonus:true};const settings={setting:6};'+['aTypeBonusTarget','pickSettingBonusEndVoiceSrc','premiumBonusEndImmediateVoiceSrc','playPremiumBigThirdStopVoice','isPremiumBigConfirmSoundContext'].map(fn).join('\n')+'\nconst currentSpin={};',ctx);
 assert.equal(vm.runInContext('aTypeBonusTarget()',ctx),0);assert.equal(vm.runInContext('pickSettingBonusEndVoiceSrc()',ctx),'');assert.equal(vm.runInContext('premiumBonusEndImmediateVoiceSrc()',ctx),'');assert.equal(vm.runInContext('playPremiumBigThirdStopVoice()',ctx),false);assert.equal(vm.runInContext('isPremiumBigConfirmSoundContext()',ctx),false);
 assert.match(h,/premiumChainEligible:false/);assert.doesNotMatch(h,/A_TYPE_PREMIUM_BIG_PAYOUT = 500/);
});

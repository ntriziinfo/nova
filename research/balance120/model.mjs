import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {loadModel} from '../burst112/production-model.mjs';
import {cacheMix} from '../balance118/cache-mix.mjs';

export const baseCommit='be2fbb9fb5bbf8b4ac931910163cdee76595a7fc';
export const candidate={initial:400,bonus:50,base:35,replay:.25,pointShare:.7,awards:[.6,.3,.1],levels:[.6,.25,.15],ura:[1,1,1]};
const baseline=f=>execFileSync('git',['show',`${baseCommit}:${f}`],{encoding:'utf8'});
export function buildArt(job={}){
 const c={...candidate,...job};let source=baseline('nova-art.js');
 const replace=(a,b)=>{assert.equal(source.split(a).length,2,a);source=source.replace(a,b);};
 replace('const defaults={initial:150,',`const defaults={initial:${c.initial},`);
 replace('const bonusTarget=()=>100;',`const bonusTarget=()=>${c.bonus};`);
 replace('**(-1/7)-1',`**(-1/Math.ceil(bonusTarget()/15))-1`);
 // A four-bell upper BIG needs more aim opportunities to retain 80% AT odds.
 replace('const hit=.45/(2-.45),ratio=', 'const hit=.5,ratio=');
 // With half of misses unguided, raw aim hit .5 gives guided hit 2/3.
 // Adjust bonus-only colors so their 20%/80%/100% confidence stays correct.
 replace("const success=result==='NEBULA',weights=aimColors.map(row=>row.weight*(success?row.hit:1-row.hit));", "const colors=[{color:'blue',weight:43/180,hit:.2},{color:'red',weight:128/180,hit:.8},{color:'rainbow',weight:.05,hit:1}],success=result==='NEBULA',weights=colors.map(row=>row.weight*(success?row.hit:1-row.hit));");
 replace("return {symbol:'nebula',color:aimColors[index].color,result,guide:success||rng()<.5,forced:false};", "return {symbol:'nebula',color:colors[index].color,result,guide:success||rng()<.5,forced:false};");
 source=source.replace('// Seven bell payouts (last one capped to 10pt) complete a 100pt BIG.\n // Choose the per-game hazard so P(at least one NEBULA before seven bells)', '// Bell payouts are capped to the BIG target.\n // Choose the per-game hazard so P(at least one NEBULA before the required bells)');
 source=source.replace(/normalBoost:Object.freeze\(\[[\d.,]+\]\)/,`normalBoost:Object.freeze(${JSON.stringify(c.boosts??Array(6).fill(c.boost??.15))})`);
 source=source.replace(/entry:Object.freeze\(\[[\d.,]+\]\)/,`entry:Object.freeze(${JSON.stringify(c.entries??Array(6).fill(c.entry??.12))})`);
 replace('version:1,games:3,success:.5,award:2000,',`version:1,games:3,success:.5,\n  pointShare:${c.pointShare},awards:Object.freeze([500,1000,2000]),awardWeights:Object.freeze(${JSON.stringify(c.awards)}),levelTargets:Object.freeze([0,4,5]),levelWeights:Object.freeze(${JSON.stringify(c.levels)}),uraWeights:Object.freeze(${JSON.stringify(c.ura)}),`);
 replace('function burstChance(role,setting){',`function challengeName(s){return s?.burstType==='ura'?'裏上乗せゾーン獲得チャレンジ':'爆発チャレンジ';}\n function weightedChallenge(weights,rng){let roll=rng()*weights.reduce((a,b)=>a+b,0);for(let i=0;i<weights.length;i++)if((roll-=weights[i])<0)return i;return weights.length-1;}\n function burstReward(s,rng){\n  s.burstWon=true;s.dryEligible=false;\n  if(s.burstType==='ura'){const zone=zoneGroups.super[weightedChallenge(burstRules.uraWeights,rng)];s.pendingZone=zone;s.entryStage='confirmed';s.rouletteTable=0;return {type:'ura',zone,points:0,level:s.atLevel};}\n  const points=burstRules.awards[weightedChallenge(burstRules.awardWeights,rng)],level=burstRules.levelTargets[weightedChallenge(burstRules.levelWeights,rng)],previous=s.atLevel;\n  s.remaining=(integer(s.remaining)+BigInt(points)).toString();s.atLevel=Math.max(s.atLevel,level);return {type:'points',points,level:s.atLevel,promoted:s.atLevel>previous};\n }\n function burstChance(role,setting){`);
 replace('burstVersion:v?.burstVersion===1?1:0,',"burstVersion:v?.burstVersion===1?1:0,burstType:v?.burstType==='ura'?'ura':'points',");
 const begin=source.indexOf('  if(s.burstVersion===burstRules.version&&((s.burstPending'),end=source.indexOf("  if(s.entryStage==='seven')",begin);assert(begin>0&&end>begin);
 source=source.slice(0,begin)+`  if(s.burstVersion===burstRules.version&&((s.burstPending&&!s.zone&&!s.entryStage)||s.burstLeft)){
   if(!s.burstLeft){s.burstLeft=burstRules.games;s.burstPending=false;}
   const hit=rng()<1-Math.pow(1-burstRules.success,1/burstRules.games);s.burstLeft--;
   let reward=null;if(hit){s.burstLeft=0;if(s.burstType==='ura')s.giruSetting=validSetting(options.setting);reward=burstReward(s,rng);}
   const burstEvent=hit?'success':s.burstLeft?'continue':'failure',name=challengeName(s);
   const message=hit?(reward.type==='ura'?name+'成功！ '+zoneName(reward.zone)+'ゾーン獲得':'NOVA BURST！ ＋'+reward.points.toLocaleString('en-US')+'pt'+(reward.promoted?' / AT Lv.'+reward.level+'へ昇格':'')):s.burstLeft?name+' 残り'+s.burstLeft+'G':name+'終了 / AT継続';
   return {result:hit?'NEBULA':'MISS',flow:s,burstEvent,burstReward:reward,zoneSpin:true,message};
  }
`+source.slice(end);
 replace('s.burstUsed=true;s.burstPending=true;',"s.burstUsed=true;s.burstPending=true;s.burstType=rng()<burstRules.pointShare?'points':'ura';");
 replace("+'爆発チャレンジ獲得！';","+challengeName(s)+'獲得！';");
 replace("s.burstWon?'NOVA BURST / ':s.burstLeft?'爆発チャレンジ 残り'+s.burstLeft+'G / ':s.burstPending?'爆発チャレンジ待機 / '","s.burstWon?(s.burstType==='ura'?'裏チャレンジ成功 / ':'NOVA BURST / '):s.burstLeft?challengeName(s)+' 残り'+s.burstLeft+'G / ':s.burstPending?challengeName(s)+'待機 / '");
 replace('return {comebackRules,','return {challengeName,burstReward,comebackRules,');
 source=source.replace('// Initial levels are modest; the rare challenge is the route to Lv.5.','// Challenges split into weighted points/level promotion and guaranteed ura-zone awards.');
 source=source.replace('// Draw once at an AT initial entry; only challenge success promotes the level.','// Draw once at an AT initial entry; point-challenge success can promote the level.');
 new vm.Script(source);return source;
}
export function buildNormal(job={}){
 const c={...candidate,...job};let source=baseline('nova-normal.js');
 source=source.replace('frequent*0.55',`frequent*${c.replay}`).replace('50/50',`50/${c.base}`).replace('base is 50 games per 50pt',`base is ${c.base} games per 50pt`);new vm.Script(source);return source;
}
export function loadCandidate(job){
 loadModel(undefined,job.cache!==false);
 if(job.baseline)return;
 const source=buildArt(job);vm.runInThisContext(job.cache===false?source:cacheMix(source));vm.runInThisContext(buildNormal(job));
 for(let s=1;s<=6;s++){const p=NovaNormal.roleProbabilities(s);assert(Object.values(p).every(v=>v>=0&&v<=1));assert(Math.abs(Object.values(p).reduce((a,b)=>a+b,0)-1)<1e-10);}
 for(const tier of ['normal','upper']){const p=NovaArt.bonusRoleProbabilities(job.setting,tier);assert(Object.values(p).every(v=>v>=0&&v<=1),'invalid BIG mix '+tier);assert(Math.abs(Object.values(p).reduce((a,b)=>a+b,0)-1)<1e-10);assert(Math.abs(1-(p.BELL/(p.BELL+p.NEBULA))**Math.ceil(NovaArt.bonusTarget()/15)-NovaArt.bonusRules[tier].atChance)<1e-12);}
}

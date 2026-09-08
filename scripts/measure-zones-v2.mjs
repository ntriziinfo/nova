// Run from repository root: node scripts/measure-zones-v2.mjs [trials per zone]
import fs from 'node:fs';import vm from 'node:vm';
for(const f of ['nova-art.js','nova-balance.js'])vm.runInThisContext(fs.readFileSync(f,'utf8'));
const trials=Number(process.argv[2]||100000);let seed=84261;
const rng=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
const rows=[];
for(const id of NovaArt.zoneIds){let award=0,games=0,zero=0;
 for(let n=0;n<trials;n++){
  let s=NovaArt.startZone(NovaArt.enter(),id,{},rng),iterations=0;
  while(s.zone){if(++iterations>100000)throw new Error('Unexpected non-terminating zone');s=NovaArt.prepareBet(s,{},rng);if(!s.zone)break;if(s.zero)zero++;else games++;s=NovaArt.step(s,{},rng).flow;}
  award+=Number(s.remaining)-NovaArt.defaults.initial;
 }
 rows.push({zone:NovaArt.zoneName(id),trials,theoreticalPt:NovaBalance.zoneMean(id),samplePt:award/trials,paidGames:games/trials,zeroGames:zero/trials});
}
console.log(JSON.stringify(rows,null,2));

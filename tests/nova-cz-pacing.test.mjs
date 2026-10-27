import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const c=vm.createContext({});vm.runInContext(fs.readFileSync('nova-cz-push.js','utf8'),c);const p=c.NovaCzPresentation;
const rates=[.27317164880616657,.2836866010598032,.31678578327216533,.30022044640396806,.326671511627907,.32773931366646597];
const rows=[];
for(let setting=1;setting<=6;setting++){
 const win=Array(9).fill(0),loss=Array(9).fill(0);
 for(let seed=0;seed<50000;seed++)for(const won of [true,false]){const last=p.display({timingSeed:seed,totalGames:15,remaining:1},3,won,setting);(won?win:loss)[last.stage]++;}
 const prior=rates[setting-1];let greenPlus=0;
 for(const [count,confidence] of [[1,1],[2,.05],[4,.15],[6,.6],[7,.9],[8,1]]){
  const w=prior*win[count],l=(1-prior)*loss[count];assert(Math.abs(w/(w+l)-confidence)<.02,`setting ${setting}, tier ${count}`);
  if(count>=6)greenPlus+=(w+l)/50000;
 }
 assert(greenPlus>.32&&greenPlus<.44);assert.equal(loss[1]+loss[8],0);
 rows.push({setting,greenPlusPercent:+(greenPlus*100).toFixed(2)});
}
const buckets=[0,0,0],stops=[0,0,0];let simultaneous=0;
for(let seed=0;seed<2000;seed++)for(const totalGames of [5,15,20])for(const winAt of [0,3,totalGames,Infinity]){
 let prev=0,firstExtra=0;
 for(let game=1;game<=totalGames;game++)for(let stop=1;stop<=3;stop++){
  const lamp={timingSeed:seed,totalGames,remaining:totalGames-game+1},before=JSON.stringify(lamp);
  const shown=p.display(lamp,stop,game>=winAt,4);assert(shown.stage>=prev,'lights must never turn off');
  assert.equal(JSON.stringify(lamp),before);assert.equal(JSON.stringify(shown),JSON.stringify(p.display(JSON.parse(before),stop,game>=winAt,4)));
  if(totalGames===15&&winAt===0&&shown.stage>prev){stops[stop-1]++;if(shown.stage-prev>1)simultaneous++;if(!firstExtra&&shown.stage>=2)firstExtra=game;}
  prev=shown.stage;
 }
 if(totalGames===15&&winAt===0&&firstExtra)buckets[firstExtra<=5?0:firstExtra<=10?1:2]++;
}
assert(buckets.every(n=>n>150),JSON.stringify(buckets));assert(stops.every(n=>n>300));assert(simultaneous>0); // Multi-lamp same-stop events are now exceptional.
console.log(JSON.stringify({rows,firstAdditionalLightEarlyMiddleLate:buckets,lightEventsByStop:stops,simultaneous},null,2));

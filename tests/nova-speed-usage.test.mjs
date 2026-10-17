import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const source=fs.readFileSync('nova-game.js','utf8'),fn=name=>source.match(new RegExp('  function '+name+'\\([^]*?\\n  }'))[0];
test('only counted paid AUTO spins report usage, with unchanged BET and remaining pt',()=>{
 for(const paid of [false,true])for(const connected of [false,true])for(const zero of [false,true]){
   const messages=[];
   const h=vm.createContext({URL,location:{href:'https://game.invalid'},window:{parent:{postMessage:(...args)=>messages.push(args)}},
     VERTEX_CONTROLLER_ENABLED:connected,PLAY_SESSION_ID:'session-one',ADMIN_SERVER:'https://store.invalid',
     autoPlay:true,superFullAuto:paid,autoPacingBudget:null,autoPacingProfile:()=>paid?'fast':'normal',NovaSuperSpeed:{recordBet:()=>({})},performance:{now:()=>0},
     A_TYPE_MODE:true,SPIN_COST:3,session:{active:false},normalState:{flow:{phase:'art',remaining:'200',zero}},stats:{totalFee:0,totalPaid:0},
     jagChainCount:null,jagChainBonusHandoff:false,clearCzReelBlackout(){},recordSlumpPoint(){},updateCompleteTrialState(){},
     NovaArt:{restoreBetCost:flow=>({...flow,remaining:'203'})}});
   for(const name of ['chainCountStep','chargeSpinCost'])vm.runInContext(fn(name),h);
   h.chargeSpinCost();
   assert.equal(messages.length,paid&&connected&&!zero?1:0);
   if(messages.length){assert.equal(messages[0][0].sessionId,'session-one');assert.equal(messages[0][1],'https://store.invalid');}
   assert.equal(h.stats.totalFee,zero?0:3);assert.equal(h.normalState.flow.remaining,zero?'200':'203');
 }
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {simulate} from '../scripts/simulate-normal.mjs';

test('legacy normal simulator keeps CZ direct additive to its BIG and uses replay-gated preparation cash',()=>{
  const saved={NovaArt:globalThis.NovaArt,NovaNormal:globalThis.NovaNormal,NovaFlow:globalThis.NovaFlow};
  const observed={normalSpins:0,prepRoles:[],prepCash:[],bonusTiers:[],afterBonusSets:[],enterSources:[],initialEntries:0,afterBonusFlow:null,resumedFlow:null};
  const prepRoles=['WEAK_NOVA','START_REPLAY_RIGHT'];
  try{
    globalThis.NovaArt={
      defaults:{},
      biasFor:()=>0,bonusSpecialFor:()=>0,
      isPreparationStartReplay:role=>role.startsWith('START_REPLAY_'),
      drawPreparationRole:()=>{const role=prepRoles.shift();assert.ok(role,'bonus preparation outlived its start replay');observed.prepRoles.push(role);return role;},
      drawBonusPreparationReward:role=>role==='WEAK_NOVA'?{sets:2,zones:['toto'],upperBonus:true,upperAt:true}:{sets:0,zones:[],upperBonus:false,upperAt:false},
      preparationCashPayout:role=>{observed.prepCash.push(role);return 3;},
      drawBonusTier:()=>{throw new Error('upper preparation must select the upper BIG tier');},
      drawBonus:(_rng,_setting,tier)=>{observed.bonusTiers.push(tier);return 'BELL';},
      bonusPayout:()=>1,bonusTarget:()=>1,
      afterBonus:(_flow,_options,sets)=>{observed.afterBonusSets.push(sets);return observed.afterBonusFlow={phase:'art',initialStage:'wait',queuedZones:[],zone:'',sets:String(Math.max(0,sets-1))};},
      prepareBet:flow=>flow,
      step:flow=>({result:'START_REPLAY_LEFT',flow:{...flow,initialStage:''}}),
      startZone:()=>{throw new Error('queued direct rewards must wait for initial AT preparation');},
      enterInitial:()=>{observed.initialEntries++;return {phase:'art'};}
    };
    globalThis.NovaNormal={
      reset:()=>({impurity:0,games:0}),normalize:value=>value,
      pay:()=>0,
      spin:(state,flow)=>{
        observed.normalSpins++;
        if(observed.normalSpins===1)return {state:{...state,games:1},result:'MISS',entry:'CZ',entrySource:'rare',czOptions:{},czFlow:flow,internalBonus:null,direct:false};
        if(observed.normalSpins===2)return {state:{...state,games:2},result:'MISS',entry:'',czFlow:{...flow,remaining:2,direct:true,directZone:'giru'},internalBonus:null,direct:true,directZone:'giru'};
        return {state:{...state,games:3},result:'MISS',entry:'',czFlow:{...flow,remaining:1,direct:true,directZone:'giru'},internalBonus:{kind:'BIG',source:'CZ成功',direct:true,directZone:'giru'},direct:true,directZone:'giru'};
      },
      claim:state=>({state,zones:[],sets:0}),afterBonus:state=>state,bonusEnd:state=>state,afterArt:(state,_before,after)=>{observed.resumedFlow=after;return state;}
    };
    globalThis.NovaFlow={
      currentRuleVersion:999,
      enterCZ:(_strong,_options,_rng,source)=>{observed.enterSources.push(source);return {phase:'cz',ruleVersion:999,remaining:2,direct:false,directZone:''};},
      advance:flow=>({...flow,remaining:Math.max(0,(flow.remaining||0)-1)}),normalize:()=>({phase:'normal'})
    };

    const result=simulate(1,1,8,1234);
    assert.equal(result.games,8);
    assert.deepEqual(observed.enterSources,['rare']);
    assert.equal(observed.normalSpins,3,'early direct must remain in CZ until its terminal BIG');
    assert.equal(observed.initialEntries,0,'CZ direct must not bypass the BIG');
    assert.deepEqual(observed.prepRoles,['WEAK_NOVA','START_REPLAY_RIGHT']);
    assert.deepEqual(observed.prepCash,['WEAK_NOVA','START_REPLAY_RIGHT','START_REPLAY_LEFT']);
    assert.deepEqual(observed.bonusTiers,['upper']);
    assert.deepEqual(observed.afterBonusSets,[3],'two preparation stocks plus the direct AT stock');
    assert.equal(observed.resumedFlow.researchUpper,true);
    assert.deepEqual(observed.resumedFlow.queuedZones,['toto','giru']);
  }finally{
    Object.assign(globalThis,saved);
  }
});

test('legacy normal simulator settles watermelon and cherries with the production cash schedule',()=>{
  const saved={NovaArt:globalThis.NovaArt,NovaNormal:globalThis.NovaNormal,NovaFlow:globalThis.NovaFlow};
  let role='';
  try{
    globalThis.NovaArt={defaults:{},biasFor:()=>0,bonusSpecialFor:()=>0};
    globalThis.NovaNormal={
      reset:()=>({games:0}),normalize:value=>value,
      pay:value=>({WEAK_SUICA:3,WEAK_NOVA:2,STRONG_NOVA:2})[value]||0,
      spin:(state,flow)=>({state:{...state,games:(Number(state?.games)||0)+1},result:role,czFlow:flow,internalBonus:null,entry:'',direct:false})
    };
    globalThis.NovaFlow={advance:flow=>flow};
    for(const [result,payout]of [['WEAK_SUICA',3],['WEAK_NOVA',2],['STRONG_NOVA',2]]){
      role=result;
      const settled=simulate(1,1,1,1234,{exactGames:true});
      assert.equal(settled.games,1);
      assert.equal(settled.totalBet,3);
      assert.equal(settled.net,payout-3);
      assert.equal(settled.rtp,payout/3);
    }
  }finally{
    Object.assign(globalThis,saved);
  }
});

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

function load(){
  const context=vm.createContext({});
  for(const file of ['nova-tuning.js','nova-art.js','nova-flow.js','nova-normal.js']){
    vm.runInContext(fs.readFileSync(file,'utf8'),context,{filename:file});
  }
  return context;
}
const sequence=(...values)=>{let index=0;return ()=>values[index++]??.999999999;};

test('one-coin role is natural in ordinary play and AT while excluded phases keep their own tables',()=>{
  const {NovaArt:a,NovaNormal:n,NovaTuning:t}=load();
  assert.equal(a.lowPayout('ONE_COIN'),1);
  assert.equal(a.payout('ONE_COIN'),1);
  assert.equal(a.cashPayout('ONE_COIN'),1);
  assert.equal(n.pay('ONE_COIN'),1);
  assert.equal(a.atShortfallRefund('ONE_COIN'),2);
  assert.equal(a.atLowPayoutRules.oneCoinChance,.1);
  assert.equal(n.normalLowPayoutRules.oneCoinChance,.1);
  assert.equal(n.normalLowPayoutRules.addedNaviBellChance,1/16);
  const shared=JSON.parse(JSON.stringify(n.roleProbabilities(1))),ordinary=JSON.parse(JSON.stringify(n.normalRoleProbabilities(1)));
  for(let setting=1;setting<=6;setting++){
    const at=a.roleProbabilities(setting),upper=a.roleProbabilities(setting,true),initial=a.initialRoleProbabilities(setting);
    for(const [row,isUpper] of [[at,false],[upper,true]]){
      assert.equal(row.ONE_COIN,.1);
      assert.equal(Object.hasOwn(row,'NAVI_BELL'),false);
      assert.ok(Math.abs(Object.values(row).reduce((sum,p)=>sum+p,0)-1)<1e-12);
      assert.ok(Object.values(row).every(p=>Number.isFinite(p)&&p>=0&&p<=1));
      const net=Object.entries(row).reduce((sum,[role,p])=>sum+p*(a.cashPayout(role)-3),0);
      assert.ok(Math.abs(net-(isUpper?a.atNetRules.upper:a.atNetRules.normal))<1e-12);
      const {chance,mean}=a.atMix(setting),share=isUpper?1:.5;
      const oldBell=((isUpper?a.atNetRules.upper:a.atNetRules.normal)-chance*(mean-3))/(5+7*share);
      const oldReplay=1-chance-oldBell;
      const newHighDown=row.REPLAY*a.atLowPayoutRules.replayHighDownChance+row.ONE_COIN*a.oneCoinHighDownChance(isUpper);
      assert.ok(Math.abs(newHighDown-oldReplay*a.atLowPayoutRules.replayHighDownChance)<1e-12);
      let oneStart=0;for(const [role,p]of Object.entries(row)){if(role==='ONE_COIN')break;oneStart+=p;}
      const before={...a.enter({setting},()=>.5),remaining:'300',researchUpper:isUpper};
      const out=a.step(a.restoreBetCost(before,3),{setting},sequence(.999999,oneStart+row.ONE_COIN/2));
      assert.equal(out.result,'ONE_COIN');assert.equal(out.flow.remaining,'302');assert.equal(out.atShortfallRefund,2);
    }
    for(const row of [initial,a.preparationProbabilities(setting),a.bonusRoleProbabilities(setting),a.comebackRoleProbabilities(setting),n.roleProbabilities(setting)]){
      assert.equal(Object.hasOwn(row,'ONE_COIN'),false);
      assert.equal(Object.hasOwn(row,'NAVI_BELL'),false);
    }
    assert.ok(a.scriptedInitialRoles(setting,()=>a.atMix(setting).chance+.05).every(role=>role!=='ONE_COIN'));
    const row=n.normalRoleProbabilities(setting);
    assert.deepEqual(JSON.parse(JSON.stringify(n.roleProbabilities(setting))),shared);
    assert.deepEqual(JSON.parse(JSON.stringify(row)),ordinary);
    assert.equal(row.ONE_COIN,.1);
    assert.equal(n.drawNormalRole(setting,()=>.95),'ONE_COIN');
    assert.ok(row.REPLAY>=1/7&&row.REPLAY<=1/5,`setting ${setting}: replay ${row.REPLAY}`);
    assert.ok(Math.abs(Object.values(row).reduce((sum,p)=>sum+p,0)-1)<1e-12);
    assert.ok(Object.values(row).every(p=>Number.isFinite(p)&&p>=0&&p<=1));
    const paid=Object.entries(row).reduce((sum,[role,p])=>sum+p*(role==='REPLAY'?3:role==='NAVI_BELL'?8:n.pay(role)),0);
    assert.ok(Math.abs(paid-4/3)<1e-12,`setting ${setting}: paid ${paid}`);
    assert.ok(Math.abs(50/(3-paid)-30)<1e-10,`setting ${setting}: base ${50/(3-paid)}`);

    const added=n.normalLowPayoutRules.addedNaviBellChance;
    const one=n.normalLowPayoutRules.oneCoinChance;
    assert.ok(Math.abs(row.NAVI_BELL-(1/t.normalBellDenominators[setting-1]+added))<1e-12);
    assert.equal(row.ONE_COIN,one);
    for(const role of Object.keys(shared))if(!['REPLAY','MISS'].includes(role))assert.equal(row[role],shared[role],`${role} setting ${setting}`);

    const entries=Object.entries(row);
    let lower=0;
    for(const [role,p] of entries){
      if(p===0)continue;
      const midpoint=lower+p/2;
      assert.equal(n.drawNormalRole(setting,()=>midpoint),role,`${role} setting ${setting}`);
      if(role==='NAVI_BELL'){
        let calls=0;
        const token=n.spin(null,{phase:'normal'},setting,{},()=>calls++===0?midpoint:.999999);
        assert.equal(token.result,'BELL');
        assert.equal(token.normalBellNavi,true);
        assert.equal(n.pay(token.result),8);
      }
      lower+=p;
    }
  }
});

test('one-coin role preserves the former miss/replay high-state downgrade hazard',()=>{
  const {NovaNormal:n,NovaTuning:t}=load();
  assert.ok(Math.abs(n.oneCoinDownChance()-.07)<1e-12);
  assert.ok(Math.abs(n.oneCoinDownChance({downMiss:.2,downReplay:.02})-.14)<1e-12);
  const state={level:'high',highLeft:0,mode:'A',games:200};
  assert.equal(n.advance(state,'ONE_COIN',{phase:'normal'},{setting:3},()=>.069999).level,'low');
  assert.equal(n.advance(state,'ONE_COIN',{phase:'normal'},{setting:3},()=>.07).level,'high');
  assert.equal(n.advance({...state,highLeft:1},'ONE_COIN',{phase:'normal'},{setting:3},()=>0).level,'high');
  assert.equal(n.roleCzRate({},'ONE_COIN',3,{}),0);
  for(let setting=1;setting<=6;setting++){
    const row=n.normalRoleProbabilities(setting),base={...n.roleProbabilities(setting)};
    const legacyNavi=1/t.normalBellDenominators[setting-1];
    base.NAVI_BELL=legacyNavi;
    base.MISS=1-Object.entries(base).reduce((sum,[role,p])=>sum+(role==='MISS'?0:p),0);
    const otherPaid=Object.entries(base).reduce((sum,[role,p])=>sum+p*(role==='NAVI_BELL'?8:n.pay(role)),0);
    base.REPLAY=(3-50/t.normalBase(setting)-otherPaid)/3;
    base.MISS=1-Object.entries(base).reduce((sum,[role,p])=>sum+(role==='MISS'?0:p),0);
    const before=base.MISS*n.defaults.downMiss+base.REPLAY*n.defaults.downReplay;
    const after=row.MISS*n.defaults.downMiss+row.REPLAY*n.defaults.downReplay+row.ONE_COIN*n.oneCoinDownChance();
    assert.ok(Math.abs(after-before)<1e-12,`setting ${setting}: ${after} != ${before}`);
  }
});

test('ordinary, upper and prelude AT defer each low-payout loss into remaining points exactly once',()=>{
  const {NovaArt:a}=load();
  for(const researchUpper of [false,true])for(const atPrelude of [null,{total:5,left:4,zones:[]}])for(const [role,payout]of [['ONE_COIN',1]]){
    const before={...a.enter({setting:3},()=>.5),remaining:'300',researchUpper,...(atPrelude?{atPrelude}:{})};
    const paidBet=a.restoreBetCost(before,3);
    assert.equal(paidBet.remaining,'303');
    const out=a.step(paidBet,{setting:3},()=>.999999,role);
    const carry=3-payout;
    assert.equal(out.result,role);
    assert.equal(out.flow.remaining,String(300+carry));
    assert.equal(out.atShortfallRefund,carry);
    assert.equal((payout-3)+(Number(out.flow.remaining)-300),0);
    assert.equal(out.atOutcome.direct,0);
    assert.equal(out.atOutcome.zone,'');
  }
});

test('one-coin role near zero extends the AT instead of entering comeback early',()=>{
  const {NovaArt:a}=load();
  for(const [role,remaining]of [['ONE_COIN','3']]){
    const before={...a.enter({setting:3},()=>.5),remaining:'1'};
    const out=a.step(a.restoreBetCost(before,3),{setting:3},()=>.999999,role);
    assert.equal(out.flow.phase,'art');
    assert.equal(out.flow.remaining,remaining);
    assert.equal(out.comebackEvent,undefined);
  }
});

test('browser registry exposes the approved sheet miss stop in the debug force menu',()=>{
  const source=fs.readFileSync('nova-game.js','utf8');
  const html=fs.readFileSync('jag.html','utf8');
  assert.match(source,/ONE_COIN:1/);
  assert.ok(source.includes('ONE_COIN:{name:"1枚役",label:"1枚",reel:[BELL_SYMBOL,BLANK_SYMBOL,ELEPHANT_SYMBOL],cls:"blue",kind:"pay"}'));
  assert.ok(source.includes("...['ONE_COIN'].map(k=>[k,RESULT[k].name+'（外れ目停止形）'])"));
  assert.ok(html.includes('<option value="NAVI_BELL">押し順ベル（8pt）</option>'));
  assert.ok(source.includes('if(result === "NAVI_BELL")return result;'));
  assert.ok(source.includes("['ONE_COIN','NAVI_BELL','BELL','REPLAY','MISS','FREEZE']"));
});

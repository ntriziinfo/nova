import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';
const html=fs.readFileSync('jag.html','utf8');
test('all NOVA bell payouts use the new bell clip even in premium bonus',()=>{
 const ctx=vm.createContext({A_TYPE_MODE:true,currentSpin:null,PAYOUT_3PT_BELL_SOUND_SRC:'assets/media/nova/bell_payout.wav',isPremiumBigBonusPieroSound:()=>true});
 vm.runInContext(html.match(/  function payoutSoundSrcFor\([^]*?\n  }/)[0],ctx);
 for(const role of ['BELL','STRONG_BELL','GRAPE','BELL3'])assert.equal(ctx.payoutSoundSrcFor(role,8),'assets/media/nova/bell_payout.wav');
});

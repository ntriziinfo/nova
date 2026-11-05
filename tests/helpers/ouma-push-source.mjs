import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';

// Exact pre-PUSH engine reconstruction; UI gating cannot hide gameplay edits.
export function beforeOumaPush(source){
 const replacements=[
  [
    "&&!oumaPresentation&&!NovaCzPresentation.failureActive&&!document.getElementById('novaCzPush')",
    "&&!NovaCzPresentation.failureActive&&!document.getElementById('novaCzPush')"
  ],
  [
    "  function clearOumaPresentation(keepNovaShake=false,keepReelMotion=false){\n    NovaOumaPush.reset();",
    "  function clearOumaPresentation(keepNovaShake=false,keepReelMotion=false){"
  ],
  [
    "['lift','push','fail'].includes(oumaPresentation?.stage)",
    "['lift','fail'].includes(oumaPresentation?.stage)"
  ],
  [
    "    const started=performance.now(),tops=oumaStoppedTops.map(top=>Math.max(0,top));\n    const preparedFlow=normalState.flow;\n    // Both outcomes lift one cell identically. Reveal only after a PUSH, with\n    // no new draw, BET or payout while waiting for the player's input.\n    const valid=()=>oumaPresentation===presentation&&normalState.flow===preparedFlow&&canUsePlayState();\n    const reveal=()=>{\n      if(!valid()){clearOumaPresentation();return;}\n      if(oumaFailed)reels.forEach((_,i)=>{NovaReelMotion.clear(i);setReelColumn(i,reelWindowFromTopIndex(i,tops[i]+1),'','',null);});\n      else oumaStoppedTops=tops.map((top,i)=>mod(top+1,REEL_STRIPS[i].length));\n      clearOumaPresentation(false,!oumaFailed);spin({oumaFailed});\n      if(!oumaFailed&&!isSpinning)NovaReelMotion.clearAll();\n    };\n    let landed=0;\n    const ready=()=>{\n      if(oumaPresentation!==presentation||presentation.stage!=='lift')return;\n      if(++landed!==3)return;\n      if(!valid()){clearOumaPresentation();return;}\n      if(oumaIntroAudio){oumaIntroAudio.pause();oumaIntroAudio=null;}\n      presentation.stage='push';machine.dataset.oumaFreeze='push';\n      NovaOumaPush.show({valid,auto:()=>!!autoPlay,onOffer:playCzPushPromptVoice,reveal});\n    };\n    reels.forEach((reel,i)=>NovaReelMotion.start(i,reel,REEL_STRIPS[i],tops[i],true,cellHtml,{\n       clock:()=>Math.min(500,Math.max(0,performance.now()-started-[0,65,120][i]))/1000,\n       duration:500,steps:1,done:ready\n     }));",
    "    const started=performance.now(),tops=oumaStoppedTops.map(top=>Math.max(0,top));\n    // Both outcomes use the same one-cell lift and hold. Only the reverse\n    // after the four-second cue reveals success; retain its completed layer\n    // so the synced reverse can replace it at the same top.\n    reels.forEach((reel,i)=>NovaReelMotion.start(i,reel,REEL_STRIPS[i],tops[i],true,cellHtml,{\n       clock:()=>Math.min(500,Math.max(0,performance.now()-started-[0,65,120][i]))/1000,\n       duration:500,steps:1,done:()=>{}\n     }));\n    oumaChainTimer=setTimeout(()=>{\n      if(oumaPresentation!==presentation)return;\n      if(oumaFailed)reels.forEach((_,i)=>{NovaReelMotion.clear(i);setReelColumn(i,reelWindowFromTopIndex(i,tops[i]+1),'','',null);});\n      else oumaStoppedTops=tops.map((top,i)=>mod(top+1,REEL_STRIPS[i].length));\n      clearOumaPresentation(false,!oumaFailed);spin({oumaFailed});\n      if(!oumaFailed&&!isSpinning)NovaReelMotion.clearAll();\n    },4000);"
  ],
  [
    "      if(oumaPresentation.stage==='bet')resolveOumaChallenge();\n      else if(oumaPresentation.stage==='push')NovaOumaPush.autoPress();\n      queueAutoStep(autoPollDelayMs());",
    "      if(oumaPresentation.stage==='bet')resolveOumaChallenge();\n      queueAutoStep(autoPollDelayMs());"
  ]
];
 for(const [current,previous] of replacements){assert.equal(source.split(current).length,2,current);source=source.replace(current,previous);}
 assert.equal(createHash('sha256').update(source).digest('hex'),'c93dfee7761d3c06384a7fc443d80a22ca738edf2c5fe790858340a788760824');
 return source;
}

import fs from 'node:fs';
export const goal=JSON.parse(fs.readFileSync(new URL('./targets.json',import.meta.url)));
export function evaluate(report,{holdout=false}={}){
  const i=report.setting-1;
  if(!Number.isInteger(i)||i<0||i>5)throw Error('Invalid setting');
  const rtp=report.stoppedRtp?.value,reach=report.completeRate;
  const rtpError=rtp-goal.rtp[i],reachError=reach-goal.reach[i];
  const enoughTrials=!holdout||report.trials>=goal.evaluation.holdoutTrialsPerSetting;
  const valid=report.gamesPerTrial===30000&&report.games===report.trials*30000&&Number.isFinite(rtp)&&Number.isFinite(reach)&&enoughTrials;
  const rtpPass=Math.abs(rtpError)<=goal.evaluation.maxRtpError;
  const reachPass=Math.abs(reachError)<=goal.evaluation.maxReachError[i];
  return {setting:report.setting,rtp,reach,rtpError,reachError,rtpPass,reachPass,enoughTrials,pass:valid&&rtpPass&&reachPass};
}

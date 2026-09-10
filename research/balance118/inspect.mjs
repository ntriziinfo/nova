import fs from 'node:fs';
import {compact} from './trial.mjs';
import {evaluate} from './evaluate.mjs';
const prefix=`balance118-${process.argv[2]??'p7'}-`;
for(const file of fs.readdirSync('docs').filter(f=>f.startsWith(prefix)&&f.endsWith('.json'))){
  const {report}=JSON.parse(fs.readFileSync('docs/'+file));
  if(!report)continue;
  console.log(JSON.stringify({...compact(report),gate:evaluate(report),boost:report.boost,entry:report.entry,ci:report.stoppedRtp.ci,reachCI:report.completeCI}));
}

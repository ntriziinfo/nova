import fs from 'node:fs';
import assert from 'node:assert/strict';
import {evaluate} from './evaluate.mjs';
const summary=JSON.parse(fs.readFileSync('docs/balance120-final-summary.json'));assert(summary.allPass);for(const s of summary.settings)assert(evaluate(s.report,{holdout:true}).pass);
let source=fs.readFileSync('nova-balance.js','utf8');
source=source.replace(/const targets=\[[^;]+;/,`const targets=[${summary.settings.map(s=>s.report.stoppedRtp.value.toFixed(6)).join(',')}];`)
 .replace('// v118 measured estimates after joint completion/RTP validation.','// v120 measured estimates after weighted-challenge/BIG50 validation.')
 .replace("verifiedModel:'balance118-30000g-complete-stop'","verifiedModel:'balance120-30000g-complete-stop'")
 .replace("previousVerifiedModel:'comeback116-30000g-complete-stop'","previousVerifiedModel:'balance118-30000g-complete-stop'");
fs.writeFileSync('nova-balance.js',source);
let test=fs.readFileSync('tests/nova-balance.test.mjs','utf8');
test=test.replace('docs/balance118-final-summary.json','docs/balance120-final-summary.json').replace('"balance118-30000g-complete-stop"','"balance120-30000g-complete-stop"').replace('"comeback116-30000g-complete-stop"','"balance118-30000g-complete-stop"')
 .replace('BIG150 and REG75 finish by gross payout','BIG finishes by gross payout').replace('sets continue at 150pt','sets continue at the configured initial quota').replaceAll("flow.remaining,'150'","flow.remaining,String(a.defaults.initial)");
fs.writeFileSync('tests/nova-balance.test.mjs',test);console.log('RTP display now uses accepted measured results.');

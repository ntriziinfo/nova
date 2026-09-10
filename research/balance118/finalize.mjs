import fs from 'node:fs';
import assert from 'node:assert/strict';
import {evaluate} from './evaluate.mjs';
const tag=process.argv[2]??'verify';
const file=`docs/balance118-${tag}-summary.json`,summary=JSON.parse(fs.readFileSync(file));
assert.equal(summary.allPass,true,'Both objectives must pass for every setting before publication');
assert.equal(summary.settings.length,6);
for(const s of summary.settings)assert(evaluate(s.report,{holdout:true}).pass,`S${s.setting} rejected`);
let source=fs.readFileSync('nova-balance.js','utf8');
source=source.replace(/const targets=\[[^;]+;/,`const targets=[${summary.settings.map(s=>s.report.stoppedRtp.value.toFixed(6)).join(',')}];`)
 .replace(/\/\/ v116 estimate[^\r\n]*/,'// v118 measured estimates after joint completion/RTP validation.')
 .replace('1,000 prespecified trials/setting.','3,000 independent holdout trials/setting.')
 .replace("verifiedModel:'comeback116-30000g-complete-stop'","verifiedModel:'balance118-30000g-complete-stop'")
 .replace("previousVerifiedModel:'comeback115-30000g-complete-stop'","previousVerifiedModel:'comeback116-30000g-complete-stop'");
fs.writeFileSync('nova-balance.js',source);
let test=fs.readFileSync('tests/nova-balance.test.mjs','utf8');
test=test.replace('docs/comeback116-summary.json',file).replace('"comeback116-30000g-complete-stop"','"balance118-30000g-complete-stop"').replace('"comeback115-30000g-complete-stop"','"comeback116-30000g-complete-stop"');
fs.writeFileSync('tests/nova-balance.test.mjs',test);
console.log('Published-label data prepared from accepted measured RTP, not from target values.');

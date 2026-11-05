import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const edits=JSON.parse(fs.readFileSync(new URL('./push-variants-premium-source.json',import.meta.url),'utf8'));
// Exact presentation-only diff against e2b5e63. No approximate substitutions.
export function beforePushVariantsAndPremiumCleanup(source){
 for(const [after,before] of edits){assert.equal(source.split(after).length,2,'Presentation edit must match exactly once');source=source.replace(after,before);}
 assert.equal(createHash('sha256').update(source).digest('hex'),'dffd882384e0b7e9fe9cabcfdb7ca160d92be9ba89f3c6901d145486eadd7906');
 return source;
}

import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
export function withoutReliabilityPresentation(source){
 const patches=JSON.parse(fs.readFileSync(new URL('../fixtures/reliability-presentation-diff.json',import.meta.url)));
 for(const {before,after}of patches){assert.equal(source.split(after).length,2,'reviewed presentation block must occur exactly once');source=source.replace(after,before);}
 assert.equal(createHash('sha256').update(source).digest('hex'),'abfe5f9881e0469ead82501fb69ae56aff78e5dcfe94466e53295db86310fe32','restore complete deployed base');
 return source;
}

import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
export function withoutReliabilityPresentation(source){
 if(source.includes('  function syncSuperSpeedReelDisplay(')){
  assert.equal(source.match(/^    globalThis\.NovaSuperSpeedReels && syncSuperSpeedReelDisplay\(\);\n/gm)?.length,6);
  source=source.replace(/  function syncSuperSpeedReelDisplay\([^]*?\n  }\n\n/,'').replace(/^    globalThis\.NovaSuperSpeedReels && syncSuperSpeedReelDisplay\(\);\n/gm,'');
  assert.equal(createHash('sha256').update(source).digest('hex'),'d761f85b894370bd95fc2b63afa5c69fd789f14682a284413cdfcbbd20cadf92','restore exact production source before static reel presentation');
 }
 const patches=JSON.parse(fs.readFileSync(new URL('../fixtures/reliability-presentation-diff.json',import.meta.url)));
 for(const {before,after}of patches){assert.equal(source.split(after).length,2,'reviewed presentation block must occur exactly once');source=source.replace(after,before);}
 assert.equal(createHash('sha256').update(source).digest('hex'),'abfe5f9881e0469ead82501fb69ae56aff78e5dcfe94466e53295db86310fe32','restore complete deployed base');
 return source;
}

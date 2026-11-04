// Offline operating policy adapter. It changes only the stop boundary; the
// published continuous RTP model and live lottery files stay untouched.
import fs from 'node:fs';
import path from 'node:path';
const file=new URL('./zone-v2-model.mjs',import.meta.url);
let source=fs.readFileSync(file,'utf8');
function replaceOnce(before,after){if(source.split(before).length!==2)throw Error('Operating model adapter needs review: '+before);source=source.replace(before,after);}
replaceOnce("from './zone-v2-rng.mjs'",`from '${new URL('./zone-v2-rng.mjs',import.meta.url).href}'`);
replaceOnce('path.dirname(fileURLToPath(import.meta.url))',JSON.stringify(path.dirname(file.pathname.replace(/^\/(\w:)/,'$1'))));
replaceOnce('if(options.exactGames!==false&&!options.settleEnd&&count>=games)throw sessionEnd;',"if(count>games+1000000)throw Error('AT tail exceeded safety limit');if(options.exactGames!==false&&!options.settleEnd&&count>=games&&(!options.operatingLimit||flow.phase!=='art'))throw sessionEnd;");
replaceOnce("while(count<games||(options.settleEnd&&flow.phase==='art'))","while(count<games||((options.settleEnd||options.operatingLimit)&&flow.phase==='art'))");
const model=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
export const loadModel=model.loadModel;
export const simulate=model.simulate;

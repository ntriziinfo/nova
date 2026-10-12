import fs from 'node:fs';
import vm from 'node:vm';

const source=fs.readFileSync(new URL('../../nova-voice-catalog.js',import.meta.url),'utf8');
export function loadVoiceCatalog(context){
  vm.runInContext(source,context);
  return context.NovaVoiceCatalog;
}

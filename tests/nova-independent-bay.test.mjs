import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';
for(const file of ['nova-aim-presentation.js','nova-upper-at-background.js','nova-ladder-presentation.js','nova-stock-entry.js']){
 test(file+' layout is independent of status and stable under cabinet scaling',()=>{
  const source=fs.readFileSync(file,'utf8'),fn=source.match(/ function layout\(\)\{[\s\S]*?\n \}/)?.[0];assert.ok(fn);
  let scale=1;const reel={getBoundingClientRect:()=>({left:200*scale,top:400*scale,width:600*scale})};
  const host={offsetWidth:1000,getBoundingClientRect:()=>({left:0,top:0,width:1000*scale}),querySelector:s=>s==='.reels'?reel:{clientHeight:600},style:{setProperty(){}}};
  const root={hidden:false,style:{}},video={hidden:false,style:{}},panel={hidden:false,style:{}};
  const ctx=vm.createContext({host,root,video,panel,document:{getElementById(id){assert.equal(id,'machine','must not read the status label');return host;}}});vm.runInContext(fn+';layout()',ctx);
  const styles=JSON.stringify([root.style,video.style,panel.style]);assert.match(styles,/239px/);assert.match(styles,/156px/);
  scale=2;vm.runInContext('layout()',ctx);assert.equal(JSON.stringify([root.style,video.style,panel.style]),styles);
 });
}

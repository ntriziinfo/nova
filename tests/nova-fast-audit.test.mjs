import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';
const c=vm.createContext({});const html=fs.readFileSync('jag.html','utf8');vm.runInContext(html.match(/  function fastAtAuditMessage\([^]*?\n  }/)[0],c);
test('fast-spin audit retains exact zone awards and remaining stock without mutating flow',()=>{
 const resolved={artMessage:'裏逢魔ゾーン終了 / ＋20000pt',flowAfter:{remaining:'22000',sets:'9'}};
 const before=JSON.stringify(resolved);const text=c.fastAtAuditMessage('SUPER_NOVA',resolved);
 assert.match(text,/20000pt/);assert.match(text,/残り22000pt/);assert.match(text,/待機9SET/);assert.ok(text.startsWith('[FAST]'));assert.equal(JSON.stringify(resolved),before);
});
test('fast-spin audit skips ordinary spins and retains direct awards and AT ending',()=>{
 assert.equal(c.fastAtAuditMessage('BELL',{}),'');assert.equal(c.fastAtAuditMessage('REPLAY',{artMessage:'ととゾーン / 最終Gで告知'}),'');
 for(const message of ['直乗せ＋300pt','AT終了','次のATセット開始','特化ゾーン確定！ 赤7を狙え'])assert.ok(c.fastAtAuditMessage('MISS',{artMessage:message}));
});

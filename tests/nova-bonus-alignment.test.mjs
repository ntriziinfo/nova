import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

// Exercise the real award committer. Presentation-only alignment checks cannot
// catch an internal NEBULA win being credited after the reels visibly miss.
function setup() {
  const source = fs.readFileSync('nova-game.js', 'utf8');
  const fn = name => source.match(new RegExp('  function ' + name + '\\([^]*?\\n  }'))[0];
  const noop = () => {};
  const c = vm.createContext({
    A_TYPE_MODE: true, settings: {setting: 1},
    session: {active: true, phase: 'a_type_bonus', bonusKind: 'BIG', paid: 0, bonusArtSets: 0},
    normalState: {flow: {phase: 'normal'}}, stats: {totalPaid: 0},
    RESULT: {NEBULA: {name: 'nebula'}, MISS: {name: 'miss'}},
    isATypeBonusComplete: () => false, isZoneEntryResult: () => false,
    $: () => ({classList: {add: noop, remove: noop}}), lineName: () => '',
    log: noop, showOverlay: noop, showMessage: noop,
    playStrongNovaSound: noop, playWeakNovaSound: noop, playChanceSound: noop,
    showCzLamp: noop, shouldStartDevilZoneConfirmIntro: () => false,
    syncDevilZoneConfirmScreen: noop, countRoleStat: noop, recordSlumpPoint: noop,
    stGameAddTextFor: () => '', aTypeBonusLabel: () => '', aTypeBonusRemainingNet: () => 50,
    playWinSound: noop, playLoseSound: noop, confetti: noop,
    syncNovaProgress: noop, NovaDecrement: {observe: noop}, currentProfit: () => 0,
    auditCapture: noop, auditSpinDetail: () => ({})
  });
  for (const file of ['nova-tuning.js', 'nova-art.js', 'nova-aim-presentation.js', 'nova-spin-resume.js', 'nova-bell-navi.js']) {
    vm.runInContext(fs.readFileSync(file, 'utf8'), c, {filename: file});
  }
  for (const name of ['resolveATypeBonusOutcome', 'prepareManualBonusOutcome', 'applyResult']) {
    vm.runInContext(fn(name), c);
  }
  return c;
}

function drawnSpin(c, priorRights, order) {
  c.session.bonusArtSets = priorRights;
  const resolved = c.resolveATypeBonusOutcome('NEBULA');
  const stops = order.map((index, rank) => c.NovaAim.stopTarget(resolved.aim, 'NEBULA', order.slice(0, rank + 1), index));
  c.currentSpin = {
    aTypeBonusActiveAtStart: true, normalActiveAtStart: false, manualBonusStop: false,
    result: 'NEBULA', resolved, aimAligned: stops.at(-1).aligned,
    aimStopOrder: order, stopped: [true, true, true],
    grid: [['B','B','B'],['N','N','N'],['R','R','R']]
  };
  return c.currentSpin;
}

function finish(c, priorRights, order) {
  drawnSpin(c, priorRights, order);
  c.prepareManualBonusOutcome(c.currentSpin);
  c.applyResult(c.currentSpin.result, c.currentSpin.resolved, 1);
  return {priorRights, order, aligned: c.currentSpin.aimAligned, afterRights: c.session.bonusArtSets};
}

test('BIG right-first NEBULA grants the first AT right or one extra zone exactly once', () => {
  const c = setup();
  for (const prior of [0, 1]) for (const order of [[2, 1, 0], [2, 0, 1]]) {
    const out = finish(c, prior, order);
    assert.equal(out.aligned, true);
    assert.equal(out.afterRights, prior + 1);
  }
});

test('BUG-001: a visibly missed BIG NEBULA must not grant an AT right or zone stock', () => {
  const c = setup(), wrongAwards = [];
  for (const prior of [0, 1]) for (const order of [[0, 1, 2], [0, 2, 1], [1, 0, 2], [1, 2, 0]]) {
    const out = finish(c, prior, order);
    assert.equal(out.aligned, false);
    if (out.afterRights !== prior) wrongAwards.push(out);
  }
  assert.deepEqual(wrongAwards, [], 'A missed NEBULA must not grant new rights');
});

test('miss settlement is idempotent, survives a saved spin and preserves earned rights', () => {
  const c=setup();
  for(const prior of [0,1,3])for(const phase of ['normal','art']){
    c.normalState.flow.phase=phase;
    let spin=drawnSpin(c,prior,[0,2,1]);
    spin=c.NovaSpinResume.restore(c.NovaSpinResume.capture(spin),c.RESULT);
    c.currentSpin=spin;
    const before=JSON.stringify({session:c.session,stats:c.stats,flow:c.normalState.flow});
    // No lottery is allowed during alignment settlement or after reload.
    const random=c.MathRandom=vm.runInContext('Math.random',c);
    vm.runInContext('Math.random=()=>{throw Error("unexpected draw")}',c);
    c.prepareManualBonusOutcome(spin);
    assert.equal(spin.result,'MISS');assert.equal(spin.resolved.artSetWon,0);
    assert.equal(spin.resolved.novaRushConfirmed,false);assert.equal(spin.resolved.reward,0);
    assert.equal(spin.resolved.manualLineupMiss,true);assert.equal(spin.resolved.aim.result,'NEBULA');
    assert.equal(JSON.stringify({session:c.session,stats:c.stats,flow:c.normalState.flow}),before);
    const settled=JSON.stringify(spin);
    c.prepareManualBonusOutcome(spin);assert.equal(JSON.stringify(spin),settled);
    c.currentSpin=c.NovaSpinResume.restore(c.NovaSpinResume.capture(spin),c.RESULT);
    c.prepareManualBonusOutcome(c.currentSpin);
    c.applyResult(c.currentSpin.result,c.currentSpin.resolved,1);
    assert.equal(c.session.bonusArtSets,prior);assert.equal(c.session.paid,0);assert.equal(c.stats.totalPaid,0);
    c.MathRandom=random;vm.runInContext('Math.random=MathRandom',c);
  }
});

test('AUTO right-first and fast simulation keep the internally drawn bonus award', () => {
  const c=setup();
  for(let setting=1;setting<=6;setting++)for(const prior of [0,1]){
    c.settings.setting=setting;
    const spin=drawnSpin(c,prior,[2,1,0]);
    assert.deepEqual(Array.from(c.NovaBellNavi.stopOrder(spin)),[2,1,0]);
    c.prepareManualBonusOutcome(spin);c.applyResult(spin.result,spin.resolved,1);
    assert.equal(c.session.bonusArtSets,prior+1);
    const fast=drawnSpin(c,prior,[2,1,0]);delete fast.aimAligned;delete fast.aimStopOrder;
    c.prepareManualBonusOutcome(fast);c.applyResult(fast.result,fast.resolved,1);
    assert.equal(c.session.bonusArtSets,prior+1);
  }
});

test('alignment is not settled before the last stop or for special-zone NEBULA', () => {
  const c=setup();
  const pending=drawnSpin(c,0,[0,1,2]);pending.stopped=[true,false,false];
  c.prepareManualBonusOutcome(pending);assert.equal(pending.result,'NEBULA');assert.equal(pending.resolved.artSetWon,1);
  const zone=drawnSpin(c,0,[0,1,2]);zone.resolved.aTypeBonusGame=false;
  const before=JSON.stringify(zone);c.prepareManualBonusOutcome(zone);assert.equal(JSON.stringify(zone),before);
});

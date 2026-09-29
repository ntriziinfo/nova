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
    RESULT: {NEBULA: {name: 'nebula'}},
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
  for (const file of ['nova-tuning.js', 'nova-art.js', 'nova-aim-presentation.js']) {
    vm.runInContext(fs.readFileSync(file, 'utf8'), c, {filename: file});
  }
  for (const name of ['resolveATypeBonusOutcome', 'prepareManualBonusOutcome', 'applyResult']) {
    vm.runInContext(fn(name), c);
  }
  return c;
}

function finish(c, priorRights, order) {
  c.session.bonusArtSets = priorRights;
  const resolved = c.resolveATypeBonusOutcome('NEBULA');
  const stops = order.map((index, rank) => c.NovaAim.stopTarget(resolved.aim, 'NEBULA', order.slice(0, rank + 1), index));
  c.currentSpin = {
    aTypeBonusActiveAtStart: true, normalActiveAtStart: false, manualBonusStop: false,
    result: 'NEBULA', resolved, aimAligned: stops.at(-1).aligned,
    aimStopOrder: order, stopped: [true, true, true]
  };
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
  // Intentionally fails until the gameplay decision is approved and fixed.
  // Do not mark TODO/skip or accept the erroneous extra award as a fixture.
  assert.deepEqual(wrongAwards, [], 'Wrong-order NEBULA awards remain unresolved; see docs/test-failure-cleanup-20260929.md');
});

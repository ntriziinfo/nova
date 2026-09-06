import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";

const game = readFileSync("jag.html", "utf8");

function objectConstant(name) {
  const match = game.match(new RegExp(`const ${name} = Object\\.freeze\\((\\{[\\s\\S]*?\\})\\);`));
  assert.ok(match, `${name} must exist`);
  return vm.runInNewContext(`(${match[1]})`);
}

function numberConstant(name) {
  const match = game.match(new RegExp(`const ${name} = ([0-9.]+);`));
  assert.ok(match, `${name} must exist`);
  return Number(match[1]);
}

function stationaryHitRate(normalHitRate, entryRate, multiplier, restartRate, gameCount) {
  let state = Array(gameCount + 1).fill(0);
  state[0] = 1;
  for (let iteration = 0; iteration < 200_000; iteration += 1) {
    const next = Array(gameCount + 1).fill(0);
    const risingHitRate = normalHitRate * multiplier;
    next[0] += state[0] * (1 - normalHitRate + normalHitRate * (1 - entryRate));
    next[gameCount] += state[0] * normalHitRate * entryRate;
    for (let remain = 1; remain <= gameCount; remain += 1) {
      next[gameCount] += state[remain] * risingHitRate * restartRate;
      next[remain - 1] += state[remain] * (1 - risingHitRate * restartRate);
    }
    const delta = Math.max(...next.map((value, index) => Math.abs(value - state[index])));
    state = next;
    if (delta < 1e-15) break;
  }
  const risingShare = state.slice(1).reduce((sum, value) => sum + value, 0);
  return state[0] * normalHitRate + risingShare * normalHitRate * multiplier;
}

test("NOVA uses the requested 32G RISING parameters", () => {
  assert.equal(numberConstant("NOVA_RISING_GAMES"), 32);
  assert.equal(numberConstant("NOVA_RISING_BONUS_MULTIPLIER"), 2.8);
  assert.equal(numberConstant("NOVA_RISING_RESTART_RATE"), 0.5);
  assert.deepEqual(
    { ...objectConstant("NOVA_RISING_ENTRY_RATE") },
    { 1: 0.25, 2: 0.23, 3: 0.21, 4: 0.19, 5: 0.17, 6: 0.15 }
  );
});

test("RISING calibration preserves each setting's long-run bonus rate", () => {
  const bonus = objectConstant("A_TYPE_BONUS_TABLE");
  const entries = objectConstant("NOVA_RISING_ENTRY_RATE");
  const scales = objectConstant("NOVA_NORMAL_BONUS_SCALE");
  const multiplier = numberConstant("NOVA_RISING_BONUS_MULTIPLIER");
  const restart = numberConstant("NOVA_RISING_RESTART_RATE");
  const games = numberConstant("NOVA_RISING_GAMES");

  for (const setting of [1, 2, 3, 4, 5, 6]) {
    const target = 1 / bonus[setting].total;
    const actual = stationaryHitRate(target * scales[setting], entries[setting], multiplier, restart, games);
    assert.ok(Math.abs(actual - target) / target < 1e-9, `setting ${setting}: ${actual} vs ${target}`);
  }
});

test("child-role rates stay independent from the RISING bonus multiplier", () => {
  assert.match(game, /const soloCherryP = clamp\(\(1 \/ soloCherry\) \* multiplier/);
  assert.match(game, /const grapeP = clamp\(\(1 \/ grape\) \* multiplier/);
  assert.match(game, /const bigSoloP = clamp\(\(1 \/ bigDetail\.solo\) \* bonusMultiplier/);
  assert.match(game, /const regSoloP = clamp\(\(1 \/ regDetail\.solo\) \* bonusMultiplier/);
});

test("NOVA branding and isolated local storage are present", () => {
  assert.match(game, /<title>NOVA<\/title>/);
  assert.match(game, /assets\/logo\/nova_logo\.svg/);
  assert.match(game, /nova_slot_state_v1_/);
  assert.doesNotMatch(game, /const MACHINE_STORAGE_KEY = "jag_slot_state/);
});

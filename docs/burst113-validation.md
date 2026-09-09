# Burst 113 validation

The adopted reward is +2,000 remaining payout pt and AT Lv.5. Entry probabilities for strong NOVA are 0.12%, 0.28%, 0.40%, 0.46%, 0.58%, and 0.78% for settings 1–6; other eligible roles retain their multipliers. Initial quota 150, three-game 50% success, and one challenge per AT remain unchanged. Already-awarded balances are retained.

## Simulation

- Final data: 30,000G × 1,000 independently seeded sessions per setting, 180,000,000G total. The extra pilot and calibration trials are excluded from the final distribution.
- Selection is recorded in `research/burst113/selected-data.json`. Settings 2–3 use a second seed batch after frequency adjustment; settings 1 and 4–6 use the first verification batch.
- Net = actual paid minus actual BET; replay BET is free. Win = final net > 0.
- Full sessions run to 30,000G. Actual-game figures use the prefix ending at the first net +10,000pt COMPLETE event, or 30,000G if not reached. Unlimited figures retain all games.
- `node research/burst113/verify-production.mjs final`: 52 sampled trajectories / 1,560,000G matched the deployed core candidate, including success, failure, ordinary sessions, all AT episodes, COMPLETE checkpoints, final quota and payouts. Hashes and counts are in `docs/burst113-production-parity.json`.
- Source data, bins, quantiles and uncertainty intervals are retained in `docs/burst113-final-distribution.json` and `docs/burst113-summary.json`. Full simulation rows are retained locally in the files named by the selection manifest and can be regenerated with the checked-in scripts/configs.

## Checks

- `node --test tests/nova-burst112.test.mjs tests/nova-burst113.test.mjs tests/nova-balance.test.mjs`: 11 passed, zero failed.
- `node scripts/check.mjs`: HTML syntax and NOVA assets passed.
- `node scripts/validate-config.mjs`: static routes passed.
- Browser: isolated `burst113-silent` session with Chrome `--mute-audio`. Forced AT entry and a success draw only inside that test page; no production RNG overrides.
- After two stops, display remained at AT 150 / Lv.1. After the third reel stopped, display became NOVA BURST / AT 2150 / Lv.5. Reload retained 2150 and Lv.5. No page errors were recorded. Screenshot: `research/burst113/qa-success.png` (local).
- Both distribution charts were visually inspected; annotations are outside the bars so the COMPLETE spike stays visible.

Setting 2 reached +10,000pt in 2.7% of final trials, below the approximate 4% goal; setting 5 reached 13.2% against the approximate 15% goal. The results are estimates, not claims of exact target attainment or Japanese machine certification.

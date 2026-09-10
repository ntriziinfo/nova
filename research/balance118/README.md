# v118: joint calibration

Approved targets are in `targets.json`: 30,000G first net +10,000pt reach 2/4/6/10/15/20%, stopped actual-payout/actual-BET RTP 95/96.5/98/102/107/114%. Both must pass. A finite-sample acceptance margin is disclosed separately from the exact design targets.

The prior v117 adjustment was rejected and public gameplay was restored by commit `4440af6`. The first v118 candidate was committed at `49d5ea5`. Final gameplay was applied at `e56613f` after the scoped confirmations below. `docs/balance118-final-summary.json` records both objectives passing for all settings: 30,000G × 3,000 trials per setting, 540 million selected validation games. The rejected 270 million validation games remain separate. Parameters are in `selected.json` and `final-candidate-2.json`; `final-candidate.json` retains the first candidate.

## Procedure

1. Pilot jobs run fixed 30,000G sessions through the shared production model. Their configurations/manifests are `pilot1` through `pilot9`. Raw trial records remain locally in `docs/balance118-p*-*.json` because they are large; keep rejected candidates for audit.
2. `verify.json` fixes six independent 3,000-trial holdouts at seed base 218900000. `check-seeds.mjs` proves no training seed is reused and all holdout seeds are unique. Cache only deterministic lamp-weight/AT-role arithmetic; `verify-cache.mjs` demonstrates identical whole trajectories with caches disabled.
3. `node research/balance118/run.mjs research/balance118/verify.json` writes the raw holdouts. Keep the runtime source files unchanged while workers are running; every worker verifies their hashes at completion.
4. `node research/balance118/report.mjs verify` checks every row, computes stopped/unstopped estimates separately, and evaluates both objectives. An unsuccessful candidate must not be published.
5. After applying the confirmed profiles, `node research/balance118/report.mjs final` validates source parity and both goals. `node research/balance118/verify-production.mjs final` reruns normal/burst/complete examples without any cache and checks direct complete stopping against recorded prefixes. All 34 complete 30,000G traces and six direct-stop prefixes matched.
6. Only after all settings pass, `finalize.mjs final` updates displayed RTP from measurements (not target values). Run relevant tests, commit explicit files, push, wait for Vercel READY and run `verify-public.mjs final` to compare public files and gameplay to the measured commit.

## Rejected first holdout and scoped confirmation

The first 3,000-trial holdout rejected setting 1 (95.3965% RTP, 3.1333% reach), setting 4 (102.7588% RTP, 12.5% reach), and setting 6 (114.3574% RTP, 21.7667% reach). Their initial results remain intact in `docs/balance118-verify-summary.json`. `confirm.json` changes only settings 1 and 4's initial-hit boost and burst-entry scalar, using fresh seed base 318900000. `confirm6.json` does the same for setting 6 at seed base 418900000. These confirmation jobs patch those two scalar arrays in memory against the same committed source; they do not change the shared runtime while other workers run.

After confirmation, `selected-data.json` records the chosen entire 3,000-trial dataset for each setting and the rejected datasets used for retuning. `selected-data.mjs` requires every runtime byte other than the two setting-indexed arrays to match the measured commit, then checks that the current setting's two scalars equal its tested values. Passed settings cannot silently change or select favorable individual trials. `verify-selected-seeds.mjs` checks final seeds against both pilots and rejected validation.

For the combined final selection, use `report.mjs final`, `verify-production.mjs final`, `finalize.mjs final`, and `verify-public.mjs final`. The public verifier compares against the final report's application commit; uncached whole-trajectory checks establish parity with every selected dataset.

## Reproduction

The measured sources are the commits identified in the selected manifests. Check out that commit in a separate directory and run `verify.json`, `confirm.json`, and `confirm6.json`; do not use later metadata-only edits as the original measured hash. `final-candidate-2.json` records the resulting six-setting application profile, while `selected-data.json` preserves the source of each full validation dataset.

Pilots used v116 runtime files from `4440af6` with in-memory parameter replacements. To rerun a pilot with the saved research tools, use a separate checkout containing the research files and restore only `nova-art.js`, `nova-balance.js`, `nova-normal.js`, and `nova-flow.js` from `4440af6` before invoking its job file. Later cache additions preserve sampled trajectories but can differ in source hashes. The production model and seed algorithm remain in Git history.

No source images or audio are involved. No audio/browser preview is needed for the statistical verification.

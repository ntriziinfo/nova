# AUTO continues through CZ and zone results

The result presenter explicitly called `stopAutoPlay('リザルト表示')`. A silent browser reproduction reached two Ouma 0G continuations, then the final failed continuation and the 200pt result. The log recorded `リザルト表示` and the AUTO button changed from STOP to AUTO. v129 had checked the first continuation, but did not cover result dismissal.

Remove that forced AUTO stop. The existing confirmation-audio lock still blocks BET until the complete eyecatch ends. The existing AUTO timer/watchdog then resumes the next game. Manual play, user STOP, reset, COMPLETE and SPEED behavior remain unchanged. No lottery, payout or balance code changed.

Validation:

- 52 focused tests pass, including regression tests for result/late-win locks and user STOP.
- Silent isolated Edge browser: all nine special zones reach a result and start two later games with AUTO still selected. Ouma, Ura Ouma and Urapi each complete two free reverse spins, a failed continuation, the final result and resumed AT.
- Normal and strong CZ each pass both success and failure paths and continue for three subsequent spins.
- A failed five-game comeback reaches the AT result and automatically resumes normal play after its audio ends.
- Browser tests suspend rendering to cover inactive-window operation, use actual media completion events, and reject any next BET before the eyecatch ends. No page errors observed.

Run `node research/auto130/qa.mjs`; set `NOVA_QA_URL` for deployment verification or `NOVA_QA_CASE=ouma` for one case. Test outcomes are forced only in isolated browser contexts; production draws are unmodified.

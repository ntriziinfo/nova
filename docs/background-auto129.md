# Background AUTO (v129)

AUTO uses a dedicated Worker to dispatch gameplay deadlines while browser rendering and window timers are throttled. Native timers remain a fallback; a shared token prevents double execution. Turning AUTO off terminates the Worker without cancelling unrelated presentation waits. Delayed intervals do not replay missed ticks.

Reel landing and audio-synchronized reverse completion no longer require requestAnimationFrame. Hidden seven/nebula win videos cannot stall the three-second award lock. Ouma's AUTO branch can reach the pending BET presentation while still respecting audio and COMPLETE locks.

Game lottery, awards and balance modules are unchanged. OS sleep, browser process suspension and discarded tabs remain outside the lifetime of the page; this is not an offline simulation.

## Validation

- 38 focused tests pass: native/Worker delivery races, cancellation/restart/fallback, hidden reel completion, audio clock sync, win lock and Ouma AUTO guards.
- Full suite before the final Ouma guard fix: 304 tests, 259 pass, 45 existing failures; the failing names match v128 exactly. The final guard fix is covered by three of the focused tests above.
- Silent, isolated Edge QA suspends all page animation frames and native timeout callbacks while running the actual Worker. Normal AUTO, seven and nebula wins (full three-second locks), guided misses, ladder promotion, Ouma reverse/0G continuation, STOP and foreground restoration pass without page errors.
- Headless Edge does not report actual OS window occlusion; the QA explicitly models its rendering/timer constraints instead of treating a second headless tab as hidden.

Reproduce: `node research/background129/qa.mjs`. For the public deployment, set `NOVA_QA_URL` to its debug URL. Public file checks: `node research/background129/verify-public.mjs`.

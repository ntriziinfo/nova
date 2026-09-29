# iPhone / iPad audio repair (v172)

iOS could remain silent when mobile controls forwarded synthetic clicks or when AUTO/delayed effects created fresh HTML audio players after the user gesture. The new `NovaAudio` transport shares one gesture-unlocked AudioContext for iOS BGM, sound effects and character voices. Desktop keeps its existing native transport.

- Unlock on a trusted touchend, click or keydown; request the playback audio-session category when supported. The mobile 「音声ON」 button can enable audio and recover an interrupted context.
- Decode the existing local media assets on demand. Preserve overlapping voices, media-time confirmation effects, looping BGM, BET fades and the common voice gain/limiter. Pause, reset and source changes invalidate pending playback.
- Bound the completed decode cache to 48 MiB using LRU eviction. Currently playing buffers and decoding work are additional memory, not covered by that cache limit.
- Do not modify or upload source recordings. Do not change lotteries, payouts, game timing or stored play state.

Verification: 57 relevant unit/regression tests passed, covering iOS transport, common voice volume, RUSH timing/fade, CZ, bell sounds, Sora voices, result and reverse-play lifecycle. Syntax and configuration checks passed. Two old fixtures were corrected: the AT result fixture now provides the existing `normalState`, and CZ assets are checked against the previously committed normalization manifest (including original-source hashes) instead of incorrectly requiring the normalized copies to equal the originals.

Muted browser checks use a touch-enabled 390×844 Chromium viewport with an iPhone user agent: trusted tap, nonzero digital output signal, BET and all stops, AUTO, overlapping cloned voices, live volume, interruption recovery and desktop fallback. No actual iPhone/iPad hardware or Safari engine has been tested; this is not evidence of audible output from a physical iPhone. See `research/release-172/local-browser-results.json` and the reusable QA script.

Platform references: [WebKit user-gesture policy](https://webkit.org/blog/6784/new-video-policies-for-ios/), [Safari 17 Audio Session support](https://webkit.org/blog/14445/webkit-features-in-safari-17-0/), [WebKit audio category discussion](https://bugs.webkit.org/show_bug.cgi?id=237322).

The separate replay/special-zone balancing work remains research only.

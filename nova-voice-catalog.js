// Character voice routing shared by the game and offline audio tools.
// Keep bank/key order stable: existing presentation draws index these lists.
// This file only lists supplied assets; it does not load or modify recordings.
globalThis.NovaVoiceCatalog=(()=>{
  "use strict";
  const BELL_NAVI_VOICE_SRCS={
    "sosuke": [
      "assets/media/nova/navi-left-sosuke.wav",
      "assets/media/nova/navi-center-sosuke.wav",
      "assets/media/nova/navi-right-sosuke.wav"
    ],
    "sora": [
      "assets/media/nova/navi-left-sora.wav",
      "assets/media/nova/navi-center-sora.wav",
      "assets/media/nova/navi-right-sora.wav"
    ],
    "giru": [
      "assets/media/nova/navi-left-giru.wav",
      "assets/media/nova/navi-center-giru.wav",
      "assets/media/nova/navi-right-giru.wav"
    ],
    "toto": [
      "assets/media/nova/navi-left-toto.wav",
      "assets/media/nova/navi-center-toto.wav",
      "assets/media/nova/navi-right-toto.wav"
    ],
    "ouma": [
      "assets/media/nova/navi-left-ouma.wav",
      "assets/media/nova/navi-center-ouma.wav",
      "assets/media/nova/navi-right-ouma.wav"
    ],
    "nito": [
      "assets/media/nova/navi-left-nito.wav",
      "assets/media/nova/navi-center-nito.wav",
      "assets/media/nova/navi-right-nito.wav"
    ],
    "kushuri": [
      "assets/media/nova/navi-left-kushuri.wav",
      "assets/media/nova/navi-center-kushuri.wav",
      "assets/media/nova/navi-right-kushuri.wav"
    ]
  };
  const BELL_NAVI_COMPLETE_VOICE_SRCS={
    "sosuke": "assets/media/nova/navi-complete-sosuke.wav",
    "sora": "assets/media/nova/navi-complete-sora.wav",
    "giru": "assets/media/nova/navi-complete-giru.wav",
    "toto": "assets/media/nova/navi-complete-toto.wav",
    "ouma": "assets/media/nova/navi-complete-ouma.wav",
    "nito": "assets/media/nova/navi-complete-nito.wav",
    "kushuri": "assets/media/nova/navi-complete-kushuri.wav"
  };
  const AIM_VOICE_SRCS={
    "seven": [
      "assets/media/nova/aim_seven_sosuke.wav",
      "assets/media/nova/aim-seven-sora.wav",
      "assets/media/nova/aim-seven-giru.wav",
      "assets/media/nova/aim-seven-toto.wav",
      "assets/media/nova/aim-seven-ouma.wav"
    ],
    "nebula": [
      "assets/media/nova/aim-nebula-giru.wav",
      "assets/media/nova/aim-nebula-toto.wav",
      "assets/media/nova/aim-nebula-ouma.wav",
      "assets/media/nova/aim-nebula-sora.wav"
    ]
  };
  const SEVEN_ZONE_VOICE_SRCS={sosuke:AIM_VOICE_SRCS.seven[0],sora:AIM_VOICE_SRCS.seven[1],giru:AIM_VOICE_SRCS.seven[2],toto:AIM_VOICE_SRCS.seven[3],ouma:AIM_VOICE_SRCS.seven[4]};
  const NEBULA_ZONE_VOICE_SRCS={giru:AIM_VOICE_SRCS.nebula[0],toto:AIM_VOICE_SRCS.nebula[1],ouma:AIM_VOICE_SRCS.nebula[2],sora:AIM_VOICE_SRCS.nebula[3]};
  const ZONE_START_VOICE_SRCS={
    "sora": "assets/media/nova/zone-start-sora.wav",
    "ura_sora": "assets/media/nova/zone-start-ura-sora.wav",
    "giru": "assets/media/nova/zone-start-giru.wav",
    "ura_giru": "assets/media/nova/zone-start-ura-giru.wav",
    "toto": "assets/media/nova/zone-start-toto.wav",
    "ouma": "assets/media/nova/zone-start-ouma.wav",
    "ura_ouma": "assets/media/nova/zone-start-ura-ouma.wav"
  };
  const ZONE_CONTINUE_VOICE_SRCS={
    "sora": "assets/media/nova/continue-sora.wav",
    "toto": "assets/media/nova/continue-toto.wav"
  };
  const MODE_EVENT_VOICE_SRCS={
    "upperChallenge": "assets/media/nova/sosuke-upper-challenge-entry.wav",
    "comeback": "assets/media/nova/sosuke-comeback-entry.wav",
    "upperAt": "assets/media/nova/sosuke-upper-at-entry.wav",
    "bonusStock": "assets/media/nova/sosuke-bonus-stock.wav",
    "zoneGet": "assets/media/nova/sosuke-zone-get.wav",
    "sortie": "assets/media/nova/sosuke-sortie-entry.wav"
  };
  const SORTIE_AWARD_VOICE_SRCS={
    sosuke:'assets/media/nova/sortie-award-sosuke.wav',
    sora:'assets/media/nova/sortie-award-sora.wav',
    giru:'assets/media/nova/sortie-award-giru.wav',
    ouma:'assets/media/nova/sortie-award-ouma.wav',
    toto:'assets/media/nova/sortie-award-toto.wav'
  };
  const OUMA_NOVA_VOICE_SRCS={
    "aim": "assets/media/nova/aim-nova-ouma.wav",
    "wins": [
      "assets/media/nova/nova-win-1-ouma.wav",
      "assets/media/nova/nova-win-2-ouma.wav",
      "assets/media/nova/nova-win-3-ouma.wav"
    ]
  };
  const GIRU_LADDER_VOICE_SRCS={
    "bet": [
      "assets/media/nova/giru-ladder-bet-moment.wav",
      "assets/media/nova/giru-ladder-bet-challenge.wav",
      "assets/media/nova/giru-ladder-bet-good-flow.wav"
    ],
    "result": [
      "assets/media/nova/giru-ladder-result-under500.wav",
      "assets/media/nova/giru-ladder-result-500.wav",
      "assets/media/nova/giru-ladder-result-1000.wav"
    ]
  };
  const SOSUKE_LADDER_VOICE_SRCS=[
    "assets/media/nova/sosuke-ladder-pass-injustice.wav",
    "assets/media/nova/sosuke-ladder-pass-hot.wav",
    "assets/media/nova/sosuke-ladder-bet-love.wav",
    "assets/media/nova/sosuke-ladder-bet-spirit.wav",
    "assets/media/nova/sosuke-ladder-bet-shimatte.wav"
  ];
  const RARE_CUE_VOICE_SRCS={
    "kushuri": {
      "chance": "assets/media/nova/rare-cue-chance-kushuri.wav",
      "bigChance": "assets/media/nova/rare-cue-big-chance-kushuri.wav",
      "hot": "assets/media/nova/rare-cue-hot-kushuri.wav"
    },
    "nito": {
      "chance": "assets/media/nova/rare-cue-chance-nito.wav",
      "bigChance": "assets/media/nova/rare-cue-big-chance-nito.wav",
      "hot": "assets/media/nova/rare-cue-hot-nito.wav"
    }
  };
  // Register new character lines here (or in the banks above). Game copies are
  // loudness-normalized offline; preserve supplied originals separately.
  const CHARACTER_VOICE_SRCS=Object.freeze([
    ...Object.values(BELL_NAVI_VOICE_SRCS).flat(),...Object.values(BELL_NAVI_COMPLETE_VOICE_SRCS),
    ...Object.values(AIM_VOICE_SRCS).flat(),...Object.values(ZONE_START_VOICE_SRCS),
    ...Object.values(ZONE_CONTINUE_VOICE_SRCS),'assets/media/nova/bonus_confirm.wav',
    ...Object.values(MODE_EVENT_VOICE_SRCS),
    'assets/media/nova/cz-entry-voice.wav',
    OUMA_NOVA_VOICE_SRCS.aim,...OUMA_NOVA_VOICE_SRCS.wins,
    ...Object.values(GIRU_LADDER_VOICE_SRCS).flat(),
    ...SOSUKE_LADDER_VOICE_SRCS,
    ...Object.values(RARE_CUE_VOICE_SRCS).flatMap(bank=>Object.values(bank)),
    'assets/media/nova/aim/bonus-nebula-win.wav','assets/media/nova/aim/zone-roulette-confirm.wav?v=20260919-roulette-voice',
    'assets/media/jag/cz_remaining_3.wav?v=count2','assets/media/jag/cz_remaining_2.wav?v=count2','assets/media/jag/cz_last.wav?v=count2',
    ...Object.values(SORTIE_AWARD_VOICE_SRCS)
  ]);
  return Object.freeze({
    BELL_NAVI_VOICE_SRCS,
    BELL_NAVI_COMPLETE_VOICE_SRCS,
    AIM_VOICE_SRCS,
    SEVEN_ZONE_VOICE_SRCS,
    NEBULA_ZONE_VOICE_SRCS,
    ZONE_START_VOICE_SRCS,
    ZONE_CONTINUE_VOICE_SRCS,
    MODE_EVENT_VOICE_SRCS,
    SORTIE_AWARD_VOICE_SRCS,
    OUMA_NOVA_VOICE_SRCS,
    GIRU_LADDER_VOICE_SRCS,
    SOSUKE_LADDER_VOICE_SRCS,
    RARE_CUE_VOICE_SRCS,
    CHARACTER_VOICE_SRCS
  });
})();

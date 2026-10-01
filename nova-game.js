
(function(){
  "use strict";
  const {setTimeout,clearTimeout,setInterval,clearInterval}=NovaClock;

  const bootParams = new URLSearchParams(location.search);
  const bootMachineId = bootParams.get("machine") || "standalone";
  const bootPlaySessionId = String(bootParams.get("playSessionId") || "");
  const MACHINE_STORAGE_KEY = "nova_slot_state_v1_" + bootMachineId;
  const STORAGE_KEY = bootPlaySessionId ? `${MACHINE_STORAGE_KEY}_session_${bootPlaySessionId}` : MACHINE_STORAGE_KEY;
  const STORAGE_RESUME_KEY = STORAGE_KEY + "_resume";
  const PREFERENCES_STORAGE_KEY = "nova_slot_preferences_v1_" + bootMachineId;
  let storageRestoreBlocked = false;
  let playAccess = null;

  function canUsePlayState(){
    return !storageRestoreBlocked && !!playAccess?.owned();
  }

  function showPlayBlocked(reason){
    const panel=$('playAccessStatus');
    if(!panel)return;
    const messages={
      occupied:'別のタブでこの台が開いています。先に開いたタブを閉じてから再読み込みしてください。',
      unsupported:'このブラウザでは台の重複起動を確認できません。最新のブラウザでHTTPSの公開ページを開いてください。',
      restore:'保存データを復旧できませんでした。上書きを防ぐため遊技を停止しています。保存データを削除せず、管理者へ連絡してください。',
      error:'台の起動を確認できませんでした。再読み込みしてください。'
    };
    $('playAccessMessage').textContent=messages[reason] || messages.error;
    panel.hidden=false;
    for(const child of document.body.children)if(child!==panel)child.inert=true;
    $('reloadPlayAccess').onclick=()=>location.reload();
    $('reloadPlayAccess').focus();
  }

  const SOSUKE_ZONE_BGM_SRC = "assets/media/nova/sosuke-bgm.wav";
  const TOTO_ZONE_BGM_SRC = "assets/media/nova/toto-bgm.wav";
  const URAPI_ZONE_BGM_SRC = "assets/media/nova/urapi-bgm.wav";
  const SORA_ZONE_BGM_SRC = "assets/media/nova/sora-bgm.wav";
  const GIRU_ZONE_BGM_SRC = "assets/media/nova/giru-bgm.wav";
  const OUMA_ZONE_BGM_SRC = "assets/media/nova/oumafreez.wav";
  const INITIAL_DUO_ZONE_BGM_SRC = "assets/media/nova/initial-duo-bgm.mp3";
  const NOVA_ART_BGM_SRC = "assets/media/nova/RUSH.wav";
  const NOVA_BIG_BGM_SRC = "assets/media/nova/BIG.wav";

  const CZ_BGM_SRC = "assets/media/nova/audiostock_933855.wav";
  const DEFAULT_NORMAL_BGM_SRC = "assets/media/nova/audiostock_1117081.wav";
  const HIGH_MODE_BGM_SRC = "";

  const AT_BGM_SRC = "";
  const BAR_BGM_SRC = "";
  const BGM_ASSET_VERSION = "?v=20260706_bgm_minus083";
  const BIG_BONUS_BGM_SRCS = Object.freeze([
    "assets/media/jag/big_1.wav" + BGM_ASSET_VERSION,
    "assets/media/jag/big_2.wav" + BGM_ASSET_VERSION
  ]);
  const BIG_50G_BONUS_BGM_SRC = "assets/media/jag/big_50g.wav" + BGM_ASSET_VERSION;
  const REG_BONUS_BGM_SRC = "assets/media/jag/reg_bonus.wav" + BGM_ASSET_VERSION;
  const PREMIUM_BIG_FIRST_BGM_SRC = "assets/media/jag/premium_big_first.mp3" + BGM_ASSET_VERSION;
  const PREMIUM_BIG_SECOND_BGM_SRC = "assets/media/jag/premium_big_second.wav" + BGM_ASSET_VERSION;

  const BIG_SOUND_SRC = "assets/media/jag/big_confirm.mp3";

  const KOATARI_SOUND_SRC = "";
  const PAYOUT_SOUND_SRC = "assets/media/jag/bell.wav";
  const PAYOUT_3PT_BELL_SOUND_SRC = "assets/media/nova/bell_payout.wav";
  const REPLAY_SOUND_SRC = "assets/media/nova/replay.wav";
  const CHERRY_SOUND_SRC = "assets/media/jag/cherry.wav";
  const SPECIAL_SYMBOL_SOUND_SRC = "assets/media/jag/special_symbol.wav";
  const PREMIUM_PIERO_SYMBOL_SOUND_SRC = "assets/media/jag/premium_piero_symbol.wav";
  const SPIN_SOUND_SRC = "assets/media/nova/spin_start.wav";
  const STOP_SOUND_SRC = "assets/media/nova/reel-stop.wav";
  const PEKA_SOUND_SRC = "assets/media/jag/peka_1.wav";
  const PEKA_SOUND_SRCS = Object.freeze([
    PEKA_SOUND_SRC,
    "assets/media/jag/peka_kyuin.wav",
    "assets/media/jag/peka_atari.wav",
    "assets/media/jag/peka_kyuin_triple.wav"
  ]);
  const PEKA_PRIMARY_RATE = 0.5;
  const PEKA_BIG_ATSU_SOUND_SRC = "assets/media/jag/peka_atsu.wav";
  const PEKA_BIG_ATSU_RATE = 0.1;
  const SEVEN_CONFIRM_SOUND_SRC = "assets/media/jag/big_kakutei.wav";
  const REG_CONFIRM_SOUND_SRC = "assets/media/jag/reg_kakutei.wav";
  const BONUS_CONFIRM_SOUND_SRC = "assets/media/jag/big_confirm.mp3";
  const BONUS_END_BGM_SRC = "assets/media/nova/bonus_art_end.wav";
  const PREMIUM_BONUS_END_VOICE_SRC = "assets/media/jag/premium_bonus_end_voice.wav";
  const PREMIUM_BIG_FIRST_THIRD_STOP_VOICE_SRC = "assets/media/jag/premium_bb2_bgm.mp3";
  const PREMIUM_BIG_SECOND_THIRD_STOP_VOICE_SRC = PREMIUM_BONUS_END_VOICE_SRC;

  const PREMIUM_BIG_FIRST_END_VOICE_SRC = "assets/media/jag/premium_first_end_voice.mp3";
  const PREMIUM_BIG_SECOND_END_VOICE_SRC = "assets/media/jag/premium_second_end_voice.mp3";

  const PREMIUM_BIG_CONFIRM_MOVIE_SRC = "assets/media/jag/premium_big_confirm_movie.mp4";
  const BAR_AIM_VOICE_SRC = "assets/media/jag/bar_wo_nerae.mp3";
  const SETTING_BONUS_END_VOICE_SRCS = Object.freeze({
    2:"assets/media/jag/setting_voice_2plus.wav",
    4:"assets/media/jag/setting_voice_4plus.wav",
    5:"assets/media/jag/setting_voice_5plus.wav",
    6:"assets/media/jag/setting_voice_6plus.wav"
  });
  const BATTLE_BGM_SRC = "";
  const SPEED_BGM_SRC = "";

  const SETTING = {
    1:{target:0.900},
    2:{target:0.930},
    3:{target:0.960},
    4:{target:1.010},
    5:{target:1.040},
    6:{target:1.080}
  };

  const A_TYPE_MODE = true;

  const NOVA_RISING_GAMES = 32;


  const A_TYPE_REACH_ME_ANNOUNCE_RATE = 0;

  const A_TYPE_PAYOUTS = Object.freeze({
    BIG:252,
    MID:96,
    SMALL:0,
    GRAPE:8,
    BELL:8,
    BELL15:15,
    REPLAY:0
  });

  const A_TYPE_BONUS_MAIN_RESULT = "BELL";

  const USER_FACE = "__USER_FACE__";
  const ELEPHANT_SYMBOL = "🐘";
  const PIERROT_SYMBOL = "🤡";
  const CHERRY_SYMBOL = "🍒";
  const GRAPE_SYMBOL = "🍇";
  const BELL_SYMBOL = "🔔";
  const BLANK_SYMBOL = "__BLANK__";
  const SUICA_SYMBOL = "🍋";
  const NEBULA_SYMBOL = 'NEBULA';
  const NEBULA_IMAGE_SRC = 'assets/symbols/nebula-original.png';
  const SUICA_IMAGE_SRC = "assets/symbols/gang-v3/suika.png";
  const CHERRY_IMAGE_SRC = "assets/symbols/gang-v3/replay.png";
  const BELL_IMAGE_SRC = "assets/symbols/gang-v3/bell.png";
  const SEVEN_IMAGE_SRC = "assets/symbols/seven-nebula-original.png";
  const MISS_IMAGE_SRC = "assets/symbols/gang-v3/miss.png";
  const GRAPE_IMAGE_SRC = "assets/symbols/gang-v3/bell.png";
  const BAR_IMAGE_SRC = "assets/symbols/gang-v3/bar.png";
  const PIERROT_IMAGE_SRC = "assets/cabinet/edit_parts/piero.png";
  const USER_FACE_SRC = "assets/symbols/gang-v3/miss.png";
  const REPLAY_IMAGE_SRC = "assets/symbols/gang-v3/replay.png";
  const SYMBOL_IMAGE_SRCS = Object.freeze([
    SUICA_IMAGE_SRC,
    NEBULA_IMAGE_SRC,
    CHERRY_IMAGE_SRC,
    BELL_IMAGE_SRC,
    SEVEN_IMAGE_SRC,
    MISS_IMAGE_SRC,
    GRAPE_IMAGE_SRC,
    BAR_IMAGE_SRC,
    PIERROT_IMAGE_SRC,
    USER_FACE_SRC,
    REPLAY_IMAGE_SRC
  ]);
  const symbolImagePreloads = new Map();

  function preloadSymbolImages(){
    SYMBOL_IMAGE_SRCS.forEach(src=>{
      if(!src || symbolImagePreloads.has(src)) return;
      const img = new Image();
      img.loading = "eager";
      img.decoding = "async";
      if("fetchPriority" in img) img.fetchPriority = "high";
      img.src = src;
      const ready = img.decode ? img.decode().catch(()=>null) : Promise.resolve(null);
      symbolImagePreloads.set(src, {img, ready});
    });
  }
  preloadSymbolImages();

  const RESULT = {
    NEBULA:{name:'nebula特殊図柄揃い',label:'NEBULA',reel:[NEBULA_SYMBOL,NEBULA_SYMBOL,NEBULA_SYMBOL],cls:'purple',kind:'miss'},
    WEAK_SUICA:{name:'スイカ',label:'スイカ',reel:[SUICA_SYMBOL,SUICA_SYMBOL,SUICA_SYMBOL],cls:'green',kind:'rare'},
    STRONG_SUICA:{name:'強スイカ',label:'強スイカ',reel:[SUICA_SYMBOL,SUICA_SYMBOL,SUICA_SYMBOL],cls:'green',kind:'rare'},
    CHANCE_A:{name:'チャンス目A',label:'チャンス目A',reel:['7','NOVA_1_1','NOVA_2_1'],cls:'purple',kind:'rare'},
    CHANCE_B:{name:'チャンス目B',label:'チャンス目B',reel:['7','BAR','NOVA_2_1'],cls:'purple',kind:'rare'},
    CZ:{name:"CZ突入",reel:["7","BAR","7"],label:"CZ",cls:"purple",kind:"miss"},
    STRONG_CZ:{name:"強CZ突入",reel:["7","BAR","7"],label:"強CZ",cls:"gold",kind:"miss"},
    WEAK_NOVA:{name:"弱ノヴァ目",reel:["NOVA_0_1","NOVA_1_1","NOVA_2_1"],label:"弱ノヴァ目",cls:"purple",kind:"miss"},
    STRONG_NOVA:{name:"強ノヴァ目",reel:["NOVA_0_1","NOVA_1_1","NOVA_2_1"],label:"強ノヴァ目",cls:"purple",kind:"miss"},
    SUPER_NOVA:{name:"スーパーノヴァ目",reel:["NOVA_0_1","NOVA_1_1","NOVA_2_1"],label:"スーパーノヴァ目",cls:"gold",kind:"miss"},
    MISS:{name:"ハズレ", reel:[ELEPHANT_SYMBOL,PIERROT_SYMBOL,GRAPE_SYMBOL], label:"MISS", cls:"", kind:"miss"},
    SMALL:{name:"特殊役", reel:[PIERROT_SYMBOL,PIERROT_SYMBOL,PIERROT_SYMBOL], label:"SPECIAL", cls:"blue", kind:"payadd"},
    MID:{name:"RB", reel:["7","7","BAR"], label:"RB", cls:"purple", kind:"payadd"},
    MID_CHERRY:{name:"RB（チェリー同時）", reel:["7","7","BAR"], label:"RB", cls:"purple", kind:"payadd"},
    GRAPE:{name:"ブドウ", reel:[GRAPE_SYMBOL,GRAPE_SYMBOL,GRAPE_SYMBOL], label:"ブドウ", cls:"green", kind:"pay"},
    BAR3:{name:"BAR揃い", reel:["BAR","BAR","BAR"], label:"BAR", cls:"purple", kind:"add"},
    BIG:{name:"BB", reel:["7","7","7"], label:"BB", cls:"red", kind:"payadd"},
    DEVIL_ZONE:{name:"DEVIL ZONE", reel:["7","7","BAR"], label:"DZ", cls:"purple", kind:"payadd"},
    SUPER_DEVIL_ZONE:{name:"SUPER DEVIL ZONE", reel:["7","7","7"], label:"SUPER DZ", cls:"red", kind:"payadd"},
    BELL:{name:"8ptベル", reel:[BELL_SYMBOL,BELL_SYMBOL,BELL_SYMBOL], label:"8pt BELL", cls:"gold", kind:"pay"},
    BELL15:{name:"15ptベル", reel:['7',BELL_SYMBOL,BELL_SYMBOL], label:"15pt BELL", cls:"gold", kind:"pay"},
    BELL3:{name:"斜めベル", reel:[BELL_SYMBOL,BELL_SYMBOL,BELL_SYMBOL], label:"", cls:"gold", kind:"pay"},
    REPLAY:{name:"リプレイ", reel:[ELEPHANT_SYMBOL,ELEPHANT_SYMBOL,ELEPHANT_SYMBOL], label:"REPLAY", cls:"blue", kind:"pay"},
    SUICA:{name:"スイカ揃い", reel:["🍋","🍋","🍋"], label:"SUICA", cls:"green", kind:"pay"},
    CHERRY_ANY:{name:"チェリー", reel:[CHERRY_SYMBOL,PIERROT_SYMBOL,GRAPE_SYMBOL], label:"CHERRY", cls:"red", kind:"payadd"},
    CHERRY_DOUBLE:{name:"チェリー2連", reel:[CHERRY_SYMBOL,CHERRY_SYMBOL,ELEPHANT_SYMBOL], label:"CHERRY×2", cls:"red", kind:"add"},
    CHERRY_TRIPLE:{name:"チェリー3つ", reel:[CHERRY_SYMBOL,CHERRY_SYMBOL,CHERRY_SYMBOL], label:"CHERRY×3", cls:"red", kind:"payadd"}
  };

  const SETTING_PROFILE = {
    // 実抽選は下の共通ATテーブルで運用。左のみチェリーは廃止し、AT中はSET上乗せ抽選へ統一。
    1:{weights:[{result:"SMALL",w:4},{result:"MID",w:3},{result:"BIG",w:0.397},{result:"BELL",w:300},{result:"BELL3",w:70},{result:"REPLAY",w:366},{result:"SUICA",w:3},{result:"CHERRY_DOUBLE",w:2},{result:"CHERRY_TRIPLE",w:1}]},
    2:{weights:[{result:"SMALL",w:4},{result:"MID",w:3},{result:"BIG",w:0.397},{result:"BELL",w:300},{result:"BELL3",w:70},{result:"REPLAY",w:366},{result:"SUICA",w:3},{result:"CHERRY_DOUBLE",w:2},{result:"CHERRY_TRIPLE",w:1}]},
    3:{weights:[{result:"SMALL",w:4},{result:"MID",w:3},{result:"BIG",w:0.397},{result:"BELL",w:300},{result:"BELL3",w:70},{result:"REPLAY",w:366},{result:"SUICA",w:3},{result:"CHERRY_DOUBLE",w:2},{result:"CHERRY_TRIPLE",w:1}]},
    4:{weights:[{result:"SMALL",w:4},{result:"MID",w:3},{result:"BIG",w:0.397},{result:"BELL",w:300},{result:"BELL3",w:70},{result:"REPLAY",w:366},{result:"SUICA",w:3},{result:"CHERRY_DOUBLE",w:2},{result:"CHERRY_TRIPLE",w:1}]},
    5:{weights:[{result:"SMALL",w:4},{result:"MID",w:3},{result:"BIG",w:0.397},{result:"BELL",w:300},{result:"BELL3",w:70},{result:"REPLAY",w:366},{result:"SUICA",w:3},{result:"CHERRY_DOUBLE",w:2},{result:"CHERRY_TRIPLE",w:1}]},
    6:{weights:[{result:"SMALL",w:4},{result:"MID",w:3},{result:"BIG",w:0.397},{result:"BELL",w:300},{result:"BELL3",w:70},{result:"REPLAY",w:366},{result:"SUICA",w:3},{result:"CHERRY_DOUBLE",w:2},{result:"CHERRY_TRIPLE",w:1}]}
  };

  Object.assign(SETTING_PROFILE, {
    1:{weights:[{result:"SMALL",w:4},{result:"MID",w:3},{result:"BIG",w:0.397},{result:"BELL",w:300},{result:"BELL3",w:70},{result:"REPLAY",w:366},{result:"SUICA",w:3},{result:"CHERRY_DOUBLE",w:2},{result:"CHERRY_TRIPLE",w:1}]},
    2:{weights:[{result:"SMALL",w:4},{result:"MID",w:3},{result:"BIG",w:0.397},{result:"BELL",w:300},{result:"BELL3",w:70},{result:"REPLAY",w:366},{result:"SUICA",w:3},{result:"CHERRY_DOUBLE",w:2},{result:"CHERRY_TRIPLE",w:1}]},
    3:{weights:[{result:"SMALL",w:4},{result:"MID",w:3},{result:"BIG",w:0.397},{result:"BELL",w:300},{result:"BELL3",w:70},{result:"REPLAY",w:366},{result:"SUICA",w:3},{result:"CHERRY_DOUBLE",w:2},{result:"CHERRY_TRIPLE",w:1}]},
    4:{weights:[{result:"SMALL",w:4},{result:"MID",w:3},{result:"BIG",w:0.397},{result:"BELL",w:300},{result:"BELL3",w:70},{result:"REPLAY",w:366},{result:"SUICA",w:3},{result:"CHERRY_DOUBLE",w:2},{result:"CHERRY_TRIPLE",w:1}]},
    5:{weights:[{result:"SMALL",w:4},{result:"MID",w:3},{result:"BIG",w:0.397},{result:"BELL",w:300},{result:"BELL3",w:70},{result:"REPLAY",w:366},{result:"SUICA",w:3},{result:"CHERRY_DOUBLE",w:2},{result:"CHERRY_TRIPLE",w:1}]},
    6:{weights:[{result:"SMALL",w:4},{result:"MID",w:3},{result:"BIG",w:0.397},{result:"BELL",w:300},{result:"BELL3",w:70},{result:"REPLAY",w:366},{result:"SUICA",w:3},{result:"CHERRY_DOUBLE",w:2},{result:"CHERRY_TRIPLE",w:1}]}
  });

  const symbols = ["7","BAR",ELEPHANT_SYMBOL,BELL_SYMBOL];
  const AUDIO_BALANCE_VERSION = 9;
  const ROLE_STAT_COUNTER_VERSION = 2;
  const DEFAULT_MASTER_VOLUME = 0.70;
  const DEFAULT_BGM_VOLUME = 0.50;
  const DEFAULT_SFX_VOLUME = 0.50;
  const DEFAULT_VOICE_VOLUME = 0.50;
  const DEFAULT_PAYOUT_VOLUME = 0.50;
  const DEFAULT_MOVIE_VOLUME = 0.50;
  const DEFAULT_ROGI_MOVIE_VOLUME = 0.50;
  const MATCHED_BGM_GAIN_DB = 0;
  const NORMALIZED_AUDIO_OUTPUT_SCALE = 1;
  const BGM_OUTPUT_SCALE = dbToGain(MATCHED_BGM_GAIN_DB);
  const BAR_BGM_OUTPUT_SCALE = dbToGain(MATCHED_BGM_GAIN_DB);
  const SFX_OUTPUT_SCALE = NORMALIZED_AUDIO_OUTPUT_SCALE;
  const SETTING_VOICE_OUTPUT_SCALE = 1;
  const PREMIUM_VOICE_OUTPUT_SCALE = 1.15;
  const CONFIRM_SOUND_OUTPUT_SCALE = NORMALIZED_AUDIO_OUTPUT_SCALE;
  const LINEUP_CONFIRM_SOUND_OUTPUT_SCALE = 2.0;

  const PAYOUT_UI_50_TO_33_SCALE = 33 / 50;
  const PAYOUT_SOUND_OUTPUT_SCALE = PAYOUT_UI_50_TO_33_SCALE;
  const BELL_PAYOUT_SOUND_OUTPUT_SCALE = PAYOUT_UI_50_TO_33_SCALE;
  const BATTLE_BGM_OUTPUT_SCALE = dbToGain(MATCHED_BGM_GAIN_DB);
  const MOVIE_OUTPUT_SCALE = NORMALIZED_AUDIO_OUTPUT_SCALE;
  const ROGI_MOVIE_OUTPUT_SCALE = NORMALIZED_AUDIO_OUTPUT_SCALE;

  function dbToGain(db){
    return Math.pow(10, Number(db) / 20);
  }

  const AUDIO_SOURCE_OUTPUT_SCALE = Object.freeze({
    ['assets/media/nova/shutter.wav']: dbToGain(-11),
    ['assets/media/nova/shutter-close.wav']: dbToGain(-3),
    ['assets/media/nova/ouma-reverse-v2.wav']: dbToGain(5),

    [BIG_BONUS_BGM_SRCS[0]]: dbToGain(0),
    [BIG_BONUS_BGM_SRCS[1]]: dbToGain(-2),
    [BIG_50G_BONUS_BGM_SRC]: dbToGain(-3.5),
    [REG_BONUS_BGM_SRC]: dbToGain(-2),
    [PREMIUM_BIG_FIRST_BGM_SRC]: dbToGain(-3.5),
    [PREMIUM_BIG_SECOND_BGM_SRC]: dbToGain(-7),
    [BONUS_END_BGM_SRC]: dbToGain(0),
    [PAYOUT_SOUND_SRC]: dbToGain(-0.5),
    [REPLAY_SOUND_SRC]: dbToGain(0),
    [CHERRY_SOUND_SRC]: dbToGain(1),
    [SPECIAL_SYMBOL_SOUND_SRC]: dbToGain(-1.5),
    [PREMIUM_PIERO_SYMBOL_SOUND_SRC]: dbToGain(-2),
    [SPIN_SOUND_SRC]: dbToGain(-1),
    [STOP_SOUND_SRC]: dbToGain(-1),
    [PEKA_SOUND_SRC]: dbToGain(-1),
    ["assets/media/jag/peka_kyuin.wav"]: dbToGain(1),
    ["assets/media/jag/peka_atari.wav"]: dbToGain(3),
    ["assets/media/jag/peka_kyuin_triple.wav"]: dbToGain(2),
    [PEKA_BIG_ATSU_SOUND_SRC]: dbToGain(3),
    [SEVEN_CONFIRM_SOUND_SRC]: dbToGain(-1),
    [REG_CONFIRM_SOUND_SRC]: dbToGain(0),
    [BONUS_CONFIRM_SOUND_SRC]: dbToGain(-8),
    [BAR_AIM_VOICE_SRC]: dbToGain(4),
    [SETTING_BONUS_END_VOICE_SRCS[2]]: dbToGain(3),
    [SETTING_BONUS_END_VOICE_SRCS[4]]: dbToGain(3),
    [SETTING_BONUS_END_VOICE_SRCS[5]]: dbToGain(3),
    [SETTING_BONUS_END_VOICE_SRCS[6]]: dbToGain(3),
    [PREMIUM_BIG_FIRST_THIRD_STOP_VOICE_SRC]: dbToGain(4),
    [PREMIUM_BIG_SECOND_THIRD_STOP_VOICE_SRC]: dbToGain(4),
    [PREMIUM_BIG_FIRST_END_VOICE_SRC]: dbToGain(3),
    [PREMIUM_BIG_SECOND_END_VOICE_SRC]: dbToGain(5),
    [PREMIUM_BIG_CONFIRM_MOVIE_SRC]: dbToGain(4)
  });

  function normalizedAudioSourceKey(src=""){
    return String(src || "").split("?")[0];
  }

  function audioSourceOutputScale(src=""){
    const key = String(src || "");
    return AUDIO_SOURCE_OUTPUT_SCALE[key] || AUDIO_SOURCE_OUTPUT_SCALE[normalizedAudioSourceKey(key)] || 1;
  }

  function applyAudioSourceOutputScale(volume=0, src=""){
    const raw = Number(volume);
    if(!Number.isFinite(raw) || raw <= 0) return 0;
    return Math.max(0, Math.min(1, raw * audioSourceOutputScale(src)));
  }

  function audioOutputVolume(value, scale=1){
    if(typeof settings !== "undefined" && settings.audioMuted) return 0;
    const raw = Number(value);
    if(!Number.isFinite(raw) || raw <= 0) return 0;
    const masterRaw = typeof settings !== "undefined" ? Number(settings.masterVolume) : DEFAULT_MASTER_VOLUME;
    const master = Number.isFinite(masterRaw) ? clamp(masterRaw, 0, 1) : DEFAULT_MASTER_VOLUME;
    return Math.max(0, Math.min(1, raw * scale * master));
  }

  let settings = {
    title:"NOVA",
    setting:1,
    fee:100,
    stSpins:10,
    oddsMultiplier:1,
    smallMul:0.15,
    midMul:0.15,
    crownMul:0.0,
    cherryMul:0.05,
    bellMul:0.15,
    suikaMul:0.03,
    bigMul:0.15,
    bigAdd:5,
    bellAdd:0,

    autoDelay:0.5,
    masterVolume:DEFAULT_MASTER_VOLUME,
    bgmVolume:DEFAULT_BGM_VOLUME,
    sfxVolume:DEFAULT_SFX_VOLUME,
    voiceVolume:DEFAULT_VOICE_VOLUME,
    payoutVolume:DEFAULT_PAYOUT_VOLUME,
    movieVolume:DEFAULT_MOVIE_VOLUME,
    rogiMovieVolume:DEFAULT_ROGI_MOVIE_VOLUME,
    audioMuted:false,
    audioBalanceVersion:AUDIO_BALANCE_VERSION,
    completeLimitPt:10000
  };

  let stats = {
    totalSessions:0,
    totalFee:0,
    totalPaid:0,
    totalSpins:0,
    normalSpins:0,
    highSpins:0,
    roleStatVersion:ROLE_STAT_COUNTER_VERSION,
    bigCount:0,
    midCount:0,upperBigCount:0,
    premiumBigCount:0,
    grapeCount:0,
    smallCount:0,
    bellCount:0,
    diagonalBellCount:0,
    replayCount:0,
    suikaCount:0,
    cherryCount:0,
    slumpHigh:0,
    slumpLow:0,
    slumpHistory:[{spin:0, profit:0}]
  };

  let normalState = {
    mode:"normal",
    highRemain:0,
    risingRemain:0,
    risingBonusOrigin:false,
    sinceBonus:0,
    bonusPending:false,
    bonusKind:"",
    bonusSource:"",
    premiumBonus:false,
    oneGameRenBonus:false,
    bonusWaitGames:0,
    bonusHitGamesSince:0,
    reachMePending:false,
    reachMeBonusKind:"",
    reachMeBonusSource:"",
    reachMeHitGamesSince:0,
    pendingSettingVoiceSrc:"",
    pendingPremiumVoiceSrc:"",
    morningCeilingActive:false
  };

  let session = {
    active:false,
    remain:0,
    fee:0,
    cost:0,
    paid:0,
    hits:0,
    added:0,
    addedGames:0,
    setNo:0,
    stockSets:0,
    barBgmSets:0,
    nextSetBarBgm:false,
    currentSetBarBgm:false,
    continuationRate:0,
    bigZone:0,
    bigZoneType:"",
    phase:"idle",
    bonusKind:"",
    bonusTarget:0,
    bonusStartGames:0,
    risingResumeRemain:0,
    risingBonusOrigin:false,
    premiumBonus:false,
    oneGameRenBonus:false,
    premiumChainEligible:false,
    bonusBgmSrc:"",
    battleRemain:0,
    battleWin:false,
    battleSource:"",
    resultPayout:null,
    endSignal:null
  };

  let isSpinning = false;
  let jagChainCount = null;
  let jagChainBonusHandoff = false;
  let jagLastGamePayout = 0;
  let jagLastBonusPayout = 0;
  let jagChanceHold = false;
  let pendingATypeInternalBonus = null;
  let currentSpin = null;
  let spinCanStop = false;
  let spinWaitTimer = null;
  let bonusEndBgmPlaying = false;
  let bonusEndBgmAudio = null;
  let bonusEndVoiceAudio = null;
  let bonusEndBgmTimer = null;
  let bonusConfirmSoundPlaying = false;
  let bonusConfirmSoundAudio = null;
  let bonusConfirmSoundTimer = null;
  const MIN_SPIN_WAIT_MS = 500;
  const RESULT_WAIT_MS = 1000;
  const KEYBOARD_STOP_TURBO_MULTIPLIER = 3;
  const REEL_FULL_ROTATION_MS = NovaReelMotion.rotationMs;
  const SPIN_COST = 3;
  const BONUS_ANNOUNCE_THIRD_STOP_RATE = 0.70;
  const BONUS_ANNOUNCE_EARLY_TIMINGS = Object.freeze(["lever", "stop1", "stop2"]);
  const PAYOUT_BASE = 100;
  const ROLE_PAYOUTS = Object.freeze({
    SMALL:14,
    MID:15,
    BAR3:0,
    BIG:15,
    DEVIL_ZONE:15,
    SUPER_DEVIL_ZONE:15,
    BELL:10,
    BELL3:3,
    REPLAY:3,
    SUICA:3,
    CHERRY_ANY:5,
    CHERRY_DOUBLE:5,
    CHERRY_TRIPLE:5
  });
  const NORMAL_ROLE_PAYOUTS = Object.freeze({
    BIG:0,
    MID:50,
    BAR3:0,
    BELL:10,
    REPLAY:3,
    SUICA:3,
    CHERRY_ANY:3,
    CHERRY_DOUBLE:3,
    CHERRY_TRIPLE:3
  });
  const NORMAL_BELL_PAYOUT = NORMAL_ROLE_PAYOUTS.BELL;

  const HIGH_MODE_GAMES = 10;

  const BAR3_PREMIUM_DENOM = 8192;
  const BAR3_CONTINUATION_RATE = 0.80;
  const BELL_REEL_READY_VIDEO_SRC = "";
  const BELL_REEL_STOP_VIDEO_SRC = "";
  const DEVIL_ZONE_FIRE_VIDEO_SRC = "";
  const DEVIL_ZONE_CONFIRM_IMAGE_SRC = "";
  const SUPER_DEVIL_ZONE_CONFIRM_IMAGE_SRC = "";
  const REVERSE_PUSH_GUIDE_IMAGE_SRCS = Object.freeze({
    blue:"",
    red:""
  });
  const DEVIL_RUSH_ENTRY_IMAGE_SRCS = Object.freeze({
    start:"",
    continue:""
  });
  const REVERSE_PUSH_RED_EXPECTATION = 0.80;
  const REVERSE_PUSH_BLUE_EXPECTATION = 0.30;
  const REVERSE_PUSH_HIT_RED_RATE = 0.70;
  const GEKIATSU_VIDEO_SRC = "";
  const BAR3_LEVER_VIDEO_SRC = PREMIUM_BIG_CONFIRM_MOVIE_SRC;
  const ROGI_STOP_VIDEO_SRCS = Object.freeze({
    1:"",
    2:"",
    3:""
  });

  const GEKIATSU_CHANCE_ON_BIG = 0.03;
  const CONTROL_SIGNATURES = Object.freeze({
    PBB:Object.freeze([
      0xd50c118f, 0x0bffce9e, 0x9cb26d3b,
      0xcae1c63a, 0x7e6adfa7, 0x833dd813,
      0xcf5b5b6f, 0xb3d0b0c5, 0xfe868517
    ]),
    BIG:Object.freeze([
      0xc70bfb85, 0xf7dd1ce0, 0xf8144d45,
      0xe7f5ce20, 0x2ef35505, 0x0c0f0619,
      0x3aa6d52d, 0x59a156df, 0x0ffbe6d5
    ]),
    REG:Object.freeze([
      0xd70c14b5, 0x18045eb0, 0x65e0e7b5,
      0xf10c87b0, 0x0db972b5, 0x2def5d69,
      0x9ecfe35d, 0x7643112f, 0x3293ce05
    ])
  });
  const CONTROL_RESULTS = Object.freeze({
    PBB:Object.freeze({result:"BAR3", premium:true}),
    BIG:Object.freeze({result:"BIG", premium:false}),
    REG:Object.freeze({result:"MID", premium:false})
  });
  const CONTROL_SIGNATURE_SEED = 0x811c9dc5;
  const CONTROL_INPUT_TIMEOUT_MS = 5000;
  const BATTLE_INTRO_LOGO_SRC = "";
  const BATTLE_ROUND_IMAGE_SRCS = Array.from({length:10}, ()=>"");
  const BATTLE_CHARACTER_SRCS = [];

  const GORAI_HIT_RATE = {
    1:0.945,
    2:0.945,
    3:0.945,
    4:0.945,
    5:0.945,
    6:0.945
  };

  const BIG_STOCK_ZONE_GAMES = 5;
  const SUPER_DEVIL_ZONE_GAMES = 5;
  const ZONE_CHALLENGE_PAYOUT = 3;
  const DEVIL_ZONE_SEVEN_CHANCE = 1 / 12;
  const SUPER_DEVIL_ZONE_SEVEN_CHANCE = 0.50;

  const AT_SET_STOCK_RATES_BY_SETTING = Object.freeze({
    SMALL:{1:0.35,2:0.38,3:0.41,4:0.44,5:0.47,6:0.50},
    CHERRY_DOUBLE:{1:0.03,2:0.04,3:0.055,4:0.07,5:0.085,6:0.10},
    CHERRY_TRIPLE:{1:0.35,2:0.40,3:0.45,4:0.50,5:0.55,6:0.60},
    SUICA:{1:0.005,2:0.008,3:0.011,4:0.014,5:0.017,6:0.02}
  });
  const CONTINUATION_BATTLE_GAMES = 4;
  const DEBUG_FAST_SPINS_PER_SECOND = 1000;
  const DEBUG_FAST_INTERVAL_MS = 100;
  const DEBUG_FAST_BATCH_SIZE = Math.max(1, Math.round(DEBUG_FAST_SPINS_PER_SECOND * DEBUG_FAST_INTERVAL_MS / 1000));
  const DEBUG_ONE_CLICK_SIM_SPINS = 10000;
  const AUTO_SPEED_MULTIPLIER = 2;
  const SPEED_MODE_MAX_SPINS_PER_SECOND = 10;
  const SPEED_MODE_MULTIPLIER = 3;
  const COMPLETE_TRIAL_ENABLED = true;
  const DEFAULT_COMPLETE_LIMIT_PT = 10000;
  const SLUMP_MAX_HISTORY_POINTS = 20000;
  const SLUMP_MAX_DRAW_POINTS = 1400;
  let autoPlay = false;
  let autoTimer = null;
  let autoWatchdogTimer = null;
  let speedToBonusActive = false;
  let speedToBonusTimer = null;
  let speedToBonusCount = 0;
  let completeTrialState = {
    locked:false,
    lockedSetting:0,
    rescueActive:false,
    completeProfit:0
  };
  let speedModeMenuOpen = false;
  let speedModeSpinRequest = false;
  let speedFrameOffHold = false;
  let debugFastSpinActive = false;
  let novaAuditRecorder = null;
  let novaAuditView = null;

  function auditSnapshot(){
    if(!stats.auditRunId)stats.auditRunId=crypto.randomUUID();
    return {run:stats.auditRunId,game:Number(stats.totalSpins)||0,bet:Number(stats.totalFee)||0,paid:Number(stats.totalPaid)||0,setting:settings.setting,
      flow:normalState.flow||{phase:'normal'},internal:normalState.internal||{},replayFree:!!normalState.replayFree,complete:!!completeTrialState.locked,
      bonus:{active:isATypeBonusActive(),phase:session.phase,tier:session.bonusTier,paid:session.paid,sets:session.bonusArtSets,zones:session.bonusZones,target:session.bonusTarget,pending:!!normalState.bonusPending,source:normalState.bonusSource,prepLeft:normalState.prepLeft,prepSets:normalState.prepSets,prepZones:normalState.prepZones,premium:session.premiumBonus||normalState.premiumBonus,pointsRemaining:session.bonusPointsRemaining},
      progress:normalState.novaProgress,decrement:NovaDecrement.snapshot(),
      config:{balance:170,roleMerge:"20260930",czInitialRevision:"20261001",initialBoost:NovaArt.initialBoostRules,czEntryFactors:NovaNormal.czEntryFactors,decrementRules:NovaDecrement.rules(settings.setting),normalBellDenominators:NovaTuning.normalBellDenominators,tuning:NovaTuning.profile(settings.setting),initialPresentation:157,prelude:160,audit:121,setting:settings.setting,fee:SPIN_COST,completeLimitPt:settings.completeLimitPt,oddsMultiplier:settings.oddsMultiplier,art:settings.novaArt,commonAt:NovaArt.commonAtRulesFor(settings.setting),entryQuota:NovaArt.entryQuotaRules,initialRareAwards:NovaArt.initialRareAwards,atPrelude:NovaArt.atPreludeRules,uraChallenge:NovaArt.burstRules,normal:settings.novaNormal,normalLottery:NovaNormal.lotteryRules,normalPrelude:NovaNormal.czPreludeRules,cz:settings.novaFlow}};
  }
  function auditCapture(detail={kind:'checkpoint'}){
    if(!novaAuditRecorder)return;
    try{novaAuditRecorder.record(auditSnapshot(),detail);}catch(e){const el=$('novaAuditStatus');if(el)el.textContent='履歴記録エラー：'+e.message;}
  }
  function auditSpinDetail(result,resolved){
    return {kind:'spin',result,message:resolved.artMessage||'',mode:debugFastSpinActive?'fast':autoPlay?'auto':speedToBonusActive?'speed':'manual',forced:pendingForceResult||'',
      researchSortie:resolved.researchSortie,researchChallenge:resolved.researchChallenge,
      aim:resolved.aim,burstEvent:resolved.burstEvent,burstReward:resolved.burstReward,comebackEvent:resolved.comebackEvent,atOutcome:resolved.atOutcome,zoneAward:resolved.zoneAward,
      artSetWon:resolved.artSetWon,novaRushConfirmed:resolved.novaRushConfirmed,oumaFreeze:resolved.oumaFreeze,czLamp:resolved.czLamp,bonusHit:resolved.bonusHit,bonusSource:resolved.bonusSource,
      normalBellNavi:resolved.normalBellNavi,bellNaviOrder:currentSpin?.bellNaviOrder,rareNavi:currentSpin?.rareNavi,rareCueVoice:currentSpin?.rareCueVoice,rareNaviSoundPlayed:currentSpin?.rareNaviSoundPlayed,
      pressOrder:debugFastSpinActive?'simulation':currentSpin?.auditPressOrder,stopOrder:debugFastSpinActive?'simulation':currentSpin?.auditStopOrder,grid:debugFastSpinActive?undefined:currentSpin?.auditGrid,visualResult:!debugFastSpinActive&&NovaAim.hasGuide(resolved.aim)&&currentSpin?.aimAligned===false?'MISS':result,
      flowBefore:resolved.flowBefore,flowAfter:resolved.flowAfter,manualLineupMiss:resolved.manualLineupMiss,bonusWaitSpin:resolved.bonusWaitSpin,czEntry:resolved.czEntry,czPrelude:resolved.czPrelude,atPrelude:resolved.atPrelude,czChance:resolved.czChance,czCompleted:resolved.czCompleted};
  }
  function setupPlayAudit(){
    novaAuditRecorder=new NovaAudit.Recorder({scope:STORAGE_KEY});
    auditCapture({kind:'checkpoint'});
    novaAuditView=NovaAuditUI.mount(novaAuditRecorder,{currentRun:()=>stats.auditRunId,roleName:id=>RESULT[id]?.name||id,graph:slumpGraph,host:document.querySelector('.slumpStats').parentNode,gameAtX:x=>{
      const rect=slumpGraph.getBoundingClientRect(),points=getSlumpWindow(stats.slumpHistory).points,first=Number(points[0]?.spin)||0,last=Number(points.at(-1)?.spin)||first;
      return Math.round(first+Math.max(0,Math.min(1,(x-rect.left-44)/Math.max(1,rect.width-58)))*(last-first));
    }});
    const flushAudit=()=>{auditCapture();novaAuditRecorder.journal();void novaAuditRecorder.flush();};
    window.addEventListener('pagehide',flushAudit);document.addEventListener('visibilitychange',()=>{if(document.hidden)flushAudit();});
  }
  let debugFastTimer = null;
  let debugFastSpinCount = 0;
  let debugOneClickSimActive = false;
  let slumpView = {
    xZoom:1,
    yZoom:1,
    seekStart:0,
    followEnd:true
  };
  let slumpRenderRequest = 0;
  let forceResult = "";
  let forcePremiumEffect = false;
  let pendingForceResult = "";
  let pendingArtStep = null;
  let controlInputIndex = 0;
  let controlInputHash = CONTROL_SIGNATURE_SEED;
  let controlInputCommand = "";
  let controlInputReady = "";
  let controlInputLastAt = 0;
  let sessionStartGuard = false;
  let pendingAtStartTimer = null;
  let pendingBonusStartOptions = null;
  let devilZoneConfirmIntroPending = false;
  let pendingDevilRushEntryEffect = "";
  let audioCtx = null;
  const Audio = globalThis.NovaAudio?.Audio || window.Audio;
  for(const audio of document.querySelectorAll('audio'))globalThis.NovaAudio?.adopt(audio);
  let spinIntervals = [];
  let reelSpinOffsets = [0, 0, 0];
  let rogiBlackoutTimer = null;
  let clickCount = 0;
  let clickTimer = null;

  const $ = id => document.getElementById(id);
  const AUDIO_VOLUME_FIELDS = Object.freeze([
    {rangeId:"masterVolume", numberId:"masterVolumeNumber"},
    {rangeId:"bgmVolume", numberId:"bgmVolumeNumber"},
    {rangeId:"sfxVolume", numberId:"sfxVolumeNumber"},
    {rangeId:"voiceVolume", numberId:"voiceVolumeNumber"},
    {rangeId:"payoutVolume", numberId:"payoutVolumeNumber"}
  ]);
  const machine = $("machine");
  const reels = [...document.querySelectorAll(".reel")];
  const stopBtns = [0,1,2].map(i => $("stop"+i));
  const bgm = $("bgm");
  const koatariSound = $("koatariSound");
  const bigSound = $("bigSound");
  const payoutSound = $("payoutSound");
  const barBgm = $("barBgm");
  const battleBgm = $("battleBgm");
  const voiceSound = $("voiceSound");
  const gekiatsuLayer = $("gekiatsuLayer");
  const gekiatsuVideo = $("gekiatsuVideo");
  const bonusConfirmLayer = $("bonusConfirmLayer");
  const devilZoneConfirmLayer = $("devilZoneConfirmLayer");
  const reversePushGuideLayer = $("reversePushGuideLayer");
  const devilRushEntryLayer = $("devilRushEntryLayer");
  const devilRushEntryImage = $("devilRushEntryImage");
  const rogiBlackoutLayer = $("rogiBlackoutLayer");
  const battleIntroLayer = $("battleIntroLayer");
  const battleIntroLogo = $("battleIntroLogo");
  const battleIntroCharacter = $("battleIntroCharacter");
  const battleIntroRound = $("battleIntroRound");
  const sessionResultLayer = $("sessionResultLayer");
  const resultSetCountView = $("resultSetCountView");
  const resultPayoutView = $("resultPayoutView");
  const sessionResultSignal = $("sessionResultSignal");
  const sessionResultSignalImage = $("sessionResultSignalImage");
  const slumpGraph = $("slumpGraph");
  const slumpSeekRange = $("slumpSeekRange");
  const slumpZoomInput = $("slumpZoomInput");
  const slumpYZoomInput = $("slumpYZoomInput");
  const slumpRangeView = $("slumpRangeView");
  const slumpZoomView = $("slumpZoomView");
  const slumpYZoomView = $("slumpYZoomView");
  const slumpCurrentView = $("slumpCurrentView");
  const slumpHighView = $("slumpHighView");
  const slumpLowView = $("slumpLowView");
  const audioDock = $("audioDock");
  const slumpToggleBtn = $("slumpToggleBtn");
  const oddsToggleBtn = $("oddsToggleBtn");
  const roleCounterToggleBtn = $("roleCounterToggleBtn");
  const reelSlumpToggleBtn = $("reelSlumpToggleBtn");
  const reelOddsToggleBtn = $("reelOddsToggleBtn");
  const reelDataToggleBtn = $("reelDataToggleBtn");
  const reelDataCounterPanel = $("reelDataCounter");
  const audioToggleBtn = $("audioToggleBtn");
  const audioCloseBtn = $("audioCloseBtn");
  const slumpCloseBtn = $("slumpCloseBtn");
  const oddsCloseBtn = $("oddsCloseBtn");
  const roleCounterCloseBtn = $("roleCounterCloseBtn");
  const pageZoomOutBtn = $("pageZoomOutBtn");
  const pageZoomResetBtn = $("pageZoomResetBtn");
  const pageZoomInBtn = $("pageZoomInBtn");
  const pageZoomView = $("pageZoomView");
  const pagePanRange = $("pagePanRange");
  const pagePanResetBtn = $("pagePanResetBtn");
  const pagePanView = $("pagePanView");
  const layoutEditToggleBtn = $("layoutEditToggleBtn");
  const layoutEditorPanel = $("layoutEditorPanel");
  const layoutEditSaveDefaultBtn = $("layoutEditSaveDefaultBtn");
  const layoutEditResetBtn = $("layoutEditResetBtn");
  const layoutEditCloseBtn = $("layoutEditCloseBtn");
  const layoutEditInputs = [...document.querySelectorAll(".layoutEditInput")];
  const effectSkipBtn = $("effectSkipBtn");

  if(audioDock && audioDock.parentElement !== document.body){
    document.body.appendChild(audioDock);
  }

  const reelArea = document.querySelector(".reelArea");
  if(sessionResultLayer && reelArea && sessionResultLayer.parentElement !== reelArea){
    reelArea.appendChild(sessionResultLayer);
  }
  let reelLightTimer = null;
  let barRainbowHold = false;
  let guaranteedSetStartLight = false;
  let guaranteedSetLightTimer = null;
  let barBgmActive = false;
  let bonusConfirmBgmHold = false;
  let barBgmMode = "";
  let battleBgmActive = false;
  let rogiBgmMuted = false;
  let rogiThirdStopHold = false;
  let bellReadyVideoKeepAliveTimer = null;
  let bellZakoLayer = null;
  const bellZakoTimers = [null, null, null];
  const aimWinAudios=new Set();
  const oneShotSoundCache = new Map();
  const BELL_NAVI_VOICE_SRCS={sosuke:['assets/media/nova/navi-left-sosuke.wav','assets/media/nova/navi-center-sosuke.wav','assets/media/nova/navi-right-sosuke.wav'],sora:['assets/media/nova/navi-left-sora.wav','assets/media/nova/navi-center-sora.wav','assets/media/nova/navi-right-sora.wav'],giru:['assets/media/nova/navi-left-giru.wav','assets/media/nova/navi-center-giru.wav','assets/media/nova/navi-right-giru.wav'],toto:['assets/media/nova/navi-left-toto.wav','assets/media/nova/navi-center-toto.wav','assets/media/nova/navi-right-toto.wav'],ouma:['assets/media/nova/navi-left-ouma.wav','assets/media/nova/navi-center-ouma.wav','assets/media/nova/navi-right-ouma.wav'],nito:['assets/media/nova/navi-left-nito.wav','assets/media/nova/navi-center-nito.wav','assets/media/nova/navi-right-nito.wav'],kushuri:['assets/media/nova/navi-left-kushuri.wav','assets/media/nova/navi-center-kushuri.wav','assets/media/nova/navi-right-kushuri.wav']};
  const BELL_NAVI_COMPLETE_VOICE_SRCS={sosuke:'assets/media/nova/navi-complete-sosuke.wav',sora:'assets/media/nova/navi-complete-sora.wav',giru:'assets/media/nova/navi-complete-giru.wav',toto:'assets/media/nova/navi-complete-toto.wav',ouma:'assets/media/nova/navi-complete-ouma.wav',nito:'assets/media/nova/navi-complete-nito.wav',kushuri:'assets/media/nova/navi-complete-kushuri.wav'};
  const AIM_VOICE_SRCS={seven:['assets/media/nova/aim_seven_sosuke.wav','assets/media/nova/aim-seven-sora.wav','assets/media/nova/aim-seven-giru.wav','assets/media/nova/aim-seven-toto.wav','assets/media/nova/aim-seven-ouma.wav'],nebula:['assets/media/nova/aim-nebula-giru.wav','assets/media/nova/aim-nebula-toto.wav','assets/media/nova/aim-nebula-ouma.wav','assets/media/nova/aim-nebula-sora.wav']};
  const SEVEN_ZONE_VOICE_SRCS={sosuke:AIM_VOICE_SRCS.seven[0],sora:AIM_VOICE_SRCS.seven[1],giru:AIM_VOICE_SRCS.seven[2],toto:AIM_VOICE_SRCS.seven[3],ouma:AIM_VOICE_SRCS.seven[4]};
  const NEBULA_ZONE_VOICE_SRCS={giru:AIM_VOICE_SRCS.nebula[0],toto:AIM_VOICE_SRCS.nebula[1],ouma:AIM_VOICE_SRCS.nebula[2],sora:AIM_VOICE_SRCS.nebula[3]};
  const ZONE_START_VOICE_SRCS={sora:'assets/media/nova/zone-start-sora.wav',ura_sora:'assets/media/nova/zone-start-ura-sora.wav',giru:'assets/media/nova/zone-start-giru.wav',ura_giru:'assets/media/nova/zone-start-ura-giru.wav',toto:'assets/media/nova/zone-start-toto.wav',ouma:'assets/media/nova/zone-start-ouma.wav',ura_ouma:'assets/media/nova/zone-start-ura-ouma.wav'};
  const ZONE_CONTINUE_VOICE_SRCS={sora:'assets/media/nova/continue-sora.wav',toto:'assets/media/nova/continue-toto.wav'};
  const OUMA_NOVA_VOICE_SRCS={aim:'assets/media/nova/aim-nova-ouma.wav',wins:['assets/media/nova/nova-win-1-ouma.wav','assets/media/nova/nova-win-2-ouma.wav','assets/media/nova/nova-win-3-ouma.wav']};
  const GIRU_LADDER_VOICE_SRCS={bet:['assets/media/nova/giru-ladder-bet-moment.wav','assets/media/nova/giru-ladder-bet-challenge.wav','assets/media/nova/giru-ladder-bet-good-flow.wav'],result:['assets/media/nova/giru-ladder-result-under500.wav','assets/media/nova/giru-ladder-result-500.wav','assets/media/nova/giru-ladder-result-1000.wav']};
  const RARE_CUE_VOICE_SRCS={
    kushuri:{chance:'assets/media/nova/rare-cue-chance-kushuri.wav',bigChance:'assets/media/nova/rare-cue-big-chance-kushuri.wav',hot:'assets/media/nova/rare-cue-hot-kushuri.wav'},
    nito:{chance:'assets/media/nova/rare-cue-chance-nito.wav',bigChance:'assets/media/nova/rare-cue-big-chance-nito.wav',hot:'assets/media/nova/rare-cue-hot-nito.wav'}
  };
  // Register new character lines here (or in the banks above). Game copies are
  // loudness-normalized offline; preserve supplied originals separately.
  const CHARACTER_VOICE_SRCS=Object.freeze([
    ...Object.values(BELL_NAVI_VOICE_SRCS).flat(),...Object.values(BELL_NAVI_COMPLETE_VOICE_SRCS),
    ...Object.values(AIM_VOICE_SRCS).flat(),...Object.values(ZONE_START_VOICE_SRCS),
    ...Object.values(ZONE_CONTINUE_VOICE_SRCS),'assets/media/nova/bonus_confirm.wav',
    OUMA_NOVA_VOICE_SRCS.aim,...OUMA_NOVA_VOICE_SRCS.wins,
    ...Object.values(GIRU_LADDER_VOICE_SRCS).flat(),
    ...Object.values(RARE_CUE_VOICE_SRCS).flatMap(bank=>Object.values(bank)),
    'assets/media/nova/aim/bonus-nebula-win.wav','assets/media/nova/aim/zone-roulette-confirm.wav?v=20260919-roulette-voice',
    'assets/media/jag/cz_remaining_3.wav?v=count2','assets/media/jag/cz_remaining_2.wav?v=count2','assets/media/jag/cz_last.wav?v=count2'
  ]);
  const CHARACTER_VOICE_KEYS=new Set(CHARACTER_VOICE_SRCS.map(normalizedAudioSourceKey));
  const CHARACTER_VOICE_BOOST_DB=10;
  const characterVoiceConnections=new WeakMap();
  let characterVoiceBus=null;
  for(const src of CHARACTER_VOICE_SRCS){const audio=new Audio(src);audio.preload='auto';oneShotSoundCache.set(src,audio);audio.load();}
  const rareNaviPreload=new Audio('assets/media/nova/rare-navi.mp3');rareNaviPreload.preload='auto';rareNaviPreload.loop=false;oneShotSoundCache.set('assets/media/nova/rare-navi.mp3',rareNaviPreload);rareNaviPreload.load();
  for(const src of ['assets/media/nova/initial-duo-stop.mp3','assets/media/nova/initial-duo-final-stop.mp3']){const audio=new Audio(src);audio.preload='auto';audio.loop=false;oneShotSoundCache.set(src,audio);audio.load();}
  for(const src of ['assets/media/jag/cz_third_success.wav','assets/media/jag/cz_third_failure.wav','assets/media/nova/cz_stop_12.wav']){const audio=new Audio(src);audio.preload='auto';oneShotSoundCache.set(src,audio);audio.load();}
  for(const src of ['assets/media/nova/bell-navi.wav','assets/media/nova/direct-award.wav','assets/media/nova/weak-nova.wav','assets/media/nova/aim/nebula-win.wav','assets/media/nova/aim/seven-win.wav','assets/media/nova/aim/cue-blue.wav','assets/media/nova/aim/cue-red.wav','assets/media/nova/aim/cue-rainbow.wav','assets/media/nova/shutter.wav','assets/media/nova/shutter-close.wav','assets/media/nova/ladder-final-award.wav','assets/media/nova/ladder-final-award-under1000.wav']){const audio=new Audio(src);audio.preload='auto';oneShotSoundCache.set(src,audio);audio.load();}
  const resultEyecatchPreload = new Audio('assets/media/nova/result-eyecatch.wav');
  const initialDuoBgmPreload = new Audio(INITIAL_DUO_ZONE_BGM_SRC);
  initialDuoBgmPreload.preload='auto';initialDuoBgmPreload.load();
  resultEyecatchPreload.preload='auto';resultEyecatchPreload.load();
  oneShotSoundCache.set('assets/media/nova/result-eyecatch.wav',resultEyecatchPreload);
  const oumaFailPreload = new Audio('assets/media/nova/ouma-fail.wav');
  oumaFailPreload.preload='auto';
  oneShotSoundCache.set('assets/media/nova/ouma-fail.wav',oumaFailPreload);
  oumaFailPreload.load();
  const superNovaStopPreload=new Audio('assets/media/nova/super-nova-stop.wav');
  superNovaStopPreload.preload='auto';
  oneShotSoundCache.set('assets/media/nova/super-nova-stop.wav',superNovaStopPreload);
  superNovaStopPreload.load();
  let gekiatsuActive = false;
  let gekiatsuHideTimer = null;
  let premiumBigConfirmMovieHold = false;
  let premiumBigConfirmMovieTranslucent = false;
  let premiumBigConfirmSilence = false;
  let premiumBigConfirmStopLock = false;
  let premiumBigConfirmStopLockTimer = null;
  let speedBonusRogiHoldActive = false;
  let battleIntroHideTimer = null;
  const adminParams = bootParams;

  function safeStorageGet(key){
    try{ return window.localStorage ? localStorage.getItem(key) : null; }
    catch(e){ return null; }
  }

  function safeStorageSet(key, value){
    try{
      if(!window.localStorage) return false;
      localStorage.setItem(key, value);
      return true;
    }catch(e){
      return false;
    }
  }

  const VERTEX_CONTROLLER_ENABLED = adminParams.get("controller") === "vertex";
  const VERTEX_STORE_ID = String(adminParams.get("storeId") || "").trim();
  const ADMIN_SERVER = (VERTEX_CONTROLLER_ENABLED ? adminParams.get("server") || "" : "").replace(/\/$/, "");
  let machineId = adminParams.get("machine") || bootMachineId;
  let adminPushTimer = null;
  let adminPushDueAt = 0;

  let adminCommandPollTimer = null;
  const ADMIN_COMMAND_LAST_ID_KEY = "nova_admin_command_last_id_" + machineId;
  let adminCommandLastId = Number(safeStorageGet(ADMIN_COMMAND_LAST_ID_KEY) || 0) || 0;
  const ADMIN_STATE_PUSH_INTERVAL_MS = 60000;
  const SLOT_DEBUG_ENABLED = true;
  const CREDIT_BASELINE_PROFIT = Number(adminParams.get("creditBaseline") || 0) || 0;
  const PLAY_SESSION_ID = bootPlaySessionId;
  const SLOT_PLAY_SESSION = adminParams.has("creditBaseline") || !!PLAY_SESSION_ID;
  const PLAY_SESSION_BASELINE_STORAGE_KEY = PLAY_SESSION_ID ? `nova_play_session_baseline_${PLAY_SESSION_ID}` : "";
  let playSessionStartStats = null;
  function setAdminConnectionState(state){
    const badge = $("vertexConnectionBadge");
    if(!badge) return;
    badge.className = "vertexConnectionBadge";
    if(VERTEX_CONTROLLER_ENABLED){
      const normalized = state === "online" ? "online" : state === "offline" ? "offline" : "connecting";
      badge.classList.add(normalized);
      badge.textContent = normalized === "online"
        ? `VERTEX 接続: ONLINE${VERTEX_STORE_ID ? ` / ${VERTEX_STORE_ID}` : ""}`
        : normalized === "offline" ? "VERTEX 接続: OFFLINE" : "VERTEX 接続: 確認中";
    }else{
      badge.textContent = "管理接続: 単独動作";
    }
  }
  setAdminConnectionState("connecting");
  if(SLOT_DEBUG_ENABLED) document.body.classList.add("debugMode");
  const PAGE_ZOOM_STORAGE_KEY = "nova_unified_page_zoom_v3";
  const PAGE_PAN_STORAGE_KEY = "nova_unified_page_pan_x_v3";
  const LAYOUT_EDIT_STORAGE_KEY = "nova_layout_editor_locked_20260907";
  const LAYOUT_DEFAULT_STORAGE_KEY = "nova_layout_default_locked_20260907";
  const LAYOUT_EDITOR_ENABLED = true;
  const PAGE_STAGE_WIDTH = 1360;
  const PAGE_ZOOM_MIN = 0.75;
  const PAGE_ZOOM_MAX = 1.30;
  const PAGE_ZOOM_STEP = 0.05;
  const PAGE_PAN_MIN = -260;
  const PAGE_PAN_MAX = 260;
  const PAGE_ZOOM_BASE = 1.00;
  const CABINET_X_OFFSET_AT_75 = 0;
  const CABINET_X_OFFSET_AT_100 = 0;
  const CABINET_X_OFFSET_AT_130 = 0;
  const PAGE_PAN_DEFAULT = -190;
  const SLOT_ZOOM_ANCHOR_X = 680;
  const SLOT_ZOOM_ANCHOR_Y = 500;

  const LAYOUT_DEFAULTS = Object.freeze({
    navi:{...NovaBellNavi.defaults},
    reels:{x:22.7, y:41.4, w:54.0, h:37.4, gap:0.2},
    chance:{x:22.0, y:85.8, w:11.9, h:11.0},
    credit:{x:38.0, y:85.8, w:12.2, h:11.0},
    count:{x:52.0, y:85.8, w:12.2, h:11.0},
    payout:{x:66.0, y:85.8, w:11.0, h:11.0},
    bonusdata:{x:22.0, y:1.9, w:56.0, h:7.0}
  });
  let pageZoom = 1;
  let pagePanX = PAGE_PAN_DEFAULT;
  let layoutEditOpen = false;
  let layoutDefaultState = JSON.parse(JSON.stringify(LAYOUT_DEFAULTS));
  let layoutEditState = JSON.parse(JSON.stringify(layoutDefaultState));
  let backgroundSyncRaf = 0;
  let pageScrollBoundsRaf = 0;

  function renderedPageZoom(){
    if(window.NovaMobile?.active()) return window.NovaMobile.scale();
    return pageZoom * PAGE_ZOOM_BASE;
  }

  function cabinetXOffsetForPageZoom(){
    if(pageZoom <= 1){
      const progress = clamp((pageZoom - PAGE_ZOOM_MIN) / (1 - PAGE_ZOOM_MIN), 0, 1);
      return CABINET_X_OFFSET_AT_75 + (CABINET_X_OFFSET_AT_100 - CABINET_X_OFFSET_AT_75) * progress;
    }
    const progress = clamp((pageZoom - 1) / (PAGE_ZOOM_MAX - 1), 0, 1);
    return CABINET_X_OFFSET_AT_100 + (CABINET_X_OFFSET_AT_130 - CABINET_X_OFFSET_AT_100) * progress;
  }

  function totalCabinetXOffset(){
    return cabinetXOffsetForPageZoom() + pagePanX;
  }

  function formatPagePanValue(value){
    const rounded = Math.round(value);
    return rounded > 0 ? `+${rounded}` : String(rounded);
  }

  function applyCabinetXOffset(){
    document.documentElement.style.setProperty("--wd-cabinet-x-offset", `${Math.round(totalCabinetXOffset() * 100) / 100}px`);
    requestBackgroundLogoSync();
  }

  function syncZoomAnchorToSlotTop(){
    if(window.NovaMobile?.active()) return;
    const root = document.documentElement;
    if(!root) return;
    const wrapEl = document.querySelector(".wrap");
    const reelWindow = document.querySelector(".reelArea") || document.querySelector(".jagCabinetShell") || machine;
    if(wrapEl && reelWindow){
      const wrapRect = wrapEl.getBoundingClientRect();
      const reelRect = reelWindow.getBoundingClientRect();
      const zoom = Number.isFinite(renderedPageZoom()) && renderedPageZoom() > 0 ? renderedPageZoom() : 1;
      const layoutLeft = wrapRect.left - (1 - zoom) * SLOT_ZOOM_ANCHOR_X;
      const layoutTop = wrapRect.top - (1 - zoom) * SLOT_ZOOM_ANCHOR_Y;
      const x = (reelRect.left + reelRect.width / 2 - layoutLeft) / zoom;
      const y = (reelRect.top - layoutTop) / zoom;
      if(Number.isFinite(x)) root.style.setProperty("--wd-stage-focus-x", `${Math.round(x * 100) / 100}px`);
      if(Number.isFinite(y)) root.style.setProperty("--wd-reel-top-anchor-y", `${Math.round(y * 100) / 100}px`);
      return;
    }
    root.style.setProperty("--wd-stage-focus-x", `${SLOT_ZOOM_ANCHOR_X}px`);
    root.style.setProperty("--wd-reel-top-anchor-y", `${SLOT_ZOOM_ANCHOR_Y}px`);
  }

  function reelCenterScreenX(){
    const reelWindow = document.querySelector(".reels") || document.querySelector(".reelArea") || machine;
    if(!reelWindow) return (window.innerWidth || document.documentElement.clientWidth || PAGE_STAGE_WIDTH) / 2;
    const rect = reelWindow.getBoundingClientRect();
    return rect.left + rect.width / 2;
  }

  function syncBackgroundLogoToReelCenter(){
    const root = document.documentElement;
    const viewW = window.innerWidth || document.documentElement.clientWidth || PAGE_STAGE_WIDTH;
    const wrapEl = document.querySelector(".wrap");
    const wrapRect = wrapEl ? wrapEl.getBoundingClientRect() : null;
    const bgWidth = wrapRect && Number.isFinite(wrapRect.width) && wrapRect.width > 0 ? wrapRect.width : viewW;
    const cabinetWindow = document.querySelector(".jagCabinetShell") || machine || document.querySelector(".reelArea");
    const cabinetRect = cabinetWindow ? cabinetWindow.getBoundingClientRect() : null;
    const cabinetCenter = cabinetRect ? cabinetRect.left + cabinetRect.width / 2 : NaN;
    const reelCenter = reelCenterScreenX();
    const centerX = Number.isFinite(cabinetCenter) ? cabinetCenter : Number.isFinite(reelCenter) ? reelCenter : viewW / 2;
    const bgLeft = Math.round((centerX - bgWidth / 2) * 100) / 100;
    root.style.setProperty("--wd-bg-sync-size", `${Math.round(bgWidth * 100) / 100}px auto`);
    root.style.setProperty("--wd-bg-sync-x", `${bgLeft}px top`);
  }

  function requestBackgroundLogoSync(){
    if(backgroundSyncRaf) return;
    backgroundSyncRaf = requestAnimationFrame(()=>{
      backgroundSyncRaf = 0;
      syncBackgroundLogoToReelCenter();
    });
  }

  function updatePageScrollBounds(){
    if(window.NovaMobile?.active()){
      const spacer = $("pageScrollSpacer");
      if(spacer) spacer.style.height = "0px";
      return;
    }
    const targets = [".wrap", ".main", ".machine", ".reelArea", ".buttonRow", ".autoStack"]
      .flatMap(selector=>Array.from(document.querySelectorAll(selector)));
    const wrapEl = document.querySelector(".wrap");
    const spacer = $("pageScrollSpacer");
    if(!targets.length || !wrapEl || !spacer) return;
    const scrollY = window.scrollY || document.documentElement.scrollTop || 0;
    const visualBottom = targets.reduce((max, el)=>Math.max(max, scrollY + el.getBoundingClientRect().bottom), 0);
    const layoutBottom = wrapEl.offsetTop + wrapEl.offsetHeight;
    const extraHeight = Math.max(0, Math.ceil(visualBottom - layoutBottom + 100));
    spacer.style.height = `${extraHeight}px`;
    document.body.style.minHeight = "100%";
  }

  function requestPageScrollBoundsUpdate(){
    if(pageScrollBoundsRaf) return;
    pageScrollBoundsRaf = requestAnimationFrame(()=>{
      pageScrollBoundsRaf = 0;
      updatePageScrollBounds();
    });
  }

  function applyPageZoom(saveValue=false){
    pageZoom = clamp(Math.round(pageZoom * 100) / 100, PAGE_ZOOM_MIN, PAGE_ZOOM_MAX);
    const visualZoom = renderedPageZoom();
    document.documentElement.style.setProperty("--wd-page-zoom", String(visualZoom));
    applyCabinetXOffset();
    document.body.style.minWidth = "100%";
    requestPageScrollBoundsUpdate();
    if(pageZoomView) pageZoomView.textContent = `${Math.round(pageZoom * 100)}%`;
    if(pageZoomOutBtn) pageZoomOutBtn.disabled = pageZoom <= PAGE_ZOOM_MIN + 0.001;
    if(pageZoomInBtn) pageZoomInBtn.disabled = pageZoom >= PAGE_ZOOM_MAX - 0.001;
    if(saveValue) safeStorageSet(PAGE_ZOOM_STORAGE_KEY, String(pageZoom));
  }

  function applyPagePan(saveValue=false){
    pagePanX = clamp(Math.round(Number(pagePanX) || 0), PAGE_PAN_MIN, PAGE_PAN_MAX);
    if(pagePanRange) pagePanRange.value = String(pagePanX);
    if(pagePanView) pagePanView.textContent = formatPagePanValue(pagePanX);
    applyCabinetXOffset();
    requestPageScrollBoundsUpdate();
    if(saveValue) safeStorageSet(PAGE_PAN_STORAGE_KEY, String(pagePanX));
  }

  function loadPageZoom(){
    const saved = Number(safeStorageGet(PAGE_ZOOM_STORAGE_KEY));
    if(Number.isFinite(saved) && saved > 0) pageZoom = saved;
    applyPageZoom(false);
  }

  function loadPagePan(){
    const savedRaw = safeStorageGet(PAGE_PAN_STORAGE_KEY);
    const saved = savedRaw == null ? NaN : Number(savedRaw);
    pagePanX = Number.isFinite(saved) ? saved : PAGE_PAN_DEFAULT;
    applyPagePan(false);
  }

  function cloneLayoutDefaults(){
    return JSON.parse(JSON.stringify(layoutDefaultState || LAYOUT_DEFAULTS));
  }

  function cloneFactoryLayoutDefaults(){
    return JSON.parse(JSON.stringify(LAYOUT_DEFAULTS));
  }

  function layoutInputFor(target, prop){
    return layoutEditInputs.find(input => input.dataset.layoutTarget === target && input.dataset.layoutProp === prop);
  }

  function layoutValueLimit(target, prop, value){
    const input = layoutInputFor(target, prop);
    if(!input) return Number(value);
    const min = Number(input.min);
    const max = Number(input.max);
    const numeric = Number(value);
    return clamp(
      Number.isFinite(numeric) ? numeric : LAYOUT_DEFAULTS[target][prop],
      Number.isFinite(min) ? min : -999,
      Number.isFinite(max) ? max : 999
    );
  }

  function migrateLegacySevenSegState(raw){
    if(!raw || typeof raw !== "object" || !raw.sevenseg || typeof raw.sevenseg !== "object") return raw;
    const next = {...raw};
    const legacy = raw.sevenseg;
    const legacyX = Number(legacy.x);
    const legacyY = Number(legacy.y);
    const legacyW = Number(legacy.w);
    const legacyH = Number(legacy.h);
    if(!Number.isFinite(legacyX) || !Number.isFinite(legacyY) || !Number.isFinite(legacyW) || !Number.isFinite(legacyH)) return next;
    const gap = legacyW * 0.07;
    const meterW = Math.max(4, (legacyW - gap * 2) / 3);
    const makeMeter = index => ({
      x:legacyX + (meterW + gap) * index,
      y:legacyY,
      w:meterW,
      h:legacyH
    });
    if(!next.credit) next.credit = makeMeter(0);
    if(!next.count) next.count = makeMeter(1);
    if(!next.payout) next.payout = makeMeter(2);
    return next;
  }

  function normalizeLayoutState(raw){
    const next = cloneLayoutDefaults();
    raw = migrateLegacySevenSegState(raw);
    if(!raw || typeof raw !== "object") return next;
    Object.keys(next).forEach(target=>{
      if(!raw[target] || typeof raw[target] !== "object") return;
      Object.keys(next[target]).forEach(prop=>{
        next[target][prop] = Math.round(layoutValueLimit(target, prop, raw[target][prop]) * 10) / 10;
      });
    });
    return next;
  }

  function setLayoutCssVariable(target, prop, value){
    document.documentElement.style.setProperty(`--layout-${target}-${prop}`, `${Math.round(value * 10) / 10}%`);
  }

  function syncLayoutEditInputs(){
    layoutEditInputs.forEach(input=>{
      const target = input.dataset.layoutTarget;
      const prop = input.dataset.layoutProp;
      if(!layoutEditState[target] || !Object.prototype.hasOwnProperty.call(layoutEditState[target], prop)) return;
      const value = Math.round(layoutEditState[target][prop] * 10) / 10;
      input.value = String(value);
      const view = document.querySelector(`[data-layout-view="${target}-${prop}"]`);
      if(view) view.textContent = `${value.toFixed(1)}%`;
    });
  }

  function applyLayoutEdit(saveValue=false){
    layoutEditState = normalizeLayoutState(layoutEditState);
    Object.keys(layoutEditState).forEach(target=>{
      Object.keys(layoutEditState[target]).forEach(prop=>{
        setLayoutCssVariable(target, prop, layoutEditState[target][prop]);
      });
    });
    syncLayoutEditInputs();
    NovaBellNavi.layout();
    if(saveValue) safeStorageSet(LAYOUT_EDIT_STORAGE_KEY, JSON.stringify(layoutEditState));
  }

  function loadLayoutEdit(){
    try{
      const saved = safeStorageGet(LAYOUT_EDIT_STORAGE_KEY);
      layoutEditState = saved ? normalizeLayoutState(JSON.parse(saved)) : cloneLayoutDefaults();
    }catch(e){
      layoutEditState = cloneLayoutDefaults();
    }
    applyLayoutEdit(false);
  }

  function loadLayoutDefaultState(){
    try{
      const saved = safeStorageGet(LAYOUT_DEFAULT_STORAGE_KEY);
      layoutDefaultState = saved ? normalizeLayoutState(JSON.parse(saved)) : cloneFactoryLayoutDefaults();
    }catch(e){
      layoutDefaultState = cloneFactoryLayoutDefaults();
    }
  }

  function saveLayoutAsDefault(){
    layoutEditState = normalizeLayoutState(layoutEditState);
    layoutDefaultState = JSON.parse(JSON.stringify(layoutEditState));
    safeStorageSet(LAYOUT_DEFAULT_STORAGE_KEY, JSON.stringify(layoutDefaultState));
    applyLayoutEdit(true);
    if(layoutEditSaveDefaultBtn){
      layoutEditSaveDefaultBtn.textContent = "保存済";
      clearTimeout(layoutEditSaveDefaultBtn._layoutFeedbackTimer);
      layoutEditSaveDefaultBtn._layoutFeedbackTimer = setTimeout(()=>{
        layoutEditSaveDefaultBtn.textContent = "今を標準";
      }, 1000);
    }
  }

  function resetLayoutEdit(){
    layoutEditState = cloneLayoutDefaults();
    applyLayoutEdit(true);
  }

  function setLayoutEditorOpen(open){
    if(!LAYOUT_EDITOR_ENABLED) open = false;
    layoutEditOpen = !!open;
    if(layoutEditorPanel) layoutEditorPanel.classList.toggle("open", layoutEditOpen);
    if(layoutEditToggleBtn){
      layoutEditToggleBtn.classList.toggle("active", layoutEditOpen);
      layoutEditToggleBtn.setAttribute("aria-expanded", layoutEditOpen ? "true" : "false");
    }
    document.body.classList.toggle("layoutEditOpen", layoutEditOpen);
    NovaBellNavi.preview(layoutEditOpen);
  }

  function changePageZoom(delta){
    syncZoomAnchorToSlotTop();
    pageZoom = clamp(pageZoom + delta, PAGE_ZOOM_MIN, PAGE_ZOOM_MAX);
    applyPageZoom(true);
  }

  function bgmOutputVolume(scale){
    return audioOutputVolume(settings.bgmVolume, scale);
  }

  function bgmOutputVolumeForSource(scale, src=""){
    return bgmOutputVolume(scale * audioSourceOutputScale(src));
  }

  function sfxOutputVolume(scale=SFX_OUTPUT_SCALE){
    return audioOutputVolume(settings.sfxVolume, scale);
  }

  function voiceOutputVolume(scale=1){
    return audioOutputVolume(settings.voiceVolume, scale);
  }

  function resumeCharacterVoiceAudio(){
    const ctx=getAudio();
    if(ctx.state!=="running")ctx.resume().catch(()=>{});
    return ctx;
  }

  function prepareCharacterVoiceAudio(audio,src){
    if(!CHARACTER_VOICE_KEYS.has(normalizedAudioSourceKey(src)))return;
    const ctx=resumeCharacterVoiceAudio();
    if(!characterVoiceBus){
      const gain=ctx.createGain(),limiter=ctx.createDynamicsCompressor();
      gain.gain.value=10**(CHARACTER_VOICE_BOOST_DB/20);
      limiter.threshold.value=-1;limiter.knee.value=0;limiter.ratio.value=20;
      limiter.attack.value=0;limiter.release.value=.05;
      gain.connect(limiter);limiter.connect(ctx.destination);
      characterVoiceBus=gain;
    }
    let connection=characterVoiceConnections.get(audio);
    if(globalThis.NovaAudio?.connect(audio,characterVoiceBus))return;
    if(!connection){
      connection={source:ctx.createMediaElementSource(audio),connected:false};
      characterVoiceConnections.set(audio,connection);
    }
    if(!connection.connected){connection.source.connect(characterVoiceBus);connection.connected=true;}
  }

  function releaseCharacterVoiceAudio(audio){
    if(globalThis.NovaAudio?.enabled){globalThis.NovaAudio.disconnect(audio);return;}
    const connection=characterVoiceConnections.get(audio);
    if(connection?.connected){connection.source.disconnect();connection.connected=false;}
  }

  // Unlock during user input so AUTO and delayed continuation lines use the same bus.
  window.addEventListener('pointerdown',resumeCharacterVoiceAudio,{capture:true,passive:true});
  window.addEventListener('keydown',resumeCharacterVoiceAudio,{capture:true});
  window.addEventListener('touchend',resumeCharacterVoiceAudio,{capture:true,passive:true});
  window.addEventListener('click',resumeCharacterVoiceAudio,{capture:true,passive:true});
  window.addEventListener('nova-enable-audio',()=>{
    settings.audioMuted=false;applyAudioOutputVolumes();persistState();
    if(session.active)resumeSessionBgm();else playNormalBgm();
  });

  function soundOutputVolume(src, volume){
    return CHARACTER_VOICE_KEYS.has(normalizedAudioSourceKey(src))?voiceOutputVolume():applyAudioSourceOutputScale(volume,src);
  }

  function aimWinOutputVolume(audio){
    return soundOutputVolume(audio.aimSoundSrc,sfxOutputVolume())*(audio.aimFadeGain??1);
  }

  function applyCharacterVoiceOutputVolumes(){
    for(const [src,audio] of oneShotSoundCache){
      if(CHARACTER_VOICE_KEYS.has(normalizedAudioSourceKey(src)))audio.volume=voiceOutputVolume();
    }
    for(const audio of aimWinAudios)audio.volume=aimWinOutputVolume(audio);
  }

  function voiceOutputVolumeForSource(scale=1, src=""){
    return voiceOutputVolume(scale * audioSourceOutputScale(src));
  }

  function sfxOutputVolumeForSource(scale=SFX_OUTPUT_SCALE, src=""){
    return sfxOutputVolume(scale * audioSourceOutputScale(src));
  }

  function payoutOutputVolume(scale=PAYOUT_SOUND_OUTPUT_SCALE){
    return audioOutputVolume(settings.payoutVolume, scale);
  }

  function payoutOutputVolumeForSource(scale=PAYOUT_SOUND_OUTPUT_SCALE, src=""){
    return payoutOutputVolume(scale * audioSourceOutputScale(src));
  }

  function clearBonusEndBgmLock(){
    bonusEndBgmPlaying = false;
    if(bonusEndBgmTimer){
      clearTimeout(bonusEndBgmTimer);
      bonusEndBgmTimer = null;
    }
    if(bonusEndBgmAudio){
      bonusEndBgmAudio.onended = null;
      bonusEndBgmAudio.onerror = null;
      try{ bonusEndBgmAudio.pause(); }catch(e){}
      bonusEndBgmAudio = null;
    }
    if(bonusEndVoiceAudio){
      bonusEndVoiceAudio.onended = null;
      bonusEndVoiceAudio.onerror = null;
      try{ bonusEndVoiceAudio.pause(); }catch(e){}
      bonusEndVoiceAudio = null;
    }
    updateAutoUi();
  }

  function pickSettingBonusEndVoiceSrc(settingNo = settings.setting){
    if(A_TYPE_MODE)return ""; // No setting-identifying voice in ordinary play.
  }

  function completeBonusEndBgmSequence(callback){
    const cb = callback;
    clearBonusEndBgmLock();
    if(typeof cb === "function") cb();
  }

  function premiumBonusEndImmediateVoiceSrc(){
    if(A_TYPE_MODE)return "";
  }

  function playCzCountdownOnLever(resolved){
    if(resolved?.bonusPendingAtStart)return;
    const flow=resolved?.flowBefore;
    if(!['cz','strong_cz'].includes(flow?.phase))return;
    const src={3:'assets/media/jag/cz_remaining_3.wav?v=count2',2:'assets/media/jag/cz_remaining_2.wav?v=count2',1:'assets/media/jag/cz_last.wav?v=count2'}[flow.remaining];
    if(src)playOneShotSound(src,voiceOutputVolume());
  }

  function playPendingSettingVoiceOnLever(){
    const premiumSrc = String(normalState.pendingPremiumVoiceSrc || "");
    const settingSrc = String(normalState.pendingSettingVoiceSrc || "");
    if(!premiumSrc && !settingSrc) return false;
    normalState.pendingPremiumVoiceSrc = "";
    normalState.pendingSettingVoiceSrc = "";
    if(premiumSrc){
      playOneShotSound(premiumSrc, voiceOutputVolume(PREMIUM_VOICE_OUTPUT_SCALE));
      log("プレミアBIG継続ボイス：次GレバーON");
      if(settingSrc){
        setTimeout(()=>playOneShotSound(settingSrc, voiceOutputVolume(SETTING_VOICE_OUTPUT_SCALE)), 1400);
        log("設定示唆ボイス予約：継続ボイス後に再生");
      }
    }else if(settingSrc){
      playOneShotSound(settingSrc, voiceOutputVolume(SETTING_VOICE_OUTPUT_SCALE));
      log("設定示唆ボイス：ボーナス後1G目レバーON");
    }
    return true;
  }

  function playArtEndSound(resolved){
    if(normalState.resultCard)return; // The result eyecatch owns the ending sound and playback lock.
    if(resolved?.flowBefore?.phase!=='art'||resolved.flowAfter?.phase!=='normal'||resolved.bonusHit||resolved.artEndSoundPlayed)return;
    resolved.artEndSoundPlayed=true;
    playLockedBonusConfirmSound(BONUS_END_BGM_SRC,bgmOutputVolume(BGM_OUTPUT_SCALE));
  }

  function playBonusEndBgmThen(callback){
    const premiumEndVoiceSrc = premiumBonusEndImmediateVoiceSrc();
    clearBonusEndBgmLock();
    bonusEndBgmPlaying = true;
    updateAutoUi();
    if($("resultText")) $("resultText").textContent = premiumEndVoiceSrc ? "プレミアムBIG終了ボイス中..." : "ボーナス終了BGM中...";
    stopBattleBgm(false);
    stopBarBgm(false);
    if(bgm){
      try{
        bgm.pause();
        bgm.currentTime = 0;
      }catch(e){}
    }
    const finish = ()=>{
      if(!bonusEndBgmPlaying) return;
      if(bonusEndBgmTimer){
        clearTimeout(bonusEndBgmTimer);
        bonusEndBgmTimer = null;
      }
      if(bonusEndBgmAudio){
        bonusEndBgmAudio.onended = null;
        bonusEndBgmAudio.onerror = null;
        try{ bonusEndBgmAudio.pause(); }catch(e){}
        bonusEndBgmAudio = null;
      }
      completeBonusEndBgmSequence(callback);
    };
    const audio = new Audio(premiumEndVoiceSrc || BONUS_END_BGM_SRC);
    bonusEndBgmAudio = audio;
    audio.volume = premiumEndVoiceSrc
      ? voiceOutputVolumeForSource(PREMIUM_VOICE_OUTPUT_SCALE, premiumEndVoiceSrc)
      : bgmOutputVolumeForSource(BGM_OUTPUT_SCALE, BONUS_END_BGM_SRC);
    if(premiumEndVoiceSrc){
      const label = session.oneGameRenBonus ? "2回目PBB終了ボイス" : "1回目PBB終了ボイス";
      log(`${label}再生：${premiumEndVoiceSrc.split("/").pop()}`);
    }
    audio.onended = finish;
    audio.onerror = finish;

    try{
      const p = audio.play();
      if(p && typeof p.catch === "function") p.catch(()=>setTimeout(finish, 500));
    }catch(e){
      setTimeout(finish, 500);
    }
  }

  function movieOutputVolume(scale=MOVIE_OUTPUT_SCALE){
    return audioOutputVolume(settings.movieVolume, scale);
  }

  function movieOutputVolumeForSource(scale=MOVIE_OUTPUT_SCALE, src=""){
    return movieOutputVolume(scale * audioSourceOutputScale(src));
  }

  function rogiMovieOutputVolume(scale=ROGI_MOVIE_OUTPUT_SCALE){
    return audioOutputVolume(settings.rogiMovieVolume, scale);
  }

  function rogiMovieOutputVolumeForSource(scale=ROGI_MOVIE_OUTPUT_SCALE, src=""){
    return rogiMovieOutputVolume(scale * audioSourceOutputScale(src));
  }

  function updateAudioMuteButton(){
    const btn = $("audioMuteBtn");
    if(!btn) return;
    btn.textContent = settings.audioMuted ? "ミュート解除" : "ミュート";
    btn.classList.toggle("active", !!settings.audioMuted);
    btn.setAttribute("aria-pressed", settings.audioMuted ? "true" : "false");
  }

  function currentGekiatsuVideoOutputVolume(){
    if(!gekiatsuVideo) return 0;
    const src = gekiatsuVideo.getAttribute("src") || "";
    const isRogi = Object.values(ROGI_STOP_VIDEO_SRCS).some(rogiSrc => src === rogiSrc || src.endsWith(rogiSrc));
    return isRogi
      ? rogiMovieOutputVolumeForSource(ROGI_MOVIE_OUTPUT_SCALE, src)
      : movieOutputVolumeForSource(MOVIE_OUTPUT_SCALE, src);
  }

  function applyAudioOutputVolumes(){
    globalThis.NovaRushConfirm?.updateVolumes(bgmOutputVolume(BGM_OUTPUT_SCALE),sfxOutputVolume());
    applyCharacterVoiceOutputVolumes();
    if(oumaIntroAudio)oumaIntroAudio.volume=sfxOutputVolumeForSource(SFX_OUTPUT_SCALE,'assets/media/nova/uuufa.wav');
    if(oumaReverseAudio)oumaReverseAudio.volume=sfxOutputVolumeForSource(SFX_OUTPUT_SCALE,"assets/media/nova/ouma-reverse-v2.wav");
    applyBgmOutputVolumes();
    if(koatariSound) koatariSound.volume = sfxOutputVolumeForSource(SFX_OUTPUT_SCALE, KOATARI_SOUND_SRC);
    if(bigSound) bigSound.volume = sfxOutputVolumeForSource(SFX_OUTPUT_SCALE, BIG_SOUND_SRC);
    if(payoutSound) payoutSound.volume = payoutOutputVolumeForSource(PAYOUT_SOUND_OUTPUT_SCALE, payoutSound.getAttribute("src") || PAYOUT_SOUND_SRC);
    if(voiceSound) voiceSound.volume = voiceOutputVolume();
    if(gekiatsuVideo) gekiatsuVideo.volume = currentGekiatsuVideoOutputVolume();
    updateAudioMuteButton();
  }

  function toggleAudioMute(){
    settings.audioMuted = !settings.audioMuted;
    applyAudioOutputVolumes();
    updateDisplay();
    persistState();
    log(settings.audioMuted ? "音量をミュートしました" : "ミュートを解除しました");
  }

  function applyBgmOutputVolumes(){
    resultEyecatchPreload.volume = bgmOutputVolumeForSource(BGM_OUTPUT_SCALE,'assets/media/nova/result-eyecatch.wav');
    if(bgm) bgm.volume = bgmOutputVolumeForSource(BGM_OUTPUT_SCALE, bgm.getAttribute("src") || normalBgmSrc());
    if(barBgm) barBgm.volume = bgmOutputVolumeForSource(BAR_BGM_OUTPUT_SCALE, activeBarBgmSrc());
    if(battleBgm) battleBgm.volume = bgmOutputVolumeForSource(BATTLE_BGM_OUTPUT_SCALE, BATTLE_BGM_SRC);
  }

  function muteBgmForRogiStopEffect(){
    rogiBgmMuted = true;
    if(bgm) bgm.volume = 0;
    if(barBgm) barBgm.volume = 0;
    if(battleBgm) battleBgm.volume = 0;
  }

  function restoreBgmAfterRogiStopEffect(){
    if(!rogiBgmMuted) return;
    rogiBgmMuted = false;
    applyBgmOutputVolumes();
  }

  function isRogiThirdStopHoldActive(){
    return !!rogiThirdStopHold;
  }

  function shouldHoldRogiThirdStopEffect(spin=currentSpin){
    return !!(
      spin &&
      !spin.effectsSkipped &&
      spin.rogiStopEffectStarted &&
      Number(spin.rogiLastStopEffectOrder) === 3
    );
  }

  function startRogiThirdStopHold(){
    if(rogiThirdStopHold) return;
    rogiThirdStopHold = true;
  }

  function clearRogiThirdStopHold(){
    rogiThirdStopHold = false;
  }

  function isRogiThirdStopMoviePlaying(){
    return !!(
      isRogiThirdStopHoldActive() &&
      gekiatsuVideo &&
      !gekiatsuVideo.paused &&
      !gekiatsuVideo.ended
    );
  }

  function clearRogiThirdStopHoldForNextGame(){
    if(!isRogiThirdStopHoldActive()) return;
    clearRogiThirdStopHold();
    stopGekiatsuEffect(true);
  }

  function updateDevilStatusLamp(){
    const stEmblem = $("wdStEmblem");
    if(!stEmblem) return;
    const barActive = !!barBgmActive;
    const atActive = !!session.active;
    const atConfirmed = !atActive && !!(
      pendingAtStartTimer ||
      (normalState.bonusPending && normalState.bonusKind !== "MID")
    );

    stEmblem.classList.toggle("status-rainbow", barActive);
    stEmblem.classList.toggle("status-blink", !barActive && atActive);
    stEmblem.classList.toggle("status-lit", barActive || atActive || atConfirmed);
    stEmblem.classList.toggle("status-confirmed", !barActive && !atActive && atConfirmed);
    stEmblem.setAttribute("data-state", barActive ? "bar" : atActive ? "at" : atConfirmed ? "confirmed" : "normal");
  }

  function updateReelFrameMode(){
    if(!reelArea) return;
    const frameOn = !!(
      session.active ||
      normalState.bonusPending ||
      pendingAtStartTimer ||
      speedBonusRogiHoldActive
    );
    reelArea.classList.toggle("reelFrameOn", frameOn);
    reelArea.classList.remove("speedFrameOff");
  }

  function setSpeedFrameOffHold(active){
    speedFrameOffHold = !!active;
    updateReelFrameMode();
  }

  function setAudioPanelOpen(open){
    if(!audioDock || !audioToggleBtn) return;
    audioDock.classList.toggle("open", !!open);
    audioToggleBtn.setAttribute("aria-expanded", open ? "true" : "false");
    audioToggleBtn.setAttribute("aria-label", open ? "音量を閉じる" : "音量を開く");
  }

  function infoPanelClassForType(type){
    if(type === "slump") return "slumpOpen";
    if(type === "counter") return "counterOpen";
    return "oddsOpen";
  }

  function infoPanelButtonForType(type){
    if(type === "slump") return slumpToggleBtn;
    if(type === "counter") return roleCounterToggleBtn;
    return oddsToggleBtn;
  }

  function closeInfoPanels(){
    if(!audioDock) return;
    audioDock.classList.remove("slumpOpen","oddsOpen","counterOpen");
    if(slumpToggleBtn) slumpToggleBtn.setAttribute("aria-expanded", "false");
    if(oddsToggleBtn) oddsToggleBtn.setAttribute("aria-expanded", "false");
    if(roleCounterToggleBtn) roleCounterToggleBtn.setAttribute("aria-expanded", "false");
    updateReelInfoButtons();
  }

  function isInfoPanelOpen(type){
    if(!audioDock) return false;
    return audioDock.classList.contains(infoPanelClassForType(type));
  }

  function updateReelInfoButtons(){
    const slumpOpen = isInfoPanelOpen("slump");
    const oddsOpen = isInfoPanelOpen("odds");
    if(reelSlumpToggleBtn){
      reelSlumpToggleBtn.textContent = slumpOpen ? "とじる" : "スランプグラフ";
      reelSlumpToggleBtn.classList.toggle("is-open", slumpOpen);
      reelSlumpToggleBtn.setAttribute("aria-expanded", slumpOpen ? "true" : "false");
    }
    if(reelOddsToggleBtn){
      reelOddsToggleBtn.textContent = oddsOpen ? "とじる" : "設定別確率";
      reelOddsToggleBtn.classList.toggle("is-open", oddsOpen);
      reelOddsToggleBtn.setAttribute("aria-expanded", oddsOpen ? "true" : "false");
    }
  }

  function isReelDataCounterOpen(){
    return !!(reelDataCounterPanel && reelDataCounterPanel.classList.contains("is-counter-open"));
  }

  function updateReelDataCounterMenu(){
    const open = isReelDataCounterOpen();
    if(reelDataToggleBtn){
      reelDataToggleBtn.textContent = open ? "とじる" : "データカウンター";
      reelDataToggleBtn.classList.toggle("is-open", open);
      reelDataToggleBtn.setAttribute("aria-expanded", open ? "true" : "false");
    }
  }

  function setReelDataCounterOpen(open){
    if(!reelDataCounterPanel) return;
    reelDataCounterPanel.classList.toggle("is-counter-open", !!open);
    updateReelDataCounterMenu();
  }

  function syncInfoPanelPosition(){
    const root = document.documentElement;
    const reelWindow = document.querySelector(".reels") || reelArea || machine;
    const regWindow = document.querySelector(".wd-info-strip div:nth-child(3)");
    const activePanel = audioDock && audioDock.classList.contains("slumpOpen")
      ? $("slumpPanel")
      : audioDock && audioDock.classList.contains("oddsOpen")
        ? $("oddsPanel")
        : audioDock && audioDock.classList.contains("counterOpen")
          ? $("roleCounterPanel")
          : null;
    const viewW = window.innerWidth || root.clientWidth || PAGE_STAGE_WIDTH;
    let left = viewW / 2;
    let top = 16;
    let maxHeight = 620;
    if(reelWindow || regWindow){
      const reelRect = reelWindow ? reelWindow.getBoundingClientRect() : null;
      const regRect = regWindow ? regWindow.getBoundingClientRect() : null;
      const gap = 20;
      const topMargin = 16;
      const anchorRect = regRect || reelRect;
      left = anchorRect.left + anchorRect.width / 2;
      const anchorTop = regRect ? regRect.top : reelRect.top;
      maxHeight = Math.max(40, anchorTop - gap - topMargin);
      const panelHeight = activePanel
        ? Math.min(activePanel.scrollHeight || activePanel.getBoundingClientRect().height || maxHeight, maxHeight)
        : maxHeight;
      top = anchorTop - gap - panelHeight;
    }
    if(maxHeight < 260){
      top = 84;
      maxHeight = Math.max(260, (window.innerHeight || document.documentElement.clientHeight || 720) - top - 18);
    }
    const panelWidth = activePanel
      ? Math.min(activePanel.scrollWidth || activePanel.getBoundingClientRect().width || 760, viewW - 32)
      : Math.min(760, viewW - 32);
    const halfPanelWidth = Math.max(16, panelWidth / 2);
    left = clamp(left, halfPanelWidth + 16, Math.max(halfPanelWidth + 16, viewW - halfPanelWidth - 16));
    top = Math.max(8, top);
    root.style.setProperty("--wd-info-panel-left", `${Math.round(left * 100) / 100}px`);
    root.style.setProperty("--wd-info-panel-top", `${Math.round(top * 100) / 100}px`);
    root.style.setProperty("--wd-info-panel-max-height", `${Math.round(maxHeight * 100) / 100}px`);
  }

  function syncInfoPanelPositionIfOpen(){
    if(audioDock && (audioDock.classList.contains("slumpOpen") || audioDock.classList.contains("oddsOpen") || audioDock.classList.contains("counterOpen"))){
      syncInfoPanelPosition();
    }
  }

  function setInfoPanelOpen(type, open){
    if(!audioDock) return;
    setAudioPanelOpen(false);
    closeInfoPanels();
    if(!open){
      updateReelInfoButtons();
      return;
    }
    const isSlump = type === "slump";
    audioDock.classList.add(infoPanelClassForType(type));
    const btn = infoPanelButtonForType(type);
    if(btn) btn.setAttribute("aria-expanded", "true");
    syncInfoPanelPosition();
    updateReelInfoButtons();
    requestAnimationFrame(()=>{
      syncInfoPanelPosition();
      if(isSlump) renderSlumpGraph();
    });
  }

  function closeUtilityPanels(){
    setAudioPanelOpen(false);
  }

  function clearReelLight(keepBarHold=false){
    if(!reelArea) return;
    if(reelLightTimer){
      clearTimeout(reelLightTimer);
      reelLightTimer = null;
    }
    reelArea.classList.remove("lightYellow","lightGreen","lightRed","lightRainbow","lightRainbowHold");
    if(keepBarHold && barRainbowHold){
      reelArea.classList.add("lightRainbowHold");
    }
  }

  function speedModeVisualsSuppressed(spin=currentSpin){
    return !!(spin && spin.speedModeAtStart);
  }

  function flashReelLight(type, duration=1800){
    if(debugFastSpinActive) return;
    if(speedModeVisualsSuppressed()) return;
    if(isRogiThirdStopHoldActive()) return;
    if(!reelArea) return;
    clearReelLight(false);

    const map = {
      yellow:"lightYellow",
      green:"lightGreen",
      red:"lightRed",
      rainbow:"lightRainbow",
      rainbowHold:"lightRainbowHold"
    };

    const cls = map[type];
    if(!cls) return;

    reelArea.classList.add(cls);

    if(type !== "rainbowHold"){
      reelLightTimer = setTimeout(()=>{
        clearReelLight(true);
      }, duration);
    }
  }

  function startBarRainbowHold(){
    if(debugFastSpinActive) return;
    barRainbowHold = true;
    flashReelLight("rainbowHold");
    ensureBarBgmContinuing();
    updateDevilStatusLamp();
    updateDisplay();
  }

  function stopBarRainbowHold(){
    barRainbowHold = false;
    clearReelLight(false);
    updateDevilStatusLamp();
    updateDisplay();
  }

  function flashGuaranteedSetStart(){
    if(debugFastSpinActive) return;
    guaranteedSetStartLight = true;
    if(guaranteedSetLightTimer){
      clearTimeout(guaranteedSetLightTimer);
      guaranteedSetLightTimer = null;
    }
    flashReelLight("rainbowHold");
    guaranteedSetLightTimer = setTimeout(()=>{
      guaranteedSetStartLight = false;
      guaranteedSetLightTimer = null;
      clearReelLight(true);
    }, 3200);
  }

  function stopGuaranteedSetStartLight(){
    guaranteedSetStartLight = false;
    if(guaranteedSetLightTimer){
      clearTimeout(guaranteedSetLightTimer);
      guaranteedSetLightTimer = null;
    }
    clearReelLight(true);
  }

  function isGoraiZoneActive(){
    return !!(session.active && session.bigZone > 0);
  }

  function currentGoraiZoneType(){
    return session.bigZoneType === "super" ? "super" : "devil";
  }

  function atInternalResult(result){
    if(result === "MID") return "DEVIL_ZONE";
    if(result === "BIG") return "SUPER_DEVIL_ZONE";
    return result;
  }

  function displayResultFor(result){
    if(result === "MID_CHERRY") return "MID";
    if(result === "DEVIL_ZONE") return "MID";
    if(result === "SUPER_DEVIL_ZONE") return "BIG";
    return result;
  }

  function isZoneEntryResult(result){
    return result === "DEVIL_ZONE" || result === "SUPER_DEVIL_ZONE";
  }

  function zoneSevenChance(type=currentGoraiZoneType()){
    return type === "super" ? SUPER_DEVIL_ZONE_SEVEN_CHANCE : DEVIL_ZONE_SEVEN_CHANCE;
  }

  function drawZoneChallengeResult(type=currentGoraiZoneType()){
    return Math.random() < zoneSevenChance(type) ? "SUPER_DEVIL_ZONE" : "MISS";
  }

  function reversePushMissSignalRate(hitRate, hitSignalRate, targetExpectation){
    const p = clamp(Number(hitRate) || 0, 0, 1);
    const h = clamp(Number(hitSignalRate) || 0, 0, 1);
    const t = clamp(Number(targetExpectation) || 0, 0.01, 0.99);
    if(p <= 0 || h <= 0 || p >= 1) return 0;
    return clamp((p * h * (1 - t)) / (t * (1 - p)), 0, 1);
  }

  function decideReversePushGuide(result, type=currentGoraiZoneType()){
    const hitRate = zoneSevenChance(type);
    const redHitRate = REVERSE_PUSH_HIT_RED_RATE;
    const blueHitRate = 1 - redHitRate;
    if(result === "SUPER_DEVIL_ZONE"){
      return Math.random() < redHitRate ? "red" : "blue";
    }

    let redMissRate = reversePushMissSignalRate(hitRate, redHitRate, REVERSE_PUSH_RED_EXPECTATION);
    let blueMissRate = reversePushMissSignalRate(hitRate, blueHitRate, REVERSE_PUSH_BLUE_EXPECTATION);
    const totalMissRate = redMissRate + blueMissRate;
    if(totalMissRate > 1){
      redMissRate /= totalMissRate;
      blueMissRate /= totalMissRate;
    }
    const roll = Math.random();
    if(roll < redMissRate) return "red";
    if(roll < redMissRate + blueMissRate) return "blue";
    return "";
  }

  function resolveZoneSevenBonus(result, type=currentGoraiZoneType()){
    if(result !== "SUPER_DEVIL_ZONE") return {sets:0, games:0, hit:false};
    if(type === "super") return {sets:Math.random() < 0.50 ? 1 : 2, games:0, hit:true};
    return {sets:1, games:0, hit:true};
  }

  function isReversePushGuidedMiss(spin=currentSpin){
    return !!(spin && spin.zoneActiveAtStart && spin.reversePushGuide && spin.result === "MISS");
  }

  function buildReversePushMissGrid(){
    const miss = RESULT.MISS.reel[0];
    const bell = RESULT.BELL.reel[0];
    const suika = RESULT.SUICA.reel[0];
    return [
      [bell, suika, "BAR"],
      [miss, "7", "7"],
      ["BAR", bell, suika]
    ];
  }

  function goraiZoneName(type=currentGoraiZoneType()){
    return type === "super" ? "超デビルゾーン" : "デビルゾーン";
  }

  function startZoneForResult(result, activeType=currentGoraiZoneType()){
    if(result === "SUPER_DEVIL_ZONE" || result === "BIG") return {games:SUPER_DEVIL_ZONE_GAMES, type:"super"};
    if((result === "DEVIL_ZONE" || result === "MID") && activeType !== "super") return {games:BIG_STOCK_ZONE_GAMES, type:"devil"};
    return {games:0, type:""};
  }

  function isContinuationBattleActive(){
    return !!(session.active && session.phase === "battle" && session.battleRemain > 0);
  }

  function battleRemainText(){
    return `継続バトル残り${Math.max(0, session.battleRemain || 0)}ゲーム`;
  }

  function battleRoundNumber(){
    return clamp(Math.round(Number(session.setNo) || 1), 1, 9);
  }

  function hideBattleIntro(){
    if(battleIntroHideTimer){
      clearTimeout(battleIntroHideTimer);
      battleIntroHideTimer = null;
    }
    if(battleIntroLayer) battleIntroLayer.classList.remove("show");
    setBattleIntroContinueConfirmed(false);
    if(battleIntroLayer) battleIntroLayer.setAttribute("aria-hidden", "true");
  }

  function setSessionResultSignal(signal){
    const activeSignal = signal && signal.src ? signal : null;
    if(sessionResultLayer) sessionResultLayer.classList.toggle("hasSignal", !!activeSignal);
    if(sessionResultSignal){
      sessionResultSignal.hidden = !activeSignal;
      sessionResultSignal.setAttribute("aria-hidden", activeSignal ? "false" : "true");
      if(activeSignal) sessionResultSignal.setAttribute("aria-label", `${activeSignal.label} ${activeSignal.name}`);
      else sessionResultSignal.removeAttribute("aria-label");
    }
    if(sessionResultSignalImage){
      sessionResultSignalImage.src = activeSignal ? activeSignal.src : "";
      sessionResultSignalImage.alt = activeSignal ? `${activeSignal.label} ${activeSignal.name}` : "";
    }
  }

  function hideSessionResultScreen(){
    setSessionResultSignal(null);
    if(session) session.endSignal = null;
    if(sessionResultLayer){
      sessionResultLayer.classList.remove("show");
      sessionResultLayer.setAttribute("aria-hidden", "true");
    }
  }

  function setBattleIntroContinueConfirmed(confirmed){
    if(battleIntroLayer) battleIntroLayer.classList.toggle("continueConfirmed", !!confirmed);
  }

  function showBattleIntro(roundNumber, continueConfirmed=false){
    if(!battleIntroLayer || !battleIntroLogo || !battleIntroCharacter || !battleIntroRound) return;
    const round = clamp(Math.round(Number(roundNumber) || 1), 1, 9);
    const characterSrc = BATTLE_CHARACTER_SRCS[randomInt(0, BATTLE_CHARACTER_SRCS.length - 1)];
    battleIntroLogo.src = BATTLE_INTRO_LOGO_SRC;
    battleIntroRound.src = BATTLE_ROUND_IMAGE_SRCS[round] || BATTLE_ROUND_IMAGE_SRCS[1];
    battleIntroRound.alt = `${round}ラウンド`;
    battleIntroCharacter.src = characterSrc;
    battleIntroCharacter.classList.toggle("right", Math.random() < 0.5);
    setBattleIntroContinueConfirmed(continueConfirmed);
    battleIntroLayer.classList.add("show");
    battleIntroLayer.setAttribute("aria-hidden", "false");
    if(battleIntroHideTimer) clearTimeout(battleIntroHideTimer);
    battleIntroHideTimer = null;
  }

  function ensurePendingBattleOutcome(spin){
    if(!spin || !willEnterBattleAfterCurrentSpin(spin)) return null;
    if(!spin.pendingBattleOutcome){
      spin.pendingBattleOutcome = decideContinuationBattleOutcome(spin);
    }
    return spin.pendingBattleOutcome;
  }

  function willEnterBattleAfterCurrentSpin(spin){
    if(!spin || !session.active || session.phase === "battle") return false;
    if(spin.aTypeBonusActiveAtStart || isATypeBonusActive()) return false;
    if(spin.zoneActiveAtStart || spin.battleActiveAtStart) return false;
    const resolved = spin.resolved || {};
    const nextRemain = (Number(session.remain) || 0) + (Number(resolved.add) || 0) + (Number(resolved.zoneStGames) || 0);
    const nextBigZone = Math.max(0, Number(session.bigZone) || 0, Number(resolved.bigZone) || 0) + (Number(resolved.zoneGameAdd) || 0);
    return nextRemain <= 0 && nextBigZone <= 0;
  }

  function decideContinuationBattleOutcome(spin){
    if(!willEnterBattleAfterCurrentSpin(spin)) return null;
    const resolved = spin.resolved || {};
    const incomingStock = (Number(resolved.sets) || 0) + (Number(resolved.zoneSets) || 0);
    const availableStock = (Number(session.stockSets) || 0) + incomingStock;
    if(availableStock > 0) return {win:true, source:"stock"};
    if(Math.random() < (Number(session.continuationRate) || 0)) return {win:true, source:"rate"};
    return {win:false, source:""};
  }

  function goraiZoneRemainText(count, type=currentGoraiZoneType()){
    return `${goraiZoneName(type)}残り${Math.max(0, count)}ゲーム`;
  }

  function updateGoraiZoneGlow(){
    if(!reelArea) return;
    reelArea.classList.toggle("goraiZoneGlow", isGoraiZoneActive());
    updateDevilZoneFireVideos();
  }

  function ensureDevilZoneFireLayer(index){
    const reel = reels[index];
    if(!reel) return null;
    let layer = reel.querySelector(".devilZoneFireLayer");
    if(!layer){
      layer = document.createElement("div");
      layer.className = "devilZoneFireLayer";
      layer.setAttribute("aria-hidden", "true");
      const video = document.createElement("video");
      video.muted = true;
      video.loop = true;
      video.playsInline = true;
      video.preload = "auto";
      layer.appendChild(video);
      reel.insertBefore(layer, reel.firstChild);
    }
    return { layer, video: layer.querySelector("video") };
  }

  function showDevilZoneFireVideos(){
    reels.forEach((_, index)=>{
      const found = ensureDevilZoneFireLayer(index);
      if(!found) return;
      const { layer, video } = found;
      const wasShown = layer.classList.contains("show");
      video.muted = true;
      video.loop = true;
      video.playsInline = true;
      if(video.getAttribute("src") !== DEVIL_ZONE_FIRE_VIDEO_SRC){
        video.setAttribute("src", DEVIL_ZONE_FIRE_VIDEO_SRC);
        video.load();
      }
      if(!wasShown){
        try{ video.currentTime = 0; }catch(e){}
      }
      layer.classList.add("show");
      layer.setAttribute("aria-hidden", "false");
      if(video.paused || video.ended){
        try{
          const p = video.play();
          if(p && typeof p.catch === "function") p.catch(()=>{});
        }catch(e){}
      }
    });
  }

  function hideDevilZoneFireVideos(){
    reels.forEach(reel=>{
      const layer = reel.querySelector(".devilZoneFireLayer");
      if(!layer) return;
      const video = layer.querySelector("video");
      layer.classList.remove("show");
      layer.setAttribute("aria-hidden", "true");
      if(video){
        try{ video.pause(); }catch(e){}
      }
    });
  }

  function shouldShowDevilZoneFireVideos(){
    const highNormal = !session.active && isHighMode();
    return !debugFastSpinActive && (isGoraiZoneActive() || highNormal);
  }

  function updateDevilZoneFireVideos(){
    if(shouldShowDevilZoneFireVideos()){
      showDevilZoneFireVideos();
    }else{
      hideDevilZoneFireVideos();
    }
  }

  function isPremiumBigConfirmStopLocked(){
    return !!(
      premiumBigConfirmStopLock &&
      isSpinning &&
      currentSpin &&
      currentSpin.premiumBigConfirmMovieEffect &&
      Array.isArray(currentSpin.stopped) &&
      !currentSpin.stopped.every(Boolean)
    );
  }

  function releasePremiumBigConfirmStopLock(){
    if(premiumBigConfirmStopLockTimer){
      clearTimeout(premiumBigConfirmStopLockTimer);
      premiumBigConfirmStopLockTimer = null;
    }
    if(!premiumBigConfirmStopLock) return;
    premiumBigConfirmStopLock = false;
    if(isSpinning && spinCanStop && currentSpin && Array.isArray(currentSpin.stopped) && !currentSpin.stopped.every(Boolean)){
      if($("resultText")) $("resultText").textContent = "フリーズ告知終了 / 停止できます";
    }
    syncCabinetControlState();
    updateAutoUi();
  }

  function updatePremiumBigReelMovie(){
    if(A_TYPE_MODE){const layer=$('premiumBigReelMovie');if(layer){layer.classList.remove('show');layer.setAttribute('aria-hidden','true');const video=layer.querySelector('video');if(video){video.pause();video.removeAttribute('src');}}return;}
  }

  function playPremiumBigConfirmMovie(){
    if(A_TYPE_MODE){showOverlay('FREEZE — BIG'+NovaArt.bonusTarget()+'pt ＋ AT ＋ 特化ゾーン');showMessage('FREEZE','BIG'+NovaArt.bonusTarget()+'pt・AT確定／ギル・空・逢魔を各1/3');return true;}
  }

  function startPremiumBigConfirmBarAimIfNeeded(normalActiveAtSpinStart){
    if(!normalActiveAtSpinStart || !premiumBigConfirmMovieHold || !normalState.bonusPending) return false;
    if(!(normalState.premiumBonus || normalState.oneGameRenBonus) || normalState.bonusKind === "MID") return false;
    premiumBigConfirmMovieHold = false;
    premiumBigConfirmMovieTranslucent = false;
    premiumBigConfirmSilence = false;
    releasePremiumBigConfirmStopLock();
    const layer = $("premiumBigReelMovie");
    const video = layer ? layer.querySelector("video") : null;
    if(video){
      video.muted = true;
      try{ video.pause(); }catch(e){}
    }
    updatePremiumBigReelMovie();
    playOneShotSound(BAR_AIM_VOICE_SRC, voiceOutputVolume(CONFIRM_SOUND_OUTPUT_SCALE), {allowDuringPremiumConfirm:true});
    return true;
  }

  function clearPremiumBigConfirmMovie(){
    premiumBigConfirmMovieHold = false;
    premiumBigConfirmMovieTranslucent = false;
    premiumBigConfirmSilence = false;
    releasePremiumBigConfirmStopLock();
  }

  function ensureReelVideo(index){
    const reel = reels[index];
    if(!reel) return null;
    let layer = reel.querySelector(".reelVideoLayer");
    if(!layer){
      layer = document.createElement("div");
      layer.className = "reelVideoLayer";
      layer.setAttribute("aria-hidden", "true");
      const video = document.createElement("video");
      video.muted = true;
      video.playsInline = true;
      video.preload = "auto";
      layer.appendChild(video);
      reel.appendChild(layer);
    }
    return {layer, video:layer.querySelector("video")};
  }

  const reelVideoTimers = [null, null, null];

  function hideReelVideo(index){
    const found = ensureReelVideo(index);
    if(!found) return;
    const {layer, video} = found;
    if(reelVideoTimers[index]){
      clearTimeout(reelVideoTimers[index]);
      reelVideoTimers[index] = null;
    }
    video.onended = null;
    try{ video.pause(); }catch(e){}
    layer.classList.remove("show", "stopVideo");
  }

  function ensureBellZakoLayer(){
    if(!reelArea) return null;
    if(bellZakoLayer) return bellZakoLayer;
    bellZakoLayer = document.createElement("div");
    bellZakoLayer.className = "bellZakoLayer";
    bellZakoLayer.setAttribute("aria-hidden", "true");
    for(let i=0;i<3;i++){
      const panel = document.createElement("div");
      panel.className = "bellZakoPanel";
      panel.dataset.index = String(i);
      const video = document.createElement("video");
      video.muted = true;
      video.playsInline = true;
      video.preload = "auto";
      panel.appendChild(video);
      bellZakoLayer.appendChild(panel);
    }
    reelArea.appendChild(bellZakoLayer);
    return bellZakoLayer;
  }

  function bellZakoPanel(index){
    const layer = ensureBellZakoLayer();
    if(!layer) return null;
    return layer.querySelector(`.bellZakoPanel[data-index="${index}"]`);
  }

  function hideBellZakoPanel(index){
    const panel = bellZakoPanel(index);
    if(!panel) return;
    if(bellZakoTimers[index]){
      clearTimeout(bellZakoTimers[index]);
      bellZakoTimers[index] = null;
    }
    const video = panel.querySelector("video");
    if(video){
      video.onended = null;
      try{ video.pause(); }catch(e){}
    }
    panel.classList.remove("show", "stopVideo");
    if(bellZakoLayer && !bellZakoLayer.querySelector(".bellZakoPanel.show")){
      bellZakoLayer.classList.remove("show");
    }
  }

  function clearBellZakoVideos(){
    stopBellReadyVideoKeepAlive();
    [0,1,2].forEach(hideBellZakoPanel);
    if(bellZakoLayer) bellZakoLayer.classList.remove("show");
  }

  function shouldKeepReversePushGuide(){
    return !!(session.active && isGoraiZoneActive());
  }

  function clearReelVideos(options={}){
    const forceReversePush = !!(options && options.forceReversePush);
    clearBellZakoVideos();
    [0,1,2].forEach(hideReelVideo);
    if(forceReversePush || !shouldKeepReversePushGuide()){
      hideReversePushGuide();
    }
  }

  function playBellZakoVideo(index, src, loop=true){
    if(speedModeVisualsSuppressed()) return false;
    const panel = bellZakoPanel(index);
    if(!panel || !src) return false;
    const video = panel.querySelector("video");
    if(!video) return false;
    const srcChanged = video.getAttribute("src") !== src;
    const alreadyPlayingReady = !srcChanged && loop && panel.classList.contains("show") && !video.paused && !video.ended;
    if(srcChanged){
      video.setAttribute("src", src);
      video.load();
    }
    video.loop = !!loop;
    video.muted = true;
    video.playsInline = true;
    video.onended = null;
    panel.classList.toggle("stopVideo", !loop);
    panel.classList.add("show");
    if(bellZakoLayer) bellZakoLayer.classList.add("show");
    if(alreadyPlayingReady) return true;
    try{
      if(srcChanged || !loop || video.ended){
        video.currentTime = 0;
      }
      const p = video.play();
      if(p && typeof p.catch === "function"){
        p.catch(()=>{});
      }
    }catch(e){}
    return true;
  }

  function stopBellReadyVideoKeepAlive(){
    if(bellReadyVideoKeepAliveTimer){
      clearInterval(bellReadyVideoKeepAliveTimer);
      bellReadyVideoKeepAliveTimer = null;
    }
  }

  function shouldKeepBellReadyVideo(index){
    return isSpinning && currentSpin && currentSpin.zakoEffectActive && !currentSpin.effectsSkipped && !currentSpin.stopped[index];
  }

  function keepBellReadyVideoVisible(index){
    if(!shouldKeepBellReadyVideo(index)) return false;
    return playBellZakoVideo(index, BELL_REEL_READY_VIDEO_SRC, true);
  }

  function startBellReelReadyVideos(){
    stopBellReadyVideoKeepAlive();
    ensureBellZakoLayer();
    [0,1,2].forEach(index=>keepBellReadyVideoVisible(index));
    bellReadyVideoKeepAliveTimer = setInterval(()=>{
      if(!currentSpin || !currentSpin.zakoEffectActive || !isSpinning){
        stopBellReadyVideoKeepAlive();
        return;
      }
      [0,1,2].forEach(index=>keepBellReadyVideoVisible(index));
    }, 650);
  }

  function playBellReelStopVideo(index){
    if(!currentSpin || !currentSpin.zakoEffectActive || currentSpin.effectsSkipped) return;
    if(bellZakoTimers[index]){
      clearTimeout(bellZakoTimers[index]);
      bellZakoTimers[index] = null;
    }
    playBellZakoVideo(index, BELL_REEL_STOP_VIDEO_SRC, false);
    const panel = bellZakoPanel(index);
    const video = panel ? panel.querySelector("video") : null;
    if(video) video.onended = ()=>hideBellZakoPanel(index);
    bellZakoTimers[index] = setTimeout(()=>hideBellZakoPanel(index), 1800);
  }

  function decideZakoEffect(result, resolved, normalActiveAtStart){
    if(A_TYPE_MODE) return {active:false, bell:false, add:false};
  }

  function isRogiHighZoneSpin(spin=currentSpin){
    return !!(
      spin &&
      spin.normalActiveAtStart &&
      !spin.speedModeAtStart &&
      spin.resolved &&
      spin.resolved.highAtStart &&
      !spin.resolved.bonusPendingAtStart &&
      !spin.effectsSkipped &&
      !spin.gekiatsu &&
      !spin.bar3LeverEffect
    );
  }

  function shouldPlaySpeedModeBonusRogi(result, resolved){
    if(A_TYPE_MODE) return false;
  }

  function isBigPremiumEffectEligible(result, resolved){
    if(result === "BIG" || result === "SUPER_DEVIL_ZONE") return true;
    if(!resolved) return false;
    if(resolved.bonusReady) return true;
    return !!(
      resolved.bonusHit &&
      (resolved.bonusKind || "BIG") !== "MID"
    );
  }

  function decideBigPremiumEffect(result, resolved, premiumForced=false){
    if(resolved?.zoneSpin)return false;
    // The Super NOVA branch has already drawn its exclusive 1:1 outcome.
    if(resolved?.superNovaOutcome) return resolved.superNovaOutcome === "FREEZE";
    if(!isBigPremiumEffectEligible(result, resolved)) return false;
    if(A_TYPE_MODE && resolved && resolved.bonusPendingAtStart) return !!resolved.premiumBonus;
    return !!premiumForced || (!A_TYPE_MODE && Math.random() < GEKIATSU_CHANCE_ON_BIG);
  }

  function isAtFirstHitForAuto(resolved){
    if(A_TYPE_MODE) return false;
  }

  function decideRogiStopEffectMax(spin=currentSpin){
    if(A_TYPE_MODE) return 0;
  }

  function shouldPlayRogiStopEffect(stopOrder, spin=currentSpin){
    if(!isRogiHighZoneSpin(spin)) return false;
    const maxStopOrder = Number(spin.rogiStopEffectMax) || 0;
    if(stopOrder > maxStopOrder) return false;
    const src = ROGI_STOP_VIDEO_SRCS[stopOrder];
    return !!src;
  }

  function shouldBlackoutRogiContinuationStop(stopOrder, spin=currentSpin){
    if(!isRogiHighZoneSpin(spin)) return false;
    if(!spin.rogiStopEffectStarted || spin.rogiBlackoutShown || stopOrder <= 1) return false;
    const maxStopOrder = Number(spin.rogiStopEffectMax) || 0;
    const hasStopVideo = !!ROGI_STOP_VIDEO_SRCS[stopOrder];
    return stopOrder > maxStopOrder || (stopOrder <= maxStopOrder && !hasStopVideo);
  }

  function shouldBlackoutReversePushMissStop(stopOrder, spin=currentSpin){
    return !!(isReversePushGuidedMiss(spin) && stopOrder === 3 && !spin.reversePushMissBlackoutShown);
  }

  function hideRogiContinuationBlackout(){
    if(rogiBlackoutTimer){
      clearTimeout(rogiBlackoutTimer);
      rogiBlackoutTimer = null;
    }
    if(rogiBlackoutLayer){
      rogiBlackoutLayer.classList.remove("show");
      rogiBlackoutLayer.setAttribute("aria-hidden", "true");
    }
  }

  function flashRogiContinuationBlackout(){
    if(!rogiBlackoutLayer) return;
    if(rogiBlackoutTimer){
      clearTimeout(rogiBlackoutTimer);
      rogiBlackoutTimer = null;
    }
    rogiBlackoutLayer.classList.remove("show");
    void rogiBlackoutLayer.offsetWidth;
    rogiBlackoutLayer.classList.add("show");
    rogiBlackoutLayer.setAttribute("aria-hidden", "false");
    rogiBlackoutTimer = setTimeout(()=>hideRogiContinuationBlackout(), 620);
  }

  function stopRogiStopEffect(immediate=true){
    restoreBgmAfterRogiStopEffect();
    if(immediate) stopGekiatsuEffect(true);
    else fadeOutGekiatsuEffect();
  }

  function playRogiStopEffect(stopOrder){
    if(!shouldPlayRogiStopEffect(stopOrder)) return false;
    const src = ROGI_STOP_VIDEO_SRCS[stopOrder];
    muteBgmForRogiStopEffect();
    const holdThirdStop = stopOrder === 3;
    startGekiatsuEffect(false, src, `ROGI ${stopOrder}`, {
      muted:false,
      solid:holdThirdStop,
      volumeScale:ROGI_MOVIE_OUTPUT_SCALE,
      volumeGroup:"rogi",
      holdUntilBet:holdThirdStop
    });
    if(holdThirdStop) startRogiThirdStopHold();
    if(currentSpin){
      currentSpin.rogiStopEffectStarted = true;
      currentSpin.rogiLastStopEffectOrder = stopOrder;
    }
    return true;
  }

  function clamp(n,min,max){ return Math.max(min, Math.min(max,n)); }

  function volumePercentFromValue(value){
    const raw = Number(value);
    const normalized = Number.isFinite(raw) ? clamp(raw, 0, 1) : 0;
    return Math.round(normalized * 100);
  }

  function syncVolumeNumberInput(rangeId, numberId){
    const range = $(rangeId);
    const number = $(numberId);
    if(!range || !number) return;
    number.value = String(volumePercentFromValue(range.value));
  }

  function syncAllVolumeNumberInputs(){
    AUDIO_VOLUME_FIELDS.forEach(({rangeId, numberId})=>syncVolumeNumberInput(rangeId, numberId));
  }

  function syncVolumeRangeFromNumber(numberId){
    const field = AUDIO_VOLUME_FIELDS.find(item=>item.numberId === numberId);
    if(!field) return false;
    const number = $(field.numberId);
    const range = $(field.rangeId);
    if(!number || !range) return false;
    const raw = String(number.value || "").trim();
    if(raw === "") return false;
    const percent = Math.round(clamp(Number(raw) || 0, 0, 100));
    number.value = String(percent);
    range.value = (percent / 100).toFixed(2);
    return true;
  }

  function targetRtpText(settingNo = settings.setting){
    if(A_TYPE_MODE && !NovaBalance.usesStandardSettings(settings))return "未試算（独自設定）";
    if(A_TYPE_MODE){const profile=NovaBalance.profile(settingNo);return profile.verifiedModel?((profile.measuredRtp??profile.target)*100).toFixed(2)+`%（CZ・初期pt調整版・3万G×${profile.trials}回・停止込み推定）`:"未集計（変更前"+((profile.measuredRtp??profile.target)*100).toFixed(1)+"%）";}
  }

  function refreshRtpViews(){
    for(const id of ['targetRtpView','targetRtpViewLegacy','adminTargetRtpView']){
      if($(id))$(id).textContent=targetRtpText();
    }
    for(const n of [1,2,3,4,5,6]){
      const option=document.querySelector(`#settingSelect option[value="${n}"]`);
      if(option)option.textContent=`設定${n} / ${targetRtpText(n)}`;
    }
  }

  function rewardFor(result){
    return ROLE_PAYOUTS[result] || 0;
  }

  function isCherryResult(result){
    return result === "CHERRY_ANY" || result === "CHERRY_DOUBLE" || result === "CHERRY_TRIPLE" || result === "MID_CHERRY";
  }

  function isCollectibleCherryResult(result){
    return result === "CHERRY_ANY" || result === "CHERRY_DOUBLE" || result === "CHERRY_TRIPLE";
  }

  function aTypeCherryPayoutForLine(lineRow=1){
    return lineRow === 1 ? 1 : 2;
  }

  function normalRewardFor(result, lineRow=1){
    if(A_TYPE_MODE && result==="REPLAY")return 0;
    if(isNovaResult(result) || result === "CZ" || result === "STRONG_CZ") return 0;
    if(A_TYPE_MODE && NovaNormal.rare[result]) return NovaNormal.pay(result);
    if(A_TYPE_MODE && (result === "BIG" || result === "MID")) return 0;
    if(A_TYPE_MODE && isCherryResult(result)) return aTypeCherryPayoutForLine(lineRow);
    if(A_TYPE_MODE && A_TYPE_PAYOUTS[result]) return A_TYPE_PAYOUTS[result];
    return NORMAL_ROLE_PAYOUTS[result] || 0;
  }

  function normalizeATypeResult(result){
    if(A_TYPE_MODE && ['MID','MID_CHERRY','REG','RB'].includes(result))return 'BIG';
    if(isNovaResult(result) || result === "CZ" || result === "STRONG_CZ") return result;
    if(result === "NEBULA" || NovaNormal.rare[result])return result;
    if(result === "GRAPE") return "BELL";
    return ["MISS","BIG","MID","BELL","BELL15","REPLAY","BAR3"].includes(result) ? result : "MISS";
  }

  function normalizeForceResult(result){
    if(result==='STRONG_SUICA')return 'WEAK_SUICA';
    if(result==='CHANCE_A'||result==='CHANCE_B')return 'MISS';
    if(result === "BONUS_SPECIAL")return "NEBULA";
    if(result==='BURST')return '';
    if(result==='FREEZE'||result==='ART'||result==='COMEBACK'||result==='URA_CHALLENGE'||result==='RARE'||result.startsWith('ZONE_'))return result;
    if(result === "REACH_ME") return "REACH_ME";
    return A_TYPE_MODE && result ? normalizeATypeResult(result) : result;
  }

  function forceResultName(result){

    if(result === "URA_CHALLENGE")return "上位ATチャレンジ（10G・HOLDあり）";
    if(result === "COMEBACK")return "引き戻しゾーン（5G）";
    if(result === "FREEZE")return "フリーズ";
    if(result === "REACH_ME") return "リーチ目";
    return RESULT[result]?.name || "";
  }

  function takeForcedResult(){
    // Keep the one-shot challenge queued until a pending/active BIG has finished.
    if(forceResult==='URA_CHALLENGE' && A_TYPE_MODE && (isATypeBonusActive() || normalState.bonusPending))return '';
    const result=forceResult;
    forceResult='';
    return result;
  }

  function forcedBurstStep(flow){
    const base=flow?.phase==='art'?NovaArt.normalize(flow):NovaArt.enter({...settings.novaArt,setting:settings.setting});
    const waiting=!!(base.zone || base.entryStage),name=NovaArt.challengeName();
    return {result:'MISS',zoneSpin:true,
      flow:{...base,comebackLeft:0,comebackLamp:'',burstVersion:NovaArt.burstRules.version,burstType:'ura',burstUsed:true,burstPending:true,burstLeft:0,burstWon:false,researchChallengeActive:false,researchChallengeSource:'rare',researchAim:''},
      message:waiting?name+'予約！ 特化ゾーン終了後に開始':name+'突入！ 残り10G / 成功期待度65%'};
  }

  function normalizeATypeBonusKind(kind){
    if(A_TYPE_MODE)return 'BIG';
  }

  function aTypeBonusLabel(kind=session.bonusKind, premium=(session.premiumBonus || session.oneGameRenBonus)){
    if(A_TYPE_MODE)return isATypeBonusActive()?NovaArt.bonusLabel(session.bonusTier):'BIG';
  }

  function aTypeBonusTarget(kind=session.bonusKind, premium=(session.premiumBonus || session.oneGameRenBonus)){
    if(A_TYPE_MODE)return NovaArt.bonusTarget(normalizeATypeBonusKind(kind));
  }

  function isATypeBonusActive(){
    return !!(A_TYPE_MODE && session.active && session.phase === "a_type_bonus");
  }

  function aTypeBonusNet(){
    return Math.max(0, Number(session.paid) || 0);
  }

  function aTypeBonusRemainingNet(){
    return Math.max(0, (Number(session.bonusTarget) || aTypeBonusTarget()) - aTypeBonusNet());
  }

  function isATypeBonusComplete(){
    return isATypeBonusActive() && (Number(session.paid)||0)>=aTypeBonusTarget();
  }

  function drawATypeBonusResult(){
    if(pendingForceResult === "NEBULA")return "NEBULA";
    if(isNovaResult(pendingForceResult)) return pendingForceResult;
    if(NovaNormal.rare[pendingForceResult]||['BELL','REPLAY','MISS'].includes(pendingForceResult))return pendingForceResult;
    return NovaArt.drawBonus(Math.random,settings.setting,session.bonusTier,NovaArt.bonusStockEligible(session,normalState.flow));
  }

  function resolveATypeBonusOutcome(result){
    const special=result === "NEBULA";
    const reward = !isATypeBonusComplete() ? NovaArt.bonusPayout(session,result) : 0;
    return {
      aim:NovaArt.bonusAim(result,Math.random,settings.setting,NovaArt.bonusStockEligible(session,normalState.flow)),
      reward,
      add:0,
      sets:0,
      bigZone:0,
      bigZoneType:"",
      zoneGame:false,
      zoneType:"",
      zoneSets:0,
      zoneStGames:0,
      zoneGameAdd:0,
      zoneSevenHit:false,
      artSetWon:special && !isATypeBonusComplete()?1:0,
      novaRushConfirmed:special&&!isATypeBonusComplete()&&!NovaArt.bonusStockEligible(session,normalState.flow),
      aTypeBonusGame:true,
      initialBonusGame:normalState.flow?.phase!=='art'
    };
  }

  function randomInt(min, max){
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  function stAddFor(result){
    return 0;
  }

  function setGameCount(){
    return clamp(Number(settings.stSpins) || 10, 1, 100);
  }

  function formatRate(rate){
    return Math.round((Number(rate) || 0) * 100) + "%";
  }

  function stGameAddTextFor(result, amount){
    const value = Math.max(0, Number(amount) || 0);
    if(value <= 0) return "";
    return `${result === "SMALL" ? "AT" : "AT"}+${value}G`;
  }

  function atSetStockRateFor(result, settingNo = settings.setting){
    const table = AT_SET_STOCK_RATES_BY_SETTING[result];
    return table ? Number(table[settingNo] ?? table[1]) || 0 : 0;
  }

  function stockSetsForResult(result, settingNo = settings.setting){
    if(result === "BAR3") return 5;
    return Math.random() < atSetStockRateFor(result, settingNo) ? 1 : 0;
  }

  function revivalRateForResult(result){
    if(result === "BAR3" || result === "CHERRY_TRIPLE") return 1.0;
    if(result === "CHERRY_DOUBLE") return 0.50;
    if(result === "SUICA") return 0.33;
    if(result === "CHERRY_ANY") return 0.25;
    return 0;
  }

  function eventWeights(settingNo = settings.setting){
    return (SETTING_PROFILE[settingNo] || SETTING_PROFILE[1]).weights;
  }

  function hitProbability(settingNo = settings.setting){
    const baseP = GORAI_HIT_RATE[settingNo] ?? GORAI_HIT_RATE[1];
    return clamp(baseP * settings.oddsMultiplier, 0, 0.98);
  }

  function isHighMode(){
    return (Number(normalState.highRemain) || 0) > 0;
  }

  function normalizeNovaRisingRemain(value){
    return clamp(Math.floor(Number(value) || 0), 0, NOVA_RISING_GAMES);
  }

  function isNovaRisingMode(){
    return false; // Replaced by CZ -> bonus -> RT flow.
  }

  function pickNovaRisingRemainAfterBonus(){
    return 0;
  }

  function normalModeLabel(){
    if(normalState.bonusPending) return normalState.prepLeft>0?"ボーナス準備中 残り"+normalState.prepLeft+"G":"7を狙え";
    if(normalState.internal?.prelude?.presentation==='reel'&&['normal','cz','strong_cz'].includes(normalState.flow?.phase)&&!(isSpinning&&currentSpin?.resolved?.czPrelude?.announce))return 'CZ前兆';
    return normalState.flow?.phase==='normal'?NovaNormal.normalLabel(normalState.internal):NovaFlow.label(normalState.flow);
  }

  function pendingBonusLabel(){
    if(normalState.bonusKind === "MID") return "REG";
    if(normalState.bonusKind === "BAR3") return "BAR";

    return "777";
  }

  function pendingBonusWaitDone(){
    return (Number(normalState.bonusWaitGames) || 0) >= 1;
  }

  function isChanceLampLit(){
    const lamp = $("stLamp");
    return !!(jagChanceHold || bonusConfirmBgmHold || (lamp && lamp.classList.contains("on")));
  }

  function isPendingSevenBonusBet(){
    return !!(
      !session.active &&
      normalState.bonusPending &&
      pendingBonusWaitDone() &&
      normalState.bonusKind !== "MID" &&
      normalState.bonusKind !== "BAR3" &&
      !normalState.premiumBonus &&
      !normalState.oneGameRenBonus
    );
  }

  function triggerBonusConfirmBetSoundIfNeeded(){
    if(A_TYPE_MODE && normalState.bonusPending){
      if(!normalState.prepConfirmed){normalState.prepConfirmed=true;playOneShotSound('assets/media/nova/bonus_confirm.wav',voiceOutputVolume(),{allowDuringPremiumConfirm:true});}
      else if(!(normalState.prepLeft>0))playRandomAimVoice('seven');
      return true;
    }
    if(!isPendingSevenBonusBet()) return false;
    bonusConfirmBgmHold = true;
    pauseNormalBgm();
    return true;
  }

  function decideBonusAnnouncementTiming(){
    if(Math.random() < BONUS_ANNOUNCE_THIRD_STOP_RATE) return "stop3";
    return BONUS_ANNOUNCE_EARLY_TIMINGS[Math.floor(Math.random() * BONUS_ANNOUNCE_EARLY_TIMINGS.length)];
  }

  function shouldScheduleBonusAnnouncement(normalActiveAtSpinStart, resolved){
    if(!normalActiveAtSpinStart || !resolved || resolved.bonusPendingAtStart) return false;
    return !!(
      resolved.aTypeBonusReady ||
      resolved.bonusHit ||
      resolved.bonusReady ||
      resolved.regReady ||
      resolved.bar3PremiumReady
    );
  }

  function bonusAnnouncementTimingLabel(timing){
    return timing === "lever" ? "レバーオン"
      : timing === "stop1" ? "第1停止"
      : timing === "stop2" ? "第2停止"
      : timing === "stop3" ? "第3停止"
      : timing || "";
  }

  function lightBonusAnnouncement(spin=currentSpin, timing=""){
    if(!spin || spin.bonusAnnouncementLit) return false;
    spin.bonusAnnouncementLit = true;
    jagChanceHold = true;
    const lamp = $("stLamp");
    if(lamp) lamp.classList.add("on");
    playPekaSound(isBigLampAnnouncement(spin));
    updateDisplay();
    if(timing){
      log(`BONUS告知：${bonusAnnouncementTimingLabel(timing)}`);
    }
    return true;
  }

  function maybeLightBonusAnnouncementForStop(stopOrder, spin=currentSpin){
    if(!spin || !spin.bonusAnnouncementTiming) return false;
    const timing = `stop${stopOrder}`;
    if(spin.bonusAnnouncementTiming !== timing) return false;
    return lightBonusAnnouncement(spin, timing);
  }

  function isBigLampAnnouncement(spin=currentSpin){
    const resolved = spin && spin.resolved ? spin.resolved : null;
    if(resolved){
      if(resolved.bonusKind === "MID" || resolved.regReady) return false;
      if(resolved.bonusKind === "BIG" || resolved.bonusReady || resolved.bar3PremiumReady) return true;
      if(resolved.bonusHit && (resolved.bonusKind || "BIG") !== "MID") return true;
      if(resolved.aTypeBonusReady && (resolved.bonusKind || "BIG") !== "MID") return true;
    }
    if(normalState.bonusPending) return normalState.bonusKind !== "MID";
    return false;
  }

  function showBonusConfirmScreen(mode="solid"){
    if(!bonusConfirmLayer) return;
    bonusConfirmLayer.classList.toggle("translucent", mode === "translucent");
    bonusConfirmLayer.classList.add("show");
    bonusConfirmLayer.setAttribute("aria-hidden", "false");
  }

  function hideBonusConfirmScreen(){
    if(!bonusConfirmLayer) return;
    bonusConfirmLayer.classList.remove("show", "translucent");
    bonusConfirmLayer.setAttribute("aria-hidden", "true");
  }

  function devilZoneConfirmImageFor(type=currentGoraiZoneType()){
    return type === "super" ? SUPER_DEVIL_ZONE_CONFIRM_IMAGE_SRC : DEVIL_ZONE_CONFIRM_IMAGE_SRC;
  }

  function devilZoneConfirmTypeForResult(result){
    if(result === "SUPER_DEVIL_ZONE" || result === "BIG") return "super";
    if(result === "DEVIL_ZONE" || result === "MID") return "devil";
    return "";
  }

  function showDevilZoneConfirmScreen(mode="translucent", type=currentGoraiZoneType()){
    if(!devilZoneConfirmLayer) return;
    const image = devilZoneConfirmLayer.querySelector("img");
    const src = devilZoneConfirmImageFor(type);
    if(image && image.getAttribute("src") !== src){
      image.setAttribute("src", src);
    }
    devilZoneConfirmLayer.classList.toggle("translucent", mode === "translucent");
    devilZoneConfirmLayer.classList.remove("fading");
    devilZoneConfirmLayer.classList.add("show");
    devilZoneConfirmLayer.setAttribute("aria-hidden", "false");
  }

  function hideDevilZoneConfirmScreen(){
    if(!devilZoneConfirmLayer) return;
    devilZoneConfirmLayer.classList.remove("show", "translucent", "fading");
    devilZoneConfirmLayer.setAttribute("aria-hidden", "true");
  }

  function fadeOutDevilZoneConfirmScreen(){
    if(!devilZoneConfirmLayer || !devilZoneConfirmLayer.classList.contains("show")) return;
    devilZoneConfirmLayer.classList.add("fading");
    devilZoneConfirmLayer.setAttribute("aria-hidden", "true");
    setTimeout(()=>{
      if(devilZoneConfirmLayer && devilZoneConfirmLayer.classList.contains("fading")){
        hideDevilZoneConfirmScreen();
      }
    }, 620);
  }

  function showReversePushGuide(color){
    if(!reversePushGuideLayer || !REVERSE_PUSH_GUIDE_IMAGE_SRCS[color]) return;
    const image = reversePushGuideLayer.querySelector("img");
    const src = REVERSE_PUSH_GUIDE_IMAGE_SRCS[color];
    if(image && image.getAttribute("src") !== src){
      image.setAttribute("src", src);
    }
    reversePushGuideLayer.classList.remove("fading", "translucent");
    reversePushGuideLayer.classList.add("show");
    reversePushGuideLayer.setAttribute("aria-hidden", "false");
  }

  function hideReversePushGuide(){
    if(!reversePushGuideLayer) return;
    reversePushGuideLayer.classList.remove("show", "fading", "translucent");
    reversePushGuideLayer.setAttribute("aria-hidden", "true");
  }

  function setReversePushGuideTranslucent(){
    if(!reversePushGuideLayer || !reversePushGuideLayer.classList.contains("show")) return;
    reversePushGuideLayer.classList.add("translucent");
  }

  function fadeOutReversePushGuide(){
    if(!reversePushGuideLayer || !reversePushGuideLayer.classList.contains("show")) return;
    reversePushGuideLayer.classList.add("fading");
    reversePushGuideLayer.setAttribute("aria-hidden", "true");
    setTimeout(()=>{
      if(reversePushGuideLayer && reversePushGuideLayer.classList.contains("fading")){
        hideReversePushGuide();
      }
    }, 420);
  }

  function queueDevilRushEntryEffect(type){
    if(DEVIL_RUSH_ENTRY_IMAGE_SRCS[type]) pendingDevilRushEntryEffect = type;
  }

  function consumeDevilRushEntryEffect(){
    const type = pendingDevilRushEntryEffect;
    pendingDevilRushEntryEffect = "";
    return DEVIL_RUSH_ENTRY_IMAGE_SRCS[type] ? type : "";
  }

  function clearDevilRushEntryEffect(){
    pendingDevilRushEntryEffect = "";
    hideDevilRushEntryEffect();
  }

  function showDevilRushEntryEffect(type){
    if(!devilRushEntryLayer || !devilRushEntryImage || !DEVIL_RUSH_ENTRY_IMAGE_SRCS[type]) return;
    const src = DEVIL_RUSH_ENTRY_IMAGE_SRCS[type];
    if(devilRushEntryImage.getAttribute("src") !== src){
      devilRushEntryImage.setAttribute("src", src);
    }
    devilRushEntryLayer.classList.remove("translucent");
    devilRushEntryLayer.classList.add("show");
    devilRushEntryLayer.setAttribute("aria-hidden", "false");
  }

  function hideDevilRushEntryEffect(){
    if(!devilRushEntryLayer) return;
    devilRushEntryLayer.classList.remove("show", "translucent");
    devilRushEntryLayer.setAttribute("aria-hidden", "true");
  }

  function setDevilRushEntryEffectTranslucent(){
    if(!devilRushEntryLayer || !devilRushEntryLayer.classList.contains("show")) return;
    devilRushEntryLayer.classList.add("translucent");
  }

  function shouldFadeReversePushAtZoneEnd(spin=currentSpin){
    if(!spin || !spin.zoneActiveAtStart || !spin.resolved) return false;
    const currentZoneRemain = Math.max(0, Number(session.bigZone) || 0);
    const zoneGameAdd = Math.max(0, Number(spin.resolved.zoneGameAdd) || 0);
    const restartZone = Math.max(0, Number(spin.resolved.bigZone) || 0);
    const nextZoneRemain = Math.max(0, currentZoneRemain - 1, restartZone) + zoneGameAdd;
    return nextZoneRemain <= 0;
  }

  function shouldStartDevilZoneConfirmIntro(result, resolved){
    const entryType = devilZoneConfirmTypeForResult(result);
    return !!(
      entryType &&
      session.active &&
      resolved &&
      !resolved.zoneGame &&
      Number(resolved.bigZone) > 0
    );
  }

  function syncDevilZoneConfirmScreen(){
    if(!session.active || session.phase === "battle" || !isGoraiZoneActive()){
      devilZoneConfirmIntroPending = false;
      hideDevilZoneConfirmScreen();
      return;
    }
    showDevilZoneConfirmScreen(devilZoneConfirmIntroPending ? "solid" : "translucent");
  }

  function currentNormalCeilingGames(){
    return NovaNormal.ceiling(normalState.internal);
  }

  function normalizeBonusAfterGames(value){
    return Math.max(0, Math.floor(Number(value) || 0));
  }

  function nextBonusAfterGames(value=normalState.sinceBonus){
    return normalizeBonusAfterGames(value) + 1;
  }

  function ceilingRemain(){
    return Math.max(0, currentNormalCeilingGames() - normalizeBonusAfterGames(normalState.sinceBonus));
  }

  function resetNormalCountersAfterArt(before,after){
    if(before?.phase!=='art'||after?.phase!=='normal')return;
    normalState.internal=NovaNormal.afterArt(normalState.internal,before,after,{...settings.novaNormal,setting:settings.setting});
    normalState.sinceBonus=0;
  }

  function resetNormalModeAfterBonus(){
    pendingATypeInternalBonus = null;
    bonusConfirmBgmHold = false;
    normalState.mode = "normal";
    normalState.highRemain = 0;
    normalState.sinceBonus = 0;
    normalState.bonusPending = false;
    normalState.bonusKind = "";
    normalState.bonusSource = "";
    normalState.premiumBonus = false;
    normalState.oneGameRenBonus = false;
    normalState.bonusWaitGames = 0;
    normalState.bonusHitGamesSince = 0;
    normalState.reachMePending = false;
    normalState.reachMeBonusKind = "";
    normalState.reachMeBonusSource = "";
    normalState.reachMeHitGamesSince = 0;
    normalState.morningCeilingActive = false;
    hideBonusConfirmScreen();
  }

  function chargeSpinCost(){
    clearCzReelBlackout();
    if(!session.active && normalState.flow?.phase==='art' && normalState.flow.zero)return;
    if(A_TYPE_MODE && normalState.replayFree){normalState.replayFree=false;return;}
    stats.totalFee = (Number(stats.totalFee) || 0) + SPIN_COST;
    if(session.active){
      session.cost = (Number(session.cost) || 0) + SPIN_COST;
    }
    recordSlumpPoint(false);
    updateCompleteTrialState("BET");
  }

  function countRoleStat(result, includeBonus=false){
    if(A_TYPE_MODE && NovaNormal.rare[result]){
      stats.novaRareCounts=stats.novaRareCounts||{};
      stats.novaRareCounts[result]=(Number(stats.novaRareCounts[result])||0)+1;
    }
    if(includeBonus && (result === "BIG" || result === "BAR3")){
      stats.bigCount++;
      if(result === "BAR3"){
        stats.premiumBigCount = (Number(stats.premiumBigCount) || 0) + 1;
      }
    }else if(includeBonus && (result === "MID" || result === "MID_CHERRY")){
      stats.midCount++;
    }else if(result === "GRAPE"){
      stats.grapeCount = (Number(stats.grapeCount) || 0) + 1;
    }else if(result === "SMALL"){
      stats.smallCount++;
    }else if(result === "BELL" || result === "BELL15"){
      stats.bellCount++;
      stats.grapeCount = (Number(stats.grapeCount) || 0) + 1;
    }else if(result === "BELL3"){
      stats.diagonalBellCount = (Number(stats.diagonalBellCount) || 0) + 1;
    }else if(result === "REPLAY"){
      stats.replayCount = (Number(stats.replayCount) || 0) + 1;
    }else if(result === "SUICA"){
      stats.suikaCount++;
    }else if(result === "CHERRY_ANY" || result === "CHERRY_DOUBLE" || result === "CHERRY_TRIPLE"){
      stats.cherryCount++;
    }
  }

  function syncNovaProgress(){
    normalState.novaDecrement=NovaDecrement.bind(normalState.novaDecrement,settings.setting);
    normalState.novaProgress=NovaProgress.bind(normalState.novaProgress,stats.slumpHigh);
    return normalState.novaProgress;
  }
  function countTotalSpinIfNeeded(aTypeBonusActiveAtSpinStart=false){
    if(A_TYPE_MODE){
      syncNovaProgress();
      NovaDecrement.observe(currentProfit());
      const previous=NovaFlow.normalize(normalState.flow);
      normalState.flow=NovaProgress.beforeBet(previous,{...settings.novaArt,setting:settings.setting},currentProfit(),session.active||normalState.bonusPending||previous.phase==='normal'&&!!normalState.internal?.prelude);
    }
    auditCapture();
    if(A_TYPE_MODE&&!session.active&&normalState.flow?.phase==='art'){
      normalState.flow=NovaArt.prepareBet(normalState.flow,{...settings.novaArt,setting:settings.setting});
      auditCapture();
    }
    if(!session.active && normalState.flow?.zero)return false;
    if(A_TYPE_MODE){
      NovaDecrement.beforeBet(aTypeBonusActiveAtSpinStart?'bonus':normalState.bonusPending?'prep':normalState.flow?.zone?'zone':normalState.flow?.phase==='art'?'at':normalState.flow?.phase==='normal'?'normal':'cz');
      NovaProgress.drawSortie(settings.setting);
    }
    if(A_TYPE_MODE && aTypeBonusActiveAtSpinStart) return false;
    stats.totalSpins = (Number(stats.totalSpins) || 0) + 1;
    return true;
  }

  function currentRtp(){
    return stats.totalFee > 0 ? stats.totalPaid / stats.totalFee : 0;
  }

  function currentProfit(){
    return (Number(stats.totalPaid) || 0) - (Number(stats.totalFee) || 0);
  }

  function completeTrialProfit(){
    return currentProfit();
  }

  function completeLimitPt(){
    return Math.max(0, Math.round(Number(settings.completeLimitPt) || 0));
  }

  function isCompleteLockEnabled(){
    return COMPLETE_TRIAL_ENABLED && completeLimitPt() > 0;
  }

  function isCompleteTrialLocked(){
    return isCompleteLockEnabled() && !!completeTrialState.locked;
  }

  function bar3PremiumDenominator(){
    return BAR3_PREMIUM_DENOM;
  }

  function updateCompleteTrialState(reason=""){
    if(!COMPLETE_TRIAL_ENABLED) return false;
    const profit = completeTrialProfit();

    const limit = completeLimitPt();
    if(isCompleteLockEnabled() && !completeTrialState.locked && profit >= limit){
      completeTrialState.locked = true;
      completeTrialState.lockedSetting = Number(settings.setting) || 1;
      completeTrialState.completeProfit = profit;
      stopAutoPlay("COMPLETE到達のためAUTO停止");
      stopSpeedToBonus("COMPLETE到達のためSPEED停止");
      stopDebugFastSpin("COMPLETE到達");
      showOverlay("コンプリートしました。");
      showMessage("コンプリートしました。", `+${limit}pt到達 / 管理リセットまたは設定変更まで遊技できません`);
      log(`[COMPLETE] +${limit}pt到達：${formatSigned(profit)}pt / 設定${completeTrialState.lockedSetting}`);
      persistState();
      updateDisplay();
    }

    return isCompleteTrialLocked();
  }

  function canPlayCompleteTrial({allowOumaPresentation=false}={}){
    if(!allowOumaPresentation&&typeof oumaPresentation!=='undefined'&&oumaPresentation)return false;
    if(bonusConfirmSoundPlaying || bonusEndBgmPlaying)return false;
    if(!isCompleteTrialLocked()) return true;
    stopAutoPlay("COMPLETE中のためAUTO停止");
    stopSpeedToBonus("COMPLETE中のためSPEED停止");
    stopDebugFastSpin("COMPLETE中");
    showMessage("コンプリートしました。", `+${completeLimitPt()}pt到達 / 管理リセットまたは設定変更まで遊技できません`);
    showOverlay("コンプリートしました。");
    return false;
  }

  function normalizeSlumpHistory(){
    const source = Array.isArray(stats.slumpHistory) ? stats.slumpHistory : [];
    const normalized = source
      .map(point => ({
        spin:Math.max(0, Number(point && point.spin) || 0),
        profit:Number(point && point.profit) || 0
      }))
      .filter(point => Number.isFinite(point.profit));

    if(!normalized.length || normalized[0].spin !== 0 || normalized[0].profit !== 0){
      normalized.unshift({spin:0, profit:0});
    }

    normalized.sort((a,b)=>a.spin - b.spin);
    const deduped = [];
    for(const point of normalized){
      const last = deduped[deduped.length - 1];
      if(last && last.spin === point.spin){
        last.profit = point.profit;
        continue;
      }
      deduped.push(point);
    }
    stats.slumpHistory = deduped.length > SLUMP_MAX_HISTORY_POINTS
      ? reduceSlumpPoints(deduped, Math.floor(SLUMP_MAX_HISTORY_POINTS * 0.75))
      : deduped;
    refreshSlumpExtremes();
  }

  function recordSlumpPoint(settled=true){
    if(A_TYPE_MODE){
      syncNovaProgress();NovaProgress.observeNet(currentProfit());
      // Match the simulator: the regime sees settled net, not the transient BET debit.
      if(settled)NovaDecrement.observe(currentProfit());
    }
    normalizeSlumpHistory();
    const point = {
      spin:Number(stats.totalSpins) || 0,
      profit:currentProfit()
    };
    const last = stats.slumpHistory[stats.slumpHistory.length - 1];
    if(last && last.spin === point.spin){
      if(last.profit === point.profit) return;
      last.profit = point.profit;
      refreshSlumpExtremes();
      scheduleSlumpGraphRender();
      return;
    }
    stats.slumpHistory.push(point);
    if(stats.slumpHistory.length > SLUMP_MAX_HISTORY_POINTS){
      stats.slumpHistory = reduceSlumpPoints(stats.slumpHistory, Math.floor(SLUMP_MAX_HISTORY_POINTS * 0.75));
    }
    refreshSlumpExtremes();
    scheduleSlumpGraphRender();
  }

  function setSlumpValue(view, value){
    if(!view) return;
    view.textContent = `${formatSigned(Math.round(value))}pt`;
    view.style.color = value > 0 ? "var(--green)" : value < 0 ? "var(--red)" : "var(--gold)";
  }

  function formatSlumpNumber(value){
    return Math.round(Number(value) || 0).toLocaleString("ja-JP");
  }

  function getProfitBounds(points){
    let maxProfit = 0;
    let minProfit = 0;
    for(const point of points){
      const profit = Number(point && point.profit) || 0;
      if(profit > maxProfit) maxProfit = profit;
      if(profit < minProfit) minProfit = profit;
    }
    return {maxProfit, minProfit};
  }

  function refreshSlumpExtremes(){
    const points = Array.isArray(stats.slumpHistory) ? stats.slumpHistory : [];
    const bounds = getProfitBounds(points);
    stats.slumpHigh = bounds.maxProfit;
    stats.slumpLow = bounds.minProfit;
  }

  function scheduleSlumpGraphRender(){
    if(!audioDock || !audioDock.classList.contains("slumpOpen")) return;
    if(slumpRenderRequest) return;
    slumpRenderRequest = requestAnimationFrame(()=>{
      slumpRenderRequest = 0;
      renderSlumpGraph();
    });
  }

  function getSlumpWindow(points){
    const total = points.length;
    const xZoom = Math.max(1, Math.min(50, Number(slumpView.xZoom) || 1));
    slumpView.xZoom = xZoom;
    const visibleCount = xZoom <= 1 ? total : Math.max(2, Math.ceil(total / xZoom));
    const maxStart = Math.max(0, total - visibleCount);
    if(slumpView.followEnd || slumpView.seekStart > maxStart){
      slumpView.seekStart = maxStart;
    }
    const start = clamp(Math.round(Number(slumpView.seekStart) || 0), 0, maxStart);
    const end = Math.min(total, start + visibleCount);
    return {
      start,
      end,
      maxStart,
      visibleCount,
      points:start === 0 && end === total ? points : points.slice(start, end)
    };
  }

  function updateSlumpControls(windowInfo, points){
    const firstPoint = windowInfo.points[0] || points[0] || {spin:0};
    const lastPoint = windowInfo.points[windowInfo.points.length - 1] || points[points.length - 1] || {spin:0};
    if(slumpSeekRange){
      slumpSeekRange.max = String(windowInfo.maxStart);
      slumpSeekRange.disabled = windowInfo.maxStart <= 0;
      if(document.activeElement !== slumpSeekRange || slumpView.followEnd){
        slumpSeekRange.value = String(windowInfo.start);
      }
    }
    if(slumpZoomInput && document.activeElement !== slumpZoomInput){
      slumpZoomInput.value = String(slumpView.xZoom);
    }
    if(slumpYZoomInput && document.activeElement !== slumpYZoomInput){
      slumpYZoomInput.value = String(slumpView.yZoom);
    }
    if(slumpRangeView){
      const total = Math.max(0, points.length - 1);
      const visible = Math.max(0, windowInfo.points.length - 1);
      slumpRangeView.textContent = `${formatSlumpNumber(firstPoint.spin)}-${formatSlumpNumber(lastPoint.spin)}G / ${formatSlumpNumber(visible)}点`;
      slumpRangeView.title = `全${formatSlumpNumber(total)}点`;
    }
    if(slumpZoomView) slumpZoomView.textContent = `${slumpView.xZoom}x`;
    if(slumpYZoomView) slumpYZoomView.textContent = `${Number(slumpView.yZoom).toFixed(slumpView.yZoom % 1 ? 1 : 0)}x`;
  }

  function reduceSlumpPoints(points, maxPoints){
    if(points.length <= maxPoints) return points;
    const first = points[0];
    const last = points[points.length - 1];
    const firstSpin = Number(first.spin) || 0;
    const lastSpin = Number(last.spin) || firstSpin;
    const spinRange = lastSpin - firstSpin;
    if(spinRange <= 0) return points.slice(-maxPoints);

    const bucketCount = Math.max(1, Math.floor((maxPoints - 2) / 2));
    const buckets = Array.from({length:bucketCount}, ()=>({min:null, max:null}));
    for(let index=1; index<points.length - 1; index+=1){
      const point = points[index];
      const spin = Number(point.spin) || firstSpin;
      const bucketIndex = Math.min(bucketCount - 1, Math.max(0,
        Math.floor(((spin - firstSpin) / spinRange) * bucketCount)
      ));
      const entry = {index, point};
      const bucket = buckets[bucketIndex];
      if(!bucket.min || point.profit < bucket.min.point.profit) bucket.min = entry;
      if(!bucket.max || point.profit > bucket.max.point.profit) bucket.max = entry;
    }

    const reduced = [first];
    for(const bucket of buckets){
      const candidates = [bucket.min, bucket.max]
        .filter(Boolean)
        .sort((a,b)=>a.index - b.index);
      for(const candidate of candidates){
        const previous = reduced[reduced.length - 1];
        if(previous !== candidate.point) reduced.push(candidate.point);
      }
    }
    if(reduced[reduced.length - 1] !== last) reduced.push(last);
    return reduced.slice(0, maxPoints);
  }

  function renderSlumpGraph(){
    if(!slumpGraph) return;
    const ctx = slumpGraph.getContext("2d");
    if(!ctx) return;

    const cssWidth = Math.max(280, Math.round(slumpGraph.clientWidth || 720));
    const cssHeight = Math.max(160, Math.round(slumpGraph.clientHeight || 190));
    const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
    const canvasWidth = Math.round(cssWidth * dpr);
    const canvasHeight = Math.round(cssHeight * dpr);
    if(slumpGraph.width !== canvasWidth || slumpGraph.height !== canvasHeight){
      slumpGraph.width = canvasWidth;
      slumpGraph.height = canvasHeight;
    }

    ctx.setTransform(dpr,0,0,dpr,0,0);
    ctx.clearRect(0,0,cssWidth,cssHeight);
    ctx.fillStyle = "rgba(2,6,18,.92)";
    ctx.fillRect(0,0,cssWidth,cssHeight);

    const pad = {left:44, right:14, top:16, bottom:28};
    const plotW = Math.max(1, cssWidth - pad.left - pad.right);
    const plotH = Math.max(1, cssHeight - pad.top - pad.bottom);
    const allPoints = Array.isArray(stats.slumpHistory) && stats.slumpHistory.length
      ? stats.slumpHistory
      : [{spin:0, profit:0}];
    const windowInfo = getSlumpWindow(allPoints);
    updateSlumpControls(windowInfo, allPoints);
    const points = windowInfo.points.length ? windowInfo.points : allPoints;
    const drawPoints = reduceSlumpPoints(points, Math.min(SLUMP_MAX_DRAW_POINTS, Math.max(160, Math.round(plotW * 2))));
    const bounds = getProfitBounds(points);
    let maxProfit = bounds.maxProfit;
    let minProfit = bounds.minProfit;
    let range = Math.max(100, maxProfit - minProfit);
    const yZoom = Math.max(1, Math.min(6, Number(slumpView.yZoom) || 1));
    slumpView.yZoom = yZoom;
    if(yZoom > 1){
      const latestVisible = points[points.length - 1] || {profit:0};
      const center = Number(latestVisible.profit) || 0;
      range = Math.max(40, range / yZoom);
      maxProfit = center + range / 2;
      minProfit = center - range / 2;
    }
    const firstSpin = Number(points[0] && points[0].spin) || 0;
    const lastVisibleSpin = Number(points[points.length - 1] && points[points.length - 1].spin) || firstSpin;
    const spinRange = Math.max(1, lastVisibleSpin - firstSpin);
    const xFor = point => pad.left + (((Number(point.spin) || 0) - firstSpin) / spinRange) * plotW;
    const yFor = profit => pad.top + ((maxProfit - profit) / range) * plotH;
    const fullLastPoint = allPoints[allPoints.length - 1] || {profit:0};
    const current = Number(fullLastPoint.profit) || 0;
    const lineColor = current > 0 ? "#62ff9a" : current < 0 ? "#ff365d" : "#ffd36a";

    ctx.strokeStyle = "rgba(255,255,255,.10)";
    ctx.lineWidth = 1;
    ctx.font = "700 11px system-ui, sans-serif";
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    for(let i=0;i<=4;i++){
      const value = maxProfit - (range * i / 4);
      const y = yFor(value);
      ctx.beginPath();
      ctx.moveTo(pad.left, y);
      ctx.lineTo(cssWidth - pad.right, y);
      ctx.stroke();
      ctx.fillStyle = "rgba(255,255,255,.58)";
      ctx.fillText(formatSigned(Math.round(value)), pad.left - 7, y);
    }

    const zeroY = yFor(0);
    if(zeroY >= pad.top && zeroY <= pad.top + plotH){
      ctx.strokeStyle = "rgba(255,211,106,.58)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(pad.left, zeroY);
      ctx.lineTo(cssWidth - pad.right, zeroY);
      ctx.stroke();
    }

    ctx.save();
    ctx.beginPath();
    ctx.rect(pad.left, pad.top, plotW, plotH);
    ctx.clip();

    if(drawPoints.length > 1){
      const gradient = ctx.createLinearGradient(0, pad.top, 0, cssHeight - pad.bottom);
      gradient.addColorStop(0, current >= 0 ? "rgba(98,255,154,.22)" : "rgba(255,54,93,.18)");
      gradient.addColorStop(1, "rgba(255,255,255,0)");
      const baseY = clamp(zeroY, pad.top, pad.top + plotH);

      ctx.beginPath();
      ctx.moveTo(xFor(drawPoints[0]), baseY);
      drawPoints.forEach(point=>ctx.lineTo(xFor(point), yFor(point.profit)));
      ctx.lineTo(xFor(drawPoints[drawPoints.length - 1]), baseY);
      ctx.closePath();
      ctx.fillStyle = gradient;
      ctx.fill();
    }

    ctx.strokeStyle = lineColor;
    ctx.lineWidth = 3;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    ctx.shadowColor = lineColor;
    ctx.shadowBlur = 10;
    ctx.beginPath();
    drawPoints.forEach((point, index)=>{
      const x = xFor(point);
      const y = yFor(point.profit);
      if(index === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();
    ctx.shadowBlur = 0;

    const lastPoint = points[points.length - 1] || {profit:0};
    const lastX = xFor(lastPoint);
    const lastY = yFor(lastPoint.profit);
    ctx.fillStyle = lineColor;
    ctx.beginPath();
    ctx.arc(lastX, lastY, 4.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,.82)";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();

    ctx.fillStyle = "rgba(255,255,255,.62)";
    ctx.textAlign = "left";
    ctx.textBaseline = "bottom";
    ctx.font = "800 11px system-ui, sans-serif";
    ctx.fillText(`G ${formatSlumpNumber(firstSpin)}-${formatSlumpNumber(lastPoint.spin)}`, pad.left, cssHeight - 7);
    ctx.textAlign = "right";
    ctx.fillText("差pt", cssWidth - pad.right, cssHeight - 7);

    setSlumpValue(slumpCurrentView, current);
    setSlumpValue(slumpHighView, Number(stats.slumpHigh) || 0);
    setSlumpValue(slumpLowView, Number(stats.slumpLow) || 0);
  }

  function weightedPick(items){
    const available = items.filter(item => item && item.w > 0 && RESULT[item.result]);
    const total = available.reduce((sum,item)=>sum+item.w,0);
    if(total <= 0) return "MISS";
    let r = Math.random() * total;
    for(const item of available){
      r -= item.w;
      if(r <= 0) return item.result;
    }
    return available[available.length - 1].result;
  }

  function drawResult(){
    if(isATypeBonusActive()){
      return drawATypeBonusResult();
    }
    if(pendingForceResult && RESULT[pendingForceResult]){
      return atInternalResult(pendingForceResult);
    }
    if(isGoraiZoneActive()){
      return drawZoneChallengeResult();
    }

    // BAR揃いは通常抽選とは別の全設定共通プレミアフラグ
    if(Math.random() < (1 / bar3PremiumDenominator())){
      return "BAR3";
    }

    if(Math.random() < hitProbability()){
      return atInternalResult(weightedPick(eventWeights(settings.setting)));
    }
    return "MISS";
  }

  function drawIndependentATypeOutcome(){
    const flow=NovaFlow.normalize(normalState.flow);
    if(flow.phase==='art'){
      pendingArtStep=NovaArt.step(flow,{...settings.novaArt,setting:settings.setting,netPt:currentProfit()},Math.random,pendingForceResult);
      return {result:pendingArtStep.result,internalBonus:pendingArtStep.internalBonus};
    }
    const token=NovaNormal.spin(normalState.internal,flow,Number(settings.setting)||1,{normal:settings.novaNormal,art:settings.novaArt,cz:settings.novaFlow,scale:NovaBalance.profile(settings.setting).scale},Math.random,pendingForceResult);
    const inCz=['cz','strong_cz'].includes(token.czFlow.phase);
    if(inCz){token.czFlow.lampRoll??=Math.random();token.czFlow.rainbowRoll??=Math.random();}
    const ceilingHit=token.internalBonus?.source?.includes('天井');
    pendingArtStep={
      result:token.result,normalBellNavi:token.normalBellNavi,normalInternal:token.state,czEntry:token.entry,czPrelude:token.czPrelude,czChance:token.czChance,
      flow:token.direct?NovaArt.enterInitial({...settings.novaArt,setting:settings.setting}):token.entry?NovaFlow.enterCZ(token.entry==='STRONG_CZ',token.czOptions ?? settings.novaFlow):token.internalBonus?NovaFlow.normalize(null):NovaFlow.advance(token.czFlow),
      czLamp:token.czLamp || (inCz?{...NovaFlow.drawLamp({...token.czFlow,
        success:token.czFlow.success||!!token.internalBonus||token.direct,
        winProbability:ceilingHit?1:token.czFlow.winProbability}),
        totalGames:token.czFlow.totalGames,remaining:token.czFlow.remaining}:null),
      message:token.direct?'AT準備開始':token.czPrelude?.enter?'':token.entry?(token.entry==='STRONG_CZ'?'強CZ突入':'CZ突入'):token.message||''
    };
    return {result:token.result,internalBonus:token.internalBonus};
  }

  function drawNormalResult(){
    if(A_TYPE_MODE){
      if(pendingForceResult==='STRONG_BELL')pendingForceResult='BELL';
      pendingArtStep=null;
      pendingATypeInternalBonus = null;
      if(!normalState.bonusPending&&pendingForceResult==='URA_CHALLENGE'){
        pendingArtStep=forcedBurstStep(normalState.flow);
        return pendingArtStep.result;
      }
      if(!normalState.bonusPending&&pendingForceResult==='COMEBACK'){
        const base=normalState.flow?.phase==='art'?normalState.flow:NovaArt.enter({...settings.novaArt,setting:settings.setting});
        pendingArtStep={result:'MISS',flow:NovaArt.beginComeback({...base,zone:'',entryStage:'',pendingZone:'',queuedZones:[],sets:'0',stock:'0',burstPending:false,burstLeft:0}),comebackEvent:'entry',message:'引き戻しゾーン突入 / 残り5G'};
        return pendingArtStep.result;
      }
      if(!normalState.bonusPending && (pendingForceResult==='ART'||pendingForceResult.startsWith('ZONE_'))){
        const base=normalState.flow?.phase==='art'?normalState.flow:pendingForceResult==='ART'?null:NovaArt.enter({...settings.novaArt,setting:settings.setting});
        pendingArtStep=pendingForceResult==='ART'?{result:'MISS',flow:NovaArt.enterInitial({...settings.novaArt,setting:settings.setting}),message:'AT準備開始'}:NovaArt.step(base,{...settings.novaArt,setting:settings.setting,netPt:currentProfit()},Math.random,pendingForceResult);
        return pendingArtStep.result;
      }
      if(!normalState.bonusPending && normalState.flow?.phase==='art' && !['MID','BAR3'].includes(pendingForceResult)){
        const token=drawIndependentATypeOutcome();pendingATypeInternalBonus=token.internalBonus;return token.result;
      }
      if(!normalState.bonusPending && (NovaNormal.rare[pendingForceResult]||['BELL','REPLAY','MISS','FREEZE'].includes(pendingForceResult))){
        const token=drawIndependentATypeOutcome();pendingATypeInternalBonus=token.internalBonus;return token.result;
      }
      if(isNovaResult(pendingForceResult)) return pendingForceResult;
      if(normalState.bonusPending){
        if(normalState.prepLeft>0)return NovaArt.rareRoles[pendingForceResult]||['BELL','REPLAY','MISS'].includes(pendingForceResult)?pendingForceResult:NovaArt.drawPreparationRole(settings.setting);
        if(!isChanceLampLit()) return "MISS";

        return normalState.bonusKind === "MID" ? "MID" : "BIG";
      }

      if(pendingForceResult === "REACH_ME"){
        const gamesSinceLastBonusAtStart = normalizeBonusAfterGames(normalState.sinceBonus);
        pendingATypeInternalBonus = {kind:"BIG", source:"リーチ目強制", internalResult:"REACH_ME", gamesSinceLastBonusAtStart};
        return "MISS";
      }

      if(pendingForceResult && RESULT[pendingForceResult]){
        return normalizeATypeResult(pendingForceResult);
      }

      const token = drawIndependentATypeOutcome();
      pendingATypeInternalBonus = token.internalBonus
        ? {...token.internalBonus, gamesSinceLastBonusAtStart:normalizeBonusAfterGames(normalState.sinceBonus)}
        : null;
      return token.result;
    }
  }

  function resolveNormalOutcome(result, lineRow=1){
    if(A_TYPE_MODE){
      const flowBefore = NovaFlow.normalize(normalState.flow);
      const artStep=pendingArtStep;pendingArtStep=null;
      const czEntry = !!artStep?.czEntry || result === "CZ" || result === "STRONG_CZ";
      const zoneSpin=!!artStep?.zoneSpin;
      const superNovaBonus = result === "SUPER_NOVA" && flowBefore.phase!=='art' && !normalState.bonusPending && !zoneSpin ? drawSuperNovaBonus() : null;
      const internalBonus = superNovaBonus || pendingATypeInternalBonus;
      pendingATypeInternalBonus = null;
      const bonusPendingAtStart = !superNovaBonus && !!normalState.bonusPending;
      const risingAtStart = !bonusPendingAtStart && isNovaRisingMode();
      const risingRemainAfter = risingAtStart
        ? Math.max(0, normalizeNovaRisingRemain(normalState.risingRemain) - 1)
        : normalizeNovaRisingRemain(normalState.risingRemain);
      const pendingReady = bonusPendingAtStart && (
        result === "MID" ||
        (result === "BIG")
      );
      const directReady = !zoneSpin && !bonusPendingAtStart && !internalBonus && (result === "BIG" || result === "MID" || result === "MID_CHERRY" || result === "BAR3");
      const isNewBonusHit = !!internalBonus;
      const isReadyBonus = pendingReady || directReady;
      const bonusKind = internalBonus
        ? internalBonus.kind
        : bonusPendingAtStart
          ? (normalState.bonusKind || "BIG")
          : (result === "MID" || result === "MID_CHERRY") ? "MID" : (result === "BIG" || result === "BAR3") ? "BIG" : "";
      const isBig = bonusKind === "BIG" && (isNewBonusHit || isReadyBonus);
      const isReg = bonusKind === "MID" && (isNewBonusHit || isReadyBonus);
      const gamesSinceLastBonusAtStart = internalBonus
        ? normalizeBonusAfterGames(internalBonus.gamesSinceLastBonusAtStart)
        : bonusPendingAtStart
          ? normalizeBonusAfterGames(normalState.bonusHitGamesSince)
          : normalizeBonusAfterGames(normalState.sinceBonus);
      const bonusSource = internalBonus
        ? internalBonus.source
        : bonusPendingAtStart
          ? (normalState.bonusSource || "BONUS確定")
          : result === "MID_CHERRY"
            ? "チェリー同時当選"
            : isReadyBonus
              ? "単独当選"
              : "";
      return {
        normalInternal:artStep?.normalInternal,
        normalBellNavi:!!artStep?.normalBellNavi&&result==='BELL',
        czPrelude:artStep?.czPrelude,
        atPrelude:artStep?.atPrelude,
        czChance:artStep?.czChance,
        czLamp:artStep?.czLamp,
        aim:artStep?.aim,
        researchSortie:artStep?.researchSortie,
        researchChallenge:artStep?.researchChallenge,
        burstEvent:artStep?.burstEvent,
        burstReward:artStep?.burstReward,
        atOutcome:artStep?.atOutcome,
        zoneAward:artStep?.zoneAward||0,
        comebackEvent:artStep?.comebackEvent,
        flowBefore,
        flowAfter:artStep?.flow || (czEntry ? NovaFlow.enterCZ(result === "STRONG_CZ",NovaFlow.forSetting(settings.novaFlow,settings.setting)) : flowBefore.phase==='art' ? flowBefore : (isNewBonusHit || isReadyBonus) ? NovaFlow.normalize(null) : bonusPendingAtStart ? flowBefore : NovaFlow.advance(flowBefore)),
        artMessage:artStep?.burstReward?.type==='ura' ? NovaArt.zoneName(artStep.burstReward.zone)+'ゾーン獲得！' : artStep?.message || '',
        artReverse:!!(artStep?.reverse||artStep?.oumaFreeze),oumaFreeze:!!artStep?.oumaFreeze,
        zoneSpin,
        czEntry,
        czCompleted:(flowBefore.phase === "cz" || flowBefore.phase === "strong_cz") && flowBefore.remaining === 1,
        rtCompleted:flowBefore.phase === "rt" && flowBefore.remaining === 1,
        normalGame:true,
        reward:normalRewardFor(result, lineRow),
        add:0,
        sets:0,
        bigZone:0,
        zoneGame:false,
        zoneSets:0,
        zoneStGames:0,
        zoneGameAdd:0,
        highAtStart:risingAtStart,
        risingAtStart,
        risingRemainAfter,
        bonusPendingAtStart,
        bonusWaitSpin:bonusPendingAtStart && !isReadyBonus,
        bonusWaitGamesAtStart:0,
        highAdd:0,
        ceilingAfter:(isNewBonusHit || isReadyBonus) ? 0 : flowBefore.zero ? gamesSinceLastBonusAtStart : nextBonusAfterGames(gamesSinceLastBonusAtStart),
        gamesSinceLastBonusAtStart,
        bonusHit:isNewBonusHit,
        bonusReady:isReadyBonus && isBig,
        regReady:isReadyBonus && isReg,
        bar3PremiumReady:false,
        bonusKind:isReg ? "MID" : isBig ? "BIG" : "",
        bonusSource,
        premiumBonus:isBig && (internalBonus ? !!internalBonus.premiumBonus : bonusPendingAtStart ? !!normalState.premiumBonus : result === "BAR3"),
        superNovaOutcome:superNovaBonus?.superNovaOutcome || (internalBonus?.premiumBonus?"FREEZE":""),
        oneGameRenBonus:isBig && bonusPendingAtStart ? !!normalState.oneGameRenBonus : false,
        aTypeBonusReady:isReadyBonus
      };
    }
  }

  function load(){
    const read=(key,kind)=>{
      const raw=safeStorageGet(key);
      if(raw===null || raw===undefined)return {data:null,present:false};
      try{
        const data=JSON.parse(raw);
        const object=value=>!!value && typeof value==='object' && !Array.isArray(value);
        if(!object(data) || !object(data.settings) || (kind==='game' && !object(data.stats)))throw new Error('Invalid saved record');
        return {data,present:true};
      }catch(error){console.warn('Failed to read NOVA saved record',key,error);return {data:null,present:true};}
    };
    const preferences=read(PREFERENCES_STORAGE_KEY,'preferences');
    const full=read(STORAGE_KEY,'game'),resume=read(STORAGE_RESUME_KEY,'game');
    storageRestoreBlocked=!!((full.present || resume.present) && !full.data && !resume.data);
    if(storageRestoreBlocked)return false;
    try{
      const preferenceData = preferences.data;
      const fullData = full.data;
      const resumeData = resume.data;
      let data = fullData;
      if(resumeData && (!data || Number(resumeData.savedAt || 0) > Number(data.savedAt || 0))){
        data = {
          ...(data || {}),
          ...resumeData,
          settings:{...((data && data.settings) || {}), ...(resumeData.settings || {})},
          stats:{...((data && data.stats) || {}), ...(resumeData.stats || {})},
          normalState:{...((data && data.normalState) || {}), ...(resumeData.normalState || {})},
          completeTrialState:{...((data && data.completeTrialState) || {}), ...(resumeData.completeTrialState || {})},
          runtimeState:{...((data && data.runtimeState) || {}), ...(resumeData.runtimeState || {})}
        };
      }
      if(preferenceData && preferenceData.settings){
        data = {
          ...(data || {}),
          settings:{...preferenceData.settings, ...((data && data.settings) || {})}
        };
      }
      if(data?.settings){
        const previousAudioBalance = data.settings.audioBalanceVersion || 0;
        settings = {...settings, ...data.settings};
        if(previousAudioBalance < AUDIO_BALANCE_VERSION){
          const savedBgmVolume = Number(settings.bgmVolume);
          const savedSfxVolume = Number(settings.sfxVolume);
          const savedVoiceVolume = Number(settings.voiceVolume);
          const savedPayoutVolume = Number(settings.payoutVolume);
          const savedMovieVolume = Number(settings.movieVolume);
          const savedRogiMovieVolume = Number(settings.rogiMovieVolume);
          const oldDefaultBgm = 0.22;
          const oldDefaultSfx = 0.32;
          settings.bgmVolume = (!Number.isFinite(savedBgmVolume) || Math.abs(savedBgmVolume - oldDefaultBgm) < 0.005) ? DEFAULT_BGM_VOLUME : clamp(savedBgmVolume, 0, 1);
          settings.sfxVolume = (!Number.isFinite(savedSfxVolume) || Math.abs(savedSfxVolume - oldDefaultSfx) < 0.005) ? DEFAULT_SFX_VOLUME : clamp(savedSfxVolume, 0, 1);
          const inheritedSfxVolume = Number.isFinite(Number(settings.sfxVolume)) ? clamp(Number(settings.sfxVolume), 0, 1) : DEFAULT_SFX_VOLUME;
          settings.voiceVolume = Object.prototype.hasOwnProperty.call(data.settings, "voiceVolume") && Number.isFinite(savedVoiceVolume) ? clamp(savedVoiceVolume, 0, 1) : inheritedSfxVolume;
          settings.payoutVolume = Object.prototype.hasOwnProperty.call(data.settings, "payoutVolume") && Number.isFinite(savedPayoutVolume) ? clamp(savedPayoutVolume, 0, 1) : inheritedSfxVolume;
          if(previousAudioBalance < 9 && Number.isFinite(savedPayoutVolume) && Math.abs(savedPayoutVolume - 0.33) < 0.015){
            settings.payoutVolume = DEFAULT_PAYOUT_VOLUME;
          }
          settings.movieVolume = Object.prototype.hasOwnProperty.call(data.settings, "movieVolume") && Number.isFinite(savedMovieVolume) ? clamp(savedMovieVolume, 0, 1) : inheritedSfxVolume;
          settings.rogiMovieVolume = Object.prototype.hasOwnProperty.call(data.settings, "rogiMovieVolume") && Number.isFinite(savedRogiMovieVolume) ? clamp(savedRogiMovieVolume, 0, 1) : inheritedSfxVolume;
        }
        const savedMasterVolume = Number(settings.masterVolume);
        settings.masterVolume = Object.prototype.hasOwnProperty.call(data.settings, "masterVolume") && Number.isFinite(savedMasterVolume) ? clamp(savedMasterVolume, 0, 1) : DEFAULT_MASTER_VOLUME;
        settings.audioBalanceVersion = AUDIO_BALANCE_VERSION;
      }
      // Fresh and saved browsers must finish the same migrations before persisting settings.
      if(settings.balanceVersion!=='cz-lamps10'){settings.novaArt={...settings.novaArt,...Object.fromEntries([1,2,3,4,5,6].map(i=>['direct'+i,NovaArt.defaults['direct'+i]])),soraHit:NovaArt.defaults.soraHit,oumaHit:NovaArt.defaults.oumaHit};settings.balanceVersion='cz-lamps10';}
      if(settings.bellBalanceVersion!==23){settings.novaArt={...NovaArt.defaults};settings.bellBalanceVersion=23;}
      if(settings.lotteryVersion!==33){settings.novaArt={...NovaArt.defaults};settings.novaNormal={...NovaNormal.defaults};settings.novaFlow={...NovaFlow.defaults};settings.lotteryVersion=33;}
      if(settings.zoneVersion!==2){settings.novaArt={...NovaArt.defaults,initial:settings.novaArt?.initial||275};settings.zoneVersion=2;}
      if(settings.zoneLotteryVersion!==3){settings.novaArt={...settings.novaArt,soraUraReset:NovaArt.defaults.soraUraReset};delete settings.novaArt.uraChance;settings.zoneLotteryVersion=3;}
      if(settings.at150Version!==45){settings.novaArt={...settings.novaArt,...{"initial":150,"ladderSosuke":0.7,"ladderGiru":0.95,"ladderUraGiru":0.98,"totoHit":0.35,"soraHit":0.63,"soraUraHit":0.75,"urapiSuper":0.49,"oumaSuper":0.77,"oumaUraSuper":0.98,"payoutVersion":1}};settings.completeLimitPt=10000;settings.at150Version=45;}
      if(settings.ladderGuaranteeVersion!==57){settings.novaArt={...settings.novaArt,ladderSosuke:.4,ladderGiru:.5,ladderUraGiru:2/3};settings.ladderGuaranteeVersion=57;}
      if(settings.zoneBalanceVersion!==105){settings.novaArt={...settings.novaArt,oumaUraSuper:.75,oumaUraFreeze:.35,soraUraHit:.75,soraUraReset:.25,soraUraRed:.715};settings.zoneBalanceVersion=105;}
      if(settings.challengeBalanceVersion!==120){settings.novaArt={...settings.novaArt,initial:NovaArt.defaults.initial};settings.challengeBalanceVersion=120;}
      if(settings.commonAtVersion!==125){settings.novaArt=NovaArt.config(settings.novaArt);settings.commonAtVersion=125;}
      if(settings.entryQuotaVersion!==128){
        const savedFlow=data?.normalState?.flow;
        if(savedFlow?.phase==='art'&&savedFlow.setQuota==null)savedFlow.setQuota=String(data.settings?.novaArt?.initial||300);
        settings.novaArt={...settings.novaArt,initial:NovaArt.defaults.initial};settings.entryQuotaVersion=128;
      }
      if(settings.initialSevenVersion!==148){
        settings.novaArt={...settings.novaArt,...Object.fromEntries(['initial','totoHit','totoReset','soraHit','soraReset','soraUraHit','soraUraReset'].map(k=>[k,NovaArt.defaults[k]]))};
        settings.initialSevenVersion=148;
      }
      if(settings.rescueVersion!==107){settings.novaNormal={...settings.novaNormal,czFailureGain:1,bonusFailureGain:2,atDryGain:2,ceilingGain:10,regChainGain:2};settings.rescueVersion=107;}
      settings.completeLimitPt = Math.max(1, Math.round(Number(settings.completeLimitPt) || DEFAULT_COMPLETE_LIMIT_PT));
      settings.title = normalizeMachineTitle(settings.title);
      if(!SETTING[settings.setting]) settings.setting = 1;
      if(data?.stats) stats = {...stats, ...data.stats};
      stats.premiumBigCount = Math.max(0, Number(stats.premiumBigCount) || 0);
      if((Number(stats.roleStatVersion) || 0) < ROLE_STAT_COUNTER_VERSION){
        stats.normalSpins = 0;
        stats.highSpins = 0;
        stats.grapeCount = 0;
        stats.smallCount = 0;
        stats.bellCount = 0;
        stats.premiumBigCount = 0;
        stats.diagonalBellCount = 0;
        stats.replayCount = 0;
        stats.suikaCount = 0;
        stats.cherryCount = 0;
        stats.roleStatVersion = ROLE_STAT_COUNTER_VERSION;
      }
      if(A_TYPE_MODE){
        stats.totalSpins = (Number(stats.normalSpins) || 0) + (Number(stats.highSpins) || 0);
      }
      if(data?.normalState){
        normalState = {
          ...normalState,
          ...data.normalState,
          internal:NovaNormal.normalize(data.normalState.internal),
          highRemain:Math.max(0, Number(data.normalState.highRemain) || 0),
          risingRemain:0,
          flow:NovaFlow.normalize(data.normalState.flow),
          risingBonusOrigin:!!data.normalState.risingBonusOrigin,
          sinceBonus:normalizeBonusAfterGames(data.normalState.sinceBonus),
          bonusPending:!!data.normalState.bonusPending,
          bonusKind:A_TYPE_MODE&&data.normalState.bonusPending?"BIG":String(data.normalState.bonusKind || ""),
          bonusSource:String(data.normalState.bonusSource || ""),
          premiumBonus:!!data.normalState.premiumBonus,
          oneGameRenBonus:false,
          bonusWaitGames:Math.max(0, Number(data.normalState.bonusWaitGames) || 0),
          bonusHitGamesSince:normalizeBonusAfterGames(data.normalState.bonusHitGamesSince),
          reachMePending:!!data.normalState.reachMePending,
          reachMeBonusKind:String(data.normalState.reachMeBonusKind || ""),
          reachMeBonusSource:String(data.normalState.reachMeBonusSource || ""),
          reachMeHitGamesSince:normalizeBonusAfterGames(data.normalState.reachMeHitGamesSince),
          pendingSettingVoiceSrc:"",
          pendingPremiumVoiceSrc:"",
          morningCeilingActive:!!data.normalState.morningCeilingActive
        };
        if(!normalState.bonusPending){
          normalState.bonusWaitGames = 0;
          normalState.bonusHitGamesSince = 0;
          normalState.premiumBonus = false;
          normalState.oneGameRenBonus = false;
        }
        normalState.sinceBonus = normalizeBonusAfterGames(normalState.sinceBonus);
      }
      if(data?.completeTrialState){
        completeTrialState = {
          ...completeTrialState,
          ...data.completeTrialState,
          locked:!!data.completeTrialState.locked,
          lockedSetting:clamp(Number(data.completeTrialState.lockedSetting) || 0, 0, 6),
          rescueActive:false,
          completeProfit:Number(data.completeTrialState.completeProfit) || 0
        };
        if(!isCompleteLockEnabled()){
          completeTrialState.locked = false;
          completeTrialState.lockedSetting = 0;
          completeTrialState.completeProfit = 0;
        }
      }
      const runtime = data?.runtimeState || {};
      if(runtime.session && typeof runtime.session === "object"){
        session = {
          ...session,
          ...runtime.session,
          active:!!runtime.session.active,
          remain:Math.max(0, Number(runtime.session.remain) || 0),
          fee:Number(runtime.session.fee) || 0,
          cost:Number(runtime.session.cost) || 0,
          paid:Number(runtime.session.paid) || 0,
          hits:Number(runtime.session.hits) || 0,
          bonusPointsRemaining:Math.max(0,NovaArt.bonusTarget(runtime.session.bonusKind)-(Number(runtime.session.paid)||0)),
          bonusArtSets:Math.max(0,Math.floor(Number(runtime.session.bonusArtSets)||0)),
          added:Number(runtime.session.added) || 0,
          addedGames:Number(runtime.session.addedGames) || 0,
          setNo:Number(runtime.session.setNo) || 0,
          stockSets:Number(runtime.session.stockSets) || 0,
          barBgmSets:Number(runtime.session.barBgmSets) || 0,
          nextSetBarBgm:!!runtime.session.nextSetBarBgm,
          currentSetBarBgm:!!runtime.session.currentSetBarBgm,
          continuationRate:Number(runtime.session.continuationRate) || 0,
          bigZone:Math.max(0, Number(runtime.session.bigZone) || 0),
          bigZoneType:String(runtime.session.bigZoneType || ""),
          phase:String(runtime.session.phase || "idle"),
          bonusKind:A_TYPE_MODE&&runtime.session.phase==='a_type_bonus'?'BIG':String(runtime.session.bonusKind || ""),
          bonusTier:NovaArt.bonusTier(runtime.session.bonusTier),
          bonusTarget:Number(runtime.session.bonusTarget) || 0,
          risingResumeRemain:normalizeNovaRisingRemain(runtime.session.risingResumeRemain),
          risingBonusOrigin:!!runtime.session.risingBonusOrigin,
          premiumBonus:!!runtime.session.premiumBonus,
          oneGameRenBonus:false,
          premiumChainEligible:false,
          bonusBgmSrc:String(runtime.session.bonusBgmSrc || ""),
          battleRemain:Math.max(0, Number(runtime.session.battleRemain) || 0),
          battleWin:!!runtime.session.battleWin,
          battleSource:String(runtime.session.battleSource || ""),
          resultPayout:runtime.session.resultPayout === null || runtime.session.resultPayout === undefined ? null : Number(runtime.session.resultPayout) || 0,
          endSignal:runtime.session.endSignal || null
        };
      }
      if(A_TYPE_MODE && session.active && session.phase==='a_type_bonus'){session.bonusBgmSrc=pickATypeBonusBgm(session.bonusKind).src;session.bonusTarget=NovaArt.bonusTarget(session.bonusKind);session.bonusPointsRemaining=Math.max(0,session.bonusTarget-(Number(session.paid)||0));}
      jagChainCount = runtime.jagChainCount?.payoutVersion===1 && Number.isFinite(runtime.jagChainCount.paid) && Number.isFinite(runtime.jagChainCount.fee) ? {...runtime.jagChainCount} : null;
      jagLastGamePayout = Number(runtime.jagLastGamePayout) || 0;
      jagLastBonusPayout = Number(runtime.jagLastBonusPayout) || 0;
      jagChanceHold = !!runtime.jagChanceHold;
      forceResult = normalizeForceResult(String(runtime.forceResult || ""));
      forcePremiumEffect = !!runtime.forcePremiumEffect;
      pendingForceResult = normalizeForceResult(String(runtime.pendingForceResult || ""));
      pendingBonusStartOptions = runtime.pendingBonusStartOptions && typeof runtime.pendingBonusStartOptions === "object" ? {...runtime.pendingBonusStartOptions} : null;
      devilZoneConfirmIntroPending = !!runtime.devilZoneConfirmIntroPending;
      pendingDevilRushEntryEffect = String(runtime.pendingDevilRushEntryEffect || "");
      speedFrameOffHold = !!runtime.speedFrameOffHold;
      barBgmActive = !!runtime.barBgmActive;
      barBgmMode = String(runtime.barBgmMode || "");
      battleBgmActive = !!runtime.battleBgmActive;
      rogiBgmMuted = !!runtime.rogiBgmMuted;
      autoPlay = false;
      speedToBonusActive = false;
      currentSpin = NovaSpinResume.restore(runtime.pendingSpin, RESULT);
      isSpinning = !!currentSpin;
      spinCanStop = false;
      // The unfinished BET is already counted; normal/high counters settle at the final stop.
      if(currentSpin)stats.totalSpins=Math.max(0,Number(data?.stats?.totalSpins)||0);
      return true;
    }catch(e){storageRestoreBlocked=true;console.warn('Failed to restore NOVA state',e);return false;}
  }

  function compactStatsForResume(){
    const compact = {...stats};
    if(Array.isArray(compact.slumpHistory) && compact.slumpHistory.length > 600){
      compact.slumpHistory = reduceSlumpPoints(compact.slumpHistory, 450);
    }
    return compact;
  }

  function runtimeStateForStorage(){
    return {
      pendingSpin:NovaSpinResume.capture(currentSpin),
      session:{...session},
      jagChainCount,
      jagLastGamePayout,
      jagLastBonusPayout,
      jagChanceHold,
      forceResult,
      forcePremiumEffect,
      pendingForceResult,
      pendingBonusStartOptions: pendingBonusStartOptions ? {...pendingBonusStartOptions} : null,
      devilZoneConfirmIntroPending,
      pendingDevilRushEntryEffect,
      speedFrameOffHold,
      barBgmActive,
      barBgmMode,
      battleBgmActive,
      rogiBgmMuted
    };
  }

  function updateStorageStatus(stateSaved, preferencesSaved){
    const banner=$('storageStatus'),message=$('storageStatusMessage');
    if(!banner || !message)return;
    const text=!stateSaved
      ? '遊技状態を保存できません。この画面を閉じると進行が失われる可能性があります。保存先の空きを確保し、再保存してください。'
      : !preferencesSaved ? '遊技状態は保存済みですが、共通設定の保存に失敗しました。再保存してください。' : '';
    if(message.textContent!==text)message.textContent=text;
    banner.hidden=!text;
  }

  function persistState(){
    if(!canUsePlayState())return false;
    // Commit the result and removal of the pending spin together, after finishSpin returns.
    if(currentSpin?.finishing)return false;
    if(A_TYPE_MODE)syncNovaProgress();
    auditCapture();
    const savedAt = Date.now();
    const runtimeState = runtimeStateForStorage();
    const write=(key,value)=>{
      try{return safeStorageSet(key,JSON.stringify(value));}
      catch(e){console.warn('Failed to serialize local state',e);return false;}
    };
    const preferencesOk = write(PREFERENCES_STORAGE_KEY, {savedAt, settings});
    const resumeOk = write(STORAGE_RESUME_KEY, {
      savedAt,
      settings,
      stats:compactStatsForResume(),
      normalState,
      completeTrialState,
      runtimeState
    });
    const fullOk = write(STORAGE_KEY, {savedAt, settings, stats, normalState, completeTrialState, runtimeState});
    const stateSaved=!!(fullOk || resumeOk);
    updateStorageStatus(stateSaved,preferencesOk);
    return stateSaved;
  }

  function save(){
    readSettings();
    normalizeSlumpHistory();
    if(persistState()){
      log("設定を保存しました");
    }else{
      log("保存に失敗しました");
      showMessage("SAVE ERROR", "遊技状態を保存できません。画面下部の案内を確認してください");
    }
  }

  function sessionBaselineStats(source=stats){
    const totalFee = Math.max(0, Number(source && source.totalFee) || 0);
    const totalPaid = Math.max(0, Number(source && source.totalPaid) || 0);
    return {
      totalFee,
      totalPaid,
      profit:totalPaid - totalFee,
      totalSpins:Math.max(0, Number(source && source.totalSpins) || 0),
      bigCount:Math.max(0, Number(source && source.bigCount) || 0),
      midCount:Math.max(0, Number(source && source.midCount) || 0),
      grapeCount:Math.max(0, Number(source && source.grapeCount) || 0)
    };
  }

  function initializePlaySessionBaseline(){
    if(!SLOT_PLAY_SESSION) return;
    let saved = null;
    if(PLAY_SESSION_BASELINE_STORAGE_KEY){
      try{
        const parsed = JSON.parse(safeStorageGet(PLAY_SESSION_BASELINE_STORAGE_KEY) || "null");
        if(parsed && typeof parsed === "object") saved = sessionBaselineStats(parsed);
      }catch(e){}
    }
    playSessionStartStats = saved || sessionBaselineStats(stats);
    if(PLAY_SESSION_BASELINE_STORAGE_KEY){
      safeStorageSet(PLAY_SESSION_BASELINE_STORAGE_KEY, JSON.stringify(playSessionStartStats));
    }
  }

  function playSessionBaselineProfit(){
    if(playSessionStartStats) return Number(playSessionStartStats.profit) || 0;
    return CREDIT_BASELINE_PROFIT;
  }

  function adminSnapshot(){
    const profit = stats.totalPaid - stats.totalFee;
    const adminStats = compactStatsForResume();
    return {
      machineId,
      playSessionId:PLAY_SESSION_ID,
      playSessionStartStats:playSessionStartStats ? {...playSessionStartStats} : null,
      name: settings.title || machineId,
      settings:{
        title: settings.title,
        setting: settings.setting,
        fee: settings.fee,
        stSpins: settings.stSpins,
        oddsMultiplier: settings.oddsMultiplier,
        autoDelay: settings.autoDelay,
        masterVolume: settings.masterVolume,
        bgmVolume: settings.bgmVolume,
        sfxVolume: settings.sfxVolume,
        voiceVolume: settings.voiceVolume,
        payoutVolume: settings.payoutVolume,
        movieVolume: settings.movieVolume,
        rogiMovieVolume: settings.rogiMovieVolume,
        audioMuted: settings.audioMuted,
        completeLimitPt: completeLimitPt()
      },
      stats:{...adminStats, profit},
      normalState:{...normalState},
      session:{...session},
      completeTrialState:{...completeTrialState},
      state:{
        isSpinning,
        spinCanStop,
        autoPlay,
        forceResult,
        forcePremiumEffect,
        resultText: $("resultText") ? $("resultText").textContent : ""
      },
      updatedAt: Date.now()
    };
  }

  function pushAdminState(snapshot){
    if(!canUsePlayState())return;
    if(!ADMIN_SERVER || !window.fetch || !machineId || machineId === "null" || machineId === "undefined") return;
    return fetch(`${ADMIN_SERVER}/api/machines/${encodeURIComponent(machineId)}/state`, {
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body:JSON.stringify(snapshot || adminSnapshot())
    }).then(response=>{
      setAdminConnectionState(response.ok ? "online" : "offline");
      return response;
    }).catch(()=>{ setAdminConnectionState("offline"); });
  }

  function pushAdminStateOnExit(snapshot){
    if(!canUsePlayState())return;
    if(!ADMIN_SERVER || !machineId || machineId === "null" || machineId === "undefined") return;
    const url = `${ADMIN_SERVER}/api/machines/${encodeURIComponent(machineId)}/state`;
    const body = JSON.stringify(snapshot || adminSnapshot());
    try{
      if(window.navigator && typeof navigator.sendBeacon === "function"){
        const blob = new Blob([body], {type:"application/json"});
        if(navigator.sendBeacon(url, blob)) return;
      }
    }catch(e){}
    try{
      fetch(url, {
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body,
        keepalive:true
      }).catch(()=>{});
    }catch(e){}
  }

  function scheduleAdminStatePush(delay=ADMIN_STATE_PUSH_INTERVAL_MS){
    const normalizedDelay = Math.max(0, Number(delay) || 0);
    const nextDueAt = Date.now() + normalizedDelay;
    if(adminPushTimer && adminPushDueAt <= nextDueAt) return;
    if(adminPushTimer) clearTimeout(adminPushTimer);
    adminPushDueAt = nextDueAt;
    adminPushTimer = setTimeout(()=>{
      adminPushTimer = null;
      adminPushDueAt = 0;
      pushAdminState();
    }, normalizedDelay);
  }

  function latestAdminSnapshot(){
    if(!canUsePlayState())return null;
    readSettings();
    normalizeSlumpHistory();
    persistState();
    return adminSnapshot();
  }

  window.__jagAdminSnapshot = latestAdminSnapshot;
  window.__jagPrepareEndSnapshot = ()=>{
    const snapshot = latestAdminSnapshot();
    pushAdminState(snapshot);
    return snapshot;
  };
  window.__jagPushAdminState = ()=>pushAdminState(latestAdminSnapshot());
  window.__jagClearLocalPlayState = ()=>{
    if(!canUsePlayState())return;
    try{
      if(window.localStorage){
        localStorage.removeItem(STORAGE_KEY);
        localStorage.removeItem(STORAGE_RESUME_KEY);
        if(PLAY_SESSION_BASELINE_STORAGE_KEY) localStorage.removeItem(PLAY_SESSION_BASELINE_STORAGE_KEY);
      }
    }catch(e){}
  };

  function applyAdminSettings(nextSettings){
    if(!canUsePlayState() || !nextSettings) return;
    const setValue = (id, value)=>{
      const el = $(id);
      if(el && value !== undefined && value !== null) el.value = value;
    };
    setValue("titleInput", nextSettings.title);
    setValue("settingSelect", nextSettings.setting);
    setValue("feeInput", nextSettings.fee);
    setValue("stSpinsInput", nextSettings.stSpins);
    setValue("oddsMultiplierInput", nextSettings.oddsMultiplier);
    setValue("autoDelayInput", nextSettings.autoDelay);
    setValue("masterVolume", nextSettings.masterVolume);
    setValue("bgmVolume", nextSettings.bgmVolume);
    setValue("sfxVolume", nextSettings.sfxVolume);
    setValue("voiceVolume", nextSettings.voiceVolume);
    setValue("payoutVolume", nextSettings.payoutVolume);
    setValue("movieVolume", nextSettings.movieVolume);
    setValue("rogiMovieVolume", nextSettings.rogiMovieVolume);
    if(nextSettings.audioMuted !== undefined) settings.audioMuted = !!nextSettings.audioMuted;
    if(nextSettings.completeLimitPt !== undefined){
      settings.completeLimitPt = Math.max(1, Math.round(Number(nextSettings.completeLimitPt) || DEFAULT_COMPLETE_LIMIT_PT));
    }
    readSettings();
    const saved=persistState();
    updateDisplay();
    log(saved ? "管理画面から設定を更新・保存" : "管理画面から設定を更新しましたが、保存できませんでした");
  }

  function handleAdminCommand(command){
    if(!canUsePlayState())return;
    if(!command || !command.type) return;
    if(command.type === "applySettings"){
      applyAdminSettings(command.settings || {});
    }else if(command.type === "reset"){
      morningResetGame(false, "管理リセット");
      setTimeout(()=>location.reload(), 250);
    }else if(command.type === "forceEnd"){
      log("旧方式の強制終了指示を無視");
    }else if(command.type === "forceResult"){
      const requested = command.result === "REACH_ME" || RESULT[command.result] ? command.result : "";
      forceResult = normalizeForceResult(requested);
      if($("forceResult")) $("forceResult").value = forceResult;
      log(forceResult ? `管理画面：次回転指定 ${forceResultName(forceResult)}` : "管理画面：次回転指定を解除");
      updateDisplay();
    }else if(command.type === "direct" && RESULT[command.result]){
      direct(command.result);
    }else if(command.type === "forceHigh"){
      forceHighModeNow();
    }else if(command.type === "startAuto"){
      startAutoPlay();
    }else if(command.type === "stopAuto"){
      stopAutoPlay("管理画面：オート停止");
    }else if(command.type === "startDebugFast"){
      startDebugFastSpin();
    }else if(command.type === "stopDebugFast"){
      stopDebugFastSpin("管理画面停止");
    }
    scheduleAdminStatePush(50);
  }

  async function pollAdminCommands(){
    if(!canUsePlayState() || !window.fetch || !ADMIN_SERVER || !machineId) return;
    try{
      const res = await fetch(`${ADMIN_SERVER}/api/machines/${encodeURIComponent(machineId)}/commands/poll?since=${encodeURIComponent(adminCommandLastId)}`, {cache:"no-store"});
      if(!canUsePlayState())return;
      if(res.ok){
        setAdminConnectionState("online");
        const data = await res.json();
        if(!canUsePlayState())return;
        const commands = Array.isArray(data.commands) ? data.commands : [];
        for(const row of commands){
          const command = row.command || row;
          handleAdminCommand(command);
          adminCommandLastId = Math.max(adminCommandLastId, Number(row.id || command.id || row.createdAtMs || 0) || 0);
        }
        safeStorageSet(ADMIN_COMMAND_LAST_ID_KEY, String(adminCommandLastId));
      }else setAdminConnectionState("offline");
    }catch(e){ setAdminConnectionState("offline"); }
    adminCommandPollTimer = setTimeout(pollAdminCommands, 5000);
  }

  function connectAdminCommands(){
    if(adminCommandPollTimer) clearTimeout(adminCommandPollTimer);
    adminCommandPollTimer = null;
    if(ADMIN_SERVER) pushAdminState();
    pollAdminCommands();
  }

  function arrangeDebugDrawerTop(){
    const drawer = document.querySelector(".debugDrawer");
    const secret = $("secretPanel");
    const closeBtn = drawer ? drawer.querySelector(".debugCloseBtn") : null;
    if(!drawer || !secret) return;
    if(closeBtn && closeBtn.nextSibling !== secret){
      drawer.insertBefore(secret, closeBtn.nextSibling);
    }else if(!closeBtn){
      drawer.insertBefore(secret, drawer.firstChild);
    }
  }

  function normalizeMachineTitle(value){
    const title = String(value || "").trim();
    if(!title || /^白い悪魔(?:\s*(轟雷|疾風))?$/.test(title) || /^jag$/i.test(title) || /^rising!?$/i.test(title) || /^nova$/i.test(title)) return "NOVA";
    return title;
  }

  function readSettings(){
    settings.title = normalizeMachineTitle($("titleInput").value);
    const previousSetting = Number(settings.setting) || 1;
    settings.setting = clamp(Number($("settingSelect").value) || 1, 1, 6);
    if(settings.setting !== previousSetting){
      morningResetGame(false, "設定変更");
      setMorningBarReels();
    }
    settings.fee = PAYOUT_BASE;
    settings.stSpins = clamp(Number($("stSpinsInput").value) || 10, 1, 100);
    settings.oddsMultiplier = clamp(Number($("oddsMultiplierInput").value) || 1, 0.1, 100);
    settings.smallMul = (A_TYPE_PAYOUTS.SMALL) / PAYOUT_BASE;
    settings.midMul = (A_TYPE_PAYOUTS.MID) / PAYOUT_BASE;
    settings.crownMul = 0.0;
    settings.cherryMul = (2) / PAYOUT_BASE;
    settings.bellMul = (A_TYPE_PAYOUTS.BELL) / PAYOUT_BASE;
    settings.suikaMul = ROLE_PAYOUTS.SUICA / PAYOUT_BASE;
    settings.bigMul = (A_TYPE_PAYOUTS.BIG) / PAYOUT_BASE;
    settings.bigAdd = A_TYPE_PAYOUTS.BIG;
    settings.autoDelay = clamp(Number($("autoDelayInput").value) || 0.5, 0.1, 10);
    if($("masterVolume")) settings.masterVolume = clamp(Number($("masterVolume").value) || 0, 0, 1);
    if($("bgmVolume")) settings.bgmVolume = clamp(Number($("bgmVolume").value) || 0, 0, 1);
    if($("sfxVolume")) settings.sfxVolume = clamp(Number($("sfxVolume").value) || 0, 0, 1);
    if($("voiceVolume")) settings.voiceVolume = clamp(Number($("voiceVolume").value) || 0, 0, 1);
    if($("payoutVolume")) settings.payoutVolume = clamp(Number($("payoutVolume").value) || 0, 0, 1);
    if($("movieVolume")) settings.movieVolume = clamp(Number($("movieVolume").value) || 0, 0, 1);
    if($("rogiMovieVolume")) settings.rogiMovieVolume = clamp(Number($("rogiMovieVolume").value) || 0, 0, 1);
    settings.audioMuted = !!settings.audioMuted;
    settings.audioBalanceVersion = AUDIO_BALANCE_VERSION;

    $("titleView").textContent = settings.title;
    if($("settingView")) $("settingView").textContent = settings.setting;
    if($("targetRtpView")) $("targetRtpView").textContent = targetRtpText();
    if($("targetRtpViewLegacy")) $("targetRtpViewLegacy").textContent = targetRtpText();
    if($("adminSettingView")) $("adminSettingView").textContent = settings.setting;
    if($("adminTargetRtpView")) $("adminTargetRtpView").textContent = targetRtpText();
    for(const settingNo of [1,2,3,4,5,6]){
      const option = document.querySelector(`#settingSelect option[value="${settingNo}"]`);
      if(option) option.textContent = `設定${settingNo} / ${targetRtpText(settingNo)}`;
    }
    const adminStInfoText = `${normalModeLabel()} / CZ・強CZ経由 / 1G ${SPIN_COST}pt`;
    if($("stInfoView")) $("stInfoView").textContent = adminStInfoText;
    if($("adminStInfoView")) $("adminStInfoView").textContent = adminStInfoText;

    if(bgm){
      if(!barBgmActive && !battleBgmActive) ensureNormalBgmSource();
      bgm.loop = true;
      bgm.volume = bgmOutputVolumeForSource(BGM_OUTPUT_SCALE, bgm.getAttribute("src") || normalBgmSrc());
      if(!barBgmActive && !battleBgmActive) playNormalBgm();
    }
    if(koatariSound){
      koatariSound.src = KOATARI_SOUND_SRC;
      koatariSound.volume = sfxOutputVolumeForSource(SFX_OUTPUT_SCALE, KOATARI_SOUND_SRC);
    }
    if(bigSound){
      bigSound.src = BIG_SOUND_SRC;
      bigSound.volume = sfxOutputVolumeForSource(SFX_OUTPUT_SCALE, BIG_SOUND_SRC);
    }
    if(payoutSound){
      const activePayoutSrc = payoutSound.getAttribute("src") || PAYOUT_SOUND_SRC;
      if(!payoutSound.getAttribute("src")){
        payoutSound.setAttribute("src", PAYOUT_SOUND_SRC);
      }
      payoutSound.volume = payoutOutputVolumeForSource(PAYOUT_SOUND_OUTPUT_SCALE, activePayoutSrc);
    }
    if(voiceSound){
      voiceSound.volume = voiceOutputVolume();
    }
    if(barBgm){
      if(!barBgmActive && barBgm.getAttribute("src") !== AT_BGM_SRC) barBgm.setAttribute("src", AT_BGM_SRC);
      barBgm.loop = true;
      barBgm.volume = bgmOutputVolumeForSource(BAR_BGM_OUTPUT_SCALE, activeBarBgmSrc());
      ensureBarBgmContinuing();
    }
    if(battleBgm){
      if(!battleBgmActive && battleBgm.getAttribute("src") !== BATTLE_BGM_SRC){
        battleBgm.setAttribute("src", BATTLE_BGM_SRC);
      }
      battleBgm.loop = true;
      battleBgm.volume = bgmOutputVolumeForSource(BATTLE_BGM_OUTPUT_SCALE, BATTLE_BGM_SRC);
      ensureBattleBgmContinuing();
    }
    if(gekiatsuVideo){
      if(gekiatsuVideo.getAttribute("src") !== GEKIATSU_VIDEO_SRC){
        gekiatsuVideo.setAttribute("src", GEKIATSU_VIDEO_SRC);
        gekiatsuVideo.load();
      }
      gekiatsuVideo.loop = false;
      gekiatsuVideo.volume = movieOutputVolumeForSource(MOVIE_OUTPUT_SCALE, GEKIATSU_VIDEO_SRC);
    }
    applyCharacterVoiceOutputVolumes();
    updateAudioMuteButton();
    renderSettingTable();
  }

  function applySettings(){
    $("titleInput").value = settings.title;
    $("settingSelect").value = String(settings.setting);
    $("feeInput").value = SPIN_COST;
    $("feeInput").readOnly = true;
    if($("feeInput").previousElementSibling) $("feeInput").previousElementSibling.textContent = "1回転コスト";
    $("stSpinsInput").value = 1;
    $("stSpinsInput").readOnly = !!A_TYPE_MODE;
    $("oddsMultiplierInput").value = settings.oddsMultiplier;
    if($("smallMulInput")) $("smallMulInput").value = (A_TYPE_PAYOUTS.SMALL) / PAYOUT_BASE;
    if($("midMulInput")) $("midMulInput").value = NovaArt.bonusTarget();
    if($("crownMulInput")) $("crownMulInput").value = 0;
    if($("cherryMulInput")) $("cherryMulInput").value = (2) / PAYOUT_BASE;
    if($("bellMulInput")) $("bellMulInput").value = (A_TYPE_PAYOUTS.BELL) / PAYOUT_BASE;
    if($("suikaMulInput")) $("suikaMulInput").value = ROLE_PAYOUTS.SUICA / PAYOUT_BASE;
    if($("bigMulInput")) $("bigMulInput").value = NovaArt.bonusTarget();
    if($("bigAddInput")) $("bigAddInput").value = NovaArt.bonusTarget();
    $("autoDelayInput").value = settings.autoDelay;
    if($("masterVolume")) $("masterVolume").value = settings.masterVolume;
    if($("bgmVolume")) $("bgmVolume").value = settings.bgmVolume;
    if($("sfxVolume")) $("sfxVolume").value = settings.sfxVolume;
    if($("voiceVolume")) $("voiceVolume").value = settings.voiceVolume;
    if($("payoutVolume")) $("payoutVolume").value = settings.payoutVolume;
    if($("movieVolume")) $("movieVolume").value = settings.movieVolume;
    if($("rogiMovieVolume")) $("rogiMovieVolume").value = settings.rogiMovieVolume;
    syncAllVolumeNumberInputs();
    readSettings();
  }

  function startSession(options={}){
    if(isSpinning) return false;
    if(session.active) return false;
    if(sessionStartGuard) return false;
    if(session.phase === "ended" && session.resultPayout !== null && session.resultPayout !== undefined){
      hideSessionResultScreen();
      session.phase = "idle";
      session.resultPayout = null;
      session.endSignal = null;

    }

    sessionStartGuard = true;
    try{
      stopBattleBgm(false);
      stopGuaranteedSetStartLight();
      devilZoneConfirmIntroPending = false;
      hideDevilZoneConfirmScreen();
      readSettings();
      if(A_TYPE_MODE){
        normalState.flow = normalState.flow?.phase==='art'?NovaArt.normalize(normalState.flow):NovaFlow.normalize(null);
        const bonusKind = normalizeATypeBonusKind(options.bonusKind || normalState.bonusKind || "BIG");
        const bonusTier=options.bonusTier===undefined?NovaArt.drawBonusTier():NovaArt.bonusTier(options.bonusTier);
        const oneGameRenBonus = bonusKind === "BIG" && !!(options.oneGameRenBonus || normalState.oneGameRenBonus);
        const premiumBonus = bonusKind === "BIG" && !oneGameRenBonus && !!(options.premiumBonus || normalState.premiumBonus);
        const premiumTargetBonus = premiumBonus || oneGameRenBonus;
        const premiumChainEligible = false;
        const initialNormalBonus=normalState.flow.phase!=='art';
        const impurityReleased=NovaNormal.normalize(normalState.internal).impurity>=100;
        const bonusGuarantee=NovaNormal.claim(normalState.internal,premiumBonus);
        bonusGuarantee.sets+=Number(normalState.prepSets)||0;
        bonusGuarantee.zones.push(...(normalState.prepZones||[]));
        normalState.prepSets=0;normalState.prepZones=[];normalState.prepLeft=0;normalState.prepConfirmed=false;
        normalState.internal=initialNormalBonus?NovaNormal.afterBonus(bonusGuarantee.state,Math.random,settings.setting):bonusGuarantee.state;
        const bonusTarget = aTypeBonusTarget(bonusKind, premiumTargetBonus);
        const bonusLabel = NovaArt.bonusLabel(bonusTier);
        const hadPreviousBonus = (Number(stats.totalSessions) || 0) > 0;
        const gamesSinceLastBonus = normalizeBonusAfterGames(Number.isFinite(Number(options.gamesSinceLastBonus))
          ? Number(options.gamesSinceLastBonus)
          : normalState.sinceBonus);
        const risingResumeRemain = normalizeNovaRisingRemain(Number.isFinite(Number(options.risingResumeRemain))
          ? Number(options.risingResumeRemain)
          : normalState.risingRemain);
        const risingBonusOrigin = options.risingBonusOrigin === undefined
          ? !!normalState.risingBonusOrigin
          : !!options.risingBonusOrigin;
        const within50 = hadPreviousBonus && gamesSinceLastBonus <= 50;
        const bonusBgm = pickATypeBonusBgm(bonusKind, within50, {premiumBonus, oneGameRenBonus});
        resetNormalModeAfterBonus();
        pauseNormalBgm();
        session = {
          active:true,
          remain:0,
          fee:0,
          cost:0,
          paid:0,
          hits:0,
          added:0,
          addedGames:0,
          setNo:1,
          stockSets:0,
          barBgmSets:0,
          nextSetBarBgm:false,
          currentSetBarBgm:false,
          continuationRate:0,
          bigZone:0,
          bigZoneType:"",
          phase:"a_type_bonus",
          bonusKind,
          bonusTier,
          bonusTarget,
          bonusPointsRemaining:NovaArt.bonusTarget(bonusKind),
          bonusArtSets:bonusGuarantee.sets,
          bonusZones:bonusGuarantee.zones,
          bonusStartGames:gamesSinceLastBonus,
          risingResumeRemain,
          risingBonusOrigin,
          premiumBonus,
          oneGameRenBonus,
          premiumChainEligible,
          bonusBgmSrc:bonusBgm.src || "",
          battleRemain:0,
          battleWin:false,
          battleSource:"",
          resultPayout:null,
          endSignal:null
        };
        jagLastBonusPayout = 0;
        jagLastGamePayout = 0;
        jagChanceHold = true;
        stats.totalSessions++;
        if(bonusTier==='upper')stats.upperBigCount=(Number(stats.upperBigCount)||0)+1;
        recordSlumpPoint();
        $("spinBtn").textContent = "BET";
        showMessage(bonusLabel, `${aTypeBonusRemainingNet()}pt / ${impurityReleased?'穢れ解放！ AT＋特化ゾーン確定':premiumBonus?'フリーズ！ AT＋特化ゾーン確定':'ネビュラを狙え！ 図柄揃いでAT確定'}`);
        if(bonusGuarantee.zones.length)log(`${impurityReleased?'穢れ解放 / ':''}${premiumBonus?'フリーズ / ':''}AT保証 / 特化予約：${bonusGuarantee.zones.map(z=>NovaArt.zoneName(z)).join('・')}`);
        log(`${bonusLabel} BONUS開始：${aTypeBonusRemainingNet()}pt / 設定${settings.setting}${within50 ? " / 50G以内" : ""}`);
        updateDisplay();
        playATypeBonusBgm(bonusBgm);
        return true;
      }

    } finally {
      sessionStartGuard = false;
    }
  }

  function clearPendingAtStart(){
    if(pendingAtStartTimer){
      clearTimeout(pendingAtStartTimer);
      pendingAtStartTimer = null;
    }
    pendingBonusStartOptions = null;
    updateDevilStatusLamp();
  }

  function startBonusSessionNow(options={}){
    try{
    const hasExplicitOptions = options && Object.keys(options).length > 0;
    const startOptions = hasExplicitOptions
      ? {...options}
      : pendingBonusStartOptions
        ? {...pendingBonusStartOptions}
        : {};
    setSpeedFrameOffHold(false);
    stopSpeedToBonus("ボーナス開始のためSPEED停止");
    clearPendingAtStart();
    clearPremiumBigConfirmMovie();
    const started = startSession(startOptions);
    if(started) scheduleNextAuto();
    return started;
    }finally{auditCapture({kind:'transition',message:'ボーナス開始処理'});}
  }

  function queueBonusSessionStart(delayMs=450, options={}){
    clearPendingAtStart();
    const startOptions = {...options};
    pendingBonusStartOptions = {...startOptions};
    const waitAndStart = ()=>{
      if(bonusConfirmSoundPlaying){
        pendingAtStartTimer = setTimeout(waitAndStart, 120);
        updateDevilStatusLamp();
        if($("resultText")) $("resultText").textContent = "ボーナス確定音再生中...";
        return;
      }
      if(isRogiThirdStopHoldActive()){
        pendingAtStartTimer = setTimeout(waitAndStart, 150);
        updateDevilStatusLamp();
        return;
      }
      pendingAtStartTimer = null;
      updateDevilStatusLamp();
      startBonusSessionNow(startOptions);
    };
    pendingAtStartTimer = setTimeout(waitAndStart, Math.max(0, delayMs));
    updateDevilStatusLamp();
  }

  function finishSession(){
    try{
    const aTypeEnd = isATypeBonusActive();
    const aTypeNet = aTypeEnd ? aTypeBonusNet() : 0;
    const resultPayout = aTypeEnd ? aTypeNet : session.paid;
    const endedBonusKind=session.bonusKind;
    const wonArtSets=Number(session.bonusArtSets)||0;
    const bonusStockSummary=NovaArt.bonusStockLabel(session,normalState.flow);
    const wonZones=Array.isArray(session.bonusZones)?session.bonusZones:[];
    const profit = session.paid - (Number(session.cost) || 0);
    const endedSets = session.setNo || 0;
    const bonusLabel = aTypeEnd ? aTypeBonusLabel(session.bonusKind) : "";
    const premiumOneGameRen = !!(
      !A_TYPE_MODE && aTypeEnd &&
      session.premiumChainEligible &&
      !session.oneGameRenBonus &&
      normalizeATypeBonusKind(session.bonusKind) === "BIG"
    );
    const carriedRisingRemain = normalizeNovaRisingRemain(session.risingResumeRemain);
    const bonusFromRising = !!session.risingBonusOrigin;
    const nextRisingRemain = aTypeEnd
      ? (premiumOneGameRen
        ? carriedRisingRemain
        : pickNovaRisingRemainAfterBonus(carriedRisingRemain, bonusFromRising, settings.setting))
      : 0;
    const risingStatusText = aTypeEnd && !premiumOneGameRen && nextRisingRemain > 0
      ? ` / RISING ${nextRisingRemain}G`
      : "";
    const settingVoiceAfterBonus = aTypeEnd ? pickSettingBonusEndVoiceSrc(settings.setting) : "";

    if(aTypeEnd){
      showMessage(`${bonusLabel}終了`, `獲得${resultPayout}pt / 払出${session.paid}pt / BET${session.cost}pt${risingStatusText}`);
      log(`${bonusLabel}終了：獲得${resultPayout}pt / 払出${session.paid}pt / BET${session.cost}pt${risingStatusText}`);
    }else if(A_TYPE_MODE){
      showMessage("ボーナス終了", `獲得pt ${session.paid}pt`);
      log(`ボーナス終了：獲得${session.paid}pt / 損益${formatSigned(profit)}pt`);
    }
    stopGekiatsuEffect(true);
    hideBattleIntro();
    devilZoneConfirmIntroPending = false;
    hideDevilZoneConfirmScreen();
    clearPremiumBigConfirmMovie();
    session.resultPayout = aTypeEnd ? null : resultPayout;
    session.endSignal = null;
    session.active = false;
    session.remain = 0;
    session.stockSets = 0;
    session.barBgmSets = 0;
    session.nextSetBarBgm = false;
    session.currentSetBarBgm = false;
    session.bigZone = 0;
    session.bigZoneType = "";
    session.bonusKind = "";
    session.bonusTarget = 0;
    session.bonusStartGames = 0;
    session.risingResumeRemain = 0;
    session.risingBonusOrigin = false;
    session.premiumBonus = false;
    session.oneGameRenBonus = false;
    session.premiumChainEligible = false;
    session.bonusBgmSrc = "";
    session.phase = (aTypeEnd || A_TYPE_MODE) ? "idle" : "ended";
    session.battleRemain = 0;
    session.battleWin = false;
    session.battleSource = "";
    jagChanceHold = false;
    resetBonusEndSpecialEffects(true);
    setSpeedFrameOffHold(false);
    if(aTypeEnd){
      const beforeBonusResume=normalState.flow;
      normalState.flow = NovaFlow.afterBonus(normalState.flow,{...settings.novaArt,setting:settings.setting},wonArtSets);
      normalState.internal=NovaNormal.bonusEnd(normalState.internal,endedBonusKind,normalState.flow,settings.novaNormal);
      resetNormalCountersAfterArt(beforeBonusResume,normalState.flow);
      if(normalState.flow.phase==='art'&&!Number.isFinite(normalState.resultAtStartPaid))normalState.resultAtStartPaid=Number(stats.totalPaid)||0;
      if(normalState.flow.phase==='art' && wonZones.length){
        normalState.flow.queuedZones.push(...wonZones);
        if(!normalState.flow.zone&&!normalState.flow.initialStage){const z=normalState.flow.queuedZones.shift();normalState.flow=NovaArt.startZone(normalState.flow,z,{...settings.novaArt,setting:settings.setting,allowUra:true});}
      }
      normalState.risingRemain = 0;
      normalState.risingBonusOrigin = premiumOneGameRen ? bonusFromRising : false;
      normalState.mode = nextRisingRemain > 0 ? "rising" : "normal";
      if(!premiumOneGameRen && nextRisingRemain > 0){
        log(`RISING開始：残り${nextRisingRemain}G`);
      }
    }
    if(premiumOneGameRen){
      normalState.bonusPending = true;
      normalState.bonusKind = "BIG";
      normalState.bonusSource = "BAR揃い1G連";
      normalState.premiumBonus = false;
      normalState.oneGameRenBonus = true;
      normalState.bonusWaitGames = 1;
      normalState.bonusHitGamesSince = 0;
      jagChanceHold = true;
      $("stLamp").classList.add("on");
      showMessage("PBB 1G連待機", "次BETでBAR揃い / 2回目PBB");
      log("PBB 1G連予約：次BETでBAR揃い");
    }
    normalState.pendingPremiumVoiceSrc = "";
    normalState.pendingSettingVoiceSrc = settingVoiceAfterBonus;
    if(settingVoiceAfterBonus) log("設定示唆ボイス予約：次GレバーON");
    $("spinBtn").textContent = "BET";
    jagLastBonusPayout = resultPayout;
    if(aTypeEnd){
      hideSessionResultScreen();
      if($("resultText")) $("resultText").textContent = premiumOneGameRen
        ? "PBB 1G連待機 / 次BETでBAR揃い"
        : `${bonusLabel}終了 / 獲得${resultPayout}pt`;
      showOverlay(premiumOneGameRen ? "PBB 1G連" : (nextRisingRemain > 0 ? `RISING ${nextRisingRemain}G` : "ボーナス終了"));
    }else if(A_TYPE_MODE){
      hideSessionResultScreen();
      if($("resultText")) $("resultText").textContent = `ボーナス終了 / 獲得${resultPayout}pt`;
      showOverlay("ボーナス終了");
    }
    if(resultPayout > 0 && !aTypeEnd){
      confetti(70);
      playWinSound(true);
    }else if(!aTypeEnd){
      playLoseSound();
    }
    if(aTypeEnd && !premiumOneGameRen){
      showMessage(normalState.flow.phase === "art" ? (normalState.flow.initialStage?"AT準備開始":"AT復帰") : "通常へ", "今回 "+bonusStockSummary+" / "+NovaFlow.label(normalState.flow));
      log("ボーナス終了："+bonusStockSummary+" / "+NovaFlow.label(normalState.flow));
      showOverlay(normalState.flow.phase === "art" ? (normalState.flow.initialStage?"AT準備中":"AT") : "ボーナス終了");
    }
    updateDisplay();
    }finally{auditCapture({kind:'transition',message:'ボーナス終了処理'});}
  }

  function consumeContinuationStockForBattle(){
    if(!session.active || (session.stockSets || 0) <= 0) return false;
    session.stockSets--;
    if((Number(session.barBgmSets) || 0) > 0){
      session.barBgmSets--;
      session.nextSetBarBgm = true;
    }else{
      session.nextSetBarBgm = false;
    }
    return true;
  }

  function beginNextSet(label, overlayText, useGuaranteedLight=false){
    const useBarBgmForSet = !!session.nextSetBarBgm;
    session.nextSetBarBgm = false;
    stopBattleBgm(false);
    session.setNo = (session.setNo || 1) + 1;
    session.remain = setGameCount();
    session.phase = "st";
    session.battleRemain = 0;
    session.battleWin = false;
    session.battleSource = "";
    showMessage(label, `${session.setNo}SET / 残り${session.remain}G / STOCK${session.stockSets || 0} / 継続${formatRate(session.continuationRate)}`);
    log(`${label}：${session.setNo}SET目 / 残りSTOCK${session.stockSets || 0}`);
    showOverlay(overlayText || label);
    queueDevilRushEntryEffect("continue");
    if(useGuaranteedLight) flashGuaranteedSetStart();
    else flashReelLight("rainbow", 1800);
    session.currentSetBarBgm = useBarBgmForSet;
    if(useBarBgmForSet) playBarBgm();
    else playAtBgm();
    playWinSound(false);
    updateDisplay();
    return true;
  }

  function startContinuationBattlePart(predecidedOutcome=null){
    if(isATypeBonusActive()) return false;
    if(!session.active || session.phase === "battle" || session.remain > 0 || isGoraiZoneActive()) return false;
    session.phase = "battle";
    session.battleRemain = CONTINUATION_BATTLE_GAMES;
    session.battleSource = "";
    session.nextSetBarBgm = false;
    if(predecidedOutcome && typeof predecidedOutcome.win === "boolean"){
      session.battleWin = !!predecidedOutcome.win;
      session.battleSource = predecidedOutcome.source || "";
      if(session.battleSource === "stock"){
        consumeContinuationStockForBattle();
      }
    }else if(consumeContinuationStockForBattle()){
      session.battleWin = true;
      session.battleSource = "stock";
    }else if(Math.random() < (session.continuationRate || 0)){
      session.battleWin = true;
      session.battleSource = "rate";
    }else{
      session.battleWin = false;
    }
    setBattleIntroContinueConfirmed(session.battleWin);
    playBattleBgm();
    showMessage("継続バトル", `${CONTINUATION_BATTLE_GAMES}G / 最終Gレア子役で復活抽選 / 継続${formatRate(session.continuationRate)}`);
    log(`継続バトル開始：${session.setNo || 1}SET目 / ${session.battleSource || "継続未確定"} / 残りSTOCK${session.stockSets || 0}`);
    updateDisplay();
    return true;
  }

  function completeContinuationBattle(finalResult){
    if(!session.active || session.phase !== "battle" || session.battleRemain > 0) return false;

    if(!session.battleWin){
      const revivalRate = revivalRateForResult(finalResult);
      if(revivalRate > 0 && Math.random() < revivalRate){
        session.battleWin = true;
        session.battleSource = "revival";
      }
    }

    if(!session.battleWin && consumeContinuationStockForBattle()){
      session.battleWin = true;
      session.battleSource = "stock";
    }

    if(session.battleWin){
      if(session.battleSource === "stock") return beginNextSet("STOCK継続", "NEXT SET", true);
      if(session.battleSource === "revival") return beginNextSet("復活ッッ！", "復活ッッ！", false);
      return beginNextSet("継続ッッ！", "継続ッッ！", false);
    }

    $("resultText").textContent = "継続バトル敗北 / 終了";
    finishSession();
    return false;
  }

  function advanceBattleSetIfNeeded(finalResult="MISS"){
    if(!session.active) return false;
    if(session.phase === "battle") return completeContinuationBattle(finalResult);
    if(session.remain > 0 || isGoraiZoneActive()) return false;
    return startContinuationBattlePart();
  }

  function resolveOutcome(result){
    if(isATypeBonusActive()){
      return resolveATypeBonusOutcome(result);
    }
    const inGoraiZone = session.active && session.bigZone > 0;
    const zoneType = inGoraiZone ? currentGoraiZoneType() : "";
    const startZone = inGoraiZone ? {games:0, type:""} : startZoneForResult(result, zoneType);
    const zoneSeven = inGoraiZone ? resolveZoneSevenBonus(result) : {sets:0, games:0, hit:false};
    return {
      reward: inGoraiZone ? ZONE_CHALLENGE_PAYOUT : rewardFor(result),
      add: inGoraiZone ? 0 : stAddFor(result),
      sets: inGoraiZone ? 0 : stockSetsForResult(result),
      bigZone:startZone.games,
      bigZoneType:startZone.type,
      zoneGame: inGoraiZone,
      zoneType,
      zoneSets: inGoraiZone ? zoneSeven.sets : 0,
      zoneStGames: inGoraiZone ? zoneSeven.games : 0,
      zoneGameAdd:0,
      zoneSevenHit:zoneSeven.hit
    };
  }

  function stopGekiatsuEffect(immediate=true){
    restoreBgmAfterRogiStopEffect();
    if(gekiatsuHideTimer){
      clearTimeout(gekiatsuHideTimer);
      gekiatsuHideTimer = null;
    }
    const exec = ()=>{
      gekiatsuActive = false;
      speedBonusRogiHoldActive = false;
      if(gekiatsuLayer) gekiatsuLayer.classList.remove("show", "solidMovie");
      if(gekiatsuVideo){
        try{
          gekiatsuVideo.onended = null;
          gekiatsuVideo.pause();
          gekiatsuVideo.currentTime = 0;
        }catch(e){}
      }
    };
    if(immediate){
      exec();
    }else{
      gekiatsuHideTimer = setTimeout(exec, 900);
    }
  }

  function fadeOutGekiatsuEffect(){
    restoreBgmAfterRogiStopEffect();
    if(gekiatsuHideTimer){
      clearTimeout(gekiatsuHideTimer);
      gekiatsuHideTimer = null;
    }
    gekiatsuActive = false;
    speedBonusRogiHoldActive = false;
    if(gekiatsuVideo) gekiatsuVideo.onended = null;
    if(gekiatsuLayer) gekiatsuLayer.classList.remove("show");
    gekiatsuHideTimer = setTimeout(()=>{
      if(gekiatsuLayer) gekiatsuLayer.classList.remove("solidMovie");
      if(gekiatsuVideo){
        try{
          gekiatsuVideo.pause();
          gekiatsuVideo.currentTime = 0;
        }catch(e){}
      }
      gekiatsuHideTimer = null;
    }, 260);
  }

  function startGekiatsuEffect(forced=false, videoSrc=GEKIATSU_VIDEO_SRC, logLabel="PREMIUM MOVIE", options={}){
    if(!gekiatsuLayer || !gekiatsuVideo) return;
    if(speedModeVisualsSuppressed() && !options.allowDuringSpeed) return;
    if(gekiatsuHideTimer){
      clearTimeout(gekiatsuHideTimer);
      gekiatsuHideTimer = null;
    }
    if(options.muteBgm){
      muteBgmForRogiStopEffect();
    }
    gekiatsuActive = true;
    speedBonusRogiHoldActive = !!options.holdUntilEndOrBet;
    gekiatsuLayer.classList.toggle("solidMovie", !!options.solid);
    gekiatsuVideo.onended = null;
    if(gekiatsuVideo.getAttribute("src") !== videoSrc){
      gekiatsuVideo.setAttribute("src", videoSrc);
      gekiatsuVideo.load();
    }
    gekiatsuVideo.loop = false;
    gekiatsuVideo.muted = !!options.muted;
    gekiatsuVideo.playsInline = true;
    const videoVolumeScale = Number.isFinite(Number(options.volumeScale)) ? Number(options.volumeScale) : MOVIE_OUTPUT_SCALE;
    gekiatsuVideo.volume = options.volumeGroup === "rogi"
      ? rogiMovieOutputVolumeForSource(videoVolumeScale, videoSrc)
      : movieOutputVolumeForSource(videoVolumeScale, videoSrc);
    if(options.fadeOnEnd){
      gekiatsuVideo.onended = fadeOutGekiatsuEffect;
    }else if(options.holdUntilBet){
      gekiatsuVideo.onended = ()=>restoreBgmAfterRogiStopEffect();
    }
    try{
      gekiatsuVideo.currentTime = 0;
      const p = gekiatsuVideo.play();
      if(p && typeof p.catch === "function") p.catch(()=>{});
    }catch(e){}
    gekiatsuLayer.classList.add("show");
    log(forced ? `強制${logLabel}` : logLabel);
  }

  function skipActiveEffects(){
    if(currentSpin) currentSpin.effectsSkipped = true;
    stopGekiatsuEffect(true);
    hideBonusConfirmScreen();
    clearReelVideos({forceReversePush:true});
    hideBattleIntro();
    log("演出をスキップ");
  }

  function normalBgmSrc(){
    if(!session.active && normalState.flow?.phase==='art'){
      if(normalState.flow.initialStage==='zone'&&['kushuri_nito','kushuri','nito'].includes(normalState.flow.zone))return INITIAL_DUO_ZONE_BGM_SRC;
      const zoneTracks = {sosuke:SOSUKE_ZONE_BGM_SRC,toto:TOTO_ZONE_BGM_SRC,urapi:URAPI_ZONE_BGM_SRC,sora:SORA_ZONE_BGM_SRC,giru:GIRU_ZONE_BGM_SRC,ouma:OUMA_ZONE_BGM_SRC};
      return zoneTracks[normalState.flow.zone] || NOVA_ART_BGM_SRC;
    }
    if(!session.active && ["cz","strong_cz"].includes(normalState.flow?.phase)) return CZ_BGM_SRC;
    if(speedToBonusActive && SPEED_BGM_SRC) return SPEED_BGM_SRC;
    if(!session.active && isHighMode() && HIGH_MODE_BGM_SRC) return HIGH_MODE_BGM_SRC;
    return DEFAULT_NORMAL_BGM_SRC;
  }

  function ensureNormalBgmSource(){
    if(!bgm) return "";
    const src = normalBgmSrc();
    if(src && bgm.getAttribute("src") !== src){
      bgm.setAttribute("src", src);
      try{ bgm.load(); }catch(e){}
    }
    return src;
  }

  function playNormalBgm(){
    if(globalThis.NovaRushConfirm?.active)return;
    const initialDuoZone=normalState.flow?.initialStage==='zone'&&['kushuri_nito','kushuri','nito'].includes(normalState.flow.zone);
    if(normalState.resultCard || normalState.pendingZoneResult || normalState.ladderAwardPresentation || (NovaDirectAward.busy&&!initialDuoZone)){pauseNormalBgm();return;}
    if(debugFastSpinActive) return;
    if(session.active) return;
    if(bonusConfirmBgmHold && !session.active) return;
    // ブラウザの自動再生制限により、初回クリック/操作後に再生される
    if(!bgm || barBgmActive || battleBgmActive) return;
    try{
      const src = ensureNormalBgmSource();
      if(!src) return;
      globalThis.NovaBeatLamps?.attach(bgm,getAudio());
      bgm.loop = true;
      bgm.volume = bgmOutputVolumeForSource(BGM_OUTPUT_SCALE, src);
      if(bgm.paused){
        bgm.play().catch(()=>{});
      }
    }catch(e){}
  }

  function pauseNormalBgm(){
    if(!bgm) return;
    try{
      bgm.pause();
    }catch(e){}
  }

  function playBarAudioSource(src, mode, logLabel){
    if(globalThis.NovaRushConfirm?.active)return;
    if(debugFastSpinActive) return;
    if(!barBgm) return;
    if(!src) return;
    if(isContinuationBattleActive() || battleBgmActive) return;
    try{
      pauseNormalBgm();
      barBgmActive = true;
      barBgmMode = mode || "";
      if(barBgm.getAttribute("src") !== src){
        barBgm.setAttribute("src", src);
        try{ barBgm.load(); }catch(e){}
      }
      globalThis.NovaBeatLamps?.attach(barBgm,getAudio());
      barBgm.loop = true;
      barBgm.volume = bgmOutputVolumeForSource(BAR_BGM_OUTPUT_SCALE, src);
      if(barBgm.paused){
        barBgm.play().catch(()=>{});
        if(logLabel) log(logLabel);
      }
    }catch(e){}
    updateDevilStatusLamp();
  }

  function playAtBgm(){
    playBarAudioSource(AT_BGM_SRC, "at", "AT BGM再生");
  }

  function playBarBgm(){
    playBarAudioSource(BAR_BGM_SRC, "bar", "BAR揃いBGM再生");
  }

  function pickATypeBonusBgm(kind="BIG", within50=false, options={}){
    const normalized = normalizeATypeBonusKind(kind);
    if(A_TYPE_MODE)return {src:NOVA_BIG_BGM_SRC,label:'BIG BGM'};
  }

  function playATypeBonusBgm(bgmInfo){
    if(!bgmInfo || !bgmInfo.src) return;
    playBarAudioSource(bgmInfo.src, "a_type_bonus", `${bgmInfo.label}再生`);
  }

  function resumeSessionBgm(){
    if(!session.active) return;
    if(session.phase === "a_type_bonus"){
      playATypeBonusBgm({src:session.bonusBgmSrc, label:"BONUS BGM"});
      return;
    }
    if(session.currentSetBarBgm) playBarBgm();
    else playAtBgm();
  }

  function activeBarBgmSrc(){
    if(barBgmMode === "a_type_bonus") return session.bonusBgmSrc || "";
    return barBgmMode === "bar" ? BAR_BGM_SRC : AT_BGM_SRC;
  }

  function playBattleBgm(){
    if(debugFastSpinActive) return;
    if(!battleBgm) return;
    if(!BATTLE_BGM_SRC) return;
    try{
      pauseNormalBgm();
      if(barBgmActive && barBgm){
        barBgmActive = false;
        barBgmMode = "";
        barBgm.pause();
        barBgm.currentTime = 0;
        updateDevilStatusLamp();
      }
      battleBgmActive = true;
      if(battleBgm.getAttribute("src") !== BATTLE_BGM_SRC){
        battleBgm.setAttribute("src", BATTLE_BGM_SRC);
      }
      battleBgm.loop = true;
      battleBgm.volume = bgmOutputVolumeForSource(BATTLE_BGM_OUTPUT_SCALE, BATTLE_BGM_SRC);
      if(battleBgm.paused){
        battleBgm.play().catch(()=>{});
        log("継続バトルBGM再生");
      }
    }catch(e){}
  }

  function stopBattleBgm(resumeNormal=false){
    battleBgmActive = false;
    if(battleBgm){
      try{
        battleBgm.pause();
        battleBgm.currentTime = 0;
      }catch(e){}
    }
    if(resumeNormal){
      if(session.active) resumeSessionBgm();
      else playNormalBgm();
    }
    updateDevilStatusLamp();
  }

  function ensureBattleBgmContinuing(){
    if(!battleBgmActive || !battleBgm) return;
    if(!BATTLE_BGM_SRC) return;
    try{
      if(battleBgm.getAttribute("src") !== BATTLE_BGM_SRC){
        battleBgm.setAttribute("src", BATTLE_BGM_SRC);
      }
      battleBgm.loop = true;
      battleBgm.volume = bgmOutputVolumeForSource(BATTLE_BGM_OUTPUT_SCALE, BATTLE_BGM_SRC);
      if(battleBgm.paused){
        battleBgm.play().catch(()=>{});
      }
    }catch(e){}
  }

  function stopBarBgm(resumeNormal=false){
    barBgmActive = false;
    barBgmMode = "";
    stopBarRainbowHold();
    if(barBgm){
      try{
        barBgm.pause();
        barBgm.currentTime = 0;
      }catch(e){}
    }
    if(resumeNormal) playNormalBgm();
    updateDevilStatusLamp();
  }

  function resetBonusEndSpecialEffects(resumeNormal=true){
    restoreBgmAfterRogiStopEffect();
    barBgmActive = false;
    barBgmMode = "";
    battleBgmActive = false;
    barRainbowHold = false;
    devilZoneConfirmIntroPending = false;
    hideDevilZoneConfirmScreen();
    stopGuaranteedSetStartLight();
    clearReelLight(false);
    if(barBgm){
      try{
        barBgm.pause();
        barBgm.currentTime = 0;
      }catch(e){}
    }
    if(battleBgm){
      try{
        battleBgm.pause();
        battleBgm.currentTime = 0;
      }catch(e){}
    }
    updateDevilStatusLamp();
    if(resumeNormal) playNormalBgm();
  }

  function ensureBarBgmContinuing(){
    if(!barBgmActive || !barBgm || battleBgmActive || isContinuationBattleActive()) return;
    try{
      const src = activeBarBgmSrc();
      if(barBgm.getAttribute("src") !== src){
        barBgm.setAttribute("src", src);
        try{ barBgm.load(); }catch(e){}
      }
      globalThis.NovaBeatLamps?.attach(barBgm,getAudio());
      barBgm.loop = true;
      barBgm.volume = bgmOutputVolumeForSource(BAR_BGM_OUTPUT_SCALE, src);
      if(barBgm.paused){
        barBgm.play().catch(()=>{});
      }
    }catch(e){}
  }

  function fastAtAuditMessage(result, resolved){
    if(!resolved?.artMessage || !/ゾーン終了|特化ゾーン確定|次のATセット|AT終了|直乗せ|ゾーン獲得|チャレンジ/.test(resolved.artMessage))return '';
    const f=resolved.flowAfter;
    return `[FAST][AT] ${result} / ${resolved.artMessage} / 残り${f?.remaining ?? 0}pt / 特化ストック${BigInt(f?.sets||0)+BigInt(f?.queuedZones?.length||0)}個`;
  }

  function displayNovaResult(card){
    if(debugFastSpinActive)return;
    if(NovaAim.busy){pauseNormalBgm();NovaAim.afterWin(()=>displayNovaResult(card));return;}
    if(NovaDirectAward.deferResult(()=>displayNovaResult(card))){pauseNormalBgm();return;}
    NovaDirectAward.clear();
    NovaLadder.hide();
    NovaAim.hide();
    NovaInitialDuo.clear();
    normalState.resultCard=card;NovaResults.show(card);
    pauseNormalBgm();
    // Keep AUTO selected; its audio gate waits for the complete eyecatch before BET.
    stopSpeedToBonus('リザルト表示');
    playLockedBonusConfirmSound('assets/media/nova/result-eyecatch.wav',bgmOutputVolume(BGM_OUTPUT_SCALE));
  }
  function applyNormalResult(result, resolved, lineRow=1){
    try{
    if(typeof debugFastSpinActive!=='undefined' && debugFastSpinActive){const audit=fastAtAuditMessage(result,resolved);if(audit)log(`${audit} / ${stats.totalSpins}G`);}
    const completedLadderPresentation=normalState.ladderAwardPresentation?.started?normalState.ladderAwardPresentation:null;
    playStrongNovaSound(result,resolved);
    playWeakNovaSound(result,resolved);
    playChanceSound(result,resolved);
    if(A_TYPE_MODE && result==="REPLAY")normalState.replayFree=true;
    if(A_TYPE_MODE && resolved.aTypeBonusReady)jagChainBonusHandoff=true;
    if(A_TYPE_MODE && resolved.normalInternal)normalState.internal=NovaNormal.normalize(resolved.normalInternal);
    showCzPrelude(3,resolved);
    const info = RESULT[result] || RESULT.MISS;
    const modeAtStart = NovaFlow.label(resolved.flowBefore);
    const lineText = result !== "MISS" ? `${lineName(lineRow)}ライン` : "";
    const normalReward = Number(resolved.reward) || 0;
    const normalRewardText = normalReward > 0 ? ` / +${normalReward}pt` : "";
    jagLastGamePayout = normalReward;

    if(resolved.flowBefore?.zero){
      // 0G連は回転数に含めない。
    }else if(resolved.highAtStart){
      stats.highSpins = (Number(stats.highSpins) || 0) + 1;
    }else{
      stats.normalSpins = (Number(stats.normalSpins) || 0) + 1;
    }

    countRoleStat(result, !!(resolved.bonusReady || resolved.regReady));
    if(normalReward > 0){
      stats.totalPaid = (Number(stats.totalPaid) || 0) + normalReward;
      playPayoutSound(result, normalReward);
      recordSlumpPoint();
      updateCompleteTrialState("通常払い出し");
    }
    normalState.sinceBonus = normalizeBonusAfterGames(resolved.ceilingAfter);
    if(A_TYPE_MODE){
      normalState.flow = NovaFlow.normalize(resolved.flowAfter);
      const zoneCard=resolved.comebackEvent==='entry'?null:NovaResults.transition(resolved.flowBefore,normalState.flow,settings.setting);
      if(zoneCard){
        if(!debugFastSpinActive&&NovaLadder.eligible(resolved.flowBefore)){
          normalState.ladderAwardPresentation={card:zoneCard,flow:resolved.flowBefore,started:false,promoted:result!=="MISS"};
        }else displayNovaResult(zoneCard);
      }
      if(completedLadderPresentation){delete normalState.ladderAwardPresentation;displayNovaResult(completedLadderPresentation.card);}
      if(resolved.flowBefore?.phase==='art'&&normalState.flow.phase==='normal'&&!resolved.bonusHit&&!resolved.aTypeBonusReady){
        const base=Number.isFinite(normalState.resultAtStartPaid)?normalState.resultAtStartPaid:(Number(stats.totalPaid)||0)-normalReward;
        displayNovaResult({kind:'at',...NovaResults.pick('at','',settings.setting),pt:String(Math.max(0,(Number(stats.totalPaid)||0)-base))});
        delete normalState.resultAtStartPaid;
      }
      resetNormalCountersAfterArt(resolved.flowBefore,normalState.flow);
      normalState.risingRemain = 0;
      normalState.mode = normalState.flow.phase;
      if(!resolved.bonusPendingAtStart && (resolved.bonusHit || resolved.aTypeBonusReady)){
        normalState.risingBonusOrigin = !!resolved.risingAtStart;
      }
    }

    if(resolved.comebackEvent){
      showMessage(resolved.artMessage,normalModeLabel());log(resolved.artMessage);
      if(resolved.comebackEvent==='entry')showOverlay('引き戻しゾーン');
      if(resolved.comebackEvent==='success')showOverlay('AT復活！');
      return;
    }
    if(resolved.czPrelude?.enter){showMessage('CZ前兆','リール全消灯');log('CZ前兆：リール全消灯 / 次BETでCZ告知');return;}
    if(A_TYPE_MODE && (resolved.czEntry || resolved.rtCompleted || (resolved.czCompleted && !resolved.bonusHit))){
      if(resolved.artMessage){showMessage(resolved.artMessage,normalModeLabel());if(!resolved.czAnnounced)showOverlay(resolved.artMessage);log(resolved.artMessage);return;}
      const message=resolved.czEntry ? (result === "STRONG_CZ" ? "強CZ突入" : "CZ突入") : resolved.rtCompleted ? "RT終了" : "CZ失敗";
      showMessage(message, normalModeLabel()+normalRewardText);
      log(message+" / "+normalModeLabel());
      showOverlay(message);
      return;
    }
    if(resolved.artMessage && !resolved.bonusHit && !resolved.aTypeBonusReady){
      showMessage(resolved.artMessage,normalModeLabel());log(resolved.artMessage);
      const ladderGain=Number(resolved.zoneAward)>0&&(NovaLadder.eligible(resolved.flowBefore)||NovaLadder.eligible(resolved.flowAfter));
      if(!NovaDirectAward.amount(resolved)&&!ladderGain){
        const e=resolved.researchChallenge,s=resolved.researchSortie;
        showOverlay(e?(e.finished?(e.won?'上位AT確定！':'通常ATへ'):e.nextAim?'HOLD':e.priorAim?'継続':'残り'+e.left+'G'):s?(s.won?NovaArt.zoneName(s.zone)+'獲得！':'ノヴァ出陣'):resolved.artMessage);
      }
      return;
    }
    if(resolved.manualLineupMiss){
      jagChanceHold = true;
      normalState.bonusPending = true;
      normalState.bonusKind = resolved.bonusKind || normalState.bonusKind || "BIG";
      normalState.bonusSource = resolved.bonusSource || normalState.bonusSource || "BONUS確定";
      normalState.premiumBonus = !!(resolved.premiumBonus || normalState.premiumBonus);
      normalState.oneGameRenBonus = !!(resolved.oneGameRenBonus || normalState.oneGameRenBonus);
      normalState.bonusWaitGames = Math.max(1, Number(normalState.bonusWaitGames) || 1);
      $("stLamp").classList.add("on");
      showMessage("目押し失敗", `${pendingBonusLabel()}を狙ってください / BONUS確定は持ち越し`);
      log(`目押し失敗：${pendingBonusLabel()}揃い持ち越し`);
      return;
    }

    if(resolved.bonusWaitSpin && A_TYPE_MODE){
      normalState.prepLeft=Math.max(0,(normalState.prepLeft||0)-1);
      const won=NovaArt.drawPreparation(result,settings.setting);
      normalState.prepSets=(normalState.prepSets||0)+won.sets;
      (normalState.prepZones??=[]).push(...won.zones);
      if(won.sets)log('ボーナス準備中：AT権利／特化ストック＋'+won.sets+'個');
      if(won.zones.length)log('ボーナス準備中 '+won.zones.map(NovaArt.zoneName).join('・')+'ゾーン獲得');
      showMessage('ボーナス準備中',normalState.prepLeft?'残り'+normalState.prepLeft+'G':'次BETで7を狙え');
      return;
    }
    if(resolved.bonusWaitSpin){
      jagChanceHold = true;
      normalState.bonusWaitGames = Math.max(1, (Number(normalState.bonusWaitGames) || 0) + 1);
      $("stLamp").classList.add("on");
      showBonusConfirmScreen();
      showMessage("BONUS確定", `${resolved.bonusSource} / 1G演出 / ハズレ / 次BETで${pendingBonusLabel()}揃い`);
      log(`BONUS確定演出：${resolved.bonusSource} / 1Gハズレ / 次ゲーム${pendingBonusLabel()}揃い`);
      flashReelLight("rainbow", 1800);
      showOverlay("BONUS確定");
      return;
    }

    if(resolved.aTypeBonusReady){
      jagChanceHold = true;
      jagLastBonusPayout = 0;
      resetNormalModeAfterBonus();
      $("stLamp").classList.add("on");
      const isRegBonus = resolved.bonusKind === "MID" || result === "MID" || result === "MID_CHERRY";
      const premiumBonus = !isRegBonus && !!(resolved.premiumBonus || resolved.oneGameRenBonus);
      const bonusLabel = isRegBonus ? "RB" : aTypeBonusLabel("BIG", premiumBonus);
      const bonusTarget = aTypeBonusTarget(isRegBonus ? "MID" : "BIG", premiumBonus);
      const sourceText = resolved.bonusSource || "単独当選";
      showMessage(`${bonusLabel}確定`, `${sourceText} / ${isRegBonus?75:150}pt / 特殊図柄揃いでATセット獲得`);
      log(`${bonusLabel}確定：${sourceText} / ${isRegBonus?75:150}pt`);
      flashReelLight("rainbow", result === "BIG" ? 2200 : 1800);
      showOverlay(`${bonusLabel} BONUS`);
      if(isRegBonus){
        playRegConfirmSound();
        confetti(45);
      }else if(isPremiumBigLineupSpin(currentSpin)){
        playPremiumBigThirdStopVoice(currentSpin);
        confetti(90);
      }else{
        playSevenConfirmSound();
        confetti(90);
      }
      return;
    }

    if(resolved.bar3PremiumReady){
      jagChanceHold = true;
      resetNormalModeAfterBonus();
      $("stLamp").classList.add("on");
      showMessage("BAR揃い", `${resolved.bonusSource} / BAR確定${lineText ? " / " + lineText : ""}`);
      log(`BAR揃い：${resolved.bonusSource} / BAR確定`);
      flashReelLight("rainbow", 2600);
      showOverlay("BAR BONUS");
      confetti(110);
      playBarBgm();
      startBarRainbowHold();
      playWinSound(true);
      return;
    }

    if(resolved.bonusReady){
      jagChanceHold = true;
      normalState.bonusPending = false;
      normalState.bonusKind = "";
      normalState.bonusSource = "";
      normalState.premiumBonus = false;
      normalState.bonusWaitGames = 0;
      hideBonusConfirmScreen();
      normalState.sinceBonus = 0;
      $("stLamp").classList.add("on");
      showMessage("7揃い", `${resolved.bonusSource} / BB確定${lineText ? " / " + lineText : ""}`);
      log(`7揃い：${resolved.bonusSource} / BB確定`);
      flashReelLight("rainbow", 2200);
      showOverlay("BB BONUS");
      confetti(90);
      playSevenConfirmSound();
      return;
    }

    if(resolved.regReady){
      jagChanceHold = true;
      jagLastBonusPayout = normalReward;
      resetNormalModeAfterBonus();
      $("stLamp").classList.add("on");
      showMessage("REG", `${resolved.bonusSource} / +${normalReward}pt / 天井リセット / 天井まで${ceilingRemain()}G${lineText ? " / " + lineText : ""}`);
      log(`REG揃い：${resolved.bonusSource} / +${normalReward}pt / 天井リセット`);
      flashReelLight("rainbow", 1800);
      showOverlay(`REG +${normalReward}pt`);
      confetti(35);
      playRegConfirmSound();
      return;
    }

    if(applyReachMeBonusIfNeeded(result, resolved)){
      return;
    }

    if(resolved.bonusHit){
      if(A_TYPE_MODE){
        const announced = !!(currentSpin && currentSpin.bonusAnnouncementLit);
        jagChanceHold = announced || jagChanceHold || resolved.bonusSource === 'CZ全員点灯';
        normalState.bonusPending = true;
        normalState.bonusKind = resolved.bonusKind || "BIG";
        normalState.bonusSource = resolved.bonusSource;
        normalState.premiumBonus = (normalState.bonusKind === "BIG") && !!resolved.premiumBonus;
        normalState.oneGameRenBonus = false;
        normalState.bonusWaitGames = 1;
        normalState.prepLeft=2+Math.floor(Math.random()*4);normalState.prepConfirmed=false;normalState.prepSets=0;normalState.prepZones=[];
        normalState.bonusHitGamesSince = normalizeBonusAfterGames(resolved.gamesSinceLastBonusAtStart);
        hideBonusConfirmScreen();
        if(isChanceLampLit()) $("stLamp").classList.add("on");
        const bonusLabel = pendingBonusLabel();
        showMessage("BONUS確定", `${resolved.bonusSource} / ${lineText || "成立役なし"}${normalRewardText} / 次BETで${bonusLabel}揃い`);
        log(`BONUS確定：${resolved.bonusSource} / イラストランプ告知後に${bonusLabel}揃い待ち`);
        if(isChanceLampLit()){
          flashReelLight("rainbow", 2200);
          showOverlay("BONUS確定");
        }
        return;
      }

    }

    $("stLamp").classList.remove("on");
    if(resolved.highAdd > 0){
      showMessage("高確移行", `${modeAtStart} / ${info.name}${lineText ? " / " + lineText : ""}${normalRewardText} / 高確${normalState.highRemain}G / 天井まで${ceilingRemain()}G`);
      log(`高確移行：${HIGH_MODE_GAMES}G / 契機 ${info.name}`);
      flashReelLight("green", 1700);
      showOverlay("高確");
      playWinSound(false);
      return;
    }

    if(result === "REPLAY"){
      flashReelLight("blue", 1200);
      showMessage(info.name, `${normalModeLabel()} / 天井まで${ceilingRemain()}G${lineText ? " / " + lineText : ""}${normalRewardText || " / 次回BET無料"}`);
      showOverlay("REPLAY");
      return;
    }

    if(result === "BELL3"){
      flashReelLight("blue", 1200);
      showMessage(info.name, `${normalModeLabel()} / 天井まで${ceilingRemain()}G${lineText ? " / " + lineText : ""}${normalRewardText || " / 次回BET無料"}`);
      return;
    }

    const main = result === "MISS" ? modeAtStart : info.name;
    showMessage(main, `${normalModeLabel()} / 天井まで${ceilingRemain()}G${lineText ? " / " + lineText : ""}${normalRewardText}`);
    if(result === "MISS"){
      playLoseSound();
    }
    }finally{if(A_TYPE_MODE){syncNovaProgress();NovaDecrement.observe(currentProfit());}auditCapture(auditSpinDetail(result,resolved));}
  }

  function applyResult(result, resolved, lineRow=1){
    try{
    playStrongNovaSound(result,resolved);
    playWeakNovaSound(result,resolved);
    playChanceSound(result,resolved);
    if(A_TYPE_MODE && result==="REPLAY")normalState.replayFree=true;
    const info = RESULT[result];
    showCzLamp(3,resolved);
    const reward = resolved.reward;
    jagLastGamePayout = Number(reward) || 0;
    const baseSets = resolved.sets || 0;
    const zoneSets = resolved.zoneSets || 0;
    const stGameAdd = (resolved.add || 0) + (resolved.zoneStGames || 0);
    const zoneGameAdd = resolved.zoneGameAdd || 0;
    const zoneWasActive = !!resolved.zoneGame;
    const aTypeBonusSpin = currentSpin && currentSpin.aTypeBonusActiveAtStart;
    if(resolved.aTypeBonusGame){
      const firstAtWin=normalState.flow?.phase!=="art"&&!(Number(session.bonusArtSets)>0);
      Object.assign(session,NovaArt.advanceBonus(session,!!resolved.artSetWon,reward));
      if(resolved.artSetWon){showOverlay(firstAtWin?"ネビュラ揃い AT確定":"上乗せ特化ゾーン獲得");log("ネビュラ揃い："+NovaArt.bonusStockLabel(session,normalState.flow));}
    }

    if(reward > 0){
      session.paid += reward;
      jagLastBonusPayout = Math.max(0, Number(session.paid) || 0);
      stats.totalPaid += reward;
      playPayoutSound(result, reward, currentSpin);
      updateCompleteTrialState("AT払い出し");
    }

    if(zoneWasActive && session.bigZone > 0){
      session.bigZone = Math.max(0, session.bigZone - 1);
    }

    if(resolved.bigZone > 0){
      const beforeZone = Number(session.bigZone) || 0;
      session.bigZone = Math.max(beforeZone, resolved.bigZone);
      if(resolved.bigZoneType && resolved.bigZone >= beforeZone){
        session.bigZoneType = resolved.bigZoneType;
      }
    }

    if(zoneGameAdd > 0){
      session.bigZone = (session.bigZone || 0) + zoneGameAdd;
    }

    if((Number(session.bigZone) || 0) <= 0){
      session.bigZoneType = "";
    }

    if(shouldStartDevilZoneConfirmIntro(result, resolved)){
      devilZoneConfirmIntroPending = true;
      showDevilZoneConfirmScreen("solid", devilZoneConfirmTypeForResult(result));
    }else{
      syncDevilZoneConfirmScreen();
    }

    if(stGameAdd > 0){
      session.remain = (session.remain || 0) + stGameAdd;
      session.addedGames = (session.addedGames || 0) + stGameAdd;
    }

    const stockAdd = baseSets + zoneSets;
    if(stockAdd > 0){
      session.stockSets = (session.stockSets || 0) + stockAdd;
      session.added = (session.added || 0) + stockAdd;
      if(result === "BAR3"){
        session.barBgmSets = (session.barBgmSets || 0) + stockAdd;
        session.currentSetBarBgm = true;
      }
    }
    let continuationBoostText = "";
    if(result === "BAR3"){
      const boostedRate = Math.max(Number(session.continuationRate) || 0, BAR3_CONTINUATION_RATE);
      session.continuationRate = boostedRate;
      continuationBoostText = `継続${formatRate(boostedRate)}`;
    }

    const isHit = result !== "MISS" || reward > 0 || stockAdd > 0 || stGameAdd > 0 || zoneGameAdd > 0 || resolved.bigZone > 0;
    if(isHit){
      session.hits++;
    }

    if(!(A_TYPE_MODE && aTypeBonusSpin)){
      countRoleStat(result, true);
    }

    recordSlumpPoint();

    if(isHit){
      $("stLamp").classList.add("on");
      const rewardText = reward > 0 ? `+${reward}pt` : "";
      const stockText = stockAdd > 0 ? `SET+${stockAdd}` : "";
      const stGameText = stGameAddTextFor(result, stGameAdd);
      const zoneGameAddText = zoneGameAdd > 0 ? `デビルゾーン+${zoneGameAdd}G` : "";
      const zoneStartText = resolved.bigZone > 0 ? goraiZoneRemainText(resolved.bigZone, resolved.bigZoneType) : "";
      const zoneRollText = zoneWasActive && resolved.bigZone <= 0 ? goraiZoneRemainText(session.bigZone, session.bigZoneType) : "";
      const joinText = [rewardText, stockText, continuationBoostText, stGameText, zoneGameAddText, zoneStartText, zoneRollText].filter(Boolean).join(" / ");
      const lineText = result !== "MISS" ? `${lineName(lineRow)}ライン` : "";
      const phaseText = session.phase === "battle" ? battleRemainText() : `残り${session.remain}G`;
      const battleText = aTypeBonusSpin
        ? `${aTypeBonusLabel(session.bonusKind)} 残り${aTypeBonusRemainingNet()}pt / ${NovaArt.bonusStockLabel(session,normalState.flow)}`
        : `${session.setNo || 1}SET / ${phaseText} / STOCK${session.stockSets || 0} / 継続${formatRate(session.continuationRate)}`;
      const subText = [joinText, lineText, battleText].filter(Boolean).join(" / ");
      const bonusOverlayText = [stockText, continuationBoostText, stGameText, zoneGameAddText].filter(Boolean).join(" ");
      showMessage(info.name, subText);
      log(`${info.name}：${subText}`);

      if(resolved.zoneSevenHit){
        flashReelLight("rainbow", 2200);
        showOverlay(bonusOverlayText || "777");
        confetti(95);
        playSevenConfirmSound();
      }else if(result === "BIG" || result === "MID" || isZoneEntryResult(result) || result === "SMALL"){
        flashReelLight("rainbow", 2200);
        if(result === "BIG" || result === "SUPER_DEVIL_ZONE"){
          showOverlay("SUPER DEVIL ZONE");
          confetti(95);
          playSevenConfirmSound();
        }else if(result === "MID" || result === "DEVIL_ZONE"){
          showOverlay("DEVIL ZONE");
          confetti(70);
          playRegConfirmSound();
        }else{
          showOverlay(stockText || rewardText || "砂時計");
          confetti(45);
        }
      }else if(result === "BAR3"){
        showOverlay(bonusOverlayText || "+5SET 継続80%");
        confetti(80);
        playBarBgm();
        startBarRainbowHold();
      }else if(result === "BELL"){
        flashReelLight("yellow", 1600);
        showOverlay(bonusOverlayText || "BELL");
        confetti(20);
        if(reward <= 0) playWinSound(false);
      }else if(result === "BELL3"){
        flashReelLight("blue", 1200);
        if(bonusOverlayText) showOverlay(bonusOverlayText);
      }else if(result === "REPLAY"){
        flashReelLight("blue", 1200);
        showOverlay(bonusOverlayText || "REPLAY");
      }else if(result === "SUICA"){
        flashReelLight("green", 1600);
        showOverlay(bonusOverlayText || "SUICA");
        confetti(20);
        playWinSound(false);
      }else if(result === "CHERRY_ANY" || result === "CHERRY_DOUBLE" || result === "CHERRY_TRIPLE"){
        flashReelLight("red", 1600);
        if(bonusOverlayText){
          showOverlay(bonusOverlayText);
        }else if(reward > 0){
          showOverlay("CHERRY");
        }
        confetti(35);
        playWinSound(false);
      }else{
        if(stockAdd > 0) showOverlay("+" + stockAdd + "SET");
        confetti(30);
        if(!resolved.chanceSoundPlayed)playWinSound(false);
      }
      return;
    }

    $("stLamp").classList.remove("on");
    const zoneRollText = zoneWasActive ? goraiZoneRemainText(session.bigZone, session.bigZoneType || resolved.zoneType) : "";
    const phaseText = session.phase === "battle" ? battleRemainText() : `残り${session.remain}G`;
    const battleText = aTypeBonusSpin
      ? `${aTypeBonusLabel(session.bonusKind)} 残り${aTypeBonusRemainingNet()}pt / ${NovaArt.bonusStockLabel(session,normalState.flow)}`
      : `${session.setNo || 1}SET / ${phaseText} / STOCK${session.stockSets || 0} / 継続${formatRate(session.continuationRate)}`;
    showMessage("ハズレ", [zoneRollText, battleText].filter(Boolean).join(" / "));
    playLoseSound();
    }finally{if(A_TYPE_MODE){syncNovaProgress();NovaDecrement.observe(currentProfit());}auditCapture(auditSpinDetail(result,resolved));}
  }

  function syncCabinetControlState(){
    const canStopNow = !!(isSpinning && spinCanStop && !isPremiumBigConfirmStopLocked());
    stopBtns.forEach((btn, i)=>{
      if(!btn) return;
      const reelStopped = !!(currentSpin && Array.isArray(currentSpin.stopped) && currentSpin.stopped[i]);
      const reelLive = !!(canStopNow && !reelStopped);
      btn.disabled = !reelLive;
      btn.classList.toggle("is-reel-live", reelLive);
      btn.classList.toggle("is-reel-stopped", !reelLive);
      const part = document.querySelector(`[data-stop-part="${i}"]`);
      if(part){
        part.classList.toggle("is-reel-live", reelLive);
        part.classList.toggle("is-reel-stopped", !reelLive);
      }
    });
  }

  function chainCountStep(previous,continuing,paid,fee){
    if(!continuing)return {state:null,count:0};
    const state=previous && paid>=previous.paid && fee>=previous.fee ? previous : {paid,fee,payoutVersion:1};
    return {state,count:Math.max(0,Math.floor(paid-state.paid))};
  }

  function updateDisplay(){
    if(!debugFastSpinActive){
      const pending=normalState.ladderAwardPresentation;
      NovaLadder.sync(normalState.resultCard||session.active?null:pending?.flow||normalState.flow,isSpinning);
      if(pending)NovaLadder.award(pending.card.pt,pending.started,pending.promoted);
    }
    if(normalState.resultCard&&!NovaResults.visible&&!NovaResults.editing)NovaResults.show(normalState.resultCard);
    if(!isSpinning)showZoneRoulette(session.active?null:normalState.flow);
    NovaComeback.sync(session.active||normalState.resultCard?null:normalState.flow,isSpinning);
    if(!debugFastSpinActive)NovaInitialDuo.sync(session.active||normalState.resultCard?null:normalState.flow,isSpinning);
    if(!isSpinning && $("spinBtn"))$("spinBtn").title=normalState.replayFree?"リプレイ：次回BET消費なし":"";
    const active = session.active;
    const profit = stats.totalPaid - stats.totalFee;

    updateGoraiZoneGlow();
    updateDevilStatusLamp();
    updateReelFrameMode();
    syncDevilZoneConfirmScreen();
    updatePremiumBigReelMovie();
    machine.className = "machine " + (active ? "active" : "normal") + (session.paid > 0 ? " win" : "");
    if(reelArea){
      reelArea.classList.toggle("premiumBigOverlayOn", !!(isATypeBonusActive() && (session.premiumBonus || session.oneGameRenBonus)));
    }
    const internal=NovaNormal.normalize(normalState.internal);
    syncCzPreludeGlow(isSpinning?currentSpin?.resolved:null);
    // Per-spin blackout is cleared by BET, never restored from a previous game's progress.
    if($('novaInternalStatus'))$('novaInternalStatus').textContent='小役CZ抽選 / '+internal.games+'G（共通天井'+NovaNormal.ceiling(internal)+'G） / '+(internal.level==='high'?'高確（保証'+internal.highLeft+'G）':'低確')+ (normalState.flow?.phase==='art'?' / '+'AT '+(normalState.flow.atHigh?'高確（保証'+normalState.flow.atHighLeft+'G）':'低確'):'')+' / 穢れ'+internal.impurity+'pt / 特化予約 '+(session.active?(session.bonusZones||[]):(normalState.flow?.queuedZones||[])).map(z=>NovaArt.zoneName(z)).join('・');
    const flowStatus=$("novaFlowStatus");
    if(flowStatus){
      flowStatus.textContent=session.active ? aTypeBonusLabel(session.bonusKind)+" 残り"+aTypeBonusRemainingNet()+"pt / "+NovaArt.bonusStockLabel(session,normalState.flow) : normalModeLabel();
      flowStatus.dataset.phase=session.active?"bonus":NovaFlow.normalize(normalState.flow).phase;
      document.body.dataset.gamePhase=flowStatus.dataset.phase;
      document.body.dataset.burst=session.active?'':normalState.flow?.burstWon?'won':normalState.flow?.burstLeft?'challenge':normalState.flow?.burstPending?'pending':'';

      document.body.dataset.bonusTier=session.active?NovaArt.bonusTier(session.bonusTier):'';
      document.body.dataset.artZone=session.active?'':normalState.flow?.zone||'';
      document.body.dataset.artUra=String(!session.active&&!!normalState.flow?.zone&&!!normalState.flow?.ura);
      document.body.dataset.totoColor=document.body.dataset.artZone==='toto'?(normalState.flow?.color||'white'):'white';
    }
    $("modeTag").className = "modeTag " + ((active || isNovaRisingMode()) ? "active" : "");
    $("modeTag").textContent = (active ? `${aTypeBonusLabel(session.bonusKind)} BONUS` : normalModeLabel());

    if($("settingView")) $("settingView").textContent = settings.setting;
    if($("settingViewLegacy")) $("settingViewLegacy").textContent = settings.setting;
    if($("targetRtpView")) $("targetRtpView").textContent = targetRtpText();
    if($("targetRtpViewLegacy")) $("targetRtpViewLegacy").textContent = targetRtpText();
    if($("adminSettingView")) $("adminSettingView").textContent = settings.setting;
    if($("adminTargetRtpView")) $("adminTargetRtpView").textContent = targetRtpText();
    const stInfoText = (active
        ? `${aTypeBonusLabel(session.bonusKind)} 残り${aTypeBonusRemainingNet()}pt / ${NovaArt.bonusStockLabel(session,normalState.flow)}`
        : `${normalModeLabel()} / CZ・強CZ経由 / 1G ${SPIN_COST}pt`);
    if($("stInfoView")) $("stInfoView").textContent = stInfoText;
    if($("stInfoViewLegacy")) $("stInfoViewLegacy").textContent = stInfoText;
    if($("adminStInfoView")) $("adminStInfoView").textContent = stInfoText;
    const payoutScaleText = `通常BIG・上位BIGとも50pt / ネビュラ揃いでAT確定 / ベル8pt（最終払い出し調整） / リプレイ再遊技`;
    if($("payoutScaleView")) $("payoutScaleView").textContent = payoutScaleText;
    if($("payoutScaleViewLegacy")) $("payoutScaleViewLegacy").textContent = payoutScaleText;
    if($("adminPayoutScaleView")) $("adminPayoutScaleView").textContent = payoutScaleText;

    if($("totalSpinsView")) $("totalSpinsView").textContent = stats.totalSpins || 0;
    if($("totalSessionsView")) $("totalSessionsView").textContent = stats.totalSessions || 0;
    if($("bigCountView")) $("bigCountView").textContent = stats.bigCount || 0;
    if($("midCountView")) $("midCountView").textContent = (stats.upperBigCount) || 0;
    const normalRoleDenominator = normalRoleStatDenominator();
    if($("grapeCountView")) $("grapeCountView").textContent = countOddsText(stats.grapeCount, normalRoleDenominator);
    if($("smallCountView")) $("smallCountView").textContent = countOddsText(stats.smallCount, normalRoleDenominator);
    if($("bellCountView")) $("bellCountView").textContent = countOddsText(stats.bellCount, normalRoleDenominator);
    if($("diagonalBellCountView")) $("diagonalBellCountView").textContent = countOddsText(stats.diagonalBellCount, normalRoleDenominator);
    if($("replayCountView")) $("replayCountView").textContent = countOddsText(stats.replayCount, normalRoleDenominator);
    if($("suikaCountView")) $("suikaCountView").textContent = countOddsText(stats.suikaCount, normalRoleDenominator);
    if($("cherryCountView")) $("cherryCountView").textContent = countOddsText(stats.cherryCount, normalRoleDenominator);
    if($("totalFeeView")) $("totalFeeView").textContent = stats.totalFee || 0;
    if($("totalPaidView")) $("totalPaidView").textContent = stats.totalPaid || 0;
    if($("totalProfitView")){
      $("totalProfitView").textContent = formatSigned(profit);
      $("totalProfitView").style.color = profit > 0 ? "var(--green)" : profit < 0 ? "var(--red)" : "var(--gold)";
    }
    if($("wdBigOdds")) $("wdBigOdds").textContent = stats.bigCount > 0 && stats.totalSpins > 0
      ? `1/${(stats.totalSpins / stats.bigCount).toFixed(1)}`
      : "-";
    if($("wdRegOdds")) $("wdRegOdds").textContent = (stats.upperBigCount) > 0 && stats.totalSpins > 0
      ? `1/${(stats.totalSpins / (stats.upperBigCount)).toFixed(1)}`
      : "-";

    const setText = (id, value)=>{
      const el = $(id);
      if(el) el.textContent = value;
    };
    const formatMeterDigits = (value, digits=3, max=(10 ** digits) - 1)=>{
      const n = Math.max(0, Math.min(max, Math.round(Math.abs(Number(value) || 0))));
      return String(n).padStart(digits, "0");
    };
    const formatCreditDifference = value=>{
      const raw = Math.round(Number(value) || 0);
      return `${raw < 0 ? "-" : ""}${formatMeterDigits(raw, 4, 9999)}`;
    };
    setText("jagTotalGameDataMeter", formatMeterDigits(stats.totalSpins, 5, 99999));
    const afterBonusMeter = $("jagAfterBonusDataMeter");
    const holdAfterBonusGames = !!(A_TYPE_MODE && isATypeBonusActive());
    const afterBonusGames = holdAfterBonusGames ? normalizeBonusAfterGames(session.bonusStartGames) : normalizeBonusAfterGames(normalState.sinceBonus);
    setText("jagAfterBonusDataMeter", formatMeterDigits(afterBonusGames, 4, 9999));
    if(afterBonusMeter) afterBonusMeter.classList.toggle("is-bonus-held", holdAfterBonusGames);
    setText("jagBigDataMeter", formatMeterDigits(stats.bigCount, 3, 999));
    setText("jagRegDataMeter", formatMeterDigits((stats.upperBigCount), 3, 999));
    const stLampOn = !!($("stLamp") && $("stLamp").classList.contains("on"));
    const jagChanceLit = !!(active || normalState.bonusPending || jagChanceHold || stLampOn || bonusConfirmBgmHold);
    if(reelArea) reelArea.classList.toggle("jagChanceLit", jagChanceLit);
    const gogoChance = $("jagGogoChance");
    if(gogoChance){
      const premiumBonusActive = !!(isATypeBonusActive() && (session.premiumBonus || session.oneGameRenBonus));
      const jagChanceBarConfirm = !!(
        premiumBonusActive ||
        (jagChanceLit && pendingBonusLabel() === "BAR") ||
        barRainbowHold ||
        (currentSpin && jagChanceLit && (
          currentSpin.result === "BAR3" ||
          !!(currentSpin.resolved && (currentSpin.resolved.premiumBonus || currentSpin.resolved.oneGameRenBonus))
        ))
      );
      gogoChance.classList.toggle("is-lit", jagChanceLit);
      gogoChance.classList.toggle("is-bar-confirm", jagChanceBarConfirm);
      gogoChance.setAttribute("aria-pressed", jagChanceLit ? "true" : "false");
    }
    const displayCredit = SLOT_PLAY_SESSION ? profit - playSessionBaselineProfit() : profit;
    if(active)jagChainBonusHandoff=false;
    const chain=chainCountStep(jagChainCount,!!(active || jagChainBonusHandoff || normalState.bonusPending || normalState.flow?.phase==='art'),Number(stats.totalPaid)||0,Number(stats.totalFee)||0);
    jagChainCount=chain.state;
    const displayCount=chain.count;
    setText("jagCreditMeter", formatCreditDifference(displayCredit));
    const countText=String(displayCount).padStart(3,'0');
    setText("jagCountMeter",countText);
    $("jagCountMeter").style.setProperty('font-size',`min(60cqh, ${63/Math.max(3,countText.length)}cqw)`,'important');
    $("jagCountMeter").setAttribute('aria-label',`初当たりからの総獲得 ${displayCount}pt`);
    setText("jagGamePayoutMeter", formatMeterDigits(jagLastGamePayout, 3, 999));
    const atCountText = stats.totalSessions || 0;
    const stEmblem = $("wdStEmblem");
    if(stEmblem){
      stEmblem.classList.toggle("is-ceiling", !active && !normalState.bonusPending);
      stEmblem.classList.toggle("is-bonus-pending", !active && normalState.bonusPending);
      stEmblem.classList.toggle("is-profit", active && profit > 0);
      if(A_TYPE_MODE){
        stEmblem.innerHTML = "A-TYPE<br>BONUS";
      }
      updateDevilStatusLamp();
    }
    setText("wdCounterSt", "A");
    setText("wdCounterBig", stats.bigCount || 0);
    setText("wdCounterReg", (stats.upperBigCount) || 0);
    setText("wdCounterGrape", stats.grapeCount || 0);
    setText("wdCounterSmall", stats.smallCount || 0);
    setText("wdCounterBell", stats.bellCount || 0);
    setText("wdCounterDiagonalBell", stats.diagonalBellCount || 0);
    setText("wdCounterSuika", stats.suikaCount || 0);
    setText("wdCounterCherry", stats.cherryCount || 0);
    setText("wdCounterReplay", stats.replayCount || 0);
    const roleCounterDenominator = normalRoleStatDenominator();
    const roleCounterOddsText = count=>{
      const n = Number(count) || 0;
      const total = Number(roleCounterDenominator) || 0;
      if(n <= 0 || total <= 0) return "-";
      return `1/${(total / n).toFixed(1)}`;
    };
    setText("roleCounterBigCount", stats.bigCount || 0);
    setText("roleCounterBigOdds", roleCounterOddsText(stats.bigCount));
    setText("roleCounterPremiumBigCount", stats.premiumBigCount || 0);
    setText("roleCounterPremiumBigOdds", roleCounterOddsText(stats.premiumBigCount));
    setText("roleCounterRegCount", (stats.upperBigCount) || 0);
    setText("roleCounterRegOdds", roleCounterOddsText((stats.upperBigCount)));
    setText("roleCounterGrapeCount", stats.grapeCount || 0);
    setText("roleCounterGrapeOdds", roleCounterOddsText(stats.grapeCount));
    setText("roleCounterReplayCount", stats.replayCount || 0);
    setText("roleCounterReplayOdds", roleCounterOddsText(stats.replayCount));
    setText("roleCounterBellCount", stats.bellCount || 0);
    setText("roleCounterBellOdds", roleCounterOddsText(stats.bellCount));
    setText("roleCounterPieroCount", stats.smallCount || 0);
    setText("roleCounterPieroOdds", roleCounterOddsText(stats.smallCount));
    setText("roleCounterCherryCount", stats.cherryCount || 0);
    setText("roleCounterCherryOdds", roleCounterOddsText(stats.cherryCount));
    const setMirrorCell = (valueId, label, value)=>{
      const valueEl = $(valueId);
      if(!valueEl) return;
      const labelEl = valueEl.parentElement ? valueEl.parentElement.querySelector("span") : null;
      if(labelEl) labelEl.textContent = label;
      valueEl.textContent = value;
    };
    if(A_TYPE_MODE){
      setMirrorCell("wdMirrorSt", "TYPE", "A");
      setMirrorCell("wdMirrorBig", "BB", stats.bigCount || 0);
      setMirrorCell("wdMirrorReg", "上位BIG", (stats.upperBigCount) || 0);
    }
    const mirrorStCell = $("wdMirrorSt") ? $("wdMirrorSt").parentElement : null;
    if(mirrorStCell) mirrorStCell.classList.toggle("zoneHold", active && isGoraiZoneActive());
    setText("wdMirrorSpin", `${stats.totalSpins || 0}G`);
    setText("wdMirrorProfit", formatSigned(profit));

    const remainBig = $("stRemainBigView");
    if(remainBig){
      const sevenSegPanel = remainBig.closest(".sevenSegPanel");
      if(sevenSegPanel) sevenSegPanel.classList.toggle("zoneHold", active && isGoraiZoneActive());
      const label = document.querySelector(".sevenSegLabel");
      if(A_TYPE_MODE){
        if(active){
          if(label) label.textContent = "残り";
          remainBig.textContent = String(Math.max(0, Math.min(999, Math.round(aTypeBonusRemainingNet()))));
        }else{
          if(label) label.textContent = "BONUS";
          remainBig.textContent = "A";
        }
        remainBig.classList.remove("idle");
      }
    }

    const spinButton = $("spinBtn");
    if(spinButton){
      const canStopNow = spinCanStop && !isPremiumBigConfirmStopLocked();
      spinButton.textContent = isSpinning ? (canStopNow ? "STOP" : "WAIT") : "BET";
      spinButton.classList.toggle("waiting", isSpinning && !canStopNow);
      spinButton.classList.toggle("stopReady", isSpinning && canStopNow);
      if(isCompleteTrialLocked() && !isSpinning){
        spinButton.textContent = "COMPLETE";
        spinButton.disabled = true;
        stopBtns.forEach(b=>b.disabled=true);
      }
    }
    syncCabinetControlState();

    if($("quickAutoBtn")){
      $("quickAutoBtn").textContent = autoPlay ? "STOP" : "AUTO";
      $("quickAutoBtn").classList.toggle("on", autoPlay);
      $("quickAutoBtn").disabled = (bonusEndBgmPlaying || bonusConfirmSoundPlaying) && !autoPlay;
    }
    if($("topAutoBtn")){
      $("topAutoBtn").textContent = autoPlay ? "STOP" : "AUTO";
      $("topAutoBtn").classList.toggle("on", autoPlay);
      $("topAutoBtn").setAttribute("aria-pressed", autoPlay ? "true" : "false");
      $("topAutoBtn").disabled = (isCompleteTrialLocked() || bonusEndBgmPlaying || bonusConfirmSoundPlaying) && !autoPlay;
    }
    updateSpeedToBonusUi();
    scheduleAdminStatePush();
  }

  function formatSigned(n){
    return n >= 0 ? "+" + n : String(n);
  }

  function showMessage(main, sub){
    $("message").textContent = main;
    $("subMessage").textContent = sub || "";
  }

  function normalRoleStatDenominator(){

    return (Number(stats.normalSpins) || 0) + (Number(stats.highSpins) || 0);
  }

  function countOddsText(count, denominator=Number(stats.totalSpins) || 0){
    const n = Number(count) || 0;
    const total = Number(denominator) || 0;
    if(n <= 0 || total <= 0) return `${n} / -`;
    return `${n} / 1/${(total / n).toFixed(1)}`;
  }

  function renderRegDetailTable(){
    const table = $("regDetailTable");
    if(!table) return;

    let html = '<tr><td>種類</td><td>選択率</td><td>獲得pt</td><td>AT期待度</td><td>ランプ</td></tr>';
    for(const tier of ['normal','upper'])html += '<tr><td>'+NovaArt.bonusLabel(tier)+'</td><td>'+((tier==='upper'?NovaArt.bonusRules.upperRate:1-NovaArt.bonusRules.upperRate)*100)+'%</td><td>'+NovaArt.bonusTarget()+'pt</td><td>'+NovaArt.bonusRules[tier].atChance*100+'%</td><td>'+(tier==='upper'?'赤点滅':'白点滅')+'</td></tr>';
    table.innerHTML = html;
  }

  function renderSettingTable(){
    const table = $("settingTable");
    if(!table) return;

    if(A_TYPE_MODE){
      const cfg=NovaFlow.forSetting(settings.novaFlow,settings.setting);
      let html = '<tr><td>状態</td><td>継続</td><td>契機</td><td>突入時期待度</td></tr>';
      html += '<tr><td>CZ</td><td>'+cfg.czGames+'〜'+cfg.czMaxGames+'G</td><td>スイカ・弱ノヴァなどから設定別抽選</td><td>'+cfg.czChance*100+'%</td></tr>';
      html += '<tr><td>強CZ</td><td>'+cfg.strongGames+'〜'+cfg.strongMaxGames+'G</td><td>強ノヴァ：100%</td><td>'+((cfg.strongChance||0)*100).toFixed(1)+'%</td></tr>';
      html += '<tr><td>AT</td><td>初期150～1,500pt（レア役で増加）</td><td>ボーナス中nebula・穢れ・フリーズ等</td><td>通常5pt/G・上位8pt/G</td></tr>';
      table.innerHTML = html;
      renderRegDetailTable();
      return;
    }
  }

  function resetGame(confirmFirst=true){
    stopDebugFastSpin("初期化のため高速停止");
    stopSpeedToBonus("初期化のためSPEED停止");
    if(!confirm("統計と現在の状態を初期化しますか？")) return;
    NovaAim.reset();
    globalThis.NovaRushConfirm?.reset();
    NovaInitialDuo.clear();
    NovaBellNavi.clear();
    NovaDirectAward.clear();
    stopAutoPlay("初期化のためオート停止");
    pauseNormalBgm();
    stopBattleBgm(false);
    stopBarBgm();
    clearBonusConfirmSoundLock();
    stopGekiatsuEffect(true);
    clearPremiumBigConfirmMovie();
    hideBonusConfirmScreen();
    devilZoneConfirmIntroPending = false;
    hideDevilZoneConfirmScreen();
    hideBattleIntro();
    hideRogiContinuationBlackout();
    hideSessionResultScreen();
    clearReelVideos({forceReversePush:true});
    stopGuaranteedSetStartLight();
    spinIntervals.forEach(id=>clearInterval(id));
    NovaReelMotion.clearAll();
    clearOumaReverseAudio();
    if(spinWaitTimer){
      clearTimeout(spinWaitTimer);
      spinWaitTimer = null;
    }
    clearPendingAtStart();
    clearDevilRushEntryEffect();
    spinCanStop = false;
    resetReelSpinOffsets();
    reels.forEach(r=>r.classList.remove("spinning"));
    isSpinning = false;
    currentSpin = null;
    jagChainCount = null;
    jagChainBonusHandoff = false;
    NovaResults.hide();
    stats = {totalSessions:0,totalFee:0,totalPaid:0,totalSpins:0,normalSpins:0,highSpins:0,roleStatVersion:ROLE_STAT_COUNTER_VERSION,bigCount:0,midCount:0,upperBigCount:0,premiumBigCount:0,grapeCount:0,smallCount:0,bellCount:0,diagonalBellCount:0,replayCount:0,suikaCount:0,cherryCount:0,slumpHigh:0,slumpLow:0,slumpHistory:[{spin:0, profit:0}]};
    slumpView = {xZoom:1,yZoom:1,seekStart:0,followEnd:true};
    bonusConfirmBgmHold = false;
    normalState = {internal:NovaNormal.reset(Math.random,settings.setting),mode:"normal",highRemain:0,risingRemain:0,risingBonusOrigin:false,sinceBonus:0,bonusPending:false,bonusKind:"",bonusSource:"",premiumBonus:false,oneGameRenBonus:false,bonusWaitGames:0,bonusHitGamesSince:0,reachMePending:false,reachMeBonusKind:"",reachMeBonusSource:"",reachMeHitGamesSince:0,pendingSettingVoiceSrc:"",pendingPremiumVoiceSrc:"",morningCeilingActive:false};
    session = {active:false,remain:0,fee:0,cost:0,paid:0,hits:0,added:0,addedGames:0,setNo:0,stockSets:0,barBgmSets:0,nextSetBarBgm:false,currentSetBarBgm:false,continuationRate:0,bigZone:0,bigZoneType:"",phase:"idle",bonusKind:"",bonusTarget:0,bonusStartGames:0,risingResumeRemain:0,risingBonusOrigin:false,premiumBonus:false,oneGameRenBonus:false,premiumChainEligible:false,bonusBgmSrc:"",battleRemain:0,battleWin:false,battleSource:"",resultPayout:null,endSignal:null};
    jagLastGamePayout = 0;
    jagLastBonusPayout = 0;
    jagChanceHold = false;
    clearOumaPresentation();
    showCzLamp(0,null);
    completeTrialState = {locked:false,lockedSetting:0,rescueActive:false,completeProfit:0};
    setSpeedFrameOffHold(false);
    forceResult = "";
    forcePremiumEffect = false;
    pendingForceResult = "";
    pendingATypeInternalBonus = null;
    resetControlInput();
    $("forceResult").value = "";
    if($("premiumForceStatus")) $("premiumForceStatus").value = "OFF";
    $("stLamp").classList.remove("on");
    setMorningBarReels();
    showMessage("READY",`1回転${SPIN_COST}pt / BB・RB完全告知 / 設定${settings.setting}`);
    $("resultText").textContent = "-";
    updateDisplay();
    persistState();
    log("統計を初期化しました");
    return true;
  }

  function resetRuntimeForMorning(reason="朝一リセット"){
    NovaAim.reset();
    globalThis.NovaRushConfirm?.reset();
    NovaInitialDuo.clear();
    NovaBellNavi.clear();
    NovaDirectAward.clear();
    stopDebugFastSpin(`${reason}のため高速停止`);
    stopSpeedToBonus(`${reason}のためSPEED停止`);
    stopAutoPlay(`${reason}のためAUTO停止`);
    pauseNormalBgm();
    stopBattleBgm(false);
    stopBarBgm();
    clearBonusConfirmSoundLock();
    stopGekiatsuEffect(true);
    clearPremiumBigConfirmMovie();
    hideBonusConfirmScreen();
    devilZoneConfirmIntroPending = false;
    hideDevilZoneConfirmScreen();
    hideBattleIntro();
    hideRogiContinuationBlackout();
    hideSessionResultScreen();
    clearReelVideos({forceReversePush:true});
    stopGuaranteedSetStartLight();
    spinIntervals.forEach(id=>clearInterval(id));
    NovaReelMotion.clearAll();
    clearOumaReverseAudio();
    if(spinWaitTimer){
      clearTimeout(spinWaitTimer);
      spinWaitTimer = null;
    }
    clearPendingAtStart();
    clearDevilRushEntryEffect();
    spinCanStop = false;
    resetReelSpinOffsets();
    reels.forEach(r=>r.classList.remove("spinning"));
    isSpinning = false;
    currentSpin = null;
    jagChainCount = null;
    jagChainBonusHandoff = false;
    stats = {totalSessions:0,totalFee:0,totalPaid:0,totalSpins:0,normalSpins:0,highSpins:0,roleStatVersion:ROLE_STAT_COUNTER_VERSION,bigCount:0,midCount:0,upperBigCount:0,premiumBigCount:0,grapeCount:0,smallCount:0,bellCount:0,diagonalBellCount:0,replayCount:0,suikaCount:0,cherryCount:0,slumpHigh:0,slumpLow:0,slumpHistory:[{spin:0, profit:0}]};
    slumpView = {xZoom:1,yZoom:1,seekStart:0,followEnd:true};
    bonusConfirmBgmHold = false;
    normalState = {internal:NovaNormal.reset(Math.random,settings.setting),mode:"normal",highRemain:0,risingRemain:0,risingBonusOrigin:false,sinceBonus:0,bonusPending:false,bonusKind:"",bonusSource:"",premiumBonus:false,oneGameRenBonus:false,bonusWaitGames:0,bonusHitGamesSince:0,reachMePending:false,reachMeBonusKind:"",reachMeBonusSource:"",reachMeHitGamesSince:0,pendingSettingVoiceSrc:"",pendingPremiumVoiceSrc:"",morningCeilingActive:!A_TYPE_MODE};
    session = {active:false,remain:0,fee:0,cost:0,paid:0,hits:0,added:0,addedGames:0,setNo:0,stockSets:0,barBgmSets:0,nextSetBarBgm:false,currentSetBarBgm:false,continuationRate:0,bigZone:0,bigZoneType:"",phase:"idle",bonusKind:"",bonusTarget:0,bonusStartGames:0,risingResumeRemain:0,risingBonusOrigin:false,premiumBonus:false,oneGameRenBonus:false,premiumChainEligible:false,bonusBgmSrc:"",battleRemain:0,battleWin:false,battleSource:"",resultPayout:null,endSignal:null};
    jagLastGamePayout = 0;
    jagLastBonusPayout = 0;
    jagChanceHold = false;
    clearOumaPresentation();
    showCzLamp(0,null);
    completeTrialState = {locked:false,lockedSetting:0,rescueActive:false,completeProfit:0};
    setSpeedFrameOffHold(false);
    forceResult = "";
    forcePremiumEffect = false;
    pendingForceResult = "";
    pendingATypeInternalBonus = null;
    resetControlInput();
    if($("forceResult")) $("forceResult").value = "";
    if($("premiumForceStatus")) $("premiumForceStatus").value = "OFF";
    $("stLamp").classList.remove("on");
    setMorningBarReels();
    showMessage(reason, `設定${settings.setting}据え置き / 朝一リセット / 共通天井${NovaNormal.ceiling()}G＋前兆`);
    $("resultText").textContent = `朝一 / 共通天井${NovaNormal.ceiling()}G＋前兆`;
    persistState();
    updateDisplay();
    log(`[RESET] ${reason} / 設定${settings.setting} / Aタイプ通常`);
    return true;
  }

  function morningResetGame(confirmFirst=true, reason="朝一リセット"){
    const message = `設定はそのままでCOMPLETEを解除し、朝一状態（共通天井${NovaNormal.ceiling()}G＋前兆）に戻しますか？`;
    if(confirmFirst && !confirm(message)) return false;
    return resetRuntimeForMorning(reason);
  }

  function ensureMorningResetControl(){
    if($("morningResetBtn") && $("tenKSimBtn")) return;
    const anchor = $("debugFastStatus");
    if(!anchor || !anchor.parentNode) return;
    const row = document.createElement("div");
    row.className = "row";
    row.style.marginBottom = "8px";
    row.innerHTML = `<button class="subBtn" id="morningResetBtn" type="button">朝一リセット</button>`;
    const simBtn = document.createElement("button");
    simBtn.className = "subBtn";
    simBtn.id = "tenKSimBtn";
    simBtn.type = "button";
    simBtn.textContent = "1万回転試算";
    row.appendChild(simBtn);
    const help = document.createElement("div");
    help.className = "help";
    help.style.margin = "-2px 0 10px";
    help.textContent = `朝一リセット：設定はそのまま、COMPLETE解除、通常と同じ天井${NovaNormal.ceiling()}G＋前兆。`;
    anchor.insertAdjacentElement("afterend", help);
    anchor.insertAdjacentElement("afterend", row);
  }

  function runTenKSimulation(){
    if(debugOneClickSimActive) return;
    if(isSpinning){
      showMessage("1万回転試算待機", "現在の回転停止後に実行してください。");
      return;
    }

    readSettings();
    resetRuntimeForMorning("1万回転試算リセット");
    debugOneClickSimActive = true;
    debugFastSpinActive = true;
    debugFastSpinCount = 0;
    updateDebugFastUi();

    const targetSpins = DEBUG_ONE_CLICK_SIM_SPINS;
    let spun = 0;
    let safety = 0;
    const safetyLimit = targetSpins * 12;

    try{
      while(spun < targetSpins && safety < safetyLimit && !isCompleteTrialLocked()){
        safety++;
        if(runDebugFastStep()){
          spun++;
          debugFastSpinCount = spun;
        }
      }
    }catch(e){
      showMessage("1万回転試算エラー", e && e.message ? e.message : String(e));
      log(`[SIM10000] ERROR ${e && e.message ? e.message : e}`);
    }finally{
      debugOneClickSimActive = false;
      debugFastSpinActive = false;
      updateDebugFastUi();
      updateDisplay();
      persistState();
    }

    const profit = currentProfit();
    const rtpText = stats.totalFee > 0 ? `${(currentRtp() * 100).toFixed(2)}%` : "-";
    if(isCompleteTrialLocked()){
      showMessage("1万回転試算 COMPLETE", `${debugFastSpinCount}Gで打ち止め / 損益${formatSigned(profit)}pt / 機械割${rtpText}`);
      $("resultText").textContent = `COMPLETE / ${debugFastSpinCount}G / ${formatSigned(profit)}pt`;
      log(`[SIM10000] COMPLETE / ${debugFastSpinCount}G / 損益${formatSigned(profit)}pt / 機械割${rtpText}`);
    }else{
      showMessage("1万回転試算完了", `${debugFastSpinCount}G / 損益${formatSigned(profit)}pt / 機械割${rtpText}`);
      $("resultText").textContent = `試算完了 / ${debugFastSpinCount}G / ${formatSigned(profit)}pt`;
      log(`[SIM10000] 完了 / ${debugFastSpinCount}G / 損益${formatSigned(profit)}pt / 機械割${rtpText}`);
    }
  }

  const NOVA_LOGO_SRC = "assets/design/nova-cabinet-v1/lower-panel-original.webp";
  function novaSymbol(column, row){ return "NOVA_" + column + "_" + row; }
  function novaGrid(){ return [0,1,2].map(row => [0,1,2].map(column => novaSymbol(column,row))); }
  function isNovaGrid(grid){ return [0,1,2].every(row => [0,1,2].every(column => grid?.[row]?.[column] === novaSymbol(column,row))); }
  function novaPatternFromGrid(grid){
    const triple = [0,1,2].map(column => [0,1,2].every(row => grid?.[row]?.[column] === novaSymbol(column,row)));
    if(!triple[0]) return "";
    if(triple[1] && triple[2]) return "SUPER_NOVA";
    if(triple[1] || triple[2]) return "STRONG_NOVA";
    return "WEAK_NOVA";
  }
  function isNovaResult(result){
    return ["WEAK_NOVA","STRONG_NOVA","SUPER_NOVA"].includes(result);
  }
  function drawSuperNovaBonus(){
    const freeze = Math.random() < 0.5;
    return {kind:"BIG",premiumBonus:freeze,superNovaOutcome:freeze?"FREEZE":"BIG",
      source:freeze?"スーパーノヴァ目 → フリーズ":"スーパーノヴァ目 → BIG",
      internalResult:"SUPER_NOVA",gamesSinceLastBonusAtStart:normalizeBonusAfterGames(normalState.sinceBonus)};
  }
  function buildForcedNovaGrid(result){
    const tripleColumns = result === "SUPER_NOVA" ? [0,1,2] : result === "STRONG_NOVA" ? [0,Math.random()<0.5?1:2] : [0];
    const columns = [0,1,2].map(column => {
      if(tripleColumns.includes(column)) return [0,1,2].map(row=>novaSymbol(column,row));
      const choices = REEL_STRIPS[column].map((_,top)=>reelWindowFromTopIndex(column,top))
        .filter(items=>!items.every((symbol,row)=>symbol===novaSymbol(column,row)));
      return choices[Math.floor(Math.random()*choices.length)];
    });
    return [0,1,2].map(row=>columns.map(column=>column[row]));
  }
  const NOVA_PATTERN_NAMES = {WEAK_NOVA:"弱ノヴァ目",STRONG_NOVA:"強ノヴァ目",SUPER_NOVA:"スーパーノヴァ目"};
  function cellHtml(symbol, label, cls){
    if(symbol===NEBULA_SYMBOL)return '<img class="symImg nebulaSymImg" src="'+NEBULA_IMAGE_SRC+'" alt="nebula特殊図柄" draggable="false" style="width:100%;height:100%;object-fit:contain;filter:none;transform:none">';
    const tile = /^NOVA_([0-2])_([0-2])$/.exec(symbol);
    if(tile) return '<span class="novaLogoTile" aria-label="ノヴァ目 '+tile[1]+' '+tile[2]+'"><img src="'+NOVA_LOGO_SRC+'" draggable="false" alt="" style="left:-'+Number(tile[1])*100+'%;top:-'+Number(tile[2])*100+'%"></span>';
    // Legacy saved visual states must not reintroduce retired artwork.
    if(symbol === GRAPE_SYMBOL) symbol = BELL_SYMBOL;
    if(symbol === PIERROT_SYMBOL || symbol === CHERRY_SYMBOL) symbol = ELEPHANT_SYMBOL;
    const inner =
      (typeof USER_FACE !== "undefined" && symbol === USER_FACE)
        ? `<img class="symImg" src="${USER_FACE_SRC}" alt="small hit symbol" loading="eager" decoding="sync" draggable="false">`
        : (symbol === CHERRY_SYMBOL)
          ? `<img class="symImg cherrySymImg" src="${CHERRY_IMAGE_SRC}" alt="cherry symbol" loading="eager" decoding="sync" draggable="false">`
          : (symbol === BELL_SYMBOL)
            ? `<img class="symImg bellSymImg" src="${BELL_IMAGE_SRC}" alt="bell symbol" loading="eager" decoding="sync" draggable="false">`
            : (symbol === PIERROT_SYMBOL)
              ? `<img class="symImg pieroSymImg" src="${PIERROT_IMAGE_SRC}" alt="piero symbol" loading="eager" decoding="sync" draggable="false">`
              : (symbol === ELEPHANT_SYMBOL)
                ? `<img class="symImg replaySymImg" src="${REPLAY_IMAGE_SRC}" alt="replay symbol" loading="eager" decoding="sync" draggable="false">`
            : (symbol === BLANK_SYMBOL)
              ? `<div class="sym blankSym" aria-label="blank"></div>`
              : (symbol === "REPLAY")
                ? `<img class="symImg replaySymImg" src="${REPLAY_IMAGE_SRC}" alt="replay symbol" loading="eager" decoding="sync" draggable="false">`
                : (symbol === "🍋")
                  ? `<img class="symImg suikaSymImg" src="${SUICA_IMAGE_SRC}" alt="suika symbol" loading="eager" decoding="sync" draggable="false">`
                  : (symbol === "⭐")
                    ? `<img class="symImg missSymImg" src="${MISS_IMAGE_SRC}" alt="miss symbol" loading="eager" decoding="sync" draggable="false">`
                    : (symbol === GRAPE_SYMBOL)
                      ? `<img class="symImg grapeSymImg" src="${GRAPE_IMAGE_SRC}" alt="grape symbol" loading="eager" decoding="sync" draggable="false">`
                      : (symbol === "BAR")
                        ? `<img class="symImg barSymImg" src="${BAR_IMAGE_SRC}" alt="BAR symbol" loading="eager" decoding="sync" draggable="false">`
                        : (symbol === "7")
                          ? `<img class="symImg sevenSymImg" src="${SEVEN_IMAGE_SRC}" alt="7 symbol" loading="eager" decoding="sync" draggable="false">`
                          : `<div class="sym ${cls || ""}">${escapeHtml(symbol)}</div>`;
    return `${inner}`;
  }

  document.addEventListener("DOMContentLoaded", () => {
    const forceSelect=document.getElementById('forceResult');
    for(const [value,label] of [['ART','AT突入'],['URA_CHALLENGE','上位ATチャレンジ（10G・HOLDあり）'],['COMEBACK','引き戻しゾーン（5G）'],['FREEZE','フリーズ'],...Object.keys(NovaNormal.rare).filter(k=>!isNovaResult(k)).map(k=>[k,RESULT[k].name]),['RARE','ATレア役'],...NovaArt.zoneIds.map(k=>['ZONE_'+k,NovaArt.zoneName(k)+'ゾーン'])]){const option=document.createElement('option');option.value=value;option.textContent=label;forceSelect.append(option);}
    const normalPanel=document.createElement('details');normalPanel.id='novaNormalConfig';
    normalPanel.innerHTML='<summary>小役CZ抽選・穢れ・状態</summary><output id="novaInternalStatus"></output><label>天井カウンター<input id="novaNormalGames" type="number" min="0" max="'+NovaNormal.ceiling()+'" value="0"></label><label>内部状態<select id="novaLevel"><option value="low">低確</option><option value="high">高確</option></select></label><label>穢れpt<input id="novaImpurity" type="number" min="0" max="100" value="0"></label><button id="novaApplyInternal" type="button">内部状態を適用</button><p>レア小役でCZを抽選します。通常モード・天国・規定GのCZ抽選はありません。スイカ・弱ノヴァで高確も抽選し、高確中は小役CZ当選率を優遇。強ノヴァは強CZ確定です。天井は朝一も共通'+NovaNormal.ceiling()+'G＋前兆、BIG／突破確定CZを各50%。リセット時の穢れ振り分けは従来どおり。穢れ100ptは次のボーナスで消費し、AT＋特化ゾーンを予約。フリーズは通常スーパーノヴァ目の1/2。</p>';
    const resetTable=document.createElement('div');resetTable.innerHTML='<table><tr><th>設定</th>'+NovaNormal.resetImpurityPoints.map(pt=>'<th>'+pt+'pt</th>').join('')+'</tr>'+NovaNormal.resetImpurityWeights.map((row,i)=>'<tr><td>'+(i+1)+'</td>'+row.map(w=>'<td>'+w+'%</td>').join('')+'</tr>').join('')+'</table>';normalPanel.append(resetTable);
    const nc=NovaNormal.config(settings.novaNormal);for(const [k,v]of Object.entries(nc).filter(([k])=>!['bandMultiplier','regChainGain'].includes(k))){const label=document.createElement('label');label.textContent=({highMultiplier:'高確CZ倍率',downMiss:'ハズレ降格率',downReplay:'リプレイ降格率',czFailureGain:'CZ失敗の穢れpt',bonusFailureGain:'ボーナスAT非突入の穢れpt',atDryGain:'AT駆け抜けの穢れpt',ceilingGain:'共通天井到達の穢れpt',superDenom:'通常スーパーノヴァ目分母'})[k];const input=document.createElement('input');input.type='number';input.step='any';input.value=v;input.dataset.normalConfig=k;label.append(input);normalPanel.append(label);}
    const roleCzTable=document.createElement('div');roleCzTable.id='novaRoleCzTable';
    const renderRoleCzTable=()=>{roleCzTable.innerHTML='<p>各小役成立時のCZ当選率（低確／高確）</p><table><tr><th>設定</th>'+Object.keys(NovaNormal.rare).map(role=>'<th>'+RESULT[role].name+'</th>').join('')+'</tr>'+[1,2,3,4,5,6].map(setting=>'<tr><td>'+setting+'</td>'+Object.keys(NovaNormal.rare).map(role=>'<td>'+['low','high'].map(level=>(NovaNormal.roleCzRate({level},role,setting,settings.novaNormal)*100).toFixed(2)+'%').join('／')+'</td>').join('')+'</tr>').join('')+'</table>';};renderRoleCzTable();normalPanel.append(roleCzTable);
    const saveNormal=document.createElement('button');saveNormal.textContent='通常設定を保存';saveNormal.onclick=()=>{const c={};normalPanel.querySelectorAll('[data-normal-config]').forEach(x=>c[x.dataset.normalConfig]=x.valueAsNumber);settings.novaNormal=NovaNormal.config(c);renderRoleCzTable();refreshRtpViews();saveNormal.textContent=persistState()?'通常設定を保存しました':'保存に失敗しました';};normalPanel.append(saveNormal);
    document.getElementById('saveFlowConfig').closest('details').after(normalPanel);
    document.getElementById('novaApplyInternal').onclick=()=>{if(isSpinning||session.active)return;normalState.internal=NovaNormal.normalize({games:$('novaNormalGames').value,level:$('novaLevel').value,highLeft:$('novaLevel').value==='high'?10:0,impurity:$('novaImpurity').value});persistState();updateDisplay();};
    const artPanel=document.createElement('details');artPanel.id='novaArtConfig';
    artPanel.innerHTML='<summary>AT・特化ゾーン設定</summary><p>初当たりは準備3G→赤7→ルーレット→くしゅり＆にと3G。初期ptは設定別配分と成立役から決まります。ATレベルはありません。通常ATは8pt／15ptベルで純増5pt/G、上位ATは15ptベルで純増8pt/G。上位の直乗せ当選時ptは通常の1.5倍。スイカ・弱ノヴァは共通の上乗せ抽選と15%の高確移行、強ノヴァは直乗せのみ20%／特化のみ20%／両方20%です。</p><p>出陣は10G、ストック率10／25／40／60／80%を抽選し、最低2個を獲得。初当たりの5%は上位ATチャレンジ（突破50%）。レア役契機・累計差枚＋2,400ptごとのチャレンジは突破65%。10Gでベル・リプレイ・レア役はHOLD、次Gでノヴァを狙え。レア役は突破確定。差枚契機では残りpt・未消化ストックをリセットし、成否とも特化1個で再開します。到達点はAT終了後も引き継ぎます。</p>';
    const commonTable=document.createElement('div');
    commonTable.innerHTML='<table><tr><th>設定</th><th>ベース G/50pt</th><th>出陣 総G</th><th>スイカ・弱ノヴァ特化 低／高</th></tr>'+[1,2,3,4,5,6].map(n=>{const p=NovaTuning.profile(n),r=NovaArt.commonAtRulesFor(n);return '<tr><td>'+n+'</td><td>'+(50/(3*(1-NovaNormal.normalRoleProbabilities(n).REPLAY)-Object.entries(NovaNormal.normalRoleProbabilities(n)).reduce((sum,[role,p])=>sum+p*NovaNormal.pay(role==='NAVI_BELL'?'BELL':role),0))).toFixed(2)+'</td><td>1/'+p.denominator+'</td><td>'+[false,true].map(high=>(100*NovaArt.extraZoneChance(n,'WEAK_NOVA',false,high)).toFixed(2)+'%').join('／')+'</td></tr>';}).join('')+'</table>';artPanel.append(commonTable);
    const entryTable=document.createElement('div');entryTable.id='novaEntryQuotaTable';
    entryTable.innerHTML='<p>初当たりの初期3G：通常役50／100pt、弱レア役100pt、強レア役200ptを基礎に、開始時に1回だけ選ぶ1～5倍を適用。通常役のみで計150～1,500pt、レア役込みで最大3,000pt。AT中の抽選性能は倍率に左右されません。出陣・引き戻し・後からのストックには適用しません。下表は倍率適用前の内部枠です。</p><table><tr><th>設定</th>'+NovaArt.entryQuotaRules.values.map(x=>'<th>'+x+'pt</th>').join('')+'</tr>'+NovaArt.entryWeights.map((row,i)=>'<tr><td>'+(i+1)+'</td>'+row.map(p=>'<td>'+(100*p).toFixed(2)+'%</td>').join('')+'</tr>').join('')+'</table>';entryTable.innerHTML+='<p>初当たり用倍率の振り分け</p><table><tr><th>設定</th>'+NovaArt.initialBoostRules.values.map(n=>'<th>'+n+'倍</th>').join('')+'</tr>'+NovaArt.initialBoostRules.weights.map((row,i)=>'<tr><td>'+(i+1)+'</td>'+row.map(p=>'<td>'+(p*100).toFixed(0)+'%</td>').join('')+'</tr>').join('')+'</table>';artPanel.append(entryTable);
    const artLabels={ladderSosuke:'宗介 小役合算率',ladderGiru:'ギル 小役合算率',ladderUraGiru:'裏ギル 小役合算率',totoHit:'とと 7揃い率',totoReset:'とと nebula率',soraHit:'空 7揃い率',soraReset:'空 nebula率',soraUraHit:'裏空 7揃い率（保証前）',soraUraReset:'裏空 nebula率',urapiSuper:'うらぴ スーパーノヴァ率',oumaSuper:'逢魔 スーパーノヴァ率',oumaUraSuper:'裏逢魔 スーパーノヴァ率',urapiFreeze:'うらぴフリーズ継続率',oumaFreeze:'逢魔フリーズ継続率',oumaUraFreeze:'裏逢魔フリーズ継続率'};
    const zoneTable=document.createElement('div');zoneTable.innerHTML='<p>宗介・ギルは通常テーブル①〜⑤を設定別に抽選、裏ギルはテーブル⑥固定・300pt通過確定。同額の段階も突破で次へ進みます。<br>7揃い：全3ゾーン共通＋100pt。nebulaは＋10ptと残り5Gリセット（毎G：とと2%／空15%／裏空30%）。とと7揃い1回、空2回、裏空500pt以上を保証。<br>スーパーノヴァ：通常50・100pt、裏逢魔100・200pt（フリーズ中も共通）。逢魔と裏逢魔はBETでフリーズ抽選、当選時は無料の自動0G連。</p><table><tr><th>設定（準備中抽選）</th>'+['弱上乗せ','強上乗せ','超上乗せ'].map(x=>'<th>'+x+'</th>').join('')+'</tr>'+[1,2,3,4,5,6].map(setting=>NovaArt.zoneGroupWeights(setting,false,true)).map((row,i)=>'<tr><td>'+(i+1)+'</td>'+row.map(p=>'<td>'+p.toFixed(2)+'%</td>').join('')+'</tr>').join('')+'</table><p>弱＝宗介・とと・うらぴ、強＝ギル・空・逢魔、超＝裏3種。強当選後の3%で超へ昇格（従来どおり）。各区分内は3種均等。キャラルーレット中のレア役でテーブル⑥⑦への昇格抽選あり。通常ATの抽選は上記の共通ATを参照。準備中の抽選は従来通り。</p>';artPanel.append(zoneTable);
    const bonusTable=document.createElement('p');bonusTable.textContent='BIGは50pt。通常52%／上位80%のAT期待度（保証契機は別枠）。上位選択率10%の仮設定、全設定共通。白点滅＝通常、赤点滅＝上位。ネビュラを狙えは逆押し。REGは廃止。AT獲得後は特化ストック抽選：通常BIG 約1/'+(1/NovaArt.bonusRoleProbabilities(settings.setting,'normal',true).NEBULA).toFixed(2)+'／G、上位BIG 約1/'+(1/NovaArt.bonusRoleProbabilities(settings.setting,'upper',true).NEBULA).toFixed(2)+'／G。';artPanel.append(bonusTable);
    const ladderTable=document.createElement('div');ladderTable.innerHTML=Object.entries(NovaArt.ladderTables).map(([id,rows])=>{const flow={zone:NovaArt.baseZone(id),ura:id.startsWith('ura_')};return '<p>'+NovaArt.zoneName(id)+'</p><table><tr><th>番号</th><th>段階（pt）</th>'+[1,2,3,4,5,6].map(n=>'<th>設定'+n+'</th>').join('')+'</tr>'+rows.map((row,i)=>'<tr><td>'+(i+1)+'</td><td>'+row.join(' → ')+'</td>'+[1,2,3,4,5,6].map(n=>'<td>'+NovaArt.ladderWeightsFor(flow,n)[i].toFixed(1)+'%</td>').join('')+'</tr>').join('')+'</table>';}).join('');artPanel.append(ladderTable);const ladderNote=document.createElement('p');ladderNote.textContent='上表は通常選択率。⑥はギルではレア役昇格時のみ、裏ギルは常に⑥。⑦はレア役昇格時のみ宗介。';artPanel.append(ladderNote);
    const artCfg=NovaArt.config(settings.novaArt);
    for(const [key,label]of Object.entries(artLabels)){const row=document.createElement('label');row.className='field';row.textContent=label;const input=document.createElement('input');input.type='number';input.dataset.artConfig=key;input.setAttribute('aria-label',label);input.min=key.startsWith('direct')?'2':key==='initial'||key.endsWith('Games')?'1':'0';input.max=key.startsWith('direct')?'100000':key==='initial'?String(Number.MAX_SAFE_INTEGER):key.endsWith('Games')?'1000':'1';input.step=key.startsWith('direct')?'1':key==='initial'||key.endsWith('Games')?'1':'0.01';input.value=artCfg[key];row.append(input);artPanel.append(row);}
    const artSave=document.createElement('button');artSave.type='button';artSave.textContent='AT設定を保存';artSave.onclick=()=>{const value={payoutVersion:1};artPanel.querySelectorAll('input').forEach(x=>value[x.dataset.artConfig]=x.valueAsNumber);settings.novaArt=NovaArt.config(value);refreshRtpViews();artSave.textContent=persistState()?'AT設定を保存しました':'保存に失敗しました';};artPanel.append(artSave);
    const atStateButton=document.createElement('button');atStateButton.type='button';atStateButton.textContent='AT低確／高確を切替（高確保証10G）';atStateButton.onclick=()=>{if(isSpinning||session.active||normalState.flow?.phase!=='art')return;normalState.flow.atHigh=!normalState.flow.atHigh;normalState.flow.atHighLeft=normalState.flow.atHigh?10:0;persistState();updateDisplay();};artPanel.append(atStateButton);
    document.getElementById('saveFlowConfig').closest('details').after(artPanel);
    const status=document.createElement("div");status.id="novaFlowStatus";
    document.querySelector(".reelArea").append(status);
    for(const key of ['czDenom','strongDenom','strongChance'])document.querySelector('[data-flow-config="'+key+'"]')?.closest('label')?.remove();
    const cfg=NovaFlow.config(settings.novaFlow);
    for(const key of Object.keys(cfg)){
      const input=document.querySelector('[data-flow-config="'+key+'"]');
      if(input)input.value=key.endsWith("Chance")?cfg[key]*100:cfg[key];
    }
    document.getElementById("saveFlowConfig").onclick=()=>{
      const value={};
      document.querySelectorAll('[data-flow-config]').forEach(input=>{
        const key=input.dataset.flowConfig;value[key]=input.valueAsNumber/(key.endsWith("Chance")?100:1);
      });
      settings.novaFlow=NovaFlow.config(value);const saved=persistState();renderSettingTable();refreshRtpViews();
      document.getElementById("flowConfigStatus").textContent=saved?"CZ設定を保存しました（次回突入から適用）":"保存に失敗しました（変更はこの画面内でのみ有効）";
    };
    updateDisplay();
    const preview = document.getElementById("novaSymbolPreview");
    const patternSelect = document.getElementById("novaPatternSelect");
    const renderNovaPreview = () => {
      const variant = patternSelect.value;
      const columns = variant === "WEAK_NOVA" ? [0] : variant === "STRONG_MIDDLE" ? [0,1] : variant === "STRONG_RIGHT" ? [0,2] : [0,1,2];
      const grid = novaGrid().map(row => row.map((symbol,column) => columns.includes(column) ? symbol : "ANY"));
      document.getElementById("novaSymbolPreviewGrid").innerHTML = grid.flatMap(row => row.map(symbol => '<div>'+ (symbol === "ANY" ? '<span class="novaAnyCell">ANY</span>' : cellHtml(symbol)) + '</div>')).join('');
      document.getElementById("novaPatternDescription").textContent = NOVA_PATTERN_NAMES[novaPatternFromGrid(grid)] + " — ANYは図柄不問。重複時はスーパー → 強 → 弱の順に判定。";
    };
    patternSelect.addEventListener("change",renderNovaPreview);
    document.getElementById("novaSymbolPreviewOpen").onclick = () => {
      const cell = document.querySelector('.reel .cell') || document.querySelector('.cell');
      if(cell){
        const rect = cell.getBoundingClientRect();
        if(rect.height > 0) document.getElementById("novaSymbolPreviewGrid").style.aspectRatio = String(rect.width / rect.height);
      }
      renderNovaPreview();
      preview.showModal();
    };
    document.getElementById("novaSymbolPreviewClose").onclick = () => preview.close();
    document.getElementById("debugNovaPatternsBtn").onclick = () => document.getElementById("novaSymbolPreviewOpen").click();
  });

  function ensureReelCells(index){
    const win = reels[index] ? reels[index].querySelector(".window") : null;
    if(!win) return [];
    while(win.children.length < 3){
      const div = document.createElement("div");
      div.className = "cell";
      win.appendChild(div);
    }
    while(win.children.length > 3){
      win.removeChild(win.lastElementChild);
    }
    return Array.from(win.children);
  }

  function updateReelCell(div, symbol, label="", cls="", isWin=false, isCenter=false){
    if(!div) return;
    const aimClass = symbol === "7"
      ? " isAimSymbol isSevenAim"
      : symbol === "BAR"
        ? " isAimSymbol isBarAim"
        : "";
    const className = "cell" + (isCenter ? " center" : "") + (isWin ? " winline" : "") + aimClass;
    if(div.className !== className) div.className = className;
    const key = [symbol, label || "", cls || "", isWin ? "1" : "0"].join("|");
    if(div.dataset.cellKey === key) return;
    div.dataset.cellKey = key;
    div.innerHTML = cellHtml(symbol, label, cls);
  }

  const REEL_STRIPS = [0,1,2].map(column => [
    BELL_SYMBOL,ELEPHANT_SYMBOL,"7",BELL_SYMBOL,ELEPHANT_SYMBOL,
    SUICA_SYMBOL,BELL_SYMBOL,ELEPHANT_SYMBOL,NEBULA_SYMBOL,BELL_SYMBOL,
    ELEPHANT_SYMBOL,"BAR",BELL_SYMBOL,ELEPHANT_SYMBOL,novaSymbol(column,0),
    novaSymbol(column,1),novaSymbol(column,2),BELL_SYMBOL,ELEPHANT_SYMBOL,SUICA_SYMBOL
  ].map(symbol=>column===1?(symbol===BELL_SYMBOL?ELEPHANT_SYMBOL:symbol===ELEPHANT_SYMBOL?BELL_SYMBOL:symbol):symbol)
  // Keep counts and the NOVA block; avoid a second replay line on middle-first 15pt bells.
  .map((symbol,index,strip)=>column===1?(index===3?strip[5]:index===5?strip[3]:symbol):symbol));

  function mod(n, m){
    return ((n % m) + m) % m;
  }

  function getReelWindowFromStrip(reelIndex, centerSymbol, row=1){
    const strip = REEL_STRIPS[reelIndex] || REEL_STRIPS[0];
    let candidates = [];
    strip.forEach((symbol, idx)=>{
      if(symbol === centerSymbol) candidates.push(idx);
    });

    let baseIndex;
    if(candidates.length){
      baseIndex = candidates[Math.floor(Math.random() * candidates.length)];
    }else{
      baseIndex = Math.floor(Math.random() * strip.length);
    }

    // row=0なら上段にcenterSymbol、row=1なら中段、row=2なら下段にcenterSymbol
    const topIndex = mod(baseIndex - row, strip.length);
    return [
      strip[topIndex],
      strip[mod(topIndex + 1, strip.length)],
      strip[mod(topIndex + 2, strip.length)]
    ];
  }

  function currentReelTopIndex(reelIndex){
    if(NovaReelMotion.has(reelIndex))return NovaReelMotion.top(reelIndex);
    const strip = REEL_STRIPS[reelIndex] || REEL_STRIPS[0];
    return mod((Number(reelSpinOffsets[reelIndex]) || 0) + (currentSpin?.artReverse?-1:1), strip.length);
  }

  function reelWindowFromTopIndex(reelIndex, topIndex){
    const strip = REEL_STRIPS[reelIndex] || REEL_STRIPS[0];
    const start = mod(topIndex, strip.length);
    return [
      strip[start],
      strip[mod(start + 1, strip.length)],
      strip[mod(start + 2, strip.length)]
    ];
  }

  function manualStopColumnForReel(reelIndex, spin=currentSpin){
    const strip = REEL_STRIPS[reelIndex] || REEL_STRIPS[0];
    const baseTop = currentReelTopIndex(reelIndex);
    const targetResult = displayResultFor(spin?.result || "MISS");
    const targetSpec = RESULT[targetResult] || RESULT.MISS;
    const targetSymbol = targetSpec.reel ? targetSpec.reel[reelIndex] : "";
    const targetRow = Array.isArray(spin?.lineRow) ? spin.lineRow[reelIndex] : Number(spin?.lineRow ?? 1);
    const slipFrames = 5;

    if(targetResult !== "MISS" && targetSymbol && Number.isFinite(targetRow)){
      let bestTop = null;
      let bestDistance = Infinity;
      strip.forEach((symbol, idx)=>{
        if(symbol !== targetSymbol) return;
        const candidateTop = mod(idx - targetRow, strip.length);
        const distance = mod(baseTop - candidateTop, strip.length);
        if(distance <= slipFrames && distance < bestDistance){
          bestDistance = distance;
          bestTop = candidateTop;
        }
      });
      if(bestTop !== null){
        return reelWindowFromTopIndex(reelIndex, bestTop);
      }
    }

    return reelWindowFromTopIndex(reelIndex, baseTop);
  }

  function cloneGrid(grid){
    return Array.isArray(grid) ? grid.map(row => Array.isArray(row) ? row.slice() : []) : [];
  }

  function setGridColumn(grid, reelIndex, columnSymbols){
    if(!Array.isArray(grid) || !Array.isArray(columnSymbols)) return;
    for(let row=0; row<3; row++){
      if(!Array.isArray(grid[row])) grid[row] = [];
      grid[row][reelIndex] = columnSymbols[row];
    }
  }

  function gridPaylineRows(grid){
    const rows = Array.isArray(grid) ? grid : [];
    return [
      [rows[0]?.[0], rows[0]?.[1], rows[0]?.[2]],
      [rows[1]?.[0], rows[1]?.[1], rows[1]?.[2]],
      [rows[2]?.[0], rows[2]?.[1], rows[2]?.[2]],
      [rows[0]?.[0], rows[1]?.[1], rows[2]?.[2]],
      [rows[2]?.[0], rows[1]?.[1], rows[0]?.[2]]
    ];
  }

  function gridHasOnlyAllowedPaylines(grid, allowedResult="MISS"){
    if(A_TYPE_MODE){
      const target=displayResultFor(allowedResult);
      if(displayedResultFromGrid(grid)!==target)return false;
      return gridPaylineRows(grid).every(row=>{const r=displayedResultFromRow(row);return r==='MISS'||r===target||r==='BELL'&&target==='BELL'||r==='SUICA'&&['WEAK_SUICA','STRONG_SUICA'].includes(target);});
    }
  }

  function manualBonusFinalColumnForReel(reelIndex, spin=currentSpin, initialColumn=null){
    if(!spin || !spin.grid) return initialColumn || manualStopColumnForReel(reelIndex, spin);
    const targetResult = displayResultFor(spin.result);
    const baseTop = currentReelTopIndex(reelIndex);
    const strip = REEL_STRIPS[reelIndex] || REEL_STRIPS[0];
    const firstColumn = initialColumn || reelWindowFromTopIndex(reelIndex, baseTop);
    const firstGrid = cloneGrid(spin.grid);
    setGridColumn(firstGrid, reelIndex, firstColumn);
    const firstResult = displayedResultFromGrid(firstGrid);
    if((firstResult === targetResult || firstResult === "MISS") && gridHasOnlyAllowedPaylines(firstGrid, targetResult)){
      return firstColumn;
    }

    const findSafeColumn = limit=>{
      for(let distance=0; distance<=limit; distance++){
        const column = reelWindowFromTopIndex(reelIndex, baseTop - distance);
        const testGrid = cloneGrid(spin.grid);
        setGridColumn(testGrid, reelIndex, column);
        const result = displayedResultFromGrid(testGrid);
        if((result === "MISS" || result === targetResult) && gridHasOnlyAllowedPaylines(testGrid, targetResult)){
          return column;
        }
      }
      return null;
    };

    return findSafeColumn(5) || findSafeColumn(strip.length - 1) || firstColumn;
  }

  function refreshStoppedGrid(grid, result="MISS", lineRow=null){
    const spec = RESULT[result] || RESULT.MISS;
    for(let i=0;i<3;i++){
      const col = [grid?.[0]?.[i], grid?.[1]?.[i], grid?.[2]?.[i]];
      setReelColumn(i, col, i === 1 ? spec.label : "", spec.cls, result === "MISS" ? null : lineRow);
    }
  }

  function prepareManualBonusOutcome(spin=currentSpin){
    if(!spin || spin.manualOutcomeApplied) return;
    // A guided BIG NEBULA uses aim stop control, not manualBonusStop. Settle
    // a completed wrong-order stop as a miss before the result is displayed.
    // Fast simulation has no visual alignment and keeps the drawn outcome.
    if(spin.resolved?.aTypeBonusGame && spin.result==='NEBULA' && spin.aimAligned===false && spin.stopped?.length===3 && spin.stopped.every(Boolean)){
      spin.manualOutcomeApplied=true;
      spin.result='MISS';spin.spec=RESULT.MISS;spin.lineRow=1;
      spin.resolved={...spin.resolved,reward:0,artSetWon:0,novaRushConfirmed:false,manualLineupMiss:true};
      return;
    }
    if(!spin.manualBonusStop) return;
    const targetResult = displayResultFor(spin.result);
    const stoppedResult = displayedResultFromGrid(spin.grid);
    spin.manualOutcomeApplied = true;

    if(stoppedResult === targetResult){
      refreshStoppedGrid(spin.grid, spin.result, spin.lineRow);
      return;
    }

    const nextCeiling = nextBonusAfterGames(normalState.sinceBonus);
    spin.result = "MISS";
    spin.spec = RESULT.MISS;
    spin.lineRow = 1;
    spin.resolved = {
      ...spin.resolved,
      reward:0,
      bonusReady:false,
      regReady:false,
      aTypeBonusReady:false,
      bonusWaitSpin:false,
      manualLineupMiss:true,
      ceilingAfter:nextCeiling
    };
  }

  function lineName(row){
    if(Array.isArray(row)) return row[0] === 0 ? "右下がり斜め" : "右上がり斜め";
    return row === 0 ? "上段" : row === 2 ? "下段" : "中段";
  }

  function randomLineRow(){
    return Math.floor(Math.random() * 3);
  }

  function aTypeCherryLineRow(result){
    const internalResult = String(pendingATypeInternalBonus && pendingATypeInternalBonus.internalResult || "");
    // 中段チェリーはBIG同時当選専用。単独・REG同時チェリーは上下段へ振り分ける。
    if(internalResult === "BIG_CHERRY") return 1;
    return Math.random() < 0.5 ? 0 : 2;
  }

  function resultLineRow(result){
    if(isNovaResult(result)||result==='BELL15') return 1;
    if(isMiddleLineOnlyResult(result)) return 1;
    if(result === "CHERRY_ANY" || result === "MID_CHERRY") return aTypeCherryLineRow(result);
    if(result === "BELL3") return Math.random() < 0.5 ? [0,1,2] : [2,1,0];
    return randomLineRow();
  }

  function randomSymbol(options={}){
    const {excludeCherry=false, reelIndex=null} = options;
    const basePool = reelIndex !== null && REEL_STRIPS[reelIndex] ? REEL_STRIPS[reelIndex] : symbols;
    const pool = excludeCherry ? basePool.filter(s => s !== CHERRY_SYMBOL) : basePool;
    return pool[Math.floor(Math.random()*pool.length)];
  }

  const MISS_GRID_PATTERNS = [
    [[ELEPHANT_SYMBOL,GRAPE_SYMBOL,"BAR"],["7",PIERROT_SYMBOL,GRAPE_SYMBOL],["BAR",GRAPE_SYMBOL,CHERRY_SYMBOL]],
    [[GRAPE_SYMBOL,ELEPHANT_SYMBOL,"BAR"],[PIERROT_SYMBOL,"7",GRAPE_SYMBOL],[GRAPE_SYMBOL,"BAR",CHERRY_SYMBOL]],
    [["BAR",GRAPE_SYMBOL,ELEPHANT_SYMBOL],[CHERRY_SYMBOL,GRAPE_SYMBOL,"7"],[GRAPE_SYMBOL,PIERROT_SYMBOL,"BAR"]],
    [[GRAPE_SYMBOL,"BAR",GRAPE_SYMBOL],[ELEPHANT_SYMBOL,"7",PIERROT_SYMBOL],["BAR",GRAPE_SYMBOL,CHERRY_SYMBOL]],
    [[GRAPE_SYMBOL,"BAR",PIERROT_SYMBOL],["7",ELEPHANT_SYMBOL,GRAPE_SYMBOL],[CHERRY_SYMBOL,"BAR",GRAPE_SYMBOL]],
    [["BAR",PIERROT_SYMBOL,GRAPE_SYMBOL],[GRAPE_SYMBOL,ELEPHANT_SYMBOL,"7"],[ELEPHANT_SYMBOL,GRAPE_SYMBOL,"BAR"]],
    [["7","7",GRAPE_SYMBOL],[ELEPHANT_SYMBOL,"BAR",PIERROT_SYMBOL],[GRAPE_SYMBOL,GRAPE_SYMBOL,CHERRY_SYMBOL]],
    [[GRAPE_SYMBOL,"7","7"],["BAR",ELEPHANT_SYMBOL,GRAPE_SYMBOL],[PIERROT_SYMBOL,CHERRY_SYMBOL,GRAPE_SYMBOL]],
    [[ELEPHANT_SYMBOL,"BAR",GRAPE_SYMBOL],["7","7",PIERROT_SYMBOL],[PIERROT_SYMBOL,GRAPE_SYMBOL,CHERRY_SYMBOL]],
    [["BAR",GRAPE_SYMBOL,GRAPE_SYMBOL],[ELEPHANT_SYMBOL,"7","7"],[GRAPE_SYMBOL,PIERROT_SYMBOL,"BAR"]],
    [[PIERROT_SYMBOL,GRAPE_SYMBOL,"7"],["BAR",GRAPE_SYMBOL,ELEPHANT_SYMBOL],["7",CHERRY_SYMBOL,"BAR"]],
    [["BAR",ELEPHANT_SYMBOL,"7"],[GRAPE_SYMBOL,"BAR",PIERROT_SYMBOL],["7",GRAPE_SYMBOL,CHERRY_SYMBOL]],
    [[GRAPE_SYMBOL,PIERROT_SYMBOL,"BAR"],[CHERRY_SYMBOL,"7",ELEPHANT_SYMBOL],["BAR",GRAPE_SYMBOL,GRAPE_SYMBOL]],
    [["BAR","7",GRAPE_SYMBOL],[GRAPE_SYMBOL,ELEPHANT_SYMBOL,PIERROT_SYMBOL],[GRAPE_SYMBOL,CHERRY_SYMBOL,"7"]],
    [["BAR",GRAPE_SYMBOL,GRAPE_SYMBOL],[PIERROT_SYMBOL,CHERRY_SYMBOL,ELEPHANT_SYMBOL],["7","BAR","7"]],
    [[GRAPE_SYMBOL,"BAR",PIERROT_SYMBOL],["7",GRAPE_SYMBOL,CHERRY_SYMBOL],[ELEPHANT_SYMBOL,"7","BAR"]]
  ];

  const REACH_ME_GRID_PATTERNS = [
    [[GRAPE_SYMBOL,ELEPHANT_SYMBOL,PIERROT_SYMBOL],["BAR","BAR","7"],[ELEPHANT_SYMBOL,GRAPE_SYMBOL,PIERROT_SYMBOL]],
    [[GRAPE_SYMBOL,ELEPHANT_SYMBOL,PIERROT_SYMBOL],["7","BAR","7"],[ELEPHANT_SYMBOL,GRAPE_SYMBOL,PIERROT_SYMBOL]],
    [[GRAPE_SYMBOL,ELEPHANT_SYMBOL,PIERROT_SYMBOL],["7","BAR","BAR"],[ELEPHANT_SYMBOL,GRAPE_SYMBOL,PIERROT_SYMBOL]],
    [[GRAPE_SYMBOL,ELEPHANT_SYMBOL,PIERROT_SYMBOL],["BAR","7","7"],[ELEPHANT_SYMBOL,GRAPE_SYMBOL,PIERROT_SYMBOL]],
    [[GRAPE_SYMBOL,ELEPHANT_SYMBOL,PIERROT_SYMBOL],["BAR","7","BAR"],[ELEPHANT_SYMBOL,GRAPE_SYMBOL,PIERROT_SYMBOL]],
    [[GRAPE_SYMBOL,ELEPHANT_SYMBOL,CHERRY_SYMBOL],[PIERROT_SYMBOL,"7",PIERROT_SYMBOL],[ELEPHANT_SYMBOL,GRAPE_SYMBOL,"BAR"]],
    [[GRAPE_SYMBOL,ELEPHANT_SYMBOL,CHERRY_SYMBOL],[PIERROT_SYMBOL,"BAR",PIERROT_SYMBOL],[ELEPHANT_SYMBOL,GRAPE_SYMBOL,"7"]],
    [[GRAPE_SYMBOL,ELEPHANT_SYMBOL,PIERROT_SYMBOL],[CHERRY_SYMBOL,GRAPE_SYMBOL,"7"],[ELEPHANT_SYMBOL,PIERROT_SYMBOL,GRAPE_SYMBOL]],
    [[CHERRY_SYMBOL,GRAPE_SYMBOL,"7"],[ELEPHANT_SYMBOL,PIERROT_SYMBOL,GRAPE_SYMBOL],[GRAPE_SYMBOL,ELEPHANT_SYMBOL,PIERROT_SYMBOL]],
    [[GRAPE_SYMBOL,ELEPHANT_SYMBOL,PIERROT_SYMBOL],[ELEPHANT_SYMBOL,PIERROT_SYMBOL,GRAPE_SYMBOL],[CHERRY_SYMBOL,GRAPE_SYMBOL,"BAR"]]
  ];

  function buildReachMeGrid(){
    return REACH_ME_GRID_PATTERNS[randomInt(0, REACH_ME_GRID_PATTERNS.length - 1)].map(row => row.slice());
  }

  function hasBarDiagonal(grid){
    return (
      grid[0]?.[0] === "BAR" && grid[1]?.[1] === "BAR" && grid[2]?.[2] === "BAR"
    ) || (
      grid[2]?.[0] === "BAR" && grid[1]?.[1] === "BAR" && grid[0]?.[2] === "BAR"
    );
  }

  function hasBellDiagonal(grid){
    const bell = RESULT.BELL.reel[0];
    return (
      grid[0]?.[0] === bell && grid[1]?.[1] === bell && grid[2]?.[2] === bell
    ) || (
      grid[2]?.[0] === bell && grid[1]?.[1] === bell && grid[0]?.[2] === bell
    );
  }

  function hasCrownVisible(grid){
    return grid.some(row => row.includes("👑"));
  }

  function displayedResultFromGrid(grid){
    if(A_TYPE_MODE){
      if(grid?.[1]?.every(x=>x===NEBULA_SYMBOL))return "NEBULA";
      const novaPattern=novaPatternFromGrid(grid);if(novaPattern)return novaPattern;
      const m=grid?.[1]||[],d=[grid?.[0]?.[0],m[1],grid?.[2]?.[2]],same=(a,s)=>a.length===3&&a.every(x=>x===s),nova=x=>String(x).startsWith('NOVA_');
      if(same(m,SUICA_SYMBOL))return 'STRONG_SUICA';
      if(same(d,SUICA_SYMBOL))return 'WEAK_SUICA';
      if(same(m,BELL_SYMBOL))return 'BELL';
      if(same(d,BELL_SYMBOL))return 'BELL';
      if(m.filter(x=>x==='7').length===1&&m.filter(x=>x===BELL_SYMBOL).length===2)return 'BELL15';
      if(m[0]==='7'&&nova(m[2]))return nova(m[1])?'CHANCE_A':'CHANCE_B';
    }
    const rows = Array.isArray(grid) ? grid : [];
    const middle = rows[1] || [];
    const rowMatches = (reel)=>rows.some(row => row[0] === reel[0] && row[1] === reel[1] && row[2] === reel[2]);

    // 7揃い・77BAR・BAR揃いは中段だけを成立ラインとして扱う。
    if(middle[0] === "7" && middle[1] === "7" && middle[2] === "7") return "BIG";
    if(middle[0] === "7" && middle[1] === "7" && middle[2] === "BAR") return "MID";
    if(middle[0] === "BAR" && middle[1] === "BAR" && middle[2] === "BAR") return "BAR3";
    if(rowMatches(RESULT.SMALL.reel)) return "SMALL";

    if(rowMatches(RESULT.REPLAY.reel)) return "REPLAY";
    if(rowMatches(RESULT.GRAPE.reel)) return "GRAPE";

    const cherryResult = cherryResultFromRows(rows);
    if(cherryResult) return cherryResult;
    return "MISS";
  }

  function cherryResultFromRow(row){
    if(!Array.isArray(row)) return "";
    if(row[2] === CHERRY_SYMBOL && row[0] !== CHERRY_SYMBOL) return "CHERRY_ANY";
    if(row[0] !== CHERRY_SYMBOL) return "";
    if(row[1] === CHERRY_SYMBOL && row[2] === CHERRY_SYMBOL) return "CHERRY_TRIPLE";
    if(row[1] === CHERRY_SYMBOL) return "CHERRY_DOUBLE";
    return "CHERRY_ANY";
  }

  function cherryResultFromRows(rows){
    let best = "";
    for(const row of rows){
      const result = cherryResultFromRow(row);
      if(result === "CHERRY_TRIPLE") return result;
      if(result === "CHERRY_DOUBLE") best = "CHERRY_DOUBLE";
      else if(result === "CHERRY_ANY" && !best) best = "CHERRY_ANY";
    }
    return best;
  }

  function displayedResultFromRow(row){
    if(!Array.isArray(row) || row.length < 3) return "MISS";
    if(row.filter(x=>x==='7').length===1&&row.filter(x=>x===BELL_SYMBOL).length===2)return 'BELL15';
    const exactResults = ["NEBULA","BIG","MID","BAR3","SMALL","BELL","REPLAY","GRAPE","SUICA","CHERRY_TRIPLE"];

    for(const result of exactResults){
      const reel = RESULT[result].reel;
      if(row[0] === reel[0] && row[1] === reel[1] && row[2] === reel[2]) return result;
    }
    const cherryResult = cherryResultFromRow(row);
    if(cherryResult) return cherryResult;
    return "MISS";
  }

  const REACH_ME_LINE_PATTERNS = [
    ["BAR","BAR","7"],
    ["7","BAR","7"],
    ["7","BAR","BAR"],
    ["BAR","7","7"],
    ["BAR","7","BAR"],
    [PIERROT_SYMBOL,"7",PIERROT_SYMBOL],
    [PIERROT_SYMBOL,"BAR",PIERROT_SYMBOL]
  ];

  function reachMeLabelForRow(row){
    if(!Array.isArray(row) || row.length < 3) return "";
    const pattern = REACH_ME_LINE_PATTERNS.find(line => line[0] === row[0] && line[1] === row[1] && line[2] === row[2]);
    return pattern ? pattern.join("") : "";
  }

  function reachMeLabelFromGrid(grid){
    const rows = Array.isArray(grid) ? grid : [];
    for(const row of gridPaylineRows(rows)){
      const label = reachMeLabelForRow(row);
      if(label) return label;
    }
    if(rows[1]?.[0] === CHERRY_SYMBOL) return "中段チェリー";
    if(rows[0]?.[0] === CHERRY_SYMBOL && rows[0]?.[1] !== CHERRY_SYMBOL) return "上段チェリー・中チェリーなし";
    if(rows[2]?.[0] === CHERRY_SYMBOL && rows[2]?.[1] !== CHERRY_SYMBOL) return "下段チェリー・中チェリーなし";
    return "";
  }

  function hasReachMeShape(grid){
    return !!reachMeLabelFromGrid(grid);
  }

  function applyReachMeBonusIfNeeded(result, resolved){
    if(!A_TYPE_MODE || !currentSpin || !currentSpin.normalActiveAtStart) return false;
    if(session.active || normalState.bonusPending || normalState.reachMePending) return false;
    if(result !== "MISS") return false;
    if(!resolved || !resolved.bonusHit || resolved.aTypeBonusReady || resolved.bonusReady || resolved.regReady) return false;

    const reachLine = currentSpin.reachMeLine || reachMeLabelFromGrid(currentSpin.grid);
    if(!reachLine) return false;

    jagChanceHold = false;
    normalState.reachMePending = true;
    normalState.reachMeBonusKind = resolved.bonusKind || "BIG";
    normalState.reachMeBonusSource = `${resolved.bonusSource || "単独当選"} / リーチ目 ${reachLine}`;
    normalState.reachMeHitGamesSince = normalizeBonusAfterGames(resolved.gamesSinceLastBonusAtStart || normalState.sinceBonus);
    normalState.bonusPending = false;
    normalState.bonusKind = "";
    normalState.bonusSource = "";
    normalState.premiumBonus = false;
    normalState.oneGameRenBonus = false;
    normalState.bonusWaitGames = 0;
    normalState.bonusHitGamesSince = 0;
    const lamp = $("stLamp");
    if(lamp) lamp.classList.remove("on");
    showMessage("リーチ目", `${reachLine} / ランプ非点灯 / 次ゲーム告知`);
    log(`リーチ目：${reachLine} / ランプ非点灯 / 次ゲーム告知`);
    flashReelLight("rainbow", 1600);
    showOverlay("リーチ目");
    return true;
  }

  function activateReachMeBonusAnnouncementIfNeeded(normalActiveAtSpinStart){
    if(!A_TYPE_MODE || !normalActiveAtSpinStart || session.active) return false;
    if(!normalState.reachMePending || normalState.bonusPending) return false;
    const source = normalState.reachMeBonusSource || "リーチ目";
    const bonusKind = normalState.reachMeBonusKind || "BIG";
    normalState.reachMePending = false;
    normalState.reachMeBonusKind = "";
    normalState.reachMeBonusSource = "";
    normalState.bonusPending = true;
    normalState.bonusKind = bonusKind;
    normalState.bonusSource = source;
    normalState.premiumBonus = false;
    normalState.oneGameRenBonus = false;
    normalState.bonusWaitGames = 1;
    normalState.bonusHitGamesSince = normalizeBonusAfterGames(normalState.reachMeHitGamesSince || normalState.sinceBonus);
    normalState.reachMeHitGamesSince = 0;
    jagChanceHold = true;
    const lamp = $("stLamp");
    if(lamp) lamp.classList.add("on");
    playPekaSound(bonusKind !== "MID");
    showMessage("BONUS確定", `${source} / イラストランプ告知 / 777を狙ってください`);
    log(`リーチ目告知：${source} / 次ゲームイラストランプ告知`);
    return true;
  }

  function isMiddleLineOnlyResult(result){
    const display = displayResultFor(result);
    return display === "NEBULA" || display === "BIG" || display === "MID" || display === "BAR3";
  }

  function hasOnlyTargetPayline(grid, result, winRow=1){
    if(result === "BELL3"){
      return hasBellDiagonal(grid) && grid.every(line => displayedResultFromRow(line) === "MISS");
    }
    const targetResult = displayResultFor(result);
    const row = clamp(winRow, 0, 2);
    return grid.every((line, index)=>{
      const lineResult = displayedResultFromRow(line);
      return index === row ? lineResult === targetResult : lineResult === "MISS";
    });
  }

  function safeGridForResult(result, winRow=1){
    const grid = [
      [GRAPE_SYMBOL,ELEPHANT_SYMBOL,PIERROT_SYMBOL],
      [PIERROT_SYMBOL,GRAPE_SYMBOL,ELEPHANT_SYMBOL],
      [ELEPHANT_SYMBOL,PIERROT_SYMBOL,GRAPE_SYMBOL]
    ];
    const row = clamp(winRow, 0, 2);
    grid[row] = (RESULT[result] || RESULT.MISS).reel.slice();
    return grid;
  }

  function buildLeftCherryGrid(winRow=1){
    const row = clamp(winRow, 0, 2);
    const grid = [
      [GRAPE_SYMBOL,ELEPHANT_SYMBOL,PIERROT_SYMBOL],
      [PIERROT_SYMBOL,GRAPE_SYMBOL,ELEPHANT_SYMBOL],
      [ELEPHANT_SYMBOL,PIERROT_SYMBOL,GRAPE_SYMBOL]
    ];
    grid[row][0] = CHERRY_SYMBOL;
    grid[row][1] = randomSymbol({excludeCherry:true, reelIndex:1});
    grid[row][2] = randomSymbol({excludeCherry:true, reelIndex:2});
    return gridMatchesResult(grid, "CHERRY_ANY", row) ? grid : safeGridForResult("CHERRY_ANY", row);
  }

  function gridMatchesResult(grid, result, winRow=1){
    if(result === "BELL3") return !hasCrownVisible(grid) && !hasBarDiagonal(grid) && displayedResultFromGrid(grid) === "BELL3" && hasOnlyTargetPayline(grid, result, winRow);
    if(hasCrownVisible(grid)) return false;
    if(hasBarDiagonal(grid)) return false;
    return displayedResultFromGrid(grid) === displayResultFor(result) && hasOnlyTargetPayline(grid, result, winRow);
  }

  const novaStopGridCache = new Map();
  function buildNovaReelGrid(result, winRow=1, firstReel=0){
    result = normalizeATypeResult(result);
    if(isNovaResult(result)) return buildForcedNovaGrid(result);
    if(result === "CZ" || result === "STRONG_CZ") result = "MISS";
    const spec = RESULT[result] || RESULT.MISS;
    if(isMiddleLineOnlyResult(result)||NovaNormal.rare[result]||result==='BELL15') winRow = 1;
    const cacheKey = result + ":" + winRow + (result==='BELL15'?':'+firstReel:'');
    const cached = novaStopGridCache.get(cacheKey);
    if(cached) return cached[Math.floor(Math.random()*cached.length)].map(row=>row.slice());
    const choices = REEL_STRIPS.map((strip,column) => strip.map((_,top) => reelWindowFromTopIndex(column,top))
      .filter(items => result==='MISS'||result==='CHANCE_A'||result==='CHANCE_B'||items[(result==='BELL'||result==='WEAK_SUICA')?column:winRow]===(result==='BELL15'?(column===firstReel?'7':BELL_SYMBOL):spec.reel[column])));
    const grids = [];
    for(const left of choices[0]) for(const middle of choices[1]) for(const right of choices[2]){
      const grid = [0,1,2].map(row => [left[row],middle[row],right[row]]);
      if(!isNovaGrid(grid) && displayedResultFromGrid(grid) === result && gridHasOnlyAllowedPaylines(grid,result)) grids.push(grid);
    }
    if(!grids.length) throw new Error("No valid NOVA reel stop for " + result);
    novaStopGridCache.set(cacheKey,grids);
    return grids[Math.floor(Math.random()*grids.length)].map(row=>row.slice());
  }

  function nearestCommonStopColumn(index,spin,distance){
    if(!['BELL','REPLAY'].includes(spin.result))return null;
    buildNovaReelGrid(spin.result,spin.lineRow);
    const candidates=novaStopGridCache.get(spin.result+':'+spin.lineRow)||[];
    const held=spin.commonStopColumns||[];
    let best=null,bestDistance=Infinity;
    for(const candidate of candidates){
      if(!held.every((column,c)=>!column||column.every((v,r)=>candidate[r][c]===v)))continue;
      const column=candidate.map(row=>row[index]),d=distance(column);
      if(d<bestDistance){bestDistance=d;best=column;}
    }
    if(!best)throw new Error('No compatible common-role stop');
    spin.commonStopColumns ||= [];
    spin.commonStopColumns[index]=best;
    setGridColumn(spin.grid,index,best);
    return best;
  }

  function buildGrid(result, winRow=1){
    if(A_TYPE_MODE) return buildNovaReelGrid(result,winRow);
  function buildDiagonalBellGrid(winRows){
    const bell = RESULT.BELL.reel[0];
    const down = Array.isArray(winRows) ? winRows[0] === 0 : Math.random() < 0.5;
    return down
      ? [[bell,"7",PIERROT_SYMBOL],["7",bell,"BAR"],[PIERROT_SYMBOL,"BAR",bell]]
      : [[PIERROT_SYMBOL,"BAR",bell],["7",bell,"BAR"],[bell,"7",PIERROT_SYMBOL]];
  }

    if(result === "BELL3") return buildDiagonalBellGrid(winRow);
    if(isMiddleLineOnlyResult(result)) winRow = 1;
    if(result === "CHERRY_ANY" || result === "MID_CHERRY") return buildLeftCherryGrid(winRow);
    if(result === "MISS"){
      let picked = MISS_GRID_PATTERNS[randomInt(0, MISS_GRID_PATTERNS.length - 1)].map(row => row.slice());

      // ハズレでは、ボーナス揃い・BARナナメ揃い・王冠表示・リーチ目を絶対に出さない
      let guard = 0;
      while((displayedResultFromGrid(picked) !== "MISS" || hasBarDiagonal(picked) || hasCrownVisible(picked) || hasReachMeShape(picked)) && guard < 50){
        picked = MISS_GRID_PATTERNS[randomInt(0, MISS_GRID_PATTERNS.length - 1)].map(row => row.slice());
        guard++;
      }
      if(displayedResultFromGrid(picked) !== "MISS" || hasBarDiagonal(picked) || hasCrownVisible(picked) || hasReachMeShape(picked)){
        picked = [[GRAPE_SYMBOL,ELEPHANT_SYMBOL,PIERROT_SYMBOL],[PIERROT_SYMBOL,GRAPE_SYMBOL,ELEPHANT_SYMBOL],[ELEPHANT_SYMBOL,PIERROT_SYMBOL,GRAPE_SYMBOL]];
      }
      return picked;
    }

    const spec = RESULT[result] || RESULT.MISS;
    const resultLine = spec.reel.slice();
    let grid = null;

    for(let guard=0; guard<80; guard++){
      const columns = resultLine.map((symbol, reelIndex)=>getReelWindowFromStrip(reelIndex, symbol, winRow));
      grid = [
        [columns[0][0], columns[1][0], columns[2][0]],
        [columns[0][1], columns[1][1], columns[2][1]],
        [columns[0][2], columns[1][2], columns[2][2]]
      ];
      if(gridMatchesResult(grid, result, winRow)) return grid;
    }

    return safeGridForResult(result, winRow);
  }

  function setReelColumn(index, columnSymbols, label, cls, winRow=null){
    if(typeof oumaStoppedTops!=='undefined')oumaStoppedTops[index]=REEL_STRIPS[index].findIndex((_,n)=>columnSymbols.every((v,j)=>REEL_STRIPS[index][(n+j)%REEL_STRIPS[index].length]===v));
    const cells = ensureReelCells(index);
    columnSymbols.forEach((symbol,i)=>{
      const isWin = Array.isArray(winRow) ? i === winRow[index] : winRow !== null && i === winRow;
      updateReelCell(cells[i], symbol, (isWin ? (label || "") : ""), (isWin ? (cls || "") : ""), isWin, i === 1);
    });
  }

  function resetReelSpinOffsets(){
    reelSpinOffsets = reels.map((_, index)=>{
      const strip = REEL_STRIPS[index] || REEL_STRIPS[0];
      return Math.floor(Math.random() * strip.length);
    });
  }

  function setRandomReel(index){
    const strip = REEL_STRIPS[index] || REEL_STRIPS[0];
    if(!Number.isFinite(reelSpinOffsets[index])){
      reelSpinOffsets[index] = Math.floor(Math.random() * strip.length);
    }
    const start = mod(reelSpinOffsets[index], strip.length);
    reelSpinOffsets[index] = mod(reelSpinOffsets[index] + (currentSpin?.artReverse ? 1 : -1), strip.length);
    const symbols = [
      strip[start],
      strip[mod(start + 1, strip.length)],
      strip[mod(start + 2, strip.length)]
    ];
    const cells = ensureReelCells(index);
    symbols.forEach((symbol,i)=>updateReelCell(cells[i], symbol, "", "", false, i === 1));
    if(reels[index].classList.contains('spinning')){
      const reverse=!!currentSpin?.artReverse;
      const duration=Math.max(16,REEL_FULL_ROTATION_MS/strip.length)*.8;
      cells.forEach(cell=>{
        cell.getAnimations().filter(a=>a.id==='nova-reel-step').forEach(a=>a.cancel());
        const motion=cell.animate([{transform:'translateY('+(reverse?'18%':'-18%')+')'},{transform:'translateY(0)'}],{duration,easing:'linear'});
        motion.id='nova-reel-step';
      });
    }
  }

  function setMorningBarReels(){
    if(!reels || reels.length < 3) return;
    const grid = [
      ["7", PIERROT_SYMBOL, ELEPHANT_SYMBOL],
      ["BAR", "BAR", "BAR"],
      [ELEPHANT_SYMBOL, GRAPE_SYMBOL, RESULT.CHERRY_TRIPLE.reel[0]]
    ];
    for(let i=0;i<3;i++){
      setReelColumn(i, [grid[0][i], grid[1][i], grid[2][i]], "", "", null);
    }
  }

  function escapeHtml(str){
    return String(str).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }

  function resetControlInput(){
    controlInputIndex = 0;
    controlInputHash = CONTROL_SIGNATURE_SEED;
    controlInputCommand = "";
    controlInputReady = "";
    controlInputLastAt = 0;
  }

  function canCaptureControlInput(){
    return !!(
      A_TYPE_MODE &&
      !isSpinning &&
      !session.active &&
      !normalState.bonusPending &&
      !autoPlay &&
      !speedToBonusActive &&
      !debugFastSpinActive &&
      !bonusEndBgmPlaying &&
      !bonusConfirmSoundPlaying
    );
  }

  function nextControlSignature(hash, code){
    return Math.imul((hash ^ code) >>> 0, 0x01000193) >>> 0;
  }

  function captureControlInput(event){
    if(controlInputReady) return false;
    if(!canCaptureControlInput()){
      resetControlInput();
      return false;
    }

    const now = Date.now();
    if(controlInputLastAt && now - controlInputLastAt > CONTROL_INPUT_TIMEOUT_MS){
      controlInputIndex = 0;
      controlInputHash = CONTROL_SIGNATURE_SEED;
      controlInputCommand = "";
    }
    if(event.repeat) return controlInputIndex > 0;

    const code = Number(event.keyCode || event.which || 0);
    const signatures = CONTROL_SIGNATURES[controlInputCommand];
    const candidate = nextControlSignature(controlInputHash, code);
    if(signatures && candidate === signatures[controlInputIndex]){
      controlInputHash = candidate;
      controlInputIndex++;
      controlInputLastAt = now;
      if(controlInputIndex >= signatures.length){
        const completedCommand = controlInputCommand;
        controlInputIndex = 0;
        controlInputHash = CONTROL_SIGNATURE_SEED;
        controlInputCommand = "";
        controlInputReady = completedCommand;
        controlInputLastAt = 0;
      }
      return true;
    }

    const restartHash = nextControlSignature(CONTROL_SIGNATURE_SEED, code);
    const restartCommand = Object.keys(CONTROL_SIGNATURES)
      .find(command=>restartHash === CONTROL_SIGNATURES[command][0]) || "";
    const startsNewSequence = !!restartCommand;
    controlInputIndex = startsNewSequence ? 1 : 0;
    controlInputHash = startsNewSequence ? restartHash : CONTROL_SIGNATURE_SEED;
    controlInputCommand = restartCommand;
    controlInputLastAt = startsNewSequence ? now : 0;
    return startsNewSequence;
  }

  function applyQueuedControlInput(){
    const command = controlInputReady;
    resetControlInput();
    const control = CONTROL_RESULTS[command];
    if(!control || !canCaptureControlInput()) return false;
    forceResult = control.result;
    forcePremiumEffect = control.premium;
    if($("forceResult")) $("forceResult").value = control.result;
    if($("premiumForceStatus")) $("premiumForceStatus").value = control.premium ? "ON" : "OFF";
    return true;
  }

  function restorePendingSpin(){
    const spin=currentSpin;
    if(!spin)return false;
    isSpinning=true;spinCanStop=true;
    NovaBellNavi.restore(spin);
    NovaAim.bet(spin.resolved.aim,spin.resolved);
    NovaInitialDuo.begin(spin.resolved);
    NovaInitialDuo.stop(spin.stopped.filter(Boolean).length);
    NovaLadder.bet(spin.resolved.flowBefore);
    NovaLadder.stop(spin.stopped.filter(Boolean).length);
    renderCzPrelude(spin.resolved.blackoutReels||[]);
    syncCzPreludeGlow(spin.resolved);
    if(spin.resolved.czLampAtBet!=null)document.getElementById('machine').dataset.czLamp=String(spin.resolved.czLampAtBet);
    reels.forEach((reel,i)=>{
      const column=spin.stopped[i]&&spin.auditGrid?.every(row=>row?.[i])?spin.auditGrid.map(row=>row[i]):spin.grid.map(row=>row[i]);
      setReelColumn(i,column,i===1?spin.spec.label:'',spin.spec.cls,spin.stopped[i]?spin.lineRow:null);
      reel.classList.toggle('spinning',!spin.stopped[i]);
      stopBtns[i].disabled=spin.stopped[i]||!!spin.pendingStopColumns[i];
      if(!spin.stopped[i])NovaReelMotion.start(i,reel,REEL_STRIPS[i],currentReelTopIndex(i),!!spin.artReverse,cellHtml);
    });
    $('spinBtn').disabled=false;$('spinBtn').textContent='ストップ';
    $('resultText').textContent='中断した回転を再開 / BET済み・残りリールを停止してください';
    if(spin.stopped.every(Boolean)){
      NovaAim.stop(spin.resolved);
      prepareManualBonusOutcome(spin);
      finishSpin(spin.result,spin.resolved,spin.lineRow);
    }else if(spin.resolved.oumaFreeze){
      startOumaReverseAudio(spin);
    }else{
      // Pressed reels retain their target even if reloaded before the landing animation ends.
      const order=spin.auditPressOrder||[0,1,2];
      for(const i of order){
        const column=spin.pendingStopColumns[i];
        if(column)setTimeout(()=>{
          if(currentSpin===spin)stopSingleReel(i,{visualReady:true,visualColumn:column});
        },0);
      }
    }
    updateDisplay();syncCabinetControlState();
    return true;
  }

  async function spin(options={}){
    if(!canUsePlayState())return;
    if(NovaLadder.busy||NovaAim.busy||NovaDirectAward.busy)return;
    if(NovaResults.editing)return;
    if(normalState.flow?.phase==='art'&&!Number.isFinite(normalState.resultAtStartPaid))normalState.resultAtStartPaid=Number(stats.totalPaid)||0;
    if(!oumaPresentation&&!isSpinning&&!debugFastSpinActive&&['ouma','urapi'].includes(normalState.flow?.zone)&&normalState.flow.oumaPending){scheduleOumaZeroChain();return;}
    if(oumaPresentation){if(oumaPresentation.stage==='bet')resolveOumaChallenge();return;}
    if(debugFastSpinActive) return;
    if(speedToBonusActive && !speedModeSpinRequest) return;
    if(bonusEndBgmPlaying){
      if($("resultText")) $("resultText").textContent = "ボーナス終了BGM中...";
      return;
    }
    if(bonusConfirmSoundPlaying){
      if($("resultText")) $("resultText").textContent = "ボーナス確定音再生中...";
      return;
    }
    if(!canPlayCompleteTrial()) return;
    // 回転中にメインボタンを押したら、残りリールを停止する
    if(isSpinning){
      stopAllReels();
      return;
    }
    applyQueuedControlInput();

    if(isRogiThirdStopHoldActive()){
      clearRogiThirdStopHold();
      stopGekiatsuEffect(true);
    }
    if(sessionStartGuard) return;
    if(pendingAtStartTimer){
      if(speedBonusRogiHoldActive) stopGekiatsuEffect(true);
      startBonusSessionNow();
      return;
    }
    const normalActiveAtSpinStart = !session.active;
    startPremiumBigConfirmBarAimIfNeeded(normalActiveAtSpinStart);
    if(normalActiveAtSpinStart) playPendingSettingVoiceOnLever();
    triggerBonusConfirmBetSoundIfNeeded();
    hideBattleIntro();
    hideRogiContinuationBlackout();
    hideBonusConfirmScreen();
    clearReelVideos();

    if(normalActiveAtSpinStart && normalState.bonusPending){
      setSpeedFrameOffHold(false);
    }
    if(normalActiveAtSpinStart && session.phase === "ended" && session.resultPayout !== null && session.resultPayout !== undefined){
      hideSessionResultScreen();
      session.phase = "idle";
      session.resultPayout = null;
      session.endSignal = null;

    }

    const zoneActiveAtSpinStart = session.active && isGoraiZoneActive();
    const aTypeBonusActiveAtSpinStart = isATypeBonusActive();
    if(aTypeBonusActiveAtSpinStart && isATypeBonusComplete()){
      playBonusEndBgmThen(()=>{
        finishSession();
        scheduleNextAuto();
      });
      return;
    }
    if(zoneActiveAtSpinStart){
      devilZoneConfirmIntroPending = false;
      showDevilZoneConfirmScreen("translucent");
    }else{
      syncDevilZoneConfirmScreen();
    }
    if(session.active && !aTypeBonusActiveAtSpinStart && session.remain <= 0 && session.phase !== "battle" && !zoneActiveAtSpinStart){
      startContinuationBattlePart();
      scheduleNextAuto();
      return;
    }
    if(session.active && !aTypeBonusActiveAtSpinStart && session.phase === "battle" && session.battleRemain <= 0 && !zoneActiveAtSpinStart){
      advanceBattleSetIfNeeded();
      return;
    }
    const battleActiveAtSpinStart = isContinuationBattleActive() && !zoneActiveAtSpinStart;
    const battleRoundAtSpinStart = battleActiveAtSpinStart ? battleRoundNumber() : 0;
    const speedModeSpinAtStart = speedToBonusActive && speedModeSpinRequest && normalActiveAtSpinStart;
    const spinWaitMs = spinWaitMsForMode(speedModeSpinAtStart);

    fadeAimWinSoundsOnBet();
    NovaDirectAward.clear();
    isSpinning = true;
    if(normalState.resultCard){normalState.resultCard=null;NovaResults.hide();}
    jagLastGamePayout = 0;
    if(!normalState.bonusPending && !session.active) jagChanceHold = false;
    clearReelLight(true);
    spinCanStop = false;
    $("spinBtn").disabled = false;
    $("spinBtn").textContent = "WAIT";
    stopBtns.forEach(b=>b.disabled=true);

    if(spinWaitTimer) clearTimeout(spinWaitTimer);
    spinWaitTimer = setTimeout(()=>{
      spinCanStop = true;
      if(isSpinning){
        const stopLocked = isPremiumBigConfirmStopLocked();
        $("spinBtn").textContent = stopLocked ? "WAIT" : "ストップ";
        stopBtns.forEach(b=>b.disabled=stopLocked);
        syncCabinetControlState();
        $("resultText").textContent = zoneActiveAtSpinStart
          ? `${goraiZoneRemainText(session.bigZone, session.bigZoneType)} / 停止できます`
          : battleActiveAtSpinStart
            ? `${battleRemainText()} / 停止できます`
            : stopLocked
              ? "フリーズ告知中..."
              : "停止できます";
      }
    }, spinWaitMs);

    pendingForceResult = takeForcedResult();
    const premiumForced = forcePremiumEffect;
    forcePremiumEffect = false;
    $("forceResult").value = forceResult;
    if($("premiumForceStatus")) $("premiumForceStatus").value = "OFF";
    if(!A_TYPE_MODE && premiumForced && !pendingForceResult) pendingForceResult = "BIG";

    const atSpinAtStart = session.active && !aTypeBonusActiveAtSpinStart && !zoneActiveAtSpinStart && !battleActiveAtSpinStart;
    if(normalActiveAtSpinStart){
      // 通常・高確中は天井ゲーム数だけ進める。AT残りは減算しない。
    }else if(zoneActiveAtSpinStart){
      // デビルゾーン中はATも継続バトルも減算しない。
    }else if(aTypeBonusActiveAtSpinStart){
      // A-type bonus consumes a BET but has no fixed game counter.
    }else if(battleActiveAtSpinStart){
      session.battleRemain = Math.max(0, (session.battleRemain || 0) - 1);
    }else{
      session.remain--;
    }
    if(!options?.oumaFailed){
      const flowBeforeBet=normalState.flow;
      countTotalSpinIfNeeded(aTypeBonusActiveAtSpinStart);
      chargeSpinCost();
      if(normalActiveAtSpinStart)playZoneStartVoice(flowBeforeBet,normalState.flow);
    }
    if(!debugFastSpinActive){
      if(normalState.ladderAwardPresentation){normalState.ladderAwardPresentation.started=true;NovaLadder.award(normalState.ladderAwardPresentation.card.pt,true);}
      else NovaLadder.bet(normalState.flow);
    }
    $("stLamp").classList.remove("on");
    const reachMeAnnouncementLit = activateReachMeBonusAnnouncementIfNeeded(normalActiveAtSpinStart);
    if(reachMeAnnouncementLit) triggerBonusConfirmBetSoundIfNeeded();
    updateDisplay();
    $("spinBtn").textContent = "ストップ";

    stopGekiatsuEffect(true);
    hideReversePushGuide();
    hideDevilRushEntryEffect();
    const devilRushEntryEffect = atSpinAtStart ? consumeDevilRushEntryEffect() : "";
    if(devilRushEntryEffect) showDevilRushEntryEffect(devilRushEntryEffect);
    // 大当たりを含む成立役はBET/レバーON時点で確定させる。停止時はこの結果を表示するだけ。
    const result = options?.oumaFailed ? "MISS" : normalActiveAtSpinStart ? drawNormalResult() : drawResult();
    const spec = RESULT[result];
    const lineRow = resultLineRow(result);
    const resolved = options?.oumaFailed ? {oumaFailed:true,reward:0,flowBefore:normalState.flow,flowAfter:normalState.flow} : normalActiveAtSpinStart ? resolveNormalOutcome(result, lineRow) : resolveOutcome(result);
    const reversePushGuide = zoneActiveAtSpinStart ? decideReversePushGuide(result, zoneActiveAtSpinStart ? currentGoraiZoneType() : "") : "";
    let grid = zoneActiveAtSpinStart && reversePushGuide && result === "MISS"
      ? buildReversePushMissGrid()
      : (A_TYPE_MODE && normalActiveAtSpinStart && isCollectibleCherryResult(result))
        ? safeGridForResult(result, lineRow)
        : buildGrid(result, lineRow);
    let reachMeLine = "";
    const forceReachMeDisplay = A_TYPE_MODE && pendingForceResult === "REACH_ME";
    if(A_TYPE_MODE && normalActiveAtSpinStart && result === "MISS" && resolved && resolved.bonusHit && (forceReachMeDisplay || Math.random() < A_TYPE_REACH_ME_ANNOUNCE_RATE)){
      grid = buildReachMeGrid();
      reachMeLine = reachMeLabelFromGrid(grid);
    }
    const bar3LeverEffect = !A_TYPE_MODE && !speedModeSpinAtStart && result === "BAR3";
    const bigPremiumEffect = !bar3LeverEffect && decideBigPremiumEffect(result, resolved, premiumForced);
    if(A_TYPE_MODE && normalActiveAtSpinStart && resolved && (resolved.bonusHit || resolved.bonusReady) && resolved.bonusKind === "BIG"){
      resolved.premiumBonus = !!(resolved.premiumBonus || bigPremiumEffect);
    }
    const premiumConfirmMovieEffect = !!(
      A_TYPE_MODE &&
      normalActiveAtSpinStart &&
      resolved &&
      resolved.bonusKind === "BIG" &&
      resolved.premiumBonus &&
      (
        resolved.bonusHit ||
        (!resolved.bonusPendingAtStart && result === "BAR3")
      )
    );
    const premiumMovieEffect = !A_TYPE_MODE && bigPremiumEffect;
    const speedModeBonusRogiEffect = speedModeSpinAtStart && !premiumMovieEffect && shouldPlaySpeedModeBonusRogi(result, resolved);
    const gekiatsuChance = premiumMovieEffect;
    const zakoEffect = decideZakoEffect(result, resolved, normalActiveAtSpinStart);
    const bonusAnnouncementTiming = !reachMeLine && shouldScheduleBonusAnnouncement(normalActiveAtSpinStart, resolved)
      ? (resolved.czLamp ? "stop3" : A_TYPE_MODE && resolved.premiumBonus
        ? "lever"
        : (A_TYPE_MODE && resolved.bonusHit && resolved.bonusSource === "チェリー同時当選")
          ? "stop3"
          : decideBonusAnnouncementTiming())
      : "";

    showCzLamp(0,resolved);
    if(normalState.flow?.entryStage!=='roulette')showZoneRoulette(null);
    currentSpin = {
      artReverse:!!resolved.artReverse,
      result,
      spec,
      lineRow,
      resolved,
      grid,
      gekiatsu:speedModeBonusRogiEffect || gekiatsuChance || bar3LeverEffect,
      bonusConfirmWaitSpin:normalActiveAtSpinStart && !!resolved.bonusWaitSpin,
      bonusConfirmPrizeSpin:normalActiveAtSpinStart && !!resolved.bonusPendingAtStart && !resolved.bonusWaitSpin && !!(resolved.bonusReady || resolved.regReady),
      bar3LeverEffect,
      speedModeBonusRogiEffect,
      zoneActiveAtStart:zoneActiveAtSpinStart,
      aTypeBonusActiveAtStart:aTypeBonusActiveAtSpinStart,
      zoneType:zoneActiveAtSpinStart ? currentGoraiZoneType() : "",
      battleActiveAtStart:battleActiveAtSpinStart,
      normalActiveAtStart:normalActiveAtSpinStart,
      speedModeAtStart:speedModeSpinAtStart,
      autoStopAtStart:autoPlay,
      bonusAnnouncementTiming,
      bonusAnnouncementLit:false,
      reachMeLine,
      premiumBigConfirmMovieEffect:premiumConfirmMovieEffect,
      devilRushEntryEffect,
      battleRound:battleRoundAtSpinStart,
      stopped:[false,false,false],
      ladderResultPresentation:normalState.ladderAwardPresentation?.started?{zone:normalState.ladderAwardPresentation.flow?.zone,pt:normalState.ladderAwardPresentation.card?.pt}:null,
      effectsSkipped:false,
      finishing:false,
      finishScheduled:false,
      rogiStopEffectMax:0,
      rogiStopEffectStarted:false,
      rogiLastStopEffectOrder:0,
      rogiBlackoutShown:false,
      reversePushMissBlackoutShown:false,
      zakoEffectActive:zakoEffect.active,
      zakoBellEffect:zakoEffect.bell,
      zakoAddEffect:zakoEffect.add,
      zakoThirdStopVoicesPlayed:false,
      reversePushGuide,
      pendingBattleOutcome:null
    };
    showCzPrelude(0,resolved);
    playCzCountdownOnLever(resolved);
    currentSpin.manualBonusStop = false; // Fixed-G prototype: bonus starts on the next confirmed spin.
    if(!debugFastSpinActive&&NovaBellNavi.begin(currentSpin)){
      if(result==='BELL15')currentSpin.grid=buildNovaReelGrid(result,1,currentSpin.bellNaviOrder[0]);
      playOneShotSound('assets/media/nova/bell-navi.wav',sfxOutputVolume(),{allowDuringPremiumConfirm:true});
      playBellNaviVoice(currentSpin);
    }
    playZoneRouletteBetVoice(resolved);
    playAimBetPresentation(resolved);
    playRareNaviSound(currentSpin);
    playRareCueVoice(currentSpin);
    playGiruLadderBetVoice(currentSpin);
    if(resolved.oumaFreeze)showOverlay(NovaArt.zoneName(normalState.flow)+'フリーズ！ 0G連');
    else if(resolved.artReverse)showOverlay('逆回転！ '+resolved.flowAfter.award+'pt');
    else if(resolved.researchChallenge?.priorAim)showOverlay('ノヴァを狙え');
    else if(resolved.researchChallenge)showOverlay('上位ATチャレンジ / '+(resolved.researchChallenge.nextAim?'HOLD':'残り'+resolved.researchChallenge.left+'G'));
    else if(resolved.researchSortie)showOverlay('ノヴァ出陣 / 残り'+resolved.flowAfter.researchSortieLeft+'G');
    else if(!resolved.oumaFailed&&['urapi','ouma'].includes(normalState.flow?.zone))showOverlay('ノヴァを狙え');
    if(currentSpin.bonusConfirmWaitSpin){
      showBonusConfirmScreen("solid");
    }else if(currentSpin.bonusConfirmPrizeSpin){
      showBonusConfirmScreen("translucent");
    }
    currentSpin.rogiStopEffectMax = decideRogiStopEffectMax(currentSpin);
    if(premiumConfirmMovieEffect){
      playPremiumBigConfirmMovie();
    }else if(speedModeBonusRogiEffect){
      startGekiatsuEffect(false, ROGI_STOP_VIDEO_SRCS[3], "SPEED BONUS ROGI", {
        muted:false,
        solid:true,
        fadeOnEnd:true,
        holdUntilEndOrBet:true,
        muteBgm:true,
        volumeScale:ROGI_MOVIE_OUTPUT_SCALE,
        volumeGroup:"rogi",
        allowDuringSpeed:true
      });
    }else if(bar3LeverEffect){
      startGekiatsuEffect(false, BAR3_LEVER_VIDEO_SRC, "BAR LEVER MOVIE", {solid:true, fadeOnEnd:true});
    }else if(gekiatsuChance){
      startGekiatsuEffect(premiumForced);
    }
    if(zakoEffect.active){
      startBellReelReadyVideos();
    }
    if(reversePushGuide){
      showReversePushGuide(reversePushGuide);
    }
    if(currentSpin.bonusAnnouncementTiming === "lever"){
      lightBonusAnnouncement(currentSpin, "lever");
    }

    const waitSeconds = spinWaitSecondsText();
    const waitText = speedModeSpinAtStart
      ? "SPEED中 / 停止できます"
      : bar3LeverEffect
        ? `BAR揃い演出発生！ ${waitSeconds}後に停止可能`
        : (gekiatsuChance || premiumConfirmMovieEffect)
          ? `プレミア演出発生！ ${waitSeconds}後に停止可能`
          : `ウェイト中... ${waitSeconds}後に停止可能`;
    $("resultText").textContent = zoneActiveAtSpinStart
      ? `${goraiZoneRemainText(session.bigZone, session.bigZoneType)} / ${waitText}`
      : battleActiveAtSpinStart
        ? `${battleRemainText()} / ${waitText}`
        : waitText;
    if(!speedModeSpinAtStart && !premiumBigConfirmSilence) playNormalBgm();
    if(options?.oumaFailed){
      playOneShotSound('assets/media/nova/ouma-fail.wav');
      const machine=document.getElementById('machine');machine.dataset.oumaFailDim='true';
      clearTimeout(oumaFailDimTimer);
      oumaFailDimTimer=setTimeout(()=>{machine.dataset.oumaFailDim='';oumaFailDimTimer=null;},900);
    }else if(!resolved.oumaFreeze)playSpinSound(resolved);
    if(!debugFastSpinActive&&!speedModeSpinAtStart)NovaInitialDuo.begin(resolved);else NovaInitialDuo.clear();
    playZoneInternalConfirmedSound(resolved);
    ensureBattleBgmContinuing();
    ensureBarBgmContinuing();

    if(!resolved.oumaFreeze&&!options?.oumaFailed)resetReelSpinOffsets();
    reels.forEach((reel,i)=>{
      reel.classList.add("spinning");
      if(!resolved.oumaFreeze&&!options?.oumaFailed)setRandomReel(i);
      const strip = REEL_STRIPS[i] || REEL_STRIPS[0];
      if(A_TYPE_MODE&&!resolved.oumaFreeze){NovaReelMotion.start(i,reel,strip,options?.oumaFailed?Math.max(0,oumaStoppedTops[i]):currentReelTopIndex(i),!!currentSpin?.artReverse,cellHtml);}
      else if(!resolved.oumaFreeze){const reelStepMs=Math.max(16,REEL_FULL_ROTATION_MS/strip.length);spinIntervals[i]=setInterval(()=>setRandomReel(i),reelStepMs);}
    });

    // オート/SPEED中だけ自動停止。手動時はストップ/左中右を押すまで止まらない。
    if(resolved.oumaFreeze){startOumaReverseAudio(currentSpin);}
    if(!resolved.oumaFreeze&&(autoPlay || speedModeSpinAtStart)){
      const stopOrder = NovaBellNavi.stopOrder(currentSpin);
      stopOrder.forEach((i,idx)=>{
        const normalAutoStopDelay = autoStopDelayMs(idx);
        const delay = resolved.oumaFreeze ? spinWaitMs + 150 + idx * 300 : speedModeSpinAtStart ? speedModeStopDelay(i) : normalAutoStopDelay;
        setTimeout(()=>stopSingleReel(i,{oumaAuto:!!resolved.oumaFreeze}), delay);
      });
    }
    persistState();
  }

  function willCompleteATypeBonusWithSpin(spin=currentSpin){
    if(!spin || !spin.aTypeBonusActiveAtStart || !spin.resolved) return false;
    const reward = Number(spin.resolved.reward) || 0;
    const target = Number(session.bonusTarget) || aTypeBonusTarget();
    const netAfter = Math.max(0, (Number(session.paid) || 0) + reward);
    return target > 0 && netAfter >= target;
  }

  function isPremiumBigFinalBonusSpin(spin=currentSpin){
    return !!(
      spin &&
      spin.aTypeBonusActiveAtStart &&
      normalizeATypeBonusKind(session.bonusKind) === "BIG" &&
      (session.premiumBonus || session.oneGameRenBonus) &&
      willCompleteATypeBonusWithSpin(spin)
    );
  }

  function stopSingleReel(i, options={}){
    if(!canUsePlayState())return;
    if(currentSpin?.resolved?.oumaFreeze&&!options.oumaAuto)return;
    if(!isSpinning || !currentSpin || currentSpin.stopped[i]) return;
    if(options.keyboardTurbo){
      currentSpin.keyboardTurboStop = true;
    }
    if(isPremiumBigConfirmStopLocked()){
      $("resultText").textContent = "フリーズ告知中...";
      syncCabinetControlState();
      return;
    }
    if(!spinCanStop){
      const waitSeconds = spinWaitSecondsText();
      $("resultText").textContent = options.keyboardTurbo ? `十字キー高速停止待機... ${waitSeconds}後に停止可能` : `ウェイト中... ${waitSeconds}後に停止可能`;
      return;
    }
    hideBattleIntro();
    if(isRogiHighZoneSpin(currentSpin)) stopRogiStopEffect(true);

    if(!options.visualReady&&currentSpin.visualStopping?.[i])return;
    if(!options.visualReady){
      (currentSpin.auditPressOrder ||= []).push(i);
      playInitialDuoStop(currentSpin,currentSpin.auditPressOrder.length);
    }
    if(NovaAim.hasGuide(currentSpin.resolved?.aim)&&!options.visualReady){
      currentSpin.aimStopOrder ||= [];
      if(!currentSpin.aimStopOrder.includes(i))currentSpin.aimStopOrder.push(i);
      const target=NovaAim.stopTarget(currentSpin.resolved.aim,currentSpin.result,currentSpin.aimStopOrder,i);
      const symbol=currentSpin.resolved.aim.symbol==='seven'?'7':NEBULA_SYMBOL;
      const column=getReelWindowFromStrip(i,symbol,target.onLine?1:0);
      setGridColumn(currentSpin.grid,i,column);
      currentSpin.lineRow=1;currentSpin.aimAligned=target.aligned;
    }
    const {grid, spec, result, lineRow} = currentSpin;
    const stopOrder = NovaAim.hasGuide(currentSpin.resolved?.aim) ? currentSpin.aimStopOrder.indexOf(i)+1 : currentSpin.stopped.filter(Boolean).length + 1;
    const reversePushWrongFirst = isReversePushGuidedMiss(currentSpin) && stopOrder === 1 && i !== 2;
    let col = options.visualColumn || (currentSpin.manualBonusStop
      ? manualStopColumnForReel(i, currentSpin)
      : [grid[0][i], grid[1][i], grid[2][i]]);
    if(!options.visualReady&&NovaReelMotion.has(i)){col=nearestCommonStopColumn(i,currentSpin,column=>NovaReelMotion.distance(i,column))||col;}
    if(currentSpin.manualBonusStop && stopOrder === 3 && !options.visualColumn){
      col = manualBonusFinalColumnForReel(i, currentSpin, col);
    }
    if(currentSpin.manualBonusStop){
      setGridColumn(grid, i, col);
    }
    if(!options.visualReady&&NovaReelMotion.has(i)){
      const spin=currentSpin;
      spin.visualStopping ||= [false,false,false];
      if(spin.visualStopping[i])return;
      spin.visualStopping[i]=true;stopBtns[i].disabled=true;
      (spin.pendingStopColumns ||= [null,null,null])[i]=col.slice();
      persistState();
      Promise.resolve().then(async()=>{
        if(currentSpin!==spin||!isSpinning)return;
        const landed=await NovaReelMotion.stop(i,col,{immediate:['BELL','BELL15','REPLAY'].includes(spin.result)&&!spin.manualBonusStop});
        if(landed&&currentSpin===spin&&isSpinning)stopSingleReel(i,{...options,visualReady:true,visualColumn:col});
      }).catch(error=>{console.error(error);spin.visualStopping[i]=false;spin.pendingStopColumns[i]=null;stopBtns[i].disabled=false;persistState();});
      return;
    }
    const label = i === 1 ? spec.label : "";

    stopReel(i, col, label, spec.cls, currentSpin.manualBonusStop || result === "MISS" ? null : lineRow, stopOrder);
    (currentSpin.auditStopOrder ||= []).push(i);
    currentSpin.auditGrid ||= [[],[],[]];
    for(let row=0;row<3;row++)currentSpin.auditGrid[row][i]=col[row];
    currentSpin.stopped[i] = true;
    if(currentSpin.pendingStopColumns)currentSpin.pendingStopColumns[i]=null;
    NovaBellNavi.stop(currentSpin);
    playBellNaviVoice(currentSpin);
    if(currentSpin.stopped.every(Boolean)){
      playOumaNovaWinVoice(currentSpin);
      if(!debugFastSpinActive&&!speedToBonusActive&&NovaDirectAward.show(currentSpin.resolved)){
        $("overlay").classList.remove("show");
        if(NovaDirectAward.directAmount(currentSpin.resolved))playOneShotSound('assets/media/nova/direct-award.wav',sfxOutputVolume(),{allowDuringPremiumConfirm:true});
      }
      if(NovaAim.hasGuide(currentSpin.resolved?.aim)&&!currentSpin.aimAligned&&!debugFastSpinActive){
        NovaAim.fail(()=>playOneShotSound('assets/media/nova/ouma-fail.wav',sfxOutputVolume(),{allowDuringPremiumConfirm:true}));
      }else NovaAim.stop(currentSpin.resolved);
    }
    syncCabinetControlState();
    showCzLamp(stopOrder,currentSpin.resolved);
    showCzPrelude(stopOrder,currentSpin.resolved,i);
    NovaLadder.stop(stopOrder);
    playGiruLadderResultVoice(currentSpin,stopOrder);
    if(currentSpin.stopped.every(Boolean)&&NovaAim.hasGuide(currentSpin.resolved?.aim)&&['BIG','NEBULA'].includes(currentSpin.result)&&currentSpin.aimAligned&&!currentSpin.aimWinPlayed&&!debugFastSpinActive){
      currentSpin.aimWinPlayed=true;
      const resolved=currentSpin.resolved;
      const symbol=resolved.aim.symbol;
      NovaAim.win(()=>playAimSevenWinSound(symbol,resolved),symbol,resolved,()=>playZoneContinueVoice(symbol,resolved));
    }
    if(stopOrder===3 && currentSpin.resolved?.czLamp)playCzConfirmedSound(currentSpin.resolved);
    if(stopOrder===3)showZoneRoulette(currentSpin.resolved?.flowAfter);
    maybePlayPremiumBigLineupVoice(stopOrder, currentSpin);
    maybeLightBonusAnnouncementForStop(stopOrder, currentSpin);
    if(stopOrder === 1 && currentSpin.reversePushGuide){
      setReversePushGuideTranslucent();
    }
    if(stopOrder === 1 && currentSpin.devilRushEntryEffect){
      setDevilRushEntryEffectTranslucent();
    }
    if(reversePushWrongFirst){
      currentSpin.reversePushWrongOrder = true;
      $("resultText").textContent = "押し順ミス / 77ハズレ";
      [2,1,0].forEach((next,idx)=>{
        if(next !== i && !currentSpin.stopped[next]){
          setTimeout(()=>stopSingleReel(next), 80 + idx * 120);
        }
      });
    }
    playBellReelStopVideo(i);
    if(stopOrder === 3){
      if(shouldFadeReversePushAtZoneEnd(currentSpin)){
        fadeOutDevilZoneConfirmScreen();
        fadeOutReversePushGuide();
      }
    }
    const reversePushMissBlackout = shouldBlackoutReversePushMissStop(stopOrder, currentSpin);
    if(reversePushMissBlackout){
      currentSpin.reversePushMissBlackoutShown = true;
      flashRogiContinuationBlackout();
    }
    const rogiPlayed = playRogiStopEffect(stopOrder);
    if(!reversePushMissBlackout && !rogiPlayed && shouldBlackoutRogiContinuationStop(stopOrder, currentSpin)){
      currentSpin.rogiBlackoutShown = true;
      flashRogiContinuationBlackout();
    }

    if(currentSpin.stopped.every(Boolean) && !currentSpin.finishScheduled){
      currentSpin.finishScheduled = true;
      prepareManualBonusOutcome(currentSpin);
      updatePremiumBigReelMovie();
      if(willEnterBattleAfterCurrentSpin(currentSpin)){
        ensurePendingBattleOutcome(currentSpin);
        showBattleIntro(battleRoundNumber(), !!(currentSpin.pendingBattleOutcome && currentSpin.pendingBattleOutcome.win));
      }
      $("resultText").textContent = currentSpin.speedModeAtStart ? "全リール停止 / 結果反映中..." : "全リール停止 / 結果確定待ち...";
      const keyboardResultWaitMs = currentSpin.keyboardTurboStop
        ? Math.round(RESULT_WAIT_MS / KEYBOARD_STOP_TURBO_MULTIPLIER)
        : RESULT_WAIT_MS;
      const autoResultWaitMs = currentSpin.autoStopAtStart ? autoScaledDelayMs(keyboardResultWaitMs) : keyboardResultWaitMs;
      const r=currentSpin.resolved;
      const resultEnding=!!normalState.pendingZoneResult ||
        (!!r?.flowBefore?.zone&&!r?.flowAfter?.zone) ||
        (r?.flowBefore?.phase==='art'&&r?.flowAfter?.phase==='normal'&&!r.bonusHit&&!r.aTypeBonusReady);
      const resultWaitMs = (resultEnding || NovaLadder.eligible(r?.flowBefore) || currentSpin.speedModeAtStart || isPremiumBigFinalBonusSpin(currentSpin)) ? 0 : autoResultWaitMs;
      setTimeout(()=>{
        if(currentSpin){
          prepareManualBonusOutcome(currentSpin);
          finishSpin(currentSpin.result, currentSpin.resolved, currentSpin.lineRow);
        }
      }, resultWaitMs);
    }
    persistState();
  }

  function stopAllReels(){
    if(currentSpin?.resolved?.oumaFreeze)return;
    if(!isSpinning || !currentSpin) return;
    if(isPremiumBigConfirmStopLocked()){
      $("resultText").textContent = "フリーズ告知中...";
      syncCabinetControlState();
      return;
    }
    if(!spinCanStop){
      $("resultText").textContent = `ウェイト中... ${spinWaitSecondsText()}後に停止可能`;
      return;
    }

    // Follow the current bell guide, including AUTO enabled after BET.
    const stopOrder = NovaBellNavi.stopOrder(currentSpin);
    stopOrder.forEach((i,idx)=>{
      if(!currentSpin.stopped[i]){
        setTimeout(()=>stopSingleReel(i), idx * 180);
      }
    });
  }

  function stopReel(i, columnSymbols, label, cls, lineRow=null, stopOrder=null){
    NovaReelMotion.clear(i);
    clearInterval(spinIntervals[i]);
    reels[i].querySelectorAll('.cell').forEach(cell=>cell.getAnimations().filter(a=>a.id==='nova-reel-step').forEach(a=>a.cancel()));
    reels[i].classList.remove("spinning");
    setReelColumn(i, columnSymbols, label, cls, lineRow);
    stopBtns[i].disabled = true;
    playStopSound(i, stopOrder);
  }

  function playRareNaviSound(spin){
    if(debugFastSpinActive||speedToBonusActive||!spin?.rareNavi||spin.rareNaviSoundPlayed)return;
    spin.rareNaviSoundPlayed=true;
    playOneShotSound('assets/media/nova/rare-navi.mp3',sfxOutputVolume(),{allowDuringPremiumConfirm:true});
  }

  function rareCueGrade(spin){
    const role=spin?.result;
    if(!['WEAK_SUICA','STRONG_SUICA','CHANCE_A','CHANCE_B','WEAK_NOVA','STRONG_NOVA','SUPER_NOVA'].includes(role))return '';
    const resolved=spin.resolved,before=resolved?.flowBefore;
    if(before?.zone||before?.initialStage||before?.entryStage||resolved?.aTypeBonusGame)return '';
    // A rare role, CZ win, direct award or challenge entry alone is not a zone guarantee.
    const zone=resolved?.atOutcome?.zone;
    const after=resolved?.flowAfter;
    if(after?.phase==='art'&&((zone&&(after.atPrelude?.zones?.includes(zone)||zone===after.pendingZone))||resolved?.comebackEvent==='success'))return 'hot';
    if(before?.phase==='art')return Number(resolved?.atOutcome?.direct)>0?'bigChance':'chance';
    if((before?.phase||'normal')==='normal'&&Number(resolved?.czChance)>=.6)return 'bigChance';
    return 'chance';
  }

  function playRareCueVoice(spin,rng=Math.random){
    if(debugFastSpinActive||speedToBonusActive||!spin||spin.rareCueVoicePlayed)return;
    const grade=rareCueGrade(spin);if(!grade)return;
    const characters=Object.keys(RARE_CUE_VOICE_SRCS);
    const character=characters[Math.min(characters.length-1,Math.max(0,Math.floor(rng()*characters.length)))];
    spin.rareCueVoicePlayed=true;spin.rareCueVoice={character,grade};
    playOneShotSound(RARE_CUE_VOICE_SRCS[character][grade],voiceOutputVolume(),{allowDuringPremiumConfirm:true});
  }

  function playBellNaviVoice(spin,rng=Math.random){
    if(debugFastSpinActive||speedToBonusActive||!spin?.bellNaviOrder)return;
    const stopped=spin.stopped||[],stage=stopped.filter(Boolean).length;
    if(stage>3||spin.bellNaviVoiceStage===stage)return;
    if(!BELL_NAVI_VOICE_SRCS[spin.bellNaviVoiceCharacter]){
      const characters=Object.keys(BELL_NAVI_VOICE_SRCS);
      spin.bellNaviVoiceCharacter=characters[Math.min(characters.length-1,Math.max(0,Math.floor(rng()*characters.length)))];
    }
    const reel=spin.bellNaviOrder.find(i=>!stopped[i]);
    const src=stage===3?(BELL_NAVI_COMPLETE_VOICE_SRCS[spin.bellNaviVoiceCharacter]||BELL_NAVI_COMPLETE_VOICE_SRCS.sosuke):BELL_NAVI_VOICE_SRCS[spin.bellNaviVoiceCharacter][reel];
    if(!src)return;
    spin.bellNaviVoiceStage=stage;
    playOneShotSound(src,voiceOutputVolume(),{allowDuringPremiumConfirm:true});
  }

  function playRandomAimVoice(symbol,rng=Math.random){
    if(debugFastSpinActive||speedToBonusActive)return;
    const voices=AIM_VOICE_SRCS[symbol];
    if(!voices?.length)return;
    const src=voices[Math.min(voices.length-1,Math.max(0,Math.floor(rng()*voices.length)))];
    playOneShotSound(src,voiceOutputVolume(),{allowDuringPremiumConfirm:true});
  }

  function playSevenAimVoice(resolved,rng=Math.random){
    if(debugFastSpinActive||speedToBonusActive)return;
    const flow=resolved?.flowBefore;
    const zone=!resolved?.aTypeBonusGame&&flow?.phase==='art'&&!flow.entryStage?String(flow.zone||'').replace(/^ura_/,''):'';
    if(!zone){playRandomAimVoice('seven',rng);return;}
    const src=SEVEN_ZONE_VOICE_SRCS[zone];
    if(src)playOneShotSound(src,voiceOutputVolume(),{allowDuringPremiumConfirm:true});
  }

  function playNebulaAimVoice(resolved,rng=Math.random){
    if(debugFastSpinActive||speedToBonusActive)return;
    if(resolved?.aTypeBonusGame){
      if(resolved.initialBonusGame)playRandomAimVoice('nebula',rng);
      return;
    }
    const flow=resolved?.flowBefore;
    if(flow?.phase!=='art'||!flow.zone||flow.entryStage)return;
    const src=NEBULA_ZONE_VOICE_SRCS[String(flow.zone).replace(/^ura_/,'')];
    if(src)playOneShotSound(src,voiceOutputVolume(),{allowDuringPremiumConfirm:true});
    else playRandomAimVoice('nebula',rng);
  }

  function playZoneRouletteBetVoice(resolved){
    if(debugFastSpinActive||speedToBonusActive||!resolved||resolved.zoneRouletteVoicePlayed)return;
    const flow=resolved.flowBefore;
    // The initial duo is fixed; only the AT character roulette needs this voice.
    if(flow?.phase!=='art'||flow.entryStage!=='roulette'||flow.initialStage)return;
    resolved.zoneRouletteVoicePlayed=true;
    playOneShotSound('assets/media/nova/aim/zone-roulette-confirm.wav?v=20260919-roulette-voice',voiceOutputVolume(),{allowDuringPremiumConfirm:true});
  }

  function playAimBetPresentation(resolved,rng=Math.random){
    if(debugFastSpinActive)return;
    if(resolved.aim)resolved.aim.guide ??= NovaAim.drawGuide(resolved.aim);
    const entryCue=NovaAim.bet(resolved.aim,resolved);
    if(entryCue)playRandomAimVoice('seven',rng);
    else if(NovaAim.hasGuide(resolved.aim)){
      playOneShotSound('assets/media/nova/aim/cue-'+resolved.aim.color+'.wav',sfxOutputVolume(),{allowDuringPremiumConfirm:true});
      if(resolved.aim.symbol==='seven')playSevenAimVoice(resolved,rng);
      else if(resolved.aim.symbol==='nebula')playNebulaAimVoice(resolved,rng);
    }else if(!resolved.aim)playOumaNovaAimVoice(resolved);
  }

  function playOumaNovaAimVoice(resolved){
    if(debugFastSpinActive||speedToBonusActive||resolved?.aTypeBonusGame||resolved?.oumaFailed||resolved?.oumaFreeze||resolved?.artReverse)return;
    const flow=resolved?.flowBefore;
    if(flow?.phase!=='art'||flow.entryStage||String(flow.zone||'').replace(/^ura_/,'')!=='ouma')return;
    playOneShotSound(OUMA_NOVA_VOICE_SRCS.aim,voiceOutputVolume(),{allowDuringPremiumConfirm:true});
  }

  function playOumaNovaWinVoice(spin,rng=Math.random){
    if(debugFastSpinActive||speedToBonusActive||!spin||spin.oumaNovaVoicePlayed||spin.result!=='SUPER_NOVA'||spin.stopped?.length!==3||!spin.stopped.every(Boolean))return;
    const resolved=spin.resolved,flow=resolved?.flowBefore;
    if(resolved?.aTypeBonusGame||resolved?.oumaFailed||flow?.phase!=='art'||flow.entryStage||String(flow.zone||'').replace(/^ura_/,'')!=='ouma'||!isNovaGrid(spin.auditGrid||spin.grid))return;
    spin.oumaNovaVoicePlayed=true;
    const voices=OUMA_NOVA_VOICE_SRCS.wins;
    const src=voices[Math.min(voices.length-1,Math.max(0,Math.floor(rng()*voices.length)))];
    playOneShotSound(src,voiceOutputVolume(),{allowDuringPremiumConfirm:true});
  }

  function playGiruLadderBetVoice(spin,rng=Math.random){
    if(debugFastSpinActive||speedToBonusActive||!spin||spin.giruLadderBetVoicePlayed||spin.ladderResultPresentation)return;
    const flow=spin.resolved?.flowBefore;
    if(spin.resolved?.aTypeBonusGame||flow?.phase!=='art'||flow.entryStage||String(flow.zone||'').replace(/^ura_/,'')!=='giru'||!flow.ladderRevealed)return;
    const passed=Number(spin.resolved.flowAfter?.award)>Number(flow.award);
    const goodFlowRate=passed?.7:.1,roll=rng();
    const index=roll<goodFlowRate?2:roll<goodFlowRate+(1-goodFlowRate)/2?0:1;
    spin.giruLadderBetVoicePlayed=true;
    playOneShotSound(GIRU_LADDER_VOICE_SRCS.bet[index],voiceOutputVolume(),{allowDuringPremiumConfirm:true});
  }

  function playGiruLadderResultVoice(spin,stopOrder){
    if(debugFastSpinActive||speedToBonusActive||stopOrder!==1||!spin||spin.giruLadderResultVoicePlayed)return;
    const result=spin.ladderResultPresentation,pt=Number(result?.pt);
    if(String(result?.zone||'').replace(/^ura_/,'')!=='giru'||!Number.isFinite(pt)||pt<0)return;
    spin.giruLadderResultVoicePlayed=true;
    const index=pt>=1000?2:pt>=500?1:0;
    playOneShotSound(GIRU_LADDER_VOICE_SRCS.result[index],voiceOutputVolume(),{allowDuringPremiumConfirm:true});
  }

  function playZoneStartVoice(before,after){
    if(debugFastSpinActive||speedToBonusActive||before?.phase!=='art'||before.entryStage!=='confirmed'||after?.phase!=='art'||after.entryStage)return;
    const zone=after.ura&&!after.zone?.startsWith('ura_')?'ura_'+after.zone:after.zone;
    const src=ZONE_START_VOICE_SRCS[zone];
    if(src)playOneShotSound(src,voiceOutputVolume(),{allowDuringPremiumConfirm:true});
  }

  function playZoneContinueVoice(symbol,resolved){
    if(debugFastSpinActive||speedToBonusActive||symbol!=='nebula'||resolved?.aTypeBonusGame||resolved?.flowBefore?.phase!=='art')return;
    const src=ZONE_CONTINUE_VOICE_SRCS[String(resolved.flowBefore.zone||'').replace(/^ura_/,'')];
    if(src)playOneShotSound(src,voiceOutputVolume(),{allowDuringPremiumConfirm:true});
  }

  function playZoneInternalConfirmedSound(resolved){
    if(debugFastSpinActive||speedToBonusActive||!resolved||resolved.zonePatrolPlayed)return;
    if(resolved.flowBefore?.phase!=='art'||resolved.flowBefore?.entryStage||resolved.flowAfter?.entryStage!=='seven')return;
    resolved.zonePatrolPlayed=true;
    playLockedBonusConfirmSound('assets/media/jag/cz_patrol_confirm.wav?v=19',sfxOutputVolume());
  }

  function playCzConfirmedSound(resolved){
    if(!(resolved?.bonusHit || resolved?.aTypeBonusReady || resolved?.flowAfter?.phase==='art') || resolved.czPatrolPlayed)return;
    resolved.czPatrolPlayed=true;
    playLockedBonusConfirmSound('assets/media/jag/cz_patrol_confirm.wav?v=19',sfxOutputVolume());
  }

  var zoneRouletteTimer=null;
  function showZoneRoulette(flow){
    let panel=document.getElementById('zoneRoulette');
    if(!panel){panel=document.createElement('div');panel.id='zoneRoulette';panel.setAttribute('role','status');document.querySelector('.reelArea').append(panel);}
    clearInterval(zoneRouletteTimer);zoneRouletteTimer=null;
    document.body.dataset.zoneRouletteLamp='';
    panel.hidden=!['roulette','confirmed'].includes(flow?.entryStage);
    if(panel.hidden)return;
    const artwork={sosuke:'sosuke',toto:'toto',urapi:'urapi',giru:'giru1',sora:'sora1',ouma:'ouma1',kushuri:'kushuri',nito:'nito',kushuri_nito:'kushuri_nito'};
    const show=(zone,text)=>{panel.textContent=text;document.body.dataset.zoneRouletteLamp=artwork[NovaArt.baseZone(zone)]||'';};
    if(flow.entryStage==='confirmed'){show(flow.pendingZone,NovaArt.zoneName(flow.pendingZone)+'ゾーン確定！');return;}
    let index=0;const zones=NovaArt.rouletteZones(flow);
    const tick=()=>{const zone=zones[index++%zones.length];show(zone,'特化ゾーン抽選中… '+NovaArt.names[zone]);};
    tick();zoneRouletteTimer=setInterval(tick,110);
  }
  function renderCzPrelude(indices=[]){
    const dark=Array.isArray(indices)?indices:[];
    document.getElementById('machine').dataset.czPreludeStage=String(dark.length);
    document.querySelectorAll('.reel[data-reel]').forEach(reel=>reel.classList.toggle('cz-prelude-blackout',dark.includes(Number(reel.dataset.reel))));
  }
  function syncCzPreludeGlow(resolved=null){
    const cue=resolved?.czPrelude;
    const pending=normalState.internal?.prelude?.presentation==='reel';
    const active=!session.active&&!normalState.bonusPending&&(cue?!cue.announce:pending);
    const machine=document.getElementById('machine');
    machine.dataset.czPreludeActive=String(active);
    // Use the current spin's cue so hit and fake preludes also glow on their
    // trigger/final game; between spins use the saved, unfinished prelude.
    machine.dataset.atPreludeActive=String(!session.active&&!normalState.bonusPending&&normalState.flow?.phase==='art'&&!!(resolved?.atPrelude||normalState.flow.atPrelude));
  }
  function showCzPrelude(stopOrder,resolved,reelIndex=null){
    const prelude=resolved?.czPrelude||resolved?.atPrelude;
    if(stopOrder===0){renderCzPrelude([]);if(resolved)resolved.blackoutReels=[];syncCzPreludeGlow(resolved);}
    if(!prelude)return;
    if(prelude.announce){
      renderCzPrelude([]);
      if(stopOrder===0&&!resolved.czAnnounced){
        resolved.czAnnounced=true;
        updateDisplay();
        const message=resolved.flowAfter?.phase==='strong_cz'?'強CZ突入':'CZ突入';
        showMessage(message,'リール全消灯からCZへ');if(!resolved.czIntro)showOverlay(message);
      }
      return;
    }
    if(stopOrder>0&&Number.isInteger(reelIndex)&&stopOrder<=prelude.after){
      const dark=resolved.blackoutReels ||= [];
      if(!dark.includes(reelIndex))dark.push(reelIndex);
      renderCzPrelude(dark);
    }
  }
  function showCzLamp(stopOrder,resolved){
    const host=document.getElementById('machine');
    host.dataset.czBlink='';
    const lamp=resolved?.czLamp,machine=document.getElementById('machine');
    const czSpin=!!lamp||['cz','strong_cz'].includes(resolved?.flowBefore?.phase);
    const czState=lamp||(czSpin?resolved?.flowBefore:null);
    const intro=!!czState&&Number(czState.remaining)>0&&Number(czState.remaining)===Number(czState.totalGames);
    machine.dataset.czIntro=String(intro);
    if(resolved)resolved.czIntro=intro;
    // The first game's draws and awards remain intact; only the lamps wait.
    if(intro){machine.dataset.czLamp='0';machine.dataset.czRainbow='false';if(stopOrder===0)resolved.czLampAtBet=0;return;}
    if(czSpin&&stopOrder===0){resolved.czLampAtBet=Number(host.dataset.czLamp)||0;return;}
    if(!czSpin){machine.dataset.czLamp='0';machine.dataset.czRainbow='false';return;}
    if(stopOrder!==3)return;
    // Reveal every character at the landed confirmation stop, not at the
    // internal CZ lottery. Premium overrides may confirm without a lamp roll.
    const confirmed=stopOrder===3&&!!(resolved.bonusHit||resolved.aTypeBonusReady||resolved.flowAfter?.phase==='art');
    const display=NovaFlow.lampDisplayAtStop(lamp,stopOrder);if(!display&&!confirmed)return;
    const target=confirmed?NovaFlow.lampCharacters.length:display.stage;
    const previous=Number(machine.dataset.czLamp)||0;
    const newRainbow=(confirmed||display?.rainbow)&&machine.dataset.czRainbow!=='true';
    if(target>previous)machine.dataset.czLamp=String(target);
    if(newRainbow)machine.dataset.czRainbow='true';
    // The final landed stop owns both light and SE.
    // Repeated finish callbacks see no new light and cannot replay its sound.
    if(target>previous||newRainbow){
      (resolved.czLitStops ||= {})[stopOrder]=true;
      playOneShotSound('assets/media/jag/cz_third_success.wav',sfxOutputVolume());
    }
    if(confirmed)playCzConfirmedSound(resolved);
  }

  var oumaReverseAudio=null,oumaReverseLoadTimer=null,oumaIntroAudio=null,oumaStoppedTops=[0,0,0];
  function clearOumaReverseAudio(){
    clearTimeout(oumaReverseLoadTimer);oumaReverseLoadTimer=null;
    if(oumaReverseAudio){const audio=oumaReverseAudio;oumaReverseAudio=null;audio.onerror=null;audio.onended=null;audio.onplaying=null;audio.pause();try{audio.removeAttribute("src");audio.load();}catch(e){}}
  }
  function startOumaReverseAudio(spin){
    if(!spin?.resolved?.oumaFreeze)return;
    clearOumaReverseAudio();
    const audio=new Audio('assets/media/nova/ouma-reverse-v2.wav');oumaReverseAudio=audio;
    audio.preload='auto';audio.volume=sfxOutputVolumeForSource(SFX_OUTPUT_SCALE,'assets/media/nova/ouma-reverse-v2.wav');
    let started=false,fallback=null;
    const useFallback=()=>{if(fallback===null)fallback={time:performance.now(),offset:audio.currentTime||0};};
    const clock=()=>fallback?(performance.now()-fallback.time)/1000+fallback.offset:audio.currentTime;
    const begin=()=>{
      if(started||currentSpin!==spin||oumaReverseAudio!==audio)return;
      started=true;clearTimeout(oumaReverseLoadTimer);let landed=0;
      reels.forEach((reel,i)=>NovaReelMotion.startSynced(i,reel,REEL_STRIPS[i],spin.grid.map(row=>row[i]),true,cellHtml,clock,4400,()=>{
        if(currentSpin!==spin||oumaReverseAudio!==audio)return;
        if(++landed===3){document.getElementById('machine').dataset.oumaNovaShake='true';spinCanStop=true;[0,1,2].forEach(index=>stopSingleReel(index,{oumaAuto:true,visualReady:true,visualColumn:spin.grid.map(row=>row[index])}));}
      },Math.max(0,oumaStoppedTops[i])));
    };
    audio.onerror=()=>{useFallback();begin();};
    oumaReverseLoadTimer=setTimeout(()=>{if(!started){audio.pause();useFallback();begin();}},3000);
    const play=audio.play();
    if(play?.then)play.then(()=>{if(oumaReverseAudio!==audio||currentSpin!==spin){audio.pause();return;}if(fallback)audio.pause();begin();}).catch(()=>{if(oumaReverseAudio!==audio||currentSpin!==spin)return;useFallback();begin();});else begin();
  }

  let oumaChainTimer=null;
  var oumaFailDimTimer=null;
  var oumaPresentation=null;
  function clearOumaPresentation(keepNovaShake=false){
    if(!keepNovaShake)document.getElementById('machine').dataset.oumaNovaShake='';
    clearTimeout(oumaFailDimTimer);oumaFailDimTimer=null;
    document.getElementById('machine').dataset.oumaFailDim='';
    clearTimeout(oumaChainTimer);oumaChainTimer=null;
    if(['lift','fail'].includes(oumaPresentation?.stage))NovaReelMotion.clearAll();
    if(oumaIntroAudio){oumaIntroAudio.pause();oumaIntroAudio=null;}
    if(oumaReverseAudio)oumaReverseAudio.onended=null;
    oumaPresentation=null;
    document.getElementById('machine').dataset.oumaFreeze='';
  }
  function scheduleOumaZeroChain(){
    const previous=normalState.flow;
    if(!['ouma','urapi'].includes(previous?.zone)||!previous.oumaPending||debugFastSpinActive||isCompleteTrialLocked())return false;
    clearOumaPresentation(true);stopSpeedToBonus('逢魔フリーズ操作待ち');
    const presentation=oumaPresentation={stage:'hold',previous};
    reels.forEach((reel,i)=>{reel.style.setProperty('--ouma-rattle-speed',[35,41.5,30.5][i]+'ms');reel.style.setProperty('--ouma-rattle-delay',[0,-15.5,-8.5][i]+'ms');});
    const machine=document.getElementById('machine');machine.dataset.oumaFreeze='hold';
    $('spinBtn').disabled=true;stopBtns.forEach(b=>b.disabled=true);
    const ready=()=>{
      if(oumaPresentation!==presentation||normalState.flow!==previous)return;
      clearOumaReverseAudio();presentation.stage='bet';machine.dataset.oumaFreeze='bet';
      $('spinBtn').disabled=false;$('spinBtn').textContent='BET';$('resultText').textContent='BETで'+NovaArt.zoneName(previous)+'フリーズ継続チャレンジ';
      if(autoPlay)queueAutoStep(autoDelayMs());
    };
    if(oumaReverseAudio&&!oumaReverseAudio.ended&&!oumaReverseAudio.paused){oumaReverseAudio.onended=ready;oumaReverseAudio.onerror=ready;}
    else ready();
    return true;
  }
  function resolveOumaChallenge(){
    if(oumaPresentation?.stage!=='bet')return;
    const presentation=oumaPresentation,previous=presentation.previous;
    if(normalState.flow!==previous){clearOumaPresentation();return;}
    NovaDirectAward.clear();
    document.getElementById('machine').dataset.oumaNovaShake='';
    presentation.stage='lift';$('spinBtn').disabled=true;
    const machine=document.getElementById('machine');machine.dataset.oumaFreeze='lift';
    normalState.flow=NovaArt.prepareBet(previous,{...settings.novaArt,setting:settings.setting},Math.random);
    normalState.pendingZoneResult=NovaResults.transition(previous,normalState.flow,settings.setting);
    persistState();

    const audio=new Audio('assets/media/nova/uuufa.wav');oumaIntroAudio=audio;
    audio.volume=sfxOutputVolumeForSource(SFX_OUTPUT_SCALE,'assets/media/nova/uuufa.wav');
    audio.play()?.then(()=>{if(oumaIntroAudio!==audio)audio.pause();}).catch(()=>{});
    const started=performance.now(),tops=oumaStoppedTops.map(top=>Math.max(0,top));
    reels.forEach((reel,i)=>NovaReelMotion.start(i,reel,REEL_STRIPS[i],tops[i],true,cellHtml,{
      clock:()=>Math.min(500,Math.max(0,performance.now()-started-[0,65,120][i]))/1000,
      duration:500,steps:1,done:()=>{}
    }));
    oumaChainTimer=setTimeout(()=>{
      if(oumaPresentation!==presentation)return;
      reels.forEach((_,i)=>{NovaReelMotion.clear(i);setReelColumn(i,reelWindowFromTopIndex(i,tops[i]+1),'','',null);});
      const oumaFailed=!normalState.flow.zero;
      clearOumaPresentation();spin({oumaFailed});
    },4000);
  }

  function finishSpin(result, resolved, lineRow=1){
    if(!isSpinning || (currentSpin && currentSpin.finishing)) return;
    try{
    NovaBellNavi.clear();
    if(resolved.researchChallenge?.finished)showOverlay(resolved.researchChallenge.won?'上位AT確定！':'通常ATへ');
    if(resolved.researchSortie?.won)showOverlay(NovaArt.zoneName(resolved.researchSortie.zone)+'ゾーン獲得！');
    if(spinWaitTimer){
      clearTimeout(spinWaitTimer);
      spinWaitTimer = null;
    }
    spinCanStop = false;
    if(currentSpin) currentSpin.finishing = true;

    isSpinning = false;
    $("spinBtn").disabled = false;
    stopBtns.forEach(b=>b.disabled=true);
    syncCabinetControlState();

    if(resolved.oumaFailed){
      auditCapture({kind:'zero-failure',result:'MISS',message:'逢魔フリーズ 継続失敗（0G）'});
      currentSpin=null;
      $('resultText').textContent='逢魔フリーズ 継続失敗 / ハズレ（0G）';
      if(normalState.pendingZoneResult){displayNovaResult(normalState.pendingZoneResult);normalState.pendingZoneResult=null;}
      persistState();updateDisplay();playNormalBgm();
      scheduleNextAuto();
      return;
    }

    showCzLamp(3,resolved);
    const reward = resolved.reward;
    const stGameAdd = (resolved.add || 0) + (resolved.zoneStGames || 0);
    const stockAdd = (resolved.sets || 0) + (resolved.zoneSets || 0);
    const zoneGameAdd = resolved.zoneGameAdd || 0;
    const lineText = result !== "MISS" ? ` / ${lineName(lineRow)}ライン` : "";
    const zoneRemainAfterSpin = resolved.zoneGame ? Math.max(0, session.bigZone - 1, resolved.bigZone || 0) + zoneGameAdd : null;
    const zoneText = resolved.zoneGame
      ? goraiZoneRemainText(zoneRemainAfterSpin, currentSpin?.zoneType || session.bigZoneType)
      : resolved.bigZone > 0
        ? goraiZoneRemainText(resolved.bigZone, resolved.bigZoneType)
        : "";
    const isNormalSpinResult = currentSpin && currentSpin.normalActiveAtStart;
    const resultParts = [];
    if(resolved.artSetWon)resultParts.push("ネビュラ揃い / "+NovaArt.bonusStockLabel({...session,...NovaArt.advanceBonus(session,true,reward)},normalState.flow));
    if(resolved.artMessage)resultParts.push(resolved.artMessage);
    const novaPattern = novaPatternFromGrid(currentSpin?.grid);
    if(currentSpin) currentSpin.novaPattern = novaPattern;
    if(novaPattern) resultParts.push(NOVA_PATTERN_NAMES[novaPattern]);
    if(reward > 0) resultParts.push("+" + reward + "pt");
    if(stockAdd > 0) resultParts.push("SET+" + stockAdd);
    if(stGameAdd > 0) resultParts.push("AT+" + stGameAdd + "G");
    if(zoneGameAdd > 0) resultParts.push(goraiZoneName(resolved.zoneType) + "+" + zoneGameAdd + "G");
    if(resolved.bigZone > 0 && zoneText) resultParts.push(zoneText);
    if(resultParts.length === 0) resultParts.push(isNormalSpinResult ? "払い出しなし" : "0pt");
    if(resolved.zoneGame && zoneText) resultParts.push(zoneText);
    $("resultText").textContent = `${RESULT[result].name}${lineText} / ${resultParts.join(" / ")}`;
    const holdRogiThirdStopEffect = shouldHoldRogiThirdStopEffect(currentSpin);
    const holdSpeedBonusRogiEffect = currentSpin && currentSpin.speedModeBonusRogiEffect;
    const premiumConfirmMovieSpin = currentSpin && currentSpin.premiumBigConfirmMovieEffect;
    const stopAutoAtFirstHit = currentSpin && currentSpin.normalActiveAtStart && isAtFirstHitForAuto(resolved);
    if(currentSpin && currentSpin.normalActiveAtStart){
      applyNormalResult(result, resolved, lineRow);
      playArtEndSound(resolved);
      if((resolved.flowBefore?.phase!==normalState.flow?.phase && (['cz','strong_cz','art'].includes(resolved.flowBefore?.phase)||['cz','strong_cz','art'].includes(normalState.flow?.phase)))||resolved.flowBefore?.zone!==normalState.flow?.zone){
        pauseNormalBgm();
        playNormalBgm();
      }
      if(stopAutoAtFirstHit && autoPlay){
        stopAutoPlay(resolved.bonusWaitSpin ? "BONUS確定画面のためAUTO停止" : "AT初当たり確定のためAUTO停止");
      }
      if(currentSpin && currentSpin.bar3LeverEffect){
        // BAR動画は動画側の終了イベントで透過させる。
      }else if(holdRogiThirdStopEffect){
        startRogiThirdStopHold();
      }else if(holdSpeedBonusRogiEffect){
        // SPEED確定のろぎ3は、動画終了または次BETまで表示を保持する。
      }else if(currentSpin && currentSpin.gekiatsu){
        stopGekiatsuEffect(false);
      }else{
        stopGekiatsuEffect(true);
      }
      if(premiumConfirmMovieSpin){
        premiumBigConfirmSilence = false;
        updatePremiumBigReelMovie();
      }
      hideDevilRushEntryEffect();
      pendingForceResult = "";
      const finishedSpin = currentSpin;
      currentSpin = null;
      updateDisplay();
      setTimeout(()=>clearReelVideos(), 900);
      if(A_TYPE_MODE && resolved.aTypeBonusReady){
        const bonusStartOptions = {
          bonusKind:resolved.bonusKind || (resolved.regReady ? "MID" : "BIG"),
          bonusSource:resolved.bonusSource || "",
          premiumBonus:!!resolved.premiumBonus,
          oneGameRenBonus:!!resolved.oneGameRenBonus,
          gamesSinceLastBonus:resolved.gamesSinceLastBonusAtStart
        };
        if(isPremiumBigLineupSpin(finishedSpin)){
          queueBonusSessionStart(0, bonusStartOptions);
        }else{
          startBonusSessionNow(bonusStartOptions);
        }
      }else if(!(scheduleOumaZeroChain())){
        scheduleNextSpeedToBonus();
        scheduleNextAuto();
      }
      return;
    }
    applyResult(result, resolved, lineRow);
    if(currentSpin && currentSpin.bar3LeverEffect){
      // BAR揃い動画は動画側の終了イベントで透過させる。
    }else if(holdRogiThirdStopEffect){
      startRogiThirdStopHold();
    }else if(currentSpin && currentSpin.gekiatsu){
      stopGekiatsuEffect(false);
    }else{
      stopGekiatsuEffect(true);
    }
    const finishedBattleFinalGame = currentSpin && currentSpin.battleActiveAtStart && session.battleRemain <= 0;
    const shouldFinishATypeBonus = currentSpin && currentSpin.aTypeBonusActiveAtStart && isATypeBonusComplete();
    const shouldEnterBattle = session.active && !shouldFinishATypeBonus && session.phase !== "battle" && session.remain <= 0 && !isGoraiZoneActive();
    const pendingBattleOutcome = currentSpin ? currentSpin.pendingBattleOutcome : null;
    if(!shouldEnterBattle){
      hideBattleIntro();
    }
    hideDevilRushEntryEffect();
    pendingForceResult = "";
    currentSpin = null;
    updateDisplay();
    ensureBarBgmContinuing();
    setTimeout(()=>clearReelVideos(), 900);

    if(shouldFinishATypeBonus){
      playBonusEndBgmThen(()=>{
        finishSession();
        scheduleNextAuto();
      });
    }else if(finishedBattleFinalGame){
      setTimeout(()=>{
        const continued = completeContinuationBattle(result);
        if(continued) scheduleNextAuto();
      }, 700);
    }else if(shouldEnterBattle){
      setTimeout(()=>{
        const continued = startContinuationBattlePart(pendingBattleOutcome);
        if(continued) scheduleNextAuto();
      }, 700);
    }else{
      scheduleNextAuto();
    }
    }finally{persistState();}
  }

  function direct(result){
    if(isSpinning) return;
    if(!canPlayCompleteTrial()) return;
    if(A_TYPE_MODE) result = normalizeATypeResult(result);
    readSettings();
    const normalDirect = !session.active;
    if(A_TYPE_MODE&&normalDirect&&normalState.flow?.phase==='art')normalState.flow=NovaArt.prepareBet(normalState.flow,{...settings.novaArt,setting:settings.setting});
    const spec = RESULT[result];
    const lineRow = resultLineRow(result);
    const resolved = normalDirect ? resolveNormalOutcome(result, lineRow) : resolveOutcome(result);
    const grid = buildGrid(result, lineRow);
    const premiumForced = forcePremiumEffect;
    const bigPremiumEffect = normalDirect && decideBigPremiumEffect(result, resolved, premiumForced);
    if(A_TYPE_MODE && normalDirect && resolved && (resolved.bonusHit || resolved.bonusReady) && resolved.bonusKind === "BIG"){
      resolved.premiumBonus = !!(resolved.premiumBonus || bigPremiumEffect);
    }
    if(premiumForced){
      forcePremiumEffect = false;
      if($("premiumForceStatus")) $("premiumForceStatus").value = "OFF";
      if(bigPremiumEffect) startGekiatsuEffect(true);
    }

    for(let i=0;i<3;i++){
      const col = [grid[0][i], grid[1][i], grid[2][i]];
      setReelColumn(i, col, i === 1 ? spec.label : "", spec.cls, result === "MISS" ? null : lineRow);
    }

    if(normalDirect){
      countTotalSpinIfNeeded(false);
      chargeSpinCost();
      applyNormalResult(result, resolved, lineRow);
      if(A_TYPE_MODE && resolved.aTypeBonusReady){
        setTimeout(()=>startBonusSessionNow({
          bonusKind:resolved.bonusKind || (resolved.regReady ? "MID" : "BIG"),
          bonusSource:resolved.bonusSource || "",
          premiumBonus:!!resolved.premiumBonus,
          oneGameRenBonus:!!resolved.oneGameRenBonus,
          gamesSinceLastBonus:resolved.gamesSinceLastBonusAtStart
        }), 700);
      }
    }else{
      applyResult(result, resolved, lineRow);
    }
    $("resultText").textContent = `DEBUG：${spec.name} / ${result !== "MISS" ? lineName(lineRow)+"ライン" : ""}`;
    updateDisplay();
  }

  function forceHighModeNow(){
    if(A_TYPE_MODE){
      showMessage("Aタイプ固定", "高確は使用しません");
      log("高確強制：Aタイプでは未使用");
      return;
    }
  }

  function updateAutoUi(){
    const startBtn = $("autoStartBtn");
    const stopBtn = $("autoStopBtn");
    const status = $("autoStatus");
    if(!startBtn || !stopBtn || !status) return;

    startBtn.disabled = autoPlay;
    stopBtn.disabled = !autoPlay;
    if(isCompleteTrialLocked()){
      startBtn.disabled = true;
      stopBtn.disabled = !autoPlay;
    }

    if(autoPlay){
      status.textContent = "オート中：Aタイプを2倍速で自動消化";
      status.style.color = "var(--green)";
    }else{
      status.textContent = "オート停止中";
      status.style.color = "rgba(255,255,255,.65)";
    }

    if($("quickAutoBtn")){
      $("quickAutoBtn").textContent = autoPlay ? "STOP" : "AUTO";
      $("quickAutoBtn").classList.toggle("on", autoPlay);
      $("quickAutoBtn").disabled = bonusEndBgmPlaying && !autoPlay;
    }
    if($("topAutoBtn")){
      $("topAutoBtn").textContent = autoPlay ? "STOP" : "AUTO";
      $("topAutoBtn").classList.toggle("on", autoPlay);
      $("topAutoBtn").setAttribute("aria-pressed", autoPlay ? "true" : "false");
      $("topAutoBtn").disabled = (isCompleteTrialLocked() || bonusEndBgmPlaying) && !autoPlay;
    }
    updateSpeedToBonusUi();
  }

  function startAutoPlay(){
    if(autoPlay) return;
    if(bonusEndBgmPlaying){
      if($("resultText")) $("resultText").textContent = "ボーナス終了BGM中...";
      return;
    }
    if(!canPlayCompleteTrial({allowOumaPresentation:true})) return;
    stopSpeedToBonus("AUTO開始のためSPEED停止");
    readSettings();
    autoPlay = true;
    NovaClock.setBackgroundEnabled(true);
    startAutoWatchdog();
    updateAutoUi();
    log("オート開始");
    runAutoStep();
  }

  function autoScaledDelayMs(ms, minMs=50){
    return Math.max(minMs, Math.round((Number(ms) || 0) / AUTO_SPEED_MULTIPLIER));
  }

  function autoDelayMs(){
    const baseMs = Math.max(100, (Number(settings.autoDelay) || 0.5) * 1000);
    return autoScaledDelayMs(baseMs);
  }

  function autoPollDelayMs(){
    return autoScaledDelayMs(150);
  }

  function autoStopDelayMs(index=0){
    return autoScaledDelayMs(MIN_SPIN_WAIT_MS + Math.round((120 + index * 360) / 2));
  }

  function spinWaitMsForMode(speedModeSpinAtStart=false){
    if(speedModeSpinAtStart) return speedModeWaitMs();
    return autoPlay ? autoScaledDelayMs(MIN_SPIN_WAIT_MS) : MIN_SPIN_WAIT_MS;
  }

  function spinWaitSecondsText(){
    return autoPlay ? `${(autoScaledDelayMs(MIN_SPIN_WAIT_MS) / 1000).toFixed(2)}秒` : "0.5秒";
  }

  function queueAutoStep(delayMs=150){
    if(!autoPlay) return;
    if(autoTimer){
      clearTimeout(autoTimer);
      autoTimer = null;
    }
    autoTimer = setTimeout(()=>{
      autoTimer = null;
      runAutoStep();
    }, Math.max(50, delayMs));
  }

  function startAutoWatchdog(){
    if(autoWatchdogTimer) return;
    autoWatchdogTimer = setInterval(()=>{
      if(!autoPlay) return;
      if(autoTimer || isSpinning || bonusEndBgmPlaying || bonusConfirmSoundPlaying || pendingAtStartTimer) return;
      if(!canPlayCompleteTrial({allowOumaPresentation:true})) return;
      queueAutoStep(autoScaledDelayMs(100));
    }, 500);
  }

  function stopAutoWatchdog(){
    if(autoWatchdogTimer){
      clearInterval(autoWatchdogTimer);
      autoWatchdogTimer = null;
    }
  }

  function stopAutoPlay(reason){
    if(!autoPlay && !autoTimer) return;
    autoPlay = false;
    if(autoTimer){
      clearTimeout(autoTimer);
      autoTimer = null;
    }
    stopAutoWatchdog();
    NovaClock.setBackgroundEnabled(false);
    updateAutoUi();
    if(reason) log(reason);
  }

  function requestAutoStopCurrentSpin(){
    if(!isSpinning || !currentSpin) return false;
    if(currentSpin.resolved?.oumaFreeze)return false; // Reverse reels stop together on the audio cue.
    if(!spinCanStop) return false;
    if(isPremiumBigConfirmStopLocked()) return false;
    if(currentSpin.autoStopTakeoverScheduled) return true;
    currentSpin.autoStopTakeoverScheduled = true;
    currentSpin.autoStopAtStart = true;
    currentSpin.manualBonusStop = false;
    stopAllReels();
    return true;
  }

  function runAutoStep(){
    if(!autoPlay) return;
    if(bonusEndBgmPlaying || bonusConfirmSoundPlaying){
      queueAutoStep(autoPollDelayMs());
      return;
    }
    if(!canPlayCompleteTrial({allowOumaPresentation:true})) return;
    if(oumaPresentation){
      if(oumaPresentation.stage==='bet')resolveOumaChallenge();
      queueAutoStep(autoPollDelayMs());
      return;
    }
    if(isRogiThirdStopHoldActive()){
      if(isRogiThirdStopMoviePlaying()){
        queueAutoStep(autoPollDelayMs());
        return;
      }
      clearRogiThirdStopHoldForNextGame();
    }
    if(isSpinning){
      requestAutoStopCurrentSpin();
      queueAutoStep(autoPollDelayMs());
      return;
    }

    if(!session.active){
      if(!A_TYPE_MODE && normalState.bonusPending && pendingBonusWaitDone()){
        stopAutoPlay("BONUS確定画面のためAUTO停止");
        return;
      }
      spin();
      queueAutoStep(autoDelayMs());
      return;
    }

    spin();
    if(!isSpinning && autoPlay){
      queueAutoStep(autoDelayMs());
    }
  }

  function scheduleNextAuto(){
    if(!autoPlay) return;
    if(bonusEndBgmPlaying || bonusConfirmSoundPlaying){
      queueAutoStep(autoPollDelayMs());
      return;
    }
    if(!canPlayCompleteTrial({allowOumaPresentation:true})) return;
    if(isRogiThirdStopHoldActive()){
      queueAutoStep(autoPollDelayMs());
      return;
    }
    readSettings();
    queueAutoStep(autoDelayMs());
  }

  function speedToBonusUnavailableReason(){
    if(isCompleteTrialLocked()) return "COMPLETE到達のため設定変更まで遊戯不可";
    if(session.active) return "ボーナス中はSPEEDを使用できません";
    if(normalState.bonusPending) return "ボーナス確定中のためSPEED停止";
    if(bonusConfirmSoundPlaying) return "ボーナス確定音再生中のためSPEED停止";
    if(pendingAtStartTimer) return "AT開始待機中のためSPEEDを使用できません";
    if(isSpinning) return "現在の回転停止後にSPEEDを開始してください";
    if(debugFastSpinActive) return "高速回転中のためSPEEDを使用できません";
    return "";
  }

  function speedModeDelayMs(){
    const autoMs = autoDelayMs();
    const maxRateMs = Math.round(1000 / SPEED_MODE_MAX_SPINS_PER_SECOND);
    return Math.max(maxRateMs, Math.round(autoMs / SPEED_MODE_MULTIPLIER));
  }

  function speedModeWaitMs(){
    return 0;
  }

  function speedModeStopDelay(index){
    return Math.max(40, Math.round((120 + index * 360) / SPEED_MODE_MULTIPLIER));
  }

  function setSpeedModeMenuOpen(open){
    speedModeMenuOpen = !!open;
    updateSpeedToBonusUi();
  }

  function scheduleNextSpeedToBonus(delayMs=null){
    if(!speedToBonusActive) return;
    if(speedToBonusTimer){
      clearTimeout(speedToBonusTimer);
      speedToBonusTimer = null;
    }
    speedToBonusTimer = setTimeout(runSpeedToBonusStep, delayMs === null ? speedModeDelayMs() : delayMs);
  }

  function updateSpeedToBonusUi(){
    const btn = $("speedAutoBtn");
    const menu = $("speedModeMenu");
    const state = $("speedModeState");
    const toggle = $("speedModeToggleBtn");
    const count = $("speedModeCount");
    const unavailable = speedToBonusUnavailableReason();
    if(btn){
      btn.textContent = "SPEED";
      btn.classList.toggle("on", speedToBonusActive || speedModeMenuOpen);
      btn.disabled = false;
      btn.title = speedToBonusActive
        ? `SPEED ON / 今回${speedToBonusCount}G`
        : (unavailable || "SPEEDメニューを開く");
    }
    if(menu) menu.hidden = !speedModeMenuOpen;
    if(state) state.textContent = speedToBonusActive ? "ON" : "OFF";
    if(toggle){
      toggle.textContent = speedToBonusActive ? "OFF" : "ON";
      toggle.classList.toggle("off", speedToBonusActive);
      toggle.disabled = !speedToBonusActive && !!unavailable;
      toggle.title = unavailable || "通常時のみAUTOの3倍速で遊技 / BGMあり・演出なし";
    }
    if(count){
      count.textContent = speedToBonusActive
        ? `ON / 今回${speedToBonusCount}G / ${Math.round(1000 / speedModeDelayMs())}G/s目安`
        : (unavailable ? `OFF / ${unavailable}` : "OFF / 通常時のみ");
    }
  }

  function startSpeedToBonus(){
    if(speedToBonusActive) return;
    const reason = speedToBonusUnavailableReason();
    if(reason){
      showMessage("SPEED待機", reason);
      log(`[SPEED] ${reason}`);
      updateSpeedToBonusUi();
      return;
    }
    stopAutoPlay("SPEED開始のためAUTO停止");
    readSettings();
    speedToBonusCount = 0;
    speedToBonusActive = true;
    NovaDirectAward.clear();
    NovaInitialDuo.clear();
    setSpeedFrameOffHold(true);
    updateSpeedToBonusUi();
    playNormalBgm();
    showMessage("SPEED MODE", `通常時のみ / AUTOの${SPEED_MODE_MULTIPLIER}倍速 / 上限${SPEED_MODE_MAX_SPINS_PER_SECOND}G/s / BGMあり・演出なし`);
    log(`[SPEED] 通常時SPEED開始 AUTOx${SPEED_MODE_MULTIPLIER} / max ${SPEED_MODE_MAX_SPINS_PER_SECOND}G/s / BGMあり・演出なし`);
    scheduleNextSpeedToBonus(0);
  }

  function stopSpeedToBonus(reason="SPEED停止"){
    if(!speedToBonusActive && !speedToBonusTimer) return;
    speedToBonusActive = false;
    if(speedToBonusTimer){
      clearTimeout(speedToBonusTimer);
      speedToBonusTimer = null;
    }
    speedModeSpinRequest = false;
    const keepSpeedFrameOff = speedFrameOffHold && !session.active && (normalState.bonusPending || pendingAtStartTimer || speedBonusRogiHoldActive);
    if(keepSpeedFrameOff) updateReelFrameMode();
    else setSpeedFrameOffHold(false);
    updateSpeedToBonusUi();
    updateDisplay();
    if(!session.active && !barBgmActive && !battleBgmActive) playNormalBgm();
    log(`[SPEED] ${reason} / 今回${speedToBonusCount}G`);
  }

  function runSpeedToBonusStep(){
    if(!speedToBonusActive) return;
    try{
      const reason = speedToBonusUnavailableReason();
      if(session.active || normalState.bonusPending || pendingAtStartTimer || isSpinning || debugFastSpinActive){
        if(isSpinning){
          scheduleNextSpeedToBonus();
          return;
        }
        stopSpeedToBonus(reason || "通常時以外のためSPEED停止");
        return;
      }
      if(!session.active && session.phase === "ended" && session.resultPayout !== null && session.resultPayout !== undefined){
        hideSessionResultScreen();
        session.phase = "idle";
        session.resultPayout = null;
        session.endSignal = null;
      }

      speedToBonusCount++;
      speedModeSpinRequest = true;
      spin();
      speedModeSpinRequest = false;
      updateSpeedToBonusUi();
      persistState();
    }catch(e){
      speedModeSpinRequest = false;
      stopSpeedToBonus("SPEEDエラー停止");
      showMessage("SPEEDエラー", e && e.message ? e.message : String(e));
      log(`[SPEED] ERROR ${e && e.message ? e.message : e}`);
    }
  }

  function updateDebugFastUi(){
    const startBtn = $("debugFastStartBtn");
    const stopBtn = $("debugFastStopBtn");
    const status = $("debugFastStatus");
    const simBtn = $("tenKSimBtn");
    if(!startBtn || !stopBtn || !status) return;

    startBtn.textContent = isCompleteTrialLocked() ? "朝一リセットして高速回転" : `高速回転 ${DEBUG_FAST_SPINS_PER_SECOND}G/s`;

    startBtn.disabled = debugFastSpinActive;
    stopBtn.disabled = !debugFastSpinActive;
    if(simBtn) simBtn.disabled = debugFastSpinActive || debugOneClickSimActive || isSpinning;

    if(isCompleteTrialLocked()){
      status.textContent = "COMPLETE / 朝一リセットで高速回転を再開できます";
      status.style.color = "rgba(255,255,255,.65)";
    }else if(debugFastSpinActive){
      status.textContent = `高速回転中 ${DEBUG_FAST_SPINS_PER_SECOND}G/s / 今回${debugFastSpinCount}G`;
      status.style.color = "var(--green)";
    }else{
      status.textContent = `高速回転停止中 / 前回${debugFastSpinCount}G`;
      status.style.color = "rgba(255,255,255,.65)";
    }
  }

  function startDebugFastSpin(){
    if(NovaAim.busy)return;
    if(bonusConfirmSoundPlaying || bonusEndBgmPlaying)return;
    NovaLadder.hide();
    NovaAim.hide();
    if(debugFastSpinActive) return;
    if(isCompleteTrialLocked() && !morningResetGame(true, "高速回転再開の朝一リセット")) return;
    if(!canPlayCompleteTrial()) return;
    if(isSpinning){
      showMessage("高速回転待機", "現在の回転停止後に開始してください");
      log("[FAST] 回転中のため高速回転を開始できません");
      return;
    }
    stopAutoPlay("高速回転開始のためオート停止");
    stopSpeedToBonus("高速回転開始のためSPEED停止");
    readSettings();
    debugFastSpinCount = 0;
    debugFastSpinActive = true;
    NovaDirectAward.clear();
    NovaInitialDuo.clear();
    updateDebugFastUi();
    log(`[FAST] 高速回転開始 ${DEBUG_FAST_SPINS_PER_SECOND}G/s`);
    debugFastTimer = setInterval(runDebugFastBatch, DEBUG_FAST_INTERVAL_MS);
    runDebugFastBatch();
  }

  function stopDebugFastSpin(reason="高速回転停止"){
    if(!debugFastSpinActive && !debugFastTimer) return;
    debugFastSpinActive = false;
    if(debugFastTimer){
      clearInterval(debugFastTimer);
      debugFastTimer = null;
    }
    updateDisplay();
    updateDebugFastUi();
    log(`[FAST] ${reason} / 今回${debugFastSpinCount}G`);
  }

  function runDebugFastBatch(){
    if(!debugFastSpinActive) return;
    try{
      let spun = 0;
      let safety = 0;
      const safetyLimit = DEBUG_FAST_BATCH_SIZE * 6;
      while(debugFastSpinActive && spun < DEBUG_FAST_BATCH_SIZE && safety < safetyLimit){
        safety++;
        if(runDebugFastStep()){
          spun++;
          debugFastSpinCount++;
        }
      }
      updateDisplay();
      updateDebugFastUi();
    }catch(e){
      stopDebugFastSpin("エラー停止");
      showMessage("高速回転エラー", e && e.message ? e.message : String(e));
      log(`[FAST] ERROR ${e && e.message ? e.message : e}`);
    }
  }

  function runDebugFastStep(){
    if(!canUsePlayState())return false;
    if(!canPlayCompleteTrial()) return false;
    if(isSpinning) return false;
    if(sessionStartGuard) return false;
    if(pendingAtStartTimer){
      startBonusSessionNow();
      return false;
    }

    if(!session.active && session.phase === "ended" && session.resultPayout !== null && session.resultPayout !== undefined){
      hideSessionResultScreen();
      session.phase = "idle";
      session.resultPayout = null;
      session.endSignal = null;
      return false;
    }

    const zoneActiveAtSpinStart = session.active && isGoraiZoneActive();
    const aTypeBonusActiveAtSpinStart = isATypeBonusActive();
    if(aTypeBonusActiveAtSpinStart && isATypeBonusComplete()){
      finishSession();
      return false;
    }
    if(session.active && !aTypeBonusActiveAtSpinStart && session.remain <= 0 && session.phase !== "battle" && !zoneActiveAtSpinStart){
      startContinuationBattlePart();
      return false;
    }
    if(session.active && !aTypeBonusActiveAtSpinStart && session.phase === "battle" && session.battleRemain <= 0 && !zoneActiveAtSpinStart){
      advanceBattleSetIfNeeded();
      return false;
    }

    const normalActiveAtSpinStart = !session.active;
    const battleActiveAtSpinStart = isContinuationBattleActive() && !zoneActiveAtSpinStart;
    const atSpinAtStart = session.active && !aTypeBonusActiveAtSpinStart && !zoneActiveAtSpinStart && !battleActiveAtSpinStart;

    pendingForceResult = takeForcedResult();
    const premiumForced = forcePremiumEffect;
    forcePremiumEffect = false;
    if($("forceResult")) $("forceResult").value = forceResult;
    if($("premiumForceStatus")) $("premiumForceStatus").value = "OFF";
    if(!A_TYPE_MODE && premiumForced && !pendingForceResult) pendingForceResult = "BIG";

    if(battleActiveAtSpinStart){
      session.battleRemain = Math.max(0, (session.battleRemain || 0) - 1);
    }else if(aTypeBonusActiveAtSpinStart){
      // A-type bonus has no fixed remaining-game counter.
    }else if(session.active && !zoneActiveAtSpinStart){
      session.remain = Math.max(0, (session.remain || 0) - 1);
    }
    countTotalSpinIfNeeded(aTypeBonusActiveAtSpinStart);
    chargeSpinCost();
    jagLastGamePayout = 0;
    if(!normalState.bonusPending && !session.active) jagChanceHold = false;
    const reachMeAnnouncementLit = activateReachMeBonusAnnouncementIfNeeded(normalActiveAtSpinStart);
    if(reachMeAnnouncementLit) triggerBonusConfirmBetSoundIfNeeded();

    const result = normalActiveAtSpinStart ? drawNormalResult() : drawResult();
    const lineRow = resultLineRow(result);
    const resolved = normalActiveAtSpinStart ? resolveNormalOutcome(result, lineRow) : resolveOutcome(result);
    const bigPremiumEffect = normalActiveAtSpinStart && decideBigPremiumEffect(result, resolved, premiumForced);
    if(A_TYPE_MODE && normalActiveAtSpinStart && resolved && (resolved.bonusHit || resolved.bonusReady) && resolved.bonusKind === "BIG"){
      resolved.premiumBonus = !!(resolved.premiumBonus || bigPremiumEffect);
    }
    if(A_TYPE_MODE && normalActiveAtSpinStart && shouldScheduleBonusAnnouncement(normalActiveAtSpinStart, resolved)){
      jagChanceHold = true;
      const lamp = $("stLamp");
      if(lamp) lamp.classList.add("on");
    }

    if(normalActiveAtSpinStart){
      applyNormalResult(result, resolved, lineRow);
      pendingForceResult = "";
      if(A_TYPE_MODE && resolved.aTypeBonusReady){
        startBonusSessionNow({
          bonusKind:resolved.bonusKind || (resolved.regReady ? "MID" : "BIG"),
          bonusSource:resolved.bonusSource || "",
          premiumBonus:!!resolved.premiumBonus,
          oneGameRenBonus:!!resolved.oneGameRenBonus,
          gamesSinceLastBonus:resolved.gamesSinceLastBonusAtStart
        });
      }
      return true;
    }

    applyResult(result, resolved, lineRow);
    const shouldResolveBattle = battleActiveAtSpinStart && session.active && session.battleRemain <= 0;
    const shouldFinishATypeBonus = aTypeBonusActiveAtSpinStart && isATypeBonusComplete();
    const shouldEnterBattle = session.active && !shouldFinishATypeBonus && session.phase !== "battle" && session.remain <= 0 && !isGoraiZoneActive();
    pendingForceResult = "";

    if(shouldFinishATypeBonus){
      finishSession();
    }else if(shouldResolveBattle){
      completeContinuationBattle(result);
    }else if(shouldEnterBattle){
      startContinuationBattlePart();
    }

    return true;
  }

  function getAudio(){
    if(globalThis.NovaAudio?.enabled)return globalThis.NovaAudio.context();
    if(!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    return audioCtx;
  }

  function beep(freq=440,dur=.12,type="sine",gain=.18,delay=0){
    const vol = sfxOutputVolume();
    if(vol <= 0) return;
    const ctx = getAudio();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, ctx.currentTime + delay);
    g.gain.setValueAtTime(.0001, ctx.currentTime + delay);
    g.gain.exponentialRampToValueAtTime(Math.max(.0001,gain*vol), ctx.currentTime+delay+.02);
    g.gain.exponentialRampToValueAtTime(.0001, ctx.currentTime+delay+dur);
    o.connect(g);
    g.connect(ctx.destination);
    o.start(ctx.currentTime+delay);
    o.stop(ctx.currentTime+delay+dur+.04);
  }

  function fadeAimWinSoundsOnBet(){
    globalThis.NovaRushConfirm?.fadeOnBet();
    for(const audio of aimWinAudios){
      if(audio.paused||audio.ended||audio.aimFadeTimer!==undefined)continue;
      const started=performance.now();audio.aimFadeGain=1;
      audio.aimFadeTimer=setInterval(()=>{
        audio.aimFadeGain=Math.max(0,1-(performance.now()-started)/3000);
        audio.volume=aimWinOutputVolume(audio);
        if(audio.aimFadeGain===0){audio.pause();clearInterval(audio.aimFadeTimer);aimWinAudios.delete(audio);releaseCharacterVoiceAudio(audio);}
      },50);
    }
  }
  function playAimSevenWinSound(symbol='seven',resolved={}){
    if(debugFastSpinActive)return;
    if(symbol==='nebula'&&resolved.novaRushConfirmed){
      pauseNormalBgm();barBgm?.pause();
      NovaRushConfirm.play(bgmOutputVolume(BGM_OUTPUT_SCALE),sfxOutputVolume());
      return;
    }
    const name=symbol==='nebula'?(resolved.aTypeBonusGame?'bonus-nebula':'nebula'):'seven';
    const src='assets/media/nova/aim/'+name+'-win.wav';
    const audio=oneShotSoundCache.get(src).cloneNode(true);
    audio.aimSoundSrc=src;audio.loop=false;audio.volume=aimWinOutputVolume(audio);aimWinAudios.add(audio);
    prepareCharacterVoiceAudio(audio,src);
    audio.onended=audio.onerror=()=>{clearInterval(audio.aimFadeTimer);aimWinAudios.delete(audio);releaseCharacterVoiceAudio(audio);};
    audio.play().catch(()=>{aimWinAudios.delete(audio);releaseCharacterVoiceAudio(audio);});
  }
  window.addEventListener('nova-aim-unlocked',()=>{updateDisplay();if(autoPlay)queueAutoStep(50);});
  window.addEventListener('nova-rush-confirm-ended',()=>{if(session.active)resumeSessionBgm();else playNormalBgm();});
  function playOneShotSound(src, volume=sfxOutputVolume(), options={}){
    if(debugFastSpinActive || speedToBonusActive) return;
    if(premiumBigConfirmSilence && !options.allowDuringPremiumConfirm) return;
    if(!src) return;
    try{
      let audio = oneShotSoundCache.get(src);
      if(!audio){
        audio = new Audio(src);
        audio.preload = "auto";
        oneShotSoundCache.set(src, audio);
      }
      audio.pause();
      if(audio.getAttribute("src") !== src){
        audio.setAttribute("src", src);
        try{ audio.load(); }catch(e){}
      }
      audio.currentTime = 0;
      audio.volume = soundOutputVolume(src, volume);
      prepareCharacterVoiceAudio(audio,src);
      const p = audio.play();
      if(p && typeof p.catch === "function") p.catch(()=>{});
    }catch(e){}
  }

  function clearBonusConfirmSoundLock(){
    bonusConfirmSoundPlaying = false;
    if(bonusConfirmSoundTimer){
      clearTimeout(bonusConfirmSoundTimer);
      bonusConfirmSoundTimer = null;
    }
    if(bonusConfirmSoundAudio){
      bonusConfirmSoundAudio.onended = null;
      bonusConfirmSoundAudio.onerror = null;
      bonusConfirmSoundAudio = null;
    }
    updateAutoUi();
  }

  function premiumBigThirdStopVoiceSrc(spin=currentSpin){
    const resolved = spin && spin.resolved ? spin.resolved : null;
    if(resolved && resolved.oneGameRenBonus) return PREMIUM_BIG_SECOND_THIRD_STOP_VOICE_SRC;
    if(normalState.oneGameRenBonus) return PREMIUM_BIG_SECOND_THIRD_STOP_VOICE_SRC;
    return PREMIUM_BIG_FIRST_THIRD_STOP_VOICE_SRC;
  }

  function isPremiumBigDedicatedVoiceSrc(src=""){
    return src === PREMIUM_BIG_FIRST_THIRD_STOP_VOICE_SRC || src === PREMIUM_BIG_SECOND_THIRD_STOP_VOICE_SRC;
  }

  function playPremiumBigConfirmVoice(label="PBB確定ボイス", src=PREMIUM_BIG_SECOND_THIRD_STOP_VOICE_SRC){
    if(A_TYPE_MODE)return false;
  }

  function stopSingleReelByKeyboard(i){
    stopSingleReel(i, {keyboardTurbo:true});
  }

  function playPremiumBigThirdStopVoice(spin=currentSpin){
    if(A_TYPE_MODE)return false;
  }

  function isPremiumBigLineupSpin(spin=currentSpin){
    return !!(
      A_TYPE_MODE &&
      spin &&
      spin.normalActiveAtStart &&
      spin.result === "BAR3" &&
      spin.resolved &&
      spin.resolved.aTypeBonusReady &&
      (spin.resolved.premiumBonus || spin.resolved.oneGameRenBonus)
    );
  }

  function isPremiumBigConfirmSoundContext(spin=currentSpin){
    if(A_TYPE_MODE)return false;
  }

  function maybePlayPremiumBigLineupVoice(stopOrder, spin=currentSpin){
    if(!isPremiumBigLineupSpin(spin)) return;
    if(stopOrder === 2 && !spin.premiumBigSecondStopVoicePlayed){
      spin.premiumBigSecondStopVoicePlayed = true;
      return;
    }
    if(stopOrder === 3 && !spin.premiumBigThirdStopVoicePlayed){
      playPremiumBigThirdStopVoice(spin);
    }
  }

  function playLockedBonusConfirmSound(src, volume=sfxOutputVolume(CONFIRM_SOUND_OUTPUT_SCALE)){
    if(debugFastSpinActive || speedToBonusActive) return;
    if(!src) return;
    if(src === SEVEN_CONFIRM_SOUND_SRC && isPremiumBigConfirmSoundContext(currentSpin)){
      src = premiumBigThirdStopVoiceSrc(currentSpin);
      volume = voiceOutputVolume(PREMIUM_VOICE_OUTPUT_SCALE);
      log(`PBB通常BIG確定音を差し替え：${src.split("/").pop()}`);
    }
    if(!A_TYPE_MODE && premiumBigConfirmSilence && !isPremiumBigDedicatedVoiceSrc(src)) return;
    try{
      clearBonusConfirmSoundLock();
      let audio = oneShotSoundCache.get(src);
      if(!audio){
        audio = new Audio(src);
        audio.preload = "auto";
        oneShotSoundCache.set(src, audio);
      }
      bonusConfirmSoundPlaying = true;
      bonusConfirmSoundAudio = audio;
      updateAutoUi();
      const finish = ()=>{
        if(!bonusConfirmSoundPlaying || bonusConfirmSoundAudio !== audio) return;
        clearBonusConfirmSoundLock();
      };
      audio.pause();
      if(audio.getAttribute("src") !== src){
        audio.setAttribute("src", src);
        try{ audio.load(); }catch(e){}
      }
      audio.currentTime = 0;
      audio.volume = soundOutputVolume(src, volume);
      prepareCharacterVoiceAudio(audio,src);
      audio.onended = finish;
      audio.onerror = finish;

      const p = audio.play();
      if(p && typeof p.catch === "function") p.catch(()=>setTimeout(finish, 250));
    }catch(e){
      clearBonusConfirmSoundLock();
    }
  }

  function playSevenConfirmSound(){
    if(isPremiumBigConfirmSoundContext(currentSpin)){
      playPremiumBigConfirmVoice("PBB通常BIG確定音差し替え", premiumBigThirdStopVoiceSrc(currentSpin));
      return;
    }
    playLockedBonusConfirmSound(SEVEN_CONFIRM_SOUND_SRC, voiceOutputVolume(LINEUP_CONFIRM_SOUND_OUTPUT_SCALE));
  }
  function playRegConfirmSound(){ playLockedBonusConfirmSound(REG_CONFIRM_SOUND_SRC, voiceOutputVolume(LINEUP_CONFIRM_SOUND_OUTPUT_SCALE)); }

  function playPekaSound(isBig=false){
    const roll = Math.random();
    const primaryThreshold = PEKA_PRIMARY_RATE + (isBig ? PEKA_BIG_ATSU_RATE : 0);
    const src = isBig && roll < PEKA_BIG_ATSU_RATE
      ? PEKA_BIG_ATSU_SOUND_SRC
      : roll < primaryThreshold
        ? PEKA_SOUND_SRC
        : PEKA_SOUND_SRCS[randomInt(1, PEKA_SOUND_SRCS.length - 1)];
    playOneShotSound(src, voiceOutputVolume(CONFIRM_SOUND_OUTPUT_SCALE));
  }

  function isPremiumBigBonusActiveForSound(){
    return !!(
      isATypeBonusActive() &&
      normalizeATypeBonusKind(session.bonusKind) === "BIG" &&
      (session.premiumBonus || session.oneGameRenBonus)
    );
  }

  function isPremiumBigBonusPieroSound(result="", spin=currentSpin){
    return !!(
      result === A_TYPE_BONUS_MAIN_RESULT &&
      isPremiumBigBonusActiveForSound() &&
      (!spin || spin.aTypeBonusActiveAtStart || isATypeBonusActive())
    );
  }

  function payoutSoundSrcFor(result, reward=0, spin=currentSpin){
    if(A_TYPE_MODE && ["BELL","BELL15","GRAPE","BELL3"].includes(result))return PAYOUT_3PT_BELL_SOUND_SRC;
    if(isPremiumBigBonusPieroSound(result, spin)) return PREMIUM_PIERO_SYMBOL_SOUND_SRC;
    if(result === "REPLAY") return REPLAY_SOUND_SRC;
    if(result === "CHERRY_ANY" || result === "CHERRY_DOUBLE" || result === "CHERRY_TRIPLE" || result === "MID_CHERRY") return CHERRY_SOUND_SRC;
    if(result === "MID" || result === "BAR3" || result === "SMALL" || result === "DEVIL_ZONE" || result === "SUPER_DEVIL_ZONE") return SPECIAL_SYMBOL_SOUND_SRC;
    if(result === "GRAPE" || result === "BELL" || result === "BELL3") return PAYOUT_3PT_BELL_SOUND_SRC;
    return PAYOUT_SOUND_SRC;
  }

  function payoutSoundScaleFor(result="", reward=0, spin=currentSpin){
    if(isPremiumBigBonusPieroSound(result, spin)) return PAYOUT_SOUND_OUTPUT_SCALE;
    return ["BELL","BELL15"].includes(result) ? BELL_PAYOUT_SOUND_OUTPUT_SCALE : PAYOUT_SOUND_OUTPUT_SCALE;
  }

  function shouldSuppressPayoutSound(result="", reward=0, spin=currentSpin){
    if(spin && spin.zoneActiveAtStart && result === "MISS" && Number(reward) > 0) return true;
    return false;
  }

  function playPayoutSound(result="", reward=0, spin=currentSpin){
    if(debugFastSpinActive || speedToBonusActive) return;
    if(shouldSuppressPayoutSound(result, reward, spin)) return;
    if(!payoutSound) return;
    try{
      const src = payoutSoundSrcFor(result, reward, spin);
      payoutSound.pause();
      if(payoutSound.getAttribute("src") !== src){
        payoutSound.setAttribute("src", src);
        try{ payoutSound.load(); }catch(e){}
      }
      payoutSound.currentTime = 0;
      payoutSound.volume = payoutOutputVolumeForSource(payoutSoundScaleFor(result, reward, spin), src);
      const p = payoutSound.play();
      if(p && typeof p.catch === "function") p.catch(()=>{});
    }catch(e){}
  }

  function isLadderShutterSpin(){const flow=currentSpin?.resolved?.flowBefore;return NovaLadder.eligible(flow)&&flow.ladderRevealed;}
  function playSpinSound(resolved){
    if(resolved?.zoneRouletteVoicePlayed)return;
    const src=normalState.ladderAwardPresentation?.started?(Number(normalState.ladderAwardPresentation.card?.pt)>=1000?'assets/media/nova/ladder-final-award.wav':'assets/media/nova/ladder-final-award-under1000.wav'):isLadderShutterSpin()?'assets/media/nova/shutter.wav':SPIN_SOUND_SRC;
    playOneShotSound(src,sfxOutputVolume(),{allowDuringPremiumConfirm:true});
  }
  function playWeakNovaSound(result,resolved){
    if(result!=='WEAK_NOVA' || resolved?.weakNovaSoundPlayed)return;
    if(resolved)resolved.weakNovaSoundPlayed=true;
    playOneShotSound('assets/media/nova/weak-nova.wav',sfxOutputVolume(),{allowDuringPremiumConfirm:true});
  }
  function playStrongNovaSound(result,resolved){
    if(result!=='STRONG_NOVA' || resolved?.strongNovaSoundPlayed)return;
    if(resolved)resolved.strongNovaSoundPlayed=true;
    playOneShotSound('assets/media/nova/strong_nova.wav',sfxOutputVolume(),{allowDuringPremiumConfirm:true});
  }
  function playChanceSound(result,resolved){
    if(!['CHANCE_A','CHANCE_B'].includes(result)||resolved?.chanceSoundPlayed)return;
    if(resolved)resolved.chanceSoundPlayed=true;
    playWinSound(false);
  }
  function czThirdStopSound(resolved,previousStage){
    if(!resolved?.czLamp)return '';
    if(resolved.czIntro)return 'assets/media/nova/cz_stop_12.wav';
    const failed=resolved.czCompleted&&!resolved.bonusHit&&resolved.flowAfter?.phase==='normal';
    if(failed)return 'assets/media/jag/cz_third_failure.wav';
    if(resolved.czLitStops?.[3])return ''; // Already played with the light itself.
    const display=NovaFlow.lampDisplayAtStop(resolved.czLamp,3);
    previousStage=resolved.czLampAtBet??previousStage;
    const success=!failed&&(display.rainbow||display.stage>previousStage||resolved.bonusHit||resolved.flowAfter?.phase==='art');
    return success?'assets/media/nova/cz_stop_12.wav':'assets/media/jag/cz_third_failure.wav';
  }
  function clearCzReelBlackout(){
    document.querySelectorAll('.reel.cz-stop-blackout').forEach(reel=>reel.classList.remove('cz-stop-blackout'));
    renderCzPrelude([]);
    document.getElementById('machine').dataset.czPreludeActive='false';
    document.getElementById('machine').dataset.atPreludeActive='false';
  }
  function playInitialDuoStop(spin,order){
    if(debugFastSpinActive||speedToBonusActive||!NovaInitialDuo.eligible(spin?.resolved?.flowBefore))return;
    if(!NovaInitialDuo.stop(order))return;
    playOneShotSound(order===3?'assets/media/nova/initial-duo-final-stop.mp3':'assets/media/nova/initial-duo-stop.mp3',sfxOutputVolume(),{allowDuringPremiumConfirm:true});
  }
  function playStopSound(i, stopOrder=null){
    if(globalThis.NovaInitialDuo?.eligible(currentSpin?.resolved?.flowBefore))return;
    const prelude=currentSpin?.resolved?.czPrelude||currentSpin?.resolved?.atPrelude;
    if(prelude&&!prelude.announce&&stopOrder>0&&stopOrder<=prelude.after){
      playOneShotSound('assets/media/jag/cz_third_failure.wav',sfxOutputVolume());
      return;
    }
    if(isLadderShutterSpin()&&stopOrder>=1&&stopOrder<=3){
      if(stopOrder===3)oneShotSoundCache.get('assets/media/nova/shutter.wav')?.pause();
      playOneShotSound(stopOrder===3?(currentSpin?.result==='MISS'?'assets/media/nova/ouma-fail.wav':'assets/media/nova/shutter-close.wav'):'assets/media/nova/shutter.wav',sfxOutputVolume(),{allowDuringPremiumConfirm:true});
      return;
    }
    if(stopOrder===3&&currentSpin?.result==='SUPER_NOVA'){
      if(currentSpin.superNovaStopSoundPlayed)return;
      currentSpin.superNovaStopSoundPlayed=true;
      if(currentSpin.resolved?.oumaFreeze)return;
      playOneShotSound('assets/media/nova/super-nova-stop.wav',sfxOutputVolume(),{allowDuringPremiumConfirm:true});
      return;
    }
    const resolved=currentSpin?.resolved;
    if(stopOrder===3&&resolved?.czLamp){
      if(resolved.czThirdSoundPlayed)return;
      resolved.czThirdSoundPlayed=true;
      const previous=Number(document.getElementById('machine').dataset.czLamp)||0;
      const sound=czThirdStopSound(resolved,previous);
      if(!sound)return;
      if(sound.endsWith('cz_third_failure.wav'))document.querySelector('.reel[data-reel="'+i+'"]').classList.add('cz-stop-blackout');
      playOneShotSound(sound,sfxOutputVolume());
      return;
    }
    if(resolved?.czLamp&&resolved.czLitStops?.[stopOrder])return;
    playOneShotSound(resolved?.czLamp && (stopOrder===1 || stopOrder===2)?"assets/media/nova/cz_stop_12.wav":STOP_SOUND_SRC);
  }
  function playWinSound(big){
    if(debugFastSpinActive || speedToBonusActive) return;
    const notes = big ? [523,659,784,1046,1318] : [440,554,659,880];
    notes.forEach((n,i)=>beep(n,.16,"triangle",.17,i*.11));
  }

  function playLoseSound(){ if(debugFastSpinActive || speedToBonusActive) return; beep(190,.13,"sawtooth",.055); }

  function showOverlay(text){
    if(debugFastSpinActive || speedToBonusActive) return;
    const o = $("overlay");
    if(isRogiThirdStopHoldActive()){
      if(o) o.classList.remove("show");
      return;
    }
    const target = document.querySelector(".reelArea") || document.querySelector(".reels");
    if(target){
      const rect = target.getBoundingClientRect();
      const textLength = Math.max(String(text).length, 1);
      const maxFont = Math.min(160, window.innerWidth * 0.10);
      const fitFont = (rect.width * 0.86) / (textLength * 0.68);
      o.style.setProperty("--wd-overlay-left", `${rect.left + rect.width / 2}px`);
      o.style.setProperty("--wd-overlay-top", `${rect.top + rect.height / 2}px`);
      o.style.setProperty("--wd-overlay-width", `${rect.width}px`);
      o.style.setProperty("--wd-overlay-height", `${rect.height}px`);
      o.style.setProperty("--wd-overlay-font-size", `${Math.max(42, Math.min(maxFont, fitFont))}px`);
    }
    $("overlayText").textContent = text;
    o.classList.remove("show");
    void o.offsetWidth;
    o.classList.add("show");
    setTimeout(()=>o.classList.remove("show"),2200);
  }

  function confetti(n){
    if(debugFastSpinActive || speedToBonusActive) return;
    if(isRogiThirdStopHoldActive()) return;
    const box = $("confetti");
    const colors = ["#ffd36a","#ff365d","#4de7ff","#62ff9a","#bd71ff","#ffffff"];
    for(let i=0;i<n;i++){
      const p = document.createElement("div");
      p.className = "piece";
      p.style.left = Math.random()*100 + "vw";
      p.style.background = colors[Math.floor(Math.random()*colors.length)];
      p.style.animationDuration = (1.5+Math.random()*2.6)+"s";
      p.style.animationDelay = Math.random()*.32+"s";
      p.style.transform = `rotate(${Math.random()*360}deg)`;
      box.appendChild(p);
      setTimeout(()=>p.remove(),4300);
    }
  }

  function log(text){
    const textString = String(text || "");
    if(debugFastSpinActive && !textString.startsWith("[FAST]")) return;
    if(speedToBonusActive && !textString.startsWith("[SPEED]")) return;
    const box = $("logList");
    const div = document.createElement("div");
    div.className = "logItem";
    div.textContent = text;
    box.prepend(div);
    while(box.children.length > 45) box.lastChild.remove();
  }

  function setup(){
    // 公開情報は右上ドックへ移動し、残りの設定カードは非公開デバッグメニューへ移動。
    const slumpPanelBody = $("slumpPanelBody");
    const slumpPublicCard = document.querySelector(".slumpPublic");
    if(slumpPanelBody && slumpPublicCard){
      slumpPanelBody.appendChild(slumpPublicCard);
    }
    const drawer = $("debugDrawer");
    if(drawer){
      [...document.querySelectorAll(".side > .card:not(.oddsPublic):not(.slumpPublic)")].forEach(card => drawer.appendChild(card));
      if(drawer.parentElement !== document.body) document.body.appendChild(drawer);
    }
    ["titleInput","settingSelect","feeInput","stSpinsInput","oddsMultiplierInput","smallMulInput","midMulInput","crownMulInput","cherryMulInput","bigMulInput","bigAddInput","autoDelayInput","masterVolume","bgmVolume","sfxVolume","voiceVolume","payoutVolume"].forEach(id=>{
      const el = $(id);
      if(el) el.addEventListener("input", ()=>{
        const volumeField = AUDIO_VOLUME_FIELDS.find(item=>item.rangeId === id);
        if(volumeField) syncVolumeNumberInput(volumeField.rangeId, volumeField.numberId);
        readSettings();
        updateDisplay();
      });
    });
    AUDIO_VOLUME_FIELDS.forEach(({numberId})=>{
      const el = $(numberId);
      if(!el) return;
      const handler = ()=>{
        if(!syncVolumeRangeFromNumber(numberId)) return;
        readSettings();
        updateDisplay();
      };
      el.addEventListener("input", handler);
      el.addEventListener("change", handler);
    });

    const onClick = (id, handler)=>{
      const el = $(id);
      if(el) el.addEventListener("click", handler);
    };

    const bindUtilityPress = (el, handler)=>{
      if(!el) return;
      el.addEventListener("pointerdown", e=>{
        e.preventDefault();
        e.stopPropagation();
        handler(e);
      });
      el.addEventListener("click", e=>{
        e.stopPropagation();
      });
      el.addEventListener("keydown", e=>{
        if(e.code !== "Enter" && e.code !== "Space") return;
        e.preventDefault();
        e.stopPropagation();
        handler(e);
      });
    };

    bindUtilityPress(audioToggleBtn, ()=>{
        setAudioPanelOpen(!audioDock.classList.contains("open"));
    });
    bindUtilityPress(slumpToggleBtn, ()=>{
        setInfoPanelOpen("slump", !audioDock.classList.contains("slumpOpen"));
    });
    bindUtilityPress(oddsToggleBtn, ()=>{
        setInfoPanelOpen("odds", !audioDock.classList.contains("oddsOpen"));
    });
    bindUtilityPress(roleCounterToggleBtn, ()=>{
        setInfoPanelOpen("counter", !audioDock.classList.contains("counterOpen"));
    });
    bindUtilityPress(reelSlumpToggleBtn, ()=>{
        setInfoPanelOpen("slump", !audioDock.classList.contains("slumpOpen"));
    });
    bindUtilityPress(reelOddsToggleBtn, ()=>{
        setInfoPanelOpen("odds", !audioDock.classList.contains("oddsOpen"));
    });
    bindUtilityPress(reelDataToggleBtn, ()=>{
        setReelDataCounterOpen(!isReelDataCounterOpen());
    });
    updateReelDataCounterMenu();
    if(audioCloseBtn){
      audioCloseBtn.addEventListener("click", e=>{
        e.stopPropagation();
        setAudioPanelOpen(false);
        if(audioToggleBtn) audioToggleBtn.focus();
      });
    }
    if(slumpCloseBtn){
      slumpCloseBtn.addEventListener("click", e=>{
        e.stopPropagation();
        setInfoPanelOpen("slump", false);
        if(reelSlumpToggleBtn) reelSlumpToggleBtn.focus();
        else if(slumpToggleBtn) slumpToggleBtn.focus();
      });
    }
    if(oddsCloseBtn){
      oddsCloseBtn.addEventListener("click", e=>{
        e.stopPropagation();
        setInfoPanelOpen("odds", false);
        if(reelOddsToggleBtn) reelOddsToggleBtn.focus();
        else if(oddsToggleBtn) oddsToggleBtn.focus();
      });
    }
    if(roleCounterCloseBtn){
      roleCounterCloseBtn.addEventListener("click", e=>{
        e.stopPropagation();
        setInfoPanelOpen("counter", false);
        if(roleCounterToggleBtn) roleCounterToggleBtn.focus();
      });
    }
    if(pageZoomOutBtn){
      pageZoomOutBtn.addEventListener("click", e=>{
        e.stopPropagation();
        changePageZoom(-PAGE_ZOOM_STEP);
      });
    }
    if(pageZoomInBtn){
      pageZoomInBtn.addEventListener("click", e=>{
        e.stopPropagation();
        changePageZoom(PAGE_ZOOM_STEP);
      });
    }
    if(pageZoomResetBtn){
      pageZoomResetBtn.addEventListener("click", e=>{
        e.stopPropagation();
        syncZoomAnchorToSlotTop();
        pageZoom = 1;
        applyPageZoom(true);
      });
    }
    if(pagePanRange){
      pagePanRange.addEventListener("input", e=>{
        e.stopPropagation();
        pagePanX = Number(pagePanRange.value) || 0;
        applyPagePan(false);
      });
      pagePanRange.addEventListener("change", e=>{
        e.stopPropagation();
        pagePanX = Number(pagePanRange.value) || 0;
        applyPagePan(true);
      });
    }
    if(pagePanResetBtn){
      pagePanResetBtn.addEventListener("click", e=>{
        e.stopPropagation();
        pagePanX = PAGE_PAN_DEFAULT;
        applyPagePan(true);
      });
    }
    const bellNaviAdjustBtn=document.createElement('button');
    bellNaviAdjustBtn.id='bellNaviAdjustBtn';bellNaviAdjustBtn.type='button';bellNaviAdjustBtn.textContent='ナビ調整';
    bellNaviAdjustBtn.addEventListener('click',()=>{setLayoutEditorOpen(!layoutEditOpen);if(layoutEditOpen)layoutEditorPanel.scrollTop=0;});
    document.body.append(bellNaviAdjustBtn);
    if(layoutEditToggleBtn){
      layoutEditToggleBtn.addEventListener("click", e=>{
        e.stopPropagation();
        setLayoutEditorOpen(!layoutEditOpen);
      });
    }
    if(layoutEditCloseBtn){
      layoutEditCloseBtn.addEventListener("click", e=>{
        e.stopPropagation();
        setLayoutEditorOpen(false);
      });
    }
    if(layoutEditSaveDefaultBtn){
      layoutEditSaveDefaultBtn.addEventListener("click", e=>{
        e.stopPropagation();
        saveLayoutAsDefault();
      });
    }
    if(layoutEditResetBtn){
      layoutEditResetBtn.addEventListener("click", e=>{
        e.stopPropagation();
        resetLayoutEdit();
      });
    }
    if(layoutEditorPanel){
      layoutEditorPanel.addEventListener("click", e=>e.stopPropagation());
    }
    layoutEditInputs.forEach(input=>{
      input.addEventListener("input", e=>{
        e.stopPropagation();
        const target = input.dataset.layoutTarget;
        const prop = input.dataset.layoutProp;
        if(!layoutEditState[target]) return;
        layoutEditState[target][prop] = Number(input.value) || 0;
        applyLayoutEdit(false);
      });
      input.addEventListener("change", e=>{
        e.stopPropagation();
        const target = input.dataset.layoutTarget;
        const prop = input.dataset.layoutProp;
        if(!layoutEditState[target]) return;
        layoutEditState[target][prop] = Number(input.value) || 0;
        applyLayoutEdit(true);
      });
    });
    if(audioDock){
      audioDock.addEventListener("click", e=>e.stopPropagation());
    }
    window.addEventListener("resize", ()=>{
      syncZoomAnchorToSlotTop();
      requestPageScrollBoundsUpdate();
      requestBackgroundLogoSync();
      syncInfoPanelPositionIfOpen();
    }, {passive:true});
    window.addEventListener("load", ()=>{
      requestPageScrollBoundsUpdate();
      requestBackgroundLogoSync();
    }, {once:true});
    window.addEventListener("scroll", ()=>{
      syncInfoPanelPositionIfOpen();
    }, {passive:true});
    document.addEventListener("click", closeUtilityPanels);
    document.addEventListener("click", ()=>setSpeedModeMenuOpen(false));

    onClick("saveBtn", save);
    ensureMorningResetControl();
    onClick("morningResetBtn", ()=>morningResetGame(true));
    onClick("tenKSimBtn", runTenKSimulation);
    onClick("resetBtn", resetGame);
    if($("settingSelect")){
      $("settingSelect").addEventListener("change", ()=>{
        readSettings();
        persistState();
        updateDisplay();
        setMorningBarReels();
      });
    }
    onClick("spinBtn", spin);
    const betHitArea = document.querySelector(".betArea");
    if(betHitArea){
      const playControls = document.querySelector(".playControls");
      const setLeverDown = down=>{
        betHitArea.classList.toggle("leverDown", !!down);
        if(playControls) playControls.classList.toggle("leverDown", !!down);
      };
      betHitArea.addEventListener("pointerdown", ()=>setLeverDown(true));
      window.addEventListener("pointerup", ()=>setLeverDown(false));
      window.addEventListener("pointercancel", ()=>setLeverDown(false));
      betHitArea.addEventListener("mouseleave", ()=>setLeverDown(false));
      betHitArea.addEventListener("click", e=>{
        const target = e.target;
        if(target && target.closest && target.closest("button, input, select, textarea, a, label")) return;
        $("spinBtn").click();
      });
    }
    onClick("autoStartBtn", startAutoPlay);
    onClick("autoStopBtn", ()=>stopAutoPlay("オート停止"));
    bindUtilityPress($("topAutoBtn"), ()=>{
        if(autoPlay) stopAutoPlay("オート停止");
        else startAutoPlay();
    });
    if($("debugFastStartBtn")) $("debugFastStartBtn").addEventListener("click", startDebugFastSpin);
    if($("debugFastStopBtn")) $("debugFastStopBtn").addEventListener("click", ()=>stopDebugFastSpin());
    if(slumpSeekRange){
      slumpSeekRange.addEventListener("input", ()=>{
        const max = Number(slumpSeekRange.max) || 0;
        const value = clamp(Number(slumpSeekRange.value) || 0, 0, max);
        slumpView.seekStart = value;
        slumpView.followEnd = max <= 0 || value >= max;
        renderSlumpGraph();
      });
    }
    if(slumpZoomInput){
      slumpZoomInput.addEventListener("input", ()=>{
        slumpView.xZoom = Math.max(1, Math.min(50, Number(slumpZoomInput.value) || 1));
        if(slumpSeekRange && !slumpView.followEnd){
          slumpView.seekStart = Number(slumpSeekRange.value) || 0;
        }
        renderSlumpGraph();
      });
    }
    if(slumpYZoomInput){
      slumpYZoomInput.addEventListener("input", ()=>{
        slumpView.yZoom = Math.max(1, Math.min(6, Number(slumpYZoomInput.value) || 1));
        renderSlumpGraph();
      });
    }
    if($("quickAutoBtn")){
      $("quickAutoBtn").addEventListener("click", e=>{
        e.stopPropagation();
        e.preventDefault();
        if(autoPlay) stopAutoPlay("オート停止");
        else startAutoPlay();
      });
    }
    if($("speedAutoBtn")){
      $("speedAutoBtn").addEventListener("click", e=>{
        e.stopPropagation();
        setSpeedModeMenuOpen(!speedModeMenuOpen);
      });
    }
    if($("speedModeMenu")){
      $("speedModeMenu").addEventListener("click", e=>e.stopPropagation());
    }
    if($("speedModeToggleBtn")){
      $("speedModeToggleBtn").addEventListener("click", e=>{
        e.stopPropagation();
        if(speedToBonusActive) stopSpeedToBonus("手動停止");
        else startSpeedToBonus();
      });
    }
    if(effectSkipBtn){
      effectSkipBtn.addEventListener("click", skipActiveEffects);
    }
    const autoHitArea = document.querySelector(".autoArea");
    if(autoHitArea){
      autoHitArea.addEventListener("click", e=>{
        if(e.target.closest("button")) return;
        if(e.target.closest(".autoStack")) return;
        if($("quickAutoBtn")) $("quickAutoBtn").click();
      });
    }

    stopBtns.forEach((btn,i)=>{
      if(!btn) return;
      const stopPart = document.querySelector(`[data-stop-part="${i}"]`);
      const setStopPressed = down=>{ if(stopPart) stopPart.classList.toggle("is-pressed", !!down); };
      btn.addEventListener("pointerdown", ()=>setStopPressed(true));
      window.addEventListener("pointerup", ()=>setStopPressed(false));
      window.addEventListener("pointercancel", ()=>setStopPressed(false));
      btn.addEventListener("mouseleave", ()=>setStopPressed(false));
      btn.addEventListener("click", ()=>{
        stopSingleReel(i);
      });
    });

    if($("audioMuteBtn")){
      $("audioMuteBtn").addEventListener("click", toggleAudioMute);
    }

    onClick("applyForceBtn", ()=>{
      const requested = $("forceResult").value;
      forceResult = normalizeForceResult(requested);
      log(forceResult ? `次回転指定：${forceResultName(forceResult)}` : "次回転指定なし");
    });
    onClick("forceBarBtn", ()=>{
      forceResult = "BAR3";
      if($("forceResult")) $("forceResult").value = "BAR3";
      log("次回転指定：BAR揃い");
    });
    onClick("clearForceBtn", ()=>{
      forceResult = "";
      $("forceResult").value = "";
      log("次回転指定を解除");
    });

    arrangeDebugDrawerTop();

    onClick("debugHighBtn", forceHighModeNow);
    onClick("debugSmallBtn", ()=>direct("SMALL"));
    onClick("debugMidBtn", ()=>{if(A_TYPE_MODE){if(!isSpinning&&!session.active&&canPlayCompleteTrial()){stats.bigCount++;startBonusSessionNow({bonusKind:"BIG",bonusTier:"upper"});}}});
    onClick("debugBar3Btn", ()=>direct("BAR3"));
    onClick("debugBigBtn", ()=>{if(A_TYPE_MODE){if(!isSpinning&&!session.active&&canPlayCompleteTrial()){stats.bigCount++;startBonusSessionNow({bonusKind:"BIG",bonusTier:"normal"});}}});
    onClick("debugGrapeBtn", ()=>direct("BELL"));
    onClick("debugBellPayBtn", ()=>direct("BELL"));
    onClick("debugBell3Btn", ()=>direct("BELL3"));
    onClick("debugReplayBtn", ()=>direct("REPLAY"));
    onClick("debugSuikaBtn", ()=>direct("SUICA"));
    onClick("debugCherryBtn", ()=>direct("CHERRY_DOUBLE"));
    onClick("debugCherryDoubleBtn", ()=>direct("CHERRY_DOUBLE"));
    onClick("debugBellBtn", ()=>direct("CHERRY_TRIPLE"));
    onClick("debugMissBtn", ()=>direct("MISS"));

    if(SLOT_DEBUG_ENABLED){
      $("lcd").addEventListener("click", ()=>{
        clickCount++;
        clearTimeout(clickTimer);
        clickTimer = setTimeout(()=>clickCount=0, 1600);
        if(clickCount >= 5){
          clickCount = 0;
          document.body.classList.toggle("debugOpen");
          if($("secretPanel")) $("secretPanel").classList.toggle("show", document.body.classList.contains("debugOpen"));
          log(document.body.classList.contains("debugOpen") ? "デバッグメニューを表示" : "デバッグメニューを非表示");
        }
      });
    }

    if($("debugCloseBtn")){
      $("debugCloseBtn").addEventListener("click", ()=>{
        document.body.classList.remove("debugOpen");
        if($("secretPanel")) $("secretPanel").classList.remove("show");
        log("デバッグメニューを非表示");
      });
    }

    if(SLOT_DEBUG_ENABLED && $("debugToggleBtn")){
      $("debugToggleBtn").addEventListener("click", ()=>{
        document.body.classList.toggle("debugOpen");
        if($("secretPanel")) $("secretPanel").classList.toggle("show", document.body.classList.contains("debugOpen"));
        log(document.body.classList.contains("debugOpen") ? "管理メニューを表示" : "管理メニューを非表示");
      });
    }

    document.addEventListener("keydown", e=>{
      if(["INPUT","SELECT","TEXTAREA"].includes(document.activeElement.tagName)) return;
      if(captureControlInput(e)){
        e.preventDefault();
        return;
      }
      const handlers = {
        Space:()=>spin(),
        ArrowUp:()=>spin(),
        ArrowLeft:()=>stopSingleReelByKeyboard(0),
        ArrowDown:()=>stopSingleReelByKeyboard(1),
        ArrowRight:()=>stopSingleReelByKeyboard(2)
      };
      if(handlers[e.code]){
        e.preventDefault();
        handlers[e.code]();
      }
    });

    let exitStatePushed = false;
    const persistAndPushExitState = ()=>{
      if(exitStatePushed || !canUsePlayState()) return;
      exitStatePushed = true;
      readSettings();
      persistState();
      pushAdminStateOnExit(adminSnapshot());
    };
    window.addEventListener("pagehide", persistAndPushExitState);
    window.addEventListener("pageshow", ()=>{ exitStatePushed = false; });
    window.addEventListener("beforeunload", ()=>{
      if(autoTimer) clearTimeout(autoTimer);
      if(autoWatchdogTimer) clearInterval(autoWatchdogTimer);
      if(debugFastTimer) clearInterval(debugFastTimer);
      persistAndPushExitState();
    });
  }

  function bootGame(){
    if(!load()){showPlayBlocked('restore');return;}
    if(!normalState.internal) normalState.internal=NovaNormal.reset(Math.random,settings.setting);
    persistState();
    initializePlaySessionBaseline();
    loadPageZoom();
    loadPagePan();
    loadLayoutDefaultState();
    loadLayoutEdit();
    applySettings();
    setup();
    $("retryStateSave")?.addEventListener("click",()=>persistState());
    setupPlayAudit();
    persistState();
    connectAdminCommands();
    if(!restorePendingSpin()){
      reels.forEach((_,i)=>setRandomReel(i));
      showMessage("READY",`BIG ${NovaArt.bonusTarget()}pt / AT初期150～1,500pt＋レア役加算 / 設定${settings.setting}`);
    }
    if($("forceResult")) $("forceResult").value = forceResult;
    if($("premiumForceStatus")) $("premiumForceStatus").value = forcePremiumEffect ? "ON" : "OFF";
    updateDisplay();
    updateAutoUi();
    updateDebugFastUi();
    requestBackgroundLogoSync();
  }

  playAccess=NovaPlayAccess.create(STORAGE_KEY,{blocked:showPlayBlocked});
  window.addEventListener('pagehide',()=>{if(!playAccess.owned())playAccess.close();});
  playAccess.start(()=>{
    bootGame();
    // Register after setup's final save, so pagehide commits before releasing ownership.
    window.addEventListener('pagehide',()=>{
      playAccess.close();
      stopAutoPlay();stopSpeedToBonus();stopDebugFastSpin();
      if(adminPushTimer)clearTimeout(adminPushTimer);
      if(adminCommandPollTimer)clearTimeout(adminCommandPollTimer);
    });
  });
  window.addEventListener('pageshow',event=>{if(event.persisted)location.reload();});
})();

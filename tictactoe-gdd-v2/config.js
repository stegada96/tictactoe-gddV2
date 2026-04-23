// config.js — TicTacToe GDD
// ⚠️  AGGREGATORE PURO: nessuna costante definita qui.
// Tutte le costanti vivono in config/*.js — config.js le riassembla.
// Backward compatibility: CONFIG.CREDITS_START, CONFIG.GAME_VARIANTS, ecc. funzionano come prima.

import economy       from './config/economy';
import adsConfig     from './config/ads';
import { GAME_VARIANTS, VARIANT_ORDER, LONG_VARIANTS } from './config/variants';
import liveops       from './config/liveops';
import integrations  from './config/integrations';
import FEATURE_FLAGS from './config/features';

// ── App identity ──────────────────────────────────────────
const APP = {
  APP_NAME:    'TicTacToe GDD',
  APP_VERSION: '1.0.0',
  DEBUG:       typeof __DEV__ !== 'undefined' ? __DEV__ : true,
};

// ── Timer / online ────────────────────────────────────────
const GAMEPLAY = {
  ONLINE_TURN_SECONDS:      15,
  TIMER_DANGER_SECONDS:      5,
  TIMER_BLINK_INTERVAL:    400,
  TIMER_AI_FALLBACK:       true,
  TIMER_CONSECUTIVE_MAX:     2,
  TIMER_ONLINE_SECONDS:     15,
  RANDOM_PANEL_SECONDS:     10,
  ONLINE_MATCHMAKING_TIMEOUT: 120,
  ONLINE_RECONNECT_GRACE:     60,
  ONLINE_REMATCH_TIMEOUT:      5,
  QUICK_PLAY_COST:             4,
};

// ── AI ────────────────────────────────────────────────────
const AI_CONFIG = {
  AI_THINK_TIME: {
    easy:   { min:0.4, max:1.0 },
    medium: { min:0.7, max:1.5 },
    hard:   { min:1.0, max:2.0 },
  },
  AI_ERROR_RATE: { easy:0.25, medium:0.10, hard:0.05 },
};

// ── ELO / Leagues ─────────────────────────────────────────
const ELO_CONFIG = {
  ELO_AI_START:         500,
  ELO_ONLINE_START:     500,
  ELO_WIN_BASE:          25,
  ELO_LOSE_BASE:         20,
  ELO_FORFEIT_PENALTY:   30,
  ELO_RAGE_QUIT_PENALTY:100,
  LEAGUE_SILVER_ELO:   1000,
  LEAGUE_GOLD_ELO:     1500,
  LEAGUE_DIAMOND_ELO:  2000,
  LEAGUE_LEGEND_ELO:   2500,
  SEASON_START_DAY:       1,
  SEASON_ELO_RESET_PCT:  0.20,
  SEASON_ELO_RESET_TARGET:500,
  SEASON_CREDIT_REWARDS: [20000,10000,5000,3000,2000,...Array(95).fill(1000)],
  SEASON_INGOT_REWARDS:  {1:50,2:30,3:20,4:15,5:12,6:10,7:8,8:6,9:5,10:5},
};

// ── Clan ──────────────────────────────────────────────────
const CLAN_CONFIG = {
  CLAN_ENABLED:         true,
  CLAN_MAX_MEMBERS:       10,
  CLAN_MIN_MEMBERS:        3,
  CLAN_CHALLENGE_DAYS:     7,
  CLAN_CHALLENGE_SCORING: 'wins',
  CLAN_PRIZE_WINNER_INGOTS: 5,
  CLAN_PRIZE_LOSER_INGOTS:  0,
  CLAN_CREATE_COST_INGOTS:  3,
  CLAN_JOIN_FREE:        true,
  CLAN_NAME_MAX_CHARS:     20,
  CLAN_NOTES_MAX_CHARS:   200,
  CLAN_RENAME_COST_INGOTS:  2,
  CLAN_ELO_REQUIREMENTS: [
    { value:0,    label:'Open to all',       icon:'🔓' },
    { value:500,  label:'500+ ELO',          icon:'🥉' },
    { value:750,  label:'750+ ELO',          icon:'🥈' },
    { value:1000, label:'1000+ ELO',         icon:'🥇' },
    { value:1250, label:'1250+ ELO',         icon:'💎' },
    { value:1500, label:'1500+ ELO',         icon:'👑' },
    { value:2000, label:'2000+ ELO (Elite)', icon:'🌟' },
  ],
  CLAN_LANGUAGES: [
    {code:'any',label:'Any Language',flag:'🌍'},{code:'it',label:'Italiano',flag:'🇮🇹'},
    {code:'en',label:'English',flag:'🇬🇧'},{code:'es',label:'Español',flag:'🇪🇸'},
    {code:'de',label:'Deutsch',flag:'🇩🇪'},{code:'fr',label:'Français',flag:'🇫🇷'},
    {code:'pt',label:'Português',flag:'🇧🇷'},{code:'ru',label:'Русский',flag:'🇷🇺'},
    {code:'jp',label:'日本語',flag:'🇯🇵'},{code:'cn',label:'中文',flag:'🇨🇳'},
    {code:'kr',label:'한국어',flag:'🇰🇷'},{code:'ar',label:'العربية',flag:'🇸🇦'},
  ],
  CLAN_NATIONALITIES: [
    {code:'any',label:'International',flag:'🌍'},{code:'eu',label:'Europe',flag:'🇪🇺'},
    {code:'it',label:'Italy',flag:'🇮🇹'},{code:'us',label:'United States',flag:'🇺🇸'},
    {code:'gb',label:'United Kingdom',flag:'🇬🇧'},{code:'de',label:'Germany',flag:'🇩🇪'},
    {code:'fr',label:'France',flag:'🇫🇷'},{code:'es',label:'Spain',flag:'🇪🇸'},
    {code:'br',label:'Brazil',flag:'🇧🇷'},{code:'ru',label:'Russia',flag:'🇷🇺'},
    {code:'jp',label:'Japan',flag:'🇯🇵'},{code:'cn',label:'China',flag:'🇨🇳'},
    {code:'kr',label:'South Korea',flag:'🇰🇷'},{code:'sa',label:'Saudi Arabia',flag:'🇸🇦'},
    {code:'mx',label:'Mexico',flag:'🇲🇽'},{code:'ar',label:'Argentina',flag:'🇦🇷'},
    {code:'in',label:'India',flag:'🇮🇳'},{code:'other',label:'Other',flag:'🏳️'},
  ],
  CLAN_LEVELS: [
    {level:1,points:0,   label:'Rookie', icon:'🥉'},{level:2,points:50,  label:'Veteran',icon:'🥈'},
    {level:3,points:150, label:'Elite',  icon:'🥇'},{level:4,points:350, label:'Master', icon:'👑'},
    {level:5,points:700, label:'Legend', icon:'🌟'},
  ],
};

// ── Misc features ─────────────────────────────────────────
const FEATURES = {
  DAILY_MISSIONS: [
    {id:'d1',descKey:'missionWin2',   target:2,reward:25,xp:25,type:'wins'},
    {id:'d2',descKey:'missionPlay3',  target:3,reward:15,xp:15,type:'games'},
    {id:'d3',descKey:'missionHard',   target:1,reward:30,xp:30,type:'hard_win'},
    {id:'d4',descKey:'missionUltimate',target:1,reward:20,xp:20,type:'variant'},
    {id:'d5',descKey:'missionWild',   target:1,reward:20,xp:20,type:'variant'},
    {id:'d6',descKey:'missionStreak3',target:3,reward:50,xp:50,type:'streak'},
    {id:'d7',descKey:'missionRandom', target:1,reward:15,xp:15,type:'variant'},
  ],
  DAILY_CHALLENGES: [
    {day:1, variantId:'classic',    type:'wins',  target:3,desc:'Win 3 Classic games',    reward:{credits:50, xp:100}},
    {day:2, variantId:'ultimate',   type:'wins',  target:1,desc:'Win 1 Ultimate game',    reward:{credits:60, xp:120}},
    {day:3, variantId:'wild',       type:'draws', target:1,desc:'Make a draw in Wild',    reward:{credits:40, xp:80 }},
    {day:4, variantId:'classic_4x4',type:'wins',  target:2,desc:'Win 2 games of 4×4',    reward:{credits:55, xp:110}},
    {day:5, variantId:'misere',     type:'wins',  target:1,desc:'Win 1 Misère game',      reward:{credits:65, xp:130}},
    {day:6, variantId:'classic_5x5',type:'wins',  target:1,desc:'Win 1 game of 5×5',     reward:{credits:60, xp:120}},
    {day:7, variantId:'order_chaos',type:'wins',  target:1,desc:'Win 1 Order & Chaos',    reward:{credits:70, xp:140}},
    {day:8, variantId:'classic',    type:'wins',  target:5,desc:'Win 5 Classic games',    reward:{credits:80, xp:160}},
    {day:9, variantId:'random',     type:'wins',  target:2,desc:'Win 2 Random games',     reward:{credits:75, xp:150}},
    {day:10,variantId:'wild',       type:'wins',  target:2,desc:'Win 2 Wild games',       reward:{credits:70, xp:140}},
    {day:11,variantId:'classic_4x4',type:'wins',  target:3,desc:'Win 3 games of 4×4',    reward:{credits:75, xp:150}},
    {day:12,variantId:'misere',     type:'wins',  target:2,desc:'Win 2 Misère games',     reward:{credits:80, xp:160}},
    {day:13,variantId:'ultimate',   type:'wins',  target:1,desc:'Win without any draw',   reward:{credits:85, xp:170}},
    {day:14,variantId:'classic',    type:'wins',  target:1,desc:'Win in under 10 moves',  reward:{credits:90, xp:180}},
    {day:15,variantId:'order_chaos',type:'draws', target:1,desc:'Force a draw as Chaos',  reward:{credits:100,xp:200}},
  ],
  GHOST_REPLAY_ENABLED:    true,
  GHOST_REPLAY_MAX_SAVED:     5,
  GHOST_REPLAY_SPEED_OPTIONS: [0.5,1,2,3],
  NAME_CHANGE_FREE_MAX:       2,
  NAME_CHANGE_FREE_DAYS:      2,
  NAME_CHANGE_PAID_INGOTS:    5,
  RAGE_QUIT_WINDOW:           5,
  RAGE_QUIT_THRESHOLD:       0.5,
  RAGE_QUIT_BAN_MINUTES:     60,
  MONTHLY_PRIZE_ENABLED:    true,
  MONTHLY_PRIZE_MIN_GAMES:    10,
  MONTHLY_PRIZE_INGOTS: {1:100,2:60,3:40,4:25,5:20,6:15,7:12,8:10,9:8,10:8},
  MONTHLY_PRIZE_LEAGUE_BONUS: {
    bronze:{1:5,2:3,3:2},silver:{1:10,2:7,3:5},gold:{1:20,2:15,3:10},
    diamond:{1:35,2:25,3:15},legend:{1:60,2:40,3:25},
  },
  INGOT_PACKAGES: [
    {id:'i10', ingots:10, eur:0.99,savings:null,      popular:false,best:false},
    {id:'i50', ingots:50, eur:3.99,savings:'Save 20%',popular:true, best:false},
    {id:'i70', ingots:70, eur:5.99,savings:'Save 28%',popular:false,best:false},
    {id:'i100',ingots:100,eur:7.99,savings:'Save 34%',popular:false,best:true },
  ],
  SHOP_ITEMS: [
    {id:'noads_m',  cat:'sub',    ingots:0, eur:0.99,label:'No Ads',     desc:'Remove all ads for 1 month', icon:'⚡',unlockLevel:1},
    {id:'vip_m',    cat:'sub',    ingots:0, eur:3.99,label:'VIP',         desc:'Everything + 10 ingots/mo',  icon:'👑',unlockLevel:1},
    {id:'emo_fire', cat:'emotion',ingots:5, eur:null,label:'Fire Pack',   desc:'🔥⚡☄️🌋💥',              icon:'🔥',unlockLevel:1},
    {id:'emo_animal',cat:'emotion',ingots:5,eur:null,label:'Animal Pack', desc:'🦁🐯🦊🐉🦅',              icon:'🦁',unlockLevel:1},
    {id:'emo_cyber',cat:'emotion',ingots:5, eur:null,label:'Cyber Pack',  desc:'🤖👽👻👿😇',              icon:'🤖',unlockLevel:1},
    {id:'avt_pack', cat:'avatar', ingots:8, eur:null,label:'Avatar Pack', desc:'5 exclusive avatars',      icon:'🎨',unlockLevel:1},
    {id:'brd_neon', cat:'board',  ingots:10,eur:null,label:'Neon Theme',  desc:'Glowing neon board',       icon:'🌈',unlockLevel:1},
    {id:'clan_create',cat:'clan', ingots:3, eur:null,label:'Create Clan', desc:'Found your own clan',      icon:'⚔️',unlockLevel:5},
  ],
  AVATARS: [
    {id:'m1',gender:'male',  emoji:'👦',label:'Boy',    unlockLevel:1 },
    {id:'f1',gender:'female',emoji:'👧',label:'Girl',   unlockLevel:1 },
    {id:'n1',gender:'other', emoji:'🧑',label:'Person', unlockLevel:1 },
    {id:'m2',gender:'male',  emoji:'🧔',label:'Man',    unlockLevel:5 },
    {id:'f2',gender:'female',emoji:'👩',label:'Woman',  unlockLevel:5 },
    {id:'m3',gender:'male',  emoji:'🧙\u200d♂️',label:'Wizard M',unlockLevel:20},
    {id:'f3',gender:'female',emoji:'🧙\u200d♀️',label:'Wizard F',unlockLevel:20},
    {id:'n2',gender:'other', emoji:'🤖',label:'Robot',  unlockLevel:25},
    {id:'n3',gender:'other', emoji:'👽',label:'Alien',  unlockLevel:30},
    {id:'n4',gender:'other', emoji:'🦁',label:'Lion',   unlockLevel:50},
  ],
  PIECE_UNLOCKS: [
    {level:1,   type:'emoji',id:'x_def', label:'X Classic', value:'X',   rarity:'common'   },
    {level:1,   type:'emoji',id:'o_def', label:'O Classic', value:'O',   rarity:'common'   },
    {level:1,   type:'emoji',id:'fire',  label:'Fire 🔥',    value:'🔥',  rarity:'common',  bonus:'first_access'},
    {level:2,   type:'emoji',id:'sparkle',label:'Sparkle',  value:'✨',  rarity:'common'   },
    {level:3,   type:'emoji',id:'star',  label:'Star',      value:'⭐',  rarity:'common'   },
    {level:4,   type:'emoji',id:'bolt',  label:'Lightning', value:'⚡',  rarity:'common'   },
    {level:5,   type:'emoji',id:'rocket',label:'Rocket',    value:'🚀',  rarity:'common'   },
    {level:6,   type:'emoji',id:'gem',   label:'Gem',       value:'💎',  rarity:'common'   },
    {level:7,   type:'emoji',id:'skull', label:'Skull',     value:'💀',  rarity:'common'   },
    {level:8,   type:'emoji',id:'crown', label:'Crown',     value:'👑',  rarity:'common'   },
    {level:9,   type:'emoji',id:'target',label:'Target',    value:'🎯',  rarity:'common'   },
    {level:10,  type:'photo',id:'face',  label:'Your Face 📸',value:'PHOTO',rarity:'rare'  },
    {level:11,  type:'emoji',id:'lion',  label:'Lion',      value:'🦁',  rarity:'rare'     },
    {level:12,  type:'emoji',id:'tiger', label:'Tiger',     value:'🐯',  rarity:'rare'     },
    {level:13,  type:'emoji',id:'fox',   label:'Fox',       value:'🦊',  rarity:'rare'     },
    {level:14,  type:'emoji',id:'wolf',  label:'Wolf',      value:'🐺',  rarity:'rare'     },
    {level:15,  type:'emoji',id:'dragon',label:'Dragon',    value:'🐉',  rarity:'rare'     },
    {level:20,  type:'emoji',id:'sword', label:'Sword',     value:'⚔️',  rarity:'epic'     },
    {level:25,  type:'emoji',id:'robot', label:'Robot',     value:'🤖',  rarity:'epic'     },
    {level:30,  type:'emoji',id:'comet', label:'Comet',     value:'☄️',  rarity:'legendary'},
    {level:50,  type:'emoji',id:'inf',   label:'Infinity',  value:'♾️',  rarity:'legendary'},
    {level:100, type:'emoji',id:'lv100', label:'Master',    value:'🌟',  rarity:'legendary'},
    {level:150, type:'emoji',id:'angel', label:'Angel',     value:'😇',  rarity:'legendary'},
    {level:200, type:'emoji',id:'devil', label:'Devil',     value:'😈',  rarity:'legendary'},
    {level:300, type:'emoji',id:'phoenix',label:'Phoenix',  value:'🦅',  rarity:'legendary'},
    {level:500, type:'emoji',id:'galaxy',label:'Galaxy',    value:'🌌',  rarity:'legendary'},
    {level:750, type:'emoji',id:'alien', label:'Alien',     value:'👽',  rarity:'legendary'},
    {level:1000,type:'emoji',id:'lv1000',label:'Grandmaster',value:'💠', rarity:'mythic'   },
    {level:1500,type:'emoji',id:'lv1500',label:'Mythic',    value:'🔮',  rarity:'mythic'   },
    {level:2000,type:'emoji',id:'lv2000',label:'Transcendent',value:'⚜️',rarity:'mythic'   },
    {level:3000,type:'emoji',id:'lv3000',label:'Cosmic',    value:'🌠',  rarity:'mythic'   },
    {level:5000,type:'emoji',id:'lv5000',label:'Eternal',   value:'🧿',  rarity:'mythic'   },
    {level:9999,type:'emoji',id:'lv9999',label:'The One',   value:'🏵️',  rarity:'mythic'   },
  ],
};

// ── CONFIG FINALE — aggregato unico ────────────────────────
// Tutto il progetto importa questo oggetto.
// Le sottochiavi di config/* sono sparse nel CONFIG flat per backward compat.
const CONFIG = {
  ...APP,
  ...economy,
  ...adsConfig,
  ...liveops,
  ...AI_CONFIG,
  ...ELO_CONFIG,
  ...CLAN_CONFIG,
  ...GAMEPLAY,
  ...FEATURES,
  ...FEATURE_FLAGS,   // last — highest priority, never overridden
  GAME_VARIANTS,
  VARIANT_ORDER,
  LONG_VARIANTS,
  FIREBASE_CONFIG: integrations.FIREBASE_CONFIG,
  FIREBASE_ENABLED: integrations.FIREBASE_ENABLED,
  // Facebook Login rimosso — decisione architetturale definitiva
};

export default CONFIG;
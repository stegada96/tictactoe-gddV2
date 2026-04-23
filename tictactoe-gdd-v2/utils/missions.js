// utils/missions.js v5 — FINALE COMPLETO
// ✅ Missioni SEMPRE (alltime) dalla tabella Excel fornita
// ✅ Win streak online/AI separati, per variante e totale
// ✅ claimMission restituisce credits + XP + badge + ingots
// ✅ Persistenza AsyncStorage, reset mezzanotte Roma
// ✅ Missioni non riscattate = PERSE al reset daily/weekly/monthly

import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = '@tttgdd_missions_v5';

export const MISSION_TYPES = {
  GAMES_PLAYED:   'games_played',
  WINS:           'wins',
  LOSSES:         'losses',
  DRAWS:          'draws',
  STREAK:         'streak',
  ONLINE_WINS:    'online_wins',
  AI_WINS:        'ai_wins',
  ONLINE_STREAK:  'online_streak',
  AI_STREAK:      'ai_streak',
  QUICK_PLAY:     'quick_play',
  REMATCH:        'rematch',
  NO_QUIT:        'no_quit',
  VARIANT_WINS:   'variant_wins',
  VARIANT_STREAK: 'variant_streak',
  VARIANT_GAMES:  'variant_games',
};
const T = MISSION_TYPES;

const r = (credits = 0, xp = 0, badge = null, ingots = 0) => ({ credits, xp, badge, ingots });
const mk = (id, type, target, reward, period, variantId = null) => ({
  id, type, target, reward, period, variantId,
  progress: 0, completed: false, claimed: false,
});

// ── DAILY ─────────────────────────────────────────────────
export const DAILY_MISSIONS = [
  mk('d_play_3',     T.GAMES_PLAYED,  3,  r(15,15),  'daily'),
  mk('d_play_5',     T.GAMES_PLAYED,  5,  r(25,25),  'daily'),
  mk('d_win_3',      T.WINS,          3,  r(20,20),  'daily'),
  mk('d_win_5',      T.WINS,          5,  r(35,35),  'daily'),
  mk('d_ai_win',     T.AI_WINS,       1,  r(10,10),  'daily'),
  mk('d_ai_win_3',   T.AI_WINS,       3,  r(25,25),  'daily'),
  mk('d_streak_3',   T.STREAK,        3,  r(40,40),  'daily'),
  mk('d_draw',       T.DRAWS,         1,  r(10,10),  'daily'),
  mk('d_classic',    T.VARIANT_WINS,  3,  r(15,15),  'daily', 'classic'),
  mk('d_wild',       T.VARIANT_WINS,  1,  r(20,20),  'daily', 'wild'),
  mk('d_random',     T.VARIANT_WINS,  1,  r(20,20),  'daily', 'random'),
  mk('d_noquit_3',   T.NO_QUIT,       3,  r(30,30),  'daily'),
  mk('d_online_1',   T.ONLINE_WINS,   1,  r(25,25),  'daily'),
  mk('d_online_3',   T.ONLINE_WINS,   3,  r(40,40),  'daily'),
  mk('d_ostreak_2',  T.ONLINE_STREAK, 2,  r(50,50),  'daily'),
  mk('d_aistreak_2', T.AI_STREAK,     2,  r(40,40),  'daily'),
  mk('d_ultimate',   T.VARIANT_WINS,  1,  r(25,25),  'daily', 'ultimate'),
  mk('d_misere',     T.VARIANT_WINS,  1,  r(20,20),  'daily', 'misere'),
];

// ── WEEKLY ────────────────────────────────────────────────
export const WEEKLY_MISSIONS = [
  mk('w_play_25',    T.GAMES_PLAYED,  25, r(100,100),'weekly'),
  mk('w_play_50',    T.GAMES_PLAYED,  50, r(200,200),'weekly'),
  mk('w_win_15',     T.WINS,          15, r(120,120),'weekly'),
  mk('w_win_25',     T.WINS,          25, r(200,200),'weekly'),
  mk('w_online_5',   T.ONLINE_WINS,   5,  r(150,150),'weekly'),
  mk('w_online_10',  T.ONLINE_WINS,   10, r(250,250),'weekly'),
  mk('w_ostreak_5',  T.ONLINE_STREAK, 5,  r(200,200),'weekly'),
  mk('w_aistreak_5', T.AI_STREAK,     5,  r(180,180),'weekly'),
  mk('w_streak_5',   T.STREAK,        5,  r(200,200),'weekly'),
  mk('w_ai_hard',    T.AI_WINS,       5,  r(150,150),'weekly'),
  mk('w_rematch_3',  T.REMATCH,       3,  r(80,80),  'weekly'),
  mk('w_noquit_10',  T.NO_QUIT,       10, r(150,150),'weekly'),
  mk('w_ultimate_5', T.VARIANT_WINS,  5,  r(150,150),'weekly', 'ultimate'),
  mk('w_misere_3',   T.VARIANT_WINS,  3,  r(100,100),'weekly', 'misere'),
  mk('w_random_5',   T.VARIANT_WINS,  5,  r(100,100),'weekly', 'random'),
  mk('w_draws_5',    T.DRAWS,         5,  r(80,80),  'weekly'),
  mk('w_c_str_3',    T.VARIANT_STREAK,3,  r(120,120),'weekly', 'classic'),
  mk('w_u_str_2',    T.VARIANT_STREAK,2,  r(150,150),'weekly', 'ultimate'),
];

// ── MONTHLY ───────────────────────────────────────────────
export const MONTHLY_MISSIONS = [
  mk('mo_play_100',  T.GAMES_PLAYED,  100, r(500,500), 'monthly'),
  mk('mo_play_200',  T.GAMES_PLAYED,  200, r(1000,1000),'monthly'),
  mk('mo_win_50',    T.WINS,          50,  r(500,500), 'monthly'),
  mk('mo_win_100',   T.WINS,          100, r(1000,1000),'monthly'),
  mk('mo_online_25', T.ONLINE_WINS,   25,  r(800,800), 'monthly'),
  mk('mo_ostr_10',   T.ONLINE_STREAK, 10,  r(1000,1000),'monthly'),
  mk('mo_aistr_10',  T.AI_STREAK,     10,  r(800,800), 'monthly'),
  mk('mo_streak_10', T.STREAK,        10,  r(1000,1000),'monthly'),
  mk('mo_quick_10',  T.QUICK_PLAY,    10,  r(300,300), 'monthly'),
  mk('mo_noquit_25', T.NO_QUIT,       25,  r(500,500), 'monthly'),
  mk('mo_rematch_10',T.REMATCH,       10,  r(400,400), 'monthly'),
  mk('mo_c_str_5',   T.VARIANT_STREAK,5,   r(500,500), 'monthly', 'classic'),
  mk('mo_u_str_5',   T.VARIANT_STREAK,5,   r(600,600), 'monthly', 'ultimate'),
  mk('mo_wild_10',   T.VARIANT_WINS,  10,  r(400,400), 'monthly', 'wild'),
  mk('mo_misere_10', T.VARIANT_WINS,  10,  r(400,400), 'monthly', 'misere'),
  mk('mo_4x4_15',    T.VARIANT_WINS,  15,  r(350,350), 'monthly', 'classic_4x4'),
  mk('mo_5x5_10',    T.VARIANT_WINS,  10,  r(400,400), 'monthly', 'classic_5x5'),
  mk('mo_chaos_5',   T.VARIANT_WINS,  5,   r(500,500), 'monthly', 'order_chaos'),
];

// ── SEMPRE (ALLTIME) — tabella Excel fornita ──────────────
const GAMES_TABLE = [
  [5,5,1],[10,10,1],[20,20,1],[30,30,1],[40,40,1],[50,50,1],
  [75,75,1],[100,100,10],[125,25,1],[150,50,1],[200,100,10],
  [250,50,1],[300,100,10],[350,50,1],[400,100,10],[450,50,1],
  [500,100,10],[550,50,1],[600,100,10],[650,50,1],[700,100,10],
  [750,50,1],[800,100,10],[850,50,1],[900,100,10],[950,50,1],
  [1000,200,20],[1100,25,1],[1200,25,1],[1300,25,1],[1400,25,1],
  [1500,25,1],[1600,25,1],[1700,25,1],[1800,25,1],[1900,25,1],
  [2000,200,10],[2200,25,1],[2400,25,1],[2600,25,1],[2800,25,1],
  [3000,25,1],[3200,25,1],[3400,25,1],[3600,25,1],[3800,25,1],
  [4000,200,10],[4200,25,1],[4400,25,1],[4600,25,1],[4800,25,1],
  [5000,200,10],[6000,50,1],[7000,50,1],[8000,50,1],[9000,50,1],
  [10000,200,50],[11000,50,1],[12000,50,1],[13000,50,1],[14000,50,1],
  [15000,50,1],[20000,200,10],[25000,50,1],[30000,200,10],
  [40000,200,10],[50000,200,10],[60000,200,10],[70000,200,10],
  [80000,200,10],[90000,200,10],[100000,200,100],
];

// Win streak alltime TOTALE
const STREAK_TOT = [
  [2,20,5],[3,30,5],[5,60,10],[7,100,15],[10,150,20],
  [15,250,30],[20,400,50],[25,500,60],[30,600,80],[40,800,100],
  [50,1000,150],[75,1500,200],[100,2000,300],[150,2500,400],
  [200,3000,500],[500,5000,1000],[1000,10000,2000],
];

// Win streak ONLINE
const STREAK_ONL = [
  [2,25,5],[3,40,8],[5,80,15],[7,120,20],[10,200,30],
  [15,300,40],[20,500,60],[25,700,80],[30,900,100],[50,1500,200],
  [100,3000,400],[200,5000,800],[500,8000,1500],[1000,15000,3000],
];

// Win streak AI
const STREAK_AI_ = [
  [2,20,5],[3,35,7],[5,70,12],[7,100,18],[10,180,25],
  [15,270,35],[20,450,55],[30,800,90],[50,1200,150],
  [100,2500,350],[200,4000,700],[500,7000,1200],[1000,12000,2500],
];

// Win streak per variante
const VARIANTS_STR = ['classic','ultimate','random','classic_4x4','classic_5x5','misere','wild','order_chaos'];
const STREAK_VAR = [
  [3,30,5],[5,60,10],[10,150,20],[20,400,50],[30,600,80],
  [50,1000,150],[100,2000,300],[200,3500,500],[500,6000,1000],[1000,10000,2000],
];

export const ALLTIME_MISSIONS = [
  ...GAMES_TABLE.map(([n,cr,xp]) => mk(`at_g_${n}`, T.GAMES_PLAYED, n, r(cr,xp), 'alltime')),
  ...STREAK_TOT.map(([n,cr,xp]) => mk(`at_s_${n}`, T.STREAK, n, r(cr,xp), 'alltime')),
  ...STREAK_ONL.map(([n,cr,xp]) => mk(`at_os_${n}`, T.ONLINE_STREAK, n, r(cr,xp), 'alltime')),
  ...STREAK_AI_.map(([n,cr,xp]) => mk(`at_as_${n}`, T.AI_STREAK, n, r(cr,xp), 'alltime')),
  ...VARIANTS_STR.flatMap(vid =>
    STREAK_VAR.map(([n,cr,xp]) => mk(`at_${vid}_s_${n}`, T.VARIANT_STREAK, n, r(cr,xp), 'alltime', vid))
  ),
];

// ── STORE ─────────────────────────────────────────────────
let _store = null, _loaded = false;
const defStore = () => ({
  daily:{}, weekly:{}, monthly:{}, alltime:{},
  lastResetDaily:null, lastResetWeekly:null, lastResetMonthly:null,
  completedCount:0,
});
const persist = async () => { try { await AsyncStorage.setItem(KEY, JSON.stringify(_store)); } catch(e){} };
export const loadMissions = async () => {
  if (_loaded && _store) return;
  try {
    const raw = await AsyncStorage.getItem(KEY);
    _store = raw ? { ...defStore(), ...JSON.parse(raw) } : defStore();
  } catch(e) { _store = defStore(); }
  _loaded = true;
};
const getStore = () => { if (!_store) _store = defStore(); return _store; };

// ── ORA ROMA ─────────────────────────────────────────────
const getRome = () => {
  const now = new Date();
  const utc = now.getTime() + now.getTimezoneOffset()*60000;
  const off = (now.getUTCMonth()>=3 && now.getUTCMonth()<=9) ? 2 : 1;
  return new Date(utc + off*3600000);
};

// ── RESET ────────────────────────────────────────────────
export const checkResets = async () => {
  const s = getStore();
  const rome = getRome();
  const today = rome.toDateString();
  const week  = `${rome.getFullYear()}-W${Math.ceil(rome.getDate()/7)}`;
  const month = `${rome.getFullYear()}-${rome.getMonth()}`;
  let changed = false;
  if (s.lastResetDaily !== today) {
    s.lastResetDaily = today;
    DAILY_MISSIONS.forEach(mi => { s.daily[mi.id]={progress:0,completed:false,claimed:false}; });
    changed = true;
  }
  if (s.lastResetWeekly !== week) {
    s.lastResetWeekly = week;
    WEEKLY_MISSIONS.forEach(mi => { s.weekly[mi.id]={progress:0,completed:false,claimed:false}; });
    changed = true;
  }
  if (s.lastResetMonthly !== month) {
    s.lastResetMonthly = month;
    MONTHLY_MISSIONS.forEach(mi => { s.monthly[mi.id]={progress:0,completed:false,claimed:false}; });
    changed = true;
  }
  if (changed) await persist();
};

// ── AGGIORNA PROGRESSO ────────────────────────────────────
export const updateMissionProgress = async (variantKey, delta, extra={}) => {
  await loadMissions();
  await checkResets();
  const s = getStore();
  const newlyCompleted = [];
  const mode     = extra.mode || 'ai';
  const isOnline = mode === 'online';
  const isAI     = mode === 'ai';
  const isWin    = extra.result === 'win';
  const streak   = extra.currentStreak || 0;

  const upd = (missions, store) => {
    missions.forEach(mi => {
      const st = store[mi.id] || {progress:0,completed:false,claimed:false};
      if (st.completed || st.claimed) return;
      let add = 0;
      switch(mi.type) {
        case T.GAMES_PLAYED:   add = delta.gamesPlayed || 0; break;
        case T.WINS:           add = isWin ? 1 : 0; break;
        case T.ONLINE_WINS:    add = (isOnline && isWin) ? 1 : 0; break;
        case T.AI_WINS:        add = (isAI && isWin) ? 1 : 0; break;
        case T.DRAWS:          add = extra.result==='draw' ? 1 : 0; break;
        case T.NO_QUIT:        add = extra.noQuit ? 1 : 0; break;
        case T.REMATCH:        add = extra.rematch ? 1 : 0; break;
        case T.QUICK_PLAY:     add = extra.quickPlay ? 1 : 0; break;
        case T.VARIANT_WINS:   add = (mi.variantId===variantKey && isWin) ? 1 : 0; break;
        case T.VARIANT_GAMES:  add = mi.variantId===variantKey ? 1 : 0; break;
        case T.STREAK:
          if (streak >= mi.target) { st.progress=mi.target; st.completed=true; newlyCompleted.push({...mi}); store[mi.id]=st; return; }
          break;
        case T.ONLINE_STREAK:
          if (isOnline && streak >= mi.target) { st.progress=mi.target; st.completed=true; newlyCompleted.push({...mi}); store[mi.id]=st; return; }
          break;
        case T.AI_STREAK:
          if (isAI && streak >= mi.target) { st.progress=mi.target; st.completed=true; newlyCompleted.push({...mi}); store[mi.id]=st; return; }
          break;
        case T.VARIANT_STREAK:
          if (mi.variantId===variantKey && streak >= mi.target) { st.progress=mi.target; st.completed=true; newlyCompleted.push({...mi}); store[mi.id]=st; return; }
          break;
      }
      if (add > 0) {
        st.progress = Math.min((st.progress||0)+add, mi.target);
        if (st.progress >= mi.target) { st.completed=true; newlyCompleted.push({...mi}); s.completedCount=(s.completedCount||0)+1; }
        store[mi.id] = st;
      }
    });
  };

  upd(DAILY_MISSIONS,   s.daily);
  upd(WEEKLY_MISSIONS,  s.weekly);
  upd(MONTHLY_MISSIONS, s.monthly);
  upd(ALLTIME_MISSIONS, s.alltime);
  await persist();
  return newlyCompleted;
};

// ── RISCATTA ─────────────────────────────────────────────
export const claimMission = async (id, period) => {
  await loadMissions();
  const s   = getStore();
  const st  = s[period]?.[id];
  if (!st?.completed || st.claimed) return null;
  const allMap = { daily:DAILY_MISSIONS, weekly:WEEKLY_MISSIONS, monthly:MONTHLY_MISSIONS, alltime:ALLTIME_MISSIONS };
  const mi = (allMap[period]||[]).find(x=>x.id===id);
  if (!mi) return null;
  st.claimed = true;
  s[period][id] = st;
  await persist();
  return mi.reward; // { credits, xp, badge, ingots }
};

// ── LEGGI ────────────────────────────────────────────────
export const getMissionsWithState = (period='daily') => {
  const s = getStore();
  const allMap = { daily:DAILY_MISSIONS, weekly:WEEKLY_MISSIONS, monthly:MONTHLY_MISSIONS, alltime:ALLTIME_MISSIONS };
  return (allMap[period]||[]).map(mi => ({ ...mi, ...(s[period]?.[mi.id]||{}) }));
};

export const hasUnclaimedMissions = () => {
  const s = getStore();
  const chk = (mis, store) => mis.some(mi => store[mi.id]?.completed && !store[mi.id]?.claimed);
  return chk(DAILY_MISSIONS,s.daily||{}) || chk(WEEKLY_MISSIONS,s.weekly||{})
      || chk(MONTHLY_MISSIONS,s.monthly||{}) || chk(ALLTIME_MISSIONS,s.alltime||{});
};

export const getTotalCompletedCount = () => (getStore().completedCount||0);
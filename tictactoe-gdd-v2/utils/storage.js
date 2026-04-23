// utils/storage.js v4 — Persistenza completa con AsyncStorage
// Per produzione: impostare CONFIG.DEBUG = false per disattivare log verbose.
// ✅ Sopravvive a: force-stop, swipe via, riavvio telefono
// ✅ Sopravvive a reinstallazione SE Google Backup è attivo su Android
// ✅ Firebase aggiungerà backup cloud nella Fase 2

import AsyncStorage from '@react-native-async-storage/async-storage';
import CONFIG from '../config';
import { logCredit, logError, log } from './debug';
import { checkAchievements } from './achievements';
import { updateMissionProgress } from './missions';
import { xpToLevel } from './xpUtils';
import { isRewardEligible, getXpForResult, getCreditsForResult } from './rewardEligibility';

// ── CHIAVI ASYNCSTORAGE ───────────────────────────────────
const KEY_STORE   = '@tttgdd_store_v4';
const KEY_PLAYER  = '@tttgdd_player_v4';
const KEY_STATS   = '@tttgdd_stats_v4';
const KEY_MISSIONS= '@tttgdd_missions_v4';

// ── STORE IN-MEMORY (cache) ───────────────────────────────
// Tutti i dati vengono letti da AsyncStorage all'avvio
// e scritti su AsyncStorage ad ogni modifica
let _store = null;
let _loaded = false;

const defaultStore = () => ({
  credits:            CONFIG.CREDITS_START,
  ingots:             0,
  lastRegen:          Date.now(),
  lastDaily:          null,
  videosToday:        0,
  videosTodayDate:    null,
  inviteUntil:        null,
  totalCreditsEarned: 0,
  gamesPlayedSession: 0,
  lastAdShownTime:    0,
  language:           null,
  theme:              'light',
  stats:              {},
  settings: {
    soundFX:true, music:true, vibration:true,
    notifDaily:true, notifCredits:true, notifTournament:true,
    profilePublic:true,
  },
  player: {
    id:             `guest_${Math.floor(Math.random()*900000+100000)}`,
    name:           null,
    level:          1,
    xp:             0,
    eloAI:          CONFIG.ELO_AI_START    || 500,
    eloOnline:      CONFIG.ELO_ONLINE_START|| 500,
    avatarId:       'n1',
    gender:         'other',
    facePhotoUri:   null,
    selectedPieceX: 'X',
    selectedPieceO: 'O',
    unlockedPieces: ['x_def','o_def'],
    noAds:          false,
    vip:            false,
    onboardingDone: false,
    lastNameChange: null,
    quitCount:      0,
    rematchAccepted:0,
    quickPlayGames: 0,
    nightGames:     0,
    loginType:      'guest',
    lastOnline:     Date.now(),
    // Nuovo: data nascita per compleanno
    birthDate:      null,
    birthdayActive: false,
    // Segnalazioni
    reportCount:    0,
    moderationScore:0,
    // Privacy & acquisti
    privacyAccepted:  false,
    noAdsPermanent:   false,
    noAdsMonth:       false,
  },
  // ── DAILY STREAK ─────────────────────────────────────────
  dailyStreak:      0,    // giorni consecutivi di login
  lastStreakDate:   null, // data ultimo streak (toDateString)
  bestStreak:       0,    // miglior streak di sempre
  streakClaimedToday: false, // evita doppio claim nella stessa sessione
  bonusDoubledToday: false,  // ha già guardato video per raddoppio bonus oggi
});

// ── PERSIST: salva tutto su AsyncStorage ──────────────────
const persist = async () => {
  if (!_store) return;
  try {
    await AsyncStorage.setItem(KEY_STORE, JSON.stringify(_store));
  } catch (e) {
    logError('storage.persist', e.message);
  }
};

// ── LOAD: carica da AsyncStorage all'avvio ────────────────
export const loadStore = async () => {
  if (_loaded && _store) return _store;
  try {
    const raw = await AsyncStorage.getItem(KEY_STORE);
    if (raw) {
      const saved = JSON.parse(raw);
      // Merge con defaultStore per aggiungere nuovi campi
      const defaults = defaultStore();
      _store = {
        ...defaults,
        ...saved,
        player:   { ...defaults.player,   ...(saved.player   || {}) },
        settings: { ...defaults.settings, ...(saved.settings || {}) },
        stats:    saved.stats || {},
      };
      log('INFO', 'storage', `Dati caricati: cr=${_store.credits} lv=${_store.player?.level}`);
    } else {
      _store = defaultStore();
      log('INFO', 'storage', 'Nessun salvataggio trovato — primo accesso');
    }
  } catch (e) {
    logError('storage.loadStore', e.message);
    _store = defaultStore();
  }
  _loaded = true;
  return _store;
};

// ── GETTER STORE (con auto-load) ──────────────────────────
// Esportato: ads.js lo importa staticamente (no dynamic import, no ciclicità)
export const getStore = () => {
  if (!_store) _store = defaultStore();
  return _store;
};

// ── HELPER XP → LIVELLO ──────────────────────────────────
// XP curve: vedi import in cima al file (xpUtils.js)

const defaultStats = () => ({
  wins:0, losses:0, draws:0, gamesPlayed:0,
  winStreak:0, lossStreak:0, bestStreak:0, drawStreak:0,
  xp:0, level:1,
  eloAI:    CONFIG.ELO_AI_START    || 500,
  eloOnline:CONFIG.ELO_ONLINE_START|| 500,
  onlineGames:0, onlineWins:0,
  aiGames:0, aiWins:0, aiHardWins:0,
  quickPlayGames:0, rematchAccepted:0,
  nightGames:0, dailyWins:0,
  variantsPlayed:0,
  totalCreditsEarned:0,
  avgGameTime:0, totalGameTime:0,
  // Record personali
  bestWinStreak: 0,
  longestGame:   0,
  fastestWin:    null,
  mostPlayedVariant: null,
});

// ── CREDITI ───────────────────────────────────────────────
// async per compatibilità future API — attualmente sync (legge da cache in-memory)
export const getCredits = async () => getStore().credits;

// setCredits: funzione tecnica low-level (es. reset, init, test).
// NON usarla per aggiungere crediti da gioco/video/missioni — usa addCredits() con il source corretto.
// Clamp a [0, ∞): nessun cap artificiale, chi chiama è responsabile del valore passato.
export const setCredits = async (amount) => {
  const s = getStore();
  s.credits = Math.max(0, amount);
  await persist();
  return s.credits;
};

export const spendCredits = async (amount) => {
  if (amount === 0) return true;
  const s = getStore();
  if (s.credits < amount) return false;
  s.credits -= amount;
  await persist();
  logCredit('spend', -amount, s.credits);
  return true;
};

export const addCredits = async (amount, source = 'misc') => {
  const s = getStore();
  // source='regen'   → capped al cap naturale 120 (rigenerazione passiva)
  // source='video','daily','levelup','event' → capped al wallet cap 999
  // tutto il resto → capped al wallet cap 999
  const isRegenOnly = source === 'regen';
  const isVideo     = source === 'video';

  if (isVideo) {
    // Video: nessun tetto oltre il wallet cap
    s.credits = Math.min((s.credits || 0) + amount, CONFIG.CREDITS_WALLET_CAP || 999);
    s.totalCreditsEarned = (s.totalCreditsEarned || 0) + amount;
    await persist();
    logCredit('add', amount, s.credits);
    return s.credits;
  }

  const cap = isRegenOnly ? 120 : (CONFIG.CREDITS_WALLET_CAP || 999);
  if (s.credits >= cap) return s.credits;
  s.credits = Math.min(s.credits + amount, cap);
  s.totalCreditsEarned = (s.totalCreditsEarned || 0) + amount;
  await persist();
  logCredit('add', amount, s.credits);
  return s.credits;
};

// Ricarica crediti passivi: +1 ogni 8 minuti, cap naturale 120.
// Bonus (level up, video, daily, eventi) possono superare il cap naturale.
export const regenCredits = async () => {
  const s   = getStore();
  const now = Date.now();
  const lastRegen = s.lastRegen || now;
  const REGEN_MIN = CONFIG.CREDITS_REGEN_MINUTES || 8;
  const SLOT_MS   = REGEN_MIN * 60 * 1000;                    // da config
  const REGEN_CAP = 120;                                      // cap passivo
  const elapsed8  = Math.floor((now - lastRegen) / SLOT_MS); // slot interi
  const toAdd     = elapsed8;
  if (toAdd <= 0) return s.credits;
  if ((s.credits || 0) < REGEN_CAP) {
    s.credits = Math.min((s.credits || 0) + toAdd, REGEN_CAP);
  }
  s.lastRegen = lastRegen + elapsed8 * SLOT_MS;
  await persist();
  return s.credits;
};

export const minutesToPlayable = (cost) => {
  const s       = getStore();
  const missing = Math.max(0, cost - (s.credits || 0));
  const regenMin = (typeof CONFIG !== 'undefined' && CONFIG.CREDITS_REGEN_MINUTES) || 8;
  return missing * regenMin;
};

// ── LINGOTTI ─────────────────────────────────────────────
// async per compatibilità future API — attualmente sync
export const getIngots = async () => getStore().ingots || 0;

export const addIngots = async (n) => {
  const s = getStore();
  s.ingots = (s.ingots || 0) + n;
  await persist();
  return s.ingots;
};


// ── ADD XP DIRETTO (per missioni, challenge, ecc.) ────────
export const addXP = async (amount) => {
  if (!amount || amount <= 0) return;
  const s           = getStore();
  const previousLevel = s.player.level || 1;  // snapshot PRIMA dell'update
  const previousXp    = s.player.xp    || 0;
  const newXp  = previousXp + amount;
  const newLv  = xpToLevel(newXp);
  s.player.xp    = newXp;
  s.player.level = newLv;
  s.stats['total'] = s.stats['total'] || defaultStats();
  s.stats['total'].xp    = newXp;
  s.stats['total'].level = newLv; // allineato con updateStats
  const leveledUp = newLv > previousLevel;
  // Sblocca skin per nuovo livello
  const toUnlock = (CONFIG.PIECE_UNLOCKS || [])
    .filter(u => u.level <= newLv && !s.player.unlockedPieces?.includes(u.id))
    .map(u => u.id);
  if (toUnlock.length > 0) s.player.unlockedPieces = [...(s.player.unlockedPieces||[]), ...toUnlock];
  await persist();
  // Level up bonus +50 (stesso comportamento di updateStats)
  if (leveledUp) await addCredits(CONFIG.CREDITS_LEVELUP_BONUS || 50, 'levelup');
  return { xp: newXp, level: newLv, levelUp: leveledUp, previousLevel,
           newLevel: leveledUp ? newLv : null };
};

export const spendIngots = async (n) => {
  const s = getStore();
  if ((s.ingots || 0) < n) return false;
  s.ingots -= n;
  await persist();
  return true;
};

// ── VIDEO ADS ─────────────────────────────────────────────
export const canWatchVideo = () => {
  const s = getStore();
  const today = new Date().toDateString();
  if (s.videosTodayDate !== today) return true;
  return (s.videosToday || 0) < (CONFIG.CREDITS_VIDEO_MAX_DAY || 18);
};

// recordVideoCount — incrementa SOLO il contatore giornaliero (senza aggiungere crediti).
// Da usare quando il reward viene gestito esternamente (es. post-game reward personalizzato).
export const recordVideoCount = async () => {
  const s = getStore();
  const today = new Date().toDateString();
  if (s.videosTodayDate !== today) { s.videosToday = 0; s.videosTodayDate = today; }
  s.videosToday = (s.videosToday || 0) + 1;
  await persist();
};

// recordVideoWatched — incrementa contatore E aggiunge CONFIG.CREDITS_VIDEO_REWARD crediti.
// Usata dal flow rewarded standard (non post-game personalizzato).
export const recordVideoWatched = async () => {
  await recordVideoCount();
  await addCredits(CONFIG.CREDITS_VIDEO_REWARD || 5, 'video');
};

// ── ADS HELPERS (esportati per ads.js senza import dinamico) ────────────
// ads.js li importa staticamente → nessuna dipendenza circolare, nessun getStore esposto
export const isAdsForbidden = () => {
  const p = getStore().player || {};
  return !!(p.noAds || p.noAdsPermanent || p.noAdsMonth || p.vip || p.birthdayActive);
};

export const getLifetimeGames = () => {
  return getStore().stats?.total?.gamesPlayed || 0;
};

// ── ADS ───────────────────────────────────────────────────
// shouldShowAd: esporta i valori che services/ads.js usa per decidere.
// La logica noAds/vip/birthday è ora centralizzata in services/ads.shouldShowAd.
// Questa funzione rimane per retrocompatibilità con il Modal locale di GameScreen.
export const shouldShowAd = () => {
  const s   = getStore();
  const now = Date.now();
  const minMs      = (CONFIG.ADS_MIN_MINUTES || 5) * 60 * 1000;
  const timePassed = (now - (s.lastAdShownTime || 0)) >= minMs;
  const gamesPassed = (s.gamesPlayedSession || 0) >= (CONFIG.ADS_GAMES_BETWEEN || 2);

  // Salta se l'utente ha no-ads / vip / compleanno attivo
  const p = s.player || {};
  if (p.noAds || p.noAdsPermanent || p.noAdsMonth || p.vip || p.birthdayActive) return false;

  return timePassed || gamesPassed;
};

// Espone i valori raw per services/ads.js.shouldShowAd (async, con grace period)
export const getAdsTriggerState = () => {
  const s = getStore();
  return {
    gamesPlayedSession: s.gamesPlayedSession || 0,
    lastAdShownTime:    s.lastAdShownTime    || 0,
  };
};

export const recordAdShown = async () => {
  const s = getStore();
  s.lastAdShownTime = Date.now();
  s.gamesPlayedSession = 0;
  await persist();
};

export const incrementGamesSession = async () => {
  const s = getStore();
  s.gamesPlayedSession = (s.gamesPlayedSession || 0) + 1;
  await persist();
  return s.gamesPlayedSession;
};

// ── PLAYER ────────────────────────────────────────────────
// async per compatibilità future API — attualmente sync
export const getPlayer = async () => {
  return { ...getStore().player };
};

export const savePlayer = async (data) => {
  const s = getStore();
  s.player = { ...s.player, ...data };
  await persist();
  return s.player;
};

export const saveLanguage = async (code) => {
  const s = getStore();
  s.language = code;
  s.player.language = code;
  await persist();
};

export const saveTheme = async (name) => {
  const s = getStore();
  s.theme = name;
  await persist();
};

export const getLanguage = () => getStore().language;
export const getThemePref = () => getStore().theme || 'light';

// ── LINGUA — source of truth unica ───────────────────────
// Priorità: store.language → player.language → null (App usa detectDeviceLanguage)
// Se trova solo player.language, lo riscrive su store.language in-memory
// (nessun persist qui — App.js fa persist al primo saveLanguage dopo boot)
// Pronto per futura sync cloud: store.language sarà il campo sincronizzato.
export const resolveInitialLanguage = () => {
  const s = getStore();
  if (s.language) return s.language;
  if (s.player?.language) {
    s.language = s.player.language; // riallinea in-memory
    return s.player.language;
  }
  return null;
};

// ── CAMBIO NOME (con cooldown 48h) ───────────────────────
export const canChangeName = () => {
  const s = getStore();
  const last = s.player?.lastNameChange;
  if (!last) return true;
  return (Date.now() - last) >= 48 * 3600 * 1000;
};

export const changeName = async (newName) => {
  const s = getStore();
  s.player.name = newName;
  s.player.lastNameChange = Date.now();
  await persist();
};

export const saveFacePhoto = async (uri) => {
  const s = getStore();
  s.player.facePhotoUri = uri;
  await persist();
};

// ── SELEZIONE PEDINA ─────────────────────────────────────
export const selectPiece = async (slot, itemId) => {
  const s = getStore();
  const unlocked = s.player.unlockedPieces || [];
  if (!unlocked.includes(itemId)) return false;
  const item = CONFIG.PIECE_UNLOCKS.find(u => u.id === itemId);
  if (!item) return false;
  if (slot === 'X') s.player.selectedPieceX = item.value;
  else              s.player.selectedPieceO = item.value;
  await persist();
  return true;
};

// ── STATISTICHE ───────────────────────────────────────────
export const getStats = async (variantKey = 'total') => {
  const s = getStore();
  return { ...(s.stats[variantKey] || defaultStats()) };
};

export const updateStats = async (variantKey, deltaOrMode, resultOrExtra = {}, difficulty = 'medium', gameDurationSec = 999, moveCount = 999) => {
  // Supporta ENTRAMBE le firme:
  // Vecchia: updateStats(variantKey, deltaObject, extraData)
  // Nuova (da GameScreen): updateStats(variantKey, mode, result, difficulty)
  let delta, extraData;
  if (typeof deltaOrMode === 'string') {
    // Nuova firma: deltaOrMode = mode ('ai'|'online'|'local'), resultOrExtra = result ('win'|'loss'|'draw')
    const mode   = deltaOrMode;
    const result = resultOrExtra;
    const isWin  = result === 'win';
    const isLoss = result === 'loss';
    const isDraw = result === 'draw';

    // Anti-farming + XP centralizzati in rewardEligibility.js
    const eligible = isRewardEligible({ mode, result, durationSec: gameDurationSec, moveCount, difficulty });
    let xpEarned = eligible.eligible
      ? getXpForResult({ mode, result, difficulty })
      : 0;
    const isFarmed = !eligible.eligible;

    // Calcola ELO
    const s0   = getStore();
    const tot0 = s0.stats['total'] || {};
    const curEloAI     = tot0.eloAI     || CONFIG.ELO_AI_START    || 500;
    const curEloOnline = tot0.eloOnline || CONFIG.ELO_ONLINE_START || 500;
    const calcElo = (elo, res) => {
      const K = 32;
      const exp = 1 / (1 + Math.pow(10, (500 - elo) / 400));
      const score = res==='win' ? 1 : res==='draw' ? 0.5 : 0;
      return Math.round(K * (score - exp));
    };

    // Crediti: centralizzati in rewardEligibility.js
    const creditsForWin = isFarmed ? 0
      : getCreditsForResult({ mode, result, difficulty, variantId: variantKey });

    delta = {
      gamesPlayed:  1,
      wins:         isWin  ? 1 : 0,
      losses:       isLoss ? 1 : 0,
      draws:        isDraw ? 1 : 0,
      winStreak:    isWin  ? 1 : -999,  // -999 = segnale reset
      lossStreak:   isLoss ? 1 : -999,
      drawStreak:   isDraw ? 1 : -999,
      xp:           xpEarned,
      credits:      creditsForWin,
      eloAI:        mode==='ai'     ? calcElo(curEloAI,     result) : 0,
      eloOnline:    mode==='online'  ? calcElo(curEloOnline, result) : 0,
      onlineGames:  mode==='online'  ? 1 : 0,
      onlineWins:   mode==='online'  && isWin ? 1 : 0,
      aiGames:      mode==='ai'      ? 1 : 0,
      aiWins:       mode==='ai'      && isWin ? 1 : 0,
      aiHardWins:   mode==='ai'      && isWin && difficulty==='hard' ? 1 : 0,
      nightGames:   new Date().getHours() < 6 ? 1 : 0,
      noQuitGames:  mode !== 'local' ? 1 : 0,
      dailyWins:    isWin ? 1 : 0,
    };
    extraData = { mode, difficulty, eventType: isWin?'wins':isDraw?'draws':'games_played' };
  } else {
    delta     = deltaOrMode;
    extraData = resultOrExtra;
  }
  const s   = getStore();
  const cur = s.stats[variantKey] || defaultStats();
  const tot = s.stats['total']    || defaultStats();

  const merge = (base, d) => {
    const r = { ...base };
    for (const [k, v] of Object.entries(d)) {
      if (typeof v === 'number') {
        if (k === 'winStreak') {
          r[k] = v === -999 ? 0 : (r[k] || 0) + v;
        } else if (k === 'lossStreak') {
          r[k] = v === -999 ? 0 : (r[k] || 0) + v;
        } else if (k === 'drawStreak') {
          r[k] = v === -999 ? 0 : (r[k] || 0) + v;
        } else if (k === 'eloAI' || k === 'eloOnline') {
          // ELO è delta, non assoluto
          r[k] = Math.max(100, (r[k] || CONFIG.ELO_AI_START || 500) + v);
        } else if (k === 'credits') {
          // credits: aggiungi separatamente, non accumulate in stats
        } else {
          r[k] = (r[k] || 0) + v;
        }
      } else {
        r[k] = v;
      }
    }
    // Aggiorna bestStreak
    if ((r.winStreak || 0) > (r.bestStreak || 0)) r.bestStreak = r.winStreak;
    return r;
  };

  // Salva il livello PRIMA del merge — confronto corretto post-update
  const previousLevel = s.player.level || 1;
  const previousXp    = s.player.xp    || 0;

  s.stats[variantKey] = merge(cur, delta);
  s.stats['total']    = merge(tot, delta);

  // XP → livello (calcolo da xp precedente + delta, non da tot che è già mergiato)
  const newXp = previousXp + (delta.xp || 0);
  const newLv = xpToLevel(newXp);
  s.player.xp    = newXp;
  s.player.level = newLv;
  // Aggiorna anche s.stats.total.level per coerenza
  s.stats['total'].level = newLv;
  s.player.eloAI    = s.stats['total'].eloAI    || CONFIG.ELO_AI_START;
  s.player.eloOnline= s.stats['total'].eloOnline|| CONFIG.ELO_ONLINE_START;

  // Level up check: confronta con previousLevel salvato PRIMA del merge
  const leveledUp = newLv > previousLevel;

  // Sblocca nuove skin in base al livello
  const toUnlock = (CONFIG.PIECE_UNLOCKS || [])
    .filter(u => u.level <= newLv && !s.player.unlockedPieces?.includes(u.id))
    .map(u => u.id);
  if (toUnlock.length > 0) {
    s.player.unlockedPieces = [...(s.player.unlockedPieces || []), ...toUnlock];
  }

  await persist();

  // Aggiungi crediti per vittoria (dal delta)
  if ((delta.credits||0) > 0) {
    await addCredits(delta.credits, 'game');
  }

  const xpEarned      = delta.xp || 0;
  const creditsEarned = delta.credits || 0;

  // Level Up bonus: +50 crediti — assegnato UNA sola volta perché previousLevel
  // è catturato prima dell'update e non cambia durante questa chiamata.
  if (leveledUp) {
    await addCredits(CONFIG.CREDITS_LEVELUP_BONUS || 50, 'levelup');
  }

  // Check achievement
  try { await checkAchievements(s.stats['total']); } catch(e) { /* intentionally ignored — achievements optional */ }
  // Check missioni
  try { await updateMissionProgress(variantKey, delta, extraData); } catch(e) { /* intentionally ignored — missions optional */ }

  return {
    ...s.stats[variantKey],
    xpEarned,
    creditsEarned,
    levelUp:       leveledUp,
    newLevel:      leveledUp ? newLv : null, // null se non leveled up → nessuna celebrazione
    previousLevel,
    newUnlocks:    toUnlock,
  };
};

// ── SETTINGS ─────────────────────────────────────────────
export const getSettings = async () => ({ ...getStore().settings });

export const saveSettings = async (data) => {
  const s = getStore();
  s.settings = { ...s.settings, ...data };
  await persist();
};

// ── DAILY BONUS ──────────────────────────────────────────
// STREAK_REWARDS[day-1] = crediti extra per quel giorno di streak (days 1-7, poi si ripete)
const STREAK_REWARDS = [5, 8, 12, 15, 20, 25, 35]; // giorno 1 → +5cr, giorno 7 → +35cr

export const claimDailyBonus = async () => {
  const s   = getStore();
  const today = new Date().toDateString();
  if (s.lastDaily === today) return false; // già reclamato oggi

  // Streak: se ieri era lastStreakDate → incrementa, altrimenti reset
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toDateString();

  let newStreak;
  if (s.lastStreakDate === yesterdayStr) {
    newStreak = (s.dailyStreak || 0) + 1;
  } else if (s.lastStreakDate === today) {
    newStreak = s.dailyStreak || 1; // stesso giorno, non incrementare
  } else {
    newStreak = 1; // streak rotto — ricomincia
  }

  s.dailyStreak        = newStreak;
  s.lastStreakDate     = today;
  s.lastDaily          = today;
  s.streakClaimedToday = true;
  s.bonusDoubledToday  = false; // reset per il nuovo giorno
  if (newStreak > (s.bestStreak || 0)) s.bestStreak = newStreak;

  // Reward base + bonus streak
  const baseCredits   = CONFIG.CREDITS_DAILY_BONUS || 12;
  const streakIdx     = Math.min(newStreak - 1, STREAK_REWARDS.length - 1);
  const streakBonus   = STREAK_REWARDS[streakIdx] || 5;
  const totalCredits  = baseCredits + streakBonus;

  await addCredits(totalCredits, 'daily');
  await persist();

  return { streak: newStreak, baseCredits, streakBonus, totalCredits };
};

// Getter pubblico per UI streak
export const getDailyStreak = () => ({
  streak:           getStore().dailyStreak || 0,
  bestStreak:       getStore().bestStreak  || 0,
  claimedToday:     getStore().streakClaimedToday || false,
  lastStreakDate:   getStore().lastStreakDate || null,
  bonusDoubledToday: getStore().bonusDoubledToday || false,
});

// Segna che il double bonus rewarded è stato usato oggi
export const markBonusDoubled = async () => {
  const s = getStore();
  s.bonusDoubledToday = true;
  await persist();
};

// Ogni notte reset bonusDoubledToday (chiamo in claimDailyBonus)
// Già resettato implicitamente perché claimDailyBonus controlla lastDaily === today

// ── COMPLEANNO ────────────────────────────────────────────
export const checkBirthday = async () => {
  const s = getStore();
  const birth = s.player?.birthDate;
  if (!birth || typeof birth !== 'string' || birth.length < 10) return false;

  // Parse ISO date string by splitting — avoids timezone UTC drift di new Date("YYYY-MM-DD")
  // new Date("YYYY-MM-DD") crea mezzanotte UTC, che in fusi orari ≠ UTC può risultare nel giorno sbagliato locale.
  const parts = birth.split('-');
  if (parts.length !== 3) return false;
  const [yyyy, mm, dd] = parts.map(Number);
  if (!yyyy || !mm || !dd || isNaN(yyyy) || isNaN(mm) || isNaN(dd)) return false;

  // Blocca date chiaramente invalide o anni improbabili
  if (yyyy < 1900 || yyyy > new Date().getFullYear() - 5) return false; // minimo 5 anni
  if (mm < 1 || mm > 12 || dd < 1 || dd > 31) return false;

  const today = new Date();
  // Confronto su giorno e mese in ora locale — non usare new Date(birth) per questo
  const isToday = dd === today.getDate() && mm === today.getMonth() + 1;
  if (isToday && !s.player.birthdayActive) {
    s.player.birthdayActive = true;
    s.player.noAds          = true; // no ads il giorno del compleanno
    await persist();
    return true;
  }
  // Reset birthday alla mezzanotte del giorno dopo
  if (!isToday && s.player.birthdayActive) {
    s.player.birthdayActive = false;
    s.player.noAds = s.player.noAdsPermanent || s.player.noAdsMonth || false;
    await persist();
  }
  return false;
};

// ── NO ADS / VIP ─────────────────────────────────────────
export const setNoAds = async (type) => {
  const s = getStore();
  if (type === 'permanent') s.player.noAdsPermanent = true;
  else if (type === 'month') s.player.noAdsMonth = true;
  s.player.noAds = true;
  await persist();
};

export const isNoAds = () => {
  const s = getStore();
  return s.player?.noAds || s.player?.noAdsPermanent || s.player?.noAdsMonth || s.player?.birthdayActive || false;
};

export const setVip = async (active) => {
  const s = getStore();
  s.player.vip = active;
  await persist();
};

export const isVip = () => getStore().player?.vip || false;

// ── CREDITI SPENDIBILI (con unlimited check) ──────────────
export const trySpendCreditsOrUnlimited = async (amount, unlimitedActive) => {
  if (unlimitedActive) return true;
  if (amount === 0)    return true;
  return spendCredits(amount);
};

// ── MISSIONI ASYNCSTORAGE ────────────────────────────────
export const saveMissionsState = async (state) => {
  try { await AsyncStorage.setItem(KEY_MISSIONS, JSON.stringify(state)); } catch(e) { /* intentionally ignored — missions persist best-effort */ }
};

export const loadMissionsState = async () => {
  try {
    const raw = await AsyncStorage.getItem(KEY_MISSIONS);
    return raw ? JSON.parse(raw) : null;
  } catch(e) { return null; }
};

// ── RESET TOTALE (Elimina Account) ───────────────────────
export const resetAllData = async () => {
  try {
    await AsyncStorage.multiRemove([KEY_STORE, KEY_PLAYER, KEY_STATS, KEY_MISSIONS]);
    _store  = defaultStore();
    _loaded = false;
    log('INFO', 'storage', 'Tutti i dati eliminati');
  } catch (e) {
    logError('storage.resetAllData', e.message);
  }
};
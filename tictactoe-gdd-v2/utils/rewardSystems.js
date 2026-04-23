// utils/rewardSystems.js
// Calendar Reward (7 giorni) + Weekly Chest + Comeback Bonus
//
// FIX v2:
//  - All date strings now use local time via localDateStr() helper (was UTC toISOString)
//  - getWeekStart() already used local getDay()/getDate() — now consistent
//  - comeback lastActive aligned with same local-date format

import AsyncStorage from '@react-native-async-storage/async-storage';
import { addCredits, addXP } from './storage';

const KEY_REWARDS = '@tttgdd_rewardsv1';

// ── LOCAL-DATE HELPER ─────────────────────────────────────
// Always returns "YYYY-MM-DD" in local timezone (avoids UTC drift of toISOString)
const localDateStr = (d = new Date()) => {
  const y  = d.getFullYear();
  const m  = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
};

// ── DEFAULT STATE ─────────────────────────────────────────
const defaultRewardState = () => ({
  calendar: { currentDay: 0, lastClaimDate: null, weekStartDate: null },
  chest:    { gamesThisWeek: 0, chestsClaimed: 0, weekStartDate: null, milestonesClaimed: [] },
  comeback: { lastActive: null, bonusClaimed: false, bonusLevel: 0 },
});

let _state = null;

export const loadRewardState = async () => {
  if (_state) return _state;
  try {
    const raw = await AsyncStorage.getItem(KEY_REWARDS);
    _state = raw
      ? { ...defaultRewardState(), ...JSON.parse(raw) }
      : defaultRewardState();
  } catch {
    _state = defaultRewardState();
  }
  return _state;
};

const persist = async () => {
  if (!_state) return;
  try { await AsyncStorage.setItem(KEY_REWARDS, JSON.stringify(_state)); }
  catch { /* non-fatal */ }
};

export const getRewardState = () => _state || defaultRewardState();

// ── WEEK START — local Monday date string ─────────────────
const getWeekStart = () => {
  const now = new Date();
  const day = now.getDay(); // 0=Sun 1=Mon … 6=Sat
  const diff = day === 0 ? -6 : 1 - day;
  const mon = new Date(now);
  mon.setDate(now.getDate() + diff);
  return localDateStr(mon);
};

// ════════════════════════════════════════════════════════
// A. CALENDAR REWARD — 7 giorni ciclici
// ════════════════════════════════════════════════════════
export const CALENDAR_REWARDS = [
  { type: 'credits', amount: 15, label: '+15 💰', emoji: '💰' },
  { type: 'xp',      amount: 50, label: '+50 XP', emoji: '⭐' },
  { type: 'credits', amount: 20, label: '+20 💰', emoji: '💰' },
  { type: 'credits', amount: 15, label: '+15 💰', emoji: '💰' },
  { type: 'xp',      amount: 80, label: '+80 XP', emoji: '⭐' },
  { type: 'credits', amount: 30, label: '+30 💰', emoji: '💰' },
  { type: 'credits', amount: 50, label: '+50 💰 🎉', emoji: '🎁', isJackpot: true },
];

export const getCalendarStatus = () => {
  const s = getRewardState();
  const cal = s.calendar;
  const today = localDateStr();
  const weekStart = getWeekStart();

  if (cal.weekStartDate !== weekStart) {
    return {
      currentDay: 0, rewards: CALENDAR_REWARDS, claimed: [],
      canClaimToday: true, todayReward: CALENDAR_REWARDS[0], weekStart,
    };
  }

  return {
    currentDay:    cal.currentDay,
    rewards:       CALENDAR_REWARDS,
    claimed:       Array.from({ length: cal.currentDay }, (_, i) => i),
    canClaimToday: cal.lastClaimDate !== today,
    todayReward:   CALENDAR_REWARDS[cal.currentDay] || CALENDAR_REWARDS[0],
    weekStart,
  };
};

export const claimCalendarReward = async () => {
  await loadRewardState();
  const today = localDateStr();
  const weekStart = getWeekStart();

  if (_state.calendar.weekStartDate !== weekStart) {
    _state.calendar = { currentDay: 0, lastClaimDate: null, weekStartDate: weekStart };
  }
  if (_state.calendar.lastClaimDate === today) {
    return { ok: false, reason: 'already_claimed' };
  }

  const dayIdx = _state.calendar.currentDay;
  const reward = CALENDAR_REWARDS[dayIdx];

  if (reward.type === 'credits') await addCredits(reward.amount, 'calendar');
  else if (reward.type === 'xp')  await addXP(reward.amount);

  _state.calendar.currentDay    = (dayIdx + 1) % CALENDAR_REWARDS.length;
  _state.calendar.lastClaimDate = today;
  await persist();
  return { ok: true, reward, newDay: _state.calendar.currentDay };
};

// ════════════════════════════════════════════════════════
// B. WEEKLY CHEST
// ════════════════════════════════════════════════════════
export const CHEST_MILESTONES = [5, 15, 30];
export const CHEST_REWARDS = {
  5:  { type: 'credits', amount: 25,  label: '25 💰',     emoji: '📦', tier: 'bronze' },
  15: { type: 'credits', amount: 60,  label: '60 💰',     emoji: '🗃️', tier: 'silver' },
  30: { type: 'credits', amount: 150, label: '150 💰 🎁', emoji: '💎', tier: 'gold'   },
};

export const getChestStatus = () => {
  const s = getRewardState();
  const chest = s.chest;
  const weekStart = getWeekStart();

  if (chest.weekStartDate !== weekStart) {
    return {
      gamesThisWeek: 0, milestones: CHEST_MILESTONES, rewards: CHEST_REWARDS,
      milestonesClaimed: [], weekStart,
      nextMilestone: CHEST_MILESTONES[0], gamesUntilNext: CHEST_MILESTONES[0],
    };
  }

  const claimed = chest.milestonesClaimed || [];
  const nextMilestone  = CHEST_MILESTONES.find(m => !claimed.includes(m) && chest.gamesThisWeek < m);
  const gamesUntilNext = nextMilestone ? nextMilestone - chest.gamesThisWeek : null;

  return {
    gamesThisWeek: chest.gamesThisWeek, milestones: CHEST_MILESTONES,
    rewards: CHEST_REWARDS, milestonesClaimed: claimed, weekStart,
    nextMilestone, gamesUntilNext, allClaimed: claimed.length === CHEST_MILESTONES.length,
  };
};

export const incrementWeeklyGames = async () => {
  await loadRewardState();
  const weekStart = getWeekStart();
  if (_state.chest.weekStartDate !== weekStart) {
    _state.chest = { gamesThisWeek: 0, chestsClaimed: 0, weekStartDate: weekStart, milestonesClaimed: [] };
  }
  _state.chest.gamesThisWeek = (_state.chest.gamesThisWeek || 0) + 1;
  await persist();
  return _state.chest.gamesThisWeek;
};

export const claimChestReward = async (milestone) => {
  await loadRewardState();
  const weekStart = getWeekStart();
  if (_state.chest.weekStartDate !== weekStart) {
    _state.chest = { gamesThisWeek: 0, chestsClaimed: 0, weekStartDate: weekStart, milestonesClaimed: [] };
  }
  const chest = _state.chest;
  if (chest.gamesThisWeek < milestone)                     return { ok: false, reason: 'not_reached' };
  if ((chest.milestonesClaimed || []).includes(milestone))  return { ok: false, reason: 'already_claimed' };
  const reward = CHEST_REWARDS[milestone];
  if (!reward)                                              return { ok: false, reason: 'invalid_milestone' };

  if (reward.type === 'credits') await addCredits(reward.amount, 'chest');
  else if (reward.type === 'xp')  await addXP(reward.amount);

  _state.chest.milestonesClaimed = [...(chest.milestonesClaimed || []), milestone];
  await persist();
  return { ok: true, reward };
};

// ════════════════════════════════════════════════════════
// C. COMEBACK BONUS
// ════════════════════════════════════════════════════════
const COMEBACK_RULES = [
  { minDays: 7, level: 3, label: 'Bentornato campione!', reward: { credits: 80, xp: 100 } },
  { minDays: 5, level: 2, label: 'Bentornato!',          reward: { credits: 50, xp: 60  } },
  { minDays: 2, level: 1, label: 'Ci sei mancato!',      reward: { credits: 25, xp: 30  } },
];

export const checkComebackBonus = async () => {
  await loadRewardState();
  const today = localDateStr();
  const cb = _state.comeback;

  if (!cb.lastActive) {
    _state.comeback = { lastActive: today, bonusClaimed: false, bonusLevel: 0 };
    await persist();
    return null;
  }

  if (cb.lastActive === today) {
    if (cb.bonusLevel > 0 && !cb.bonusClaimed) {
      return COMEBACK_RULES.find(r => r.level === cb.bonusLevel) || null;
    }
    return null;
  }

  // Parse stored date safely (always local-date format YYYY-MM-DD)
  const [ly, lm, ld] = cb.lastActive.split('-').map(Number);
  const [ty, tm, td] = today.split('-').map(Number);
  const lastMs  = new Date(ly, lm - 1, ld).getTime();
  const todayMs = new Date(ty, tm - 1, td).getTime();
  const diffDays = Math.round((todayMs - lastMs) / 86400000);

  const rule = COMEBACK_RULES.find(r => diffDays >= r.minDays);
  if (!rule) {
    _state.comeback = { lastActive: today, bonusClaimed: false, bonusLevel: 0 };
    await persist();
    return null;
  }

  _state.comeback.bonusLevel   = rule.level;
  _state.comeback.bonusClaimed = false;
  await persist();
  return { ...rule, daysAbsent: diffDays };
};

export const claimComebackBonus = async () => {
  await loadRewardState();
  const cb = _state.comeback;
  if (cb.bonusClaimed || cb.bonusLevel === 0) return { ok: false, reason: 'not_available' };

  const rule = COMEBACK_RULES.find(r => r.level === cb.bonusLevel);
  if (!rule) return { ok: false, reason: 'invalid' };

  await addCredits(rule.reward.credits, 'comeback');
  await addXP(rule.reward.xp);

  _state.comeback.bonusClaimed = true;
  _state.comeback.lastActive   = localDateStr();
  _state.comeback.bonusLevel   = 0;
  await persist();
  return { ok: true, reward: rule.reward, label: rule.label };
};

export const updateLastActive = async () => {
  await loadRewardState();
  if (_state.comeback.bonusClaimed || _state.comeback.bonusLevel === 0) {
    _state.comeback.lastActive = localDateStr();
    await persist();
  }
};
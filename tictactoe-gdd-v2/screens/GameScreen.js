// screens/HomeScreen.js

import React, { useContext, useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { AppContext } from '../App';
import CONFIG from '../config';
import { logNav } from '../utils/debug';
import {
  minutesToPlayable, getPlayer, getIngots,
  claimDailyBonus, getStore, canWatchVideo, getCredits,
  getDailyStreak,
} from '../utils/storage';
import StreakCard from '../components/StreakCard';
import {
  getChestStatus, claimChestReward, getCalendarStatus, claimCalendarReward,
  claimComebackBonus, getRewardState,
} from '../utils/rewardSystems';
import { playStreakClaim, playChestOpen, playCalendarClaim, playComebackBonus } from '../utils/audioManager';
import { showRewardedAd } from '../services/ads';
import { theme as getTheme } from '../utils/theme';
import { t, useLang } from '../utils/i18n';
import { getMissionsWithState } from '../utils/missions';
import { getXpProgress } from '../utils/xpUtils';


const getDailyVariant = () => {
  const now  = new Date();
  const seed = now.getFullYear() * 10000 + (now.getMonth() + 1) * 100 + now.getDate();
  const pool = CONFIG.VARIANT_ORDER.filter(id => id !== 'random');
  const id   = pool[seed % pool.length];
  return Object.values(CONFIG.GAME_VARIANTS).find(v => v.id === id);
};

const getChaosWeekRule = () => {
  if (!CONFIG.CHAOS_WEEK_ENABLED) return null;
  const now   = new Date();
  const start = new Date(now.getFullYear(), 0, 1);
  const week  = Math.floor((now - start) / (7 * 24 * 3600 * 1000));
  return (CONFIG.CHAOS_WEEK_RULES || [])[week % (CONFIG.CHAOS_WEEK_RULES || []).length] || null;
};

const getSeasonDaysLeft = () => {
  const now = new Date();
  return Math.max(0, new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate() - now.getDate());
};

function getMissionText(m) {
  if (!m) return '';
  const varName = m.variantId
    ? Object.values(CONFIG.GAME_VARIANTS || {}).find(v => v.id === m.variantId)?.name || m.variantId
    : '';
  switch (m.type) {
    case 'games_played': return t('missGamesPlayed', { n: m.target });
    case 'wins':         return t('missWins',        { n: m.target });
    case 'ai_wins':      return t('missAIWins',      { n: m.target });
    case 'streak':       return t('missStreak',      { n: m.target });
    case 'variant':      return t('missVariant',     { n: m.target, variant: varName });
    default:             return m.type;
  }
}

export default function HomeScreen() {
  const { navigate, credits, unlimitedActive, refreshCredits } = useContext(AppContext);
  useLang();
  const th = getTheme();

  const [player,          setPlayer]         = useState(null);
  const [ingots,          setIngots]          = useState(0);
  const [minToPlay,       setMinToPlay]       = useState(0);
  const [nextObj,         setNextObj]         = useState(null);
  const [completedCount,  setCompletedCount]  = useState(0);
  const [hasMissionBadge, setMissionBadge]    = useState(false);
  const [seasonLeft,      setSeasonLeft]      = useState(0);
  const [chaosRule,       setChaosRule]       = useState(null);
  const [ctaLoading,      setCtaLoading]      = useState(false);
  // isOffline: riservato per futura integrazione NetInfo
  // const [isOffline, setIsOffline] = useState(false);
  const _mounted = useRef(true);  // guard setState su componente smontato
  const [streakInfo,     setStreakInfo]      = useState(getDailyStreak());
  const [comebackBonus,  setComebackBonus]  = useState(null);
  const [chestStatus,    setChestStatus]    = useState(null);

  // QUICK_PLAY_COST = costo quick play online (classic) = 4cr, allineato con onlineCost di config
  const ONLINE_COST = CONFIG.QUICK_PLAY_COST || 4;
  const CMAX        = CONFIG.CREDITS_MAX     || 200;
  const hasEnough   = unlimitedActive || (credits || 0) >= ONLINE_COST;

  const load = useCallback(async () => {
    try {
      const [p, ing] = await Promise.all([getPlayer(), getIngots()]);
      if (!_mounted.current) return;
      setPlayer(p);
      setIngots(ing || 0);
      const enoughNow = unlimitedActive || (credits || 0) >= ONLINE_COST;
      if (!enoughNow) setMinToPlay(minutesToPlayable(ONLINE_COST));

      const allPeriods = ['daily', 'weekly', 'monthly', 'alltime'];
      let pending = 0;
      let bestMission = null;

      for (const period of allPeriods) {
        try {
          const ms = getMissionsWithState(period);
          pending += ms.filter(m => m.completed && !m.claimed).length;
          if (!bestMission) {
            const ip = ms.filter(m => !m.completed && !m.claimed && (m.target || 0) > 0 && (m.progress || 0) > 0);
            if (ip.length) bestMission = ip.sort((a, b) => (b.progress / b.target) - (a.progress / a.target))[0];
          }
        } catch (e) { /* intentionally ignored */ }
      }
      setCompletedCount(pending);
      setMissionBadge(pending > 0);

      const store      = getStore ? getStore() : null;
      const bonusReady = store ? store.lastDaily !== new Date().toDateString() : false;
      const dv         = getDailyVariant();

      if (bestMission)                          setNextObj({ type: 'mission',   mission: bestMission });
      else if (bonusReady)                      setNextObj({ type: 'bonus' });
      else if (CONFIG.DAILY_PASS_ENABLED && dv) setNextObj({ type: 'challenge', variant: dv });
      else                                      setNextObj(null);

      setSeasonLeft(getSeasonDaysLeft());
      setChaosRule(getChaosWeekRule());
      // Aggiorna streak info (leggera, dallo store in-memory)
      if (_mounted.current) setStreakInfo(getDailyStreak());

      // Carica chest e comeback bonus (safe — non blocca se reward system non inizializzato)
      try {
        const cs = getChestStatus();
        if (_mounted.current) setChestStatus(cs);
        const rs = getRewardState();
        if (rs?.comeback?.bonusLevel > 0 && !rs?.comeback?.bonusClaimed) {
          if (_mounted.current) setComebackBonus(rs.comeback);
        }
      } catch (_) { /* reward system non ancora caricato — silenzioso */ }
    } catch (e) { /* intentionally ignored */ }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [credits, unlimitedActive, ONLINE_COST]); // stable load function

  useEffect(() => {
    _mounted.current = true;
    load();
    const iv = setInterval(load, 30000);
    return () => { _mounted.current = false; clearInterval(iv); };
  }, [load]); // load è stabile con useCallback — warning risolto

  const handleStreakClaim = useCallback(async () => {
    try {
      await claimDailyBonus();
      await refreshCredits();
      if (_mounted.current) {
        setStreakInfo(getDailyStreak());
        load(); // aggiorna nextObj (rimuove card bonus se era la prossima task)
      }
    } catch (e) { /* intentionally ignored */ }
  }, [refreshCredits, load]); // refreshCredits e load sono stabili useCallback

  const handleComebackClaim = useCallback(async () => {
    try {
      playComebackBonus();
      await claimComebackBonus();
      await refreshCredits();
      if (_mounted.current) setComebackBonus(null);
    } catch (e) { /* intentionally ignored */ }
  }, [refreshCredits]);

  const handleStreakDouble = useCallback(async () => {
    await refreshCredits();
    if (_mounted.current) setStreakInfo(getDailyStreak());
  }, [refreshCredits]);

  const handleCTA = useCallback(async () => {
    if (hasEnough) { navigate('play'); return; }
    // Doppio tap: ctaLoading blocca seconda chiamata
    if (!canWatchVideo() || ctaLoading) return;
    setCtaLoading(true);
    let didNavigate = false;
    try {
      await showRewardedAd(async () => {
        // Callback SOLO se rewardedVideoUserDidEarnReward — mai se chiuso prima
        await refreshCredits();
        const nowCredits = await getCredits(); // leggi dallo store, non dalla closure stale
        if (unlimitedActive || nowCredits >= ONLINE_COST) {
          didNavigate = true;
          navigate('play'); // dopo rewarded video → vai a PlayScreen
        }
      });
    } catch (e) {
      /* Rewarded ad SDK error — reset loading, no credits awarded */
    } finally {
      // Se abbiamo navigato, il componente sarà smontato — no setState su componente morto
      if (!didNavigate && _mounted.current) setCtaLoading(false);
    }
  // navigate escluso intenzionalmente: cambia ad ogni screen change ma è stabile per azione
  }, [hasEnough, credits, unlimitedActive, ctaLoading, ONLINE_COST]); // eslint-disable-line react-hooks/exhaustive-deps

  const av    = CONFIG.AVATARS?.find(a => a.id === player?.avatarId) || { emoji: '👤' };
  const { pct: xpPct } = getXpProgress(player?.xp || 0, player?.level || 1);
  const crPct = unlimitedActive ? 1 : Math.min(1, (credits || 0) / CMAX);

  const objAccent = nextObj?.type === 'bonus'     ? '#ffd700'
                  : nextObj?.type === 'challenge'  ? '#4caf50'
                  : th.accent;
  const objBg     = nextObj?.type === 'bonus'     ? 'rgba(255,215,0,0.1)'
                  : nextObj?.type === 'challenge'  ? 'rgba(76,175,80,0.1)'
                  : th.bgCard;
  const objIcon   = nextObj?.type === 'bonus'     ? '🎁'
                  : nextObj?.type === 'challenge'  ? '🎯'
                  : '🎯';
  const objTitle  = nextObj?.type === 'bonus'     ? 'Bonus Giornaliero'
                  : nextObj?.type === 'challenge'  ? `Daily Challenge — ${nextObj.variant?.name || ''}`
                  : getMissionText(nextObj?.mission);
  // Reward reale del prossimo claim: BASE + STREAK_REWARDS[streakInfo.streak]
  // claimDailyBonus fa newStreak = streak+1 → streakIdx = streak → STREAK_REWARDS[streak]
  const STREAK_REWARDS_LOCAL = [5, 8, 12, 15, 20, 25, 35];
  const streakBonusNext = STREAK_REWARDS_LOCAL[Math.min(streakInfo.streak, STREAK_REWARDS_LOCAL.length - 1)] || 5;
  const totalBonusNext  = (CONFIG.CREDITS_DAILY_BONUS || 12) + streakBonusNext;
  const objReward = nextObj?.type === 'bonus'
    ? `+${totalBonusNext} 💰 (${CONFIG.CREDITS_DAILY_BONUS || 12} base + ${streakBonusNext} streak)`
    : nextObj?.type === 'challenge'
    ? `+${CONFIG.DAILY_PASS_REWARD_CREDITS || 50}💰  +${CONFIG.DAILY_PASS_REWARD_XP || 100}XP`
    : `+${nextObj?.mission?.reward?.credits || 0}💰  +${nextObj?.mission?.reward?.xp || 0}XP`;

  return (
    <ScrollView style={[s.root, { backgroundColor: th.bg }]} contentContainerStyle={s.content}>

      {/* 1 ── HEADER */}
      <View style={s.header}>
        <View>
          <Text style={[s.appName, { color: th.textPrimary }]}>{CONFIG.APP_NAME}</Text>
          <Text style={[s.appSub,  { color: th.accent }]}>ULTIMATE</Text>
        </View>
        <TouchableOpacity
          style={[s.profileBtn, { backgroundColor: th.bgCard, borderColor: th.border }]}
          onPress={() => navigate('profile')}>
          <Text style={{ fontSize: 24 }}>{player?.facePhotoUri ? '📸' : av.emoji}</Text>
          <View style={[s.lvBadge, { backgroundColor: th.accent }]}>
            <Text style={s.lvBadgeTxt}>{player?.level || 1}</Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* 2 ── HERO PLAYER CARD */}
      <View style={[s.hero, { backgroundColor: th.bgCard, borderColor: hasEnough ? th.border : th.danger }]}>
        <View style={s.heroTop}>
          <View style={{ flex: 1 }}>
            <Text style={[s.heroName, { color: th.textPrimary }]} numberOfLines={1}>
              {player?.name || 'Ospite'}
            </Text>
            <View style={s.heroMeta}>
              <Text style={[s.heroLv, { color: th.accent }]}>Lv.{player?.level || 1}</Text>
              {player?.eloOnline > 0 && (
                <Text style={[s.heroElo, { color: th.textMuted }]}>· ELO {player.eloOnline} 🌐</Text>
              )}
              {seasonLeft > 0 && (
                <Text style={[s.heroSeason, { color: seasonLeft <= 7 ? th.danger : th.accent }]}>
                  · 🏆 {seasonLeft}d
                </Text>
              )}
            </View>
            <View style={[s.xpBg, { backgroundColor: th.border }]}>
              <View style={[s.xpFill, {
                width: `${Math.round(xpPct * 100)}%`,
                backgroundColor: th.info || '#00bfff',
              }]} />
            </View>
          </View>

          <View style={s.heroRight}>
            <Text style={[s.heroCr, { color: hasEnough ? th.accent : th.danger }]}>
              {unlimitedActive ? '∞' : (credits || 0)}
            </Text>
            <Text style={[s.heroCrLabel, { color: th.textMuted }]}>💰</Text>
            {!hasEnough && !unlimitedActive && (
              <Text style={[s.heroTimer, { color: '#ff9f43' }]}>
                ⏱ {minToPlay <= 1 ? '<1 min' : `${minToPlay} min`}
              </Text>
            )}
            <Text style={[s.heroIngot, { color: th.textMuted }]}>🪙 {ingots}</Text>
          </View>
        </View>

        <View style={[s.crBarBg, { backgroundColor: th.border }]}>
          <View style={[s.crBarFill, {
            width: `${crPct * 100}%`,
            backgroundColor: crPct > 0.6 ? '#4caf50' : crPct > 0.25 ? '#f5a623' : th.danger,
          }]} />
        </View>
        <Text style={[s.crBarLabel, { color: th.textHint || th.textMuted }]}>
          {unlimitedActive ? '∞' : `${credits || 0} / ${CMAX} cr — +1 ogni ${CONFIG.CREDITS_REGEN_MINUTES||8} min`}
        </Text>
      </View>

      {/* 2.5 ── STREAK CARD */}
      <StreakCard
        streak={streakInfo.streak}
        bestStreak={streakInfo.bestStreak}
        claimedToday={streakInfo.claimedToday}
        bonusDoubledToday={streakInfo.bonusDoubledToday}
        lastStreakDate={streakInfo.lastStreakDate}
        onClaim={handleStreakClaim}
        onAfterDouble={handleStreakDouble}
      />

      {/* 2.6 ── COMEBACK BONUS BANNER */}
      {comebackBonus && comebackBonus.bonusLevel > 0 && (
        <TouchableOpacity
          style={[s.comebackBanner, { backgroundColor: th.bgCard, borderColor: '#00FF88' }]}
          onPress={handleComebackClaim}
          activeOpacity={0.85}>
          <Text style={{ fontSize: 26, marginRight: 12 }}>
            {comebackBonus.bonusLevel === 3 ? '🏆' : comebackBonus.bonusLevel === 2 ? '🎁' : '🎉'}
          </Text>
          <View style={{ flex: 1 }}>
            <Text style={[s.comebackTitle, { color: '#00FF88' }]}>
              {comebackBonus.bonusLevel === 3
                ? 'Bentornato campione! 🏆'
                : comebackBonus.bonusLevel === 2
                ? 'Bentornato!'
                : 'Ci sei mancato! 🎉'}
            </Text>
            <Text style={[s.comebackSub, { color: th.textMuted }]}>
              Tocca per riscuotere il bonus di ritorno
            </Text>
          </View>
          <Text style={[s.comebackArrow, { color: '#00FF88' }]}>→</Text>
        </TouchableOpacity>
      )}

      {/* 3 ── CTA PRINCIPALE: GIOCA (→ selezione variante) + shortcut Gioca Subito */}
      {/* Pulsante principale: va a PlayScreen per scegliere variante e modalità */}
      <TouchableOpacity
        style={[s.ctaPlay, { backgroundColor: th.accent }]}
        onPress={() => navigate('play')}
        activeOpacity={0.85}>
        <Text style={s.ctaPlayIcon}>🎮</Text>
        <View style={{ flex: 1 }}>
          <Text style={s.ctaPlayTitle}>Gioca</Text>
          <Text style={s.ctaPlaySub}>Scegli variante e modalità</Text>
        </View>
        <Text style={s.ctaArrow}>→</Text>
      </TouchableOpacity>

      {/* Shortcut Ranked rapido */}
      <TouchableOpacity
        style={[s.cta, { backgroundColor: ctaLoading ? th.border : th.danger }]}
        onPress={handleCTA}
        disabled={ctaLoading}
        activeOpacity={0.85}>
        <Text style={s.ctaIcon}>{ctaLoading ? '⏳' : hasEnough ? '⚡' : '📺'}</Text>
        <View style={{ flex: 1 }}>
          <Text style={s.ctaTitle}>
            {ctaLoading ? 'Caricamento…' : hasEnough ? 'Gioca subito' : 'Guarda un video e gioca'}
          </Text>
          <Text style={s.ctaSub}>
            {ctaLoading ? '' : hasEnough
              ? `Online (Beta) · ${ONLINE_COST} cr — Scala la classifica`
              : (() => {
                  const missing = Math.max(0, ONLINE_COST - (credits || 0));
                  // CREDITS_VIDEO_REWARD = 5cr ≥ ONLINE_COST = 4cr → garantisce accesso
                  return missing <= 1
                    ? `Ti manca solo ${missing} credito · 1 video e giochi subito`
                    : missing <= (CONFIG.CREDITS_VIDEO_REWARD || 5)
                    ? `📺 Guarda 1 video → +5 cr → gioca subito`
                    : `📺 Guarda 1 video → +5 cr · mancano ancora ${missing - (CONFIG.CREDITS_VIDEO_REWARD || 5)} cr`;
                })()}
          </Text>
        </View>
        {!ctaLoading && <Text style={s.ctaArrow}>→</Text>}
      </TouchableOpacity>

      {/* 4 ── PROSSIMO OBIETTIVO (una sola card) */}
      {nextObj && (
        <TouchableOpacity
          style={[s.obj, { backgroundColor: objBg, borderColor: objAccent }]}
          onPress={async () => {
            if (nextObj.type === 'bonus') {
              await handleStreakClaim(); // centralizzato — stesso flusso della StreakCard
            } else if (nextObj.type === 'challenge') {
              navigate('dailyChallenge');
            } else {
              navigate('missions');
            }
          }}
          activeOpacity={0.85}>
          <Text style={{ fontSize: 20, marginRight: 12 }}>{objIcon}</Text>
          <View style={{ flex: 1 }}>
            <Text style={[s.objTitle, { color: objAccent }]} numberOfLines={1}>{objTitle}</Text>
            {nextObj.type === 'mission' && nextObj.mission && (
              <View style={[s.objBarBg, { backgroundColor: th.border }]}>
                <View style={[s.objBarFill, {
                  width: `${Math.round(Math.min(1, (nextObj.mission.progress || 0) / (nextObj.mission.target || 1)) * 100)}%`,
                  backgroundColor: objAccent,
                }]} />
              </View>
            )}
            <Text style={[s.objReward, { color: th.textMuted }]}>{objReward}</Text>
          </View>
          <Text style={{ color: objAccent, fontSize: 16, marginLeft: 8 }}>→</Text>
        </TouchableOpacity>
      )}

      {/* 5 ── CHAOS WEEK (compatto) */}
      {chaosRule && (
        <TouchableOpacity
          style={[s.chaos, { backgroundColor: 'rgba(233,69,96,0.08)', borderColor: th.danger }]}
          onPress={() => navigate('play')}>
          <Text style={{ fontSize: 15, marginRight: 8 }}>{chaosRule.icon}</Text>
          <Text style={[s.chaosLabel, { color: th.danger, flex: 1 }]}>⚡ CHAOS: {chaosRule.label}</Text>
          <Text style={{ color: th.danger }}>→</Text>
        </TouchableOpacity>
      )}

      {/* 6 ── QUICK PLAY AI */}
      <TouchableOpacity
        style={[s.qpAI, { backgroundColor: th.bgCard, borderColor: th.border }]}
        onPress={() => navigate('quickPlayAI')}
        activeOpacity={0.85}>
        <Text style={{ fontSize: 17, marginRight: 10 }}>🤖</Text>
        <Text style={[s.qpAITxt, { color: th.textSecondary, flex: 1 }]}>
          {t('quickPlayAI')} — {t('free') || 'Gratis'} · ×0.2 ELO
        </Text>
        <Text style={{ color: th.textMuted, fontSize: 13 }}>→</Text>
      </TouchableOpacity>

      {/* 6b ── RANDOM SHORTCUT */}
      <TouchableOpacity
        style={[s.qpAI, { backgroundColor: th.bgCard, borderColor: th.border }]}
        onPress={() => navigate('game', {
          variantId: 'random', mode: 'ai', aiLevel: 'medium',
          p1Name: player?.name || 'Tu', p2Name: 'AI',
          pieceP1: 'X', pieceP2: 'O',
        })}
        activeOpacity={0.85}>
        <Text style={{ fontSize: 17, marginRight: 10 }}>🎲</Text>
        <Text style={[s.qpAITxt, { color: th.textSecondary, flex: 1 }]}>
          Random — Variante a sorpresa · ×1.5 XP
        </Text>
        <Text style={{ color: th.textMuted, fontSize: 13 }}>→</Text>
      </TouchableOpacity>

      {/* 7 ── MENU PRINCIPALE */}
      {[
        { label: t('missions'),    icon: '🎯', screen: 'missions',    color: '#ff9f43', badge: hasMissionBadge },
        { label: t('leaderboard'), icon: '🏆', screen: 'leaderboard', color: th.accent },
        { label: t('shop'),        icon: '🏪', screen: 'shop',        color: '#ffd700' },
      ].map(item => (
        <TouchableOpacity
          key={item.screen}
          style={[s.menuItem, { backgroundColor: th.bgCard, borderColor: th.border, borderLeftColor: item.color }]}
          onPress={() => { logNav('Home', item.screen); navigate(item.screen); }}
          activeOpacity={0.75}>
          <View style={{ position: 'relative', marginRight: 14 }}>
            <Text style={s.menuIcon}>{item.icon}</Text>
            {item.badge && (
              <View style={[s.menuBadge, {
                backgroundColor: '#e94560',
                minWidth: completedCount > 1 ? 18 : 10,
                borderRadius: 9,
                paddingHorizontal: completedCount > 1 ? 3 : 0,
              }]}>
                {completedCount > 1 && (
                  <Text style={{ color: '#fff', fontSize: 9, fontWeight: '900' }}>{completedCount}</Text>
                )}
              </View>
            )}
          </View>
          <Text style={[s.menuLabel, { color: th.textPrimary }]}>{item.label}</Text>
          <Text style={[s.menuArrow, { color: item.color }]}>→</Text>
        </TouchableOpacity>
      ))}

      {/* 8 ── MENU SECONDARIO */}
      <View style={s.menuSec}>
        {[
          { label: t('stats'),    icon: '📊', screen: 'stats',    color: th.info || '#00bfff' },
          { label: 'Clan',        icon: '⚔️', screen: 'clan',    color: '#ff7043' },
          { label: t('settings'), icon: '⚙️', screen: 'settings', color: '#808098' },
        ].map(item => (
          <TouchableOpacity
            key={item.screen}
            style={[s.menuSecItem, { backgroundColor: th.bgCard, borderColor: th.border }]}
            onPress={() => { logNav('Home', item.screen); navigate(item.screen); }}
            activeOpacity={0.75}>
            <Text style={{ fontSize: 16, marginRight: 10 }}>{item.icon}</Text>
            <Text style={[s.menuSecLabel, { color: th.textSecondary, flex: 1 }]}>{item.label}</Text>
            <Text style={{ color: th.textMuted, fontSize: 13 }}>→</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={[s.version, { color: th.textHint || th.textMuted }]}>v{CONFIG.APP_VERSION}</Text>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  root:         { flex: 1 },
  content:      { padding: 16, paddingBottom: 50 },
  // Header
  header:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10, marginBottom: 4 },
  appName:      { fontSize: 22, fontWeight: '900', letterSpacing: 1 },
  appSub:       { fontSize: 11, fontWeight: '900', letterSpacing: 4, marginTop: 1 },
  profileBtn:   { width: 48, height: 48, borderRadius: 24, borderWidth: 2, justifyContent: 'center', alignItems: 'center' },
  lvBadge:      { position: 'absolute', bottom: -4, right: -4, borderRadius: 9, minWidth: 18, height: 18, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 3 },
  lvBadgeTxt:   { color: '#000', fontWeight: '900', fontSize: 10 },
  // Hero card
  hero:         { borderRadius: 16, padding: 16, marginBottom: 10, borderWidth: 1 },
  heroTop:      { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10 },
  heroName:     { fontSize: 19, fontWeight: '900', marginBottom: 3 },
  heroMeta:     { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  heroLv:       { fontSize: 13, fontWeight: '800' },
  heroElo:      { fontSize: 12 },
  heroSeason:   { fontSize: 12, fontWeight: '700' },
  xpBg:         { height: 5, borderRadius: 3, overflow: 'hidden' },
  xpFill:       { height: 5, borderRadius: 3 },
  heroRight:    { alignItems: 'flex-end', marginLeft: 14, minWidth: 58 },
  heroCr:       { fontSize: 30, fontWeight: '900', lineHeight: 34 },
  heroCrLabel:  { fontSize: 14, marginTop: -2 },
  heroTimer:    { fontSize: 10, marginTop: 3 },
  heroIngot:    { fontSize: 12, marginTop: 5 },
  crBarBg:      { height: 7, borderRadius: 4, overflow: 'hidden', marginBottom: 5 },
  crBarFill:    { height: 7, borderRadius: 4 },
  crBarLabel:   { fontSize: 10 },
  // CTA principale
  ctaPlay:      { flexDirection: 'row', alignItems: 'center', borderRadius: 18, padding: 18, marginBottom: 8, elevation: 4 },
  ctaPlayIcon:  { fontSize: 26, marginRight: 14 },
  ctaPlayTitle: { fontSize: 20, fontWeight: '900', color: '#fff' },
  ctaPlaySub:   { fontSize: 11, color: 'rgba(255,255,255,0.82)', marginTop: 2 },
  cta:          { flexDirection: 'row', alignItems: 'center', borderRadius: 18, padding: 18, marginBottom: 10, elevation: 3 },
  ctaIcon:      { fontSize: 28, marginRight: 14 },
  ctaTitle:     { fontSize: 19, fontWeight: '900', color: '#fff' },
  ctaSub:       { fontSize: 11, color: 'rgba(255,255,255,0.85)', marginTop: 2 },
  ctaArrow:     { fontSize: 22, color: '#fff', marginLeft: 8 },
  // Prossimo obiettivo
  obj:          { flexDirection: 'row', alignItems: 'center', borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1.5 },
  objTitle:     { fontSize: 14, fontWeight: '900', marginBottom: 5 },
  objBarBg:     { height: 5, borderRadius: 3, overflow: 'hidden', marginBottom: 5 },
  objBarFill:   { height: 5, borderRadius: 3 },
  objReward:    { fontSize: 12 },
  // Chaos (compatto)
  chaos:        { flexDirection: 'row', alignItems: 'center', borderRadius: 10, padding: 9, marginBottom: 8, borderWidth: 1 },
  chaosLabel:   { fontSize: 12, fontWeight: '800' },
  // Quick Play AI
  qpAI:         { flexDirection: 'row', alignItems: 'center', borderRadius: 12, padding: 10, marginBottom: 12, borderWidth: 1 },
  qpAITxt:      { fontSize: 13, fontWeight: '600' },
  // Menu principale
  menuItem:     { flexDirection: 'row', alignItems: 'center', borderRadius: 14, paddingHorizontal: 16, paddingVertical: 15, marginBottom: 7, borderLeftWidth: 4, borderWidth: 1 },
  menuIcon:     { fontSize: 20, marginRight: 14 },
  menuLabel:    { flex: 1, fontSize: 15, fontWeight: '700' },
  menuArrow:    { fontSize: 15 },
  menuBadge:    { position: 'absolute', top: -2, right: -2, width: 10, height: 10, borderRadius: 5, alignItems: 'center', justifyContent: 'center' },
  // Menu secondario
  menuSec:      { gap: 6, marginBottom: 10 },
  menuSecItem:  { flexDirection: 'row', alignItems: 'center', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 11, borderWidth: 1 },
  menuSecLabel: { fontSize: 13, fontWeight: '600' },
  version:      { textAlign: 'center', fontSize: 11, marginTop: 14 },
});
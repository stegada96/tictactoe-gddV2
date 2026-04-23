// components/StreakCard.js
// Streak giornaliera — card premium, inline, nessun modal aggressivo.

import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  Animated, Vibration,
} from 'react-native';
import { addCredits, markBonusDoubled, canWatchVideo } from '../utils/storage';
import { showRewardedAdCustom } from '../services/ads';
import { theme as getTheme } from '../utils/theme';
import CONFIG from '../config';

// DEVE essere identico a STREAK_REWARDS in storage.js
const STREAK_REWARDS = [5, 8, 12, 15, 20, 25, 35];
const BASE_BONUS     = CONFIG.CREDITS_DAILY_BONUS || 12;

/**
 * getStreakReward(day) → bonus per quel giorno di streak.
 * day è 1-based: giorno 1 = STREAK_REWARDS[0] = 5.
 */
const getStreakReward = (day) =>
  STREAK_REWARDS[Math.min(Math.max(day - 1, 0), STREAK_REWARDS.length - 1)] || 5;

/**
 * claimDailyBonus() fa: newStreak = oldStreak + 1
 * Quindi il reward che l'utente RICEVERÀ è STREAK_REWARDS[newStreak - 1]
 *                                          = STREAK_REWARDS[(oldStreak + 1) - 1]
 *                                          = STREAK_REWARDS[oldStreak]
 *
 * UI mostra `streak` = oldStreak (ancora non claimato).
 * Reward corretto da mostrare: getStreakReward(streak + 1).
 *
 * Caso speciale: streak = 0 (first time o broken) → newStreak = 1
 *   reward = getStreakReward(1) = STREAK_REWARDS[0] = 5.
 *
 * Verifica:
 *   streak=0 → claim → newStreak=1  → reward = getStreakReward(1) = 5   ✅
 *   streak=3 → claim → newStreak=4  → reward = getStreakReward(4) = 15  ✅
 *   streak=6 → claim → newStreak=7  → reward = getStreakReward(7) = 35  ✅
 */
const calcTodayReward = (streak) => BASE_BONUS + getStreakReward((streak || 0) + 1);

export default function StreakCard({
  streak = 0,
  bestStreak = 0,
  claimedToday = false,
  bonusDoubledToday = false,
  lastStreakDate = null,
  onClaim,        // async () => void — chiama claimDailyBonus + refreshCredits nel parent
  onAfterDouble,  // async () => void — refreshCredits nel parent
}) {
  const th = getTheme();
  const [expanded,    setExpanded]    = useState(false);
  const [doubling,    setDoubling]    = useState(false);
  const [doubleShown, setDoubleShown] = useState(false);
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const _mounted  = useRef(true);

  // FIX #2: cleanup _mounted al dismount
  useEffect(() => {
    _mounted.current = true;
    return () => { _mounted.current = false; };
  }, []);

  const isBroken  = !claimedToday && streak === 0 && lastStreakDate !== null;
  const isFirst   = streak === 0 && lastStreakDate === null;
  const canDouble = claimedToday && !bonusDoubledToday && canWatchVideo();

  // FIX #1: reward corretto — mostra quello che l'utente RICEVERÀ, non l'attuale
  const todayReward    = calcTodayReward(streak);               // streak+1 dopo claim
  const tomorrowReward = calcTodayReward((streak || 0) + 1);   // streak+2 domani

  // Double bonus: raddoppia l'intero bonus del giorno del claim (= todayReward già ricevuto)
  const doubleAmount = todayReward;

  const handleClaim = useCallback(async () => {
    if (!onClaim) return;
    Animated.sequence([
      Animated.timing(scaleAnim, { toValue: 0.94, duration: 80, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1.0,  tension: 120, friction: 5, useNativeDriver: true }),
    ]).start();
    Vibration.vibrate([0, 40, 30, 80]);
    await onClaim();
    if (_mounted.current) {
      setExpanded(false);
      if (canWatchVideo() && !bonusDoubledToday) setDoubleShown(true);
    }
  }, [onClaim, bonusDoubledToday, scaleAnim]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleDouble = useCallback(async () => {
    if (doubling || !canDouble) return;
    setDoubling(true);
    try {
      await showRewardedAdCustom(async () => {
        if (!_mounted.current) return;
        await addCredits(doubleAmount, 'video');
        await markBonusDoubled();
        if (onAfterDouble) await onAfterDouble();
        if (_mounted.current) {
          setDoubleShown(false);
          Vibration.vibrate([0, 50, 30, 100]);
        }
      });
    } catch (e) { /* rewarded non disponibile — intentionally ignored */ }
    if (_mounted.current) setDoubling(false);
  }, [doubling, canDouble, doubleAmount, onAfterDouble]); // eslint-disable-line react-hooks/exhaustive-deps

  const borderColor = isBroken    ? (th.danger || '#e94560')
                    : claimedToday ? (th.info   || '#00bfff')
                    : '#f5a623';

  return (
    <Animated.View style={[sk.root, { backgroundColor: th.bgCard, borderColor, transform: [{ scale: scaleAnim }] }]}>

      {/* Header sempre visibile */}
      <TouchableOpacity style={sk.header} onPress={() => setExpanded(e => !e)} activeOpacity={0.8}>
        <Text style={{ fontSize: 22 }}>
          {claimedToday ? '✅' : isBroken ? '💔' : '🔥'}
        </Text>
        <View style={{ flex: 1, marginLeft: 10 }}>
          {isFirst
            ? <Text style={[sk.title, { color: th.textPrimary }]}>Inizia la tua streak oggi</Text>
            : isBroken
            ? <Text style={[sk.title, { color: th.danger || '#e94560' }]}>Streak interrotta — ricomincia</Text>
            : claimedToday
            ? <Text style={[sk.title, { color: th.info || '#00bfff' }]}>🔥 {streak}g — Torna domani!</Text>
            : <Text style={[sk.title, { color: '#f5a623' }]}>🔥 {streak}g — Ritira il bonus!</Text>
          }
          <Text style={[sk.sub, { color: th.textMuted }]}>
            {claimedToday
              ? `Domani: +${tomorrowReward} cr · Migliore: ${bestStreak}g`
              : isFirst
              ? `Oggi: +${calcTodayReward(0)} cr · Giorno 7: +${BASE_BONUS + 35} cr`
              : isBroken
              ? 'Torna ogni giorno per reward crescenti'
              : `Oggi: +${todayReward} cr · Giorno 7: +${BASE_BONUS + 35} cr 🏆`
            }
          </Text>
        </View>
        <Text style={{ color: th.textMuted, fontSize: 11 }}>{expanded ? '▲' : '▼'}</Text>
      </TouchableOpacity>

      {/* Corpo espanso */}
      {expanded && (
        <View style={sk.body}>
          <View style={sk.daysRow}>
            {STREAK_REWARDS.map((bonus, i) => {
              const dayNum   = i + 1;
              // Dopo il claim, streak = dayNum di oggi → isPast include oggi
              const isPast   = claimedToday && streak >= dayNum;
              // Prossimo giorno da completare
              const isToday  = claimedToday ? (streak === dayNum) : ((streak + 1) === dayNum);
              return (
                <View key={dayNum} style={sk.dayWrap}>
                  <View style={[
                    sk.dayCir,
                    isPast    && sk.dayCirPast,
                    isToday   && sk.dayCirToday,
                    !isPast && !isToday && { borderColor: th.border },
                  ]}>
                    <Text style={[sk.dayLbl, {
                      color: isPast ? '#fff' : isToday ? '#f5a623' : th.textMuted,
                    }]}>
                      {dayNum === 7 ? '🏆' : isPast ? '✓' : `${dayNum}`}
                    </Text>
                  </View>
                  <Text style={[sk.dayRew, { color: isToday ? '#f5a623' : th.textMuted }]}>
                    +{BASE_BONUS + bonus}
                  </Text>
                </View>
              );
            })}
          </View>

          {!claimedToday && !isBroken && (
            <TouchableOpacity style={sk.claimBtn} onPress={handleClaim} activeOpacity={0.85}>
              <Text style={sk.claimTxt}>🎁 Ritira +{todayReward} cr</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Double bonus (post-claim, 1×/giorno) */}
      {(doubleShown || canDouble) && claimedToday && !bonusDoubledToday && (
        <TouchableOpacity
          style={[sk.doubleBtn, { borderColor: '#4caf50' }]}
          onPress={handleDouble}
          disabled={doubling}
          activeOpacity={0.85}
        >
          <Text style={sk.doubleTxt}>
            {doubling
              ? '⏳ Caricamento…'
              : `📺 Raddoppia il bonus → +${doubleAmount} cr extra`}
          </Text>
        </TouchableOpacity>
      )}
    </Animated.View>
  );
}

const sk = StyleSheet.create({
  root:        { borderRadius: 16, borderWidth: 1.5, marginBottom: 10, overflow: 'hidden' },
  header:      { flexDirection: 'row', alignItems: 'center', padding: 14 },
  title:       { fontSize: 14, fontWeight: '900', marginBottom: 2 },
  sub:         { fontSize: 11 },
  body:        { paddingHorizontal: 14, paddingBottom: 14 },
  daysRow:     { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 14 },
  dayWrap:     { alignItems: 'center', gap: 4 },
  dayCir:      { width: 32, height: 32, borderRadius: 16, borderWidth: 2, justifyContent: 'center', alignItems: 'center' },
  dayCirPast:  { backgroundColor: '#4caf50', borderColor: '#4caf50' },
  dayCirToday: { borderColor: '#f5a623', backgroundColor: 'rgba(245,166,35,0.15)' },
  dayLbl:      { fontSize: 10, fontWeight: '900' },
  dayRew:      { fontSize: 8, fontWeight: '700' },
  claimBtn:    { backgroundColor: '#f5a623', borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  claimTxt:    { color: '#000', fontWeight: '900', fontSize: 15 },
  doubleBtn:   { marginHorizontal: 14, marginBottom: 12, borderRadius: 10, borderWidth: 1, paddingVertical: 10, alignItems: 'center', backgroundColor: 'rgba(76,175,80,0.1)' },
  doubleTxt:   { color: '#4caf50', fontSize: 13, fontWeight: '700' },
});
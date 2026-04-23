// components/PostLossPanel.js — Post-loss UX: retain player after defeat
// v2 FIXES:
//  - Added shop CTA when credits low and no video available
//  - onNavigateShop prop wired through
//  - useRef instead of useCallback for stable lossMsg (avoids lint warning)

import React, { useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { getXpProgress } from '../utils/xpUtils';

// ── XP bar ────────────────────────────────────────────────
function XpBar({ playerXp, playerLevel, xpEarned, th }) {
  const { pct, toNext, nextLv } = getXpProgress(playerXp, playerLevel);
  if (!xpEarned) return null;
  return (
    <View style={[pl.xpBox, { backgroundColor: `${th.info || '#00bfff'}12`, borderColor: `${th.info || '#00bfff'}33` }]}>
      <Text style={[pl.xpTitle, { color: th.info || '#00bfff' }]}>⭐ +{xpEarned} XP guadagnati</Text>
      <View style={[pl.bar, { backgroundColor: th.border }]}>
        <View style={[pl.barFill, { width: `${Math.round(pct * 100)}%`, backgroundColor: th.info || '#00bfff' }]} />
      </View>
      {toNext > 0 && (
        <Text style={[pl.hint, { color: th.textMuted }]}>
          Ti mancano {toNext} XP al livello {nextLv} 💪
        </Text>
      )}
    </View>
  );
}

const LOSS_MSGS = [
  'Ogni sconfitta è una lezione! 💡',
  "L'AI non ti risparmia… ma tu puoi migliorare 💪",
  'I campioni cadono e si rialzano 🔥',
  'Analizza la partita — dove puoi fare meglio?',
  "Un'altra partita e sarai più forte 🎯",
];

export default function PostLossPanel({
  playerXp, playerLevel, xpEarned,
  rematchCost, currentCredits,
  onRematch, onNavigateShop,
  canWatchVideo, postGameReward, onWatchAd, adLoading,
  closestMission, th,
}) {
  const lossMsg = useRef(LOSS_MSGS[Math.floor(Math.random() * LOSS_MSGS.length)]).current;
  const discountedCost   = Math.max(0, (rematchCost || 0) - 1);
  const hasEnough        = (currentCredits || 0) >= discountedCost;
  const canShowVideo     = canWatchVideo && (postGameReward || 0) > 0;
  const noCreditsNoVideo = !hasEnough && !canShowVideo;

  return (
    <View style={pl.root}>
      {/* Motivational message */}
      <View style={[pl.msgBox, { backgroundColor: `${th.danger || '#E94560'}0d`, borderColor: `${th.danger || '#E94560'}30` }]}>
        <Text style={[pl.msgTxt, { color: th.textSecondary }]}>{lossMsg}</Text>
      </View>

      {/* XP earned even on loss */}
      <XpBar playerXp={playerXp} playerLevel={playerLevel} xpEarned={xpEarned} th={th} />

      {/* Rematch CTA — priority 1 */}
      <TouchableOpacity
        style={[pl.ctaRematch, { backgroundColor: hasEnough ? (th.danger || '#E94560') : th.border }]}
        onPress={onRematch}
        disabled={!hasEnough}
        activeOpacity={0.85}
      >
        <Text style={pl.ctaIcon}>⚔️</Text>
        <View style={{ flex: 1 }}>
          <Text style={pl.ctaLabel}>Rivincita immediata</Text>
          <Text style={pl.ctaSub}>
            {hasEnough
              ? `Costo ridotto: ${discountedCost} 💰 (invece di ${rematchCost})`
              : `Crediti insufficienti — guarda un video o vai allo Shop`}
          </Text>
        </View>
        {hasEnough && <Text style={pl.arrow}>→</Text>}
      </TouchableOpacity>

      {/* Watch video — priority 2 */}
      {canShowVideo && (
        <TouchableOpacity
          style={[pl.ctaVideo, { borderColor: '#4caf50', backgroundColor: 'rgba(76,175,80,0.08)' }]}
          onPress={onWatchAd}
          disabled={!!adLoading}
          activeOpacity={0.85}
        >
          <Text style={{ fontSize: 20, marginRight: 10 }}>📺</Text>
          <View style={{ flex: 1 }}>
            <Text style={[pl.ctaVideoLabel, { color: '#4caf50' }]}>
              {adLoading ? 'Caricamento…' : `Guarda video → +${postGameReward} 💰`}
            </Text>
            <Text style={[pl.hint, { color: th.textMuted }]}>Accumula crediti per giocare ancora</Text>
          </View>
        </TouchableOpacity>
      )}

      {/* Shop CTA — priority 3, shown when no credits AND no video */}
      {noCreditsNoVideo && onNavigateShop && (
        <TouchableOpacity
          style={[pl.ctaShop, { backgroundColor: '#ffd70015', borderColor: '#ffd70055' }]}
          onPress={onNavigateShop}
          activeOpacity={0.85}
        >
          <Text style={{ fontSize: 20, marginRight: 10 }}>🏪</Text>
          <View style={{ flex: 1 }}>
            <Text style={[pl.ctaVideoLabel, { color: '#ffd700' }]}>Vai allo Shop</Text>
            <Text style={[pl.hint, { color: th.textMuted }]}>Ottieni più crediti per continuare</Text>
          </View>
          <Text style={{ color: '#ffd700', fontSize: 16 }}>→</Text>
        </TouchableOpacity>
      )}

      {/* Closest mission hint — priority 4 */}
      {closestMission && (
        <View style={[pl.missionBox, { backgroundColor: th.bgCard, borderColor: th.border }]}>
          <Text style={{ fontSize: 14, marginRight: 8 }}>🎯</Text>
          <View style={{ flex: 1 }}>
            <Text style={[pl.hint, { color: th.textSecondary }]}>
              Missione al {Math.round(((closestMission.progress || 0) / (closestMission.target || 1)) * 100)}%
              — {(closestMission.target || 0) - (closestMission.progress || 0)} partite al completamento
            </Text>
            <View style={[pl.bar, { backgroundColor: th.border, marginTop: 4 }]}>
              <View style={[pl.barFill, {
                width: `${Math.round(((closestMission.progress || 0) / (closestMission.target || 1)) * 100)}%`,
                backgroundColor: th.accent,
              }]} />
            </View>
          </View>
        </View>
      )}
    </View>
  );
}

const pl = StyleSheet.create({
  root:        { width: '100%', gap: 8 },
  msgBox:      { borderRadius: 12, padding: 12, borderWidth: 1 },
  msgTxt:      { fontSize: 13, fontWeight: '600', textAlign: 'center', fontStyle: 'italic' },
  xpBox:       { borderRadius: 12, padding: 12, borderWidth: 1 },
  xpTitle:     { fontSize: 13, fontWeight: '800', marginBottom: 6 },
  bar:         { height: 6, borderRadius: 3, overflow: 'hidden', marginBottom: 4 },
  barFill:     { height: 6, borderRadius: 3 },
  hint:        { fontSize: 11 },
  ctaRematch:  { flexDirection: 'row', alignItems: 'center', borderRadius: 16, padding: 16 },
  ctaIcon:     { fontSize: 22, marginRight: 12 },
  ctaLabel:    { color: '#fff', fontWeight: '900', fontSize: 15 },
  ctaSub:      { color: 'rgba(255,255,255,0.8)', fontSize: 11, marginTop: 2 },
  arrow:       { color: '#fff', fontSize: 18 },
  ctaVideo:    { flexDirection: 'row', alignItems: 'center', borderRadius: 14, padding: 12, borderWidth: 1.5 },
  ctaVideoLabel:{ fontSize: 14, fontWeight: '800' },
  ctaShop:     { flexDirection: 'row', alignItems: 'center', borderRadius: 14, padding: 12, borderWidth: 1.5 },
  missionBox:  { flexDirection: 'row', alignItems: 'center', borderRadius: 12, padding: 10, borderWidth: 1 },
});
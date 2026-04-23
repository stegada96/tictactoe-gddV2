// screens/BadgesScreen.js — Badge e achievement del giocatore
import React, { useContext, useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { AppContext } from '../App';
import { theme as getTheme } from '../utils/theme';
import { getStore, getStats } from '../utils/storage';
import AppHeader from '../components/AppHeader';

const BADGES = [
  { id: 'first_win',    icon: '🏆', name: 'Prima Vittoria',    desc: 'Vinci la tua prima partita',       check: s => (s.wins||0) >= 1 },
  { id: 'wins_10',      icon: '⭐', name: 'Decavincitore',     desc: '10 vittorie totali',               check: s => (s.wins||0) >= 10 },
  { id: 'wins_50',      icon: '🌟', name: 'Campione',          desc: '50 vittorie totali',               check: s => (s.wins||0) >= 50 },
  { id: 'wins_100',     icon: '💎', name: 'Leggenda',          desc: '100 vittorie totali',              check: s => (s.wins||0) >= 100 },
  { id: 'streak_7',     icon: '🔥', name: 'Streak Perfetta',   desc: '7 giorni di streak consecutivi',  check: (_, p) => (p.bestStreak||0) >= 7 },
  { id: 'streak_30',    icon: '🚀', name: 'Veterano',          desc: '30 giorni di streak consecutivi', check: (_, p) => (p.bestStreak||0) >= 30 },
  { id: 'elo_700',      icon: '⚡', name: 'Competitivo',       desc: 'Raggiungi ELO 700',               check: (_, p) => (p.eloOnline||0) >= 700 },
  { id: 'elo_1000',     icon: '👑', name: 'Élite',             desc: 'Raggiungi ELO 1000',              check: (_, p) => (p.eloOnline||0) >= 1000 },
  { id: 'games_100',    icon: '🎮', name: 'Cento Partite',     desc: '100 partite giocate',              check: s => (s.games||0) >= 100 },
  { id: 'hard_win',     icon: '🤖', name: 'Domatore di AI',    desc: 'Vinci contro AI Difficile',       check: s => (s.aiHardWins||0) >= 1 },
  { id: 'variant_all',  icon: '🎲', name: 'Esploratore',       desc: 'Gioca tutte le 8 varianti',       check: s => Object.keys(s).filter(k=>k!=='total').length >= 8 },
  { id: 'no_ads_day',   icon: '🎂', name: 'Festeggiato',       desc: 'Gioca nel giorno del tuo compleanno', check: (_, p) => p.birthdayActive === true },
];

export default function BadgesScreen() {
  const { goBack } = useContext(AppContext);
  const th = getTheme();
  const [stats, setStats]   = useState(null);
  const [player, setPlayer] = useState(null);

  useEffect(() => {
    const store = getStore();
    setPlayer(store?.player || {});
    setStats(store?.stats?.['total'] || {});
  }, []);

  const unlocked = BADGES.filter(b => {
    try { return stats && b.check(stats, player || {}); }
    catch { return false; }
  }).length;

  return (
    <View style={[s.root, { backgroundColor: th.bg }]}>
      <AppHeader title="🏅 Badge" onBack={goBack} />
      <ScrollView contentContainerStyle={s.content}>
        <View style={[s.header, { backgroundColor: th.bgCard, borderColor: th.border }]}>
          <Text style={[s.count, { color: th.accent }]}>{unlocked}</Text>
          <Text style={[s.countLabel, { color: th.textMuted }]}>/ {BADGES.length} sbloccati</Text>
        </View>

        {BADGES.map(badge => {
          const earned = stats ? (() => { try { return badge.check(stats, player||{}); } catch { return false; } })() : false;
          return (
            <View key={badge.id} style={[s.badge, {
              backgroundColor: th.bgCard,
              borderColor: earned ? th.accent : th.border,
              opacity: earned ? 1 : 0.45,
            }]}>
              <Text style={s.badgeIcon}>{badge.icon}</Text>
              <View style={{ flex: 1 }}>
                <Text style={[s.badgeName, { color: th.textPrimary }]}>{badge.name}</Text>
                <Text style={[s.badgeDesc, { color: th.textMuted }]}>{badge.desc}</Text>
              </View>
              {earned && <Text style={{ color: th.accent, fontSize: 18 }}>✓</Text>}
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root:       { flex: 1 },
  content:    { padding: 16, paddingBottom: 40, gap: 10 },
  header:     { borderRadius: 16, padding: 20, borderWidth: 1, alignItems: 'center', marginBottom: 6, flexDirection: 'row', justifyContent: 'center', gap: 8 },
  count:      { fontSize: 36, fontWeight: '900' },
  countLabel: { fontSize: 16, alignSelf: 'flex-end', marginBottom: 4 },
  badge:      { flexDirection: 'row', alignItems: 'center', borderRadius: 14, padding: 14, borderWidth: 1, gap: 12 },
  badgeIcon:  { fontSize: 28 },
  badgeName:  { fontSize: 14, fontWeight: '800', marginBottom: 2 },
  badgeDesc:  { fontSize: 12 },
});
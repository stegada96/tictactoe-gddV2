// screens/RecordsScreen.js — Record personali del giocatore
import React, { useContext, useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { AppContext } from '../App';
import { theme as getTheme } from '../utils/theme';
import { getStore } from '../utils/storage';
import CONFIG from '../config';
import AppHeader from '../components/AppHeader';

const LEAGUE_LABELS = [
  { min: 0,    max: 499,  name: 'Bronzo',   icon: '🥉', color: '#CD7F32' },
  { min: 500,  max: 699,  name: 'Argento',  icon: '🥈', color: '#C0C0C0' },
  { min: 700,  max: 999,  name: 'Oro',      icon: '🥇', color: '#FFD700' },
  { min: 1000, max: 1499, name: 'Platino',  icon: '💎', color: '#4F8EF7' },
  { min: 1500, max: 9999, name: 'Diamante', icon: '👑', color: '#E94560' },
];

function getLeague(elo) {
  return LEAGUE_LABELS.find(l => elo >= l.min && elo <= l.max) || LEAGUE_LABELS[0];
}

function StatRow({ label, value, th, accent }) {
  return (
    <View style={[rs.row, { borderBottomColor: th.border }]}>
      <Text style={[rs.rowLabel, { color: th.textMuted }]}>{label}</Text>
      <Text style={[rs.rowValue, { color: accent || th.textPrimary }]}>{value}</Text>
    </View>
  );
}

export default function RecordsScreen() {
  const { goBack } = useContext(AppContext);
  const th = getTheme();
  const [data, setData] = useState(null);

  useEffect(() => {
    const store = getStore();
    const total = store?.stats?.['total'] || {};
    const player = store?.player || {};
    const elo = player.eloOnline || CONFIG.ELO_ONLINE_START || 500;
    const league = getLeague(elo);
    const games  = total.games  || 0;
    const wins   = total.wins   || 0;
    const losses = total.losses || 0;
    const draws  = total.draws  || 0;
    const winPct = games > 0 ? Math.round((wins / games) * 100) : 0;

    setData({
      elo, league,
      games, wins, losses, draws, winPct,
      bestStreak: store?.bestStreak || 0,
      level: player.level || 1,
      xp: player.xp || 0,
      variantStats: Object.entries(store?.stats || {})
        .filter(([k]) => k !== 'total')
        .map(([k, v]) => ({
          id: k,
          name: CONFIG.GAME_VARIANTS ? (Object.values(CONFIG.GAME_VARIANTS).find(g=>g.id===k)?.name || k) : k,
          wins: v.wins || 0,
          games: v.games || 0,
        }))
        .filter(v => v.games > 0)
        .sort((a, b) => b.wins - a.wins),
    });
  }, []);

  if (!data) return (
    <View style={[rs.root, { backgroundColor: th.bg }]}>
      <AppHeader title="📊 Record" onBack={goBack} />
    </View>
  );

  const { elo, league, games, wins, losses, draws, winPct, bestStreak, level, xp, variantStats } = data;

  return (
    <View style={[rs.root, { backgroundColor: th.bg }]}>
      <AppHeader title="📊 Record" onBack={goBack} />
      <ScrollView contentContainerStyle={rs.content}>

        {/* ELO + League */}
        <View style={[rs.eloCard, { backgroundColor: th.bgCard, borderColor: league.color }]}>
          <Text style={rs.eloIcon}>{league.icon}</Text>
          <View style={{ flex: 1 }}>
            <Text style={[rs.eloLabel, { color: league.color }]}>{league.name}</Text>
            <Text style={[rs.eloValue, { color: th.textPrimary }]}>ELO: {elo}</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={[rs.levelBig, { color: th.accent }]}>Lv.{level}</Text>
            <Text style={[rs.xpSmall, { color: th.textMuted }]}>{xp} XP</Text>
          </View>
        </View>

        {/* Overall stats */}
        <View style={[rs.section, { backgroundColor: th.bgCard, borderColor: th.border }]}>
          <Text style={[rs.sectionTitle, { color: th.textPrimary }]}>Statistiche globali</Text>
          <StatRow label="Partite totali" value={games}     th={th} />
          <StatRow label="Vittorie"        value={wins}      th={th} accent="#4caf50" />
          <StatRow label="Sconfitte"       value={losses}    th={th} accent={th.danger} />
          <StatRow label="Pareggi"         value={draws}     th={th} />
          <StatRow label="% vittorie"      value={`${winPct}%`} th={th} accent={th.accent} />
          <StatRow label="Streak migliore" value={`${bestStreak} 🔥`} th={th} accent="#f5a623" />
        </View>

        {/* Per-variant */}
        {variantStats.length > 0 && (
          <View style={[rs.section, { backgroundColor: th.bgCard, borderColor: th.border }]}>
            <Text style={[rs.sectionTitle, { color: th.textPrimary }]}>Per variante</Text>
            {variantStats.map(v => (
              <StatRow
                key={v.id}
                label={v.name}
                value={`${v.wins}W / ${v.games}G`}
                th={th}
              />
            ))}
          </View>
        )}

      </ScrollView>
    </View>
  );
}

const rs = StyleSheet.create({
  root:         { flex: 1 },
  content:      { padding: 16, paddingBottom: 40, gap: 12 },
  eloCard:      { flexDirection: 'row', alignItems: 'center', borderRadius: 16, padding: 18, borderWidth: 2, gap: 14 },
  eloIcon:      { fontSize: 36 },
  eloLabel:     { fontSize: 12, fontWeight: '800', marginBottom: 2 },
  eloValue:     { fontSize: 20, fontWeight: '900' },
  levelBig:     { fontSize: 22, fontWeight: '900' },
  xpSmall:      { fontSize: 11 },
  section:      { borderRadius: 16, padding: 16, borderWidth: 1 },
  sectionTitle: { fontSize: 15, fontWeight: '900', marginBottom: 12 },
  row:          { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1 },
  rowLabel:     { fontSize: 13 },
  rowValue:     { fontSize: 14, fontWeight: '700' },
});
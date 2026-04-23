// screens/ClanScreen.js — Clan (Fase 2)
import React, { useContext } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { AppContext } from '../App';
import { theme as getTheme } from '../utils/theme';
import AppHeader from '../components/AppHeader';

export default function ClanScreen() {
  const { goBack } = useContext(AppContext);
  const th = getTheme();
  return (
    <View style={[s.root, { backgroundColor: th.bg }]}>
      <AppHeader title="⚔️ Clan" onBack={goBack} />
      <View style={s.center}>
        <Text style={s.icon}>⚔️</Text>
        <Text style={[s.title, { color: th.textPrimary }]}>Clan</Text>
        <Text style={[s.sub, { color: th.textMuted }]}>
          I clan arrivano con il multiplayer reale.{'\n'}Rimani aggiornato!
        </Text>
      </View>
    </View>
  );
}
const s = StyleSheet.create({
  root:   { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  icon:   { fontSize: 56, marginBottom: 16 },
  title:  { fontSize: 20, fontWeight: '900', marginBottom: 8 },
  sub:    { fontSize: 14, textAlign: 'center', lineHeight: 22 },
});
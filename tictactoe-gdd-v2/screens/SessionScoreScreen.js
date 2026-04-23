// screens/SessionScoreScreen.js — Punteggio sessione (Fase 2)
import React, { useContext } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { AppContext } from '../App';
import { theme as getTheme } from '../utils/theme';
import AppHeader from '../components/AppHeader';

export default function SessionScoreScreen() {
  const { goBack, navigate } = useContext(AppContext);
  const th = getTheme();
  return (
    <View style={[s.root, { backgroundColor: th.bg }]}>
      <AppHeader title="📋 Sessione" onBack={goBack} />
      <View style={s.center}>
        <Text style={s.icon}>📋</Text>
        <Text style={[s.title, { color: th.textPrimary }]}>Riepilogo sessione</Text>
        <Text style={[s.sub, { color: th.textMuted }]}>Disponibile nella prossima versione.</Text>
        <TouchableOpacity style={[s.btn, { backgroundColor: th.accent }]} onPress={() => navigate('home')}>
          <Text style={s.btnTxt}>Torna alla Home</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
const s = StyleSheet.create({
  root:   { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  icon:   { fontSize: 56, marginBottom: 16 },
  title:  { fontSize: 20, fontWeight: '900', marginBottom: 8 },
  sub:    { fontSize: 14, textAlign: 'center', marginBottom: 24 },
  btn:    { borderRadius: 14, paddingVertical: 14, paddingHorizontal: 32 },
  btnTxt: { color: '#fff', fontWeight: '900', fontSize: 15 },
});
// screens/QuickPlayAIScreen.js — Quick Play vs AI con variante casuale
import React, { useContext, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { AppContext } from '../App';
import CONFIG from '../config';
import { theme as getTheme } from '../utils/theme';
import { t, useLang } from '../utils/i18n';
import AppHeader from '../components/AppHeader';

export default function QuickPlayAIScreen() {
  const { navigate, goBack } = useContext(AppContext);
  const lang = useLang();
  const th   = getTheme();
  const [diff, setDiff] = useState('medium');

  const startQuickPlayAI = () => {
    // Sceglie variante casuale (escluso Random stesso)
    const pool = CONFIG.VARIANT_ORDER.filter(id => id !== 'random');
    const variantId = pool[Math.floor(Math.random() * pool.length)];
    navigate('game', {
      variantId: 'random', // usa random per avere l'animazione
      mode: 'ai',
      aiLevel: diff,
    });
  };

  const difficulties = [
    { id:'easy',   icon:'😊', labelKey:'easy',   desc:'Makes mistakes. Good for beginners.' },
    { id:'medium', icon:'🤔', labelKey:'medium', desc:'Balanced. Can be beaten with strategy.' },
    { id:'hard',   icon:'😈', labelKey:'hard',   desc:'Near-perfect. Punishes every mistake.' },
  ];

  return (
    <View style={[s.root, { backgroundColor:th.bg }]}>
      <AppHeader title={t('quickPlayAI')} />

      <View style={s.content}>
        <Text style={s.heroEmoji}>🤖</Text>
        <Text style={[s.heroTitle, { color:th.textPrimary }]}>{t('quickPlayAI')}</Text>
        <Text style={[s.heroSub, { color:th.textMuted }]}>{t('quickPlayAIDesc')}</Text>

        <Text style={[s.diffLabel, { color:th.textSecondary }]}>{t('chooseDifficulty')}</Text>

        {difficulties.map(d => (
          <TouchableOpacity key={d.id}
            style={[s.diffBtn, { backgroundColor:th.bgCard, borderColor: diff===d.id?th.accent:th.border }, diff===d.id&&{backgroundColor:th.accentBg}]}
            onPress={() => setDiff(d.id)}>
            <Text style={s.diffIcon}>{d.icon}</Text>
            <View style={{ flex:1 }}>
              <Text style={[s.diffName, { color: diff===d.id?th.accent:th.textPrimary }]}>{t(d.labelKey)}</Text>
              <Text style={[s.diffDesc, { color:th.textMuted }]}>{d.desc}</Text>
            </View>
            {diff===d.id && <Text style={{ color:th.accent, fontSize:20 }}>✓</Text>}
          </TouchableOpacity>
        ))}

        <TouchableOpacity style={[s.startBtn, { backgroundColor:th.danger }]} onPress={startQuickPlayAI}>
          <Text style={s.startBtnTxt}>🎲 {t('startGame')}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root:    { flex:1 },
  header:  { flexDirection:'row', alignItems:'center', paddingHorizontal:16, paddingVertical:14, borderBottomWidth:1 },
  backBtn: { width:40, height:40, justifyContent:'center' },
  backTxt: { fontSize:24 },
  title:   { flex:1, textAlign:'center', fontSize:20, fontWeight:'800' },
  content: { flex:1, padding:24, alignItems:'center' },
  heroEmoji:{ fontSize:70, marginBottom:10 },
  heroTitle:{ fontSize:24, fontWeight:'900', marginBottom:6, textAlign:'center' },
  heroSub:  { fontSize:14, textAlign:'center', marginBottom:28, lineHeight:20 },
  diffLabel:{ fontSize:15, fontWeight:'700', marginBottom:12, alignSelf:'flex-start' },
  diffBtn:  { flexDirection:'row', alignItems:'center', borderRadius:14, padding:14, marginBottom:10, borderWidth:1, width:'100%', gap:12 },
  diffIcon: { fontSize:28 },
  diffName: { fontSize:16, fontWeight:'700', marginBottom:2 },
  diffDesc: { fontSize:13 },
  startBtn: { borderRadius:16, padding:18, alignItems:'center', width:'100%', marginTop:20 },
  startBtnTxt:{ color:'#fff', fontWeight:'900', fontSize:18 },
});
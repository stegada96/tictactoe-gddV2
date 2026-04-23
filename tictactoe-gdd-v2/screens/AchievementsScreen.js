// screens/AchievementsScreen.js — FIXED: tab "All" visibile, UI migliorata
// FUNZIONA SUBITO

import React, { useContext, useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, Dimensions,
} from 'react-native';
import { AppContext } from '../App';
import { theme as getTheme } from '../utils/theme';
import { t, useLang } from '../utils/i18n';
import { getAchievements } from '../utils/achievements';
import { getStats } from '../utils/storage';
import AppHeader from '../components/AppHeader';

const { width } = Dimensions.get('window');

const TIER_COLOR = { bronze:'#cd7f32', silver:'#aaaaaa', gold:'#ffd700' };
const TIER_BG    = { bronze:'rgba(205,127,50,0.18)', silver:'rgba(170,170,170,0.12)', gold:'rgba(255,215,0,0.18)' };
const TIER_ICON  = { bronze:'🥉', silver:'🥈', gold:'🥇' };

const CATS = [
  { id:'all',     label:'All',      icon:'🏆' },
  { id:'games',   label:'Games',    icon:'🎮' },
  { id:'wins',    label:'Wins',     icon:'🏅' },
  { id:'streak',  label:'Streak',   icon:'🔥' },
  { id:'variant', label:'Variants', icon:'🗺️' },
  { id:'online',  label:'Online',   icon:'🌐' },
  { id:'ai',      label:'AI',       icon:'🤖' },
  { id:'misc',    label:'Special',  icon:'⭐' },
];

export default function AchievementsScreen() {
  const { goBack } = useContext(AppContext);
  const lang = useLang();
  const th   = getTheme();

  const [cat,     setCat]    = useState('all');
  const [list,    setList]   = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, []);

  const load = async () => {
    try {
      // Aggiorna progress dagli stats
      const stats = await getStats('total').catch(()=>({}));
      setList(getAchievements());
    } catch(e) {
      setList(getAchievements());
    }
    setLoading(false);
  };

  const filtered = cat === 'all' ? list : list.filter(a => a.cat === cat);

  // Ordinati: sbloccati prima, poi per tier (gold→silver→bronze), poi bloccati
  const tierOrder = { gold:0, silver:1, bronze:2 };
  const sorted = [
    ...filtered.filter(a => a.unlocked).sort((a,b) => tierOrder[a.tier]-tierOrder[b.tier]),
    ...filtered.filter(a => !a.unlocked).sort((a,b) => a.target-b.target),
  ];

  const unlockedCount = list.filter(a => a.unlocked).length;
  const totalCount    = list.length;

  // Conteggi per tier
  const goldCount   = list.filter(a => a.unlocked && a.tier==='gold').length;
  const silverCount = list.filter(a => a.unlocked && a.tier==='silver').length;
  const bronzeCount = list.filter(a => a.unlocked && a.tier==='bronze').length;

  return (
    <View style={[s.root, { backgroundColor: th.bg }]}>
      {/* HEADER */}
      <AppHeader title={t('achievements')} />

      {/* PROGRESSO TIER */}
      <View style={[s.tierBar, { backgroundColor: th.bgCard, borderColor: th.border }]}>
        <View style={s.tierRow}>
          {[
            { icon:TIER_ICON.gold,   count:goldCount,   color:TIER_COLOR.gold   },
            { icon:TIER_ICON.silver, count:silverCount, color:TIER_COLOR.silver },
            { icon:TIER_ICON.bronze, count:bronzeCount, color:TIER_COLOR.bronze },
          ].map((t2, i) => (
            <View key={i} style={s.tierItem}>
              <Text style={{ fontSize:22 }}>{t2.icon}</Text>
              <Text style={[s.tierCount, { color: t2.color }]}>{t2.count}</Text>
            </View>
          ))}
          <View style={[s.totalBar, { backgroundColor: th.border }]}>
            <View style={[s.totalFill, {
              width: `${(unlockedCount/Math.max(totalCount,1))*100}%`,
              backgroundColor: th.accent,
            }]} />
          </View>
        </View>
        <Text style={[s.tierSub, { color: th.textMuted }]}>
          {unlockedCount} of {totalCount} achievements unlocked
        </Text>
      </View>

      {/* ── CATEGORIE — FIX: ora chiaramente visibili ────── */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.catScroll}>
        <View style={s.catRow}>
          {CATS.map(c => {
            const isActive = cat === c.id;
            return (
              <TouchableOpacity key={c.id}
                style={[
                  s.catBtn,
                  {
                    // FIX: bordo e sfondo chiaramente diversi per active vs inactive
                    borderColor:     isActive ? th.accent : th.borderLight || '#4a4a6a',
                    backgroundColor: isActive ? th.accentBg : th.bgCard,
                    borderWidth:     isActive ? 1.5 : 1,
                  },
                ]}
                onPress={() => setCat(c.id)}>
                <Text style={{ fontSize:14, marginRight:4 }}>{c.icon}</Text>
                <Text style={[
                  s.catTxt,
                  {
                    color:      isActive ? th.accent : th.textSecondary || '#a0a0c0',
                    fontWeight: isActive ? '800' : '500',
                  },
                ]}>
                  {c.label}
                </Text>
                {isActive && (
                  <View style={[s.catActiveDot, { backgroundColor: th.accent }]} />
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>

      {/* LISTA */}
      <ScrollView contentContainerStyle={s.list}>
        {loading && (
          <Text style={[s.empty, { color: th.textMuted }]}>{t('loading')}</Text>
        )}
        {!loading && sorted.length === 0 && (
          <Text style={[s.empty, { color: th.textMuted }]}>{t('noAchYet')}</Text>
        )}
        {sorted.map(ach => {
          const tier  = TIER_COLOR[ach.tier] || '#cd7f32';
          const bg    = TIER_BG[ach.tier]    || TIER_BG.bronze;
          const pct   = Math.min(1, (ach.progress || 0) / Math.max(ach.target, 1));
          const secret = ach.secret && !ach.unlocked;

          return (
            <View key={ach.id} style={[
              s.card,
              {
                backgroundColor: ach.unlocked ? bg : th.bgCard,
                borderColor:     ach.unlocked ? tier : th.border,
                borderWidth:     ach.unlocked ? 1.5 : 1,
                opacity:         ach.unlocked ? 1 : 0.65,
              },
            ]}>
              <View style={s.cardTop}>
                {/* Tier icon */}
                <Text style={s.tierIcon}>{TIER_ICON[ach.tier]}</Text>
                {/* Achievement icon */}
                <View style={[s.achIconBox, { backgroundColor: ach.unlocked ? `${tier}25` : th.bgCardAlt || th.bg }]}>
                  <Text style={{ fontSize:26 }}>{secret ? '❓' : ach.icon}</Text>
                </View>
                {/* Testo */}
                <View style={{ flex:1 }}>
                  <Text style={[s.achTitle, { color: ach.unlocked ? tier : th.textPrimary }]}>
                    {secret ? t('badgeSecret') : ach.title}
                  </Text>
                  <Text style={[s.achDesc, { color: th.textSecondary }]} numberOfLines={2}>
                    {secret ? '???' : ach.desc}
                  </Text>
                </View>
                {ach.unlocked && (
                  <View style={[s.checkBadge, { backgroundColor: tier }]}>
                    <Text style={s.checkTxt}>✓</Text>
                  </View>
                )}
              </View>

              {/* Progress bar */}
              {!secret && (
                <View style={{ marginTop: 10 }}>
                  <View style={[s.progBg, { backgroundColor: th.border }]}>
                    <View style={[s.progFill, {
                      width: `${pct * 100}%`,
                      backgroundColor: ach.unlocked ? tier : th.accent,
                    }]} />
                  </View>
                  <View style={{ flexDirection:'row', justifyContent:'space-between', marginTop:4 }}>
                    <Text style={[s.progTxt, { color: th.textMuted }]}>
                      {Math.min(ach.progress||0, ach.target)}/{ach.target}
                    </Text>
                    <Text style={[s.progPct, { color: ach.unlocked ? tier : th.textMuted }]}>
                      {Math.round(pct*100)}%
                    </Text>
                  </View>
                </View>
              )}

              {/* Reward */}
              {!secret && (
                <View style={s.rewardRow}>
                  {ach.reward?.credits > 0 && (
                    <View style={[s.rewardChip, { backgroundColor: `${th.accent}22`, borderColor: th.accent }]}>
                      <Text style={[s.rewardTxt, { color: th.accent }]}>💰 {ach.reward.credits}</Text>
                    </View>
                  )}
                  {ach.reward?.ingots > 0 && (
                    <View style={[s.rewardChip, { backgroundColor: `${th.accent}22`, borderColor: th.accent }]}>
                      <Text style={[s.rewardTxt, { color: th.accent }]}>🪙 {ach.reward.ingots}</Text>
                    </View>
                  )}
                  {ach.reward?.badge && (
                    <View style={[s.rewardChip, { backgroundColor: `${tier}22`, borderColor: tier }]}>
                      <Text style={[s.rewardTxt, { color: tier }]}>🏅 badge</Text>
                    </View>
                  )}
                </View>
              )}
            </View>
          );
        })}
        <View style={{ height:40 }} />
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root:        { flex:1 },
  header:      { flexDirection:'row', alignItems:'center', paddingHorizontal:16, paddingVertical:14, borderBottomWidth:1 },
  backBtn:     { width:44, height:44, justifyContent:'center' },
  backTxt:     { fontSize:24 },
  title:       { flex:1, textAlign:'center', fontSize:20, fontWeight:'800' },
  counter:     { fontSize:15, fontWeight:'700' },

  tierBar:     { margin:12, borderRadius:14, padding:14, borderWidth:1 },
  tierRow:     { flexDirection:'row', alignItems:'center', marginBottom:8 },
  tierItem:    { flexDirection:'row', alignItems:'center', marginRight:16, gap:4 },
  tierCount:   { fontSize:16, fontWeight:'900' },
  totalBar:    { flex:1, height:8, borderRadius:4, overflow:'hidden', marginLeft:8 },
  totalFill:   { height:8, borderRadius:4 },
  tierSub:     { fontSize:12 },

  // FIX: catScroll ben visibile
  catScroll:   { maxHeight:52, backgroundColor:'transparent' },
  catRow:      { flexDirection:'row', paddingHorizontal:12, gap:8, paddingVertical:8 },
  catBtn:      {
    flexDirection:'row', alignItems:'center',
    paddingHorizontal:12, paddingVertical:8,
    borderRadius:20, borderWidth:1,
    // NOTE: backgroundColor e borderColor vengono da inline style
    // qui mettiamo solo il layout
    position:'relative',
  },
  catTxt:      { fontSize:13 },
  catActiveDot:{ position:'absolute', bottom:-2, left:'50%', marginLeft:-3, width:6, height:6, borderRadius:3 },

  list:        { padding:12 },
  empty:       { textAlign:'center', marginTop:50, fontSize:16 },

  card:        { borderRadius:16, padding:14, marginBottom:10 },
  cardTop:     { flexDirection:'row', alignItems:'center', gap:10 },
  tierIcon:    { fontSize:20, width:24 },
  achIconBox:  { width:48, height:48, borderRadius:12, justifyContent:'center', alignItems:'center' },
  achTitle:    { fontSize:15, fontWeight:'800', marginBottom:2 },
  achDesc:     { fontSize:12, lineHeight:16 },
  checkBadge:  { width:24, height:24, borderRadius:12, justifyContent:'center', alignItems:'center', marginLeft:4 },
  checkTxt:    { color:'#fff', fontWeight:'900', fontSize:12 },

  progBg:      { height:7, borderRadius:4, overflow:'hidden' },
  progFill:    { height:7, borderRadius:4 },
  progTxt:     { fontSize:11 },
  progPct:     { fontSize:11, fontWeight:'700' },

  rewardRow:   { flexDirection:'row', gap:8, marginTop:8, flexWrap:'wrap' },
  rewardChip:  { borderRadius:8, paddingHorizontal:8, paddingVertical:4, borderWidth:1 },
  rewardTxt:   { fontSize:11, fontWeight:'700' },
});
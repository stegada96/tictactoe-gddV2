// screens/MissionsScreen.js — UI migliorata
// Card con design più pulito, icone più grandi, barre progresso chiare
// FUNZIONA SUBITO

import React, { useContext, useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, Modal, Animated,
} from 'react-native';
import { AppContext } from '../App';
import { theme as getTheme } from '../utils/theme';
import { t, useLang } from '../utils/i18n';
import {
  getMissionsWithState, claimMission,
  getTotalCompletedCount, DAILY_MISSIONS, WEEKLY_MISSIONS,
  MONTHLY_MISSIONS, ALLTIME_MISSIONS,
} from '../utils/missions';
import { addCredits, addIngots, addXP } from '../utils/storage';
import AppHeader from '../components/AppHeader';

const PERIODS = [
  { id:'daily',   icon:'☀️',  labelKey:'daily'   },
  { id:'weekly',  icon:'📅',  labelKey:'weekly'  },
  { id:'monthly', icon:'🗓️', labelKey:'monthly' },
  { id:'alltime', icon:'♾️',  labelKey:'allTime' },
];

const TYPE_ICONS = {
  games_played:'🎮', wins:'🏆', losses:'💔', draws:'🤝',
  streak:'🔥', online_wins:'🌐', ai_wins:'🤖',
  quick_play:'⚡', rematch:'🔄', no_quit:'🛡️', variant:'🎯',
};

const TYPE_COLORS = {
  games_played:'#4caf50', wins:'#f5a623', losses:'#e94560', draws:'#00bfff',
  streak:'#ff7043', online_wins:'#3f51b5', ai_wins:'#9c27b0',
  quick_play:'#ffc107', rematch:'#00acc1', no_quit:'#8bc34a', variant:'#e91e63',
};

function getMissionDesc(m) {
  const varName = m.variantId
    ? (() => { try { return require('../config').default.GAME_VARIANTS[m.variantId.toUpperCase()]?.name || m.variantId; } catch{ return m.variantId; }})()
    : '';
  switch(m.type) {
    case 'games_played': return t('missGamesPlayed', { n: m.target });
    case 'wins':         return t('missWins',        { n: m.target });
    case 'losses':       return `Complete ${m.target} losses`;
    case 'draws':        return `Get ${m.target} draws`;
    case 'win_streak':       return `Fai ${m.target} vittorie di fila`;
    case 'online_win_streak': return `${m.target} vittorie online di fila`;
    case 'ai_win_streak':     return `${m.target} vittorie AI di fila`;
    case 'streak':       return t('missStreak',      { n: m.target });
    case 'online_wins':  return t('missOnlineWins',  { n: m.target });
    case 'ai_wins':      return t('missAIWins',      { n: m.target });
    case 'variant_wins': return `Vinci ${m.target}${m.variantId ? ' in '+m.variantId : ''} partite`;
    case 'variant_games':return `Gioca ${m.target}${m.variantId ? ' in '+m.variantId : ''} partite`;
    case 'quick_play':   return t('missQuickPlay',   { n: m.target });
    case 'rematch':      return t('missRematch',     { n: m.target });
    case 'no_quit':      return t('missNoQuit',      { n: m.target });
    case 'variant':      return t('missVariant',     { n: m.target, variant: varName });
    default:             return m.type;
  }
}

export default function MissionsScreen() {
  const { goBack, refreshCredits } = useContext(AppContext);
  const lang = useLang();
  const th   = getTheme();

  const [period,    setPeriod]    = useState('daily');
  const [missions,  setMissions]  = useState([]);
  const [claimPop,  setClaimPop]  = useState(null);
  const popScale = React.useRef(new Animated.Value(0)).current;

  useEffect(() => { loadMissions(); }, [period]);

  const loadMissions = () => {
    const raw = getMissionsWithState(period);
    // Ordinamento: da riscattare IN ALTO, in progress nel mezzo, riscattate IN BASSO
    const sorted = [...raw].sort((a,b) => {
      const aScore = (a.completed && !a.claimed) ? 0 : a.claimed ? 2 : 1;
      const bScore = (b.completed && !b.claimed) ? 0 : b.claimed ? 2 : 1;
      return aScore - bScore;
    });
    setMissions(sorted);
  };

  const showClaimPop = (data) => {
    setClaimPop(data);
    Animated.spring(popScale, { toValue:1, tension:70, friction:5, useNativeDriver:true }).start();
  };

  const onClaim = async (m) => {
    const result = await claimMission(m.id, period); // ✅ FIX: await obbligatorio
    if (!result) return;
    if (result.credits > 0) await addCredits(result.credits, 'mission');
    if (result.ingots  > 0) await addIngots(result.ingots);
    // XP: aggiunti direttamente (non conta come partita)
    if ((result.xp || 0) > 0) {
      await addXP(result.xp);
    }
    await refreshCredits();
    showClaimPop({ mission: m, reward: result, credits: result?.credits||0, xp: result?.xp||0 });
    loadMissions();
  };

  const closeClaimPop = () => {
    popScale.setValue(0);
    setClaimPop(null);
  };

  const done    = missions.filter(m => m.completed).length;
  const claimed = missions.filter(m => m.claimed).length;
  const total   = missions.length;
  const globalCompleted = getTotalCompletedCount();

  return (
    <View style={[s.root, { backgroundColor: th.bg }]}>

      {/* POPUP CLAIM */}
      <Modal visible={!!claimPop} transparent animationType="fade"
        onRequestClose={closeClaimPop}>
        <View style={s.ov}>
          <Animated.View style={[
            s.popCard,
            { backgroundColor: th.bgCard, borderColor: th.accent, transform:[{scale:popScale}] },
          ]}>
            <Text style={s.popEmoji}>🎉</Text>
            <Text style={[s.popTitle, { color: th.accent }]}>{t('missionComplete')}</Text>
            {claimPop?.reward?.credits > 0 && (
              <View style={[s.popReward, { backgroundColor: th.accentBg, borderColor: th.accent }]}>
                <Text style={[s.popRewardTxt, { color: th.accent }]}>
                  💰 +{claimPop.reward.credits} {t('credits')}
                </Text>
              </View>
            )}
            {claimPop?.reward?.xp > 0 && (
              <View style={[s.popReward, { backgroundColor: th.infoBg, borderColor: th.info||'#00bfff' }]}>
                <Text style={[s.popRewardTxt, { color: th.info||'#00bfff' }]}>
                  ⭐ +{claimPop.reward.xp} XP
                </Text>
              </View>
            )}
            {claimPop?.reward?.ingots > 0 && (
              <View style={[s.popReward, { backgroundColor: th.accentBg, borderColor: th.accent }]}>
                <Text style={[s.popRewardTxt, { color: th.accent }]}>
                  🪙 +{claimPop.reward.ingots} {t('ingots')}
                </Text>
              </View>
            )}
            {claimPop?.bonus && (
              <View style={[s.popBonus, { backgroundColor:'rgba(76,175,80,0.2)', borderColor:'#4caf50' }]}>
                <Text style={[s.popBonusTxt, { color:'#4caf50' }]}>
                  🎁 Bonus every 5! {claimPop.bonus.label}
                </Text>
              </View>
            )}
            <TouchableOpacity style={[s.popBtn, { backgroundColor: th.accent }]} onPress={closeClaimPop}>
              <Text style={s.popBtnTxt}>{t('ok')} !</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </Modal>

      {/* HEADER */}
      <AppHeader title={t('missionsTitle')} />

      {/* STATS BAR */}
      <View style={[s.statsBar, { backgroundColor: th.bgCard, borderColor: th.border }]}>
        <View style={s.statsRow}>
          <View style={s.statItem}>
            <Text style={[s.statVal, { color: th.accent }]}>{done}</Text>
            <Text style={[s.statLbl, { color: th.textMuted }]}>Done</Text>
          </View>
          <View style={[s.statDivider, { backgroundColor: th.border }]} />
          <View style={s.statItem}>
            <Text style={[s.statVal, { color: '#4caf50' }]}>{claimed}</Text>
            <Text style={[s.statLbl, { color: th.textMuted }]}>Claimed</Text>
          </View>
          <View style={[s.statDivider, { backgroundColor: th.border }]} />
          <View style={s.statItem}>
            <Text style={[s.statVal, { color: th.textPrimary }]}>{total}</Text>
            <Text style={[s.statLbl, { color: th.textMuted }]}>Total</Text>
          </View>
          <View style={[s.statDivider, { backgroundColor: th.border }]} />
          <View style={s.statItem}>
            <Text style={[s.statVal, { color: th.textPrimary }]}>{globalCompleted}</Text>
            <Text style={[s.statLbl, { color: th.textMuted }]}>All-time</Text>
          </View>
        </View>
        {total > 0 && (
          <View style={[s.globalProgBg, { backgroundColor: th.border }]}>
            <View style={[s.globalProgFill, { width:`${(claimed/total)*100}%`, backgroundColor: '#4caf50' }]} />
          </View>
        )}
      </View>

      {/* PERIOD TABS */}
      <View style={s.tabRow}>
        {PERIODS.map(p => {
          const isActive = period === p.id;
          const pMissions = getMissionsWithState(p.id);
          const pDone = pMissions.filter(m=>m.completed&&!m.claimed).length;
          return (
            <TouchableOpacity key={p.id}
              style={[
                s.tab,
                {
                  borderColor: isActive ? th.accent : th.border,
                  backgroundColor: isActive ? th.accentBg : th.bgCard,
                  borderWidth: isActive ? 1.5 : 1,
                },
              ]}
              onPress={() => setPeriod(p.id)}>
              <Text style={{ fontSize:16, marginBottom:2 }}>{p.icon}</Text>
              <Text style={[s.tabTxt, { color: isActive ? th.accent : th.textMuted, fontWeight: isActive ? '800' : '500' }]}>
                {t(p.labelKey)}
              </Text>
              {pDone > 0 && (
                <View style={[s.tabBadge, { backgroundColor: '#4caf50' }]}>
                  <Text style={s.tabBadgeTxt}>{pDone}</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* LISTA MISSIONI */}
      <ScrollView contentContainerStyle={s.list}>
        {missions.length === 0 && (
          <View style={s.emptyBox}>
            <Text style={{ fontSize:48, marginBottom:12 }}>🎯</Text>
            <Text style={[s.emptyTxt, { color: th.textMuted }]}>{t('noMissions')}</Text>
          </View>
        )}
        {missions.map(m => {
          const pct         = Math.min(1, (m.progress || 0) / Math.max(m.target, 1));
          const typeIcon    = TYPE_ICONS[m.type]  || '🎯';
          const typeColor   = TYPE_COLORS[m.type] || th.accent;
          const desc        = getMissionDesc(m);
          const isComplete  = m.completed && !m.claimed;
          const isClaimed   = m.claimed;
          const inProgress  = !m.completed;

          return (
            <View key={m.id} style={[
              s.card,
              {
                backgroundColor: isComplete
                  ? `${typeColor}12`
                  : th.bgCard,
                borderColor: isComplete
                  ? typeColor
                  : isClaimed ? th.borderLight || '#3a3a5a' : th.border,
                borderWidth: isComplete ? 1.5 : 1,
                opacity: isClaimed ? 0.55 : 1,
              },
            ]}>
              {/* TOP ROW */}
              <View style={s.cardTop}>
                {/* Icon colorato */}
                <View style={[s.typeIconBox, { backgroundColor:`${typeColor}20` }]}>
                  <Text style={{ fontSize:22 }}>{typeIcon}</Text>
                </View>

                {/* Descrizione */}
                <View style={{ flex:1 }}>
                  <Text style={[s.cardDesc, { color: isClaimed ? th.textMuted : th.textPrimary }]}>
                    {desc}
                  </Text>
                  <Text style={[s.cardProgress, { color: th.textMuted }]}>
                    {t('progressBar', { current: Math.min(m.progress||0, m.target), target: m.target })}
                  </Text>
                </View>

                {/* Reward pillola */}
                <View style={s.rewardCol}>
                  {m.reward?.credits > 0 && (
                    <View style={[s.rewardPill, { backgroundColor: `${th.accent}20`, borderColor: `${th.accent}60` }]}>
                      <Text style={[s.rewardPillTxt, { color: th.accent }]}>💰{m.reward.credits}</Text>
                    </View>
                  )}
                  {m.reward?.xp > 0 && (
                    <View style={[s.rewardPill, { backgroundColor:`rgba(0,191,255,0.12)`, borderColor:`rgba(0,191,255,0.4)` }]}>
                      <Text style={[s.rewardPillTxt, { color: th.info||'#00bfff' }]}>⭐{m.reward.xp}</Text>
                    </View>
                  )}
                  {m.reward?.ingots > 0 && (
                    <View style={[s.rewardPill, { backgroundColor:`${th.accent}20`, borderColor:`${th.accent}60` }]}>
                      <Text style={[s.rewardPillTxt, { color: th.accent }]}>🪙{m.reward.ingots}</Text>
                    </View>
                  )}
                </View>
              </View>

              {/* PROGRESS BAR */}
              <View style={[s.progBg, { backgroundColor: th.border }]}>
                <View style={[
                  s.progFill,
                  {
                    width: `${pct*100}%`,
                    backgroundColor: isComplete ? typeColor
                      : isClaimed ? th.borderLight || '#3a3a5a'
                      : typeColor,
                    opacity: isClaimed ? 0.5 : 1,
                  },
                ]} />
              </View>

              {/* CLAIM / CLAIMED */}
              {isComplete && (
                <TouchableOpacity
                  style={[s.claimBtn, { backgroundColor: typeColor }]}
                  onPress={() => onClaim(m)}>
                  <Text style={s.claimTxt}>🎁 {t('claim')}</Text>
                </TouchableOpacity>
              )}
              {isClaimed && (
                <View style={s.claimedRow}>
                  <Text style={{ fontSize:14 }}>✓</Text>
                  <Text style={[s.claimedTxt, { color: th.textMuted }]}>{t('claimed')}</Text>
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
  totalBadge:  { borderRadius:12, paddingHorizontal:10, paddingVertical:4, borderWidth:1 },
  totalTxt:    { fontSize:13, fontWeight:'700' },

  statsBar:    { margin:12, borderRadius:14, padding:12, borderWidth:1 },
  statsRow:    { flexDirection:'row', alignItems:'center', marginBottom:10 },
  statItem:    { flex:1, alignItems:'center' },
  statVal:     { fontSize:20, fontWeight:'900' },
  statLbl:     { fontSize:10, marginTop:2 },
  statDivider: { width:1, height:30, marginHorizontal:4 },
  globalProgBg:{ height:5, borderRadius:3, overflow:'hidden' },
  globalProgFill:{ height:5, borderRadius:3 },

  tabRow:      { flexDirection:'row', paddingHorizontal:12, gap:8, paddingVertical:8 },
  tab:         { flex:1, borderRadius:14, padding:10, alignItems:'center', position:'relative' },
  tabTxt:      { fontSize:11 },
  tabBadge:    { position:'absolute', top:-4, right:-4, width:18, height:18, borderRadius:9, justifyContent:'center', alignItems:'center' },
  tabBadgeTxt: { color:'#fff', fontSize:9, fontWeight:'900' },

  list:        { padding:12 },
  emptyBox:    { alignItems:'center', paddingTop:60 },
  emptyTxt:    { fontSize:16, textAlign:'center' },

  card:        { borderRadius:16, padding:14, marginBottom:10 },
  cardTop:     { flexDirection:'row', alignItems:'center', gap:10, marginBottom:10 },
  typeIconBox: { width:46, height:46, borderRadius:12, justifyContent:'center', alignItems:'center' },
  cardDesc:    { fontSize:15, fontWeight:'700', marginBottom:3 },
  cardProgress:{ fontSize:12 },
  rewardCol:   { gap:4, alignItems:'flex-end' },
  rewardPill:  { borderRadius:8, paddingHorizontal:7, paddingVertical:3, borderWidth:1 },
  rewardPillTxt:{ fontSize:11, fontWeight:'700' },

  progBg:      { height:8, borderRadius:4, overflow:'hidden', marginBottom:10 },
  progFill:    { height:8, borderRadius:4 },

  claimBtn:    { borderRadius:10, padding:11, alignItems:'center' },
  claimTxt:    { color:'#fff', fontWeight:'900', fontSize:14 },
  claimedRow:  { flexDirection:'row', alignItems:'center', gap:6, paddingVertical:4 },
  claimedTxt:  { fontSize:13 },

  ov:          { flex:1, backgroundColor:'rgba(0,0,0,0.75)', justifyContent:'center', alignItems:'center', padding:24 },
  popCard:     { width:'100%', borderRadius:24, padding:28, alignItems:'center', borderWidth:2 },
  popEmoji:    { fontSize:56, marginBottom:10 },
  popTitle:    { fontSize:22, fontWeight:'900', marginBottom:14 },
  popReward:   { borderRadius:12, paddingHorizontal:20, paddingVertical:10, borderWidth:1, marginBottom:8, width:'100%', alignItems:'center' },
  popRewardTxt:{ fontSize:18, fontWeight:'800' },
  popBonus:    { borderRadius:12, paddingHorizontal:16, paddingVertical:8, borderWidth:1, marginBottom:12, width:'100%', alignItems:'center' },
  popBonusTxt: { fontSize:15, fontWeight:'700' },
  popBtn:      { borderRadius:16, paddingHorizontal:40, paddingVertical:14 },
  popBtnTxt:   { color:'#fff', fontWeight:'900', fontSize:17 },
});
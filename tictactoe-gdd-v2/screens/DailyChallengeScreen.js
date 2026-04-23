// screens/DailyChallengeScreen.js
// Schermata dedicata Daily Challenge
// 15 challenge in loop (variante + obiettivo diversi ogni giorno)
// Reset mezzanotte ora di Roma

import React, { useContext, useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, Dimensions,
} from 'react-native';
import { AppContext } from '../App';
import CONFIG from '../config';
import { theme as getTheme } from '../utils/theme';
import { t, useLang } from '../utils/i18n';
import { getPlayer, loadMissionsState, saveMissionsState } from '../utils/storage';
import AppHeader from '../components/AppHeader';

const { width } = Dimensions.get('window');

// ── Calcola la challenge del giorno ──────────────────────
// Stesso risultato per tutti i giocatori (seed = giorno dell'anno)
function getTodayChallenge() {
  const challenges = CONFIG.DAILY_CHALLENGES || [];
  if (!challenges.length) return null;
  const now     = new Date();
  const start   = new Date(now.getFullYear(), 0, 0);
  const dayOfYear = Math.floor((now - start) / (1000 * 60 * 60 * 24));
  const idx     = dayOfYear % challenges.length;
  return challenges[idx];
}

// ── Ore rimanenti al reset (mezzanotte Roma) ─────────────
function getHoursToReset() {
  const now = new Date();
  // Roma è UTC+1 (CET) o UTC+2 (CEST in estate)
  const romeOffset = now.toLocaleString('en', { timeZone:'Europe/Rome', hour:'numeric', hour12:false }) !==
                     now.toLocaleString('en', { hour:'numeric', hour12:false }) ? 2 : 1;
  const romeHour = (now.getUTCHours() + romeOffset) % 24;
  const romeMin  = now.getMinutes();
  const hoursLeft = 23 - romeHour + (romeMin > 0 ? 0 : 1);
  const minsLeft  = 60 - romeMin;
  return { h: Math.max(0, hoursLeft), m: minsLeft % 60 };
}

// ── Nome variante traducibile ────────────────────────────
function getVariantName(variantId) {
  const v = Object.values(CONFIG.GAME_VARIANTS || {}).find(x => x.id === variantId);
  return v?.name || variantId;
}

// ── Descrizione obiettivo traducibile ────────────────────
function getObjectiveText(challenge, lang) {
  if (!challenge) return '';
  const variant = getVariantName(challenge.variantId);
  const n = challenge.target;
  switch (challenge.type) {
    case 'wins':   return `${t('missWins') || 'Win'} ${n} ${variant} ${n===1?'game':'games'}`;
    case 'draws':  return `Make ${n} draw${n>1?'s':''} in ${variant}`;
    case 'losses': return `Play ${n} ${variant} game${n>1?'s':''}`;
    default:       return challenge.desc || '';
  }
}

export default function DailyChallengeScreen() {
  const { navigate } = useContext(AppContext);
  const lang = useLang();
  const th   = getTheme();

  const [player,    setPlayer]   = useState(null);
  const [attempts,  setAttempts] = useState({ used:0, max:3 });
  const [completed, setCompleted]= useState(false);
  const [timeLeft,  setTimeLeft] = useState({ h:0, m:0 });
  const [streak,    setStreak]   = useState(0);

  const challenge = getTodayChallenge();
  const variant   = challenge ? Object.values(CONFIG.GAME_VARIANTS||{}).find(v=>v.id===challenge.variantId) : null;

  useEffect(() => {
    loadData();
    const iv = setInterval(() => setTimeLeft(getHoursToReset()), 60000);
    setTimeLeft(getHoursToReset());
    return () => clearInterval(iv);
  }, []);

  const loadData = async () => {
    const p  = await getPlayer();
    const vip = p?.vip;
    const max = vip ? (CONFIG.DAILY_PASS_VIP_ATTEMPTS||5) : (CONFIG.DAILY_PASS_FREE_ATTEMPTS||3);
    setPlayer(p);
    setAttempts({ used: 0, max });

    // Carica stato challenge dal storage
    const saved = await loadMissionsState();
    const today = new Date().toDateString();
    if (saved?.dailyChallengeDate === today) {
      setAttempts({ used: saved.dailyChallengeAttempts||0, max });
      setCompleted(saved.dailyChallengeCompleted||false);
      setStreak(saved.dailyChallengeStreak||0);
    }
  };

  const onPlay = async () => {
    if (!challenge || !variant) return;
    if (attempts.used >= attempts.max) return;

    // Incrementa tentativi
    const today  = new Date().toDateString();
    const saved  = await loadMissionsState() || {};
    const newUsed = (saved.dailyChallengeDate === today ? saved.dailyChallengeAttempts||0 : 0) + 1;
    await saveMissionsState({
      ...saved,
      dailyChallengeDate:     today,
      dailyChallengeAttempts: newUsed,
      dailyChallengeStreak:   saved.dailyChallengeStreak||0,
    });
    setAttempts(a => ({ ...a, used: newUsed }));

    // Naviga a 'game' direttamente: 'online' redirect a 'play' e perde i params
    const playerName = player?.name || 'Tu';
    const piece = player?.selectedPieceX || 'X';
    navigate('game', {
      variantId:       challenge.variantId,
      mode:            'online',
      aiLevel:         'medium',
      p1Name:          playerName,
      p2Name:          'Avversario',
      pieceP1:         piece,
      pieceP2:         piece === 'X' ? 'O' : 'X',
      dailyChallenge:  true,
      challengeType:   challenge.type,
      challengeTarget: challenge.target,
      reward:          challenge.reward,
    });
  };

  const attemptsLeft = Math.max(0, attempts.max - attempts.used);
  const progressPct  = attempts.max > 0 ? (attempts.used / attempts.max) : 0;

  if (!challenge || !variant) return (
    <View style={[s.root,{backgroundColor:th.bg}]}>
      <AppHeader title="🎁 Daily Challenge" />
      <View style={{flex:1,justifyContent:'center',alignItems:'center'}}>
        <Text style={{color:th.textMuted,fontSize:16}}>Nessuna challenge disponibile oggi.</Text>
      </View>
    </View>
  );

  return (
    <View style={[s.root,{backgroundColor:th.bg}]}>
      <AppHeader title="🎁 Daily Challenge" />
      <ScrollView contentContainerStyle={s.content}>

        {/* ── COUNTDOWN AL RESET ── */}
        <View style={[s.countdownBox,{backgroundColor:th.bgCard,borderColor:th.border}]}>
          <Text style={[s.countdownLabel,{color:th.textMuted}]}>Reset tra</Text>
          <Text style={[s.countdownTime,{color:th.accent}]}>
            {String(timeLeft.h).padStart(2,'0')}:{String(timeLeft.m).padStart(2,'0')}h
          </Text>
        </View>

        {/* ── CARD CHALLENGE PRINCIPALE ── */}
        <View style={[s.challengeCard,{backgroundColor:'rgba(76,175,80,0.12)',borderColor:'#4caf50'}]}>
          {/* Icona variante grande */}
          <View style={[s.variantIconBox,{backgroundColor:'rgba(76,175,80,0.2)'}]}>
            <Text style={s.variantIcon}>{getVariantIcon(challenge.variantId)}</Text>
          </View>

          {/* Nome variante */}
          <Text style={[s.variantName,{color:'#4caf50'}]}>{variant.name}</Text>

          {/* Obiettivo */}
          <Text style={[s.objective,{color:th.textPrimary}]}>
            {getObjectiveText(challenge, lang)}
          </Text>

          {/* Regole variante */}
          <View style={[s.rulesBox,{backgroundColor:th.bgCard,borderColor:th.border}]}>
            <Text style={[s.rulesTitle,{color:th.accent}]}>📋 Rules</Text>
            {(variant.rules||[]).map((r,i) => (
              <Text key={i} style={[s.ruleItem,{color:th.textSecondary}]}>• {r}</Text>
            ))}
          </View>

          {/* Reward */}
          <View style={s.rewardRow}>
            <View style={[s.rewardChip,{backgroundColor:th.accentBg,borderColor:th.accent}]}>
              <Text style={[s.rewardTxt,{color:th.accent}]}>
                +{challenge.reward?.credits||50} 💰
              </Text>
            </View>
            <View style={[s.rewardChip,{backgroundColor:'rgba(0,191,255,0.1)',borderColor:'#00bfff'}]}>
              <Text style={[s.rewardTxt,{color:'#00bfff'}]}>
                +{challenge.reward?.xp||100} XP
              </Text>
            </View>
            {streak > 0 && (
              <View style={[s.rewardChip,{backgroundColor:'rgba(245,166,35,0.1)',borderColor:'#f5a623'}]}>
                <Text style={[s.rewardTxt,{color:'#f5a623'}]}>
                  🔥 {streak}d streak
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* ── TENTATIVI ── */}
        <View style={[s.attemptsCard,{backgroundColor:th.bgCard,borderColor:th.border}]}>
          <Text style={[s.attemptsTitle,{color:th.textPrimary}]}>Tentativi</Text>
          <View style={s.attemptsRow}>
            {Array.from({length:attempts.max}).map((_,i)=>(
              <View key={i} style={[s.attemptDot,{
                backgroundColor: i < attempts.used ? th.danger : '#4caf50',
                opacity: i < attempts.used ? 0.4 : 1,
              }]}>
                <Text style={{color:'#fff',fontSize:16}}>
                  {i < attempts.used ? '✓' : '●'}
                </Text>
              </View>
            ))}
          </View>
          <Text style={[s.attemptsLeft,{color:th.textMuted}]}>
            {attemptsLeft > 0 ? `${attemptsLeft} tentativi rimasti` : 'Tentativi esauriti'}
          </Text>
          {player?.vip ? (
            <View style={[s.vipBadge,{backgroundColor:'rgba(255,215,0,0.15)',borderColor:'#ffd700'}]}>
              <Text style={{color:'#ffd700',fontSize:12,fontWeight:'700'}}>👑 VIP: {attempts.max} tentativi</Text>
            </View>
          ) : (
            <TouchableOpacity
              style={[s.vipHint,{borderColor:th.border}]}
              onPress={()=>navigate('shop')}>
              <Text style={{color:th.textMuted,fontSize:12}}>
                👑 VIP → 5 tentativi · doppio reward →
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* ── PULSANTE GIOCA ── */}
        {!completed ? (
          <TouchableOpacity
            style={[s.playBtn,{
              backgroundColor: attemptsLeft>0 ? '#4caf50' : th.border,
              opacity: attemptsLeft>0 ? 1 : 0.5,
            }]}
            onPress={onPlay}
            disabled={attemptsLeft<=0}>
            <Text style={s.playBtnTxt}>
              {attemptsLeft>0 ? `⚡ Gioca — ${variant.name}` : '⏸ Riprova domani'}
            </Text>
          </TouchableOpacity>
        ) : (
          <View style={[s.completedBadge,{backgroundColor:'rgba(76,175,80,0.15)',borderColor:'#4caf50'}]}>
            <Text style={{fontSize:28,marginBottom:6}}>🏆</Text>
            <Text style={{color:'#4caf50',fontSize:18,fontWeight:'900'}}>Challenge completata!</Text>
            <Text style={{color:th.textMuted,fontSize:13,marginTop:4}}>Torna domani per la prossima</Text>
          </View>
        )}

        {/* ── STORICO ULTIME 7 CHALLENGE ── */}
        <View style={[s.historyCard,{backgroundColor:th.bgCard,borderColor:th.border}]}>
          <Text style={[s.historyTitle,{color:th.textPrimary}]}>Ultime challenge</Text>
          {(CONFIG.DAILY_CHALLENGES||[]).slice(0,7).map((ch,i)=>(
            <View key={i} style={[s.histRow,{borderBottomColor:th.border}]}>
              <Text style={{fontSize:20,marginRight:10}}>
                {getVariantIcon(ch.variantId)}
              </Text>
              <View style={{flex:1}}>
                <Text style={[{fontSize:13,fontWeight:'700',color:th.textPrimary}]}>
                  {getVariantName(ch.variantId)}
                </Text>
                <Text style={[{fontSize:11,color:th.textMuted}]}>
                  {ch.desc}
                </Text>
              </View>
              <Text style={[{color:th.accent,fontSize:12,fontWeight:'700'}]}>
                +{ch.reward?.credits}💰
              </Text>
            </View>
          ))}
        </View>

        <View style={{height:20}}/>
      </ScrollView>
    </View>
  );
}

function getVariantIcon(variantId) {
  const icons = {
    classic:'#️⃣', ultimate:'🔢', random:'🎲',
    classic_4x4:'4️⃣', classic_5x5:'5️⃣',
    misere:'🔄', wild:'🃏', order_chaos:'⚖️',
  };
  return icons[variantId] || '🎮';
}

const s = StyleSheet.create({
  root:          { flex:1 },
  content:       { padding:16, paddingBottom:40 },
  countdownBox:  { flexDirection:'row', justifyContent:'space-between', alignItems:'center', borderRadius:12, padding:12, marginBottom:12, borderWidth:1 },
  countdownLabel:{ fontSize:13 },
  countdownTime: { fontSize:20, fontWeight:'900' },
  challengeCard: { borderRadius:20, padding:20, marginBottom:14, borderWidth:2, alignItems:'center' },
  variantIconBox:{ width:70, height:70, borderRadius:35, justifyContent:'center', alignItems:'center', marginBottom:12 },
  variantIcon:   { fontSize:36 },
  variantName:   { fontSize:24, fontWeight:'900', marginBottom:6 },
  objective:     { fontSize:16, fontWeight:'700', textAlign:'center', marginBottom:14 },
  rulesBox:      { borderRadius:12, padding:12, borderWidth:1, width:'100%', marginBottom:14 },
  rulesTitle:    { fontSize:13, fontWeight:'700', marginBottom:6 },
  ruleItem:      { fontSize:12, marginBottom:3 },
  rewardRow:     { flexDirection:'row', gap:8, flexWrap:'wrap', justifyContent:'center' },
  rewardChip:    { borderRadius:10, paddingHorizontal:12, paddingVertical:6, borderWidth:1 },
  rewardTxt:     { fontSize:14, fontWeight:'800' },
  attemptsCard:  { borderRadius:16, padding:16, marginBottom:14, borderWidth:1, alignItems:'center' },
  attemptsTitle: { fontSize:16, fontWeight:'800', marginBottom:12 },
  attemptsRow:   { flexDirection:'row', gap:10, marginBottom:8 },
  attemptDot:    { width:44, height:44, borderRadius:22, justifyContent:'center', alignItems:'center' },
  attemptsLeft:  { fontSize:14, marginBottom:10 },
  vipBadge:      { borderRadius:10, paddingHorizontal:14, paddingVertical:6, borderWidth:1 },
  vipHint:       { borderRadius:10, paddingHorizontal:12, paddingVertical:6, borderWidth:1 },
  playBtn:       { borderRadius:16, padding:16, alignItems:'center', marginBottom:14 },
  playBtnTxt:    { color:'#fff', fontWeight:'900', fontSize:18 },
  completedBadge:{ borderRadius:16, padding:20, alignItems:'center', marginBottom:14, borderWidth:2 },
  historyCard:   { borderRadius:16, padding:14, borderWidth:1 },
  historyTitle:  { fontSize:15, fontWeight:'800', marginBottom:10 },
  histRow:       { flexDirection:'row', alignItems:'center', paddingVertical:8, borderBottomWidth:1 },
});
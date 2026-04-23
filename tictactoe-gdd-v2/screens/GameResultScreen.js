// screens/GameResultScreen.js

import React, { useEffect, useRef, useState, useContext } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  Animated, Dimensions, Share, Vibration, ScrollView, Linking,
} from 'react-native';
import { AppContext } from '../App';
import { theme as getTheme } from '../utils/theme';
import { t, useLang } from '../utils/i18n';
import { playWin, playLose, playDraw, playLevelUp } from '../utils/audioManager';
import { showRewardedAdCustom } from '../services/ads';
import { canWatchVideo, getPlayer, addCredits } from '../utils/storage';
import { getMissionsWithState } from '../utils/missions';
import CONFIG from '../config';
import { shareChallenge } from '../utils/challengeLink';
import { playShare } from '../utils/audioManager';
import AppHeader from '../components/AppHeader';
import PostLossPanel from '../components/PostLossPanel';
import { getXpProgress } from '../utils/xpUtils';

const { width, height } = Dimensions.get('window');
const CONFETTI    = ['#e94560','#00bfff','#f5a623','#4caf50','#b39ddb','#ff7043','#ffd700'];
function missionLabel(m) {
  if (!m) return '';
  const vn = m.variantId
    ? Object.values(CONFIG.GAME_VARIANTS||{}).find(v=>v.id===m.variantId)?.name||m.variantId
    : '';
  const p=m.progress||0, tg=m.target||1;
  switch(m.type) {
    case 'games_played':      return `${p}/${tg} partite`;
    case 'wins':              return `${p}/${tg} vittorie`;
    case 'ai_wins':           return `${p}/${tg} vs AI`;
    case 'online_wins':
      // Ranked externally; internal key stays 'online_wins'
      return `${p}/${tg} Online`;
    case 'win_streak':        return `${p}/${tg} in fila`;
    case 'online_win_streak': return `${p}/${tg} in fila online`;
    case 'variant_wins':      return `${p}/${tg} vittorie ${vn}`;
    case 'variant_games':     return `${p}/${tg} partite ${vn}`;
    case 'no_quit':           return `${p}/${tg} senza quit`;
    default:                  return `${p}/${tg}`;
  }
}

// Risolve un unlock id in label+valore leggibile da PIECE_UNLOCKS
function resolveUnlock(id) {
  if (!id) return null;
  const piece = (CONFIG.PIECE_UNLOCKS||[]).find(u=>u.id===id);
  return piece ? { label: piece.label, value: piece.value, rarity: piece.rarity } : { label: id, value: '🎁', rarity: 'common' };
}

// Colore rarity
function rarityColor(rarity) {
  switch(rarity) {
    case 'legendary': return '#ffd700';
    case 'epic':      return '#b39ddb';
    case 'rare':      return '#00bfff';
    default:          return '#4caf50';
  }
}

// ── Level Up Card animata ─────────────────────────────────
function LevelUpCard({ newLevel, newUnlocks=[], creditsEarned=0, xpEarned=0, th }) {
  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.75)).current;

  useEffect(()=>{
    // Suono level up: usa playLevelUp (fallback su playWin se non disponibile)
    try { playLevelUp(); } catch(e) { try { playWin(); } catch(e2) { /* intentionally ignored — audio optional */ } }
    Vibration.vibrate([0, 80, 50, 120, 50, 200]);
    Animated.parallel([
      Animated.timing(fadeAnim,  { toValue:1, duration:400, delay:150, useNativeDriver:true }),
      Animated.spring(scaleAnim, { toValue:1, tension:60,   friction:7, delay:150, useNativeDriver:true }),
    ]).start();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[]);

  const unlocks = (newUnlocks||[]).map(id=>resolveUnlock(id)).filter(Boolean);

  return (
    <Animated.View style={[lv.card,{
      backgroundColor:'rgba(255,215,0,0.08)',
      borderColor:'#ffd700',
      opacity:fadeAnim,
      transform:[{scale:scaleAnim}],
    }]}>
      <Text style={lv.emoji}>✨</Text>
      <Text style={lv.title}>LEVEL UP!</Text>
      <Text style={lv.sub}>Sei salito al livello <Text style={{color:'#ffd700',fontWeight:'900'}}>{newLevel}</Text> 🎉</Text>

      <View style={lv.rewardsBox}>
        <Text style={[lv.rewardsTitle,{color:th.textMuted}]}>Ricompense</Text>

        {/* Level up: sempre +50 crediti (possono superare cap naturale 120) */}
        <View style={[lv.rewardRow,{borderColor:'#ffd70055',marginBottom:8}]}>
          <Text style={{fontSize:22,marginRight:10}}>💰</Text>
          <View style={{flex:1}}>
            <Text style={[lv.rewardLabel,{color:'#ffd700'}]}>+50 Crediti</Text>
            <Text style={[lv.rewardRarity,{color:'#ffd700'}]}>level up bonus</Text>
          </View>
        </View>
        {unlocks.length>0 ? (
          unlocks.map((u,i)=>(
            <View key={i} style={[lv.rewardRow,{borderColor:rarityColor(u.rarity)+'44'}]}>
              <Text style={{fontSize:22,marginRight:10}}>{u.value==='PHOTO'?'📸':u.value}</Text>
              <View style={{flex:1}}>
                <Text style={[lv.rewardLabel,{color:rarityColor(u.rarity)}]}>{u.label}</Text>
                <Text style={[lv.rewardRarity,{color:rarityColor(u.rarity)}]}>{u.rarity}</Text>
              </View>
              <Text style={{color:rarityColor(u.rarity),fontSize:14}}>🔓</Text>
            </View>
          ))
        ) : (
          <Text style={[lv.fallback,{color:th.textMuted}]}>
            {'Continua a giocare per sbloccare nuove pedine!'}
          </Text>
        )}
      </View>
    {/* Burst radiale — 8 particelle esplose da centro */}
    <View style={[StyleSheet.absoluteFill,{overflow:'hidden'}]} pointerEvents="none">
      {CONFETTI.slice(0,8).map((col,i)=>{
        const angle = (i/8)*Math.PI*2;
        const dist  = 60+i*8;
        return (
          <Animated.View key={i} style={{
            position:'absolute',
            left:'50%', top:'50%',
            width:8, height:8, borderRadius:4,
            backgroundColor:col,
            transform:[
              {translateX:scaleAnim.interpolate({inputRange:[0.75,1],outputRange:[0,Math.cos(angle)*dist]})},
              {translateY:scaleAnim.interpolate({inputRange:[0.75,1],outputRange:[0,Math.sin(angle)*dist]})},
              {scale:fadeAnim},
            ],
            opacity:fadeAnim.interpolate({inputRange:[0,0.5,1],outputRange:[0,1,0]}),
          }}/>
        );
      })}
    </View>
    </Animated.View>
  );
}
const lv = StyleSheet.create({
  card:        {width:'100%',borderRadius:18,padding:18,borderWidth:2,marginBottom:10,alignItems:'center'},
  emoji:       {fontSize:40,marginBottom:4},
  title:       {fontSize:24,fontWeight:'900',color:'#ffd700',letterSpacing:2,marginBottom:4},
  sub:         {fontSize:14,color:'#e0c97f',marginBottom:14,textAlign:'center'},
  rewardsBox:  {width:'100%'},
  rewardsTitle:{fontSize:11,fontWeight:'700',marginBottom:8,textAlign:'center',letterSpacing:1},
  rewardRow:   {flexDirection:'row',alignItems:'center',borderRadius:10,padding:10,marginBottom:6,borderWidth:1,backgroundColor:'rgba(255,255,255,0.04)'},
  rewardLabel: {fontSize:13,fontWeight:'800'},
  rewardRarity:{fontSize:10,fontWeight:'600',marginTop:1,textTransform:'uppercase'},
  fallback:    {fontSize:13,textAlign:'center',lineHeight:20,paddingVertical:4},
});

// ── Coriandoli ────────────────────────────────────────────
function Confetti({ active }) {
  const particles = useRef(Array.from({length:36},(_,i)=>({
    x:   new Animated.Value(Math.random()*width),
    y:   new Animated.Value(-30),
    rot: new Animated.Value(0),
    color: CONFETTI[i%CONFETTI.length],
    size: 6+Math.random()*8,
    delay: Math.random()*500,
    dur:  1200+Math.random()*800,
  }))).current;
  const started = useRef(false);
  useEffect(()=>{
    if (!active||started.current) return;
    started.current=true;
    particles.forEach(p=>{
      Animated.parallel([
        Animated.timing(p.y,  {toValue:height+50,duration:p.dur,delay:p.delay,useNativeDriver:true}),
        Animated.timing(p.rot,{toValue:720,       duration:p.dur,delay:p.delay,useNativeDriver:true}),
      ]).start();
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[active]);
  if (!active) return null;
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {particles.map((p,i)=>(
        <Animated.View key={i} style={{
          position:'absolute',left:p.x,
          width:p.size,height:p.size,
          borderRadius:Math.random()>0.5?p.size:0,
          backgroundColor:p.color,
          transform:[
            {translateY:p.y},
            {rotate:p.rot.interpolate({inputRange:[0,720],outputRange:['0deg','720deg']})},
          ],
        }}/>
      ))}
    </View>
  );
}

// ── Scheda doppia partita ─────────────────────────────────
function DoubleMatchCard({ leg1Result, leg2Result, th, forfeit=false }) {
  const myWins  = (leg1Result==='win'?1:0)+(leg2Result==='win'?1:0);
  const oppWins = (leg1Result==='loss'?1:0)+(leg2Result==='loss'?1:0);
  const draws   = (leg1Result==='draw'?1:0)+(leg2Result==='draw'?1:0);
  const col = myWins>oppWins?'#4caf50':oppWins>myWins?(th.danger||'#e94560'):(th.info||'#00bfff');
  const label = myWins>oppWins?t('youWin'):oppWins>myWins?t('youLose'):t('itsDraw');
  return (
    <View style={[dm.root,{backgroundColor:th.bgCard,borderColor:th.border}]}>
      <Text style={[dm.header,{color:th.textPrimary}]}>
        {forfeit?'⚠️ Avversario abbandonato — 2-0':'⚽ Doppia Partita'}
      </Text>
      {!forfeit&&(
        <View style={dm.row}>
          {[['Andata',leg1Result],['Ritorno',leg2Result]].map(([lbl,res])=>(
            <View key={lbl} style={[dm.leg,{
              backgroundColor:res==='win'?'rgba(76,175,80,0.15)':res==='loss'?'rgba(233,69,96,0.15)':'rgba(0,191,255,0.15)',
              borderColor:res==='win'?'#4caf50':res==='loss'?(th.danger||'#e94560'):(th.info||'#00bfff'),
            }]}>
              <Text style={{fontSize:18}}>{res==='win'?'🏆':res==='loss'?'💔':'🤝'}</Text>
              <Text style={[dm.legLbl,{color:th.textMuted}]}>{lbl}</Text>
            </View>
          ))}
        </View>
      )}
      <View style={[dm.agg,{backgroundColor:`${col}15`,borderColor:col}]}>
        <Text style={{fontSize:26,marginRight:10}}>{myWins>oppWins?'🏆':oppWins>myWins?'😔':'🤝'}</Text>
        <View>
          <Text style={[dm.aggRes,{color:col}]}>{label}</Text>
          <Text style={[dm.aggSco,{color:th.textPrimary}]}>
            {myWins} - {oppWins}{draws>0?` (${draws} pareggi)`:''}
          </Text>
        </View>
      </View>
    </View>
  );
}
const dm = StyleSheet.create({
  root:   {borderRadius:16,padding:14,borderWidth:1,marginBottom:12},
  header: {fontSize:14,fontWeight:'800',marginBottom:10,textAlign:'center'},
  row:    {flexDirection:'row',gap:10,marginBottom:10},
  leg:    {flex:1,borderRadius:12,padding:12,alignItems:'center',borderWidth:1},
  legLbl: {fontSize:11,marginTop:4},
  agg:    {borderRadius:12,padding:12,flexDirection:'row',alignItems:'center',borderWidth:1.5},
  aggRes: {fontSize:16,fontWeight:'900'},
  aggSco: {fontSize:14,fontWeight:'700',marginTop:2},
});

// ── MAIN ──────────────────────────────────────────────────
export default function GameResultScreen() {
  const { navigate, screenParams, refreshCredits, credits, unlimitedActive } = useContext(AppContext);
  useLang();
  const th = getTheme();

  const {
    result='draw', variantId='classic', mode='ai', difficulty='medium',
    creditsEarned=0, xpEarned=0, newLevel=null, previousLevel=null,
    newUnlocks=[], newAchievements=[], newMissions=[],
    leg=1, leg1Result=null, leg1Forfeit=false,
    pieceP1='X', pieceP2='O',
    rematchCost=3, onRematch, onMenu,
  } = screenParams || {};

  const [confetti,       setConfetti]       = useState(false);
  const [watchedAd,      setWatchedAd]      = useState(false);
  const [adLoading,      setAdLoading]      = useState(false);
  const [extraCr,        setExtraCr]        = useState(0);
  const [bonusPop,       setBonusPop]       = useState(false);
  const [playerXp,       setPlayerXp]       = useState(0);
  const [playerLv,       setPlayerLv]       = useState(1);
  const [closestMission, setClosestMission] = useState(null);

  const emojiAnim     = useRef(new Animated.Value(0)).current;
  const cardAnim      = useRef(new Animated.Value(0)).current;
  const shakeAnim     = useRef(new Animated.Value(0)).current;
  const _timerRefs    = useRef([]);   // cleanup setTimeout on unmount
  const _mounted      = useRef(true);  // guard setState after unmount

  const isWin  = result==='win';
  const isLoss = result==='loss';
  const isDraw = result==='draw';
  const isLeg2 = leg===2;

  const varCfg         = Object.values(CONFIG.GAME_VARIANTS).find(v=>v.id===variantId);
  const supportsDouble = mode==='online' && varCfg?.doubleMatch===true;
  const variantLabel   = varCfg?.name||variantId;
  // Mode label — 'Online' è rinominata 'Ranked' lato UX; mode='online' rimane invariato internamente
  const modeLabel      = mode==='local'?'Local':mode==='ai'?'vs AI':'Online (Beta)';

  const cfg = isWin
    ? {emoji:'🏆',title:t('youWin'), bg:th.accentBg,  border:th.accent,           color:th.accent}
    : isDraw
    ? {emoji:'🤝',title:t('itsDraw'),bg:th.infoBg||'rgba(0,191,255,0.1)',border:th.info||'#00bfff',color:th.info||'#00bfff'}
    : {emoji:'😔',title:t('youLose'),bg:th.dangerBg||'rgba(233,69,96,0.1)',border:th.danger||'#e94560',color:th.danger||'#e94560'};

  useEffect(()=>{
    let active = true;
    getPlayer()
      .then(p=>{ if(p && active){ setPlayerXp(p.xp||0); setPlayerLv(p.level||1); } })
      .catch(()=>{});
    try {
      const ms = getMissionsWithState('daily')
        .filter(m=>!m.completed&&!m.claimed&&(m.target||0)>0&&(m.progress||0)>0);
      if (ms.length) setClosestMission(ms.sort((a,b)=>(b.progress/b.target)-(a.progress/a.target))[0]);
    } catch (e) { /* intentionally ignored */ }
    return () => { active = false; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[]);

  useEffect(()=>{
    if (isWin)       { playWin();  Vibration.vibrate([0,60,30,100,30,80]); }
    else if (isLoss) { playLose(); Vibration.vibrate(350); }
    else             { playDraw(); Vibration.vibrate(70); }

    // Confetti: vittoria O level up → celebrazione visiva
    const t1 = (isWin || newLevel != null) ? setTimeout(()=>setConfetti(true),200) : null;
    if (t1) _timerRefs.current.push(t1);

    Animated.sequence([
      Animated.spring(emojiAnim,{toValue:1,tension:55,friction:5,useNativeDriver:true}),
      Animated.spring(cardAnim, {toValue:1,tension:60,friction:8,useNativeDriver:true}),
    ]).start();

    if (isLoss) {
      const t2 = setTimeout(()=>{
        Animated.sequence([
          Animated.timing(shakeAnim,{toValue:12, duration:55,useNativeDriver:true}),
          Animated.timing(shakeAnim,{toValue:-12,duration:55,useNativeDriver:true}),
          Animated.timing(shakeAnim,{toValue:8,  duration:55,useNativeDriver:true}),
          Animated.timing(shakeAnim,{toValue:-8, duration:55,useNativeDriver:true}),
          Animated.timing(shakeAnim,{toValue:0,  duration:55,useNativeDriver:true}),
        ]).start();
      },400);
      _timerRefs.current.push(t2);
    }

    return () => { _mounted.current = false; _timerRefs.current.forEach(clearTimeout); _timerRefs.current = []; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[]);

  // Reward post-game per modalità: AI Hard +3cr, Online +5cr
  // Non mostrare per Local, AI Easy, AI Medium
  const postGameReward = mode==='online' ? 5 : (mode==='ai' && difficulty==='hard') ? 3 : 0;
  const showPostGameRewarded = postGameReward > 0 && canWatchVideo() && !watchedAd;

  const onWatchAd = async () => {
    if (!canWatchVideo()||watchedAd||adLoading) return;
    if (!_mounted.current) return;
    setAdLoading(true);
    try {
      // showRewardedAdCustom: conta il video (recordVideoCount) ma NON aggiunge crediti.
      // I crediti vengono aggiunti QUI in modo esatto — nessun doppio accredito.
      await showRewardedAdCustom(async () => {
        if (!_mounted.current) return;
        // Aggiungi esattamente postGameReward: AI Hard=+3, Online=+5
        await addCredits(postGameReward, 'video');
        await refreshCredits();
        setExtraCr(postGameReward); // set (non add) — UI mostra esattamente quello che è stato dato
        setWatchedAd(true); setBonusPop(true);
        const t3 = setTimeout(()=>{ if (_mounted.current) setBonusPop(false); },2000);
        _timerRefs.current.push(t3);
      });
    } catch (e) { /* intentionally ignored */ }
    if (_mounted.current) setAdLoading(false);
  };

  // Share post-win: usa challengeLink per viral loop + reward
  const onShare = async () => {
    try {
      playShare();
      const player = await import('../utils/storage').then(m => m.getPlayer());
      const res = await shareChallenge({
        variantId,
        variantName:  variantLabel,
        result:       isWin ? 'win' : isDraw ? 'draw' : 'lose',
        eloAfter:     eloAfter || 500,
        playerName:   player?.name || 'Sfidante',
        lang:         'it',
        grantReward:  isWin, // reward solo per vittorie
      });
      if (res.rewarded) {
        // Mostra chip reward temporaneo
        if (_mounted.current) setBonusPop(true);
        setTimeout(() => { if (_mounted.current) setBonusPop(false); }, 2200);
      }
    } catch (e) { /* share non disponibile */ }
  };
  const onStartRet = () => navigate('game',{variantId,mode:'online',pieceP1:pieceP2,pieceP2:pieceP1,leg:2,leg1Result:result});
  const goMenu     = () => { if (onMenu) onMenu(); else navigate('home'); };

  // ── Rating prompt soft ─────────────────────────────────
  // Solo dopo vittorie significative (Online Beta win o level-up) — mai dopo sconfitte
  const shouldShowRatingPrompt = isWin && mode === 'online' && !isDraw;
  const handleRateUs = async () => {
    // Usa l'API nativa Android se disponibile (expo-store-review o react-native-rate)
    // Fallback: apri Play Store direttamente
    try {
      // expo-store-review: se installato, preferire StoreReview.requestReview() (in-app)
      // Fallback: apri Play Store
      Linking.openURL('market://details?id=com.tictactoegdd.app').catch(() =>
        Linking.openURL('https://play.google.com/store/apps/details?id=com.tictactoegdd.app')
      );
    } catch (e) { /* intentionally ignored */ }
  };

  const emojiScale = emojiAnim.interpolate({inputRange:[0,1],outputRange:[0.2,1]});
  const cardTransY = cardAnim.interpolate({inputRange:[0,1],outputRange:[60,0]});

  // XP progress — usa solo playerXp/playerLv da storage (mai newLevel)
  const { pct:xpPct, toNext:xpToNext, nextLv } = getXpProgress(playerXp, playerLv);

  // currentCredits usa credits dal context (già aggiornato da refreshCredits dopo il video)
  // extraCr è solo per il chip animato UI — non aggiunto qui per evitare doppio conteggio
  const currentCredits = unlimitedActive ? 9999 : (credits||0);
  const hasEnough      = unlimitedActive || currentCredits>=rematchCost;
  const missingCredits = Math.max(0, rematchCost-currentCredits);
  // videoWouldHelp usa postGameReward (AI Hard=3, Online=5) — coerente con onWatchAd
  const videoWouldHelp = !hasEnough && canWatchVideo() && !watchedAd && (currentCredits+postGameReward)>=rematchCost;
  const almostThere    = !hasEnough && missingCredits<=5;

  return (
    <View style={[s.root,{backgroundColor:th.bg}]}>
      <Confetti active={confetti}/>

      {bonusPop&&(
        <View style={[s.bonusPop,{backgroundColor:'#4caf50'}]}>
          <Text style={s.bonusPopTxt}>+{extraCr} 💰 Crediti bonus!</Text>
        </View>
      )}

      <AppHeader title={`${cfg.emoji} ${cfg.title}`} onBack={goMenu}/>

      <ScrollView contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>

        {supportsDouble&&(
          <View style={[s.legBadge,{backgroundColor:isLeg2?th.accentBg:th.bgCard,borderColor:th.border}]}>
            <Text style={[s.legBadgeTxt,{color:isLeg2?th.accent:th.textMuted}]}>
              {isLeg2?'↩️ Ritorno':leg1Forfeit?'⚠️ Avversario abbandonato':'➡️ Andata'}
            </Text>
          </View>
        )}

        <Animated.Text style={[s.bigEmoji,{transform:[{scale:emojiScale},{translateX:shakeAnim}]}]}>
          {cfg.emoji}
        </Animated.Text>

        {/* ── CARD PRINCIPALE ─────────────────────────── */}
        <Animated.View style={[s.card,{
          backgroundColor:cfg.bg, borderColor:cfg.border,
          transform:[{translateY:cardTransY}], opacity:cardAnim,
        }]}>

          {/* 1. Result title */}
          <Text style={[s.resultTitle,{color:cfg.color}]}>{cfg.title}</Text>
          <Text style={[s.resultSub,{color:th.textMuted}]}>{variantLabel} · {modeLabel}</Text>

          {/* 2. Reward chips */}
          <View style={s.chipsRow}>
            {creditsEarned>0&&(
              <View style={[s.chip,{backgroundColor:'rgba(255,215,0,0.15)',borderColor:'#ffd700'}]}>
                <Text style={[s.chipTxt,{color:'#ffd700'}]}>+{creditsEarned} 💰</Text>
              </View>
            )}
            {xpEarned>0&&(
              <View style={[s.chip,{backgroundColor:'rgba(0,191,255,0.13)',borderColor:th.info||'#00bfff'}]}>
                <Text style={[s.chipTxt,{color:th.info||'#00bfff'}]}>+{xpEarned} XP</Text>
              </View>
            )}
            {extraCr>0&&(
              <View style={[s.chip,{backgroundColor:'rgba(76,175,80,0.15)',borderColor:'#4caf50'}]}>
                <Text style={[s.chipTxt,{color:'#4caf50'}]}>+{extraCr} 💰 Video</Text>
              </View>
            )}
          </View>

          {/* 3. CTA crediti */}
          {mode!=='local'&&onRematch&&(!supportsDouble||isLeg2)&&(
            <View style={[s.ctaBox,{
              backgroundColor:hasEnough?`${cfg.color}18`:'rgba(255,159,67,0.12)',
              borderColor:hasEnough?cfg.color:'#ff9f43',
            }]}>
              {hasEnough?(
                <>
                  <Text style={[s.ctaTitle,{color:cfg.color}]}>{isWin?'🔥 Sei in forma!':'💪 Non mollare!'}</Text>
                  <Text style={[s.ctaSub,{color:th.textMuted}]}>Hai {unlimitedActive?'∞':currentCredits} crediti — puoi giocare subito</Text>
                </>
              ):almostThere?(
                <>
                  <Text style={[s.ctaTitle,{color:'#ff9f43'}]}>⚡ Manca pochissimo!</Text>
                  <Text style={[s.ctaSub,{color:th.textMuted}]}>{videoWouldHelp?'Guarda 1 video e puoi giocare subito':`Ti mancano solo ${missingCredits} crediti`}</Text>
                </>
              ):(
                <>
                  <Text style={[s.ctaTitle,{color:'#ff9f43'}]}>⏱ Manca poco per giocare</Text>
                  <Text style={[s.ctaSub,{color:th.textMuted}]}>{`Ti mancano ${missingCredits} cr · si ricaricano ogni ${CONFIG.CREDITS_REGEN_MINUTES||8} min · o guarda un video`}</Text>
                </>
              )}
            </View>
          )}

          {/* 4. Pulsante Gioca Ancora */}
          {(!supportsDouble||isLeg2)&&onRematch&&(
            <TouchableOpacity style={[s.btnPlayAgain,{backgroundColor:cfg.color}]} onPress={onRematch}>
              <Text style={s.btnPlayAgainTxt}>{isWin?'↺ Rivincita!':'↺ Gioca Ancora'}</Text>
              <Text style={[s.btnPlayAgainSub,{color:'rgba(255,255,255,0.75)'}]}>
                {mode==='local'?'gratis':`${rematchCost} 💰`}
              </Text>
            </TouchableOpacity>
          )}

          {/* 5b. Post-Loss Panel — solo per sconfitte, prima dell'XP bar */}
          {isLoss && !isDraw && (
            <PostLossPanel
              playerXp={playerXp}
              playerLevel={playerLv}
              xpEarned={xpEarned}
              rematchCost={rematchCost}
              currentCredits={currentCredits}
              onRematch={onRematch}
              canWatchVideo={canWatchVideo()}
              postGameReward={postGameReward}
              onWatchAd={onWatchAd}
              adLoading={adLoading}
              closestMission={closestMission}
              onNavigateShop={() => navigate('shop')}
              th={th}
            />
          )}

          {/* 5. XP progress bar — usa playerXp/playerLv, MAI newLevel */}
          <View style={s.xpSection}>
            <View style={s.xpLabelRow}>
              <Text style={[s.xpLabel,{color:th.textMuted}]}>Lv.{playerLv}</Text>
              <Text style={[s.xpLabel,{color:th.textMuted}]}>{xpToNext>0?`${xpToNext} XP al Lv.${nextLv}`:'—'}</Text>
            </View>
            <View style={[s.xpBarBg,{backgroundColor:th.border}]}>
              <View style={[s.xpBarFill,{width:`${Math.round(xpPct*100)}%`,backgroundColor:th.info||'#00bfff'}]}/>
            </View>
          </View>

          {/* 6. Level Up celebration — con newUnlocks, animata, bordo dorato */}
          {newLevel!=null && (previousLevel === null || newLevel > previousLevel) &&(
            <LevelUpCard
              newLevel={newLevel}
              newUnlocks={newUnlocks||[]}
              creditsEarned={creditsEarned}
              xpEarned={xpEarned}
              th={th}
            />
          )}

          {/* 7. Missione più vicina */}
          {closestMission&&(
            <View style={[s.missionRow,{backgroundColor:th.bgCard,borderColor:th.border}]}>
              <Text style={{fontSize:15,marginRight:8}}>🎯</Text>
              <View style={{flex:1}}>
                <Text style={{fontSize:11,fontWeight:'700',color:th.textSecondary}}>
                  Missione — {missionLabel(closestMission)}
                </Text>
                <View style={[s.missBg,{backgroundColor:th.border,marginTop:4}]}>
                  <View style={[s.missFill,{
                    width:`${Math.round(Math.min(1,(closestMission.progress||0)/closestMission.target)*100)}%`,
                    backgroundColor:th.accent,
                  }]}/>
                </View>
              </View>
            </View>
          )}

          {/* 8. Missioni completate questa partita */}
          {(newMissions||[]).slice(0,2).map(m=>(
            <View key={m.id} style={[s.rewardRow,{backgroundColor:th.bgCard,borderColor:th.border}]}>
              <Text style={{fontSize:15,marginRight:8}}>✅</Text>
              <View style={{flex:1}}>
                <Text style={{fontSize:10,fontWeight:'700',color:'#4caf50'}}>Missione completata!</Text>
                <Text style={{fontSize:12,color:th.textPrimary}}>+{m.reward?.credits||0}💰 +{m.reward?.xp||0}XP — vai a riscuotere</Text>
              </View>
            </View>
          ))}

          {/* 9. Achievement */}
          {(newAchievements||[]).slice(0,1).map(a=>(
            <View key={a.id} style={[s.rewardRow,{backgroundColor:th.bgCard,borderColor:th.accent}]}>
              <Text style={{fontSize:15,marginRight:8}}>{a.icon||'🏅'}</Text>
              <View style={{flex:1}}>
                <Text style={{fontSize:10,fontWeight:'700',color:th.accent}}>Achievement!</Text>
                <Text style={{fontSize:12,fontWeight:'700',color:th.textPrimary}}>{a.title}</Text>
              </View>
            </View>
          ))}

        </Animated.View>

        {/* Doppia partita */}
        {isLeg2&&leg1Result&&<DoubleMatchCard leg1Result={leg1Result} leg2Result={result} th={th}/>}
        {supportsDouble&&!isLeg2&&leg1Forfeit&&<DoubleMatchCard leg1Result="win" leg2Result="win" th={th} forfeit/>}

        {/* ── AZIONI ───────────────────────────────────── */}
        <View style={s.actions}>
          {supportsDouble&&!isLeg2&&!leg1Forfeit&&(
            <TouchableOpacity style={[s.btnReturn,{backgroundColor:th.info||'#00bfff'}]} onPress={onStartRet}>
              <Text style={s.btnReturnTxt}>↩️ Gioca il Ritorno</Text>
              <Text style={s.btnReturnSub}>(2a partita — ruoli invertiti)</Text>
            </TouchableOpacity>
          )}

          {showPostGameRewarded&&(
            <TouchableOpacity
              style={[s.btnAd,{backgroundColor:adLoading?th.border:'rgba(76,175,80,0.15)',borderColor:'#4caf50'}]}
              onPress={onWatchAd}
              disabled={adLoading}>
              <Text style={[s.btnAdTxt,{color:'#4caf50'}]}>
                {adLoading?'⏳ Caricamento…':`📺 Video → +${postGameReward} cr · gioca ancora`}
              </Text>
              {!adLoading&&videoWouldHelp&&(
                <Text style={{color:'#4caf50',fontSize:11,marginTop:3}}>Dopo il video puoi giocare subito →</Text>
              )}
            </TouchableOpacity>
          )}

          <View style={s.rowBtns}>
            <TouchableOpacity style={[s.btnSec,{backgroundColor:th.bgCard,borderColor:th.border}]} onPress={onShare}>
              <Text style={[s.btnSecTxt,{color:th.textSecondary}]}>
                {isWin && mode==='online' ? '📤 Condividi sfida!' : '📤 ' + t('share')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity style={[s.btnSec,{backgroundColor:th.bgCard,borderColor:th.border}]} onPress={goMenu}>
              <Text style={[s.btnSecTxt,{color:th.textPrimary}]}>🏠 Menu</Text>
            </TouchableOpacity>
          </View>

          {/* Rating prompt soft — solo dopo vittoria Online (Beta) */}
          {shouldShowRatingPrompt && (
            <TouchableOpacity
              style={[s.rateRow, { backgroundColor:'rgba(255,215,0,0.06)', borderColor:'rgba(255,215,0,0.25)' }]}
              onPress={handleRateUs}
              activeOpacity={0.8}
            >
              <Text style={{fontSize:16,marginRight:10}}>⭐</Text>
              <View style={{flex:1}}>
                <Text style={{fontSize:13,fontWeight:'900',color:th.textPrimary}}>Ti stai divertendo?</Text>
                <Text style={{fontSize:11,color:th.textMuted,marginTop:1}}>Una recensione ci aiuta molto.</Text>
              </View>
              <Text style={{color:'#ffd700',fontSize:13,fontWeight:'900'}}>5★ →</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={{height:24}}/>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root:           {flex:1},
  scrollContent:  {padding:16,paddingBottom:30,alignItems:'center'},
  bigEmoji:       {fontSize:72,marginBottom:8,marginTop:4},
  bonusPop:       {position:'absolute',top:70,alignSelf:'center',borderRadius:20,paddingHorizontal:18,paddingVertical:8,zIndex:999},
  bonusPopTxt:    {color:'#fff',fontWeight:'900',fontSize:16},
  legBadge:       {borderRadius:12,paddingHorizontal:14,paddingVertical:6,borderWidth:1,marginBottom:8},
  legBadgeTxt:    {fontSize:12,fontWeight:'700'},
  card:           {width:'100%',borderRadius:22,padding:20,borderWidth:2,marginBottom:12},
  resultTitle:    {fontSize:28,fontWeight:'900',textAlign:'center',marginBottom:4},
  resultSub:      {fontSize:13,textAlign:'center',marginBottom:14},
  chipsRow:       {flexDirection:'row',flexWrap:'wrap',gap:8,justifyContent:'center',marginBottom:12},
  chip:           {borderRadius:12,paddingHorizontal:16,paddingVertical:9,borderWidth:1.5},
  chipTxt:        {fontSize:18,fontWeight:'900'},
  ctaBox:         {width:'100%',borderRadius:14,padding:12,borderWidth:1.5,marginBottom:10,alignItems:'center'},
  ctaTitle:       {fontSize:15,fontWeight:'900',marginBottom:2},
  ctaSub:         {fontSize:12,textAlign:'center'},
  btnPlayAgain:   {borderRadius:18,paddingVertical:20,paddingHorizontal:16,alignItems:'center',width:'100%',marginBottom:12},
  btnPlayAgainTxt:{color:'#fff',fontWeight:'900',fontSize:20},
  btnPlayAgainSub:{fontSize:12,marginTop:3},
  xpSection:      {width:'100%',marginBottom:10},
  xpLabelRow:     {flexDirection:'row',justifyContent:'space-between',marginBottom:4},
  xpLabel:        {fontSize:11},
  xpBarBg:        {height:8,borderRadius:4,overflow:'hidden',width:'100%'},
  xpBarFill:      {height:8,borderRadius:4},
  missionRow:     {flexDirection:'row',alignItems:'center',borderRadius:12,padding:10,marginBottom:6,borderWidth:1,width:'100%',marginTop:8},
  missBg:         {height:5,borderRadius:3,overflow:'hidden',width:'100%'},
  missFill:       {height:5,borderRadius:3},
  rewardRow:      {flexDirection:'row',alignItems:'center',borderRadius:12,padding:10,marginBottom:6,borderWidth:1,width:'100%'},
  actions:        {width:'100%',gap:10},
  btnReturn:      {borderRadius:16,padding:15,alignItems:'center'},
  btnReturnTxt:   {color:'#fff',fontWeight:'900',fontSize:16},
  btnReturnSub:   {color:'rgba(255,255,255,0.8)',fontSize:11,marginTop:2},
  btnAd:          {borderRadius:14,padding:13,alignItems:'center',borderWidth:1.5,width:'100%'},
  btnAdTxt:       {fontWeight:'800',fontSize:14},
  rowBtns:        {flexDirection:'row',gap:10},
  btnSec:         {flex:1,borderRadius:14,padding:13,alignItems:'center',borderWidth:1},
  btnSecTxt:      {fontWeight:'700',fontSize:14},
  rateRow:     { flexDirection:'row', alignItems:'center', padding:12, marginTop:8, borderRadius:12, borderWidth:1 },
});
// screens/GameScreen.js
// AGGIORNAMENTI:
// - Timer turno online: barra che si svuota, lampeggia rosso ultimi 5s
// - Timeout: AI easy fa la mossa per il giocatore
// - 2° timeout consecutivo dello stesso giocatore → sconfitta
// - Local: nessun timer
// - Doppia partita: forfeit → leg1Forfeit:true passato al GameResultScreen

import React, { useContext, useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  Dimensions, Animated, Vibration, Modal, AppState,
} from 'react-native';
import { AppContext } from '../App';
import CONFIG from '../config';
import { logGame, logAI, logError, validateGameState } from '../utils/debug';
import {
  createClassicState, makeMoveClassic,
  createUltimateState, makeMoveUltimate,
  createRandomState,
} from '../utils/gameLogic';
import { getAIMove, randomFirstPlayer, getThinkingDelay } from '../utils/ai';
import { updateStats, incrementGamesSession, recordAdShown, canWatchVideo, getStore } from '../utils/storage';
import { incrementWeeklyGames, updateLastActive } from '../utils/rewardSystems';
import { shouldShowAd as adsCheckShouldShow, showInterstitial, onInterstitialDismissed, getAdsState, showRewardedAd } from '../services/ads';
import { recordLocalResult } from '../utils/localSession';
import { theme as getTheme } from '../utils/theme';
import { t, useLang } from '../utils/i18n';
import VariantIcon from '../components/VariantIcon';
import RandomSpinWheel from '../components/RandomSpinWheel';

const { width } = Dimensions.get('window');
const TURN_SEC  = CONFIG.ONLINE_TURN_SECONDS || 15;
const DANGER    = CONFIG.TIMER_DANGER_SECONDS || 5;

// ── Componente Timer Barra ────────────────────────────────
// Visibile solo in modalità online, non in locale
function TurnTimerBar({ seconds, totalSeconds, th }) {
  const blinkAnim = useRef(new Animated.Value(1)).current;
  const isDanger  = seconds <= DANGER;

  useEffect(() => {
    if (!isDanger) { blinkAnim.setValue(1); return; }
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(blinkAnim, { toValue:0.15, duration:CONFIG.TIMER_BLINK_INTERVAL||400, useNativeDriver:true }),
        Animated.timing(blinkAnim, { toValue:1,    duration:CONFIG.TIMER_BLINK_INTERVAL||400, useNativeDriver:true }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, [isDanger]);

  const pct      = Math.max(0, seconds / totalSeconds);
  const barColor = isDanger ? '#e94560' : seconds <= totalSeconds * 0.4 ? '#f5a623' : '#4caf50';

  return (
    <View style={tb.root}>
      <View style={[tb.bg, { backgroundColor: th.border }]}>
        <Animated.View style={[tb.fill, {
          width: `${pct * 100}%`,
          backgroundColor: barColor,
          opacity: blinkAnim,
        }]} />
      </View>
      <Text style={[tb.sec, { color: isDanger ? '#e94560' : th.textMuted }]}>
        {seconds}s
      </Text>
    </View>
  );
}

const tb = StyleSheet.create({
  root:  { flexDirection:'row', alignItems:'center', paddingHorizontal:16, paddingVertical:4, gap:10 },
  bg:    { flex:1, height:7, borderRadius:4, overflow:'hidden' },
  fill:  { height:7, borderRadius:4 },
  sec:   { fontSize:13, fontWeight:'700', width:30, textAlign:'right' },
});

// ── Pannello info variante (10 secondi) ──────────────────
function RandomInfoPanel({ chosenVariant, onSkip, th }) {
  const [sec, setSec] = useState(CONFIG.RANDOM_PANEL_SECONDS);
  const v = Object.values(CONFIG.GAME_VARIANTS).find(x => x.id === chosenVariant);
  useEffect(() => {
    if (sec <= 0) { onSkip(); return; }
    const t = setTimeout(() => setSec(s => s-1), 1000);
    return () => clearTimeout(t);
  }, [sec, onSkip]);
  if (!v) return null;
  return (
    <View style={[rp.root, { backgroundColor: th.bg }]}>
      <View style={[rp.card, { backgroundColor: th.bgCard, borderColor: th.accent }]}>
        <Text style={[rp.title, { color: th.accent }]}>🎲 Random!</Text>
        <View style={rp.iconBox}>
          <VariantIcon variantId={chosenVariant} color={th.accent} size={64} />
        </View>
        <Text style={[rp.name, { color: th.textPrimary }]}>{v.name}</Text>
        {v.boardSize && (
          <Text style={[rp.grid, { color: th.textMuted }]}>
            {v.boardSize}×{v.boardSize} · Win {v.winLength} in a row
          </Text>
        )}
        <View style={rp.rules}>
          {(v.rules || []).slice(0,3).map((r,i) => (
            <Text key={i} style={[rp.rule, { color: th.textSecondary }]}>• {r}</Text>
          ))}
        </View>
        <View style={rp.bottom}>
          <Text style={[rp.timer, { color: th.textMuted }]}>Starting in {sec}s…</Text>
          <TouchableOpacity style={[rp.skipBtn, { backgroundColor: th.accent }]} onPress={onSkip}>
            <Text style={rp.skipTxt}>{t('skip')} →</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}


// ── MAIN GAME SCREEN ─────────────────────────────────────
export default function GameScreen() {
  const { navigate, screenParams, refreshCredits, credits, trySpendCredits } = useContext(AppContext);
  const lang = useLang();
  const th   = getTheme();
  const {
    variantId, mode, aiLevel, p1Name, p2Name, pieceP1, pieceP2,
    leg = 1, leg1Result = null,   // doppia partita
  } = screenParams;

  const [gameState,     setGameState]     = useState(null);
  const [thinking,      setThinking]      = useState(false);
  const [paused,        setPaused]        = useState(false);
  const [showQuit,      setShowQuit]      = useState(false);
  const [showRematch,   setShowRematch]   = useState(false);
  const [showAd,        setShowAd]        = useState(false);
  const [showNoCredits, setShowNoCredits] = useState(false);
  const [adWatchLoading, setAdWatchLoading] = useState(false);
  const [wildPending,   setWildPending]   = useState(null);
  const [chosenVariant, setChosenVariant] = useState(null);
  const [showInfoPanel, setShowInfoPanel] = useState(false);
  // pendingState rimosso: mai usato — era residuo di una feature incompleta
  const [randomFirst,   setRandomFirst]   = useState('X');

  // ── Timer online ─────────────────────────────────────────
  const [turnSec,     setTurnSec]     = useState(TURN_SEC);
  const [timerActive, setTimerActive] = useState(false);
  // conta timeout consecutivi per giocatore: { X: 0, O: 0 }
  const timeoutCount  = useRef({ X:0, O:0 });
  const timerIntervalRef = useRef(null);

  const winAnim          = useRef(new Animated.Value(0)).current;
  const aiTimer          = useRef(null);
  const gameStartRef     = useRef(Date.now()); // anti-farming: durata partita
  const lastRematchRef   = useRef(0);           // guard: previeni spam rematch
  const _navigatingRef   = useRef(false);        // guard: previeni doppia navigazione
  const appStateRef      = useRef(AppState.currentState);
  const leftAtRef        = useRef(null);
  const savedStateRef    = useRef(null);
  const _pendingResultRef = useRef(null);
  // handleGameOverRef / onTimerExpiredRef: ref pattern — nessuna stale closure
  const handleGameOverRef   = useRef(null);
  const onTimerExpiredRef   = useRef(null); // aggiornato dopo ogni render

  const variant     = Object.values(CONFIG.GAME_VARIANTS).find(v => v.id === variantId);
  // getMatchCost: costo effettivo per modalità e difficoltà
  // local=0, AI easy=0, AI medium=1, AI hard=2, online=variant.onlineCost
  const getMatchCost = () => {
    if (mode === 'local') return 0;
    if (mode === 'ai') {
      if (aiLevel === 'easy')   return 0;
      if (aiLevel === 'medium') return 1;
      if (aiLevel === 'hard')   return 2;
      return 1;
    }
    if (mode === 'online') {
      const base = variant?.onlineCost ?? 4;
      // Prime FREE_ONLINE_GAMES partite online gratis
      const freeGames = CONFIG.CREDITS_FREE_ONLINE_GAMES || 5;
      const onlineTotal = (() => {
        try { const s = getStore(); return s?.stats?.total?.onlineGames || 0; } catch(e) { return 0; /* store not loaded yet */ }
      })();
      return onlineTotal < freeGames ? 0 : base;
    }
    return variant?.creditCost ?? 0;
  };
  const cost        = getMatchCost();
  const rematchCost = variant?.rematchCost ?? Math.ceil(cost/2);
  const isOnline    = mode === 'online';

  const pieceX = pieceP1 || 'X';
  const pieceO = pieceP2 || 'O';
  const showP  = (p) => p === 'PHOTO' ? '📸' : (p || '?');

  const clearTurnTimer = useCallback(() => {
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    timerIntervalRef.current = null;
    setTimerActive(false);
  }, []); // refs + stable setters only — no deps needed

  const resetTurnTimer = () => {
    clearTurnTimer();
    setTurnSec(TURN_SEC);
    setTimerActive(true);
    timerIntervalRef.current = setInterval(() => {
      setTurnSec(prev => {
        if (prev <= 1) {
          clearInterval(timerIntervalRef.current);
          timerIntervalRef.current = null;
          setTimerActive(false);
          onTimerExpiredRef.current?.();
          return TURN_SEC;
        }
        return prev - 1;
      });
    }, 1000);
  };

  // Quando un giocatore fa una mossa volontariamente, resetta il suo counter timeout
  const onPlayerMoved = (player) => {
    timeoutCount.current[player] = 0;
  };

  const startNewGame = useCallback(() => {
    timeoutCount.current = { X:0, O:0 };
    gameStartRef.current = Date.now();
    _navigatingRef.current = false; // reset guard
    const first = randomFirstPlayer();

    if (variantId === 'random') {
      setRandomFirst(first);
      setShowInfoPanel(true);
    } else if (variantId === 'ultimate') {
      const s = createUltimateState(first);
      validateGameState(s, 'init');
      setGameState(s);
    } else {
      const s = createClassicState(variantId, first);
      if (!s) { logError('init','null state'); navigate('home'); return; }
      validateGameState(s, 'init');
      setGameState(s);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [variantId, navigate]); // refs e setters sono stabili, variantId è la dep reale

  // ── AppState ──────────────────────────────────────────────
  useEffect(() => {
    const sub = AppState.addEventListener('change', async (next) => {
      if (appStateRef.current==='active' && next!=='active') {
        leftAtRef.current = Date.now();
        if (mode==='ai' && gameState && !gameState.gameOver) {
          savedStateRef.current = gameState;
          setPaused(true);
          if (aiTimer.current) clearTimeout(aiTimer.current);
        }
        // Pausa timer online: ferma il setInterval, non solo il flag
        clearTurnTimer();
      }
      if (appStateRef.current!=='active' && next==='active') {
        const elapsed = leftAtRef.current ? (Date.now()-leftAtRef.current)/1000 : 0;
        if (elapsed > 30 && mode==='ai' && savedStateRef.current && !savedStateRef.current.gameOver) {
          const ls = { ...savedStateRef.current, winner:'O', gameOver:true };
          savedStateRef.current = null;
          setGameState(ls);
          await handleGameOverRef.current?.(ls, true);
        } else {
          savedStateRef.current = null;
          setPaused(false);
        }
        leftAtRef.current = null;
      }
      appStateRef.current = next;
    });
    return () => sub?.remove?.();
  }, [gameState, mode]);

  // ── Init ──────────────────────────────────────────────────
  useEffect(() => {
    logGame('init', `v=${variantId} mode=${mode} leg=${leg}`);
    startNewGame();
    return () => {
      if (aiTimer.current) clearTimeout(aiTimer.current);
      clearTurnTimer();
    };
  }, [variantId, startNewGame, clearTurnTimer]); // mode/leg solo per log — stable per lifetime

  // ── Timer online: avvia/ferma al cambio di turno ─────────
  useEffect(() => {
    if (!isOnline || !gameState || gameState.gameOver || paused) {
      clearTurnTimer();
      return;
    }
    // Avvia timer per turno umano (X = il giocatore locale)
    // In online entrambi hanno il timer, ma qui gestiamo solo il lato locale
    resetTurnTimer();
  }, [gameState?.moveCount, gameState?.currentPlayer, paused, isOnline]);

  // Timer scaduto — AI easy fa la mossa, secondo timeout = sconfitta
  const onTimerExpired = useCallback(() => {
    if (!gameState || gameState.gameOver) return;

    const currentP = gameState.currentPlayer;
    const newCount = (timeoutCount.current[currentP] || 0) + 1;
    timeoutCount.current[currentP] = newCount;

    logGame('timer', `timeout p=${currentP} count=${newCount}`);

    if (newCount >= (CONFIG.TIMER_CONSECUTIVE_MAX || 2)) {
      // 2° timeout: sconfitta
      const loser   = currentP;
      const winner  = loser === 'X' ? 'O' : 'X';
      const forfeit = { ...gameState, winner, gameOver:true };
      setGameState(forfeit);
      handleGameOverRef.current?.(forfeit, true);
      return;
    }

    // 1° timeout:
    // - AI mode → AI easy fa la mossa per il giocatore
    // - Online mode → sconfitta diretta (no AI fallback in multiplayer reale)
    if (isOnline) {
      // In online: 1° timeout = sconfitta immediata (comportamento equo)
      const loserOnline  = currentP;
      const winnerOnline = loserOnline === 'X' ? 'O' : 'X';
      const forfeitOnline = { ...gameState, winner: winnerOnline, gameOver: true };
      setGameState(forfeitOnline);
      handleGameOverRef.current?.(forfeitOnline, true);
      return;
    }
    try {
      const v  = gameState.chosenVariant || gameState.variant;
      const mv = getAIMove(gameState, 'easy');
      if (mv === null || mv === undefined) return;

      let ns;
      if (v === 'ultimate')                     ns = makeMoveUltimate(gameState, mv.boardIndex, mv.cellIndex);
      else if (v==='wild' || v==='order_chaos') ns = makeMoveClassic(gameState, mv.cellIndex, mv.piece || 'X');
      else                                      ns = makeMoveClassic(gameState, mv);

      if (ns) {
        validateGameState(ns, 'timer.ai');
        setGameState(ns);
        if (ns.gameOver) handleGameOverRef.current?.(ns);
      }
    } catch(e) { logError('timer', e.message); }
  }, [gameState, isOnline]); // handleGameOver chiamato tramite ref — no stale closure
  onTimerExpiredRef.current = onTimerExpired; // aggiornato ad ogni render

  // ── Ruota completata ──────────────────────────────────────
  const onWheelDone = useCallback((selectedVariant) => {
    setShowInfoPanel(false);
    const actualId = selectedVariant?.id || 'classic';
    setChosenVariant(actualId);
    let s;
    if (actualId === 'ultimate') s = createUltimateState(randomFirst);
    else {
      s = createClassicState(actualId, randomFirst);
      if (!s) s = createRandomState(randomFirst);
    }
    if (s) { validateGameState(s, 'random.wheel'); setGameState(s); }
    else navigate('home');
  }, [randomFirst, navigate]);

  // ── AI turno ──────────────────────────────────────────────
  useEffect(() => {
    if (!gameState || gameState.gameOver || mode!=='ai' || paused || thinking) return;
    if (gameState.currentPlayer !== 'O') return;
    setThinking(true);
    const delay = getThinkingDelay(aiLevel);
    aiTimer.current = setTimeout(() => {
      try {
        const mv = getAIMove(gameState, aiLevel);
        if (mv===null||mv===undefined) { setThinking(false); return; }
        const v = gameState.chosenVariant || gameState.variant;
        let ns;
        if (v==='ultimate')                     ns = makeMoveUltimate(gameState, mv.boardIndex, mv.cellIndex);
        else if (v==='wild' || v==='order_chaos') ns = makeMoveClassic(gameState, mv.cellIndex, mv.piece);
        else                                      ns = makeMoveClassic(gameState, mv);
        validateGameState(ns, 'AI');
        setGameState(ns);
        if (ns.gameOver) handleGameOverRef.current?.(ns);
      } catch(e) { logError('AI', e.message); }
      setThinking(false);
    }, delay);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameState?.moveCount, gameState?.currentPlayer, paused]); // handleGameOver via ref

  // ── Mossa umana ───────────────────────────────────────────
  const onCell = useCallback((boardIdx, cellIdx) => {
    if (!gameState || gameState.gameOver || thinking || paused) return;
    if (mode==='ai' && gameState.currentPlayer==='O') return;
    const v = gameState.chosenVariant || gameState.variant;
    const player = gameState.currentPlayer;

    // Resetta timeout counter del giocatore che ha mosso
    onPlayerMoved(player);

    if (v==='wild' || v==='order_chaos') {
      setWildPending({ boardIdx, cellIdx, isOC: v==='order_chaos', player });
      return;
    }
    if (v==='ultimate') {
      const ns = makeMoveUltimate(gameState, boardIdx, cellIdx);
      validateGameState(ns, 'human.ult');
      setGameState(ns);
      if (ns.gameOver) handleGameOverRef.current?.(ns);
    } else {
      const ns = makeMoveClassic(gameState, cellIdx);
      validateGameState(ns, 'human.classic');
      setGameState(ns);
      if (ns.gameOver) handleGameOverRef.current?.(ns);
    }
  }, [gameState, mode, thinking, paused]);

  // ── Fine partita ──────────────────────────────────────────
  const handleGameOver = async (st, forfeit=false) => {
    clearTurnTimer();
    logGame('gameOver', `winner=${st.winner} draw=${st.isDraw} forfeit=${forfeit}`);
    Vibration.vibrate(st.isDraw ? 80 : 300);

    const v = st.chosenVariant || st.variant;

    if (mode==='local') {
      recordLocalResult(v, st.winner, st.currentPlayer);
      await incrementGamesSession();
      const showAdNow = !forfeit && await adsCheckShouldShow();
      setTimeout(async () => {
        if (aiTimer.current) clearTimeout(aiTimer.current);
        const params = {
          result: st.isDraw ? 'draw' : st.winner==='X' ? 'win' : 'loss',
          winnerPiece: st.winner, variantId: v, mode,
          creditsEarned: 0, xpEarned: 0, rematchCost: 0,
          difficulty: aiLevel || 'easy',
          onRematch: () => navigate('game', { variantId: v, mode, aiLevel, p1Name, p2Name, pieceP1, pieceP2 }),
          onMenu:    goToMenu,
        };
        if (_navigatingRef.current) return; _navigatingRef.current = true;
      if (!showAdNow) { navigate('gameResult', params); return; }
        const adShown = await showInterstitial();
        if (!adShown) { navigate('gameResult', params); return; }
        // adInFlight=true → SDK non disponibile → placeholder Modal
        // adInFlight=false → SDK ha mostrato la vera ad e ha già terminato
        const { adInFlight } = getAdsState();
        if (adInFlight) {
          setShowAd(true);
          _pendingResultRef.current = params;
        } else {
          await recordAdShown();
          navigate('gameResult', params);
        }
      }, 900);
      return;
    }

    // Il giocatore locale è sempre X (impostato da ModeSelect/OnlineScreen).
    // st.winner==='X' → il locale ha vinto; st.winner==='O' → il locale ha perso.
    // Vale sia per AI che per online — il ramo online non era 'win' fisso: era un bug.
    const result = forfeit ? 'loss'
      : st.isDraw ? 'draw'
      : (st.winner === 'X' ? 'win' : 'loss');

    const gameDurationSec = (Date.now() - gameStartRef.current) / 1000;
    const moveCount = gameState?.moveCount || 0;
    // Pass moveCount for future anti-farming expansion
    const statsResult = await updateStats(v, mode, result, aiLevel, gameDurationSec, moveCount);
    await incrementGamesSession(); // conta per le ad ogni 2 partite
    // Weekly chest: conta ogni partita completata (non forfeit)
    if (!forfeit) {
      try { await incrementWeeklyGames(); await updateLastActive(); } catch (e) { /* non bloccante */ }
    }
    await refreshCredits();
    // shouldShowAd è ora in services/ads — controlla noAds/vip/birthday + grace 5 partite
    // Ads strategy: mai dopo sconfitta frustrante (forfeit o partita < 30s)
    const isFrustratingLoss = result === 'loss' && gameDurationSec < 30;
    const showAdNow  = !forfeit && !isFrustratingLoss && await adsCheckShouldShow();

    setTimeout(async () => {
      if (aiTimer.current) clearTimeout(aiTimer.current);

      const variantCfg     = Object.values(CONFIG.GAME_VARIANTS).find(x => x.id===v);
      const supportsDouble = isOnline && variantCfg?.doubleMatch === true;

      const params = {
        result,
        winnerPiece: st.winner,
        variantId: v,
        mode,
        creditsEarned:   statsResult?.creditsEarned  || 0,
        xpEarned:        statsResult?.xpEarned        || 0,
        newLevel:        statsResult?.levelUp ? statsResult.newLevel : null,
        previousLevel:   statsResult?.previousLevel ?? null,
        newUnlocks:      statsResult?.newUnlocks       || [],
        newAchievements: statsResult?.newAchievements  || [],
        newMissions:     statsResult?.newMissions      || [],
        rematchCost:     variant?.rematchCost ?? Math.ceil(cost/2),
        leg,
        leg1Result,
        leg1Forfeit:     forfeit && supportsDouble,   // ← forfeit in doppia partita
        pieceP1,
        pieceP2,
        difficulty: aiLevel || 'medium',
        onRematch: async () => {
          // Rematch spam guard: previeni doppi tap ravvicinati
          const now = Date.now();
          if (now - lastRematchRef.current < 1500) return;
          lastRematchRef.current = now;
          if (mode !== 'local') {
            const ok = await trySpendCredits(rematchCost);
            if (!ok) { return; }
          }
          navigate('game', { variantId: v, mode, aiLevel, p1Name, p2Name, pieceP1, pieceP2 });
        },
        onMenu:    () => navigate('home'),
      };

      if (_navigatingRef.current) return; _navigatingRef.current = true;
      if (!showAdNow) { navigate('gameResult', params); return; }
      const adShown = await showInterstitial();
      if (!adShown) { navigate('gameResult', params); return; }
      const { adInFlight } = getAdsState();
      if (adInFlight) {
        setShowAd(true);
        _pendingResultRef.current = params;
      } else {
        await recordAdShown();
        navigate('gameResult', params);
      }
    }, 900);
  };

  // Aggiorna il ref ad ogni render — nessuna stale closure possibile
  handleGameOverRef.current = handleGameOver;

  const doRematch = async () => {
    setShowRematch(false);
    if (mode !== 'local') {
      const ok = await trySpendCredits(rematchCost);
      if (!ok) { setShowNoCredits(true); return; }
    }
    winAnim.setValue(0);
    setThinking(false);
    if (aiTimer.current) clearTimeout(aiTimer.current);
    startNewGame();
  };

  const goToMenu = useCallback(() => {
    clearTurnTimer();
    if (aiTimer.current) clearTimeout(aiTimer.current);
    navigate('home');
  }, [navigate]);

  // ── RUOTA 3D RANDOM ───────────────────────────────────────
  if (showInfoPanel) {
    const wheelVariants = Object.values(CONFIG.GAME_VARIANTS)
      .filter(v => v.id !== 'random')
      .map(v => ({ id:v.id, name:v.name, icon:v.icon||'🎮', description:v.description }));
    return (
      <RandomSpinWheel
        variants={wheelVariants}
        onDone={onWheelDone}
        themeColors={th}
      />
    );
  }

  if (!gameState) {
    return (
      <View style={[g.loading, { backgroundColor:th.bg }]}>
        <Text style={[g.loadTxt, { color:th.textPrimary }]}>{t('loading')}</Text>
      </View>
    );
  }

  const v = gameState.chosenVariant || gameState.variant;
  const isUltimate   = v === 'ultimate';
  const variantLabel = chosenVariant
    ? Object.values(CONFIG.GAME_VARIANTS).find(x=>x.id===chosenVariant)?.name||chosenVariant
    : (variant?.name || variantId);

  const winScale   = winAnim.interpolate({ inputRange:[0,1], outputRange:[0.7,1] });
  // Variabile esplicita: true se il video copre i crediti mancanti per la rivincita
  const videoWillUnlockRematch =
    !adWatchLoading &&
    canWatchVideo() &&
    (credits + (CONFIG.CREDITS_VIDEO_REWARD || 5)) >= rematchCost;
  const resultMsg  = gameState.isDraw ? 'Draw! 🤝'
    : `${gameState.winner==='X'?(p1Name||'Player X'):mode==='ai'?'AI':'Player O'} Wins! 🎉`;
  const resultEmoji = gameState.isDraw?'🤝':(mode==='ai'&&gameState.winner==='O')?'😔':'🏆';

  return (
    <View style={[g.root, { backgroundColor:th.bg }]}>

      {/* QUIT */}
      <Modal visible={showQuit} transparent animationType="fade" onRequestClose={()=>setShowQuit(false)}>
        <View style={g.ov}>
          <View style={[g.dlg, { backgroundColor:th.bgCard, borderColor:th.border }]}>
            <Text style={g.di}>⚠️</Text>
            <Text style={[g.dt, { color:th.textPrimary }]}>{t('leaveGame')}</Text>
            <Text style={[g.dm, { color:th.textSecondary }]}>{t('leaveGameMsg')}</Text>
            <View style={g.dbs}>
              <TouchableOpacity style={[g.dbC, { backgroundColor:th.bgCard, borderColor:th.border }]} onPress={()=>setShowQuit(false)}>
                <Text style={[g.dbCT, { color:th.textPrimary }]}>{t('keepPlaying')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[g.dbQ, { borderColor:th.danger, backgroundColor:th.dangerBg }]}
                onPress={async ()=>{
                  setShowQuit(false);
                  if (mode==='ai'&&gameState&&!gameState.gameOver) {
                    await handleGameOver({...gameState,winner:'O',gameOver:true}, true);
                    return; // handleGameOver naviga già via gameResult — non chiamare goToMenu()
                  }
                  if (mode==='online') {
                    await handleGameOver({...gameState,winner:'O',gameOver:true}, true);
                    return; // stessa ragione
                  }
                  goToMenu();
                }}>
                <Text style={[g.dbQT, { color:th.danger }]}>{t('quitGame')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* AD INTERSTITIAL */}
      <Modal visible={showAd} transparent animationType="slide">
        <View style={g.ov}>
          <View style={[g.dlg, { backgroundColor:'#050510', borderColor:'#2a2a4a' }]}>
            <Text style={g.di}>📺</Text>
            <Text style={{ color:'#808098', fontSize:14, marginBottom:12 }}>Advertisement</Text>
            <View style={{ width:'100%', height:100, backgroundColor:'#050508', borderRadius:10, justifyContent:'center', alignItems:'center', marginBottom:16, borderWidth:1, borderColor:'#2a2a4a' }}>
              <Text style={{ color:'#404050', fontSize:13 }}>[ AdMob Interstitial ]</Text>
            </View>
            <TouchableOpacity style={[g.dbC, { backgroundColor:'#1a1a2a', borderColor:'#2a2a4a', width:'100%' }]}
              onPress={async ()=>{
                setShowAd(false);
                onInterstitialDismissed();    // rilascia mutex in services/ads
                await recordAdShown();        // resetta contatori in storage
                const pending = _pendingResultRef.current;
                if (pending) { _pendingResultRef.current=null; navigate('gameResult', pending); }
              }}>
              <Text style={{ color:'#e0e0f0', fontWeight:'700' }}>Continue →</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* REMATCH */}
      <Modal visible={showRematch} transparent animationType="fade">
        <View style={g.ov}>
          <View style={[g.dlg, { backgroundColor:th.bgCard, borderColor:th.border }]}>
            <Text style={g.di}>{resultEmoji}</Text>
            <Text style={[g.dt, { color:th.textPrimary }]}>{resultMsg}</Text>
            <View style={g.dbs}>
              <TouchableOpacity style={[g.dbQ, { borderColor:th.accent, backgroundColor:th.accentBg }]} onPress={doRematch}>
                <Text style={[g.dbQT, { color:th.accent }]}>↺ {mode==='local'?'Yes! (free)':t('rematchCost',{cost:rematchCost})}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[g.dbC, { backgroundColor:th.bgCard, borderColor:th.border }]} onPress={()=>{ setShowRematch(false); goToMenu(); }}>
                <Text style={[g.dbCT, { color:th.textPrimary }]}>🏠 {t('menu')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* WILD */}
      <Modal visible={!!wildPending} transparent animationType="fade">
        <View style={g.ov}>
          <View style={[g.dlg, { backgroundColor:th.bgCard, borderColor:th.border }]}>
            <Text style={g.di}>{wildPending?.isOC?'⚔️':'🃏'}</Text>
            <Text style={[g.dt, { color:th.textPrimary }]}>{t('wildChoose')}</Text>
            <View style={g.dbs}>
              {['X','O'].map(piece=>(
                <TouchableOpacity key={piece}
                  style={[g.dbC, { borderColor:piece==='X'?th.pieceX:th.pieceO, backgroundColor:piece==='X'?`${th.pieceX}22`:`${th.pieceO}22` }]}
                  onPress={()=>{
                    const p=wildPending; setWildPending(null);
                    onPlayerMoved(p.player || gameState.currentPlayer);
                    const ns=makeMoveClassic(gameState, p.cellIdx, piece);
                    validateGameState(ns,'wild.human');
                    setGameState(ns);
                    if (ns.gameOver) handleGameOver(ns);
                  }}>
                  <Text style={{ color:piece==='X'?th.pieceX:th.pieceO, fontSize:26, fontWeight:'900' }}>
                    {piece==='X'?showP(pieceX):showP(pieceO)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity onPress={()=>setWildPending(null)} style={{marginTop:12}}>
              <Text style={{ color:th.textMuted, fontSize:14 }}>{t('cancel')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* PAUSA */}
      <Modal visible={paused} transparent animationType="fade">
        <View style={g.ov}>
          <View style={[g.dlg, { backgroundColor:th.bgCard, borderColor:th.border }]}>
            <Text style={g.di}>⏸️</Text>
            <Text style={[g.dt, { color:th.textPrimary }]}>Game Paused</Text>
            <TouchableOpacity style={[g.dbC, { width:'100%', backgroundColor:th.bgCard, borderColor:th.border }]} onPress={()=>setPaused(false)}>
              <Text style={[g.dbCT, { color:th.textPrimary }]}>▶ Resume</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* NO CREDITI */}
      <Modal visible={showNoCredits} transparent animationType="fade">
        <View style={g.ov}>
          <View style={[g.dlg, { backgroundColor:th.bgCard, borderColor:th.border }]}>
            <Text style={g.di}>💰</Text>
            <Text style={[g.dt, { color:th.textPrimary }]}>{t('notEnoughCredits')}</Text>
            <Text style={[g.dm, { color:th.textSecondary }]}>{t('needCredits',{cost:rematchCost})} {t('youHaveCredits',{credits})}</Text>
            <View style={g.dbs}>
              {canWatchVideo() ? (
                <TouchableOpacity
                  style={[g.dbQ, {
                    borderColor: th.accent,
                    backgroundColor: adWatchLoading ? th.border : th.accentBg,
                  }]}
                  disabled={adWatchLoading}
                  onPress={async () => {
                    if (adWatchLoading) return;
                    setAdWatchLoading(true);
                    try {
                      await showRewardedAd(async () => {
                        // recordVideoWatched() già chiamato in ads.js — aggiorna solo UI
                        await refreshCredits();
                      });
                    } catch (e) { /* intentionally ignored */ }
                    setAdWatchLoading(false);
                    setShowNoCredits(false);
                  }}>
                  <Text style={[g.dbQT, { color:th.accent }]}>
                    {adWatchLoading ? '⏳…' : '📺 Guarda video → +5 crediti subito'}
                  </Text>
                  {videoWillUnlockRematch && (
                    <Text style={{color:th.accent,fontSize:11,marginTop:3}}>
                      Dopo il video puoi giocare subito
                    </Text>
                  )}
                </TouchableOpacity>
              ) : (
                <TouchableOpacity style={[g.dbQ, { borderColor:th.border, backgroundColor:th.bgCardAlt||th.bgCard }]} onPress={()=>setShowNoCredits(false)}>
                  <Text style={[g.dbQT, { color:th.textMuted }]}>Limite video raggiunto</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity style={[g.dbC, { backgroundColor:th.bgCard, borderColor:th.border }]} onPress={()=>{ setShowNoCredits(false); goToMenu(); }}>
                <Text style={[g.dbCT, { color:th.textPrimary }]}>🏠 {t('menu')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* HEADER */}
      <View style={[g.header, { borderBottomColor:th.border }]}>
        <TouchableOpacity style={g.hBtn} onPress={()=>setShowQuit(true)} hitSlop={{top:12,bottom:12,left:12,right:12}}>
          <Text style={[g.hBtnTxt, { color:th.textPrimary }]}>←</Text>
        </TouchableOpacity>
        <View style={{ alignItems:'center' }}>
          <Text style={[g.hTitle, { color:th.textSecondary }]}>{variantLabel}</Text>
          {/* Indicator leg online */}
          {isOnline && leg > 1 && (
            <Text style={{ fontSize:10, color:th.accent }}>↩️ Ritorno</Text>
          )}
          {gameState.isOrderChaos && (
            <Text style={{ fontSize:10, color:th.accent }}>
              {gameState.orderPlayer==='X'
                ?`${p1Name||'P1'}: ORDER · ${p2Name||'P2'}: CHAOS`
                :`${p1Name||'P1'}: CHAOS · ${p2Name||'P2'}: ORDER`}
            </Text>
          )}
        </View>
        <TouchableOpacity style={g.hBtn} onPress={()=>setPaused(true)} hitSlop={{top:12,bottom:12,left:12,right:12}}>
          <Text style={[g.hBtnTxt, { color:th.accent }]}>⏸</Text>
        </TouchableOpacity>
      </View>

      {/* TIMER BAR — solo online, non locale */}
      {isOnline && !gameState.gameOver && (
        <TurnTimerBar seconds={turnSec} totalSeconds={TURN_SEC} th={th} />
      )}

      {/* STATUS */}
      <View style={g.statusBar}>
        {gameState.gameOver ? (
          <Animated.View style={{ transform:[{scale:winScale}] }}>
            <Text style={[g.winTxt, { color:th.accent }]}>{resultMsg}</Text>
          </Animated.View>
        ) : (
          <View style={g.turnRow}>
            <View style={[g.pieceBadge, { backgroundColor: gameState.currentPlayer==='X'?`${th.pieceX}33`:`${th.pieceO}33` }]}>
              <Text style={[g.pieceBadgeTxt, { color: gameState.currentPlayer==='X'?th.pieceX:th.pieceO }]}>
                {gameState.currentPlayer==='X'?showP(pieceX):showP(pieceO)}
              </Text>
            </View>
            <Text style={[g.turnTxt, { color:th.textPrimary }]}>
              {thinking ? `🤖 ${t('aiThinking')}`
               : mode==='local'
                 ? `${gameState.currentPlayer==='X'?(p1Name||t('player1')):(p2Name||t('player2'))}'s turn`
                 : t('playerTurn',{p:gameState.currentPlayer})}
            </Text>
          </View>
        )}
      </View>

      {/* BOARD */}
      <View style={g.boardWrap}>
        {isUltimate
          ? <UltimateBoard gs={gameState} onCell={onCell} th={th} px={pieceX} po={pieceO} />
          : <ClassicBoard  gs={gameState} onCell={(ci)=>onCell(0,ci)} th={th} px={pieceX} po={pieceO} />
        }
      </View>
    </View>
  );
}

// ── CLASSIC BOARD ─────────────────────────────────────────
function ClassicBoard({ gs, onCell, th, px, po }) {
  const size   = gs.boardSize;
  const total  = width - 48;
  const cellSz = Math.floor(total / size);
  const actual = cellSz * size;
  const showP  = (c) => c==='PHOTO'?'📸':(c||'?');
  return (
    <View style={{ width:actual, height:actual }}>
      {Array.from({length:size},(_,row)=>(
        <View key={row} style={{ flexDirection:'row', height:cellSz }}>
          {Array.from({length:size},(_,col)=>{
            const idx=row*size+col;
            const cell=gs.board[idx];
            const isWin=gs.winLine?.includes(idx);
            const isLast=gs.lastMove===idx;
            return (
              <TouchableOpacity key={col} activeOpacity={0.6}
                disabled={!!cell||gs.gameOver}
                onPress={()=>onCell(idx)}
                hitSlop={{top:2,bottom:2,left:2,right:2}}
                style={{
                  width:cellSz, height:cellSz,
                  justifyContent:'center', alignItems:'center',
                  backgroundColor: isWin?th.cellBgWin:isLast?th.cellBgLast:th.cellBg,
                  borderRightWidth:col<size-1?2:0,
                  borderBottomWidth:row<size-1?2:0,
                  borderColor:th.boardBorder,
                }}>
                {cell&&(
                  <Text style={{
                    color:cell==='X'?th.pieceX:th.pieceO,
                    fontSize:cellSz*0.52, fontWeight:'900',
                    textShadowColor:cell==='X'?th.pieceX:th.pieceO,
                    textShadowRadius:isWin?10:4,
                  }}>
                    {cell==='X'?showP(px):showP(po)}
                  </Text>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      ))}
    </View>
  );
}

// ── ULTIMATE BOARD ────────────────────────────────────────
function UltimateBoard({ gs, onCell, th, px, po }) {
  const GAP=4, total=width-32;
  const boardSz=Math.floor((total-GAP*2)/3);
  const cellSz=Math.floor(boardSz/3);
  const miniSz=cellSz*3;
  const metaSz=boardSz*3+GAP*2;
  const showP=(c)=>c==='PHOTO'?'📸':(c||'?');
  return (
    <View style={{ width:metaSz }}>
      {[0,1,2].map(mRow=>(
        <View key={mRow} style={{ flexDirection:'row', height:boardSz, marginBottom:mRow<2?GAP:0 }}>
          {[0,1,2].map(mCol=>{
            const bi=mRow*3+mCol;
            const bw=gs.boardWinners[bi];
            const fin=bw!==null;
            const act=!gs.gameOver&&(gs.activeBoard===null||gs.activeBoard===bi);
            const wib=gs.winLine?.includes(bi);
            return (
              <View key={mCol} style={{
                width:boardSz, height:boardSz, marginRight:mCol<2?GAP:0,
                backgroundColor:th.boardBg,
                borderWidth:wib?2:act?2:1,
                borderColor:wib?th.boardWin:act?th.boardActive:th.boardBorder,
                borderRadius:6, overflow:'hidden',
                justifyContent:'center', alignItems:'center',
              }}>
                {fin?(
                  <View style={{ width:boardSz, height:boardSz, justifyContent:'center', alignItems:'center', backgroundColor:bw==='draw'?'rgba(50,50,70,0.5)':`${bw==='X'?th.pieceX:th.pieceO}18` }}>
                    <Text style={{ fontSize:boardSz*0.52, fontWeight:'900', color:bw==='draw'?th.textMuted:bw==='X'?th.pieceX:th.pieceO, textShadowColor:bw==='draw'?'transparent':bw==='X'?th.pieceX:th.pieceO, textShadowRadius:12 }}>
                      {bw==='draw'?'–':(bw==='X'?showP(px):showP(po))}
                    </Text>
                  </View>
                ):(
                  <View style={{ width:miniSz, height:miniSz }}>
                    {[0,1,2].map(row=>(
                      <View key={row} style={{ flexDirection:'row', height:cellSz }}>
                        {[0,1,2].map(col=>{
                          const ci=row*3+col;
                          const cell=gs.boards[bi][ci];
                          const wic=gs.boardWinLines?.[bi]?.includes(ci);
                          const can=!cell&&!fin&&act&&!gs.gameOver;
                          const last=gs.lastMove?.boardIndex===bi&&gs.lastMove?.cellIndex===ci;
                          return (
                            <TouchableOpacity key={col} activeOpacity={0.6} disabled={!can}
                              onPress={()=>onCell(bi,ci)}
                              hitSlop={{top:2,bottom:2,left:2,right:2}}
                              style={{
                                width:cellSz, height:cellSz,
                                justifyContent:'center', alignItems:'center',
                                backgroundColor:wic?th.cellBgWin:last?th.cellBgLast:can?th.cellBgCan:th.cellBg,
                                borderRightWidth:col<2?1:0, borderBottomWidth:row<2?1:0,
                                borderColor:th.boardBorder+'66',
                              }}>
                              {cell&&<Text style={{ color:cell==='X'?th.pieceX:th.pieceO, fontSize:cellSz*0.55, fontWeight:'900', textShadowColor:cell==='X'?th.pieceX:th.pieceO, textShadowRadius:4 }}>
                                {cell==='X'?showP(px):showP(po)}
                              </Text>}
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    ))}
                  </View>
                )}
              </View>
            );
          })}
        </View>
      ))}
    </View>
  );
}

const g = StyleSheet.create({
  root:      { flex:1 },
  loading:   { flex:1, justifyContent:'center', alignItems:'center' },
  loadTxt:   { fontSize:18, fontWeight:'600' },
  header:    { flexDirection:'row', alignItems:'center', paddingHorizontal:12, paddingVertical:12, borderBottomWidth:1 },
  hBtn:      { width:48, height:48, justifyContent:'center', alignItems:'center' },
  hBtnTxt:   { fontSize:26, fontWeight:'600' },
  hTitle:    { flex:1, textAlign:'center', fontSize:15, fontWeight:'800', letterSpacing:2 },
  statusBar: { paddingVertical:10, alignItems:'center' },
  turnRow:   { flexDirection:'row', alignItems:'center', gap:10 },
  pieceBadge:{ width:38, height:38, borderRadius:8, justifyContent:'center', alignItems:'center' },
  pieceBadgeTxt:{ fontSize:22, fontWeight:'900' },
  turnTxt:   { fontSize:17, fontWeight:'700' },
  winTxt:    { fontSize:22, fontWeight:'900', textAlign:'center' },
  boardWrap: { flex:1, justifyContent:'center', alignItems:'center' },
  ov:        { flex:1, backgroundColor:'rgba(0,0,0,0.8)', justifyContent:'center', alignItems:'center' },
  dlg:       { width:width*0.85, borderRadius:20, padding:26, alignItems:'center', borderWidth:1 },
  di:        { fontSize:44, marginBottom:10 },
  dt:        { fontSize:21, fontWeight:'900', marginBottom:8 },
  dm:        { fontSize:15, textAlign:'center', lineHeight:22, marginBottom:20 },
  dbs:       { flexDirection:'row', gap:10, width:'100%' },
  dbC:       { flex:1, borderRadius:12, padding:14, alignItems:'center', borderWidth:1 },
  dbCT:      { fontWeight:'700', fontSize:14 },
  dbQ:       { flex:1, borderRadius:12, padding:14, alignItems:'center', borderWidth:1 },
  dbQT:      { fontWeight:'700', fontSize:14 },
});

const rp = StyleSheet.create({
  root:    { flex:1, justifyContent:'center', alignItems:'center', padding:20 },
  card:    { width:'100%', borderRadius:20, padding:24, alignItems:'center', borderWidth:2 },
  title:   { fontSize:28, fontWeight:'900', marginBottom:16 },
  iconBox: { marginBottom:12 },
  name:    { fontSize:26, fontWeight:'900', marginBottom:6 },
  grid:    { fontSize:14, marginBottom:14 },
  rules:   { width:'100%', marginBottom:20 },
  rule:    { fontSize:14, marginBottom:4 },
  bottom:  { flexDirection:'row', alignItems:'center', justifyContent:'space-between', width:'100%' },
  timer:   { fontSize:16 },
  skipBtn: { borderRadius:12, paddingHorizontal:20, paddingVertical:10 },
  skipTxt: { color:'#fff', fontWeight:'900', fontSize:15 },
});

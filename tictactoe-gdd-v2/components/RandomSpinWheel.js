// components/RandomSpinWheel.js
// Ruota 3D a barilotto — mostra tutte le varianti
// Gira e decelera in max 5 secondi, poi si ferma sulla variante scelta
// Effetto 3D: item al centro grande e luminoso, quelli sopra/sotto sempre più piccoli e trasparenti
// FUNZIONA SUBITO

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  Dimensions, Animated, Easing,
} from 'react-native';
import { startRandomSpin, stopRandomSpin } from '../utils/audioManager';

const { width } = Dimensions.get('window');

// ── Config visiva ──────────────────────────────────────────
const ITEM_H     = 68;    // altezza di ogni card variante
const ITEM_W     = width - 60;
const VISIBLE    = 7;     // quanti item visibili contemporaneamente
const BARREL_R   = 180;   // raggio virtuale barilotto (determina curvatura)
const STEP_DEG   = 40;    // 360 / 9 = 40 gradi per item (9 varianti)

// Calcola trasformazione 3D per un item a un certo angolo sul barilotto
const getBarrelTransform = (angleDeg) => {
  // Normalizza -180..+180
  const norm = ((angleDeg % 360) + 360) % 360;
  const a    = norm > 180 ? norm - 360 : norm;
  const rad  = a * (Math.PI / 180);

  const translateY = Math.sin(rad) * BARREL_R;
  const scale      = Math.max(0.08, Math.cos(rad));
  const opacity    = Math.max(0, Math.cos(rad));
  const visible    = Math.abs(a) < 85; // solo il semicerchio frontale

  return { translateY, scale, opacity, visible, absAngle: Math.abs(a) };
};

// ── Componente principale ──────────────────────────────────
export default function RandomSpinWheel({
  variants,   // array [{id, name, description}] — le 8+ varianti
  onDone,     // callback(selectedVariant) quando la ruota si ferma
  themeColors,// { bg, bgCard, border, accent, textPrimary, textMuted }
}) {
  const [spinDeg, setSpinDeg]     = useState(0);
  const [phase,   setPhase]       = useState('spinning'); // 'spinning' | 'done'
  const [result,  setResult]      = useState(null);

  const rafRef       = useRef(null);
  const startTimeRef = useRef(null);
  const targetDegRef = useRef(0);
  const durationRef  = useRef(4000);
  const resultRef    = useRef(null);
  const skippedRef   = useRef(false);

  const th = themeColors || {};

  // ── Avvia spin ─────────────────────────────────────────────
  useEffect(() => {
    // Filtra "random" stesso — non può selezionare se stesso
    const playable = variants.filter(v => v.id !== 'random');
    const targetIdx = Math.floor(Math.random() * playable.length);
    const targetVariant = playable[targetIdx];
    resultRef.current = targetVariant;

    // Trova l'indice nel barilotto (mantiene l'ordine originale)
    const barrelIdx = variants.findIndex(v => v.id === targetVariant.id);

    // Angolo finale: 5-7 giri completi + posizione target
    const fullRotations = 5 + Math.floor(Math.random() * 3);
    targetDegRef.current = fullRotations * 360 + barrelIdx * STEP_DEG;
    durationRef.current  = 3500 + Math.random() * 1500; // 3.5-5s

    // Suono spin
    startRandomSpin().catch(() => {});

    // Animazione con requestAnimationFrame
    const animate = (ts) => {
      if (!startTimeRef.current) startTimeRef.current = ts;
      const elapsed   = ts - startTimeRef.current;
      const dur       = durationRef.current;
      const progress  = Math.min(1, elapsed / dur);

      // Easing cubic out: decelera naturalmente
      const eased    = 1 - Math.pow(1 - progress, 3);
      const current  = eased * targetDegRef.current;

      setSpinDeg(current);

      if (progress < 1 && !skippedRef.current) {
        rafRef.current = requestAnimationFrame(animate);
      } else {
        // Fine animazione
        setSpinDeg(targetDegRef.current);
        finishSpin();
      }
    };

    rafRef.current = requestAnimationFrame(animate);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      stopRandomSpin().catch(() => {});
    };
  }, []);

  const finishSpin = useCallback(() => {
    stopRandomSpin().catch(() => {});
    setResult(resultRef.current);
    setPhase('done');
    // Aspetta 700ms prima di proseguire (l'utente vede il risultato)
    setTimeout(() => {
      onDone(resultRef.current);
    }, 800);
  }, [onDone]);

  // Bottone SALTA
  const onSkip = () => {
    if (phase !== 'spinning') return;
    skippedRef.current = true;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    // Salta direttamente alla posizione finale
    setSpinDeg(targetDegRef.current);
    finishSpin();
  };

  // ── Render del barilotto ───────────────────────────────────
  const renderItems = () => {
    return variants.map((v, i) => {
      const angle    = i * STEP_DEG - (spinDeg % 360);
      const { translateY, scale, opacity, visible, absAngle } = getBarrelTransform(angle);

      if (!visible) return null;

      const isCenter  = absAngle < STEP_DEG / 2;
      const isDone    = phase === 'done';
      const isWinner  = isDone && result?.id === v.id;

      return (
        <View
          key={v.id}
          style={[
            s.item,
            {
              transform:        [{ translateY }, { scale }],
              opacity,
              zIndex:           Math.round(scale * 100),
            },
          ]}
          pointerEvents="none">
          <View style={[
            s.card,
            {
              backgroundColor: isWinner
                ? `${th.accent || '#e94560'}28`
                : isCenter && !isDone
                ? (th.bgCardAlt || th.bgCard || '#1f2040')
                : (th.bgCard || '#181830'),
              borderColor: isWinner
                ? (th.accent || '#e94560')
                : isCenter
                ? (th.accent || '#e94560') + '80'
                : (th.border || '#2a2a4a'),
              borderWidth: isCenter ? 1.5 : 1,
            },
          ]}>
            {/* Nome variante */}
            <Text style={[s.cardName, {
              color:      isCenter ? (th.textPrimary || '#fff') : (th.textMuted || '#888'),
              fontWeight: isCenter ? '800' : '500',
              fontSize:   isCenter ? 17 : 14,
            }]} numberOfLines={1}>
              {v.name}
            </Text>
            {/* Descrizione breve — solo per item al centro */}
            {isCenter && v.icon && (
              <Text style={{ fontSize:18, marginLeft:8 }}>{v.icon}</Text>
            )}
          </View>
        </View>
      );
    });
  };

  return (
    <View style={[s.root, { backgroundColor: th.bg || '#0d0d1a' }]}>

      {/* Titolo */}
      <Text style={[s.title, { color: th.textPrimary || '#fff' }]}>
        🎲 Random Mode
      </Text>
      <Text style={[s.subtitle, { color: th.textMuted || '#888' }]}>
        {phase === 'spinning' ? 'Spinning…' : `Selected: ${result?.name || ''}`}
      </Text>

      {/* Barilotto 3D */}
      <View style={s.barrelWrapper}>
        {/* Linee guida superiore/inferiore */}
        <View style={[s.guideLine, { top: (BARREL_R * 2 + ITEM_H) / 2 - ITEM_H / 2 - 1, backgroundColor: th.border || '#2a2a4a' }]} />
        <View style={[s.guideLine, { top: (BARREL_R * 2 + ITEM_H) / 2 + ITEM_H / 2 - 1, backgroundColor: th.border || '#2a2a4a' }]} />

        {/* Frame selezione */}
        <View style={[s.selFrame, { borderColor: th.accent || '#e94560' }]} pointerEvents="none" />

        {/* Ombre gradiente sopra/sotto per effetto 3D */}
        <View style={[s.fadeTop,    { backgroundColor: th.bg || '#0d0d1a' }]} pointerEvents="none" />
        <View style={[s.fadeBottom, { backgroundColor: th.bg || '#0d0d1a' }]} pointerEvents="none" />

        {/* Items sul barilotto */}
        <View style={s.barrel}>
          {renderItems()}
        </View>
      </View>

      {/* Risultato finale con animazione */}
      {phase === 'done' && result && (
        <View style={[s.resultBox, { backgroundColor: `${th.accent || '#e94560'}18`, borderColor: th.accent || '#e94560' }]}>
          <Text style={[s.resultLabel, { color: th.textMuted || '#888' }]}>Variante scelta:</Text>
          <Text style={[s.resultName,  { color: th.accent  || '#e94560' }]}>{result.name}</Text>
        </View>
      )}

      {/* Bottone SALTA */}
      {phase === 'spinning' && (
        <TouchableOpacity style={[s.skipBtn, { borderColor: th.border || '#2a2a4a' }]} onPress={onSkip}>
          <Text style={[s.skipTxt, { color: th.textMuted || '#888' }]}>⏩ Skip</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

// ── Stili ──────────────────────────────────────────────────
const BARREL_H = BARREL_R * 2 + ITEM_H;

const s = StyleSheet.create({
  root:        { flex:1, justifyContent:'center', alignItems:'center', padding:24 },
  title:       { fontSize:26, fontWeight:'900', marginBottom:6 },
  subtitle:    { fontSize:15, marginBottom:22 },

  barrelWrapper:{
    width: ITEM_W + 20,
    height: BARREL_H,
    overflow:'hidden',
    position:'relative',
    justifyContent:'center',
    alignItems:'center',
  },
  barrel:      {
    width: ITEM_W,
    height: BARREL_H,
    justifyContent:'center',
    alignItems:'center',
  },
  item:        {
    position:'absolute',
    width: ITEM_W,
    height: ITEM_H,
    justifyContent:'center',
    alignItems:'center',
  },
  card:        {
    width:'100%',
    height: ITEM_H - 6,
    borderRadius:16,
    flexDirection:'row',
    justifyContent:'center',
    alignItems:'center',
    paddingHorizontal:16,
    borderWidth:1,
  },
  cardName:    { flex:1, textAlign:'center', letterSpacing:0.3 },

  guideLine:   { position:'absolute', left:10, right:10, height:1 },
  selFrame:    {
    position:'absolute',
    width: ITEM_W + 10,
    height: ITEM_H + 8,
    borderRadius:18,
    borderWidth:2.5,
    zIndex:200,
  },
  fadeTop:     {
    position:'absolute', top:0, left:0, right:0,
    height: BARREL_H * 0.3, zIndex:100,
    opacity:0.85,
  },
  fadeBottom:  {
    position:'absolute', bottom:0, left:0, right:0,
    height: BARREL_H * 0.3, zIndex:100,
    opacity:0.85,
  },

  resultBox:   {
    borderRadius:16, padding:14, borderWidth:2,
    alignItems:'center', marginTop:20, width: ITEM_W,
  },
  resultLabel: { fontSize:13, marginBottom:4 },
  resultName:  { fontSize:24, fontWeight:'900' },

  skipBtn:     {
    marginTop:18, borderRadius:20,
    paddingHorizontal:28, paddingVertical:10, borderWidth:1,
  },
  skipTxt:     { fontSize:14, fontWeight:'600' },
});
// utils/gifPieces.js — Sistema GIF pedine animate
// GIF predefinite interne — NO upload utente online
// Le GIF sono emoji animati (React Native le renderizza come emoji statiche)
// Per GIF vere serve: npm install react-native-fast-image
// Fino all'installazione usiamo emoji animabili con Animated.View

import { log } from './debug';
import CONFIG from '../config';

// ── GIF PREDEFINITE ───────────────────────────────────────
// Formato: { id, label, emoji, isGif, unlockLevel, rarity, forSlot }
// isGif=true → quando react-native-fast-image è installato, mostra GIF vera
// forSlot: 'both'|'X'|'O'

export const GIF_PIECES = [
  // Slot libero (sia X che O)
  { id:'gif_fire',    label:'Fire 🔥',      emoji:'🔥', isGif:false, unlockLevel:2,  rarity:'common',    forSlot:'both', source:null },
  { id:'gif_star',    label:'Star ⭐',      emoji:'⭐', isGif:false, unlockLevel:3,  rarity:'common',    forSlot:'both', source:null },
  { id:'gif_lightning',label:'Lightning ⚡', emoji:'⚡', isGif:false, unlockLevel:4,  rarity:'common',    forSlot:'both', source:null },
  { id:'gif_rocket',  label:'Rocket 🚀',    emoji:'🚀', isGif:false, unlockLevel:5,  rarity:'common',    forSlot:'both', source:null },
  { id:'gif_gem',     label:'Gem 💎',       emoji:'💎', isGif:false, unlockLevel:6,  rarity:'common',    forSlot:'both', source:null },
  { id:'gif_skull',   label:'Skull 💀',     emoji:'💀', isGif:false, unlockLevel:7,  rarity:'rare',      forSlot:'both', source:null },
  { id:'gif_crown',   label:'Crown 👑',     emoji:'👑', isGif:false, unlockLevel:8,  rarity:'rare',      forSlot:'both', source:null },
  { id:'gif_dragon',  label:'Dragon 🐉',    emoji:'🐉', isGif:false, unlockLevel:15, rarity:'rare',      forSlot:'both', source:null },
  { id:'gif_comet',   label:'Comet ☄️',     emoji:'☄️', isGif:false, unlockLevel:30, rarity:'epic',      forSlot:'both', source:null },
  { id:'gif_rainbow', label:'Rainbow 🌈',   emoji:'🌈', isGif:false, unlockLevel:50, rarity:'legendary', forSlot:'both', source:null },
  // X solo
  { id:'gif_x_sword', label:'Sword ⚔️',    emoji:'⚔️', isGif:false, unlockLevel:20, rarity:'epic',      forSlot:'X', source:null },
  // O solo
  { id:'gif_o_shield',label:'Shield 🛡️',   emoji:'🛡️', isGif:false, unlockLevel:20, rarity:'epic',      forSlot:'O', source:null },
];

// ── DOVE METTERE LE GIF VERE ─────────────────────────────
// 1. Scarica GIF gratuite da:
//    - giphy.com/stickers (cerca "fire loop", "star twinkle" ecc.)
//    - lottiefiles.com (meglio: Lottie JSON, molto leggero)
// 2. Mettile in: assets/gif/
//    - fire.gif, star.gif, lightning.gif, rocket.gif, gem.gif
//    - skull.gif, crown.gif, dragon.gif, comet.gif, rainbow.gif
// 3. Installa: npm install react-native-fast-image
// 4. Sostituisci source:null con source: require('../assets/gif/fire.gif')
// 5. Aggiorna isGif:true

// ── COMPONENTE PEDINA ─────────────────────────────────────
// Importa e usa in GameScreen e ModeSelect
import React, { useRef, useEffect } from 'react';
import { Text, Animated, View } from 'react-native';

export function PieceDisplay({ value, color, size = 28, animate = true }) {
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!animate) return;
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue:1.12, duration:800, useNativeDriver:true }),
        Animated.timing(pulse, { toValue:1.0,  duration:800, useNativeDriver:true }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, [value]);

  if (!value || value === 'X' || value === 'O') {
    return (
      <Animated.Text style={{
        fontSize: size,
        fontWeight: '900',
        color,
        transform: [{ scale: animate ? pulse : 1 }],
        lineHeight: size * 1.3,
      }}>
        {value || 'X'}
      </Animated.Text>
    );
  }

  if (value === 'PHOTO') {
    return (
      <Animated.Text style={{ fontSize: size, transform:[{scale: animate ? pulse : 1}] }}>
        📸
      </Animated.Text>
    );
  }

  // Emoji / GIF
  const piece = GIF_PIECES.find(g => g.emoji === value);

  // TODO: quando react-native-fast-image è installato e piece.isGif e piece.source:
  // return <FastImage source={piece.source} style={{width:size,height:size}} />;

  return (
    <Animated.Text style={{
      fontSize: size,
      transform: [{ scale: animate ? pulse : 1 }],
      lineHeight: size * 1.3,
    }}>
      {value}
    </Animated.Text>
  );
}

// Restituisce le GIF sbloccate per un giocatore dato il suo livello
export const getUnlockedGifs = (level, unlockedPieceIds = []) => {
  return GIF_PIECES.filter(g =>
    g.unlockLevel <= level || unlockedPieceIds.includes(g.id)
  );
};

// Converte ID storage in valore display
export const pieceIdToValue = (pieceId) => {
  if (!pieceId) return 'X';
  if (pieceId === 'x_def') return 'X';
  if (pieceId === 'o_def') return 'O';
  if (pieceId === 'face')  return 'PHOTO';
  const gif = GIF_PIECES.find(g => g.id === pieceId);
  return gif ? gif.emoji : pieceId;
};

export default GIF_PIECES;
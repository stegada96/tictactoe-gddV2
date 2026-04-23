// utils/xpUtils.js — Curva XP centralizzata, unica source of truth
// Importata da: storage.js, HomeScreen.js, GameResultScreen.js
// NON duplicare questa logica altrove.

export const XP_THRESH = [
  0,       // lv 1
  80,      // lv 2
  220,     // lv 3
  450,     // lv 4
  800,     // lv 5
  1250,    // lv 6
  1820,    // lv 7
  2520,    // lv 8
  3360,    // lv 9
  4350,    // lv 10
  5500,    // lv 11
  6820,    // lv 12
  8320,    // lv 13
  10020,   // lv 14
  11950,   // lv 15
];

// XP richiesto per raggiungere un dato livello
export const xpThreshForLevel = (lv) => {
  if (lv <= 1)  return 0;
  if (lv <= 15) return XP_THRESH[lv - 1];
  let xp = 11950;
  for (let i = 15; i < lv; i++) xp += 2200 + (i - 14) * 180;
  return xp;
};

// Dato un totale XP, restituisce il livello raggiunto
export const xpToLevel = (xp) => {
  if ((xp || 0) < 0) return 1;
  let lv = 1;
  for (let i = 1; i < XP_THRESH.length; i++) {
    if (xp >= XP_THRESH[i]) lv = i + 1; else break;
  }
  if (lv >= 15) {
    let thresh = 11950;
    let curLv  = 15;
    while (xp >= thresh + 2200 + (curLv - 14) * 180) {
      thresh += 2200 + (curLv - 14) * 180;
      curLv++;
      if (curLv > 9999) break;
    }
    lv = curLv;
  }
  return Math.min(lv, 9999);
};

// Calcola pct XP verso prossimo livello + XP mancanti
// Usato da HomeScreen e GameResultScreen per la barra
export const getXpProgress = (xp, level) => {
  const lv     = Math.max(1, level || 1);
  const xpNow  = xp || 0;
  const start  = xpThreshForLevel(lv);
  const end    = xpThreshForLevel(lv + 1);
  const range  = Math.max(1, end - start);
  const pct    = Math.min(1, Math.max(0, (xpNow - start) / range));
  const toNext = Math.max(0, end - xpNow);
  return { pct, toNext, nextLv: lv + 1 };
};
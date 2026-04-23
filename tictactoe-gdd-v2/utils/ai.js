// utils/ai.js — AI probabilistica a 3 livelli + adattamento dinamico
//
// Ogni livello mescola 3 strategie con probabilità diverse:
//   randomMove  — cella libera casuale
//   decentMove  — blocca vittoria avversario / prendi vittoria immediata, nessun minimax
//   bestMove    — minimax / valutazione euristica
//
// EASY:   60% random | 30% decent | 10% best
// MEDIUM: 20% random | 40% decent | 40% best
// HARD:    5% random | 25% decent | 70% best  (Classic HARD capped per evitare draw fissi)
//
// ADATTAMENTO DINAMICO (letto da storage in-memory):
//   dopo 2 sconfitte consecutive player → aumenta probabilità errori AI
//   dopo 3 vittorie consecutive player  → aumenta difficoltà AI

import { logAI, logError } from './debug';
import CONFIG from '../config';
import {
  checkWinner, getValidMovesClassic, getValidMovesUltimate,
  makeMoveUltimate,
} from './gameLogic';
import { getStore } from './storage';

// ─────────────────────────────────────────────────────────
// TIMING
// ─────────────────────────────────────────────────────────
export const getThinkingDelay = (difficulty) => {
  const cfg = CONFIG.AI_THINK_TIME[difficulty] ?? CONFIG.AI_THINK_TIME.medium;
  return (cfg.min + Math.random() * (cfg.max - cfg.min)) * 1000;
};

// ─────────────────────────────────────────────────────────
// ADATTAMENTO DINAMICO — legge streak dal store in-memory
// Non fa I/O, non blocca, sicuro da chiamare sync.
// ─────────────────────────────────────────────────────────
const getDynamicBias = () => {
  try {
    const s = getStore();
    const total = s?.stats?.total || {};
    const playerWinStreak  = total.winStreak  || 0; // vittorie consecutive player
    const playerLossStreak = total.lossStreak || 0; // sconfitte consecutive player (AI wins)
    // Nota: winStreak del player = lossStreak dell'AI e viceversa
    // winStreak in stats è del player (X).
    return { playerWinStreak, playerLossStreak };
  } catch (_) {
    return { playerWinStreak: 0, playerLossStreak: 0 };
  }
};

// ─────────────────────────────────────────────────────────
// PROBABILITÀ PER LIVELLO — con bias dinamico
// ─────────────────────────────────────────────────────────
// Ritorna { pRandom, pDecent, pBest } che sommano a 1.
const getProbs = (difficulty, variant) => {
  const base = {
    easy:   { pRandom: 0.60, pDecent: 0.30, pBest: 0.10 },
    medium: { pRandom: 0.20, pDecent: 0.40, pBest: 0.40 },
    hard:   { pRandom: 0.05, pDecent: 0.25, pBest: 0.70 },
  }[difficulty] ?? { pRandom: 0.20, pDecent: 0.40, pBest: 0.40 };

  // Classic HARD: cap bestMove a 0.55 per ridurre draw fissi
  if (difficulty === 'hard' && (variant === 'classic' || !variant)) {
    const capped = { pRandom: 0.10, pDecent: 0.35, pBest: 0.55 };
    return applyDynamic(capped);
  }

  return applyDynamic({ ...base });
};

const applyDynamic = (p) => {
  const { playerWinStreak, playerLossStreak } = getDynamicBias();

  // Dopo 3 vittorie consecutive del player: AI diventa più forte
  // sposta 0.10 da random a best
  if (playerWinStreak >= 3) {
    const shift = Math.min(0.10, p.pRandom);
    p.pRandom -= shift;
    p.pBest   += shift;
  }

  // Dopo 2 sconfitte consecutive del player (= AI ha vinto 2+): AI sbaglia di più
  // sposta 0.10 da best a random — rende il gioco più divertente
  if (playerLossStreak >= 2) {
    const shift = Math.min(0.10, p.pBest);
    p.pBest   -= shift;
    p.pRandom += shift;
  }

  // Normalizza per sicurezza
  const total = p.pRandom + p.pDecent + p.pBest;
  return {
    pRandom: p.pRandom / total,
    pDecent: p.pDecent / total,
    pBest:   p.pBest   / total,
  };
};

// Estrae la strategia da usare in base alle probabilità
const pickStrategy = (probs) => {
  const r = Math.random();
  if (r < probs.pRandom) return 'random';
  if (r < probs.pRandom + probs.pDecent) return 'decent';
  return 'best';
};

// ─────────────────────────────────────────────────────────
// MINIMAX (Classic / 4x4 / 5x5 / Misère)
// ─────────────────────────────────────────────────────────
const minimax = (board, size, winLen, depth, isMax, alpha, beta, variant) => {
  const r = checkWinner(board, size, winLen);
  if (r) {
    if (r.winner === 'draw') return 0;
    let w = r.winner;
    if (variant === 'misere') w = w === 'X' ? 'O' : 'X';
    return w === 'O' ? 10 - depth : depth - 10;
  }
  if (depth === 0) return 0;
  const empty = board.map((c, i) => c === null ? i : null).filter(i => i !== null);
  if (!empty.length) return 0;

  if (isMax) {
    let best = -Infinity;
    for (const i of empty) {
      const nb = [...board]; nb[i] = 'O';
      best  = Math.max(best, minimax(nb, size, winLen, depth - 1, false, alpha, beta, variant));
      alpha = Math.max(alpha, best);
      if (beta <= alpha) break;
    }
    return best;
  } else {
    let best = Infinity;
    for (const i of empty) {
      const nb = [...board]; nb[i] = 'X';
      best = Math.min(best, minimax(nb, size, winLen, depth - 1, true, alpha, beta, variant));
      beta = Math.min(beta, best);
      if (beta <= alpha) break;
    }
    return best;
  }
};

// ─────────────────────────────────────────────────────────
// CLASSIC AI
// ─────────────────────────────────────────────────────────
const classicRandom = (moves) =>
  moves[Math.floor(Math.random() * moves.length)];

const classicDecent = (state, moves) => {
  // 1. Prendi vittoria immediata
  for (const m of moves) {
    const nb = [...state.board]; nb[m] = 'O';
    const r  = checkWinner(nb, state.boardSize, state.winLength);
    const aiWin = state.variant === 'misere' ? r?.winner === 'X' : r?.winner === 'O';
    if (aiWin) return m;
  }
  // 2. Blocca vittoria avversario
  for (const m of moves) {
    const nb = [...state.board]; nb[m] = 'X';
    const r  = checkWinner(nb, state.boardSize, state.winLength);
    const humanWin = state.variant === 'misere' ? r?.winner === 'O' : r?.winner === 'X';
    if (humanWin) return m;
  }
  // 3. Centro o random
  const center = Math.floor(state.boardSize * state.boardSize / 2);
  return moves.includes(center) ? center : moves[Math.floor(Math.random() * moves.length)];
};

const classicBest = (state, moves) => {
  const maxDepth = state.boardSize <= 3 ? 9 : state.boardSize <= 4 ? 5 : 3;
  let bestScore = -Infinity, bestMove = moves[0];
  for (const m of moves) {
    const nb    = [...state.board]; nb[m] = 'O';
    const score = minimax(nb, state.boardSize, state.winLength, maxDepth, false, -Infinity, Infinity, state.variant);
    if (score > bestScore) { bestScore = score; bestMove = m; }
  }
  return bestMove;
};

export const getAIMoveClassic = (state, difficulty) => {
  const moves = getValidMovesClassic(state);
  if (!moves.length) return null;

  const probs    = getProbs(difficulty, state.variant || state.chosenVariant);
  const strategy = pickStrategy(probs);

  logAI('classic', `diff=${difficulty} strategy=${strategy} probs=${JSON.stringify(probs)}`);

  if (strategy === 'random') return classicRandom(moves);
  if (strategy === 'decent') return classicDecent(state, moves);
  return classicBest(state, moves);
};

// ─────────────────────────────────────────────────────────
// WILD AI
// ─────────────────────────────────────────────────────────
const wildRandom = (emptyCells) => ({
  cellIndex: emptyCells[Math.floor(Math.random() * emptyCells.length)],
  piece:     Math.random() < 0.5 ? 'X' : 'O',
});

const wildDecent = (state, emptyCells) => {
  const lines = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
  let bestScore = -Infinity, bestMove = { cellIndex: emptyCells[0], piece: 'O' };

  for (const ci of emptyCells) {
    for (const piece of ['X', 'O']) {
      const nb = [...state.board]; nb[ci] = piece;
      const r  = checkWinner(nb, 3, 3);

      if (r && r.winner !== 'draw') {
        const score = r.winner === piece ? 1000 : -1000;
        if (score > bestScore) { bestScore = score; bestMove = { cellIndex: ci, piece }; }
        continue;
      }

      let score = 0;
      for (const line of lines) {
        const vals  = line.map(i => nb[i]);
        const mine  = vals.filter(v => v === piece).length;
        const opp   = vals.filter(v => v !== null && v !== piece).length;
        if (opp === 0) score += mine === 2 ? 10 : mine === 1 ? 1 : 0;
        if (mine === 0) score -= opp === 2 ? 8  : opp === 1  ? 0.5 : 0;
      }
      if (ci === 4) score += 3;
      if (score > bestScore) { bestScore = score; bestMove = { cellIndex: ci, piece }; }
    }
  }
  return bestMove;
};

export const getAIMoveWild = (state, difficulty) => {
  const emptyCells = state.board.map((c, i) => c === null ? i : null).filter(i => i !== null);
  if (!emptyCells.length) return null;

  const probs    = getProbs(difficulty, 'wild');
  const strategy = pickStrategy(probs);

  logAI('wild', `diff=${difficulty} strategy=${strategy}`);

  if (strategy === 'random') return wildRandom(emptyCells);
  // decent e best usano la stessa euristica (wild non ha minimax profondo)
  return wildDecent(state, emptyCells);
};

// ─────────────────────────────────────────────────────────
// ORDER & CHAOS AI
// ─────────────────────────────────────────────────────────
const evalOrderBoard = (board, size, winLen, piece) => {
  let score = 0;
  const get = (r, c) => board[r * size + c];
  for (let r = 0; r < size; r++) {
    for (let c = 0; c <= size - winLen; c++) {
      const cells = Array.from({ length: winLen }, (_, i) => get(r, c + i));
      const cnt   = cells.filter(v => v === piece).length;
      const empty = cells.filter(v => v === null).length;
      if (cnt + empty === winLen) score += cnt;
    }
  }
  return score;
};

export const getAIMoveOrderChaos = (state, difficulty) => {
  const moves = getValidMovesClassic(state);
  if (!moves.length) return null;

  const probs    = getProbs(difficulty, 'order_chaos');
  const strategy = pickStrategy(probs);
  const pieces   = ['X', 'O'];
  const isOrder  = state.currentPlayer === state.orderPlayer;

  if (strategy === 'random') {
    return {
      cellIndex: moves[Math.floor(Math.random() * moves.length)],
      piece:     pieces[Math.floor(Math.random() * 2)],
    };
  }

  let bestScore = -Infinity, bestMove = { cellIndex: moves[0], piece: 'X' };

  for (const ci of moves) {
    for (const piece of pieces) {
      const nb = [...state.board]; nb[ci] = piece;
      const r  = checkWinner(nb, state.boardSize, state.winLength);
      let score = 0;
      if (r && r.winner !== 'draw') {
        score = isOrder ? 1000 : -1000;
      } else if (r?.winner === 'draw') {
        score = isOrder ? -500 : 500;
      } else {
        score = isOrder
          ? evalOrderBoard(nb, state.boardSize, state.winLength, piece)
          : -evalOrderBoard(nb, state.boardSize, state.winLength, piece);
        if (ci === Math.floor(state.boardSize * state.boardSize / 2)) score += isOrder ? 2 : -1;
      }
      if (score > bestScore) { bestScore = score; bestMove = { cellIndex: ci, piece }; }
    }
  }
  return bestMove;
};

// ─────────────────────────────────────────────────────────
// ULTIMATE AI
// ─────────────────────────────────────────────────────────
const evalBoard3x3 = (board, player) => {
  const opp   = player === 'O' ? 'X' : 'O';
  const lines = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
  let score   = 0;
  for (const l of lines) {
    const cells  = l.map(i => board[i]);
    const mine   = cells.filter(c => c === player).length;
    const theirs = cells.filter(c => c === opp).length;
    if (theirs === 0) score += mine === 2 ? 10 : mine === 1 ? 1 : 0;
    if (mine === 0)   score -= theirs === 2 ? 10 : theirs === 1 ? 1 : 0;
  }
  return score;
};

const ultimateScored = (moves, state, deep) =>
  moves.map(mv => {
    const ns = makeMoveUltimate(state, mv.boardIndex, mv.cellIndex);
    if (ns.winner === 'O') return { mv, score: 10000 };
    if (ns.winner === 'X') return { mv, score: -10000 };
    let score = 0;
    if (ns.boardWinners[mv.boardIndex] === 'O') score += 100;
    if (ns.boardWinners[mv.boardIndex] === 'X') score -= 50;
    if (mv.boardIndex === 4) score += 5;
    if (mv.cellIndex  === 4) score += 3;
    const nb = mv.cellIndex;
    if (ns.boardWinners[nb] !== null) score += 10;
    else score += evalBoard3x3(ns.boards[nb], 'O');
    if (deep) {
      for (let b = 0; b < 9; b++) {
        if (!ns.boardWinners[b]) score += evalBoard3x3(ns.boards[b], 'O') * 0.3;
      }
    }
    return { mv, score };
  }).sort((a, b) => b.score - a.score);

export const getAIMoveUltimate = (state, difficulty) => {
  const moves = getValidMovesUltimate(state);
  if (!moves.length) return null;

  const probs    = getProbs(difficulty, 'ultimate');
  const strategy = pickStrategy(probs);

  logAI('ultimate', `diff=${difficulty} strategy=${strategy}`);

  if (strategy === 'random') return moves[Math.floor(Math.random() * moves.length)];

  if (strategy === 'decent') {
    // Decent: prendi vittoria immediata o blocca, poi pool top-3
    const scored = ultimateScored(moves, state, false);
    const top = scored.slice(0, Math.min(3, scored.length));
    return top[Math.floor(Math.random() * top.length)].mv;
  }

  // best: valutazione profonda, pool top-1
  const scored = ultimateScored(moves, state, true);
  return scored[0].mv;
};

// ─────────────────────────────────────────────────────────
// ENTRY POINT
// ─────────────────────────────────────────────────────────
export const getAIMove = (state, difficulty = 'medium') => {
  const v = state.chosenVariant || state.variant;
  logAI('getAIMove', `variant=${v} diff=${difficulty}`);

  if (v === 'ultimate')    return getAIMoveUltimate(state, difficulty);
  if (v === 'wild')        return getAIMoveWild(state, difficulty);
  if (v === 'order_chaos') return getAIMoveOrderChaos(state, difficulty);
  return getAIMoveClassic(state, difficulty);
};

export const randomFirstPlayer = () => Math.random() < 0.5 ? 'X' : 'O';
// utils/gameLogic.js v4 — Classic, 4x4, 5x5, Misère, Wild, Ultimate, Gomoku, Order&Chaos

import { logGame, logWarn, logError, validateGameState } from './debug';
import CONFIG from '../config';

// ─────────────────────────────────────────────────────────
// CHECK WINNER — funziona per qualsiasi griglia NxN, win length W
// ─────────────────────────────────────────────────────────
export const checkWinner = (board, size, winLength) => {
  if (!board || board.length !== size * size) return null;
  const get = (r, c) => board[r * size + c];

  const checkLine = (cells, startIdx) => {
    const val = cells[0];
    if (!val) return null;
    if (cells.every(v => v === val)) return { winner: val, line: startIdx };
    return null;
  };

  // Righe
  for (let r = 0; r < size; r++) {
    for (let c = 0; c <= size - winLength; c++) {
      const cells = Array.from({ length: winLength }, (_, i) => get(r, c + i));
      const line  = Array.from({ length: winLength }, (_, i) => r * size + (c + i));
      if (cells[0] && cells.every(v => v === cells[0]))
        return { winner: cells[0], line };
    }
  }
  // Colonne
  for (let c = 0; c < size; c++) {
    for (let r = 0; r <= size - winLength; r++) {
      const cells = Array.from({ length: winLength }, (_, i) => get(r + i, c));
      const line  = Array.from({ length: winLength }, (_, i) => (r + i) * size + c);
      if (cells[0] && cells.every(v => v === cells[0]))
        return { winner: cells[0], line };
    }
  }
  // Diag ↘
  for (let r = 0; r <= size - winLength; r++) {
    for (let c = 0; c <= size - winLength; c++) {
      const cells = Array.from({ length: winLength }, (_, i) => get(r + i, c + i));
      const line  = Array.from({ length: winLength }, (_, i) => (r + i) * size + (c + i));
      if (cells[0] && cells.every(v => v === cells[0]))
        return { winner: cells[0], line };
    }
  }
  // Diag ↙
  for (let r = 0; r <= size - winLength; r++) {
    for (let c = winLength - 1; c < size; c++) {
      const cells = Array.from({ length: winLength }, (_, i) => get(r + i, c - i));
      const line  = Array.from({ length: winLength }, (_, i) => (r + i) * size + (c - i));
      if (cells[0] && cells.every(v => v === cells[0]))
        return { winner: cells[0], line };
    }
  }

  if (board.every(c => c !== null)) return { winner: 'draw', line: [] };
  return null;
};

const isBoardFull = (board) => board.every(c => c !== null);

// ─────────────────────────────────────────────────────────
// CLASSIC / 4x4 / 5x5 / MISÈRE / WILD / GOMOKU
// ─────────────────────────────────────────────────────────
export const createClassicState = (variantId, firstPlayer = 'X') => {
  const variant = Object.values(CONFIG.GAME_VARIANTS)
    .find(v => v.id === variantId);
  if (!variant) { logError('createClassicState', 'variant non trovata:', variantId); return null; }

  const { boardSize, winLength } = variant;
  logGame('createClassicState', `v=${variantId} size=${boardSize} win=${winLength} first=${firstPlayer}`);

  const state = {
    variant: variantId,
    board: Array(boardSize * boardSize).fill(null),
    currentPlayer: firstPlayer,
    winner: null,
    winLine: [],
    isDraw: false,
    moveCount: 0,
    boardSize,
    winLength,
    gameOver: false,
  };

  // Order & Chaos: assegna ruoli
  if (variantId === 'order_chaos') {
    state.orderPlayer = firstPlayer;      // ORDER
    state.chaosPlayer = firstPlayer === 'X' ? 'O' : 'X'; // CHAOS
    // In Order&Chaos entrambi possono piazzare X o O
    state.isOrderChaos = true;
  }

  return state;
};

export const makeMoveClassic = (state, cellIndex, chosenPiece = null) => {
  logGame('makeMoveClassic', `cell=${cellIndex} player=${state.currentPlayer} variant=${state.variant}`);

  if (!state || state.gameOver) return state;
  if (state.board[cellIndex] !== null) {
    logWarn('makeMoveClassic', `cella ${cellIndex} già occupata`);
    return state;
  }

  const newBoard = [...state.board];

  if (state.variant === 'wild') {
    if (!chosenPiece || (chosenPiece !== 'X' && chosenPiece !== 'O')) {
      logWarn('makeMoveClassic', 'Wild: chosenPiece non valido');
      return state;
    }
    newBoard[cellIndex] = chosenPiece;
  } else if (state.isOrderChaos) {
    // Order & Chaos: qualsiasi giocatore può piazzare X o O
    if (!chosenPiece) { logWarn('makeMoveClassic', 'OrderChaos: piece required'); return state; }
    newBoard[cellIndex] = chosenPiece;
  } else {
    newBoard[cellIndex] = state.currentPlayer;
  }

  const result = checkWinner(newBoard, state.boardSize, state.winLength);
  let winner = null, winLine = [], isDraw = false, gameOver = false;

  if (result) {
    if (result.winner === 'draw') {
      if (state.isOrderChaos) {
        // Draw in Order&Chaos = CHAOS vince
        winner = state.chaosPlayer;
        gameOver = true;
        logGame('makeMoveClassic', `CHAOS vince per board piena`);
      } else {
        isDraw = true; gameOver = true;
      }
    } else {
      if (state.variant === 'misere') {
        // Chi fa tris PERDE
        winner = result.winner === 'X' ? 'O' : 'X';
      } else if (state.isOrderChaos) {
        // Qualcuno ha fatto 5 di fila = ORDER vince
        winner = state.orderPlayer;
        logGame('makeMoveClassic', `ORDER vince con 5 di fila`);
      } else {
        winner = result.winner;
      }
      winLine = result.line;
      gameOver = true;
    }
  }

  const newState = {
    ...state,
    board: newBoard,
    currentPlayer: state.currentPlayer === 'X' ? 'O' : 'X',
    winner,
    winLine,
    isDraw,
    gameOver,
    moveCount: state.moveCount + 1,
    lastMove: cellIndex,
  };

  validateGameState(newState, 'makeMoveClassic');
  return newState;
};

export const getValidMovesClassic = (state) =>
  state.board.map((c, i) => c === null ? i : null).filter(i => i !== null);

// ─────────────────────────────────────────────────────────
// ULTIMATE
// ─────────────────────────────────────────────────────────
export const createUltimateState = (firstPlayer = 'X') => {
  logGame('createUltimateState', `first=${firstPlayer}`);
  return {
    variant: 'ultimate',
    boards: Array(9).fill(null).map(() => Array(9).fill(null)),
    boardWinners: Array(9).fill(null),
    boardWinLines: Array(9).fill([]),
    metaBoard: Array(9).fill(null),
    currentPlayer: firstPlayer,
    activeBoard: null,
    winner: null,
    winLine: [],
    isDraw: false,
    gameOver: false,
    moveCount: 0,
    lastMove: null,
  };
};

export const makeMoveUltimate = (state, boardIndex, cellIndex) => {
  logGame('makeMoveUltimate', `b=${boardIndex} c=${cellIndex} p=${state.currentPlayer} active=${state.activeBoard}`);

  if (!state || state.gameOver) return state;
  if (state.activeBoard !== null && state.activeBoard !== boardIndex) {
    logWarn('makeMoveUltimate', `board ${boardIndex} non attiva (attiva: ${state.activeBoard})`);
    return state;
  }
  if (state.boardWinners[boardIndex] !== null) return state;
  if (state.boards[boardIndex][cellIndex] !== null) return state;

  const newBoards       = state.boards.map(b => [...b]);
  const newBoardWinners = [...state.boardWinners];
  const newBoardWinLines= [...state.boardWinLines];
  const newMetaBoard    = [...state.metaBoard];

  newBoards[boardIndex][cellIndex] = state.currentPlayer;

  const boardResult = checkWinner(newBoards[boardIndex], 3, 3);
  if (boardResult) {
    if (boardResult.winner === 'draw') {
      newBoardWinners[boardIndex] = 'draw';
      newMetaBoard[boardIndex]    = 'draw';
    } else {
      newBoardWinners[boardIndex]  = boardResult.winner;
      newBoardWinLines[boardIndex] = boardResult.line;
      newMetaBoard[boardIndex]     = boardResult.winner;
    }
  } else if (isBoardFull(newBoards[boardIndex])) {
    newBoardWinners[boardIndex] = 'draw';
    newMetaBoard[boardIndex]    = 'draw';
  }

  const metaResult = checkWinner(newMetaBoard, 3, 3);
  let winner = null, winLine = [], isDraw = false, gameOver = false;

  if (metaResult) {
    if (metaResult.winner === 'draw') {
      const xC = newMetaBoard.filter(v => v === 'X').length;
      const oC = newMetaBoard.filter(v => v === 'O').length;
      winner = xC > oC ? 'X' : oC > xC ? 'O' : 'draw';
      isDraw = winner === 'draw';
      gameOver = true;
    } else {
      winner = metaResult.winner;
      winLine = metaResult.line;
      gameOver = true;
    }
  }

  let nextActiveBoard = null;
  if (!gameOver) {
    const target = cellIndex;
    if (newBoardWinners[target] !== null || isBoardFull(newBoards[target])) {
      nextActiveBoard = null;
    } else {
      nextActiveBoard = target;
    }
  }

  const newState = {
    ...state,
    boards: newBoards,
    boardWinners: newBoardWinners,
    boardWinLines: newBoardWinLines,
    metaBoard: newMetaBoard,
    currentPlayer: state.currentPlayer === 'X' ? 'O' : 'X',
    activeBoard: nextActiveBoard,
    winner,
    winLine,
    isDraw,
    gameOver,
    moveCount: state.moveCount + 1,
    lastMove: { boardIndex, cellIndex },
  };

  validateGameState(newState, 'makeMoveUltimate');
  return newState;
};

export const getValidMovesUltimate = (state) => {
  const moves = [];
  const boardsToCheck = state.activeBoard !== null
    ? [state.activeBoard]
    : Array.from({ length: 9 }, (_, i) => i).filter(i => state.boardWinners[i] === null);

  for (const bi of boardsToCheck) {
    for (let ci = 0; ci < 9; ci++) {
      if (state.boards[bi][ci] === null) moves.push({ boardIndex: bi, cellIndex: ci });
    }
  }
  return moves;
};

// ─────────────────────────────────────────────────────────
// RANDOM — sceglie variante e crea stato
// ─────────────────────────────────────────────────────────
export const createRandomState = (firstPlayer = 'X') => {
  const pool = CONFIG.GAME_VARIANTS.RANDOM.randomPool;
  const chosen = pool[Math.floor(Math.random() * pool.length)];
  logGame('createRandomState', `variante scelta: ${chosen}`);

  if (chosen === 'ultimate') return { ...createUltimateState(firstPlayer), chosenVariant: chosen };
  return { ...createClassicState(chosen, firstPlayer), chosenVariant: chosen };
};
// utils/debug.js
// Sistema di log — metti DEBUG=false in config.js per silenziare tutto

import CONFIG from '../config';

const ts = () => new Date().toISOString().slice(11, 19);

export const log = (level, tag, ...args) => {
  if (!CONFIG.DEBUG) return;
  const icons = { INFO:'📘', WARN:'⚠️', ERROR:'🔴', GAME:'🎮', CREDIT:'💰', NAV:'🧭', AI:'🤖' };
  console.log(`[${ts()}] ${icons[level]||'📗'} [${tag}]`, ...args);
};

export const logGame   = (tag, ...a) => log('GAME',   tag, ...a);
export const logAI     = (tag, ...a) => log('AI',     tag, ...a);
export const logCredit = (tag, ...a) => log('CREDIT', tag, ...a);
export const logNav    = (tag, ...a) => log('NAV',    tag, ...a);
export const logWarn   = (tag, ...a) => log('WARN',   tag, ...a);
export const logError  = (tag, ...a) => log('ERROR',  tag, ...a);

export const validateGameState = (state, tag = 'VALIDATE') => {
  if (!CONFIG.DEBUG) return true;
  if (!state) { logError(tag, 'state è null'); return false; }
  if (!Array.isArray(state.board) && !Array.isArray(state.boards)) {
    logError(tag, 'board non è un array');
    return false;
  }
  log('INFO', tag, '✅ stato OK — player:', state.currentPlayer, 'mosse:', state.moveCount);
  return true;
};
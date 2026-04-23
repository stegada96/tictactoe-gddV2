// utils/rewardEligibility.js — Anti-farming e reward centralizzati
// UNICA source of truth per: eligibility, XP, crediti.
// NON duplicare questa logica altrove.

import CONFIG from '../config';

/**
 * isRewardEligible — decide se una partita dà XP/crediti.
 */
export const isRewardEligible = ({
  mode, result, durationSec = 999, moveCount = 999,
  difficulty = 'medium', forfeit = false,
}) => {
  if (mode === 'local')                       return { eligible: false, reason: 'local_no_reward' };
  if (mode === 'ai' && difficulty === 'easy') return { eligible: false, reason: 'ai_easy_no_reward' };

  const minDur  = CONFIG.ANTI_FARM_MIN_DURATION_SEC || 10;
  const minMov  = CONFIG.ANTI_FARM_MIN_MOVES        || 3;

  if (durationSec < minDur) return { eligible: false, reason: `too_short_${Math.round(durationSec)}s` };
  if (moveCount   < minMov) return { eligible: false, reason: `too_few_moves_${moveCount}` };

  return { eligible: true, reason: 'ok', forfeit };
};

/**
 * getXpForResult — XP basato su CONFIG.XP_AI_MEDIUM/HARD/ONLINE.
 * Hardcode rimosso: se cambi i valori in config/economy.js,
 * tutto il progetto li eredita automaticamente.
 */
export const getXpForResult = ({ mode, result, difficulty }) => {
  const r = result === 'win' ? 'win' : result === 'draw' ? 'draw' : 'loss';
  if (mode === 'ai') {
    if (difficulty === 'medium') return (CONFIG.XP_AI_MEDIUM || { win:8, draw:3, loss:1 })[r] || 0;
    if (difficulty === 'hard')   return (CONFIG.XP_AI_HARD   || { win:18,draw:7, loss:2 })[r] || 0;
  }
  if (mode === 'online') return (CONFIG.XP_ONLINE || { win:30, draw:12, loss:4 })[r] || 0;
  return 0;
};

/**
 * getCreditsForResult — crediti per vittoria per modalità.
 * LONG_VARIANTS da CONFIG (config/variants.js → config.js).
 */
export const getCreditsForResult = ({ mode, result, difficulty, variantId }) => {
  if (result !== 'win') return 0;
  const longVariants = CONFIG.LONG_VARIANTS || ['ultimate','classic_4x4','classic_5x5','order_chaos'];
  if (mode === 'ai' && difficulty === 'medium') return longVariants.includes(variantId) ? 1 : 0;
  if (mode === 'ai' && difficulty === 'hard')   return 2;
  if (mode === 'online')                         return 4;
  return 0;
};
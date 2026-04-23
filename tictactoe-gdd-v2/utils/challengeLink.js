// utils/challengeLink.js — Viral loop: link sfida
//
// PERCHÉ: il challenge link è il meccanismo virale più adatto al genere.
// Un utente vince, condivide il link, l'amico lo riceve, apre l'app
// e si ritrova direttamente in una partita sfida. Crea installazioni
// organiche con D1 retention alta perché c'è un motivo immediato per giocare.
//
// ARCHITETTURA FASE 1 (ora):
//   - Link generato con OS Share Sheet (no backend necessario)
//   - Dati sfida encoded nell'URL (variantId, score, playerName)
//   - Nessun backend: il link apre l'app tramite deep link scheme
//   - Reward per chi condivide: flat + non abusabile (1x/giorno)
//
// ARCHITETTURA FASE 2 (con backend):
//   - Link shortener server-side (api.tictactoegdd.app/c/{id})
//   - Tracking conversioni (chi ha installato da link sfida)
//   - Reward bilaterale: +bonus per chi manda E per chi riceve
//   - Leaderboard sfide settimanali

import { Share, Platform } from 'react-native';
import { getStore, addCredits } from './storage';
import { log } from './debug';
import CONFIG from '../config';

// ── Configurazione ─────────────────────────────────────────────
const CHALLENGE_BASE_URL   = 'https://tictactoegdd.app/challenge';
const APP_SCHEME           = 'tictactoegdd://challenge';
const PLAY_STORE_URL       = 'https://play.google.com/store/apps/details?id=com.tictactoegdd.app';
const APP_STORE_URL        = 'https://apps.apple.com/app/tictactoegdd/id000000000'; // aggiornare
const SHARE_REWARD_CREDITS = 3;   // crediti per chi condivide (anti-abuso: 1x/giorno)
const SHARE_DAILY_CAP      = 1;   // max share reward al giorno

// ── Costruzione URL sfida ──────────────────────────────────────
/**
 * buildChallengeUrl — costruisce l'URL della sfida da condividere.
 * Contiene i dati della partita encodati come query params.
 * In Fase 1: URL universale che rimanda a Play Store/App Store.
 * In Fase 2: URL backend shortener con tracking.
 *
 * @param {object} params
 * @param {string} params.variantId — variante giocata
 * @param {string} params.result    — 'win' | 'draw'
 * @param {number} params.eloAfter  — ELO post-partita
 * @param {string} params.playerName — nome del giocatore
 * @returns {string} URL della sfida
 */
export const buildChallengeUrl = ({ variantId, result, eloAfter, playerName }) => {
  const encoded = {
    v: variantId || 'classic',
    r: result || 'win',
    e: eloAfter || 500,
    n: encodeURIComponent((playerName || 'Sfidante').slice(0, 20)),
  };
  const params = Object.entries(encoded)
    .map(([k, v]) => `${k}=${v}`)
    .join('&');

  // Deep link per chi ha già l'app installata
  const deepLink = `${APP_SCHEME}?${params}`;

  // Fallback: link universale (landing page o store)
  // In Fase 1: link diretto a Play Store / App Store
  const universalUrl = `${CHALLENGE_BASE_URL}?${params}`;

  return {
    deepLink,
    universalUrl,
    storeUrl: Platform.OS === 'ios' ? APP_STORE_URL : PLAY_STORE_URL,
  };
};

// ── Copy UX ───────────────────────────────────────────────────
const SHARE_COPY = {
  win: {
    it: (playerName, variantName, elo) =>
      `🏆 ${playerName} ti sfida su TicTacToe GDD!\n` +
      `Ho appena vinto una partita di ${variantName} con ELO ${elo}.\n` +
      `Riesci a battermi? 🔥\n\n` +
      `Scarica gratis e accetta la sfida:`,
    en: (playerName, variantName, elo) =>
      `🏆 ${playerName} challenges you on TicTacToe GDD!\n` +
      `Just won a ${variantName} match — ELO ${elo}.\n` +
      `Think you can beat me? 🔥\n\n` +
      `Download free and accept the challenge:`,
  },
  draw: {
    it: (playerName, variantName) =>
      `⚡ ${playerName} ti sfida su TicTacToe GDD!\n` +
      `Partita di ${variantName} finita in pareggio.\n` +
      `Chi vincerà al prossimo round?\n\n` +
      `Scarica gratis:`,
    en: (playerName, variantName) =>
      `⚡ ${playerName} challenges you on TicTacToe GDD!\n` +
      `Draw in ${variantName}. Who wins the next round?\n\n` +
      `Download free:`,
  },
};

// ── Share nativo ───────────────────────────────────────────────
/**
 * shareChallenge — apre OS Share Sheet con il link sfida.
 * Opzionalmente premia il giocatore con crediti (cap 1x/giorno, anti-abuso).
 *
 * @param {object} params — stessi di buildChallengeUrl + variantName, lang
 * @returns {object} { ok, rewarded, reason }
 */
export const shareChallenge = async ({
  variantId,
  variantName = 'Classic',
  result = 'win',
  eloAfter = 500,
  playerName,
  lang = 'it',
  grantReward = true,
}) => {
  try {
    const store = getStore();
    const name  = playerName || store?.player?.name || 'Sfidante';
    const urls  = buildChallengeUrl({ variantId, result, eloAfter, playerName: name });

    // Costruzione testo
    const copyFn = SHARE_COPY[result] || SHARE_COPY.win;
    const langCopy = copyFn[lang] || copyFn.it;
    const message = `${langCopy(name, variantName, eloAfter)}\n${urls.storeUrl}`;

    const result_ = await Share.share({
      message,
      url: Platform.OS === 'ios' ? urls.universalUrl : undefined, // iOS: URL separato
      title: lang === 'it' ? '🎮 TicTacToe GDD — Sfida!' : '🎮 TicTacToe GDD — Challenge!',
    });

    if (result_.action === Share.sharedAction) {
      log('INFO', 'ChallengeLink', `Condiviso: ${result_?.activityType || 'unknown'}`);

      // Reward per condivisione — anti-abuso: max SHARE_DAILY_CAP al giorno
      let rewarded = false;
      if (grantReward && _canGrantShareReward()) {
        await addCredits(SHARE_REWARD_CREDITS, 'share_challenge');
        _markShareRewarded();
        rewarded = true;
        log('INFO', 'ChallengeLink', `Share reward: +${SHARE_REWARD_CREDITS}cr`);
      }

      return { ok: true, rewarded, credits: rewarded ? SHARE_REWARD_CREDITS : 0 };
    }

    return { ok: false, reason: 'dismissed' };
  } catch (e) {
    log('WARN', 'ChallengeLink', `Share error: ${e.message}`);
    return { ok: false, reason: e.message };
  }
};

// ── Anti-abuso share reward ────────────────────────────────────
let _shareRewardDate = null;
let _shareRewardCount = 0;

const _canGrantShareReward = () => {
  const today = new Date().toDateString();
  if (_shareRewardDate !== today) {
    _shareRewardDate  = today;
    _shareRewardCount = 0;
  }
  return _shareRewardCount < SHARE_DAILY_CAP;
};

const _markShareRewarded = () => {
  _shareRewardCount++;
};

// ── Handler per ricezione deep link ───────────────────────────
/**
 * parseChallengeUrl — estrae i dati sfida dall'URL ricevuto.
 * Da usare in App.js con Linking.getInitialURL() e Linking.addEventListener.
 *
 * @param {string} url — URL deep link o universale ricevuto
 * @returns {object|null} — params sfida oppure null se non è una sfida
 */
export const parseChallengeUrl = (url) => {
  if (!url) return null;
  try {
    // Riconosce sia tictactoegdd://challenge?... che https://tictactoegdd.app/challenge?...
    const isChallenge = url.includes('challenge?') || url.includes('challenge/');
    if (!isChallenge) return null;

    const queryStart = url.indexOf('?');
    if (queryStart === -1) return null;

    const query = url.slice(queryStart + 1);
    const params = Object.fromEntries(
      query.split('&').map(p => {
        const [k, v] = p.split('=');
        return [k, decodeURIComponent(v || '')];
      })
    );

    return {
      variantId:  params.v || 'classic',
      result:     params.r || 'win',
      eloAfter:   parseInt(params.e, 10) || 500,
      playerName: params.n || 'Sfidante',
    };
  } catch (e) {
    return null;
  }
};

// ── Config flags ───────────────────────────────────────────────
export const CHALLENGE_CONFIG = {
  ENABLED:          true,          // condivisione OS-level sempre disponibile
  DEEP_LINK_SCHEME: APP_SCHEME,
  BASE_URL:         CHALLENGE_BASE_URL,
  SHARE_REWARD:     SHARE_REWARD_CREDITS,
  DAILY_CAP:        SHARE_DAILY_CAP,
  // Fase 2: backend tracking
  BACKEND_TRACKING: false,
  BILATERAL_REWARD: false,  // reward anche per chi riceve il link
  BILATERAL_CREDITS: 10,
};

export default { shareChallenge, parseChallengeUrl, buildChallengeUrl, CHALLENGE_CONFIG };
// services/ads.js
// ─────────────────────────────────────────────────────────
// ⚠️  AdMob IDs: CONFIG.ADMOB_* → ora arrivano da config/ads.js (test IDs).
// PRIMA DEL RILASCIO: sostituire gli IDs in config/ads.js con production IDs.
// In release build __DEV__ = false → il codice non cambia automaticamente gli IDs.
// Responsabilità del developer cambiare config/ads.js prima della build finale.
// ─────────────────────────────────────────────────────────
// INTERSTITIAL
//   • SOLO a fine partita, mai durante il gameplay
//   • trigger: (partite >= 2) OPPURE (tempo >= 5 min dall'ultima)
//   • grace period: prime 5 partite lifetime → senza ads
//   • salta se noAds / noAdsPermanent / noAdsMonth / vip / birthdayActive
//   • se fallisce o SDK non disponibile: non blocca il flusso
//   • _adInFlight: previene doppia interstitial
//
// REWARDED
//   • storage.js è l'UNICA fonte di verità (canWatchVideo / recordVideoWatched)
//   • ads.js NON mantiene contatore giornaliero proprio
//   • crediti aggiunti SOLO da recordVideoWatched() — mai da addCredits() diretto
//   • reward accreditata SOLO su rewardedVideoUserDidEarnReward
//   • _rewardInFlight: previene doppio tap
// ─────────────────────────────────────────────────────────

import CONFIG from '../config';
import { log, logError } from '../utils/debug';
import { getAdIds, isUsingTestIds } from '../config/adsIds';
// Import statici da storage — nessun dynamic import, nessuna dipendenza circolare
import {
  canWatchVideo,
  recordVideoWatched,
  recordVideoCount,
  isAdsForbidden,
  getLifetimeGames,
  getAdsTriggerState,
  getStore,
} from '../utils/storage';

// ─── AD IDs — risolti una volta sola al caricamento del modulo ──
// getAdIds() seleziona automaticamente test vs production IDs
const AD_IDS = getAdIds();
// Log all'avvio per visibilità in dev
if (typeof __DEV__ !== 'undefined' && __DEV__) {
  log('INFO', 'Ads', isUsingTestIds()
    ? '✅ Usando TEST IDs AdMob (dev)'
    : '⚠️  Usando PRODUCTION IDs AdMob in DEV — verificare intenzionale'
  );
}

// ─── COSTANTI ────────────────────────────────────────────
const MIN_INTERSTITIAL_GAP_MS = (CONFIG.ADS_MIN_MINUTES   || 5) * 60 * 1000;
const GAMES_BETWEEN_ADS       =  CONFIG.ADS_GAMES_BETWEEN || 2;
const NEW_USER_GRACE_GAMES    = CONFIG.ADS_GAMES_BEFORE_FIRST || 8;
const REWARD_CREDITS          = CONFIG.CREDITS_VIDEO_REWARD || 5;

// ─── STATO INTERNO — solo session flags, NON contatori ───
let _adModule       = null;
let _adModuleLoaded = false;
let _adInFlight     = false;   // previene doppia interstitial
let _rewardInFlight = false;   // previene doppio rewarded

// ─── CARICAMENTO SDK ADMOB (lazy, una sola volta) ─────────
const _loadAdModule = async () => {
  if (_adModuleLoaded) return !!_adModule;
  _adModuleLoaded = true;
  try {
    try {
      _adModule = await import('expo-ads-admob');
      log('INFO', 'Ads', 'expo-ads-admob caricato');
    } catch {
      _adModule = await import('react-native-google-mobile-ads');
      log('INFO', 'Ads', 'react-native-google-mobile-ads caricato');
    }
    return true;
  } catch (e) {
    log('INFO', 'Ads', `SDK non disponibile (${e.message}) — placeholder attivo`);
    return false;
  }
};

// ─── INTERSTITIAL ─────────────────────────────────────────

/**
 * shouldShowAd — verifica tutte le condizioni.
 * Da chiamare in GameScreen DOPO la fine partita, PRIMA di navigare.
 * Legge gamesPlayedSession e lastAdShownTime da storage tramite getAdsTriggerState().
 */
export const shouldShowAd = async () => {
  // 1. noAds / vip / birthday → legge dal store (già caricato in memoria)
  if (isAdsForbidden()) {
    log('INFO', 'Ads', 'skip — no-ads/vip/birthday');
    return false;
  }

  // 2. Grace period + onboarding check
  const lifetime = getLifetimeGames();
  if (lifetime < NEW_USER_GRACE_GAMES) {
    log('INFO', 'Ads', `skip — nuovo utente (${lifetime}/${NEW_USER_GRACE_GAMES})`);
    return false;
  }
  // Mai durante onboarding (player non ha completato l'onboarding)
  try {
    const p = getStore().player || null;
    if (p && !p.onboardingDone) {
      log('INFO', 'Ads', 'skip — onboarding in corso');
      return false;
    }
  } catch (e) { /* intentionally ignored */ }

  // 3. Trigger: partite >= 2 OPPURE tempo >= 5 min
  const { gamesPlayedSession, lastAdShownTime } = getAdsTriggerState();
  const now         = Date.now();
  const timePassed  = (now - lastAdShownTime) >= MIN_INTERSTITIAL_GAP_MS;
  const gamesPassed = gamesPlayedSession >= GAMES_BETWEEN_ADS;

  const show = timePassed || gamesPassed;
  log('INFO', 'Ads',
    `shouldShow=${show} games=${gamesPlayedSession}/${GAMES_BETWEEN_ADS} ` +
    `time=${Math.round((now - lastAdShownTime) / 1000)}s/${MIN_INTERSTITIAL_GAP_MS / 1000}s`
  );
  return show;
};

/**
 * showInterstitial — mostra l'ad (o il placeholder Modal in GameScreen).
 * Ritorna true se deve essere mostrato il Modal, false se fallisce/salta.
 * NON blocca il flusso: GameScreen naviga comunque.
 */
export const showInterstitial = async () => {
  if (_adInFlight) {
    log('INFO', 'Ads', 'skip — interstitial già in corso');
    return false;
  }
  _adInFlight = true;

  try {
    const adOk = await _loadAdModule();

    if (!adOk || !_adModule) {
      // Nessun SDK — il Modal placeholder in GameScreen si occupa del flusso
      log('INFO', 'Ads', 'placeholder interstitial (SDK non installato)');
      return true; // GameScreen mostra il Modal e chiama recordAdShown al dismiss
    }

    try {
      if (_adModule.AdMobInterstitial) {
        // expo-ads-admob
        await _adModule.AdMobInterstitial.setAdUnitID(AD_IDS.ADMOB_INTERSTITIAL);
        await _adModule.AdMobInterstitial.requestAdAsync({ servePersonalizedAds: false });
        await _adModule.AdMobInterstitial.showAdAsync();
        log('INFO', 'Ads', 'interstitial mostrata (expo-ads-admob)');
      } else if (_adModule.InterstitialAd) {
        // react-native-google-mobile-ads
        const { InterstitialAd, AdEventType, TestIds } = _adModule;
        const adUnitId = AD_IDS.ADMOB_INTERSTITIAL || TestIds.INTERSTITIAL;
        const ad = InterstitialAd.createForAdRequest(adUnitId, { requestNonPersonalizedAdsOnly: true });
        await new Promise((resolve) => {
          const uLoad  = ad.addAdEventListener(AdEventType.LOADED,  () => { uLoad(); ad.show(); });
          const uClose = ad.addAdEventListener(AdEventType.CLOSED,  () => { uClose(); resolve(); });
          const uErr   = ad.addAdEventListener(AdEventType.ERROR,   () => { uErr(); resolve(); });
          ad.load();
          setTimeout(resolve, 8000); // safety timeout
        });
        log('INFO', 'Ads', 'interstitial mostrata (react-native-google-mobile-ads)');
      }
      return true;
    } catch (e) {
      logError('Ads', 'interstitial show error:', e.message);
      return false; // fallito: GameScreen naviga direttamente
    }
  } finally {
    _adInFlight = false;
  }
};

/** Chiamato quando il Modal placeholder viene chiuso in GameScreen */
export const onInterstitialDismissed = () => {
  _adInFlight = false;
};

// ─── REWARDED ─────────────────────────────────────────────

/**
 * canWatchReward — delega interamente a storage.canWatchVideo().
 * storage.js è la SOLA fonte di verità per il contatore giornaliero.
 */
export const canWatchReward = () => canWatchVideo();

/**
 * showRewardedAd
 *
 * Flusso corretto:
 *   1. Controlla canWatchVideo() — se false, ritorna subito
 *   2. _rewardInFlight = true (blocca doppio tap)
 *   3. Se il video viene completato → recordVideoWatched() (incrementa contatore + aggiunge crediti)
 *      → poi chiama onReward({ credits }) per aggiornare l'UI
 *   4. Se l'utente chiude prima / errore → NON chiama recordVideoWatched → nessun credito
 *   5. _rewardInFlight = false (sempre nel finally)
 *
 * @param {function} onReward — cb({ credits: N }) SOLO se video completato
 */
export const showRewardedAd = async (onReward) => {
  if (_rewardInFlight) {
    log('INFO', 'Ads', 'rewarded skip — in flight');
    return { ok: false, reason: 'in_flight' };
  }
  if (!canWatchVideo()) {
    log('INFO', 'Ads', 'rewarded skip — limite giornaliero raggiunto');
    return { ok: false, reason: 'daily_limit' };
  }

  _rewardInFlight = true;
  try {
    const adOk = await _loadAdModule();

    if (!adOk || !_adModule) {
      // Placeholder dev/test: rewarda comunque (SDK non installato)
      log('INFO', 'Ads', 'placeholder rewarded (SDK non installato)');
      await recordVideoWatched(); // incrementa contatore + aggiunge crediti in storage
      const reward = { credits: REWARD_CREDITS };
      if (onReward) await onReward(reward);
      return { ok: true, credits: REWARD_CREDITS };
    }

    if (_adModule.AdMobRewarded) {
      return await _showRewardedExpoAdmob(onReward);
    } else if (_adModule.RewardedAd) {
      return await _showRewardedRNGoogleAds(onReward);
    }

    logError('Ads', 'rewarded: API non riconosciuta');
    return { ok: false, reason: 'unknown_api' };
  } catch (e) {
    logError('Ads', 'showRewardedAd error:', e.message);
    return { ok: false, reason: 'exception' };
  } finally {
    _rewardInFlight = false;
  }
};

/**
 * showRewardedAdCustom — per reward PERSONALIZZATI (post-game, double bonus, ecc.)
 *
 * ⚠️  DIFFERENZA CRITICA rispetto a showRewardedAd():
 *   showRewardedAd()       → chiama recordVideoWatched() → aggiunge CONFIG.CREDITS_VIDEO_REWARD automaticamente
 *   showRewardedAdCustom() → chiama recordVideoCount()   → ZERO crediti automatici
 *
 * Il caller DEVE aggiungere i crediti corretti dentro onReward():
 *   await addCredits(amount, 'video');
 *
 * Garantisce: nessun doppio accredito. Nessuna reward se il video non è completato.
 */
export const showRewardedAdCustom = async (onReward) => {
  if (_rewardInFlight) return { ok: false, reason: 'in_flight' };
  if (!canWatchVideo())  return { ok: false, reason: 'daily_limit' };
  _rewardInFlight = true;
  try {
    const adOk = await _loadAdModule();
    if (!adOk || !_adModule) {
      // Placeholder: conta il video ma NON aggiunge crediti (li gestisce il caller)
      await recordVideoCount();
      if (onReward) await onReward();
      return { ok: true };
    }
    if (_adModule.AdMobRewarded) return await _showRewardedExpoAdmobCustom(onReward);
    if (_adModule.RewardedAd)    return await _showRewardedRNGoogleAdsCustom(onReward);
    return { ok: false, reason: 'unknown_api' };
  } catch (e) {
    logError('Ads', 'showRewardedAdCustom error:', e.message);
    return { ok: false, reason: 'exception' };
  } finally {
    _rewardInFlight = false;
  }
};

// expo-ads-admob — versione custom: callback salvate come costanti per rimozione precisa
const _showRewardedExpoAdmobCustom = (onReward) => new Promise(async (resolve) => {
  let earned   = false;
  let resolved = false;
  let _timeout;
  const { AdMobRewarded } = _adModule;

  const done = (result) => {
    if (resolved) return;
    resolved = true;
    clearTimeout(_timeout);
    // Rimuovi ESATTAMENTE le stesse callback registrate (non per nome generico)
    try { AdMobRewarded.removeEventListener('rewardedVideoUserDidEarnReward', onEarned); } catch (e) { /* intentionally ignored */ }
    try { AdMobRewarded.removeEventListener('rewardedVideoDidDismiss',        onDismiss); } catch (e) { /* intentionally ignored */ }
    try { AdMobRewarded.removeEventListener('rewardedVideoDidFailToLoad',     onFail); } catch (e) { /* intentionally ignored */ }
    resolve(result);
  };

  const onEarned = async () => {
    earned = true;
    await recordVideoCount(); // solo contatore — crediti gestiti dal caller
    try { if (onReward) await onReward(); } catch (e) { logError('Ads', 'onReward callback error:', e?.message); }
  };
  const onDismiss = () => done(earned ? { ok: true } : { ok: false, reason: 'dismissed_early' });
  const onFail    = () => done({ ok: false, reason: 'load_failed' });

  try {
    await AdMobRewarded.setAdUnitID(AD_IDS.ADMOB_REWARDED);
    await AdMobRewarded.requestAdAsync({ servePersonalizedAds: false });
    AdMobRewarded.addEventListener('rewardedVideoUserDidEarnReward', onEarned);
    AdMobRewarded.addEventListener('rewardedVideoDidDismiss',        onDismiss);
    AdMobRewarded.addEventListener('rewardedVideoDidFailToLoad',     onFail);
    _timeout = setTimeout(() => done({ ok: false, reason: 'timeout' }), 10000);
    await AdMobRewarded.showAdAsync();
    clearTimeout(_timeout); // l'ad sta girando: il load-timeout non deve più scattare
  } catch (e) {
    done({ ok: false, reason: e.message });
  }
});

// react-native-google-mobile-ads — versione custom: error listener + timeout + clearTimeout in done()
const _showRewardedRNGoogleAdsCustom = (onReward) => new Promise((resolve) => {
  const { RewardedAd, RewardedAdEventType, AdEventType, TestIds } = _adModule;
  const ad = RewardedAd.createForAdRequest(
    AD_IDS.ADMOB_REWARDED || TestIds.REWARDED,
    { requestNonPersonalizedAdsOnly: true }
  );
  let earned   = false;
  let resolved = false;
  let _timeout;

  const done = (result) => {
    if (resolved) return;
    resolved = true;
    clearTimeout(_timeout);          // pulisce timer pendente
    try { uLoad();   } catch (e) { /* intentionally ignored */ }
    try { uEarned(); } catch (e) { /* intentionally ignored */ }
    try { uClose();  } catch (e) { /* intentionally ignored */ }
    try { uErr();    } catch (e) { /* intentionally ignored */ }
    resolve(result);
  };

  const uEarned = ad.addAdEventListener(RewardedAdEventType.EARNED_REWARD, async () => {
    earned = true;
    await recordVideoCount(); // solo contatore — crediti gestiti dal caller
    try { if (onReward) await onReward(); } catch (e) { logError('Ads', 'onReward callback error:', e?.message); }
  });

  const uClose = ad.addAdEventListener(AdEventType.CLOSED, () =>
    done(earned ? { ok: true } : { ok: false, reason: 'dismissed_early' }));

  const uErr = ad.addAdEventListener(AdEventType.ERROR, (e) =>
    done({ ok: false, reason: e?.message || 'load_error' }));

  const uLoad  = ad.addAdEventListener(AdEventType.LOADED, () => {
    clearTimeout(_timeout); // l'ad è caricata: il load-timeout non serve più
    ad.show();
  });

  _timeout = setTimeout(() => done({ ok: false, reason: 'timeout' }), 10000);

  ad.load();
});

// expo-ads-admob — standard: callback stabili, cleanup con stessa reference, done() idempotente
const _showRewardedExpoAdmob = (onReward) => new Promise(async (resolve) => {
  let earned   = false;
  let resolved = false;
  let _timeout;
  const { AdMobRewarded } = _adModule;

  const done = (result) => {
    if (resolved) return;
    resolved = true;
    clearTimeout(_timeout);
    try { AdMobRewarded.removeEventListener('rewardedVideoUserDidEarnReward', onEarned); } catch (e) { /* intentionally ignored */ }
    try { AdMobRewarded.removeEventListener('rewardedVideoDidDismiss',        onDismiss); } catch (e) { /* intentionally ignored */ }
    try { AdMobRewarded.removeEventListener('rewardedVideoDidFailToLoad',     onFail); } catch (e) { /* intentionally ignored */ }
    resolve(result);
  };

  const onEarned = async () => {
    earned = true;
    await recordVideoWatched(); // standard: incrementa contatore + aggiunge CREDITS_VIDEO_REWARD
    const reward = { credits: REWARD_CREDITS };
    try { if (onReward) await onReward(reward); } catch (e) { /* intentionally ignored */ }
  };
  const onDismiss = () => {
    if (!earned) log('INFO', 'Ads', 'rewarded chiuso prima del completamento — nessun credito');
    done(earned ? { ok: true, credits: REWARD_CREDITS } : { ok: false, reason: 'dismissed_early' });
  };
  const onFail = () => done({ ok: false, reason: 'load_failed' });

  try {
    await AdMobRewarded.setAdUnitID(AD_IDS.ADMOB_REWARDED);
    await AdMobRewarded.requestAdAsync({ servePersonalizedAds: false });
    AdMobRewarded.addEventListener('rewardedVideoUserDidEarnReward', onEarned);
    AdMobRewarded.addEventListener('rewardedVideoDidDismiss',        onDismiss);
    AdMobRewarded.addEventListener('rewardedVideoDidFailToLoad',     onFail);
    _timeout = setTimeout(() => done({ ok: false, reason: 'timeout' }), 10000);
    await AdMobRewarded.showAdAsync();
    clearTimeout(_timeout); // l'ad sta girando: il load-timeout non deve più scattare
  } catch (e) {
    done({ ok: false, reason: e.message });
  }
});

// react-native-google-mobile-ads — standard: done() idempotente, clearTimeout, cleanup listener
const _showRewardedRNGoogleAds = (onReward) => new Promise((resolve) => {
  const { RewardedAd, RewardedAdEventType, AdEventType, TestIds } = _adModule;
  const ad = RewardedAd.createForAdRequest(
    AD_IDS.ADMOB_REWARDED || TestIds.REWARDED,
    { requestNonPersonalizedAdsOnly: true }
  );
  let earned   = false;
  let resolved = false;
  let _timeout;

  const done = (result) => {
    if (resolved) return;
    resolved = true;
    clearTimeout(_timeout);
    try { uLoad();   } catch (e) { /* intentionally ignored */ }
    try { uEarned(); } catch (e) { /* intentionally ignored */ }
    try { uClose();  } catch (e) { /* intentionally ignored */ }
    try { uErr();    } catch (e) { /* intentionally ignored */ }
    resolve(result);
  };

  const uEarned = ad.addAdEventListener(RewardedAdEventType.EARNED_REWARD, async () => {
    earned = true;
    await recordVideoWatched(); // standard: incrementa contatore + aggiunge CREDITS_VIDEO_REWARD
    const reward = { credits: REWARD_CREDITS };
    try { if (onReward) await onReward(reward); } catch (e) { /* intentionally ignored */ }
  });

  const uClose = ad.addAdEventListener(AdEventType.CLOSED, () => {
    if (!earned) log('INFO', 'Ads', 'rewarded chiuso prima del completamento — nessun credito');
    done(earned ? { ok: true, credits: REWARD_CREDITS } : { ok: false, reason: 'dismissed_early' });
  });

  const uErr  = ad.addAdEventListener(AdEventType.ERROR, (e) =>
    done({ ok: false, reason: e?.message || 'load_error' }));

  const uLoad = ad.addAdEventListener(AdEventType.LOADED, () => {
    clearTimeout(_timeout); // l'ad è caricata: il load-timeout non serve più
    ad.show();
  });

  _timeout = setTimeout(() => done({ ok: false, reason: 'timeout' }), 10000);

  ad.load();
});

// ─── UTILS ───────────────────────────────────────────────
export const getAdsState = () => ({
  adInFlight:    _adInFlight,
  rewardInFlight:_rewardInFlight,
});

// Backward compat — non-op: lo stato noAds è ora letto da storage
export const setAdsConfig = () => {};

// ── EEA CONSENT (UMP) ─────────────────────────────────────
// Safe no-op if react-native-google-mobile-ads not installed.
// Called in bootstrap BEFORE any ad is shown (step 4a).
let _consentChecked = false;

export const requestAdsConsent = async () => {
  if (_consentChecked) return;
  _consentChecked = true;
  try {
    const { AdsConsent, AdsConsentStatus } = await import('react-native-google-mobile-ads');
    const info = await AdsConsent.requestInfoUpdate();
    if (info.isConsentFormAvailable && info.status === AdsConsentStatus.REQUIRED) {
      await AdsConsent.showForm();
    }
    log('INFO', 'Ads', 'EEA consent OK');
  } catch (e) {
    // SDK not installed, non-EEA device, or form not needed — silent fallback
    log('INFO', 'Ads', `EEA consent skipped: ${e?.message}`);
  }
};
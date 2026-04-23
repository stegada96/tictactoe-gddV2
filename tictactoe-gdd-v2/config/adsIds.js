// config/adsIds.js — AdMob IDs separati per ambiente e piattaforma
// ──────────────────────────────────────────────────────────────────
// ⚠️  ISTRUZIONI PER LA RELEASE ANDROID:
//   1. I PRODUCTION_IDS Android sono già compilati con ID reali.
//   2. Verificare che app.config.js → android.config.googleMobileAdsAppId sia uguale.
//   3. Eseguire: APP_ENV=production eas build --platform android --profile production
//
// ⚠️  ISTRUZIONI PER LA RELEASE iOS:
//   1. Creare un'app separata su AdMob per iOS (ID diversi dall'Android!)
//   2. Compilare PRODUCTION_IDS → _IOS con i nuovi ID
//   3. Aggiornare app.config.js → ios.config.googleMobileAdsAppId
//   4. Aggiornare plugins react-native-google-mobile-ads → iosAppId
//   5. Eseguire: APP_ENV=production eas build --platform ios --profile production
//
// NON toccare TEST_IDS — sono i Google Test IDs ufficiali per dev.
// ──────────────────────────────────────────────────────────────────

import { Platform } from 'react-native';

const TEST_IDS = {
  // Android test IDs ufficiali Google
  ADMOB_APP_ID_ANDROID:       'ca-app-pub-3940256099942544~3347511713',
  ADMOB_INTERSTITIAL_ANDROID: 'ca-app-pub-3940256099942544/1033173712',
  ADMOB_REWARDED_ANDROID:     'ca-app-pub-3940256099942544/5224354917',
  // iOS test IDs ufficiali Google
  ADMOB_APP_ID_IOS:           'ca-app-pub-3940256099942544~1458002511',
  ADMOB_INTERSTITIAL_IOS:     'ca-app-pub-3940256099942544/4411468910',
  ADMOB_REWARDED_IOS:         'ca-app-pub-3940256099942544/1712485313',
};

const PRODUCTION_IDS = {
  // ── Android (ID reali) ────────────────────────────────
  ADMOB_APP_ID_ANDROID:       'ca-app-pub-9948507480154106~3783077380',
  ADMOB_INTERSTITIAL_ANDROID: 'ca-app-pub-9948507480154106/4140403678',
  ADMOB_REWARDED_ANDROID:     'ca-app-pub-9948507480154106/1375676942',

  // ── iOS (TODO: creare su AdMob → aggiornare questi) ──
  // ⚠️  PLACEHOLDER — non usare in produzione iOS senza ID reali
  ADMOB_APP_ID_IOS:           '',   // da compilare con iOS App ID AdMob
  ADMOB_INTERSTITIAL_IOS:     '',   // da compilare con iOS Interstitial ID
  ADMOB_REWARDED_IOS:         '',   // da compilare con iOS Rewarded ID
};

/**
 * getAdIds() — UNICA funzione che risolve gli ID per piattaforma e ambiente.
 * Restituisce sempre gli ID corretti per la piattaforma corrente (Android/iOS).
 */
export const getAdIds = () => {
  const isDev = typeof __DEV__ !== 'undefined' ? __DEV__ : true;

  if (isDev) {
    const platform = Platform.OS;
    return {
      APP_ID:       platform === 'ios' ? TEST_IDS.ADMOB_APP_ID_IOS       : TEST_IDS.ADMOB_APP_ID_ANDROID,
      INTERSTITIAL: platform === 'ios' ? TEST_IDS.ADMOB_INTERSTITIAL_IOS : TEST_IDS.ADMOB_INTERSTITIAL_ANDROID,
      REWARDED:     platform === 'ios' ? TEST_IDS.ADMOB_REWARDED_IOS     : TEST_IDS.ADMOB_REWARDED_ANDROID,
    };
  }

  // Release build
  const platform = Platform.OS;

  if (platform === 'ios') {
    const hasIosIds = PRODUCTION_IDS.ADMOB_APP_ID_IOS &&
                      PRODUCTION_IDS.ADMOB_INTERSTITIAL_IOS &&
                      PRODUCTION_IDS.ADMOB_REWARDED_IOS;
    if (!hasIosIds) {
      // In release iOS senza ID: usa test IDs e logga warning (non crashare)
      console.warn('[ADS] ⚠️  iOS release senza production AdMob IDs — usando test IDs. NON accettabile in produzione App Store.');
      return {
        APP_ID:       TEST_IDS.ADMOB_APP_ID_IOS,
        INTERSTITIAL: TEST_IDS.ADMOB_INTERSTITIAL_IOS,
        REWARDED:     TEST_IDS.ADMOB_REWARDED_IOS,
      };
    }
    return {
      APP_ID:       PRODUCTION_IDS.ADMOB_APP_ID_IOS,
      INTERSTITIAL: PRODUCTION_IDS.ADMOB_INTERSTITIAL_IOS,
      REWARDED:     PRODUCTION_IDS.ADMOB_REWARDED_IOS,
    };
  }

  // Android release
  const hasAndroidIds = PRODUCTION_IDS.ADMOB_APP_ID_ANDROID &&
                        PRODUCTION_IDS.ADMOB_INTERSTITIAL_ANDROID &&
                        PRODUCTION_IDS.ADMOB_REWARDED_ANDROID;

  if (!hasAndroidIds) {
    console.error('[ADS] ❌ RELEASE BUILD Android senza production AdMob IDs! Configurare PRODUCTION_IDS.');
    throw new Error('[ADS] Missing AdMob production IDs for Android — release aborted');
  }

  return {
    APP_ID:       PRODUCTION_IDS.ADMOB_APP_ID_ANDROID,
    INTERSTITIAL: PRODUCTION_IDS.ADMOB_INTERSTITIAL_ANDROID,
    REWARDED:     PRODUCTION_IDS.ADMOB_REWARDED_ANDROID,
  };
};

export const isUsingTestIds = () => {
  try {
    const ids = getAdIds();
    return ids.APP_ID === TEST_IDS.ADMOB_APP_ID_ANDROID ||
           ids.APP_ID === TEST_IDS.ADMOB_APP_ID_IOS;
  } catch { return true; }
};

export default { TEST_IDS, PRODUCTION_IDS, getAdIds, isUsingTestIds };
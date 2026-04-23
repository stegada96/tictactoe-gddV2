// config/ads.js — Configurazione ads e strategia
// IDs AdMob → config/adsIds.js (separazione test/production)

export { getAdIds, isUsingTestIds } from './adsIds';

const ads = {
  // Frequenza interstitial
  ADS_GAMES_BEFORE_FIRST:  8,   // prime N partite lifetime senza interstitial
  ADS_GAMES_BETWEEN:       2,   // ogni N partite
  ADS_MIN_MINUTES:          5,   // minimo X min tra interstitial
  ADS_FRUSTRATION_MIN_SEC: 30,   // no interstitial dopo sconfitta frustrante < 30s

  // ⚠️  ADMOB_APP_ID va ANCHE in app.json:
  //   expo.android.config.googleMobileAdsAppId
  //   → usa il PRODUCTION ID in produzione, NON il test ID
};

export default ads;
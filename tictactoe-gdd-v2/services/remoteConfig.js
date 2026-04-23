// services/remoteConfig.js — Firebase Remote Config con fallback locale
// Se Firebase non è configurato, restituisce sempre i valori locali di config.

import CONFIG from '../config';
import integrations from '../config/integrations';
import { log } from '../utils/debug';

let _cache = null;
let _lastFetch = 0;
const FETCH_INTERVAL_MS = 12 * 60 * 60 * 1000; // 12 ore

const DEFAULTS = {
  credits_regen_minutes:    CONFIG.CREDITS_REGEN_MINUTES,
  credits_daily_bonus:      CONFIG.CREDITS_DAILY_BONUS,
  ads_games_between:        CONFIG.ADS_GAMES_BETWEEN,
  chaos_week_enabled:       false,
};

export const fetchRemoteConfig = async () => {
  if (!integrations.FIREBASE_ENABLED) return DEFAULTS;
  const now = Date.now();
  if (_cache && now - _lastFetch < FETCH_INTERVAL_MS) return _cache;
  try {
    const remoteConfig = await import('@react-native-firebase/remote-config');
    const rc = remoteConfig.default();
    await rc.setDefaults(DEFAULTS);
    await rc.fetchAndActivate();
    _cache = {
      credits_regen_minutes:  rc.getValue('credits_regen_minutes').asNumber(),
      credits_daily_bonus:    rc.getValue('credits_daily_bonus').asNumber(),
      ads_games_between:      rc.getValue('ads_games_between').asNumber(),
      chaos_week_enabled:     rc.getValue('chaos_week_enabled').asBoolean(),
    };
    _lastFetch = now;
    log('INFO', 'RemoteConfig', 'fetched');
    return _cache;
  } catch (e) {
    log('WARN', 'RemoteConfig', `fetch error: ${e.message}`);
    return _cache || DEFAULTS;
  }
};

export const getRemoteValue = (key) => (_cache || DEFAULTS)[key] ?? DEFAULTS[key];
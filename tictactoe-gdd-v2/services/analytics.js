// services/analytics.js — Analytics stub (Firebase Analytics / Amplitude)
// Tutte le chiamate sono no-op sicuri se Firebase non è configurato.

import integrations from '../config/integrations';

const noop = () => {};

export const logEvent = integrations.FIREBASE_ENABLED
  ? async (name, params = {}) => {
      try {
        const analytics = await import('@react-native-firebase/analytics');
        await analytics.default().logEvent(name, params);
      } catch (_) {}
    }
  : noop;

export const setUserId  = integrations.FIREBASE_ENABLED
  ? async (id) => {
      try {
        const analytics = await import('@react-native-firebase/analytics');
        await analytics.default().setUserId(id);
      } catch (_) {}
    }
  : noop;

export const trackScreen = (screenName) => logEvent('screen_view', { screen_name: screenName });
export const trackGameEnd = (mode, result, variant) =>
  logEvent('game_end', { mode, result, variant });
export const trackLevelUp = (newLevel) => logEvent('level_up', { level: newLevel });
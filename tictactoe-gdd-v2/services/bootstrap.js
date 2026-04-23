// services/bootstrap.js — Inizializzazione app al boot
// Chiamato una volta da App.js prima di renderizzare qualsiasi schermata.
// Centralizza: storage load, lingua, tema, compleanno, missioni reset, notifiche.

import { Appearance } from 'react-native';
import {
  loadStore, checkBirthday, resolveInitialLanguage,
  getThemePref, getDailyStreak,
} from '../utils/storage';
import { setLanguage, detectDeviceLanguage } from '../utils/i18n';
import { setTheme } from '../utils/theme';
import { checkResets } from '../utils/missions';
import { log } from '../utils/debug';
import integrations from '../config/integrations';
import {
  loadRewardState, checkComebackBonus, updateLastActive,
} from '../utils/rewardSystems';
import { initAuth } from './auth';
import { requestAdsConsent } from './ads';
import { initRemoteConfig } from './remoteConfig';

/**
 * bootstrap() — chiamato UNA SOLA VOLTA da App.js al mount.
 * Restituisce un oggetto fresco ogni chiamata (no stato globale mutabile).
 */
export const bootstrap = async () => {
  // 1. Storage — deve essere il primo step assoluto
  await loadStore();

  // 2. Reset missioni giornaliere (mezzanotte locale)
  try { await checkResets(); } catch (e) { /* intentionally ignored */ }

  // 3. Lingua
  const savedLang    = resolveInitialLanguage();
  const langCode     = savedLang || detectDeviceLanguage();
  setLanguage(langCode);

  // 4. Tema
  const savedTheme    = getThemePref();
  const themePref     = savedTheme || 'light';
  const resolvedTheme = themePref === 'auto'
    ? (Appearance.getColorScheme() === 'light' ? 'light' : 'dark')
    : themePref;
  setTheme(resolvedTheme);

  // 4a. EEA ads consent — must run before any ad call; safe no-op if SDK missing
  try { await requestAdsConsent(); } catch (e) { /* non-fatal */ }

  // 4b. Auth — inizializza sessione (guest in Fase 1)
  try { await initAuth(); } catch (e) { log('WARN', 'Bootstrap', `Auth init: ${e.message}`); }

  // 4c. Remote Config — carica config LiveOps (no-op in Fase 1)
  try { await initRemoteConfig(); } catch (e) { log('WARN', 'Bootstrap', `RemoteConfig init: ${e.message}`); }

  // 5. Compleanno
  let isBirthday = false;
  try { isBirthday = await checkBirthday(); } catch (e) { /* intentionally ignored */ }

  // 6. Reward systems init (calendar, chest, comeback)
  let comebackBonus = null;
  try {
    await loadRewardState();
    comebackBonus = await checkComebackBonus();
  } catch (e) { log('WARN', 'Bootstrap', `Reward systems init failed: ${e.message}`); }

  // 7. Firebase (solo se configurato e SDK installato)
  if (integrations.FIREBASE_ENABLED) {
    try {
      const { initFirebase } = await import('./firebase');
      await initFirebase();
    } catch (e) {
      log('WARN', 'Bootstrap', `Firebase init failed: ${e.message}`);
    }
  }

  // Restituisce sempre un oggetto fresco — no stato globale condiviso
  // Streak info — utile per HomeScreen banner
  const streakInfo = getDailyStreak();
  return { langCode, themePref, resolvedTheme, isBirthday, streakInfo, comebackBonus };
};
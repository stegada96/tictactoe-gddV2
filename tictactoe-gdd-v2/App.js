// App.js — TicTacToe GDD
// Orchestrazione UI pura. Bootstrap delegato a services/bootstrap.js.

import React, { useState, useEffect, useCallback } from 'react';
import { StatusBar, SafeAreaView, StyleSheet, Appearance } from 'react-native';

import CONFIG from './config';
import { logNav } from './utils/debug';
import { t } from './utils/i18n';
import { setTheme, theme as getTheme } from './utils/theme';
import {
  getCredits, regenCredits, claimDailyBonus,
  spendCredits, getStats, getPlayer,
  getThemePref, saveLanguage, saveTheme, savePlayer,
} from './utils/storage';
import { setLanguage, detectDeviceLanguage } from './utils/i18n';
import { bootstrap } from './services/bootstrap';
import {
  setupNotificationListener,
  scheduleDailyMissionReminder,
  requestNotificationPermissions,
  notifyBirthday,
} from './utils/notifications';

import OnboardingScreen      from './screens/OnboardingScreen';
import HomeScreen            from './screens/HomeScreen';
import VariantSelect         from './screens/VariantSelect';
import ModeSelect            from './screens/ModeSelect';
import GameScreen            from './screens/GameScreen';
import GameResultScreen      from './screens/GameResultScreen';
import LeaderboardScreen     from './screens/LeaderboardScreen';
import { StatsScreen, SettingsScreen } from './screens/StatsScreen';
import ProfileScreen         from './screens/ProfileScreen';
import SessionScoreScreen    from './screens/SessionScoreScreen';
import ShopScreen            from './screens/ShopScreen';
import OnlineScreen          from './screens/OnlineScreen';
import MissionsScreen        from './screens/MissionsScreen';
import BadgesScreen          from './screens/BadgesScreen';
import RecordsScreen         from './screens/RecordsScreen';
import QuickPlayAIScreen     from './screens/QuickPlayAIScreen';
import PlayScreen            from './screens/PlayScreen';
import ClanScreen            from './screens/ClanScreen';
import DailyChallengeScreen  from './screens/DailyChallengeScreen';
import PrivacyScreen         from './screens/PrivacyScreen';

export const AppContext = React.createContext({});

export default function App() {
  const [screen,          setScreen]    = useState('loading');
  const [screenParams,    setParams]    = useState({});
  const [credits,         setCredits]   = useState(CONFIG.CREDITS_START || 30);
  const [unlimitedActive, setUnlimited] = useState(false);
  const [totalStats,      setTotalStats]= useState(null);
  const [lang,            setLang]      = useState('en');
  const [themeKey,        setThemeKey]  = useState('light');
  const [ready,           setReady]     = useState(false);

  // ── Bootstrap: una volta sola ─────────────────────────────
  useEffect(() => {
    let interval;

    (async () => {
      // Tutta la logica di init è in bootstrap.js
      const result = await bootstrap();
      setLang(result.langCode);
      setThemeKey(result.themePref);

      if (result.isBirthday) {
        notifyBirthday().catch((e) => { /* intentionally ignored — birthday notify optional */ });
      }

      const player = await getPlayer();

      if (!player?.privacyAccepted) {
        setScreen('privacy');
        setReady(true);
        return;
      }

      const needsOnboarding = !player?.onboardingDone || !player?.name;
      setScreen(needsOnboarding ? 'onboarding' : 'home');

      await refreshCreditsInternal();

      // NOTA: il daily bonus NON viene reclamato automaticamente al boot.
      // Il claim è MANUALE tramite StreakCard in HomeScreen — design decision deliberata.
      // (claimDailyBonus in bootstrap precedente era automatico — rimosso)

      try {
        await requestNotificationPermissions();
        await scheduleDailyMissionReminder();
      } catch (_) { /* Notifiche non disponibili — non blocca il boot */ }

      setReady(true);
      interval = setInterval(refreshCreditsInternal, 60000);
    })();

    return () => { clearInterval(interval); }; // clearInterval(undefined) è no-op
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Listener tema sistema (solo se pref = 'auto') ────────
  useEffect(() => {
    const sub = Appearance.addChangeListener(({ colorScheme }) => {
      if (getThemePref() === 'auto') {
        setTheme(colorScheme === 'light' ? 'light' : 'dark');
        // Nota: setThemeKey NON cambia — raw pref rimane 'auto'
      }
    });
    return () => sub?.remove?.();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Crediti ───────────────────────────────────────────────
  const refreshCreditsInternal = async () => {
    try {
      const player    = await getPlayer();
      const unlimited = !!(player?.birthdayActive || player?.noAdsPermanent);
      setUnlimited(unlimited);
      await regenCredits();
      const c = await getCredits();
      setCredits(c);
    } catch (e) { /* intentionally ignored */ }
  };
  const refreshCredits = useCallback(refreshCreditsInternal, []); // eslint-disable-line

  const trySpendCredits = useCallback(async (amount) => {
    if (amount === 0 || unlimitedActive) return true;
    try {
      const ok = await spendCredits(amount);
      if (ok) { const c = await getCredits(); setCredits(c); }
      return ok;
    } catch (e) { return false; /* spendCredits failed gracefully */ }
  }, [unlimitedActive]);

  // ── Navigazione ───────────────────────────────────────────
  const navigate = useCallback((target, params = {}) => {
    logNav('navigate', `${screen} → ${target}`);
    setScreen(target);
    setParams(params);
  }, [screen]);

  const goBack = useCallback(() => {
    const map = {
      play:'home',
      game:'play', gameResult:'play',
      leaderboard:'home', settings:'home',
      profile:'home', sessionScore:'home', online:'home',
      shop:'home', missions:'home', badges:'profile',
      records:'profile', stats:'profile',
      clan:'home', quickPlayAI:'home',
      dailyChallenge:'home',
    };
    const dest = map[screen] || 'home';
    logNav('goBack', `${screen} → ${dest}`);
    setScreen(dest);
    setParams({});
  }, [screen]);

  // ── Notifiche (solo quando pronto) ───────────────────────
  useEffect(() => {
    if (!ready) return;
    try {
      const cleanup = setupNotificationListener(navigate);
      return cleanup;
    } catch (e) { return () => {}; /* setupNotificationListener unavailable */ }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  // ── Lingua / Tema ─────────────────────────────────────────
  const changeLanguage = useCallback(async (code) => {
    const finalCode = code || detectDeviceLanguage();
    setLanguage(finalCode);
    setLang(finalCode);
    await saveLanguage(finalCode);
  }, []);

  const changeTheme = useCallback(async (name) => {
    // name = raw pref: 'auto'|'light'|'dark'
    const resolved = name === 'auto'
      ? (Appearance.getColorScheme() === 'light' ? 'light' : 'dark')
      : name;
    setTheme(resolved);   // applica tema UI reale
    setThemeKey(name);    // context = raw pref → Settings mostra 'auto' selezionato
    await saveTheme(name);
  }, []);

  // ── Stats ─────────────────────────────────────────────────
  useEffect(() => {
    if (ready) getStats('total').then(setTotalStats).catch((e) => { setTotalStats(null); /* getStats failed gracefully */ });
  }, [screen, ready]);

  // ── Privacy ───────────────────────────────────────────────
  const onPrivacyAccepted = useCallback(async () => {
    // Persist consent so privacy gate never re-shows
    await savePlayer({ privacyAccepted: true });
    const player = await getPlayer();
    const needsOnboarding = !player?.onboardingDone || !player?.name;
    setScreen(needsOnboarding ? 'onboarding' : 'home');
  }, []);

  // ── Context ───────────────────────────────────────────────
  const ctx = {
    navigate, goBack,
    credits, refreshCredits, trySpendCredits, unlimitedActive,
    totalStats, screenParams,
    lang, changeLanguage,
    themeKey, changeTheme,
    t,
  };

  const th = getTheme();

  const renderScreen = () => {
    switch (screen) {
      case 'loading':        return null;
      case 'privacy':        return <PrivacyScreen onAccept={onPrivacyAccepted} />;
      case 'onboarding':     return <OnboardingScreen />;
      case 'home':           return <HomeScreen />;
      case 'variantSelect':  return <VariantSelect />;
      case 'modeSelect':     return <ModeSelect />;
      case 'game':           return <GameScreen />;
      case 'gameResult':     return <GameResultScreen />;
      case 'leaderboard':    return <LeaderboardScreen />;
      case 'stats':          return <StatsScreen />;
      case 'settings':       return <SettingsScreen />;
      case 'profile':        return <ProfileScreen />;
      case 'sessionScore':   return <SessionScoreScreen />;
      case 'shop':           return <ShopScreen />;
      case 'online':         return <OnlineScreen />;
      case 'missions':       return <MissionsScreen />;
      case 'badges':         return <BadgesScreen />;
      case 'records':        return <RecordsScreen />;
      case 'quickPlayAI':    return <QuickPlayAIScreen />;
      case 'play':           return <PlayScreen />;
      case 'clan':           return <ClanScreen />;
      case 'dailyChallenge': return <DailyChallengeScreen />;
      default:               return <HomeScreen />;
    }
  };

  return (
    <AppContext.Provider value={ctx}>
      <StatusBar
        barStyle={th.statusBar || 'dark-content'}
        backgroundColor={th.bg}
        translucent={false}
      />
      <SafeAreaView style={[s.root, { backgroundColor: th.bg }]}>
        {renderScreen()}
      </SafeAreaView>
    </AppContext.Provider>
  );
}

const s = StyleSheet.create({ root: { flex: 1 } });
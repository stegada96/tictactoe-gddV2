// utils/notifications.js
// expo-notifications — notifiche push locali
// ✅ Richiesta permessi
// ✅ Badge rosso clan (membro inattivo 3 giorni)
// ✅ Notifica daily mission disponibile
// ✅ Notifica crediti rigenerati

import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// Configurazione comportamento notifiche
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge:  false, // badge launcher gestito separatamente
  }),
});

// ── RICHIESTA PERMESSI ────────────────────────────────────
export const requestNotificationPermissions = async () => {
  if (Platform.OS === 'web') return false;
  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === 'granted') return true;

  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
};

// ── NOTIFICA IMMEDIATA ────────────────────────────────────
export const sendLocalNotification = async ({ title, body, data = {} }) => {
  try {
    const granted = await requestNotificationPermissions();
    if (!granted) return null;
    return await Notifications.scheduleNotificationAsync({
      content: { title, body, data, sound: true },
      trigger:  null, // immediata
    });
  } catch(e) { return null; }
};

// ── NOTIFICA SCHEDULATA ───────────────────────────────────
export const scheduleNotification = async ({ title, body, data = {}, seconds }) => {
  try {
    const granted = await requestNotificationPermissions();
    if (!granted) return null;
    return await Notifications.scheduleNotificationAsync({
      content: { title, body, data, sound: true },
      trigger: { seconds, repeats: false },
    });
  } catch(e) { return null; }
};

// ── NOTIFICA GIORNALIERA (daily mission) ─────────────────
export const scheduleDailyMissionReminder = async () => {
  try {
    // Cancella eventuali reminder precedenti
    await Notifications.cancelAllScheduledNotificationsAsync();
    // Programma notifica alle 20:00 ora locale ogni giorno
    await Notifications.scheduleNotificationAsync({
      content: {
        title: '🎯 Daily Mission!',
        body:  'Hai missioni da completare oggi. Guadagna crediti extra!',
        data:  { screen: 'missions' },
      },
      trigger: {
        hour:    20,
        minute:  0,
        repeats: true,
      },
    });
  } catch(e) {}
};

// ── NOTIFICA CLAN — MEMBRO INATTIVO ──────────────────────
export const notifyClanInactivity = async (memberName) => {
  await sendLocalNotification({
    title: '⚔️ Il tuo clan ha bisogno di te!',
    body:  `${memberName} è inattivo da 3 giorni. Aiuta il tuo clan!`,
    data:  { screen: 'clan' },
  });
};

// ── NOTIFICA CREDITI RIGENERATI ───────────────────────────
export const notifyCreditsReady = async () => {
  await sendLocalNotification({
    title: '💰 Crediti pronti!',
    body:  'I tuoi crediti sono stati rigenerati. Vai a giocare!',
    data:  { screen: 'home' },
  });
};

// ── NOTIFICA LIVELLO UP ───────────────────────────────────
export const notifyLevelUp = async (newLevel) => {
  await sendLocalNotification({
    title: '⭐ Level Up!',
    body:  `Sei arrivato al livello ${newLevel}! Nuove skin sbloccate!`,
    data:  { screen: 'profile' },
  });
};

// ── NOTIFICA MISSIONE COMPLETATA ─────────────────────────
export const notifyMissionComplete = async (missionTitle, reward) => {
  await sendLocalNotification({
    title: '🎯 Missione completata!',
    body:  `${missionTitle} — Riscatta +${reward.credits}💰`,
    data:  { screen: 'missions' },
  });
};

// ── NOTIFICA COMPLEANNO ───────────────────────────────────
export const notifyBirthday = async () => {
  await sendLocalNotification({
    title: '🎂 Buon Compleanno!',
    body:  'Oggi crediti illimitati e zero pubblicità. Buon gioco!',
    data:  { screen: 'home' },
  });
};

// ── LISTENER ─────────────────────────────────────────────
// Chiama navigate() quando l'utente tocca una notifica
export const setupNotificationListener = (navigate) => {
  const sub = Notifications.addNotificationResponseReceivedListener(response => {
    const screen = response.notification.request.content.data?.screen;
    if (screen && navigate) navigate(screen);
  });
  return () => sub.remove();
};

// ── CANCELLA TUTTE ────────────────────────────────────────
export const cancelAllNotifications = async () => {
  try { await Notifications.cancelAllScheduledNotificationsAsync(); } catch(e) {}
};
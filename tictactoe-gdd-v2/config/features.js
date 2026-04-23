// config/features.js
// Feature flags — disabilitare feature non compliance-ready o non pronte.
// REGOLA: ogni feature social/UGC/multiplayer deve essere false
// finché non implementa i requisiti obbligatori (block, report, moderazione).

const FEATURE_FLAGS = {
  // ── Multiplayer ──────────────────────────────────────
  REAL_MULTIPLAYER:     false,  // WebSocket/Firebase — Fase 2
  CHALLENGE_LINK:       false,  // Link sfida condivisibile — testare compliance prima
  PUBLIC_PROFILES:      false,  // Profili visibili ad altri — richiede block/report
  IN_APP_CHAT:          false,  // Chat tra utenti — richiede moderazione completa
  UGC_UPLOAD:           false,  // Upload contenuti utente — richiede policy UGC

  // ── Social ───────────────────────────────────────────
  LEADERBOARD_GLOBAL:   false,  // Classifica globale server — Fase 2
  FRIEND_SYSTEM:        false,  // Sistema amici — Fase 2
  CLAN_SYSTEM:          false,  // Clan — Fase 2

  // ── Monetizzazione ───────────────────────────────────
  IAP_NO_ADS:           false,  // No Ads IAP — configurare expo-iap prima
  IAP_STARTER_BUNDLE:   false,  // Starter bundle — configurare expo-iap prima
  IAP_RANKED_PASS:      false,  // Ranked Pass mensile — Fase 2

  // ── Reward Systems (pronti) ───────────────────────────
  CALENDAR_REWARDS:     true,   // Calendario reward 7 giorni — implementato
  WEEKLY_CHEST:         true,   // Chest settimanale — implementato
  COMEBACK_BONUS:       true,   // Bonus ritorno — implementato
  STREAK_SAVE_AD:       true,   // Salva streak con video — implementato

  // ── Analytics ────────────────────────────────────────
  FIREBASE_ANALYTICS:   false,  // Abilitare con Firebase
  CRASHLYTICS:          false,  // Abilitare con Firebase

  // ── EEA Consent ──────────────────────────────────────
  EEA_CONSENT_UMP:      true,   // UMP consent — OBBLIGATORIO con AdMob

  // ── Naming ───────────────────────────────────────────
  // "Online" è rinominata "Ranked" nella UX ma mode='online' internamente
  // Quando il multiplayer reale sarà pronto, aggiornare la UX label in:
  // - GameScreen.js
  // - GameResultScreen.js
  // - PlayScreen.js (MODES array)
  // - HomeScreen.js
  SHOW_RANKED_DISCLAIMER: true, // Mostra disclaimer "partita vs AI avanzata" in Ranked
};

export default FEATURE_FLAGS;

// ── Copy UX per naming Ranked ─────────────────────────────
// PROBLEMA (I): "Ranked" può sembrare vero multiplayer quando è AI.
// SOLUZIONE SCELTA: mantenere "Ranked" (appeal competitivo) ma aggiungere
// un disclaimer contestuale durante il match o al primo accesso alla modalità.
//
// COPY DISCLAIMER (da mostrare la prima volta che si accede a Ranked):
export const RANKED_DISCLAIMER = {
  it: 'Modalità Ranked: sfida un\'AI avanzata e guadagna ELO. Il vero multiplayer è in arrivo!',
  en: 'Ranked mode: challenge an advanced AI and earn ELO. Real multiplayer coming soon!',
};

// ALTERNATIVA scartata: chiamarla "Sfida AI" — perderebbe l'appeal competitivo
// ALTERNATIVA scartata: chiamarla "Classificata (Beta)" — confonde
// SOLUZIONE ADOTTATA: "Ranked" + disclaimer trasparente + preparazione infrastruttura
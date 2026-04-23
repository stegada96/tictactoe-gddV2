// config/economy.js — Economia crediti, XP, streak, anti-farming
// UNICA source-of-truth per tutti i valori economici del gioco.
// Modificare qui → tutto il progetto si aggiorna automaticamente.
//
// DESIGN RATIONALE:
// - Streak bonus giornaliero cresce da +5 a +35 per massimizzare D7 retention
// - XP_ONLINE ha moltiplicatore 1.5× per premiare il ranked rispetto all'AI
// - Anti-farming: min 10s + min 3 mosse — previene abusi senza disturbare il casual
// - CREDITS_MAX (120) è il cap della regen passiva, non del wallet (999)
// - CREDITS_VIDEO_MAX_DAY (18) = 3 video al mattino + 3 al pomeriggio + 3 sera × 2 sessioni

const economy = {
  // ── Crediti base ────────────────────────────────────────
  CREDITS_START:              50,   // ↑ da 30: bonus benvenuto più generoso → migliora D1
  CREDITS_MAX:               120,   // cap rigenerazione passiva
  CREDITS_WALLET_CAP:        999,   // tetto wallet reale (non limita reward)
  CREDITS_REGEN_MINUTES:       8,   // +1 credito ogni 8 minuti
  CREDITS_DAILY_BONUS:        12,   // base del daily bonus (streak aggiunge sopra)
  CREDITS_LEVELUP_BONUS:      50,   // bonus a ogni level up (può superare cap)
  CREDITS_VIDEO_REWARD:        5,   // reward per video rewarded standard
  CREDITS_VIDEO_MAX_DAY:      18,   // massimo video guardabili al giorno (anti-farm)
  CREDITS_FREE_ONLINE_GAMES:   5,   // prime N partite online gratis (onboarding grace)
  CREDITS_WIN:                 3,   // crediti per vittoria (AI medium/hard, online)
  CREDITS_COMEBACK_LEVEL1:    25,   // comeback dopo 2+ giorni assenza
  CREDITS_COMEBACK_LEVEL2:    50,   // comeback dopo 5+ giorni
  CREDITS_COMEBACK_LEVEL3:    80,   // comeback dopo 7+ giorni

  // ── Streak reward per giorno (1-7, poi ciclico) ─────────
  // Giorno 1: +5, Giorno 7: +35 — valore jackpot settimanale
  STREAK_REWARDS:              [5, 8, 12, 15, 20, 25, 35],
  STREAK_BASE_BONUS:           12,  // alias CREDITS_DAILY_BONUS — per chiarezza nei componenti streak

  // ── Weekly Chest milestone ───────────────────────────────
  CHEST_MILESTONES:            [5, 15, 30],          // partite per sbloccare bronze/silver/gold
  CHEST_REWARDS:               [25, 60, 150],         // crediti per ogni milestone

  // ── XP per modalità e risultato ──────────────────────────
  XP_AI_MEDIUM:               { win: 8,  draw: 3,  loss: 1 },
  XP_AI_HARD:                 { win: 18, draw: 7,  loss: 2 },
  XP_ONLINE:                  { win: 30, draw: 12, loss: 4 },  // ×1.5 vs AI Hard
  XP_DAILY_CHALLENGE:          40,   // XP per completare la daily challenge

  // ── Anti-farming ────────────────────────────────────────
  ANTI_FARM_MIN_DURATION_SEC:  10,   // partita < 10s → 0 XP/crediti
  ANTI_FARM_MIN_MOVES:          3,   // meno di 3 mosse → 0 XP/crediti

  // ── IAP pricing (placeholder — attivare con expo-iap) ───
  IAP_NO_ADS_MONTHLY_EUR:    1.99,   // No Ads mensile
  IAP_NO_ADS_ANNUAL_EUR:     9.99,   // No Ads annuale (sconto 58%)
  IAP_STARTER_BUNDLE_EUR:    0.99,   // Starter: +200cr + No Ads 7gg
  IAP_RANKED_PASS_EUR:       2.99,   // Ranked Pass: No Ads + 100cr/giorno + badge
  IAP_INGOTS_S_EUR:          0.99,   // 100 ingotti
  IAP_INGOTS_L_EUR:          4.99,   // 600 ingotti

  // ── Starter Pack contenuto ──────────────────────────────
  STARTER_PACK_CREDITS:      200,    // crediti inclusi nel bundle EUR 0.99
  STARTER_PACK_NO_ADS_DAYS:    7,    // giorni no-ads inclusi nel bundle
};

export default economy;
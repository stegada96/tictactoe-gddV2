// services/reports.js
// Sistema segnalazioni GRATUITO via Google Apps Script → Google Sheet
//
// SETUP (5 minuti, una volta sola):
// 1. Vai su https://script.google.com
// 2. Crea nuovo progetto → incolla il codice qui sotto nel commento
// 3. Deploy → Web App → Execute as: Me → Who has access: Anyone → Deploy
// 4. Copia l'URL e mettilo in REPORT_URL qui sotto
//
// ── CODICE GOOGLE APPS SCRIPT (da incollare su script.google.com) ──
// function doPost(e) {
//   const sheet = SpreadsheetApp.openById('IL_TUO_SHEET_ID').getActiveSheet();
//   const data  = JSON.parse(e.postData.contents);
//   sheet.appendRow([
//     new Date(),
//     data.reporterName || 'Anonymous',
//     data.reportedName,
//     data.reason,
//     data.details || '',
//     data.reporterLevel || 1,
//     data.platform || 'android',
//   ]);
//   return ContentService.createTextOutput('ok');
// }
// ──────────────────────────────────────────────────────────────────

// ← SOSTITUISCI con il tuo URL dopo il deploy di Apps Script
const REPORT_URL = 'https://script.google.com/macros/s/AKfycbwYXpsy-Q2lLP9s8_CuNLqRqncNb_wZAzgSRDSqptWoZ0SPz-AXnKmT8CXoGhsnbgxg/exec';

// Rate limit locale: max 5 segnalazioni al giorno per utente
import AsyncStorage from '@react-native-async-storage/async-storage';
const KEY_REPORTS = '@tttgdd_reports_today';

const canReport = async () => {
  try {
    const raw   = await AsyncStorage.getItem(KEY_REPORTS);
    const data  = raw ? JSON.parse(raw) : { date:'', count:0 };
    const today = new Date().toDateString();
    if (data.date !== today) return true;  // nuovo giorno → reset
    return data.count < 5;
  } catch { return true; }
};

const recordReport = async () => {
  try {
    const raw   = await AsyncStorage.getItem(KEY_REPORTS);
    const data  = raw ? JSON.parse(raw) : { date:'', count:0 };
    const today = new Date().toDateString();
    const count = data.date === today ? data.count + 1 : 1;
    await AsyncStorage.setItem(KEY_REPORTS, JSON.stringify({ date:today, count }));
  } catch {}
};

export const REPORT_REASONS = [
  { id:'offensive_name', labelKey:'reportOffensiveName', icon:'🤬' },
  { id:'toxic',          labelKey:'reportToxic',         icon:'😡' },
  { id:'cheating',       labelKey:'reportCheating',      icon:'🎰' },
  { id:'spam',           labelKey:'reportSpam',          icon:'🔁' },
  { id:'inappropriate',  labelKey:'reportInappropriate', icon:'🚫' },
];

export const sendReport = async ({ reporterName, reporterLevel, reportedName, reason, details }) => {
  // 1. Rate limit check
  if (!(await canReport())) {
    return { ok:false, error:'limit' };
  }

  // 2. Invia a Google Sheets
  try {
    const response = await fetch(REPORT_URL, {
      method:  'POST',
      headers: { 'Content-Type':'application/json' },
      body: JSON.stringify({
        reporterName: reporterName || 'Anonymous',
        reporterLevel,
        reportedName,
        reason,
        details: details || '',
        platform: 'android',
        appVersion: '1.0.0',
      }),
    });

    if (response.ok || response.status === 200) {
      await recordReport();
      return { ok:true };
    }
    return { ok:false, error:'server' };
  } catch (e) {
    // Se non c'è internet, salva localmente e riprova dopo
    return { ok:false, error:'network' };
  }
};
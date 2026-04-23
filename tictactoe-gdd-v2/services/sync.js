// services/sync.js — Sync offline-first con coda e retry
// Logica: salva prima in locale, poi prova a sincronizzare
// In caso di conflitto: server vince per crediti/lingotti, locale vince per resto

import { isReady, fsSet, fsBatch, fsGet, COLLECTIONS, getCurrentUser } from './firebase';
import { log, logError } from '../utils/debug';

// ── CODA OFFLINE ──────────────────────────────────────────
// Operazioni da sincronizzare quando torna la connessione
let _queue = [];
let _syncing = false;
let _retryTimer = null;

const RETRY_DELAY_MS = 5000; // 5 secondi tra retry

export const enqueue = (operation) => {
  _queue.push({
    ...operation,
    timestamp: Date.now(),
    attempts: 0,
  });
  log('INFO', 'Sync', `enqueued: ${operation.type} (queue size: ${_queue.length})`);
  scheduleFlush();
};

const scheduleFlush = () => {
  if (_retryTimer) return;
  _retryTimer = setTimeout(() => {
    _retryTimer = null;
    flushQueue();
  }, 1000);
};

// ── FLUSH QUEUE ───────────────────────────────────────────
export const flushQueue = async () => {
  if (_syncing || _queue.length === 0) return;
  if (!isReady()) {
    log('INFO', 'Sync', 'Firebase non pronto — retry in 5s');
    _retryTimer = setTimeout(flushQueue, RETRY_DELAY_MS);
    return;
  }

  const user = getCurrentUser();
  if (!user) {
    log('INFO', 'Sync', 'Nessun utente loggato — skip sync');
    return;
  }

  _syncing = true;
  log('INFO', 'Sync', `flush queue: ${_queue.length} operazioni`);

  const toProcess = [..._queue];
  _queue = [];

  // Raggruppa operazioni per ridurre scritture Firestore
  const batched = groupOperations(toProcess, user.uid);

  try {
    await fsBatch(batched);
    log('INFO', 'Sync', `✅ ${batched.length} operazioni sincronizzate`);
  } catch(e) {
    logError('Sync', 'flush fallito:', e.message);
    // Rimetti in coda con incremento tentativi
    const failed = toProcess.map(op => ({ ...op, attempts: (op.attempts||0)+1 }));
    const retryable = failed.filter(op => op.attempts < 5);
    _queue = [...retryable, ..._queue];
    if (retryable.length > 0) {
      _retryTimer = setTimeout(flushQueue, RETRY_DELAY_MS * 2);
    }
  }
  _syncing = false;
};

// Raggruppa più aggiornamenti dello stesso documento in uno solo
const groupOperations = (ops, uid) => {
  const grouped = {};
  for (const op of ops) {
    const key = `${op.collection}/${op.docId || uid}`;
    if (!grouped[key]) {
      grouped[key] = { type: op.type || 'set', collection: op.collection, docId: op.docId || uid, data: {} };
    }
    Object.assign(grouped[key].data, op.data);
  }
  return Object.values(grouped);
};

// ── FUNZIONI DI SINCRONIZZAZIONE ──────────────────────────

// Sync profilo utente (non-critico — local wins)
export const syncProfile = (profileData) => {
  enqueue({
    type: 'set',
    collection: COLLECTIONS.PROFILES,
    docId: null, // usa uid
    data: profileData,
  });
};

// Sync statistiche (local wins — latest timestamp)
export const syncStats = (variantId, mode, statsData) => {
  const user = getCurrentUser();
  if (!user) return;
  enqueue({
    type: 'set',
    collection: `${COLLECTIONS.STATS}/${user.uid}/variants`,
    docId: `${variantId}_${mode}`,
    data: statsData,
  });
};

// Sync crediti — server vince (anti-cheat)
export const syncCreditsServerFirst = async (localCredits) => {
  const user = getCurrentUser();
  if (!user || !isReady()) return localCredits;

  try {
    const serverProfile = await fsGet(COLLECTIONS.PROFILES, user.uid);
    if (!serverProfile) {
      // Prima volta: crea profilo
      await fsSet(COLLECTIONS.PROFILES, user.uid, { credits: localCredits });
      return localCredits;
    }
    // Server vince per crediti
    const serverCredits = serverProfile.credits;
    if (typeof serverCredits === 'number' && serverCredits !== localCredits) {
      log('INFO', 'Sync', `crediti: locale=${localCredits} server=${serverCredits} → usa server`);
      return serverCredits;
    }
    return localCredits;
  } catch(e) {
    logError('Sync', 'syncCredits error:', e.message);
    return localCredits;
  }
};

// Sync lingotti — server vince (anti-cheat)
export const syncIngotsServerFirst = async (localIngots) => {
  const user = getCurrentUser();
  if (!user || !isReady()) return localIngots;

  try {
    const serverProfile = await fsGet(COLLECTIONS.PROFILES, user.uid);
    if (!serverProfile) return localIngots;
    const serverIngots = serverProfile.ingots || 0;
    if (serverIngots !== localIngots) {
      log('INFO', 'Sync', `lingotti: locale=${localIngots} server=${serverIngots} → usa server`);
      return serverIngots;
    }
    return localIngots;
  } catch(e) { return localIngots; }
};

// Sync inventario (pedine sbloccate — unione locale + server)
export const syncInventory = async (localUnlocked) => {
  const user = getCurrentUser();
  if (!user || !isReady()) return localUnlocked;

  try {
    const serverInv = await fsGet(COLLECTIONS.INVENTORY, user.uid);
    if (!serverInv) {
      await fsSet(COLLECTIONS.INVENTORY, user.uid, { unlockedPieces: localUnlocked });
      return localUnlocked;
    }
    // Unione: prende tutto (chi ha più pezzi)
    const merged = [...new Set([...localUnlocked, ...(serverInv.unlockedPieces || [])])];
    if (merged.length !== localUnlocked.length) {
      enqueue({ type:'set', collection:COLLECTIONS.INVENTORY, data: { unlockedPieces: merged } });
    }
    return merged;
  } catch(e) { return localUnlocked; }
};

// Sync missioni
export const syncMissions = (missionsData) => {
  enqueue({
    type: 'set',
    collection: COLLECTIONS.MISSIONS,
    data: missionsData,
  });
};

// Sync achievement
export const syncAchievements = (unlockedIds) => {
  enqueue({
    type: 'set',
    collection: COLLECTIONS.ACHIEVEMENTS,
    data: { unlockedIds, updatedAt: new Date().toISOString() },
  });
};

// ── LEADERBOARD (server-side aggregazione) ────────────────
// Non aggiorna in tempo reale — solo dopo partita
export const updateLeaderboardEntry = (uid, name, eloOnline, wins, gamesPlayed) => {
  enqueue({
    type: 'set',
    collection: COLLECTIONS.LEADERBOARD,
    docId: uid,
    data: { uid, name, eloOnline, wins, gamesPlayed, updatedAt: new Date().toISOString() },
  });
};

// Leggi leaderboard (una volta, no listener continuo)
export const fetchLeaderboard = async (limitN = 100) => {
  if (!isReady()) return [];
  try {
    const { collection, query, orderBy, limit, getDocs } = await import('firebase/firestore');
    const q = query(
      collection(getDB(), COLLECTIONS.LEADERBOARD),
      orderBy('eloOnline', 'desc'),
      limit(limitN)
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch(e) {
    logError('Sync', 'fetchLeaderboard error:', e.message);
    return [];
  }
};

// Import dinamico per evitare errori se firebase non inizializzato
function getDB() {
  const { getDB: _getDB } = require('./firebase');
  return _getDB();
}

export const getQueueSize = () => _queue.length;
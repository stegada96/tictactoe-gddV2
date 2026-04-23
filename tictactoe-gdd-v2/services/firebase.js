// services/firebase.js — Wrapper @react-native-firebase (RN Firebase v7+)
// ⚠️  NON operativo finché FIREBASE_ENABLED = false in config/integrations.js
// ⚠️  Richiede: @react-native-firebase/app, /auth, /firestore installati
// ⚠️  Richiede: google-services.json in android/app/
// API: React Native Firebase v7+ — NON usare web modular API

import integrations from '../config/integrations';
import { log } from '../utils/debug';

let _ready = false;

export const initFirebase = async () => {
  if (!integrations.FIREBASE_ENABLED) return false;
  if (_ready) return true;
  try {
    // @react-native-firebase/app si inizializza automaticamente da google-services.json
    // Nessun initializeApp() manuale necessario con RN Firebase v7+
    const app = require('@react-native-firebase/app').default;
    _ready = app.apps.length > 0;
    log('INFO', 'Firebase', _ready ? 'initialized' : 'no app found — check google-services.json');
    return _ready;
  } catch (e) {
    log('WARN', 'Firebase', `init error: ${e.message}`);
    return false;
  }
};

// Ritorna istanza Firestore o null se non configurato
export const getFirestoreInstance = () => {
  if (!integrations.FIREBASE_ENABLED || !_ready) return null;
  try { return require('@react-native-firebase/firestore').default(); }
  catch { return null; }
};

// Ritorna istanza Auth o null
export const getAuthInstance = () => {
  if (!integrations.FIREBASE_ENABLED || !_ready) return null;
  try { return require('@react-native-firebase/auth').default(); }
  catch { return null; }
};

export const isFirebaseReady = () => _ready;
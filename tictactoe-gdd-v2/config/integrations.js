// config/integrations.js — Firebase, Google, Facebook
// ⚠️  Nessuna integrazione reale configurata. Tutti i valori sono placeholder.
// Sostituire con valori reali prima della produzione.

const integrations = {
  FIREBASE_CONFIG: {
    apiKey:            '',   // TODO: inserire API key reale
    authDomain:        '',
    projectId:         '',
    storageBucket:     '',
    messagingSenderId: '',
    appId:             '',
  },
  FIREBASE_ENABLED: false,   // passa a true quando Firebase è configurato

  GOOGLE_LOGIN_ENABLED:   false,   // richiede @react-native-google-signin
  FACEBOOK_LOGIN_ENABLED: false,   // richiede react-native-fbsdk-next

  // ⚠️  Il ripristino dati dopo reinstallazione NON è implementato.
  // Richiede: Firebase Auth attivo + Firestore sync + backup profile.
  // Attualmente: tutti i dati sono solo in AsyncStorage (locale).
};

export default integrations;
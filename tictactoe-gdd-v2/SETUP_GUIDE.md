# TicTacToe GDD — Guida Setup Completa

---

## 1. FIREBASE SETUP (passo passo)

### Crea il progetto
1. Vai su **https://console.firebase.google.com**
2. Clicca "Aggiungi progetto" → nome: **tictactoegdd**
3. Google Analytics → puoi disabilitarlo per ora
4. Clicca "Crea progetto"

### Configura Authentication
5. Menu sinistra → **Authentication** → "Inizia"
6. Tab **Sign-in method**:
   - Abilita **Anonimo** ✅ (sempre)
   - Abilita **Google** ✅ (richiede SHA-1 — vedi sotto)
   - Abilita **Facebook** ✅ (richiede Facebook App ID — vedi sotto)

### Configura Firestore
7. Menu sinistra → **Firestore Database** → "Crea database"
8. Modalità: **Produzione** (sicuro)
9. Regione: **eur3** (Europa, più vicina agli utenti italiani)
10. Dopo la creazione → **Regole** → copia e incolla:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{uid} {
      allow read: if request.auth != null;
      allow write: if request.auth.uid == uid;
    }
    match /profiles/{uid} {
      allow read, write: if request.auth.uid == uid;
    }
    match /stats/{uid}/{document=**} {
      allow read, write: if request.auth.uid == uid;
    }
    match /inventory/{uid} {
      allow read, write: if request.auth.uid == uid;
    }
    match /missions/{uid} {
      allow read, write: if request.auth.uid == uid;
    }
    match /achievements/{uid} {
      allow read, write: if request.auth.uid == uid;
    }
    match /leaderboard/{document=**} {
      allow read: if request.auth != null;
      allow write: if false;
    }
    match /matchQueues/{document=**} {
      allow read, write: if request.auth != null;
    }
    match /matches/{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

11. Clicca **Pubblica**

### Ottieni le chiavi di configurazione
12. Impostazioni progetto (icona ⚙️) → **Impostazioni progetto**
13. Scroll down → **Le tue app** → "Aggiungi app" → icona **Web (</>)**
14. Nome app: TicTacToe GDD Web
15. **Non** abilitare Firebase Hosting
16. Copia l'oggetto `firebaseConfig` che ti mostra
17. Apri `config.js` nel progetto e sostituisci **FIREBASE_CONFIG**:

```js
FIREBASE_CONFIG: {
  apiKey:            "AIza...",
  authDomain:        "tictactoegdd.firebaseapp.com",
  projectId:         "tictactoegdd",
  storageBucket:     "tictactoegdd.appspot.com",
  messagingSenderId: "123456789",
  appId:             "1:123456789:web:abc123",
},
```

### Installa Firebase nel progetto
```bash
npx expo install firebase
```

---

## 2. GOOGLE LOGIN SETUP

1. Nella console Firebase → Authentication → Google → Abilita
2. Dovrai inserire il **SHA-1 fingerprint** del tuo keystore Android

**Per ottenere SHA-1:**
```bash
eas credentials
# oppure:
cd android && ./gradlew signingReport
```

3. Installa le librerie:
```bash
npx expo install expo-auth-session expo-crypto expo-web-browser
```

4. In `services/firebase.js` → funzione `loginGoogle()` → decommentare e completare con le istruzioni che ti darà la libreria

**Nota:** Il Google Login funzionerà solo in un'app compilata (non su Snack o Expo Go). Funziona al momento del build finale.

---

## 3. ADMOB SETUP

1. Vai su **https://apps.admob.com**
2. Crea account se non ce l'hai (usa lo stesso account Google)
3. **Aggiungi app** → Android → **Non ancora pubblicata**
4. Nome app: TicTacToe GDD
5. Copia l'**App ID**: formato `ca-app-pub-XXXXX~YYYYY`
6. In `config.js` sostituisci `ADMOB_APP_ID`

**Crea le unità pubblicitarie:**
7. Menu → **Unità pubblicitarie** → "Crea unità"
   - Tipo **Interstitial** → nome "Game Over Ad" → copia ID → metti in `ADMOB_INTERSTITIAL`
   - Tipo **Rewarded** → nome "Free Credits Ad" → copia ID → metti in `ADMOB_REWARDED`

**Installa AdMob:**
```bash
# Opzione 1 (consigliata, più moderna):
npx expo install react-native-google-mobile-ads

# Poi in app.json aggiungi:
{
  "plugins": [
    ["react-native-google-mobile-ads", {
      "androidAppId": "ca-app-pub-XXXXX~YYYYY"
    }]
  ]
}
```

**Per i test usa questi ID (già in config.js):**
- App ID: `ca-app-pub-3940256099942544~3347511713`
- Interstitial: `ca-app-pub-3940256099942544/1033173712`
- Rewarded: `ca-app-pub-3940256099942544/5224354917`

⚠️ **Prima del lancio** sostituisci tutti gli ID test con quelli reali!

---

## 4. IAP (IN-APP PURCHASES) — Lingotti

**Opzione A — expo-in-app-purchases:**
```bash
npx expo install expo-in-app-purchases
```

**Opzione B — RevenueCat (consigliata, più semplice):**
```bash
npx expo install react-native-purchases
```
RevenueCat gestisce tutto (Google Play, Apple) con una sola API.

**Setup Google Play:**
1. Vai su **Google Play Console** → La tua app → **Monitization** → **In-app products**
2. Crea prodotti:
   - `ingots_10` → €0.99 → "10 lingotti d'oro"
   - `ingots_50` → €3.99 → "50 lingotti d'oro"
   - `ingots_70` → €5.99 → "70 lingotti d'oro"
   - `ingots_100` → €7.99 → "100 lingotti d'oro"
3. Crea abbonamenti:
   - `no_ads_monthly` → €0.99/mese
   - `no_ads_permanent` → €3.99 (pagamento unico)
   - `vip_monthly` → €3.99/mese

---

## 5. EAS BUILD — Costruire e Pubblicare

### Installa EAS
```bash
npm install -g eas-cli
eas login  # accedi con il tuo account Expo
```

### Configura il progetto
```bash
eas build:configure
# Risponde: Managed workflow → Android
```

Questo crea `eas.json`. Aggiungici:
```json
{
  "build": {
    "preview": {
      "android": { "buildType": "apk" }
    },
    "production": {
      "android": { "buildType": "aab" }
    }
  }
}
```

### Crea il Keystore (firma)
```bash
eas credentials
# Scegli Android → Generate new keystore
# EAS lo gestisce automaticamente (lo salva nei loro server)
```

⚠️ **Importante:** Salva una copia locale del keystore. Se lo perdi, non puoi più aggiornare l'app!

### Build APK per test
```bash
eas build --platform android --profile preview
# Genera un .apk che puoi installare direttamente sul telefono
```

### Build AAB per Play Store
```bash
eas build --platform android --profile production
# Genera .aab — questo è quello che carichi sul Play Store
```

Il build richiede 5-15 minuti. EAS ti manda un link per scaricare il file.

### Pubblica sul Play Store
1. Vai su **Google Play Console** → La tua app → **Testing** → **Internal testing**
2. Clicca "Crea nuova release"
3. Carica il file `.aab`
4. Compila le note della release
5. Salva e pubblica verso il test interno
6. Aggiungi tester (il tuo Gmail)
7. Testa l'app → se tutto ok → **Production** → "Crea release produzione"

### Prima del lancio, prepara:
- **Icona app**: 1024×1024px PNG senza angoli arrotondati
- **Feature graphic**: 1024×500px
- **Screenshot**: min 2, consigliati 6-8 (phone + tablet se vuoi)
- **Descrizione**: breve (80 char) + lunga (4000 char)
- **Privacy Policy**: pubblica su GitHub Pages o Notion
- **Categoria**: Games → Puzzle
- **Valutazione età**: PEGI 3 (completate il questionario)

---

## 6. DOVE METTERE I FILE AUDIO

Crea la cartella `assets/sounds/` nel progetto.

**Download gratuiti (CC0 — uso libero):**
- **freesound.org** → cerca con filtro "CC0"
  - win.mp3 → cerca "success jingle short CC0"
  - lose.mp3 → cerca "game over short CC0"
  - draw.mp3 → cerca "neutral notification CC0"
  - tap.mp3 → cerca "ui button tap CC0"
  - move.mp3 → cerca "piece place pop CC0"

**Dopo il download:**
1. Metti i file in `assets/sounds/`
2. Apri `utils/audioManager.js`
3. Sostituisci i `null` nelle `SOUND_URLS` con:
```js
const SOUND_URLS = {
  win:  require('../assets/sounds/win.mp3'),
  lose: require('../assets/sounds/lose.mp3'),
  draw: require('../assets/sounds/draw.mp3'),
  tap:  require('../assets/sounds/tap.mp3'),
  move: require('../assets/sounds/move.mp3'),
};
```
4. Installa expo-av:
```bash
npx expo install expo-av
```

---

## 7. DOVE METTERE LE GIF PEDINE

Crea la cartella `assets/gif/` nel progetto.

**Download gratuiti:**
- **giphy.com/stickers** → cerca "fire loop sticker" ecc.
- **lottiefiles.com** → file Lottie JSON (leggeri, vettoriali, MOLTO meglio delle GIF)

**Con Lottie (raccomandato):**
```bash
npx expo install lottie-react-native
```
Poi metti file `.json` in `assets/lottie/`

**Con GIF normali:**
```bash
npm install react-native-fast-image
```
Poi aggiorna `utils/gifPieces.js` con i `require()` dei file.

---

## RIEPILOGO COSTI STIMATI

| Servizio | Costo |
|---|---|
| Google Play Console | €25 una tantum |
| Firebase Spark (free tier) | Gratis fino a 50k auth/mese, 1GB storage, 50k read/day |
| AdMob | Gratis (guadagni dalle ads) |
| EAS Build | 30 build/mese gratis, poi ~$29/mese |
| RevenueCat | Gratis fino a $2,500 MRR |

**Per partire hai bisogno solo dei €25 di Google Play!**
Firebase e AdMob sono gratuiti per i volumi iniziali.

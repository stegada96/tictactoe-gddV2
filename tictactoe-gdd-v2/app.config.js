// app.config.js — TicTacToe GDD
// ⚠️  Usa questo file come unica fonte di config Expo (sostituisce app.json).
// Expo lo legge automaticamente se presente con questo nome.
//
// ANDROID: AdMob App ID va qui E in plugins — obbligatorio per SDK init.
// iOS: Bundle ID, Privacy strings, Apple Sign-In entitlement.
// EAS: il campo "extra" viene passato a Constants.expoConfig.extra a runtime.

const IS_PROD = process.env.APP_ENV === 'production';

module.exports = {
  expo: {
    // ── Identity ────────────────────────────────────────────
    name:        'TicTacToe GDD',
    slug:        'tictactoegdd',
    version:     '1.0.0',
    orientation: 'portrait',
    userInterfaceStyle: 'automatic',   // supporta dark mode su iOS
    scheme:      'tictactoegdd',        // deep-link / universal link scheme

    // ── App icon & splash ────────────────────────────────────
    icon:        './assets/icon.png',   // 1024×1024 PNG, no alpha
    splash: {
      image:           './assets/splash.png',
      resizeMode:      'contain',
      backgroundColor: '#0A0A18',      // dark navy — coerente con neon theme
    },

    // ── Assets ──────────────────────────────────────────────
    assetBundlePatterns: ['**/*'],

    // ── Platforms ───────────────────────────────────────────
    platforms: ['android', 'ios'],

    // ── Android ─────────────────────────────────────────────
    android: {
      package:            'com.tictactoegdd.app',
      versionCode:        1,
      compileSdkVersion:  34,
      targetSdkVersion:   34,
      minSdkVersion:      24,          // Android 7.0 — copre >99% dei device attivi

      adaptiveIcon: {
        foregroundImage: './assets/adaptive-icon.png',
        backgroundColor: '#0A0A18',
      },

      // ── AMMOB APP ID — OBBLIGATORIO QUI ─────────────────
      // Senza questo campo l'SDK AdMob crasha al lancio su Android release build.
      config: {
        googleMobileAdsAppId: 'ca-app-pub-9948507480154106~3783077380',
      },

      permissions: [
        'android.permission.INTERNET',
        'android.permission.VIBRATE',
        // READ_MEDIA_IMAGES e CAMERA aggiunti on-demand solo quando utente
        // accede alla funzione "foto profilo" — NON al lancio app.
      ],

      // ── Intentional: no googleServicesFile qui.
      // Aggiungi google-services.json solo quando Firebase è abilitato.
      // Per ora: config/integrations.js ha FIREBASE_ENABLED: false.
    },

    // ── iOS ─────────────────────────────────────────────────
    ios: {
      bundleIdentifier:     'com.tictactoegdd.app',
      buildNumber:          '1',
      supportsTablet:       false,     // layout non ottimizzato per tablet
      requireFullScreen:    true,
      deploymentTarget:     '14.0',   // iOS 14+ — 99%+ della base installata attiva

      // ── AMMOB iOS — inserire quando pubblichi su App Store
      // Aggiungere in info.plist:
      //   GADApplicationIdentifier → App ID AdMob iOS (diverso da Android!)
      // Per ora iOS non ha un App ID AdMob separato — da creare su AdMob Console.
      // Placeholder per quando sarà disponibile:
      // config: {
      //   googleMobileAdsAppId: 'ca-app-pub-XXXXXXXXXXXXXXXX~XXXXXXXXXX',
      // },

      // ── Privacy strings obbligatorie per App Store ────────
      infoPlist: {
        // Richiesta accesso fotocamera (foto profilo — facoltativo)
        NSCameraUsageDescription:
          'Usiamo la fotocamera per impostare la tua foto profilo.',
        NSPhotoLibraryUsageDescription:
          'Usiamo la libreria foto per impostare la tua foto profilo.',

        // SKAdNetwork IDs per AdMob iOS (obbligatori per App Store review con ads)
        // Lista aggiornata: https://developers.google.com/admob/ios/skadnetwork
        SKAdNetworkItems: [
          { SKAdNetworkIdentifier: 'cstr6suwn9.skadnetwork' },
          { SKAdNetworkIdentifier: '4fzdc2evr5.skadnetwork' },
          { SKAdNetworkIdentifier: '2fnua5tdw4.skadnetwork' },
          { SKAdNetworkIdentifier: 'ydx93a7ass.skadnetwork' },
          { SKAdNetworkIdentifier: '5a6flpkh64.skadnetwork' },
          { SKAdNetworkIdentifier: 'p78axxw29g.skadnetwork' },
          { SKAdNetworkIdentifier: 'v72qych5uu.skadnetwork' },
          { SKAdNetworkIdentifier: 'c6k4g5qg8m.skadnetwork' },
          { SKAdNetworkIdentifier: 's39g8k73mm.skadnetwork' },
          { SKAdNetworkIdentifier: '3qy4746246.skadnetwork' },
          { SKAdNetworkIdentifier: '3sh42y64l3.skadnetwork' },
          { SKAdNetworkIdentifier: 'f38h382jlk.skadnetwork' },
          { SKAdNetworkIdentifier: 'hs6bdukanm.skadnetwork' },
          { SKAdNetworkIdentifier: 'prcb7njmu6.skadnetwork' },
          { SKAdNetworkIdentifier: 'wzmmz9fp6w.skadnetwork' },
          { SKAdNetworkIdentifier: 'k674qkevps.skadnetwork' },
        ],

        // App Tracking Transparency — richiesta consenso tracking iOS 14+
        // Obbligatorio se usi AdMob con personalized ads su iOS.
        NSUserTrackingUsageDescription:
          'TicTacToe GDD usa dati aggregati anonimi per mostrare annunci pertinenti e migliorare l\'esperienza di gioco.',
      },

      // ── Apple Sign-In entitlement ─────────────────────────
      // Necessario per usare Apple Login (Sign in with Apple).
      // Attivare quando services/auth.js → Apple login è abilitato.
      usesAppleSignIn: true,

      // ── Associated Domains (per Universal Links / challenge links futuri)
      // associatedDomains: ['applinks:tictactoegdd.app'],
    },

    // ── Plugins ─────────────────────────────────────────────
    // ⚠️  L'ordine dei plugin è importante — expo-build-properties prima degli altri.
    plugins: [
      // ── AdMob SDK (react-native-google-mobile-ads) ────────
      // Inietta App ID in AndroidManifest e Info.plist automaticamente.
      [
        'react-native-google-mobile-ads',
        {
          // Android AdMob App ID
          androidAppId: 'ca-app-pub-9948507480154106~3783077380',
          // iOS AdMob App ID — inserire quando disponibile
          // iosAppId: 'ca-app-pub-XXXXXXXXXXXXXXXX~XXXXXXXXXX',

          // Delay app measurement per EEA consent (UMP)
          // true = non raccoglie dati prima del consenso utente
          delayAppMeasurementInit: true,
          skAdNetworkItems: [
            'cstr6suwn9.skadnetwork',
            '4fzdc2evr5.skadnetwork',
          ],
          // userTrackingUsageDescription è già in infoPlist sopra
        },
      ],

      // ── Apple Sign-In ─────────────────────────────────────
      // Aggiunge il capability "Sign in with Apple" al progetto iOS.
      'expo-apple-authentication',

      // ── Expo Build Properties ─────────────────────────────
      [
        'expo-build-properties',
        {
          android: {
            compileSdkVersion: 34,
            targetSdkVersion:  34,
            minSdkVersion:     24,
          },
          ios: {
            deploymentTarget: '14.0',
          },
        },
      ],

      // ── Expo Notifications (push — attivare quando pronto) ─
      // [
      //   'expo-notifications',
      //   {
      //     icon: './assets/notification-icon.png',
      //     color: '#4F8EF7',
      //   },
      // ],
    ],

    // ── Extra (disponibile via Constants.expoConfig.extra) ──
    // Usare per feature flags e config lato JS che non richiedono rebuild.
    extra: {
      // Ambiente
      appEnv: process.env.APP_ENV || 'development',
      isProd: IS_PROD,

      // AdMob IDs — accessibili da JS anche senza rebuild
      admobAndroidAppId: 'ca-app-pub-9948507480154106~3783077380',
      admobInterstitial: 'ca-app-pub-9948507480154106/4140403678',
      admobRewarded:     'ca-app-pub-9948507480154106/1375676942',

      // EAS Project
      eas: {
        projectId: 'e0055c8f-e700-4e4d-bce6-ea9a3517dd9d',
      },

      // Support
      supportEmail:   'peppiniello2701@gmail.com',
      privacyPolicyUrl: 'https://tictactoegdd.app/privacy',
      termsUrl:         'https://tictactoegdd.app/terms',
      deleteAccountUrl: 'https://tictactoegdd.app/delete-account',
    },

    // ── EAS Update (OTA) ────────────────────────────────────
    updates: {
      fallbackToCacheTimeout: 0,
      url: 'https://u.expo.dev/e0055c8f-e700-4e4d-bce6-ea9a3517dd9d',
    },
    runtimeVersion: {
      policy: 'appVersion',
    },
  },
};
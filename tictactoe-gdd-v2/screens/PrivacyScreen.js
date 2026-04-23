// screens/PrivacyScreen.js
// Privacy Policy + Termini di Servizio
// GDPR: consenso esplicito — se non accettato l'app si chiude
// Tradotto IT + EN (segue lingua scelta nell'onboarding)

import React, { useContext, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, Linking, BackHandler,
} from 'react-native';
import { AppContext } from '../App';
import { theme as getTheme } from '../utils/theme';
import { useLang } from '../utils/i18n';
import { savePlayer, getPlayer } from '../utils/storage';
import Constants from 'expo-constants';


// ── URL dalla config Expo (app.config.js → extra) ────────────────────
const PRIVACY_URL = Constants.expoConfig?.extra?.privacyPolicyUrl
  || 'https://tictactoegdd.app/privacy';
const TERMS_URL = Constants.expoConfig?.extra?.termsUrl
  || 'https://tictactoegdd.app/terms';
// ── TESTI PRIVACY ─────────────────────────────────────────
const PRIVACY = {
  it: {
    title:   'Privacy & Termini',
    subtitle:'Prima di iniziare, leggi e accetta la nostra Privacy Policy.',
    body: `PRIVACY POLICY — TicTacToe GDD
Ultimo aggiornamento: marzo 2025
Sviluppatore: Stefano Gadaleta

1. DATI RACCOLTI
Raccogliamo i seguenti dati per il funzionamento del gioco:
• Nome utente scelto da te
• Data di nascita (facoltativa, per bonus compleanno)
• Statistiche di gioco (vittorie, partite, livello)
• Tipo di dispositivo e sistema operativo
• Identificatore anonimo per il matchmaking

Non raccogliamo: email, numeri di telefono, posizione GPS, contatti.

2. USO DEI DATI
I tuoi dati vengono usati per:
• Far funzionare il gioco e salvare i progressi
• Mostrare classifiche e statistiche
• Erogare bonus compleanno
• Migliorare il servizio

3. CONDIVISIONE
Non vendiamo né cediamo i tuoi dati a terzi.
I dati vengono condivisi con:
• Firebase (Google) per il salvataggio cloud
• AdMob (Google) per la pubblicità — vedi sezione Pubblicità

4. PUBBLICITÀ
L'app mostra pubblicità tramite Google AdMob. AdMob può usare identificatori anonimi del dispositivo per mostrare annunci pertinenti. Puoi disattivare gli annunci personalizzati nelle impostazioni del dispositivo.

5. MINORI
L'app non raccoglie consapevolmente dati da utenti sotto i 13 anni. Se sei genitore e credi che tuo figlio abbia fornito dati, contattaci.

6. DIRITTI GDPR
Hai il diritto di:
• Accedere ai tuoi dati
• Correggere i tuoi dati
• Cancellare il tuo account e tutti i dati
• Portabilità dei dati

Per esercitare questi diritti: peppiniello2701@gmail.com

7. SICUREZZA
I dati sono protetti tramite Firebase Security Rules e HTTPS.

8. COOKIE
L'app non usa cookie. Usa AsyncStorage locale sul tuo dispositivo.

9. MODIFICHE
Ci riserviamo il diritto di modificare questa policy. Le modifiche significative saranno notificate nell'app.

10. CONTATTI
Per domande: peppiniello2701@gmail.com
Privacy Policy completa: [link Google Drive]`,
    terms: `TERMINI DI SERVIZIO

1. Accettando questi termini, dichiari di avere almeno 13 anni.
2. Non è consentito usare linguaggio offensivo, spam o cheating.
3. Ci riserviamo il diritto di sospendere account che violano le regole.
4. Il contenuto dell'app è di proprietà del developer.
5. L'app è fornita "così com'è" senza garanzie.`,
    accept: 'Accetto Privacy Policy e Termini',
    decline:'Non accetto',
    declineWarn:'Devi accettare per usare l\'app.',
    exit:   'Chiudi l\'app',
    readFull:'Leggi la versione completa',
  },
  en: {
    title:   'Privacy & Terms',
    subtitle:'Before starting, please read and accept our Privacy Policy.',
    body: `PRIVACY POLICY — TicTacToe GDD
Last updated: March 2025
Developer: Stefano Gadaleta

1. DATA COLLECTED
We collect the following data to operate the game:
• Username chosen by you
• Date of birth (optional, for birthday bonus)
• Game statistics (wins, games, level)
• Device type and operating system
• Anonymous identifier for matchmaking

We do NOT collect: email, phone numbers, GPS location, contacts.

2. USE OF DATA
Your data is used to:
• Run the game and save progress
• Show leaderboards and statistics
• Provide birthday bonuses
• Improve the service

3. SHARING
We do not sell or share your data with third parties.
Data is shared with:
• Firebase (Google) for cloud saving
• AdMob (Google) for advertising — see Advertising section

4. ADVERTISING
The app shows ads via Google AdMob. AdMob may use anonymous device identifiers to show relevant ads. You can opt out of personalized ads in your device settings.

5. CHILDREN
The app does not knowingly collect data from users under 13. If you are a parent and believe your child has provided data, contact us.

6. GDPR RIGHTS
You have the right to:
• Access your data
• Correct your data
• Delete your account and all data
• Data portability

To exercise these rights: peppiniello2701@gmail.com

7. SECURITY
Data is protected via Firebase Security Rules and HTTPS.

8. COOKIES
The app does not use cookies. It uses local AsyncStorage on your device.

9. CHANGES
We reserve the right to modify this policy. Significant changes will be notified in the app.

10. CONTACT
Questions: peppiniello2701@gmail.com
Full Privacy Policy: [Google Drive link]`,
    terms: `TERMS OF SERVICE

1. By accepting these terms, you declare you are at least 13 years old.
2. Offensive language, spam, and cheating are not allowed.
3. We reserve the right to suspend accounts that violate the rules.
4. App content is owned by the developer.
5. The app is provided "as is" without warranties.`,
    accept: 'I accept Privacy Policy and Terms',
    decline:'I decline',
    declineWarn:'You must accept to use the app.',
    exit:   'Close app',
    readFull:'Read full version',
  },
};

export default function PrivacyScreen({ onAccept }) {
  const lang    = useLang();
  const th      = getTheme();
  const texts   = PRIVACY[lang] || PRIVACY.en;

  const [declined, setDeclined] = useState(false);

  const handleAccept = async () => {
    try {
      const player = await getPlayer();
      await savePlayer({ ...(player||{}), privacyAccepted:true, privacyDate:new Date().toISOString() });
    } catch(e) {}
    if (onAccept) onAccept();
  };

  const handleDecline = () => {
    setDeclined(true);
  };

  const handleExit = () => {
    BackHandler.exitApp();
  };

  const handleReadFull = () => {
    // Link alla privacy policy su Google Drive
    Linking.openURL(PRIVACY_URL).catch(() => {});
  };

  if (declined) {
    return (
      <View style={[s.root,{backgroundColor:th.bg,justifyContent:'center',alignItems:'center',padding:30}]}>
        <Text style={{fontSize:40,marginBottom:20}}>⚠️</Text>
        <Text style={[s.warnTitle,{color:th.textPrimary}]}>{texts.declineWarn}</Text>
        <TouchableOpacity
          style={[s.exitBtn,{backgroundColor:th.danger||'#e94560',marginTop:30}]}
          onPress={handleExit}>
          <Text style={s.exitBtnTxt}>{texts.exit}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={()=>setDeclined(false)} style={{marginTop:18}}>
          <Text style={{color:th.textMuted,fontSize:14}}>← Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[s.root,{backgroundColor:th.bg}]}>
      {/* Header */}
      <View style={[s.header,{borderBottomColor:th.border}]}>
        <Text style={[s.headerTitle,{color:th.textPrimary}]}>🔒 {texts.title}</Text>
      </View>

      <ScrollView contentContainerStyle={s.content}>
        {/* Subtitle */}
        <Text style={[s.subtitle,{color:th.textSecondary}]}>{texts.subtitle}</Text>

        {/* Privacy Policy */}
        <View style={[s.textBox,{backgroundColor:th.bgCard,borderColor:th.border}]}>
          <Text style={[s.bodyText,{color:th.textPrimary}]}>{texts.body}</Text>
        </View>

        {/* Termini */}
        <View style={[s.textBox,{backgroundColor:th.bgCard,borderColor:th.border,marginTop:12}]}>
          <Text style={[s.bodyText,{color:th.textPrimary}]}>{texts.terms}</Text>
        </View>

        {/* Link versione completa */}
        <TouchableOpacity style={{alignItems:'center',marginTop:12}} onPress={handleReadFull}>
          <Text style={{color:th.accent,fontSize:13,fontWeight:'700'}}>
            📄 {texts.readFull} →
          </Text>
        </TouchableOpacity>

        <View style={{height:20}}/>
      </ScrollView>

      {/* Bottoni */}
      <View style={[s.footer,{borderTopColor:th.border,backgroundColor:th.bg}]}>
        <TouchableOpacity
          style={[s.acceptBtn,{backgroundColor:th.accent}]}
          onPress={handleAccept}>
          <Text style={s.acceptBtnTxt}>✅ {texts.accept}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[s.declineBtn,{borderColor:th.border}]}
          onPress={handleDecline}>
          <Text style={[s.declineBtnTxt,{color:th.textMuted}]}>{texts.decline}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root:          { flex:1 },
  header:        { paddingHorizontal:16, paddingVertical:14, borderBottomWidth:1, alignItems:'center' },
  headerTitle:   { fontSize:20, fontWeight:'900' },
  content:       { padding:16, paddingBottom:20 },
  subtitle:      { fontSize:14, textAlign:'center', lineHeight:20, marginBottom:14 },
  textBox:       { borderRadius:14, padding:14, borderWidth:1 },
  bodyText:      { fontSize:12, lineHeight:19 },
  footer:        { padding:16, paddingBottom:28, borderTopWidth:1, gap:10 },
  acceptBtn:     { borderRadius:14, padding:15, alignItems:'center' },
  acceptBtnTxt:  { color:'#fff', fontWeight:'900', fontSize:16 },
  declineBtn:    { borderRadius:14, padding:12, alignItems:'center', borderWidth:1 },
  declineBtnTxt: { fontWeight:'700', fontSize:14 },
  warnTitle:     { fontSize:18, fontWeight:'800', textAlign:'center', lineHeight:26 },
  exitBtn:       { borderRadius:14, padding:15, alignItems:'center', width:'100%' },
  exitBtnTxt:    { color:'#fff', fontWeight:'900', fontSize:16 },
});
// screens/StatsScreen.js + SettingsScreen — VERSIONE FINALE
// ✅ Regole varianti tradotte (usa t('rules_id') da i18n, 7 lingue)
// ✅ Account: Logout, Reimposta, Elimina FUNZIONANTI con conferma
// ✅ Google / Facebook: messaggio "prossimamente" localizzato
// ✅ Sezione "📄 Legale & Privacy" con modal completo GDPR
// ✅ Premium RIMOSSA
// ✅ sublabel su voci account (stato login, spiegazione azione)

import React, { useContext, useState, useEffect, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, Switch, Modal, Alert, Linking,
} from 'react-native';
import { AppContext } from '../App';
import CONFIG from '../config';
import { theme as getTheme } from '../utils/theme';
import { t, useLang, SUPPORTED_LANGUAGES, getCurrentLang } from '../utils/i18n';
import {
  getStats, getSettings, saveSettings, saveLanguage, saveTheme,
  resetAllData, getPlayer, savePlayer,
} from '../utils/storage';
import AppHeader from '../components/AppHeader';

const VARIANT_ORDER = ['classic','ultimate','random','classic_4x4','classic_5x5','misere','wild','order_chaos'];
const VARIANT_KEY   = {
  classic:'classic', ultimate:'ultimate', random:'random',
  classic_4x4:'board4x4', classic_5x5:'board5x5',
  misere:'misere', wild:'wild', order_chaos:'orderChaos',
};

// Recupera le regole TRADOTTE dalla i18n, con fallback inglese dal config
const getVariantRulesTranslated = (variantId) => {
  const raw = t(`rules_${variantId}`);
  if (raw && !raw.startsWith('rules_')) return raw.split('\n').filter(Boolean);
  const v = Object.values(CONFIG.GAME_VARIANTS || {}).find(x => x.id === variantId);
  return v?.rules || [];
};

// Mini grafico Win/Loss/Draw
function MiniBar({ wins, losses, draws, th }) {
  const total = (wins||0)+(losses||0)+(draws||0);
  if (!total) return null;
  const wp = ((wins||0)/total)*100;
  const lp = ((losses||0)/total)*100;
  return (
    <View style={{ marginTop:10 }}>
      <Text style={{ fontSize:11, color:th.textMuted, marginBottom:4 }}>Win / Loss / Draw distribution</Text>
      <View style={{ flexDirection:'row', height:12, borderRadius:6, overflow:'hidden' }}>
        <View style={{ width:`${wp}%`, backgroundColor:'#4caf50' }} />
        <View style={{ width:`${lp}%`, backgroundColor:'#e94560' }} />
        <View style={{ flex:1, backgroundColor:'#808098' }} />
      </View>
      <View style={{ flexDirection:'row', gap:12, marginTop:4 }}>
        <Text style={{ fontSize:10, color:'#4caf50' }}>■ Win {wins||0}</Text>
        <Text style={{ fontSize:10, color:'#e94560' }}>■ Loss {losses||0}</Text>
        <Text style={{ fontSize:10, color:'#808098' }}>■ Draw {draws||0}</Text>
      </View>
    </View>
  );
}

// ════════════════════════════════════════════════════════════
// STATS SCREEN
// ════════════════════════════════════════════════════════════
export function StatsScreen() {
  const { goBack, navigate } = useContext(AppContext);
  useLang();
  const th = getTheme();
  const [activeTab, setActiveTab] = useState('total');
  const [mode,      setMode]      = useState('all');
  const [data,      setData]      = useState({});
  const [loading,   setLoading]   = useState(true);

  const zero = () => ({ wins:0, losses:0, draws:0, gamesPlayed:0, bestStreak:0 });
  const load = useCallback(async () => {
    setLoading(true);
    try {
      if (activeTab === 'total') {
        setData(await getStats('total') || {});
      } else {
        const s = await getStats(activeTab);
        if (mode==='ai')         setData(s?.ai     || zero());
        else if (mode==='online') setData(s?.online || zero());
        else {
          const a=s?.ai||zero(), o=s?.online||zero();
          setData({
            wins:(a.wins||0)+(o.wins||0), losses:(a.losses||0)+(o.losses||0),
            draws:(a.draws||0)+(o.draws||0), gamesPlayed:(a.gamesPlayed||0)+(o.gamesPlayed||0),
            bestStreak:Math.max(a.bestStreak||0, o.bestStreak||0),
          });
        }
      }
    } catch(e) { setData({}); }
    setLoading(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, mode]); // getStats è stabile — no extra deps

  useEffect(() => { load(); }, [load]);

  const d  = data || {};
  const gp = d.gamesPlayed || 0;
  const wr = gp > 0 ? Math.round(((d.wins||0)/gp)*100) : 0;
  const tabs = [{ id:'total', label:t('total') }, ...VARIANT_ORDER.map(id=>({ id, label:t(VARIANT_KEY[id]||id) }))];

  return (
    <View style={[q.root,{backgroundColor:th.bg}]}>
      <View style={[q.header,{borderBottomColor:th.border}]}>
        <TouchableOpacity onPress={goBack} style={q.backBtn}>
          <Text style={[q.backTxt,{color:th.textPrimary}]}>←</Text>
        </TouchableOpacity>
        <Text style={[q.title,{color:th.textPrimary}]}>{t('statsTitle')}</Text>
        <TouchableOpacity onPress={()=>navigate('records')} style={{paddingHorizontal:8}}>
          <Text style={{color:th.accent,fontSize:12,fontWeight:'700'}}>Records →</Text>
        </TouchableOpacity>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={q.tabsScroll}>
        <View style={q.tabsRow}>
          {tabs.map(tab=>(
            <TouchableOpacity key={tab.id}
              style={[q.tab,{borderColor:activeTab===tab.id?th.accent:th.border,backgroundColor:activeTab===tab.id?th.accentBg:th.bgCard}]}
              onPress={()=>setActiveTab(tab.id)}>
              <Text style={[q.tabTxt,{color:activeTab===tab.id?th.accent:th.textMuted}]}>{tab.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {activeTab !== 'total' && (
        <View style={q.modeRow}>
          {[['all','All'],['ai',t('vsAITab')||'AI'],['online',t('vsOnlineTab')||'Online']].map(([m,l])=>(
            <TouchableOpacity key={m}
              style={[q.modeBtn,{borderColor:mode===m?th.accent:th.border,backgroundColor:mode===m?th.accentBg:th.bgCard}]}
              onPress={()=>setMode(m)}>
              <Text style={[q.modeTxt,{color:mode===m?th.accent:th.textMuted}]}>{l}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      <ScrollView contentContainerStyle={q.content}>
        {loading ? <Text style={[q.empty,{color:th.textMuted}]}>{t('loading')}</Text> : (
          <>
            <View style={q.grid}>
              {[
                {icon:'🎮',label:t('gamesPlayed'),value:gp},
                {icon:'🏆',label:t('winsLabel'),value:d.wins||0},
                {icon:'💔',label:t('losses'),value:d.losses||0},
                {icon:'🤝',label:t('draws'),value:d.draws||0},
                {icon:'📈',label:t('winRate'),value:`${wr}%`},
                {icon:'🔥',label:t('bestStreak'),value:d.bestStreak||0},
              ].map(it=>(
                <View key={it.label} style={[q.card,{backgroundColor:th.bgCard,borderColor:th.border}]}>
                  <Text style={q.cIcon}>{it.icon}</Text>
                  <Text style={[q.cVal,{color:th.textPrimary}]}>{it.value}</Text>
                  <Text style={[q.cLbl,{color:th.textMuted}]}>{it.label}</Text>
                </View>
              ))}
            </View>
            {gp > 0 && (
              <View style={[q.card,{backgroundColor:th.bgCard,borderColor:th.border,width:'100%'}]}>
                <MiniBar wins={d.wins||0} losses={d.losses||0} draws={d.draws||0} th={th}/>
              </View>
            )}
            {gp===0 && <Text style={[q.empty,{color:th.textMuted}]}>{t('noGamesYet')}</Text>}
          </>
        )}
      </ScrollView>
    </View>
  );
}

// ════════════════════════════════════════════════════════════
// SETTINGS SCREEN
// ════════════════════════════════════════════════════════════
export function SettingsScreen() {
  const { goBack, navigate, changeLanguage, changeTheme, themeKey } = useContext(AppContext);
  useLang();
  const th = getTheme();
  const [settings,  setSettings]  = useState(null);
  const [showLang,  setShowLang]  = useState(false);
  const [showTheme, setShowTheme] = useState(false);
  const [showRules, setShowRules] = useState(false);
  const [showLegal, setShowLegal] = useState(false);
  const [player,    setPlayer]    = useState(null);

  useEffect(() => {
    const defS = { soundFX:true, music:true, vibration:true, notifDaily:true, notifCredits:true, notifTournament:true, profilePublic:true };
    getSettings().then(s=>setSettings(s||defS));
    getPlayer().then(setPlayer).catch(()=>{});
  }, []);

  const tog = async (k) => { const u={...settings,[k]:!settings[k]}; setSettings(u); await saveSettings(u); };
  const onLang  = async (c) => { await changeLanguage(c); await saveLanguage(c); setShowLang(false); };
  const onTheme = async (n) => { await changeTheme(n); await saveTheme(n); setShowTheme(false); };

  const handleLogout = () => Alert.alert(t('logout'), t('logoutConfirm'), [
    { text:t('cancel'), style:'cancel' },
    { text:t('logout'), style:'destructive', onPress: async () => {
      try {
        const p = await getPlayer();
        await savePlayer({ ...(p||{}), onboardingDone:false, name:null, loginType:'guest' });
      } catch(e) {}
      navigate('onboarding');
    }},
  ]);

  const handleResetData = () => Alert.alert(
    t('resetData'),
    (t('resetDataConfirm')||'Reimpostare?') + '\n\n⚠️ Crediti, livello e statistiche verranno azzerati.',
    [
      { text:t('cancel'), style:'cancel' },
      { text:t('reset'), style:'destructive', onPress: async () => { await resetAllData(); navigate('onboarding'); }},
    ]
  );

  const handleDeleteAccount = () => Alert.alert(
    t('deleteAccount'),
    (t('deleteAccountConfirm')||'Eliminare definitivamente?') + '\n\n⚠️ Impossibile annullare.',
    [
      { text:t('cancel'), style:'cancel' },
      { text:t('deleteAccount'), style:'destructive', onPress: async () => { await resetAllData(); navigate('onboarding'); }},
    ]
  );

  const handleGoogle   = () => Alert.alert('🔵 Google Login',   'Disponibile in una prossima versione. Continua come Ospite — i progressi vengono salvati localmente.', [{text:t('ok')}]);
  const handleFacebook = () => Alert.alert('🔷 Facebook Login', 'Disponibile in una prossima versione. Continua come Ospite — i progressi vengono salvati localmente.', [{text:t('ok')}]);

  // Lingua corrente: legge direttamente dal modulo i18n — source of truth runtime
  const lang = getCurrentLang();
  const curLang = SUPPORTED_LANGUAGES.find(l=>l.code===lang) || SUPPORTED_LANGUAGES[0];
  const themeLbl = themeKey==='dark'?t('themeDark'):themeKey==='light'?t('themeLight'):t('themeAuto');
  const loginLabel = player?.loginType==='google'?'🔵 Google':player?.loginType==='facebook'?'🔷 Facebook':'👤 '+(t('loginGuest')||'Ospite');

  const Sec = ({title,children}) => (
    <View style={{marginBottom:18}}>
      <Text style={[q.secTitle,{color:th.accent}]}>{title}</Text>
      <View style={[q.secBox,{backgroundColor:th.bgCard,borderColor:th.border}]}>{children}</View>
    </View>
  );
  const Row = ({label,sub,right,onPress,last,danger}) => (
    <TouchableOpacity style={[q.row,{borderBottomWidth:last?0:1,borderBottomColor:th.border}]}
      onPress={onPress} disabled={!onPress} activeOpacity={onPress?0.7:1}>
      <View style={{flex:1,marginRight:8}}>
        <Text style={[q.rowLbl,{color:danger?th.danger:th.textPrimary}]}>{label}</Text>
        {sub?<Text style={{fontSize:11,color:th.textMuted,marginTop:2}}>{sub}</Text>:null}
      </View>
      {right}
    </TouchableOpacity>
  );
  const Tog = ({label,k,last}) => (
    <Row last={last} label={label} right={<Switch value={!!settings?.[k]} onValueChange={()=>tog(k)} trackColor={{false:th.border,true:th.accent}} thumbColor="#fff"/>}/>
  );
  const Chev = ({danger}) => <Text style={[q.chev,{color:danger?th.danger:th.textMuted}]}>›</Text>;

  if (!settings) return (
    <View style={[q.root,{backgroundColor:th.bg,justifyContent:'center',alignItems:'center'}]}>
      <Text style={{color:th.textPrimary}}>{t('loading')}</Text>
    </View>
  );

  return (
    <View style={[q.root,{backgroundColor:th.bg}]}>

      {/* MODAL LINGUA */}
      <Modal visible={showLang} transparent animationType="fade">
        <View style={q.ov}>
          <View style={[q.mbox,{backgroundColor:th.bgCard,borderColor:th.border}]}>
            <Text style={[q.mtitle,{color:th.textPrimary}]}>🌍 {t('language')}</Text>
            <ScrollView style={{maxHeight:380}}>
              {SUPPORTED_LANGUAGES.map(l=>(
                <TouchableOpacity key={l.code}
                  style={[q.lbtn,{borderColor:l.code===lang?th.accent:th.border,backgroundColor:l.code===lang?th.accentBg:th.bgCardAlt||th.bg}]}
                  onPress={()=>onLang(l.code)}>
                  <Text style={{fontSize:24}}>{l.flag}</Text>
                  <View style={{flex:1,marginLeft:12}}>
                    <Text style={[q.lnat,{color:th.textPrimary}]}>{l.native}</Text>
                    <Text style={[q.len,{color:th.textMuted}]}>{l.label}</Text>
                  </View>
                  {l.code===lang&&<Text style={{color:th.accent,fontSize:20}}>✓</Text>}
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity onPress={()=>setShowLang(false)} style={{marginTop:10,alignItems:'center'}}>
              <Text style={{color:th.danger,fontSize:14}}>{t('cancel')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* MODAL TEMA */}
      <Modal visible={showTheme} transparent animationType="fade">
        <View style={q.ov}>
          <View style={[q.mbox,{backgroundColor:th.bgCard,borderColor:th.border}]}>
            <Text style={[q.mtitle,{color:th.textPrimary}]}>🎨 {t('theme')}</Text>
            {[['auto',t('themeAuto'),'📱'],['dark',t('themeDark'),'🌙'],['light',t('themeLight'),'☀️']].map(([k,l,ic])=>(
              <TouchableOpacity key={k}
                style={[q.tbtn,{borderColor:themeKey===k?th.accent:th.border,backgroundColor:themeKey===k?th.accentBg:th.bgCardAlt||th.bg}]}
                onPress={()=>onTheme(k)}>
                <Text style={{fontSize:22}}>{ic}</Text>
                <Text style={[q.tlbl,{flex:1,marginLeft:12,color:th.textPrimary}]}>{l}</Text>
                {themeKey===k&&<Text style={{color:th.accent,fontSize:20}}>✓</Text>}
              </TouchableOpacity>
            ))}
            <TouchableOpacity onPress={()=>setShowTheme(false)} style={{marginTop:10,alignItems:'center'}}>
              <Text style={{color:th.danger,fontSize:14}}>{t('cancel')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* MODAL REGOLE VARIANTI — TRADOTTE */}
      <Modal visible={showRules} transparent animationType="slide">
        <View style={q.ov}>
          <View style={[q.mbox,{backgroundColor:th.bgCard,borderColor:th.border,maxHeight:'88%'}]}>
            <Text style={[q.mtitle,{color:th.textPrimary}]}>📋 {t('variantRules')}</Text>
            <ScrollView showsVerticalScrollIndicator={false}>
              {VARIANT_ORDER.map(id=>{
                const v = Object.values(CONFIG.GAME_VARIANTS||{}).find(x=>x.id===id);
                if (!v) return null;
                const rules = getVariantRulesTranslated(id);
                return (
                  <View key={id} style={[q.rv,{borderBottomColor:th.border}]}>
                    <Text style={[q.rvn,{color:th.accent}]}>{v.name}</Text>
                    {rules.map((r,i)=><Text key={i} style={[q.rvr,{color:th.textSecondary}]}>• {r}</Text>)}
                  </View>
                );
              })}
            </ScrollView>
            <TouchableOpacity onPress={()=>setShowRules(false)} style={{marginTop:12,alignItems:'center'}}>
              <Text style={{color:th.danger,fontSize:14}}>{t('close')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* MODAL LEGALE & PRIVACY */}
      <Modal visible={showLegal} transparent animationType="slide">
        <View style={q.ov}>
          <View style={[q.mbox,{backgroundColor:th.bgCard,borderColor:th.border,maxHeight:'92%'}]}>
            <Text style={[q.mtitle,{color:th.textPrimary}]}>📄 Legale & Privacy</Text>
            <ScrollView showsVerticalScrollIndicator={false}>

              <View style={[q.legalItem,{borderColor:th.border}]}>
                <Text style={[q.legalTitle,{color:th.textPrimary}]}>🔒 Privacy Policy</Text>
                <Text style={[q.legalDesc,{color:th.textMuted}]}>
                  Informativa sul trattamento dei dati personali ai sensi del Regolamento UE 2016/679 (GDPR).
                </Text>
                <TouchableOpacity style={[q.legalBtn,{borderColor:th.accent}]}
                  onPress={()=>Linking.openURL('https://docs.google.com/document/d/1vRY-5YzV6U-DKeT6CECpMktegmr-XBf7/edit?usp=sharing&ouid=108698080349676572861&rtpof=true&sd=true').catch(()=>Alert.alert('Link','Sostituire con il link Google Drive della Privacy Policy.'))}>
                  <Text style={{color:th.accent,fontWeight:'700'}}>Leggi la Privacy Policy →</Text>
                </TouchableOpacity>
              </View>

              <View style={[q.legalItem,{borderColor:th.border}]}>
                <Text style={[q.legalTitle,{color:th.textPrimary}]}>📜 Termini di Servizio</Text>
                <Text style={[q.legalDesc,{color:th.textMuted}]}>Condizioni d'uso dell'applicazione TicTacToe GDD.</Text>
                <TouchableOpacity style={[q.legalBtn,{borderColor:th.accent}]}
                  onPress={()=>Linking.openURL('https://docs.google.com/document/d/19bWiPA9pIOBO_qQ7jxxyp8FgZUKRDR94/edit?usp=sharing&ouid=108698080349676572861&rtpof=true&sd=true').catch(()=>Alert.alert('Link','Sostituire con il link Google Drive dei Termini di Servizio.'))}>
                  <Text style={{color:th.accent,fontWeight:'700'}}>Leggi i Termini →</Text>
                </TouchableOpacity>
              </View>

              <View style={[q.legalItem,{borderColor:th.border}]}>
                <Text style={[q.legalTitle,{color:th.textPrimary}]}>🇪🇺 I tuoi diritti GDPR</Text>
                <Text style={[q.legalDesc,{color:th.textMuted}]}>
                  {'• Accesso ai tuoi dati personali\n• Rettifica di dati inesatti\n• Cancellazione ("diritto all\'oblio")\n• Portabilità dei dati\n• Opposizione al trattamento\n\nPer esercitare i tuoi diritti:\n📧 Contatta lo sviluppatore'}
                </Text>
                <TouchableOpacity style={[q.legalBtn,{borderColor:th.accent}]}
                  onPress={()=>Linking.openURL('mailto:peppiniello2701@gmail.com')}>
                  <Text style={{color:th.accent,fontWeight:'700'}}>Contattaci →</Text>
                </TouchableOpacity>
              </View>

              <View style={[q.legalItem,{borderColor:th.border}]}>
                <Text style={[q.legalTitle,{color:th.textPrimary}]}>📺 Pubblicità (AdMob)</Text>
                <Text style={[q.legalDesc,{color:th.textMuted}]}>
                  L'app utilizza Google AdMob. AdMob può usare identificatori anonimi del dispositivo per annunci pertinenti. Puoi gestire le preferenze nelle impostazioni del dispositivo Android → Google → Annunci.
                </Text>
              </View>

              <View style={[q.legalItem,{borderColor:th.border}]}>
                <Text style={[q.legalTitle,{color:th.textPrimary}]}>👶 Protezione Minori</Text>
                <Text style={[q.legalDesc,{color:th.textMuted}]}>
                  L'app è destinata a utenti con almeno 13 anni. Non raccogliamo consapevolmente dati da minori al di sotto di questa età. Se sei un genitore e ritieni che tuo figlio abbia fornito dati, contattaci.
                </Text>
              </View>

              <View style={[q.legalItem,{borderColor:'transparent'}]}>
                <Text style={[q.legalTitle,{color:th.textPrimary}]}>📧 Contatti</Text>
                <TouchableOpacity onPress={()=>Linking.openURL('mailto:peppiniello2701@gmail.com')}>
                  <Text style={{color:th.accent,fontSize:14,fontWeight:'600'}}>📧 Scrivici una mail →</Text>
                </TouchableOpacity>
                <Text style={[q.legalDesc,{color:th.textMuted,marginTop:8}]}>
                  {CONFIG.APP_NAME} v{CONFIG.APP_VERSION} — Sviluppatore: Stefano Gadaleta
                </Text>
              </View>

            </ScrollView>
            <TouchableOpacity onPress={()=>setShowLegal(false)} style={{marginTop:12,alignItems:'center'}}>
              <Text style={{color:th.danger,fontSize:14}}>{t('close')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* HEADER */}
      <AppHeader title={t('settings')||'Impostazioni'} />

      <ScrollView contentContainerStyle={q.content}>

        <Sec title={`🌍 ${t('language')}`}>
          <Row label={t('language')} last right={
            <TouchableOpacity onPress={()=>setShowLang(true)} style={[q.vbtn,{borderColor:th.border}]}>
              <Text style={{fontSize:18}}>{curLang.flag}</Text>
              <Text style={[q.vtxt,{color:th.textPrimary,marginLeft:6}]}>{curLang.native}</Text>
              <Text style={[q.chev,{color:th.textMuted}]}>›</Text>
            </TouchableOpacity>
          }/>
        </Sec>

        <Sec title={`🎨 ${t('theme')}`}>
          <Row label={t('theme')} last right={
            <TouchableOpacity onPress={()=>setShowTheme(true)} style={[q.vbtn,{borderColor:th.border}]}>
              <Text style={[q.vtxt,{color:th.textPrimary}]}>{themeLbl}</Text>
              <Text style={[q.chev,{color:th.textMuted}]}>›</Text>
            </TouchableOpacity>
          }/>
        </Sec>

        <Sec title="🔊 Audio">
          <Tog label={t('soundFX')} k="soundFX"/>
          <Tog label={t('music')}   k="music" last/>
        </Sec>

        <Sec title={`📳 ${t('vibration')}`}>
          <Tog label={t('vibration')} k="vibration" last/>
        </Sec>

        <Sec title={`🔔 ${t('notifications')}`}>
          <Tog label={t('notifDaily')}      k="notifDaily"/>
          <Tog label={t('notifCredits')}    k="notifCredits"/>
          <Tog label={t('notifTournament')} k="notifTournament" last/>
        </Sec>

        <Sec title="ℹ️ Info">
          <Row label={t('variantRules')} right={<Chev/>} onPress={()=>setShowRules(true)}/>
          <Row label={t('support')||'Assistenza'} sub="Tocca per inviarci un messaggio" right={<Chev/>}
            onPress={()=>Linking.openURL('mailto:peppiniello2701@gmail.com')} last/>
        </Sec>

        <Sec title={`👤 ${t('account')}`}>
          <Row label={t('loginGoogle')||'Accedi con Google'}
            sub="Prossimamente" right={<Chev/>} onPress={handleGoogle}/>
          <Row label={t('loginFacebook')||'Accedi con Facebook'}
            sub="Prossimamente" right={<Chev/>} onPress={handleFacebook}/>
          <Row label={t('logout')||'Esci'}
            sub={loginLabel} right={<Chev danger/>} onPress={handleLogout} danger/>
          <Row label={t('resetData')||'Reimposta Dati'}
            sub="Azzera crediti, livello e statistiche" right={<Chev danger/>}
            onPress={handleResetData} danger/>
          <Row label={t('deleteAccount')||'Elimina Account'}
            sub="Elimina tutti i dati definitivamente" right={<Chev danger/>}
            onPress={handleDeleteAccount} danger last/>
        </Sec>

        {/* LEGALE — singola voce che apre il modal completo */}
        <Sec title="📄 Legale & Privacy">
          <Row
            label="Privacy Policy, Termini & GDPR"
            sub="Informativa, diritti, pubblicità e contatti"
            right={<Chev/>}
            onPress={()=>setShowLegal(true)}
            last/>
        </Sec>

        <Text style={[q.ver,{color:th.textMuted}]}>
          {CONFIG.APP_NAME} v{CONFIG.APP_VERSION}{CONFIG.DEBUG?'\n⚠️ DEBUG':''}
        </Text>
      </ScrollView>
    </View>
  );
}

export default StatsScreen;

const q = StyleSheet.create({
  root:      {flex:1},
  header:    {flexDirection:'row',alignItems:'center',paddingHorizontal:16,paddingVertical:14,borderBottomWidth:1},
  backBtn:   {width:40,height:40,justifyContent:'center'},
  backTxt:   {fontSize:24},
  title:     {flex:1,textAlign:'center',fontSize:20,fontWeight:'800'},
  tabsScroll:{maxHeight:50},
  tabsRow:   {flexDirection:'row',paddingHorizontal:12,gap:8,paddingVertical:8},
  tab:       {paddingHorizontal:14,paddingVertical:7,borderRadius:20,borderWidth:1},
  tabTxt:    {fontSize:13,fontWeight:'600'},
  modeRow:   {flexDirection:'row',paddingHorizontal:16,gap:8,paddingVertical:8},
  modeBtn:   {flex:1,borderRadius:10,padding:8,alignItems:'center',borderWidth:1},
  modeTxt:   {fontSize:12,fontWeight:'600'},
  content:   {padding:20,paddingBottom:60},
  empty:     {textAlign:'center',marginTop:40,fontSize:16},
  grid:      {flexDirection:'row',flexWrap:'wrap',gap:10,marginBottom:10},
  card:      {width:'30%',flexGrow:1,borderRadius:12,padding:12,alignItems:'center',borderWidth:1},
  cIcon:     {fontSize:20,marginBottom:6},
  cVal:      {fontSize:20,fontWeight:'900',marginBottom:2},
  cLbl:      {fontSize:11,textAlign:'center'},
  secTitle:  {fontSize:13,fontWeight:'700',marginBottom:6,paddingHorizontal:4},
  secBox:    {borderRadius:14,borderWidth:1,overflow:'hidden'},
  row:       {flexDirection:'row',alignItems:'center',justifyContent:'space-between',paddingHorizontal:16,paddingVertical:13},
  rowLbl:    {fontSize:16},
  vbtn:      {flexDirection:'row',alignItems:'center',borderRadius:8,paddingHorizontal:10,paddingVertical:6,borderWidth:1},
  vtxt:      {fontSize:14,fontWeight:'600'},
  chev:      {fontSize:20},
  ov:        {flex:1,backgroundColor:'rgba(0,0,0,0.78)',justifyContent:'center',alignItems:'center',padding:20},
  mbox:      {width:'100%',borderRadius:20,padding:24,borderWidth:1},
  mtitle:    {fontSize:20,fontWeight:'900',marginBottom:16},
  lbtn:      {flexDirection:'row',alignItems:'center',borderRadius:12,padding:14,marginBottom:10,borderWidth:1},
  lnat:      {fontSize:16,fontWeight:'700'},
  len:       {fontSize:12},
  tbtn:      {flexDirection:'row',alignItems:'center',borderRadius:12,padding:14,marginBottom:10,borderWidth:1},
  tlbl:      {fontSize:16,fontWeight:'600'},
  rv:        {borderBottomWidth:1,paddingVertical:12},
  rvn:       {fontSize:16,fontWeight:'800',marginBottom:6},
  rvr:       {fontSize:14,marginBottom:3,lineHeight:20},
  ver:       {textAlign:'center',fontSize:12,marginTop:20},
  legalItem: {borderBottomWidth:1,paddingVertical:16},
  legalTitle:{fontSize:15,fontWeight:'800',marginBottom:6},
  legalDesc: {fontSize:13,lineHeight:19,marginBottom:8},
  legalBtn:  {borderRadius:10,paddingHorizontal:14,paddingVertical:8,borderWidth:1,alignSelf:'flex-start'},
});
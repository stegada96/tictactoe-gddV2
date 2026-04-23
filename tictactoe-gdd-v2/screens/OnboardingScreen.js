// screens/OnboardingScreen.js

import React, { useContext, useState, useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  TextInput, ScrollView, Animated, useWindowDimensions,
} from 'react-native';
import { AppContext } from '../App';
import CONFIG from '../config';
import { theme as getTheme } from '../utils/theme';
import { t, useLang, SUPPORTED_LANGUAGES } from '../utils/i18n';
import { savePlayer, getPlayer, addCredits } from '../utils/storage';
import { log } from '../utils/debug';

const STEPS = { SPLASH:0, LANG:1, THEME:2, ACCOUNT:2.5, NAME:3, BIRTH:3.5, AVATAR:4, TUTORIAL:5 };
const BANNED = [
  'fuck','shit','bitch','bastard','cunt','dick','cock','pussy','ass','nigger','nigga','faggot',
  'cazzo','vaffanculo','stronzo','minchia','fanculo','merda','puttana','coglione','porco',
  'porcod','porcoD','porcoDio','porcio','porco dio','vaffan',
  'puta','mierda','pendejo','cabron','joder','coño',
  'scheiße','arschloch','hurensohn','wichser',
  'merde','putain','salope','connard',
  'porra','caralho','buceta','filho da puta',
  'suka','blyad','pizda',
];

const normalizeLeet = (s) => s.toLowerCase()
  .replace(/4/g,'a').replace(/3/g,'e').replace(/1/g,'i').replace(/0/g,'o')
  .replace(/5/g,'s').replace(/7/g,'t').replace(/ph/g,'f').replace(/@/g,'a')
  .replace(/\$/g,'s').replace(/!/g,'i').replace(/\|/g,'i').replace(/8/g,'b')
  .replace(/[\s\-\.]/g,'');

const hasBad = (s) => {
  const norm = normalizeLeet(s);
  return BANNED.some(w => norm.includes(normalizeLeet(w)));
};

// ── Helper data nascita ────────────────────────────────────
// Inserisce automaticamente gli slash mentre l'utente digita.
// Input: stringa raw (solo cifre + slash già presenti).
// Output: stringa formattata "dd/mm/yyyy" (max 10 caratteri).
export const formatBirthDateInput = (raw) => {
  const digits = raw.replace(/\D/g,'').slice(0,8);
  let out = '';
  if (digits.length >= 1) out += digits.slice(0,2);
  if (digits.length >= 3) out += '/' + digits.slice(2,4);
  if (digits.length >= 5) out += '/' + digits.slice(4,8);
  return out;
};

// Converte "dd/mm/yyyy" → "yyyy-mm-dd" (ISO) per lo storage.
// Ritorna null se il formato non è valido.
export const displayToIsoBirthDate = (display) => {
  const parts = display.split('/');
  if (parts.length !== 3) return null;
  const [dd, mm, yyyy] = parts;
  if (dd.length!==2||mm.length!==2||yyyy.length!==4) return null;
  const d=parseInt(dd,10), m=parseInt(mm,10), y=parseInt(yyyy,10);
  if (isNaN(d)||isNaN(m)||isNaN(y)) return null;
  if (m<1||m>12||d<1||d>31) return null;
  // Blocca anni futuri E l'anno corrente: non ha senso come anno di nascita valido per un'app gaming
  if (y<1900||y>=new Date().getFullYear()) return null;
  // Blocca date che renderebbero l'utente sotto i 5 anni (improbabile e rischio compliance minori)
  const minYear = new Date().getFullYear() - 5;
  if (y > minYear) return null;
  // Verifica che la data esista davvero
  const date = new Date(y,m-1,d);
  if (date.getFullYear()!==y||date.getMonth()!==m-1||date.getDate()!==d) return null;
  return `${yyyy}-${mm.padStart(2,'0')}-${dd.padStart(2,'0')}`;
};

// Converte "yyyy-mm-dd" → "dd/mm/yyyy" per prefill del campo.
export const isoToDisplayBirthDate = (iso) => {
  if (!iso||iso.length<10) return '';
  const [yyyy,mm,dd] = iso.split('-');
  if (!yyyy||!mm||!dd) return '';
  return `${dd}/${mm}/${yyyy}`;
};

function useLangGrid() {
  const { width } = useWindowDimensions();
  const CARD_PADDING=48, GAP=10;
  const cols    = width<=380?2:3;
  const cellW   = Math.floor((width-CARD_PADDING*2-GAP*(cols-1))/cols);
  const flagSize= Math.min(54,Math.floor(cellW*0.55));
  const nameSize= Math.min(15,Math.max(12,Math.floor(cellW*0.13)));
  return { cols, cellW, flagSize, nameSize, gap:GAP };
}

export default function OnboardingScreen() {
  const { navigate, changeLanguage, changeTheme, themeKey, refreshCredits } = useContext(AppContext);
  const lang = useLang(); // cattura per isSel nel picker lingua
  const th   = getTheme();
  const grid = useLangGrid();

  const [step,        setStep]        = useState(STEPS.SPLASH);
  const [username,    setUsername]    = useState('');
  const [nameErr,     setNameErr]     = useState('');
  const [avatarId,    setAvatarId]    = useState('n1');
  const [gender,      setGender]      = useState('other');
  const [tutSlide,    setTutSlide]    = useState(0);
  const [loginType,   setLoginType]   = useState(null);
  // birthDisplay: quello che vede l'utente → "dd/mm/yyyy"
  const [birthDisplay,setBirthDisplay]= useState('');
  const [birthErr,    setBirthErr]    = useState('');
  const [confirming,  setConfirming]  = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const advTimer = useRef(null);

  // Splash
  useEffect(()=>{
    if (step!==STEPS.SPLASH) return;
    Animated.timing(fadeAnim,{toValue:1,duration:900,useNativeDriver:true}).start();
    const tm=setTimeout(()=>setStep(STEPS.LANG),2400);
    return ()=>clearTimeout(tm);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[step]);

  // Prefill data nascita se già salvata
  useEffect(()=>{
    if (step!==STEPS.BIRTH) return;
    let active = true;  // guard: non fare setState se già smontato
    getPlayer().then(p=>{
      if (active && p?.birthDate) setBirthDisplay(isoToDisplayBirthDate(p.birthDate));
    }).catch(()=>{});
    return () => { active = false; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[step]);

  useEffect(()=>()=>{ if(advTimer.current) clearTimeout(advTimer.current); },[]);

  const genGuest = () => `Player_${Math.floor(Math.random()*90000+10000)}`;

  const validate = (n) => {
    const s=n.trim();
    if (s.length<3||s.length>20) return t('onbUsernameError');
    if (!/^[a-zA-Z0-9_\-.]+$/.test(s)) return t('onbUsernameError');
    if (hasBad(s)) return t('onbUsernameError');
    return null;
  };

  const onConfirmName = () => {
    const name=username.trim()||genGuest();
    const err=validate(name);
    if (err) { setNameErr(err); return; }
    setNameErr('');
    setUsername(name);
    setStep(STEPS.BIRTH);
  };

  const onSelectLanguage = async (code) => {
    await changeLanguage(code); // persiste già in App.js via saveLanguage
    setConfirming(true);
    if (advTimer.current) clearTimeout(advTimer.current);
    advTimer.current=setTimeout(()=>{ setConfirming(false); setStep(STEPS.THEME); },500);
  };

  const onBirthChange = (raw) => {
    const formatted = formatBirthDateInput(raw);
    setBirthDisplay(formatted);
    setBirthErr('');
  };

  const onConfirmBirth = () => {
    if (!birthDisplay || birthDisplay.length===0) {
      // Facoltativo: salta
      setStep(STEPS.AVATAR);
      return;
    }
    const iso = displayToIsoBirthDate(birthDisplay);
    if (!iso) {
      setBirthErr('Data non valida. Usa il formato gg/mm/aaaa');
      return;
    }
    setBirthErr('');
    setStep(STEPS.AVATAR);
  };

  const onFinish = async () => {
    const finalName=username.trim()||genGuest();
    // Converti display → ISO al momento del salvataggio finale
    const birthIso = birthDisplay ? displayToIsoBirthDate(birthDisplay)||null : null;
    try {
      const player=await getPlayer();
      await savePlayer({
        ...(player||{}),
        name:           finalName,
        avatarId,
        gender,
        onboardingDone: true,
        loginType:      loginType||'guest',
        birthDate:      birthIso,
        unlockedPieces: [...((player||{}).unlockedPieces||[]),'x_def','o_def','fire'],
      });
      await addCredits(200);
      await refreshCredits();
    } catch(e){ log('INFO','Onboarding',e.message); }
    navigate('home');
  };

  const baseAvatars=(CONFIG.AVATARS||[]).filter(a=>a.unlockLevel<=1);
  const tutSlides=[
    {icon:'🎮',titleKey:'onbTutTitle1',descKey:'onbTutDesc1'},
    {icon:'💰',titleKey:'onbTutTitle2',descKey:'onbTutDesc2'},
    {icon:'🏆',titleKey:'onbTutTitle3',descKey:'onbTutDesc3'},
    {icon:'🎁',titleKey:'onbTutTitle4',descKey:'onbTutDesc4'},
  ];
  const slide=tutSlides[tutSlide]||tutSlides[0];

  // Mostra preview compleanno solo se la data è valida
  const birthValid = birthDisplay.length===10 && !!displayToIsoBirthDate(birthDisplay);

  // ── SPLASH
  if (step===STEPS.SPLASH) return (
    <View style={[s.splash,{backgroundColor:'#0a0a15'}]}>
      <Animated.View style={{opacity:fadeAnim,alignItems:'center'}}>
        <Text style={s.splashIcon}>🎮</Text>
        <Text style={s.splashTitle}>TicTacToe</Text>
        <Text style={s.splashSub}>GDD</Text>
        <Text style={[s.splashTag,{color:'#4080ff88'}]}>Ultimate Collection</Text>
      </Animated.View>
    </View>
  );

  return (
    <ScrollView
      style={{flex:1,backgroundColor:th.bg}}
      contentContainerStyle={s.content}
      keyboardShouldPersistTaps="handled">

      <View style={s.dots}>
        {[1,2,3,4,5].map(i=>(
          <View key={i} style={[s.dot,{backgroundColor:step>=i?th.accent:th.border}]}/>
        ))}
      </View>

      {/* ── LINGUA */}
      {step===STEPS.LANG&&(
        <View style={[s.card,{backgroundColor:th.bgCard,borderColor:th.border}]}>
          <Text style={s.cardEmoji}>🌍</Text>
          <Text style={[s.cardTitle,{color:th.textPrimary}]}>{t('onbChooseLang')}</Text>
          <Text style={[s.cardSub,{color:th.textMuted}]}>{t('onbChooseLangDesc')}</Text>
          {confirming&&(
            <Animated.View style={[s.confirmBadge,{backgroundColor:th.accentBg,borderColor:th.accent}]}>
              <Text style={[s.confirmTxt,{color:th.accent}]}>✓ {t('next')}…</Text>
            </Animated.View>
          )}
          <View style={[s.langGrid,{gap:grid.gap}]}>
            {SUPPORTED_LANGUAGES.map(l=>{
              const isSel=lang===l.code;
              return (
                <TouchableOpacity key={l.code}
                  style={[s.langCell,{width:grid.cellW,borderColor:isSel?th.accent:th.border,borderWidth:isSel?2.5:1,backgroundColor:isSel?th.accentBg:th.bgCardAlt||th.bg}]}
                  onPress={()=>onSelectLanguage(l.code)} activeOpacity={0.7}>
                  <Text style={[s.langFlag,{fontSize:grid.flagSize}]}>{l.flag}</Text>
                  <Text style={[s.langNative,{color:isSel?th.accent:th.textPrimary,fontSize:grid.nameSize}]} numberOfLines={1} adjustsFontSizeToFit>{l.native}</Text>
                  <Text style={[s.langEnLabel,{color:th.textMuted,fontSize:Math.max(9,grid.nameSize-3)}]} numberOfLines={1}>{l.label}</Text>
                  {isSel&&<View style={[s.langCheck,{backgroundColor:th.accent}]}><Text style={s.langCheckTxt}>✓</Text></View>}
                </TouchableOpacity>
              );
            })}
          </View>
          <TouchableOpacity style={[s.btn,{backgroundColor:th.accent,marginTop:4}]} onPress={()=>setStep(STEPS.THEME)}>
            <Text style={s.btnTxt}>{t('next')} →</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ── TEMA */}
      {step===STEPS.THEME&&(
        <View style={[s.card,{backgroundColor:th.bgCard,borderColor:th.border}]}>
          <Text style={s.cardEmoji}>🎨</Text>
          <Text style={[s.cardTitle,{color:th.textPrimary}]}>{t('onbChooseTheme')}</Text>
          <Text style={[s.cardSub,{color:th.textMuted}]}>{t('onbChooseThemeSub')}</Text>
          {[{key:'auto',label:t('onbThemeAuto'),icon:'📱'},{key:'dark',label:t('onbThemeDark'),icon:'🌙'},{key:'light',label:t('onbThemeLight'),icon:'☀️'}].map(opt=>(
            <TouchableOpacity key={opt.key} style={[s.themeOpt,{borderColor:themeKey===opt.key?th.accent:th.border,backgroundColor:themeKey===opt.key?th.accentBg:th.bgCardAlt||th.bg}]}
              onPress={async ()=>{ await changeTheme(opt.key); }}>
              <Text style={{fontSize:26,marginRight:14}}>{opt.icon}</Text>
              <Text style={[s.themeLabel,{color:th.textPrimary}]}>{opt.label}</Text>
              {themeKey===opt.key&&<Text style={{color:th.accent,fontSize:20}}>✓</Text>}
            </TouchableOpacity>
          ))}
          <View style={s.rowBtns}>
            <TouchableOpacity style={[s.btnSec,{borderColor:th.border}]} onPress={()=>setStep(STEPS.LANG)}><Text style={[s.btnSecTxt,{color:th.textMuted}]}>← {t('back')}</Text></TouchableOpacity>
            <TouchableOpacity style={[s.btn,{backgroundColor:th.accent,flex:1}]} onPress={()=>setStep(STEPS.ACCOUNT)}><Text style={s.btnTxt}>{t('next')} →</Text></TouchableOpacity>
          </View>
        </View>
      )}

      {/* ── ACCOUNT */}
      {step===STEPS.ACCOUNT&&(
        <View style={[s.card,{backgroundColor:th.bgCard,borderColor:th.border}]}>
          <Text style={s.cardEmoji}>👤</Text>
          <Text style={[s.cardTitle,{color:th.textPrimary}]}>Come vuoi accedere?</Text>
          <Text style={[s.cardSub,{color:th.textMuted}]}>Scegli come salvare i tuoi progressi</Text>
          {[
            {type:'guest',  emoji:'👤',title:'Ospite',  sub:'Nessun account — dati salvati localmente', color:null},
            {type:'google', emoji:'🔵',title:'Google',  sub:'Accedi con Google (prossimamente)',        color:'#4285F4'},
            {type:'facebook',emoji:'🔷',title:'Facebook',sub:'Accedi con Facebook (prossimamente)',    color:'#1877F2'},
          ].map(opt=>(
            <TouchableOpacity key={opt.type}
              style={[s.loginBtn,{borderColor:loginType===opt.type?(opt.color||th.accent):th.border,backgroundColor:loginType===opt.type?(opt.color?opt.color+'18':th.accentBg):th.bgCardAlt||th.bg}]}
              onPress={()=>{setLoginType(opt.type);setTimeout(()=>setStep(STEPS.NAME),300);}}>
              <Text style={{fontSize:26,marginRight:14}}>{opt.emoji}</Text>
              <View style={{flex:1}}>
                <Text style={[s.loginTitle,{color:loginType===opt.type?(opt.color||th.accent):th.textPrimary}]}>{opt.title}</Text>
                <Text style={[s.loginSub,{color:th.textMuted}]}>{opt.sub}</Text>
              </View>
              {loginType===opt.type&&<Text style={{color:opt.color||th.accent,fontSize:18}}>✓</Text>}
            </TouchableOpacity>
          ))}
          <View style={[s.gdprBox,{backgroundColor:th.bgCardAlt||th.bg,borderColor:th.border}]}>
            <Text style={{color:th.textMuted,fontSize:11,lineHeight:17}}>ℹ️ Google e Facebook Login saranno attivi nelle prossime versioni.</Text>
          </View>
          <View style={s.rowBtns}>
            <TouchableOpacity style={[s.btnSec,{borderColor:th.border}]} onPress={()=>setStep(STEPS.THEME)}><Text style={[s.btnSecTxt,{color:th.textMuted}]}>← {t('back')}</Text></TouchableOpacity>
            <TouchableOpacity style={[s.btn,{backgroundColor:th.accent,flex:1}]} onPress={()=>setStep(STEPS.NAME)}><Text style={s.btnTxt}>{t('next')} →</Text></TouchableOpacity>
          </View>
        </View>
      )}

      {/* ── USERNAME */}
      {step===STEPS.NAME&&(
        <View style={[s.card,{backgroundColor:th.bgCard,borderColor:th.border}]}>
          <Text style={s.cardEmoji}>👤</Text>
          <Text style={[s.cardTitle,{color:th.textPrimary}]}>{t('onbUsername')}</Text>
          <Text style={[s.cardSub,{color:th.textMuted}]}>{t('onbUsernameSub')}</Text>
          <TextInput
            style={[s.input,{backgroundColor:th.bgInput||th.bg,color:th.textPrimary,borderColor:nameErr?th.danger:th.border}]}
            value={username}
            onChangeText={v=>{setUsername(v);setNameErr('');}}
            placeholder={t('onbUsernamePlaceholder')}
            placeholderTextColor={th.textMuted}
            maxLength={20}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {!!nameErr&&<Text style={[s.errTxt,{color:th.danger}]}>{nameErr}</Text>}
          <Text style={[s.hintTxt,{color:th.textMuted}]}>{t('onbUsernameHint')}</Text>
          <TouchableOpacity style={[s.btnSec3,{borderColor:th.border}]} onPress={()=>{setUsername(genGuest());setNameErr('');}}>
            <Text style={[s.btnSecTxt,{color:th.textMuted}]}>{t('onbUsernameRandom')}</Text>
          </TouchableOpacity>
          <View style={s.rowBtns}>
            <TouchableOpacity style={[s.btnSec,{borderColor:th.border}]} onPress={()=>setStep(STEPS.ACCOUNT)}><Text style={[s.btnSecTxt,{color:th.textMuted}]}>← {t('back')}</Text></TouchableOpacity>
            <TouchableOpacity style={[s.btn,{backgroundColor:th.accent,flex:1}]} onPress={onConfirmName}><Text style={s.btnTxt}>{t('next')} →</Text></TouchableOpacity>
          </View>
        </View>
      )}

      {/* ── DATA DI NASCITA */}
      {step===STEPS.BIRTH&&(
        <View style={[s.card,{backgroundColor:th.bgCard,borderColor:th.border}]}>
          <Text style={s.cardEmoji}>🎂</Text>
          <Text style={[s.cardTitle,{color:th.textPrimary}]}>Data di nascita</Text>
          <Text style={[s.cardSub,{color:th.textMuted}]}>
            Nel giorno del tuo compleanno: crediti illimitati e niente pubblicità! 🎉
          </Text>

          <TextInput
            style={[s.input,{
              backgroundColor:th.bgInput||th.bg,
              color:th.textPrimary,
              borderColor:birthErr?th.danger:th.border,
              textAlign:'center',
              fontSize:22,
              letterSpacing:3,
              fontWeight:'700',
            }]}
            value={birthDisplay}
            onChangeText={onBirthChange}
            placeholder="gg/mm/aaaa"
            placeholderTextColor={th.textMuted}
            keyboardType="numeric"
            maxLength={10}
          />

          {!!birthErr&&<Text style={[s.errTxt,{color:th.danger}]}>{birthErr}</Text>}

          <Text style={[s.hintTxt,{color:th.textMuted}]}>
            Facoltativo — puoi inserirla o modificarla nelle impostazioni.{'\n'}
            Formato: gg/mm/aaaa (es. 05/04/1995)
          </Text>

          {birthValid&&(
            <View style={[s.birthPreview,{backgroundColor:'rgba(252,185,0,0.1)',borderColor:'#fcb900'}]}>
              <Text style={{color:'#fcb900',fontSize:14,fontWeight:'700'}}>
                🎉 Il tuo compleanno: crediti ∞ + no ads!
              </Text>
            </View>
          )}

          <View style={s.rowBtns}>
            <TouchableOpacity style={[s.btnSec,{borderColor:th.border}]} onPress={()=>setStep(STEPS.NAME)}>
              <Text style={[s.btnSecTxt,{color:th.textMuted}]}>← {t('back')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[s.btn,{backgroundColor:th.accent,flex:1}]} onPress={onConfirmBirth}>
              <Text style={s.btnTxt}>{t('next')} →</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity onPress={()=>setStep(STEPS.AVATAR)} style={{marginTop:10}}>
            <Text style={[s.skipTxt,{color:th.textMuted}]}>Salta →</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ── AVATAR */}
      {step===STEPS.AVATAR&&(
        <View style={[s.card,{backgroundColor:th.bgCard,borderColor:th.border}]}>
          <Text style={s.cardEmoji}>🎭</Text>
          <Text style={[s.cardTitle,{color:th.textPrimary}]}>{t('onbChooseAvatar')}</Text>
          <Text style={[s.cardSub,{color:th.textMuted}]}>{t('onbChooseAvatarSub')}</Text>
          <View style={s.gRow}>
            {[['male',t('onbMale'),'♂️'],['female',t('onbFemale'),'♀️'],['other',t('onbOther'),'⚧']].map(([g,lb,ic])=>(
              <TouchableOpacity key={g}
                style={[s.gBtn,{borderColor:gender===g?th.accent:th.border,backgroundColor:gender===g?th.accentBg:th.bgCardAlt||th.bg}]}
                onPress={()=>setGender(g)}>
                <Text style={{fontSize:18}}>{ic}</Text>
                <Text style={[s.gLbl,{color:gender===g?th.accent:th.textMuted}]}>{lb}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={s.avGrid}>
            {baseAvatars.map(av=>(
              <TouchableOpacity key={av.id}
                style={[s.avBtn,{borderColor:avatarId===av.id?th.accent:th.border,backgroundColor:avatarId===av.id?th.accentBg:th.bgCardAlt||th.bg}]}
                onPress={()=>setAvatarId(av.id)}>
                <Text style={{fontSize:30}}>{av.emoji}</Text>
                <Text style={[s.avLbl,{color:avatarId===av.id?th.accent:th.textMuted}]}>{av.label}</Text>
                {avatarId===av.id&&<Text style={{color:th.accent,fontSize:10}}>✓</Text>}
              </TouchableOpacity>
            ))}
          </View>
          <View style={s.rowBtns}>
            <TouchableOpacity style={[s.btnSec,{borderColor:th.border}]} onPress={()=>setStep(STEPS.BIRTH)}><Text style={[s.btnSecTxt,{color:th.textMuted}]}>← {t('back')}</Text></TouchableOpacity>
            <TouchableOpacity style={[s.btn,{backgroundColor:th.accent,flex:1}]} onPress={()=>setStep(STEPS.TUTORIAL)}><Text style={s.btnTxt}>{t('next')} →</Text></TouchableOpacity>
          </View>
        </View>
      )}

      {/* ── TUTORIAL */}
      {step===STEPS.TUTORIAL&&(
        <View style={[s.card,{backgroundColor:th.bgCard,borderColor:th.border}]}>
          <Text style={s.tutIcon}>{slide.icon}</Text>
          <Text style={[s.cardTitle,{color:th.textPrimary}]}>{t(slide.titleKey)}</Text>
          <Text style={[s.tutDesc,{color:th.textSecondary}]}>{t(slide.descKey)}</Text>
          <View style={s.tutDots}>
            {tutSlides.map((_,i)=>(<View key={i} style={[s.tutDot,{backgroundColor:tutSlide===i?th.accent:th.border}]}/>))}
          </View>
          <View style={s.rowBtns}>
            {tutSlide>0?(
              <TouchableOpacity style={[s.btnSec,{borderColor:th.border}]} onPress={()=>setTutSlide(i=>i-1)}><Text style={[s.btnSecTxt,{color:th.textMuted}]}>← {t('back')}</Text></TouchableOpacity>
            ):(
              <TouchableOpacity style={[s.btnSec,{borderColor:th.border}]} onPress={()=>setStep(STEPS.AVATAR)}><Text style={[s.btnSecTxt,{color:th.textMuted}]}>← {t('back')}</Text></TouchableOpacity>
            )}
            {tutSlide<tutSlides.length-1?(
              <TouchableOpacity style={[s.btn,{backgroundColor:th.accent,flex:1}]} onPress={()=>setTutSlide(i=>i+1)}><Text style={s.btnTxt}>{t('next')} →</Text></TouchableOpacity>
            ):(
              <TouchableOpacity style={[s.btn,{backgroundColor:'#4caf50',flex:1}]} onPress={onFinish}><Text style={s.btnTxt}>🎮 {t('onbLetsPlay')}</Text></TouchableOpacity>
            )}
          </View>
          <TouchableOpacity onPress={onFinish} style={{marginTop:12}}>
            <Text style={[s.skipTxt,{color:th.textMuted}]}>{t('skip')}</Text>
          </TouchableOpacity>
        </View>
      )}

    </ScrollView>
  );
}

const s = StyleSheet.create({
  splash:         {flex:1,justifyContent:'center',alignItems:'center'},
  splashIcon:     {fontSize:80,marginBottom:16},
  splashTitle:    {fontSize:36,fontWeight:'900',color:'#fff',letterSpacing:2},
  splashSub:      {fontSize:22,fontWeight:'900',color:'#f5a623',letterSpacing:6,marginTop:4},
  splashTag:      {fontSize:14,letterSpacing:3,marginTop:8},
  content:        {padding:20,paddingBottom:60,alignItems:'center'},
  dots:           {flexDirection:'row',gap:8,marginBottom:18,paddingTop:10},
  dot:            {width:28,height:5,borderRadius:3},
  card:           {width:'100%',borderRadius:20,padding:20,borderWidth:1},
  cardEmoji:      {fontSize:48,textAlign:'center',marginBottom:8},
  cardTitle:      {fontSize:22,fontWeight:'900',textAlign:'center',marginBottom:6},
  cardSub:        {fontSize:14,textAlign:'center',marginBottom:14,lineHeight:20},
  confirmBadge:   {borderRadius:12,padding:10,borderWidth:1.5,marginBottom:10,alignItems:'center',width:'100%'},
  confirmTxt:     {fontSize:15,fontWeight:'800'},
  langGrid:       {flexDirection:'row',flexWrap:'wrap',marginBottom:16,width:'100%'},
  langCell:       {borderRadius:14,paddingVertical:14,paddingHorizontal:4,alignItems:'center',justifyContent:'center',borderWidth:1,position:'relative',marginBottom:10},
  langFlag:       {marginBottom:6,textAlign:'center'},
  langNative:     {fontWeight:'800',textAlign:'center',marginBottom:2},
  langEnLabel:    {textAlign:'center',opacity:0.75},
  langCheck:      {position:'absolute',top:5,right:5,width:18,height:18,borderRadius:9,justifyContent:'center',alignItems:'center'},
  langCheckTxt:   {color:'#fff',fontSize:10,fontWeight:'900'},
  themeOpt:       {flexDirection:'row',alignItems:'center',borderRadius:12,padding:14,borderWidth:1,marginBottom:10},
  themeLabel:     {flex:1,fontSize:16,fontWeight:'600'},
  input:          {borderWidth:1,borderRadius:12,paddingHorizontal:16,paddingVertical:12,fontSize:18,marginBottom:6,width:'100%'},
  errTxt:         {fontSize:13,marginBottom:6},
  hintTxt:        {fontSize:12,textAlign:'center',marginBottom:10,lineHeight:17},
  gRow:           {flexDirection:'row',gap:8,marginBottom:14,width:'100%'},
  gBtn:           {flex:1,borderRadius:12,padding:12,alignItems:'center',borderWidth:1},
  gLbl:           {fontSize:11,fontWeight:'600',marginTop:4},
  avGrid:         {flexDirection:'row',flexWrap:'wrap',gap:10,marginBottom:18,justifyContent:'center'},
  avBtn:          {width:88,borderRadius:12,padding:12,alignItems:'center',borderWidth:1},
  avLbl:          {fontSize:10,marginTop:4},
  tutIcon:        {fontSize:60,textAlign:'center',marginBottom:10},
  tutDesc:        {fontSize:15,textAlign:'center',lineHeight:24,marginBottom:20},
  tutDots:        {flexDirection:'row',gap:8,justifyContent:'center',marginBottom:20},
  tutDot:         {width:10,height:10,borderRadius:5},
  skipTxt:        {fontSize:14,textAlign:'center'},
  loginBtn:       {flexDirection:'row',alignItems:'center',borderRadius:14,padding:15,borderWidth:1,marginBottom:10},
  loginTitle:     {fontSize:16,fontWeight:'800',marginBottom:2},
  loginSub:       {fontSize:12},
  gdprBox:        {borderRadius:10,padding:10,borderWidth:1,marginTop:4,marginBottom:14},
  birthPreview:   {borderRadius:12,padding:12,borderWidth:1,marginBottom:10,alignItems:'center'},
  rowBtns:        {flexDirection:'row',gap:10,width:'100%'},
  btn:            {borderRadius:14,padding:15,alignItems:'center'},
  btnTxt:         {color:'#fff',fontWeight:'900',fontSize:16},
  btnSec:         {borderRadius:14,padding:15,alignItems:'center',borderWidth:1,paddingHorizontal:18},
  btnSec3:        {borderRadius:14,padding:12,alignItems:'center',borderWidth:1,width:'100%',marginBottom:12},
  btnSecTxt:      {fontWeight:'600',fontSize:14},
});
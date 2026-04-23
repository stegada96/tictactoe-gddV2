// screens/ProfileScreen.js — FINALE COMPLETO
// ✅ Foto profilo con expo-image-picker (livello 10)
// ✅ Tab Skins: TUTTI gli item con lucchetto Lv.X per i bloccati
// ✅ AppHeader (← + profilo a destra)
// ✅ Badges / Records / Stats link rapidi
// ✅ Validazione nome con moderation.js

import React, { useContext, useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, TextInput, Modal, Dimensions, Image, Alert,
} from 'react-native';
import { AppContext } from '../App';
import CONFIG from '../config';
import { theme as getTheme } from '../utils/theme';
import { t, useLang } from '../utils/i18n';
import { getPlayer, savePlayer, selectPiece, saveFacePhoto, getStats, canChangeName, changeName } from '../utils/storage';
import { validateUsername } from '../utils/moderation';
import { openCamera, openGallery, saveFacePhotoLocal, saveAndUploadPhoto, deletePhotoComplete } from '../utils/photoProfile';
import { log, logError } from '../utils/debug';
import AppHeader from '../components/AppHeader';

const { width } = Dimensions.get('window');

const RARITY_COLORS = {
  common:'#808098', rare:'#00bfff', epic:'#b39ddb',
  legendary:'#f5a623', mythic:'#e94560',
};

const SAFE = {
  id:'local_player', name:'Player', level:1, xp:0,
  eloAI:500, eloOnline:500, avatarId:'n1', gender:'other',
  facePhotoUri:null, selectedPieceX:'X', selectedPieceO:'O',
  unlockedPieces:['x_def','o_def'], noAds:false, vip:false,
  onboardingDone:true, lastNameChange:null,
};

const norm = (raw) => {
  if (!raw || typeof raw !== 'object') return { ...SAFE };
  return {
    ...SAFE, ...raw,
    selectedPieceX: raw.selectedPieceX || 'X',
    selectedPieceO: raw.selectedPieceO || 'O',
    unlockedPieces: Array.isArray(raw.unlockedPieces) && raw.unlockedPieces.length > 0 ? raw.unlockedPieces : ['x_def','o_def'],
    level: (typeof raw.level === 'number' && raw.level > 0) ? raw.level : 1,
    xp:    (typeof raw.xp    === 'number' && raw.xp   >= 0) ? raw.xp    : 0,
    eloAI:     typeof raw.eloAI     === 'number' ? raw.eloAI     : 500,
    eloOnline: typeof raw.eloOnline === 'number' ? raw.eloOnline : 500,
  };
};

const getLeague = (elo) => {
  const e = elo || 500;
  if (e >= (CONFIG.LEAGUE_LEGEND_ELO  || 2500)) return { name:'Legend',  icon:'👑', color:'#e94560' };
  if (e >= (CONFIG.LEAGUE_DIAMOND_ELO || 2000)) return { name:'Diamond', icon:'💎', color:'#00d2ff' };
  if (e >= (CONFIG.LEAGUE_GOLD_ELO    || 1500)) return { name:'Gold',    icon:'🥇', color:'#ffd700' };
  if (e >= (CONFIG.LEAGUE_SILVER_ELO  || 1000)) return { name:'Silver',  icon:'🥈', color:'#c0c0c0' };
  return { name:'Bronze', icon:'🥉', color:'#cd7f32' };
};

export default function ProfileScreen() {
  const { goBack, navigate } = useContext(AppContext);
  useLang();
  const th = getTheme();

  const [player,       setPlayer]       = useState(null);
  const [stats,        setStats]        = useState(null);
  const [editName,     setEditName]     = useState(false);
  const [nameInput,    setNameInput]    = useState('');
  const [nameError,    setNameError]    = useState('');
  const [tab,          setTab]          = useState('pieces');
  const [slotSel,      setSlotSel]      = useState('X');
  const [photoModal,   setPhotoModal]   = useState(false);
  const [photoLoading, setPhotoLoading] = useState(false);
  const [saving,       setSaving]       = useState(false);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const [rawP, rawS] = await Promise.all([getPlayer(), getStats('total').catch(()=>null)]);
      const p = norm(rawP);
      setPlayer(p);
      setStats(rawS || {});
      setNameInput(p.name || 'Player');
    } catch(e) {
      setPlayer({ ...SAFE });
      setStats({});
    }
  };

  const saveName = async () => {
    const trimmed = nameInput.trim();
    const err = validateUsername(trimmed);
    if (err) { setNameError(err); return; }
    if (!canChangeName()) { setNameError('Attendi 48h per cambiare nome'); return; }
    setSaving(true);
    try {
      await changeName(trimmed);
      setEditName(false);
      setNameError('');
      await loadData();
    } catch(e) { setNameError('Errore nel salvataggio'); }
    finally { setSaving(false); }
  };

  const onSelectPiece = async (item) => {
    if (!item?.id) return;
    const ok = await selectPiece(slotSel, item.id).catch(()=>false);
    if (ok) await loadData();
    else Alert.alert('Non sbloccato', 'Guadagna livelli per sbloccare questa pedina!');
  };

  const handleTakePhoto = async () => {
    setPhotoModal(false);
    setPhotoLoading(true);
    const r = await openCamera().catch(e => ({ ok:false, error:e.message }));
    if (r.ok) {
      // saveAndUploadPhoto: salva locale + tenta upload Firebase su path fisso profilePhotos/{uid}.jpg
      // Se Firebase non disponibile, salva solo locale (nessun blocco del flusso)
      const uid = player?.id || 'guest';
      const saved = await saveAndUploadPhoto(r.uri, uid);
      await saveFacePhoto(saved.uri || r.uri); // aggiorna storage con URI finale (locale o remoto)
      await loadData();
      Alert.alert('✅', 'Foto salvata come pedina!');
    } else if (r.error !== 'canceled') {
      Alert.alert('Errore', r.error || 'Impossibile aprire la fotocamera');
    }
    setPhotoLoading(false);
  };

  const handleChooseGallery = async () => {
    setPhotoModal(false);
    setPhotoLoading(true);
    const r = await openGallery().catch(e => ({ ok:false, error:e.message }));
    if (r.ok) {
      const uid = player?.id || 'guest';
      const saved = await saveAndUploadPhoto(r.uri, uid);
      await saveFacePhoto(saved.uri || r.uri);
      await loadData();
      Alert.alert('✅', 'Foto salvata come pedina!');
    } else if (r.error !== 'canceled') {
      Alert.alert('Errore', r.error || 'Impossibile aprire la galleria');
    }
    setPhotoLoading(false);
  };

  const handleRemovePhoto = async () => {
    setPhotoModal(false);
    const uid = player?.id || 'guest';
    await saveFacePhoto(null);          // pulisce player.facePhotoUri nel store
    await deletePhotoComplete(uid);     // rimuove AsyncStorage + Firebase remoto
    await loadData();
  };

  if (!player) {
    return (
      <View style={[s.root,{backgroundColor:th.bg,justifyContent:'center',alignItems:'center'}]}>
        <Text style={{color:th.textMuted,fontSize:16}}>{t('loading')}</Text>
      </View>
    );
  }

  const level    = player.level || 1;
  const xp       = player.xp   || 0;
  const league   = getLeague(player.eloOnline);
  const unlocked = player.unlockedPieces || ['x_def','o_def'];
  const xpThresholds = [0,100,300,650,1150,1850,2850,4350,6350,9350];
  const xpMin  = xpThresholds[Math.min(level-1,xpThresholds.length-1)] || 0;
  const xpMax  = xpThresholds[Math.min(level,xpThresholds.length-1)] || xpMin+1000;
  const xpPct  = Math.min(1, Math.max(0, (xp-xpMin)/Math.max(1,xpMax-xpMin)));
  const currentX   = player.selectedPieceX || 'X';
  const currentO   = player.selectedPieceO || 'O';
  const avatarData = (CONFIG.AVATARS||[]).find(a=>a.id===player.avatarId) || {emoji:'👤'};
  const CX = '#4080ff';
  const CO = '#e94560';

  const unlockedItems = CONFIG.PIECE_UNLOCKS.filter(u =>
    unlocked.includes(u.id) && (u.type !== 'photo' || level >= 10)
  );
  const lockedItems = CONFIG.PIECE_UNLOCKS.filter(u =>
    !unlocked.includes(u.id) || (u.type === 'photo' && level < 10)
  );

  return (
    <View style={[s.root,{backgroundColor:th.bg}]}>

      {/* MODAL FOTO */}
      <Modal visible={photoModal} transparent animationType="slide">
        <View style={s.overlay}>
          <View style={[s.photoDialog,{backgroundColor:th.bgCard,borderColor:th.border}]}>
            <Text style={[s.dTitle,{color:th.textPrimary}]}>📸 Foto Profilo</Text>
            <Text style={[s.dMsg,{color:th.textSecondary}]}>La tua foto diventa una pedina nel gioco!</Text>
            {level < 10 ? (
              <View style={[s.lockedBanner,{backgroundColor:th.accentBg,borderColor:th.accent}]}>
                <Text style={[s.lockedBannerTxt,{color:th.accent}]}>🔒 Sblocca al livello 10</Text>
              </View>
            ) : (
              <>
                <TouchableOpacity style={[s.photoBtn,{backgroundColor:th.bgCard,borderColor:th.border}]}
                  onPress={handleTakePhoto} disabled={photoLoading}>
                  <Text style={[s.photoBtnTxt,{color:th.textPrimary}]}>
                    {photoLoading?'⏳ Caricamento…':'📷 Scatta una foto'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity style={[s.photoBtn,{backgroundColor:th.bgCard,borderColor:th.border}]}
                  onPress={handleChooseGallery} disabled={photoLoading}>
                  <Text style={[s.photoBtnTxt,{color:th.textPrimary}]}>🖼️ Scegli dalla galleria</Text>
                </TouchableOpacity>
                {player.facePhotoUri && (
                  <TouchableOpacity style={[s.photoBtn,{backgroundColor:'rgba(233,69,96,0.1)',borderColor:th.danger}]}
                    onPress={handleRemovePhoto}>
                    <Text style={[s.photoBtnTxt,{color:th.danger}]}>🗑️ Rimuovi foto</Text>
                  </TouchableOpacity>
                )}
              </>
            )}
            <TouchableOpacity onPress={()=>setPhotoModal(false)} style={{marginTop:12}}>
              <Text style={{color:th.textMuted,fontSize:14}}>{t('cancel')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <AppHeader title={t('myProfile')||'👤 Profilo'} noProfile />

      <ScrollView contentContainerStyle={s.content}>

        {/* HERO */}
        <View style={[s.heroCard,{backgroundColor:th.bgCard,borderColor:th.border}]}>
          <View style={s.avatarRow}>
            <TouchableOpacity style={[s.avatarCircle,{borderColor:league.color,backgroundColor:th.bgCardAlt||th.bg}]}
              onPress={()=>setPhotoModal(true)}>
              {player.facePhotoUri ? (
                <Image source={{uri:player.facePhotoUri}} style={s.avatarImg}/>
              ) : (
                <Text style={s.avatarEmoji}>{avatarData.emoji}</Text>
              )}
              <View style={[s.levelBubble,{backgroundColor:th.accent}]}>
                <Text style={s.levelBubbleTxt}>{level}</Text>
              </View>
              {level>=10&&!player.facePhotoUri&&(
                <View style={[s.photoBadge,{backgroundColor:th.accent}]}>
                  <Text style={{color:'#000',fontSize:8,fontWeight:'900'}}>📸</Text>
                </View>
              )}
            </TouchableOpacity>

            <View style={s.nameArea}>
              {editName ? (
                <View>
                  <View style={s.nameInputRow}>
                    <TextInput
                      style={[s.nameInput,{backgroundColor:th.bgCardAlt||th.bg,color:th.textPrimary,borderColor:nameError?th.danger:th.border}]}
                      value={nameInput} onChangeText={v=>{setNameInput(v);setNameError('');}}
                      maxLength={20} autoFocus autoCapitalize="none" autoCorrect={false}/>
                    <TouchableOpacity style={[s.nameSaveBtn,{backgroundColor:saving?th.textMuted:'#4caf50'}]}
                      onPress={saveName} disabled={saving}>
                      <Text style={s.nameSaveTxt}>✓</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[s.nameSaveBtn,{backgroundColor:th.danger}]}
                      onPress={()=>{setEditName(false);setNameError('');}}>
                      <Text style={s.nameSaveTxt}>✕</Text>
                    </TouchableOpacity>
                  </View>
                  {!!nameError&&<Text style={[s.nameError,{color:th.danger}]}>{nameError}</Text>}
                </View>
              ) : (
                <TouchableOpacity onPress={()=>setEditName(true)} style={s.nameRow}>
                  <Text style={[s.nameText,{color:th.textPrimary}]}>{player.name||'Player'}</Text>
                  <Text style={s.nameEdit}>✏️</Text>
                </TouchableOpacity>
              )}
              <View style={s.leagueRow}>
                <Text style={s.leagueIcon}>{league.icon}</Text>
                <Text style={[s.leagueName,{color:league.color}]}>{league.name}</Text>
                <Text style={[s.eloTxt,{color:th.textMuted}]}>· {player.eloOnline||500} ELO</Text>
              </View>
              <Text style={[s.idTxt,{color:th.textMuted}]}>
                {player.loginType==='google'?'🔵 Google':player.loginType==='facebook'?'🔷 Facebook':'👤 Guest'}
              </Text>
            </View>
          </View>

          <View style={{marginTop:12}}>
            <View style={{flexDirection:'row',justifyContent:'space-between',marginBottom:6}}>
              <Text style={[s.xpLabel,{color:th.textSecondary}]}>{t('level',{n:level})}</Text>
              <Text style={[s.xpLabel,{color:th.accent}]}>{xp} XP</Text>
            </View>
            <View style={[s.xpBarBg,{backgroundColor:th.border}]}>
              <View style={[s.xpBarFill,{width:`${xpPct*100}%`,backgroundColor:th.accent}]}/>
            </View>
          </View>

          <View style={s.quickStats}>
            {[
              {label:'Partite',     value:stats?.gamesPlayed||0, icon:'🎮'},
              {label:'Vittorie',    value:stats?.wins||0,        icon:'🏆'},
              {label:'ELO AI',      value:player.eloAI||500,     icon:'🤖'},
              {label:'ELO Online',  value:player.eloOnline||500, icon:'⚡'},
            ].map(item=>(
              <View key={item.label} style={[s.quickStatItem,{backgroundColor:th.bgCardAlt||th.bg}]}>
                <Text style={s.qsIcon}>{item.icon}</Text>
                <Text style={[s.qsValue,{color:th.textPrimary}]}>{item.value}</Text>
                <Text style={[s.qsLabel,{color:th.textMuted}]} numberOfLines={1}>{item.label}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* 5 SEZIONI — riga 1: Records+Stats | riga 2: Pieces+Badges+Skins */}
        <View style={{marginBottom:14}}>
          <View style={{flexDirection:'row',gap:8,marginBottom:8}}>
            <TouchableOpacity style={[s.quickLink,{backgroundColor:th.bgCard,borderColor:th.border}]} onPress={()=>navigate('records')}>
              <Text style={[s.quickLinkTxt,{color:th.accent}]}>📊 Records</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[s.quickLink,{backgroundColor:th.bgCard,borderColor:th.border}]} onPress={()=>navigate('stats')}>
              <Text style={[s.quickLinkTxt,{color:th.accent}]}>📈 Stats</Text>
            </TouchableOpacity>
          </View>
          <View style={{flexDirection:'row',gap:8}}>
            <TouchableOpacity
              style={[s.quickLink,{backgroundColor:tab==='pieces'?th.accentBg:th.bgCard,borderColor:tab==='pieces'?th.accent:th.border}]}
              onPress={()=>setTab('pieces')}>
              <Text style={[s.quickLinkTxt,{color:th.accent}]}>🎭 Pezzi</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[s.quickLink,{backgroundColor:th.bgCard,borderColor:th.border}]} onPress={()=>navigate('badges')}>
              <Text style={[s.quickLinkTxt,{color:th.accent}]}>🏅 Badges</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.quickLink,{backgroundColor:tab==='collection'?th.accentBg:th.bgCard,borderColor:tab==='collection'?th.accent:th.border}]}
              onPress={()=>setTab('collection')}>
              <Text style={[s.quickLinkTxt,{color:th.accent}]}>🎨 Skins</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* TAB PIECES */}
        {tab==='pieces'&&(
          <>
            <View style={[s.card,{backgroundColor:th.bgCard,borderColor:th.border}]}>
              <Text style={[s.cardTitle,{color:th.textPrimary}]}>Pedine Attive</Text>
              <View style={s.slotsRow}>
                <TouchableOpacity style={[s.slotCard,{borderColor:slotSel==='X'?CX:th.border,backgroundColor:th.bgCardAlt||th.bg}]}
                  onPress={()=>setSlotSel('X')}>
                  <Text style={[s.slotLabel,{color:CX}]}>Tu (X)</Text>
                  <Text style={[s.slotValue,{color:CX}]}>{currentX==='PHOTO'?(player.facePhotoUri?'📸':'📷'):currentX||'X'}</Text>
                  {slotSel==='X'&&<View style={[s.slotActiveDot,{backgroundColor:CX}]}/>}
                </TouchableOpacity>
                <TouchableOpacity style={[s.slotCard,{borderColor:slotSel==='O'?CO:th.border,backgroundColor:th.bgCardAlt||th.bg}]}
                  onPress={()=>setSlotSel('O')}>
                  <Text style={[s.slotLabel,{color:CO}]}>Avversario (O)</Text>
                  <Text style={[s.slotValue,{color:CO}]}>{currentO==='PHOTO'?(player.facePhotoUri?'📸':'📷'):currentO||'O'}</Text>
                  {slotSel==='O'&&<View style={[s.slotActiveDot,{backgroundColor:CO}]}/>}
                </TouchableOpacity>
              </View>
              <Text style={[s.equipHint,{color:th.textMuted}]}>Slot: {slotSel} — tocca una pedina per equipaggiarla</Text>
            </View>

            <Text style={[s.sectionTitle,{color:th.textSecondary}]}>✅ Sbloccate ({unlockedItems.length})</Text>
            <View style={s.itemGrid}>
              {unlockedItems.map(item=>{
                const isEq  = (slotSel==='X'&&currentX===item.value)||(slotSel==='O'&&currentO===item.value);
                const rc    = RARITY_COLORS[item.rarity]||'#808098';
                return (
                  <TouchableOpacity key={item.id}
                    style={[s.itemCard,{borderColor:isEq?rc:th.border,backgroundColor:isEq?`${rc}22`:th.bgCard}]}
                    onPress={()=>{ if(item.type==='photo') setPhotoModal(true); else onSelectPiece(item); }}>
                    <Text style={s.itemEmoji}>{item.type==='photo'?(player.facePhotoUri?'📸':(level>=10?'📷':'🔒')):item.value||'?'}</Text>
                    <Text style={[s.itemLabel,{color:rc}]} numberOfLines={1}>{item.label}</Text>
                    <Text style={[s.itemRarity,{color:th.textMuted}]}>{item.rarity}</Text>
                    {isEq&&<View style={[s.equippedBadge,{backgroundColor:'#4caf50'}]}><Text style={s.equippedTxt}>✓</Text></View>}
                  </TouchableOpacity>
                );
              })}
            </View>
          </>
        )}

        {/* TAB STATS rimosso — usa il pulsante Stats sopra */}
        {tab==='_removed_stats_'&&(
          <View style={[s.card,{backgroundColor:th.bgCard,borderColor:th.border}]}>
            {[
              {label:'Partite Giocate', value:stats?.gamesPlayed||0},
              {label:'Vittorie',        value:stats?.wins||0},
              {label:'Sconfitte',       value:stats?.losses||0},
              {label:'Pareggi',         value:stats?.draws||0},
              {label:'% Vinte',         value:stats?.gamesPlayed>0?`${Math.round((stats.wins/stats.gamesPlayed)*100)}%`:'0%'},
              {label:'Miglior Serie',   value:stats?.bestStreak||0},
              {label:'ELO AI',          value:player.eloAI||500},
              {label:'ELO Online',      value:player.eloOnline||500},
              {label:'Partite Online',  value:stats?.onlineGames||0},
              {label:'Vittorie Online', value:stats?.onlineWins||0},
              {label:'Vittorie AI Hard',value:stats?.aiHardWins||0},
            ].map(row=>(
              <View key={row.label} style={[s.statRow,{borderBottomColor:th.border}]}>
                <Text style={[s.statLabel,{color:th.textSecondary}]}>{row.label}</Text>
                <Text style={[s.statValue,{color:th.textPrimary}]}>{row.value}</Text>
              </View>
            ))}
          </View>
        )}

        {/* TAB SKINS */}
        {tab==='collection'&&(
          <View style={[s.card,{backgroundColor:th.bgCard,borderColor:th.border}]}>
            <Text style={[s.cardTitle,{color:th.textPrimary}]}>🎨 Skins</Text>
            <Text style={[s.collectionInfo,{color:th.textSecondary}]}>{unlocked.length} / {CONFIG.PIECE_UNLOCKS.length} sbloccate</Text>
            <View style={[s.xpBarBg,{backgroundColor:th.border,marginVertical:10}]}>
              <View style={[s.xpBarFill,{width:`${Math.min(100,(unlocked.length/CONFIG.PIECE_UNLOCKS.length)*100)}%`,backgroundColor:'#4caf50'}]}/>
            </View>

            {unlockedItems.length>0&&(
              <>
                <Text style={[s.sectionTitle,{color:'#4caf50',marginBottom:8}]}>✅ Sbloccate ({unlockedItems.length})</Text>
                <View style={s.itemGrid}>
                  {unlockedItems.map(item=>{
                    const isEq = currentX===item.value||currentO===item.value;
                    const rc   = RARITY_COLORS[item.rarity]||'#808098';
                    return (
                      <TouchableOpacity key={item.id}
                        style={[s.itemCard,{borderColor:isEq?rc:th.accent,backgroundColor:th.accentBg}]}
                        onPress={()=>{setTab('pieces');setSlotSel('X');}}>
                        <Text style={s.itemEmoji}>{item.type==='photo'?'📸':item.value}</Text>
                        <Text style={[s.itemLabel,{color:th.accent}]} numberOfLines={1}>{item.label}</Text>
                        {isEq&&<View style={[s.equippedBadge,{backgroundColor:th.accent}]}><Text style={s.equippedTxt}>✓</Text></View>}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </>
            )}

            {lockedItems.length>0&&(
              <>
                <Text style={[s.sectionTitle,{color:th.textMuted,marginTop:12,marginBottom:8}]}>🔒 Da sbloccare</Text>
                <View style={s.itemGrid}>
                  {lockedItems.map(item=>(
                    <View key={item.id} style={[s.itemCard,{borderColor:th.border,backgroundColor:th.bgCardAlt||th.bg,opacity:0.65}]}>
                      <Text style={[s.itemEmoji,{opacity:0.45}]}>{item.type==='photo'?'📸':item.value}</Text>
                      <Text style={[s.itemLabel,{color:th.textMuted}]} numberOfLines={1}>{item.label}</Text>
                      <Text style={{fontSize:9,color:th.textMuted,fontWeight:'700',marginTop:3}}>🔒 Lv.{item.level}</Text>
                    </View>
                  ))}
                </View>
              </>
            )}
          </View>
        )}

        <View style={{height:20}}/>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root:          {flex:1},
  content:       {padding:16,paddingBottom:60},
  heroCard:      {borderRadius:16,padding:16,marginBottom:14,borderWidth:1},
  avatarRow:     {flexDirection:'row',alignItems:'center',gap:16},
  avatarCircle:  {width:76,height:76,borderRadius:38,borderWidth:3,justifyContent:'center',alignItems:'center',overflow:'hidden'},
  avatarImg:     {width:76,height:76,borderRadius:38},
  avatarEmoji:   {fontSize:36},
  levelBubble:   {position:'absolute',bottom:-2,right:-2,borderRadius:12,minWidth:24,height:24,justifyContent:'center',alignItems:'center',paddingHorizontal:4},
  levelBubbleTxt:{color:'#000',fontWeight:'900',fontSize:11},
  photoBadge:    {position:'absolute',top:-2,right:-2,width:18,height:18,borderRadius:9,justifyContent:'center',alignItems:'center'},
  nameArea:      {flex:1},
  nameRow:       {flexDirection:'row',alignItems:'center',gap:8,marginBottom:4},
  nameText:      {fontSize:20,fontWeight:'900'},
  nameEdit:      {fontSize:16},
  nameInputRow:  {flexDirection:'row',gap:6,marginBottom:4},
  nameInput:     {flex:1,borderRadius:10,paddingHorizontal:12,paddingVertical:8,fontSize:16,borderWidth:1},
  nameSaveBtn:   {width:38,borderRadius:10,justifyContent:'center',alignItems:'center'},
  nameSaveTxt:   {color:'#fff',fontSize:16,fontWeight:'900'},
  nameError:     {fontSize:12,marginBottom:4},
  leagueRow:     {flexDirection:'row',alignItems:'center',gap:4,marginBottom:4},
  leagueIcon:    {fontSize:16},
  leagueName:    {fontSize:14,fontWeight:'700'},
  eloTxt:        {fontSize:13},
  idTxt:         {fontSize:11},
  xpLabel:       {fontSize:13,fontWeight:'600'},
  xpBarBg:       {height:7,borderRadius:4,overflow:'hidden'},
  xpBarFill:     {height:7,borderRadius:4},
  quickStats:    {flexDirection:'row',gap:8,marginTop:14},
  quickStatItem: {flex:1,borderRadius:10,padding:10,alignItems:'center'},
  qsIcon:        {fontSize:18,marginBottom:4},
  qsValue:       {fontSize:16,fontWeight:'900'},
  qsLabel:       {fontSize:10,marginTop:2},
  quickLink:     {flex:1,borderRadius:12,padding:12,alignItems:'center',borderWidth:1},
  quickLinkTxt:  {fontSize:12,fontWeight:'700'},
  tabRow:        {flexDirection:'row',gap:8,marginBottom:14},
  tabBtn:        {flex:1,borderRadius:10,padding:10,alignItems:'center',borderWidth:1},
  tabBtnTxt:     {fontSize:12,fontWeight:'700'},
  card:          {borderRadius:14,padding:16,marginBottom:14,borderWidth:1},
  cardTitle:     {fontSize:16,fontWeight:'800',marginBottom:10},
  sectionTitle:  {fontSize:14,fontWeight:'700',marginBottom:8,marginTop:4},
  slotsRow:      {flexDirection:'row',gap:12,marginBottom:10},
  slotCard:      {flex:1,borderRadius:12,padding:14,alignItems:'center',borderWidth:2,position:'relative'},
  slotLabel:     {fontSize:12,fontWeight:'700',marginBottom:6},
  slotValue:     {fontSize:32,fontWeight:'900'},
  slotActiveDot: {width:8,height:8,borderRadius:4,position:'absolute',bottom:6},
  equipHint:     {fontSize:12,textAlign:'center'},
  itemGrid:      {flexDirection:'row',flexWrap:'wrap',gap:10,marginBottom:14},
  itemCard:      {width:(width-52)/3,borderRadius:12,padding:12,alignItems:'center',borderWidth:1,position:'relative'},
  itemEmoji:     {fontSize:26,marginBottom:5},
  itemLabel:     {fontSize:11,fontWeight:'700',marginBottom:2,textAlign:'center'},
  itemRarity:    {fontSize:9},
  equippedBadge: {position:'absolute',top:5,right:5,width:16,height:16,borderRadius:8,justifyContent:'center',alignItems:'center'},
  equippedTxt:   {color:'#fff',fontSize:9,fontWeight:'900'},
  statRow:       {flexDirection:'row',justifyContent:'space-between',paddingVertical:11,borderBottomWidth:1},
  statLabel:     {fontSize:14},
  statValue:     {fontSize:14,fontWeight:'700'},
  collectionInfo:{fontSize:14,marginBottom:4},
  overlay:       {flex:1,backgroundColor:'rgba(0,0,0,0.75)',justifyContent:'flex-end'},
  photoDialog:   {borderRadius:20,padding:24,alignItems:'center',borderWidth:1,margin:0},
  dTitle:        {fontSize:20,fontWeight:'900',marginBottom:8},
  dMsg:          {fontSize:14,textAlign:'center',lineHeight:20,marginBottom:16},
  lockedBanner:  {borderRadius:10,padding:12,borderWidth:1,width:'100%',marginBottom:12,alignItems:'center'},
  lockedBannerTxt:{fontSize:14,fontWeight:'700'},
  photoBtn:      {width:'100%',borderRadius:12,padding:14,alignItems:'center',marginBottom:10,borderWidth:1},
  photoBtnTxt:   {fontWeight:'700',fontSize:15},
});
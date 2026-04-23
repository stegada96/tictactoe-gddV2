// screens/LeaderboardScreen.js
// NUOVO: countdown stagione, tab seasonal/alltime, AI + Online separati

import React, { useContext, useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, FlatList, ScrollView } from 'react-native';
import { AppContext } from '../App';
import CONFIG from '../config';
import { getLeaderboard, getPlayer } from '../utils/storage';
import { theme as getTheme } from '../utils/theme';
import { t, useLang } from '../utils/i18n';
import { log } from '../utils/debug';
import AppHeader from '../components/AppHeader';

const VARIANT_ORDER = CONFIG.VARIANT_ORDER;

const getLeague = (elo) => {
  const e = elo||0;
  if (e >= CONFIG.LEAGUE_LEGEND_ELO)  return { name:'Legend',  icon:'👑', color:'#e94560' };
  if (e >= CONFIG.LEAGUE_DIAMOND_ELO) return { name:'Diamond', icon:'💎', color:'#00d2ff' };
  if (e >= CONFIG.LEAGUE_GOLD_ELO)    return { name:'Gold',    icon:'🥇', color:'#ffd700' };
  if (e >= CONFIG.LEAGUE_SILVER_ELO)  return { name:'Silver',  icon:'🥈', color:'#c0c0c0' };
  return { name:'Bronze', icon:'🥉', color:'#cd7f32' };
};

const BOTS = [
  { id:'b1', name:'🌟 GridMaster',  eloOnline:1842, aiScore:9200, wins:234, gamesPlayed:310, flag:'🇺🇸' },
  { id:'b2', name:'🔥 XKing',       eloOnline:1654, aiScore:7800, wins:189, gamesPlayed:267, flag:'🇬🇧' },
  { id:'b3', name:'💎 OQueen',      eloOnline:1423, aiScore:6500, wins:145, gamesPlayed:220, flag:'🇩🇪' },
  { id:'b4', name:'⚡ FastMover',   eloOnline:1201, aiScore:5100, wins:98,  gamesPlayed:165, flag:'🇫🇷' },
  { id:'b5', name:'🌙 Strategist',  eloOnline:987,  aiScore:4200, wins:72,  gamesPlayed:132, flag:'🇮🇹' },
  { id:'b6', name:'🧠 TacMaster',   eloOnline:876,  aiScore:3800, wins:61,  gamesPlayed:110, flag:'🇪🇸' },
  { id:'b7', name:'🎯 Bullseye',    eloOnline:754,  aiScore:3100, wins:48,  gamesPlayed:95,  flag:'🇯🇵' },
  { id:'b8', name:'🦁 Roarer',      eloOnline:632,  aiScore:2600, wins:35,  gamesPlayed:80,  flag:'🇧🇷' },
];

const calcAIScore = (wins, gamesPlayed) => Math.round((wins||0)*50+(gamesPlayed||0)*2);

// ── Countdown stagione ─────────────────────────────────────
const getSeasonInfo = () => {
  const now      = new Date();
  const lastDay  = new Date(now.getFullYear(), now.getMonth()+1, 0);
  const daysLeft = Math.max(0, lastDay.getDate()-now.getDate());
  const monthName = now.toLocaleString('default',{month:'long'});
  return { daysLeft, monthName, year: now.getFullYear() };
};

// ── Premi stagionali display ───────────────────────────────
const PRIZE_ROWS = [
  { rank:'🥇 #1',   credits: CONFIG.SEASON_CREDIT_REWARDS[0], ingots: CONFIG.SEASON_INGOT_REWARDS[1]  },
  { rank:'🥈 #2',   credits: CONFIG.SEASON_CREDIT_REWARDS[1], ingots: CONFIG.SEASON_INGOT_REWARDS[2]  },
  { rank:'🥉 #3',   credits: CONFIG.SEASON_CREDIT_REWARDS[2], ingots: CONFIG.SEASON_INGOT_REWARDS[3]  },
  { rank:'#4–10',   credits: CONFIG.SEASON_CREDIT_REWARDS[4], ingots: CONFIG.SEASON_INGOT_REWARDS[5]  },
  { rank:'#11–100', credits: CONFIG.SEASON_CREDIT_REWARDS[10],ingots: null },
];

export default function LeaderboardScreen() {
  const { goBack } = useContext(AppContext);
  const lang = useLang();
  const th   = getTheme();

  const [mode,    setMode]    = useState('online');
  const [variant, setVariant] = useState('total');
  const [season,  setSeason]  = useState('seasonal');
  const [entries, setEntries] = useState([]);
  const [myEntry, setMyEntry] = useState(null);
  const [myRank,  setMyRank]  = useState(null);
  const [loading, setLoading] = useState(true);
  const [showPrizes, setShowPrizes] = useState(false);
  const seasonInfo = getSeasonInfo();

  useEffect(() => { load(); }, [mode, variant, season]);

  const load = async () => {
    setLoading(true);
    try {
      const player = await getPlayer();
      const stored = await getLeaderboard().catch(()=>[]);
      const myElo  = player?.eloOnline || CONFIG.ELO_ONLINE_START;
      const myAIScore = calcAIScore(player?.wins, player?.gamesPlayed);

      const bots = BOTS.map((b,i) => ({
        ...b,
        rank: i+1,
        score: mode==='online' ? b.eloOnline : b.aiScore,
      })).sort((a,b) => b.score-a.score);

      const myEntry = {
        id:'me', name: player?.name||'You',
        eloOnline: myElo, aiScore: myAIScore,
        wins: player?.wins||0, gamesPlayed: player?.gamesPlayed||0,
        isMe: true, flag:'🏠',
      };

      // Inserisci nella posizione corretta
      const score = mode==='online' ? myElo : myAIScore;
      let rank = 1;
      const all = [...bots, myEntry].sort((a,b) => {
        const sa = mode==='online'?a.eloOnline:a.aiScore;
        const sb = mode==='online'?b.eloOnline:b.aiScore;
        return sb-sa;
      }).map((e,i) => ({ ...e, rank:i+1 }));

      const me = all.find(e=>e.isMe);
      setMyRank(me?.rank||null);
      setMyEntry(me||null);
      setEntries(all);
    } catch(e) { log('INFO','Leaderboard',e.message); }
    setLoading(false);
  };

  const renderItem = ({ item, index }) => {
    const score   = mode==='online' ? item.eloOnline : item.aiScore;
    const league  = getLeague(item.eloOnline||0);
    const rankIcon= item.rank===1?'🥇':item.rank===2?'🥈':item.rank===3?'🥉':`#${item.rank}`;
    const prize   = CONFIG.SEASON_INGOT_REWARDS[item.rank];

    return (
      <View style={[
        s.row,
        {
          backgroundColor: item.isMe ? th.accentBg : th.bgCard,
          borderColor:     item.isMe ? th.accent : th.border,
        },
      ]}>
        <Text style={[s.rank, { color: item.rank<=3?'#ffd700':th.textMuted }]}>{rankIcon}</Text>
        <Text style={{ fontSize:18, marginHorizontal:8 }}>{item.flag}</Text>
        <View style={{ flex:1 }}>
          <Text style={[s.name, { color:item.isMe?th.accent:th.textPrimary }]} numberOfLines={1}>
            {item.name} {item.isMe?'(you)':''}
          </Text>
          <Text style={[s.sub, { color:th.textMuted }]}>
            {league.icon} {league.name} · {item.wins||0} {t('wins2')}
          </Text>
        </View>
        <View style={{ alignItems:'flex-end' }}>
          <Text style={[s.elo, { color:league.color }]}>{score}</Text>
          {prize && <Text style={[s.prize, { color:'#ffd700' }]}>🪙 {prize}</Text>}
        </View>
      </View>
    );
  };

  return (
    <View style={[s.root, { backgroundColor:th.bg }]}>
      <AppHeader title={t('leaderboardTitle')||'🏆 Leaderboard'} />

      {/* ── STAGIONE BANNER ──────────────────────────────── */}
      <TouchableOpacity
        style={[s.seasonBanner, {
          backgroundColor: seasonInfo.daysLeft<=7
            ? 'rgba(233,69,96,0.12)'
            : th.accentBg,
          borderColor: seasonInfo.daysLeft<=7 ? th.danger : th.accent,
        }]}
        onPress={()=>setShowPrizes(!showPrizes)}>
        <View style={{flex:1}}>
          <Text style={[s.seasonTitle, { color: seasonInfo.daysLeft<=7?th.danger:th.accent }]}>
            🏆 Season: {seasonInfo.monthName} {seasonInfo.year}
          </Text>
          <Text style={[s.seasonSub, { color:th.textMuted }]}>
            {seasonInfo.daysLeft===0
              ? '⚠️ Ends today! Prizes being distributed…'
              : `${seasonInfo.daysLeft} day${seasonInfo.daysLeft!==1?'s':''} remaining`}
          </Text>
        </View>
        <Text style={{ color:th.textMuted, fontSize:13 }}>{showPrizes?'▲':'▼'} Prizes</Text>
      </TouchableOpacity>

      {/* ── PREMI STAGIONALI (espandibile) ──────────────── */}
      {showPrizes && (
        <View style={[s.prizesBox, { backgroundColor:th.bgCard, borderColor:th.border }]}>
          <Text style={[s.prizesTitle, { color:th.textPrimary }]}>🏅 Season Prizes</Text>
          {PRIZE_ROWS.map(p => (
            <View key={p.rank} style={s.prizeRow}>
              <Text style={[s.prizeRank, { color:th.textSecondary }]}>{p.rank}</Text>
              <Text style={[s.prizeVal,  { color:th.accent }]}>💰 {p.credits}</Text>
              {p.ingots&&<Text style={[s.prizeVal,{color:'#ffd700'}]}>🪙 {p.ingots}</Text>}
            </View>
          ))}
          <Text style={[s.prizeNote, { color:th.textMuted }]}>
            Min 10 ranked games to qualify
          </Text>
        </View>
      )}

      {/* MODE TABS */}
      <View style={s.modeRow}>
        {[['online','🌐 Online'],['ai','🤖 AI']].map(([id,lb])=>(
          <TouchableOpacity key={id}
            style={[s.modeBtn,{ borderColor:mode===id?th.accent:th.border, backgroundColor:mode===id?th.accentBg:th.bgCard }]}
            onPress={()=>setMode(id)}>
            <Text style={[s.modeTxt,{color:mode===id?th.accent:th.textMuted}]}>{lb}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* SEASONAL / ALLTIME */}
      <View style={s.modeRow}>
        {[['seasonal',`📅 ${t('seasonal')}`],['alltime',`📜 ${t('allTimeTab')}`]].map(([id,lb])=>(
          <TouchableOpacity key={id}
            style={[s.modeBtn,{borderColor:season===id?th.info||'#00bfff':th.border,backgroundColor:season===id?th.infoBg:th.bgCard}]}
            onPress={()=>setSeason(id)}>
            <Text style={[s.modeTxt,{color:season===id?th.info||'#00bfff':th.textMuted}]}>{lb}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* FILTRO VARIANTE */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{maxHeight:46}}>
        <View style={{flexDirection:'row',paddingHorizontal:12,gap:8,paddingVertical:5}}>
          {[
            {id:'total',label:'📊 Totale'},
            {id:'classic',label:'#️⃣ Classic'},
            {id:'ultimate',label:'🔢 Ultimate'},
            {id:'random',label:'🎲 Random'},
            {id:'classic_4x4',label:'4️⃣ 4×4'},
            {id:'classic_5x5',label:'5️⃣ 5×5'},
            {id:'misere',label:'🔄 Misère'},
            {id:'wild',label:'🃏 Wild'},
            {id:'order_chaos',label:'⚖️ O&C'},
          ].map(v=>(
            <TouchableOpacity key={v.id}
              style={{
                paddingHorizontal:12, paddingVertical:6, borderRadius:16, borderWidth:1,
                borderColor:   variant===v.id ? (th.info||'#00bfff') : th.border,
                backgroundColor: variant===v.id ? (th.infoBg||'rgba(0,191,255,0.1)') : th.bgCard,
              }}
              onPress={()=>setVariant(v.id)}>
              <Text style={{fontSize:12,fontWeight:'600',color:variant===v.id?(th.info||'#00bfff'):th.textMuted}}>
                {v.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {/* MIO RANK */}}
      {myEntry && myRank && (
        <View style={[s.myRankBanner, { backgroundColor:th.accentBg, borderColor:th.accent }]}>
          <Text style={[s.myRankTxt, { color:th.accent }]}>
            {t('myRank',{n:myRank})}  ·  {mode==='online'?myEntry.eloOnline:myEntry.aiScore} {mode==='online'?'ELO':'pts'}
          </Text>
          {myRank<=10 && CONFIG.SEASON_INGOT_REWARDS[myRank] && (
            <Text style={[s.myPrizeTxt, { color:'#ffd700' }]}>
              🪙 {CONFIG.SEASON_INGOT_REWARDS[myRank]} ingots if season ends now
            </Text>
          )}
        </View>
      )}

      {/* LISTA */}
      {loading ? (
        <View style={{ flex:1, justifyContent:'center', alignItems:'center' }}>
          <Text style={{ color:th.textMuted, fontSize:16 }}>{t('loading')}</Text>
        </View>
      ) : (
        <FlatList
          data={entries}
          keyExtractor={i=>i.id}
          renderItem={renderItem}
          contentContainerStyle={{ paddingHorizontal:12, paddingBottom:40, paddingTop:6 }}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  root:         { flex:1 },
  header:       { flexDirection:'row', alignItems:'center', paddingHorizontal:16, paddingVertical:14, borderBottomWidth:1 },
  backBtn:      { width:44, height:44, justifyContent:'center' },
  backTxt:      { fontSize:24 },
  title:        { flex:1, textAlign:'center', fontSize:20, fontWeight:'800' },
  seasonBanner: { marginHorizontal:12, marginTop:10, borderRadius:14, padding:13, borderWidth:1.5, flexDirection:'row', alignItems:'center' },
  seasonTitle:  { fontSize:14, fontWeight:'800', marginBottom:2 },
  seasonSub:    { fontSize:12 },
  prizesBox:    { marginHorizontal:12, borderRadius:12, padding:12, borderWidth:1, marginBottom:6 },
  prizesTitle:  { fontSize:14, fontWeight:'800', marginBottom:8 },
  prizeRow:     { flexDirection:'row', gap:12, paddingVertical:4, borderBottomWidth:1, borderBottomColor:'rgba(128,128,150,0.15)' },
  prizeRank:    { flex:1, fontSize:13 },
  prizeVal:     { fontSize:13, fontWeight:'700' },
  prizeNote:    { fontSize:11, marginTop:8, textAlign:'center' },
  modeRow:      { flexDirection:'row', paddingHorizontal:12, gap:8, paddingVertical:5 },
  modeBtn:      { flex:1, borderRadius:12, padding:10, alignItems:'center', borderWidth:1 },
  modeTxt:      { fontSize:13, fontWeight:'600' },
  myRankBanner: { marginHorizontal:12, borderRadius:12, padding:11, borderWidth:1, marginBottom:6 },
  myRankTxt:    { fontSize:14, fontWeight:'800' },
  myPrizeTxt:   { fontSize:12, marginTop:2 },
  row:          { flexDirection:'row', alignItems:'center', borderRadius:14, padding:13, marginBottom:7, borderWidth:1 },
  rank:         { fontSize:15, fontWeight:'900', width:34 },
  name:         { fontSize:14, fontWeight:'700', marginBottom:2 },
  sub:          { fontSize:11 },
  elo:          { fontSize:16, fontWeight:'900' },
  prize:        { fontSize:11, marginTop:2 },
});
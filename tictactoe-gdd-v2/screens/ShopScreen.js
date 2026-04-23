// screens/ShopScreen.js — Shop completo
// Lingotti, No Ads, VIP, Watch Ad gratis, Restore Purchases

import React, { useContext, useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, Alert, Modal,
} from 'react-native';
import { AppContext } from '../App';
import CONFIG from '../config';
import { theme as getTheme } from '../utils/theme';
import { t, useLang } from '../utils/i18n';
import { getPlayer, getIngots, spendIngots, addIngots, addCredits } from '../utils/storage';
import { showRewardedAd, canWatchReward, getRewardedCount } from '../services/ads';
import AppHeader from '../components/AppHeader';

// ── PACCHETTI LINGOTTI ────────────────────────────────────
const INGOT_PACKS = [
  { id:'i10',  ingots:10,  eur:0.99, popular:false, best:false  },
  { id:'i50',  ingots:50,  eur:3.99, popular:true,  best:false  },
  { id:'i70',  ingots:70,  eur:5.99, popular:false, best:false  },
  { id:'i100', ingots:100, eur:7.99, popular:false, best:true   },
];

// ── CATEGORIE ─────────────────────────────────────────────
const CATS = [
  { id:'all',     icon:'🏪', label:'All'         },
  { id:'ingots',  icon:'🪙', label:'Gold Packs'  },
  { id:'sub',     icon:'⭐', label:'No Ads / VIP' },
  { id:'premium', icon:'💎', label:'Premium'     },
  { id:'free',    icon:'🎁', label:'Free Credits' },
  { id:'emotion', icon:'🎭', label:'Emotions'    },
  { id:'board',   icon:'🎮', label:'Board'       },
];

export default function ShopScreen() {
  const { goBack, refreshCredits } = useContext(AppContext);
  const lang = useLang();
  const th   = getTheme();

  const [cat,        setCat]        = useState('all');
  const [ingots,     setIngots]     = useState(0);
  const [level,      setLevel]      = useState(1);
  const [noAds,      setNoAds]      = useState(false);
  const [vip,        setVip]        = useState(false);
  const [adLoading,  setAdLoading]  = useState(false);
  const [rewardedLeft, setRewardedLeft] = useState(20);
  const [showConfirm, setShowConfirm]   = useState(null); // { item, action }

  useEffect(() => { load(); }, []);

  const load = async () => {
    const p = await getPlayer();
    const i = await getIngots();
    setIngots(i||0);
    setLevel(p?.level||1);
    setNoAds(p?.noAds||false);
    setVip(p?.vip||false);
    const maxR = CONFIG.CREDITS_VIDEO_MAX_DAY || 20;
    setRewardedLeft(Math.max(0, maxR - getRewardedCount()));
  };

  const refreshIngots = async () => {
    setIngots(await getIngots());
  };

  // ── Acquisto lingotti (TODO: Google Play Billing) ────────
  const buyIngots = (pack) => {
    setShowConfirm({
      title: `${pack.ingots} 🪙 for €${pack.eur}`,
      desc:  'TODO: Google Play Billing integration.\nFor now we simulate the purchase.',
      onConfirm: async () => {
        setShowConfirm(null);
        await addIngots(pack.ingots);
        await refreshIngots();
        Alert.alert('✅ Purchased!', `${pack.ingots} ingots added to your account!`);
      },
    });
  };

  // ── Acquisto item con lingotti ────────────────────────────
  const buyWithIngots = (item) => {
    if (ingots < item.ingots) {
      Alert.alert('Not enough ingots 🪙',
        `You need ${item.ingots}🪙 but have ${ingots}🪙.\nBuy more ingots above!`);
      return;
    }
    setShowConfirm({
      title: `Buy ${item.label}`,
      desc:  `Cost: ${item.ingots} 🪙\nYou have: ${ingots} 🪙`,
      onConfirm: async () => {
        setShowConfirm(null);
        const ok = await spendIngots(item.ingots);
        if (ok) {
          await refreshIngots();
          Alert.alert('✅ Purchased!', `${item.label} unlocked!`);
        }
      },
    });
  };

  // ── Acquisto abbonamento (TODO: IAP) ─────────────────────
  const buySubscription = (label, price, desc) => {
    setShowConfirm({
      title: `${label} — €${price}`,
      desc:  `${desc}\n\nTODO: Google Play Billing / RevenueCat integration.`,
      onConfirm: () => setShowConfirm(null),
    });
  };

  // ── Watch Ad → +5 crediti ─────────────────────────────────
  const watchAdForCredits = async () => {
    if (!canWatchReward() || adLoading) return;
    setAdLoading(true);
    await showRewardedAd(async ({ credits: c }) => {
      await addCredits(c);
      await refreshCredits();
      setRewardedLeft(prev => Math.max(0, prev-1));
      Alert.alert('🎁 Reward!', `+${c} credits added!`);
    });
    setAdLoading(false);
  };

  // ── Restore Purchases (TODO: IAP) ─────────────────────────
  const restorePurchases = () => {
    Alert.alert('Restore Purchases',
      'TODO: Call Google Play Billing restorePurchases()\nThis will restore No Ads / VIP purchases.',
      [{ text: 'OK' }]
    );
  };

  const shopItems = CONFIG.SHOP_ITEMS || [];
  const filtered  = cat==='all' ? shopItems : shopItems.filter(i=>i.cat===cat);

  const showAll    = cat==='all';
  const showIngots = cat==='all' || cat==='ingots';
  const showSub    = cat==='all' || cat==='sub';
  const showFree   = cat==='all' || cat==='free';
  const showPrem   = cat==='all' || cat==='premium';

  return (
    <View style={[s.root, { backgroundColor:th.bg }]}>

      {/* MODAL CONFERMA */}
      <Modal visible={!!showConfirm} transparent animationType="fade">
        <View style={s.ov}>
          <View style={[s.dlg, { backgroundColor:th.bgCard, borderColor:th.border }]}>
            <Text style={[s.dlgTitle, { color:th.textPrimary }]}>{showConfirm?.title}</Text>
            <Text style={[s.dlgDesc,  { color:th.textMuted }]}>{showConfirm?.desc}</Text>
            <View style={{ flexDirection:'row', gap:10, marginTop:16 }}>
              <TouchableOpacity style={[s.dlgBtn, { backgroundColor:th.bgCard, borderColor:th.border }]}
                onPress={()=>setShowConfirm(null)}>
                <Text style={[s.dlgBtnTxt, { color:th.textMuted }]}>{t('cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.dlgBtn, { backgroundColor:th.accent }]}
                onPress={showConfirm?.onConfirm}>
                <Text style={[s.dlgBtnTxt, { color:'#fff' }]}>{t('confirm')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* HEADER */}
      <AppHeader title={t('shopTitle')} />

      {/* CATEGORIE */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.catScroll}>
        <View style={s.catRow}>
          {CATS.map(c => (
            <TouchableOpacity key={c.id}
              style={[s.catBtn, { borderColor:cat===c.id?th.accent:th.border, backgroundColor:cat===c.id?th.accentBg:th.bgCard }]}
              onPress={()=>setCat(c.id)}>
              <Text style={[s.catTxt, { color:cat===c.id?th.accent:th.textMuted }]}>{c.icon} {c.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      <ScrollView contentContainerStyle={s.content}>

        {/* ── SEZIONE LINGOTTI ── */}
        {showIngots && (
          <>
            <SectionTitle title={`🪙 ${t('goldIngots')}`} sub="Spend ingots to unlock items" th={th} />
            <View style={s.packGrid}>
              {INGOT_PACKS.map(pack => (
                <TouchableOpacity key={pack.id}
                  style={[s.packCard, { backgroundColor:th.bgCard, borderColor: pack.popular||pack.best?th.accent:th.border }]}
                  onPress={()=>buyIngots(pack)}>
                  {pack.popular && <Badge label={t('mostPopular')} color={th.accent} />}
                  {pack.best    && <Badge label={t('bestValue')}   color='#4caf50'   />}
                  <Text style={s.packIcon}>🪙</Text>
                  <Text style={[s.packIngots, { color:th.textPrimary }]}>{pack.ingots}</Text>
                  <Text style={[s.packLabel,  { color:th.textMuted }]}>ingots</Text>
                  <View style={[s.packBuyBtn, { backgroundColor:th.accent }]}>
                    <Text style={s.packBuyTxt}>€{pack.eur}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}

        {/* ── SEZIONE FREE CREDITS ── */}
        {showFree && (
          <>
            <SectionTitle title="🎁 Free Credits" sub="Earn credits for free" th={th} />
            <TouchableOpacity
              style={[s.freeCard, { backgroundColor:rewardedLeft>0?'rgba(76,175,80,0.1)':th.bgCard, borderColor:rewardedLeft>0?'#4caf50':th.border }]}
              onPress={watchAdForCredits}
              disabled={adLoading || rewardedLeft===0}>
              <Text style={{ fontSize:28, marginRight:14 }}>📺</Text>
              <View style={{ flex:1 }}>
                <Text style={[s.freeTitle, { color: rewardedLeft>0?'#4caf50':th.textMuted }]}>
                  {adLoading ? 'Loading ad…' : `Watch Ad → +${CONFIG.CREDITS_VIDEO_REWARD||5} credits`}
                </Text>
                <Text style={[s.freeSub, { color:th.textMuted }]}>
                  {rewardedLeft>0 ? `${rewardedLeft} remaining today` : 'Come back tomorrow'}
                </Text>
              </View>
              {rewardedLeft > 0 && <Text style={{ color:'#4caf50', fontSize:20 }}>▶</Text>}
            </TouchableOpacity>
          </>
        )}

        {/* ── SEZIONE ABBONAMENTI ── */}
        {showSub && (
          <>
            <SectionTitle title="⭐ Subscriptions" sub="Remove ads and get more" th={th} />

            {/* VIP */}
            <TouchableOpacity
              style={[s.subCard, { backgroundColor:th.accentBg, borderColor:th.accent }]}
              onPress={()=>buySubscription('VIP', '3.99/mo', t('vipDesc'))}>
              {vip && <Badge label="Active ✓" color='#4caf50' />}
              <Text style={{ fontSize:32, marginRight:14 }}>👑</Text>
              <View style={{ flex:1 }}>
                <Text style={[s.subName, { color:th.accent }]}>{t('vipMonthly')}</Text>
                <Text style={[s.subDesc, { color:th.textSecondary }]}>{t('vipDesc')}</Text>
              </View>
              <Text style={[s.subPrice, { color:th.accent }]}>€3.99/mo</Text>
            </TouchableOpacity>

            {/* No Ads permanente */}
            <TouchableOpacity
              style={[s.subCard, { backgroundColor:th.bgCard, borderColor:th.border }]}
              onPress={()=>buySubscription('No Ads (Permanent)', '3.99', 'Remove all ads forever. One-time purchase.')}>
              {noAds && <Badge label="Active ✓" color='#4caf50' />}
              <Text style={{ fontSize:32, marginRight:14 }}>🚫</Text>
              <View style={{ flex:1 }}>
                <Text style={[s.subName, { color:th.textPrimary }]}>{t('noAdsPermanent')}</Text>
                <Text style={[s.subDesc, { color:th.textMuted }]}>Remove all ads. Forever. One-time.</Text>
              </View>
              <Text style={[s.subPrice, { color:th.accent }]}>€3.99</Text>
            </TouchableOpacity>

            {/* No Ads mensile */}
            <TouchableOpacity
              style={[s.subCard, { backgroundColor:th.bgCard, borderColor:th.border }]}
              onPress={()=>buySubscription('No Ads (Monthly)', '0.99/mo', 'Remove all ads for 1 month.')}>
              <Text style={{ fontSize:32, marginRight:14 }}>⚡</Text>
              <View style={{ flex:1 }}>
                <Text style={[s.subName, { color:th.textPrimary }]}>{t('noAdsMonthly')}</Text>
                <Text style={[s.subDesc, { color:th.textMuted }]}>Remove all ads for 1 month.</Text>
              </View>
              <Text style={[s.subPrice, { color:th.accent }]}>€0.99/mo</Text>
            </TouchableOpacity>
          </>
        )}

        {/* ── SEZIONE PREMIUM ITEMS ── */}
        {showPrem && (
          <>
            <SectionTitle title="💎 Premium Items" sub="Buy with ingots" th={th} />
            {(CONFIG.SHOP_ITEMS||[]).filter(i=>i.cat==='emotion'||i.cat==='board'||i.cat==='avatar').map(item => {
              const locked = (item.unlockLevel||1) > level;
              return (
                <View key={item.id} style={[s.itemRow, { backgroundColor:th.bgCard, borderColor:th.border, opacity:locked?0.55:1 }]}>
                  <Text style={{ fontSize:28, marginRight:12 }}>{item.icon}</Text>
                  <View style={{ flex:1 }}>
                    <Text style={[s.itemName, { color:th.textPrimary }]}>{item.label}</Text>
                    <Text style={[s.itemDesc, { color:th.textMuted }]}>{item.desc}</Text>
                    {locked && <Text style={[s.lockTxt, { color:th.accent }]}>🔒 {t('unlockWithLevel',{n:item.unlockLevel||1})}</Text>}
                  </View>
                  <TouchableOpacity
                    disabled={locked}
                    style={[s.buyBtn, { backgroundColor:locked?th.border:th.accentBg, borderColor:locked?th.border:th.accent }]}
                    onPress={()=>buyWithIngots(item)}>
                    <Text style={[s.buyBtnTxt, { color:locked?th.textMuted:th.accent }]}>
                      {t('costIngots',{n:item.ingots})}
                    </Text>
                  </TouchableOpacity>
                </View>
              );
            })}
          </>
        )}

        {/* ── SEZIONE SBLOCCHI GRATUITI PER LIVELLO ── */}
        {showAll && (
          <>
            <SectionTitle title="🔓 Free Level Unlocks" sub="Unlock automatically as you level up" th={th} />
            {(CONFIG.PIECE_UNLOCKS||[]).filter(u=>u.level>level).slice(0,6).map(u => (
              <View key={u.id} style={[s.itemRow, { backgroundColor:th.bgCard, borderColor:th.border, opacity:0.6 }]}>
                <Text style={{ fontSize:26, marginRight:12 }}>{u.type==='photo'?'📸':u.value}</Text>
                <View style={{ flex:1 }}>
                  <Text style={[s.itemName, { color:th.textPrimary }]}>{u.label}</Text>
                  <Text style={[s.itemDesc, { color:th.accent }]}>{t('unlockWithLevel',{n:u.level})}</Text>
                </View>
                <Text style={{ fontSize:10, color:
                  u.rarity==='legendary'?'#f5a623':u.rarity==='epic'?'#b39ddb':
                  u.rarity==='rare'?'#00bfff':'#808098', fontWeight:'700'
                }}>{u.rarity}</Text>
              </View>
            ))}
          </>
        )}

        {/* RESTORE PURCHASES */}
        <TouchableOpacity style={[s.restoreBtn, { borderColor:th.border }]} onPress={restorePurchases}>
          <Text style={[s.restoreTxt, { color:th.textMuted }]}>🔄 Restore Purchases</Text>
        </TouchableOpacity>

        <Text style={[s.legal, { color:th.textHint }]}>
          Subscriptions auto-renew. Cancel anytime in Google Play.{'\n'}
          Prices may vary by region.
        </Text>

      </ScrollView>
    </View>
  );
}

// ── Componenti helper ─────────────────────────────────────
function SectionTitle({ title, sub, th }) {
  return (
    <View style={{ marginBottom:10, marginTop:6 }}>
      <Text style={{ fontSize:16, fontWeight:'800', color:th.textPrimary }}>{title}</Text>
      {sub && <Text style={{ fontSize:12, color:th.textMuted, marginTop:2 }}>{sub}</Text>}
    </View>
  );
}

function Badge({ label, color }) {
  return (
    <View style={{ position:'absolute', top:-8, right:8, zIndex:1, backgroundColor:color, borderRadius:8, paddingHorizontal:8, paddingVertical:2 }}>
      <Text style={{ color:'#fff', fontSize:9, fontWeight:'900' }}>{label}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  root:    { flex:1 },
  header:  { flexDirection:'row', alignItems:'center', paddingHorizontal:16, paddingVertical:14, borderBottomWidth:1 },
  backBtn: { width:40, height:40, justifyContent:'center' },
  backTxt: { fontSize:24 },
  title:   { flex:1, textAlign:'center', fontSize:20, fontWeight:'800' },
  balBadge:{ borderRadius:12, paddingHorizontal:10, paddingVertical:6, borderWidth:1 },
  balTxt:  { fontSize:14, fontWeight:'800' },
  catScroll:{ maxHeight:56 },
  catRow:  { flexDirection:'row', paddingHorizontal:12, gap:8, paddingVertical:8 },
  catBtn:  { paddingHorizontal:14, paddingVertical:9, borderRadius:20, borderWidth:1, flexDirection:'row', alignItems:'center', gap:5 },
  catTxt:  { fontSize:12, fontWeight:'600' },
  content: { padding:16, paddingBottom:60 },
  packGrid:{ flexDirection:'row', flexWrap:'wrap', gap:8, marginBottom:16, justifyContent:'space-between' },
  packCard:{ width:'48%', minWidth:140, borderRadius:16, padding:12, alignItems:'center', borderWidth:1.5, position:'relative', paddingTop:22 },
  packIcon:{ fontSize:28, marginBottom:6 },
  packIngots:{ fontSize:24, fontWeight:'900', marginBottom:2 },
  packLabel: { fontSize:11, marginBottom:8 },
  packBuyBtn:{ borderRadius:10, paddingHorizontal:16, paddingVertical:8, width:'100%', alignItems:'center' },
  packBuyTxt:{ color:'#fff', fontWeight:'900', fontSize:14 },
  freeCard:{ flexDirection:'row', alignItems:'center', borderRadius:14, padding:14, marginBottom:10, borderWidth:1.5 },
  freeTitle:{ fontSize:15, fontWeight:'700', marginBottom:2 },
  freeSub:  { fontSize:12 },
  subCard:  { flexDirection:'row', alignItems:'center', borderRadius:14, padding:14, marginBottom:10, borderWidth:1.5, position:'relative' },
  subName:  { fontSize:14, fontWeight:'800', marginBottom:2, flexWrap:'wrap' },
  subDesc:  { fontSize:12, lineHeight:18, flexWrap:'wrap' },
  subPrice: { fontSize:16, fontWeight:'900' },
  itemRow:  { flexDirection:'row', alignItems:'center', borderRadius:12, padding:12, marginBottom:8, borderWidth:1 },
  itemName: { fontSize:14, fontWeight:'700', marginBottom:2 },
  itemDesc: { fontSize:11, flexWrap:'wrap', lineHeight:16 },
  lockTxt:  { fontSize:10, marginTop:2 },
  buyBtn:   { borderRadius:10, paddingHorizontal:12, paddingVertical:7, borderWidth:1 },
  buyBtnTxt:{ fontSize:12, fontWeight:'800' },
  restoreBtn:{ borderRadius:12, padding:12, alignItems:'center', borderWidth:1, marginTop:12 },
  restoreTxt:{ fontSize:14, fontWeight:'600' },
  legal:    { fontSize:10, textAlign:'center', marginTop:16, lineHeight:16 },
  ov:       { flex:1, backgroundColor:'rgba(0,0,0,0.75)', justifyContent:'center', alignItems:'center', padding:20 },
  dlg:      { width:'100%', borderRadius:20, padding:24, borderWidth:1 },
  dlgTitle: { fontSize:18, fontWeight:'900', marginBottom:8 },
  dlgDesc:  { fontSize:14, lineHeight:20 },
  dlgBtn:   { flex:1, borderRadius:12, padding:12, alignItems:'center', borderWidth:1 },
  dlgBtnTxt:{ fontWeight:'700', fontSize:15 },
});
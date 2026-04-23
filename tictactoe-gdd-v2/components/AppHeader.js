// components/AppHeader.js
// Header riutilizzabile per tutte le schermate
// FIX S25 Ultra: padding-top per status bar su Android edge-to-edge
// SafeAreaView già gestisce iOS, su Android usiamo StatusBar.currentHeight

import React, { useContext, useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform, StatusBar } from 'react-native';
import { AppContext } from '../App';
import { theme as getTheme } from '../utils/theme';
import { getPlayer } from '../utils/storage';
import CONFIG from '../config';

// Altezza extra per Android (S25 Ultra e simili)
const ANDROID_TOP = Platform.OS === 'android' ? (StatusBar.currentHeight || 0) : 0;

export default function AppHeader({ title, onBack, rightBadge, noBorder, noProfile }) {
  const { navigate, goBack } = useContext(AppContext);
  const th = getTheme();
  const [player, setPlayer] = useState(null);

  useEffect(() => {
    let mounted = true;
    getPlayer().then(p => { if (mounted) setPlayer(p); }).catch(() => {});
    return () => { mounted = false; };
  }, []);

  const avatar     = CONFIG.AVATARS?.find(a => a.id === player?.avatarId) || { emoji: '👤' };
  const handleBack = onBack || goBack;

  return (
    <View style={[
      s.wrapper,
      {
        paddingTop:      ANDROID_TOP > 0 ? ANDROID_TOP + 4 : 0,
        backgroundColor: th.bg,
        borderBottomColor: noBorder ? 'transparent' : th.border,
        borderBottomWidth: noBorder ? 0 : 1,
      },
    ]}>
      <View style={s.inner}>
        {/* ← Indietro */}
        <TouchableOpacity
          style={s.backBtn}
          onPress={handleBack}
          hitSlop={{ top:12, bottom:12, left:12, right:12 }}>
          <Text style={[s.backTxt, { color: th.textPrimary }]}>←</Text>
        </TouchableOpacity>

        {/* Titolo */}
        <Text style={[s.title, { color: th.textPrimary }]} numberOfLines={1}>
          {title}
        </Text>

        {/* Destra: badge custom OPPURE profilo avatar OPPURE spazio vuoto */}
        {rightBadge ? (
          <View style={s.rightSlot}>{rightBadge}</View>
        ) : noProfile ? (
          <View style={s.rightSlot} />
        ) : (
          <TouchableOpacity
            style={[s.profileBtn, { backgroundColor: th.bgCard, borderColor: th.border }]}
            onPress={() => navigate('profile')}
            hitSlop={{ top:8, bottom:8, left:8, right:8 }}>
            <Text style={{ fontSize: 22 }}>
              {player?.facePhotoUri ? '📸' : avatar.emoji}
            </Text>
            <View style={[s.levelBadge, { backgroundColor: th.accent }]}>
              <Text style={s.levelTxt}>{player?.level || 1}</Text>
            </View>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  wrapper: {
    borderBottomWidth: 1,
  },
  inner: {
    flexDirection:     'row',
    alignItems:        'center',
    paddingHorizontal: 12,
    paddingVertical:   10,
    minHeight:         52,
  },
  backBtn: {
    width:          44,
    height:         44,
    justifyContent: 'center',
    alignItems:     'flex-start',
  },
  backTxt: { fontSize: 24, fontWeight: '600' },
  title: {
    flex:              1,
    textAlign:         'center',
    fontSize:          18,
    fontWeight:        '800',
    paddingHorizontal: 4,
  },
  rightSlot: {
    width:          44,
    height:         44,
    justifyContent: 'center',
    alignItems:     'flex-end',
  },
  profileBtn: {
    width:          40,
    height:         40,
    borderRadius:   20,
    borderWidth:    1.5,
    justifyContent: 'center',
    alignItems:     'center',
    position:       'relative',
  },
  levelBadge: {
    position:         'absolute',
    bottom: -3, right: -3,
    borderRadius:     8,
    minWidth:         16,
    height:           16,
    justifyContent:   'center',
    alignItems:       'center',
    paddingHorizontal: 3,
  },
  levelTxt: { color: '#000', fontWeight: '900', fontSize: 8 },
});
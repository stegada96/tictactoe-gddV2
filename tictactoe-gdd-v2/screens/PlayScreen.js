// screens/PlayScreen.js
// Flow: Home → PlayScreen → Variante → Modalità → Partita
//
// FIXES v2:
//  - Removed dead import of trySpendCredits from storage (doesn't exist there)
//  - credits=0 → navigate to shop directly instead of home with unread param
//  - Online (Beta): matchmaking simulation (1.5s delay + loading state)
//  - AI mode: only expand on press (no immediate navigation)

import React, { useState, useContext, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, FlatList, Dimensions, ActivityIndicator,
} from 'react-native';
import { AppContext } from '../App';
import CONFIG from '../config';
import { theme as getTheme } from '../utils/theme';
import { getStore } from '../utils/storage';
import VariantIcon from '../components/VariantIcon';
import AppHeader from '../components/AppHeader';

const { width } = Dimensions.get('window');
const CARD_W = (width - 48) / 2;

const VARIANT_INFO = {
  classic:     { emoji: '⭕', tagline: 'Il Tris originale',   difficulty: 1 },
  ultimate:    { emoji: '🔥', tagline: 'Tris nel Tris!',      difficulty: 3, badge: 'HOT'    },
  random:      { emoji: '🎲', tagline: 'A sorpresa',          difficulty: 2, badge: '×1.5 XP' },
  classic_4x4: { emoji: '🟦', tagline: 'Board più grande',    difficulty: 2 },
  classic_5x5: { emoji: '🟪', tagline: 'Sfida estrema',       difficulty: 3 },
  misere:      { emoji: '🔄', tagline: 'Vinci NON vincendo!', difficulty: 3, badge: 'TWIST'  },
  wild:        { emoji: '🃏', tagline: 'Scegli X o O',        difficulty: 2 },
  order_chaos: { emoji: '⚡', tagline: 'Ruoli asimmetrici',   difficulty: 4, badge: 'NEW'    },
};
const DIFFICULTY_LABEL = ['', '★', '★★', '★★★', '★★★★'];

const MODES = [
  {
    id: 'online', label: 'Online (Beta)', icon: '🌐', color: '#4F8EF7',
    subtitle: 'ELO · Matchmaking in arrivo', costKey: 'onlineCost',
  },
  {
    id: 'ai', label: 'vs AI', icon: '🤖', color: '#9b59b6',
    subtitle: 'Scegli difficoltà', costKey: 'creditCost',
    aiOptions: [
      { level: 'easy',   label: 'Facile',    icon: '🟢' },
      { level: 'medium', label: 'Medio',     icon: '🟡' },
      { level: 'hard',   label: 'Difficile', icon: '🔴' },
    ],
  },
  {
    id: 'local', label: 'Locale', icon: '👥', color: '#4caf50',
    subtitle: 'Passa il telefono', costKey: null,
  },
];

// ── Step 1: Variant Grid ───────────────────────────────────
function VariantStep({ onSelect, th }) {
  const variants = (CONFIG.VARIANT_ORDER || []).map(id => {
    const v = Object.values(CONFIG.GAME_VARIANTS || {}).find(x => x.id === id);
    return v ? { ...v, ...VARIANT_INFO[id] } : null;
  }).filter(Boolean);

  return (
    <View style={{ flex: 1 }}>
      <Text style={[ps.sectionTitle, { color: th.textPrimary }]}>🎮 Scegli la variante</Text>
      <Text style={[ps.sectionSub, { color: th.textMuted }]}>8 modalità uniche</Text>
      <FlatList
        data={variants}
        keyExtractor={item => item.id}
        numColumns={2}
        columnWrapperStyle={{ gap: 10 }}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24, gap: 10 }}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[ps.varCard, { backgroundColor: th.bgCard, borderColor: th.border, width: CARD_W }]}
            onPress={() => onSelect(item)}
            activeOpacity={0.8}
          >
            {item.badge && (
              <View style={[ps.badge, {
                backgroundColor: item.badge === 'HOT' ? '#E94560' : item.badge === '×1.5 XP' ? '#f5a623' : '#4F8EF7',
              }]}>
                <Text style={ps.badgeTxt}>{item.badge}</Text>
              </View>
            )}
            <Text style={ps.varEmoji}>{item.emoji || '🎮'}</Text>
            <Text style={[ps.varName, { color: th.textPrimary }]} numberOfLines={1}>{item.name}</Text>
            <Text style={[ps.varTagline, { color: th.textMuted }]} numberOfLines={1}>{item.tagline || ''}</Text>
            <Text style={[ps.varDiff, { color: th.accent }]}>{DIFFICULTY_LABEL[item.difficulty || 1]}</Text>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

// ── Step 2: Mode selection ─────────────────────────────────
function ModeStep({ variant, onSelect, onBack, credits, th, matchmaking }) {
  const [aiExpanded, setAiExpanded] = useState(false);
  const info = VARIANT_INFO[variant.id] || {};

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={ps.modeContainer}>
      {/* Variant recap */}
      <View style={[ps.varRecap, { backgroundColor: th.bgCard, borderColor: th.border }]}>
        <Text style={{ fontSize: 30 }}>{info.emoji || '🎮'}</Text>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={[ps.varRecapName, { color: th.textPrimary }]}>{variant.name}</Text>
          <Text style={[ps.varRecapTag, { color: th.textMuted }]}>{info.tagline || ''}</Text>
        </View>
        <TouchableOpacity onPress={onBack} style={ps.changeBtn}>
          <Text style={[ps.changeTxt, { color: th.accent }]}>Cambia</Text>
        </TouchableOpacity>
      </View>

      <Text style={[ps.sectionTitle, { color: th.textPrimary, marginTop: 16 }]}>⚙️ Modalità</Text>

      {/* Matchmaking loading overlay */}
      {matchmaking && (
        <View style={[ps.matchmakingBox, { backgroundColor: th.bgCard, borderColor: '#4F8EF7' }]}>
          <ActivityIndicator size="small" color="#4F8EF7" style={{ marginRight: 12 }} />
          <View style={{ flex: 1 }}>
            <Text style={[ps.matchmakingTitle, { color: '#4F8EF7' }]}>Ricerca avversario…</Text>
            <Text style={[ps.matchmakingSub, { color: th.textMuted }]}>
              Avversario AI in preparazione
            </Text>
          </View>
        </View>
      )}

      {!matchmaking && MODES.map(mode => {
        const cost     = mode.costKey ? (variant[mode.costKey] || 0) : 0;
        const canAfford = mode.id === 'local' || (credits || 0) >= cost;

        return (
          <View key={mode.id}>
            <TouchableOpacity
              style={[
                ps.modeCard,
                { backgroundColor: th.bgCard, borderColor: canAfford ? mode.color : th.border },
                !canAfford && ps.modeCardDim,
              ]}
              onPress={() => {
                if (mode.id === 'ai') { setAiExpanded(x => !x); return; }
                onSelect({ mode: mode.id, variantId: variant.id, aiLevel: 'medium' });
              }}
              activeOpacity={0.85}
            >
              <Text style={{ fontSize: 24, marginRight: 14 }}>{mode.icon}</Text>
              <View style={{ flex: 1 }}>
                <Text style={[ps.modeName, { color: canAfford ? mode.color : th.textMuted }]}>
                  {mode.label}
                </Text>
                <Text style={[ps.modeSub, { color: th.textMuted }]}>{mode.subtitle}</Text>
              </View>
              {cost > 0 && (
                <View style={[ps.pill, { backgroundColor: canAfford ? `${mode.color}22` : th.border }]}>
                  <Text style={[ps.pillTxt, { color: canAfford ? mode.color : th.textMuted }]}>
                    {cost} 💰
                  </Text>
                </View>
              )}
              {mode.id === 'local' && (
                <View style={[ps.pill, { backgroundColor: '#4caf5018' }]}>
                  <Text style={[ps.pillTxt, { color: '#4caf50' }]}>Gratis</Text>
                </View>
              )}
              {mode.id === 'ai' && (
                <Text style={{ color: th.textMuted, fontSize: 13 }}>{aiExpanded ? '▲' : '▼'}</Text>
              )}
            </TouchableOpacity>

            {mode.id === 'ai' && aiExpanded && (
              <View style={[ps.aiSub, { backgroundColor: th.bgCard, borderColor: mode.color }]}>
                {mode.aiOptions.map(opt => (
                  <TouchableOpacity
                    key={opt.level}
                    style={ps.aiOption}
                    onPress={() => onSelect({ mode: 'ai', variantId: variant.id, aiLevel: opt.level })}
                    activeOpacity={0.8}
                  >
                    <Text style={{ fontSize: 18, marginRight: 10 }}>{opt.icon}</Text>
                    <Text style={[ps.aiOptionLabel, { color: th.textPrimary }]}>{opt.label}</Text>
                    <Text style={{ color: th.textMuted, fontSize: 12 }}>→</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        );
      })}
    </ScrollView>
  );
}

// ── Main ───────────────────────────────────────────────────
export default function PlayScreen() {
  const { navigate, goBack, credits, trySpendCredits } = useContext(AppContext);
  const th = getTheme();
  const [step,            setStep]            = useState('variant');
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [matchmaking,     setMatchmaking]     = useState(false);

  const onVariantSelect = useCallback((variant) => {
    setSelectedVariant(variant);
    setStep('mode');
  }, []);

  const onModeSelect = useCallback(async ({ mode, variantId, aiLevel }) => {
    const variant = selectedVariant;
    if (!variant) return;

    const cost = mode === 'online' ? (variant.onlineCost || 4)
               : mode === 'ai'     ? (variant.creditCost || 0)
               : 0;

    // Credits check — open shop if broke
    if (cost > 0) {
      const ok = await trySpendCredits(cost);
      if (!ok) {
        navigate('shop');  // direct to shop, not home with unread param
        return;
      }
    }

    // Online (Beta): simulate matchmaking delay so it feels intentional
    if (mode === 'online') {
      setMatchmaking(true);
      await new Promise(r => setTimeout(r, 1400)); // 1.4s simulated search
      setMatchmaking(false);
      // Fallback: always goes to AI (no real backend yet)
    }

    const s = getStore();
    navigate('game', {
      variantId,
      mode,
      aiLevel: aiLevel || 'medium',
      p1Name:  s?.player?.name    || 'Tu',
      p2Name:  mode === 'ai' ? 'AI' : mode === 'local' ? 'Giocatore 2' : 'Avversario',
      pieceP1: s?.player?.selectedPieceX || 'X',
      pieceP2: (s?.player?.selectedPieceX || 'X') === 'X' ? 'O' : 'X',
    });
  }, [selectedVariant, trySpendCredits, navigate]);

  return (
    <View style={[ps.root, { backgroundColor: th.bg }]}>
      <AppHeader
        title={step === 'variant' ? '🎮 Gioca' : '⚙️ Modalità'}
        onBack={step === 'variant' ? goBack : () => { setStep('variant'); setMatchmaking(false); }}
      />
      {step === 'variant' && <VariantStep onSelect={onVariantSelect} th={th} />}
      {step === 'mode' && selectedVariant && (
        <ModeStep
          variant={selectedVariant}
          onSelect={onModeSelect}
          onBack={() => setStep('variant')}
          credits={credits || 0}
          th={th}
          matchmaking={matchmaking}
        />
      )}
    </View>
  );
}

const ps = StyleSheet.create({
  root:             { flex: 1 },
  sectionTitle:     { fontSize: 18, fontWeight: '900', marginHorizontal: 16, marginTop: 12, marginBottom: 4 },
  sectionSub:       { fontSize: 13, marginHorizontal: 16, marginBottom: 14 },
  varCard:          { borderRadius: 16, padding: 14, borderWidth: 1.5, alignItems: 'center', position: 'relative', overflow: 'hidden' },
  varEmoji:         { fontSize: 34, marginBottom: 6 },
  varName:          { fontSize: 14, fontWeight: '900', marginBottom: 2, textAlign: 'center' },
  varTagline:       { fontSize: 11, textAlign: 'center', marginBottom: 6 },
  varDiff:          { fontSize: 12 },
  badge:            { position: 'absolute', top: 8, right: 8, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  badgeTxt:         { color: '#fff', fontSize: 9, fontWeight: '900' },
  modeContainer:    { padding: 16, paddingBottom: 40, gap: 10 },
  varRecap:         { flexDirection: 'row', alignItems: 'center', borderRadius: 14, padding: 14, borderWidth: 1, marginBottom: 4 },
  varRecapName:     { fontSize: 16, fontWeight: '900' },
  varRecapTag:      { fontSize: 12, marginTop: 2 },
  changeBtn:        { paddingHorizontal: 10, paddingVertical: 6 },
  changeTxt:        { fontSize: 13, fontWeight: '700' },
  modeCard:         { flexDirection: 'row', alignItems: 'center', borderRadius: 16, padding: 16, borderWidth: 2, marginBottom: 2 },
  modeCardDim:      { opacity: 0.5 },
  modeName:         { fontSize: 17, fontWeight: '900', marginBottom: 2 },
  modeSub:          { fontSize: 12 },
  pill:             { borderRadius: 10, paddingHorizontal: 10, paddingVertical: 5 },
  pillTxt:          { fontSize: 13, fontWeight: '700' },
  aiSub:            { borderRadius: 12, borderWidth: 1.5, marginBottom: 4, overflow: 'hidden' },
  aiOption:         { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14 },
  aiOptionLabel:    { flex: 1, fontSize: 15, fontWeight: '700' },
  matchmakingBox:   { flexDirection: 'row', alignItems: 'center', borderRadius: 14, padding: 16, borderWidth: 1.5 },
  matchmakingTitle: { fontSize: 15, fontWeight: '800', marginBottom: 2 },
  matchmakingSub:   { fontSize: 12 },
});
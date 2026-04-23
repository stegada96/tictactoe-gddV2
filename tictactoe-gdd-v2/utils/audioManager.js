// utils/audioManager.js — Piano audio completo TicTacToe GDD
//
// PIANO AUDIO — 17 eventi sonori
// FILE OBBLIGATORI (require statico — Metro li verifica a compile-time):
//   Victory.mp3  Defeat.mp3  Draw.mp3  RandomSpin.mp3
//
// FILE OPZIONALI (se assenti → fallback vibrazione):
//   LevelUp.mp3  ButtonTap.mp3  PiecePlace.mp3  Achievement.mp3
//   MissionComplete.mp3  StreakClaim.mp3  StreakMax.mp3
//   CalendarClaim.mp3  ChestOpen.mp3  ComebackBonus.mp3
//   AdReward.mp3  Purchase.mp3  Error.mp3  Share.mp3  Startup.mp3
//
// HAPTICS MAP:
//   win:[0,60,30,100,30,80]  lose:[0,400]  draw:[0,70]
//   levelup:[0,80,50,120,50,200]  tap:[0,20]  move:[0,25]
//   achieve:[0,50,30,80]  random:[0,40,20,60,20,40]
//   streak:[0,40,30,80]  streakMax:[0,60,40,120,40,180,40,200]
//   chest:[0,80,50,200]  comeback:[0,50,30,80,30,120]
//   adreward:[0,60]  error:[0,300]  purchase:[0,60,40,120]

import { Vibration } from 'react-native';

const ENABLE_AUDIO = true;
let _settings  = { soundFX: true, vibration: true };
let _sounds    = {};
let _spinSound = null;
let _avModule  = null;

export const setAudioSettings = (s) => { _settings = { ..._settings, ...s }; };
export const getAudioSettings = () => ({ ..._settings });

const VIB = {
  win:       [0, 60, 30, 100, 30, 80],
  lose:      [0, 400],
  draw:      [0, 70],
  levelup:   [0, 80, 50, 120, 50, 200],
  tap:       [0, 20],
  move:      [0, 25],
  achieve:   [0, 50, 30, 80],
  random:    [0, 40, 20, 60, 20, 40],
  streak:    [0, 40, 30, 80],
  streakMax: [0, 60, 40, 120, 40, 180, 40, 200],
  chest:     [0, 80, 50, 200],
  comeback:  [0, 50, 30, 80, 30, 120],
  adreward:  [0, 60],
  error:     [0, 300],
  purchase:  [0, 60, 40, 120],
  share:     [0, 30],
};

const vib = (name) => {
  if (!_settings.vibration) return;
  Vibration.vibrate(VIB[name] || VIB.tap);
};

const loadAV = async () => {
  if (_avModule !== null) return _avModule;
  try { _avModule = await import('expo-av'); return _avModule; }
  catch (e) { _avModule = false; return null; }
};

// Asset map — file obbligatori: require statico
// FILE OPZIONALI → null → Metro non li cerca
const ASSETS = {
  win:       () => require('../assets/sounds/Victory.mp3'),
  lose:      () => require('../assets/sounds/Defeat.mp3'),
  draw:      () => require('../assets/sounds/Draw.mp3'),
  random:    () => require('../assets/sounds/RandomSpin.mp3'),
  levelup:   () => null, tap:      () => null, move:    () => null,
  achieve:   () => null, mission:  () => null, streak:  () => null,
  streakMax: () => null, calendar: () => null, chest:   () => null,
  comeback:  () => null, adreward: () => null, purchase:() => null,
  error:     () => null, share:    () => null, startup: () => null,
};

const playInternal = async (name, loop = false) => {
  if (!_settings.soundFX || !ENABLE_AUDIO) return null;
  const av = await loadAV();
  if (!av) { vib(name); return null; }
  try {
    if (_sounds[name] && !loop) {
      try { await _sounds[name].replayAsync(); return _sounds[name]; }
      catch (e) { /* stale, ricrea */ }
    }
    await av.Audio.setAudioModeAsync({ playsInSilentModeIOS: true });
    const factory = ASSETS[name];
    const file = factory ? factory() : null;
    if (!file) { vib(name); return null; }
    const { sound } = await av.Audio.Sound.createAsync(file, {
      shouldPlay: true, isLooping: loop, volume: 0.85,
    });
    if (!loop) {
      _sounds[name] = sound;
      sound.setOnPlaybackStatusUpdate((st) => {
        if (st.didJustFinish) {
          sound.unloadAsync().catch(() => {});
          if (_sounds[name] === sound) delete _sounds[name];
        }
      });
    }
    return sound;
  } catch (e) { vib(name); return null; }
};

// ── Gameplay
export const playWin  = async () => { vib('win');  await playInternal('win'); };
export const playLose = async () => { vib('lose'); await playInternal('lose'); };
export const playDraw = async () => { vib('draw'); await playInternal('draw'); };
export const playMove = async () => { vib('move'); await playInternal('move'); };

// ── Progressione
export const playLevelUp         = async () => { vib('levelup'); await playInternal('levelup'); };
export const playAchievement     = async () => { vib('achieve'); await playInternal('achieve'); };
export const playMissionComplete = async () => { vib('streak');  await playInternal('mission'); };

// ── Streak e daily
export const playStreakClaim = async () => { vib('streak');    await playInternal('streak'); };
export const playStreakMax   = async () => { vib('streakMax'); await playInternal('streakMax'); };

// ── Reward calendar e chest
export const playCalendarClaim = async () => { vib('streak'); await playInternal('calendar'); };
export const playChestOpen     = async () => { vib('chest');  await playInternal('chest'); };

// ── Comeback
export const playComebackBonus = async () => { vib('comeback'); await playInternal('comeback'); };

// ── Ad e monetizzazione
export const playAdReward = async () => { vib('adreward'); await playInternal('adreward'); };
export const playPurchase = async () => { vib('purchase'); await playInternal('purchase'); };

// ── UI
export const playTap     = async () => { vib('tap');   await playInternal('tap'); };
export const playError   = async () => { vib('error'); await playInternal('error'); };
export const playShare   = async () => { vib('share'); await playInternal('share'); };
export const playStartup = async () => { await playInternal('startup'); };

// ── Random spin (loop)
export const startRandomSpin = async () => {
  if (_spinSound) return;
  try { _spinSound = await playInternal('random', true); } catch (e) {}
};
export const stopRandomSpin = async () => {
  if (!_spinSound) return;
  const s = _spinSound; _spinSound = null;
  try { await s.stopAsync(); await s.unloadAsync(); } catch (e) {}
};

// ── Cleanup globale
export const unloadAll = async () => {
  await stopRandomSpin();
  const ss = Object.values(_sounds); _sounds = {};
  await Promise.all(ss.map(async s => {
    try { await s.stopAsync(); await s.unloadAsync(); } catch (e) {}
  }));
};
// services/auth.js
// Auth: Guest (active) + Google stub + Apple stub
// FIX: stubs return null instead of throwing — safe for callers without try/catch

import integrations from '../config/integrations';
import { getStore, savePlayer } from '../utils/storage';
import { log } from '../utils/debug';

export const AUTH_TYPES = { GUEST: 'guest', GOOGLE: 'google', APPLE: 'apple' };

let _currentUser = null;

export const getCurrentUser  = () => _currentUser;
export const isAuthenticated = () => _currentUser !== null;
export const isRealAccount   = () => _currentUser !== null && _currentUser.type !== AUTH_TYPES.GUEST;

// ── GUEST (Fase 1 — always works) ─────────────────────────
export const signInAsGuest = async () => {
  const s = getStore();
  const existingId = s?.player?.id;
  const guestId = existingId?.startsWith('guest_')
    ? existingId
    : `guest_${Date.now()}_${Math.floor(Math.random() * 100000)}`;
  _currentUser = {
    type: AUTH_TYPES.GUEST,
    id:   guestId,
    name: s?.player?.name || 'Giocatore',
    email: null, photo: null,
  };
  log('INFO', 'Auth', `Guest: ${guestId}`);
  return _currentUser;
};

// ── GOOGLE (Fase 2 stub — returns null, never throws) ─────
export const signInWithGoogle = async () => {
  if (!integrations.GOOGLE_LOGIN_ENABLED) {
    log('WARN', 'Auth', 'Google Login not enabled');
    return null; // safe — caller checks null
  }
  // Fase 2:
  // const { GoogleSignin } = require('@react-native-google-signin/google-signin');
  // GoogleSignin.configure({ webClientId: integrations.GOOGLE_LOGIN_CLIENT_ID });
  // const { user } = await GoogleSignin.signIn();
  // const credential = auth.GoogleAuthProvider.credential(user.idToken);
  // const fb = await auth().signInWithCredential(credential);
  // _currentUser = { type: AUTH_TYPES.GOOGLE, id: fb.uid, ... };
  // return _currentUser;
  log('WARN', 'Auth', 'Google Login: implement in Phase 2');
  return null;
};

// ── APPLE (Fase 2 stub — returns null, never throws) ──────
// Required by App Store Guideline 4.8 if offering other social login
export const signInWithApple = async () => {
  if (!integrations.APPLE_LOGIN_ENABLED) {
    log('WARN', 'Auth', 'Apple Login not enabled');
    return null; // safe — caller checks null
  }
  // Fase 2:
  // import * as AppleAuth from 'expo-apple-authentication';
  // const cred = await AppleAuth.signInAsync({ ... });
  // const appleCredential = auth.AppleAuthProvider.credential(cred.identityToken, cred.nonce);
  // const fb = await auth().signInWithCredential(appleCredential);
  // _currentUser = { type: AUTH_TYPES.APPLE, id: fb.uid, ... };
  // return _currentUser;
  log('WARN', 'Auth', 'Apple Login: implement in Phase 2');
  return null;
};

// ── SIGN OUT ───────────────────────────────────────────────
export const signOut = async () => {
  if (!isRealAccount()) return;
  // Fase 2: await auth().signOut();
  _currentUser = null;
};

// ── DELETE ACCOUNT ─────────────────────────────────────────
// Required: App Store 5.1.1 + Google Play policy
export const deleteAccount = async () => {
  try {
    await savePlayer({
      id: `guest_${Date.now()}`, name: null, level: 1, xp: 0,
      onboardingDone: false, birthDate: null, birthdayActive: false,
      noAds: false, noAdsPermanent: false, noAdsMonth: false,
    });
  } catch (e) {
    log('WARN', 'Auth', `deleteAccount error: ${e.message}`);
  }
  // Fase 2: await auth().currentUser?.delete();
  _currentUser = null;
};

// ── INIT (called by bootstrap) ─────────────────────────────
export const initAuth = async () => {
  // Fase 1: always guest. Fase 2: check Firebase session first.
  if (integrations.FIREBASE_ENABLED) {
    // const fb = auth().currentUser;
    // if (fb) { _currentUser = { type: ..., id: fb.uid }; return _currentUser; }
  }
  return await signInAsGuest();
};

export default { AUTH_TYPES, getCurrentUser, isAuthenticated, isRealAccount,
  signInAsGuest, signInWithGoogle, signInWithApple, signOut, deleteAccount, initAuth };
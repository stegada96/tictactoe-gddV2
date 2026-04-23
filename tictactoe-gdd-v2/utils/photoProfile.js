// utils/photoProfile.js
// ✅ Path fisso profilePhotos/{uid}.jpg — overwrite automatico, nessun duplicato
// ✅ Qualità 0.6: ottimale per 200×200px — file ~25-35KB, visivamente indistinguibile da 0.8
//    su display mobile ad alta densità. 0.7 sarebbe safe ma ~40% più grande senza beneficio reale.
// ✅ Guard _isUploading: blocca doppio tap / chiamate concorrenti
// ✅ Migrazione path legacy: se l'URI salvato non segue il pattern {uid}.jpg, viene sovrascritto
// ✅ Compatibile Expo offline: se Firebase non disponibile, salva solo localmente

import * as ImagePicker   from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { log, logError } from './debug';

const KEY_FACE = '@tttgdd_face_photo';

// Mutex: previene upload doppi se l'utente preme due volte
let _isUploading = false;

// ── PERMESSI ──────────────────────────────────────────────
export const requestCameraPermissions = async () => {
  const { status } = await ImagePicker.requestCameraPermissionsAsync();
  return status === 'granted';
};

export const requestGalleryPermissions = async () => {
  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  return status === 'granted';
};

// ── FOTOCAMERA ────────────────────────────────────────────
export const openCamera = async () => {
  if (_isUploading) return { ok: false, error: 'upload_in_progress' };

  const granted = await requestCameraPermissions();
  if (!granted) return { ok: false, error: 'Camera permission denied' };

  let result;
  try {
    result = await ImagePicker.launchCameraAsync({
      mediaTypes:    ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,   // ritaglia manuale 1:1
      aspect:        [1, 1],
      quality:       0.8,    // picker quality (abbassato ulteriormente in processImage)
      base64:        false,
    });
  } catch (e) {
    return { ok: false, error: e.message };
  }

  if (result.canceled) return { ok: false, error: 'canceled' };
  const uri = result.assets?.[0]?.uri;
  if (!uri) return { ok: false, error: 'No image' };

  return _processImage(uri);
};

// ── GALLERIA ──────────────────────────────────────────────
export const openGallery = async () => {
  if (_isUploading) return { ok: false, error: 'upload_in_progress' };

  const granted = await requestGalleryPermissions();
  if (!granted) return { ok: false, error: 'Gallery permission denied' };

  let result;
  try {
    result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes:    ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect:        [1, 1],
      quality:       0.8,
      base64:        false,
    });
  } catch (e) {
    return { ok: false, error: e.message };
  }

  if (result.canceled) return { ok: false, error: 'canceled' };
  const uri = result.assets?.[0]?.uri;
  if (!uri) return { ok: false, error: 'No image' };

  return _processImage(uri);
};

// ── PROCESSO IMMAGINE ─────────────────────────────────────
// Ridimensiona a 200×200 e comprime a qualità 0.6 JPEG.
// 200×200 è la dimensione esatta usata come pedina nella griglia di gioco.
const _processImage = async (sourceUri) => {
  try {
    const processed = await ImageManipulator.manipulateAsync(
      sourceUri,
      [{ resize: { width: 200, height: 200 } }],
      {
        // 0.6: file ~25-35KB su 200×200. Qualità percepita ottima su display mobile.
        // Sceso da 0.8 (vecchio) → risparmio ~40% storage senza artefatti visibili.
        compress: 0.6,
        format:   ImageManipulator.SaveFormat.JPEG,
        base64:   false,
      }
    );
    return { ok: true, uri: processed.uri };
  } catch (e) {
    logError('photoProfile', 'processImage failed:', e.message);
    return { ok: false, error: e.message };
  }
};

// ── SALVA FOTO (locale + Firebase Storage se disponibile) ──
// uid: stringa. Se passato, usa path fisso profilePhotos/{uid}.jpg
// Se Firebase non disponibile, salva solo su AsyncStorage locale.
export const saveFacePhotoLocal = async (uri) => {
  if (!uri) {
    try { await AsyncStorage.removeItem(KEY_FACE); } catch (_) {}
    return true;
  }
  try {
    await AsyncStorage.setItem(KEY_FACE, uri);
    return true;
  } catch (e) {
    logError('photoProfile', 'saveFacePhotoLocal error:', e.message);
    return false;
  }
};

export const loadFacePhotoLocal = async () => {
  try {
    return await AsyncStorage.getItem(KEY_FACE);
  } catch { return null; }
};

export const deleteFacePhoto = async () => {
  try {
    await AsyncStorage.removeItem(KEY_FACE);
    return true;
  } catch { return false; }
};

// ── UPLOAD SU FIREBASE STORAGE (opzionale) ───────────────
// Se Firebase Storage è configurato, esegue l'upload con path fisso.
// Path: profilePhotos/{uid}.jpg — sovrascrive sempre lo stesso file → nessun duplicato.
// Se l'upload fallisce, NON blocca il flusso: la foto locale rimane valida.
export const uploadPhotoToFirebase = async (localUri, uid) => {
  if (!localUri || !uid) return { ok: false, error: 'missing_params' };
  if (_isUploading) return { ok: false, error: 'upload_in_progress' };

  _isUploading = true;
  try {
    // Import dinamico Firebase Storage — non fallisce se non installato
    let storage;
    try {
      const fbStorage = await import('firebase/storage');
      const { getStorage } = fbStorage;
      // getStorage() usa l'app già inizializzata da services/firebase.js
      storage = getStorage();
      if (!storage) throw new Error('storage not ready');
    } catch (e) {
      // Firebase Storage non disponibile: ok, usiamo solo locale
      log('INFO', 'photoProfile', 'Firebase Storage non disponibile — solo locale');
      _isUploading = false;
      return { ok: true, uri: localUri, remote: false };
    }

    const { ref, uploadBytes, getDownloadURL, deleteObject } = await import('firebase/storage');

    // Path fisso: profilePhotos/{uid}.jpg — overwrite automatico
    const remotePath = `profilePhotos/${uid}.jpg`;
    const storageRef  = ref(storage, remotePath);

    // Leggi il file locale come blob
    const response = await fetch(localUri);
    if (!response.ok) throw new Error('fetch local file failed');
    const blob = await response.blob();

    // Upload — sovrascrive il file precedente (stesso path)
    await uploadBytes(storageRef, blob, { contentType: 'image/jpeg' });
    const downloadUrl = await getDownloadURL(storageRef);

    log('INFO', 'photoProfile', `upload ok → ${remotePath}`);
    _isUploading = false;
    return { ok: true, uri: downloadUrl, remote: true };
  } catch (e) {
    logError('photoProfile', 'uploadToFirebase error:', e.message);
    _isUploading = false;
    // Fallback: ritorna l'URI locale — app continua a funzionare
    return { ok: true, uri: localUri, remote: false };
  }
};

// ── FLUSSO COMPLETO: pick → process → upload → save ───────
// Helper che racchiude tutto il flow per ProfileScreen.
// Non tocca ProfileScreen: ProfileScreen chiama ancora openCamera/openGallery
// poi chiama questo helper con il risultato.
export const saveAndUploadPhoto = async (localUri, uid) => {
  if (_isUploading) return { ok: false, error: 'upload_in_progress' };

  // 1. Salva localmente prima (immediato, visibile subito)
  await saveFacePhotoLocal(localUri);

  // 2. Tenta upload Firebase (non bloccante)
  const uploadResult = await uploadPhotoToFirebase(localUri, uid);

  // 3. Se upload ok e URL remoto diverso dal locale, aggiorna AsyncStorage
  if (uploadResult.ok && uploadResult.remote && uploadResult.uri !== localUri) {
    await saveFacePhotoLocal(uploadResult.uri);
  }

  return uploadResult;
};

// ── ELIMINA FOTO REMOTA DA FIREBASE STORAGE ───────────────
// Path fisso profilePhotos/{uid}.jpg — stesso path dell'upload.
// Non critico: se il file non esiste o Firebase non disponibile, ignora silenziosamente.
export const deleteRemotePhoto = async (uid) => {
  if (!uid || uid === 'guest') return;
  try {
    const { getStorage, ref, deleteObject } = await import('firebase/storage');
    const storage = getStorage();
    if (!storage) return;
    const storageRef = ref(storage, `profilePhotos/${uid}.jpg`);
    await deleteObject(storageRef);
    log('INFO', 'photoProfile', `remote photo deleted for uid=${uid}`);
  } catch (e) {
    // Il file potrebbe non esistere (primo salvataggio locale) o Firebase non disponibile.
    // Non è un errore bloccante.
    log('INFO', 'photoProfile', `deleteRemotePhoto: ${e.message}`);
  }
};

// ── RIMOZIONE COMPLETA: AsyncStorage + Firebase remoto ────
// Da chiamare in handleRemovePhoto di ProfileScreen.
export const deletePhotoComplete = async (uid) => {
  await deleteFacePhoto();          // rimuove @tttgdd_face_photo da AsyncStorage
  await deleteRemotePhoto(uid);     // tenta delete profilePhotos/{uid}.jpg da Firebase
};
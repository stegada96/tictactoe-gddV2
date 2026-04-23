// utils/moderation.js
// ✅ Filtro parole vietate con leet speak (p0rc0, v4ff4n, ecc.)
// ✅ Controllo unicità nome (mock locale, Firebase in produzione)
// ✅ Generazione nome sostitutivo automatico

// ── PAROLE VIETATE (tutte le 7 lingue) ───────────────────
const BANNED_WORDS = [
  // IT
  'cazzo','vaffanculo','stronzo','minchia','fanculo','merda','puttana',
  'coglione','porco','porcod','porcoio','vaffan','figlio di puttana',
  'bastardo','troia','bagascia','culattone','recchione',
  // EN
  'fuck','shit','bitch','bastard','cunt','dick','cock','pussy','ass',
  'nigger','nigga','faggot','retard','slut','whore','kike','spic','chink',
  'asshole','motherfucker','goddamn',
  // ES
  'puta','mierda','pendejo','cabron','joder','cono','maricón','chingada',
  'coño','polla','gilipollas','capullo',
  // DE
  'scheiße','arschloch','hurensohn','wichser','fotze','dummkopf',
  'scheiß','wichse','vollpfosten',
  // FR
  'merde','putain','salope','connard','encule','fils de pute','con',
  'batard','nique','couille',
  // PT
  'porra','caralho','buceta','viado','filho da puta','merda','puta',
  'babaca','piranha','safado',
  // RU
  'suka','blyad','pizda','huy','pizdets','idi nahuy','ebat','chert',
  // UNIVERSALI
  'nazi','hitler','jihad','isis','kill yourself','kys','go die',
];

// ── NORMALIZZAZIONE LEET SPEAK ────────────────────────────
const normalizeLeet = (s) =>
  s.toLowerCase()
   .replace(/4/g, 'a').replace(/3/g, 'e')
   .replace(/1|!/g, 'i').replace(/0/g, 'o')
   .replace(/5|\$/g, 's').replace(/7/g, 't')
   .replace(/ph/g, 'f').replace(/@/g, 'a')
   .replace(/\|/g, 'i').replace(/8/g, 'b')
   .replace(/\+/g, 't').replace(/9/g, 'g')
   .replace(/[\s\-\._]/g, ''); // rimuove separatori

// ── CONTROLLA PAROLA VIETATA ──────────────────────────────
export const hasBadWord = (input) => {
  if (!input || typeof input !== 'string') return false;
  const norm = normalizeLeet(input);
  return BANNED_WORDS.some(word => {
    const normWord = normalizeLeet(word);
    return norm.includes(normWord);
  });
};

// ── VALIDA USERNAME ───────────────────────────────────────
// Restituisce null se OK, stringa errore se non valido
export const validateUsername = (name) => {
  if (!name || typeof name !== 'string') return 'Username required';
  const trimmed = name.trim();
  if (trimmed.length < 3)   return 'Username too short (min 3)';
  if (trimmed.length > 20)  return 'Username too long (max 20)';
  if (!/^[a-zA-Z0-9_\-\.]+$/.test(trimmed)) return 'Only letters, numbers, _ - . allowed';
  if (hasBadWord(trimmed))  return 'This name is not allowed. Choose another.';
  return null;
};

// ── GENERA NOME SOSTITUTIVO ───────────────────────────────
const ADJECTIVES = [
  'Swift','Bold','Clever','Sharp','Brave','Calm','Quick','Smart',
  'Cool','Fast','Mighty','Lucky','Fierce','Noble','Epic','Dark',
];
const NOUNS = [
  'Player','Gamer','Hero','Star','Wolf','Fox','Eagle','Tiger',
  'Knight','Ninja','Wizard','Dragon','Phoenix','Ace','Titan',
];

export const generateFallbackName = () => {
  const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)];
  const num  = Math.floor(Math.random() * 9000 + 1000);
  return `${adj}${noun}${num}`;
};

// ── UNICITÀ NOME ──────────────────────────────────────────
// In produzione → controlla Firestore
// Adesso → lista locale in AsyncStorage dei nomi usati
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY_NAMES = '@tttgdd_used_names';

export const isNameTaken = async (name) => {
  try {
    const raw   = await AsyncStorage.getItem(KEY_NAMES);
    const names = raw ? JSON.parse(raw) : [];
    return names.includes(name.toLowerCase().trim());
  } catch { return false; }
};

export const registerName = async (name) => {
  try {
    const raw   = await AsyncStorage.getItem(KEY_NAMES);
    const names = raw ? JSON.parse(raw) : [];
    const norm  = name.toLowerCase().trim();
    if (!names.includes(norm)) {
      names.push(norm);
      await AsyncStorage.setItem(KEY_NAMES, JSON.stringify(names));
    }
  } catch {}
};

// ── FULL VALIDATION (con unicità) ────────────────────────
export const validateAndCheckName = async (name) => {
  // 1. Validazione base
  const baseErr = validateUsername(name);
  if (baseErr) return { ok:false, error:baseErr, suggestion: generateFallbackName() };

  // 2. Unicità
  const taken = await isNameTaken(name);
  if (taken) {
    return {
      ok:       false,
      error:    'This name is already taken. Try another.',
      suggestion: generateFallbackName(),
    };
  }

  return { ok:true };
};
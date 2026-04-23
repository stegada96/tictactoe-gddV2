// utils/theme.js — sistema tema completo Dark / Light / Auto
import { Appearance } from 'react-native';

export const THEMES = {
  dark: {
    // Sfondi
    bg:           '#0a0a15',
    bgCard:       '#13132a',
    bgCardAlt:    '#0d0d22',
    bgInput:      '#0f0f20',
    bgOverlay:    'rgba(0,0,0,0.82)',
    bgDialog:     '#13132a',
    // Testi
    textPrimary:  '#e0e0f0',
    textSecondary:'#a0a0c0',
    textMuted:    '#606080',
    textHint:     '#303050',
    // Bordi
    border:       '#2a2a4a',
    borderAlt:    '#1e1e3a',
    borderLight:  '#3a3a5a',
    // Brand
    accent:       '#f5a623',
    accentBg:     'rgba(245,166,35,0.15)',
    danger:       '#e94560',
    dangerBg:     'rgba(233,69,96,0.15)',
    success:      '#4caf50',
    successBg:    'rgba(76,175,80,0.15)',
    info:         '#00bfff',
    infoBg:       'rgba(0,191,255,0.15)',
    // Pedine (scuro: X rossa, O azzurra)
    pieceX:       '#e94560',
    pieceO:       '#00bfff',
    pieceXGlow:   'rgba(233,69,96,0.35)',
    pieceOGlow:   'rgba(0,191,255,0.35)',
    // Board
    boardBg:      '#111128',
    boardBorder:  '#2a2a50',
    boardActive:  '#f5a623',
    boardWin:     '#e94560',
    cellBg:       '#111128',
    cellBgCan:    '#141430',
    cellBgWin:    'rgba(245,166,35,0.22)',
    cellBgLast:   'rgba(245,166,35,0.10)',
    // Leghe
    bronze:  '#cd7f32',
    silver:  '#c0c0c0',
    gold:    '#ffd700',
    diamond: '#00d2ff',
    legend:  '#e94560',
    // Status bar
    statusBar: 'light-content',
  },

  light: {
    bg:           '#f4f4f8',
    bgCard:       '#ffffff',
    bgCardAlt:    '#ededf5',
    bgInput:      '#f8f8fc',
    bgOverlay:    'rgba(0,0,0,0.50)',
    bgDialog:     '#ffffff',
    textPrimary:  '#0a0a20',
    textSecondary:'#404060',
    textMuted:    '#808098',
    textHint:     '#c0c0d0',
    border:       '#dcdce8',
    borderAlt:    '#e8e8f0',
    borderLight:  '#c8c8d8',
    accent:       '#d48800',
    accentBg:     'rgba(212,136,0,0.10)',
    danger:       '#c41230',
    dangerBg:     'rgba(196,18,48,0.08)',
    success:      '#2e7d32',
    successBg:    'rgba(46,125,50,0.08)',
    info:         '#0070b8',
    infoBg:       'rgba(0,112,184,0.08)',
    // Pedine chiaro: X e O nere di default
    pieceX:       '#111111',
    pieceO:       '#111111',
    pieceXGlow:   'rgba(0,0,0,0.08)',
    pieceOGlow:   'rgba(0,0,0,0.08)',
    // Board chiaro: bordi visibili
    boardBg:      '#ffffff',
    boardBorder:  '#c8c8d8',
    boardActive:  '#d48800',
    boardWin:     '#c41230',
    cellBg:       '#ffffff',
    cellBgCan:    '#f4f4fc',
    cellBgWin:    'rgba(212,136,0,0.14)',
    cellBgLast:   'rgba(212,136,0,0.07)',
    bronze:  '#a0522d',
    silver:  '#808090',
    gold:    '#b8860b',
    diamond: '#0070b8',
    legend:  '#c41230',
    statusBar: 'dark-content',
  },
};

let _currentTheme = 'dark';

export const setTheme = (name) => {
  if (name === 'auto') {
    _currentTheme = Appearance.getColorScheme() === 'light' ? 'light' : 'dark';
  } else if (THEMES[name]) {
    _currentTheme = name;
  }
};

export const getCurrentTheme = () => _currentTheme;

// Funzione principale — usata da tutti i componenti
export const theme = () => THEMES[_currentTheme] || THEMES.dark;

export const detectSystemTheme = () =>
  Appearance.getColorScheme() === 'light' ? 'light' : 'dark';

export default { theme, setTheme, getCurrentTheme, detectSystemTheme, THEMES };
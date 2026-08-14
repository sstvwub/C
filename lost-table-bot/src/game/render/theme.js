// Shared palette for the rendered round-card image — all grayscale/ash,
// matching the "Ashfall Table" Lost-survivor look.
export const THEME = {
  ash1: '#1c1d1f',
  ash2: '#2b2c2f',
  ash3: '#43454a',
  fog: '#6d7075',
  bone: '#d7d5cd',
  boneDim: '#a8a6a0',
  emberLine: '#c9cbce',
  cardFace: '#dedad0',
  cardFaceDark: '#b9b5aa',
  cardBack: '#2a2c2f',
  cardBackBorder: 'rgba(215,213,205,0.3)',
};

// Fixed slot positions around the table for up to 4 players, as fractions
// of canvas width/height. Order matters: assigned by join order.
export const SLOTS = ['top', 'right', 'bottom', 'left'];

// A small fixed icon set so each player keeps a consistent "survivor mark"
// across rounds without needing real avatar images.
export const SURVIVOR_ICONS = ['🐦‍⬛', '🦴', '🪶', '🐚'];

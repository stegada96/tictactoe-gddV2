// utils/localSession.js — Punteggio sessione locale 1v1
// Persiste finché non si resetta manualmente

let _session = {
  p1Name: 'Player 1',
  p2Name: 'Player 2',
  p1Score: 0,   // vittorie G1
  p2Score: 0,   // vittorie G2
  draws: 0,
  history: [],  // { variant, winner: 1|2|0, p1score, p2score, timestamp }
  variantStats: {}, // { variantId: { p1:0, p2:0, draws:0 } }
};

export const getSession = () => ({ ..._session });

export const setPlayerNames = (p1, p2) => {
  _session.p1Name = p1 || 'Player 1';
  _session.p2Name = p2 || 'Player 2';
};

// Registra risultato partita locale
// winner: 'X' (P1), 'O' (P2), 'draw'
// In 1v1 locale X = G1, O = G2 (sempre, a meno di shuffle turno)
// firstPlayer: 'X' | 'O' (chi ha iniziato)
export const recordLocalResult = (variantId, winner, firstPlayer) => {
  const isP1Win = winner === 'X';
  const isP2Win = winner === 'O';
  const isDraw  = !isP1Win && !isP2Win;

  if (isP1Win) _session.p1Score += 1;
  if (isP2Win) _session.p2Score += 1;
  if (isDraw)  _session.draws   += 1;

  if (!_session.variantStats[variantId]) {
    _session.variantStats[variantId] = { p1: 0, p2: 0, draws: 0 };
  }
  if (isP1Win) _session.variantStats[variantId].p1 += 1;
  if (isP2Win) _session.variantStats[variantId].p2 += 1;
  if (isDraw)  _session.variantStats[variantId].draws += 1;

  _session.history.push({
    variantId,
    winner: isP1Win ? 1 : isP2Win ? 2 : 0,
    p1score: _session.p1Score,
    p2score: _session.p2Score,
    firstPlayer,
    timestamp: Date.now(),
  });
};

export const resetSession = () => {
  const p1Name = _session.p1Name;
  const p2Name = _session.p2Name;
  _session = {
    p1Name, p2Name,
    p1Score: 0, p2Score: 0, draws: 0,
    history: [], variantStats: {},
  };
};

export const getTotalGames = () =>
  _session.p1Score + _session.p2Score + _session.draws;

export const getLeader = () => {
  if (_session.p1Score > _session.p2Score) return 1;
  if (_session.p2Score > _session.p1Score) return 2;
  return 0; // pareggio
};
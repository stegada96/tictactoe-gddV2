// components/VariantIcon.js v2 — Icone per tutte le 9 varianti
// Disegnate in codice React Native — niente file esterni
import React from 'react';
import { View, Text } from 'react-native';

// ── Grid generica NxN ────────────────────────────────────
const Grid = ({ color, size, n, marks = [], winLength }) => {
  const cell = Math.floor(size / n);
  const actual = cell * n;
  return (
    <View style={{ width: actual, height: actual }}>
      {Array.from({ length: n }, (_, row) => (
        <View key={row} style={{ flexDirection: 'row', height: cell }}>
          {Array.from({ length: n }, (_, col) => {
            const idx  = row * n + col;
            const mark = marks[idx];
            const fs   = cell * 0.52;
            return (
              <View key={col} style={{
                width: cell, height: cell,
                borderRightWidth:  col < n-1 ? 2 : 0,
                borderBottomWidth: row < n-1 ? 2 : 0,
                borderColor: color,
                justifyContent: 'center', alignItems: 'center',
              }}>
                {mark === 'X' && <Text style={{ color, fontSize: fs, fontWeight:'900', lineHeight: fs*1.2 }}>✕</Text>}
                {mark === 'O' && <Text style={{ color, fontSize: fs*0.9, fontWeight:'900', lineHeight: fs*1.2 }}>○</Text>}
                {mark === 'dot' && <View style={{ width: cell*0.3, height: cell*0.3, borderRadius: 99, backgroundColor: color }} />}
                {mark === 'line' && <View style={{ width: cell*0.8, height: 2, backgroundColor: color }} />}
              </View>
            );
          })}
        </View>
      ))}
    </View>
  );
};

// ── Classic 3×3 con tris diagonale ───────────────────────
const ClassicIcon = ({ color, size }) => (
  <Grid color={color} size={size} n={3} marks={['X','','O','','X','','O','','X']} />
);

// ── 4×4 ──────────────────────────────────────────────────
const Grid4Icon = ({ color, size }) => (
  <Grid color={color} size={size} n={4} marks={['X','','','O','','X','O','','','O','X','','O','','','X']} />
);

// ── 5×5 ──────────────────────────────────────────────────
const Grid5Icon = ({ color, size }) => (
  <Grid color={color} size={size} n={5} />
);

// ── Ultimate: griglia di griglie ─────────────────────────
const UltimateIcon = ({ color, size }) => {
  const meta = Math.floor(size / 3);
  const cell = Math.floor(meta / 3);
  return (
    <View style={{ width: size, height: size }}>
      {[0,1,2].map(mr => (
        <View key={mr} style={{ flexDirection: 'row', height: meta }}>
          {[0,1,2].map(mc => (
            <View key={mc} style={{
              width: meta, height: meta,
              borderWidth: 2, borderColor: color,
              borderRadius: 2,
              padding: 1,
              marginRight: mc < 2 ? 1 : 0,
              marginBottom: mr < 2 ? 1 : 0,
            }}>
              {[0,1,2].map(r => (
                <View key={r} style={{ flexDirection: 'row', height: cell }}>
                  {[0,1,2].map(c => (
                    <View key={c} style={{
                      width: cell, height: cell,
                      borderRightWidth:  c < 2 ? 0.5 : 0,
                      borderBottomWidth: r < 2 ? 0.5 : 0,
                      borderColor: color + '80',
                    }} />
                  ))}
                </View>
              ))}
            </View>
          ))}
        </View>
      ))}
    </View>
  );
};

// ── Misère: griglia con cerchio barrato ──────────────────
const MisereIcon = ({ color, size }) => (
  <View style={{ width: size, height: size, justifyContent:'center', alignItems:'center' }}>
    <Grid color={color} size={size} n={3} marks={['X','','','','X','','','','X']} />
    {/* Cerchio rosso con linea */}
    <View style={{ position:'absolute', width:size*0.6, height:size*0.6, borderRadius:size, borderWidth:3, borderColor:'#e94560', justifyContent:'center', alignItems:'center' }}>
      <View style={{ width:size*0.4, height:3, backgroundColor:'#e94560', transform:[{rotate:'45deg'}] }} />
    </View>
  </View>
);

// ── Wild: griglia con X e O misti ───────────────────────
const WildIcon = ({ color, size }) => (
  <Grid color={color} size={size} n={3} marks={['X','O','X','O','O','X','X','O','X']} />
);

// ── Gomoku: griglia 5×5 ridotta con 5 in fila ───────────
const GomokuIcon = ({ color, size }) => {
  const n    = 5;
  const cell = Math.floor(size / n);
  const actual = cell * n;
  // mostra 5 pallini in diagonale
  const marks = Array(25).fill(null);
  [0,6,12,18,24].forEach(i => { marks[i] = 'dot'; });
  [4,8,12,16,20].forEach(i => { /* seconda diagonale vuota */ });
  return (
    <View style={{ width: actual, height: actual }}>
      {Array.from({ length: n }, (_, row) => (
        <View key={row} style={{ flexDirection:'row', height:cell }}>
          {Array.from({ length: n }, (_, col) => {
            const idx = row*n+col;
            const isDot = [0,6,12,18,24].includes(idx);
            return (
              <View key={col} style={{
                width:cell, height:cell,
                borderRightWidth:  col<n-1?1:0,
                borderBottomWidth: row<n-1?1:0,
                borderColor: color+'88',
                justifyContent:'center', alignItems:'center',
              }}>
                {isDot && <View style={{ width:cell*0.5, height:cell*0.5, borderRadius:99, backgroundColor:color }} />}
              </View>
            );
          })}
        </View>
      ))}
    </View>
  );
};

// ── Order & Chaos: 6×6 con due colori ───────────────────
const OrderChaosIcon = ({ color, size }) => {
  const n    = 4; // mostra solo 4×4 per leggibilità
  const cell = Math.floor(size / n);
  const actual = cell * n;
  const marks = ['X','O','X','O','O','X','O','X','X','O','X','O','O','X','O','X'];
  return (
    <View style={{ width: actual, height: actual }}>
      {Array.from({ length: n }, (_, row) => (
        <View key={row} style={{ flexDirection:'row', height:cell }}>
          {Array.from({ length: n }, (_, col) => {
            const idx  = row*n+col;
            const mark = marks[idx];
            const fs   = cell * 0.5;
            const isX  = mark === 'X';
            return (
              <View key={col} style={{
                width:cell, height:cell,
                borderRightWidth:  col<n-1?1.5:0,
                borderBottomWidth: row<n-1?1.5:0,
                borderColor: color,
                justifyContent:'center', alignItems:'center',
                backgroundColor: isX ? `${color}15` : 'transparent',
              }}>
                <Text style={{ color: isX?color:'#e94560', fontSize:fs, fontWeight:'900', lineHeight:fs*1.2 }}>
                  {mark}
                </Text>
              </View>
            );
          })}
        </View>
      ))}
    </View>
  );
};

// ── Random: dado ─────────────────────────────────────────
const RandomIcon = ({ color, size }) => {
  const dot  = size * 0.14;
  const pads = [
    [0.25,0.25],[0.75,0.25],
    [0.5, 0.5 ],
    [0.25,0.75],[0.75,0.75],
  ];
  return (
    <View style={{
      width:size, height:size,
      borderWidth:3, borderColor:color, borderRadius:size*0.22,
    }}>
      {pads.map(([x,y],i)=>(
        <View key={i} style={{
          position:'absolute',
          left: x*size - dot/2,
          top:  y*size - dot/2,
          width:dot, height:dot, borderRadius:dot,
          backgroundColor:color,
        }} />
      ))}
    </View>
  );
};

// ── MAPPA variante → componente ──────────────────────────
const ICONS = {
  classic:     ClassicIcon,
  classic_4x4: Grid4Icon,
  classic_5x5: Grid5Icon,
  misere:      MisereIcon,
  wild:        WildIcon,
  ultimate:    UltimateIcon,
  gomoku:      GomokuIcon,
  order_chaos: OrderChaosIcon,
  random:      RandomIcon,
};

export default function VariantIcon({ variantId, color = '#ffffff', size = 48 }) {
  const Comp = ICONS[variantId];
  if (!Comp) return <Text style={{ fontSize: size * 0.6, color }}>🎮</Text>;
  return <Comp color={color} size={size} />;
}
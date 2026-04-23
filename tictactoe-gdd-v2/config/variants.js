// config/variants.js — Varianti di gioco, costi, moltiplicatori

export const VARIANT_ORDER = [
  'classic','ultimate','random',
  'classic_4x4','classic_5x5',
  'misere','wild','order_chaos',
];

export const GAME_VARIANTS = {
  CLASSIC: {
    id:'classic', name:'Classic', boardSize:3, winLength:3,
    creditCost:0, onlineCost:4, rematchCost:2,
    eloMultiplier:1.0, xpMultiplier:1.0,
    badge:null, doubleMatch:true, rulesKey:'classicDesc',
  },
  ULTIMATE: {
    id:'ultimate', name:'Ultimate', boardSize:9, winLength:3,
    creditCost:6, onlineCost:6, rematchCost:3,
    eloMultiplier:1.0, xpMultiplier:1.0, badge:'HOT', doubleMatch:false,
    rulesKey:'ultimateDesc',
  },
  RANDOM: {
    id:'random', name:'Random', boardSize:null, winLength:null,
    creditCost:5, onlineCost:5, rematchCost:3,
    eloMultiplier:1.5, xpMultiplier:1.5, badge:'×1.5', doubleMatch:false,
    randomPool:['classic','ultimate','classic_4x4','classic_5x5','misere','wild','order_chaos'],
    rulesKey:'randomDesc',
  },
  CLASSIC_4X4: {
    id:'classic_4x4', name:'4×4', boardSize:4, winLength:4,
    creditCost:7, onlineCost:7, rematchCost:4,
    eloMultiplier:1.0, xpMultiplier:1.0, badge:null, doubleMatch:true,
    rulesKey:'board4x4Desc',
  },
  CLASSIC_5X5: {
    id:'classic_5x5', name:'5×5', boardSize:5, winLength:5,
    creditCost:8, onlineCost:8, rematchCost:4,
    eloMultiplier:1.0, xpMultiplier:1.0, badge:null, doubleMatch:true,
    rulesKey:'board5x5Desc',
  },
  MISERE: {
    id:'misere', name:'Misère', boardSize:3, winLength:3,
    creditCost:4, onlineCost:4, rematchCost:2,
    eloMultiplier:1.0, xpMultiplier:1.0, badge:'TWIST', doubleMatch:true,
    rulesKey:'misereDesc',
  },
  WILD: {
    id:'wild', name:'Wild', boardSize:3, winLength:3,
    creditCost:5, onlineCost:5, rematchCost:3,
    eloMultiplier:1.0, xpMultiplier:1.0, badge:null, doubleMatch:true,
    rulesKey:'wildDesc',
  },
  ORDER_CHAOS: {
    id:'order_chaos', name:'Order & Chaos', boardSize:6, winLength:5,
    creditCost:5, onlineCost:5, rematchCost:3,
    eloMultiplier:1.2, xpMultiplier:1.2, badge:'NEW', doubleMatch:false,
    rulesKey:'orderChaosDesc',
  },
};

// Varianti lunghe: danno +1cr in AI medium se vinta
export const LONG_VARIANTS = ['ultimate','classic_4x4','classic_5x5','order_chaos'];

export default { VARIANT_ORDER, GAME_VARIANTS, LONG_VARIANTS };
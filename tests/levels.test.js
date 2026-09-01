import { describe, expect, it } from 'vitest';
import { BASES } from '../src/core/bases.js';
import { LEVELS, getLevelById } from '../src/core/levels.js';
import { findBoardGrid, getGridPairCap, getPlayablePairCount } from '../src/core/pairGenerator.js';
import { MIN_SELECTABLE_BASES } from '../src/config.js';

const BASE_IDS = Object.keys(BASES);

// Tutte le combinazioni di basi con cui una partita può partire (almeno
// MIN_SELECTABLE_BASES): sono i casi che il generatore di coppie deve reggere
// per ogni livello della progressione.
function baseCombinations() {
  const combinations = [];
  for (let mask = 1; mask < 1 << BASE_IDS.length; mask += 1) {
    const combination = BASE_IDS.filter((_, index) => mask & (1 << index));
    if (combination.length >= MIN_SELECTABLE_BASES) combinations.push(combination);
  }
  return combinations;
}

describe('levels', () => {
  it('espone la progressione completa, dal Livello 1 al Livello 16', () => {
    expect(LEVELS).toHaveLength(16);
    expect(LEVELS[0]).toEqual({
      id: 1,
      name: 'Livello 1',
      grid: { columns: 4, rows: 4 },
      valueRange: { min: 0, max: 15 },
      timeLimitSeconds: 180,
      coveredRatio: 0,
      requireDecimalPivot: true,
    });
  });

  it('getLevelById restituisce il livello richiesto', () => {
    expect(getLevelById(1)).toBe(LEVELS[0]);
  });

  it('getLevelById restituisce undefined per un id inesistente', () => {
    expect(getLevelById(99)).toBeUndefined();
  });

  it('la griglia dichiarata di ogni livello coincide con quella che findBoardGrid ricalcolerebbe a schermo', () => {
    for (const level of LEVELS) {
      const declaredTileCount = level.grid.columns * level.grid.rows;
      expect(findBoardGrid(declaredTileCount)).toEqual(level.grid);
    }
  });

  it('con DEC+BIN ogni livello produce esattamente le coppie della griglia dichiarata', () => {
    for (const level of LEVELS) {
      expect(getPlayablePairCount(level, ['DEC', 'BIN'])).toBe(getGridPairCap({ grid: level.grid }));
    }
  });

  it('ogni livello resta giocabile (>= 2 coppie) con qualunque combinazione di basi valida', () => {
    for (const level of LEVELS) {
      for (const combination of baseCombinations()) {
        expect(getPlayablePairCount(level, combination)).toBeGreaterThanOrEqual(2);
      }
    }
  });

  it('nel primo ciclo le combinazioni con pochi valori utilizzabili degradano a una griglia più piccola ma giocabile', () => {
    // 0-15: DEC+HEX lascia solo 6 valori (0-9 identici nelle due basi), DEC+OCT
    // e OCT+HEX ne lasciano 8 (0-7 identici). Sotto il tetto di ogni livello del
    // primo ciclo, che va da 8 (4x4) a 12 (6x4) coppie.
    for (const level of LEVELS.filter((lvl) => lvl.valueRange.max === 15)) {
      expect(getPlayablePairCount(level, ['DEC', 'HEX'])).toBe(6);
      expect(getPlayablePairCount(level, ['DEC', 'OCT'])).toBe(8);
      expect(getPlayablePairCount(level, ['OCT', 'HEX'])).toBe(8);
    }
  });

  it('nel secondo ciclo ogni livello riempie la griglia dichiarata con qualunque combinazione di basi', () => {
    // 0-31: la combinazione più povera (DEC+HEX) lascia comunque 22 valori
    // utilizzabili, sopra il tetto massimo del ciclo (18, griglia 6x6).
    for (const level of LEVELS.filter((lvl) => lvl.valueRange.max === 31)) {
      for (const combination of baseCombinations()) {
        expect(getPlayablePairCount(level, combination)).toBe(getGridPairCap({ grid: level.grid }));
      }
    }
  });
});

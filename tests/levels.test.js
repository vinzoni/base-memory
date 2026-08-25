import { describe, expect, it } from 'vitest';
import { LEVELS, getLevelById } from '../src/core/levels.js';
import { findBoardGrid, getGridPairCap, getPlayablePairCount } from '../src/core/pairGenerator.js';

describe('levels', () => {
  it('espone la progressione completa, dal Livello 1 al Livello 8', () => {
    expect(LEVELS).toHaveLength(8);
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
});

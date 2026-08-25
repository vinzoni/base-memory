import { describe, expect, it } from 'vitest';
import {
  countUsableValues,
  findBoardGrid,
  generatePairs,
  getGridPairCap,
  getPlayablePairCount,
  shuffle,
} from '../src/core/pairGenerator.js';
import { formatValueInBase } from '../src/core/bases.js';
import { LEVELS } from '../src/core/levels.js';
import { MAX_BOARD_ASPECT_RATIO } from '../src/config.js';

const LEVEL_1 = LEVELS[0];

// PRNG seedabile (mulberry32), solo per determinismo nei test: generatePairs
// riceve la sorgente di casualità come parametro, per non dipendere da Math.random.
function mulberry32(seed) {
  let state = seed;
  return function random() {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function groupTilesByPair(tiles) {
  const groups = new Map();
  tiles.forEach((tile, index) => {
    const positions = groups.get(tile.pairId) ?? [];
    positions.push({ tile, index });
    groups.set(tile.pairId, positions);
  });
  return groups;
}

describe('countUsableValues', () => {
  it('conta i valori accoppiabili nel range 0-15 per ciascuna combinazione di basi', () => {
    const valueRange = { min: 0, max: 15 };
    expect(countUsableValues({ valueRange, requireDecimalPivot: false }, ['DEC', 'BIN'])).toBe(14);
    expect(countUsableValues({ valueRange, requireDecimalPivot: false }, ['DEC', 'OCT'])).toBe(8);
    expect(countUsableValues({ valueRange, requireDecimalPivot: false }, ['DEC', 'HEX'])).toBe(6);
  });

  it('con il vincolo pivot decimale attivo il conteggio non cambia su DEC+BIN+HEX (0-15), perché DEC copre già tutti i valori non banali', () => {
    const valueRange = { min: 0, max: 15 };
    const selectedBases = ['DEC', 'BIN', 'HEX'];
    expect(countUsableValues({ valueRange, requireDecimalPivot: true }, selectedBases)).toBe(
      countUsableValues({ valueRange, requireDecimalPivot: false }, selectedBases)
    );
  });
});

describe('getPlayablePairCount', () => {
  it('coincide con il numero di coppie generate quando il tetto della griglia è il limite (DEC+BIN, Livello 1)', () => {
    expect(getPlayablePairCount(LEVEL_1, ['DEC', 'BIN'])).toBe(8);
    const tiles = generatePairs(LEVEL_1, ['DEC', 'BIN'], mulberry32(1));
    expect(tiles.length / 2).toBe(8);
  });

  it('coincide con il numero di coppie generate quando il range disponibile è il limite (DEC+HEX, Livello 1)', () => {
    expect(getPlayablePairCount(LEVEL_1, ['DEC', 'HEX'])).toBe(6);
    const tiles = generatePairs(LEVEL_1, ['DEC', 'HEX'], mulberry32(1));
    expect(tiles.length / 2).toBe(6);
  });
});

describe('shuffle', () => {
  it('resta integro quando random() restituisce sempre 1 (indice massimo possibile)', () => {
    const input = [1, 2, 3, 4, 5];
    const result = shuffle(input, () => 1);
    expect(result).toHaveLength(input.length);
    expect(result.every((item) => item !== undefined)).toBe(true);
    expect([...result].sort()).toEqual([...input].sort());
  });
});

describe('generatePairs', () => {
  it('genera pairCount*2 tessere quando il range lo consente (DEC+BIN, Livello 1)', () => {
    const tiles = generatePairs(LEVEL_1, ['DEC', 'BIN'], mulberry32(1));
    expect(tiles).toHaveLength(16);
  });

  it('genera meno coppie del tetto senza sollevare eccezioni quando il range non basta (DEC+HEX, Livello 1)', () => {
    const tiles = generatePairs(LEVEL_1, ['DEC', 'HEX'], mulberry32(1));
    expect(tiles).toHaveLength(12);
  });

  it('non genera mai più tessere del tetto della griglia', () => {
    const tiles = generatePairs(LEVEL_1, ['DEC', 'BIN'], mulberry32(2));
    expect(tiles.length).toBeLessThanOrEqual(LEVEL_1.grid.columns * LEVEL_1.grid.rows);
  });

  it('scarta ogni coppia con rappresentazione identica tra le due basi', () => {
    const tiles = generatePairs(LEVEL_1, ['DEC', 'OCT'], mulberry32(3));
    for (const [, positions] of groupTilesByPair(tiles)) {
      const [a, b] = positions.map((p) => p.tile);
      expect(formatValueInBase(a.value, a.baseId)).not.toBe(formatValueInBase(b.value, b.baseId));
    }
  });

  it('non ripete mai lo stesso valore tra coppie diverse', () => {
    const tiles = generatePairs(LEVEL_1, ['DEC', 'BIN', 'HEX'], mulberry32(4));
    const values = tiles.map((tile) => tile.value);
    const uniqueValues = new Set(values);
    expect(uniqueValues.size).toBe(values.length / 2);
  });

  it('usa sempre due basi diverse all\'interno di ogni coppia', () => {
    const tiles = generatePairs(LEVEL_1, ['DEC', 'BIN', 'OCT', 'HEX'], mulberry32(5));
    for (const [, positions] of groupTilesByPair(tiles)) {
      const [a, b] = positions.map((p) => p.tile);
      expect(a.baseId).not.toBe(b.baseId);
    }
  });

  it('usa solo basi tra quelle selezionate', () => {
    const selectedBases = ['DEC', 'HEX'];
    const tiles = generatePairs(LEVEL_1, selectedBases, mulberry32(6));
    for (const tile of tiles) {
      expect(selectedBases).toContain(tile.baseId);
    }
  });

  it('è deterministico a parità di seed', () => {
    const first = generatePairs(LEVEL_1, ['DEC', 'BIN'], mulberry32(42));
    const second = generatePairs(LEVEL_1, ['DEC', 'BIN'], mulberry32(42));
    expect(first).toEqual(second);
  });

  it('assegna un id univoco a ogni tessera', () => {
    const tiles = generatePairs(LEVEL_1, ['DEC', 'BIN', 'OCT', 'HEX'], mulberry32(7));
    const ids = tiles.map((tile) => tile.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('mescola le tessere: almeno una coppia non ha le due tessere in posizioni consecutive', () => {
    const tiles = generatePairs(LEVEL_1, ['DEC', 'BIN'], mulberry32(1));
    const hasNonAdjacentPair = [...groupTilesByPair(tiles).values()].some(
      (positions) => Math.abs(positions[0].index - positions[1].index) !== 1
    );
    expect(hasNonAdjacentPair).toBe(true);
  });

  it('richiede almeno 2 basi selezionate', () => {
    expect(() => generatePairs(LEVEL_1, ['DEC'], mulberry32(8))).toThrow();
  });

  it('solleva un errore se il range non permette almeno 2 coppie', () => {
    const tinyLevel = { valueRange: { min: 0, max: 2 }, grid: { columns: 4, rows: 4 } };
    expect(() => generatePairs(tinyLevel, ['DEC', 'BIN'], mulberry32(9))).toThrow();
  });

  it('solleva un errore se selectedBases contiene duplicati', () => {
    expect(() => generatePairs(LEVEL_1, ['DEC', 'DEC'], mulberry32(10))).toThrow();
  });

  it('solleva un errore se selectedBases contiene una base sconosciuta', () => {
    expect(() => generatePairs(LEVEL_1, ['DEC', 'ROMAN'], mulberry32(11))).toThrow();
  });
});

describe('vincolo pivot decimale (requireDecimalPivot)', () => {
  it('con DEC+BIN+HEX e vincolo attivo, nessuna coppia è BIN-HEX: ogni coppia include DEC', () => {
    const tiles = generatePairs(LEVEL_1, ['DEC', 'BIN', 'HEX'], mulberry32(12));
    for (const [, positions] of groupTilesByPair(tiles)) {
      const [a, b] = positions.map((p) => p.tile);
      expect([a.baseId, b.baseId]).toContain('DEC');
    }
  });

  it('con solo BIN+HEX il vincolo è insoddisfacibile e viene ignorato senza errori', () => {
    const tiles = generatePairs(LEVEL_1, ['BIN', 'HEX'], mulberry32(13));
    expect(tiles.length).toBeGreaterThan(0);
    for (const [, positions] of groupTilesByPair(tiles)) {
      const [a, b] = positions.map((p) => p.tile);
      expect([a.baseId, b.baseId].sort()).toEqual(['BIN', 'HEX']);
    }
  });

  it('getPlayablePairCount coincide con le coppie generate quando il vincolo è attivo (DEC+HEX, Livello 1)', () => {
    const pairCount = getPlayablePairCount(LEVEL_1, ['DEC', 'HEX']);
    const tiles = generatePairs(LEVEL_1, ['DEC', 'HEX'], mulberry32(14));
    expect(tiles.length / 2).toBe(pairCount);
  });

  it('getPlayablePairCount coincide con le coppie generate quando il vincolo è attivo ma insoddisfacibile (BIN+HEX)', () => {
    const pairCount = getPlayablePairCount(LEVEL_1, ['BIN', 'HEX']);
    const tiles = generatePairs(LEVEL_1, ['BIN', 'HEX'], mulberry32(15));
    expect(tiles.length / 2).toBe(pairCount);
  });
});

describe('getGridPairCap', () => {
  it('deriva il tetto di coppie dalla griglia del livello', () => {
    expect(getGridPairCap({ grid: { columns: 4, rows: 4 } })).toBe(8);
    expect(getGridPairCap({ grid: { columns: 4, rows: 3 } })).toBe(6);
  });
});

describe('findBoardGrid', () => {
  it('Livello 1 con DEC+BIN produce una griglia 4x4', () => {
    const tiles = generatePairs(LEVEL_1, ['DEC', 'BIN'], mulberry32(1));
    expect(findBoardGrid(tiles.length)).toEqual({ columns: 4, rows: 4 });
  });

  it('Livello 1 con DEC+HEX produce una griglia 4x3 senza eccezioni', () => {
    expect(() => generatePairs(LEVEL_1, ['DEC', 'HEX'], mulberry32(1))).not.toThrow();
    const tiles = generatePairs(LEVEL_1, ['DEC', 'HEX'], mulberry32(1));
    expect(findBoardGrid(tiles.length)).toEqual({ columns: 4, rows: 3 });
  });

  it('scarta una coppia per ricadere su un numero fattorizzabile (14 tessere, solo 7x2, ratio 3.5 -> 12, 4x3)', () => {
    expect(findBoardGrid(14)).toEqual({ columns: 4, rows: 3 });
  });

  it('con un conteggio "scomodo" (quasi primo) scarta una coppia e ricade su un rettangolo accettabile (22 -> 20, 5x4)', () => {
    expect(findBoardGrid(22)).toEqual({ columns: 5, rows: 4 });
  });

  it('per ogni conteggio pari di tessere da 4 a 36 restituisce un rettangolo accettabile scartando al più una coppia', () => {
    for (let tileCount = 4; tileCount <= 36; tileCount += 2) {
      const { columns, rows } = findBoardGrid(tileCount);
      expect(columns * rows).toBeLessThanOrEqual(tileCount);
      expect(columns).toBeGreaterThanOrEqual(rows);
      expect(columns / rows).toBeLessThanOrEqual(MAX_BOARD_ASPECT_RATIO);
      expect(tileCount - columns * rows).toBeLessThanOrEqual(2);
    }
  });
});

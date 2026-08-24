import { describe, expect, it } from 'vitest';
import {
  addHighScore,
  clearHighScores,
  qualifiesForHighScore,
  readHighScores,
} from '../src/storage/highScores.js';
import { MAX_HIGH_SCORES, MAX_PLAYER_NAME_LENGTH, STORAGE_KEYS } from '../src/config.js';

function createMemoryStorage(initial = {}) {
  const store = { ...initial };
  return {
    getItem: (key) => (key in store ? store[key] : null),
    setItem: (key, value) => {
      store[key] = String(value);
    },
    removeItem: (key) => {
      delete store[key];
    },
  };
}

function throwingStorage(methodName) {
  const storage = createMemoryStorage();
  storage[methodName] = () => {
    throw new Error(`${methodName} fallito`);
  };
  return storage;
}

function validEntry(overrides = {}) {
  return {
    playerName: 'Ada',
    score: 100,
    dateTime: '2026-08-24T10:00:00.000Z',
    selectedBases: ['DEC', 'BIN'],
    levelReached: 1,
    timeTakenSeconds: 42,
    ...overrides,
  };
}

describe('readHighScores', () => {
  it('restituisce un array vuoto se la chiave è assente', () => {
    expect(readHighScores(createMemoryStorage())).toEqual([]);
  });

  it('restituisce un array vuoto se il JSON non è parsabile', () => {
    const storage = createMemoryStorage({ [STORAGE_KEYS.HIGH_SCORES]: '{not json' });
    expect(readHighScores(storage)).toEqual([]);
  });

  it('restituisce un array vuoto se la radice non è un array', () => {
    const storage = createMemoryStorage({
      [STORAGE_KEYS.HIGH_SCORES]: JSON.stringify({ not: 'an array' }),
    });
    expect(readHighScores(storage)).toEqual([]);
  });

  it('restituisce un array vuoto se storage.getItem lancia', () => {
    expect(readHighScores(throwingStorage('getItem'))).toEqual([]);
  });

  it('filtra le voci malformate mantenendo quelle valide', () => {
    const good = validEntry({ playerName: 'Grace', score: 200 });
    const badEntries = [
      null,
      42,
      {},
      validEntry({ playerName: '' }),
      validEntry({ score: -1 }),
      validEntry({ score: Number.POSITIVE_INFINITY }),
      validEntry({ dateTime: 'not a date' }),
      validEntry({ selectedBases: ['DEC', 'ROMAN'] }),
      validEntry({ selectedBases: 'DEC,BIN' }),
      validEntry({ levelReached: 0 }),
      validEntry({ levelReached: 1.5 }),
      validEntry({ timeTakenSeconds: -1 }),
    ];
    const storage = createMemoryStorage({
      [STORAGE_KEYS.HIGH_SCORES]: JSON.stringify([good, ...badEntries]),
    });

    expect(readHighScores(storage)).toEqual([good]);
  });

  it('riordina per punteggio decrescente anche se i dati salvati non lo sono', () => {
    const low = validEntry({ playerName: 'Low', score: 10 });
    const high = validEntry({ playerName: 'High', score: 900 });
    const storage = createMemoryStorage({
      [STORAGE_KEYS.HIGH_SCORES]: JSON.stringify([low, high]),
    });

    expect(readHighScores(storage)).toEqual([high, low]);
  });
});

describe('addHighScore', () => {
  it('inserisce una voce e la restituisce ordinata per punteggio decrescente', () => {
    const storage = createMemoryStorage();
    addHighScore(storage, validEntry({ playerName: 'Basso', score: 50 }));
    const updated = addHighScore(storage, validEntry({ playerName: 'Alto', score: 500 }));

    expect(updated.map((entry) => entry.playerName)).toEqual(['Alto', 'Basso']);
    expect(readHighScores(storage).map((entry) => entry.playerName)).toEqual(['Alto', 'Basso']);
  });

  it(`taglia la classifica a ${MAX_HIGH_SCORES} voci`, () => {
    const storage = createMemoryStorage();
    let updated;
    for (let i = 0; i < MAX_HIGH_SCORES + 1; i += 1) {
      updated = addHighScore(storage, validEntry({ playerName: `Player${i}`, score: i }));
    }

    expect(updated).toHaveLength(MAX_HIGH_SCORES);
    expect(updated.map((entry) => entry.score)).not.toContain(0);
  });

  it(`clampa playerName a ${MAX_PLAYER_NAME_LENGTH} caratteri`, () => {
    const storage = createMemoryStorage();
    const longName = 'A'.repeat(MAX_PLAYER_NAME_LENGTH + 10);
    const updated = addHighScore(storage, validEntry({ playerName: longName }));

    expect(updated[0].playerName).toHaveLength(MAX_PLAYER_NAME_LENGTH);
  });

  it('non lancia se storage.setItem lancia e restituisce comunque la classifica in memoria', () => {
    const storage = throwingStorage('setItem');
    let updated;
    expect(() => {
      updated = addHighScore(storage, validEntry());
    }).not.toThrow();

    expect(updated).toHaveLength(1);
  });
});

describe('clearHighScores', () => {
  it('rimuove la chiave della classifica', () => {
    const storage = createMemoryStorage();
    addHighScore(storage, validEntry());
    clearHighScores(storage);

    expect(readHighScores(storage)).toEqual([]);
  });

  it('non lancia se storage.removeItem lancia', () => {
    expect(() => clearHighScores(throwingStorage('removeItem'))).not.toThrow();
  });
});

describe('qualifiesForHighScore', () => {
  it('restituisce true se la classifica ha meno del massimo di voci', () => {
    expect(qualifiesForHighScore([], 1)).toBe(true);
  });

  it('restituisce true solo se il punteggio supera il minimo quando la classifica è piena', () => {
    const fullScores = Array.from({ length: MAX_HIGH_SCORES }, (_, i) => validEntry({ score: (i + 1) * 100 }));

    expect(qualifiesForHighScore(fullScores, 50)).toBe(false);
    expect(qualifiesForHighScore(fullScores, 150)).toBe(true);
  });
});

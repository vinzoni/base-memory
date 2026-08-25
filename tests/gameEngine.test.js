import { describe, expect, it } from 'vitest';
import {
  GAME_STATUS,
  acknowledgeMismatch,
  advanceToNextLevel,
  checkTimeout,
  createGame,
  finishGame,
  getElapsedSeconds,
  getRemainingSeconds,
  getTotalElapsedSeconds,
  selectTile,
} from '../src/core/gameEngine.js';
import { LEVELS } from '../src/core/levels.js';
import { SCORING } from '../src/config.js';

const LEVEL_1 = LEVELS[0];

// PRNG seedabile (mulberry32), stesso pattern di tests/pairGenerator.test.js.
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

// Fixture fissa (non generata) per controllo preciso sulle transizioni: due coppie,
// pairId 0 (valore 4: DEC "4" / BIN "100") e pairId 1 (valore 5: DEC "5" / BIN "101").
function twoPairState(overrides = {}) {
  return {
    levelId: 1,
    elapsedBeforeCurrentLevel: 0,
    tiles: [
      { id: 'p0-DEC', pairId: 0, baseId: 'DEC', value: 4, display: '4' },
      { id: 'p0-BIN', pairId: 0, baseId: 'BIN', value: 4, display: '100' },
      { id: 'p1-DEC', pairId: 1, baseId: 'DEC', value: 5, display: '5' },
      { id: 'p1-BIN', pairId: 1, baseId: 'BIN', value: 5, display: '101' },
    ],
    timeLimitSeconds: 180,
    startedAt: 0,
    finishedAt: null,
    selectedTileIds: [],
    resolvedPairIds: [],
    pendingMismatch: false,
    score: 0,
    errorCount: 0,
    status: GAME_STATUS.PLAYING,
    ...overrides,
  };
}

function groupTilesByPairId(tiles) {
  const groups = new Map();
  tiles.forEach((tile) => {
    const pair = groups.get(tile.pairId) ?? [];
    pair.push(tile);
    groups.set(tile.pairId, pair);
  });
  return [...groups.values()];
}

describe('createGame', () => {
  it('produce uno stato iniziale coerente', () => {
    const state = createGame({
      level: LEVEL_1,
      selectedBases: ['DEC', 'BIN'],
      random: mulberry32(1),
      startedAt: 0,
    });

    expect(state.status).toBe(GAME_STATUS.PLAYING);
    expect(state.score).toBe(0);
    expect(state.errorCount).toBe(0);
    expect(state.selectedTileIds).toEqual([]);
    expect(state.resolvedPairIds).toEqual([]);
    expect(state.pendingMismatch).toBe(false);
    expect(state.finishedAt).toBeNull();
    expect(state.tiles.length).toBeGreaterThan(0);
    expect(state.levelId).toBe(LEVEL_1.id);
    expect(state.elapsedBeforeCurrentLevel).toBe(0);
  });
});

describe('selectTile — selezione e no-op difensivi', () => {
  it('la prima selezione aggiunge la tessera senza cambiare il punteggio', () => {
    const state = twoPairState();
    const result = selectTile(state, 'p0-DEC', 1000);

    expect(result.selectedTileIds).toEqual(['p0-DEC']);
    expect(result.score).toBe(0);
  });

  it('un click ripetuto sulla stessa prima tessera è un no-op esplicito', () => {
    const afterFirst = selectTile(twoPairState(), 'p0-DEC', 1000);
    const result = selectTile(afterFirst, 'p0-DEC', 2000);

    expect(result).toBe(afterFirst);
  });

  it('un tileId sconosciuto è un no-op esplicito e non lancia eccezioni', () => {
    const state = twoPairState();
    expect(() => selectTile(state, 'non-esiste', 1000)).not.toThrow();
    expect(selectTile(state, 'non-esiste', 1000)).toBe(state);
  });

  it('selezionare una tessera di una coppia già risolta è un no-op', () => {
    const state = twoPairState({ resolvedPairIds: [0] });
    expect(selectTile(state, 'p0-DEC', 1000)).toBe(state);
  });
});

describe('selectTile — coppia corretta', () => {
  it('assegna i punti, risolve la coppia e svuota la selezione', () => {
    const afterFirst = selectTile(twoPairState(), 'p0-DEC', 1000);
    const result = selectTile(afterFirst, 'p0-BIN', 2000);

    expect(result.score).toBe(SCORING.PAIR_MATCH_POINTS);
    expect(result.resolvedPairIds).toEqual([0]);
    expect(result.selectedTileIds).toEqual([]);
    expect(result.status).toBe(GAME_STATUS.PLAYING);
  });
});

describe('selectTile — coppia sbagliata', () => {
  it('applica la penalità, incrementa errorCount e blocca l\'input (pendingMismatch)', () => {
    const afterFirst = selectTile(twoPairState(), 'p0-DEC', 1000);
    const result = selectTile(afterFirst, 'p1-DEC', 2000);

    expect(result.score).toBe(0); // 0 - PAIR_ERROR_PENALTY, clampato a 0
    expect(result.errorCount).toBe(1);
    expect(result.pendingMismatch).toBe(true);
    expect(result.selectedTileIds).toEqual(['p0-DEC', 'p1-DEC']);
  });

  it('il punteggio non scende sotto zero anche con più errori', () => {
    const state = twoPairState({ score: 10 });
    const afterFirst = selectTile(state, 'p0-DEC', 1000);
    const result = selectTile(afterFirst, 'p1-DEC', 2000);

    expect(result.score).toBe(0);
  });

  it('con pendingMismatch attivo, ulteriori selectTile sono no-op finché non arriva acknowledgeMismatch', () => {
    const afterFirst = selectTile(twoPairState(), 'p0-DEC', 1000);
    const mismatched = selectTile(afterFirst, 'p1-DEC', 2000);

    const blocked = selectTile(mismatched, 'p0-BIN', 3000);
    expect(blocked).toBe(mismatched);
  });
});

describe('acknowledgeMismatch', () => {
  it('pulisce la selezione e sblocca l\'input dopo un errore', () => {
    const afterFirst = selectTile(twoPairState(), 'p0-DEC', 1000);
    const mismatched = selectTile(afterFirst, 'p1-DEC', 2000);

    const cleared = acknowledgeMismatch(mismatched);
    expect(cleared.selectedTileIds).toEqual([]);
    expect(cleared.pendingMismatch).toBe(false);
  });

  it('è un no-op se non c\'è un errore pendente', () => {
    const state = twoPairState();
    expect(acknowledgeMismatch(state)).toBe(state);
  });
});

describe('selectTile — fine livello per completamento', () => {
  it('completare l\'ultima coppia entro il tempo porta a LEVEL_COMPLETE con il bonus corretto', () => {
    const state = twoPairState({ resolvedPairIds: [0], score: 300 });
    const afterFirst = selectTile(state, 'p1-DEC', 1000);
    const result = selectTile(afterFirst, 'p1-BIN', 2000);

    expect(result.status).toBe(GAME_STATUS.LEVEL_COMPLETE);
    expect(result.finishedAt).toBe(2000);
    expect(result.resolvedPairIds).toEqual([0, 1]);

    const scoreAfterMatch = 300 + SCORING.PAIR_MATCH_POINTS;
    const timeRemainingSeconds = 180 - 2; // floor(2000ms / 1000)
    const expectedScore = scoreAfterMatch + SCORING.LEVEL_COMPLETE_BONUS + timeRemainingSeconds * SCORING.SPEED_BONUS_PER_SECOND;
    expect(result.score).toBe(expectedScore);
  });

  it('il punteggio finale è sempre un intero anche con uno scarto di millisecondi non tondo', () => {
    const state = twoPairState({ resolvedPairIds: [0], score: 0 });
    const afterFirst = selectTile(state, 'p1-DEC', 100);
    const result = selectTile(afterFirst, 'p1-BIN', 47234); // 47.234s trascorsi

    expect(Number.isInteger(result.score)).toBe(true);

    const timeRemainingSeconds = 180 - Math.floor(47234 / 1000); // 180 - 47 = 133
    const expectedScore = SCORING.PAIR_MATCH_POINTS + SCORING.LEVEL_COMPLETE_BONUS + timeRemainingSeconds * SCORING.SPEED_BONUS_PER_SECOND;
    expect(result.score).toBe(expectedScore);
    // Senza il floor sui secondi rimanenti il bonus sarebbe frazionario
    // (133 - 0.234 = 132.766 → punteggio non intero): verifichiamo che non sia così.
    expect(result.score).not.toBe(expectedScore - 0.234 * SCORING.SPEED_BONUS_PER_SECOND);
  });
});

describe('selectTile — fine livello per tempo scaduto', () => {
  it('un abbinamento tentato dopo lo scadere del tempo porta a LOST e non completa il livello', () => {
    const state = twoPairState({ resolvedPairIds: [0], selectedTileIds: ['p1-DEC'] });
    const result = selectTile(state, 'p1-BIN', 181000); // oltre i 180s del Livello 1

    expect(result.status).toBe(GAME_STATUS.LOST);
    expect(result.finishedAt).toBe(181000);
    expect(result.resolvedPairIds).toEqual([0]); // non risolto, la selezione non è stata processata
    expect(result.selectedTileIds).toEqual(['p1-DEC']);
  });
});

describe('checkTimeout', () => {
  it('transita PLAYING → LOST quando il tempo è scaduto', () => {
    const state = twoPairState();
    const result = checkTimeout(state, 180000);

    expect(result.status).toBe(GAME_STATUS.LOST);
    expect(result.finishedAt).toBe(180000);
  });

  it('è un no-op se il tempo non è ancora scaduto', () => {
    const state = twoPairState();
    expect(checkTimeout(state, 179999)).toBe(state);
  });

  it('è un no-op se lo stato non è più PLAYING', () => {
    const wonState = twoPairState({ status: GAME_STATUS.WON, finishedAt: 5000 });
    expect(checkTimeout(wonState, 999999)).toBe(wonState);
  });
});

describe('stato congelato a partita terminata', () => {
  it('selectTile e checkTimeout sono no-op una volta WON o LOST', () => {
    const wonState = twoPairState({ status: GAME_STATUS.WON, finishedAt: 2000 });
    expect(selectTile(wonState, 'p0-DEC', 999999)).toBe(wonState);
    expect(checkTimeout(wonState, 999999)).toBe(wonState);
  });

  it('getElapsedSeconds/getRemainingSeconds restano stabili anche con un now molto successivo alla fine', () => {
    const wonState = twoPairState({ status: GAME_STATUS.WON, finishedAt: 2000 });

    const elapsedRightAfter = getElapsedSeconds(wonState, 2000);
    const remainingRightAfter = getRemainingSeconds(wonState, 2000);

    expect(getElapsedSeconds(wonState, 999999999)).toBe(elapsedRightAfter);
    expect(getRemainingSeconds(wonState, 999999999)).toBe(remainingRightAfter);
  });

  it('getRemainingSeconds dopo LOST è naturalmente 0, senza caso speciale', () => {
    const lostState = twoPairState({ status: GAME_STATUS.LOST, finishedAt: 181000 });
    expect(getRemainingSeconds(lostState, 999999)).toBe(0);
  });
});

describe('integrazione: cablaggio end-to-end con createGame fino a WON', () => {
  it('risolvere tutte le coppie generate porta a LEVEL_COMPLETE con aritmetica del punteggio esatta, poi a WON con finishGame', () => {
    let state = createGame({
      level: LEVEL_1,
      selectedBases: ['DEC', 'BIN'],
      random: mulberry32(1),
      startedAt: 0,
    });

    const pairs = groupTilesByPairId(state.tiles);
    const totalPairs = pairs.length;

    pairs.forEach(([tileA, tileB], index) => {
      const isLast = index === totalPairs - 1;
      state = selectTile(state, tileA.id, 1000);
      state = selectTile(state, tileB.id, isLast ? 50000 : 2000);
    });

    expect(state.status).toBe(GAME_STATUS.LEVEL_COMPLETE);
    expect(state.errorCount).toBe(0);

    const timeRemainingSeconds = 180 - 50; // floor(50000ms / 1000)
    const expectedScore =
      totalPairs * SCORING.PAIR_MATCH_POINTS +
      SCORING.LEVEL_COMPLETE_BONUS +
      timeRemainingSeconds * SCORING.SPEED_BONUS_PER_SECOND;
    expect(state.score).toBe(expectedScore);

    const finished = finishGame(state);
    expect(finished.status).toBe(GAME_STATUS.WON);
    expect(finished.score).toBe(expectedScore);
  });
});

describe('advanceToNextLevel', () => {
  const LEVEL_2 = {
    id: 2,
    name: 'Livello 2 (test)',
    grid: { columns: 2, rows: 2 },
    valueRange: { min: 0, max: 15 },
    timeLimitSeconds: 90,
    coveredRatio: 0,
    requireDecimalPivot: false,
  };

  it('rigenera le tessere per il nuovo livello e resetta lo stato di gioco del livello, preservando punteggio ed errori', () => {
    const completed = twoPairState({
      status: GAME_STATUS.LEVEL_COMPLETE,
      startedAt: 0,
      finishedAt: 5000,
      score: 900,
      errorCount: 3,
      selectedTileIds: [],
      resolvedPairIds: [0, 1],
    });

    const result = advanceToNextLevel(completed, {
      level: LEVEL_2,
      selectedBases: ['DEC', 'BIN'],
      random: mulberry32(1),
      startedAt: 105000,
    });

    expect(result.status).toBe(GAME_STATUS.PLAYING);
    expect(result.levelId).toBe(LEVEL_2.id);
    expect(result.timeLimitSeconds).toBe(LEVEL_2.timeLimitSeconds);
    expect(result.startedAt).toBe(105000);
    expect(result.finishedAt).toBeNull();
    expect(result.selectedTileIds).toEqual([]);
    expect(result.resolvedPairIds).toEqual([]);
    expect(result.pendingMismatch).toBe(false);
    expect(result.tiles).not.toBe(completed.tiles);
    expect(result.tiles.length).toBeGreaterThan(0);
    expect(result.score).toBe(900);
    expect(result.errorCount).toBe(3);
  });

  it('somma alla durata accumulata esattamente il tempo giocato sul livello concluso (finishedAt - startedAt), non l\'intervallo fino al nuovo startedAt', () => {
    const completed = twoPairState({
      status: GAME_STATUS.LEVEL_COMPLETE,
      startedAt: 0,
      finishedAt: 5000,
      elapsedBeforeCurrentLevel: 0,
    });

    const result = advanceToNextLevel(completed, {
      level: LEVEL_2,
      selectedBases: ['DEC', 'BIN'],
      random: mulberry32(1),
      startedAt: 105000, // 100s dopo finishedAt: tempo sulla schermata intermedia
    });

    expect(result.elapsedBeforeCurrentLevel).toBe(5000);
  });

  it('è un no-op se lo stato non è LEVEL_COMPLETE', () => {
    const state = twoPairState({ status: GAME_STATUS.PLAYING });
    const result = advanceToNextLevel(state, {
      level: LEVEL_2,
      selectedBases: ['DEC', 'BIN'],
      random: mulberry32(1),
      startedAt: 105000,
    });
    expect(result).toBe(state);
  });
});

describe('finishGame', () => {
  it('porta LEVEL_COMPLETE a WON', () => {
    const state = twoPairState({ status: GAME_STATUS.LEVEL_COMPLETE, finishedAt: 5000 });
    const result = finishGame(state);
    expect(result.status).toBe(GAME_STATUS.WON);
    expect(result.finishedAt).toBe(5000);
  });

  it('è un no-op se lo stato non è LEVEL_COMPLETE', () => {
    const state = twoPairState({ status: GAME_STATUS.PLAYING });
    expect(finishGame(state)).toBe(state);
  });
});

describe('getTotalElapsedSeconds', () => {
  it('somma la durata dei livelli conclusi al tempo del livello corrente, ignorando le pause sulla schermata intermedia', () => {
    // Livello A: 5s giocati (startedAt 0 -> finishedAt 5000).
    const levelACompleted = twoPairState({
      status: GAME_STATUS.LEVEL_COMPLETE,
      startedAt: 0,
      finishedAt: 5000,
      elapsedBeforeCurrentLevel: 0,
    });

    // Pausa di 100s sulla schermata intermedia prima di iniziare il Livello B.
    const levelB = {
      id: 2,
      name: 'Livello 2 (test)',
      grid: { columns: 2, rows: 2 },
      valueRange: { min: 0, max: 15 },
      timeLimitSeconds: 90,
      coveredRatio: 0,
      requireDecimalPivot: false,
    };
    const levelBStarted = advanceToNextLevel(levelACompleted, {
      level: levelB,
      selectedBases: ['DEC', 'BIN'],
      random: mulberry32(1),
      startedAt: 105000,
    });

    // Livello B: altri 5s giocati (startedAt 105000 -> finishedAt 110000).
    const levelBFinished = { ...levelBStarted, status: GAME_STATUS.LEVEL_COMPLETE, finishedAt: 110000 };

    expect(getTotalElapsedSeconds(levelBFinished, 110000)).toBe(10); // 5s + 5s, non 110s
  });
});

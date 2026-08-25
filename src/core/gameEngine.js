import { generatePairs } from './pairGenerator.js';
import { scoreLevelCompletion, scorePairError, scorePairMatch } from './scoring.js';

export const GAME_STATUS = {
  PLAYING: 'playing',
  LEVEL_COMPLETE: 'levelComplete',
  WON: 'won',
  LOST: 'lost',
};

export function createGame({ level, selectedBases, random = Math.random, startedAt }) {
  return {
    levelId: level.id,
    elapsedBeforeCurrentLevel: 0,
    tiles: generatePairs(level, selectedBases, random),
    timeLimitSeconds: level.timeLimitSeconds,
    startedAt,
    finishedAt: null,
    selectedTileIds: [],
    resolvedPairIds: [],
    pendingMismatch: false,
    score: 0,
    errorCount: 0,
    status: GAME_STATUS.PLAYING,
  };
}

// Somma alla durata già accumulata dei livelli precedenti quella del livello
// appena concluso (finishedAt - startedAt), non l'intervallo fino al nuovo
// startedAt: il tempo passato sulla schermata intermedia tra un livello e
// l'altro non deve contare come tempo di gioco.
export function advanceToNextLevel(state, { level, selectedBases, random = Math.random, startedAt }) {
  if (state.status !== GAME_STATUS.LEVEL_COMPLETE) return state;
  return {
    ...state,
    levelId: level.id,
    elapsedBeforeCurrentLevel: state.elapsedBeforeCurrentLevel + (state.finishedAt - state.startedAt),
    tiles: generatePairs(level, selectedBases, random),
    timeLimitSeconds: level.timeLimitSeconds,
    startedAt,
    finishedAt: null,
    selectedTileIds: [],
    resolvedPairIds: [],
    pendingMismatch: false,
    status: GAME_STATUS.PLAYING,
  };
}

export function finishGame(state) {
  if (state.status !== GAME_STATUS.LEVEL_COMPLETE) return state;
  return { ...state, status: GAME_STATUS.WON };
}

// A partita terminata l'orologio si ferma su finishedAt: `now` viene ignorato per
// non far derivare il tempo trascorso oltre la fine della partita.
export function getElapsedSeconds(state, now) {
  const endTime = state.finishedAt ?? now;
  return Math.max(0, Math.floor((endTime - state.startedAt) / 1000));
}

export function getRemainingSeconds(state, now) {
  return Math.max(0, state.timeLimitSeconds - getElapsedSeconds(state, now));
}

// Tempo totale di gioco su tutta la partita, non solo sul livello corrente:
// l'accumulato dei livelli già conclusi più il tempo del livello in corso.
export function getTotalElapsedSeconds(state, now) {
  const endTime = state.finishedAt ?? now;
  const currentLevelElapsedMs = endTime - state.startedAt;
  return Math.max(0, Math.floor((state.elapsedBeforeCurrentLevel + currentLevelElapsedMs) / 1000));
}

function isTimeUp(state, now) {
  return getElapsedSeconds(state, now) >= state.timeLimitSeconds;
}

export function checkTimeout(state, now) {
  if (state.status !== GAME_STATUS.PLAYING) return state;
  if (!isTimeUp(state, now)) return state;
  return { ...state, status: GAME_STATUS.LOST, finishedAt: now };
}

export function acknowledgeMismatch(state) {
  if (!state.pendingMismatch) return state;
  return { ...state, selectedTileIds: [], pendingMismatch: false };
}

export function selectTile(state, tileId, now) {
  if (state.status !== GAME_STATUS.PLAYING) return state;
  if (isTimeUp(state, now)) {
    return { ...state, status: GAME_STATUS.LOST, finishedAt: now };
  }
  // Durante il feedback d'errore l'input resta bloccato finché la UI non chiama
  // acknowledgeMismatch (SPECIFICHE.md §7): senza questo guard un doppio click
  // conterebbe errori multipli sulla stessa coppia.
  if (state.pendingMismatch) return state;

  const tile = state.tiles.find((t) => t.id === tileId);
  if (!tile) return state;
  if (state.resolvedPairIds.includes(tile.pairId)) return state;
  if (state.selectedTileIds.includes(tileId)) return state;

  const selectedTileIds = [...state.selectedTileIds, tileId];
  if (selectedTileIds.length < 2) {
    return { ...state, selectedTileIds };
  }

  const firstTile = state.tiles.find((t) => t.id === selectedTileIds[0]);
  const isMatch = firstTile.pairId === tile.pairId;

  if (!isMatch) {
    return {
      ...state,
      selectedTileIds,
      pendingMismatch: true,
      errorCount: state.errorCount + 1,
      score: scorePairError(state.score),
    };
  }

  const resolvedPairIds = [...state.resolvedPairIds, tile.pairId];
  const totalPairCount = state.tiles.length / 2;
  const isLevelComplete = resolvedPairIds.length === totalPairCount;
  const scoreAfterMatch = scorePairMatch(state.score);

  if (!isLevelComplete) {
    return {
      ...state,
      selectedTileIds: [],
      resolvedPairIds,
      score: scoreAfterMatch,
    };
  }

  const finishedAt = now;
  // Secondi interi (floor), non il residuo di millisecondi tra startedAt e now:
  // altrimenti il bonus velocità produce un punteggio finale non intero.
  const elapsedSeconds = Math.floor((finishedAt - state.startedAt) / 1000);
  const timeRemainingSeconds = Math.max(0, state.timeLimitSeconds - elapsedSeconds);
  const finalScore = scoreLevelCompletion(scoreAfterMatch, {
    timeRemainingSeconds,
    completed: true,
  });

  return {
    ...state,
    selectedTileIds: [],
    resolvedPairIds,
    score: finalScore,
    status: GAME_STATUS.LEVEL_COMPLETE,
    finishedAt,
  };
}

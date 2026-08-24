import { generatePairs } from './pairGenerator.js';
import { scoreLevelCompletion, scorePairError, scorePairMatch } from './scoring.js';

export const GAME_STATUS = {
  PLAYING: 'playing',
  WON: 'won',
  LOST: 'lost',
};

export function createGame({ level, selectedBases, random = Math.random, startedAt }) {
  return {
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

// A partita terminata l'orologio si ferma su finishedAt: `now` viene ignorato per
// non far derivare il tempo trascorso oltre la fine della partita.
export function getElapsedSeconds(state, now) {
  const endTime = state.finishedAt ?? now;
  return Math.max(0, Math.floor((endTime - state.startedAt) / 1000));
}

export function getRemainingSeconds(state, now) {
  return Math.max(0, state.timeLimitSeconds - getElapsedSeconds(state, now));
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
    status: GAME_STATUS.WON,
    finishedAt,
  };
}

import { generatePairs, shuffle } from './pairGenerator.js';
import { scoreLevelCompletion, scorePairError, scorePairMatch } from './scoring.js';

export const GAME_STATUS = {
  PLAYING: 'playing',
  LEVEL_COMPLETE: 'levelComplete',
  WON: 'won',
  LOST: 'lost',
  ABANDONED: 'abandoned',
};

// Selezione individuale (non a coppie): è legittimo che di una coppia una sola
// tessera sia coperta. coveredCount = Math.round(tiles.length * coveredRatio):
// arrotonda all'intero più vicino. Le tessere sono sempre generate in coppie
// (tiles.length pari), quindi con coveredRatio 0.5 il prodotto è sempre un
// intero esatto e Math.round non introduce ambiguità. Con rapporti non
// "puliti" (es. 0.1/0.3 su 36 tessere: 3.6 -> 4, 10.8 -> 11) il conteggio può
// risultare dispari: è voluto, non un difetto. Significa che almeno una
// coppia avrà una tessera coperta e l'altra scoperta, coerente con la
// selezione individuale.
function pickCoveredTileIds(tiles, coveredRatio, random) {
  const coveredCount = Math.round(tiles.length * coveredRatio);
  return shuffle(tiles, random)
    .slice(0, coveredCount)
    .map((tile) => tile.id);
}

export function createGame({ level, selectedBases, random = Math.random, startedAt }) {
  const tiles = generatePairs(level, selectedBases, random);
  return {
    levelId: level.id,
    elapsedBeforeCurrentLevel: 0,
    tiles,
    coveredTileIds: pickCoveredTileIds(tiles, level.coveredRatio, random),
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
  const tiles = generatePairs(level, selectedBases, random);
  return {
    ...state,
    levelId: level.id,
    elapsedBeforeCurrentLevel: state.elapsedBeforeCurrentLevel + (state.finishedAt - state.startedAt),
    tiles,
    coveredTileIds: pickCoveredTileIds(tiles, level.coveredRatio, random),
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

// Abbandono volontario: il giocatore chiude la partita prima della fine (in aula
// la lezione finisce a orario fisso). Ammesso sia durante il gioco (PLAYING) sia
// dalla schermata intermedia tra un livello e il successivo (LEVEL_COMPLETE). Il
// punteggio maturato resta com'è: nessun bonus per il livello non completato,
// nessuna penalità — interrompere fa solo rinunciare ai punti dei livelli
// successivi, non dà un vantaggio a chi resta fermo ad aspettare lo scadere del
// tempo.
export function abandonGame(state, now) {
  if (state.status !== GAME_STATUS.PLAYING && state.status !== GAME_STATUS.LEVEL_COMPLETE) {
    return state;
  }
  // Da PLAYING l'orologio si ferma su `now`, come checkTimeout e la fine livello.
  // Da LEVEL_COMPLETE finishedAt è già fissato all'istante del completamento e va
  // conservato: sovrascriverlo con `now` conterebbe come tempo di gioco anche
  // quello passato sulla schermata intermedia (SPECIFICHE.md §4).
  return { ...state, status: GAME_STATUS.ABANDONED, finishedAt: state.finishedAt ?? now };
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

// Copertura derivata dallo stato corrente, non da un flag mutato durante la
// partita: coveredTileIds è fissato una volta sola alla creazione/avanzamento
// del livello (vedi pickCoveredTileIds) e non viene mai più toccato. Una
// tessera risolta o attualmente selezionata è sempre scoperta; altrimenti lo
// è se e solo se era tra quelle scelte come coperte. Questo basta a coprire da
// solo tutti i casi (scopertura al click, ricopertura dopo acknowledgeMismatch,
// copertura permanente delle coppie risolte) senza logica aggiuntiva altrove.
export function isTileCovered(state, tileId) {
  const tile = state.tiles.find((t) => t.id === tileId);
  if (!tile) return false;
  if (state.resolvedPairIds.includes(tile.pairId)) return false;
  if (state.selectedTileIds.includes(tileId)) return false;
  return state.coveredTileIds.includes(tileId);
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

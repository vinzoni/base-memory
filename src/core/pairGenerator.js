import { BASES, formatValueInBase } from './bases.js';
import { MAX_BOARD_ASPECT_RATIO, MIN_SELECTABLE_BASES } from '../config.js';

export function shuffle(items, random) {
  const shuffled = items.slice();
  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    // Math.min protegge da un random() che restituisce esattamente 1.0: senza
    // clamp l'indice sforerebbe l'array, corrompendolo (buco undefined + lunghezza
    // allungata) invece di limitarsi a un normale swap interno.
    const j = Math.min(i, Math.floor(random() * (i + 1)));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function valuesInRange({ min, max }) {
  const values = [];
  for (let value = min; value <= max; value += 1) {
    values.push(value);
  }
  return values;
}

function basePairCombinations(bases) {
  const combinations = [];
  for (let i = 0; i < bases.length; i += 1) {
    for (let j = i + 1; j < bases.length; j += 1) {
      combinations.push([bases[i], bases[j]]);
    }
  }
  return combinations;
}

// Il vincolo "pivot decimale" (Livello 1) riduce l'accoppiamento a coppie che
// includono DEC, per evitare la doppia conversione mentale di BIN<->HEX. Se DEC
// non è tra le basi selezionate il vincolo è insoddisfacibile: va ignorato,
// non trasformato in un errore, perché è una scelta del giocatore.
function applyDecimalPivot(basePairs, selectedBases, requireDecimalPivot) {
  if (!requireDecimalPivot || !selectedBases.includes('DEC')) {
    return basePairs;
  }
  return basePairs.filter(([baseA, baseB]) => baseA === 'DEC' || baseB === 'DEC');
}

// Una coppia è "gratis" (Vincolo §2.2) se le due basi producono la stessa stringa
// per quel valore: va scartata, quindi cerchiamo la prima combinazione di basi
// che produce rappresentazioni diverse.
function findUsableBasePair(value, basePairs) {
  return basePairs.find(
    ([baseA, baseB]) => formatValueInBase(value, baseA) !== formatValueInBase(value, baseB)
  );
}

function tileFor(pairId, baseId, value) {
  return {
    id: `${pairId}-${baseId}`,
    pairId,
    baseId,
    value,
    display: formatValueInBase(value, baseId),
  };
}

export function countUsableValues({ valueRange, requireDecimalPivot }, selectedBases) {
  const basePairs = applyDecimalPivot(
    basePairCombinations(selectedBases),
    selectedBases,
    requireDecimalPivot
  );
  return valuesInRange(valueRange).filter(
    (value) => findUsableBasePair(value, basePairs) !== undefined
  ).length;
}

// Tetto di coppie derivato dalla griglia obiettivo del livello. Singola
// implementazione: usata sia internamente sia dalla schermata di configurazione,
// così il tetto mostrato in anteprima non può divergere da quello usato per generare.
export function getGridPairCap({ grid }) {
  return (grid.columns * grid.rows) / 2;
}

function rectangleCandidates(tileCount) {
  const candidates = [];
  for (let rows = 1; rows * rows <= tileCount; rows += 1) {
    if (tileCount % rows === 0) {
      candidates.push({ columns: tileCount / rows, rows });
    }
  }
  return candidates;
}

function bestRectangleFor(tileCount, maxAspectRatio) {
  const acceptable = rectangleCandidates(tileCount).filter(
    ({ columns, rows }) => columns / rows <= maxAspectRatio
  );
  if (acceptable.length === 0) return null;
  return acceptable.reduce((best, candidate) =>
    candidate.columns / candidate.rows < best.columns / best.rows ? candidate : best
  );
}

// Dato un numero massimo di tessere, restituisce il rettangolo migliore
// disponibile per la griglia di gioco. Non tutti i conteggi si fattorizzano in
// proporzioni accettabili (14 tessere: solo 7x2, rapporto 3.5): in quel caso si
// scarta una coppia alla volta finché non se ne trova uno che si fattorizza bene
// (12 tessere: 4x3). Il ciclo termina sempre con successo per maxTileCount >= 4,
// perché 4 tessere ammettono sempre {2, 2} (rapporto 1): non serve un fallback
// dopo il ciclo.
export function findBoardGrid(maxTileCount, { maxAspectRatio = MAX_BOARD_ASPECT_RATIO } = {}) {
  if (maxTileCount < 4) {
    throw new Error('Servono almeno 4 tessere (2 coppie) per formare una griglia.');
  }
  for (let tileCount = maxTileCount - (maxTileCount % 2); tileCount >= 4; tileCount -= 2) {
    const rectangle = bestRectangleFor(tileCount, maxAspectRatio);
    if (rectangle) return rectangle;
  }
}

export function getPlayablePairCount({ valueRange, grid, requireDecimalPivot }, selectedBases) {
  const gridPairCap = getGridPairCap({ grid });
  const usableValueCount = countUsableValues({ valueRange, requireDecimalPivot }, selectedBases);
  const desiredPairCount = Math.min(gridPairCap, usableValueCount);
  const desiredTileCount = desiredPairCount * 2;
  // Sotto le 4 tessere non c'è un rettangolo sensato da cercare: il chiamante
  // (generatePairs) gestisce già il caso "meno di 2 coppie disponibili".
  if (desiredTileCount < 4) return desiredPairCount;
  const { columns, rows } = findBoardGrid(desiredTileCount);
  return (columns * rows) / 2;
}

function assertValidSelectedBases(selectedBases) {
  const uniqueBases = new Set(selectedBases);
  if (uniqueBases.size !== selectedBases.length) {
    throw new Error('Le basi selezionate contengono duplicati.');
  }
  const unknownBaseId = selectedBases.find((baseId) => !BASES[baseId]);
  if (unknownBaseId !== undefined) {
    throw new Error(`Base sconosciuta tra quelle selezionate: ${unknownBaseId}`);
  }
}

export function generatePairs(
  { valueRange, grid, requireDecimalPivot },
  selectedBases,
  random = Math.random
) {
  assertValidSelectedBases(selectedBases);

  if (selectedBases.length < MIN_SELECTABLE_BASES) {
    throw new Error(`Servono almeno ${MIN_SELECTABLE_BASES} basi selezionate.`);
  }

  const targetPairCount = getPlayablePairCount(
    { valueRange, grid, requireDecimalPivot },
    selectedBases
  );
  if (targetPairCount < 2) {
    throw new Error('Configurazione non giocabile: meno di 2 coppie disponibili.');
  }

  const eligibleBasePairs = applyDecimalPivot(
    basePairCombinations(selectedBases),
    selectedBases,
    requireDecimalPivot
  );

  const shuffledValues = shuffle(valuesInRange(valueRange), random);
  const pairs = [];

  for (const value of shuffledValues) {
    if (pairs.length >= targetPairCount) break;
    const shuffledBasePairs = shuffle(eligibleBasePairs, random);
    const usableBasePair = findUsableBasePair(value, shuffledBasePairs);
    if (usableBasePair) {
      pairs.push({ value, baseA: usableBasePair[0], baseB: usableBasePair[1] });
    }
  }

  const tiles = pairs.flatMap((pair, pairId) => [
    tileFor(pairId, pair.baseA, pair.value),
    tileFor(pairId, pair.baseB, pair.value),
  ]);

  // Senza questo shuffle finale le due tessere di ogni coppia resterebbero
  // adiacenti nell'array (l'ordine in cui sono state generate), vanificando
  // il gioco: la griglia mostrerebbe ogni coppia già affiancata.
  return shuffle(tiles, random);
}

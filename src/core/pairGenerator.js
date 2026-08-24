import { BASES, formatValueInBase } from './bases.js';
import { MIN_SELECTABLE_BASES } from '../config.js';

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

export function countUsableValues(valueRange, selectedBases) {
  const basePairs = basePairCombinations(selectedBases);
  return valuesInRange(valueRange).filter(
    (value) => findUsableBasePair(value, basePairs) !== undefined
  ).length;
}

// maxPairCount è un tetto, non un numero garantito: con alcune combinazioni di basi
// il valueRange non contiene abbastanza valori con rappresentazioni diverse (es.
// DEC+HEX su un range piccolo, vedi SPECIFICHE.md §4). Esposta separatamente da
// generatePairs così la UI di configurazione può mostrare l'anteprima del numero di
// coppie prima di avviare la partita, senza duplicare la formula.
export function getPlayablePairCount({ valueRange, maxPairCount }, selectedBases) {
  return Math.min(maxPairCount, countUsableValues(valueRange, selectedBases));
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

export function generatePairs({ valueRange, maxPairCount }, selectedBases, random = Math.random) {
  assertValidSelectedBases(selectedBases);

  if (selectedBases.length < MIN_SELECTABLE_BASES) {
    throw new Error(`Servono almeno ${MIN_SELECTABLE_BASES} basi selezionate.`);
  }

  const targetPairCount = getPlayablePairCount({ valueRange, maxPairCount }, selectedBases);
  if (targetPairCount < 2) {
    throw new Error('Configurazione non giocabile: meno di 2 coppie disponibili.');
  }

  const shuffledValues = shuffle(valuesInRange(valueRange), random);
  const pairs = [];

  for (const value of shuffledValues) {
    if (pairs.length >= targetPairCount) break;
    const shuffledBasePairs = shuffle(basePairCombinations(selectedBases), random);
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

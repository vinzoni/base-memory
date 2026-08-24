import { BASES } from '../core/bases.js';
import { MAX_HIGH_SCORES, MAX_PLAYER_NAME_LENGTH, STORAGE_KEYS } from '../config.js';

function isValidEntry(entry) {
  return (
    entry !== null &&
    typeof entry === 'object' &&
    typeof entry.playerName === 'string' &&
    entry.playerName.length > 0 &&
    typeof entry.score === 'number' &&
    Number.isFinite(entry.score) &&
    entry.score >= 0 &&
    typeof entry.dateTime === 'string' &&
    !Number.isNaN(Date.parse(entry.dateTime)) &&
    Array.isArray(entry.selectedBases) &&
    entry.selectedBases.every((baseId) => Boolean(BASES[baseId])) &&
    Number.isInteger(entry.levelReached) &&
    entry.levelReached > 0 &&
    typeof entry.timeTakenSeconds === 'number' &&
    Number.isFinite(entry.timeTakenSeconds) &&
    entry.timeTakenSeconds >= 0
  );
}

function byScoreDescending(a, b) {
  return b.score - a.score;
}

export function readHighScores(storage) {
  let raw;
  try {
    raw = storage.getItem(STORAGE_KEYS.HIGH_SCORES);
  } catch {
    return [];
  }
  if (!raw) return [];

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) return [];

  return parsed.filter(isValidEntry).sort(byScoreDescending);
}

function writeHighScores(storage, entries) {
  try {
    storage.setItem(STORAGE_KEYS.HIGH_SCORES, JSON.stringify(entries));
  } catch {
    // Quota esaurita o storage non disponibile: la partita deve continuare comunque,
    // il punteggio resta valido in memoria anche se non viene persistito.
  }
}

export function addHighScore(storage, entry) {
  const normalizedEntry = {
    ...entry,
    playerName: entry.playerName.slice(0, MAX_PLAYER_NAME_LENGTH),
  };
  const updated = [...readHighScores(storage), normalizedEntry]
    .sort(byScoreDescending)
    .slice(0, MAX_HIGH_SCORES);
  writeHighScores(storage, updated);
  return updated;
}

export function clearHighScores(storage) {
  try {
    storage.removeItem(STORAGE_KEYS.HIGH_SCORES);
  } catch {
    // Storage non disponibile: nessuna classifica da azzerare, nulla da fare.
  }
}

export function qualifiesForHighScore(currentScores, score) {
  if (currentScores.length < MAX_HIGH_SCORES) return true;
  const lowestScore = Math.min(...currentScores.map((entry) => entry.score));
  return score > lowestScore;
}

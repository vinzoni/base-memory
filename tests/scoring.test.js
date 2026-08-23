import { describe, expect, it } from 'vitest';
import { scoreLevelCompletion, scorePairError, scorePairMatch } from '../src/core/scoring.js';

describe('scorePairMatch', () => {
  it('aggiunge i punti per una coppia individuata', () => {
    expect(scorePairMatch(0)).toBe(100);
    expect(scorePairMatch(50)).toBe(150);
  });
});

describe('scorePairError', () => {
  it('sottrae la penalità per un errore', () => {
    expect(scorePairError(100)).toBe(75);
  });

  it('non scende sotto zero', () => {
    expect(scorePairError(10)).toBe(0);
    expect(scorePairError(0)).toBe(0);
  });
});

describe('scoreLevelCompletion', () => {
  it('assegna bonus completamento e bonus velocità solo se il livello è superato', () => {
    expect(
      scoreLevelCompletion(100, { timeRemainingSeconds: 30, completed: true })
    ).toBe(100 + 500 + 30 * 10);
  });

  it('lascia il punteggio invariato se il livello non è superato', () => {
    expect(
      scoreLevelCompletion(100, { timeRemainingSeconds: 30, completed: false })
    ).toBe(100);
  });
});

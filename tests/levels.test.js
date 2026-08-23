import { describe, expect, it } from 'vitest';
import { LEVELS, getLevelById } from '../src/core/levels.js';

describe('levels', () => {
  it('espone solo il Livello 1, come da prototipo', () => {
    expect(LEVELS).toHaveLength(1);
    expect(LEVELS[0]).toEqual({
      id: 1,
      name: 'Livello 1',
      maxPairCount: 8,
      valueRange: { min: 0, max: 15 },
      timeLimitSeconds: 180,
      coveredRatio: 0,
    });
  });

  it('getLevelById restituisce il livello richiesto', () => {
    expect(getLevelById(1)).toBe(LEVELS[0]);
  });

  it('getLevelById restituisce undefined per un id inesistente', () => {
    expect(getLevelById(99)).toBeUndefined();
  });
});

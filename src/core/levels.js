export const LEVELS = [
  {
    id: 1,
    name: 'Livello 1',
    maxPairCount: 8,
    valueRange: { min: 0, max: 15 },
    timeLimitSeconds: 180,
    coveredRatio: 0,
    requireDecimalPivot: true,
  },
];

export function getLevelById(id) {
  return LEVELS.find((level) => level.id === id);
}

export const LEVELS = [
  {
    id: 1,
    name: 'Livello 1',
    // Griglia obiettivo, non garantita: definisce solo il tetto di coppie
    // (columns * rows / 2). Se le basi selezionate non forniscono abbastanza
    // valori utilizzabili, il numero effettivo di tessere si riduce e il
    // layout mostrato viene ricalcolato da findBoardGrid, non letto da qui.
    grid: { columns: 4, rows: 4 },
    valueRange: { min: 0, max: 15 },
    timeLimitSeconds: 180,
    coveredRatio: 0,
    requireDecimalPivot: true,
  },
];

export function getLevelById(id) {
  return LEVELS.find((level) => level.id === id);
}

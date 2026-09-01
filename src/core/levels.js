export const LEVELS = [
  // Primo ciclo (valueRange 0-15). Griglia obiettivo, non garantita: definisce
  // solo il tetto di coppie (columns * rows / 2). Se le basi selezionate non
  // forniscono abbastanza valori utilizzabili, il numero effettivo di tessere
  // si riduce e il layout mostrato viene ricalcolato da findBoardGrid, non
  // letto da qui.
  //
  // La sequenza di gradini (tempo, griglia, vincolo pivot, copertura) è la
  // stessa nei due cicli, a valueRange via via più ampio (si veda SPECIFICHE.md
  // §4, "Struttura a cicli"). Un solo gradino di copertura parziale: al 50% la
  // metà scoperta obbliga comunque a ricordare le posizioni, mentre a frazioni
  // più basse girando una tessera coperta il partner è quasi sempre già visibile
  // e la memoria non entra in gioco. La copertura totale (coveredRatio 1) resta
  // sul 4x4: su griglie più grandi diventa un esercizio di memoria pura, fuori
  // dallo scopo didattico.
  {
    id: 1,
    name: 'Livello 1',
    grid: { columns: 4, rows: 4 },
    valueRange: { min: 0, max: 15 },
    timeLimitSeconds: 180,
    coveredRatio: 0,
    requireDecimalPivot: true,
  },
  {
    id: 2,
    name: 'Livello 2',
    grid: { columns: 4, rows: 4 },
    valueRange: { min: 0, max: 15 },
    timeLimitSeconds: 120,
    coveredRatio: 0,
    requireDecimalPivot: true,
  },
  {
    id: 3,
    name: 'Livello 3',
    grid: { columns: 6, rows: 4 },
    valueRange: { min: 0, max: 15 },
    timeLimitSeconds: 120,
    coveredRatio: 0,
    requireDecimalPivot: true,
  },
  {
    id: 4,
    name: 'Livello 4',
    grid: { columns: 6, rows: 4 },
    valueRange: { min: 0, max: 15 },
    timeLimitSeconds: 120,
    coveredRatio: 0,
    requireDecimalPivot: false,
  },
  {
    id: 5,
    name: 'Livello 5',
    grid: { columns: 6, rows: 4 },
    valueRange: { min: 0, max: 15 },
    timeLimitSeconds: 90,
    coveredRatio: 0.5,
    requireDecimalPivot: false,
  },
  {
    id: 6,
    name: 'Livello 6',
    grid: { columns: 4, rows: 4 },
    valueRange: { min: 0, max: 15 },
    timeLimitSeconds: 150,
    coveredRatio: 1,
    requireDecimalPivot: false,
  },
  {
    id: 7,
    name: 'Livello 7',
    grid: { columns: 4, rows: 4 },
    valueRange: { min: 0, max: 15 },
    timeLimitSeconds: 120,
    coveredRatio: 1,
    requireDecimalPivot: false,
  },
  {
    id: 8,
    name: 'Livello 8',
    grid: { columns: 4, rows: 4 },
    valueRange: { min: 0, max: 15 },
    timeLimitSeconds: 90,
    coveredRatio: 1,
    requireDecimalPivot: false,
  },
  // Secondo ciclo (valueRange 0-31): stessa progressione di gradini, range più
  // ampio. 30 valori utilizzabili su 0-31 (0 e 1 si scrivono uguali in ogni
  // base, vincolo §2.2) sbloccano il tetto 6x6 (18 coppie), impossibile nel
  // primo ciclo dove restano solo 14 valori utilizzabili. La copertura totale
  // resta sul 4x4 anche qui.
  {
    id: 9,
    name: 'Livello 9',
    grid: { columns: 4, rows: 4 },
    valueRange: { min: 0, max: 31 },
    timeLimitSeconds: 180,
    coveredRatio: 0,
    requireDecimalPivot: true,
  },
  {
    id: 10,
    name: 'Livello 10',
    grid: { columns: 4, rows: 4 },
    valueRange: { min: 0, max: 31 },
    timeLimitSeconds: 120,
    coveredRatio: 0,
    requireDecimalPivot: true,
  },
  {
    id: 11,
    name: 'Livello 11',
    grid: { columns: 6, rows: 6 },
    valueRange: { min: 0, max: 31 },
    timeLimitSeconds: 120,
    coveredRatio: 0,
    requireDecimalPivot: true,
  },
  {
    id: 12,
    name: 'Livello 12',
    grid: { columns: 6, rows: 6 },
    valueRange: { min: 0, max: 31 },
    timeLimitSeconds: 120,
    coveredRatio: 0,
    requireDecimalPivot: false,
  },
  {
    id: 13,
    name: 'Livello 13',
    grid: { columns: 6, rows: 6 },
    valueRange: { min: 0, max: 31 },
    timeLimitSeconds: 90,
    coveredRatio: 0.5,
    requireDecimalPivot: false,
  },
  {
    id: 14,
    name: 'Livello 14',
    grid: { columns: 4, rows: 4 },
    valueRange: { min: 0, max: 31 },
    timeLimitSeconds: 150,
    coveredRatio: 1,
    requireDecimalPivot: false,
  },
  {
    id: 15,
    name: 'Livello 15',
    grid: { columns: 4, rows: 4 },
    valueRange: { min: 0, max: 31 },
    timeLimitSeconds: 120,
    coveredRatio: 1,
    requireDecimalPivot: false,
  },
  {
    id: 16,
    name: 'Livello 16',
    grid: { columns: 4, rows: 4 },
    valueRange: { min: 0, max: 31 },
    timeLimitSeconds: 90,
    coveredRatio: 1,
    requireDecimalPivot: false,
  },
];

export function getLevelById(id) {
  return LEVELS.find((level) => level.id === id);
}

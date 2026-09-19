import { BASES } from './core/bases.js';
import { STATS_ENDPOINT_URL } from './config.js';

// Stesso ordine con cui le basi sono definite in core/bases.js: garantisce che
// la stessa combinazione di basi produca sempre la stessa stringa, indipendentemente
// dall'ordine in cui il giocatore le ha selezionate in configurazione.
const CANONICAL_BASE_ORDER = Object.keys(BASES);

function canonicalBasesLabel(selectedBases) {
  return CANONICAL_BASE_ORDER.filter((baseId) => selectedBases.includes(baseId)).join('+');
}

function sendStatsEvent(params) {
  try {
    const url = new URL(STATS_ENDPOINT_URL);
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, value);
    }
    // no-cors: Apps Script non espone header CORS, una fetch normale fallirebbe.
    // La risposta non serve; il fallimento (rete assente, endpoint lento o rimosso)
    // non deve avere alcun effetto visibile sul gioco.
    fetch(url, { mode: 'no-cors' }).catch(() => {});
  } catch {
    // URL non costruibile o fetch non disponibile: nessun effetto sul gioco.
  }
}

export function reportPageOpened() {
  sendStatsEvent({ evento: 'apertura' });
}

export function reportGameFinished({ score, levelReached, selectedBases }) {
  sendStatsEvent({
    evento: 'partita',
    punteggio: score,
    livello: levelReached,
    basi: canonicalBasesLabel(selectedBases),
  });
}

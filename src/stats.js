import { STATS_ENDPOINT_URL } from './config.js';

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

export function reportGameFinished({ score, levelReached }) {
  sendStatsEvent({ evento: 'partita', punteggio: score, livello: levelReached });
}

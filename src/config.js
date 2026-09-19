export const SCORING = {
  PAIR_MATCH_POINTS: 100,
  PAIR_ERROR_PENALTY: 25,
  LEVEL_COMPLETE_BONUS: 500,
  SPEED_BONUS_PER_SECOND: 10,
};

export const MIN_SELECTABLE_BASES = 2;
export const DEFAULT_SELECTED_BASES = ['DEC', 'BIN'];

// Sotto le 3 basi selezionate il vincolo pivot decimale non restringe nulla:
// l'unica coppia di basi possibile contiene già entrambe le basi scelte. Serve
// a decidere se l'avviso "il pivot decade" ha davvero qualcosa da segnalare.
export const MIN_BASES_FOR_OPERATIVE_PIVOT = 3;

// Rapporto massimo lato lungo/lato corto per considerare una griglia di gioco
// "giocabile": oltre questa soglia il rettangolo risulta troppo allungato.
export const MAX_BOARD_ASPECT_RATIO = 2;

export const STORAGE_KEYS = {
  HIGH_SCORES: 'baseMemory.highScores',
  AUDIO_ENABLED: 'baseMemory.audioEnabled',
};

// L'audio parte disattivato: in aula molte postazioni vicine che suonano insieme
// diventano rumore. È una scelta per macchina, ricordata tra le sessioni; il
// toggle in configurazione ne garantisce la scoperta.
export const AUDIO_ENABLED_BY_DEFAULT = false;

export const MAX_HIGH_SCORES = 10;
export const MAX_PLAYER_NAME_LENGTH = 20;

// Endpoint di un Google Apps Script che registra due eventi anonimi (apertura
// pagina, fine partita con punteggio, livello raggiunto e basi selezionate) in
// un foglio Google. Nessun identificativo del giocatore, nessun cookie.
// Rimuovibile in qualsiasi momento senza alcuna conseguenza sul gioco: main.js
// gestisce il fallimento dell'invio in modo completamente silenzioso.
export const STATS_ENDPOINT_URL =
  'https://script.google.com/macros/s/AKfycbz_oh24ONHOKXzviNJ8UslhikMizuPbs3QzWaXF3ohWaGfUNXbmRnEwvvciSo4gURyT/exec';

export const UI_TIMING = {
  MISMATCH_FEEDBACK_MS: 700,
  TIMER_TICK_INTERVAL_MS: 250,
  TIME_WARNING_THRESHOLD_SECONDS: 20,
  // Splash iniziale: dopo quanto prosegue da solo alla configurazione se non
  // viene saltato, e cadenza con cui la tessera dimostrativa cambia base. Il
  // ciclo è di 4 transizioni (DEC→BIN→OCT→HEX→DEC), quindi
  // 4 * SPLASH_BASE_CYCLE_MS = 6000ms; l'avanzamento automatico lascia poi
  // qualche secondo di quiete. I tempi di comparsa di titolo/firma/aiuto
  // (custom properties --splash-*-delay in style.css) vanno tenuti in scala.
  SPLASH_AUTO_ADVANCE_MS: 12000,
  SPLASH_BASE_CYCLE_MS: 1500,
};

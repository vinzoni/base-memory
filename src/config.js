export const SCORING = {
  PAIR_MATCH_POINTS: 100,
  PAIR_ERROR_PENALTY: 25,
  LEVEL_COMPLETE_BONUS: 500,
  SPEED_BONUS_PER_SECOND: 10,
};

export const MIN_SELECTABLE_BASES = 2;
export const DEFAULT_SELECTED_BASES = ['DEC', 'BIN'];

// Rapporto massimo lato lungo/lato corto per considerare una griglia di gioco
// "giocabile": oltre questa soglia il rettangolo risulta troppo allungato.
export const MAX_BOARD_ASPECT_RATIO = 2;

export const STORAGE_KEYS = {
  HIGH_SCORES: 'baseMemory.highScores',
};

export const MAX_HIGH_SCORES = 10;
export const MAX_PLAYER_NAME_LENGTH = 20;

export const UI_TIMING = {
  MISMATCH_FEEDBACK_MS: 700,
  TIMER_TICK_INTERVAL_MS: 250,
  TIME_WARNING_THRESHOLD_SECONDS: 30,
};

import { SCORING } from '../config.js';

function clampToZero(score) {
  return Math.max(0, score);
}

export function scorePairMatch(currentScore) {
  return clampToZero(currentScore + SCORING.PAIR_MATCH_POINTS);
}

export function scorePairError(currentScore) {
  return clampToZero(currentScore - SCORING.PAIR_ERROR_PENALTY);
}

export function scoreLevelCompletion(currentScore, { timeRemainingSeconds, completed }) {
  if (!completed) {
    return currentScore;
  }
  const speedBonus = timeRemainingSeconds * SCORING.SPEED_BONUS_PER_SECOND;
  return clampToZero(currentScore + SCORING.LEVEL_COMPLETE_BONUS + speedBonus);
}

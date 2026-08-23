import { describe, expect, it } from 'vitest';
import { formatValueInBase } from '../src/core/bases.js';

describe('formatValueInBase', () => {
  it('formatta 0 in tutte le basi', () => {
    expect(formatValueInBase(0, 'DEC')).toBe('0');
    expect(formatValueInBase(0, 'BIN')).toBe('0');
    expect(formatValueInBase(0, 'OCT')).toBe('0');
    expect(formatValueInBase(0, 'HEX')).toBe('0');
  });

  it('formatta 15 in tutte le basi (cifre esadecimali maiuscole)', () => {
    expect(formatValueInBase(15, 'DEC')).toBe('15');
    expect(formatValueInBase(15, 'BIN')).toBe('1111');
    expect(formatValueInBase(15, 'OCT')).toBe('17');
    expect(formatValueInBase(15, 'HEX')).toBe('F');
  });

  it('formatta 255 in tutte le basi', () => {
    expect(formatValueInBase(255, 'DEC')).toBe('255');
    expect(formatValueInBase(255, 'BIN')).toBe('11111111');
    expect(formatValueInBase(255, 'OCT')).toBe('377');
    expect(formatValueInBase(255, 'HEX')).toBe('FF');
  });

  it('solleva un errore su una base sconosciuta', () => {
    expect(() => formatValueInBase(10, 'ROMAN')).toThrow();
  });
});

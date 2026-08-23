export const BASES = {
  DEC: { id: 'DEC', label: 'DEC', radix: 10 },
  BIN: { id: 'BIN', label: 'BIN', radix: 2 },
  OCT: { id: 'OCT', label: 'OCT', radix: 8 },
  HEX: { id: 'HEX', label: 'HEX', radix: 16 },
};

export function formatValueInBase(value, baseId) {
  const base = BASES[baseId];
  if (!base) {
    throw new Error(`Base sconosciuta: ${baseId}`);
  }
  return value.toString(base.radix).toUpperCase();
}

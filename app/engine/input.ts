export interface ParsedInput { values: number[]; invalid: string[]; error: string | null }
export function parseInput(text: string): ParsedInput {
  const tokens = text.trim().split(/[\s,]+/).filter(Boolean)
  if (!tokens.length) return { values: [], invalid: [], error: 'Digite um valor' }
  const invalid = tokens.filter(token => !/^-?\d+$/.test(token) || !Number.isSafeInteger(Number(token)) || Math.abs(Number(token)) > 999)
  if (tokens.length > 20) return { values: [], invalid, error: 'Use até 20 valores por vez' }
  return { values: invalid.length ? [] : tokens.map(Number), invalid, error: invalid.length ? 'Use inteiros de −999 a 999' : null }
}

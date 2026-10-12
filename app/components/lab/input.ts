export function parseValues(value: string): { values: number[]; error: string } {
  if (!value.trim()) return { values: [], error: 'Digite um valor.' }
  const tokens = value.trim().split(/[,\s]+/)
  if (tokens.length > 20) return { values: [], error: 'Use até 20 valores por vez.' }
  for (const token of tokens) {
    if (!/^-?\d+$/.test(token)) return { values: [], error: `“${token}” não é um inteiro.` }
    if (Math.abs(Number(token)) > 999) return { values: [], error: 'Use inteiros de −999 a 999.' }
  }
  return { values: tokens.map(Number), error: '' }
}

export function editNumber(value: string, key: string): string {
  if (key === 'backspace') return value.slice(0, -1)
  if (key === ',') return value.trim().endsWith(',') || !value.trim() ? value : `${value.trim()}, `
  if (key === '-') {
    const match = value.match(/^(.*[,\s])?(-?\d*)$/)
    if (!match) return value
    const prefix = match[1] ?? ''
    const token = match[2] ?? ''
    return prefix + (token.startsWith('-') ? token.slice(1) : `-${token}`)
  }
  return value.length < 110 ? value + key : value
}

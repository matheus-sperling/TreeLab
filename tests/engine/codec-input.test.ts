import { describe, expect, it } from 'vitest'
import { decodeOps, encodeOps, parseInput } from '../../app/engine'
import type { Op } from '../../app/engine'

describe('codec e entrada', () => {
  it('faz round-trip de todas operações e chaves negativas', () => {
    const ops: Op[] = [{ t: 'i', k: -999 }, { t: 'd', k: 999 }, { t: 's', k: 0 }, { t: 'walk', order: 'in' }, { t: 'walk', order: 'pre' }, { t: 'walk', order: 'post' }, { t: 'walk', order: 'level' }, { t: 'min' }, { t: 'max' }, { t: 'succ', k: -5 }, { t: 'pred', k: 20 }]
    expect(decodeOps(encodeOps(ops))).toEqual(ops)
    expect(decodeOps('')).toEqual([])
    for (let seed = 0; seed < 200; seed++) {
      const sequence: Op[] = Array.from({ length: 20 }, (_, i) => ({ t: ['i', 'd', 's'][i % 3] as 'i', k: (seed * 313 + i * 47) % 1999 - 999 }))
      expect(decodeOps(encodeOps(sequence))).toEqual(sequence)
    }
  })
  it('rejeita código inválido, decimal e chave fora dos limites', () => {
    for (const code of ['i1000', 'i1.5', 'x2', 'i', 'winvalid', '.i2', 'i2.', 'iNaN']) expect(() => decodeOps(code)).toThrow()
  })
  it('aceita lista de até 20 inteiros e identifica os tokens inválidos', () => {
    expect(parseInput('10, -25 7').values).toEqual([10, -25, 7])
    expect(parseInput('')).toEqual({ values: [], invalid: [], error: 'Digite um valor' })
    expect(parseInput('1, abc, 1.5, 1000').invalid).toEqual(['abc', '1.5', '1000'])
    expect(parseInput(Array.from({ length: 21 }, (_, i) => i).join(',')).error).toBe('Use até 20 valores por vez')
  })
})

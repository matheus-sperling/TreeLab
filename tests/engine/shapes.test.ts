import { describe, expect, it } from 'vitest'
import { countTreeShapes, decodeOps, encodeOps, isShapeSeed, normalizeShapeSeed, runSequence, shapeSequence, validate } from '../../app/engine'
import type { Snapshot, TreeType } from '../../app/engine'

function topology(tree: Snapshot, id = tree.rootId): string {
  if (id === null) return '.'
  const node = tree.nodes[id]!
  return `(${topology(tree, node.l)}${topology(tree, node.r)})`
}

describe('sementes de formatos distintos', () => {
  it('conta formatos por tipo sem multiplicar rótulos ou cores', () => {
    expect(Array.from({ length: 8 }, (_, n) => countTreeShapes('bst', n))).toEqual([1n, 1n, 2n, 5n, 14n, 42n, 132n, 429n])
    expect(Array.from({ length: 8 }, (_, n) => countTreeShapes('avl', n))).toEqual([1n, 1n, 2n, 1n, 4n, 6n, 4n, 17n])
    expect(Array.from({ length: 8 }, (_, n) => countTreeShapes('rb', n))).toEqual([1n, 1n, 2n, 1n, 4n, 6n, 12n, 29n])
  })

  for (const type of ['bst', 'avl', 'rb'] as const) {
    it(`cada semente de ${type} produz um formato final diferente até 8 nós`, () => {
      for (let size = 0; size <= 8; size++) {
        const count = countTreeShapes(type, size), seen = new Set<string>()
        for (let seed = 0n; seed < count; seed++) {
          const operations = shapeSequence(type, size, seed), result = runSequence(type, operations)
          expect(validate(result.final, type).errors).toEqual([])
          expect(operations).toHaveLength(size)
          expect(Object.values(result.final.nodes).map(node => node.key).sort((a, b) => a - b)).toEqual(Array.from({ length: size }, (_, index) => index + 1))
          const shape = topology(result.final)
          expect(seen.has(shape), `${type}, ${size} nós, semente ${seed}`).toBe(false)
          seen.add(shape)
        }
        expect(BigInt(seen.size)).toBe(count)
      }
    }, 30_000)

    it(`preserva formato e reprodutibilidade de ${type} nos limites até 63 nós`, () => {
      for (const size of [15, 31, 63]) {
        const count = countTreeShapes(type, size), seen = new Set<string>()
        for (const seed of [0n, count / 2n, count - 1n]) {
          const sequence = shapeSequence(type, size, seed.toString())
          expect(shapeSequence(type, size, seed)).toEqual(sequence)
          expect(decodeOps(encodeOps(sequence))).toEqual(sequence)
          const result = runSequence(type, sequence)
          expect(validate(result.final, type).errors).toEqual([])
          expect(Object.keys(result.final.nodes)).toHaveLength(size)
          seen.add(topology(result.final))
        }
        expect(seen.size).toBe(3)
      }
    }, 30_000)
  }

  it('mantém sementes grandes exatas e ajusta o limite ao tamanho e ao tipo', () => {
    const max = countTreeShapes('bst', 63) - 1n
    expect(max).toBeGreaterThan(BigInt(Number.MAX_SAFE_INTEGER))
    expect(isShapeSeed('bst', 63, max.toString())).toBe(true)
    expect(normalizeShapeSeed('bst', 63, max.toString())).toBe(max.toString())
    expect(normalizeShapeSeed('bst', 3, '42')).toBe('4')
    expect(normalizeShapeSeed('avl', 3, '4')).toBe('0')
    expect(normalizeShapeSeed('rb', 1, '42')).toBe('0')
    expect(normalizeShapeSeed('bst', 7, '00042')).toBe('42')
  })

  it('recusa sementes inválidas ou fora da quantidade real de formatos', () => {
    for (const type of ['bst', 'avl', 'rb'] as TreeType[]) {
      for (const seed of ['', '-1', '1.5', '1e2', 'NaN', Number.MAX_SAFE_INTEGER + 1, countTreeShapes(type, 3)]) {
        expect(isShapeSeed(type, 3, seed)).toBe(false)
        expect(() => shapeSequence(type, 3, seed)).toThrow(RangeError)
      }
      for (const n of [-1, 1.5, 64, NaN, Infinity]) {
        expect(isShapeSeed(type, n, '0')).toBe(false)
        expect(() => countTreeShapes(type, n)).toThrow(RangeError)
      }
    }
  })
})

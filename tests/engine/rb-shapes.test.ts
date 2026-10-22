import { describe, expect, it } from 'vitest'
import { runSequence } from '../../app/engine'
import { countRedBlackShapes, redBlackShapeSequence } from '../../app/engine/rbShapes'
import { validate } from '../../app/engine/validate'
import type { Snapshot } from '../../app/engine/types'

function topology(tree: Snapshot, id = tree.rootId): string {
  if (id === null) return '.'
  const node = tree.nodes[id]!
  return `(${topology(tree, node.l)}${topology(tree, node.r)})`
}

const generate = (n: number, rank: bigint): Snapshot => runSequence('rb', redBlackShapeSequence(n, rank).map(k => ({ t: 'i', k }))).final

describe('formatos rubro-negros sem duplicar colorações', () => {
  it('conta topologias distintas, incluindo os tamanhos que admitem várias colorações', () => {
    const expected = [1n, 1n, 2n, 1n, 4n, 6n, 12n, 29n, 40n, 46n, 76n, 190n, 456n, 904n, 1696n, 3341n, 6768n]
    expect(expected.map((_, n) => countRedBlackShapes(n))).toEqual(expected)
    expect(countRedBlackShapes(63)).toBe(1286359648144108845n)
  })

  for (let n = 0; n <= 12; n++) {
    it(`cada semente produz um formato válido e único com ${n} nós`, () => {
      const shapes = new Set<string>(), count = countRedBlackShapes(n)
      for (let rank = 0n; rank < count; rank++) {
        const tree = generate(n, rank)
        expect(validate(tree, 'rb').errors).toEqual([])
        expect(Object.values(tree.nodes).map(node => node.key).sort((a, b) => a - b)).toEqual(Array.from({ length: n }, (_, i) => i + 1))
        const shape = topology(tree)
        expect(shapes.has(shape), `semente ${rank}`).toBe(false)
        shapes.add(shape)
      }
      expect(BigInt(shapes.size)).toBe(count)
    })
  }

  it('constrói também o formato de dez nós que inserções em largura não preservam', () => {
    const target = '(((..)(..))((..)((..)(.(..)))))'
    const breadthFirst = [4, 2, 6, 1, 3, 5, 8, 7, 9, 10]
    expect(topology(runSequence('rb', breadthFirst.map(k => ({ t: 'i', k }))).final)).not.toBe(target)
    const shapes = new Set(Array.from({ length: Number(countRedBlackShapes(10)) }, (_, rank) => topology(generate(10, BigInt(rank)))))
    expect(shapes.has(target)).toBe(true)
  })

  it('mantém índices exatos acima de Number.MAX_SAFE_INTEGER e reproduz as extremidades com 63 nós', () => {
    const count = countRedBlackShapes(63), shapes = new Set<string>()
    for (const rank of [0n, count / 2n, count - 1n]) {
      const sequence = redBlackShapeSequence(63, rank), tree = generate(63, rank)
      expect(sequence).toEqual(redBlackShapeSequence(63, rank))
      expect(validate(tree, 'rb').errors).toEqual([])
      expect(Object.keys(tree.nodes)).toHaveLength(63)
      shapes.add(topology(tree))
    }
    expect(shapes.size).toBe(3)
  })

  it('rejeita tamanhos e índices que não correspondem a um formato', () => {
    expect(() => countRedBlackShapes(-1)).toThrow(RangeError)
    expect(() => countRedBlackShapes(64)).toThrow(RangeError)
    expect(() => countRedBlackShapes(2.5)).toThrow(RangeError)
    expect(() => redBlackShapeSequence(3, -1n)).toThrow(RangeError)
    expect(() => redBlackShapeSequence(3, 1n)).toThrow(RangeError)
  })
})

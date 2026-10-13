import { describe, expect, it } from 'vitest'
import { decodeOps, layoutTree, runSequence, SIBLING_GAP } from '../../app/engine'
import type { Snapshot } from '../../app/engine'

function check(tree: Snapshot): void {
  const layout = layoutTree(tree)
  expect(layoutTree(tree)).toEqual(layout)
  const rows = new Map<number, number[]>()
  for (const [id, node] of Object.entries(tree.nodes)) {
    const position = layout.positions[Number(id)]!
    if (node.l !== null) expect(layout.positions[node.l]!.x).toBeLessThan(position.x)
    if (node.r !== null) expect(layout.positions[node.r]!.x).toBeGreaterThan(position.x)
    rows.set(position.y, [...rows.get(position.y) ?? [], position.x])
  }
  for (const row of rows.values()) {
    row.sort((a, b) => a - b)
    for (let i = 1; i < row.length; i++) expect(row[i]! - row[i - 1]!).toBeGreaterThanOrEqual(SIBLING_GAP)
  }
  const mirror: Snapshot = { rootId: tree.rootId, nodes: Object.fromEntries(Object.entries(tree.nodes).map(([id, n]) => [id, { ...n, l: n.r, r: n.l }])) }
  const mirrored = layoutTree(mirror)
  for (const id of Object.keys(tree.nodes).map(Number)) {
    expect(mirrored.positions[id]!.x).toBeCloseTo(-layout.positions[id]!.x)
    expect(mirrored.positions[id]!.y).toBe(layout.positions[id]!.y)
  }
}
describe('layout tidy', () => {
  it('não sobrepõe, preserva lado de filhos únicos e espelha', () => {
    for (const type of ['bst', 'avl', 'rb'] as const) {
      for (let seed = 1; seed <= 60; seed++) {
        const ops = Array.from({ length: 40 }, (_, i) => ({ t: 'i' as const, k: ((i * 37 + seed * 29) % 97) - 48 }))
        const result = runSequence(type, ops)
        for (const [, end] of result.opRanges) check(result.steps[end]!.tree)
      }
    }
    check(runSequence('bst', decodeOps('i5.i4.i3.i2.i1')).final)
    check(runSequence('bst', decodeOps('i1.i2.i3.i4.i5')).final)
  }, 30_000)
  it('gera NIL virtual somente quando solicitado', () => {
    const tree = runSequence('rb', decodeOps('i10')).final
    expect(layoutTree(tree).nils).toHaveLength(0)
    expect(layoutTree(tree, { showNils: true }).nils.map(n => n.id)).toEqual(['nil:1:L', 'nil:1:R'])
    expect(layoutTree(tree, { extraBlack: { id: null, parent: 1, side: 'R' } }).nils[0]!.id).toBe('nil:1:R')
  })
  it('reserva contornos para NILs sem sobreposição e mantém o espelho', () => {
    for (const type of ['bst', 'avl', 'rb'] as const) {
      for (let seed = 1; seed <= 40; seed++) {
        const ops = Array.from({ length: 31 }, (_, i) => ({ t: 'i' as const, k: ((i * 37 + seed * 29) % 97) - 48 }))
        const tree = runSequence(type, ops).final
        const layout = layoutTree(tree, { showNils: true })
        const rows = new Map<number, number[]>()
        for (const position of [...Object.values(layout.positions), ...layout.nils]) rows.set(position.y, [...rows.get(position.y) ?? [], position.x])
        for (const row of rows.values()) {
          row.sort((a, b) => a - b)
          for (let i = 1; i < row.length; i++) expect(row[i]! - row[i - 1]!).toBeGreaterThanOrEqual(SIBLING_GAP)
        }
        const mirror: Snapshot = { rootId: tree.rootId, nodes: Object.fromEntries(Object.entries(tree.nodes).map(([id, n]) => [id, { ...n, l: n.r, r: n.l }])) }
        const mirrored = layoutTree(mirror, { showNils: true })
        for (const nil of layout.nils) {
          const position = layout.positions[nil.parent]!
          expect(nil.x - position.x).toBe(nil.side === 'L' ? -SIBLING_GAP / 2 : SIBLING_GAP / 2)
          const reflected = mirrored.nils.find(n => n.parent === nil.parent && n.side !== nil.side)!
          expect(reflected.x).toBeCloseTo(-nil.x)
          expect(reflected.y).toBe(nil.y)
          expect(reflected.id).toBe(`nil:${nil.parent}:${nil.side === 'L' ? 'R' : 'L'}`)
        }
        for (const nil of layout.nils) {
          const extra = layoutTree(tree, { extraBlack: { id: null, parent: nil.parent, side: nil.side } })
          const virtual = extra.nils[0]!
          expect(extra.nils).toHaveLength(1)
          for (const position of Object.values(extra.positions).filter(p => p.y === virtual.y)) expect(Math.abs(position.x - virtual.x)).toBeGreaterThanOrEqual(SIBLING_GAP)
        }
      }
    }
  }, 30_000)
})

describe('ângulo uniforme e espaço de anotações', () => {
  it('mantém a inclinação em todas as arestas e separa nós inclusive em profundidades diferentes', () => {
    for (const type of ['bst', 'avl', 'rb'] as const) {
      for (let seed = 1; seed <= 30; seed++) {
        const ops = Array.from({ length: 63 }, (_, i) => ({ t: 'i' as const, k: ((i * 37 + seed * 29) % 127) - 63 }))
        const result = runSequence(type, ops)
        for (const [, end] of result.opRanges) {
          const tree = result.steps[end]!.tree, layout = layoutTree(tree, { showNils: true })
          for (const [id, node] of Object.entries(tree.nodes)) {
            const parent = layout.positions[Number(id)]!
            for (const child of [node.l, node.r]) if (child !== null) {
              const point = layout.positions[child]!
              expect((point.y - parent.y) / Math.abs(point.x - parent.x)).toBeCloseTo(1)
            }
          }
          const points = Object.values(layout.positions)
          for (let i = 0; i < points.length; i++) for (let j = i + 1; j < points.length; j++) {
            expect(Math.hypot(points[i]!.x - points[j]!.x, points[i]!.y - points[j]!.y)).toBeGreaterThanOrEqual(64)
          }
        }
      }
    }
  }, 30_000)
})

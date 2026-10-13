import { describe, expect, it } from 'vitest'
import { decodeOps, layoutTree, NODE_R, runSequence } from '../../app/engine'
import type { Position, Snapshot } from '../../app/engine'

type Options = Parameters<typeof layoutTree>[1]
function mirror(tree: Snapshot): Snapshot {
  return { rootId: tree.rootId, nodes: Object.fromEntries(Object.entries(tree.nodes).map(([id, node]) => [id, { ...node, l: node.r, r: node.l }])) }
}
function segmentDistance(point: Position, a: Position, b: Position): number {
  const dx = b.x - a.x, dy = b.y - a.y
  const t = Math.max(0, Math.min(1, ((point.x - a.x) * dx + (point.y - a.y) * dy) / (dx * dx + dy * dy)))
  return Math.hypot(point.x - a.x - t * dx, point.y - a.y - t * dy)
}
function crossesRectangle(a: Position, b: Position, left: number, right: number, top: number, bottom: number): boolean {
  const first = Math.max(0, (top - a.y) / (b.y - a.y)), last = Math.min(1, (bottom - a.y) / (b.y - a.y))
  if (first > last) return false
  const x1 = a.x + first * (b.x - a.x), x2 = a.x + last * (b.x - a.x)
  return Math.max(x1, x2) >= left && Math.min(x1, x2) <= right
}
function crosses(a: Position, b: Position, c: Position, d: Position): boolean {
  const turn = (p: Position, q: Position, r: Position) => (q.x - p.x) * (r.y - p.y) - (q.y - p.y) * (r.x - p.x)
  return turn(a, b, c) * turn(a, b, d) < 0 && turn(c, d, a) * turn(c, d, b) < 0
}
function check(tree: Snapshot, options: Options = {}): void {
  const layout = layoutTree(tree, options), reflected = layoutTree(mirror(tree), options)
  expect(layoutTree(tree, options)).toEqual(layout)
  const points = [
    ...Object.entries(layout.positions).map(([id, position]) => ({ id: String(id), ...position, radius: NODE_R + 8 })),
    ...layout.nils.map(nil => ({ ...nil, radius: 8 })),
  ]
  const edges = Object.entries(tree.nodes).flatMap(([id, node]) => [node.l, node.r].filter(child => child !== null).map(child => ({ from: id, to: String(child) })))
  edges.push(...layout.nils.map(nil => ({ from: String(nil.parent), to: nil.id })))
  const byId = new Map(points.map(point => [point.id, point]))
  const collisions: string[] = []
  for (let i = 0; i < points.length; i++) {
    const a = points[i]!
    for (let j = i + 1; j < points.length; j++) {
      const b = points[j]!
      if (Math.hypot(a.x - b.x, a.y - b.y) < a.radius + b.radius + 3.9) collisions.push(`${a.id}/${b.id}`)
    }
  }
  for (const [index, edge] of edges.entries()) {
    const a = byId.get(edge.from)!, b = byId.get(edge.to)!
    expect(b.y).toBeGreaterThan(a.y)
    expect(Math.abs(b.x - a.x)).toBeCloseTo(b.y - a.y)
    for (const point of points) {
      if (point.id === edge.from || point.id === edge.to) continue
      if (segmentDistance(point, a, b) < point.radius + 3.9) collisions.push(`${edge.from}→${edge.to}/${point.id}`)
    }
    for (const other of edges.slice(index + 1)) {
      if ([other.from, other.to].some(id => id === edge.from || id === edge.to)) continue
      if (crosses(a, b, byId.get(other.from)!, byId.get(other.to)!)) collisions.push(`${edge.from}→${edge.to}/${other.from}→${other.to}`)
    }
    for (const [id, position] of Object.entries(layout.positions)) {
      if (crossesRectangle(a, b, position.x - 15, position.x + 15, position.y + 26, position.y + 44)) collisions.push(`${edge.from}→${edge.to}/FB:${id}`)
      if (options.showHeights && crossesRectangle(a, b, position.x + 34, position.x + 65, position.y - 10, position.y + 10)) collisions.push(`${edge.from}→${edge.to}/altura:${id}`)
      if (options.showLevels && crossesRectangle(a, b, position.x - 22, position.x + 22, position.y + 45, position.y + 59)) collisions.push(`${edge.from}→${edge.to}/nível:${id}`)
    }
  }
  expect(collisions).toEqual([])
  for (const [rawId, node] of Object.entries(tree.nodes)) {
    const id = Number(rawId), position = layout.positions[id]!
    if (node.l !== null) expect(layout.positions[node.l]!.x).toBeLessThan(position.x)
    if (node.r !== null) expect(layout.positions[node.r]!.x).toBeGreaterThan(position.x)
    expect(reflected.positions[id]!.x).toBeCloseTo(-position.x)
    expect(reflected.positions[id]!.y).toBe(position.y)
    // The default AVL badge sits below the node. It must clear other rings.
    for (const point of points) {
      if (point.id === rawId) continue
      const dx = Math.max(0, Math.abs(point.x - position.x) - 15)
      const dy = Math.max(0, Math.abs(point.y - position.y - 35) - 9)
      expect(Math.hypot(dx, dy) + .001).toBeGreaterThanOrEqual(point.radius)
      if (options.showHeights) {
        const labelDx = Math.max(position.x + 34 - point.x, 0, point.x - position.x - 65)
        const labelDy = Math.max(0, Math.abs(point.y - position.y) - 10)
        expect(Math.hypot(labelDx, labelDy) + .001).toBeGreaterThanOrEqual(point.radius)
      }
      if (options.showLevels) {
        const labelDx = Math.max(0, Math.abs(point.x - position.x) - 22)
        const labelDy = Math.max(0, Math.abs(point.y - position.y - 52) - 7)
        expect(Math.hypot(labelDx, labelDy) + .001).toBeGreaterThanOrEqual(point.radius)
      }
    }
  }
  for (const nil of layout.nils) {
    const parent = layout.positions[nil.parent]!, reflectedNil = reflected.nils.find(n => n.parent === nil.parent && n.side !== nil.side)!
    expect(nil.side === 'L' ? nil.x < parent.x : nil.x > parent.x).toBe(true)
    expect(reflectedNil.x).toBeCloseTo(-nil.x)
    expect(reflectedNil.y).toBe(nil.y)
  }
  for (const point of points) {
    expect(point.x - point.radius).toBeGreaterThanOrEqual(layout.bounds.minX)
    expect(point.x + point.radius).toBeLessThanOrEqual(layout.bounds.maxX)
    expect(point.y - point.radius).toBeGreaterThanOrEqual(layout.bounds.minY)
    expect(point.y + point.radius).toBeLessThanOrEqual(layout.bounds.maxY)
  }
}
function balancedKeys(start: number, end: number): number[] {
  if (start > end) return []
  const mid = Math.floor((start + end) / 2)
  return [mid, ...balancedKeys(start, mid - 1), ...balancedKeys(mid + 1, end)]
}

describe('layout diagonal por contornos', () => {
  it('usa 45° em todas as arestas, reserva anotações e evita nós e NILs', () => {
    for (const type of ['bst', 'avl', 'rb'] as const) {
      for (const size of [1, 3, 7, 15, 31, 63]) {
        for (let seed = 1; seed <= 8; seed++) {
          const ops = Array.from({ length: size }, (_, i) => ({ t: 'i' as const, k: ((i * 37 + seed * 29) % 127) - 63 }))
          const tree = runSequence(type, ops).final
          check(tree)
          check(tree, { showNils: true })
          if (seed === 1) check(tree, { showNils: true, showHeights: true, showLevels: true })
        }
      }
    }
  }, 30_000)
  it('conserva o lado e a inclinação em correntes e ziguezagues até 63 nós', () => {
    for (const keys of [
      Array.from({ length: 63 }, (_, i) => i),
      Array.from({ length: 63 }, (_, i) => 63 - i),
      Array.from({ length: 63 }, (_, i) => i % 2 === 0 ? i / 2 : 63 - (i - 1) / 2),
    ]) {
      const tree = runSequence('bst', keys.map(k => ({ t: 'i' as const, k }))).final
      check(tree)
      check(tree, { showNils: true, showHeights: true, showLevels: true })
    }
  }, 30_000)
  it('mantém árvores pequenas compactas e não amplifica a altura pela inclinação', () => {
    for (const size of [3, 7, 15, 31, 63]) {
      const tree = runSequence('bst', balancedKeys(1, size).map(k => ({ t: 'i' as const, k }))).final
      const { bounds } = layoutTree(tree)
      expect(bounds.maxX - bounds.minX).toBeLessThanOrEqual(size * 40 + 120)
      expect(bounds.maxY - bounds.minY).toBeLessThanOrEqual(size * 20 + 120)
    }
    const tree = runSequence('rb', decodeOps('i40.i20.i60.i10')).final
    const { bounds } = layoutTree(tree)
    expect(bounds.maxX - bounds.minX).toBeLessThanOrEqual(270)
    expect(bounds.maxY - bounds.minY).toBeLessThanOrEqual(200)
  })
  it('gera somente os NILs solicitados, inclusive o preto adicional de remoção', () => {
    const tree = runSequence('rb', decodeOps('i10')).final
    expect(layoutTree(tree).nils).toHaveLength(0)
    expect(layoutTree(tree, { showNils: true }).nils.map(n => n.id)).toEqual(['nil:1:L', 'nil:1:R'])
    const layout = layoutTree(tree, { extraBlack: { id: null, parent: 1, side: 'R' } })
    expect(layout.nils).toHaveLength(1)
    expect(layout.nils[0]!.id).toBe('nil:1:R')
    expect(layout.nils[0]!.x).toBe(layout.nils[0]!.y)
    for (const type of ['bst', 'avl', 'rb'] as const) {
      const result = runSequence(type, decodeOps('i40.i20.i60.i10.i30.i50.i70.d10.d20.d40'))
      for (const step of result.steps.filter(step => step.meta?.extraBlack)) {
        const output = layoutTree(step.tree, { extraBlack: step.meta?.extraBlack })
        const virtual = output.nils[0]
        if (virtual) for (const point of Object.values(output.positions)) expect(Math.hypot(virtual.x - point.x, virtual.y - point.y)).toBeGreaterThanOrEqual(36)
      }
    }
  })
})

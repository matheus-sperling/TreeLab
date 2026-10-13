import { describe, expect, it } from 'vitest'
import { decodeOps, layoutTree, NODE_R, runSequence } from '../../app/engine'
import type { Position, Snapshot } from '../../app/engine'

type Options = Parameters<typeof layoutTree>[1]
interface LabelBox { id: string; owner: number; left: number; right: number; top: number; bottom: number }
function labelBoxes(tree: Snapshot, positions: Record<number, Position>, options: Options): LabelBox[] {
  return Object.entries(positions).flatMap(([rawId, position]) => {
    const owner = Number(rawId)
    const box = (name: string, left: number, right: number, top: number, bottom: number): LabelBox => ({ id: `${name}:${owner}`, owner, left: position.x + left, right: position.x + right, top: position.y + top, bottom: position.y + bottom })
    // Include the AnimatedNumber clip, not just the glyph at its resting baseline.
    const labels = [box('FB', -12, 12, 26, 42)]
    if (owner === tree.rootId) labels.push(box('raiz', -20, 20, -42, -31))
    if (options?.showHeights) labels.push(box('altura', -12, 12, 43, 58))
    if (options?.showLevels) {
      const baseline = options.showHeights ? 70 : 54
      labels.push(box('nível', -20, 20, baseline - 9, baseline + 2))
    }
    return labels
  })
}
function boxesOverlap(a: LabelBox, b: LabelBox): boolean {
  return a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom
}
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
  const labels = labelBoxes(tree, layout.positions, options)
  const collisions: string[] = []
  for (const [index, label] of labels.entries()) {
    for (const other of labels.slice(index + 1)) if (boxesOverlap(label, other)) collisions.push(`${label.id}/${other.id}`)
  }
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
      if (options.showHeights && crossesRectangle(a, b, position.x - 17, position.x + 17, position.y + 43, position.y + 60)) collisions.push(`${edge.from}→${edge.to}/altura:${id}`)
      if (options.showLevels && crossesRectangle(a, b, position.x - 23, position.x + 23, position.y + (options.showHeights ? 60 : 44), position.y + (options.showHeights ? 74 : 58))) collisions.push(`${edge.from}→${edge.to}/nível:${id}`)
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
        const labelDx = Math.max(0, Math.abs(point.x - position.x) - 17)
        const labelDy = Math.max(position.y + 43 - point.y, 0, point.y - position.y - 60)
        expect(Math.hypot(labelDx, labelDy) + .001).toBeGreaterThanOrEqual(point.radius)
      }
      if (options.showLevels) {
        const labelDx = Math.max(0, Math.abs(point.x - position.x) - 23)
        const labelDy = Math.max(0, Math.abs(point.y - position.y - (options.showHeights ? 67 : 51)) - 7)
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
  for (const label of labels) {
    expect(label.left).toBeGreaterThanOrEqual(layout.bounds.minX)
    expect(label.right).toBeLessThanOrEqual(layout.bounds.maxX)
    expect(label.top).toBeGreaterThanOrEqual(layout.bounds.minY)
    expect(label.bottom).toBeLessThanOrEqual(layout.bounds.maxY)
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
  it('separa a altura de um filho esquerdo do nível do pai desde sua inserção', () => {
    const result = runSequence('rb', decodeOps('i4.i2.i6.i1'))
    const attach = result.steps.find(step => step.kind === 'attach' && Object.values(step.tree.nodes).some(node => node.key === 2))!
    for (const tree of [attach.tree, result.final]) {
      check(tree, { showHeights: true })
      check(tree, { showLevels: true })
      check(tree, { showHeights: true, showLevels: true })
      const { bounds } = layoutTree(tree, { showHeights: true, showLevels: true })
      expect(bounds.maxX - bounds.minX).toBeLessThanOrEqual(270)
      expect(bounds.maxY - bounds.minY).toBeLessThanOrEqual(240)
    }
  })
  it('mantém as alturas fora do halo e quadro da subárvore transferida em rotações AVL', () => {
    const result = runSequence('avl', decodeOps('i1.i2.i3.i4.i5.i6.i7'))
    let checkedMovedSubtree = false
    for (const step of result.steps.filter(step => step.kind === 'rotate-pre')) {
      check(step.tree, { showHeights: true, showLevels: true })
      const moved = step.meta?.rotation?.movedSubtree
      if (moved === null || moved === undefined) continue
      checkedMovedSubtree = true
      const layout = layoutTree(step.tree, { showHeights: true, showLevels: true })
      const point = layout.positions[moved]!
      const outline: LabelBox = { id: 'quadro', owner: moved, left: point.x - 28, right: point.x + 28, top: point.y - 28, bottom: point.y + 28 }
      const labels = labelBoxes(step.tree, layout.positions, { showHeights: true, showLevels: true }).filter(label => label.id.startsWith('altura:') || label.id.startsWith('nível:'))
      for (const label of labels) expect(boxesOverlap(label, outline)).toBe(false)
    }
    expect(checkedMovedSubtree).toBe(true)
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

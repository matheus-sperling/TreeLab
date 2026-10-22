import { EngineContext } from './context'
import { rbInsert } from './rb'
import { recomputeHeights } from './tree'
import type { Color, MutableSnapshot, NodeId, Snapshot } from './types'

interface ColorState { black: number; red: number; count: bigint }
interface Shape { left: Shape | null; right: Shape | null; state: ColorState }
interface ColoredShape { left: ColoredShape | null; right: ColoredShape | null; color: Color }

// A state describes ALL possible black heights of one topology, rather than a
// particular coloring. Merging equal states therefore never counts colors twice.
const counts: ColorState[][] = [[{ black: 1, red: 0, count: 1n }]]
function combined(left: ColorState, right: ColorState): Omit<ColorState, 'count'> {
  return {
    black: ((left.black | left.red) & (right.black | right.red)) << 1,
    red: left.black & right.black,
  }
}
function table(n: number): ColorState[] {
  if (!Number.isInteger(n) || n < 0 || n > 63) throw new RangeError('Quantidade de nós inválida.')
  for (let size = counts.length; size <= n; size++) {
    const states = new Map<string, ColorState>()
    for (let leftSize = 0; leftSize < size; leftSize++) {
      for (const left of counts[leftSize]!) for (const right of counts[size - 1 - leftSize]!) {
        const state = combined(left, right)
        if (!(state.black | state.red)) continue
        const key = `${state.black}:${state.red}`, count = left.count * right.count
        const previous = states.get(key)
        if (previous) previous.count += count
        else states.set(key, { ...state, count })
      }
    }
    counts.push([...states.values()])
  }
  return counts[n]!
}

export function countRedBlackShapes(n: number): bigint {
  // Every colorable topology is reachable with CLRS insertion; see Mantler &
  // Cameron, Constructing Red-Black Tree Shapes, doi:10.1142/S0129054102001497.
  return table(n).reduce((total, state) => total + (state.black ? state.count : 0n), 0n)
}

function unrank(n: number, state: ColorState, rank: bigint): Shape | null {
  if (!n) return null
  for (let leftSize = 0; leftSize < n; leftSize++) {
    for (const left of counts[leftSize]!) for (const right of counts[n - 1 - leftSize]!) {
      const next = combined(left, right)
      if (next.black !== state.black || next.red !== state.red) continue
      const block = left.count * right.count
      if (rank >= block) { rank -= block; continue }
      return {
        left: unrank(leftSize, left, rank / right.count),
        right: unrank(n - 1 - leftSize, right, rank % right.count),
        state,
      }
    }
  }
  throw new RangeError('Índice de formato inválido.')
}

const emptyState = counts[0]![0]!
const canColor = (shape: Shape | null, color: Color, height: number): boolean => height >= 0 && !!(((shape?.state ?? emptyState)[color === 'B' ? 'black' : 'red']) & (1 << height))
interface ColorChoice { left: Color; right: Color; height: number; score: number }
const colorScores = new WeakMap<Shape, Map<string, number>>()
function choices(shape: Shape, color: Color, height: number): ColorChoice[] {
  const childHeight = height - (color === 'B' ? 1 : 0), options: ColorChoice[] = []
  for (const left of ['B', 'R'] as const) for (const right of ['B', 'R'] as const) {
    if (color === 'R' && (left === 'R' || right === 'R')) continue
    if (!canColor(shape.left, left, childHeight) || !canColor(shape.right, right, childHeight)) continue
    options.push({ left, right, height: childHeight, score: score(shape.left, left, childHeight) + score(shape.right, right, childHeight) + (color === 'R' ? 1 : 0) })
  }
  return options.sort((a, b) => b.score - a.score)
}
function score(shape: Shape | null, color: Color, height: number): number {
  if (!shape) return 0
  let scores = colorScores.get(shape)
  if (!scores) { scores = new Map(); colorScores.set(shape, scores) }
  const key = `${color}:${height}`, previous = scores.get(key)
  if (previous !== undefined) return previous
  const result = choices(shape, color, height)[0]?.score ?? -Infinity
  scores.set(key, result)
  return result
}
function* colorings(shape: Shape | null, color: Color, height: number): Generator<ColoredShape | null> {
  if (!shape) { yield null; return }
  for (const choice of choices(shape, color, height)) {
    for (const left of colorings(shape.left, choice.left, choice.height)) {
      for (const right of colorings(shape.right, choice.right, choice.height)) yield { left, right, color }
    }
  }
}
function snapshot(shape: ColoredShape | null): MutableSnapshot {
  const tree: MutableSnapshot = { rootId: null, nodes: {} }
  let nextId = 0, nextKey = 0
  function visit(node: ColoredShape | null, parent: NodeId | null): NodeId | null {
    if (!node) return null
    const id = ++nextId
    const left = visit(node.left, id), key = ++nextKey
    tree.nodes[id] = { key, l: left, r: null, p: parent, h: 0, c: node.color }
    tree.nodes[id]!.r = visit(node.right, id)
    return id
  }
  tree.rootId = visit(shape, null)
  return tree
}
function signature(tree: Snapshot, id: NodeId | null = tree.rootId): string {
  if (id === null) return '.'
  const node = tree.nodes[id]!
  return `(${node.c}${signature(tree, node.l)}${signature(tree, node.r)})`
}
const copy = (tree: MutableSnapshot): MutableSnapshot => ({ rootId: tree.rootId, nodes: Object.fromEntries(Object.entries(tree.nodes).map(([id, node]) => [id, { ...node }])) })
function blackHeight(tree: Snapshot, id: NodeId | null = tree.rootId, parent: Color = 'B'): number {
  if (id === null) return 0
  const node = tree.nodes[id]!
  if (node.c === 'R' && parent === 'R') return -1
  const left = blackHeight(tree, node.l, node.c), right = blackHeight(tree, node.r, node.c)
  return left < 0 || right < 0 || left !== right ? -1 : left + (node.c === 'B' ? 1 : 0)
}
function rotate(tree: MutableSnapshot, pivot: NodeId, direction: 'left' | 'right'): void {
  const node = tree.nodes[pivot]!, child = (direction === 'left' ? node.r : node.l)!, promoted = tree.nodes[child]!
  if (direction === 'left') { node.r = promoted.l; if (promoted.l !== null) tree.nodes[promoted.l]!.p = pivot }
  else { node.l = promoted.r; if (promoted.r !== null) tree.nodes[promoted.r]!.p = pivot }
  promoted.p = node.p
  if (node.p === null) tree.rootId = child
  else if (tree.nodes[node.p]!.l === pivot) tree.nodes[node.p]!.l = child
  else tree.nodes[node.p]!.r = child
  if (direction === 'left') promoted.l = pivot
  else promoted.r = pivot
  node.p = child
}

interface Predecessor { tree: MutableSnapshot; key: number; red: number }
function predecessors(target: MutableSnapshot): Predecessor[] {
  const result: Predecessor[] = [], seen = new Set<string>()
  // Reverse CLRS insertion. A repair has zero or more recolorings followed by
  // at most one simple/double rotation. Reversing those local transformations
  // gives every possible valid tree immediately before its last insertion.
  function undo(tree: MutableSnapshot, current: NodeId): void {
    const node = tree.nodes[current]!
    if (node.c !== 'R') return
    if (node.l === null && node.r === null) {
      const key = node.key
      if (node.p === null) tree.rootId = null
      else if (tree.nodes[node.p]!.l === current) tree.nodes[node.p]!.l = null
      else tree.nodes[node.p]!.r = null
      delete tree.nodes[current]
      if ((tree.rootId !== null && tree.nodes[tree.rootId]!.c !== 'B') || blackHeight(tree) < 0) return
      const nodes = Object.values(tree.nodes)
      // Every nontrivial insertion result retains a red leaf, including the
      // double-rotation case in which the newly inserted node becomes black.
      if (nodes.length > 1 && !nodes.some(n => n.c === 'R' && n.l === null && n.r === null)) return
      const keySignature = signature(tree)
      if (seen.has(keySignature)) return
      seen.add(keySignature)
      result.push({ tree, key, red: nodes.filter(n => n.c === 'R').length })
      return
    }
    if (node.l === null || node.r === null || tree.nodes[node.l]!.c !== 'B' || tree.nodes[node.r]!.c !== 'B') return
    const left = tree.nodes[node.l]!, right = tree.nodes[node.r]!
    const grandchildren = [left.l, left.r, right.l, right.r].filter((id): id is number => id !== null && tree.nodes[id]!.c === 'R')
    // Before a case-1 recoloring there was exactly one red-red violation.
    if (grandchildren.length !== 1) return
    node.c = 'B'; left.c = 'R'; right.c = 'R'
    undo(tree, grandchildren[0]!)
  }
  for (const [key, node] of Object.entries(target.nodes)) {
    const id = Number(key)
    if (node.c === 'R' && (node.p === null || target.nodes[node.p]!.c === 'B')) undo(copy(target), id)
    if (node.c !== 'B' || node.l === null || node.r === null || target.nodes[node.l]!.c !== 'R' || target.nodes[node.r]!.c !== 'R') continue
    for (const direction of ['left', 'right'] as const) {
      const tree = copy(target), grandparent = direction === 'left' ? node.r : node.l, current = direction === 'left' ? node.l : node.r
      rotate(tree, id, direction)
      tree.nodes[id]!.c = 'R'; tree.nodes[grandparent]!.c = 'B'
      undo(copy(tree), current)
      rotate(tree, id, direction === 'left' ? 'right' : 'left')
      undo(tree, id)
    }
  }
  if (target.rootId !== null) {
    const tree = copy(target)
    tree.nodes[tree.rootId!]!.c = 'R'
    undo(tree, tree.rootId!)
  }
  return result.sort((a, b) => b.red - a.red)
}

const impossible = new Set<string>()
// Store ranks, not original keys: equal colored topologies can share a witness.
const witnesses = new Map<string, number[]>()
function insertionOrder(tree: MutableSnapshot): number[] | null {
  if (tree.rootId === null) return []
  const key = signature(tree)
  if (impossible.has(key)) return null
  const keys = Object.values(tree.nodes).map(node => node.key).sort((a, b) => a - b), cached = witnesses.get(key)
  if (cached) return cached.map(rank => keys[rank]!)
  for (const predecessor of predecessors(tree)) {
    const previous = insertionOrder(predecessor.tree)
    if (previous) {
      const sequence = [...previous, predecessor.key]
      witnesses.set(key, sequence.map(value => keys.indexOf(value)))
      return sequence
    }
  }
  impossible.add(key)
  return null
}

// Use the actual insertion algorithm for the final verification, without
// recording animation snapshots during this private construction pass.
class ShapeContext extends EngineContext {
  override emit(): void { recomputeHeights(this.tree) }
}
export function redBlackShapeSequence(n: number, rank: bigint): number[] {
  const states = table(n)
  if (rank < 0n || rank >= countRedBlackShapes(n)) throw new RangeError('Índice de formato inválido.')
  if (!n) return []
  let selected: Shape | null = null
  for (const state of states) {
    if (!state.black) continue
    if (rank >= state.count) { rank -= state.count; continue }
    selected = unrank(n, state, rank)
    break
  }
  if (!selected) throw new Error('Formato rubro-negro indisponível.')
  const heights = Array.from({ length: 7 }, (_, i) => i).filter(height => canColor(selected, 'B', height)).sort((a, b) => score(selected, 'B', b) - score(selected, 'B', a))
  for (const height of heights) for (const coloring of colorings(selected, 'B', height)) {
    const tree = snapshot(coloring), sequence = insertionOrder(tree)
    if (!sequence) continue
    const ctx = new ShapeContext('rb')
    for (const key of sequence) rbInsert(ctx, key)
    if (signature(ctx.tree) !== signature(tree)) throw new Error('A sequência não reproduziu o formato rubro-negro.')
    // Bound memory retained across repeated changes in the generator controls.
    if (witnesses.size > 20000) witnesses.clear()
    if (impossible.size > 20000) impossible.clear()
    return sequence
  }
  throw new Error('Não foi possível construir o formato rubro-negro.')
}

import { LEVEL_GAP, NODE_R, SIBLING_GAP } from './layout.config'
import type { LayoutResult, NodeId, Position, Snapshot, StepMeta } from './types'
interface Subtree { positions: Record<number, Position>; minX: number; maxX: number }
interface LayoutOptions { showNils?: boolean; extraBlack?: StepMeta['extraBlack'] }
/** Separate whole subtree intervals; every edge has the same absolute slope.
 * Variable vertical lengths avoid widening angles or crossing cousin branches.
 */
export function layoutTree(tree: Snapshot, options: LayoutOptions = {}): LayoutResult {
  const half = SIBLING_GAP / 2
  const slope = LEVEL_GAP / half
  function hasNil(parent: NodeId, side: 'L' | 'R'): boolean {
    return Boolean(options.showNils || (options.extraBlack?.id === null && options.extraBlack.parent === parent && options.extraBlack.side === side))
  }
  function solve(id: NodeId | null): Subtree {
    if (id === null) return { positions: {}, minX: 0, maxX: 0 }
    const node = tree.nodes[id]!, a = solve(node.l), b = solve(node.r)
    // Include virtual leaves in subtree bounds before packing their ancestors.
    if (node.l === null && hasNil(id, 'L')) a.minX = -half
    if (node.r === null && hasNil(id, 'R')) b.maxX = half
    const offset = Math.max(half, a.maxX + half, -b.minX + half)
    const positions: Record<number, Position> = { [id]: { x: 0, y: 0 } }
    for (const [branch, shift] of [[a, -offset], [b, offset]] as const) {
      for (const [childId, pos] of Object.entries(branch.positions)) positions[Number(childId)] = { x: pos.x + shift, y: pos.y + offset * slope }
    }
    const xs = Object.values(positions).map(p => p.x)
    const minX = Math.min(...xs, node.l === null ? hasNil(id, 'L') ? -half : 0 : a.minX - offset)
    const maxX = Math.max(...xs, node.r === null ? hasNil(id, 'R') ? half : 0 : b.maxX + offset)
    return { positions, minX, maxX }
  }
  const positions = solve(tree.rootId).positions
  const nils: LayoutResult['nils'] = []
  for (const [rawId, node] of Object.entries(tree.nodes)) {
    const id = Number(rawId), position = positions[id]!
    for (const side of ['L', 'R'] as const) {
      if ((side === 'L' ? node.l : node.r) === null && hasNil(id, side)) nils.push({ id: `nil:${id}:${side}`, parent: id, side, x: position.x + (side === 'L' ? -half : half), y: position.y + LEVEL_GAP })
    }
  }
  const all = [...Object.values(positions), ...nils]
  const margin = NODE_R + 20
  const bounds = all.length ? { minX: Math.min(...all.map(p => p.x)) - margin, minY: Math.min(...all.map(p => p.y)) - margin, maxX: Math.max(...all.map(p => p.x)) + margin, maxY: Math.max(...all.map(p => p.y)) + margin } : { minX: -margin, minY: -margin, maxX: margin, maxY: margin }
  return { positions, bounds, nils }
}

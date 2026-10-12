import { LEVEL_GAP, NODE_R, SIBLING_GAP } from './layout.config'
import type { LayoutResult, NodeId, Position, Snapshot, StepMeta } from './types'

interface Subtree { positions: Record<number, Position>; left: number[]; right: number[] }
interface LayoutOptions { showNils?: boolean; extraBlack?: StepMeta['extraBlack'] }

/** Tidy por contornos; filhos únicos conservam seu lado relativo ao pai. */
export function layoutTree(tree: Snapshot, options: LayoutOptions = {}): LayoutResult {
  function solve(id: NodeId | null): Subtree {
    if (id === null) return { positions: {}, left: [], right: [] }
    const node = tree.nodes[id]!, a = solve(node.l), b = solve(node.r)
    let offset = SIBLING_GAP / 2
    if (node.l !== null && node.r !== null) {
      for (let depth = 0; depth < Math.min(a.right.length, b.left.length); depth++) offset = Math.max(offset, (SIBLING_GAP + a.right[depth]! - b.left[depth]!) / 2)
    }
    const positions: Record<number, Position> = { [id]: { x: 0, y: 0 } }, left = [0], right = [0]
    for (const [branch, shift] of [[a, -offset], [b, offset]] as const) {
      for (const [childId, pos] of Object.entries(branch.positions)) positions[Number(childId)] = { x: pos.x + shift, y: pos.y + LEVEL_GAP }
      for (let depth = 0; depth < branch.left.length; depth++) {
        const level = depth + 1
        left[level] = Math.min(left[level] ?? Infinity, branch.left[depth]! + shift)
        right[level] = Math.max(right[level] ?? -Infinity, branch.right[depth]! + shift)
      }
    }
    return { positions, left, right }
  }
  const positions = solve(tree.rootId).positions
  const nils: LayoutResult['nils'] = []
  for (const [rawId, node] of Object.entries(tree.nodes)) {
    const id = Number(rawId), position = positions[id]!
    for (const side of ['L', 'R'] as const) {
      const child = side === 'L' ? node.l : node.r
      if (child === null && (options.showNils || (options.extraBlack?.id === null && options.extraBlack.parent === id && options.extraBlack.side === side))) nils.push({ id: `nil:${id}:${side}`, parent: id, side, x: position.x + (side === 'L' ? -1 : 1) * SIBLING_GAP / 2, y: position.y + LEVEL_GAP })
    }
  }
  const all = [...Object.values(positions), ...nils]
  const bounds = all.length ? { minX: Math.min(...all.map(p => p.x)) - NODE_R, minY: Math.min(...all.map(p => p.y)) - NODE_R, maxX: Math.max(...all.map(p => p.x)) + NODE_R, maxY: Math.max(...all.map(p => p.y)) + NODE_R } : { minX: -NODE_R, minY: -NODE_R, maxX: NODE_R, maxY: NODE_R }
  return { positions, bounds, nils }
}

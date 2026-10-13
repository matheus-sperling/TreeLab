import { EDGE_CLEARANCE, EDGE_GAP, LABEL_MARGIN, NIL_GAP, NODE_R, SIBLING_CLEARANCE } from './layout.config'
import type { LayoutResult, NodeId, Position, Snapshot, StepMeta } from './types'

interface LayoutOptions { showNils?: boolean; showHeights?: boolean; showLevels?: boolean; extraBlack?: StepMeta['extraBlack'] }
/** A horizontal slice of a rectangle or a diagonal edge. */
interface Contour { top: number; bottom: number; left: number; right: number; slope: number }
interface Subtree { positions: Record<number, Position>; nils: LayoutResult['nils']; contour: Contour[]; nil: boolean }

/**
 * Every branch is at 45°. Pack the occupied slices of siblings, including their
 * edges and annotations, rather than their entire horizontal bounding boxes.
 * Long branches therefore open space only where the two subtrees need it.
 */
export function layoutTree(tree: Snapshot, options: LayoutOptions = {}): LayoutResult {
  const rectangle = (x: number, y: number, halfWidth: number, halfHeight: number): Contour => ({ top: y - halfHeight, bottom: y + halfHeight, left: x - halfWidth, right: x + halfWidth, slope: 0 })
  const at = (shape: Contour, y: number, side: 'left' | 'right') => shape[side] + (y - shape.top) * shape.slope
  function hasNil(parent: NodeId, side: 'L' | 'R'): boolean {
    return Boolean(options.showNils || (options.extraBlack?.id === null && options.extraBlack.parent === parent && options.extraBlack.side === side))
  }
  function branch(child: NodeId | null, parent: NodeId, side: 'L' | 'R'): Subtree | null {
    if (child !== null) return solve(child)
    if (!hasNil(parent, side)) return null
    const extra = options.extraBlack?.id === null && options.extraBlack.parent === parent && options.extraBlack.side === side
    return { positions: {}, nils: [{ id: `nil:${parent}:${side}`, parent, side, x: 0, y: 0 }], contour: [rectangle(0, 0, extra ? 27 : 10, 10)], nil: true }
  }
  function separation(a: Subtree, b: Subtree): number {
    let distance = 0
    for (const left of a.contour) for (const right of b.contour) {
      const top = Math.max(left.top, right.top), bottom = Math.min(left.bottom, right.bottom)
      if (top > bottom) continue
      // The difference is linear on the common slice; its extrema are at its ends.
      distance = Math.max(distance, at(left, top, 'right') - at(right, top, 'left'), at(left, bottom, 'right') - at(right, bottom, 'left'))
    }
    return (distance + SIBLING_CLEARANCE) / 2
  }
  function solve(id: NodeId): Subtree {
    const node = tree.nodes[id]!, a = branch(node.l, id, 'L'), b = branch(node.r, id, 'R')
    const onlyVirtualChildren = (!a || a.nil) && (!b || b.nil)
    let offset = onlyVirtualChildren ? NIL_GAP : options.showLevels ? EDGE_GAP + 12 : EDGE_GAP
    if (a && b) offset = Math.max(offset, separation(a, b))
    const result: Subtree = { positions: { [id]: { x: 0, y: 0 } }, nils: [], contour: [rectangle(0, 0, NODE_R + 10, NODE_R + 10), rectangle(0, 35, 15, 9)], nil: false }
    if (id === tree.rootId) result.contour.push(rectangle(0, -36, 24, 7))
    if (options.showHeights) result.contour.push(rectangle(0, 0, 65, 10))
    if (options.showLevels) result.contour.push(rectangle(0, 52, 22, 7))
    for (const [child, sign] of [[a, -1], [b, 1]] as const) {
      if (!child) continue
      const x = sign * offset, y = offset
      for (const [childId, point] of Object.entries(child.positions)) result.positions[Number(childId)] = { x: point.x + x, y: point.y + y }
      result.nils.push(...child.nils.map(nil => ({ ...nil, x: nil.x + x, y: nil.y + y })))
      result.contour.push(...child.contour.map(shape => ({ ...shape, top: shape.top + y, bottom: shape.bottom + y, left: shape.left + x, right: shape.right + x })))
      result.contour.push({ top: 0, bottom: y, left: -EDGE_CLEARANCE, right: EDGE_CLEARANCE, slope: sign })
    }
    return result
  }
  const result = tree.rootId === null ? null : solve(tree.rootId)
  const positions = result?.positions ?? {}, nils = result?.nils ?? []
  const all: Position[] = [...Object.values(positions), ...nils]
  const horizontalMargin = options.showHeights ? 73 : LABEL_MARGIN
  const bounds = all.length ? {
    minX: Math.min(...all.map(p => p.x)) - horizontalMargin,
    minY: Math.min(...all.map(p => p.y)) - LABEL_MARGIN,
    maxX: Math.max(...all.map(p => p.x)) + horizontalMargin,
    maxY: Math.max(...all.map(p => p.y)) + (options.showLevels ? 64 : LABEL_MARGIN),
  } : { minX: -LABEL_MARGIN, minY: -LABEL_MARGIN, maxX: LABEL_MARGIN, maxY: LABEL_MARGIN }
  return { positions, bounds, nils }
}

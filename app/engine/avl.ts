import { bstDelete, bstInsert } from './bst'
import type { EngineContext } from './context'
import { balance, minimum } from './tree'
import type { CaseName, NodeId, Snapshot } from './types'

function savedHeights(tree: Snapshot): Map<NodeId, number> {
  return new Map(Object.entries(tree.nodes).map(([id, node]) => [Number(id), node.h]))
}

function rotate(ctx: EngineContext, pivot: NodeId, dir: 'left' | 'right', caseName: CaseName, childBalance: number, n = 1, of = 1): void {
  const node = ctx.tree.nodes[pivot]!
  const child = (dir === 'left' ? node.r : node.l)!
  const promoted = ctx.tree.nodes[child]!
  ctx.rotate(pivot, dir, {
    caseName,
    childBalance,
    rotation: { dir, pivot, child, movedSubtree: dir === 'left' ? promoted.l : promoted.r, n, of },
  })
  ctx.cost.heightUpdates += 2
}

/** Returns the promoted root and whether deletion can stop after a child with FB = 0. */
function rebalance(ctx: EngineContext, pivot: NodeId): { root: NodeId; unchangedHeight: boolean } {
  const node = ctx.tree.nodes[pivot]!
  const fb = balance(ctx.tree, pivot)
  const child = (fb > 0 ? node.l : node.r)!
  const childBalance = balance(ctx.tree, child)
  const caseName: CaseName = fb > 0 ? (childBalance >= 0 ? 'LL' : 'LR') : (childBalance <= 0 ? 'RR' : 'RL')
  if (caseName === 'LR') {
    rotate(ctx, child, 'left', caseName, childBalance, 1, 2)
    rotate(ctx, pivot, 'right', caseName, childBalance, 2, 2)
  }
  else if (caseName === 'RL') {
    rotate(ctx, child, 'right', caseName, childBalance, 1, 2)
    rotate(ctx, pivot, 'left', caseName, childBalance, 2, 2)
  }
  else rotate(ctx, pivot, caseName === 'LL' ? 'right' : 'left', caseName, childBalance)
  return { root: ctx.tree.nodes[pivot]!.p!, unchangedHeight: childBalance === 0 }
}

function update(ctx: EngineContext, id: NodeId): void {
  ctx.cost.heightUpdates++
  ctx.emit('update', 'avl.update', {
    key: ctx.tree.nodes[id]!.key,
    height: ctx.tree.nodes[id]!.h,
    balance: balance(ctx.tree, id),
  }, { [id]: 'current' }, undefined, 'avl-rebalance', 1)
}

export function avlInsert(ctx: EngineContext, key: number): void {
  const before = savedHeights(ctx.tree)
  const created = bstInsert(ctx, key)
  if (created === null) return
  let cursor = ctx.tree.nodes[created]!.p
  while (cursor !== null) {
    const node = ctx.tree.nodes[cursor]!
    update(ctx, cursor)
    if (Math.abs(balance(ctx.tree, cursor)) > 1) {
      rebalance(ctx, cursor)
      return
    }
    if (node.h === before.get(cursor)) return
    cursor = node.p
  }
}

export function avlDelete(ctx: EngineContext, key: number): void {
  const before = savedHeights(ctx.tree)
  // A transplanted successor inherits the removed node's structural height.
  // Its old height at its original position cannot decide when ascent stops.
  const removedEntry = Object.entries(ctx.tree.nodes).find(([, node]) => node.key === key)
  if (removedEntry) {
    const [removedId, removedNode] = removedEntry
    if (removedNode.l !== null && removedNode.r !== null)
      before.set(minimum(ctx.tree, removedNode.r), before.get(Number(removedId))!)
  }
  const { start, removed } = bstDelete(ctx, key)
  if (removed === null) return
  let cursor = start
  while (cursor !== null) {
    const node = ctx.tree.nodes[cursor]!
    update(ctx, cursor)
    if (Math.abs(balance(ctx.tree, cursor)) > 1) {
      const result = rebalance(ctx, cursor)
      if (result.unchangedHeight || ctx.tree.nodes[result.root]!.h === before.get(cursor)) return
      cursor = ctx.tree.nodes[result.root]!.p
    }
    else {
      if (node.h === before.get(cursor)) return
      cursor = node.p
    }
  }
}

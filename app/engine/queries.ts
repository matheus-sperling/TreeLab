import { findNode } from './bst'
import type { EngineContext } from './context'
import type { NodeId, Op, Snapshot, TraversalOrder, TreeNode } from './types'

export function traversalIds(tree: Snapshot, order: TraversalOrder): NodeId[] {
  const result: NodeId[] = []
  if (order === 'level') {
    const queue = tree.rootId === null ? [] : [tree.rootId]
    for (let i = 0; i < queue.length; i++) { const id = queue[i]!; result.push(id); const node = tree.nodes[id]!; if (node.l !== null) queue.push(node.l); if (node.r !== null) queue.push(node.r) }
  } else {
    function visit(id: NodeId | null): void {
      if (id === null) return
      const node = tree.nodes[id]!
      if (order === 'pre') result.push(id)
      visit(node.l)
      if (order === 'in') result.push(id)
      visit(node.r)
      if (order === 'post') result.push(id)
    }
    visit(tree.rootId)
  }
  return result
}

export function query(ctx: EngineContext, op: Exclude<Op, { t: 'i' | 'd' | 's'; k: number }>): void {
  if (op.t === 'walk') {
    const ids = traversalIds(ctx.tree, op.order), output: number[] = []
    for (const id of ids) {
      ctx.cost.visits++
      output.push(ctx.tree.nodes[id]!.key)
      ctx.emit('visit', 'visit', { key: ctx.tree.nodes[id]!.key, n: output.length, order: op.order }, { [id]: 'visited' }, { order: [...output] }, `bst-traversal-${op.order}`, 2)
    }
    ctx.emit('done', op.order === 'in' ? 'inorder-done' : 'traversal-done', { n: ids.length }, {}, { order: output }, `bst-traversal-${op.order}`, 3)
    return
  }
  let id: NodeId | null = ctx.tree.rootId
  const direction = op.t === 'min' || op.t === 'succ' ? 'l' : 'r'
  if (op.t === 'succ' || op.t === 'pred') {
    id = findNode(ctx, op.k)
    if (id === null) { ctx.emit('not-found', 'not-found', { key: op.k }, {}, undefined, 'bst-neighbor', 1); return }
    const original = id, node = ctx.tree.nodes[id]!
    const subtree = op.t === 'succ' ? node.r : node.l
    if (subtree !== null) id = subtree
    else {
      let parent = node.p
      while (parent !== null && ctx.tree.nodes[parent]![op.t === 'succ' ? 'r' : 'l'] === id) {
        ctx.cost.visits++; ctx.emit('descend', 'ancestor', { key: ctx.tree.nodes[parent]!.key }, { [parent]: 'current' }, undefined, 'bst-neighbor', 4); id = parent; parent = ctx.tree.nodes[parent]!.p
      }
      id = parent
      ctx.emit(id === null ? 'not-found' : 'found', id === null ? 'no-neighbor' : 'query-result', { key: id === null ? ctx.tree.nodes[original]!.key : ctx.tree.nodes[id]!.key, query: op.t }, id === null ? {} : { [id]: 'found' }, undefined, 'bst-neighbor', id === null ? 5 : 6)
      return
    }
  }
  if (id === null) { ctx.emit('not-found', 'empty-query'); return }
  while (true) {
    const node: TreeNode = ctx.tree.nodes[id]!
    ctx.cost.visits++
    ctx.emit('visit', 'query-visit', { key: node.key, query: op.t }, { [id]: 'current' }, undefined, op.t === 'succ' || op.t === 'pred' ? 'bst-neighbor' : 'bst-query', op.t === 'succ' || op.t === 'pred' ? 3 : 2)
    const next: NodeId | null = node[direction]
    if (next === null) break
    id = next
  }
  ctx.emit('found', 'query-result', { key: ctx.tree.nodes[id]!.key, query: op.t }, { [id]: 'found' }, undefined, op.t === 'succ' || op.t === 'pred' ? 'bst-neighbor' : 'bst-query', op.t === 'succ' || op.t === 'pred' ? 6 : 3)
}

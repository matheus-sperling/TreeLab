import type { EngineContext } from './context'
import { transplant } from './tree'
import type { NodeId, Role } from './types'

export function findNode(ctx: EngineContext, key: number, algo = 'bst-search'): NodeId | null {
  let current = ctx.tree.rootId
  const path: Record<number, Role> = {}
  while (current !== null) {
    const node = ctx.tree.nodes[current]!
    ctx.cost.comparisons++
    ctx.emit('compare', 'compare', { key, at: node.key }, { ...path, [current]: 'current' }, undefined, algo, 2)
    if (key === node.key) return current
    path[current] = 'path'
    const side = key < node.key ? 'l' : 'r'
    ctx.emit('descend', 'descend', { key, at: node.key, side }, { ...path, [current]: 'current' }, undefined, algo, 3)
    current = node[side]
  }
  return null
}

export function bstInsert(ctx: EngineContext, key: number): NodeId | null {
  let parent: NodeId | null = null, current = ctx.tree.rootId
  const path: Record<number, Role> = {}
  while (current !== null) {
    const node = ctx.tree.nodes[current]!
    ctx.cost.comparisons++
    ctx.emit('compare', 'compare', { key, at: node.key }, { ...path, [current]: 'current' }, undefined, 'bst-insert', 2)
    if (key === node.key) { ctx.emit('duplicate', 'duplicate', { key }, { [current]: 'found' }, undefined, 'bst-insert', 3); return null }
    parent = current
    const side = key < node.key ? 'l' : 'r'
    path[current] = 'path'
    ctx.emit('descend', 'descend', { key, at: node.key, side }, path, undefined, 'bst-insert', 4)
    current = node[side]
  }
  const id = ctx.create(key, ctx.type === 'rb' ? 'R' : undefined)
  const node = ctx.tree.nodes[id]!
  node.p = parent
  if (parent === null) ctx.tree.rootId = id
  else ctx.tree.nodes[parent]![key < ctx.tree.nodes[parent]!.key ? 'l' : 'r'] = id
  ctx.emit('attach', 'attach', { key, parent: parent === null ? null : ctx.tree.nodes[parent]!.key }, { ...path, [id]: 'new' }, undefined, 'bst-insert', 5)
  return id
}

export function bstDelete(ctx: EngineContext, key: number): { start: NodeId | null; removed: NodeId | null } {
  const removed = findNode(ctx, key, 'bst-delete')
  if (removed === null) { ctx.emit('not-found', 'not-found', { key }, {}, undefined, 'bst-delete', 4); return { start: null, removed: null } }
  const node = ctx.tree.nodes[removed]!
  ctx.emit('mark-delete', 'mark-delete', { key }, { [removed]: 'delete' }, undefined, 'bst-delete', 5)
  let start = node.p
  if (node.l === null || node.r === null) {
    const child = node.l ?? node.r
    transplant(ctx.tree, removed, child)
    delete ctx.tree.nodes[removed]
    ctx.emit('remove', 'remove', { key }, child === null ? {} : { [child]: 'moved' }, undefined, 'bst-delete', 6)
  } else {
    let next = node.r
    ctx.emit('find-successor', 'find-successor', { key: ctx.tree.nodes[next]!.key }, { [removed]: 'delete', [next]: 'successor' }, undefined, 'bst-delete', 7)
    while (ctx.tree.nodes[next]!.l !== null) {
      next = ctx.tree.nodes[next]!.l!
      ctx.cost.visits++
      ctx.emit('find-successor', 'find-successor', { key: ctx.tree.nodes[next]!.key }, { [removed]: 'delete', [next]: 'successor' }, undefined, 'bst-delete', 7)
    }
    const moved = ctx.tree.nodes[next]!
    if (moved.p !== removed) {
      start = moved.p
      transplant(ctx.tree, next, moved.r)
      moved.r = node.r
      ctx.tree.nodes[moved.r]!.p = next
    } else start = next
    transplant(ctx.tree, removed, next)
    moved.l = node.l
    ctx.tree.nodes[moved.l]!.p = next
    delete ctx.tree.nodes[removed]
    ctx.emit('transplant', 'transplant', { key, successor: moved.key }, { [next]: 'successor' }, undefined, 'bst-delete', 8)
  }
  return { start, removed }
}

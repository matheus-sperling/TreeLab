import type { Color, NodeId, Snapshot } from './types'

export const emptyTree = (): Snapshot => ({ rootId: null, nodes: {} })
export const cloneTree = (tree: Snapshot): Snapshot => ({ rootId: tree.rootId, nodes: Object.fromEntries(Object.entries(tree.nodes).map(([id, node]) => [id, { ...node }])) })
export const height = (tree: Snapshot, id: NodeId | null): number => id === null ? -1 : tree.nodes[id]!.h
export const color = (tree: Snapshot, id: NodeId | null): Color => id === null ? 'B' : tree.nodes[id]!.c ?? 'B'
export const balance = (tree: Snapshot, id: NodeId): number => height(tree, tree.nodes[id]!.l) - height(tree, tree.nodes[id]!.r)
export function recomputeHeights(tree: Snapshot): void {
  function walk(id: NodeId | null): number {
    if (id === null) return -1
    const node = tree.nodes[id]!
    node.h = 1 + Math.max(walk(node.l), walk(node.r))
    return node.h
  }
  walk(tree.rootId)
}
export function transplant(tree: Snapshot, removed: NodeId, replacement: NodeId | null): void {
  const node = tree.nodes[removed]!
  if (node.p === null) tree.rootId = replacement
  else if (tree.nodes[node.p]!.l === removed) tree.nodes[node.p]!.l = replacement
  else tree.nodes[node.p]!.r = replacement
  if (replacement !== null) tree.nodes[replacement]!.p = node.p
}
export function minimum(tree: Snapshot, id: NodeId): NodeId {
  let cursor = id
  while (tree.nodes[cursor]!.l !== null) cursor = tree.nodes[cursor]!.l!
  return cursor
}
export function maximum(tree: Snapshot, id: NodeId): NodeId {
  let cursor = id
  while (tree.nodes[cursor]!.r !== null) cursor = tree.nodes[cursor]!.r!
  return cursor
}
export function successor(tree: Snapshot, id: NodeId): NodeId | null {
  const node = tree.nodes[id]!
  if (node.r !== null) return minimum(tree, node.r)
  let cursor = id, parent = node.p
  while (parent !== null && tree.nodes[parent]!.r === cursor) { cursor = parent; parent = tree.nodes[parent]!.p }
  return parent
}
export function predecessor(tree: Snapshot, id: NodeId): NodeId | null {
  const node = tree.nodes[id]!
  if (node.l !== null) return maximum(tree, node.l)
  let cursor = id, parent = node.p
  while (parent !== null && tree.nodes[parent]!.l === cursor) { cursor = parent; parent = tree.nodes[parent]!.p }
  return parent
}
export function inorder(tree: Snapshot): number[] {
  const result: number[] = []
  function visit(id: NodeId | null): void { if (id === null) return; const node = tree.nodes[id]!; visit(node.l); result.push(node.key); visit(node.r) }
  visit(tree.rootId)
  return result
}

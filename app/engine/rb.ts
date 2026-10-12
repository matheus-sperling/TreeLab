import type { EngineContext } from './context'
import { color, transplant } from './tree'
import type { CaseName, NodeId, StepMeta } from './types'

function rotation(ctx: EngineContext, pivot: NodeId, dir: 'left' | 'right', caseName: CaseName, n = 1, of = 1): void {
  const child = (dir === 'left' ? ctx.tree.nodes[pivot]!.r : ctx.tree.nodes[pivot]!.l)!
  const movedSubtree = dir === 'left' ? ctx.tree.nodes[child]!.l : ctx.tree.nodes[child]!.r
  ctx.rotate(pivot, dir, { caseName, rotation: { pivot, child, dir, movedSubtree, n, of } })
}

function insertionCase(ctx: EngineContext, caseName: CaseName, id: NodeId, parent: NodeId, grandparent: NodeId): void {
  const line = caseName.startsWith('RB-I1') ? 2 : caseName.startsWith('RB-I2') ? 4 : 6
  ctx.emit('case', 'case', { caseName, key: ctx.tree.nodes[id]!.key }, {
    [id]: 'current', [parent]: 'violation', [grandparent]: 'pivot',
  }, { caseName }, 'rb-insert-fix', line)
}

export function rbInsert(ctx: EngineContext, key: number): void {
  let parent: NodeId | null = null
  let cursor = ctx.tree.rootId
  while (cursor !== null) {
    const node = ctx.tree.nodes[cursor]!
    ctx.cost.comparisons++
    ctx.emit('compare', 'compare', { key, at: node.key }, { [cursor]: 'current' }, undefined, 'rb-insert', 1)
    if (key === node.key) {
      ctx.emit('duplicate', 'duplicate', { key }, { [cursor]: 'found' }, undefined, 'rb-insert', 2)
      return
    }
    parent = cursor
    const dir = key < node.key ? 'left' : 'right'
    cursor = dir === 'left' ? node.l : node.r
    ctx.emit('descend', 'descend', { key, at: node.key, dir }, { [parent]: 'path' }, undefined, 'rb-insert', 2)
  }
  let id = ctx.create(key, 'R')
  ctx.tree.nodes[id]!.p = parent
  if (parent === null) ctx.tree.rootId = id
  else if (key < ctx.tree.nodes[parent]!.key) ctx.tree.nodes[parent]!.l = id
  else ctx.tree.nodes[parent]!.r = id
  ctx.emit('attach', 'attach', { key }, { [id]: 'new' }, undefined, 'rb-insert', 3)
  while (color(ctx.tree, ctx.tree.nodes[id]!.p) === 'R') {
    let p = ctx.tree.nodes[id]!.p!
    const g = ctx.tree.nodes[p]!.p!
    const mirror = ctx.tree.nodes[g]!.r === p
    const uncle = mirror ? ctx.tree.nodes[g]!.l : ctx.tree.nodes[g]!.r
    if (color(ctx.tree, uncle) === 'R') {
      insertionCase(ctx, mirror ? 'RB-I1-mirror' : 'RB-I1', id, p, g)
      ctx.setColor(p, 'B', 'rb-insert-fix', 3)
      ctx.setColor(uncle, 'B', 'rb-insert-fix', 3)
      ctx.setColor(g, 'R', 'rb-insert-fix', 3)
      id = g
      continue
    }
    const internal = mirror ? ctx.tree.nodes[p]!.l === id : ctx.tree.nodes[p]!.r === id
    if (internal) {
      const caseName = mirror ? 'RB-I2-mirror' : 'RB-I2'
      insertionCase(ctx, caseName, id, p, g)
      id = p
      rotation(ctx, p, mirror ? 'right' : 'left', caseName, 1, 2)
      p = ctx.tree.nodes[id]!.p!
    }
    const caseName = mirror ? 'RB-I3-mirror' : 'RB-I3'
    insertionCase(ctx, caseName, id, p, g)
    ctx.setColor(p, 'B', 'rb-insert-fix', 6)
    ctx.setColor(g, 'R', 'rb-insert-fix', 6)
    rotation(ctx, g, mirror ? 'left' : 'right', caseName, internal ? 2 : 1, internal ? 2 : 1)
  }
  ctx.setColor(ctx.tree.rootId, 'B', 'rb-insert-fix', 7)
}

function extraBlack(ctx: EngineContext, id: NodeId | null, parent: NodeId | null): StepMeta {
  return { extraBlack: { id, parent, side: parent !== null && ctx.tree.nodes[parent]!.r === id && ctx.tree.nodes[parent]!.l !== id ? 'R' : 'L' } }
}

function deletionCase(ctx: EngineContext, caseName: CaseName, parent: NodeId, sibling: NodeId | null, id: NodeId | null): void {
  const line = Number(caseName.slice(4, 5)) * 2
  ctx.emit('case', 'case', { caseName, key: ctx.tree.nodes[parent]!.key }, {
    [parent]: 'pivot', ...(sibling === null ? {} : { [sibling]: 'current' as const }),
    ...(id === null ? {} : { [id]: 'extra-black' as const }),
  }, { caseName, ...extraBlack(ctx, id, parent) }, 'rb-delete-fix', line)
}

function fixDeletion(ctx: EngineContext, initialId: NodeId | null, initialParent: NodeId | null): void {
  let id = initialId
  let parent = initialParent
  while (id !== ctx.tree.rootId && color(ctx.tree, id) === 'B' && parent !== null) {
    const mirror = ctx.tree.nodes[parent]!.l !== id
    let sibling = mirror ? ctx.tree.nodes[parent]!.l : ctx.tree.nodes[parent]!.r
    if (color(ctx.tree, sibling) === 'R') {
      const caseName = mirror ? 'RB-D1-mirror' : 'RB-D1'
      deletionCase(ctx, caseName, parent, sibling, id)
      ctx.setColor(sibling, 'B', 'rb-delete-fix', 3)
      ctx.setColor(parent, 'R', 'rb-delete-fix', 3)
      rotation(ctx, parent, mirror ? 'right' : 'left', caseName)
      sibling = mirror ? ctx.tree.nodes[parent]!.l : ctx.tree.nodes[parent]!.r
    }
    const near = sibling === null ? null : mirror ? ctx.tree.nodes[sibling]!.r : ctx.tree.nodes[sibling]!.l
    let far = sibling === null ? null : mirror ? ctx.tree.nodes[sibling]!.l : ctx.tree.nodes[sibling]!.r
    if (color(ctx.tree, near) === 'B' && color(ctx.tree, far) === 'B') {
      deletionCase(ctx, mirror ? 'RB-D2-mirror' : 'RB-D2', parent, sibling, id)
      ctx.setColor(sibling, 'R', 'rb-delete-fix', 5)
      id = parent
      parent = ctx.tree.nodes[id]!.p
      ctx.emit('extra-black', 'extra-black', { key: ctx.tree.nodes[id]!.key }, { [id]: 'extra-black' }, extraBlack(ctx, id, parent), 'rb-delete-fix', 5)
      continue
    }
    const needsNearRotation = color(ctx.tree, far) === 'B'
    if (needsNearRotation) {
      const caseName = mirror ? 'RB-D3-mirror' : 'RB-D3'
      deletionCase(ctx, caseName, parent, sibling, id)
      ctx.setColor(near, 'B', 'rb-delete-fix', 7)
      ctx.setColor(sibling, 'R', 'rb-delete-fix', 7)
      rotation(ctx, sibling!, mirror ? 'left' : 'right', caseName, 1, 2)
      sibling = mirror ? ctx.tree.nodes[parent]!.l : ctx.tree.nodes[parent]!.r
      far = sibling === null ? null : mirror ? ctx.tree.nodes[sibling]!.l : ctx.tree.nodes[sibling]!.r
    }
    const caseName = mirror ? 'RB-D4-mirror' : 'RB-D4'
    deletionCase(ctx, caseName, parent, sibling, id)
    ctx.setColor(sibling, color(ctx.tree, parent), 'rb-delete-fix', 9)
    ctx.setColor(parent, 'B', 'rb-delete-fix', 9)
    ctx.setColor(far, 'B', 'rb-delete-fix', 9)
    rotation(ctx, parent, mirror ? 'right' : 'left', caseName, needsNearRotation ? 2 : 1, needsNearRotation ? 2 : 1)
    id = ctx.tree.rootId
    parent = null
  }
  ctx.setColor(id, 'B', 'rb-delete-fix', 10)
}

export function rbDelete(ctx: EngineContext, key: number): void {
  let removed = ctx.tree.rootId
  while (removed !== null) {
    const node = ctx.tree.nodes[removed]!
    ctx.cost.comparisons++
    ctx.emit('compare', 'compare', { key, at: node.key }, { [removed]: 'current' }, undefined, 'rb-delete', 1)
    if (key === node.key) break
    const dir = key < node.key ? 'left' : 'right'
    ctx.emit('descend', 'descend', { key, at: node.key, dir }, { [removed]: 'path' }, undefined, 'rb-delete', 1)
    removed = dir === 'left' ? node.l : node.r
  }
  if (removed === null) {
    ctx.emit('not-found', 'not-found', { key }, {}, undefined, 'rb-delete', 2)
    return
  }
  const target = ctx.tree.nodes[removed]!
  ctx.emit('mark-delete', 'mark-delete', { key }, { [removed]: 'delete' }, undefined, 'rb-delete', 2)
  let moved = removed
  let originalColor = color(ctx.tree, moved)
  let replacement: NodeId | null
  let replacementParent: NodeId | null
  if (target.l === null || target.r === null) {
    replacement = target.l ?? target.r
    replacementParent = target.p
    transplant(ctx.tree, removed, replacement)
  } else {
    moved = target.r
    ctx.emit('find-successor', 'find-successor', { key: ctx.tree.nodes[moved]!.key }, { [moved]: 'successor', [removed]: 'delete' }, undefined, 'rb-delete', 3)
    ctx.cost.visits++
    while (ctx.tree.nodes[moved]!.l !== null) {
      moved = ctx.tree.nodes[moved]!.l!
      ctx.cost.visits++
      ctx.emit('find-successor', 'find-successor', { key: ctx.tree.nodes[moved]!.key }, { [moved]: 'successor', [removed]: 'delete' }, undefined, 'rb-delete', 3)
    }
    const successor = ctx.tree.nodes[moved]!
    originalColor = color(ctx.tree, moved)
    replacement = successor.r
    if (successor.p === removed) {
      replacementParent = moved
      if (replacement !== null) ctx.tree.nodes[replacement]!.p = moved
    } else {
      replacementParent = successor.p
      transplant(ctx.tree, moved, replacement)
      successor.r = target.r
      ctx.tree.nodes[successor.r]!.p = moved
    }
    transplant(ctx.tree, removed, moved)
    successor.l = target.l
    ctx.tree.nodes[successor.l]!.p = moved
  }
  delete ctx.tree.nodes[removed]
  ctx.emit('transplant', 'transplant', { key, replacement: moved === removed ? replacement === null ? null : ctx.tree.nodes[replacement]!.key : ctx.tree.nodes[moved]!.key }, moved === removed ? {} : { [moved]: 'successor' }, undefined, 'rb-delete', 4)
  if (moved !== removed) ctx.setColor(moved, target.c!, 'rb-delete', 4)
  ctx.emit('remove', 'remove', { key }, {}, undefined, 'rb-delete', 4)
  if (originalColor === 'B') {
    ctx.emit('extra-black', 'extra-black', { key: replacement === null ? null : ctx.tree.nodes[replacement]!.key }, replacement === null ? {} : { [replacement]: 'extra-black' }, extraBlack(ctx, replacement, replacementParent), 'rb-delete', 5)
    fixDeletion(ctx, replacement, replacementParent)
  }
}

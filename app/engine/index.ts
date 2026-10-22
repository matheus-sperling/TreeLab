import { avlDelete, avlInsert } from './avl'
import { bstDelete, bstInsert, findNode } from './bst'
import { EngineContext, emptyCost } from './context'
import { query } from './queries'
import { rbDelete, rbInsert } from './rb'
import { immutableSnapshot } from './tree'
import type { Op, SequenceResult, TreeType } from './types'

export function runSequence(type: TreeType, ops: readonly Op[]): SequenceResult {
  const ctx = new EngineContext(type), opRanges: [number, number][] = [], costs: SequenceResult['cost'] = []
  for (const [i, op] of ops.entries()) {
    ctx.op = i; ctx.cost = emptyCost()
    const start = ctx.steps.length
    const algo = op.t === 'i' ? `${type}-insert` : op.t === 'd' ? `${type}-delete` : op.t === 's' ? 'bst-search' : op.t === 'walk' ? `bst-traversal-${op.order}` : 'bst-query'
    ctx.emit('start', 'start', { action: op.t, key: 'k' in op ? op.k : null }, {}, undefined, algo)
    if ('k' in op && (!Number.isInteger(op.k) || Math.abs(op.k) > 999)) ctx.emit('not-found', 'invalid')
    else if (op.t === 'i' && Object.keys(ctx.tree.nodes).length >= 63 && !Object.values(ctx.tree.nodes).some(node => node.key === op.k)) ctx.emit('not-found', 'limit')
    else if (op.t === 'i') (type === 'bst' ? bstInsert : type === 'avl' ? avlInsert : rbInsert)(ctx, op.k)
    else if (op.t === 'd') (type === 'bst' ? bstDelete : type === 'avl' ? avlDelete : rbDelete)(ctx, op.k)
    else if (op.t === 's') { const id = findNode(ctx, op.k); ctx.emit(id === null ? 'not-found' : 'found', id === null ? 'not-found' : 'found', { key: op.k }, id === null ? {} : { [id]: 'found' }, undefined, 'bst-search', id === null ? 4 : 5) }
    else query(ctx, op)
    if (ctx.steps.at(-1)?.kind !== 'done') ctx.emit('done', 'done')
    opRanges.push([start, ctx.steps.length - 1]); costs.push({ ...ctx.cost })
  }
  return { steps: ctx.steps, opRanges, cost: costs, final: immutableSnapshot(ctx.tree) }
}

export type * from './types'
export { encodeOps, decodeOps } from './codec'
export { parseInput } from './input'
export { layoutTree } from './layout'
export { NODE_R, LEVEL_GAP, SIBLING_GAP } from './layout.config'
export { messages, getMessage, caseLabels, getCaseLabel } from './messages'
export { pseudocode, PSEUDOCODE } from './pseudocode'
export { presets, PRESETS, seededSequence } from './presets'
export type { Preset } from './presets'
export { countTreeShapes, isShapeSeed, normalizeShapeSeed, shapeSequence } from './shapes'
export { traversalIds } from './queries'
export { balance, height, inorder, minimum, maximum, successor, predecessor } from './tree'
export { validate, blackHeight } from './validate'

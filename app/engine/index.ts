import { avlDelete, avlInsert } from './avl'
import { bstDelete, bstInsert, findNode } from './bst'
import { EngineContext, emptyCost } from './context'
import { query } from './queries'
import { rbDelete, rbInsert } from './rb'
import { cloneTree } from './tree'
import type { Op, SequenceResult, TreeType } from './types'

export function runSequence(type: TreeType, ops: readonly Op[]): SequenceResult {
  const ctx = new EngineContext(type), opRanges: [number, number][] = [], costs: SequenceResult['cost'] = []
  for (const [i, op] of ops.entries()) {
    ctx.op = i; ctx.cost = emptyCost()
    const start = ctx.steps.length
    const action = op.t === 'i' ? 'inserir' : op.t === 'd' ? 'remover' : op.t === 's' ? 'buscar' : op.t === 'walk' ? 'percorrer a árvore' : 'consultar a árvore'
    ctx.emit('start', 'start', { action, key: 'k' in op ? op.k : null })
    if ('k' in op && (!Number.isInteger(op.k) || Math.abs(op.k) > 999)) ctx.emit('not-found', 'invalid')
    else if (op.t === 'i' && Object.keys(ctx.tree.nodes).length >= 63 && !Object.values(ctx.tree.nodes).some(node => node.key === op.k)) ctx.emit('not-found', 'limit')
    else if (op.t === 'i') (type === 'bst' ? bstInsert : type === 'avl' ? avlInsert : rbInsert)(ctx, op.k)
    else if (op.t === 'd') (type === 'bst' ? bstDelete : type === 'avl' ? avlDelete : rbDelete)(ctx, op.k)
    else if (op.t === 's') { const id = findNode(ctx, op.k); ctx.emit(id === null ? 'not-found' : 'found', id === null ? 'not-found' : 'found', { key: op.k }, id === null ? {} : { [id]: 'found' }, undefined, 'bst-search', 4) }
    else query(ctx, op)
    if (ctx.steps.at(-1)?.kind !== 'done') ctx.emit('done', 'done')
    opRanges.push([start, ctx.steps.length - 1]); costs.push({ ...ctx.cost })
  }
  return { steps: ctx.steps, opRanges, cost: costs, final: cloneTree(ctx.tree) }
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
export { traversalIds } from './queries'
export { balance, height, inorder, minimum, maximum, successor, predecessor } from './tree'
export { validate, blackHeight } from './validate'

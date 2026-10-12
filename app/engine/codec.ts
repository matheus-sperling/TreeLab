import type { Op, TraversalOrder } from './types'

export function encodeOps(ops: readonly Op[]): string {
  return ops.map(op => 'k' in op ? `${op.t === 'succ' ? 'u' : op.t === 'pred' ? 'p' : op.t}${op.k}` : op.t === 'walk' ? `w${op.order}` : op.t).join('.')
}
export function decodeOps(encoded: string): Op[] {
  if (!encoded) return []
  if (encoded.length > 6000) throw new Error('Sequência longa demais')
  return encoded.split('.').map(token => {
    const match = /^([idsup])(-?\d{1,3})$/.exec(token)
    if (match) {
      const key = Number(match[2]), type = match[1]!
      if (Math.abs(key) > 999) throw new Error('Valor fora do limite')
      return { t: type === 'u' ? 'succ' : type === 'p' ? 'pred' : type as 'i' | 'd' | 's', k: key }
    }
    if (token === 'min' || token === 'max') return { t: token }
    const walk = /^w(in|pre|post|level)$/.exec(token)
    if (walk) return { t: 'walk', order: walk[1] as TraversalOrder }
    throw new Error('Sequência inválida')
  })
}

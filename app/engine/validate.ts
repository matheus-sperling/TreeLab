import type { NodeId, Snapshot, TreeType, Validation } from './types'

export function validate(tree: Snapshot, type: TreeType = 'bst'): Validation {
  const errors: string[] = [], seen = new Set<NodeId>()
  function walk(id: NodeId | null, parent: NodeId | null, low: number, high: number): { height: number; black: number } {
    if (id === null) return { height: -1, black: 1 }
    const node = tree.nodes[id]
    if (!node) { errors.push(`Ponteiro inexistente: ${id}`); return { height: -1, black: 0 } }
    if (seen.has(id)) { errors.push(`Ciclo ou filho repetido: ${id}`); return { height: -1, black: 0 } }
    seen.add(id)
    if (node.p !== parent) errors.push(`Pai incorreto: ${id}`)
    if (!Number.isInteger(node.key) || node.key <= low || node.key >= high) errors.push(`Ordem ABB inválida: ${id}`)
    const left = walk(node.l, id, low, node.key), right = walk(node.r, id, node.key, high)
    const height = 1 + Math.max(left.height, right.height)
    if (node.h !== height) errors.push(`Altura incorreta: ${id}`)
    if (type === 'avl' && Math.abs(left.height - right.height) > 1) errors.push(`FB fora do limite: ${id}`)
    if (type === 'rb') {
      if (node.c !== 'B' && node.c !== 'R') errors.push(`Cor inválida: ${id}`)
      if (node.c === 'R' && ((node.l !== null && tree.nodes[node.l]?.c === 'R') || (node.r !== null && tree.nodes[node.r]?.c === 'R'))) errors.push(`Vermelhos consecutivos: ${id}`)
      if (left.black !== right.black) errors.push(`Altura negra desigual: ${id}`)
    }
    return { height, black: left.black + (node.c === 'B' ? 1 : 0) }
  }
  if (tree.rootId !== null && type === 'rb' && tree.nodes[tree.rootId]?.c !== 'B') errors.push('Raiz deve ser preta')
  const result = walk(tree.rootId, null, -Infinity, Infinity)
  if (seen.size !== Object.keys(tree.nodes).length) errors.push('Nós desconectados da raiz')
  return { valid: errors.length === 0, errors, count: seen.size, height: result.height, ...(type === 'rb' ? { blackHeight: tree.rootId === null ? 0 : result.black - (tree.nodes[tree.rootId]?.c === 'B' ? 1 : 0) } : {}) }
}

/** CLRS: pretos descendentes, excluindo o nó inicial e incluindo NIL. */
export function blackHeight(tree: Snapshot, id: NodeId | null): number {
  if (id === null) return 0
  let current = tree.nodes[id]!.l, result = 1
  while (current !== null) { const node = tree.nodes[current]!; if (node.c === 'B') result++; current = node.l }
  return result
}

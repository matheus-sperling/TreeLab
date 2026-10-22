import { countRedBlackShapes, redBlackShapeSequence } from './rbShapes'
import type { Op, TreeType } from './types'

export interface TreeShape { left: TreeShape | null; right: TreeShape | null }
export type ShapeSeed = string | number | bigint
const MAX_NODES = 63
const binaryCounts: bigint[] = [1n]
const avlCounts: Map<number, bigint>[] = [new Map([[0, 1n]])]

function checkSize(n: number): void {
  if (!Number.isInteger(n) || n < 0 || n > MAX_NODES) throw new RangeError('Use entre 0 e 63 nós.')
}

function prepare(n: number): void {
  for (let size = binaryCounts.length; size <= n; size++) {
    let binary = 0n
    const heights = new Map<number, bigint>()
    for (let left = 0; left < size; left++) {
      const right = size - left - 1
      binary += binaryCounts[left]! * binaryCounts[right]!
      for (const [a, countA] of avlCounts[left]!) for (const [b, countB] of avlCounts[right]!) {
        if (Math.abs(a - b) > 1) continue
        const height = Math.max(a, b) + 1
        heights.set(height, (heights.get(height) ?? 0n) + countA * countB)
      }
    }
    binaryCounts.push(binary)
    avlCounts.push(heights)
  }
}

/** Counts ordered topologies, ignoring labels, node IDs and red/black colorings. */
export function countTreeShapes(type: TreeType, n: number): bigint {
  checkSize(n)
  if (type === 'rb') return countRedBlackShapes(n)
  prepare(n)
  if (type === 'bst') return binaryCounts[n]!
  return [...avlCounts[n]!.values()].reduce((sum, count) => sum + count, 0n)
}

function seedValue(seed: ShapeSeed): bigint | null {
  if (typeof seed === 'bigint') return seed >= 0n ? seed : null
  if (typeof seed === 'number' && (!Number.isSafeInteger(seed) || seed < 0)) return null
  return /^\d+$/.test(String(seed)) ? BigInt(seed) : null
}

export function isShapeSeed(type: TreeType, n: number, seed: ShapeSeed): boolean {
  if (!Number.isInteger(n) || n < 0 || n > MAX_NODES) return false
  const value = seedValue(seed)
  return value !== null && value < countTreeShapes(type, n)
}

/** Keep preferences serializable, and clamp when the size or tree type changes. */
export function normalizeShapeSeed(type: TreeType, n: number, seed: ShapeSeed): string {
  const value = seedValue(seed) ?? 0n, max = countTreeShapes(type, n) - 1n
  return (value > max ? max : value).toString()
}

function binaryShape(n: number, rank: bigint): TreeShape | null {
  if (!n) return null
  for (let left = 0; left < n; left++) {
    const right = n - left - 1, countRight = binaryCounts[right]!, block = binaryCounts[left]! * countRight
    if (rank >= block) { rank -= block; continue }
    return { left: binaryShape(left, rank / countRight), right: binaryShape(right, rank % countRight) }
  }
  throw new RangeError('Formato de ABB inválido.')
}

function avlShape(n: number, height: number, rank: bigint): TreeShape | null {
  if (!n) return null
  for (let left = 0; left < n; left++) {
    const right = n - left - 1
    for (const [a, countA] of avlCounts[left]!) for (const [b, countB] of avlCounts[right]!) {
      if (Math.abs(a - b) > 1 || Math.max(a, b) + 1 !== height) continue
      const block = countA * countB
      if (rank >= block) { rank -= block; continue }
      return { left: avlShape(left, a, rank / countB), right: avlShape(right, b, rank % countB) }
    }
  }
  throw new RangeError('Formato de AVL inválido.')
}

interface KeyedShape { key: number; left: KeyedShape | null; right: KeyedShape | null }
function assignKeys(shape: TreeShape | null): KeyedShape | null {
  let key = 0
  function visit(node: TreeShape | null): KeyedShape | null {
    if (!node) return null
    const left = visit(node.left), value = ++key, right = visit(node.right)
    return { key: value, left, right }
  }
  return visit(shape)
}

/** One canonical insertion order per final shape; values are always 1 through n. */
export function shapeSequence(type: TreeType, n: number, seed: ShapeSeed): Op[] {
  if (!isShapeSeed(type, n, seed)) throw new RangeError('A semente está fora dos formatos disponíveis.')
  let rank = seedValue(seed)!
  if (type === 'rb') return redBlackShapeSequence(n, rank).map(k => ({ t: 'i', k }))
  prepare(n)
  let shape: TreeShape | null = null
  if (type === 'bst') shape = binaryShape(n, rank)
  else for (const [height, count] of avlCounts[n]!) {
    if (rank >= count) { rank -= count; continue }
    shape = avlShape(n, height, rank)
    break
  }
  const keyed = assignKeys(shape), keys: number[] = []
  if (type === 'bst') {
    const visit = (node: KeyedShape | null): void => { if (!node) return; keys.push(node.key); visit(node.left); visit(node.right) }
    visit(keyed)
  } else if (keyed) {
    // Every breadth-first prefix of an AVL topology remains height-balanced.
    const queue = [keyed]
    for (let index = 0; index < queue.length; index++) {
      const node = queue[index]!
      keys.push(node.key)
      if (node.left) queue.push(node.left)
      if (node.right) queue.push(node.right)
    }
  }
  return keys.map(k => ({ t: 'i', k }))
}

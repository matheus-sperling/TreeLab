import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { getMessage, runSequence } from '../engine'
import type { Op, Snapshot, TreeType } from '../engine/types'

const empty: Snapshot = { rootId: null, nodes: {} }
const cache = new Map<string, ReturnType<typeof runSequence>>()

export function isValidOperation(value: unknown): value is Op {
  if (!value || typeof value !== 'object' || !('t' in value)) return false
  const op = value as Record<string, unknown>
  if (typeof op.t !== 'string') return false
  if (['i', 'd', 's', 'succ', 'pred'].includes(op.t)) return typeof op.k === 'number' && Number.isInteger(op.k) && Math.abs(op.k) <= 999
  if (op.t === 'walk') return typeof op.order === 'string' && ['in', 'pre', 'post', 'level'].includes(op.order)
  return op.t === 'min' || op.t === 'max'
}

export const useLabStore = defineStore('lab', () => {
  const type = ref<TreeType>('avl')
  const operations = ref<Op[]>([])
  const cursor = ref(0)
  const seeking = ref(true)
  const result = computed(() => {
    const key = `${type.value}:${JSON.stringify(operations.value)}`
    let value = cache.get(key)
    if (!value) {
      value = runSequence(type.value, operations.value)
      if (cache.size > 24) cache.delete(cache.keys().next().value ?? '')
      cache.set(key, value)
    }
    return value
  })
  const step = computed(() => result.value.steps[cursor.value])
  const tree = computed(() => step.value?.tree ?? empty)
  const operationIndex = computed(() => step.value?.op ?? 0)
  const range = computed(() => result.value.opRanges[operationIndex.value] ?? [0, 0])
  const operationCost = computed(() => result.value.cost[operationIndex.value])
  const totalCost = computed(() => result.value.cost.reduce((sum, cost) => ({
    comparisons: sum.comparisons + cost.comparisons, rotations: sum.rotations + cost.rotations,
    recolorings: sum.recolorings + cost.recolorings, heightUpdates: sum.heightUpdates + cost.heightUpdates,
    visits: sum.visits + cost.visits,
  }), { comparisons: 0, rotations: 0, recolorings: 0, heightUpdates: 0, visits: 0 }))
  const operationIssues = computed(() => result.value.opRanges.map(([start, end]) => {
    const issue = result.value.steps.slice(start, end + 1).find(step => ['duplicate', 'not-found', 'empty-query', 'no-neighbor', 'invalid', 'limit'].includes(step.msg.key))
    return issue ? getMessage(issue.msg) : ''
  }))
  function seek(index: number, instant = true) {
    seeking.value = instant
    const target = Number.isFinite(index) ? Math.trunc(index) : 0
    cursor.value = Math.max(0, Math.min(target, result.value.steps.length - 1))
  }
  function append(ops: Op[]) {
    if (!Array.isArray(ops) || !ops.length || !ops.every(isValidOperation)) return false
    const first = operations.value.length
    operations.value = [...operations.value, ...ops.map(op => ({ ...op }))]
    seek(result.value.opRanges[first]?.[0] ?? 0)
    return true
  }
  function changeType(next: TreeType) {
    const op = operationIndex.value
    type.value = next
    seek(result.value.opRanges[op]?.[1] ?? 0)
  }
  function replace(ops: readonly Op[], position: 'start' | 'end' | number = 'end') {
    if (!Array.isArray(ops) || !ops.every(isValidOperation)) return false
    operations.value = ops.map(op => ({ ...op }))
    seek(position === 'start' ? 0 : position === 'end' ? result.value.steps.length - 1 : position)
    return true
  }
  function validIndex(index: number) { return Number.isInteger(index) && index >= 0 && index < operations.value.length }
  function removeOperation(index: number) {
    if (!validIndex(index)) return undefined
    const removed = operations.value[index]
    operations.value = operations.value.filter((_, i) => i !== index)
    seek(result.value.opRanges[index]?.[0] ?? result.value.steps.length - 1)
    return removed
  }
  function updateOperation(index: number, op: Op) {
    if (!validIndex(index) || !isValidOperation(op)) return false
    if (JSON.stringify(operations.value[index]) === JSON.stringify(op)) return false
    operations.value = operations.value.map((current, i) => i === index ? { ...op } : current)
    seek(result.value.opRanges[index]?.[0] ?? 0)
    return true
  }
  function moveOperation(from: number, to: number) {
    if (!validIndex(from) || !validIndex(to) || from === to) return false
    const next = [...operations.value]
    const [op] = next.splice(from, 1)
    next.splice(to, 0, op!)
    operations.value = next
    seek(result.value.opRanges[Math.min(from, to)]?.[0] ?? 0)
    return true
  }
  function operationIssue(index: number) {
    if (!validIndex(index)) return ''
    return operationIssues.value[index] ?? ''
  }
  return { type, operations, cursor, seeking, result, step, tree, operationIndex, range, operationCost, totalCost, seek, append, changeType, replace, removeOperation, updateOperation, moveOperation, operationIssue }
})

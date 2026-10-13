import { defineStore } from 'pinia'
import { runSequence } from '../engine'
import type { Op, Snapshot, TreeType } from '../engine/types'

const empty: Snapshot = { rootId: null, nodes: {} }
const cache = new Map<string, ReturnType<typeof runSequence>>()

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
  function seek(index: number, instant = true) {
    seeking.value = instant
    const target = Number.isFinite(index) ? Math.trunc(index) : 0
    cursor.value = Math.max(0, Math.min(target, result.value.steps.length - 1))
  }
  function append(ops: Op[]) {
    const first = operations.value.length
    operations.value = [...operations.value, ...ops]
    seek(result.value.opRanges[first]?.[0] ?? 0)
  }
  function changeType(next: TreeType) {
    const op = operationIndex.value
    type.value = next
    seek(result.value.opRanges[op]?.[1] ?? 0)
  }
  function replace(ops: Op[], start = false) { operations.value = [...ops]; seek(start ? 0 : result.value.steps.length - 1) }
  function updateOperation(index: number, op: Op) {
    operations.value = operations.value.map((value, i) => i === index ? op : value)
    seek(result.value.opRanges[index]?.[0] ?? 0)
  }
  function moveOperation(index: number, delta: number) {
    const next = index + delta
    if (next < 0 || next >= operations.value.length) return
    const ops = [...operations.value]
    ;[ops[index], ops[next]] = [ops[next]!, ops[index]!]
    operations.value = ops
    seek(result.value.opRanges[Math.min(index, next)]?.[0] ?? 0)
  }
  function removeOperation(index: number) {
    const removed = operations.value[index]
    operations.value = operations.value.filter((_, i) => i !== index)
    seek(result.value.opRanges[Math.max(0, index - 1)]?.[1] ?? 0)
    return removed
  }
  return { type, operations, cursor, seeking, result, step, tree, operationIndex, range, operationCost, totalCost, seek, append, changeType, replace, removeOperation, updateOperation, moveOperation }
})

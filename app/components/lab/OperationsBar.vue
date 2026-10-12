<script setup lang="ts">
import { useLabStore } from '../../stores/lab'
import type { Op } from '../../engine/types'
const emit = defineEmits<{ seek: [index: number]; remove: [index: number] }>()
const lab = useLabStore()
const rail = ref<HTMLElement | null>(null)
let timer: ReturnType<typeof setTimeout> | undefined
let removed = false
function label(op: Op) { if (op.t === 'i') return `+${op.k}`; if (op.t === 'd') return `−${op.k}`; if (op.t === 's') return `?${op.k}`; if (op.t === 'walk') return ({ in: 'in-ordem', pre: 'pré-ordem', post: 'pós-ordem', level: 'nível' })[op.order]; if (op.t === 'succ') return `sucessor ${op.k}`; if (op.t === 'pred') return `predecessor ${op.k}`; return op.t === 'min' ? 'mínimo' : 'máximo' }
function invalid(index: number) { const [start = 0, end = 0] = lab.result.opRanges[index] ?? []; return lab.result.steps.slice(start, end).some(step => ['duplicate', 'not-found'].includes(step.kind)) }
function down(index: number) { removed = false; timer = setTimeout(() => { removed = true; emit('remove', index) }, 650) }
function up() { if (timer) clearTimeout(timer) }
function select(index: number) { if (!removed) emit('seek', lab.result.opRanges[index]?.[1] ?? 0) }
watch(() => lab.operationIndex, () => nextTick(() => rail.value?.querySelector('[aria-current="step"]')?.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'instant' })))
onBeforeUnmount(up)
</script>
<template><div ref="rail" class="operations-rail" aria-label="Sequência de operações"><span v-if="!lab.operations.length" class="empty-rail">Sua sequência aparece aqui</span><button v-for="(op, index) in lab.operations" :key="`${index}:${label(op)}`" type="button" :class="{ active: lab.operationIndex === index, ineffective: invalid(index) }" :aria-current="lab.operationIndex === index ? 'step' : undefined" :aria-label="`${label(op)}. Tocar para ver; segurar para remover.`" @pointerdown="down(index)" @pointerup="up" @pointerleave="up" @pointercancel="up" @click="select(index)"><Icon v-if="invalid(index)" name="lucide:circle-slash" />{{ label(op) }}</button></div></template>
<style scoped>.operations-rail { min-height: 52px; display: flex; align-items: center; gap: 8px; overflow-x: auto; padding: 0 16px; border-bottom: 1px solid var(--border); scrollbar-width: none; }.empty-rail { font-size: 12px; color: var(--muted); }.operations-rail button { flex-shrink: 0; min-width: 48px; min-height: 48px; padding: 0 12px; border-radius: 10px; color: var(--muted); font: 13px 'JetBrains Mono', monospace; display: flex; align-items: center; gap: 5px; }.operations-rail button.active { background: var(--surface-2); color: var(--accent); }.operations-rail button.ineffective { opacity: .65; }.operations-rail :deep(.iconify) { width: 14px; height: 14px; }</style>

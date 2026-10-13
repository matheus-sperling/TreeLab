<script setup lang="ts">
import { nextTick, ref, watch } from 'vue'
import { useLabStore } from '../../stores/lab'
import type { Op } from '../../engine/types'

const emit = defineEmits<{ seek: [index: number]; edit: [index?: number]; clear: [] }>()
const props = withDefaults(defineProps<{ reduced?: boolean }>(), { reduced: false })
const lab = useLabStore()
const rail = ref<HTMLElement | null>(null)
function label(op: Op) {
  if (op.t === 'i') return `+${op.k}`
  if (op.t === 'd') return `−${op.k}`
  if (op.t === 's') return `?${op.k}`
  if (op.t === 'walk') return ({ in: 'in-ordem', pre: 'pré-ordem', post: 'pós-ordem', level: 'nível' })[op.order]
  if (op.t === 'succ') return `sucessor ${op.k}`
  if (op.t === 'pred') return `predecessor ${op.k}`
  return op.t === 'min' ? 'mínimo' : 'máximo'
}
function description(op: Op) {
  if (op.t === 'i') return `Inserir ${op.k}`
  if (op.t === 'd') return `Remover ${op.k}`
  if (op.t === 's') return `Buscar ${op.k}`
  return label(op)
}
function select(index: number) { emit('seek', lab.result.opRanges[index]?.[0] ?? 0) }
watch(() => lab.operationIndex, () => nextTick(() => rail.value?.querySelector('[aria-current="step"]')?.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'instant' })))
</script>

<template>
  <div class="operations-bar" :class="{ reduced: props.reduced }">
    <div ref="rail" class="operations-rail" role="group" aria-label="Sequência de operações">
      <span v-if="!lab.operations.length" class="empty-rail">Comece inserindo seus números</span>
      <button v-for="(op, index) in lab.operations" :key="`${index}:${label(op)}`" type="button" :class="{ active: lab.operationIndex === index, ineffective: !!lab.operationIssue(index) }" :aria-current="lab.operationIndex === index ? 'step' : undefined" :aria-label="`${description(op)}. Ver desde o início.${lab.operationIssue(index) ? ` ${lab.operationIssue(index)}` : ''}`" :title="lab.operationIssue(index) || description(op)" @click="select(index)">
        <Icon v-if="lab.operationIssue(index)" name="lucide:circle-alert" />
        {{ label(op) }}
      </button>
    </div>
    <div class="sequence-actions">
      <button type="button" class="edit-sequence" aria-label="Editar sequência de operações" title="Editar tipos, números e ordem" @click="emit('edit', lab.operations.length ? lab.operationIndex : undefined)"><Icon name="lucide:list-filter" /><span>Editar</span></button>
      <button type="button" class="clear-sequence" aria-label="Limpar toda a árvore e a sequência" title="Limpar tudo" :disabled="!lab.operations.length" @click="emit('clear')"><Icon name="lucide:trash-2" /></button>
    </div>
  </div>
</template>

<style scoped>
.operations-bar { display:flex; min-width:0; flex-shrink:0; border-bottom:1px solid var(--border); background:var(--bg); }
.operations-rail { min-width:0; min-height:52px; flex:1; display:flex; align-items:center; gap:6px; overflow-x:auto; padding:0 12px 0 16px; scrollbar-width:none; }
.empty-rail { white-space:nowrap; font-size:12px; color:var(--muted); }
.operations-rail button { flex-shrink:0; min-width:44px; min-height:44px; padding:0 10px; border:1px solid transparent; border-radius:10px; color:var(--muted); font:13px 'JetBrains Mono',monospace; display:flex; align-items:center; gap:5px; transition:background .16s,color .16s,transform .12s; }
.operations-rail button.active { background:var(--surface-2); color:var(--accent); border-color:var(--border); }
.operations-rail button.ineffective :deep(.iconify) { color:var(--compare); width:13px; height:13px; }
.operations-rail button:active,.sequence-actions button:active { transform:scale(.94); }
.sequence-actions { display:flex; align-items:center; gap:0; padding:0 8px 0 4px; border-left:1px solid var(--border); background:var(--bg); }
.sequence-actions button { display:flex; justify-content:center; align-items:center; gap:6px; min-height:44px; border-radius:10px; transition:background .16s,transform .12s; }
.edit-sequence { padding:0 8px; color:var(--accent); font-size:12px; }
.clear-sequence { width:44px; color:var(--muted); }
.sequence-actions :deep(.iconify) { width:17px; height:17px; flex-shrink:0; }
.operations-bar.reduced button { transition:none; }
.operations-bar.reduced button:active { transform:none; }
@media (hover:hover) { .operations-rail button:hover,.sequence-actions button:hover { background:var(--surface-2); } }
@media (max-width:360px) { .edit-sequence span { position:absolute; width:1px; height:1px; overflow:hidden; clip-path:inset(50%); }.edit-sequence { width:44px; }.operations-rail { padding-left:12px; } }
@media (prefers-reduced-motion:reduce) { .operations-bar button { transition:none; }.operations-bar button:active { transform:none; } }
</style>

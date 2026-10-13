<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { useLabStore } from '../../stores/lab'
import type { Op, TraversalOrder } from '../../engine/types'
import { parseValues } from './input'

const props = withDefaults(defineProps<{ initialIndex?: number; reduced?: boolean }>(), { initialIndex: undefined, reduced: false })
const emit = defineEmits<{ close: []; clear: []; change: [] }>()
const lab = useLabStore()
const editor = ref<HTMLElement | null>(null)
const addType = ref<'i' | 'd' | 's'>('i')
const addValue = ref('')
const addError = ref('')
let nextId = 0
interface Draft { id: number; op: Op; type: Op['t']; value: string; order: TraversalOrder; error: string }
const rows = ref<Draft[]>([])
const types: { value: Op['t']; label: string }[] = [
  { value: 'i', label: 'Inserir' }, { value: 'd', label: 'Remover' }, { value: 's', label: 'Buscar' },
  { value: 'walk', label: 'Percurso' }, { value: 'min', label: 'Mínimo' }, { value: 'max', label: 'Máximo' },
  { value: 'succ', label: 'Sucessor' }, { value: 'pred', label: 'Predecessor' },
]
const orders: { value: TraversalOrder; label: string }[] = [
  { value: 'in', label: 'In-ordem' }, { value: 'pre', label: 'Pré-ordem' },
  { value: 'post', label: 'Pós-ordem' }, { value: 'level', label: 'Por nível' },
]
const countLabel = computed(() => `${lab.operations.length} ${lab.operations.length === 1 ? 'operação' : 'operações'}`)
function hasKey(type: Op['t']) { return ['i', 'd', 's', 'succ', 'pred'].includes(type) }
watch(() => lab.operations, ops => {
  const previous = new Map(rows.value.map(row => [row.op, row]))
  rows.value = ops.map(op => previous.get(op) ?? {
    id: nextId++, op, type: op.t, value: 'k' in op ? String(op.k) : '', order: op.t === 'walk' ? op.order : 'in', error: '',
  })
}, { immediate: true })
watch(() => props.initialIndex, index => {
  if (index === undefined) return
  nextTick(() => editor.value?.querySelector(`[data-index="${index}"]`)?.scrollIntoView({ block: 'nearest', behavior: 'instant' }))
}, { immediate: true })
function commit(index: number) {
  const row = rows.value[index]
  if (!row) return
  let op: Op
  if (hasKey(row.type)) {
    const value = row.value.trim()
    if (!/^-?\d+$/.test(value) || Math.abs(Number(value)) > 999) {
      row.error = value ? 'Use um número inteiro de −999 a 999.' : 'Digite o número desta operação.'
      return
    }
    op = { t: row.type as 'i' | 'd' | 's' | 'succ' | 'pred', k: Number(value) }
  }
  else if (row.type === 'walk') op = { t: 'walk', order: row.order }
  else op = { t: row.type as 'min' | 'max' }
  row.error = ''
  if (lab.updateOperation(index, op)) {
    row.op = lab.operations[index]!
    row.value = 'k' in op ? String(op.k) : row.value
    emit('change')
  }
}
function move(index: number, direction: -1 | 1) {
  commit(index)
  if (rows.value[index]?.error) return
  if (lab.moveOperation(index, index + direction)) emit('change')
}
function remove(index: number) {
  if (lab.removeOperation(index)) emit('change')
}
function add() {
  const parsed = parseValues(addValue.value)
  addError.value = parsed.error
  if (parsed.error) return
  if (lab.append(parsed.values.map(k => ({ t: addType.value, k })))) {
    addValue.value = ''
    emit('change')
    nextTick(() => editor.value?.querySelector('.sequence-row:last-child')?.scrollIntoView({ block: 'nearest', behavior: props.reduced ? 'instant' : 'smooth' }))
  }
}
function issue(index: number) { return rows.value[index]?.error || lab.operationIssue(index) }
</script>

<template>
  <div ref="editor" class="sequence-editor" :class="{ reduced: props.reduced }">
    <p class="sequence-intro">A ordem muda a árvore. Edite o tipo e o número, mova uma operação ou exclua o que quiser.</p>
    <form class="sequence-add" @submit.prevent="add">
      <label for="sequence-new-values">Adicionar à sequência</label>
      <div class="add-fields">
        <select v-model="addType" aria-label="Tipo das novas operações"><option value="i">Inserir</option><option value="d">Remover</option><option value="s">Buscar</option></select>
        <input id="sequence-new-values" v-model="addValue" type="text" inputmode="text" autocomplete="off" maxlength="140" placeholder="30, 10, 20" :aria-invalid="!!addError" :aria-describedby="addError ? 'sequence-add-error' : undefined" @input="addError = ''">
        <button type="submit" aria-label="Adicionar operações" title="Adicionar operações"><Icon name="lucide:plus" /></button>
      </div>
      <p v-if="addError" id="sequence-add-error" class="field-error" role="alert">{{ addError }}</p>
    </form>

    <template v-if="rows.length">
      <div class="sequence-heading"><span>{{ countLabel }}</span><button type="button" class="clear-all" @click="emit('clear')"><Icon name="lucide:trash-2" />Limpar tudo</button></div>
      <p class="edit-hint">Números são aplicados ao sair do campo ou pressionar Enter.</p>
      <TransitionGroup tag="ol" name="sequence-order" class="sequence-list" aria-label="Operações em ordem de execução">
        <li v-for="(row, index) in rows" :key="row.id" class="sequence-row" :class="{ 'has-issue': !!issue(index), current: lab.operationIndex === index }" :data-index="index">
          <div class="row-fields">
            <label class="operation-type"><span class="operation-number" aria-hidden="true">{{ index + 1 }}.</span><select v-model="row.type" :aria-label="`Tipo da operação ${index + 1}`" @change="commit(index)"><option v-for="type in types" :key="type.value" :value="type.value">{{ type.label }}</option></select></label>
            <input v-if="hasKey(row.type)" v-model="row.value" class="operation-key" type="text" inputmode="text" autocomplete="off" maxlength="5" :aria-label="`Número da operação ${index + 1}`" :aria-invalid="!!row.error" :aria-describedby="issue(index) ? `sequence-issue-${row.id}` : undefined" @input="row.error = ''" @blur="commit(index)" @keydown.enter.prevent="commit(index); ($event.target as HTMLInputElement).blur()">
            <select v-else-if="row.type === 'walk'" v-model="row.order" class="operation-order" :aria-label="`Ordem do percurso ${index + 1}`" @change="commit(index)"><option v-for="order in orders" :key="order.value" :value="order.value">{{ order.label }}</option></select>
            <span v-else class="no-key" aria-label="Não exige número">—</span>
            <div class="row-actions">
              <button type="button" :disabled="index === 0" :aria-label="`Mover operação ${index + 1} para antes`" title="Mover para antes" @click="move(index, -1)"><Icon name="lucide:arrow-up" /></button>
              <button type="button" :disabled="index === rows.length - 1" :aria-label="`Mover operação ${index + 1} para depois`" title="Mover para depois" @click="move(index, 1)"><Icon name="lucide:arrow-down" /></button>
              <button type="button" class="delete-operation" :aria-label="`Excluir operação ${index + 1}`" title="Excluir operação" @click="remove(index)"><Icon name="lucide:x" /></button>
            </div>
          </div>
          <p v-if="issue(index)" :id="`sequence-issue-${row.id}`" class="operation-issue" :role="row.error ? 'alert' : undefined"><Icon name="lucide:circle-alert" />{{ issue(index) }}</p>
        </li>
      </TransitionGroup>
    </template>
    <div v-else class="empty-sequence"><Icon name="lucide:sprout" /><strong>Uma árvore do seu jeito</strong><p>Adicione seu primeiro número acima. Depois, teste outra ordem ou troque o tipo de árvore no laboratório.</p></div>
    <button type="button" class="editor-done" @click="emit('close')">Voltar ao laboratório<Icon name="lucide:arrow-right" /></button>
  </div>
</template>

<style scoped>
.sequence-intro { color:var(--muted); font-size:13px; line-height:1.65; margin-bottom:18px; }
.sequence-add { padding:14px; border:1px solid var(--border); border-radius:12px; background:var(--surface-2); }
.sequence-add>label { display:block; margin-bottom:10px; font-size:12px; font-weight:600; }
.add-fields { display:grid; grid-template-columns:88px minmax(0,1fr) 44px; gap:8px; }
.sequence-editor select,.sequence-editor input { min-width:0; min-height:44px; border:1px solid var(--border); border-radius:8px; color:var(--text); background:var(--bg); font-size:13px; padding:0 8px; }
.sequence-editor input { font-family:'JetBrains Mono',monospace; }
.sequence-editor input::placeholder { color:var(--muted); opacity:.8; }
.sequence-editor input[aria-invalid='true'] { border-color:var(--violation); }
.add-fields button { display:grid; place-items:center; border-radius:8px; background:var(--accent); color:var(--bg); min-height:44px; }
.add-fields button :deep(.iconify) { width:20px; height:20px; }
.field-error { color:var(--violation); font-size:12px; line-height:1.5; margin-top:10px; }
.sequence-heading { display:flex; justify-content:space-between; align-items:center; gap:16px; margin-top:16px; }
.sequence-heading>span { color:var(--muted); font-size:12px; }
.clear-all { min-height:44px; display:flex; align-items:center; justify-content:center; gap:6px; padding:0 8px; color:var(--muted); font-size:12px; border-radius:8px; }
.clear-all :deep(.iconify) { width:15px; height:15px; }
.edit-hint { color:var(--muted); font-size:11px; line-height:1.5; margin:0 0 12px; }
.sequence-list { list-style:none; padding:0; margin:0; display:grid; gap:8px; }
.sequence-order-move { transition:transform .22s ease; }
.sequence-order-enter-active,.sequence-order-leave-active { transition:opacity .16s ease; }
.sequence-order-enter-from,.sequence-order-leave-to { opacity:0; }
.sequence-row { min-width:0; border:1px solid var(--border); border-radius:12px; background:var(--surface-2); padding:6px; transition:border-color .18s,background .18s; }
.sequence-row.current { border-color:var(--border-strong); }
.row-fields { display:grid; grid-template-columns:minmax(0,1fr) 70px 132px; gap:6px; align-items:center; }
.operation-type { display:flex; align-items:center; min-width:0; gap:5px; }
.operation-number { min-width:18px; text-align:center; color:var(--muted); font:10px 'JetBrains Mono',monospace; }
.operation-type select { width:100%; padding-left:6px; }
.operation-key { width:100%; text-align:center; }
.operation-order { width:100%; font-size:11px !important; padding:0 3px !important; }
.no-key { display:block; text-align:center; color:var(--muted); font-size:13px; }
.row-actions { display:flex; align-items:center; }
.row-actions button { width:44px; min-height:44px; display:grid; place-items:center; border-radius:8px; color:var(--muted); transition:background .14s,color .14s,transform .12s; }
.row-actions button:disabled { opacity:.25; }
.row-actions :deep(.iconify) { width:16px; height:16px; }
.operation-issue { display:flex; align-items:flex-start; gap:7px; padding:7px 6px 4px; border-top:1px solid var(--border); margin-top:6px; color:var(--compare); font-size:11px; line-height:1.55; }
.operation-issue :deep(.iconify) { width:13px; height:13px; flex-shrink:0; margin-top:2px; }
.empty-sequence { display:flex; flex-direction:column; align-items:center; text-align:center; gap:10px; padding:28px 12px; }
.empty-sequence>:deep(.iconify) { width:28px; height:28px; color:var(--accent); margin-bottom:4px; }
.empty-sequence strong { font-size:14px; font-weight:600; }
.empty-sequence p { color:var(--muted); max-width:320px; font-size:12px; line-height:1.65; }
.editor-done { width:100%; min-height:48px; display:flex; justify-content:center; align-items:center; gap:10px; margin-top:20px; border:1px solid var(--border); border-radius:10px; background:var(--surface-2); color:var(--text); font-size:13px; font-weight:500; }
.editor-done :deep(.iconify) { width:17px; height:17px; color:var(--accent); }
.sequence-editor button:active:not(:disabled) { transform:scale(.95); }
.sequence-editor.reduced .sequence-row,.sequence-editor.reduced button,.sequence-editor.reduced .sequence-order-move,.sequence-editor.reduced .sequence-order-enter-active,.sequence-editor.reduced .sequence-order-leave-active { transition:none; }
.sequence-editor.reduced button:active:not(:disabled) { transform:none; }
@media (hover:hover) { .row-actions button:hover:not(:disabled),.clear-all:hover { color:var(--text); background:var(--surface-3); }.row-actions .delete-operation:hover { color:var(--violation); } }
@media (max-width:420px) { .operation-number { display:none; }.row-fields { grid-template-columns:minmax(0,1fr) 64px 132px; gap:4px; }.sequence-editor select { font-size:12px; }.sequence-add { padding:12px; } }
@media (max-width:350px) { .row-fields { grid-template-columns:minmax(0,1fr) 56px 132px; }.sequence-editor select { font-size:11px; padding-inline:4px; }.add-fields { grid-template-columns:72px minmax(0,1fr) 44px; gap:6px; }.sequence-add { padding:10px; } }
@media (prefers-reduced-motion:reduce) { .sequence-row,.sequence-editor button,.sequence-order-move,.sequence-order-enter-active,.sequence-order-leave-active { transition:none; }.sequence-editor button:active:not(:disabled) { transform:none; } }
</style>

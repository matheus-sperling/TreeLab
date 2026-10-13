<script setup lang="ts">
import { computed } from 'vue'
import { motion } from 'motion-v'
const value = defineModel<string>({ required: true })
defineProps<{ editing: boolean; systemKeyboard: boolean; error: string; shake: number; reduced: boolean; existing: number[]; haptics: boolean; leftHanded: boolean }>()
const emit = defineEmits<{ open: []; close: []; clearError: []; submit: [action: 'i' | 'd' | 's']; inputKey: [event: KeyboardEvent] }>()
const count = computed(() => value.value.trim().split(/[,\s]+/).filter(Boolean).length)
const countLabel = computed(() => count.value ? `${count.value} ${count.value === 1 ? 'valor' : 'valores'}` : 'Até 20 valores')
function clear() { value.value = ''; emit('clearError') }
</script>

<template>
  <section class="operation-composer" :class="{ editing }" aria-label="Entrada de valores">
    <div class="field-group"><div v-if="editing" class="entry-heading"><label for="lab-values">Adicionar valores</label><span :class="{ 'limit-warning': count > 20 }">{{ countLabel }}</span></div>
    <motion.div :key="shake" class="value-field" :animate="shake && error ? { x: [0, -4, 4, -3, 3, 0] } : { x: 0 }" :transition="{ duration: reduced ? 0 : .24 }">
      <input id="lab-values" v-model="value" :readonly="!systemKeyboard" :inputmode="systemKeyboard ? 'text' : 'none'" maxlength="140" aria-label="Valor ou lista de inteiros" placeholder="10, 25, 7" :aria-invalid="Boolean(error)" :aria-describedby="error ? 'input-error' : undefined" :aria-controls="editing ? 'lab-number-pad' : undefined" @click="emit('open')" @focus="emit('open')" @keydown="emit('inputKey', $event)" @input="emit('clearError')">
      <button v-if="value" type="button" aria-label="Limpar campo" @click="clear"><Icon name="lucide:x" size="20" /></button>
      <button v-else-if="!editing && !systemKeyboard" type="button" aria-label="Abrir teclado numérico" @click="emit('open')"><Icon name="lucide:keyboard" size="20" /></button>
    </motion.div>
    <p v-if="error" id="input-error" class="input-error" role="status">{{ error }}</p></div>
    <motion.div v-if="editing" class="entry-keyboard" :initial="{ opacity: 0, y: 8 }" :animate="{ opacity: 1, y: 0 }" :transition="{ duration: reduced ? .12 : .16 }"><LabNumberPad v-model="value" :existing="existing" :haptics="haptics" :left-handed="leftHanded" @update:model-value="emit('clearError')" @close="emit('close')" /></motion.div>
    <div class="lab-actions" :class="{ 'left-handed': leftHanded }">
      <UiButton class="action-search" aria-label="Buscar valores" @click="emit('submit', 's')"><Icon name="lucide:search" /><span>Buscar</span></UiButton>
      <UiButton class="action-delete" aria-label="Remover valores" @click="emit('submit', 'd')"><Icon name="lucide:minus" /><span>Remover</span></UiButton>
      <UiButton class="action-insert" aria-label="Inserir valores" variant="primary" @click="emit('submit', 'i')"><Icon name="lucide:plus" /><span>Inserir</span></UiButton>
    </div>
  </section>
</template>

<style scoped>
.operation-composer { display:grid; gap:8px; padding-top:12px; }
.operation-composer.editing { padding-top:12px; }
.entry-heading { display:flex; align-items:center; justify-content:space-between; gap:12px; min-height:24px; }
.entry-heading label { font-size:13px; font-weight:600; }
.entry-heading>span { font:11px 'JetBrains Mono',monospace; color:var(--muted); }
.entry-heading .limit-warning { color:var(--violation); }
.value-field { display:flex; width:100%; min-height:50px; border:1px solid var(--border-strong); border-radius:12px; background:var(--bg); }
.value-field input { min-height:48px; flex:1; min-width:0; width:100%; background:transparent; padding:10px 14px; font:18px/1.4 'JetBrains Mono',monospace; outline:none; }
.value-field input[aria-invalid='true'] { color:var(--violation); }
.value-field input::placeholder { color:var(--muted); }
.value-field:focus-within,.editing .value-field { border-color:var(--accent); }
.value-field>button { width:48px; min-height:48px; flex-shrink:0; display:grid; place-items:center; color:var(--muted); }
.input-error { margin-top:8px; font-size:12px; line-height:1.5; color:var(--violation); }
.lab-actions { display:flex; align-items:center; gap:8px; }
.lab-actions :deep(.ui-button) { flex:1; min-width:0; padding:10px 8px; gap:8px; font-size:13px; }
.lab-actions :deep(.iconify) { width:18px; height:18px; flex-shrink:0; }
.lab-actions.left-handed { flex-direction:row-reverse; }
@media(max-width:379px) { .operation-composer { padding-top:8px; }.operation-composer.editing { padding-top:8px; }.lab-actions :deep(.ui-button) { gap:6px; }.entry-heading label { font-size:12px; } }
@media(max-height:760px) and (orientation:portrait) { .editing .entry-heading { display:none; } }
@media(orientation:landscape) and (max-height:500px) { .operation-composer.editing { padding-top:4px; gap:6px; }.editing .entry-heading { display:none; }.value-field { min-height:40px; }.value-field input,.value-field>button { min-height:38px; }.lab-actions :deep(.ui-button) { min-height:40px; padding-block:6px; } }
</style>

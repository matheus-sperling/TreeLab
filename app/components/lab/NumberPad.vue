<script setup lang="ts">
import { motion } from 'motion-v'
import { computed, onBeforeUnmount } from 'vue'
import { useHaptics } from '../../composables/useHaptics'
import { editNumber } from './input'
const props = defineProps<{ modelValue: string; existing: number[]; haptics?: boolean; leftHanded?: boolean }>()
const emit = defineEmits<{ 'update:modelValue': [value: string]; close: [] }>()
const { tap } = useHaptics()
const rows = [['1', '2', '3', 'backspace'], ['4', '5', '6', 'clear'], ['7', '8', '9', 'random'], ['-', '0', ',', 'close']]
const keys = rows.flatMap((row, r) => row.map((value, c) => ({ value, row: r + 1, column: c + 1, utility: c === 3 })))
const labels: Record<string, string> = { '-': 'Alternar sinal', ',': 'Separar valores', backspace: 'Apagar; segure para limpar', clear: 'Limpar valores', random: 'Valor aleatório livre', close: 'Recolher teclado' }
const captions: Record<string, string> = { '-': 'Sinal', ',': 'Separar', backspace: 'Apagar', clear: 'Limpar', random: 'Aleatório', close: 'Recolher' }
const icons: Record<string, string> = { backspace: 'lucide:delete', clear: 'lucide:eraser', random: 'lucide:dices', close: 'lucide:chevron-down' }
const tokens = computed(() => props.modelValue.trim().split(/[,\s]+/).filter(Boolean))
const available = computed(() => {
  const used = new Set([...props.existing, ...tokens.value.map(Number)])
  return Array.from({ length: 99 }, (_, i) => i + 1).filter(key => !used.has(key))
})
let hold: ReturnType<typeof setTimeout> | undefined
let cleared = false
function disabled(key: string) {
  if (key === 'backspace' || key === 'clear') return !props.modelValue
  if (key === 'random') return tokens.value.length >= 20 || !available.value.length
  return false
}
function press(key: string) {
  tap(props.haptics)
  if (cleared) { cleared = false; return }
  if (key === 'close') emit('close')
  else if (key === 'clear') emit('update:modelValue', '')
  else if (key === 'random') {
    const next = available.value[Math.floor(Math.random() * available.value.length)]
    const prefix = props.modelValue.trim().replace(/[,\s]+$/, '')
    if (next !== undefined) emit('update:modelValue', prefix ? `${prefix}, ${next}` : String(next))
  }
  else emit('update:modelValue', editNumber(props.modelValue, key))
}
function start(key: string) {
  end(); cleared = false
  if (key === 'backspace') hold = setTimeout(() => { emit('update:modelValue', ''); cleared = true }, 550)
}
function end() { if (hold) clearTimeout(hold) }
onBeforeUnmount(end)
</script>

<template>
  <div id="lab-number-pad" class="number-pad" role="group" aria-label="Teclado numérico">
    <motion.button v-for="key in keys" :key="key.value" type="button" :class="{ utility: key.utility, modifier: key.value === '-' || key.value === ',' }" :style="{ gridRow: key.row, gridColumn: key.utility ? leftHanded ? 1 : 4 : key.column + (leftHanded ? 1 : 0) }" :disabled="disabled(key.value)" :aria-label="labels[key.value] ?? key.value" :while-tap="{ scale: .96 }" @pointerdown="start(key.value)" @pointerup="end" @pointercancel="end" @pointerleave="end" @click="press(key.value)">
      <Icon v-if="icons[key.value]" :name="icons[key.value]!" aria-hidden="true" />
      <span v-else-if="key.value === '-'" class="sign-icons" aria-hidden="true"><Icon name="lucide:plus" /><Icon name="lucide:minus" /></span>
      <span v-else class="key-value">{{ key.value }}</span>
      <span v-if="captions[key.value]" class="key-caption">{{ captions[key.value] }}</span>
    </motion.button>
  </div>
</template>

<style scoped>
.number-pad { display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:8px; }
.number-pad button { min-height:48px; padding:4px; border-radius:12px; background:var(--surface-3); border:1px solid var(--border-strong); display:flex; flex-direction:column; justify-content:center; align-items:center; gap:2px; touch-action:manipulation; }
.key-value { font:600 1.25rem/1.15 'JetBrains Mono',monospace; font-variant-numeric:tabular-nums; }
.number-pad .utility,.number-pad .modifier { background:var(--surface-2); border-color:var(--border); }
.number-pad .utility { color:var(--muted); }
.key-caption { font-size:.625rem; line-height:1.1; font-weight:500; }
.number-pad :deep(.iconify) { width:20px; height:20px; flex-shrink:0; }
.sign-icons { height:20px; display:flex; align-items:center; gap:2px; }
.sign-icons :deep(.iconify) { width:13px; height:13px; }
.number-pad button:disabled { opacity:.4; }
@media(max-width:379px) { .number-pad button { min-height:44px; border-radius:10px; }.number-pad :deep(.iconify) { width:18px; height:18px; }.sign-icons :deep(.iconify) { width:13px; height:13px; } }
@media(orientation:landscape) and (max-height:500px) { .number-pad { gap:4px; }.number-pad button { padding:2px; min-height:36px; }.key-value { font-size:16px; }.key-caption { font-size:9px; }.number-pad :deep(.iconify) { width:16px; height:16px; } }
</style>

<script setup lang="ts">
import { motion } from 'motion-v'
import { onBeforeUnmount } from 'vue'
import { useHaptics } from '../../composables/useHaptics'
import { editNumber } from './input'
const props = defineProps<{ modelValue: string; existing: number[]; haptics?: boolean }>()
const emit = defineEmits<{ 'update:modelValue': [value: string]; close: [] }>()
const { tap } = useHaptics()
const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '-', ',', 'backspace', 'random', 'close']
const labels: Record<string, string> = { '-': 'Alternar sinal', ',': 'Separar valores', backspace: 'Apagar; segure para limpar', random: 'Valor aleatório livre', close: 'Recolher teclado' }
const icons: Record<string, string> = { '-': 'minus', backspace: 'delete', random: 'dices', close: 'chevron-down' }
let hold: ReturnType<typeof setTimeout> | undefined
let cleared = false
function press(key: string) {
  tap(props.haptics)
  if (cleared) { cleared = false; return }
  if (key === 'close') emit('close')
  else if (key === 'random') {
    const free = Array.from({ length: 99 }, (_, i) => i + 1).filter(k => !props.existing.includes(k))
    const next = free[Math.floor(Math.random() * free.length)]
    if (next !== undefined) emit('update:modelValue', String(next))
  }
  else emit('update:modelValue', editNumber(props.modelValue, key))
}
function start(key: string) {
  cleared = false
  if (key === 'backspace') hold = setTimeout(() => { emit('update:modelValue', ''); cleared = true }, 550)
}
function end() { if (hold) clearTimeout(hold) }
onBeforeUnmount(end)
</script>

<template>
  <div class="number-pad" role="group" aria-label="Teclado numérico">
    <motion.button v-for="key in keys" :key="key" type="button" :aria-label="labels[key] ?? key" :while-tap="{ scale: .96 }" @pointerdown="start(key)" @pointerup="end" @pointercancel="end" @pointerleave="end" @click="press(key)">
      <Icon v-if="icons[key]" :name="`lucide:${icons[key]}`" aria-hidden="true" />
      <span v-else>{{ key === '-' ? '−' : key }}</span>
    </motion.button>
  </div>
</template>

<style scoped>
.number-pad { display: grid; grid-template-columns: repeat(5, 1fr); gap: 8px; padding-top: 8px; }
.number-pad button { min-height: 44px; border-radius: 10px; background: var(--surface-2); border: 1px solid var(--border); font-family: 'JetBrains Mono', monospace; font-size: 18px; display: grid; place-items: center; touch-action: manipulation; }
.number-pad :deep(.iconify) { width: 21px; height: 21px; }
</style>

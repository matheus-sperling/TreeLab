<script setup lang="ts">
import { motion, useTransform } from 'motion-v'
import type { MotionValue } from 'motion-v'
const props = withDefaults(defineProps<{
  id: string; parentId: number
  parent: { x: MotionValue<number>; y: MotionValue<number> }
  position: { x: MotionValue<number>; y: MotionValue<number> }
  active?: boolean; extraBlack?: boolean; seeking?: boolean; reduced?: boolean; speed?: number
}>(), { active: true, speed: 1 })
const emit = defineEmits<{ exitComplete: [] }>()
function complete() { if (!props.active) emit('exitComplete') }
const path = useTransform([props.parent.x, props.parent.y, props.position.x, props.position.y], (values: number[]) => {
  const [px = 0, py = 0, x = 0, y = 0] = values
  const distance = Math.max(1, Math.hypot(x - px, y - py))
  const dx = (x - px) / distance, dy = (y - py) / distance
  return `M ${px + dx * 20} ${py + dy * 20} L ${x - dx * 5} ${y - dy * 5}`
})
</script>
<template>
  <motion.g :initial="seeking || reduced ? false : { opacity: 0 }" :animate="{ opacity: active ? 1 : 0 }" :transition="{ duration: seeking || reduced ? 0 : .2 / speed }" :data-nil="id" @animation-complete="complete">
    <motion.path :d="path" fill="none" stroke="var(--border-strong)" class="nil-edge" :data-nil-parent="parentId" />
    <motion.g class="nil-marker" :style="{ x: position.x, y: position.y }">
      <rect x="-5" y="-5" width="10" height="10" fill="#15161B" :stroke="extraBlack ? 'var(--rotation)' : '#8B90A0'" />
      <text v-if="extraBlack" x="10" y="4" fill="var(--rotation)" font-size="10">+1</text>
    </motion.g>
  </motion.g>
</template>

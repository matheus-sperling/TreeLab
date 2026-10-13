<script setup lang="ts">
import { motion, useTransform } from 'motion-v'
import type { MotionValue } from 'motion-v'
const props = withDefaults(defineProps<{ from: { x: MotionValue<number>; y: MotionValue<number> }; to: { x: MotionValue<number>; y: MotionValue<number> }; highlighted?: boolean; rotation?: boolean; diagnosis?: boolean; draw?: boolean; seeking?: boolean; reduced?: boolean; speed?: number }>(), { highlighted: false, rotation: false, diagnosis: false, draw: false, seeking: false, reduced: false, speed: 1 })
const path = useTransform([props.from.x, props.from.y, props.to.x, props.to.y], (values: number[]) => {
  const [x1 = 0, y1 = 0, x2 = 0, y2 = 0] = values
  const distance = Math.max(1, Math.hypot(x2 - x1, y2 - y1))
  const dx = (x2 - x1) * 20 / distance
  const dy = (y2 - y1) * 20 / distance
  return `M ${x1 + dx} ${y1 + dy} L ${x2 - dx} ${y2 - dy}`
})
</script>
<template>
  <motion.path :d="path" fill="none" :stroke="diagnosis && highlighted ? 'var(--violation)' : rotation ? 'var(--rotation)' : highlighted ? 'var(--accent)' : 'var(--border-strong)'" :stroke-width="highlighted ? 3 : 2" stroke-linecap="round" :initial="seeking || reduced ? false : { opacity: 0, pathLength: draw ? 0 : 1 }" :animate="{ opacity: 1, pathLength: 1 }" :exit="{ opacity: 0 }" :transition="{ duration: seeking ? 0 : reduced ? .12 : (draw ? .25 : .16) / speed }" />
</template>

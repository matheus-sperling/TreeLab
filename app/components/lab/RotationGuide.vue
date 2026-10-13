<script setup lang="ts">
import { motion, useTransform } from 'motion-v'
import type { MotionValue } from 'motion-v'
import { useId } from 'vue'
const markerId = `rotation-arrow-${useId().replace(/:/g, '')}`
const props = defineProps<{ pivot: { x: MotionValue<number>; y: MotionValue<number> }; child: { x: MotionValue<number>; y: MotionValue<number> }; direction: 'left' | 'right'; reduced?: boolean }>()
// Two paths outside the node/edge corridor: promoted child up, pivot down.
const rising = useTransform([props.pivot.x, props.pivot.y, props.child.x, props.child.y], (values: number[]) => {
  const [px = 0, py = 0, cx = 0, cy = 0] = values
  const sign = props.direction === 'left' ? 1 : -1
  return `M ${cx + sign * 30} ${cy - 12} Q ${cx + sign * 64} ${py - 12}, ${px + sign * 30} ${py - 18}`
})
const falling = useTransform([props.pivot.x, props.pivot.y, props.child.x, props.child.y], (values: number[]) => {
  const [px = 0, py = 0, cx = 0, cy = 0] = values
  const sign = props.direction === 'left' ? 1 : -1
  return `M ${px - sign * 30} ${py + 10} Q ${px - sign * 64} ${cy + 12}, ${cx - sign * 30} ${cy + 18}`
})
</script>
<template><g aria-hidden="true"><defs><marker :id="markerId" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto"><path d="M 0 0 L 10 5 L 0 10 z" fill="var(--rotation)" /></marker></defs><motion.path v-for="(path, index) in [rising, falling]" :key="index" :d="path" fill="none" stroke="var(--rotation)" stroke-width="2.5" :stroke-dasharray="index ? '5 4' : undefined" :marker-end="`url(#${markerId})`" :initial="{ opacity: 0, pathLength: 0 }" :animate="{ opacity: 1, pathLength: 1 }" :transition="{ duration: reduced ? 0 : .45 }" vector-effect="non-scaling-stroke" /></g></template>

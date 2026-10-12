<script setup lang="ts">
import { motion, useTransform } from 'motion-v'
import type { MotionValue } from 'motion-v'
import { useId } from 'vue'
const markerId = `rotation-arrow-${useId().replace(/:/g, '')}`
const props = defineProps<{ pivot: { x: MotionValue<number>; y: MotionValue<number> }; child: { x: MotionValue<number>; y: MotionValue<number> }; direction: 'left' | 'right'; reduced?: boolean }>()
const path = useTransform([props.pivot.x, props.pivot.y, props.child.x, props.child.y], (values: number[]) => {
  const [px = 0, py = 0, cx = 0, cy = 0] = values
  const mx = (px + cx) / 2
  const my = (py + cy) / 2
  const direction = props.direction === 'left' ? 1 : -1
  return `M ${mx + direction * 32} ${my + 15} C ${mx + direction * 55} ${my - 55}, ${mx - direction * 55} ${my - 55}, ${mx - direction * 28} ${my - 18}`
})
</script>
<template><g aria-hidden="true"><defs><marker :id="markerId" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="var(--rotation)" /></marker></defs><motion.path :d="path" fill="none" stroke="var(--rotation)" stroke-width="2" :marker-end="`url(#${markerId})`" :initial="{ opacity: 0 }" :animate="{ opacity: 1 }" :transition="{ duration: reduced ? .12 : .16 }" vector-effect="non-scaling-stroke" /></g></template>

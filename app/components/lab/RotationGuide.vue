<script setup lang="ts">
import { motion, useTransform } from 'motion-v'
import type { MotionValue } from 'motion-v'
import { useId } from 'vue'
const markerId = `rotation-arrow-${useId().replace(/:/g, '')}`
const props = defineProps<{ pivot: { x: MotionValue<number>; y: MotionValue<number> }; child: { x: MotionValue<number>; y: MotionValue<number> }; direction: 'left' | 'right'; reduced?: boolean }>()
const rising = useTransform([props.pivot.x, props.pivot.y, props.child.x, props.child.y], (values: number[]) => {
  const [px = 0, py = 0, cx = 0, cy = 0] = values, side = props.direction === 'left' ? 1 : -1
  return `M ${cx + side * 32} ${cy - 8} C ${cx + side * 66} ${cy - 48}, ${px + side * 66} ${py - 38}, ${px + side * 32} ${py - 8}`
})
const falling = useTransform([props.pivot.x, props.pivot.y, props.child.x, props.child.y], (values: number[]) => {
  const [px = 0, py = 0, cx = 0, cy = 0] = values, side = props.direction === 'left' ? 1 : -1
  return `M ${px - side * 32} ${py + 8} C ${px - side * 66} ${py + 48}, ${cx - side * 66} ${cy + 38}, ${cx - side * 32} ${cy + 8}`
})
</script>
<template><g aria-hidden="true"><defs><marker :id="markerId" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto"><path d="M0 0L10 5L0 10Z" fill="var(--rotation)" /></marker></defs><motion.path v-for="(path, index) in [rising, falling]" :key="index" :d="path" fill="none" stroke="var(--rotation)" stroke-width="2.5" :stroke-dasharray="index ? '5 4' : undefined" :marker-end="`url(#${markerId})`" :initial="reduced ? false : { opacity: 0, pathLength: 0 }" :animate="{ opacity: 1, pathLength: 1 }" :transition="{ duration: reduced ? 0 : .35 }" /></g></template>

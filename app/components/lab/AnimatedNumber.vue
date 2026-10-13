<script setup lang="ts">
import { AnimatePresence, motion } from 'motion-v'
import { computed, ref, useId, watch } from 'vue'
import { effectDuration } from './semanticMotion'
import { TREE_EASE } from './motion'
const clipId = `number-${useId().replace(/:/g, '')}`
const props = withDefaults(defineProps<{ value: number; x?: number; y?: number; prefix?: string; color?: string; fontSize?: number; fontWeight?: number; seeking?: boolean; reduced?: boolean; speed?: number }>(), { x: 0, y: 0, prefix: '', color: 'var(--text)', fontSize: 10, fontWeight: 500, seeking: false, reduced: false, speed: 1 })
const direction = ref(1)
watch(() => props.value, (value, previous) => { direction.value = value >= previous ? 1 : -1 }, { flush: 'sync' })
const duration = computed(() => effectDuration(.26, props.speed, props.seeking, props.reduced))
</script>
<template><g :transform="`translate(${x} ${y})`" :clip-path="`url(#${clipId})`"><defs><clipPath :id="clipId"><rect x="-40" :y="-fontSize - 2" width="80" :height="fontSize + 6" /></clipPath></defs><AnimatePresence :initial="false"><motion.text :key="value" text-anchor="middle" :fill="color" :font-size="fontSize" :font-weight="fontWeight" :initial="seeking || reduced ? false : { opacity: 0, y: direction * 8 }" :animate="{ opacity: 1, y: 0 }" :exit="seeking || reduced ? { opacity: 0 } : { opacity: 0, y: -direction * 8 }" :transition="{ duration, ease: TREE_EASE }">{{ prefix }}{{ value }}</motion.text></AnimatePresence></g></template>
<style scoped>text { font-family: 'JetBrains Mono', monospace; font-variant-numeric: tabular-nums; pointer-events: none; }</style>

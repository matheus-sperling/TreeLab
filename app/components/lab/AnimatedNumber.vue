<script setup lang="ts">
import { motion } from 'motion-v'
import { useId } from 'vue'
const clipId = `number-${useId().replace(/:/g, '')}`
withDefaults(defineProps<{ value: number; x?: number; y?: number; prefix?: string; color?: string; fontSize?: number; fontWeight?: number; seeking?: boolean; reduced?: boolean; speed?: number }>(), { x: 0, y: 0, prefix: '', color: 'var(--text)', fontSize: 10, fontWeight: 500, seeking: false, reduced: false, speed: 1 })
</script>
<template><g :transform="`translate(${x} ${y})`" :clip-path="`url(#${clipId})`"><defs><clipPath :id="clipId"><rect x="-40" :y="-fontSize - 2" width="80" :height="fontSize + 6" /></clipPath></defs><AnimatePresence :initial="false"><motion.text :key="value" text-anchor="middle" :fill="color" :font-size="fontSize" :font-weight="fontWeight" :initial="seeking || reduced ? false : { opacity: 0, y: 8 }" :animate="{ opacity: 1, y: 0 }" :exit="seeking || reduced ? { opacity: 0 } : { opacity: 0, y: -8 }" :transition="{ duration: seeking ? 0 : reduced ? .12 : .2 / speed }">{{ prefix }}{{ value }}</motion.text></AnimatePresence></g></template>
<style scoped>text { font-family: 'JetBrains Mono', monospace; font-variant-numeric: tabular-nums; pointer-events: none; }</style>

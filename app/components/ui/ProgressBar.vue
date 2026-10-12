<script setup lang="ts">
import { motion } from 'motion-v'
defineProps<{ value: number; label: string }>()
</script>
<template><div role="progressbar" :aria-label="label" :aria-valuenow="value" aria-valuemin="0" aria-valuemax="100" class="progress-track"><motion.div :animate="{ scaleX: value / 100 }" class="progress-fill" /></div></template>
<style scoped>.progress-track{height:4px;background:var(--border);border-radius:99px;overflow:hidden}.progress-fill{height:100%;background:var(--accent);transform-origin:left}</style>

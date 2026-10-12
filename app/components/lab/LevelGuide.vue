<script setup lang="ts">
import { motion, useTransform } from 'motion-v'
import type { MotionValue } from 'motion-v'
import { LEVEL_GAP } from '../../engine/layout.config'
const props = defineProps<{ level: number; width: number; cameraY: MotionValue<number>; cameraScale: MotionValue<number> }>()
const y = useTransform([props.cameraY, props.cameraScale], ([camera = 0, scale = 1]: number[]) => camera + props.level * LEVEL_GAP * scale)
</script>
<template><motion.g :style="{ y }" aria-hidden="true"><line x1="0" y1="0" :x2="width" y2="0" stroke="var(--border)" stroke-dasharray="3 5" vector-effect="non-scaling-stroke" /><text x="12" y="-6" fill="var(--muted)" font-size="10">nível {{ level }}</text></motion.g></template>

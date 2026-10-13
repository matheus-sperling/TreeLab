<script setup lang="ts">
import { motion, useTransform } from 'motion-v'
import type { MotionValue } from 'motion-v'
const props = withDefaults(defineProps<{ id: number; nodeKey: number; height: number; root?: boolean; selected?: boolean; position: { x: MotionValue<number>; y: MotionValue<number> }; camera: { x: MotionValue<number>; y: MotionValue<number>; scale: MotionValue<number> } }>(), { root: false, selected: false })
const emit = defineEmits<{ select: [id: number]; focus: [id: number] }>()
const x = useTransform([props.position.x, props.camera.x, props.camera.scale], ([world = 0, camera = 0, scale = 1]: number[]) => world * scale + camera)
const y = useTransform([props.position.y, props.camera.y, props.camera.scale], ([world = 0, camera = 0, scale = 1]: number[]) => world * scale + camera)
const size = useTransform(props.camera.scale, scale => Math.min(48, 52 * scale))
const offset = useTransform(size, value => -value / 2)
function focused(event: FocusEvent) { if ((event.target as HTMLElement).matches(':focus-visible')) emit('focus', props.id) }
</script>
<template><motion.button type="button" class="node-target" :style="{ x, y, width: size, height: size, left: offset, top: offset }" :aria-label="`Nó ${nodeKey}${root ? ', raiz' : ''}. Altura ${height}. Inspecionar.`" :aria-pressed="selected" @pointerdown.stop @click.stop="emit('select', id)" @focus="focused" @keydown.space.stop @keydown.enter.stop /></template>
<style scoped>.node-target { position: absolute; left: -24px; top: -24px; width: 48px; height: 48px; padding: 0; border: 0; border-radius: 999px; background: transparent; pointer-events: auto; cursor: pointer; }.node-target:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }</style>

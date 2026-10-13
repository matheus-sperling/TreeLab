<script setup lang="ts">
import { computed } from 'vue'
import { motion } from 'motion-v'
import type { MotionValue } from 'motion-v'
import type { Role, StepKind, TreeNode, TreeType } from '../../engine/types'
import { effectDuration, roleColor } from './semanticMotion'
import { TREE_EASE } from './motion'
const props = defineProps<{ id: number; node: TreeNode; position: { x: MotionValue<number>; y: MotionValue<number> }; type: TreeType; role?: Role; selected?: boolean; root?: boolean; seeking?: boolean; reduced?: boolean; balance?: number; showHeight?: boolean; showLetters?: boolean; order?: number; speed?: number; depth?: number; stepKind?: StepKind; effectKey?: number | string }>()
const emit = defineEmits<{ select: [id: number] }>()
const ring = computed(() => roleColor(props.selected ? 'path' : props.role))
const ringKey = computed(() => props.selected ? 'selected' : props.role)
const fill = computed(() => props.type === 'rb' ? props.node.c === 'R' ? 'var(--rb-red)' : 'var(--rb-black)' : 'var(--surface-3)')
const text = computed(() => props.type === 'rb' ? '#FFFFFF' : 'var(--text)')
const badge = computed(() => props.role === 'found' ? '✓' : props.role === 'successor' ? 'S' : props.role === 'violation' ? '!' : props.role === 'extra-black' ? '+1' : props.order ? String(props.order) : '')
const duration = computed(() => effectDuration(props.stepKind === 'recolor' ? .42 : .24, props.speed, props.seeking, props.reduced))
function select(event: Event) { event.stopPropagation(); emit('select', props.id) }
</script>
<template>
  <motion.g :style="{ x: position.x, y: position.y, '--node-role-color': ring ?? 'transparent' }" :initial="seeking || reduced ? false : { opacity: 0, scale: .86 }" :animate="{ opacity: 1, scale: 1 }" :exit="seeking || reduced ? { opacity: 0 } : { opacity: 0, scale: .86 }" :transition="{ duration, ease: TREE_EASE }" data-node="true" :data-role="selected ? 'path' : role" @click="select">
    <circle r="25" fill="transparent" />
    <circle v-if="ring" class="node-halo" r="26" :fill="ring" fill-opacity=".08" />
    <motion.circle v-if="ring" :key="ringKey" class="node-ring" r="24" fill="none" :stroke="ring" :stroke-dasharray="['delete', 'moved', 'extra-black'].includes(role ?? '') ? '4 3' : undefined" :initial="seeking || reduced ? false : { strokeWidth: 3.5 }" :animate="{ strokeWidth: 2.5 }" :transition="{ duration, ease: TREE_EASE }" />
    <circle v-if="role === 'extra-black'" class="node-ring" r="28" fill="none" stroke="var(--rotation)" stroke-width="1.5" stroke-dasharray="4 3" />
    <motion.circle class="node-body" r="20" :initial="false" :animate="{ fill }" :stroke="type === 'rb' ? '#8B90A0' : 'var(--border-strong)'" stroke-width="1.5" :transition="{ duration, ease: TREE_EASE }" />
    <text :y="type === 'rb' && showLetters || badge ? 1 : 5" text-anchor="middle" :fill="text" :font-size="String(node.key).length > 3 ? 12 : 15" font-weight="600">{{ node.key }}</text>
    <text v-if="root" y="-33" text-anchor="middle" fill="var(--muted)" font-size="10">raiz</text>
    <g v-if="type === 'avl'"><rect x="-12" y="27" width="24" height="14" rx="6" :fill="Math.abs(balance ?? 0) > 1 ? 'var(--violation)' : balance ? 'var(--compare)' : 'var(--success)'" /><LabAnimatedNumber :value="balance ?? 0" :x="0" :y="38" :prefix="balance && balance > 0 ? '+' : ''" color="var(--on-semantic)" :font-weight="700" :seeking="seeking" :reduced="reduced" :speed="speed" /></g>
    <LabAnimatedNumber v-if="showHeight" class="node-height" :value="node.h" :x="0" :y="54" prefix="h=" :font-size="9" color="var(--muted)" :seeking="seeking" :reduced="reduced" :speed="speed" />
    <text v-if="badge || (type === 'rb' && showLetters)" x="0" y="16" text-anchor="middle" :fill="text" font-size="8" font-weight="700">{{ badge || (node.c === 'R' ? 'R' : 'N') }}</text>
    <text v-if="depth !== undefined" class="node-level" :y="showHeight ? 70 : 54" text-anchor="middle" fill="var(--muted)" font-size="8">nível {{ depth }}</text>
  </motion.g>
</template>
<style scoped>
g { cursor: pointer; }
text { font-family: 'JetBrains Mono', monospace; font-variant-numeric: tabular-nums; pointer-events: none; }
.node-ring { filter: drop-shadow(0 0 2px color-mix(in srgb, var(--node-role-color) 30%, transparent)); }
.node-halo { pointer-events: none; }
</style>

<script setup lang="ts">
import { motion } from 'motion-v'
import type { MotionValue } from 'motion-v'
import type { Role, TreeNode, TreeType } from '../../engine/types'
const props = defineProps<{ id: number; node: TreeNode; position: { x: MotionValue<number>; y: MotionValue<number> }; type: TreeType; role?: Role; selected?: boolean; root?: boolean; seeking?: boolean; reduced?: boolean; balance?: number; showHeight?: boolean; showLetters?: boolean; order?: number; speed?: number; depth?: number }>()
const emit = defineEmits<{ select: [id: number] }>()
const colors: Partial<Record<Role, string>> = { current: 'var(--compare)', new: 'var(--accent)', found: 'var(--success)', delete: 'var(--delete)', successor: 'var(--delete)', pivot: 'var(--rotation)', moved: 'var(--rotation)', violation: 'var(--violation)', 'extra-black': 'var(--rotation)', visited: 'var(--accent)' }
const ring = computed(() => props.selected ? 'var(--accent)' : props.role ? colors[props.role] : undefined)
const fill = computed(() => props.type === 'rb' ? props.node.c === 'R' ? '#C62F3A' : '#15161B' : 'var(--surface-3)')
const text = computed(() => props.type === 'rb' ? '#FFFFFF' : 'var(--text)')
const badge = computed(() => props.role === 'found' ? '✓' : props.role === 'successor' ? 'S' : props.role === 'violation' ? '!' : props.role === 'extra-black' ? '+1' : props.order ? String(props.order) : '')
function select(event: Event) { event.stopPropagation(); emit('select', props.id) }
</script>
<template>
  <motion.g :style="{ x: position.x, y: position.y }" :initial="seeking || reduced ? false : { opacity: 0, scale: .6 }" :animate="{ opacity: role === 'delete' ? .6 : 1, scale: 1 }" :exit="seeking ? { opacity: 0 } : { opacity: 0, scale: .6 }" :transition="{ duration: seeking ? 0 : reduced ? .12 : .3 / (speed ?? 1) }" data-node="true" @click="select">
    <circle r="25" fill="transparent" />
    <motion.circle v-if="ring" r="24" fill="none" :stroke="ring" stroke-width="2.5" :stroke-dasharray="['delete', 'moved', 'extra-black'].includes(role ?? '') ? '4 3' : undefined" :animate="!seeking && !reduced && ['current', 'violation', 'found', 'duplicate'].includes(role ?? '') ? { opacity: [1, .4, 1, .4, 1] } : { opacity: 1 }" :transition="{ duration: seeking ? 0 : reduced ? .12 : .7 / (speed ?? 1) }" />
    <circle v-if="role === 'extra-black'" r="28" fill="none" stroke="var(--rotation)" stroke-width="1.5" stroke-dasharray="4 3" />
    <circle r="20" :fill="fill" :stroke="type === 'rb' ? '#8B90A0' : 'var(--border-strong)'" stroke-width="1.5" />
    <AnimatePresence :initial="false"><motion.circle :key="fill" r="20" :fill="fill" :initial="{ opacity: seeking ? 1 : 0 }" :animate="{ opacity: 1 }" :exit="{ opacity: 0 }" :transition="{ duration: seeking ? 0 : reduced ? .12 : .3 / (speed ?? 1) }" /></AnimatePresence>
    <text y="5" text-anchor="middle" :fill="text" :font-size="String(node.key).length > 3 ? 12 : 15" font-weight="600">{{ node.key }}</text>
    <text v-if="root" y="-33" text-anchor="middle" fill="var(--muted)" font-size="10">raiz</text>
    <g v-if="type === 'avl'"><rect x="12" y="-27" width="22" height="15" rx="6" :fill="Math.abs(balance ?? 0) > 1 ? 'var(--violation)' : balance ? 'var(--compare)' : 'var(--success)'" /><LabAnimatedNumber :value="balance ?? 0" :x="23" :y="-16" :prefix="balance && balance > 0 ? '+' : ''" color="var(--on-semantic)" :font-weight="700" :seeking="seeking" :reduced="reduced" :speed="speed" /></g>
    <LabAnimatedNumber v-if="showHeight" :value="node.h" :y="35" prefix="h=" color="var(--muted)" :seeking="seeking" :reduced="reduced" :speed="speed" />
    <text v-if="depth !== undefined" :y="showHeight ? 50 : 38" text-anchor="middle" fill="var(--muted)" font-size="9">nível {{ depth }}</text>
    <g v-if="badge || (type === 'rb' && showLetters)"><rect x="14" y="10" :width="badge === '+1' ? 22 : 16" height="16" rx="5" :fill="ring ?? 'var(--surface-3)'" /><text :x="badge === '+1' ? 25 : 22" y="22" text-anchor="middle" :fill="ring ? 'var(--on-semantic)' : 'var(--text)'" font-size="10" font-weight="700">{{ badge || (node.c === 'R' ? 'R' : 'N') }}</text></g>
  </motion.g>
</template>
<style scoped>g { cursor: pointer; } text { font-family: 'JetBrains Mono', monospace; font-variant-numeric: tabular-nums; pointer-events: none; }</style>

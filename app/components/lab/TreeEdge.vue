<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { motion, useMotionValue } from 'motion-v'
import type { MotionValue } from 'motion-v'
import type { Role } from '../../engine/types'
import { effectDuration, roleColor } from './semanticMotion'
import { TREE_EASE } from './motion'
const props = withDefaults(defineProps<{ from: { x: MotionValue<number>; y: MotionValue<number> }; to: { x: MotionValue<number>; y: MotionValue<number> }; active?: boolean; highlighted?: boolean; role?: Role; effectKey?: number | string; rotation?: boolean; diagnosis?: boolean; draw?: boolean; seeking?: boolean; reduced?: boolean; speed?: number }>(), { active: true, highlighted: false, role: undefined, effectKey: undefined, rotation: false, diagnosis: false, draw: false, seeking: false, reduced: false, speed: 1 })
const emit = defineEmits<{ exitComplete: [] }>()
function complete() { if (!props.active) emit('exitComplete') }
const semanticRole = computed(() => props.role ?? (props.highlighted ? props.diagnosis ? 'violation' : props.rotation ? 'pivot' : 'path' : undefined))
const color = computed(() => roleColor(semanticRole.value) ?? 'var(--border-strong)')
const emphasized = computed(() => !!semanticRole.value || props.highlighted)
const flowFinished = ref(false)
watch(() => [props.effectKey, props.draw], () => { flowFinished.value = false })
const flow = computed(() => props.active && !props.seeking && !props.reduced && !props.rotation && props.draw && !flowFinished.value)
const duration = computed(() => effectDuration(.2, props.speed, props.seeking, props.reduced))
const path = useMotionValue('')
let unsubscribe: (() => void)[] = []
function updatePath() {
  const x1 = props.from.x.get(), y1 = props.from.y.get(), x2 = props.to.x.get(), y2 = props.to.y.get()
  const distance = Math.max(1, Math.hypot(x2 - x1, y2 - y1))
  const dx = (x2 - x1) * 20 / distance
  const dy = (y2 - y1) * 20 / distance
  path.set(`M ${x1 + dx} ${y1 + dy} L ${x2 - dx} ${y2 - dy}`)
}
// A rotation can reverse parent/child on the same canonical edge. Rebind its
// sources so the retained path and the next search flow use the new direction.
watch(() => [props.from.x, props.from.y, props.to.x, props.to.y], values => {
  unsubscribe.forEach(stop => stop())
  unsubscribe = values.map(value => value.on('change', updatePath))
  updatePath()
}, { immediate: true, flush: 'sync' })
onBeforeUnmount(() => unsubscribe.forEach(stop => stop()))
</script>
<template>
  <motion.g :initial="seeking || reduced ? false : { opacity: 0 }" :animate="{ opacity: active ? 1 : 0 }" :transition="{ duration, ease: TREE_EASE }" :data-edge-role="semanticRole" @animation-complete="complete">
    <motion.path class="tree-edge" :d="path" fill="none" :stroke="color" :initial="false" :animate="{ strokeWidth: emphasized ? 3 : 2 }" :transition="{ duration, ease: TREE_EASE }" stroke-linecap="round" />
    <motion.path v-if="flow" :key="`${effectKey ?? ''}:${semanticRole}`" class="edge-flow" :d="path" fill="none" :stroke="color" stroke-width="5" stroke-linecap="round" pathLength="1" stroke-dasharray="0.12 1.5" :initial="{ strokeDashoffset: .22 }" :animate="{ strokeDashoffset: -1.25 }" :transition="{ duration: effectDuration(.5, speed), ease: 'linear' }" aria-hidden="true" @animation-complete="flowFinished = true" />
  </motion.g>
</template>

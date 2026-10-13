<script setup lang="ts">
import { motion, useMotionValue } from 'motion-v'
import type { MotionValue } from 'motion-v'
import { computed, onBeforeUnmount, useId, watch } from 'vue'
import { effectDuration, roleColor } from './semanticMotion'
import { TREE_EASE } from './motion'
const markerId = `rotation-arrow-${useId().replace(/:/g, '')}`
const props = defineProps<{ pivot: { x: MotionValue<number>; y: MotionValue<number> }; child: { x: MotionValue<number>; y: MotionValue<number> }; direction: 'left' | 'right'; seeking?: boolean; reduced?: boolean; speed?: number }>()
const color = roleColor('pivot')
const duration = computed(() => effectDuration(.46, props.speed, props.seeking, props.reduced))
const delay = (index: number) => effectDuration(index * .1, props.speed, props.seeking, props.reduced)
const rising = useMotionValue(''), falling = useMotionValue('')
let unsubscribe: (() => void)[] = []
function updatePaths() {
  const px = props.pivot.x.get(), py = props.pivot.y.get(), cx = props.child.x.get(), cy = props.child.y.get()
  const side = props.direction === 'left' ? 1 : -1
  // Keep both direction cues beside the nodes whose positions change. A
  // connecting arc can run through an ancestor's height or level label.
  rising.set(`M ${cx + side * 40} ${cy + 12} C ${cx + side * 44} ${cy + 2}, ${cx + side * 44} ${cy - 9}, ${cx + side * 32} ${cy - 18}`)
  // Show the pivot's actual downward direction locally. A large returning arc
  // crossed the opposite child and obscured its value before the rotation.
  falling.set(`M ${px - side * 32} ${py - 18} C ${px - side * 26} ${py - 7}, ${px - side * 26} ${py - 2}, ${px - side * 40} ${py + 12}`)
}
watch(() => [props.pivot.x, props.pivot.y, props.child.x, props.child.y, props.direction], () => {
  unsubscribe.forEach(stop => stop())
  unsubscribe = [props.pivot.x, props.pivot.y, props.child.x, props.child.y].map(value => value.on('change', updatePaths))
  updatePaths()
}, { immediate: true, flush: 'sync' })
onBeforeUnmount(() => unsubscribe.forEach(stop => stop()))
</script>
<template>
  <motion.g aria-hidden="true" :initial="false" :animate="{ opacity: 1 }" :exit="{ opacity: 0 }" :transition="{ duration: effectDuration(.18, speed, seeking, reduced), ease: TREE_EASE }">
    <defs>
      <marker v-for="index in [0, 1]" :id="`${markerId}-${index}`" :key="index" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto"><motion.path d="M0 0L10 5L0 10Z" :fill="color" :initial="seeking || reduced ? false : { opacity: 0 }" :animate="{ opacity: 1 }" :transition="{ duration: effectDuration(.08, speed, seeking, reduced), delay: seeking || reduced ? 0 : duration + delay(index) }" /></marker>
    </defs>
    <motion.path v-for="(path, index) in [rising, falling]" :key="index" class="rotation-arrow" :d="path" fill="none" :stroke="color" stroke-width="2.5" :stroke-dasharray="index ? '5 4' : undefined" :marker-end="`url(#${markerId}-${index})`" :initial="seeking || reduced ? false : { pathLength: 0 }" :animate="{ pathLength: 1 }" :transition="{ duration, delay: delay(index), ease: TREE_EASE }" />
  </motion.g>
</template>

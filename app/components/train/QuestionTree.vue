<script setup lang="ts">
import { layoutTree } from '~/engine/layout'
import { inorder } from '~/engine/tree'
import type { Snapshot, TreeType } from '~/engine/types'
const props = defineProps<{ tree: Snapshot; type: TreeType; selectable?: boolean; selected?: number; correct?: number }>()
const emit = defineEmits<{ select: [id: number] }>()
const svg = useTemplateRef<SVGSVGElement>('svg')
const canvasSize = ref({ width: 320, height: 210 })
let observer: ResizeObserver | undefined
const layout = computed(() => layoutTree(props.tree))
const nodes = computed(() => Object.entries(props.tree.nodes).map(([id, node]) => ({ id: Number(id), ...node, ...layout.value.positions[Number(id)]! })))
const edges = computed(() => nodes.value.flatMap(node => [node.l, node.r].filter((id): id is number => id !== null).map(id => ({ from: node.id, to: id }))))
const box = computed(() => {
  const { minX, minY, maxX, maxY } = layout.value.bounds
  return { x: minX - 32, y: minY - 32, width: Math.max(160, maxX - minX + 64), height: Math.max(120, maxY - minY + 64) }
})
const viewBox = computed(() => `${box.value.x} ${box.value.y} ${box.value.width} ${box.value.height}`)
const hitRadius = computed(() => Math.max(25, 25 / Math.max(.01, Math.min(canvasSize.value.width / box.value.width, canvasSize.value.height / box.value.height))))
onMounted(() => {
  observer = new ResizeObserver(([entry]) => { if (entry) canvasSize.value = { width: entry.contentRect.width, height: entry.contentRect.height } })
  if (svg.value) observer.observe(svg.value)
})
onBeforeUnmount(() => observer?.disconnect())
const description = computed(() => `${props.type === 'bst' ? 'ABB' : props.type === 'avl' ? 'AVL' : 'Rubro-Negra'} com ${nodes.value.length} nós. Raiz ${props.tree.rootId === null ? 'vazia' : props.tree.nodes[props.tree.rootId]!.key}. In-ordem: ${inorder(props.tree).join(', ')}.`)
</script>
<template>
  <svg ref="svg" class="question-tree" :viewBox="viewBox" :role="selectable ? 'group' : 'img'" :aria-label="description">
    <title>{{ description }}</title>
    <line v-for="edge in edges" :key="`${edge.from}-${edge.to}`" :x1="layout.positions[edge.from]!.x" :y1="layout.positions[edge.from]!.y" :x2="layout.positions[edge.to]!.x" :y2="layout.positions[edge.to]!.y" stroke="var(--border-strong)" stroke-width="2" vector-effect="non-scaling-stroke" />
    <g v-for="node in nodes" :key="node.id" :transform="`translate(${node.x} ${node.y})`" :role="selectable ? 'button' : undefined" :tabindex="selectable ? 0 : undefined" :aria-label="selectable ? `Nó ${node.key}${node.c ? node.c === 'R' ? ', vermelho' : ', preto' : ''}` : undefined" :class="{ selectable }" @click="selectable && emit('select', node.id)" @keydown.enter.prevent="selectable && emit('select', node.id)" @keydown.space.prevent="selectable && emit('select', node.id)">
      <circle :r="hitRadius" fill="transparent" />
      <circle r="20" :fill="type === 'rb' ? node.c === 'R' ? '#C62F3A' : '#15161B' : 'var(--surface-3)'" :stroke="correct === node.id ? 'var(--success)' : selected === node.id ? 'var(--accent)' : type === 'rb' ? '#8B90A0' : 'var(--border-strong)'" :stroke-width="correct === node.id || selected === node.id ? 3 : 1.5" />
      <text text-anchor="middle" dominant-baseline="central" :fill="type === 'rb' ? '#FFFFFF' : 'var(--text)'" font-size="14" font-weight="600">{{ node.key }}</text>
      <text v-if="type === 'rb'" x="19" y="-17" text-anchor="middle" fill="var(--muted)" font-size="10">{{ node.c === 'R' ? 'R' : 'N' }}</text>
    </g>
  </svg>
</template>
<style scoped>
.question-tree { width:100%; height:210px; display:block; overflow:visible; font-family:'JetBrains Mono',monospace; user-select:none; }
.selectable { cursor:pointer; touch-action:manipulation; }
.selectable:focus-visible { outline:none; }
.selectable:focus-visible circle:last-of-type { stroke:var(--accent); stroke-width:3; }
</style>

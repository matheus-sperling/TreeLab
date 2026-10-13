<script setup lang="ts">
import { motion, animate, useMotionValue } from 'motion-v'
import type { MotionValue } from 'motion-v'
import { layoutTree } from '../../engine'
import type { Snapshot, Step, TreeType } from '../../engine/types'
const props = withDefaults(defineProps<{ tree: Snapshot; type: TreeType; step?: Step; seeking?: boolean; speed?: number; reduced?: boolean; selected?: number | null; showHeights?: boolean; showNils?: boolean; showLetters?: boolean; showLevels?: boolean }>(), { speed: 1, reduced: false, seeking: true, selected: null, step: undefined })
const emit = defineEmits<{ select: [id: number]; empty: []; details: []; compose: []; concepts: []; preset: [name: string] }>()
const container = ref<HTMLElement | null>(null)
const positions = shallowReactive<Record<number, { x: MotionValue<number>; y: MotionValue<number> }>>({})
const controls = new Map<number, ReturnType<typeof animate>[]>()
const layout = computed(() => layoutTree(props.tree, { showNils: props.showNils, showHeights: props.showHeights, showLevels: props.showLevels, extraBlack: props.step?.meta?.extraBlack }))
const camera = useCamera(container, computed(() => layout.value.bounds), computed(() => props.reduced))
const nodes = computed(() => Object.entries(props.tree.nodes).map(([id, node]) => ({ id: Number(id), node })))
const edges = computed(() => nodes.value.flatMap(({ id, node }) => [node.l, node.r].filter((child): child is number => child !== null).map(child => ({ from: id, to: child }))))
const height = computed(() => props.tree.rootId === null ? -1 : props.tree.nodes[props.tree.rootId]?.h ?? -1)
const selectedPath = computed(() => { const ids: number[] = []; let id = props.selected; while (id !== null && id !== undefined && props.tree.nodes[id]) { ids.push(id); id = props.tree.nodes[id]!.p } return ids })
const label = computed(() => {
  const values = (id: number | null): number[] => id === null || !props.tree.nodes[id] ? [] : [...values(props.tree.nodes[id]!.l), props.tree.nodes[id]!.key, ...values(props.tree.nodes[id]!.r)]
  return `Árvore ${props.type === 'rb' ? 'Rubro-Negra' : props.type === 'avl' ? 'AVL' : 'Binária de Busca'}. ${nodes.value.length} nós. Altura ${height.value}. ${props.tree.rootId === null ? 'Árvore vazia.' : `Raiz ${props.tree.nodes[props.tree.rootId]?.key}. In-ordem: ${values(props.tree.rootId).join(', ')}.`}`
})
const a11yLabel = ref(label.value)
watch(() => [props.tree, props.seeking, props.showNils, props.showHeights, props.showLevels] as const, () => {
  for (const { id, node } of nodes.value) {
    const target = layout.value.positions[id]
    if (!target) continue
    if (!positions[id]) {
      const parent = node.p === null ? undefined : positions[node.p]
      positions[id] = { x: useMotionValue(props.seeking ? target.x : parent?.x.get() ?? target.x), y: useMotionValue(props.seeking ? target.y : parent?.y.get() ?? target.y) }
    }
    for (const control of controls.get(id) ?? []) control.stop()
    const position = positions[id]!
    if (props.seeking || props.reduced) { position.x.set(target.x); position.y.set(target.y) }
    else controls.set(id, [animate(position.x, target.x, { type: 'spring', duration: (props.step?.kind === 'rotate' ? .7 : .45) / props.speed, bounce: .1 }), animate(position.y, target.y, { type: 'spring', duration: (props.step?.kind === 'rotate' ? .7 : .45) / props.speed, bounce: .1 })])
  }
  if (props.step?.kind === 'done' || props.seeking) a11yLabel.value = label.value
  const active = Number(Object.entries(props.step?.hl ?? {}).find(([, role]) => ['current', 'new', 'pivot', 'found', 'violation'].includes(role))?.[0])
  const point = layout.value.positions[active]
  nextTick(() => {
    if (nodes.value.length < 2 || props.seeking && camera.following.value) camera.fit(props.tree.rootId === null ? undefined : layout.value.positions[props.tree.rootId], props.seeking)
    else if (point) camera.follow(point)
  })
}, { immediate: true })
function depth(id: number) { let value = 0; let idParent = props.tree.nodes[id]?.p; while (idParent !== null && idParent !== undefined) { value++; idParent = props.tree.nodes[idParent]?.p } return value }
function balance(id: number) { const node = props.tree.nodes[id]!; return (node.l === null ? -1 : props.tree.nodes[node.l]?.h ?? -1) - (node.r === null ? -1 : props.tree.nodes[node.r]?.h ?? -1) }
function highlighted(from: number, to: number) { return props.step?.edges.some(edge => edge.from === from && edge.to === to) || selectedPath.value.includes(from) && selectedPath.value.includes(to) }
function fit() { camera.fit(props.tree.rootId === null ? undefined : layout.value.positions[props.tree.rootId]) }
function focus(id: number, safeBottom = 0) { const point = layout.value.positions[id]; camera.safeBottom.value = 8 + safeBottom; if (point) camera.focus(point) }
function focusSubtree(id: number, safeBottom = 0) {
  const ids: number[] = []
  const visit = (current: number | null) => { if (current === null) return; const node = props.tree.nodes[current]; if (!node) return; ids.push(current); visit(node.l); visit(node.r) }
  visit(id)
  const points = ids.map(current => layout.value.positions[current]).filter(point => point !== undefined)
  if (!points.length) return
  camera.safeBottom.value = 8 + safeBottom
  camera.fitBounds({ minX: Math.min(...points.map(point => point.x)) - 20, maxX: Math.max(...points.map(point => point.x)) + 20, minY: Math.min(...points.map(point => point.y)) - 20, maxY: Math.max(...points.map(point => point.y)) + 20 }, layout.value.positions[id])
}
function clearFocus() { camera.safeBottom.value = 8 }
function empty(event: MouseEvent) { if (!(event.target as Element).closest('[data-node]') && !camera.moved()) emit('empty') }
onBeforeUnmount(() => { for (const group of controls.values()) for (const control of group) control.stop() })
defineExpose({ fit, focus, focusSubtree, clearFocus })
</script>

<template>
  <section class="tree-canvas-frame">
    <header class="canvas-toolbar"><div class="metrics" aria-label="Métricas da árvore"><span><b>{{ nodes.length }}</b> nós</span><span>altura <b>{{ nodes.length ? height : '—' }}</b></span></div><button type="button" class="canvas-details" aria-label="Detalhes" @click="emit('details')"><Icon name="lucide:lightbulb" />Por quê?</button><UiIconButton icon="scan" label="Ajustar árvore à tela" @click="fit" /></header>
  <section ref="container" class="tree-canvas" @pointerdown="camera.down" @pointermove="camera.drag" @pointerup="camera.up" @pointercancel="camera.up" @wheel="camera.wheel">
    <svg class="tree-svg" role="img" :aria-label="a11yLabel" @click="empty">

      <motion.g :style="{ transform: camera.transform, originX: 0, originY: 0, transformOrigin: '0px 0px', transformBox: 'view-box' }">
        <LabRotationGuide v-if="step?.kind === 'rotate-pre' && step.meta?.rotation && positions[step.meta.rotation.pivot] && positions[step.meta.rotation.child]" :pivot="positions[step.meta.rotation.pivot]!" :child="positions[step.meta.rotation.child]!" :direction="step.meta.rotation.dir" :reduced="reduced" />
        <motion.g v-if="step?.kind === 'rotate-pre' && step.meta?.rotation?.movedSubtree && positions[step.meta.rotation.movedSubtree]" :style="{ x: positions[step.meta.rotation.movedSubtree]!.x, y: positions[step.meta.rotation.movedSubtree]!.y }"><rect x="-28" y="-28" width="56" height="56" rx="12" fill="none" stroke="var(--rotation)" stroke-width="1.5" stroke-dasharray="4 4" /></motion.g>
        <AnimatePresence :initial="false"><LabTreeEdge v-for="edge in edges" :key="`${edge.from}:${edge.to}`" :from="positions[edge.from]!" :to="positions[edge.to]!" :highlighted="highlighted(edge.from, edge.to)" :rotation="step?.kind === 'rotate-pre'" :diagnosis="step?.kind === 'imbalance' || step?.kind === 'case'" :draw="step?.kind === 'compare' && highlighted(edge.from, edge.to)" :seeking="seeking" :reduced="reduced" :speed="speed" /></AnimatePresence>
        <g v-for="nil in layout.nils" :key="nil.id"><line :x1="(layout.positions[nil.parent]?.x ?? 0) + (nil.side === 'L' ? -1 : 1) * 20 / Math.SQRT2" :y1="(layout.positions[nil.parent]?.y ?? 0) + 20 / Math.SQRT2" :x2="nil.x" :y2="nil.y" stroke="var(--border-strong)" /><rect :x="nil.x - 5" :y="nil.y - 5" width="10" height="10" fill="#15161B" :stroke="step?.meta?.extraBlack?.parent === nil.parent && step.meta.extraBlack.side === nil.side ? 'var(--rotation)' : '#8B90A0'" /><text v-if="step?.meta?.extraBlack?.parent === nil.parent && step.meta.extraBlack.side === nil.side" :x="nil.x + 10" :y="nil.y + 4" fill="var(--rotation)" font-size="10">+1</text></g>
        <AnimatePresence :initial="false"><LabTreeNode v-for="{ id, node } in nodes" :id="id" :key="id" :node="node" :position="positions[id]!" :type="type" :role="step?.hl[id]" :root="id === tree.rootId" :selected="selectedPath.includes(id)" :seeking="seeking" :reduced="reduced" :balance="balance(id)" :show-height="showHeights" :depth="showLevels ? depth(id) : undefined" :show-letters="showLetters" :order="step?.meta?.order?.indexOf(node.key) === undefined ? undefined : step.meta.order.indexOf(node.key) + 1" :speed="speed" @select="emit('select', $event)" /></AnimatePresence>
      </motion.g>
    </svg>
    <div class="node-targets" role="group" aria-label="Nós da árvore: selecione para inspecionar"><LabNodeTarget v-for="{ id, node } in nodes" :id="id" :key="id" :node-key="node.key" :height="node.h" :root="id === tree.rootId" :selected="selected === id" :position="positions[id]!" :camera="camera" @select="emit('select', $event)" @focus="layout.positions[$event] && camera.follow(layout.positions[$event]!, true)" /></div>
    <div v-if="!nodes.length" class="empty-tree" :class="{ compact: camera.height.value < 300 }" @pointerdown.stop><svg viewBox="0 0 180 90" aria-hidden="true"><path d="M90 25L45 70M90 25L135 70" /><circle cx="90" cy="25" r="18" /><circle cx="45" cy="70" r="15" /><circle cx="135" cy="70" r="15" /></svg><h2>{{ step ? 'Tudo começa na raiz.' : 'Sua árvore começa aqui.' }}</h2><p>{{ step ? 'Toque em Reproduzir para iniciar a sequência.' : 'Escolha um número. O laboratório mostra o caminho.' }}</p><button v-if="!step" class="empty-primary" @click="emit('compose')"><Icon name="lucide:plus" />Inserir primeiro número</button><button class="empty-concepts" @click="emit('concepts')">Explorar um conceito<Icon name="lucide:arrow-right" /></button></div>
  </section>
    <div v-if="step?.meta?.rotation && ['case', 'rotate-pre', 'rotate'].includes(step.kind)" class="rotation-caption"><Icon :name="step.meta.rotation.dir === 'left' ? 'lucide:rotate-ccw' : 'lucide:rotate-cw'" /><span><strong>{{ tree.nodes[step.meta.rotation.child]?.key }}</strong> sobe · <strong>{{ tree.nodes[step.meta.rotation.pivot]?.key }}</strong> desce</span><span>{{ step.meta.rotation.dir === 'left' ? 'à esquerda' : 'à direita' }}</span></div>
  </section>
</template>

<style scoped>
.tree-canvas-frame { height:100%; display:flex; flex-direction:column; min-height:0; }
.canvas-toolbar { flex-shrink:0; display:flex; align-items:center; gap:8px; height:48px; padding:0 12px; border-bottom:1px solid var(--border); background:var(--bg); }
.metrics { display:flex; align-items:center; flex:1; min-width:0; gap:10px; color:var(--muted); font:11px 'JetBrains Mono',monospace; }.metrics b { font-weight:500; color:var(--text); }
.canvas-details { display:flex; align-items:center; gap:6px; padding:0 10px; font-size:12px; min-height:36px; background:var(--surface-1); border:1px solid var(--border); border-radius:10px; }
.canvas-toolbar>:deep(.icon-button) { width:36px; height:36px; min-width:36px; border:1px solid var(--border); border-radius:10px; }.canvas-toolbar :deep(.iconify) { width:17px; height:17px; }
.tree-canvas { position:relative; width:100%; flex:1; min-height:0; overflow:hidden; touch-action:none; user-select:none; -webkit-touch-callout:none; background-image:radial-gradient(var(--border) .65px,transparent .65px); background-size:20px 20px; }
.tree-svg { width:100%; height:100%; display:block; }.node-targets { position:absolute; inset:0; pointer-events:none; }
.empty-tree { position:absolute; inset:12px 16px; display:flex; flex-direction:column; justify-content:center; align-items:center; text-align:center; }
.empty-tree svg { width:150px; height:80px; fill:transparent; stroke:var(--border-strong); stroke-width:1.5; stroke-dasharray:4 5; }.empty-tree h2 { font-size:20px; font-weight:650; margin-top:10px; }.empty-tree p { max-width:260px; line-height:1.6; font-size:13px; color:var(--muted); margin:8px 0 16px; }
.empty-tree>button { display:flex; align-items:center; justify-content:center; gap:8px; min-height:44px; border-radius:12px; }.empty-primary { color:var(--bg); background:var(--accent); border:1px solid var(--accent); padding:0 18px; font-size:13px; font-weight:600; }.empty-concepts { background:transparent; color:var(--muted); font-size:12px; margin-top:4px; }.empty-tree :deep(.iconify) { width:16px; height:16px; }
.empty-tree.compact { inset:8px 12px; }.empty-tree.compact svg { display:none; }.empty-tree.compact h2 { font-size:16px; margin:0 0 6px; }.empty-tree.compact p { font-size:12px; margin:0 0 8px; }
.rotation-caption { flex-shrink:0; min-height:36px; display:flex; align-items:center; gap:8px; padding:6px 16px; border-top:1px solid var(--border); color:var(--rotation); font-size:12px; background:var(--surface-1); }.rotation-caption>span:last-child { margin-left:auto; font-size:11px; color:var(--muted); }.rotation-caption strong { font-family:'JetBrains Mono',monospace; }.rotation-caption :deep(.iconify) { width:16px; height:16px; }
@media(max-height:740px) { .empty-tree.compact .empty-concepts { display:none; } }
</style>

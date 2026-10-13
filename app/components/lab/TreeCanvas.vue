<script setup lang="ts">
import { motion, animate, useMotionValue } from 'motion-v'
import type { MotionValue } from 'motion-v'
import { layoutTree } from '../../engine'
import { movementDuration, TREE_EASE } from './motion'
import type { LayoutResult, Position, Role, Snapshot, Step, TreeType } from '../../engine/types'
const props = withDefaults(defineProps<{ tree: Snapshot; type: TreeType; step?: Step; seeking?: boolean; speed?: number; reduced?: boolean; selected?: number | null; showHeights?: boolean; showNils?: boolean; showLetters?: boolean; showLevels?: boolean; resizing?: boolean }>(), { speed: 1, reduced: false, seeking: true, selected: null, step: undefined, resizing: false })
const emit = defineEmits<{ select: [id: number]; empty: []; details: []; compose: []; concepts: []; preset: [name: string] }>()
const container = ref<HTMLElement | null>(null)
const positions = shallowReactive<Record<number, { x: MotionValue<number>; y: MotionValue<number> }>>({})
type MotionPoint = { x: MotionValue<number>; y: MotionValue<number> }
const nilPositions = shallowReactive<Record<string, MotionPoint>>({})
const visibleNils = shallowReactive<Record<string, LayoutResult['nils'][number] & { active: boolean }>>({})
const visibleEdges = shallowReactive<Record<string, { from: number; to: number; active: boolean }>>({})
const controls = new Map<string, ReturnType<typeof animate>[]>()
const targets = new Map<string, Position>()
const rotation = computed(() => props.step?.meta?.rotation)
const edgeKey = (from: number, to: number) => `${Math.min(from, to)}:${Math.max(from, to)}`
function finishNilExit(id: string) { if (!visibleNils[id]?.active) Reflect.deleteProperty(visibleNils, id) }
function finishEdgeExit(id: string) { if (!visibleEdges[id]?.active) Reflect.deleteProperty(visibleEdges, id) }
function movePoint(key: string, point: MotionPoint, target: Position) {
  const instant = props.seeking || props.reduced
  const previous = targets.get(key)
  // Metadata and color steps must not restart a movement already in progress.
  if (!instant && previous?.x === target.x && previous.y === target.y) return
  for (const control of controls.get(key) ?? []) control.stop()
  targets.set(key, { ...target })
  if (instant) { point.x.set(target.x); point.y.set(target.y); controls.delete(key); return }
  const transition = { type: 'tween' as const, duration: movementDuration(props.step?.kind, props.speed), ease: TREE_EASE }
  controls.set(key, [animate(point.x, target.x, transition), animate(point.y, target.y, transition)])
}
const layout = computed(() => layoutTree(props.tree, { showNils: props.showNils, showHeights: props.showHeights, showLevels: props.showLevels, extraBlack: props.step?.meta?.extraBlack }))
const camera = useCamera(container, computed(() => layout.value.bounds), computed(() => props.reduced), computed(() => props.resizing))
const nodes = computed(() => Object.entries(props.tree.nodes).map(([id, node]) => ({ id: Number(id), node })))
const edges = computed(() => nodes.value.flatMap(({ id, node }) => [node.l, node.r].filter((child): child is number => child !== null).map(child => ({ from: id, to: child }))))
const height = computed(() => props.tree.rootId === null ? -1 : props.tree.nodes[props.tree.rootId]?.h ?? -1)
const selectedPath = computed(() => { const ids: number[] = []; let id = props.selected; while (id !== null && id !== undefined && props.tree.nodes[id]) { ids.push(id); id = props.tree.nodes[id]!.p } return ids })
const label = computed(() => {
  const values = (id: number | null): number[] => id === null || !props.tree.nodes[id] ? [] : [...values(props.tree.nodes[id]!.l), props.tree.nodes[id]!.key, ...values(props.tree.nodes[id]!.r)]
  return `Árvore ${props.type === 'rb' ? 'Rubro-Negra' : props.type === 'avl' ? 'AVL' : 'Binária de Busca'}. ${nodes.value.length} nós. Altura ${height.value}. ${props.tree.rootId === null ? 'Árvore vazia.' : `Raiz ${props.tree.nodes[props.tree.rootId]?.key}. In-ordem: ${values(props.tree.rootId).join(', ')}.`}`
})
const a11yLabel = ref(label.value)
watch(() => [props.tree, props.seeking, props.reduced, props.showNils, props.showHeights, props.showLevels] as const, () => {
  const activeKeys = new Set<string>()
  for (const { id, node } of nodes.value) {
    const target = layout.value.positions[id]
    if (!target) continue
    const key = `node:${id}`
    activeKeys.add(key)
    if (!positions[id]) {
      const parent = node.p === null ? undefined : positions[node.p]
      positions[id] = { x: useMotionValue(props.seeking || props.reduced ? target.x : parent?.x.get() ?? target.x), y: useMotionValue(props.seeking || props.reduced ? target.y : parent?.y.get() ?? target.y) }
    }
    movePoint(key, positions[id]!, target)
  }
  for (const nil of layout.value.nils) {
    activeKeys.add(nil.id)
    visibleNils[nil.id] = { ...nil, active: true }
    const parent = positions[nil.parent]!
    const parentTarget = layout.value.positions[nil.parent]!
    const initial = { x: parent.x.get() + nil.x - parentTarget.x, y: parent.y.get() + nil.y - parentTarget.y }
    if (!nilPositions[nil.id]) nilPositions[nil.id] = { x: useMotionValue(initial.x), y: useMotionValue(initial.y) }
    else if (!targets.has(nil.id) && !props.seeking && !props.reduced) { nilPositions[nil.id]!.x.set(initial.x); nilPositions[nil.id]!.y.set(initial.y) }
    movePoint(nil.id, nilPositions[nil.id]!, nil)
  }
  // Keep derived paths subscribed until their fade finishes, including during a rotation.
  for (const [id, nil] of Object.entries(visibleNils)) if (!activeKeys.has(id)) {
    if (props.seeking || props.reduced) Reflect.deleteProperty(visibleNils, id)
    else visibleNils[id] = { ...nil, active: false }
  }
  const activeEdges = new Set<string>()
  for (const edge of edges.value) {
    const key = edgeKey(edge.from, edge.to)
    activeEdges.add(key); visibleEdges[key] = { ...edge, active: true }
  }
  for (const [id, edge] of Object.entries(visibleEdges)) if (!activeEdges.has(id)) {
    if (props.seeking || props.reduced) Reflect.deleteProperty(visibleEdges, id)
    else visibleEdges[id] = { ...edge, active: false }
  }
  for (const key of targets.keys()) if (!activeKeys.has(key)) {
    for (const control of controls.get(key) ?? []) control.stop()
    controls.delete(key); targets.delete(key)
  }
  if (props.step?.kind === 'done' || props.seeking) a11yLabel.value = label.value
  nextTick(() => {
    // Automatic framing keeps the complete tree visible as insertion/removal
    // changes its bounds. A highlighted-node pan retained the old zoom and
    // clipped the root and other branches after the tree grew.
    if (camera.following.value) camera.fit(props.tree.rootId === null ? undefined : layout.value.positions[props.tree.rootId], props.seeking)
  })
}, { immediate: true })
function depth(id: number) { let value = 0; let idParent = props.tree.nodes[id]?.p; while (idParent !== null && idParent !== undefined) { value++; idParent = props.tree.nodes[idParent]?.p } return value }
function balance(id: number) { const node = props.tree.nodes[id]!; return (node.l === null ? -1 : props.tree.nodes[node.l]?.h ?? -1) - (node.r === null ? -1 : props.tree.nodes[node.r]?.h ?? -1) }
function edgeRole(from: number, to: number): Role | undefined {
  const step = props.step
  const explicit = step?.edges.find(edge => edge.from === from && edge.to === to)?.role
  if (explicit) return explicit
  const destinationRole = step?.hl[to]
  if (step?.kind === 'descend' && props.tree.nodes[from]?.key === step.msg.params.at) {
    const parent = props.tree.nodes[from]!
    const left = step.msg.params.side === 'l' || step.msg.params.dir === 'left'
    if ((left ? parent.l : parent.r) === to) return 'path'
  }
  if (step?.kind === 'compare' && destinationRole === 'current') return 'current'
  if (step?.kind === 'visit' && destinationRole) return destinationRole
  if (step?.kind === 'attach' && destinationRole === 'new') return 'new'
  if (destinationRole === 'found' || destinationRole === 'delete' || destinationRole === 'successor' || destinationRole === 'moved') return destinationRole
  return selectedPath.value.includes(from) && selectedPath.value.includes(to) ? 'path' : undefined
}
function drawnEdge(from: number, to: number): boolean {
  const step = props.step
  if (step?.kind === 'compare') return step.hl[to] === 'current'
  if (step?.kind === 'descend' && props.tree.nodes[from]?.key === step.msg.params.at) {
    const parent = props.tree.nodes[from]!
    const left = step.msg.params.side === 'l' || step.msg.params.dir === 'left'
    return (left ? parent.l : parent.r) === to
  }
  return step?.kind === 'visit' && props.tree.nodes[to]?.key === step.msg.params.key && (step.hl[to] === 'visited' || step.hl[to] === 'current')
}
function highlighted(from: number, to: number) { return Boolean(edgeRole(from, to)) }
function fit() { camera.fit(props.tree.rootId === null ? undefined : layout.value.positions[props.tree.rootId]) }
let followingBeforeFocus: boolean | undefined
function rememberFraming() { followingBeforeFocus ??= camera.following.value }
function focus(id: number, safeBottom = 0) { const point = layout.value.positions[id]; if (!point) return; rememberFraming(); camera.safeBottom.value = 8 + safeBottom; camera.focus(point) }
function focusSubtree(id: number, safeBottom = 0) {
  const ids: number[] = []
  const visit = (current: number | null) => { if (current === null) return; const node = props.tree.nodes[current]; if (!node) return; ids.push(current); visit(node.l); visit(node.r) }
  visit(id)
  const points = ids.map(current => layout.value.positions[current]).filter(point => point !== undefined)
  if (!points.length) return
  rememberFraming()
  camera.safeBottom.value = 8 + safeBottom
  camera.fitBounds({ minX: Math.min(...points.map(point => point.x)) - 20, maxX: Math.max(...points.map(point => point.x)) + 20, minY: Math.min(...points.map(point => point.y)) - 20, maxY: Math.max(...points.map(point => point.y)) + 20 }, layout.value.positions[id])
}
function clearFocus() {
  camera.safeBottom.value = 8
  const resume = followingBeforeFocus
  followingBeforeFocus = undefined
  if (resume) fit()
}
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
        <AnimatePresence :initial="false"><LabRotationGuide v-if="step?.kind === 'rotate-pre' && step.meta?.rotation && positions[step.meta.rotation.pivot] && positions[step.meta.rotation.child]" :pivot="positions[step.meta.rotation.pivot]!" :child="positions[step.meta.rotation.child]!" :direction="step.meta.rotation.dir" :seeking="seeking" :reduced="reduced" :speed="speed" /></AnimatePresence>
        <motion.g v-if="step?.kind === 'rotate-pre' && step.meta?.rotation?.movedSubtree && positions[step.meta.rotation.movedSubtree]" :style="{ x: positions[step.meta.rotation.movedSubtree]!.x, y: positions[step.meta.rotation.movedSubtree]!.y }"><rect class="subtree-outline" x="-28" y="-28" width="56" height="56" rx="12" fill="none" stroke="var(--rotation)" stroke-width="1.5" stroke-dasharray="4 4" /></motion.g>
        <LabTreeEdge v-for="(edge, id) in visibleEdges" :key="id" :from="positions[edge.from]!" :to="positions[edge.to]!" :active="edge.active" :role="edgeRole(edge.from, edge.to)" :effect-key="step?.i" :highlighted="highlighted(edge.from, edge.to)" :rotation="step?.kind === 'rotate-pre' && highlighted(edge.from, edge.to)" :diagnosis="step?.kind === 'imbalance' || step?.kind === 'case'" :draw="drawnEdge(edge.from, edge.to)" :seeking="seeking" :reduced="reduced" :speed="speed" @exit-complete="finishEdgeExit(id)" />
        <LabTreeNil v-for="nil in visibleNils" :id="nil.id" :key="nil.id" :parent-id="nil.parent" :parent="positions[nil.parent]!" :position="nilPositions[nil.id]!" :active="nil.active" :extra-black="step?.meta?.extraBlack?.id === null && step.meta.extraBlack.parent === nil.parent && step.meta.extraBlack.side === nil.side" :seeking="seeking" :reduced="reduced" :speed="speed" @exit-complete="finishNilExit(nil.id)" />
        <AnimatePresence :initial="false"><LabTreeNode v-for="{ id, node } in nodes" :id="id" :key="id" :node="node" :position="positions[id]!" :type="type" :role="step?.hl[id]" :step-kind="step?.kind" :effect-key="step?.i" :root="id === tree.rootId" :selected="selectedPath.includes(id)" :seeking="seeking" :reduced="reduced" :balance="balance(id)" :show-height="showHeights" :depth="showLevels ? depth(id) : undefined" :show-letters="showLetters" :order="step?.meta?.order?.indexOf(node.key) === undefined ? undefined : step.meta.order.indexOf(node.key) + 1" :speed="speed" @select="emit('select', $event)" /></AnimatePresence>
      </motion.g>
    </svg>
    <div class="node-targets" role="group" aria-label="Nós da árvore: selecione para inspecionar"><LabNodeTarget v-for="{ id, node } in nodes" :id="id" :key="id" :node-key="node.key" :height="node.h" :root="id === tree.rootId" :selected="selected === id" :position="positions[id]!" :camera="camera" @select="emit('select', $event)" @focus="layout.positions[$event] && camera.follow(layout.positions[$event]!, true)" /></div>
    <div v-if="!nodes.length" class="empty-tree" :class="{ compact: camera.height.value < 300 }" @pointerdown.stop><svg viewBox="0 0 180 90" aria-hidden="true"><path d="M90 25L45 70M90 25L135 70" /><circle cx="90" cy="25" r="18" /><circle cx="45" cy="70" r="15" /><circle cx="135" cy="70" r="15" /></svg><h2>{{ step ? 'Tudo começa na raiz.' : 'Sua árvore começa aqui.' }}</h2><p>{{ step ? 'Toque em Reproduzir para iniciar a sequência.' : 'Escolha um número. O laboratório mostra o caminho.' }}</p><button v-if="!step" class="empty-primary" @click="emit('compose')"><Icon name="lucide:plus" />Inserir primeiro número</button><button class="empty-concepts" @click="emit('concepts')">Explorar um conceito<Icon name="lucide:arrow-right" /></button></div>
  </section>
    <div class="rotation-band"><AnimatePresence :initial="false"><motion.div v-if="rotation" :key="`${rotation.pivot}:${rotation.child}:${rotation.n}`" class="rotation-caption" :initial="reduced ? false : { opacity: 0 }" :animate="{ opacity: 1 }" :exit="{ opacity: 0 }" :transition="{ duration: reduced ? 0 : .18 }"><Icon :name="rotation.dir === 'left' ? 'lucide:rotate-ccw' : 'lucide:rotate-cw'" /><span><strong>{{ tree.nodes[rotation.child]?.key }}</strong> sobe · <strong>{{ tree.nodes[rotation.pivot]?.key }}</strong> desce</span><span>{{ rotation.dir === 'left' ? 'à esquerda' : 'à direita' }}</span></motion.div></AnimatePresence></div>
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
.rotation-band { position:relative; flex-shrink:0; height:32px; }.rotation-caption { position:absolute; inset:0; min-height:32px; display:flex; align-items:center; gap:8px; padding:6px 16px; border-top:1px solid var(--border); color:var(--rotation); font-size:12px; background:var(--surface-1); }.rotation-caption>span:last-child { margin-left:auto; font-size:11px; color:var(--muted); }.rotation-caption strong { font-family:'JetBrains Mono',monospace; }.rotation-caption :deep(.iconify) { width:16px; height:16px; }
@media(max-height:740px) { .empty-tree.compact .empty-concepts { display:none; } }
</style>

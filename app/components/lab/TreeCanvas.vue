<script setup lang="ts">
import { motion, animate, useMotionValue } from 'motion-v'
import type { MotionValue } from 'motion-v'
import { layoutTree } from '../../engine'
import type { Snapshot, Step, TreeType } from '../../engine/types'
const props = withDefaults(defineProps<{ tree: Snapshot; type: TreeType; step?: Step; seeking?: boolean; speed?: number; reduced?: boolean; selected?: number | null; showHeights?: boolean; showNils?: boolean; showLetters?: boolean; showLevels?: boolean }>(), { speed: 1, reduced: false, seeking: true, selected: null, step: undefined })
const emit = defineEmits<{ select: [id: number]; empty: []; details: []; preset: [name: string] }>()
const container = ref<HTMLElement | null>(null)
const positions = shallowReactive<Record<number, { x: MotionValue<number>; y: MotionValue<number> }>>({})
const controls = new Map<number, ReturnType<typeof animate>[]>()
const layout = computed(() => layoutTree(props.tree, { showNils: props.showNils, extraBlack: props.step?.meta?.extraBlack }))
const camera = useCamera(container, computed(() => layout.value.bounds), computed(() => props.reduced))
const nodes = computed(() => Object.entries(props.tree.nodes).map(([id, node]) => ({ id: Number(id), node })))
const edges = computed(() => nodes.value.flatMap(({ id, node }) => [node.l, node.r].filter((child): child is number => child !== null).map(child => ({ from: id, to: child }))))
const height = computed(() => props.tree.rootId === null ? -1 : props.tree.nodes[props.tree.rootId]?.h ?? -1)
const maxBalance = computed(() => Math.max(0, ...nodes.value.map(({ node }) => Math.abs((node.l === null ? -1 : props.tree.nodes[node.l]?.h ?? -1) - (node.r === null ? -1 : props.tree.nodes[node.r]?.h ?? -1)))))
const blackHeight = computed(() => { let id = props.tree.rootId; let count = 1; while (id !== null) { id = props.tree.nodes[id]?.l ?? null; if (id !== null && props.tree.nodes[id]?.c === 'B') count++ } return count })
const selectedPath = computed(() => { const ids: number[] = []; let id = props.selected; while (id !== null && id !== undefined && props.tree.nodes[id]) { ids.push(id); id = props.tree.nodes[id]!.p } return ids })
const label = computed(() => {
  const values = (id: number | null): number[] => id === null || !props.tree.nodes[id] ? [] : [...values(props.tree.nodes[id]!.l), props.tree.nodes[id]!.key, ...values(props.tree.nodes[id]!.r)]
  return `Árvore ${props.type === 'rb' ? 'Rubro-Negra' : props.type === 'avl' ? 'AVL' : 'Binária de Busca'}. ${nodes.value.length} nós. Altura ${height.value}. ${props.tree.rootId === null ? 'Árvore vazia.' : `Raiz ${props.tree.nodes[props.tree.rootId]?.key}. In-ordem: ${values(props.tree.rootId).join(', ')}.`}`
})
const a11yLabel = ref(label.value)
watch(() => [props.tree, props.seeking] as const, () => {
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
function balance(id: number) { const node = props.tree.nodes[id]!; return (node.l === null ? -1 : props.tree.nodes[node.l]?.h ?? -1) - (node.r === null ? -1 : props.tree.nodes[node.r]?.h ?? -1) }
function highlighted(from: number, to: number) { return props.step?.edges.some(edge => edge.from === from && edge.to === to) || selectedPath.value.includes(from) && selectedPath.value.includes(to) }
function fit() { camera.fit(props.tree.rootId === null ? undefined : layout.value.positions[props.tree.rootId]) }
function focus(id: number, safeBottom = 0) { const point = layout.value.positions[id]; camera.safeBottom.value = safeBottom; if (point) camera.focus(point) }
function focusSubtree(id: number, safeBottom = 0) {
  const ids: number[] = []
  const visit = (current: number | null) => { if (current === null) return; const node = props.tree.nodes[current]; if (!node) return; ids.push(current); visit(node.l); visit(node.r) }
  visit(id)
  const points = ids.map(current => layout.value.positions[current]).filter(point => point !== undefined)
  if (!points.length) return
  camera.safeBottom.value = safeBottom
  camera.fitBounds({ minX: Math.min(...points.map(point => point.x)) - 20, maxX: Math.max(...points.map(point => point.x)) + 20, minY: Math.min(...points.map(point => point.y)) - 20, maxY: Math.max(...points.map(point => point.y)) + 20 }, layout.value.positions[id])
}
function clearFocus() { camera.safeBottom.value = 0 }
function empty(event: MouseEvent) { if (!(event.target as Element).closest('[data-node]') && !camera.moved()) emit('empty') }
onBeforeUnmount(() => { for (const group of controls.values()) for (const control of group) control.stop() })
defineExpose({ fit, focus, focusSubtree, clearFocus })
</script>

<template>
  <section ref="container" class="tree-canvas" @pointerdown="camera.down" @pointermove="camera.drag" @pointerup="camera.up" @pointercancel="camera.up" @wheel="camera.wheel">
    <svg class="tree-svg" role="img" :aria-label="a11yLabel" @click="empty">
      <g v-if="showLevels" class="level-guides"><g v-for="level in Math.max(0, height + 1)" :key="level"><line x1="0" :y1="camera.y.get() + (level - 1) * 68 * camera.scale.get()" :x2="camera.width.value" :y2="camera.y.get() + (level - 1) * 68 * camera.scale.get()" stroke="var(--border)" stroke-dasharray="3 5" /><text x="12" :y="camera.y.get() + (level - 1) * 68 * camera.scale.get() - 6" fill="var(--muted)" font-size="10">nível {{ level - 1 }}</text></g></g>
      <motion.g :style="{ transform: camera.transform, originX: 0, originY: 0, transformOrigin: '0px 0px', transformBox: 'view-box' }">
        <LabRotationGuide v-if="step?.kind === 'rotate-pre' && step.meta?.rotation && positions[step.meta.rotation.pivot] && positions[step.meta.rotation.child]" :pivot="positions[step.meta.rotation.pivot]!" :child="positions[step.meta.rotation.child]!" :direction="step.meta.rotation.dir" :reduced="reduced" />
        <motion.g v-if="step?.kind === 'rotate-pre' && step.meta?.rotation?.movedSubtree && positions[step.meta.rotation.movedSubtree]" :style="{ x: positions[step.meta.rotation.movedSubtree]!.x, y: positions[step.meta.rotation.movedSubtree]!.y }"><rect x="-28" y="-28" width="56" height="56" rx="12" fill="none" stroke="var(--rotation)" stroke-width="1.5" stroke-dasharray="4 4" /><text y="-34" text-anchor="middle" fill="var(--rotation)" font-size="9">troca de pai</text></motion.g>
        <AnimatePresence :initial="false"><LabTreeEdge v-for="edge in edges" :key="`${edge.from}:${edge.to}`" :from="positions[edge.from]!" :to="positions[edge.to]!" :highlighted="highlighted(edge.from, edge.to)" :rotation="step?.kind === 'rotate-pre'" :diagnosis="step?.kind === 'imbalance' || step?.kind === 'case'" :draw="step?.kind === 'compare' && highlighted(edge.from, edge.to)" :seeking="seeking" :reduced="reduced" :speed="speed" /></AnimatePresence>
        <g v-for="nil in layout.nils" :key="nil.id"><line :x1="layout.positions[nil.parent]?.x" :y1="(layout.positions[nil.parent]?.y ?? 0) + 20" :x2="nil.x" :y2="nil.y" stroke="var(--border-strong)" vector-effect="non-scaling-stroke" /><rect :x="nil.x - 5" :y="nil.y - 5" width="10" height="10" fill="#15161B" :stroke="step?.meta?.extraBlack?.parent === nil.parent && step.meta.extraBlack.side === nil.side ? 'var(--rotation)' : '#8B90A0'" /><text v-if="step?.meta?.extraBlack?.parent === nil.parent && step.meta.extraBlack.side === nil.side" :x="nil.x + 10" :y="nil.y + 4" fill="var(--rotation)" font-size="10">+1</text></g>
        <AnimatePresence :initial="false"><LabTreeNode v-for="{ id, node } in nodes" :id="id" :key="id" :node="node" :position="positions[id]!" :type="type" :role="step?.hl[id]" :root="id === tree.rootId" :selected="selectedPath.includes(id)" :seeking="seeking" :reduced="reduced" :balance="balance(id)" :show-height="showHeights" :show-letters="showLetters" :order="step?.meta?.order?.indexOf(node.key) === undefined ? undefined : step.meta.order.indexOf(node.key) + 1" :speed="speed" @select="emit('select', $event)" /></AnimatePresence>
      </motion.g>
    </svg>
    <button class="metrics" aria-label="Abrir legenda e métricas" @pointerdown.stop @click="emit('details')"><span>n <b>{{ nodes.length }}</b></span><span>h <b>{{ height }}</b></span><span v-if="type === 'avl'">|FB|máx <b>{{ maxBalance }}</b></span><span v-if="type === 'rb'">bh <b>{{ blackHeight }}</b></span></button>
    <div v-if="!nodes.length" class="empty-tree"><svg viewBox="0 0 180 90" aria-hidden="true"><path d="M90 25L45 70M90 25L135 70" /><circle cx="90" cy="25" r="18" /><circle cx="45" cy="70" r="15" /><circle cx="135" cy="70" r="15" /></svg><h2>Uma árvore, passo a passo.</h2><p>Insira um valor ou comece por um exemplo.</p><div><button @click="emit('preset', 'ordered')">1 → 7 em ordem</button><button @click="emit('preset', 'balanced')">Balanceada</button><button @click="emit('preset', 'random')">Aleatória</button></div></div>
    <div class="camera-actions" @pointerdown.stop><UiIconButton icon="lucide:plus" label="Aumentar diagrama" @click="camera.zoom(1.2)" /><UiIconButton icon="lucide:minus" label="Diminuir diagrama" @click="camera.zoom(1 / 1.2)" /><UiIconButton icon="lucide:scan" label="Ajustar árvore à tela" @click="fit" /><UiIconButton icon="lucide:focus" :label="camera.following.value ? 'Seguir ligado' : 'Ativar seguir'" :class="{ following: camera.following.value }" @click="camera.following.value = true; fit()" /></div>
    <button class="canvas-details" @pointerdown.stop @click="emit('details')"><Icon name="lucide:panel-bottom" />Detalhes</button>
  </section>
</template>

<style scoped>
.tree-canvas { position: relative; width: 100%; height: 100%; min-height: 280px; overflow: hidden; touch-action: none; user-select: none; -webkit-touch-callout: none; background-image: radial-gradient(var(--border) .65px, transparent .65px); background-size: 20px 20px; }
.tree-svg { width: 100%; height: 100%; display: block; }
.metrics { position: absolute; left: 16px; top: 12px; min-height: 48px; display: flex; align-items: center; gap: 12px; color: var(--muted); font: 12px 'JetBrains Mono', monospace; background: var(--bg); border: 1px solid var(--border); border-radius: 10px; padding: 0 10px; }
.metrics b { color: var(--text); font-weight: 500; }
.camera-actions { position: absolute; bottom: 18px; right: 16px; display: flex; flex-direction: column; gap: 8px; }
.camera-actions :deep(button) { background: var(--surface-1); border: 1px solid var(--border); }
.camera-actions :deep(.following) { color: var(--accent); border-color: var(--accent); }
.canvas-details { position: absolute; bottom: 18px; left: 16px; display: flex; align-items: center; gap: 8px; min-height: 48px; padding: 0 12px; border: 1px solid var(--border); border-radius: 10px; background: var(--surface-1); font-size: 13px; }
.empty-tree { position: absolute; inset: 75px 75px 70px 24px; display: flex; flex-direction: column; justify-content: center; align-items: center; text-align: center; pointer-events: none; }
.empty-tree svg { width: 150px; height: 85px; fill: transparent; stroke: var(--border-strong); stroke-width: 1.5; stroke-dasharray: 4 5; }
.empty-tree h2 { font-size: 18px; margin-top: 14px; }.empty-tree p { margin: 6px 0 14px; color: var(--muted); font-size: 13px; }
.empty-tree > div { display: flex; flex-wrap: wrap; gap: 8px; justify-content: center; pointer-events: auto; }.empty-tree button { padding: 0 12px; min-height: 48px; border: 1px solid var(--border); border-radius: 999px; background: var(--surface-1); font-size: 12px; }
</style>

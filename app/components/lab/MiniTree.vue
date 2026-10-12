<script setup lang="ts">
import { encodeOps, getMessage, layoutTree, runSequence } from '../../engine'
import type { Op, Snapshot, TreeType } from '../../engine/types'
const props = withDefaults(defineProps<{ tree?: Snapshot; ops?: Op[]; type?: TreeType; label?: string; height?: number; interactive?: boolean }>(), { tree: undefined, ops: undefined, type: 'avl', label: 'Exemplo de árvore', height: 180, interactive: false })
const index = ref(-1)
const playing = ref(false)
let timer: ReturnType<typeof setTimeout> | undefined
const result = computed(() => runSequence(props.type, props.ops ?? []))
const snapshot = computed(() => props.tree ?? (index.value >= 0 ? result.value.steps[index.value]?.tree : result.value.final) ?? result.value.final)
const layout = computed(() => layoutTree(snapshot.value))
const viewBox = computed(() => `${layout.value.bounds.minX - 34} ${layout.value.bounds.minY - 34} ${Math.max(90, layout.value.bounds.maxX - layout.value.bounds.minX + 68)} ${Math.max(90, layout.value.bounds.maxY - layout.value.bounds.minY + 68)}`)
const link = computed(() => `/lab?t=${props.type}&q=${encodeOps(props.ops ?? [])}`)
const narration = computed(() => index.value >= 0 && result.value.steps[index.value] ? getMessage(result.value.steps[index.value]!.msg) : 'Resultado da sequência. Volte um passo ou reproduza desde o início.')
const description = computed(() => `${props.label}. ${Object.keys(snapshot.value.nodes).length} nós. Altura ${snapshot.value.rootId === null ? -1 : snapshot.value.nodes[snapshot.value.rootId]!.h}.`)
function pause() { playing.value = false; if (timer) clearTimeout(timer) }
function move(delta: number) { pause(); index.value = Math.max(0, Math.min(result.value.steps.length - 1, index.value < 0 ? delta > 0 ? 0 : result.value.steps.length - 1 : index.value + delta)) }
function schedule() {
  const dwell = Math.max(600, Math.min(1800, 350 + narration.value.length * 18))
  timer = setTimeout(() => {
    if (!playing.value) return
    if (index.value >= result.value.steps.length - 1) { pause(); return }
    index.value++; schedule()
  }, dwell)
}
function play() {
  if (playing.value) { pause(); return }
  if (index.value < 0 || index.value >= result.value.steps.length - 1) index.value = 0
  playing.value = true; schedule()
}
function visibility() { if (document.hidden) pause() }
onMounted(() => document.addEventListener('visibilitychange', visibility))
onBeforeUnmount(() => { pause(); document.removeEventListener('visibilitychange', visibility) })
watch(() => props.ops, () => { pause(); index.value = -1 })
</script>
<template>
  <div class="mini-tree"><svg :viewBox="viewBox" :style="{ height: `${height}px` }" role="img" :aria-label="description"><g v-for="(node, id) in snapshot.nodes" :key="`e:${id}`"><line v-for="child in [node.l, node.r].filter((value): value is number => value !== null)" :key="child" :x1="layout.positions[Number(id)]?.x" :y1="layout.positions[Number(id)]?.y" :x2="layout.positions[child]?.x" :y2="layout.positions[child]?.y" stroke="var(--border-strong)" stroke-width="2" vector-effect="non-scaling-stroke" /></g><g v-for="(node, id) in snapshot.nodes" :key="id" :transform="`translate(${layout.positions[Number(id)]?.x ?? 0} ${layout.positions[Number(id)]?.y ?? 0})`"><circle r="20" :fill="type === 'rb' ? node.c === 'R' ? '#C62F3A' : '#15161B' : 'var(--surface-3)'" :stroke="type === 'rb' ? '#8B90A0' : 'var(--border-strong)'" stroke-width="1.5" /><text y="5" text-anchor="middle" :fill="type === 'rb' ? '#FFFFFF' : 'var(--text)'" font-size="15" font-family="JetBrains Mono, monospace">{{ node.key }}</text></g><text v-if="snapshot.rootId === null" x="0" y="0" text-anchor="middle" fill="var(--muted)" font-size="12">Árvore vazia</text></svg><div v-if="interactive && ops?.length" class="mini-controls"><UiIconButton icon="chevron-left" label="Passo anterior" @click="move(-1)" /><UiIconButton :icon="playing ? 'pause' : 'play'" :label="playing ? 'Pausar exemplo' : 'Reproduzir exemplo'" @click="play" /><UiIconButton icon="chevron-right" label="Próximo passo" @click="move(1)" /><span>{{ index < 0 ? 'Resultado' : `Passo ${index + 1}` }}</span><NuxtLink :to="link">Abrir no laboratório<Icon name="lucide:arrow-up-right" /></NuxtLink></div><p v-if="interactive && ops?.length" class="mini-narration" :aria-live="playing ? 'off' : 'polite'">{{ narration }}</p></div>
</template>
<style scoped>.mini-tree { width: 100%; overflow: hidden; }.mini-tree svg { width: 100%; display: block; }.mini-controls { padding: 0 12px 8px; display: grid; grid-template-columns: repeat(3,48px) minmax(0,1fr); gap: 8px; align-items: center; font-size: 12px; color: var(--muted); }.mini-controls > span { text-align: right; padding-right: 4px; }.mini-controls a { grid-column: 1 / -1; display: flex; justify-content: center; align-items: center; gap: 6px; padding: 8px; margin-left: 0; min-height: 48px; border-top: 1px solid var(--border); color: var(--accent); }.mini-narration { padding: 0 16px 8px; min-height: 48px; font-size: 13px; line-height: 1.5; color: var(--muted); }</style>

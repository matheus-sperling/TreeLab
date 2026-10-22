<script setup lang="ts">
import { decodeOps, encodeOps, height, runSequence } from '~/engine'
import { countTreeShapes, isShapeSeed, normalizeShapeSeed, shapeSequence } from '~/engine/shapes'
import type { Cost, Op, Snapshot, TreeType } from '~/engine/types'
const route = useRoute(), lab = useLabStore()
const types: { type: TreeType; label: string; icon: string; note: string }[] = [
  { type: 'bst', label: 'ABB', icon: 'git-branch', note: 'Sem garantia de altura' },
  { type: 'avl', label: 'AVL', icon: 'scale', note: 'Equilíbrio por altura' },
  { type: 'rb', label: 'Rubro-Negra', icon: 'circle-dot', note: 'Equilíbrio por cor' },
]
const empty: Snapshot = { rootId: null, nodes: {} }
const sequence = ref<Op[]>(Array.from({ length: 15 }, (_, i) => ({ t: 'i', k: i + 1 })))
const preferenceStore = useSettingsStore()
const settings = preferenceStore.settings
let hydrated = false, syncingControls = false
const seed = ref(settings.randomSeed)
const count = ref(sequence.value.length)
const validCount = computed(() => Number.isInteger(count.value) && count.value >= 1 && count.value <= 63)
const shapeCount = computed(() => validCount.value ? countTreeShapes('bst', count.value) : 0n)
const maxSeed = computed(() => (shapeCount.value > 0n ? shapeCount.value - 1n : 0n).toString())
const validSeed = computed(() => validCount.value && isShapeSeed('bst', count.value, seed.value))
const seedHint = computed(() => !validCount.value ? 'Escolha entre 1 e 63 nós.'
  : !validSeed.value ? `Use uma semente inteira de 0 a ${maxSeed.value}.`
    : `ABB: ${shapeCount.value.toLocaleString('pt-BR')} ${shapeCount.value === 1n ? 'formato possível' : 'formatos possíveis'}. Sementes de 0 a ${maxSeed.value}. A mesma ordem é aplicada às três árvores.`)
const cursor = ref(sequence.value.length), experiment = ref('Sua sequência'), notice = ref('')
const results = computed(() => types.map(item => ({ ...item, result: runSequence(item.type, sequence.value) })))
const cards = computed(() => results.value.map(item => {
  const end = item.result.opRanges[cursor.value - 1]?.[1]
  const tree = end === undefined ? empty : item.result.steps[end]!.tree
  const cost = item.result.cost.slice(0, cursor.value).reduce<Cost>((sum, value) => ({ comparisons: sum.comparisons + value.comparisons, rotations: sum.rotations + value.rotations, recolorings: sum.recolorings + value.recolorings, heightUpdates: sum.heightUpdates + value.heightUpdates, visits: sum.visits + value.visits }), { comparisons: 0, rotations: 0, recolorings: 0, heightUpdates: 0, visits: 0 })
  return { ...item, tree, cost, height: height(tree, tree.rootId), count: Object.keys(tree.nodes).length, link: { path: '/lab', query: { t: item.type, q: encodeOps(sequence.value), c: '0' } } }
}))
watch([count, seed], ([currentCount], [previousCount]) => {
  if (!hydrated || syncingControls || !preferenceStore.ready || !validCount.value) return
  if (currentCount !== previousCount && (/^\d+$/.test(seed.value) || shapeCount.value === 1n)) {
    const normalized = normalizeShapeSeed('bst', count.value, seed.value)
    if (normalized !== seed.value) { seed.value = normalized; return }
  }
  if (validSeed.value) applyExperiment('random')
}, { flush: 'sync' })
watch(() => preferenceStore.ready, ready => { if (ready) restoreSeed() }, { flush: 'sync' })
function restoreSeed() {
  syncingControls = true
  seed.value = normalizeShapeSeed('bst', count.value, settings.randomSeed)
  settings.randomSeed = seed.value
  syncingControls = false
}
const chartMax = computed(() => Math.max(1, ...cards.value.map(card => card.height)))
const chartLabel = computed(() => `Altura depois de ${cursor.value} operações: ${cards.value.map(card => `${card.label}, ${card.height}`).join('; ')}.`)
const summary = computed(() => {
  const bst = cards.value[0]!
  return bst.count > 1 && bst.height === bst.count - 1 ? `A ABB vira lista: h = n−1 = ${bst.height}. AVL e RN mantêm altura logarítmica.` : 'A altura determina o tamanho dos caminhos. Compare o trabalho de cada estrutura para a mesma entrada.'
})
function operationLabel(op: Op): string {
  if (op.t === 'i') return `+${op.k}`
  if (op.t === 'd') return `−${op.k}`
  if (op.t === 's') return `?${op.k}`
  if (op.t === 'walk') return ({ in: 'in-ordem', pre: 'pré-ordem', post: 'pós-ordem', level: 'nível' })[op.order]
  return op.t === 'min' ? 'mínimo' : op.t === 'max' ? 'máximo' : `${op.t === 'succ' ? 'sucessor' : 'predecessor'} ${op.k}`
}
function applyExperiment(kind: 'ordered' | 'random' | 'zigzag') {
  if (!validCount.value || (kind === 'random' && !validSeed.value)) return
  const size = count.value
  const values = Array.from({ length: size }, (_, i) => i + 1)
  if (kind === 'random') settings.randomSeed = seed.value
  const keys = kind === 'zigzag' ? values.map((_, i) => i % 2 ? size - Math.floor(i / 2) : 1 + Math.floor(i / 2)) : values
  sequence.value = kind === 'random' ? shapeSequence('bst', size, seed.value) : keys.map(k => ({ t: 'i', k }))
  cursor.value = sequence.value.length
  experiment.value = kind === 'ordered' ? `1 a ${size} em ordem` : kind === 'random' ? `Formato de ABB · semente ${seed.value}` : 'Zigue-zague'
}
onMounted(() => {
  try {
    const query = typeof route.query.q === 'string' ? decodeOps(route.query.q) : lab.operations
    if (query.length) { sequence.value = [...query]; cursor.value = query.length }
  }
  catch { notice.value = 'O link continha uma sequência inválida. Mostramos o exemplo em ordem.' }
  count.value = Math.max(1, Math.min(63, sequence.value.filter(op => op.t === 'i').length))
  restoreSeed()
  hydrated = true
})
useSeoMeta({ title: 'Comparar — TreeLab', description: 'Uma sequência, três árvores. Compare altura, comparações, rotações e recolorações em ABB, AVL e Rubro-Negra.' })
</script>
<template>
  <div class="page-shell compare-page">
    <header class="page-header"><span class="eyebrow">A MESMA ENTRADA</span><h1>Três caminhos.<br> Um experimento.</h1><p class="muted">Avance por operação. Observe como cada árvore responde à mesma sequência.</p></header>
    <p v-if="notice" class="compare-notice" role="status">{{ notice }}</p>
    <div class="comparison-controls">
    <section class="experiments" aria-label="Experimentos"><div class="experiment-heading"><h2>Experimentos</h2><label class="seed-control">Semente<input v-model="seed" type="text" inputmode="numeric" pattern="[0-9]*" :disabled="shapeCount === 1n" :aria-invalid="!validSeed" aria-describedby="compare-seed-hint" aria-label="Semente do formato de ABB"></label></div><label class="count-control muted">Quantidade de valores<input v-model.number="count" type="number" min="1" max="63" :aria-invalid="!validCount" aria-describedby="compare-seed-hint" aria-label="Quantidade de valores da comparação"></label><p id="compare-seed-hint" class="seed-hint muted" :class="{ invalid: !validCount || !validSeed }">{{ seedHint }}</p><div class="experiment-options"><UiButton :disabled="!validCount" @click="applyExperiment('ordered')">Crescente</UiButton><UiButton :disabled="!validCount || !validSeed" @click="applyExperiment('random')"><Icon name="lucide:shuffle" />Por semente</UiButton><UiButton :disabled="!validCount" @click="applyExperiment('zigzag')">Zigue-zague</UiButton></div><p class="muted experiment-name">{{ experiment }}</p></section>
    <section class="comparison-timeline" aria-label="Linha do tempo por operação"><div class="timeline-heading"><span class="mono muted">Operação {{ cursor }} de {{ sequence.length }}</span><span v-if="cursor" class="mono accent">{{ operationLabel(sequence[cursor - 1]!) }}</span><span v-else class="muted">Árvores vazias</span></div><div class="comparison-scrubber"><UiIconButton icon="chevron-left" label="Operação anterior" :disabled="cursor === 0" @click="cursor--" /><UiSlider v-model="cursor" :max="sequence.length" label="Número de operações concluídas" /><UiIconButton icon="chevron-right" label="Próxima operação" :disabled="cursor === sequence.length" @click="cursor++" /></div><div class="compare-operation-chips"><button v-for="(op, i) in sequence" :key="i" type="button" :class="{ active: i + 1 === cursor, future: i + 1 > cursor }" :aria-label="`Ir ao fim da operação ${i + 1}: ${operationLabel(op)}`" @click="cursor = i + 1">{{ operationLabel(op) }}</button></div></section>
    </div>
    <div class="comparison-cards"><NuxtLink v-for="card in cards" :key="card.type" :to="card.link" class="comparison-card" :aria-label="`Abrir ${card.label} no laboratório com esta sequência`"><div class="comparison-card-heading"><Icon :name="`lucide:${card.icon}`" size="24" /><div><h2>{{ card.label }}</h2><p class="muted">{{ card.note }}</p></div><span class="height-stat mono"><strong>{{ card.height }}</strong><small class="muted">altura</small></span><Icon name="lucide:arrow-up-right" size="20" class="muted" /></div><LabMiniTree :type="card.type" :tree="card.tree" :height="145" :label="`${card.label}: ${card.count} nós e altura ${card.height}`" /><div class="comparison-metrics"><span><strong class="mono">{{ card.count }}</strong> nós</span><span><strong class="mono">{{ card.cost.comparisons }}</strong> comparações</span><span><strong class="mono">{{ card.cost.rotations }}</strong> rotações</span><span><strong class="mono">{{ card.cost.recolorings }}</strong> recolorações</span></div><span class="comparison-open">Explorar no laboratório<Icon name="lucide:arrow-up-right" /></span></NuxtLink></div>
    <section class="height-comparison"><span class="eyebrow">ALTURA, EM ARESTAS</span><h2>O formato muda o custo.</h2><svg viewBox="0 0 340 180" role="img" :aria-label="chartLabel"><title>{{ chartLabel }}</title><line x1="30" y1="140" x2="320" y2="140" stroke="var(--border-strong)" /><g v-for="(card, i) in cards" :key="card.type"><rect :x="55 + i * 100" :y="140 - Math.max(0, card.height) / chartMax * 105" width="44" :height="Math.max(0, card.height) / chartMax * 105" rx="3" :fill="i === 0 ? 'var(--muted)' : 'var(--accent)'" :opacity="i === 2 ? .65 : 1" /><text :x="77 + i * 100" :y="128 - Math.max(0, card.height) / chartMax * 105" text-anchor="middle" fill="var(--text)" font-size="14">{{ card.height }}</text><text :x="77 + i * 100" y="164" text-anchor="middle" fill="var(--muted)" font-size="12">{{ card.type === 'rb' ? 'RN' : card.label }}</text></g></svg><p class="muted">{{ summary }}</p><NuxtLink to="/lab?conceito=altura" class="comparison-learn">Explorar no laboratório <Icon name="lucide:arrow-right" /></NuxtLink></section>
  </div>
</template>
<style scoped>
.seed-hint { font-size:12px; margin:8px 0; overflow-wrap:anywhere; }.seed-hint.invalid { color:var(--danger, #d6586c); }.seed-control input:disabled { opacity:.7; }.count-control { display:flex; justify-content:space-between; align-items:center; gap:16px; font-size:12px; margin-top:12px; }.count-control input { width:82px; min-height:44px; border:1px solid var(--border); border-radius:10px; padding:8px; color:var(--text); background:var(--surface-1); }
.compare-page { max-width:800px; }
.compare-notice { font-size:.82rem; line-height:1.6; padding:16px; background:var(--surface-2); border-left:3px solid var(--compare); margin-bottom:20px; }
.experiment-heading { display:flex; align-items:center; justify-content:space-between; gap:16px; }
.seed-control { display:flex; align-items:center; gap:8px; color:var(--muted); font-size:.7rem; }
.seed-control input { color:var(--text); background:var(--surface-1); border:1px solid var(--border-strong); width:82px; height:48px; border-radius:12px; padding:8px; font-family:'JetBrains Mono',monospace; font-size:.8rem; }
.experiment-options { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:8px; margin:12px 0; }
.experiment-options .ui-button { padding:10px 8px; font-size:.78rem; }
.experiment-name { font-size:.72rem; }
.comparison-timeline { margin:24px 0; padding:16px 0; border-top:1px solid var(--border); border-bottom:1px solid var(--border); }
.timeline-heading { display:flex; align-items:center; justify-content:space-between; gap:12px; font-size:.72rem; }
.comparison-scrubber { display:flex; gap:8px; align-items:center; margin-top:4px; }
.comparison-scrubber :deep(.slider-thumb) { width:48px; height:48px; }
.compare-operation-chips { display:flex; gap:8px; overflow-x:auto; scrollbar-width:none; padding:8px 0 0; }
.compare-operation-chips button { border:1px solid var(--border); border-radius:999px; min-width:48px; min-height:48px; padding:8px; font-family:'JetBrains Mono',monospace; font-size:.72rem; background:var(--surface-2); color:var(--text); white-space:nowrap; }
.compare-operation-chips button.active { border-color:var(--accent); color:var(--accent); }
.compare-operation-chips button.future { color:var(--muted); }
.comparison-cards { display:grid; gap:16px; }
.comparison-controls { display:contents; }.comparison-open { display:none; }
.comparison-card { display:block; padding:16px; border:1px solid var(--border); border-radius:12px; background:var(--surface-1); }
.comparison-card :deep(.mini-tree) { margin-block:8px; }
.comparison-card-heading { display:flex; align-items:center; gap:12px; }
.comparison-card-heading>div { flex:1; }
.comparison-card-heading h2 { font-size:1rem; }
.comparison-card-heading p { font-size:.68rem; margin-top:4px; }
.height-stat { display:flex; flex-direction:column; align-items:center; gap:2px; }
.height-stat strong { font-size:1.25rem; font-weight:600; }
.height-stat small { font-family:'Inter Variable',system-ui,sans-serif; font-size:.6rem; }
.comparison-metrics { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:8px 12px; font-size:.7rem; color:var(--muted); border-top:1px solid var(--border); padding-top:12px; }
.comparison-metrics strong { color:var(--text); font-weight:500; }
.height-comparison { margin-top:32px; }
.height-comparison h2 { margin-top:10px; }
.height-comparison svg { display:block; width:100%; max-height:240px; margin:16px 0; font-family:'JetBrains Mono',monospace; }
.height-comparison p { font-size:.85rem; line-height:1.7; }
.comparison-learn { display:flex; align-items:center; gap:8px; color:var(--accent); font-size:.85rem; min-height:48px; margin-top:8px; }
@media(min-width:768px) { .comparison-metrics { grid-template-columns:repeat(4,minmax(0,1fr)); }.comparison-card { padding:20px; }.comparison-card-heading h2 { font-size:1.15rem; }.experiment-options .ui-button { font-size:.85rem; } }
@media(min-width:1024px) {
  .compare-page { max-width:1440px; }
  .page-header { display:grid; grid-template-columns:minmax(0,1.3fr) minmax(280px,.8fr); column-gap:40px; margin-bottom:28px; }.page-header>.eyebrow { grid-column:1; }.page-header h1 { grid-column:1; margin:12px 0 0; letter-spacing:-.05em; }.page-header h1 br { display:none; }.page-header p { grid-column:2; grid-row:1/3; max-width:480px; align-self:end; }
  .comparison-controls { display:grid; grid-template-columns:minmax(360px,.9fr) minmax(0,1.4fr); gap:20px; align-items:stretch; margin-bottom:24px; }
  .experiments,.comparison-timeline { min-width:0; padding:20px; margin:0; border:1px solid var(--border); border-radius:14px; background:var(--surface-1); }
  .experiments { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:10px 20px; padding:16px 20px; }
  .experiment-heading { display:contents; }.experiment-heading h2 { grid-column:1/3; grid-row:1; font-size:1rem; }
  .seed-control { grid-column:1; grid-row:2; justify-content:space-between; }.seed-control input { height:40px; border-radius:9px; }.count-control { grid-column:2; grid-row:2; margin:0; gap:8px; font-size:11px; }.count-control input { min-height:40px; width:64px; flex-shrink:0; background:var(--surface-2); }
  .experiment-options { grid-column:1/3; grid-row:3; margin:0; }.experiment-options .ui-button { min-height:42px; }.seed-hint { grid-column:1; grid-row:4; margin:0; font-size:11px; line-height:1.5; }.experiment-name { grid-column:2; grid-row:4; text-align:right; line-height:1.5; align-self:center; }
  .comparison-timeline { display:flex; flex-direction:column; justify-content:center; gap:8px; }
  .timeline-heading { font-size:.8rem; }.comparison-scrubber { margin-top:4px; gap:12px; }
  .compare-operation-chips { padding-top:8px; padding-bottom:4px; scrollbar-width:thin; scrollbar-color:var(--border-strong) transparent; }
  .compare-operation-chips button { min-width:40px; min-height:40px; border-radius:10px; font-size:.75rem; }
  .comparison-cards { grid-template-columns:repeat(3,minmax(0,1fr)); gap:20px; }
  .comparison-card { min-width:0; padding:20px; border-radius:14px; }
  .comparison-card-heading { gap:10px; align-items:flex-start; }.comparison-card-heading>div { min-width:0; }.comparison-card-heading>div p { line-height:1.5; min-height:30px; }.comparison-card-heading>.iconify:first-child { width:20px; height:20px; flex-shrink:0; margin-top:2px; }.comparison-card-heading>.iconify:last-child { display:none; }
  .comparison-card-heading h2 { font-size:1.05rem; }.height-stat strong { font-size:1.5rem; }
  .comparison-card :deep(.mini-tree) { margin:10px 0 12px; }.comparison-card :deep(.mini-tree svg) { height:190px!important; }
  .comparison-metrics { grid-template-columns:repeat(2,minmax(0,1fr)); gap:12px 8px; padding-top:16px; font-size:.72rem; }
  .comparison-open { display:flex; justify-content:space-between; align-items:center; gap:8px; margin-top:16px; min-height:40px; padding-top:12px; border-top:1px solid var(--border); color:var(--accent); font-size:.75rem; }
  .height-comparison { display:grid; grid-template-columns:minmax(0,1fr) minmax(360px,.85fr); column-gap:48px; align-content:center; margin-top:24px; padding:24px 28px; border:1px solid var(--border); border-radius:14px; background:var(--surface-1); }
  .height-comparison>.eyebrow { grid-column:1; margin-top:8px; }.height-comparison h2 { grid-column:1; margin-top:12px; font-size:1.3rem; }.height-comparison p { grid-column:1; margin-top:12px; max-width:640px; }.comparison-learn { grid-column:1; margin-top:8px; }
  .height-comparison svg { grid-column:2; grid-row:1/5; width:100%; max-height:200px; margin:0; align-self:center; }
}
@media(min-width:1024px) and (max-height:800px) { .compare-page { padding-top:24px; }.page-header { margin-bottom:20px; }.page-header h1 { font-size:2rem; }.comparison-card :deep(.mini-tree svg) { height:160px!important; }.comparison-card { padding:16px; } }
</style>

<script setup lang="ts">
import { decodeOps, encodeOps, height, runSequence } from '~/engine'
import { seededRandom } from '~/engine/training'
import type { Cost, Op, Snapshot, TreeType } from '~/engine/types'
const route = useRoute(), lab = useLabStore()
const types: { type: TreeType; label: string; icon: string; note: string }[] = [
  { type: 'bst', label: 'ABB', icon: 'git-branch', note: 'Sem garantia de altura' },
  { type: 'avl', label: 'AVL', icon: 'scale', note: 'Equilíbrio por altura' },
  { type: 'rb', label: 'Rubro-Negra', icon: 'circle-dot', note: 'Equilíbrio por cor' },
]
const empty: Snapshot = { rootId: null, nodes: {} }
const sequence = ref<Op[]>(Array.from({ length: 15 }, (_, i) => ({ t: 'i', k: i + 1 })))
const cursor = ref(sequence.value.length), seed = ref(42), experiment = ref('Sua sequência'), notice = ref('')
const results = computed(() => types.map(item => ({ ...item, result: runSequence(item.type, sequence.value) })))
const cards = computed(() => results.value.map(item => {
  const end = item.result.opRanges[cursor.value - 1]?.[1]
  const tree = end === undefined ? empty : item.result.steps[end]!.tree
  const cost = item.result.cost.slice(0, cursor.value).reduce<Cost>((sum, value) => ({ comparisons: sum.comparisons + value.comparisons, rotations: sum.rotations + value.rotations, recolorings: sum.recolorings + value.recolorings, heightUpdates: sum.heightUpdates + value.heightUpdates, visits: sum.visits + value.visits }), { comparisons: 0, rotations: 0, recolorings: 0, heightUpdates: 0, visits: 0 })
  return { ...item, tree, cost, height: height(tree, tree.rootId), count: Object.keys(tree.nodes).length, link: { path: '/lab', query: { t: item.type, q: encodeOps(sequence.value), c: '0' } } }
}))
watch(seed, () => { if (Number.isInteger(seed.value) && seed.value >= 0) applyExperiment('random') })
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
  const values = Array.from({ length: 31 }, (_, i) => i + 1)
  if (kind === 'random') {
    const random = seededRandom(Number.isFinite(seed.value) ? seed.value : 42)
    for (let i = values.length - 1; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [values[i], values[j]] = [values[j]!, values[i]!] }
  }
  const keys = kind === 'zigzag' ? values.map((_, i) => i % 2 ? 31 - Math.floor(i / 2) : 1 + Math.floor(i / 2)) : values
  sequence.value = keys.map(k => ({ t: 'i', k })); cursor.value = keys.length
  experiment.value = kind === 'ordered' ? '1 a 31 em ordem' : kind === 'random' ? `Aleatória · semente ${seed.value}` : 'Zigue-zague'
}
onMounted(() => {
  try {
    const query = typeof route.query.q === 'string' ? decodeOps(route.query.q) : lab.operations
    if (query.length) { sequence.value = [...query]; cursor.value = query.length }
  }
  catch { notice.value = 'O link continha uma sequência inválida. Mostramos o exemplo em ordem.' }
})
useSeoMeta({ title: 'Comparar — TreeLab', description: 'Uma sequência, três árvores. Compare altura, comparações, rotações e recolorações em ABB, AVL e Rubro-Negra.' })
</script>
<template>
  <div class="page-shell compare-page">
    <header class="page-header"><span class="eyebrow">A MESMA ENTRADA</span><h1>Três caminhos.<br>Um experimento.</h1><p class="muted">Mude o tempo por operação. Veja como cada árvore responde à mesma sequência.</p></header>
    <p v-if="notice" class="compare-notice" role="status">{{ notice }}</p>
    <section class="experiments" aria-label="Experimentos"><div class="experiment-heading"><h2>Experimentos</h2><label class="seed-control">Semente<input v-model.number="seed" type="number" min="1" max="999999" inputmode="numeric" aria-label="Semente da sequência aleatória"></label></div><div class="experiment-options"><UiButton @click="applyExperiment('ordered')">1 a 31</UiButton><UiButton @click="applyExperiment('random')"><Icon name="lucide:shuffle" />Aleatória</UiButton><UiButton @click="applyExperiment('zigzag')">Zigue-zague</UiButton></div><p class="muted experiment-name">{{ experiment }}</p></section>
    <section class="comparison-timeline" aria-label="Linha do tempo por operação"><div class="timeline-heading"><span class="mono muted">Operação {{ cursor }} de {{ sequence.length }}</span><span v-if="cursor" class="mono accent">{{ operationLabel(sequence[cursor - 1]!) }}</span><span v-else class="muted">Árvores vazias</span></div><div class="comparison-scrubber"><UiIconButton icon="chevron-left" label="Operação anterior" :disabled="cursor === 0" @click="cursor--" /><UiSlider v-model="cursor" :max="sequence.length" label="Número de operações concluídas" /><UiIconButton icon="chevron-right" label="Próxima operação" :disabled="cursor === sequence.length" @click="cursor++" /></div><div class="compare-operation-chips"><button v-for="(op, i) in sequence" :key="i" type="button" :class="{ active: i + 1 === cursor, future: i + 1 > cursor }" :aria-label="`Ir ao fim da operação ${i + 1}: ${operationLabel(op)}`" @click="cursor = i + 1">{{ operationLabel(op) }}</button></div></section>
    <div class="comparison-cards"><NuxtLink v-for="card in cards" :key="card.type" :to="card.link" class="comparison-card" :aria-label="`Abrir ${card.label} no laboratório com esta sequência`"><div class="comparison-card-heading"><Icon :name="`lucide:${card.icon}`" size="24" /><div><h2>{{ card.label }}</h2><p class="muted">{{ card.note }}</p></div><span class="height-stat mono"><strong>{{ card.height }}</strong><small class="muted">altura</small></span><Icon name="lucide:arrow-up-right" size="20" class="muted" /></div><LabMiniTree :type="card.type" :tree="card.tree" :height="145" :label="`${card.label}: ${card.count} nós e altura ${card.height}`" /><div class="comparison-metrics"><span><strong class="mono">{{ card.count }}</strong> nós</span><span><strong class="mono">{{ card.cost.comparisons }}</strong> comparações</span><span><strong class="mono">{{ card.cost.rotations }}</strong> rotações</span><span><strong class="mono">{{ card.cost.recolorings }}</strong> recolorações</span></div></NuxtLink></div>
    <section class="height-comparison"><span class="eyebrow">ALTURA, EM ARESTAS</span><h2>O formato muda o custo.</h2><svg viewBox="0 0 340 180" role="img" :aria-label="chartLabel"><title>{{ chartLabel }}</title><line x1="30" y1="140" x2="320" y2="140" stroke="var(--border-strong)" /><g v-for="(card, i) in cards" :key="card.type"><rect :x="55 + i * 100" :y="140 - Math.max(0, card.height) / chartMax * 105" width="44" :height="Math.max(0, card.height) / chartMax * 105" rx="3" :fill="i === 0 ? 'var(--muted)' : 'var(--accent)'" :opacity="i === 2 ? .65 : 1" /><text :x="77 + i * 100" :y="128 - Math.max(0, card.height) / chartMax * 105" text-anchor="middle" fill="var(--text)" font-size="14">{{ card.height }}</text><text :x="77 + i * 100" y="164" text-anchor="middle" fill="var(--muted)" font-size="12">{{ card.type === 'rb' ? 'RN' : card.label }}</text></g></svg><p class="muted">{{ summary }}</p><NuxtLink to="/" class="comparison-learn">Entender as diferenças <Icon name="lucide:arrow-right" /></NuxtLink></section>
  </div>
</template>
<style scoped>
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
</style>

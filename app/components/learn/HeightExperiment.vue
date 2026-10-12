<script setup lang="ts">
import { computed, ref, useId } from 'vue'
import { runSequence } from '~/engine'
import type { Op, TreeType } from '~/engine'

type InputMode = 'ordered' | 'random'
interface Measurement { n: number; height: number }
interface Curve { type: TreeType; label: string; values: Measurement[] }

const seed = 42
const nodeCount = 31
const mode = ref<InputMode>('ordered')
const chartId = useId()
const chart = { left: 38, right: 304, top: 32, bottom: 214, maxHeight: 30 }
const nodeTicks = [1, 8, 16, 24, 31]
const heightTicks = [0, 10, 20, 30]
const trees: { type: TreeType; label: string }[] = [
  { type: 'bst', label: 'ABB' },
  { type: 'avl', label: 'AVL' },
  { type: 'rb', label: 'RN' },
]

function shuffledKeys(): number[] {
  const keys = Array.from({ length: nodeCount }, (_, index) => index + 1)
  let state = seed
  for (let index = keys.length - 1; index > 0; index--) {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0
    const target = state % (index + 1)
    const key = keys[index]!
    keys[index] = keys[target]!
    keys[target] = key
  }
  return keys
}

const keys: Record<InputMode, number[]> = {
  ordered: Array.from({ length: nodeCount }, (_, index) => index + 1),
  random: shuffledKeys(),
}

function measure(input: readonly number[]): Curve[] {
  const ops: Op[] = input.map(k => ({ t: 'i', k }))
  return trees.map(({ type, label }) => {
    const result = runSequence(type, ops)
    const values = result.opRanges.map(([, end], index) => {
      const tree = result.steps[end]!.tree
      return { n: index + 1, height: tree.rootId === null ? -1 : tree.nodes[tree.rootId]!.h }
    })
    return { type, label, values }
  })
}

// Cada curva vem de uma execução completa e dos resultados finais de suas operações.
const experiments: Record<InputMode, Curve[]> = {
  ordered: measure(keys.ordered),
  random: measure(keys.random),
}
const curves = computed(() => experiments[mode.value])
const description = computed(() => {
  const input = mode.value === 'ordered' ? 'Entrada crescente de 1 a 31.' : `Permutação de 1 a 31, semente ${seed}.`
  const heights = curves.value.map(curve => `${curve.label}: altura ${curve.values.at(-1)!.height}`).join('; ')
  return `${input} Altura em arestas após cada inserção, para 1 a 31 nós. Aos 31 nós: ${heights}.`
})

function x(n: number): number {
  return chart.left + (n - 1) * (chart.right - chart.left) / (nodeCount - 1)
}
function y(height: number): number {
  return chart.bottom - height * (chart.bottom - chart.top) / chart.maxHeight
}
function path(values: readonly Measurement[]): string {
  return values.map((value, index) => `${index === 0 ? 'M' : 'L'}${x(value.n).toFixed(2)},${y(value.height).toFixed(2)}`).join(' ')
}
function triangle(value: Measurement): string {
  const centerX = x(value.n), centerY = y(value.height)
  return `${centerX},${centerY - 4} ${centerX - 4},${centerY + 3} ${centerX + 4},${centerY + 3}`
}
function heightAt(curve: Curve, n: number): number {
  return curve.values[n - 1]!.height
}
</script>

<template>
  <section class="height-experiment" aria-label="Experimento de altura por quantidade de nós">
    <header class="experiment-heading">
      <Icon name="lucide:chart-no-axes-combined" size="20" aria-hidden="true" />
      <h3>Altura × quantidade de nós</h3>
    </header>
    <p class="experiment-intro">Mesmas chaves, três árvores. Cada ponto mostra a altura depois de uma inserção.</p>
    <div class="input-controls" role="group" aria-label="Ordem de inserção">
      <UiButton :variant="mode === 'ordered' ? 'primary' : 'secondary'" :aria-pressed="mode === 'ordered'" @click="mode = 'ordered'">
        <Icon name="lucide:arrow-up-wide-narrow" size="18" aria-hidden="true" />
        Crescente
      </UiButton>
      <UiButton :variant="mode === 'random' ? 'primary' : 'secondary'" :aria-pressed="mode === 'random'" @click="mode = 'random'">
        <Icon name="lucide:shuffle" size="18" aria-hidden="true" />
        Aleatória
      </UiButton>
    </div>
    <p class="experiment-seed mono">1 a 31 · semente {{ seed }} na ordem aleatória</p>

    <figure class="height-figure">
      <svg viewBox="0 0 320 264" role="img" :aria-labelledby="`${chartId}-title ${chartId}-description`">
        <title :id="`${chartId}-title`">Altura por quantidade de nós</title>
        <desc :id="`${chartId}-description`">{{ description }}</desc>
        <text :x="chart.left" y="18" class="axis-title">Altura (h)</text>
        <g v-for="tick in heightTicks" :key="`height-${tick}`" aria-hidden="true">
          <line :x1="chart.left" :x2="chart.right" :y1="y(tick)" :y2="y(tick)" class="grid-line" />
          <text :x="chart.left - 9" :y="y(tick) + 5" text-anchor="end" class="axis-tick">{{ tick }}</text>
        </g>
        <line :x1="chart.left" :x2="chart.left" :y1="chart.top" :y2="chart.bottom" class="axis-line" />
        <g v-for="tick in nodeTicks" :key="`nodes-${tick}`" aria-hidden="true">
          <line :x1="x(tick)" :x2="x(tick)" :y1="chart.bottom" :y2="chart.bottom + 4" class="axis-line" />
          <text :x="x(tick)" :y="chart.bottom + 22" text-anchor="middle" class="axis-tick">{{ tick }}</text>
        </g>
        <text x="171" y="258" text-anchor="middle" class="axis-title">Quantidade de nós (n)</text>
        <g v-for="curve in curves" :key="curve.type" :class="['height-curve', curve.type]" aria-hidden="true">
          <path :d="path(curve.values)" class="curve-line" />
          <template v-for="value in curve.values.filter(value => nodeTicks.includes(value.n))" :key="value.n">
            <circle v-if="curve.type === 'bst'" :cx="x(value.n)" :cy="y(value.height)" r="3.5" class="curve-marker" />
            <polygon v-else-if="curve.type === 'avl'" :points="triangle(value)" class="curve-marker" />
            <rect v-else :x="x(value.n) - 3.5" :y="y(value.height) - 3.5" width="7" height="7" class="curve-marker" />
          </template>
        </g>
      </svg>
      <figcaption>Altura em arestas. A escala de 0 a 30 é a mesma nos dois experimentos.</figcaption>
    </figure>

    <ul class="curve-legend" aria-label="Legenda e altura final">
      <li v-for="curve in curves" :key="curve.type" :class="['height-curve', curve.type]">
        <svg viewBox="0 0 36 16" aria-hidden="true">
          <path d="M1 8H35" class="curve-line" />
          <circle v-if="curve.type === 'bst'" cx="18" cy="8" r="3.5" class="curve-marker" />
          <polygon v-else-if="curve.type === 'avl'" points="18,3 14,11 22,11" class="curve-marker" />
          <rect v-else x="14.5" y="4.5" width="7" height="7" class="curve-marker" />
        </svg>
        <strong>{{ curve.label }}<span v-if="curve.type === 'rb'" class="sr-only"> (Rubro-Negra)</span></strong>
        <span class="mono">h = {{ heightAt(curve, nodeCount) }}</span>
      </li>
    </ul>
    <p class="experiment-insight" role="status" aria-live="polite">
      {{ mode === 'ordered' ? 'A ABB vira lista (h = n−1). AVL e RN mantêm a altura baixa.' : 'A ordem aleatória muda a forma da ABB. Ela continua sem garantia de altura.' }}
    </p>
    <details class="measurement-details">
      <summary>Ver as 31 medições e a sequência</summary>
      <p class="input-sequence"><strong>Ordem de inserção:</strong> <span class="mono">{{ keys[mode].join(' → ') }}</span></p>
      <table>
        <caption>Altura após cada inserção</caption>
        <thead><tr><th scope="col">Nós</th><th scope="col">ABB</th><th scope="col">AVL</th><th scope="col"><abbr title="Rubro-Negra">RN</abbr></th></tr></thead>
        <tbody>
          <tr v-for="n in nodeCount" :key="n"><th scope="row">{{ n }}</th><td v-for="curve in curves" :key="curve.type">{{ heightAt(curve, n) }}</td></tr>
        </tbody>
      </table>
    </details>
  </section>
</template>

<style scoped>
.height-experiment { margin:28px 0; padding:18px 16px; border:1px solid var(--border); border-radius:12px; background:var(--surface-1); }
.experiment-heading { display:flex; align-items:center; gap:10px; }
.experiment-heading .iconify { flex-shrink:0; color:var(--accent); }
.experiment-heading h3 { font-size:1rem; line-height:1.5; }
.experiment-intro { margin-top:12px; font-size:.875rem; line-height:1.65; color:var(--muted); }
.input-controls { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:8px; margin-top:20px; }
.input-controls .ui-button { padding:10px 8px; font-size:.8rem; }
.experiment-seed { margin:12px 0 18px; font-size:.7rem; line-height:1.6; color:var(--muted); }
.height-figure { margin:0; }
.height-figure > svg { display:block; width:100%; height:auto; overflow:visible; }
.axis-tick { fill:var(--muted); font-size:16px; font-family:'JetBrains Mono',monospace; }
.axis-title { fill:var(--muted); font-size:15px; }
.grid-line { stroke:var(--border); stroke-width:1; }
.axis-line { stroke:var(--border-strong); stroke-width:1; }
.height-curve.bst { color:var(--accent); }
.height-curve.avl { color:var(--compare); }
.height-curve.rb { color:var(--rotation); }
.curve-line { fill:none; stroke:currentColor; stroke-width:2.5; stroke-linecap:round; stroke-linejoin:round; }
.avl .curve-line { stroke-dasharray:8 5; }
.rb .curve-line { stroke-dasharray:2 5; }
.curve-marker { fill:var(--surface-1); stroke:currentColor; stroke-width:2; }
figcaption { margin-top:12px; font-size:.75rem; line-height:1.65; color:var(--muted); }
.curve-legend { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:8px; margin:18px 0; padding:0; list-style:none; }
.curve-legend li { display:flex; flex-wrap:wrap; align-items:center; gap:6px; font-size:.8rem; }
.curve-legend svg { width:30px; height:16px; flex-shrink:0; }
.curve-legend strong { color:var(--text); }
.curve-legend .mono { flex-basis:100%; color:var(--muted); font-size:.75rem; }
.experiment-insight { padding:14px; border-left:3px solid var(--accent); border-radius:0 8px 8px 0; background:var(--surface-2); font-size:.875rem; line-height:1.65; }
.measurement-details { margin-top:12px; }
.measurement-details summary { display:list-item; min-height:48px; padding:12px 0; font-size:.8rem; line-height:1.5; color:var(--accent); cursor:pointer; touch-action:manipulation; }
.input-sequence { margin:8px 0 16px; font-size:.75rem; line-height:1.8; overflow-wrap:anywhere; }
.input-sequence .mono { color:var(--muted); }
table { width:100%; border-collapse:collapse; font-size:.8rem; font-variant-numeric:tabular-nums; }
caption { padding-bottom:12px; text-align:left; color:var(--muted); }
th,td { padding:8px; border-bottom:1px solid var(--border); text-align:center; }
th:first-child { text-align:left; }
abbr { text-decoration:none; }
</style>

<script setup lang="ts">
import { computed, ref } from 'vue'
import type { usePlayer } from '../../composables/usePlayer'
import { TabsRoot, TabsList, TabsTrigger, TabsContent } from 'reka-ui'
import { getMessage, pseudocode } from '../../engine'
import { getStepExplanation } from '../../engine/messages'
import { useLabStore } from '../../stores/lab'
defineProps<{ player: ReturnType<typeof usePlayer> }>()
const lab = useLabStore()
const tab = ref('explanation')
const code = computed(() => pseudocode[lab.step?.code.algo ?? ''] ?? [])
const explanation = computed(() => lab.step ? getStepExplanation(lab.step, lab.type) : null)
const recolor = computed(() => lab.step?.kind === 'recolor' ? lab.step.msg.params : null)
const counters = [['comparisons', 'Comparações'], ['rotations', 'Rotações'], ['recolorings', 'Mudanças de cor'], ['heightUpdates', 'Alturas recalculadas'], ['visits', 'Visitas']] as const
const operation = computed(() => lab.operations[lab.operationIndex])
const costNote = computed(() => {
  if (operation.value?.t === 'walk') return 'O percurso visita cada nó uma vez: Θ(n), para n nós.'
  return lab.type === 'bst'
    ? 'Busca, inserção e remoção percorrem até h níveis: O(h). Uma ABB pode virar uma lista e chegar a O(n).'
    : 'Busca, inserção e remoção percorrem até h níveis: O(h). O balanceamento mantém h em O(log n).'
})
const stepCost = computed(() => lab.step?.meta?.rotation || lab.step?.kind === 'recolor'
  ? 'Este giro ou mudança de cor altera uma quantidade fixa de vínculos ou cores: O(1).'
  : '')
</script>
<template>
  <div class="details">
    <LabPlayerBar :player="player" compact />
    <TabsRoot v-model="tab" class="details-tabs-root">
      <TabsList class="detail-tabs" aria-label="Detalhes do passo">
        <TabsTrigger value="explanation">Explicação</TabsTrigger>
        <TabsTrigger value="code">Código</TabsTrigger>
        <TabsTrigger value="cost">Custo</TabsTrigger>
      </TabsList>
      <TabsContent value="explanation" class="details-panel" @keydown.space.stop>
        <template v-if="explanation">
          <div v-if="recolor" class="color-change" role="group" :aria-label="lab.step ? getMessage(lab.step.msg) : ''">
            <strong class="mono">{{ recolor.key }}</strong>
            <span class="color-chip"><span class="color-swatch" :class="recolor.from === 'R' ? 'red' : 'black'" aria-hidden="true" />{{ recolor.from === 'R' ? 'R · vermelho' : 'N · preto' }}</span>
            <Icon name="lucide:arrow-right" aria-hidden="true" />
            <span class="color-chip"><span class="color-swatch" :class="recolor.color === 'R' ? 'red' : 'black'" aria-hidden="true" />{{ recolor.color === 'R' ? 'R · vermelho' : 'N · preto' }}</span>
          </div>
          <p v-else class="step-action">{{ lab.step ? getMessage(lab.step.msg) : '' }}</p>
          <dl class="step-explanation">
            <div><dt>Motivo deste passo</dt><dd>{{ explanation.diagnosis }}</dd></div>
            <div><dt>O que muda</dt><dd>{{ explanation.change }}</dd></div>
            <div><dt>Regra a preservar</dt><dd>{{ explanation.rule }}</dd></div>
          </dl>
        </template>
        <p v-else class="detail-description">Insira um número para acompanhar seu caminho e entender cada mudança da árvore.</p>
      </TabsContent>
      <TabsContent value="code" class="details-panel" @keydown.space.stop>
        <p v-if="lab.step" class="code-context">Passo atual: linha <strong class="mono">{{ lab.step.code.line }}</strong>. A linha destacada corresponde à ação mostrada no diagrama.</p>
        <ol class="pseudocode">
          <li v-for="line in code" :key="line.n" :class="{ current: line.n === lab.step?.code.line }" :aria-current="line.n === lab.step?.code.line ? 'step' : undefined"><span>{{ line.n }}</span><code>{{ line.text }}</code></li>
        </ol>
        <p v-if="!code.length" class="detail-description">O código aparece ao iniciar uma operação.</p>
      </TabsContent>
      <TabsContent value="cost" class="details-panel" @keydown.space.stop>
        <p class="cost-context">Contagens da operação completa e de todas as operações da sequência.</p>
        <table>
          <caption class="sr-only">Trabalho total dos algoritmos, incluindo passos ainda não reproduzidos</caption>
          <thead><tr><th scope="col">Medida</th><th scope="col">Operação</th><th scope="col">Sequência</th></tr></thead>
          <tbody><tr v-for="[key, label] in counters" :key="key"><th scope="row">{{ label }}</th><td>{{ lab.operationCost?.[key] ?? 0 }}</td><td>{{ lab.totalCost[key] }}</td></tr></tbody>
        </table>
        <p v-if="stepCost" class="cost-note">{{ stepCost }}</p>
        <p class="cost-note">{{ costNote }}</p>
        <p class="detail-description">Uma rotação dupla conta como duas rotações. Cada nó cuja cor realmente muda conta uma recoloração.</p>
      </TabsContent>
    </TabsRoot>
  </div>
</template>
<style scoped>
.details { height: min(460px, calc(85dvh - 110px)); min-height: 0; display: flex; flex-direction: column; }
.details > :deep(.player) { flex-shrink: 0; }
.details-tabs-root { display: flex; flex: 1; flex-direction: column; min-height: 0; }
.details-panel { flex: 1; min-height: 0; overflow-y: auto; overflow-x: hidden; scrollbar-gutter: stable; padding-right: 4px; overscroll-behavior: contain; }
.detail-tabs { display: flex; flex-shrink: 0; gap: 8px; padding: 8px 0 12px; }
.detail-tabs button { flex: 1; min-height: 48px; font-size: 13px; border-bottom: 2px solid transparent; color: var(--muted); }
.detail-tabs button[data-state='active'] { color: var(--accent); border-color: var(--accent); }
.details p { font-size: 14px; line-height: 1.6; margin: 12px 0; }
.step-action { font-weight: 600; }
.detail-description, .code-context, .cost-context { color: var(--muted); }
.step-explanation { display: grid; gap: 16px; padding: 6px 0 18px; }
.step-explanation > div { padding: 0 0 14px; border-bottom: 1px solid var(--border); }
.step-explanation > div:last-child { border-bottom: 0; padding-bottom: 0; }
.step-explanation dt { color: var(--accent); font-size: 12px; font-weight: 600; margin-bottom: 6px; }
.step-explanation dd { margin: 0; font-size: 14px; line-height: 1.65; }
.color-change { display: flex; flex-wrap: wrap; align-items: center; gap: 10px; padding: 8px 0 16px; font-size: 12px; }
.color-change > strong { font-size: 16px; }
.color-chip { display: inline-flex; align-items: center; gap: 6px; }
.color-swatch { width: 14px; height: 14px; border: 1px solid var(--border-strong); border-radius: 50%; }
.color-swatch.red { background: #c83b50; }
.color-swatch.black { background: #171a22; }
.pseudocode { margin: 10px 0; display: grid; gap: 6px; }
.pseudocode li { display: flex; gap: 12px; padding: 10px 8px; font: 12px/1.6 'JetBrains Mono', monospace; border-radius: 8px; }
.pseudocode li > span { color: var(--muted); flex-shrink: 0; }
.pseudocode code { font: inherit; }
.pseudocode .current { background: var(--surface-3); border-left: 2px solid var(--accent); }
table { width: 100%; border-collapse: collapse; font-size: 12px; }
th { text-align: left; font-weight: 500; }
td { text-align: center; font: 13px 'JetBrains Mono', monospace; }
th,td { padding: 12px 4px; border-bottom: 1px solid var(--border); }
thead { color: var(--muted); }
.cost-note { padding-left: 12px; border-left: 2px solid var(--accent); }
</style>

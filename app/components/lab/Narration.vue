<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useLabStore } from '../../stores/lab'
import { getCaseLabel, getMessage } from '../../engine'
import { getStepReason } from '../../engine/messages'
import type { StepKind } from '../../engine/types'
const props = defineProps<{ playing: boolean }>()
const emit = defineEmits<{ details: [] }>()
const lab = useLabStore()
const phases: Partial<Record<StepKind, [string, string]>> = { start: ['git-branch', 'Descida'], compare: ['git-branch', 'Descida'], descend: ['git-branch', 'Descida'], attach: ['plus', 'Inserção'], found: ['check', 'Busca'], 'not-found': ['search', 'Busca'], duplicate: ['copy', 'Inserção'], 'mark-delete': ['minus', 'Remoção'], 'find-successor': ['route', 'Sucessor'], transplant: ['move', 'Remoção'], remove: ['minus', 'Remoção'], update: ['equal', 'Atualização'], imbalance: ['scale', 'Rebalanceamento'], case: ['scale', 'Rebalanceamento'], 'rotate-pre': ['rotate-cw', 'Rotação'], rotate: ['rotate-cw', 'Rotação'], recolor: ['paintbrush', 'Recoloração'], 'extra-black': ['circle-dashed', 'Preto extra'], visit: ['list-ordered', 'Percurso'], done: ['check', 'Concluído'] }
const phase = computed(() => phases[lab.step?.kind ?? 'start'] ?? ['git-branch', 'Laboratório'])
const phaseTitle = computed(() => {
  const rotation = lab.step?.meta?.rotation
  if (rotation && rotation.of > 1) return `${rotation.n}ª rotação: ${rotation.dir === 'left' ? 'esquerda' : 'direita'} em ${lab.tree.nodes[rotation.pivot]?.key}`
  return lab.step?.meta?.caseName ? getCaseLabel(lab.step.meta.caseName) : phase.value[1]
})
const text = computed(() => lab.step ? getMessage(lab.step.msg) : 'Digite um valor e toque em Inserir. Você controla cada passo.')
const reason = computed(() => getStepReason(lab.step))
const pieces = computed(() => text.value.split(/(-?\d+(?:[.,]\d+)?)/g))
const spoken = computed(() => [text.value, reason.value].filter(Boolean).join(' '))
const announcement = ref(spoken.value)
let lastAnnounce = 0
watch(spoken, (value) => { if (!props.playing || lab.step?.kind === 'done' || performance.now() - lastAnnounce > 1200) { announcement.value = value; lastAnnounce = performance.now() } })
watch(() => props.playing, (value) => { if (!value) announcement.value = spoken.value })
</script>
<template>
  <button class="narration" type="button" aria-label="Abrir detalhes deste passo" @click="emit('details')"><div class="narration-top"><span class="phase"><Icon :name="`lucide:${phase[0]}`" />{{ phaseTitle }}</span><span class="step-count">{{ lab.step ? `passo ${lab.cursor - (lab.range[0] ?? 0) + 1}/${(lab.range[1] ?? 0) - (lab.range[0] ?? 0) + 1}` : 'Pronto para começar' }}</span></div><p><template v-for="(piece, index) in pieces" :key="index"><strong v-if="index % 2">{{ piece }}</strong><span v-else>{{ piece }}</span></template></p><span v-if="reason" class="step-reason">{{ reason }}</span><div v-if="lab.step?.kind === 'done' && lab.operationCost" class="cost-summary">{{ lab.operationCost.comparisons }} comparações<span v-if="lab.operationCost.rotations"> · {{ lab.operationCost.rotations }} {{ lab.operationCost.rotations === 1 ? 'rotação' : 'rotações' }}</span><span v-if="lab.operationCost.recolorings"> · {{ lab.operationCost.recolorings }} recolorações</span></div><div v-if="lab.step?.meta?.order?.length" class="traversal-output">{{ lab.step.meta.order.join(' · ') }}</div></button><span class="sr-only" aria-live="polite" aria-atomic="true">{{ announcement }}</span>
</template>
<style scoped>.narration { width: 100%; text-align: left; min-height: 70px; padding: 8px 2px 0; }.narration-top { display: flex; align-items: center; justify-content: space-between; gap: 8px; }.phase { display: flex; align-items: center; gap: 6px; font-size: 12px; color: var(--accent); }.phase :deep(.iconify) { width: 16px; height: 16px; }.step-count { color: var(--muted); font-size: 11px; white-space: nowrap; }.narration p { font-size: 15px; margin: 7px 0 0; line-height: 1.4; }.step-reason { display: block; color: var(--muted); font-size: 12px; line-height: 1.45; margin-top: 4px; }.narration strong { font-family: 'JetBrains Mono', monospace; font-weight: 600; }.cost-summary { color: var(--muted); font-size: 11px; margin-top: 4px; }.traversal-output { overflow: auto; white-space: nowrap; color: var(--accent); font: 12px 'JetBrains Mono', monospace; padding-top: 6px; }</style>

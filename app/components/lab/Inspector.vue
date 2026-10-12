<script setup lang="ts">
import type { TreeNode } from '../../engine/types'
import { blackHeight as getBlackHeight } from '../../engine'
import { useLabStore } from '../../stores/lab'
const props = defineProps<{ id: number }>()
const emit = defineEmits<{ action: [action: 'd' | 's', key: number]; focus: [id: number]; close: [] }>()
const lab = useLabStore()
const node = computed(() => lab.tree.nodes[props.id])
const path = computed(() => { const keys: number[] = []; let id: number | null = props.id; while (id !== null) { const current: TreeNode | undefined = lab.tree.nodes[id]; if (!current) break; keys.unshift(current.key); id = current.p } return keys })
const ordered = computed(() => Object.values(lab.tree.nodes).map(node => node.key).sort((a, b) => a - b))
const rank = computed(() => ordered.value.indexOf(node.value?.key ?? 0))
const balance = computed(() => !node.value ? 0 : (node.value.l === null ? -1 : lab.tree.nodes[node.value.l]?.h ?? -1) - (node.value.r === null ? -1 : lab.tree.nodes[node.value.r]?.h ?? -1))
const blackHeight = computed(() => getBlackHeight(lab.tree, props.id))
function key(id: number | null) { return id === null ? '—' : lab.tree.nodes[id]?.key ?? '—' }
function size(id: number | null): number { if (id === null) return 0; const current: TreeNode | undefined = lab.tree.nodes[id]; return current ? 1 + size(current.l) + size(current.r) : 0 }
</script>
<template>
  <div v-if="node" class="inspector"><div class="inspector-key"><span>Nó</span><strong>{{ node.key }}</strong><span class="path">{{ path.join(' → ') }}</span></div><dl><div><dt>Profundidade</dt><dd>{{ path.length - 1 }}</dd></div><div><dt>Altura</dt><dd>{{ node.h }}</dd></div><div v-if="lab.type === 'avl'"><dt>FB</dt><dd>{{ balance }}</dd></div><div v-if="lab.type === 'rb'"><dt>Cor / bh</dt><dd>{{ node.c === 'R' ? 'Vermelho' : 'Preto' }} / {{ blackHeight }}</dd></div><div><dt>Pai</dt><dd>{{ key(node.p) }}</dd></div><div><dt>Esquerda / direita</dt><dd>{{ key(node.l) }} / {{ key(node.r) }}</dd></div><div><dt>Subárvore</dt><dd>{{ size(id) }} {{ size(id) === 1 ? 'nó' : 'nós' }}</dd></div><div class="inspector-neighbors"><dt>Predecessor / sucessor</dt><dd>{{ ordered[rank - 1] ?? '—' }} / {{ ordered[rank + 1] ?? '—' }}</dd></div></dl><div class="inspector-actions"><UiButton @click="emit('action', 's', node.key)"><Icon name="lucide:search" />Buscar</UiButton><UiButton @click="emit('action', 'd', node.key)"><Icon name="lucide:minus" />Remover</UiButton><UiButton variant="ghost" aria-label="Focar subárvore" @click="emit('focus', id)"><Icon name="lucide:focus" /><span>Focar</span></UiButton></div></div>
</template>
<style scoped>.inspector-key { display: flex; align-items: center; gap: 10px; }.inspector-key > span:first-child { color: var(--muted); font-size: 13px; }.inspector-key strong { font: 24px 'JetBrains Mono', monospace; }.path { min-width: 0; margin-left: auto; font: 11px 'JetBrains Mono', monospace; color: var(--muted); overflow-x: auto; white-space: nowrap; }dl { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; margin: 18px 0; }dl > div { display: flex; justify-content: space-between; align-items: baseline; gap: 8px; font-size: 12px; }.inspector-neighbors { grid-column: 1 / -1; }dt { color: var(--muted); }dd { flex-shrink: 0; white-space: nowrap; font-variant-numeric: tabular-nums; }.inspector-actions { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; }.inspector-actions :deep(button) { min-width: 0; min-height: 48px; padding: 0 8px; font-size: 12px; gap: 6px; white-space: nowrap; }.inspector-actions :deep(.iconify) { width: 18px; height: 18px; flex-shrink: 0; }</style>

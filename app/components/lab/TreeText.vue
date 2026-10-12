<script setup lang="ts">
import type { Snapshot } from '../../engine/types'
const props = defineProps<{ tree: Snapshot; id?: number | null; side?: string }>()
const currentId = computed(() => props.id === undefined ? props.tree.rootId : props.id)
const node = computed(() => currentId.value === null ? undefined : props.tree.nodes[currentId.value])
</script>
<template><ul v-if="node" class="tree-text"><li><span>{{ side ?? 'Raiz' }}: <strong>{{ node.key }}</strong> · altura {{ node.h }}<template v-if="node.c"> · {{ node.c === 'R' ? 'vermelho' : 'preto' }}</template></span><LabTreeText v-if="node.l !== null" :id="node.l" :tree="tree" side="Esquerda" /><LabTreeText v-if="node.r !== null" :id="node.r" :tree="tree" side="Direita" /></li></ul><p v-else>Árvore vazia.</p></template>
<style scoped>.tree-text { padding: 8px 0 8px 16px; border-left: 1px solid var(--border); font-size: 13px; }.tree-text span { line-height: 1.8; }.tree-text strong { font-family: 'JetBrains Mono', monospace; }</style>

<script setup lang="ts">
import { glossary } from '~/content/glossary'
const props = defineProps<{ text: string }>()
const termId = (value: string) => glossary.find(entry => entry.term.toLocaleLowerCase('pt-BR') === value.toLocaleLowerCase('pt-BR'))?.id
const parts = computed(() => props.text.split(/(\*\*[^*]+\*\*|`[^`]+`|_[^_]+_)/g).filter(Boolean).map(value => {
  if (value.startsWith('**') && value.endsWith('**')) {
    const text = value.slice(2, -2)
    return { tag: 'strong', value: text, glossaryId: termId(text) }
  }
  if (value.startsWith('`') && value.endsWith('`')) return { tag: 'code', value: value.slice(1, -1), glossaryId: undefined }
  if (value.startsWith('_') && value.endsWith('_')) return { tag: 'em', value: value.slice(1, -1), glossaryId: undefined }
  return { tag: 'span', value, glossaryId: undefined }
}))
</script>
<template><template v-for="(part, index) in parts" :key="index"><NuxtLink v-if="part.tag === 'strong' && part.glossaryId" :to="`/glossario#${part.glossaryId}`" class="term-link"><strong>{{ part.value }}</strong></NuxtLink><strong v-else-if="part.tag === 'strong'">{{ part.value }}</strong><code v-else-if="part.tag === 'code'">{{ part.value }}</code><em v-else-if="part.tag === 'em'">{{ part.value }}</em><span v-else>{{ part.value }}</span></template></template>
<style scoped>code{font-family:'JetBrains Mono',monospace;font-size:.85em;background:var(--surface-3);padding:2px 5px;border-radius:4px;overflow-wrap:anywhere}.term-link{text-decoration-line:underline;text-decoration-style:dotted;text-underline-offset:4px;text-decoration-color:var(--accent)}</style>

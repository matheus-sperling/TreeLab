<script setup lang="ts">
import { glossary } from '~/content/glossary'
const search = ref('')
const normalized = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR')
const sorted = [...glossary].sort((a, b) => a.term.localeCompare(b.term, 'pt-BR'))
const results = computed(() => {
  const query = normalized(search.value.trim())
  return sorted.filter(entry => !query || normalized(`${entry.term} ${entry.definition}`).includes(query))
})
function termName(id: string) { return glossary.find(entry => entry.id === id)?.term || id }
async function openRelated(id: string) {
  search.value = ''
  await nextTick()
  await navigateTo({ path: '/glossario', hash: `#${id}` })
}
useSeoMeta({ title: 'Glossário · TreeLab', description: 'Consulte mais de 60 termos de árvores binárias, ABB, AVL e Rubro-Negra, com definições claras.' })
</script>
<template>
  <div class="page-shell glossary-page"><header class="page-header"><span class="eyebrow">PALAVRAS, SEM MISTÉRIO</span><h1>O que significa?</h1><p class="muted">{{ glossary.length }} termos para conectar as ideias.<br>Busque pelo nome ou pela definição.</p></header><div class="glossary-search"><Icon name="lucide:search" size="20" /><label for="glossary-query" class="sr-only">Buscar termo no glossário</label><input id="glossary-query" v-model="search" type="search" placeholder="Altura, rotação, preto extra…" autocomplete="off"><UiIconButton v-if="search" icon="x" label="Limpar busca" @click="search = ''" /></div><div class="glossary-count"><span class="eyebrow">{{ search ? 'RESULTADOS' : 'TODOS OS TERMOS' }}</span><span class="mono">{{ results.length }}</span></div><p v-if="!results.length" class="no-results">Nenhum termo encontrado. Tente uma palavra mais curta.</p><dl class="glossary-entries"><div v-for="entry in results" :id="entry.id" :key="entry.id" class="glossary-entry"><dt>{{ entry.term }}<a :href="`#${entry.id}`" :aria-label="`Link para ${entry.term}`"><Icon name="lucide:link" size="16" /></a></dt><dd><p>{{ entry.definition }}</p><div class="related-terms"><span class="eyebrow">VEJA TAMBÉM</span><a v-for="related in entry.related" :key="related" :href="`#${related}`" @click.prevent="openRelated(related)">{{ termName(related) }}<Icon name="lucide:arrow-up-right" size="14" /></a></div></dd></div></dl><NuxtLink to="/aprender" class="glossary-back"><Icon name="lucide:book-open" size="20" />Voltar ao caminho de estudo<Icon name="lucide:arrow-right" size="20" /></NuxtLink></div>
</template>
<style scoped>
.glossary-page{max-width:820px}.glossary-page h1{font-size:2rem}.glossary-search{display:flex;align-items:center;gap:10px;padding:0 14px;border:1px solid var(--border-strong);background:var(--surface-2);border-radius:12px;min-height:56px}.glossary-search>.iconify{color:var(--muted);flex-shrink:0}.glossary-search input{width:100%;min-width:0;min-height:56px;border:0;background:transparent;color:var(--text);font-size:.85rem;padding:10px 0}.glossary-search input:focus-visible{outline-offset:-2px;border-radius:8px}.glossary-search input::placeholder{color:var(--muted)}.glossary-search input::-webkit-search-cancel-button{-webkit-appearance:none}.glossary-count{display:flex;align-items:center;justify-content:space-between;margin:28px 0 4px;color:var(--muted);font-size:.7rem}.glossary-entries{margin:0}.glossary-entry{padding:22px 0;border-bottom:1px solid var(--border);scroll-margin-top:24px}.glossary-entry dt{display:flex;justify-content:space-between;gap:16px;align-items:center;font-size:1.0625rem;font-weight:650}.glossary-entry dt>a{display:flex;align-items:center;justify-content:center;width:48px;min-width:48px;min-height:48px;color:var(--muted)}.glossary-entry dd{margin:0}.glossary-entry dd>p{font-size:.9375rem;line-height:1.65;margin-top:6px;color:var(--muted)}.related-terms{display:flex;align-items:center;flex-wrap:wrap;gap:8px;margin-top:14px}.related-terms>.eyebrow{display:block;width:100%;font-size:.55rem}.related-terms>a{display:flex;align-items:center;gap:6px;min-height:48px;padding:10px 12px;border:1px solid var(--border);border-radius:8px;color:var(--accent);font-size:.7rem;line-height:1.45}.related-terms .iconify{flex-shrink:0}.no-results{padding:32px 0;color:var(--muted);font-size:.9rem;line-height:1.6}.glossary-back{display:flex;align-items:center;gap:10px;min-height:64px;margin-top:24px;color:var(--accent);font-size:.85rem}.glossary-back>.iconify:last-child{margin-left:auto}@media(min-width:768px){.glossary-page h1{font-size:2.75rem}}
</style>

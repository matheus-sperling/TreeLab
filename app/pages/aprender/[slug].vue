<script setup lang="ts">
import { getLesson, modules } from '~/content/lessons'
import { motion, useMotionValue } from 'motion-v'
const route = useRoute()
const lesson = computed(() => getLesson(String(route.params.slug)))
if (!lesson.value) throw createError({ statusCode: 404, statusMessage: 'Lição não encontrada' })
const module = computed(() => modules.find(item => item.id === lesson.value?.moduleId))
const headings = computed(() => lesson.value?.blocks.filter(block => block.type === 'heading') || [])
const progress = useProgressStore()
const completed = computed(() => progress.progress.completedLessons.includes(lesson.value?.slug || ''))
const tocOpen = ref(false)
const readingProgress = useMotionValue(0)
useSeoMeta({ title: () => `${lesson.value?.title} · TreeLab`, description: () => lesson.value?.summary })
onMounted(() => {
  progress.load()
  const update = () => {
    const maximum = document.documentElement.scrollHeight - window.innerHeight
    readingProgress.set(maximum <= 0 ? 1 : Math.max(0, Math.min(1, window.scrollY / maximum)))
  }
  window.addEventListener('scroll', update, { passive: true })
  update()
  onUnmounted(() => window.removeEventListener('scroll', update))
})
function complete() { if (lesson.value) progress.complete(lesson.value.slug) }
async function goSection(id: string) {
  const closed = window.location.hash === '#dialog'
    ? new Promise<void>(resolve => window.addEventListener('popstate', () => resolve(), { once: true }))
    : Promise.resolve()
  tocOpen.value = false
  await closed
  await nextTick()
  await navigateTo({ path: route.path, query: route.query, hash: `#${id}` })
}
</script>
<template>
  <div v-if="lesson" class="page-shell lesson-page">
    <div class="reading-track" aria-hidden="true"><motion.div :style="{ scaleX: readingProgress }" /></div>
    <div class="lesson-nav"><NuxtLink to="/aprender" class="back-link"><Icon name="lucide:arrow-left" size="20" />Aprender</NuxtLink><UiIconButton icon="list" label="Abrir sumário da lição" @click="tocOpen = true" /></div>
    <header class="lesson-header"><span class="eyebrow">M{{ module?.number.replace(/^0/, '') || '0' }} · {{ module?.title.toUpperCase() }}</span><h1>{{ lesson.title }}</h1><p class="muted">{{ lesson.summary }}</p><div class="reading-info"><Icon name="lucide:clock-3" size="16" /><span>{{ lesson.readingMinutes }} min de leitura</span><span v-if="completed" class="completed-label"><Icon name="lucide:check" size="16" />Concluída</span></div></header>
    <section class="tldr"><span class="eyebrow">EM TRÊS IDEIAS</span><ul><li v-for="item in lesson.tldr" :key="item"><LearnInlineText :text="item" /></li></ul></section>
    <article><LearnBlock v-for="(block, index) in lesson.blocks" :key="`${lesson.slug}-${index}`" :block="block" :topic="lesson.moduleId" /><section class="common-pitfalls"><h2><Icon name="lucide:triangle-alert" size="20" />Armadilhas comuns</h2><ul><li v-for="pitfall in lesson.pitfalls" :key="pitfall">{{ pitfall }}</li></ul></section></article>
    <footer class="lesson-footer"><UiButton :variant="completed ? 'secondary' : 'primary'" @click="complete"><Icon :name="completed ? 'lucide:circle-check' : 'lucide:check'" size="20" />{{ completed ? 'Lição concluída' : 'Marcar como concluída' }}</UiButton><NuxtLink v-if="lesson.nextSlug" :to="`/aprender/${lesson.nextSlug}`" class="next-lesson" @click="complete"><span class="eyebrow">PRÓXIMA LIÇÃO</span><strong>{{ getLesson(lesson.nextSlug)?.title }}</strong><Icon name="lucide:arrow-right" size="22" /></NuxtLink><NuxtLink v-else to="/lab" class="next-lesson" @click="complete"><span class="eyebrow">COLOQUE EM PRÁTICA</span><strong>Experimentar no laboratório</strong><Icon name="lucide:arrow-right" size="22" /></NuxtLink></footer>
    <UiBottomSheet v-model:open="tocOpen" title="Nesta lição"><nav class="toc-links"><button v-for="heading in headings" :key="heading.id" type="button" @click="goSection(heading.id)">{{ heading.text }}<Icon name="lucide:arrow-down" size="18" /></button></nav><NuxtLink to="/glossario" class="glossary-link"><Icon name="lucide:book-a" size="20" />Consultar o glossário</NuxtLink></UiBottomSheet>
  </div>
</template>
<style scoped>
.lesson-page{max-width:740px;padding-top:0}.reading-track{position:fixed;top:0;left:0;right:0;height:3px;background:var(--border);z-index:45}.reading-track>div{height:100%;width:100%;background:var(--accent);transform-origin:left}.lesson-nav{display:flex;align-items:center;justify-content:space-between;margin-bottom:22px}.back-link{display:flex;gap:8px;align-items:center;min-height:48px;padding-right:16px;color:var(--muted);font-size:.8rem}.lesson-header h1{font-size:2rem;line-height:1.15;margin:14px 0 16px;letter-spacing:-.055em}.lesson-header>p{font-size:1.0625rem;line-height:1.6}.lesson-header .eyebrow{font-size:.6rem}.reading-info{display:flex;align-items:center;gap:8px;margin:18px 0 28px;color:var(--muted);font-size:.7rem}.completed-label{display:flex;gap:5px;align-items:center;margin-left:auto;color:var(--success)}.tldr{padding:20px;background:var(--surface-2);border:1px solid var(--border);border-radius:12px;margin-bottom:32px}.tldr ul{padding-left:20px;display:grid;gap:12px;margin:16px 0 0}.tldr li{font-size:.9375rem;line-height:1.6;padding-left:3px}.tldr li::marker{color:var(--accent)}.common-pitfalls{border-top:1px solid var(--border);padding-top:24px;margin:32px 0}.common-pitfalls h2{display:flex;align-items:center;gap:10px;font-size:1rem}.common-pitfalls h2>.iconify{color:var(--compare)}.common-pitfalls ul{padding-left:20px;display:grid;gap:12px}.common-pitfalls li{font-size:.9375rem;line-height:1.6;color:var(--muted)}.lesson-footer{display:grid;gap:24px;margin-top:32px}.next-lesson{display:grid;grid-template-columns:1fr auto;gap:12px;padding:22px 0;border-top:1px solid var(--border)}.next-lesson>.eyebrow{grid-column:1/-1}.next-lesson strong{font-size:1.0625rem;line-height:1.5}.next-lesson>.iconify{color:var(--accent);align-self:center}.toc-links{display:grid;gap:8px}.toc-links button{min-height:56px;padding:12px;border:1px solid var(--border);background:var(--surface-2);border-radius:10px;color:var(--text);display:flex;justify-content:space-between;align-items:center;text-align:left;font-size:.9rem;gap:12px}.toc-links .iconify{flex-shrink:0;color:var(--muted)}.glossary-link{display:flex;min-height:56px;gap:10px;align-items:center;color:var(--accent);margin-top:16px;font-size:.9rem}@media(min-width:768px){.lesson-header h1{font-size:2.75rem}}
</style>

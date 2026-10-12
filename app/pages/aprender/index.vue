<script setup lang="ts">
import { motion } from 'motion-v'
import { modules, lessons, getModuleLessons } from '~/content/lessons'
const route = useRoute()
const progress = useProgressStore()
const moduleTargets: Record<string, string> = { foundations: 'm0', bst: 'm1', avl: 'm3', rb: 'm4', comparison: 'm5', complexity: 'm6' }
const completed = computed(() => progress.progress.completedLessons.filter(slug => lessons.some(lesson => lesson.slug === slug)).length)
const nextLesson = computed(() => lessons.find(lesson => !progress.progress.completedLessons.includes(lesson.slug)) || lessons[0])
onMounted(() => {
  progress.load()
  const scrollToModule = () => {
    const query = route.query.modulo
    const target = typeof query === 'string' ? moduleTargets[query] : undefined
    if (target) document.getElementById(target)?.scrollIntoView({ behavior: 'instant', block: 'start' })
  }
  void nextTick(scrollToModule)
  watch(() => route.query.modulo, () => nextTick(scrollToModule))
})
useSeoMeta({ title: 'Aprender · TreeLab', description: 'Aprenda árvores binárias, ABB, AVL e Rubro-Negra com diagramas, exemplos e testes rápidos.' })
</script>
<template>
  <main class="page-shell learn-page">
    <header class="page-header"><span class="eyebrow">SEU CAMINHO DE ESTUDO</span><h1>Entenda a árvore.<br>Depois, cada passo.</h1><p class="muted">Da primeira raiz ao conserto Rubro-Negro.<br>Avance no seu ritmo, sem pular a lógica.</p></header>
    <NuxtLink v-if="nextLesson" :to="`/aprender/${nextLesson.slug}`" class="learning-resume"><div class="resume-icon"><Icon name="lucide:book-open" size="24" /></div><div><span class="eyebrow">{{ completed ? 'CONTINUAR APRENDENDO' : 'COMEÇAR PELO BÁSICO' }}</span><strong>{{ nextLesson.title }}</strong><span class="muted">{{ nextLesson.readingMinutes }} min de leitura</span></div><Icon name="lucide:arrow-right" size="20" /></NuxtLink>
    <div class="learning-progress"><span>{{ completed }} de {{ lessons.length }} lições concluídas</span><span class="mono">{{ Math.round(completed / lessons.length * 100) }}%</span></div><div class="progress-track" role="progressbar" :aria-valuenow="completed" :aria-valuemax="lessons.length" aria-valuemin="0" aria-label="Lições concluídas"><motion.div :animate="{ scaleX: completed / lessons.length }" :initial="false" :transition="{ duration: .2 }" /></div>
    <section v-for="module in modules" :id="module.id" :key="module.id" class="learning-module" :aria-labelledby="`${module.id}-title`"><div class="module-header"><span class="module-number mono">{{ module.number }}</span><div><h2 :id="`${module.id}-title`">{{ module.title }}</h2><p class="muted">{{ module.summary }}</p></div><Icon :name="`lucide:${module.icon}`" size="22" /></div><div class="module-lessons"><NuxtLink v-for="lesson in getModuleLessons(module.id)" :key="lesson.slug" :to="`/aprender/${lesson.slug}`" class="lesson-link"><Icon :name="progress.progress.completedLessons.includes(lesson.slug) ? 'lucide:circle-check' : 'lucide:circle'" size="20" :class="{ finished: progress.progress.completedLessons.includes(lesson.slug) }" /><span>{{ lesson.title }}</span><span class="lesson-duration mono">{{ lesson.readingMinutes }} min</span><Icon name="lucide:chevron-right" size="18" /></NuxtLink></div></section>
    <NuxtLink to="/glossario" class="reference-link"><Icon name="lucide:search" size="20" /><span>Encontrou um termo novo?<strong>Abra o glossário</strong></span><Icon name="lucide:arrow-up-right" size="20" /></NuxtLink>
  </main>
</template>
<style scoped>
.learn-page{max-width:820px}.learn-page h1{font-size:2rem;line-height:1.15;letter-spacing:-.05em}.learn-page .page-header>p{font-size:.9rem}.learning-resume{display:flex;gap:14px;align-items:center;padding:20px 16px;border:1px solid var(--border-strong);background:var(--surface-2);border-radius:12px}.resume-icon{color:var(--accent)}.learning-resume>div:nth-child(2){display:flex;flex-direction:column;gap:7px;flex:1}.learning-resume strong{font-size:.9rem;letter-spacing:-.025em}.learning-resume .muted{font-size:.75rem}.learning-resume>.iconify{color:var(--accent);flex-shrink:0}.learning-resume .eyebrow{font-size:.55rem}.learning-progress{display:flex;justify-content:space-between;gap:12px;margin:24px 0 10px;font-size:.7rem;color:var(--muted)}.progress-track{height:3px;background:var(--border);border-radius:9px;overflow:hidden}.progress-track>div{height:100%;width:100%;background:var(--accent);transform-origin:left}.learning-module{scroll-margin-top:24px;margin-top:32px;padding-bottom:24px;border-bottom:1px solid var(--border)}.module-header{display:flex;gap:14px;align-items:flex-start;margin-bottom:16px}.module-number{font-size:.7rem;line-height:24px;color:var(--accent)}.module-header>div{flex:1}.module-header h2{font-size:1rem}.module-header p{font-size:.75rem;line-height:1.55;margin-top:6px}.module-header>.iconify{color:var(--muted);flex-shrink:0}.module-lessons{display:grid;gap:8px}.lesson-link{min-height:56px;padding:12px 10px;display:flex;align-items:center;gap:10px;border-radius:10px;background:var(--surface-1);font-size:.8rem}.lesson-link>.iconify:first-child{color:var(--border-strong);flex-shrink:0}.lesson-link>.iconify.finished{color:var(--success)}.lesson-link>span:nth-child(2){flex:1}.lesson-duration{color:var(--muted);font-size:.65rem;white-space:nowrap}.lesson-link>.iconify:last-child{color:var(--muted);flex-shrink:0}.reference-link{margin-top:28px;min-height:64px;display:flex;align-items:center;gap:14px;color:var(--muted);font-size:.75rem}.reference-link>span{flex:1}.reference-link strong{display:block;color:var(--accent);margin-top:6px}.reference-link>.iconify{flex-shrink:0}@media(min-width:768px){.learn-page h1{font-size:2.75rem}}
</style>

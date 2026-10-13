<script setup lang="ts">
import { createTrainingSession } from '~/engine/training'
import { quizBank } from '~/content/quiz'
const route = useRoute(), progressStore = useProgressStore()
const quick = computed(() => route.query.rapido === '1')
const count = computed(() => quick.value ? 3 : 8)
const started = ref(false), index = ref(0), selected = ref<number | null>(null), score = ref(0), finished = ref(false)
const page = useTemplateRef<HTMLDivElement>('page')
const seed = ref(20261012)
const questions = computed(() => createTrainingSession(seed.value, count.value, quizBank))
const current = computed(() => questions.value[index.value]!)
const topics: Record<string, string> = { foundations: 'Fundamentos', bst: 'ABB', avl: 'AVL', rb: 'Rubro-Negra', comparison: 'Comparativo', complexity: 'Complexidade' }
const recurring = computed(() => Object.entries(progressStore.progress.errors).sort((a, b) => b[1] - a[1]).slice(0, 3))
const accuracy = computed(() => progressStore.progress.answers ? Math.round(progressStore.progress.correct / progressStore.progress.answers * 100) : 0)
onMounted(() => {
  progressStore.load()
  const querySeed = Number(route.query.semente)
  if (Number.isInteger(querySeed) && querySeed > 0) seed.value = querySeed
})
async function revealQuestion() {
  await nextTick()
  const heading = page.value?.querySelector<HTMLHeadingElement>('.training-question h2')
  const progress = page.value?.querySelector<HTMLElement>('.session-progress')
  if (!heading) return
  const target = progress ?? heading
  target.scrollIntoView({ block: 'start', behavior: 'instant' })
  heading.tabIndex = -1
  heading.focus({ preventScroll: true })
}
function start() { started.value = true; finished.value = false; index.value = 0; score.value = 0; selected.value = null; void revealQuestion() }
function answer(value: number) {
  if (selected.value !== null) return
  selected.value = value
  const correct = value === current.value.answer
  if (correct) score.value++
  progressStore.answer(correct, current.value.topic)
}
function next() {
  if (index.value === questions.value.length - 1) finished.value = true
  else { index.value++; selected.value = null; void revealQuestion() }
}
function repeat() { seed.value++; start() }
useSeoMeta({ title: 'Treinar — TreeLab', description: 'Pratique altura, rotações, invariantes e custo com questões calculadas pelo motor do TreeLab.' })
</script>
<template>
  <div ref="page" class="page-shell practice-page">
    <header class="page-header"><span class="eyebrow">APRENDER FAZENDO</span><h1>{{ quick ? 'Desafio rápido.' : 'Coloque à prova.' }}</h1><p class="muted">{{ quick ? 'Três questões. Uma pausa para aprender.' : 'Leia a árvore, faça sua escolha e entenda cada resposta.' }}</p></header>
    <template v-if="!started">
      <div class="practice-stats"><div><strong class="mono">{{ progressStore.progress.streak }}</strong><span class="muted">dias em sequência</span></div><div><strong class="mono">{{ accuracy }}%</strong><span class="muted">de acertos</span></div><div><strong class="mono">{{ progressStore.progress.answers }}</strong><span class="muted">respostas</span></div></div>
      <div class="practice-intro panel"><Icon name="lucide:target" size="32" class="accent" /><h2>O motor confere para você.</h2><p class="muted">As questões de árvores nascem dos mesmos passos do laboratório. Conceitos e complexidade completam a prática.</p><ul><li>{{ count }} questões, sem cronômetro</li><li>Resposta e explicação na hora</li><li>Seu progresso fica neste dispositivo</li></ul><UiButton variant="primary" @click="start">Começar {{ quick ? 'desafio' : 'sessão' }} <Icon name="lucide:arrow-right" /></UiButton></div>
      <section v-if="recurring.length" class="review-topics"><h2>Vale revisar</h2><p class="muted">Os temas que mais aparecem nas suas dúvidas.</p><NuxtLink v-for="[topic, errors] in recurring" :key="topic" :to="`/aprender?modulo=${topic}`"><span>{{ topics[topic] ?? topic }}</span><span class="muted mono">{{ errors }} {{ errors === 1 ? 'erro' : 'erros' }}</span><Icon name="lucide:arrow-right" /></NuxtLink></section>
    </template>
    <section v-else-if="finished" class="session-result panel" aria-live="polite"><span class="eyebrow">SESSÃO CONCLUÍDA</span><div class="result-score mono">{{ score }}<span class="muted">/{{ count }}</span></div><h2>{{ score === count ? 'Você encontrou o caminho.' : 'Cada tentativa ensina.' }}</h2><p class="muted">{{ score === count ? 'Todos os conceitos desta sessão ficaram claros. Experimente uma nova sequência.' : 'Reveja as explicações no laboratório e tente outra sessão. Seu progresso já está salvo.' }}</p><UiButton variant="primary" @click="repeat">Nova sessão <Icon name="lucide:arrow-right" /></UiButton><NuxtLink to="/aprender" class="result-lessons">Revisar as lições <Icon name="lucide:book-open" /></NuxtLink></section>
    <template v-else>
      <div class="session-progress"><span class="mono muted">Questão {{ index + 1 }} de {{ count }}</span><span class="mono">{{ score }} {{ score === 1 ? 'acerto' : 'acertos' }}</span></div><UiProgressBar :value="(index + (selected !== null ? 1 : 0)) / count * 100" label="Progresso da sessão" />
      <TrainQuestionCard :key="current.id" :question="current" :selected="selected" @answer="answer" />
      <div class="next-question"><UiButton v-if="selected !== null" variant="primary" @click="next">{{ index === count - 1 ? 'Ver resultado' : 'Próxima questão' }} <Icon name="lucide:arrow-right" /></UiButton><p v-else class="muted">Escolha uma resposta para continuar.</p></div>
    </template>
  </div>
</template>
<style scoped>
.practice-page { max-width:620px; }
.practice-stats { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:12px; padding:20px 0 28px; border-top:1px solid var(--border); }
.practice-stats>div { display:flex; flex-direction:column; gap:8px; }
.practice-stats strong { font-size:1.5rem; }
.practice-stats span { font-size:.7rem; line-height:1.5; }
.practice-intro h2 { margin:20px 0 10px; }
.practice-intro p,.session-result p { font-size:.85rem; line-height:1.7; }
.practice-intro ul { padding:0 0 0 18px; font-size:.85rem; line-height:2.2; margin:20px 0; }
.practice-intro .ui-button,.session-result .ui-button,.next-question .ui-button { width:100%; }
.review-topics { margin-top:32px; }
.review-topics p { font-size:.8rem; margin:10px 0; line-height:1.6; }
.review-topics a { display:flex; align-items:center; gap:12px; min-height:56px; border-bottom:1px solid var(--border); font-size:.85rem; }
.review-topics a>span:first-child { flex:1; }
.review-topics a>.mono { font-size:.7rem; }
.session-progress { display:flex; justify-content:space-between; gap:12px; font-size:.72rem; margin-bottom:8px; scroll-margin-top:16px; }
.training-question { margin-top:24px; }
.next-question { margin-top:24px; min-height:56px; }
.next-question p { text-align:center; font-size:.8rem; padding-top:16px; }
.result-score { margin:24px 0; font-size:4rem; letter-spacing:-.08em; }
.result-score span { font-size:1.5rem; }
.session-result p { margin:12px 0 24px; }
.result-lessons { display:flex; align-items:center; justify-content:center; gap:8px; min-height:48px; margin-top:8px; color:var(--accent); font-size:.85rem; }
</style>

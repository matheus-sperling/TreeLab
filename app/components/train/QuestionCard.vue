<script setup lang="ts">
import { motion } from 'motion-v'
import type { TrainingQuestion } from '~/engine/training'
import { encodeOps } from '~/engine/codec'
const props = defineProps<{ question: TrainingQuestion; selected: number | null }>()
const emit = defineEmits<{ answer: [index: number] }>()
const answered = computed(() => props.selected !== null)
const isCorrect = computed(() => props.selected === props.question.answer)
const labLink = computed(() => ({ path: '/lab', query: { t: props.question.type ?? 'avl', q: encodeOps(props.question.ops) } }))
const selectedNode = computed(() => props.selected === null ? undefined : props.question.nodeOptions?.[props.selected])
const correctNode = computed(() => answered.value ? props.question.nodeOptions?.[props.question.answer] : undefined)
function chooseNode(id: number) {
  const index = props.question.nodeOptions?.indexOf(id) ?? -1
  if (!answered.value && index >= 0) emit('answer', index)
}
</script>
<template>
  <section class="training-question">
    <div class="question-heading"><span class="eyebrow">{{ question.kind === 'concept' ? 'CONCEITO' : 'LEIA A ÁRVORE' }}</span><UiChip v-if="question.type">{{ question.type === 'bst' ? 'ABB' : question.type === 'avl' ? 'AVL' : 'RN' }}</UiChip></div>
    <h2>{{ question.prompt }}</h2>
    <TrainQuestionTree v-if="question.tree && question.type" :tree="question.tree" :type="question.type" :selectable="question.kind === 'parent' && !answered" :selected="selectedNode" :correct="correctNode" @select="chooseNode" />
    <p v-if="question.kind === 'parent'" class="muted touch-hint">Você também pode escolher um nó pela lista.</p>
    <div class="answer-options" role="group" aria-label="Alternativas">
      <motion.button v-for="(option, index) in question.options" :key="index" type="button" :disabled="answered" :class="['answer-option', { correct: answered && index === question.answer, chosen: answered && index === selected && !isCorrect }]" :while-tap="{ scale: .98 }" @click="emit('answer', index)">
        <span class="option-letter mono">{{ String.fromCharCode(65 + index) }}</span><span>{{ option }}</span><Icon v-if="answered && index === question.answer" name="lucide:check" size="20" /><Icon v-else-if="answered && index === selected" name="lucide:rotate-ccw" size="20" />
      </motion.button>
    </div>
    <motion.div v-if="answered" :initial="{ opacity: 0 }" :animate="{ opacity: 1 }" :transition="{ duration: .16 }" :class="['question-feedback', { success: isCorrect }]" role="status">
      <strong><Icon :name="isCorrect ? 'lucide:check' : 'lucide:lightbulb'" size="20" />{{ isCorrect ? 'Isso mesmo.' : 'Vamos entender.' }}</strong><p>{{ question.explanation }}</p>
      <NuxtLink v-if="question.ops.length" :to="labLink" class="feedback-link">Ver no laboratório <Icon name="lucide:arrow-up-right" size="18" /></NuxtLink>
    </motion.div>
  </section>
</template>
<style scoped>
.question-heading { display:flex; align-items:center; justify-content:space-between; margin-bottom:16px; }
h2 { font-size:1.25rem; line-height:1.45; }
.touch-hint { font-size:.75rem; margin:0 0 12px; }
.answer-options { display:grid; gap:8px; margin-top:20px; }
.answer-option { display:flex; align-items:center; gap:12px; min-height:56px; width:100%; text-align:left; padding:12px; border:1px solid var(--border-strong); border-radius:12px; background:var(--surface-1); color:var(--text); font-size:.86rem; line-height:1.5; }
.answer-option>span:nth-child(2) { flex:1; }
.answer-option:disabled { opacity:1; }
.option-letter { min-width:28px; color:var(--muted); font-size:.75rem; }
.answer-option.correct { border-color:var(--success); }
.answer-option.correct .iconify { color:var(--success); }
.answer-option.chosen { border-color:var(--violation); }
.answer-option.chosen .iconify { color:var(--violation); }
.question-feedback { margin-top:20px; padding:16px; border-left:3px solid var(--compare); background:var(--surface-2); border-radius:0 12px 12px 0; }
.question-feedback.success { border-color:var(--success); }
.question-feedback strong { display:flex; gap:8px; align-items:center; font-size:.9rem; }
.question-feedback p { font-size:.83rem; line-height:1.7; margin-top:8px; }
.feedback-link { color:var(--accent); display:flex; align-items:center; gap:8px; min-height:48px; margin-top:8px; font-size:.82rem; font-weight:600; }
</style>

<script setup lang="ts">
import { motion } from 'motion-v'
import type { QuickCheck } from '~/content/lessons'
const props = defineProps<{ questions: readonly QuickCheck[]; topic?: string }>()
const selections = ref<Record<string, number>>({})
const progress = useProgressStore()
function select(question: QuickCheck, index: number) {
  if (selections.value[question.id] !== undefined) return
  selections.value[question.id] = index
  progress.answer(index === question.answer, props.topic || 'lesson')
}
</script>
<template>
  <section class="quick-check" aria-label="Teste rápido">
    <div class="check-title"><Icon name="lucide:circle-help" size="20" /><h2>Teste rápido</h2></div>
    <fieldset v-for="question in questions" :key="question.id" class="question">
      <legend>{{ question.prompt }}</legend>
      <div class="options">
        <motion.button v-for="(option, index) in question.options" :key="index" type="button" :while-tap="{ scale: .98 }" :disabled="selections[question.id] !== undefined" :aria-pressed="selections[question.id] === index" :class="['option', { chosen: selections[question.id] === index, correct: selections[question.id] !== undefined && index === question.answer, incorrect: selections[question.id] === index && index !== question.answer }]" @click="select(question, index)">
          <span class="option-letter mono">{{ String.fromCharCode(65 + index) }}</span><span>{{ option }}</span><Icon v-if="selections[question.id] !== undefined && index === question.answer" name="lucide:check" size="20" /><Icon v-else-if="selections[question.id] === index" name="lucide:circle-help" size="20" />
        </motion.button>
      </div>
      <p v-if="selections[question.id] !== undefined" class="feedback" role="status"><strong>{{ selections[question.id] === question.answer ? 'Isso mesmo.' : 'Vamos conferir.' }}</strong> {{ question.explanation }}</p>
    </fieldset>
  </section>
</template>
<style scoped>
.quick-check{margin:32px 0;padding:20px;background:var(--surface-2);border:1px solid var(--border);border-radius:12px}.check-title{display:flex;gap:10px;align-items:center;color:var(--accent);margin-bottom:24px}.check-title h2{font-size:1rem}.question{border:0;padding:0;margin:0 0 28px;min-width:0}.question:last-child{margin-bottom:0}legend{font-size:1rem;font-weight:600;line-height:1.5;margin-bottom:16px}.options{display:grid;gap:8px}.option{width:100%;min-height:56px;display:flex;gap:12px;align-items:center;text-align:left;padding:12px;border:1px solid var(--border-strong);border-radius:10px;background:var(--surface-1);color:var(--text);font-size:.85rem;line-height:1.5}.option>span:nth-child(2){flex:1}.option-letter{color:var(--muted);font-size:.75rem}.option:disabled{opacity:1}.option.correct{border-color:var(--success)}.option.incorrect{border-color:var(--violation)}.option.correct>.iconify{color:var(--success)}.option.incorrect .option-letter{color:var(--violation)}.feedback{margin-top:16px;font-size:.875rem;line-height:1.7;color:var(--muted)}.feedback strong{color:var(--text)}
</style>

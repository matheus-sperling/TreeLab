<script setup lang="ts">
import { motion } from 'motion-v'
const emit = defineEmits<{ done: [] }>()
const index = ref(0)
const cards = [
  { icon: 'keyboard', title: 'Digite. Insira. Observe.', text: 'Use o teclado numérico para valores ou listas. Comece com 30, 20, 10 e veja a AVL se equilibrar.' },
  { icon: 'play', title: 'O tempo é seu.', text: 'Avance um passo, volte ou reproduza. Você pode pausar qualquer movimento e explorar o código.' },
  { icon: 'hand', title: 'Explore pelo centro.', text: 'Arraste a partir do centro para mover a câmera. Toque nos nós para inspecionar. Os botões também ajustam o zoom.' },
  { icon: 'git-compare', title: 'Uma sequência. Três árvores.', text: 'Troque ABB, AVL e RN sem perder suas operações. Compare como cada estrutura responde aos mesmos valores.' },
]
</script>
<template><div class="onboarding"><AnimatePresence mode="wait"><motion.div :key="index" :initial="{ opacity: 0, x: 16 }" :animate="{ opacity: 1, x: 0 }" :exit="{ opacity: 0, x: -16 }" :transition="{ duration: .16 }" class="tour-card"><Icon :name="`lucide:${cards[index]?.icon}`" /><h3>{{ cards[index]?.title }}</h3><p>{{ cards[index]?.text }}</p></motion.div></AnimatePresence><div class="tour-bottom"><span>{{ index + 1 }} de 4</span><UiButton v-if="index < 3" variant="primary" @click="index++">Próximo<Icon name="lucide:arrow-right" /></UiButton><UiButton v-else variant="primary" @click="emit('done')">Começar<Icon name="lucide:check" /></UiButton></div></div></template>
<style scoped>.tour-card { min-height: 210px; padding: 16px 4px; }.tour-card > :deep(.iconify) { width: 36px; height: 36px; color: var(--accent); margin-bottom: 18px; }.tour-card h3 { font-size: 22px; letter-spacing: -.5px; font-weight: 600; }.tour-card p { font-size: 15px; color: var(--muted); line-height: 1.7; margin-top: 12px; }.tour-bottom { display: flex; align-items: center; justify-content: space-between; gap: 16px; }.tour-bottom span { color: var(--muted); font: 12px 'JetBrains Mono', monospace; }</style>

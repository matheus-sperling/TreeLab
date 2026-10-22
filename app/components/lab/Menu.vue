<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { SwitchRoot, SwitchThumb, TabsRoot, TabsList, TabsTrigger, TabsContent } from 'reka-ui'
import { presets } from '../../engine/presets'
import { countTreeShapes, isShapeSeed, normalizeShapeSeed, shapeSequence } from '../../engine/shapes'
import type { Op, TreeType } from '../../engine/types'
import { useSettingsStore } from '../../stores/settings'
const emit = defineEmits<{
  preset: [ops: Op[], type?: TreeType]; generate: [ops: Op[]]; sequence: []; operation: [op: Op]
  share: []; clear: []; help: []; concepts: []; legend: []; text: []
}>()
const props = defineProps<{ value: string; type?: TreeType }>()
const settings = useSettingsStore().settings
const count = ref(String(settings.randomCount))
const activeType = computed(() => props.type ?? 'avl')
const seed = ref(normalizeShapeSeed(activeType.value, settings.randomCount, settings.randomSeed))
settings.randomSeed = seed.value
const presetType = ref<TreeType>(props.type ?? 'avl')
const generated = ref(false)
const key = computed(() => Number(props.value.split(/[,\s]/).find(Boolean)))
const validKey = computed(() => !!props.value.trim() && Number.isInteger(key.value) && Math.abs(key.value) <= 999)
const validCount = computed(() => /^\d+$/.test(count.value) && Number(count.value) >= 1 && Number(count.value) <= 63)
const shapeCount = computed(() => validCount.value ? countTreeShapes(activeType.value, Number(count.value)) : 0n)
const maxSeed = computed(() => (shapeCount.value > 0n ? shapeCount.value - 1n : 0n).toString())
const typeLabel = computed(() => ({ bst: 'ABB', avl: 'AVL', rb: 'Rubro-Negra' })[activeType.value])
const validSeed = computed(() => validCount.value && isShapeSeed(activeType.value, Number(count.value), seed.value))
const sequence = computed(() => validCount.value && validSeed.value ? shapeSequence(activeType.value, Number(count.value), seed.value) : [])
const generatorNote = computed(() => !validCount.value ? 'Escolha entre 1 e 63 nós.'
  : !validSeed.value ? `Use uma semente inteira de 0 a ${maxSeed.value}.`
    : shapeCount.value === 1n ? `${typeLabel.value}: apenas 1 formato possível, com a semente 0.`
      : `${typeLabel.value}: ${shapeCount.value.toLocaleString('pt-BR')} formatos possíveis. Sementes de 0 a ${maxSeed.value}.`)
const filteredPresets = computed(() => presets.filter(item => item.type === presetType.value && item.id !== 'random'))
const views = [['showHeights', 'Alturas dos nós'], ['showNils', 'Folhas vazias (NIL)'], ['showColors', 'Letras R/N nas cores'], ['showLevels', 'Guias de nível']] as const
const playback = [
  ['pauseOnKey', 'Pausar nos momentos-chave', 'Pare antes dos giros e das mudanças de cor.'],
  ['haptics', 'Resposta tátil', 'Vibração leve nos aparelhos que permitem.'],
  ['reducedMotion', 'Reduzir movimento', 'Use realces mais curtos.'],
] as const
const keyboard = [
  ['systemKeyboard', 'Teclado do aparelho', 'Use o teclado do celular para digitar.'],
  ['keepKeyboard', 'Manter teclado aberto', 'Continue digitando após inserir ou remover.'],
  ['leftHanded', 'Modo canhoto', 'Aproxime a ação principal da mão esquerda.'],
] as const
function generate() {
  if (!validCount.value || !validSeed.value) return
  settings.randomCount = Number(count.value)
  settings.randomSeed = seed.value
  generated.value = true
  emit('generate', sequence.value)
}
watch([count, seed, activeType], ([currentCount, , currentType], [previousCount, , previousType]) => {
  if (!validCount.value) return
  if ((currentCount !== previousCount || currentType !== previousType) && (/^\d+$/.test(seed.value) || shapeCount.value === 1n)) {
    const normalized = normalizeShapeSeed(activeType.value, Number(count.value), seed.value)
    if (normalized !== seed.value) { seed.value = normalized; return }
  }
  generate()
})
</script>
<template>
  <div class="lab-menu" :class="{ 'reduce-motion': settings.reducedMotion }">
    <div class="menu-start">
      <button type="button" @click="emit('sequence')"><Icon name="lucide:list-ordered" /><span>Editar sequência<small>Altere valores e a ordem das operações</small></span><Icon name="lucide:chevron-right" /></button>
      <button type="button" @click="emit('clear')"><Icon name="lucide:plus" /><span>Nova árvore vazia<small>Limpe tudo e comece do zero</small></span><Icon name="lucide:chevron-right" /></button>
    </div>
    <TabsRoot v-model="settings.labMenuSection" class="menu-tabs-root">
      <TabsList class="menu-tabs" aria-label="Opções do laboratório">
        <TabsTrigger value="examples">Exemplos</TabsTrigger>
        <TabsTrigger value="explore">Explorar</TabsTrigger>
        <TabsTrigger value="options">Opções</TabsTrigger>
      </TabsList>
      <TabsContent value="examples" class="menu-section">
        <section class="generator" aria-labelledby="generator-title">
          <h3 id="generator-title">Formatos da árvore</h3>
          <p>Cada semente escolhe um formato diferente da árvore ativa, com valores de 1 até a quantidade de nós.</p>
          <div class="seed-inputs">
            <label for="lab-random-count">Quantidade de nós<input id="lab-random-count" v-model="count" type="number" inputmode="numeric" min="1" max="63" :aria-invalid="!validCount" aria-describedby="lab-generator-note"></label>
            <label for="lab-random-seed">Semente<input id="lab-random-seed" v-model="seed" type="text" inputmode="numeric" pattern="[0-9]*" :disabled="shapeCount === 1n" :aria-invalid="!validSeed" aria-describedby="lab-generator-note"></label>
          </div>
          <p id="lab-generator-note" class="generator-note" :class="{ invalid: !validCount || !validSeed }">{{ generatorNote }}</p>
          <div v-if="sequence.length" class="seed-preview" aria-label="Ordem de inserção do formato escolhido"><span v-for="(op, index) in sequence.slice(0, 8)" :key="index">{{ 'k' in op ? op.k : '' }}</span><span v-if="sequence.length > 8" class="preview-rest">+{{ sequence.length - 8 }}</span></div>
          <button type="button" class="generate-button" :disabled="!validCount || !validSeed" @click="generate"><Icon name="lucide:shuffle" />Gerar árvore</button>
          <span v-if="generated" class="generator-status" role="status">Sequência atualizada · semente {{ settings.randomSeed }}</span>
        </section>
        <div class="examples-heading"><h3>Exemplos guiados</h3><label class="sr-only" for="lab-example-type">Árvore dos exemplos</label><select id="lab-example-type" v-model="presetType"><option value="avl">AVL</option><option value="rb">Rubro-Negra</option><option value="bst">ABB</option></select></div>
        <p class="section-description">Cada exemplo abre no primeiro passo. Avance para ver a decisão acontecer.</p>
        <div class="menu-presets">
          <button v-for="preset in filteredPresets" :key="preset.id" type="button" @click="emit('preset', preset.ops, preset.type)"><span><strong>{{ preset.title }}</strong><small>{{ preset.description }}</small></span><Icon name="lucide:arrow-right" /></button>
        </div>
      </TabsContent>
      <TabsContent value="explore" class="menu-section">
        <h3>Percursos</h3><p class="section-description">Visite os nós em outra ordem e acompanhe a saída.</p>
        <div class="menu-list">
          <button v-for="[order, label, description] in [['in', 'In-ordem', 'Esquerda, raiz, direita · chaves em ordem crescente'], ['pre', 'Pré-ordem', 'Raiz, esquerda, direita'], ['post', 'Pós-ordem', 'Esquerda, direita, raiz'], ['level', 'Por nível', 'De cima para baixo, usando uma fila']] as const" :key="order" type="button" @click="emit('operation', { t: 'walk', order })"><span>{{ label }}<small>{{ description }}</small></span><Icon name="lucide:list-ordered" /></button>
        </div>
        <h3 class="group-title">Consultas</h3>
        <div class="menu-list">
          <button type="button" @click="emit('operation', { t: 'min' })">Menor valor<Icon name="lucide:chevrons-left" /></button>
          <button type="button" @click="emit('operation', { t: 'max' })">Maior valor<Icon name="lucide:chevrons-right" /></button>
          <p>Sucessor e predecessor usam o primeiro número do campo do laboratório.</p>
          <button type="button" :disabled="!validKey" @click="emit('operation', { t: 'succ', k: key })"><span>Sucessor de {{ validKey ? key : '…' }}<small>Próximo valor maior</small></span><Icon name="lucide:arrow-right" /></button>
          <button type="button" :disabled="!validKey" @click="emit('operation', { t: 'pred', k: key })"><span>Predecessor de {{ validKey ? key : '…' }}<small>Próximo valor menor</small></span><Icon name="lucide:arrow-left" /></button>
          <button type="button" @click="emit('text')">Ver árvore como texto<Icon name="lucide:list" /></button>
        </div>
      </TabsContent>
      <TabsContent value="options" class="menu-section">
        <p class="saved-note"><Icon name="lucide:check" />Suas escolhas ficam salvas neste aparelho.</p>
        <h3>Reprodução</h3>
        <div class="select-row"><label for="lab-playback-speed">Velocidade</label><select id="lab-playback-speed" v-model="settings.speed"><option v-for="speed in [.5, 1, 1.5, 2, 4]" :key="speed" :value="speed">{{ speed }}×</option></select></div>
        <div class="select-row"><label for="lab-granularity">Passos</label><select id="lab-granularity" v-model="settings.granularity"><option value="detailed">Todos os passos</option><option value="summary">Só os principais</option></select></div>
        <label v-for="[field, label, description] in playback" :key="field" class="switch-row"><span>{{ label }}<small>{{ description }}</small></span><SwitchRoot v-model="settings[field]" :aria-label="label" class="setting-switch"><SwitchThumb class="switch-thumb" /></SwitchRoot></label>
        <h3 class="group-title">Diagrama</h3>
        <label v-for="[field, label] in views" :key="field" class="switch-row"><span>{{ label }}</span><SwitchRoot v-model="settings[field]" :aria-label="label" class="setting-switch"><SwitchThumb class="switch-thumb" /></SwitchRoot></label>
        <h3 class="group-title">Entrada de números</h3>
        <label v-for="[field, label, description] in keyboard" :key="field" class="switch-row"><span>{{ label }}<small>{{ description }}</small></span><SwitchRoot v-model="settings[field]" :aria-label="label" class="setting-switch"><SwitchThumb class="switch-thumb" /></SwitchRoot></label>
        <h3 class="group-title">Ajuda e compartilhamento</h3>
        <div class="menu-list">
          <button type="button" @click="emit('concepts')">Conceitos no laboratório<Icon name="lucide:book-open" /></button>
          <button type="button" @click="emit('help')">Como usar o laboratório<Icon name="lucide:help-circle" /></button>
          <button type="button" @click="emit('legend')">Legenda dos destaques<Icon name="lucide:info" /></button>
          <button type="button" @click="emit('share')">Compartilhar esta sequência<Icon name="lucide:share-2" /></button>
          <NuxtLink to="/ajustes">Tema, texto e outros ajustes<Icon name="lucide:settings" /></NuxtLink>
        </div>
      </TabsContent>
    </TabsRoot>
  </div>
</template>
<style scoped>
.lab-menu { padding-bottom: 4px; }
.menu-start { display: grid; gap: 6px; margin-bottom: 16px; }
.menu-start > button { display: flex; align-items: center; gap: 12px; width: 100%; min-height: 64px; padding: 10px 12px; border: 1px solid var(--border); border-radius: 12px; background: var(--surface-2); text-align: left; }
.menu-start > button > span { flex: 1; }
.menu-start > button > :deep(.iconify):first-child { color: var(--accent); }
.lab-menu button, .lab-menu a, .lab-menu select, .lab-menu input { transition: background-color .18s ease, border-color .18s ease, transform .14s ease; }
.lab-menu button:active { transform: scale(.98); }
.lab-menu small { display: block; font-size: 12px; line-height: 1.55; color: var(--muted); margin-top: 3px; }
.menu-tabs { display: flex; gap: 4px; border-bottom: 1px solid var(--border); margin-bottom: 20px; }
.menu-tabs button { flex: 1; min-width: 0; min-height: 48px; color: var(--muted); font-size: 14px; border-bottom: 2px solid transparent; }
.menu-tabs button[data-state='active'] { color: var(--accent); border-bottom-color: var(--accent); }
.menu-section { animation: panel-enter .2s ease both; }
.menu-section h3 { font-size: 14px; font-weight: 600; margin: 0 0 8px; }
.section-description, .generator p, .menu-list p { color: var(--muted); font-size: 12px; line-height: 1.65; margin: 6px 0 12px; }
.generator { padding: 14px; border: 1px solid var(--border); border-radius: 14px; background: var(--surface-2); margin-bottom: 24px; }
.seed-inputs { display: flex; gap: 12px; }
.seed-inputs label { flex: 1; min-width: 0; color: var(--muted); font-size: 12px; line-height: 1.5; }
.seed-inputs input { display: block; width: 100%; min-height: 48px; margin-top: 7px; padding: 10px; border: 1px solid var(--border-strong); border-radius: 10px; background: var(--surface-1); color: var(--text); font: 14px 'JetBrains Mono', monospace; }
.generator .generator-note { margin: 8px 0; font-size: 11px; }
.generator-note { overflow-wrap: anywhere; }
.seed-inputs input:disabled { color: var(--muted); opacity: .7; }
.generator-note.invalid { color: var(--danger, #d6586c); }
.seed-preview { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; margin: 12px 0; }
.seed-preview > span { padding: 5px 7px; color: var(--text); background: var(--surface-3); border-radius: 6px; font: 12px 'JetBrains Mono', monospace; }
.seed-preview .preview-rest { color: var(--muted); }
.generate-button { display: flex; align-items: center; justify-content: center; gap: 8px; width: 100%; min-height: 48px; background: var(--accent); color: var(--bg); border-radius: 10px; font-size: 14px; font-weight: 600; }
.generator-status { display: block; color: var(--muted); margin-top: 9px; font-size: 11px; line-height: 1.5; }
.examples-heading { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.examples-heading h3 { margin: 0; }
.lab-menu select { min-height: 48px; max-width: 180px; padding: 8px 10px; border: 1px solid var(--border-strong); border-radius: 10px; background: var(--surface-2); color: var(--text); font-size: 12px; }
.menu-presets { display: grid; gap: 2px; }
.menu-presets button { display: flex; align-items: center; justify-content: space-between; gap: 12px; min-height: 72px; padding: 12px 4px; border-bottom: 1px solid var(--border); text-align: left; }
.menu-presets button > span { min-width: 0; }
.menu-presets strong { font-size: 14px; font-weight: 500; }
.menu-presets :deep(.iconify), .menu-list :deep(.iconify) { color: var(--muted); flex-shrink: 0; }
.menu-list > button, .menu-list > a { width: 100%; min-height: 56px; display: flex; align-items: center; justify-content: space-between; gap: 12px; border-bottom: 1px solid var(--border); padding: 10px 4px; text-align: left; font-size: 14px; }
.menu-section .group-title { margin-top: 24px; }
.saved-note { display: flex; align-items: center; gap: 7px; color: var(--muted); font-size: 12px; line-height: 1.6; margin: 0 0 20px; }
.saved-note :deep(.iconify) { color: var(--accent); }
.switch-row, .select-row { display: flex; min-height: 64px; align-items: center; justify-content: space-between; gap: 16px; border-bottom: 1px solid var(--border); padding: 8px 0; font-size: 13px; }
.select-row select { flex-shrink: 0; }
.switch-row > span { flex: 1; }
.setting-switch { position: relative; flex-shrink: 0; width: 56px; min-width: 56px; height: 48px; padding: 14px 3px; background: transparent; border: 0; }
.setting-switch:before { content: ''; position: absolute; inset: 12px 2px; background: var(--surface-3); border: 1px solid var(--border-strong); border-radius: 999px; }
.setting-switch[data-state='checked']:before { background: var(--accent); border-color: var(--accent); }
.switch-thumb { position: relative; width: 18px; height: 18px; border-radius: 999px; display: block; background: var(--text); transform: translateX(3px); transition: transform .18s ease; }
.switch-thumb[data-state='checked'] { transform: translateX(29px); background: var(--bg); }
.reduce-motion .menu-section { animation: none; }
.reduce-motion button, .reduce-motion .switch-thumb { transition: none; }
@keyframes panel-enter { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: translateY(0); } }
@media (prefers-reduced-motion: reduce) { .menu-section { animation: none; }.lab-menu button, .switch-thumb { transition: none; } }
</style>

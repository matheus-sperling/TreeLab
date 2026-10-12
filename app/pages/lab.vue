<script setup lang="ts">
import { motion } from 'motion-v'
import type { ComponentPublicInstance } from 'vue'
import { usePlayer } from '../composables/usePlayer'
import { useUrlSync } from '../composables/useUrlSync'
import { useSheetStack } from '../composables/useSheetStack'
import { presets, seededSequence } from '../engine/presets'
import { useLabStore } from '../stores/lab'
import { useSettingsStore } from '../stores/settings'
import type { Op, TreeType } from '../engine/types'
import { parseValues } from '../components/lab/input'
definePageMeta({ layout: 'immersive' })
useHead({ title: 'Laboratório — TreeLab' })
const lab = useLabStore()
const settings = useSettingsStore().settings
const player = usePlayer()
const sync = useUrlSync()
const sheets = useSheetStack()
const toast = useToast()
interface CanvasControls { fit: () => void; focus: (id: number, safeBottom?: number) => void; focusSubtree: (id: number, safeBottom?: number) => void; clearFocus: () => void }
const canvas = shallowRef<CanvasControls | null>(null)
function setCanvas(instance: Element | ComponentPublicInstance | null) { if (instance) canvas.value = instance as unknown as CanvasControls }
const dock = useTemplateRef('dock')
let dockObserver: ResizeObserver | undefined
const value = ref('')
const error = ref('')
const keyboard = ref(false)
const selected = ref<number | null>(null)
const shake = ref(0)
const reducedSystem = usePreferredReducedMotion()
const reduced = computed(() => settings.reducedMotion || reducedSystem.value === 'reduce')
const existing = computed(() => Object.values(lab.result.final.nodes).map(node => node.key))
const types: { id: TreeType; label: string }[] = [{ id: 'bst', label: 'ABB' }, { id: 'avl', label: 'AVL' }, { id: 'rb', label: 'RN' }]
const sheetTitle = computed(() => ({ menu: 'Laboratório', details: 'Detalhes do passo', inspector: 'Inspecionar nó', tour: 'Seu primeiro experimento', legend: 'Legenda', text: 'Árvore como texto' })[sheets.current.value ?? 'menu'] ?? 'Laboratório')
const sheetOpen = computed({ get: () => sheets.current.value !== null, set: (open: boolean) => { if (!open) closeSheet() } })
watch(() => settings.speed, speed => { player.speed.value = speed }, { immediate: true })
watch(() => settings.granularity, value => { player.summarized.value = value === 'summary' }, { immediate: true })
watch(() => settings.pauseOnKey, value => { player.pauseKeyMoments.value = value }, { immediate: true })
watch(() => sheets.current.value, name => { if (name === null) { selected.value = null; canvas.value?.clearFocus() } })
watch(() => lab.cursor, () => { if (selected.value !== null && !lab.tree.nodes[selected.value]) selected.value = null })
function closeSheet() { sheets.close(); selected.value = null; canvas.value?.clearFocus() }
function openSheet(name: string) { if (name === 'details') player.pause(); sheets.open(name) }
function changeType(type: TreeType) {
  if (type === lab.type) return
  player.pause(); closeSheet(); lab.changeType(type)
  nextTick(() => canvas.value?.fit())
}
function run(action: 'i' | 'd' | 's') {
  const parsed = parseValues(value.value)
  error.value = parsed.error
  if (error.value) { shake.value++; keyboard.value = false; return }
  if (action === 'i') {
    const count = new Set([...existing.value, ...parsed.values]).size
    if (count > 63) { error.value = 'A árvore aceita até 63 nós.'; keyboard.value = false; toast.show(error.value); return }
  }
  const previous = [...lab.operations]
  player.append(parsed.values.map(k => ({ t: action, k })))
  if (!settings.keepKeyboard) keyboard.value = false
  toast.show(`${parsed.values.length === 1 ? 'Operação adicionada' : `${parsed.values.length} operações adicionadas`}.`, { label: 'Desfazer', run: () => { player.pause(); lab.replace(previous) } })
}
function preset(ops: Op[], type?: TreeType) {
  const previous = [...lab.operations], previousType = lab.type
  player.pause()
  if (type) lab.type = type
  lab.replace(ops); closeSheet(); keyboard.value = false
  nextTick(() => canvas.value?.fit())
  toast.show('Exemplo carregado.', { label: 'Desfazer', run: () => { player.pause(); lab.type = previousType; lab.replace(previous) } })
}
function emptyPreset(name: string) {
  const item = presets.find(preset => preset.id === name)
  preset(name === 'ordered' ? Array.from({ length: 7 }, (_, i) => ({ t: 'i', k: i + 1 })) : item?.ops ?? seededSequence(7))
}
function removeOperation(index: number) {
  const previous = [...lab.operations]
  player.pause(); lab.removeOperation(index)
  toast.show('Operação removida.', { label: 'Desfazer', run: () => { player.pause(); lab.replace(previous) } })
}
function clear() {
  const previous = [...lab.operations]
  player.pause(); lab.replace([]); closeSheet()
  toast.show('Sequência limpa.', { label: 'Desfazer', run: () => { player.pause(); lab.replace(previous) } })
}
function operation(op: Op) { closeSheet(); player.append([op]); keyboard.value = false }
function inspect(id: number) { player.pause(); selected.value = id; sheets.open('inspector'); nextTick(() => canvas.value?.focus(id, 90)) }
function inspectorAction(action: 'd' | 's', key: number) { closeSheet(); player.append([{ t: action, k: key }]) }
async function share() { try { if (await sync.share()) toast.show('Link pronto para compartilhar.') } catch { toast.show('Não foi possível copiar o link neste navegador.') } }
function doneTour() { try { localStorage.setItem('treelab-tour', 'seen') } catch { /* O tour continua disponível na ajuda. */ } closeSheet() }
function physicalKey(event: KeyboardEvent) {
  if (settings.systemKeyboard) return
  if (event.key === 'Enter') { event.preventDefault(); run('i') }
  else if (event.key === 'Backspace') { event.preventDefault(); value.value = value.value.slice(0, -1) }
  else if (/^[\d,\- ]$/.test(event.key)) { event.preventDefault(); value.value += event.key }
}
function dragged(_: unknown, info: { offset: { y: number } }) { if (info.offset.y > 40) keyboard.value = false }
onMounted(() => {
  const instance: unknown = dock.value
  const element = instance && typeof instance === 'object' && '$el' in instance ? instance.$el : instance
  if (element instanceof HTMLElement) {
    dockObserver = new ResizeObserver(() => document.documentElement.style.setProperty('--lab-dock-height', `${element.offsetHeight}px`))
    dockObserver.observe(element)
    document.documentElement.style.setProperty('--lab-dock-height', `${element.offsetHeight}px`)
  }
  try { if (!localStorage.getItem('treelab-tour')) { keyboard.value = !settings.systemKeyboard; sheets.open('tour') } }
  catch { keyboard.value = !settings.systemKeyboard }
})
onBeforeUnmount(() => { dockObserver?.disconnect(); document.documentElement.style.removeProperty('--lab-dock-height') })
</script>

<template>
  <main class="lab-screen" :class="{ 'keyboard-open': keyboard && !settings.systemKeyboard, 'left-handed': settings.leftHanded }">
    <h1 class="sr-only">Laboratório de árvores</h1>
    <header class="lab-appbar"><NuxtLink to="/" class="lab-back" aria-label="Voltar ao início"><Icon name="lucide:arrow-left" /></NuxtLink><div class="tree-segment" role="group" aria-label="Tipo de árvore"><button v-for="type in types" :key="type.id" :aria-pressed="lab.type === type.id" @click="changeType(type.id)"><motion.span v-if="lab.type === type.id" layout-id="tree-type" class="segment-indicator" :transition="{ type: 'spring', duration: reduced ? 0 : .24, bounce: .08 }" /><span>{{ type.label }}</span></button></div><UiIconButton icon="ellipsis" label="Abrir menu do laboratório" @click="openSheet('menu')" /></header>
    <LabOperationsBar @seek="player.seek" @remove="removeOperation" />
    <div class="lab-workspace">
      <NuxtErrorBoundary><div class="canvas-shell"><AnimatePresence><motion.div :key="lab.type" class="canvas-area" :initial="{ opacity: 0 }" :animate="{ opacity: 1 }" :exit="{ opacity: 0 }" :transition="{ duration: reduced ? .12 : .2 }"><LabTreeCanvas :ref="setCanvas" :tree="lab.tree" :type="lab.type" :step="lab.step" :seeking="lab.seeking" :speed="player.speed.value" :reduced="reduced" :selected="selected" :show-heights="settings.showHeights" :show-nils="settings.showNils" :show-letters="settings.showColors" :show-levels="settings.showLevels" @select="inspect" @empty="sheets.current.value === 'inspector' && closeSheet()" @details="openSheet('details')" @preset="emptyPreset" /></motion.div></AnimatePresence></div><template #error="{ clearError }"><div class="lab-error"><Icon name="lucide:info" /><h2>Vamos recomeçar?</h2><p>Não foi possível exibir esta sequência.</p><UiButton @click="player.pause(); lab.replace([]); clearError()">Reiniciar sequência</UiButton></div></template></NuxtErrorBoundary>
      <motion.section ref="dock" class="lab-dock" :layout="reduced ? false : 'size'" :transition="{ layout: { type: 'spring', duration: .35, bounce: .08 } }" aria-label="Painel de operações"><motion.div class="dock-grip" drag="y" :drag-constraints="{ top: 0, bottom: 0 }" :drag-elastic=".12" @drag-end="dragged"><span /></motion.div><LabNarration :playing="player.playing.value" @details="openSheet('details')" /><LabPlayerBar :player="player" /><div class="lab-actions"><motion.div :key="shake" class="value-field" :animate="shake && error ? { x: [0, -4, 4, -3, 3, 0] } : { x: 0 }" :transition="{ duration: reduced ? 0 : .24 }"><input v-model="value" :readonly="!settings.systemKeyboard" :inputmode="settings.systemKeyboard ? 'text' : 'none'" aria-label="Valor ou lista de inteiros" placeholder="10, 25, 7" :aria-invalid="Boolean(error)" :aria-describedby="error ? 'input-error' : undefined" @click="keyboard = !settings.systemKeyboard; error = ''" @keydown="physicalKey" @input="error = ''"><button v-if="value" type="button" aria-label="Limpar campo" @click="value = ''; error = ''"><Icon name="lucide:x" /></button></motion.div><UiButton class="action-search" aria-label="Buscar valores" @click="run('s')"><Icon name="lucide:search" /><span class="action-label">Buscar</span></UiButton><UiButton class="action-delete" aria-label="Remover valores" @click="run('d')"><Icon name="lucide:minus" /><span class="action-label">Remover</span></UiButton><UiButton class="action-insert" aria-label="Inserir valores" variant="primary" @click="run('i')"><Icon name="lucide:plus" /><span class="action-label">Inserir</span></UiButton></div><p v-if="error" id="input-error" class="input-error" role="status">{{ error }}</p><AnimatePresence><motion.div v-if="keyboard && !settings.systemKeyboard" :initial="{ opacity: 0, y: 8 }" :animate="{ opacity: 1, y: 0 }" :exit="{ opacity: 0, y: 8 }" :transition="{ duration: reduced ? .12 : .16 }"><LabNumberPad v-model="value" :existing="existing" :haptics="settings.haptics" @update:model-value="error = ''" @close="keyboard = false" /></motion.div></AnimatePresence></motion.section>
    </div>
    <UiBottomSheet v-model:open="sheetOpen" :history="false" :title="sheetTitle" :modal="!['details', 'inspector'].includes(sheets.current.value ?? '')"><LabMenu v-if="sheets.current.value === 'menu'" :value="value" @preset="preset" @operation="operation" @share="share" @clear="clear" @help="sheets.open('tour')" @legend="sheets.open('legend')" @text="sheets.open('text')" /><LabDetails v-else-if="sheets.current.value === 'details'" :player="player" /><LabInspector v-else-if="sheets.current.value === 'inspector' && selected !== null" :id="selected" @action="inspectorAction" @focus="canvas?.focusSubtree($event, 90)" @close="closeSheet" /><LabOnboarding v-else-if="sheets.current.value === 'tour'" @done="doneTour" /><LabLegend v-else-if="sheets.current.value === 'legend'" /><LabTreeText v-else-if="sheets.current.value === 'text'" :tree="lab.tree" /></UiBottomSheet>
  </main>
</template>

<style scoped>
.lab-screen { height: 100dvh; display: flex; flex-direction: column; overflow: hidden; overscroll-behavior: none; background: var(--bg); padding-top: env(safe-area-inset-top); }.lab-appbar { flex-shrink: 0; height: 56px; display: flex; align-items: center; justify-content: space-between; padding: 0 16px; gap: 8px; }.lab-back { width: 48px; height: 48px; display: grid; place-items: center; }.tree-segment { display: flex; gap: 8px; padding: 3px; border: 1px solid var(--border); border-radius: 12px; background: var(--surface-1); }.tree-segment button { position: relative; min-height: 48px; width: 76px; font-size: 13px; font-weight: 600; color: var(--muted); }.tree-segment button[aria-pressed='true'] { color: var(--text); }.tree-segment button > span:last-child { position: relative; z-index: 1; }.segment-indicator { position: absolute; inset: 0; background: var(--surface-3); border-radius: 9px; }.lab-workspace { display: flex; flex-direction: column; flex: 1; min-height: 0; }.canvas-shell { position: relative; flex: 1; min-height: 280px; overflow: hidden; }.canvas-area { position: absolute; inset: 0; overflow: hidden; }.lab-dock { flex-shrink: 0; position: relative; border-top: 1px solid var(--border); border-radius: 20px 20px 0 0; background: var(--surface-1); padding: 0 12px calc(max(12px, env(safe-area-inset-bottom)) + 8px); }.dock-grip { position: absolute; top: -9px; left: 25%; width: 50%; height: 16px; display: grid; place-items: center; touch-action: none; }.dock-grip span { width: 32px; height: 3px; background: var(--border-strong); border-radius: 999px; }.lab-actions { display: flex; gap: 8px; padding-top: 8px; align-items: center; }.value-field { display: flex; flex: 1; min-width: 88px; min-height: 48px; border: 1px solid var(--border-strong); border-radius: 10px; background: var(--bg); }.value-field input { min-height: 48px; flex: 1; width: 100%; min-width: 0; background: transparent; padding: 10px; font: 16px 'JetBrains Mono', monospace; outline: none; }.value-field input[aria-invalid='true'] { color: var(--violation); }.value-field:focus-within { border-color: var(--accent); }.value-field input::placeholder { font-size: 12px; color: var(--muted); }.value-field > button { width: 48px; min-height: 48px; flex-shrink: 0; }.lab-actions :deep(.ui-button) { padding: 0 8px; min-width: 48px; font-size: 11px; gap: 4px; }.lab-actions :deep(.iconify) { width: 18px; height: 18px; }.input-error { font-size: 12px; color: var(--violation); margin-top: 7px; }.left-handed .lab-actions { flex-direction: row-reverse; }.lab-error { flex: 1; display: grid; place-content: center; text-align: center; gap: 16px; }.lab-error p { color: var(--muted); }.lab-error > :deep(.iconify) { margin: auto; width: 40px; height: 40px; color: var(--accent); }
@media (min-width: 380px) and (max-width: 411px) { .tree-segment button { width: 70px; } }
@media (max-width: 379px) { .tree-segment button { width: 64px; }.lab-actions :deep(.ui-button) { padding: 0; }.lab-actions :deep(.ui-button) .action-label { display: none; }.lab-actions :deep(.ui-button) { font-size: 0; }.lab-actions :deep(.ui-button) .iconify { font-size: initial; }.value-field { min-width: 88px; } }
@media (max-height: 800px) and (orientation: portrait) { .lab-appbar { height: 48px; }.lab-screen :deep(.operations-rail) { min-height: 44px; }.lab-screen :deep(.narration) { min-height: 62px; }.lab-screen :deep(.narration p) { min-height: 32px; font-size: 13px; }.lab-screen :deep(.player .ui-slider) { height: 24px; }.lab-screen :deep(.player-buttons) { height: 48px; }.lab-screen :deep(.play-button) { width: 48px; height: 48px; border-radius: 14px; }.lab-dock { padding-bottom: calc(max(8px, env(safe-area-inset-bottom)) + 8px); }.lab-actions { padding-top: 4px; }.lab-screen :deep(.cost-summary) { display: none; } }
@media (min-width: 768px), (orientation: landscape) and (max-height: 500px) { .lab-workspace { flex-direction: row; }.canvas-shell { min-width: 0; min-height: 0; }.lab-dock { width: 380px; border-top: 0; border-left: 1px solid var(--border); border-radius: 0; overflow-y: auto; padding-top: 12px; }.dock-grip { display: none; }.lab-screen :deep(.tree-canvas) { min-height: 0; } }
@media (orientation: landscape) and (max-height: 500px) { .lab-dock { width: 340px; }.lab-actions :deep(.ui-button) { padding: 0; width: 48px; }.lab-actions :deep(.ui-button) .action-label { display: none; }.lab-actions :deep(.ui-button) { font-size: 0; } }
@media (min-width: 1100px) { .lab-screen { max-width: 1440px; margin: auto; border-left: 1px solid var(--border); border-right: 1px solid var(--border); } }
</style>

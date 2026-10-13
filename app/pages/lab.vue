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
const editing = computed(() => keyboard.value && !settings.systemKeyboard)
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
watch(editing, value => { if (value) { player.pause(); player.release() } })
watch(() => lab.cursor, () => { if (selected.value !== null && !lab.tree.nodes[selected.value]) selected.value = null })
function closeSheet() { sheets.close(); selected.value = null; canvas.value?.clearFocus() }
function openSheet(name: string) { player.pause(); keyboard.value = false; sheets.open(name) }
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
  lab.replace(ops, true); closeSheet(); keyboard.value = false
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
  if (event.key === 'Escape') { event.preventDefault(); closeKeyboard() }
  else if (event.key === 'Enter') { event.preventDefault(); run('i') }
  else if (event.key === 'Backspace') { event.preventDefault(); value.value = value.value.slice(0, -1) }
  else if (/^[\d,\- ]$/.test(event.key) && value.value.length < 140) { event.preventDefault(); value.value += event.key }
}
function closeKeyboard() {
  keyboard.value = false
  nextTick(() => document.querySelector<HTMLButtonElement>('.lab-screen .play-button:not(:disabled), .lab-screen .action-insert')?.focus({ preventScroll: true }))
}
function openKeyboard() { keyboard.value = !settings.systemKeyboard; error.value = '' }
function dragged(_: unknown, info: { offset: { y: number } }) { if (info.offset.y > 40) closeKeyboard(); else if (info.offset.y < -40) openKeyboard() }
function toggleDock() { if (editing.value) closeKeyboard(); else openKeyboard() }
onMounted(() => {
  const instance: unknown = dock.value
  const element = instance && typeof instance === 'object' && '$el' in instance ? instance.$el : instance
  if (element instanceof HTMLElement) {
    dockObserver = new ResizeObserver(() => document.documentElement.style.setProperty('--lab-dock-height', `${element.offsetHeight}px`))
    dockObserver.observe(element)
    document.documentElement.style.setProperty('--lab-dock-height', `${element.offsetHeight}px`)
  }
  // Start with the canvas and input available; help is an explicit action.
})
onBeforeUnmount(() => { dockObserver?.disconnect(); document.documentElement.style.removeProperty('--lab-dock-height') })
</script>

<template>
  <main class="lab-screen" :class="{ 'keyboard-open': keyboard && !settings.systemKeyboard, 'left-handed': settings.leftHanded }">
    <h1 class="sr-only">Laboratório de árvores</h1>
    <header class="lab-appbar"><NuxtLink to="/" class="lab-back" aria-label="Voltar ao início"><Icon name="lucide:arrow-left" /></NuxtLink><div class="tree-segment" role="group" aria-label="Tipo de árvore"><button v-for="type in types" :key="type.id" :aria-pressed="lab.type === type.id" @click="changeType(type.id)"><motion.span v-if="lab.type === type.id" layout-id="tree-type" class="segment-indicator" :transition="{ type: 'spring', duration: reduced ? 0 : .24, bounce: .08 }" /><span>{{ type.label }}</span></button></div><UiIconButton icon="ellipsis" label="Abrir menu do laboratório" @click="openSheet('menu')" /></header>
    <LabOperationsBar @seek="player.seek" @remove="removeOperation" @edit="openSheet('menu'); settings.menuSection = 'sequence'" @clear="clear" />
    <div class="lab-workspace">
      <NuxtErrorBoundary><div class="canvas-shell"><AnimatePresence><motion.div :key="lab.type" class="canvas-area" :initial="{ opacity: 0 }" :animate="{ opacity: 1 }" :exit="{ opacity: 0 }" :transition="{ duration: reduced ? .12 : .2 }"><LabTreeCanvas :ref="setCanvas" :tree="lab.tree" :type="lab.type" :step="lab.step" :seeking="lab.seeking" :speed="player.speed.value" :reduced="reduced" :selected="selected" :show-heights="settings.showHeights" :show-nils="settings.showNils" :show-letters="settings.showColors" :show-levels="settings.showLevels" @select="inspect" @empty="sheets.current.value === 'inspector' && closeSheet()" @details="openSheet('details')" @preset="emptyPreset" /></motion.div></AnimatePresence></div><template #error="{ clearError }"><div class="lab-error"><Icon name="lucide:info" /><h2>Vamos recomeçar?</h2><p>Não foi possível exibir esta sequência.</p><UiButton @click="player.pause(); lab.replace([]); clearError()">Reiniciar sequência</UiButton></div></template></NuxtErrorBoundary>
      <motion.section ref="dock" class="lab-dock" :layout="reduced ? false : 'size'" :transition="{ layout: { type: 'spring', duration: .35, bounce: .08 } }" aria-label="Painel de operações">
        <motion.div class="dock-grip" drag="y" :drag-constraints="{ top: 0, bottom: 0 }" :drag-elastic=".12" @drag-end="dragged"><button type="button" :aria-label="editing ? 'Recolher painel de entrada' : 'Expandir painel de entrada'" :aria-expanded="editing" @click="toggleDock"><span /><Icon :name="editing ? 'lucide:chevron-down' : 'lucide:chevron-up'" /></button></motion.div>
        <motion.div v-if="!editing" class="lab-playback" :initial="{ opacity: 0 }" :animate="{ opacity: 1 }" :transition="{ duration: reduced ? .12 : .16 }">
          <LabNarration :playing="player.playing.value" @details="openSheet('details')" />
          <LabPlayerBar :player="player" />
        </motion.div>
        <LabOperationComposer v-model="value" :editing="editing" :system-keyboard="settings.systemKeyboard" :error="error" :shake="shake" :reduced="reduced" :existing="existing" :haptics="settings.haptics" :left-handed="settings.leftHanded" @open="openKeyboard" @close="closeKeyboard" @clear-error="error = ''" @submit="run" @input-key="physicalKey" />
      </motion.section>
    </div>
    <UiBottomSheet v-model:open="sheetOpen" :history="false" :title="sheetTitle" :modal="!['details', 'inspector'].includes(sheets.current.value ?? '')"><LabMenu v-if="sheets.current.value === 'menu'" :value="value" @preset="preset" @generate="ops => { player.pause(); lab.replace(ops, true); nextTick(() => canvas?.fit()) }" @operation="operation" @share="share" @clear="clear" @help="sheets.open('tour')" @legend="sheets.open('legend')" @text="sheets.open('text')" /><LabDetails v-else-if="sheets.current.value === 'details'" :player="player" /><LabInspector v-else-if="sheets.current.value === 'inspector' && selected !== null" :id="selected" @action="inspectorAction" @focus="canvas?.focusSubtree($event, 90)" @close="closeSheet" /><LabOnboarding v-else-if="sheets.current.value === 'tour'" @done="doneTour" /><LabLegend v-else-if="sheets.current.value === 'legend'" /><LabTreeText v-else-if="sheets.current.value === 'text'" :tree="lab.tree" /></UiBottomSheet>
  </main>
</template>

<style scoped>
.lab-screen { height:100dvh; display:flex; flex-direction:column; overflow:hidden; overscroll-behavior:none; background:var(--bg); padding-top:env(safe-area-inset-top); }
.lab-appbar { flex-shrink:0; height:56px; display:flex; align-items:center; justify-content:space-between; padding:0 16px; gap:8px; }
.lab-back { width:48px; height:48px; display:grid; place-items:center; }
.tree-segment { display:flex; gap:8px; padding:3px; border:1px solid var(--border); border-radius:12px; background:var(--surface-1); }
.tree-segment button { position:relative; min-height:48px; width:76px; font-size:13px; font-weight:600; color:var(--muted); }
.tree-segment button[aria-pressed='true'] { color:var(--text); }
.tree-segment button>span:last-child { position:relative; z-index:1; }
.segment-indicator { position:absolute; inset:0; background:var(--surface-3); border-radius:9px; }
.lab-workspace { display:flex; flex-direction:column; flex:1; min-height:0; }
.canvas-shell { position:relative; flex:1; min-height:0; overflow:hidden; }
.canvas-area { position:absolute; inset:0; overflow:hidden; }
.lab-dock { flex-shrink:0; max-height:calc(100% - 70px); overflow-y:auto; overscroll-behavior:contain; position:relative; border-top:1px solid var(--border); border-radius:20px 20px 0 0; background:var(--surface-1); padding:0 16px calc(max(20px,env(safe-area-inset-bottom)) + 8px); }
.lab-playback { container:lab-controls / inline-size; }
.dock-grip { height:28px; display:grid; place-items:center; touch-action:none; }.dock-grip button { display:flex; align-items:center; justify-content:center; gap:8px; min-height:28px; width:100%; color:var(--muted); }.dock-grip :deep(.iconify) { width:14px; height:14px; }
.dock-grip span { width:32px; height:3px; background:var(--border-strong); border-radius:999px; }
.lab-error { flex:1; display:grid; place-content:center; text-align:center; gap:16px; }
.lab-error p { color:var(--muted); }
.lab-error>:deep(.iconify) { margin:auto; width:40px; height:40px; color:var(--accent); }
@media(min-width:380px) and (max-width:411px) { .tree-segment button { width:70px; } }
@media(max-width:379px) { .tree-segment button { width:64px; } }
@media(max-height:800px) and (orientation:portrait) {
  .lab-appbar { height:48px; }.tree-segment { padding:0; border:0; background:transparent; }
  .lab-screen :deep(.operations-rail) { min-height:44px; }.lab-screen :deep(.narration) { min-height:62px; }
  .lab-screen :deep(.narration p) { min-height:32px; font-size:13px; }
  .lab-screen :deep(.player-buttons) { height:48px; }.lab-screen :deep(.play-button) { width:78px; height:48px; border-radius:14px; }
  .lab-dock { padding-bottom:calc(max(20px,env(safe-area-inset-bottom)) + 8px); }.lab-screen :deep(.cost-summary) { display:none; }
}
@media(min-width:768px),(orientation:landscape) and (max-height:500px) {
  .lab-workspace { flex-direction:row; }.canvas-shell { min-width:0; min-height:0; }
  .lab-dock { width:380px; border-top:0; border-left:1px solid var(--border); border-radius:0; overflow-y:auto; padding-top:12px; }
  .dock-grip { display:none; }.lab-screen :deep(.tree-canvas) { min-height:0; }
}
@media(orientation:landscape) and (max-height:500px) {
  .lab-dock { width:340px; max-height:100%; }
  .keyboard-open :deep(.operations-rail) { display:none; }
  .keyboard-open .lab-dock { padding-top:0; padding-bottom:calc(max(20px,env(safe-area-inset-bottom)) + 8px); }
}
@media(min-width:1100px) { .lab-screen { max-width:1440px; margin:auto; border-left:1px solid var(--border); border-right:1px solid var(--border); } }
</style>

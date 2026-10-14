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
const value = ref('')
const error = ref('')
const desktop = useMediaQuery('(min-width: 1024px)')
const nativeInput = computed(() => desktop.value || settings.systemKeyboard)
const keyboard = ref(false)
const collapsed = ref(false)
const dockResizing = ref(false)
const dockOcclusion = ref({ bottom: 0, right: 0 })
const currentSummary = computed(() => lab.operations.length ? 'Sua sequência está pronta para continuar.' : 'Comece inserindo seu primeiro número.')
const editing = computed(() => keyboard.value && !nativeInput.value)
const selected = ref<number | null>(null)
const shake = ref(0)
const reducedSystem = usePreferredReducedMotion()
const reduced = computed(() => settings.reducedMotion || reducedSystem.value === 'reduce')
const existing = computed(() => Object.values(lab.result.final.nodes).map(node => node.key))
const types: { id: TreeType; label: string }[] = [{ id: 'bst', label: 'ABB' }, { id: 'avl', label: 'AVL' }, { id: 'rb', label: 'RN' }]
const sheetTitle = computed(() => ({ menu: 'Laboratório', details: 'Detalhes do passo', inspector: 'Inspecionar nó', tour: 'Seu primeiro experimento', legend: 'Legenda', text: 'Árvore como texto', sequence: 'Sua sequência', concepts: 'Conceitos no laboratório' })[sheets.current.value ?? 'menu'] ?? 'Laboratório')
const sheetOpen = computed({ get: () => sheets.current.value !== null, set: (open: boolean) => { if (!open) closeSheet() } })
watch(() => settings.speed, speed => { player.speed.value = speed }, { immediate: true })
watch(() => settings.granularity, value => { player.summarized.value = value === 'summary' }, { immediate: true })
watch(() => settings.pauseOnKey, value => { player.pauseKeyMoments.value = value }, { immediate: true })
watch(() => sheets.current.value, name => { toast.suspended.value = name !== null; if (name === null) { selected.value = null; canvas.value?.clearFocus() } })
watch(keyboard, value => { if (value) { player.pause(); player.release() } })
watch(desktop, value => { if (value) keyboard.value = false })
watch(() => lab.cursor, () => { if (selected.value !== null && !lab.tree.nodes[selected.value]) selected.value = null })
function closeSheet() { sheets.close(); selected.value = null; canvas.value?.clearFocus() }
function openSheet(name: string) { player.pause(); player.release(); keyboard.value = false; sheets.open(name) }
function emptyClicked() { if (sheets.current.value === 'inspector') closeSheet(); if (keyboard.value && settings.systemKeyboard) closeKeyboard() }
function changeType(type: TreeType) {
  if (type === lab.type) return
  player.pause(); closeSheet(); lab.changeType(type)
  nextTick(() => canvas.value?.fit())
}
function run(action: 'i' | 'd' | 's') {
  const parsed = parseValues(value.value)
  error.value = parsed.error
  if (error.value) { shake.value++; if (!settings.systemKeyboard) keyboard.value = false; return }
  if (action === 'i') {
    const count = new Set([...existing.value, ...parsed.values]).size
    if (count > 63) { error.value = 'A árvore aceita até 63 nós.'; if (!settings.systemKeyboard) keyboard.value = false; toast.show(error.value); return }
  }
  const previous = [...lab.operations]
  player.append(parsed.values.map(k => ({ t: action, k })))
  if (desktop.value) { keyboard.value = false; nextTick(() => document.querySelector<HTMLInputElement>('#lab-values')?.focus({ preventScroll: true })) }
  else if (!settings.keepKeyboard) { keyboard.value = false; document.querySelector<HTMLInputElement>('#lab-values')?.blur() }
  else { player.pause(); nextTick(() => document.querySelector<HTMLInputElement>('#lab-values')?.focus({ preventScroll: true })) }
  toast.show(`${parsed.values.length === 1 ? 'Operação adicionada' : `${parsed.values.length} operações adicionadas`}.`, { label: 'Desfazer', run: () => { player.pause(); lab.replace(previous) } })
}
function preset(ops: Op[], type?: TreeType) {
  const previous = [...lab.operations], previousType = lab.type
  player.pause()
  if (type) lab.type = type
  lab.replace(ops, 'start'); closeSheet(); keyboard.value = false; collapsed.value = false
  nextTick(() => canvas.value?.fit())
  toast.show('Exemplo carregado.', { label: 'Desfazer', run: () => { player.pause(); lab.type = previousType; lab.replace(previous) } })
}
function generated(ops: Op[]) { player.pause(); lab.replace(ops, 'start'); nextTick(() => canvas.value?.fit()) }
function emptyPreset(name: string) {
  const item = presets.find(preset => preset.id === name)
  preset(name === 'ordered' ? Array.from({ length: 7 }, (_, i) => ({ t: 'i', k: i + 1 })) : item?.ops ?? seededSequence(7))
}
function clear() {
  const previous = [...lab.operations]
  player.pause(); lab.replace([]); value.value = ''; error.value = ''; keyboard.value = false; collapsed.value = false; closeSheet()
  toast.show('Sequência limpa.', { label: 'Desfazer', run: () => { player.pause(); lab.replace(previous) } })
}
function operation(op: Op) { closeSheet(); player.append([op]); keyboard.value = false }
function inspect(id: number) { player.pause(); selected.value = id; sheets.open('inspector'); nextTick(() => canvas.value?.focus(id, 90)) }
function inspectorAction(action: 'd' | 's', key: number) { closeSheet(); player.append([{ t: action, k: key }]) }
async function share() { try { if (await sync.share()) toast.show('Link pronto para compartilhar.') } catch { toast.show('Não foi possível copiar o link neste navegador.') } }
function doneTour() { try { localStorage.setItem('treelab-tour', 'seen') } catch { /* O tour continua disponível na ajuda. */ } closeSheet() }
function physicalKey(event: KeyboardEvent) {
  if (event.key === 'Escape') { event.preventDefault(); closeKeyboard() }
  else if (event.key === 'Enter' && !event.isComposing) { event.preventDefault(); run('i') }
  else if (nativeInput.value) return
  else if (event.key === 'Backspace') { event.preventDefault(); value.value = value.value.slice(0, -1) }
  else if (/^[\d,\- ]$/.test(event.key) && value.value.length < 140) { event.preventDefault(); value.value += event.key }
}
function inputBlurred() { if (nativeInput.value) setTimeout(() => { if (!(document.activeElement instanceof Element) || !document.activeElement.closest('.operation-composer')) keyboard.value = false }, 0) }
function closeKeyboard() {
  keyboard.value = false; collapsed.value = false
  nextTick(() => document.querySelector<HTMLButtonElement>('.lab-screen .play-button:not(:disabled), .lab-screen .action-insert')?.focus({ preventScroll: true }))
}
function openKeyboard() { collapsed.value = false; keyboard.value = !desktop.value; error.value = '' }
function compose() { openKeyboard(); nextTick(() => document.querySelector<HTMLInputElement>('#lab-values')?.focus({ preventScroll: true })) }
function toggleDock() { if (keyboard.value) closeKeyboard(); else { collapsed.value = !collapsed.value; if (collapsed.value) player.pause() } }
onMounted(() => {
  // First entry stays in the lab. Help is available on demand.
  if (new URLSearchParams(location.search).has('conceito')) openSheet('concepts')
})
onBeforeUnmount(() => { toast.suspended.value = false })
</script>

<template>
  <main class="lab-screen" :class="{ 'keyboard-open': keyboard, 'left-handed': settings.leftHanded }">
    <h1 class="sr-only">Laboratório de árvores</h1>
    <header class="lab-appbar"><NuxtLink to="/" class="lab-back" aria-label="Voltar ao início"><Icon name="lucide:arrow-left" /></NuxtLink><NuxtLink to="/" class="lab-brand" aria-label="TreeLab — início"><Icon name="lucide:git-branch" /><span>TreeLab<span class="accent">.</span></span></NuxtLink><span class="lab-context">Laboratório</span><div class="tree-segment" role="group" aria-label="Tipo de árvore"><button v-for="type in types" :key="type.id" :aria-pressed="lab.type === type.id" @click="changeType(type.id)"><motion.span v-if="lab.type === type.id" layout-id="tree-type" class="segment-indicator" :transition="{ type: 'spring', duration: reduced ? 0 : .24, bounce: .08 }" /><span>{{ type.label }}</span></button></div><nav class="lab-desktop-nav" aria-label="Navegação do laboratório"><NuxtLink to="/comparar"><Icon name="lucide:chart-no-axes-column" />Comparar árvores</NuxtLink><button type="button" @click="openSheet('concepts')"><Icon name="lucide:lightbulb" />Conceitos</button></nav><UiIconButton icon="ellipsis" label="Abrir menu do laboratório" @click="openSheet('menu')" /></header>
    <LabOperationsBar :reduced="reduced" @seek="player.seek" @edit="openSheet('sequence')" @clear="clear" />
    <div class="lab-workspace">
      <NuxtErrorBoundary><div class="canvas-shell"><AnimatePresence><motion.div :key="lab.type" class="canvas-area" :initial="{ opacity: 0 }" :animate="{ opacity: 1 }" :exit="{ opacity: 0 }" :transition="{ duration: reduced ? .12 : .2 }"><LabTreeCanvas :ref="setCanvas" :tree="lab.tree" :type="lab.type" :step="lab.step" :seeking="lab.seeking" :resizing="dockResizing" :occlusion="dockOcclusion" :speed="player.speed.value" :reduced="reduced" :selected="selected" :show-heights="settings.showHeights" :show-nils="settings.showNils" :show-letters="settings.showColors" :show-levels="settings.showLevels" @select="inspect" @empty="emptyClicked" @details="openSheet('details')" @preset="emptyPreset" @compose="compose" @concepts="openSheet('concepts')" /></motion.div></AnimatePresence></div><template #error="{ clearError }"><div class="lab-error"><Icon name="lucide:info" /><h2>Vamos recomeçar?</h2><p>Não foi possível exibir esta sequência.</p><UiButton @click="player.pause(); lab.replace([]); clearError()">Reiniciar sequência</UiButton></div></template></NuxtErrorBoundary>
      <LabDock v-model:collapsed="collapsed" :keyboard="keyboard" :reduced="reduced" @update:resizing="dockResizing = $event" @update:occlusion="dockOcclusion = $event" @toggle="toggleDock">
        <div v-if="collapsed" class="dock-peek"><p>{{ currentSummary }}</p><button type="button" @click="compose"><Icon name="lucide:plus" />Inserir</button></div>
        <motion.div v-if="!keyboard && !collapsed" class="lab-playback" :initial="{ opacity: 0 }" :animate="{ opacity: 1 }" :transition="{ duration: reduced ? .12 : .16 }">
          <LabNarration :playing="player.playing.value" @details="openSheet('details')" />
          <LabPlayerBar :player="player" />
        </motion.div>
        <LabOperationComposer v-if="!collapsed" v-model="value" :desktop="desktop" :editing="editing" :system-keyboard="nativeInput" :error="error" :shake="shake" :reduced="reduced" :existing="existing" :haptics="settings.haptics" :left-handed="settings.leftHanded" @open="openKeyboard" @close="closeKeyboard" @clear-error="error = ''" @blur="inputBlurred" @submit="run" @input-key="physicalKey" />
        <div v-if="!collapsed" class="desktop-shortcuts"><p>Atalhos de reprodução</p><span><kbd>Espaço</kbd> Reproduzir / pausar</span><span><kbd>←</kbd><kbd>→</kbd> Voltar / avançar um passo</span><small>Disponíveis com o diagrama em foco.</small></div>
      </LabDock>
    </div>
    <UiBottomSheet v-model:open="sheetOpen" :history="false" :title="sheetTitle" :modal="true"><LabMenu v-if="sheets.current.value === 'menu'" :value="value" :type="lab.type" @preset="preset" @generate="generated" @sequence="openSheet('sequence')" @concepts="openSheet('concepts')" @operation="operation" @share="share" @clear="clear" @help="sheets.open('tour')" @legend="sheets.open('legend')" @text="sheets.open('text')" /><LabSequenceEditor v-else-if="sheets.current.value === 'sequence'" :initial-index="lab.operationIndex" :reduced="reduced" @change="player.pause" @clear="clear" @close="closeSheet" /><LabConcepts v-else-if="sheets.current.value === 'concepts'" :type="lab.type" @example="preset" /><LabDetails v-else-if="sheets.current.value === 'details'" :player="player" /><LabInspector v-else-if="sheets.current.value === 'inspector' && selected !== null" :id="selected" @action="inspectorAction" @focus="canvas?.focusSubtree($event, 90)" @close="closeSheet" /><LabOnboarding v-else-if="sheets.current.value === 'tour'" @done="doneTour" /><LabLegend v-else-if="sheets.current.value === 'legend'" /><LabTreeText v-else-if="sheets.current.value === 'text'" :tree="lab.tree" /></UiBottomSheet>
  </main>
</template>

<style scoped>
.lab-screen { height:100dvh; display:flex; flex-direction:column; overflow:hidden; overscroll-behavior:none; background:var(--bg); padding-top:env(safe-area-inset-top); }
.lab-appbar { flex-shrink:0; height:56px; display:flex; align-items:center; justify-content:space-between; padding:0 12px; gap:4px; }
.lab-back { flex-shrink:0; width:44px; min-width:44px; height:48px; display:grid; place-items:center; }
.lab-brand,.lab-context,.lab-desktop-nav,.desktop-shortcuts { display:none; }
.tree-segment { display:flex; flex:1; min-width:0; max-width:300px; gap:4px; padding:3px; border:1px solid var(--border); border-radius:12px; background:var(--surface-1); }
.tree-segment button { position:relative; min-height:48px; flex:1; min-width:0; font-size:13px; font-weight:600; color:var(--muted); }
.tree-segment button[aria-pressed='true'] { color:var(--text); }
.tree-segment button>span:last-child { position:relative; z-index:1; }
.segment-indicator { position:absolute; inset:0; background:var(--surface-3); border-radius:9px; }
.lab-workspace { position:relative; display:flex; flex-direction:column; flex:1; min-height:0; }
.canvas-shell { position:absolute; inset:0; z-index:0; overflow:hidden; }
.canvas-area { position:absolute; inset:0; overflow:hidden; }
.lab-playback { container:lab-controls / inline-size; }
.dock-peek { display:flex; align-items:center; gap:12px; padding-bottom:4px; }.dock-peek p { flex:1; color:var(--muted); font-size:12px; line-height:1.5; }.dock-peek button { display:flex; gap:5px; align-items:center; min-height:44px; font-size:13px; color:var(--accent); }
.lab-error { flex:1; display:grid; place-content:center; text-align:center; gap:16px; }
.lab-error p { color:var(--muted); }
.lab-error>:deep(.iconify) { margin:auto; width:40px; height:40px; color:var(--accent); }
@media(max-height:800px) and (orientation:portrait) {
  .lab-appbar { height:48px; }.tree-segment { padding:0; border:0; background:transparent; }
  .lab-screen :deep(.operations-rail) { min-height:44px; }.lab-screen :deep(.narration) { min-height:62px; }
  .lab-screen :deep(.narration p) { min-height:32px; font-size:13px; }
  .lab-screen :deep(.player-buttons) { height:52px; }
  .lab-screen :deep(.cost-summary) { display:none; }
}
@media(min-width:768px),(orientation:landscape) and (max-height:500px) {
  .lab-workspace { flex-direction:row; }.canvas-shell { min-width:0; min-height:0; }
  .lab-screen :deep(.tree-canvas) { min-height:0; }
}
@media(min-width:1024px) {
  .lab-appbar { height:76px; padding:0 28px; gap:24px; border-bottom:1px solid var(--border); }
  .lab-back { display:none; }
  .lab-brand { display:flex; align-items:center; gap:10px; font-size:20px; font-weight:700; letter-spacing:-.05em; }
  .lab-brand :deep(.iconify) { color:var(--accent); width:25px; height:25px; }
  .lab-context { display:block; padding-left:24px; border-left:1px solid var(--border); color:var(--muted); font-size:13px; }
  .tree-segment { flex:none; width:240px; margin-left:8px; }
  .tree-segment button { min-height:40px; }
  .lab-desktop-nav { display:flex; align-items:center; gap:8px; margin-left:auto; }
  .lab-desktop-nav>a,.lab-desktop-nav>button { display:flex; align-items:center; gap:8px; min-height:40px; padding:0 12px; border-radius:10px; color:var(--muted); font-size:13px; }
  .lab-desktop-nav :deep(.iconify) { width:17px; height:17px; }
  .lab-desktop-nav>a:hover,.lab-desktop-nav>button:hover { color:var(--text); background:var(--surface-2); }
  .lab-screen :deep(.operations-rail) { min-height:60px; padding-left:28px; }
  .lab-screen :deep(.sequence-actions) { padding-right:20px; }
  .lab-screen :deep(.canvas-toolbar) { height:56px; padding:0 24px; }
  .lab-screen :deep(.metrics) { font-size:12px; gap:18px; }
  .lab-screen :deep(.canvas-details) { min-height:36px; font-size:13px; }
  .lab-playback { padding-bottom:20px; border-bottom:1px solid var(--border); }
  .lab-screen :deep(.narration) { padding:0; }
  .lab-screen :deep(.narration p) { margin-top:14px; font-size:15px; line-height:1.6; }
  .lab-screen :deep(.step-reason) { margin-top:10px; line-height:1.65; }
  .lab-screen :deep(.player) { margin-top:16px; }
  .lab-screen :deep(.player-timeline) { padding-inline:8px; }
  .lab-screen :deep(.player-buttons .icon-button) { width:34px; min-width:34px; }
  .lab-screen :deep(.player-buttons .icon-button .iconify) { width:18px; height:18px; }
  .lab-screen :deep(.play-button) { min-width:96px; }
  .lab-screen :deep(.speed-button) { min-width:36px; }
  .desktop-shortcuts { display:flex; flex-wrap:wrap; align-items:center; gap:10px 6px; margin-top:28px; padding:20px 0; border-top:1px solid var(--border); color:var(--muted); font-size:11px; }
  .desktop-shortcuts p { width:100%; color:var(--text); font-size:12px; font-weight:600; margin-bottom:2px; }
  .desktop-shortcuts>span { display:flex; align-items:center; gap:6px; width:100%; }
  .desktop-shortcuts kbd { display:inline-grid; place-items:center; min-width:24px; padding:4px 7px; border:1px solid var(--border); border-bottom-width:2px; border-radius:5px; font:10px 'JetBrains Mono',monospace; background:var(--surface-2); }
  .desktop-shortcuts small { margin-top:2px; font-size:11px; }
}
@media(min-width:1600px) { .lab-appbar { padding-inline:40px; }.lab-screen :deep(.operations-rail) { padding-left:40px; }.lab-screen :deep(.canvas-toolbar) { padding-inline:32px; } }
</style>

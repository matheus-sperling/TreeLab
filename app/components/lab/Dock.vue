<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'

const props = defineProps<{ keyboard: boolean; reduced: boolean }>()
const collapsed = defineModel<boolean>('collapsed', { required: true })
const emit = defineEmits<{ toggle: []; 'update:resizing': [value: boolean] }>()
const panel = ref<HTMLElement | null>(null)
const content = ref<HTMLElement | null>(null)
const scrollArea = ref<HTMLElement | null>(null)
const sidePanel = useMediaQuery('(min-width: 768px), (orientation: landscape) and (max-height: 500px)')
const workspaceHeight = ref(0)
const naturalHeight = ref(0)
const preferredHeight = ref<number | null>(null)
const keyboardHeight = ref<number | null>(null)
const resizing = ref(false)
watch(resizing, value => emit('update:resizing', value), { flush: 'sync' })
const maximumHeight = computed(() => {
  const available = workspaceHeight.value
  const diagram = Math.min(160, Math.max(60, available * .32))
  return Math.max(48, available - diagram)
})
const minimumHeight = computed(() => Math.min(128, maximumHeight.value))
function clamp(height: number) { return Math.min(maximumHeight.value, Math.max(minimumHeight.value, height)) }
const height = computed(() => {
  if (collapsed.value) return Math.min(naturalHeight.value, maximumHeight.value)
  return clamp((props.keyboard ? keyboardHeight.value : preferredHeight.value) ?? naturalHeight.value)
})
const panelStyle = computed(() => sidePanel.value || !naturalHeight.value ? undefined : { height: `${height.value}px` })
let workspaceObserver: ResizeObserver | undefined
let contentObserver: ResizeObserver | undefined
let panelObserver: ResizeObserver | undefined
let drag: { pointer: number; y: number; height: number; moved: boolean } | undefined

function saveHeight() {
  if (props.keyboard || preferredHeight.value === null) return
  try { localStorage.setItem('treelab:dock-height', String(preferredHeight.value)) } catch { /* Resizing stays available without storage. */ }
}
function setHeight(next: number) {
  collapsed.value = false
  if (props.keyboard) keyboardHeight.value = clamp(next)
  else preferredHeight.value = clamp(next)
}
function startResize(event: PointerEvent) {
  if (sidePanel.value || !event.isPrimary || event.button !== 0 || !panel.value) return
  event.preventDefault()
  const handle = event.currentTarget as HTMLElement
  handle.setPointerCapture(event.pointerId)
  drag = { pointer: event.pointerId, y: event.clientY, height: panel.value.offsetHeight, moved: false }
  resizing.value = true
}
function moveResize(event: PointerEvent) {
  if (!drag || event.pointerId !== drag.pointer) return
  const delta = drag.y - event.clientY
  if (!drag.moved && Math.abs(delta) < 3) return
  drag.moved = true
  setHeight(drag.height + delta)
}
function endResize(event: PointerEvent) {
  if (!drag || event.pointerId !== drag.pointer) return
  const handle = event.currentTarget as HTMLElement
  if (handle.hasPointerCapture(event.pointerId)) handle.releasePointerCapture(event.pointerId)
  if (drag.moved) saveHeight()
  drag = undefined
  resizing.value = false
}
function resizeWithKeys(event: KeyboardEvent) {
  if (sidePanel.value) return
  const step = event.shiftKey ? 64 : 24
  const next = event.key === 'ArrowUp' ? height.value + step : event.key === 'ArrowDown' ? height.value - step : event.key === 'Home' ? minimumHeight.value : event.key === 'End' ? maximumHeight.value : null
  if (next === null) return
  event.preventDefault()
  setHeight(next)
  saveHeight()
}
function measureContent() {
  if (!panel.value || !content.value) return
  const bottom = Number.parseFloat(getComputedStyle(panel.value).paddingBottom) || 0
  naturalHeight.value = 45 + content.value.offsetHeight + bottom
}
watch(() => props.keyboard, () => { keyboardHeight.value = null })
watch([() => props.keyboard, maximumHeight, naturalHeight], async () => {
  if (!props.keyboard) return
  await nextTick()
  // Keep the actions reachable when the phone keyboard reduces the viewport.
  scrollArea.value?.scrollTo({ top: scrollArea.value.scrollHeight })
}, { flush: 'post' })
onMounted(() => {
  try {
    const saved = Number(localStorage.getItem('treelab:dock-height'))
    if (Number.isFinite(saved) && saved >= 112) preferredHeight.value = saved
  } catch { /* The default height follows the content. */ }
  const workspace = panel.value?.parentElement
  if (workspace) {
    workspaceObserver = new ResizeObserver(() => { workspaceHeight.value = workspace.clientHeight })
    workspaceObserver.observe(workspace)
    workspaceHeight.value = workspace.clientHeight
  }
  if (content.value) {
    contentObserver = new ResizeObserver(measureContent)
    contentObserver.observe(content.value)
  }
  if (panel.value) {
    panelObserver = new ResizeObserver(() => document.documentElement.style.setProperty('--lab-dock-height', `${panel.value!.offsetHeight}px`))
    panelObserver.observe(panel.value)
  }
  measureContent()
})
onBeforeUnmount(() => {
  workspaceObserver?.disconnect(); contentObserver?.disconnect(); panelObserver?.disconnect()
  document.documentElement.style.removeProperty('--lab-dock-height')
})
</script>

<template>
  <section ref="panel" class="lab-dock" :class="{ collapsed, resizing, reduced }" :style="panelStyle" aria-label="Painel de operações">
    <div class="dock-grip">
      <div class="dock-resize-handle" role="separator" :tabindex="sidePanel ? -1 : 0" aria-label="Ajustar altura do painel de operações" aria-orientation="horizontal" :aria-valuemin="Math.round(collapsed ? Math.min(minimumHeight, height) : minimumHeight)" :aria-valuemax="Math.round(maximumHeight)" :aria-valuenow="Math.round(height)" :aria-valuetext="`${Math.round(height)} pixels; arraste ou use as setas para ajustar`" @pointerdown="startResize" @pointermove="moveResize" @pointerup="endResize" @pointercancel="endResize" @keydown="resizeWithKeys"><span class="grip-line" /><span class="dock-label">{{ keyboard ? 'Entrada de valores' : 'Passo a passo' }}</span></div>
      <button type="button" :aria-label="keyboard ? 'Voltar à reprodução' : collapsed ? 'Expandir controles' : 'Recolher controles'" :aria-expanded="!collapsed" @click="emit('toggle')"><Icon :name="collapsed ? 'lucide:chevron-up' : 'lucide:chevron-down'" /></button>
    </div>
    <div ref="scrollArea" class="dock-scroll"><div ref="content" class="dock-content"><slot /></div></div>
  </section>
</template>

<style scoped>
.lab-dock { flex-shrink:0; min-height:0; overflow:hidden; display:flex; flex-direction:column; position:relative; border-top:1px solid var(--border); border-radius:20px 20px 0 0; background:var(--surface-1); padding-bottom:max(24px,env(safe-area-inset-bottom)); transition:height .28s cubic-bezier(.4,0,.2,1); }
.lab-dock.resizing,.lab-dock.reduced { transition:none; }
.dock-grip { display:flex; align-items:center; flex-shrink:0; height:44px; padding-inline:16px 8px; }
.dock-resize-handle { display:flex; flex:1; align-items:center; gap:10px; align-self:stretch; cursor:ns-resize; touch-action:none; user-select:none; border-radius:10px; }
.dock-resize-handle:focus-visible { outline:2px solid var(--accent); outline-offset:-2px; }
.grip-line { width:32px; height:4px; border-radius:999px; background:var(--border-strong); transition:background .18s; }
.dock-resize-handle:hover .grip-line,.resizing .grip-line,.dock-resize-handle:focus-visible .grip-line { background:var(--accent); }
.dock-label { font-size:11px; color:var(--muted); }
.dock-grip button { flex-shrink:0; width:44px; height:44px; display:grid; place-items:center; color:var(--muted); border-radius:10px; }
.dock-grip button:active { background:var(--surface-2); }
.dock-grip :deep(.iconify) { width:16px; height:16px; }
.dock-scroll { min-height:0; flex:1; overflow-y:auto; overscroll-behavior:contain; scrollbar-width:thin; padding:0 16px; }
.dock-content { display:flow-root; }
@media(min-width:768px),(orientation:landscape) and (max-height:500px) {
  .lab-dock { width:380px; height:100%; max-height:100%; border-top:0; border-left:1px solid var(--border); border-radius:0; transition:none; }
  .dock-resize-handle { cursor:default; }.grip-line { display:none; }
}
@media(orientation:landscape) and (max-height:500px) { .lab-dock { width:340px; }.dock-grip { height:36px; }.dock-grip button { height:36px; }.dock-scroll { padding-top:0; } }
@media(prefers-reduced-motion:reduce) { .lab-dock,.grip-line { transition:none; } }
</style>

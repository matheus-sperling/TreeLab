<script setup lang="ts">
import { motion } from 'motion-v'
import { DialogRoot, DialogPortal, DialogOverlay, DialogContent, DialogTitle, DialogDescription, DialogClose } from 'reka-ui'
const open = defineModel<boolean>('open', { default: false })
const props = withDefaults(defineProps<{ title: string; modal?: boolean; history?: boolean }>(), { modal: true, history: true })
const desktop = useMediaQuery('(min-width: 1024px)')
let pushed = false
let previousFocus: HTMLElement | null = null
function popped() { if (pushed) { pushed = false; open.value = false } }
function restoreFocus(event: Event) { event.preventDefault(); previousFocus?.focus({ preventScroll: true }) }
onMounted(() => {
  window.addEventListener('popstate', popped)
  watch(open, value => {
    if (value) previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null
    if (!props.history) return
    if (value && !pushed) { window.history.pushState({ ...window.history.state, treeLabDialog: true }, '', `${location.pathname}${location.search}#dialog`); pushed = true }
    else if (!value && pushed) { pushed = false; window.history.back() }
  })
})
onBeforeUnmount(() => { window.removeEventListener('popstate', popped) })
function dragged(_: unknown, info: { offset: { y: number }; velocity: { y: number } }) { if (!desktop.value && (info.offset.y > 80 || info.velocity.y > 500)) open.value = false }
</script>
<template>
  <DialogRoot v-model:open="open" :modal="modal !== false">
    <DialogPortal><DialogOverlay v-if="modal !== false" class="sheet-overlay" />
      <DialogContent class="sheet-content" @escape-key-down="open = false" @close-auto-focus="restoreFocus">
        <motion.div class="sheet-titlebar" :drag="desktop ? false : 'y'" :drag-constraints="{ top: 0, bottom: 0 }" :drag-elastic=".15" @drag-end="dragged"><div class="sheet-handle" /><div class="sheet-header"><DialogTitle as="h2">{{ title }}</DialogTitle><DialogClose as-child><UiIconButton icon="x" label="Fechar painel" /></DialogClose></div></motion.div>
        <DialogDescription class="sheet-description">{{ title }}. Use o botão fechar para voltar.</DialogDescription><div class="sheet-body"><slot /></div>
      </DialogContent>
    </DialogPortal>
  </DialogRoot>
</template>
<style scoped>
@media (min-width:1024px) {
  .sheet-content { top:50%; bottom:auto; width:min(720px,calc(100vw - 96px)); max-height:calc(100dvh - 96px); padding:0; display:flex; flex-direction:column; overflow:hidden; border-radius:20px; transform:translate(-50%,-50%); box-shadow:0 24px 80px rgb(0 0 0 / .35); }
  .sheet-titlebar { flex-shrink:0; padding:18px 24px; border-bottom:1px solid var(--border); }
  .sheet-handle { display:none; }
  .sheet-header { gap:24px; margin-bottom:0; }
  .sheet-header h2 { font-size:1.25rem; }
  .sheet-body { min-height:0; overflow-y:auto; overscroll-behavior:contain; scrollbar-gutter:stable; scroll-padding-block:24px; padding:24px 28px 28px; }
}
@media (min-width:1024px) and (prefers-reduced-motion:no-preference) {
  .sheet-content[data-state='open'] { animation:dialog-enter .2s ease both; }
}
@keyframes dialog-enter { from { opacity:0; translate:0 8px; scale:.98; } to { opacity:1; translate:0 0; scale:1; } }
</style>

<script setup lang="ts">
import { motion } from 'motion-v'
import { DialogRoot, DialogPortal, DialogOverlay, DialogContent, DialogTitle, DialogDescription, DialogClose } from 'reka-ui'
const open = defineModel<boolean>('open', { default: false })
const props = withDefaults(defineProps<{ title: string; modal?: boolean; history?: boolean }>(), { modal: true, history: true })
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
function dragged(_: unknown, info: { offset: { y: number }; velocity: { y: number } }) { if (info.offset.y > 80 || info.velocity.y > 500) open.value = false }
</script>
<template>
  <DialogRoot v-model:open="open" :modal="modal !== false">
    <DialogPortal><DialogOverlay v-if="modal !== false" class="sheet-overlay" />
      <DialogContent class="sheet-content" @escape-key-down="open = false" @close-auto-focus="restoreFocus">
        <motion.div drag="y" :drag-constraints="{ top: 0, bottom: 0 }" :drag-elastic=".15" @drag-end="dragged"><div class="sheet-handle" /><div class="sheet-header"><DialogTitle as="h2">{{ title }}</DialogTitle><DialogClose as-child><UiIconButton icon="x" label="Fechar painel" /></DialogClose></div></motion.div>
        <DialogDescription class="sheet-description">{{ title }}. Use o botão fechar para voltar.</DialogDescription><slot />
      </DialogContent>
    </DialogPortal>
  </DialogRoot>
</template>

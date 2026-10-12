<script setup lang="ts">
import { motion } from 'motion-v'
import { DialogRoot, DialogPortal, DialogOverlay, DialogContent, DialogTitle, DialogDescription, DialogClose } from 'reka-ui'
const open = defineModel<boolean>('open', { default: false })
defineProps<{ title: string; modal?: boolean }>()
function dragged(_: unknown, info: { offset: { y: number }; velocity: { y: number } }) { if (info.offset.y > 80 || info.velocity.y > 500) open.value = false }
</script>
<template>
  <DialogRoot v-model:open="open" :modal="modal !== false">
    <DialogPortal><DialogOverlay v-if="modal !== false" class="sheet-overlay" />
      <DialogContent class="sheet-content" @escape-key-down="open = false">
        <motion.div drag="y" :drag-constraints="{ top: 0, bottom: 0 }" :drag-elastic=".15" @drag-end="dragged"><div class="sheet-handle" /><div class="sheet-header"><DialogTitle as="h2">{{ title }}</DialogTitle><DialogClose as-child><UiIconButton icon="x" label="Fechar painel" /></DialogClose></div></motion.div>
        <DialogDescription class="sheet-description">{{ title }}. Use o botão fechar para voltar.</DialogDescription><slot />
      </DialogContent>
    </DialogPortal>
  </DialogRoot>
</template>

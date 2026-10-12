<script setup lang="ts">
import { motion } from 'motion-v'
const { toasts, dismiss } = useToast()
</script>
<template><div class="toast-stack" role="status" aria-live="polite"><AnimatePresence><motion.div v-for="toast in toasts" :key="toast.id" class="toast" :initial="{ opacity: 0, y: 12 }" :animate="{ opacity: 1, y: 0 }" :exit="{ opacity: 0, y: 8 }" drag="x" :drag-constraints="{ left: 0, right: 0 }" @drag-end="dismiss(toast.id)"><span>{{ toast.message }}</span><button v-if="toast.action" @click="toast.action.run(); dismiss(toast.id)">{{ toast.action.label }}</button></motion.div></AnimatePresence></div></template>

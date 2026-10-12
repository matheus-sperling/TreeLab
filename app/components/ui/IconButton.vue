<script setup lang="ts">
import { motion } from 'motion-v'
defineProps<{ icon: string; label: string; disabled?: boolean; active?: boolean }>()
</script>
<template><motion.button type="button" :aria-label="label" :title="label" :disabled="disabled" :class="['icon-button', { accent: active }]" :while-tap="{ scale: .96 }"><Icon :name="icon.startsWith('lucide:') ? icon : `lucide:${icon}`" size="22" /></motion.button></template>

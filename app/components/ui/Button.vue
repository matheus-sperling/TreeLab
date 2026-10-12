<script setup lang="ts">
import { motion } from 'motion-v'
withDefaults(defineProps<{ variant?: 'primary' | 'secondary' | 'ghost'; type?: 'button' | 'submit'; disabled?: boolean }>(), { variant: 'secondary', type: 'button' })
</script>
<template><motion.button :type="type" :disabled="disabled" :class="['ui-button', variant]" :while-tap="{ scale: .96 }"><slot /></motion.button></template>

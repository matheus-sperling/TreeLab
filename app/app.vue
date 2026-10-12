<script setup lang="ts">
import { useSettingsStore } from './stores/settings'
const { settings } = useSettingsStore()
</script>
<template>
  <MotionConfig :reduced-motion="settings.reducedMotion ? 'always' : 'user'">
    <NuxtLayout><NuxtPage /></NuxtLayout>
    <UiToast />
    <ClientOnly><UiPwaStatus /></ClientOnly>
  </MotionConfig>
</template>

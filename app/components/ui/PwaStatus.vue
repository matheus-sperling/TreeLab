<script setup lang="ts">
const pwa = useNuxtApp().$pwa
const { show } = useToast()
onMounted(() => {
  if (pwa) watch(() => pwa.needRefresh, value => { if (value) show('Nova versão disponível.', { label: 'Atualizar', run: () => { void pwa.updateServiceWorker() } }) }, { immediate: true })
})
</script>
<template><span class="sr-only" aria-hidden="true" /></template>

<script setup lang="ts">
import type { NuxtError } from '#app'
const props = defineProps<{ error: NuxtError }>()
useHead({ title: props.error.statusCode === 404 ? 'Página não encontrada — TreeLab' : 'Vamos recomeçar — TreeLab' })
</script>
<template><main class="error-page"><Icon name="lucide:git-branch" size="48" class="accent" /><span class="eyebrow">TREELAB · {{ error.statusCode }}</span><h1>{{ error.statusCode === 404 ? 'Esse caminho não leva a um nó.' : 'Vamos recomeçar?' }}</h1><p class="muted">{{ error.statusCode === 404 ? 'A página que você procurou não existe. Volte ao início para continuar estudando.' : 'Ocorreu um problema ao abrir esta página. Seu progresso continua salvo neste dispositivo.' }}</p><UiButton variant="primary" @click="clearError({ redirect: '/' })">Voltar ao início <Icon name="lucide:arrow-right" /></UiButton></main></template>
<style scoped>.error-page{min-height:100dvh;display:flex;flex-direction:column;align-items:flex-start;justify-content:center;gap:20px;width:min(100%,620px);margin:auto;padding:32px}.error-page h1{max-width:420px}.error-page p{font-size:1rem;line-height:1.7;max-width:450px}</style>

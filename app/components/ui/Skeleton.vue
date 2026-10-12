<script setup lang="ts">withDefaults(defineProps<{ height?: string }>(), { height: '200px' })</script>
<template><div class="skeleton" :style="{ height }" aria-label="Carregando" role="status" /></template>

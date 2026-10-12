<script setup lang="ts">
import { motion } from 'motion-v'
const route = useRoute()
const tabs = [
  { to: '/', icon: 'house', label: 'Início' },
  { to: '/lab', icon: 'flask-conical', label: 'Laboratório' },
  { to: '/aprender', icon: 'book-open', label: 'Aprender' },
  { to: '/treinar', icon: 'target', label: 'Treinar' },
  { to: '/mais', icon: 'ellipsis', label: 'Mais' }
]
const active = (to: string) => to === '/' ? route.path === '/' : route.path.startsWith(to)
</script>
<template>
  <div class="default-shell">
    <header class="site-header"><NuxtLink to="/" class="brand"><Icon name="lucide:git-branch" size="25" /><span>TreeLab<span class="brand-dot">.</span></span></NuxtLink><NuxtLink to="/ajustes" class="icon-button" aria-label="Ajustes"><Icon name="lucide:settings" size="21" /></NuxtLink></header>
    <main><slot /></main>
    <nav class="tab-bar" aria-label="Navegação principal">
      <NuxtLink v-for="tab in tabs" :key="tab.to" :to="tab.to" :class="['tab-item', { active: active(tab.to) }]" :aria-current="active(tab.to) ? 'page' : undefined">
        <motion.span v-if="active(tab.to)" layout-id="active-tab" class="tab-indicator" :transition="{ duration: .2 }" />
        <Icon :name="`lucide:${tab.icon}`" size="22" /><span>{{ tab.label }}</span>
      </NuxtLink>
    </nav>
  </div>
</template>

<script setup lang="ts">
import { motion, animate, useMotionValue } from 'motion-v'
import { useSettingsStore } from '../stores/settings'
const route = useRoute()
const settings = useSettingsStore().settings
const reducedSystem = usePreferredReducedMotion()
const opacity = useMotionValue(1), y = useMotionValue(0)
let controls: ReturnType<typeof animate>[] = []
watch(() => route.path, () => {
  controls.forEach(control => control.stop())
  if (settings.reducedMotion || reducedSystem.value === 'reduce') { opacity.set(1); y.set(0); return }
  opacity.set(0); y.set(8)
  controls = [animate(opacity, 1, { duration: .2 }), animate(y, 0, { duration: .2 })]
})
onBeforeUnmount(() => controls.forEach(control => control.stop()))
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
    <main><motion.div :style="{ opacity, y }"><slot /></motion.div></main>
    <nav class="tab-bar" aria-label="Navegação principal">
      <NuxtLink v-for="tab in tabs" :key="tab.to" :to="tab.to" :class="['tab-item', { active: active(tab.to) }]" :aria-current="active(tab.to) ? 'page' : undefined">
        <motion.span v-if="active(tab.to)" layout-id="active-tab" class="tab-indicator" :transition="{ duration: .2 }" />
        <Icon :name="`lucide:${tab.icon}`" size="22" /><span>{{ tab.label }}<span v-if="tab.to === '/mais'" class="sr-only">: comparar, cola, glossário e ajustes</span></span>
      </NuxtLink>
    </nav>
  </div>
</template>

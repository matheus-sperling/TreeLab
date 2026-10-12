<script setup lang="ts">
import { treeLessonSlugs } from '../content/catalog'
const trees = [{ name: 'ABB', subtitle: 'O ponto de partida', icon: 'git-branch', to: 'bst', count: '01' }, { name: 'AVL', subtitle: 'Equilíbrio em cada passo', icon: 'scale', to: 'avl', count: '02' }, { name: 'Rubro-Negra', subtitle: 'Cor a serviço do equilíbrio', icon: 'circle-dot', to: 'rb', count: '03' }] as const
const resume = ref(false)
const progress = useProgressStore()
const completed = (type: keyof typeof treeLessonSlugs) => treeLessonSlugs[type].filter(slug => progress.progress.completedLessons.includes(slug)).length
onMounted(() => { progress.load(); try { const saved = JSON.parse(localStorage.getItem('treelab-lab') || '{}'); resume.value = Array.isArray(saved.ops) && saved.ops.length > 0 } catch { resume.value = false } })
useSeoMeta({ title: 'TreeLab — entenda as árvores' })
</script>
<template>
  <div class="page-shell home-page">
    <div class="eyebrow"><span class="status-dot" /> SEU LABORATÓRIO DE ÁRVORES</div>
    <h1>Veja a lógica.<br><span class="accent">Entenda a árvore.</span></h1>
    <p class="hero-copy muted">Explore, compare e pratique.<br>Cada operação, um passo de aprendizado.</p>
    <NuxtLink to="/lab" class="continue-card"><div class="continue-symbol"><Icon name="lucide:flask-conical" size="27" /></div><div><small class="eyebrow">APRENDA FAZENDO</small><strong>{{ resume ? 'Continuar de onde parou' : 'Entre no laboratório' }}</strong><span class="muted">Você controla o próximo passo.</span></div><Icon name="lucide:arrow-right" size="22" /></NuxtLink>
    <div class="section-heading"><h2>Três árvores. Uma lógica.</h2><span class="muted mono">01 — 03</span></div>
    <div class="tree-cards">
      <article v-for="tree in trees" :key="tree.to" class="tree-card"><div class="tree-card-head"><span class="tree-glyph"><Icon :name="`lucide:${tree.icon}`" size="27" /></span><span class="muted mono">{{ tree.count }}</span></div><h3>{{ tree.name }}</h3><p class="muted">{{ tree.subtitle }}</p><div class="tree-progress"><UiProgressBar :value="completed(tree.to) / treeLessonSlugs[tree.to].length * 100" :label="`Progresso em ${tree.name}`" /><span class="muted">{{ completed(tree.to) }}/{{ treeLessonSlugs[tree.to].length }} lições</span></div><div class="tree-card-actions"><NuxtLink :to="`/aprender?modulo=${tree.to}`">Aprender <Icon name="lucide:arrow-up-right" /></NuxtLink><NuxtLink :to="`/lab?t=${tree.to}`" :aria-label="`Experimentar ${tree.name}`"><span>Experimentar</span><Icon name="lucide:play" /></NuxtLink></div></article>
    </div>
    <NuxtLink to="/comparar" class="compare-link"><Icon name="lucide:chart-no-axes-column" size="25" /><div><strong>Mesma sequência, três resultados</strong><span class="muted">Compare altura, custo e equilíbrio.</span></div><Icon name="lucide:arrow-right" size="21" /></NuxtLink>
    <NuxtLink to="/treinar?rapido=1" class="quick-link"><div><span class="eyebrow">DESAFIO RÁPIDO</span><h2>Seu conhecimento cria raízes.</h2><p class="muted">Três questões para colocar a teoria em prática.</p></div><Icon name="lucide:target" size="32" /></NuxtLink>
    <p class="home-footnote muted"><Icon name="lucide:check" /> Sem conta. No seu ritmo.</p>
  </div>
</template>

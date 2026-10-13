<script setup lang="ts">
import { presets } from '../engine/presets'
import { encodeOps } from '../engine'
const trees = [{ id: 'bst', name: 'ABB', text: 'Menores à esquerda, maiores à direita. Descubra como a ordem de inserção muda o caminho.' }, { id: 'avl', name: 'AVL', text: 'Compare alturas e veja por que uma rotação encurta os caminhos.' }, { id: 'rb', name: 'Rubro-Negra', text: 'Acompanhe cores e rotações para manter os caminhos equilibrados.' }]
useSeoMeta({ title: 'TreeLab — comece com uma árvore', description: 'Crie árvores do zero. Entenda comparações, rotações e cores experimentando no laboratório.' })
</script>
<template>
  <div class="page-shell home-page">
    <div class="eyebrow"><span class="status-dot" /> APRENDA EXPERIMENTANDO</div>
    <h1>Comece do zero.<br><span class="accent">Veja a árvore crescer.</span></h1>
    <p class="hero-copy muted">Insira um número. Observe uma decisão. Entenda por que a árvore muda, no seu ritmo.</p>
    <NuxtLink to="/lab?t=avl&q=&c=0" class="continue-card"><div class="continue-symbol"><Icon name="lucide:plus" size="27" /></div><div><small class="eyebrow">UMA TELA EM BRANCO</small><strong>Criar minha árvore</strong><span class="muted">Sem exemplo pronto. Você escolhe os valores.</span></div><Icon name="lucide:arrow-right" /></NuxtLink>
    <NuxtLink to="/lab" class="resume-link">Continuar meu laboratório <Icon name="lucide:arrow-right" /></NuxtLink>
    <div class="section-heading"><h2>Escolha o que explorar</h2></div>
    <div class="tree-cards"><NuxtLink v-for="tree in trees" :key="tree.id" :to="`/lab?t=${tree.id}&q=&c=0`" class="tree-card"><span class="eyebrow">ÁRVORE VAZIA</span><h3>{{ tree.name }}</h3><p class="muted">{{ tree.text }}</p><span class="tree-start">Começar <Icon name="lucide:arrow-up-right" /></span></NuxtLink></div>
    <section class="lab-examples"><div class="section-heading"><h2>Um conceito, um experimento</h2></div><p class="muted">Os exemplos começam antes da primeira inserção. Avance para descobrir cada decisão.</p><NuxtLink v-for="example in presets.filter(item => ['ordered', 'balanced', 'avl-ll', 'avl-lr', 'rb-i1', 'rb-d4'].includes(item.id))" :key="example.id" :to="{ path: '/lab', query: { t: example.type, q: encodeOps(example.ops), c: '0' } }"><div><strong>{{ example.title }}</strong><span>{{ example.description }}</span></div><Icon name="lucide:play" /></NuxtLink></section>
    <NuxtLink to="/comparar" class="compare-link"><Icon name="lucide:chart-no-axes-column" /><div><strong>Mesma sequência, três árvores</strong><span class="muted">Compare altura e trabalho, operação por operação.</span></div><Icon name="lucide:arrow-right" /></NuxtLink>
    <details class="complexity-intro"><summary>Por que a altura importa?</summary><p>Buscar um valor percorre um caminho da raiz até uma folha: o custo depende da altura h, portanto é O(h). Uma ABB em ordem pode virar uma lista, com O(n). AVL e Rubro-Negra mantêm a altura em O(log n), usando rotações e, na RN, cores. Cada rotação custa O(1) e preserva a ordem das chaves.</p><NuxtLink to="/comparar">Experimentar essa diferença →</NuxtLink></details>
    <p class="home-footnote muted">Sem conta. Seus ajustes ficam neste dispositivo.</p>
  </div>
</template>
<style scoped>
.resume-link,.tree-start { display:flex; gap:8px; align-items:center; min-height:48px; color:var(--accent); font-size:13px; }.resume-link { justify-content:center; margin-top:8px; }.tree-card { padding-bottom:16px; }.tree-card h3 { margin-top:14px; }.tree-card p { line-height:1.65; }.lab-examples { margin-top:28px; }.lab-examples>p { font-size:14px; line-height:1.6; margin-bottom:16px; }.lab-examples>a { display:flex; align-items:center; gap:16px; justify-content:space-between; padding:16px; margin-top:8px; border:1px solid var(--border); border-radius:14px; background:var(--surface-1); }.lab-examples strong,.lab-examples span { display:block; }.lab-examples strong { font-size:14px; }.lab-examples span { font-size:12px; color:var(--muted); margin-top:6px; line-height:1.6; }.complexity-intro { margin-top:24px; border:1px solid var(--border); border-radius:14px; padding:16px; }.complexity-intro summary { cursor:pointer; min-height:32px; }.complexity-intro p { color:var(--muted); line-height:1.8; font-size:14px; margin:12px 0; }.complexity-intro a { color:var(--accent); font-size:14px; }
</style>

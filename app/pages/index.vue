<script setup lang="ts">
import { encodeOps } from '../engine'
import { presets } from '../engine/presets'
const trees = [
  { type: 'bst', name: 'ABB', icon: 'git-branch', description: 'A ordem dos valores define o caminho.', example: 'ordered' },
  { type: 'avl', name: 'AVL', icon: 'scale', description: 'Alturas mostram quando é hora de girar.', example: 'avl-ll' },
  { type: 'rb', name: 'Rubro-Negra', icon: 'circle-dot', description: 'Cores ajudam a equilibrar os caminhos.', example: 'rb-i1' },
] as const
const resume = ref(false)
onMounted(() => { try { resume.value = Boolean(JSON.parse(localStorage.getItem('treelab-lab') || '{}').ops?.length) } catch { resume.value = false } })
function example(id: string) { const item = presets.find(value => value.id === id)!; return { path: '/lab', query: { t: item.type, q: encodeOps(item.ops), c: '0' } } }
useSeoMeta({ title: 'TreeLab — entenda as árvores', description: 'Crie uma árvore do zero e entenda cada comparação, rotação e mudança de cor no laboratório.' })
</script>
<template>
  <div class="page-shell home-page">
    <div class="eyebrow"><span class="status-dot" /> SEU LABORATÓRIO DE ÁRVORES</div>
    <h1>Veja a lógica.<br><span class="accent">Construa sua árvore.</span></h1>
    <p class="hero-copy muted">Comece com uma árvore vazia. Escolha os valores e acompanhe cada decisão, um passo de cada vez.</p>
    <NuxtLink to="/lab?t=avl&q=&c=0" class="continue-card new-tree"><div class="continue-symbol"><Icon name="lucide:plus" size="27" /></div><div><small class="eyebrow">COMECE DO ZERO</small><strong>Criar uma árvore</strong><span class="muted">Você escolhe o primeiro número.</span></div><Icon name="lucide:arrow-right" size="22" /></NuxtLink>
    <NuxtLink v-if="resume" to="/lab" class="resume-link"><Icon name="lucide:history" />Continuar minha sequência<Icon name="lucide:arrow-right" /></NuxtLink>
    <div class="section-heading"><h2>Três formas de experimentar.</h2></div>
    <div class="tree-cards">
      <article v-for="tree in trees" :key="tree.type" class="tree-card"><span class="tree-glyph"><Icon :name="`lucide:${tree.icon}`" size="26" /></span><h3>{{ tree.name }}</h3><p class="muted">{{ tree.description }}</p><div class="tree-card-actions"><NuxtLink :to="`/lab?t=${tree.type}&q=&c=0`" :aria-label="`Criar ${tree.name} do zero`">Começar<Icon name="lucide:plus" /></NuxtLink><NuxtLink :to="example(tree.example)" :aria-label="`Ver exemplo de ${tree.name}`">Exemplo<Icon name="lucide:play" /></NuxtLink></div></article>
    </div>
    <NuxtLink to="/comparar" class="compare-link"><Icon name="lucide:chart-no-axes-column" size="25" /><div><strong>A mesma entrada, três árvores</strong><span class="muted">Compare o formato e o trabalho de cada uma.</span></div><Icon name="lucide:arrow-right" /></NuxtLink>
    <details class="complexity-opening"><summary><Icon name="lucide:route" />Por que a altura importa?<Icon name="lucide:chevron-down" /></summary><div><p>Uma busca percorre um caminho da raiz até o valor procurado. Quanto maior a altura, mais comparações podem ser necessárias.</p><p>Na ABB, a ordem de inserção pode criar uma lista: o custo chega a <span class="mono">O(n)</span>. AVL e Rubro-Negra corrigem a estrutura para manter caminhos em <span class="mono">O(log n)</span>. No laboratório você vê quando e por que isso acontece.</p><NuxtLink :to="example('ordered')">Experimentar com valores em ordem<Icon name="lucide:arrow-right" /></NuxtLink></div></details>
    <p class="home-footnote muted"><Icon name="lucide:check" /> Sem conta. No seu ritmo.</p>
  </div>
</template>
<style scoped>
.hero-copy { max-width:480px; }.tree-card { padding-bottom:0; }.tree-card>.tree-glyph { margin-bottom:14px; color:var(--accent); }.tree-card p { flex:1; }.tree-card-actions a { font-size:12px; gap:4px; }.tree-card-actions :deep(.iconify) { width:16px; height:16px; flex-shrink:0; }.resume-link { display:flex; align-items:center; justify-content:center; gap:8px; min-height:48px; margin-top:8px; color:var(--muted); font-size:13px; }.resume-link :deep(.iconify) { width:17px; height:17px; }.complexity-opening { margin-top:24px; border:1px solid var(--border); border-radius:14px; background:var(--surface-1); }.complexity-opening summary { display:flex; align-items:center; gap:10px; min-height:60px; padding:14px 16px; cursor:pointer; font-size:14px; list-style:none; }.complexity-opening summary::-webkit-details-marker { display:none; }.complexity-opening summary>:last-child { margin-left:auto; transition:transform .2s; }.complexity-opening[open] summary>:last-child { transform:rotate(180deg); }.complexity-opening>div { padding:0 16px 14px; }.complexity-opening p { margin:0 0 12px; font-size:14px; line-height:1.7; color:var(--muted); }.complexity-opening a { display:flex; align-items:center; gap:8px; min-height:48px; font-size:13px; color:var(--accent); }
@media(max-width:379px) { .tree-cards { grid-template-columns:1fr; gap:10px; }.tree-card { display:grid; grid-template-columns:36px 1fr auto; column-gap:12px; padding:14px; align-items:center; }.tree-card>.tree-glyph { grid-row:1/3; margin:0; }.tree-card h3 { font-size:15px; }.tree-card p { grid-column:2; font-size:12px; min-height:0; margin:6px 0 0; }.tree-card-actions { grid-column:3; grid-row:1/3; border:0; padding:0; }.tree-card-actions a { font-size:11px; min-height:44px; }.tree-card-actions a:first-child :deep(.iconify) { display:none; } }
</style>

<script setup lang="ts">
import type { usePlayer } from '../../composables/usePlayer'
import { TabsRoot, TabsList, TabsTrigger, TabsContent } from 'reka-ui'
import { getMessage, pseudocode } from '../../engine'
import { caseReason, getCaseLabel } from '../../engine/messages'
import { useLabStore } from '../../stores/lab'
defineProps<{ player: ReturnType<typeof usePlayer> }>()
const lab = useLabStore()
const tab = ref('explanation')
const code = computed(() => pseudocode[lab.step?.code.algo ?? ''] ?? [])
const counters = [['comparisons', 'Comparações'], ['rotations', 'Rotações'], ['recolorings', 'Mudanças de cor'], ['heightUpdates', 'Alturas atualizadas'], ['visits', 'Visitas']] as const
const action = computed(() => {
  const step = lab.step
  if (!step) return 'Sua primeira árvore começa aqui.'
  const p = step.msg.params
  if (step.meta?.rotation && ['case', 'rotate-pre', 'rotate'].includes(step.kind)) return `${p.child} sobe e ${p.key} desce: rotação à ${p.dir === 'left' ? 'esquerda' : 'direita'}.`
  if (step.kind === 'recolor') return `${p.key}: ${p.from === 'R' ? 'vermelho' : 'preto'} → ${p.color === 'R' ? 'vermelho' : 'preto'}.`
  if (step.meta?.caseName && ['case', 'imbalance'].includes(step.kind)) return `Precisamos corrigir ${getCaseLabel(step.meta.caseName)}.`
  return getMessage(step.msg)
})
const reason = computed(() => {
  const step = lab.step
  if (!step) return 'Uma árvore começa vazia. Insira um número e avance para ver a primeira decisão.'
  const p = step.msg.params
  if (p.reason) return String(p.reason)
  if (step.meta?.caseName) return caseReason(step.meta.caseName)
  switch (step.kind) {
    case 'start': return 'Partimos da raiz: todos os valores menores ficam na subárvore esquerda e todos os maiores na direita.'
    case 'compare': case 'descend': return `${p.key} ${Number(p.key) < Number(p.at) ? 'é menor que' : Number(p.key) > Number(p.at) ? 'é maior que' : 'é igual a'} ${p.at}. ${Number(p.key) === Number(p.at) ? 'Encontramos a chave; não precisamos descer.' : `Por isso seguimos à ${Number(p.key) < Number(p.at) ? 'esquerda' : 'direita'}, descartando o outro lado da busca.`}`
    case 'attach': return lab.type === 'rb' ? 'Inserimos uma folha vermelha para não aumentar a quantidade de pretos desse caminho. Se o pai também for vermelho, os próximos passos corrigem esse conflito.' : 'Chegamos a um filho vazio: inserir aqui mantém todas as chaves menores à esquerda e maiores à direita.'
    case 'update': return step.meta?.rotation ? 'A nova raiz da subárvore encurta o lado pesado. Recalculamos as alturas; em uma rotação dupla ainda pode faltar o segundo giro.' : `A mudança pode ter alterado a altura dos ancestrais. Em AVL, FB = altura esquerda − altura direita: valores entre −1 e 1 significam equilíbrio.`
    case 'found': return 'A comparação deu igualdade. A busca termina sem alterar a estrutura.'
    case 'not-found': return 'O caminho correto terminou em um filho vazio: a chave não está na árvore e nada é removido.'
    case 'duplicate': return 'Este laboratório usa chaves distintas. A chave já existe, então esta inserção não muda a árvore.'
    case 'mark-delete': return 'Uma folha sai diretamente. Com um filho, ele ocupa seu lugar. Com dois filhos, usamos o menor valor do lado direito para preservar a ordem.'
    case 'find-successor': return 'Seguimos à esquerda na subárvore direita. O primeiro nó sem filho esquerdo é o menor valor maior que a chave removida.'
    case 'transplant': return 'Ligamos o pai ao substituto e reconectamos os filhos. O sucessor preserva a ordem porque é o menor valor maior que a chave removida.'
    case 'remove': return 'A chave foi retirada. Agora verificamos se a remoção alterou alturas ou a quantidade de nós pretos nos caminhos.'
    case 'extra-black': return 'Remover um preto deixa um caminho com um preto a menos. A marca +1 é uma dívida temporária: rotações e cores a absorvem ou a levam ao pai.'
    case 'visit': return 'O percurso visita cada nó uma vez. A ordem escolhida determina quando a chave entra na saída, com custo Θ(n).'
    case 'done': return 'Esta operação terminou. Use a sequência para voltar ao início de qualquer operação, ou insira, busque ou remova outros valores.'
    default: return getMessage(step.msg)
  }
})
const invariant = computed(() => lab.type === 'bst' ? 'Menores à esquerda, maiores à direita.' : lab.type === 'avl' ? 'Ordem das chaves preservada. Ao terminar, cada nó deve ter FB entre −1 e 1.' : 'Ordem das chaves preservada. Ao terminar: raiz preta, nenhum par vermelho consecutivo e igual número de pretos em todos os caminhos até NIL.')
const changes = computed(() => {
  const previous = lab.result.steps[lab.cursor - 1]?.tree
  if (!previous || !lab.step) return []
  const rows: string[] = []
  for (const [id, node] of Object.entries(lab.tree.nodes)) {
    const before = previous.nodes[Number(id)]
    if (!before) rows.push(`${node.key} entrou como folha.`)
    else {
      if (before.c !== node.c) rows.push(`${node.key}: ${before.c === 'R' ? 'vermelho' : 'preto'} → ${node.c === 'R' ? 'vermelho' : 'preto'}.`)
      if (before.p !== node.p) rows.push(`${node.key}: ${node.p === null ? 'agora é a raiz' : `novo pai ${lab.tree.nodes[node.p]?.key}`}.`)
      if (before.h !== node.h) rows.push(`${node.key}: altura ${before.h} → ${node.h}.`)
    }
  }
  for (const [id, node] of Object.entries(previous.nodes)) if (!lab.tree.nodes[Number(id)]) rows.push(`${node.key} saiu da árvore.`)
  return rows
})
</script>
<template>
  <div class="details"><TabsRoot v-model="tab" class="details-tabs-root"><TabsList class="detail-tabs" aria-label="Detalhes do passo"><TabsTrigger value="explanation">Por quê?</TabsTrigger><TabsTrigger value="code">Algoritmo</TabsTrigger><TabsTrigger value="cost">Trabalho</TabsTrigger></TabsList><TabsContent value="explanation" class="details-panel" @keydown.space.stop><p class="step-message">{{ action }}</p><section class="reason-card"><h3>Por que fazemos isso</h3><p>{{ reason }}</p></section><section><h3>O que mudou neste passo</h3><ul v-if="changes.length"><li v-for="change in changes" :key="change">{{ change }}</li></ul><p v-else class="detail-description">Nenhuma ligação ou cor mudou. Este passo observa a árvore ou prepara a próxima ação.</p></section><section><h3>Regra que queremos manter</h3><p class="detail-description">{{ invariant }}</p></section></TabsContent><TabsContent value="code" class="details-panel" @keydown.space.stop><ol class="pseudocode"><li v-for="line in code" :key="line.n" :class="{ current: line.n === lab.step?.code.line }"><span>{{ line.n }}</span>{{ line.text }}</li></ol><p v-if="!code.length">Insira um valor para acompanhar o algoritmo.</p></TabsContent><TabsContent value="cost" class="details-panel" @keydown.space.stop><p class="detail-description">Totais ao concluir a operação e a sequência. Não são contadores do passo atual.</p><table><thead><tr><th>Medida</th><th>Operação</th><th>Sequência</th></tr></thead><tbody><tr v-for="[key, label] in counters" :key="key"><th>{{ label }}</th><td>{{ lab.operationCost?.[key] ?? 0 }}</td><td>{{ lab.totalCost[key] }}</td></tr></tbody></table><p class="detail-description">Buscar e atualizar percorrem O(h). Em AVL e RN, h = O(log n); a ABB pode chegar a h = n−1. Cada rotação custa O(1). Uma rotação dupla conta duas primitivas; mudar a cor de dois nós conta duas recolorações.</p></TabsContent></TabsRoot><LabPlayerBar :player="player" compact /></div>
</template>
<style scoped>
.details { height:min(520px,calc(85dvh - 110px)); display:flex; flex-direction:column; min-height:0; }.details-tabs-root { display:flex; flex:1; flex-direction:column; min-height:0; }.details-panel { flex:1; min-height:0; overflow-y:auto; padding-right:4px; overscroll-behavior:contain; }.detail-tabs { display:flex; gap:8px; padding-bottom:12px; flex-shrink:0; }.detail-tabs button { flex:1; min-height:48px; color:var(--muted); border-bottom:2px solid transparent; font-size:13px; }.detail-tabs button[data-state='active'] { color:var(--accent); border-color:var(--accent); }.details p,.details li { font-size:14px; line-height:1.65; margin:8px 0 12px; }.details h3 { font-size:12px; font-weight:600; color:var(--accent); margin-top:16px; }.reason-card { padding:4px 14px; border-left:3px solid var(--accent); background:var(--surface-2); border-radius:8px; }.details ul { padding-left:20px; }.detail-description { color:var(--muted); }.pseudocode { display:grid; gap:6px; }.pseudocode li { display:flex; gap:12px; padding:10px 8px; font:12px/1.6 'JetBrains Mono',monospace; border-radius:8px; }.pseudocode li>span { color:var(--muted); }.pseudocode .current { background:var(--surface-3); border-left:2px solid var(--accent); }table { width:100%; border-collapse:collapse; font-size:12px; }th { text-align:left; font-weight:500; }td { text-align:center; font:13px 'JetBrains Mono',monospace; }th,td { padding:12px 5px; border-bottom:1px solid var(--border); }thead { color:var(--muted); }.details>:deep(.player) { flex-shrink:0; padding-top:12px; border-top:1px solid var(--border); }
</style>

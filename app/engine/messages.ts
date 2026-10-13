import type { MessageParams, Step } from './types'

export const caseLabels: Record<string, string> = {
  LL: 'Esquerda-Esquerda (LL)', RR: 'Direita-Direita (RR)', LR: 'Esquerda-Direita (LR)', RL: 'Direita-Esquerda (RL)',
  'RB-I1': 'Tio vermelho', 'RB-I2': 'Triângulo', 'RB-I3': 'Linha', 'RB-D1': 'Irmão vermelho', 'RB-D2': 'Irmão e sobrinhos pretos', 'RB-D3': 'Sobrinho próximo vermelho', 'RB-D4': 'Sobrinho distante vermelho',
}
export const getCaseLabel = (name: string): string => `${caseLabels[name.replace('-mirror', '')] ?? name}${name.endsWith('-mirror') ? ' · espelho' : ''}`
type Message = (params: MessageParams) => string
const direction = (p: MessageParams): string => p.dir === 'left' || p.side === 'l' ? 'esquerda' : 'direita'
const queryLabels: Record<string, string> = { min: 'Mínimo', max: 'Máximo', succ: 'Sucessor', pred: 'Predecessor' }
const actions: Record<string, string> = { i: 'inserir', d: 'remover', s: 'buscar', walk: 'percorrer a árvore', min: 'consultar o mínimo', max: 'consultar o máximo', succ: 'consultar o sucessor de', pred: 'consultar o predecessor de' }
export const messages: Record<string, Message> = {
  start: p => `Vamos ${actions[String(p.action)]} ${p.key ?? ''}.`.replace(' .', '.'),
  compare: p => `Compare ${p.key} com ${p.at}.`,
  descend: p => `${p.key} segue para a ${direction(p)} de ${p.at}.`,
  attach: p => `${p.key} entra como uma nova folha${p.parent === null ? ' na raiz' : ''}.`,
  found: p => `Encontramos ${p.key}.`,
  'not-found': p => `O ${p.key} não está na árvore.`,
  duplicate: p => `O ${p.key} já existe: nada muda.`,
  'mark-delete': p => `Vamos remover ${p.key}. Primeiro, observe seus filhos.`,
  'find-successor': p => `Procure o sucessor: visite ${p.key} na subárvore direita.`,
  transplant: p => `${p.successor ?? p.replacement ?? 'O filho'} assume o lugar de ${p.key}; os identificadores não mudam.`,
  remove: p => `${p.key} saiu da árvore.`,
  'avl.update': p => `${p.key}: altura ${p.height} e FB ${p.balance}.`,
  'avl.imbalance': p => `${p.key} ficou desbalanceado. Caso ${getCaseLabel(String(p.caseName))}.`,
  'avl.case': p => `Caso ${getCaseLabel(String(p.caseName))}: vamos rebalancear.`,
  'avl.balance': p => `A subárvore de ${p.key} voltou ao equilíbrio.`,
  case: p => `${getCaseLabel(String(p.caseName))}: observe ${p.key}.`,
  'rotation-diagnosis': p => `${p.child} vai subir. Vamos girar à ${direction(p)} em ${p.key}.`,
  'rotation-prepare': p => `Pivô ${p.key}, filho ${p.child}: a subárvore do meio troca de pai.`,
  'rotation-move': p => `${p.child} sobe e ${p.key} desce. A ordem in-ordem permanece.`,
  'rotation-done': p => `Rotação concluída: ${p.child} virou a raiz desta subárvore. Altura ${p.height}.`,
  recolor: p => `${p.key} fica ${p.color === 'R' ? 'vermelho' : 'preto'}.`,
  'extra-black': p => `${p.key === null ? 'O NIL' : p.key} carrega um preto extra. Vamos restaurar a altura negra.`,
  visit: p => `${p.key} é o ${p.n}º nó visitado.`,
  'inorder-done': p => `Percurso concluído: ${p.n} nós em ordem crescente.`,
  'traversal-done': p => `Percurso concluído: ${p.n} nós visitados.`,
  'query-visit': p => `Visite ${p.key} para encontrar ${queryLabels[String(p.query)]?.toLowerCase() ?? 'o resultado'}.`,
  'query-result': p => `${queryLabels[String(p.query)] ?? 'Resultado'}: ${p.key}.`,
  'no-neighbor': p => `${p.key} não tem ${queryLabels[String(p.query)]?.toLowerCase() ?? 'vizinho'} nesta árvore.`,
  ancestor: p => `Suba até o ancestral ${p.key}.`,
  'empty-query': () => 'A árvore está vazia.',
  invalid: () => 'Use um inteiro de −999 a 999.',
  limit: () => 'A árvore já tem 63 nós. Remova um antes de inserir.',
  done: () => 'Operação concluída. Você controla o próximo passo.',
}
export function getMessage(message: Step['msg']): string {
  const formatter = messages[message.key]
  if (!formatter) throw new Error(`Mensagem desconhecida: ${message.key}`)
  return formatter(message.params)
}

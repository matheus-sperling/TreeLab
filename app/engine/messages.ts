import type { MessageParams, Step } from './types'

export const caseLabels: Record<string, string> = {
  LL: 'Esquerda-Esquerda (LL)', RR: 'Direita-Direita (RR)', LR: 'Esquerda-Direita (LR)', RL: 'Direita-Esquerda (RL)',
  'RB-I1': 'Tio vermelho', 'RB-I2': 'Triângulo', 'RB-I3': 'Linha', 'RB-D1': 'Irmão vermelho', 'RB-D2': 'Irmão e sobrinhos pretos', 'RB-D3': 'Sobrinho próximo vermelho', 'RB-D4': 'Sobrinho distante vermelho',
}
export const getCaseLabel = (name: string): string => `${caseLabels[name.replace('-mirror', '')] ?? name}${name.endsWith('-mirror') ? ' · espelho' : ''}`
export const caseReasons: Record<string, string> = {
  LL: 'O lado esquerdo está dois níveis mais alto. O filho esquerdo também pesa à esquerda; uma rotação à direita reduz essa diferença.',
  RR: 'O lado direito está dois níveis mais alto. O filho direito também pesa à direita; uma rotação à esquerda reduz essa diferença.',
  LR: 'O lado esquerdo está alto, mas seu filho pesa à direita. Primeiro alinhamos o filho à esquerda; depois giramos o ancestral à direita.',
  RL: 'O lado direito está alto, mas seu filho pesa à esquerda. Primeiro alinhamos o filho à direita; depois giramos o ancestral à esquerda.',
  'RB-I1': 'Há um nó vermelho com pai vermelho e o tio também é vermelho. Tornamos pai e tio pretos e o avô vermelho: removemos o conflito local sem alterar a quantidade de pretos nos caminhos.',
  'RB-I2': 'Nó e pai vermelhos formam um triângulo, com tio preto. A primeira rotação alinha os três nós para que o próximo passo elimine o conflito vermelho-vermelho.',
  'RB-I3': 'Nó e pai vermelhos estão alinhados, com tio preto. O pai sobe preto e o avô desce vermelho: a rotação elimina dois vermelhos consecutivos e preserva a altura negra.',
  'RB-D1': 'O irmão é vermelho. Trocar as cores do irmão e do pai e girar o pai expõe um irmão preto; isso prepara a correção do preto que falta.',
  'RB-D2': 'Irmão e sobrinhos são pretos. Tornar o irmão vermelho iguala os caminhos locais e leva a falta de um preto ao pai.',
  'RB-D3': 'O sobrinho próximo é vermelho e o distante é preto. Trocar cores e girar o irmão cria um sobrinho distante vermelho para a correção final.',
  'RB-D4': 'O sobrinho distante é vermelho. Ele fica preto, o irmão recebe a cor do pai e sobe por rotação; os dois lados voltam a ter a mesma quantidade de pretos.',
}
export function caseReason(name: string): string { return caseReasons[name.replace('-mirror', '')] ?? '' }
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
  'avl.imbalance': p => `${p.key} ficou desbalanceado. ${caseReason(String(p.caseName))}`,
  'avl.case': p => `${getCaseLabel(String(p.caseName))}: ${caseReason(String(p.caseName))}`,
  'avl.balance': p => `A subárvore de ${p.key} voltou ao equilíbrio.`,
  case: p => `${getCaseLabel(String(p.caseName))}: ${caseReason(String(p.caseName))}`,
  'rotation-diagnosis': p => `${p.child} vai subir: giramos à ${direction(p)} em ${p.key}. ${p.reason ?? ''}`,
  'rotation-prepare': p => `${p.child} sobe e ${p.key} desce na rotação à ${direction(p)}. ${p.reason ?? ''}`,
  'rotation-move': p => `${p.child} sobe e ${p.key} desce. ${p.reason ?? ''} A ordem crescente permanece.`,
  'rotation-done': p => `Rotação concluída: ${p.child} virou a raiz desta subárvore. Altura ${p.height}.`,
  recolor: p => `${p.key}: ${p.from === 'R' ? 'vermelho' : 'preto'} → ${p.color === 'R' ? 'vermelho' : 'preto'}. ${p.reason ?? 'A cor restaura o equilíbrio dos caminhos pretos.'}`,
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

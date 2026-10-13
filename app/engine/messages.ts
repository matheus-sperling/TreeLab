import type { MessageParams, Step, TreeType } from './types'

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
  transplant: p => p.successor === null || p.replacement === null ? `O lugar de ${p.key} fica vazio (NIL).` : `${p.successor ?? p.replacement ?? 'O filho'} assume o lugar de ${p.key}.`,
  remove: p => `${p.key} saiu da árvore.`,
  'avl.update': p => `${p.key}: altura ${p.height} e FB ${p.balance}.`,
  'avl.imbalance': p => `${p.key} ficou desbalanceado. Caso ${getCaseLabel(String(p.caseName))}.`,
  'avl.case': p => `Caso ${getCaseLabel(String(p.caseName))}: vamos rebalancear.`,
  'avl.balance': p => `A subárvore de ${p.key} voltou ao equilíbrio.`,
  case: p => `${getCaseLabel(String(p.caseName))}: observe ${p.key}.`,
  'rotation-diagnosis': p => `Gire à ${direction(p)} em ${p.key}: ${p.child} vai subir.`,
  'rotation-prepare': p => p.middle === null ? `Prepare o giro de ${p.key}; não há subárvore do meio.` : `${p.middle ?? 'A subárvore do meio'} passa de ${p.child} para ${p.key}.`,
  'rotation-move': p => `${p.child} sobe e ${p.key} desce.`,
  'rotation-done': p => `${p.child} é a nova raiz desta subárvore, com altura ${p.height}.`,
  recolor: p => `${p.key}: ${p.from === 'R' ? 'vermelho' : 'preto'} → ${p.color === 'R' ? 'vermelho' : 'preto'}.`,
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

const caseReasons: Record<string, string> = {
  'RB-I1': 'Pai e tio vermelhos permitem corrigir as cores sem girar a árvore.',
  'RB-I2': 'Com tio preto, o triângulo precisa virar uma linha antes do giro final.',
  'RB-I3': 'Com tio preto e nós em linha, o giro separa os dois vermelhos consecutivos.',
  'RB-D1': 'O irmão vermelho precisa dar lugar a um irmão preto para continuar o conserto.',
  'RB-D2': 'Sem sobrinho vermelho para ajudar, o preto que falta deve subir ao pai.',
  'RB-D3': 'O sobrinho vermelho precisa ficar do lado distante para resolver a falta de preto.',
  'RB-D4': 'O sobrinho distante vermelho permite repor o preto que falta e encerrar o conserto.',
}
const signed = (value: MessageParams[string] | undefined): string => value === undefined ? '—' : Number(value) > 0 ? `+${value}` : String(value)
export function getRotationReason(params: MessageParams): string {
  const name = String(params.caseName ?? '').replace('-mirror', '')
  if (name.startsWith('RB-')) return caseReasons[name] ?? 'O giro prepara a restauração das propriedades da Rubro-Negra.'
  if ((name === 'LR' || name === 'RL') && params.rotationIndex === 1) return 'O zigue-zague precisa virar uma linha antes do giro final.'
  return `O FB de ${params.key} é ${signed(params.balance)}: o lado ${Number(params.balance) > 0 ? 'esquerdo' : 'direito'} está alto demais.`
}

export function getRecolorReason(params: MessageParams, algo: string, line: number): string {
  const toBlack = params.color === 'B'
  if (algo === 'rb-delete') return 'O sucessor herda a cor da posição removida para conservar os pretos nos caminhos.'
  if (algo === 'rb-insert-fix') {
    if (line === 7) return 'A raiz precisa ser preta, mesmo quando uma recoloração chegou até ela.'
    if (line === 3) return toBlack
      ? params.role === 'uncle' ? 'O tio fica preto para compensar o preto acrescentado no lado do pai.' : 'O pai fica preto para interromper dois vermelhos consecutivos.'
      : 'O avô fica vermelho para compensar os novos pretos e manter a altura negra.'
    return toBlack
      ? 'O nó que sobe fica preto para separar os vermelhos e conservar a altura negra.'
      : 'O avô que desce fica vermelho para compensar o preto do nó que sobe.'
  }
  if (algo === 'rb-delete-fix') {
    if (line === 3) return toBlack
      ? 'O irmão que sobe fica preto para preservar a altura negra após o giro.'
      : 'O pai que desce fica vermelho para compensar o preto do irmão que sobe.'
    if (line === 5) return 'O irmão perde um preto para igualar os lados; a falta de preto sobe ao pai.'
    if (line === 7) return toBlack
      ? 'O sobrinho próximo fica preto porque vai ocupar a posição preta do irmão.'
      : 'O irmão fica vermelho para compensar o preto do sobrinho que sobe.'
    if (line === 9) {
      if (params.role === 'sibling') return 'O irmão herda a cor do pai para conservar os pretos acima da subárvore.'
      if (params.role === 'parent') return 'O pai fica preto para repor o preto que falta no caminho após o giro.'
      return 'O sobrinho distante fica preto para equilibrar o outro caminho após o giro.'
    }
    if (line === 10) return 'O nó vermelho absorve o preto que faltava e encerra o conserto.'
  }
  return toBlack ? 'Este nó fica preto para restaurar a contagem de pretos nos caminhos.' : 'Este nó fica vermelho para conservar a contagem de pretos nos caminhos.'
}

/** A narração mantém uma única frase de motivo; o diagnóstico completo fica nos Detalhes. */
export function getStepReason(step: Step | undefined): string {
  if (!step) return ''
  if (typeof step.msg.params.reason === 'string') return step.msg.params.reason
  const name = step.meta?.caseName?.replace('-mirror', '')
  if (name && caseReasons[name]) return caseReasons[name]
  if (step.kind === 'extra-black') return 'Saiu um nó preto: esse caminho precisa recuperar um preto.'
  if (step.kind === 'attach' && step.code.algo === 'rb-insert') return 'A folha entra vermelha para não aumentar a contagem de pretos dos caminhos.'
  return ''
}

export interface StepExplanation { diagnosis: string; change: string; rule: string }
export function getStepExplanation(step: Step, type: TreeType): StepExplanation {
  const p = step.msg.params
  const rotation = step.meta?.rotation
  const orderRule = 'Toda chave à esquerda é menor que seu pai; toda chave à direita é maior.'
  if (rotation) {
    const middle = p.middle === null ? 'Não há subárvore do meio para transferir.' : `${p.middle ?? 'A subárvore do meio'} passa de ${p.child} para ${p.key}, mantendo suas conexões internas.`
    const avl = !String(p.caseName).startsWith('RB-')
    const diagnosis = avl
      ? `${p.imbalanceKey ?? p.key} tinha altura esquerda ${p.imbalanceLeftHeight ?? p.leftHeight}, direita ${p.imbalanceRightHeight ?? p.rightHeight}: FB = ${signed(p.imbalanceBalance ?? p.balance)}. ${rotation.of === 2 ? `É o ${rotation.n}º giro do caso ${getCaseLabel(String(p.caseName))}; ${rotation.n === 1 ? 'primeiro desfazemos o zigue-zague' : 'agora corrigimos a diferença de alturas'}.` : `Caso ${getCaseLabel(String(p.caseName))}.`}`
      : `${getCaseLabel(String(p.caseName))}. ${p.caseDiagnosis ?? ''} ${getRotationReason(p)}`
    return {
      diagnosis,
      change: `${p.child} assume a posição de ${p.key}; ${p.key} fica como filho ${rotation.dir === 'left' ? 'esquerdo' : 'direito'} de ${p.child}. ${middle}`,
      rule: 'As mesmas chaves continuam em ordem crescente no percurso in-ordem; o giro altera apenas os vínculos locais.',
    }
  }
  if (step.kind === 'recolor') return {
    diagnosis: `${p.caseDiagnosis ? `${p.caseDiagnosis} ` : `${p.key} era ${p.from === 'R' ? 'vermelho' : 'preto'}. `}${getStepReason(step)}`,
    change: `Somente a cor de ${p.key} muda para ${p.color === 'R' ? 'vermelho' : 'preto'}. Pai, filhos e chave continuam iguais.`,
    rule: 'O conjunto de recolorações do caso evita dois vermelhos consecutivos e conserva a quantidade de pretos em cada caminho até NIL.',
  }
  if (step.kind === 'case' && step.meta?.caseName) return {
    diagnosis: `${p.caseDiagnosis ? `${p.caseDiagnosis} ` : ''}${getStepReason(step)}`, change: `O caso ${getCaseLabel(step.meta.caseName)} foi identificado; este passo ainda não altera os nós.`,
    rule: type === 'rb' ? 'O conserto deve terminar com raiz preta, sem dois vermelhos consecutivos e com altura negra igual nos caminhos.' : 'Cada nó da AVL deve terminar com FB entre −1 e +1.',
  }
  if (step.kind === 'compare' || step.kind === 'descend') return {
    diagnosis: `${p.key} ${Number(p.key) === Number(p.at) ? '=' : Number(p.key) < Number(p.at) ? '<' : '>'} ${p.at}.`,
    change: Number(p.key) === Number(p.at) ? 'As chaves são iguais; a busca chegou ao nó correto.' : `A busca segue para o filho ${Number(p.key) < Number(p.at) ? 'esquerdo' : 'direito'} de ${p.at}; a árvore continua igual.`, rule: orderRule,
  }
  if (step.kind === 'update') return {
    diagnosis: `${p.key}: altura ${p.height}, FB ${signed(p.balance)}. ${Math.abs(Number(p.balance)) > 1 ? 'A diferença entre os lados ultrapassa 1; será preciso girar.' : 'A diferença entre os lados está dentro do limite da AVL.'}`,
    change: 'A altura e o fator de balanceamento são recalculados; as conexões entre nós permanecem iguais.', rule: 'FB = altura esquerda − altura direita. Uma folha tem altura 0; NIL tem altura −1.',
  }
  if (step.kind === 'extra-black') return {
    diagnosis: `${p.key === null ? 'NIL' : p.key} está no caminho que perdeu um preto durante a remoção.`,
    change: 'O marcador de preto extra registra essa falta enquanto o irmão e os sobrinhos são examinados.',
    rule: 'Ao terminar o conserto, todo caminho até NIL deve conter a mesma quantidade de nós pretos.',
  }
  if (step.kind === 'attach') return {
    diagnosis: `A busca chegou ao espaço correto para ${p.key}.`, change: `${p.key} é ligado como folha, sem filhos.${type === 'rb' ? ' A nova folha é vermelha para manter a altura negra.' : ''}`, rule: orderRule,
  }
  if (step.kind === 'transplant' || step.kind === 'find-successor' || step.kind === 'mark-delete' || step.kind === 'remove') return {
    diagnosis: step.kind === 'find-successor' ? 'Com dois filhos, o menor nó da subárvore direita é o sucessor e pode ocupar o lugar removido.' : getMessage(step.msg),
    change: step.kind === 'transplant' ? getMessage(step.msg) : step.kind === 'remove' ? 'O nó removido deixa de fazer parte da árvore; o algoritmo verifica se a remoção exige conserto.' : 'A remoção ainda está sendo preparada; acompanhe os filhos e o sucessor destacados.', rule: orderRule,
  }
  if (step.kind === 'visit') return { diagnosis: `Este é o ${p.n}º nó da ordem escolhida.`, change: `${p.key} é acrescentado à saída. A árvore continua igual.`, rule: 'Cada nó é visitado uma vez; a ordem escolhida determina quando ele aparece na saída.' }
  if (step.kind === 'done') return {
    diagnosis: `A operação terminou com ${Object.keys(step.tree.nodes).length} nós na árvore.`, change: 'O estado atual já inclui todas as mudanças desta operação.',
    rule: type === 'avl' ? `${orderRule} Os fatores de balanceamento voltaram ao intervalo de −1 a +1.` : type === 'rb' ? `${orderRule} Raiz preta, nenhum vermelho seguido de vermelho e mesma altura negra nos caminhos.` : orderRule,
  }
  if (step.kind === 'duplicate' || step.kind === 'not-found' || step.kind === 'found') return {
    diagnosis: getMessage(step.msg), change: 'Esta etapa informa o resultado; nenhuma chave, cor ou conexão é alterada.', rule: orderRule,
  }
  return { diagnosis: getMessage(step.msg), change: 'A operação começa na raiz e examina somente o caminho necessário.', rule: orderRule }
}

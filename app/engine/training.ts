import { runSequence } from './index'
import { cloneTree, balance, height } from './tree'
import { validate } from './validate'
import type { CaseName, Op, Snapshot, TreeType } from './types'

export interface ConceptItem {
  id: string
  prompt: string
  options: readonly string[]
  answer: number
  explanation: string
  topic: string
}
export type QuestionKind = 'height' | 'balance' | 'rotation' | 'validity' | 'parent' | 'rb-case' | 'concept'
export interface TrainingQuestion extends ConceptItem {
  kind: QuestionKind
  type?: TreeType
  tree?: Snapshot
  ops: Op[]
  nodeOptions?: number[]
  oracle?: { value: number | string | boolean; subject?: number }
}

export function seededRandom(seed: number): () => number {
  let state = seed >>> 0
  return () => {
    state = (Math.imul(1664525, state) + 1013904223) >>> 0
    return state / 4294967296
  }
}
const inserts = (keys: readonly number[]): Op[] => keys.map(k => ({ t: 'i', k }))
function shuffle<T>(values: readonly T[], random: () => number): T[] {
  const result = [...values]
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    ;[result[i], result[j]] = [result[j]!, result[i]!]
  }
  return result
}
function numericOptions(value: number, random: () => number): { options: string[]; answer: number } {
  const values = shuffle([value - 1, value, value + 1, value + 2], random)
  return { options: values.map(String), answer: values.indexOf(value) }
}

function measurement(kind: 'height' | 'balance', random: () => number): TrainingQuestion {
  const keys = shuffle([10, 20, 30, 40, 50, 60, 70], random)
  const type: TreeType = kind === 'balance' ? 'avl' : (['bst', 'avl', 'rb'] as const)[Math.floor(random() * 3)]!
  const initial = inserts(keys.slice(0, 5)), key = keys[5]!
  const ops = [...initial, { t: 'i' as const, k: key }]
  const before = runSequence(type, initial).final, after = runSequence(type, ops).final
  const value = kind === 'height' ? height(after, after.rootId) : balance(after, after.rootId!)
  return {
    id: `${kind}-${type}-${key}`, kind, topic: type, type, tree: before, ops,
    prompt: kind === 'height' ? `Depois de inserir ${key}, qual será a altura desta árvore?` : `Depois de inserir ${key}, qual será o FB da raiz da AVL?`,
    ...numericOptions(value, random), oracle: { value },
    explanation: kind === 'height' ? `O motor concluiu a inserção e calculou altura ${value}. Conte arestas no caminho mais longo; folha tem altura 0.` : `Após o rebalanceamento, o motor calcula FB = altura(esquerda) − altura(direita) = ${value}. A raiz pode mudar.`,
  }
}

function rotation(random: () => number): TrainingQuestion {
  const choices = [[30, 20, 10], [10, 20, 30], [30, 10, 20], [10, 30, 20]]
  const keys = choices[Math.floor(random() * choices.length)]!
  const ops = inserts(keys), result = runSequence('avl', ops)
  const caseName = result.steps.find(step => step.op === 2 && step.meta?.caseName)?.meta?.caseName as CaseName
  const names = ['LL', 'RR', 'LR', 'RL'], options = ['Direita (LL)', 'Esquerda (RR)', 'Esquerda, depois direita (LR)', 'Direita, depois esquerda (RL)']
  return {
    id: `rotation-${caseName}`, kind: 'rotation', topic: 'avl', type: 'avl', tree: runSequence('avl', ops.slice(0, -1)).final, ops,
    prompt: `Qual rotação resolve o desequilíbrio ao inserir ${keys[2]} nesta AVL?`, options, answer: names.indexOf(caseName), oracle: { value: caseName },
    explanation: `O motor identifica o caso ${caseName}. ${options[names.indexOf(caseName)]} preserva a ordem in-ordem e restaura |FB| ≤ 1.`,
  }
}

function validity(random: () => number): TrainingQuestion {
  const variation = Math.floor(random() * 4), type: TreeType = variation === 2 ? 'avl' : variation === 3 ? 'rb' : 'bst'
  const ops = inserts(variation === 2 ? [30, 20, 10] : [40, 20, 60, 10, 30])
  const tree = cloneTree(runSequence(variation === 2 ? 'bst' : type, ops).final)
  if (variation === 1) tree.nodes[tree.nodes[tree.rootId!]!.l!]!.key = 50
  if (variation === 3) tree.nodes[tree.rootId!]!.c = 'R'
  const check = validate(tree, type)
  const options = ['É válida para o tipo indicado.', 'A ordem de busca foi violada.', 'Há um nó com |FB| > 1.', 'A raiz Rubro-Negra não é preta.']
  const answer = check.valid ? 0 : check.errors.some(error => error.startsWith('Ordem ABB')) ? 1 : check.errors.some(error => error.startsWith('FB')) ? 2 : 3
  return {
    id: `validity-${variation}`, kind: 'validity', topic: type, type, tree, ops, options, answer, oracle: { value: check.valid },
    prompt: `Esta ${type === 'bst' ? 'ABB' : type === 'avl' ? 'AVL' : 'Rubro-Negra'} é válida? Qual regra falha?`,
    explanation: check.valid ? 'O validador verificou ordem, vínculos, alturas e as invariantes deste tipo. A árvore é válida.' : `${check.errors[0]}. O validador do motor detectou a violação. No laboratório, a mesma sequência aparece corrigida pelo algoritmo.`,
  }
}

function parent(random: () => number): TrainingQuestion {
  const keys = shuffle([20, 40, 60, 80, 100], random), key = 10 + Math.floor(random() * 5) * 20
  const initial = inserts(keys), ops = [...initial, { t: 'i' as const, k: key }], result = runSequence('bst', ops)
  const attach = result.steps.find(step => step.op === initial.length && step.kind === 'attach')!
  const added = Object.values(attach.tree.nodes).find(node => node.key === key)!
  const tree = runSequence('bst', initial).final, nodeOptions = Object.keys(tree.nodes).map(Number)
  const answer = nodeOptions.indexOf(added.p!), parentKey = tree.nodes[added.p!]!.key
  return {
    id: `parent-${key}-${parentKey}`, kind: 'parent', topic: 'bst', type: 'bst', tree, ops, nodeOptions, answer,
    prompt: `Toque no nó que será pai de ${key} ao inseri-lo nesta ABB.`, options: nodeOptions.map(id => `Nó ${tree.nodes[id]!.key}`), oracle: { value: added.p!, subject: key },
    explanation: `O motor compara ${key} ao longo do caminho e o insere como folha do nó ${parentKey}. Valores menores seguem à esquerda; maiores, à direita.`,
  }
}

function rbCase(random: () => number): TrainingQuestion {
  const choices = [[10, 5, 15, 1], [30, 10, 20], [30, 20, 10], [10, 20, 15], [10, 20, 30], [10, 5, 15, 20]]
  const keys = choices[Math.floor(random() * choices.length)]!, ops = inserts(keys), result = runSequence('rb', ops)
  const caseName = result.steps.find(step => step.op === ops.length - 1 && step.kind === 'case')?.meta?.caseName
  if (!caseName) throw new Error('A sequência didática não produziu caso Rubro-Negro')
  const name = caseName.replace('-mirror', ''), options = ['Tio vermelho (caso 1)', 'Triângulo (caso 2)', 'Linha (caso 3)']
  const answer = ['RB-I1', 'RB-I2', 'RB-I3'].indexOf(name)
  return {
    id: `rb-case-${caseName}`, kind: 'rb-case', topic: 'rb', type: 'rb', tree: runSequence('rb', ops.slice(0, -1)).final, ops,
    prompt: `Ao inserir ${keys.at(-1)}, qual é o primeiro caso do conserto Rubro-Negro?`, options, answer, oracle: { value: caseName },
    explanation: `O motor identifica ${options[answer]}${caseName.endsWith('-mirror') ? ', no caso espelhado' : ''}. Siga o laboratório para ver cada recoloração e rotação.`,
  }
}

/** A resposta estrutural vem dos snapshots, passos e validador do motor. */
export function createTrainingSession(seed: number, count = 8, concepts: readonly ConceptItem[] = []): TrainingQuestion[] {
  const random = seededRandom(seed), generators = [() => measurement('height', random), () => measurement('balance', random), () => rotation(random), () => validity(random), () => parent(random), () => rbCase(random)]
  const kinds = shuffle(generators, random), questions: TrainingQuestion[] = []
  for (let i = 0; i < count; i++) {
    const concept = concepts.length && i >= generators.length ? concepts[Math.floor(random() * concepts.length)] : undefined
    questions.push(concept ? { ...concept, id: `${concept.id}-${i}`, options: [...concept.options], kind: 'concept', ops: [] } : kinds[i % kinds.length]!())
  }
  return shuffle(questions, random).map((question, i) => ({ ...question, id: `${seed}-${i}-${question.id}` }))
}

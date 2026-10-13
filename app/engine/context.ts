import { caseReason } from './messages'
import { emptyTree, immutableSnapshot, recomputeHeights } from './tree'
import type { Color, Cost, MessageParams, MutableSnapshot, NodeId, Role, Step, StepKind, StepMeta, TreeType } from './types'

export const emptyCost = (): Cost => ({ comparisons: 0, rotations: 0, recolorings: 0, heightUpdates: 0, visits: 0 })
export class EngineContext {
  tree: MutableSnapshot = emptyTree()
  steps: Step[] = []
  cost: Cost = emptyCost()
  op = 0
  nextId = 1
  private extraBlack: StepMeta['extraBlack']
  constructor(public type: TreeType) {}
  emit(kind: StepKind, key: string, params: MessageParams = {}, hl: Record<number, Role> = {}, meta?: StepMeta, algo = `${this.type}-operation`, line = 1): void {
    recomputeHeights(this.tree)
    if (kind === 'start' || kind === 'done') this.extraBlack = undefined
    else if (meta?.extraBlack) this.extraBlack = { ...meta.extraBlack }
    const stepMeta = meta || this.extraBlack ? { ...meta, ...(this.extraBlack ? { extraBlack: { ...this.extraBlack } } : {}) } : undefined
    const edges = Object.entries(hl).flatMap(([id, role]) => {
      const node = this.tree.nodes[Number(id)]
      return node?.p !== null && node?.p !== undefined && hl[node.p] ? [{ from: node.p, to: Number(id), role }] : []
    })
    this.steps.push({ i: this.steps.length, op: this.op, kind, tree: immutableSnapshot(this.tree), hl: { ...hl }, edges, msg: { key, params }, code: { algo, line }, ...(stepMeta ? { meta: stepMeta } : {}) })
  }
  create(key: number, c?: Color): NodeId {
    const id = this.nextId++
    this.tree.nodes[id] = { key, l: null, r: null, p: null, h: 0, ...(c ? { c } : {}) }
    return id
  }
  setColor(id: NodeId | null, c: Color, algo = 'rb-recolor', line = 1): void {
    if (id === null || this.tree.nodes[id]!.c === c) return
    const from = this.tree.nodes[id]!.c ?? 'B'
    const recentCase = [...this.steps].reverse().find(step => step.op === this.op && step.meta?.caseName)?.meta?.caseName
    const reason = algo === 'rb-delete' ? 'O sucessor assume a cor do nó removido para conservar a quantidade de pretos nesse lugar.'
      : algo === 'rb-insert-fix' && line === 7 ? 'A raiz deve ser preta; assim todos os caminhos começam com o mesmo preto.'
      : algo === 'rb-delete-fix' && line === 10 ? 'Este nó absorve o preto extra e restaura a quantidade de pretos que faltava no caminho.'
      : recentCase ? caseReason(recentCase) : 'Restauramos a mesma quantidade de nós pretos em todos os caminhos até NIL.'
    this.tree.nodes[id]!.c = c
    this.cost.recolorings++
    this.emit('recolor', 'recolor', { key: this.tree.nodes[id]!.key, color: c, from, reason }, { [id]: 'current' }, undefined, algo, line)
  }
  rotate(pivot: NodeId, dir: 'left' | 'right', meta: StepMeta = {}): void {
    const node = this.tree.nodes[pivot]!
    const child = (dir === 'left' ? node.r : node.l)!
    const promoted = this.tree.nodes[child]!
    const movedSubtree = dir === 'left' ? promoted.l : promoted.r
    const rotation = { dir, pivot, child, movedSubtree, n: meta.rotation?.n ?? 1, of: meta.rotation?.of ?? 1 }
    const fullMeta = { ...meta, rotation }
    const params = { key: node.key, child: promoted.key, dir, reason: meta.caseName ? caseReason(meta.caseName) : 'A rotação reduz a diferença de altura e conserva a ordem das chaves.' }
    this.emit('case', 'rotation-diagnosis', params, { [pivot]: 'violation', [child]: 'pivot' }, fullMeta, 'rotation', 1)
    this.emit('rotate-pre', 'rotation-prepare', params, { [pivot]: 'pivot', [child]: 'pivot', ...(movedSubtree === null ? {} : { [movedSubtree]: 'moved' as const }) }, fullMeta, 'rotation', 2)
    if (dir === 'left') { node.r = promoted.l; if (promoted.l !== null) this.tree.nodes[promoted.l]!.p = pivot }
    else { node.l = promoted.r; if (promoted.r !== null) this.tree.nodes[promoted.r]!.p = pivot }
    promoted.p = node.p
    if (node.p === null) this.tree.rootId = child
    else if (this.tree.nodes[node.p]!.l === pivot) this.tree.nodes[node.p]!.l = child
    else this.tree.nodes[node.p]!.r = child
    if (dir === 'left') promoted.l = pivot
    else promoted.r = pivot
    node.p = child
    this.cost.rotations++
    this.emit('rotate', 'rotation-move', params, { [pivot]: 'pivot', [child]: 'pivot' }, fullMeta, 'rotation', 3)
    this.emit('update', 'rotation-done', { ...params, height: this.tree.nodes[child]!.h }, {}, fullMeta, 'rotation', 4)
  }
}

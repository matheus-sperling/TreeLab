import { emptyTree, height, immutableSnapshot, recomputeHeights } from './tree'
import { getRecolorReason, getRotationReason } from './messages'
import type { Color, Cost, MessageParams, MutableSnapshot, NodeId, Role, Step, StepKind, StepMeta, TreeType } from './types'

export const emptyCost = (): Cost => ({ comparisons: 0, rotations: 0, recolorings: 0, heightUpdates: 0, visits: 0 })
export class EngineContext {
  tree: MutableSnapshot = emptyTree()
  steps: Step[] = []
  cost: Cost = emptyCost()
  op = 0
  nextId = 1
  private extraBlack: StepMeta['extraBlack']
  private caseContext: { name: NonNullable<StepMeta['caseName']>; highlights: Record<number, Role>; diagnosis: string } | undefined
  constructor(public type: TreeType) {}
  emit(kind: StepKind, key: string, params: MessageParams = {}, hl: Record<number, Role> = {}, meta?: StepMeta, algo = `${this.type}-operation`, line = 1): void {
    recomputeHeights(this.tree)
    if (kind === 'start' || kind === 'done') { this.extraBlack = undefined; this.caseContext = undefined }
    else if (meta?.extraBlack) this.extraBlack = { ...meta.extraBlack }
    if (kind === 'case' && key === 'case' && meta?.caseName) {
      const diagnosis = this.caseDiagnosis(meta, hl)
      params = { ...params, caseDiagnosis: diagnosis }
      this.caseContext = { name: meta.caseName, highlights: { ...hl }, diagnosis }
    }
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
  private caseDiagnosis(meta: StepMeta, highlights: Record<number, Role>): string {
    const idFor = (role: Role): NodeId | null => {
      const entry = Object.entries(highlights).find(([, value]) => value === role)
      return entry ? Number(entry[0]) : null
    }
    const describe = (id: NodeId | null): string => id === null ? 'NIL preto' : `${this.tree.nodes[id]!.key} ${this.tree.nodes[id]!.c === 'R' ? 'vermelho' : 'preto'}`
    const pivot = idFor('pivot')
    if (meta.caseName?.startsWith('RB-I') && pivot !== null) {
      const grandparent = this.tree.nodes[pivot]!
      const uncle = meta.caseName.endsWith('-mirror') ? grandparent.l : grandparent.r
      return `Nó ${describe(idFor('current'))}, pai ${describe(idFor('violation'))}, avô ${describe(pivot)} e tio ${describe(uncle)}.`
    }
    const sibling = idFor('current')
    const node = sibling === null ? undefined : this.tree.nodes[sibling]
    const mirror = meta.caseName?.endsWith('-mirror')
    const near = node ? mirror ? node.r : node.l : null
    const far = node ? mirror ? node.l : node.r : null
    return `Pai ${describe(pivot)}, irmão ${describe(sibling)}, sobrinho próximo ${describe(near)} e distante ${describe(far)}. O caminho por ${describe(meta.extraBlack?.id ?? null)} perdeu um preto.`
  }
  setColor(id: NodeId | null, c: Color, algo = 'rb-recolor', line = 1): void {
    if (id === null || this.tree.nodes[id]!.c === c) return
    const from = this.tree.nodes[id]!.c ?? 'B'
    const caseName = algo === 'rb-delete' || (algo === 'rb-insert-fix' && line === 7) ? undefined : this.caseContext?.name
    const highlight = this.caseContext?.highlights[id]
    const role = algo === 'rb-delete-fix' && line === 9
      ? highlight === 'pivot' ? 'parent' : highlight === 'current' ? 'sibling' : 'far'
      : algo === 'rb-insert-fix' ? highlight === 'violation' ? 'parent' : highlight === 'pivot' ? 'grandparent' : 'uncle' : ''
    const params: MessageParams = { key: this.tree.nodes[id]!.key, from, color: c, role, ...(caseName ? { caseName, caseDiagnosis: this.caseContext?.diagnosis ?? '' } : {}) }
    params.reason = getRecolorReason(params, algo, line)
    this.tree.nodes[id]!.c = c
    this.cost.recolorings++
    this.emit('recolor', 'recolor', params, { [id]: 'current' }, caseName ? { caseName } : undefined, algo, line)
  }
  rotate(pivot: NodeId, dir: 'left' | 'right', meta: StepMeta = {}): void {
    const node = this.tree.nodes[pivot]!
    const child = (dir === 'left' ? node.r : node.l)!
    const promoted = this.tree.nodes[child]!
    const movedSubtree = dir === 'left' ? promoted.l : promoted.r
    const rotation = { dir, pivot, child, movedSubtree, n: meta.rotation?.n ?? 1, of: meta.rotation?.of ?? 1 }
    const fullMeta = { ...meta, rotation }
    const leftHeight = height(this.tree, node.l), rightHeight = height(this.tree, node.r)
    const imbalance = this.type === 'avl' && rotation.of === 2 && rotation.n === 1 && node.p !== null ? this.tree.nodes[node.p]! : node
    const imbalanceLeftHeight = height(this.tree, imbalance.l), imbalanceRightHeight = height(this.tree, imbalance.r)
    const params: MessageParams = {
      key: node.key, child: promoted.key, dir, middle: movedSubtree === null ? null : this.tree.nodes[movedSubtree]!.key,
      leftHeight, rightHeight, balance: leftHeight - rightHeight, rotationIndex: rotation.n, rotationCount: rotation.of,
      imbalanceKey: imbalance.key, imbalanceLeftHeight, imbalanceRightHeight, imbalanceBalance: imbalanceLeftHeight - imbalanceRightHeight,
      ...(this.type === 'rb' && this.caseContext && this.caseContext.name === meta.caseName ? { caseDiagnosis: this.caseContext.diagnosis } : {}),
      ...(meta.caseName ? { caseName: meta.caseName } : {}),
    }
    params.reason = getRotationReason(params)
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

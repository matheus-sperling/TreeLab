import { describe, expect, it } from 'vitest'
import { decodeOps, getMessage, inorder, messages, pseudocode, runSequence, validate } from '../../app/engine'
import type { Op, TreeType } from '../../app/engine'

function random(seed: number): () => number {
  let state = seed
  return () => { state ^= state << 13; state ^= state >>> 17; state ^= state << 5; return (state >>> 0) / 4294967296 }
}
function sequence(seed: number, length: number): Op[] {
  const next = random(seed)
  return Array.from({ length }, () => ({ t: next() < .5 ? 'i' : next() < .65 ? 'd' : 's', k: Math.floor(next() * 75) - 37 }))
}

describe.each<TreeType>(['bst', 'avl', 'rb'])('%s: oráculo e invariantes', (type) => {
  it('valida 200 sequências com sementes fixas e cada snapshot', () => {
    for (let seed = 1; seed <= 200; seed++) {
      const ops = sequence(seed * 9173, 80), result = runSequence(type, ops), keys = new Set<number>()
      for (const step of result.steps) {
        expect(validate(step.tree, 'bst').errors, `seed ${seed} passo ${step.i}`).toEqual([])
        expect(messages[step.msg.key], step.msg.key).toBeDefined()
        expect(pseudocode[step.code.algo]?.some(line => line.n === step.code.line), JSON.stringify(step.code)).toBe(true)
        expect(getMessage(step.msg).length).toBeLessThanOrEqual(380)
      }
      for (const [i, op] of ops.entries()) {
        if (op.t === 'i') keys.add(op.k)
        if (op.t === 'd') keys.delete(op.k)
        const [start, end] = result.opRanges[i]!, step = result.steps[end]!
        expect(start).toBeLessThanOrEqual(end)
        expect(step.kind).toBe('done')
        expect(step.op).toBe(i)
        expect(validate(step.tree, type).errors, `seed ${seed} operação ${i}`).toEqual([])
        expect(inorder(step.tree)).toEqual([...keys].sort((a, b) => a - b))
        const cost = result.cost[i]!
        if (type === 'rb') expect(cost.rotations).toBeLessThanOrEqual(op.t === 'i' ? 2 : 3)
        if (type === 'avl' && op.t === 'i') expect(cost.rotations).toBeLessThanOrEqual(2)
      }
      expect(result.steps.at(-1)!.tree).toEqual(result.final)
    }
  }, 60_000)
})

describe('contratos do motor', () => {
  it('preserva ids do sucessor e nunca reutiliza ids removidos', () => {
    for (const type of ['bst', 'avl', 'rb'] as const) {
      const result = runSequence(type, decodeOps('i40.i20.i60.i50.i70.i45.i55.d40.i41'))
      const before = result.steps[result.opRanges[6]![1]]!.tree
      const successorId = Number(Object.entries(before.nodes).find(([, n]) => n.key === 45)![0])
      expect(result.final.nodes[successorId]!.key).toBe(45)
      expect(result.final.nodes[1]).toBeUndefined()
      expect(Object.entries(result.final.nodes).find(([, n]) => n.key === 41)![0]).toBe('8')
    }
  })
  it('é determinístico, não altera ops e mantém snapshots independentes', () => {
    const ops = decodeOps('i3.i2.i1.d2.s3'), before = JSON.stringify(ops)
    const first = runSequence('avl', ops), second = runSequence('avl', ops)
    expect(first).toEqual(second)
    expect(JSON.stringify(ops)).toBe(before)
    expect(Object.isFrozen(first.final)).toBe(true)
    expect(Object.isFrozen(first.final.nodes[first.final.rootId!]!)).toBe(true)
    expect(() => Object.assign(first.final.nodes[first.final.rootId!]!, { key: 999 })).toThrow()
    expect(first.steps.at(-1)!.tree).toEqual(second.final)
  })
  it('explica duplicata, inexistência, chave inválida e limite sem alterar árvore', () => {
    const result = runSequence('bst', [{ t: 'i', k: 5 }, { t: 'i', k: 5 }, { t: 'd', k: 4 }, { t: 's', k: 4 }, { t: 'i', k: 1000 }])
    expect(inorder(result.final)).toEqual([5])
    expect(result.steps.some(s => s.kind === 'duplicate')).toBe(true)
    const limited = runSequence('avl', Array.from({ length: 64 }, (_, k) => ({ t: 'i', k })))
    expect(Object.keys(limited.final.nodes)).toHaveLength(63)
    expect(limited.steps.some(s => s.msg.key === 'limit')).toBe(true)
  })
  it('consulta percursos, mínimo, máximo, sucessor e predecessor pelo motor', () => {
    const base = decodeOps('i20.i10.i30.i5.i15.i25.i35')
    const cases: { op: Op; output: number[] }[] = [
      { op: { t: 'walk', order: 'in' }, output: [5, 10, 15, 20, 25, 30, 35] },
      { op: { t: 'walk', order: 'pre' }, output: [20, 10, 5, 15, 30, 25, 35] },
      { op: { t: 'walk', order: 'post' }, output: [5, 15, 10, 25, 35, 30, 20] },
      { op: { t: 'walk', order: 'level' }, output: [20, 10, 30, 5, 15, 25, 35] },
    ]
    for (const { op, output } of cases) expect(runSequence('bst', [...base, op]).steps.at(-1)!.meta!.order).toEqual(output)
    for (const [op, key] of [[{ t: 'min' }, 5], [{ t: 'max' }, 35], [{ t: 'succ', k: 20 }, 25], [{ t: 'pred', k: 20 }, 15], [{ t: 'succ', k: 15 }, 20], [{ t: 'pred', k: 25 }, 20]] as const) {
      expect(runSequence('bst', [...base, op]).steps.findLast(s => s.kind === 'found')!.msg.params.key).toBe(key)
    }
    expect(runSequence('bst', [...base, { t: 'succ', k: 35 }]).steps.some(s => s.msg.key === 'no-neighbor')).toBe(true)
  })
  it('executa cada rotação em quatro etapas com metadados consistentes', () => {
    const result = runSequence('avl', decodeOps('i30.i20.i10'))
    const index = result.steps.findIndex(s => s.kind === 'rotate-pre')
    expect(result.steps.slice(index - 1, index + 3).map(s => s.kind)).toEqual(['case', 'rotate-pre', 'rotate', 'update'])
    expect(result.steps.slice(index - 1, index + 3).every(s => s.meta?.rotation?.pivot === 1)).toBe(true)
    expect(result.final.nodes[result.final.rootId!]!.key).toBe(20)
  })
})

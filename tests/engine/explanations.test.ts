import { describe, expect, it } from 'vitest'
import { getMessage, presets, runSequence, seededSequence } from '../../app/engine'
import { getStepExplanation, getStepReason } from '../../app/engine/messages'

describe('explicações dos consertos', () => {
  it('cada giro e mudança de cor tem um motivo curto e os estados de cor reais', () => {
    for (const preset of presets) {
      const result = runSequence(preset.type, preset.ops)
      for (const [index, step] of result.steps.entries()) {
        expect(getMessage(step.msg).length).toBeLessThanOrEqual(140)
        if (!step.meta?.rotation && step.kind !== 'recolor') continue
        const reason = getStepReason(step)
        expect(reason.length).toBeGreaterThan(20)
        expect(reason.length).toBeLessThanOrEqual(140)
        expect(reason).not.toMatch(/undefined|NaN/)
        const explanation = getStepExplanation(step, preset.type)
        expect(explanation.diagnosis).not.toMatch(/undefined|NaN/)
        if (step.kind !== 'recolor') continue
        const id = Number(Object.keys(step.hl)[0])
        expect(step.msg.params.from).toBe(result.steps[index - 1]?.tree.nodes[id]?.c)
        expect(step.msg.params.color).toBe(step.tree.nodes[id]?.c)
        expect(step.msg.params.from).not.toBe(step.msg.params.color)
        const before = result.steps[index - 1]!.tree.nodes[id]!
        const after = step.tree.nodes[id]!
        expect([after.key, after.p, after.l, after.r]).toEqual([before.key, before.p, before.l, before.r])
      }
    }
  })
  it('o primeiro giro duplo diagnostica o ancestral desbalanceado, não o filho', () => {
    for (const id of ['avl-lr', 'avl-rl']) {
      const preset = presets.find(item => item.id === id)!
      const step = runSequence('avl', preset.ops).steps.find(item => item.meta?.rotation?.n === 1 && item.meta.rotation.of === 2)!
      expect(Math.abs(Number(step.msg.params.imbalanceBalance))).toBe(2)
      expect(step.msg.params.imbalanceKey).not.toBe(step.msg.params.key)
      expect(getStepExplanation(step, 'avl').diagnosis).toContain(String(step.msg.params.imbalanceKey))
      expect(getStepReason(step)).toContain('zigue-zague')
    }
  })
  it('pai e tio têm motivos diferentes no caso de tio vermelho', () => {
    const preset = presets.find(item => item.id === 'rb-i1')!
    const steps = runSequence('rb', preset.ops).steps.filter(step => step.kind === 'recolor' && step.code.line === 3)
    const parent = steps.find(step => step.msg.params.role === 'parent')!
    const uncle = steps.find(step => step.msg.params.role === 'uncle')!
    expect(getStepReason(parent)).toContain('vermelhos consecutivos')
    expect(getStepReason(uncle)).toContain('compensar')
    expect(getStepReason(parent)).not.toBe(getStepReason(uncle))
  })
  it('o caso final de remoção distingue irmão, pai e sobrinho distante', () => {
    const roles = new Set<string>()
    for (let seed = 1; seed <= 12; seed++) {
      const inserts = seededSequence(25, seed)
      const removals = inserts.slice(0, 18).map(op => ({ t: 'd' as const, k: 'k' in op ? op.k : 0 }))
      const steps = runSequence('rb', [...inserts, ...removals]).steps
      for (const step of steps) {
        if (step.kind !== 'recolor' || step.code.algo !== 'rb-delete-fix' || step.code.line !== 9) continue
        const role = String(step.msg.params.role)
        roles.add(role)
        const id = Number(Object.keys(step.hl)[0]), parent = step.meta?.extraBlack?.parent
        expect(parent).not.toBeNull()
        if (role === 'parent') expect(id).toBe(parent)
        else if (role === 'sibling') expect(step.tree.nodes[id]?.p).toBe(parent)
        else expect(step.tree.nodes[step.tree.nodes[id]!.p!]?.p).toBe(parent)
        expect(getStepReason(step)).toContain(role === 'sibling' ? 'herda' : role === 'parent' ? 'repor' : 'outro caminho')
      }
    }
    expect([...roles].sort()).toEqual(['far', 'parent', 'sibling'])
  })
})

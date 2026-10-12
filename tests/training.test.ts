import { describe, expect, it } from 'vitest'
import { createTrainingSession, seededRandom } from '../app/engine/training'
import { runSequence } from '../app/engine/index'
import { balance, height } from '../app/engine/tree'
import { validate } from '../app/engine/validate'
import { quizBank } from '../app/content/quiz'

describe('questões geradas pelo motor', () => {
  it('reproduz uma sessão pela mesma semente e mistura seis modalidades com conceitos', () => {
    expect(createTrainingSession(42, 8, quizBank)).toEqual(createTrainingSession(42, 8, quizBank))
    expect(createTrainingSession(43, 8, quizBank)).not.toEqual(createTrainingSession(42, 8, quizBank))
    const session = createTrainingSession(42, 8, quizBank)
    expect(session).toHaveLength(8)
    expect(new Set(session.map(question => question.kind)).size).toBe(7)
    expect(session.filter(question => question.kind === 'concept')).toHaveLength(2)
    expect(createTrainingSession(42, 3, quizBank)).toHaveLength(3)
  })

  it('deriva a resposta do oráculo em 200 sementes', () => {
    const kinds = new Set<string>(), cases = new Set<string>(), validityAnswers = new Set<number>()
    for (let seed = 1; seed <= 200; seed++) {
      for (const question of createTrainingSession(seed, 8, quizBank)) {
        kinds.add(question.kind)
        expect(question.answer).toBeGreaterThanOrEqual(0)
        expect(question.answer).toBeLessThan(question.options.length)
        expect(new Set(question.options).size).toBe(question.options.length)
        if (question.kind === 'concept') {
          const concept = quizBank.find(item => question.id.includes(item.id))!
          expect(question.answer).toBe(concept.answer)
          continue
        }
        const result = runSequence(question.type!, question.ops)
        expect(validate(result.final, question.type).valid).toBe(true)
        if (question.kind === 'height' || question.kind === 'balance') {
          const value = question.kind === 'height' ? height(result.final, result.final.rootId) : balance(result.final, result.final.rootId!)
          expect(Number(question.options[question.answer])).toBe(value)
          expect(question.oracle?.value).toBe(value)
        }
        if (question.kind === 'rotation') {
          const name = result.steps.find(step => step.op === question.ops.length - 1 && step.meta?.caseName)?.meta?.caseName
          expect(question.answer).toBe(['LL', 'RR', 'LR', 'RL'].indexOf(name!))
          expect(question.oracle?.value).toBe(name)
          cases.add(name!)
        }
        if (question.kind === 'rb-case') {
          const name = result.steps.find(step => step.op === question.ops.length - 1 && step.kind === 'case')?.meta?.caseName
          expect(question.answer).toBe(['RB-I1', 'RB-I2', 'RB-I3'].indexOf(name!.replace('-mirror', '')))
          expect(question.oracle?.value).toBe(name)
          cases.add(name!)
        }
        if (question.kind === 'parent') {
          const attach = result.steps.find(step => step.op === question.ops.length - 1 && step.kind === 'attach')!
          const node = Object.values(attach.tree.nodes).find(item => item.key === question.oracle?.subject)!
          expect(question.nodeOptions?.[question.answer]).toBe(node.p)
          expect(question.oracle?.value).toBe(node.p)
        }
        if (question.kind === 'validity') {
          const check = validate(question.tree!, question.type)
          expect(question.answer === 0).toBe(check.valid)
          expect(question.oracle?.value).toBe(check.valid)
          if (question.answer === 1) expect(check.errors.some(error => error.startsWith('Ordem ABB'))).toBe(true)
          if (question.answer === 2) expect(check.errors.some(error => error.startsWith('FB'))).toBe(true)
          if (question.answer === 3) expect(check.errors).toContain('Raiz deve ser preta')
          validityAnswers.add(question.answer)
        }
      }
    }
    expect(kinds.size).toBe(7)
    expect(validityAnswers).toEqual(new Set([0, 1, 2, 3]))
    expect(cases).toEqual(new Set(['LL', 'RR', 'LR', 'RL', 'RB-I1', 'RB-I2', 'RB-I3', 'RB-I1-mirror', 'RB-I2-mirror', 'RB-I3-mirror']))
  })

  it('mantém o gerador pseudoaleatório determinístico e dentro dos limites', () => {
    const a = seededRandom(123), b = seededRandom(123)
    for (let i = 0; i < 100; i++) {
      const value = a()
      expect(value).toBe(b())
      expect(value).toBeGreaterThanOrEqual(0)
      expect(value).toBeLessThan(1)
    }
  })
})

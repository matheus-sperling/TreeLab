import { describe, expect, it } from 'vitest'
import { lessons, modules } from '../app/content/lessons'
import { treeLessonSlugs } from '../app/content/catalog'
import { glossary } from '../app/content/glossary'
import { quizBank } from '../app/content/quiz'
import { complexityReferences, treeReferences } from '../app/content/cheatsheet'
import { runSequence } from '../app/engine'
import { validate } from '../app/engine/validate'

describe('conteúdo didático', () => {
  it('cobre M0–M6 com lições completas, custos e armadilhas', () => {
    expect(modules.map(module => module.id)).toEqual(['m0', 'm1', 'm2', 'm3', 'm4', 'm5', 'm6'])
    expect(new Set(lessons.map(lesson => lesson.slug)).size).toBe(lessons.length)
    for (const module of modules) expect(lessons.some(lesson => lesson.moduleId === module.id)).toBe(true)
    for (const lesson of lessons) {
      expect(lesson.tldr).toHaveLength(3)
      expect(lesson.pitfalls.length).toBeGreaterThan(0)
      const costs = lesson.blocks.filter(block => block.type === 'complexity')
      expect(costs.length).toBeGreaterThan(0)
      for (const cost of costs) for (const entry of cost.entries) {
        for (const key of ['best', 'average', 'worst', 'space'] as const) expect(entry[key].length).toBeGreaterThan(0)
      }
      const checks = lesson.blocks.filter(block => block.type === 'quickCheck').flatMap(block => block.questions)
      expect(checks.length).toBeGreaterThanOrEqual(2)
      for (const check of checks) {
        expect(check.answer).toBeGreaterThanOrEqual(0)
        expect(check.answer).toBeLessThan(check.options.length)
        expect(check.explanation.length).toBeGreaterThan(20)
      }
      if (lesson.nextSlug) expect(lessons.some(next => next.slug === lesson.nextSlug)).toBe(true)
    }
  })

  it('gera todos os exemplos pelo motor e termina em árvores válidas', () => {
    for (const lesson of lessons) for (const block of lesson.blocks) {
      if (block.type !== 'miniTree') continue
      const result = runSequence(block.treeType, block.ops)
      const validation = validate(result.final, block.treeType)
      expect(validation.errors, `${lesson.slug}: ${block.caption}`).toEqual([])
      expect(result.opRanges).toHaveLength(block.ops.length)
    }
  })

  it('mantém referências e questões com respostas e links válidos', () => {
    expect(glossary.length).toBeGreaterThanOrEqual(40)
    expect(quizBank.length).toBeGreaterThanOrEqual(40)
    expect(new Set(glossary.map(entry => entry.id)).size).toBe(glossary.length)
    expect(new Set(quizBank.map(question => question.id)).size).toBe(quizBank.length)
    for (const entry of glossary) for (const related of entry.related) expect(glossary.some(term => term.id === related)).toBe(true)
    for (const question of quizBank) {
      expect(question.options.length).toBeGreaterThanOrEqual(2)
      expect(question.answer).toBeGreaterThanOrEqual(0)
      expect(question.answer).toBeLessThan(question.options.length)
      expect(question.explanation.length).toBeGreaterThan(20)
    }
    expect(treeReferences.map(tree => tree.type)).toEqual(['bst', 'avl', 'rb'])
    const moduleIds = { bst: 'm1', avl: 'm3', rb: 'm4' } as const
    for (const type of ['bst', 'avl', 'rb'] as const) {
      expect(treeLessonSlugs[type]).toEqual(lessons.filter(lesson => lesson.moduleId === moduleIds[type]).map(lesson => lesson.slug))
    }
    expect(complexityReferences).toHaveLength(6)
    for (const operation of complexityReferences) expect(operation.rows.map(row => row.type)).toEqual(['bst', 'avl', 'rb'])
  })

  it('não publica conteúdo incompleto', () => {
    const data = JSON.stringify({ lessons, glossary, quizBank, treeReferences })
    expect(data.match(/\bTODO\b|\blorem ipsum\b|\ba verificar\b/g) || []).toHaveLength(0)
  })
})

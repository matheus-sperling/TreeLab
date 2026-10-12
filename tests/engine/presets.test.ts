import { describe, expect, it } from 'vitest'
import { decodeOps, presets, runSequence, validate } from '../../app/engine'
import type { Snapshot } from '../../app/engine'

function signature(tree: Snapshot, id = tree.rootId): string {
  if (id === null) return '.'
  const node = tree.nodes[id]!
  return `${node.key}${node.c ?? ''}(${signature(tree, node.l)},${signature(tree, node.r)})`
}
describe('presets didáticos travados', () => {
  for (const preset of presets) {
    it(preset.id, () => {
      const result = runSequence(preset.type, preset.ops)
      expect(validate(result.final, preset.type).errors).toEqual([])
      for (const caseName of preset.cases ?? []) expect(result.steps.some(s => s.meta?.caseName === caseName), caseName).toBe(true)
      if (preset.cases) expect(preset.ops.filter(op => op.t === 'i').length).toBeLessThanOrEqual(12)
      if (preset.deletionZeroBalance) expect(result.steps.filter(s => s.op === preset.ops.length - 1).some(s => s.meta?.childBalance === 0)).toBe(true)
      if (preset.cascade) {
        const rotations = result.steps.filter(s => s.op === preset.ops.length - 1 && s.kind === 'rotate' && s.meta?.rotation?.n === 1)
        expect(rotations.length).toBeGreaterThanOrEqual(2)
        expect(result.cost.at(-1)!.rotations).toBe(4)
      }
    })
  }
  it('trava árvores finais conhecidas CLRS e remoções', () => {
    const expected: Record<string, string> = {
      clrs: '38B(19R(12B(8R(.,.),.),31B(.,.)),41B(.,.))',
      'rb-d1': '4B(2B(.,3R(.,.)),5B(.,6R(.,.)))',
      'rb-d1-mirror': '3B(2B(1R(.,.),.),5B(4R(.,.),.))',
      'rb-d2': '2B(.,3R(.,.))', 'rb-d2-mirror': '3B(2R(.,.),.)',
      'rb-d3': '3B(2B(.,.),4B(.,.))', 'rb-d3-mirror': '2B(1B(.,.),3B(.,.))',
      'rb-d4': '3B(2B(.,.),4B(.,.))', 'rb-d4-mirror': '2B(1B(.,.),3B(.,.))',
    }
    for (const [id, known] of Object.entries(expected)) {
      const preset = presets.find(p => p.id === id)!
      expect(signature(runSequence('rb', preset.ops).final)).toBe(known)
    }
    expect(signature(runSequence('avl', decodeOps('i30.i10.i20')).final)).toBe('20(10(.,.),30(.,.))')
  })
})

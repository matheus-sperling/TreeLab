// @vitest-environment happy-dom
import { beforeEach, describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import { createPinia, setActivePinia } from 'pinia'
import { isValidOperation, useLabStore } from '../app/stores/lab'
import SequenceEditor from '../app/components/lab/SequenceEditor.vue'
import OperationsBar from '../app/components/lab/OperationsBar.vue'
import type { Op } from '../app/engine/types'

const stubs = { Icon: { props: ['name'], template: '<span aria-hidden="true" :data-icon="name" />' } }
beforeEach(() => setActivePinia(createPinia()))

describe('sequence changes', () => {
  it('loads examples at the start while supporting saved cursors and an end view', () => {
    const lab = useLabStore()
    const ops: Op[] = [{ t: 'i', k: 30 }, { t: 'i', k: 20 }, { t: 'i', k: 10 }]
    lab.replace(ops, 'start')
    expect(lab.cursor).toBe(0)
    expect(lab.tree.rootId).toBeNull()
    lab.replace(ops, 4)
    expect(lab.cursor).toBe(4)
    lab.replace(ops)
    expect(lab.cursor).toBe(lab.result.steps.length - 1)
    ops[0] = { t: 'i', k: 99 }
    expect(lab.operations[0]).toEqual({ t: 'i', k: 30 })
  })

  it('replays reordered operations and explains an ineffective removal', () => {
    const lab = useLabStore()
    lab.replace([{ t: 'i', k: 10 }, { t: 'd', k: 10 }, { t: 'i', k: 20 }])
    expect(Object.values(lab.result.final.nodes).map(node => node.key)).toEqual([20])
    expect(lab.moveOperation(1, 0)).toBe(true)
    expect(Object.values(lab.result.final.nodes).map(node => node.key).sort((a, b) => a - b)).toEqual([10, 20])
    expect(lab.operationIssue(0)).toMatch(/10.*não.*árvore/)
    expect(lab.cursor).toBe(0)
    expect(lab.updateOperation(0, { t: 'i', k: 5 })).toBe(true)
    expect(lab.operationIssue(0)).toBe('')
    expect(Object.values(lab.result.final.nodes).map(node => node.key).sort((a, b) => a - b)).toEqual([5, 10, 20])
  })

  it('rejects invalid indexes and values without altering the timeline', () => {
    const lab = useLabStore()
    lab.replace([{ t: 'i', k: 10 }])
    const original = [...lab.operations], cursor = lab.cursor
    expect(lab.moveOperation(-1, 0)).toBe(false)
    expect(lab.moveOperation(0, 1)).toBe(false)
    expect(lab.updateOperation(0.5, { t: 'i', k: 30 })).toBe(false)
    expect(lab.updateOperation(0, { t: 'i', k: 1000 })).toBe(false)
    expect(lab.removeOperation(-1)).toBeUndefined()
    expect(lab.replace([{ t: 'i', k: Number.NaN }])).toBe(false)
    expect(isValidOperation({ t: ['i'], k: 10 })).toBe(false)
    expect(isValidOperation({ t: 'walk', order: 'wrong' })).toBe(false)
    expect(lab.operations).toEqual(original)
    expect(lab.cursor).toBe(cursor)
  })
})

describe('explicit sequence editing', () => {
  it('edits numbers and operation types, moves and deletes with visible controls', async () => {
    const lab = useLabStore()
    lab.replace([{ t: 'i', k: 10 }, { t: 'i', k: 20 }])
    const wrapper = mount(SequenceEditor, { global: { stubs } })
    await wrapper.find('[aria-label="Número da operação 2"]').setValue('30')
    await wrapper.find('[aria-label="Número da operação 2"]').trigger('blur')
    expect(lab.operations[1]).toEqual({ t: 'i', k: 30 })
    await wrapper.find('[aria-label="Tipo da operação 2"]').setValue('d')
    expect(lab.operations[1]).toEqual({ t: 'd', k: 30 })
    expect(wrapper.text()).toMatch(/30.*não.*árvore/)
    await wrapper.find('[aria-label="Mover operação 2 para antes"]').trigger('click')
    expect(lab.operations[0]).toEqual({ t: 'd', k: 30 })
    await wrapper.find('[aria-label="Excluir operação 1"]').trigger('click')
    expect(lab.operations).toEqual([{ t: 'i', k: 10 }])
    expect(wrapper.emitted('change')).toHaveLength(4)
    wrapper.unmount()
  })

  it('keeps invalid draft input visible and refuses to reorder it until corrected', async () => {
    const lab = useLabStore()
    lab.replace([{ t: 'i', k: 10 }, { t: 'i', k: 20 }])
    const wrapper = mount(SequenceEditor, { global: { stubs } })
    const input = wrapper.find('[aria-label="Número da operação 2"]')
    await input.setValue('1000')
    await input.trigger('blur')
    await wrapper.find('[aria-label="Mover operação 2 para antes"]').trigger('click')
    expect(lab.operations).toEqual([{ t: 'i', k: 10 }, { t: 'i', k: 20 }])
    expect(input.attributes('aria-invalid')).toBe('true')
    expect(wrapper.text()).toContain('−999 a 999')
    await input.setValue('-15')
    await input.trigger('blur')
    expect(lab.operations[1]).toEqual({ t: 'i', k: -15 })
    expect(input.attributes('aria-invalid')).toBe('false')
    wrapper.unmount()
  })

  it('starts from an empty tree, adds a batch and exposes clear and close actions', async () => {
    const lab = useLabStore()
    const wrapper = mount(SequenceEditor, { global: { stubs } })
    expect(wrapper.text()).toContain('Uma árvore do seu jeito')
    await wrapper.find('#sequence-new-values').setValue('30, 10, 20')
    await wrapper.find('form').trigger('submit')
    expect(lab.operations).toEqual([{ t: 'i', k: 30 }, { t: 'i', k: 10 }, { t: 'i', k: 20 }])
    await wrapper.find('.clear-all').trigger('click')
    expect(wrapper.emitted('clear')).toHaveLength(1)
    await wrapper.find('.editor-done').trigger('click')
    expect(wrapper.emitted('close')).toHaveLength(1)
    wrapper.unmount()
  })

  it('opens an operation at its beginning and exposes edit and clear outside the scroll rail', async () => {
    const lab = useLabStore()
    lab.replace([{ t: 'i', k: 10 }, { t: 'i', k: 20 }])
    const wrapper = mount(OperationsBar, { global: { stubs } })
    await wrapper.findAll('.operations-rail button')[1]!.trigger('click')
    expect(wrapper.emitted('seek')).toEqual([[lab.result.opRanges[1]![0]]])
    await wrapper.find('[aria-label="Editar sequência de operações"]').trigger('click')
    expect(wrapper.emitted('edit')).toHaveLength(1)
    await wrapper.find('[aria-label="Limpar toda a árvore e a sequência"]').trigger('click')
    expect(wrapper.emitted('clear')).toHaveLength(1)
    lab.replace([], 'start')
    await nextTick()
    expect(wrapper.find('.clear-sequence').attributes('disabled')).toBeDefined()
    wrapper.unmount()
  })
})

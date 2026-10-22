// @vitest-environment happy-dom
import { beforeEach, describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { nextTick } from 'vue'
import Menu from '../app/components/lab/Menu.vue'
import { useSettingsStore } from '../app/stores/settings'
import { countTreeShapes, normalizeShapeSeed, shapeSequence } from '../app/engine/shapes'
import type { TreeType } from '../app/engine/types'

const stubs = {
  Icon: { props: ['name'], template: '<span aria-hidden="true" :data-icon="name" />' },
  NuxtLink: { props: ['to'], template: '<a :href="to"><slot /></a>' },
}
function setup(options: { type?: TreeType; count?: number; seed?: string } = {}) {
  const pinia = createPinia()
  setActivePinia(pinia)
  const store = useSettingsStore()
  store.load()
  if (options.count !== undefined) store.settings.randomCount = options.count
  if (options.seed !== undefined) store.settings.randomSeed = options.seed
  const wrapper = mount(Menu, { props: { value: '10', type: options.type ?? 'avl' }, attachTo: document.body, global: { plugins: [pinia], stubs } })
  return { wrapper, store }
}
async function tab(wrapper: ReturnType<typeof setup>['wrapper'], label: string) {
  const trigger = wrapper.findAll('[role="tab"]').find(item => item.text() === label)!
  await trigger.trigger('mousedown', { button: 0, ctrlKey: false })
  await trigger.trigger('click')
}
beforeEach(() => { localStorage.clear(); document.body.innerHTML = '' })

describe('menu do laboratório', () => {
  it('a semente e a quantidade atualizam imediatamente sem fechar o menu', async () => {
    const { wrapper, store } = setup()
    expect(wrapper.emitted('generate')).toBeUndefined()
    await wrapper.find('#lab-random-seed').setValue('3')
    expect(wrapper.emitted('generate')?.at(-1)).toEqual([shapeSequence('avl', 7, '3')])
    expect(wrapper.find('#lab-random-seed').exists()).toBe(true)
    await wrapper.find('#lab-random-count').setValue('9')
    expect(wrapper.emitted('generate')?.at(-1)).toEqual([shapeSequence('avl', 9, '3')])
    expect(store.settings.randomSeed).toBe('3')
    expect(store.settings.randomCount).toBe(9)
    expect(wrapper.emitted('preset')).toBeUndefined()
    wrapper.unmount()
  })
  it('campos incompletos ou fora da faixa preservam a árvore e a última semente válida', async () => {
    const { wrapper, store } = setup()
    const previousSeed = normalizeShapeSeed('avl', 7, '42')
    await wrapper.find('#lab-random-seed').setValue('')
    expect(wrapper.emitted('generate')).toBeUndefined()
    expect(store.settings.randomSeed).toBe(previousSeed)
    expect(wrapper.find('.generate-button').attributes('disabled')).toBeDefined()
    for (const invalid of [countTreeShapes('avl', 7).toString(), '-1', '1.5', '1e2']) {
      await wrapper.find('#lab-random-seed').setValue(invalid)
      expect(wrapper.emitted('generate')).toBeUndefined()
      expect(store.settings.randomSeed).toBe(previousSeed)
      expect(wrapper.find('#lab-random-seed').attributes('aria-invalid')).toBe('true')
    }
    await wrapper.find('#lab-random-count').setValue('0')
    await wrapper.find('#lab-random-seed').setValue('0')
    expect(wrapper.emitted('generate')).toBeUndefined()
    await wrapper.find('#lab-random-count').setValue('7')
    expect(wrapper.emitted('generate')?.at(-1)).toEqual([shapeSequence('avl', 7, '0')])
    wrapper.unmount()
  })
  it.each(['bst', 'avl', 'rb'] as const)('com 1 ou 2 nós, limita os formatos de %s', async type => {
    const { wrapper, store } = setup({ type, count: 1, seed: '42' })
    const seedInput = wrapper.find('#lab-random-seed')
    expect((seedInput.element as HTMLInputElement).value).toBe('0')
    expect(seedInput.attributes('disabled')).toBeDefined()
    expect(wrapper.find('.generator-note').text()).toContain('apenas 1 formato possível')
    expect(store.settings.randomSeed).toBe('0')
    expect(wrapper.emitted('generate')).toBeUndefined()
    await wrapper.find('#lab-random-count').setValue('2')
    expect(seedInput.attributes('disabled')).toBeUndefined()
    expect(wrapper.find('.generator-note').text()).toContain('2 formatos possíveis')
    await seedInput.setValue('1')
    expect(wrapper.emitted('generate')?.at(-1)).toEqual([shapeSequence(type, 2, '1')])
    const generated = wrapper.emitted('generate')!.length
    await seedInput.setValue('2')
    expect(wrapper.emitted('generate')).toHaveLength(generated)
    expect(wrapper.find('.generator-note').text()).toContain('0 a 1')
    wrapper.unmount()
  })
  it('com 3 nós, oferece 5 formatos de ABB e 1 formato de AVL ou RN', async () => {
    const { wrapper } = setup({ type: 'bst', count: 3, seed: '4' })
    expect(wrapper.find('.generator-note').text()).toContain('ABB: 5 formatos possíveis')
    await wrapper.find('#lab-random-seed').setValue('5')
    expect(wrapper.emitted('generate')).toBeUndefined()
    expect(wrapper.find('.generate-button').attributes('disabled')).toBeDefined()
    await wrapper.setProps({ type: 'avl' })
    expect(wrapper.find('.generator-note').text()).toContain('AVL: apenas 1 formato possível')
    expect((wrapper.find('#lab-random-seed').element as HTMLInputElement).value).toBe('0')
    expect(wrapper.emitted('generate')).toHaveLength(1)
    await wrapper.setProps({ type: 'rb' })
    expect(wrapper.find('.generator-note').text()).toContain('Rubro-Negra: apenas 1 formato possível')
    expect(wrapper.emitted('generate')).toHaveLength(2)
    wrapper.unmount()
  })
  it('reduzir a quantidade ajusta a semente ao novo limite e gera apenas uma vez', async () => {
    const { wrapper, store } = setup({ type: 'bst', count: 7, seed: '42' })
    await wrapper.find('#lab-random-count').setValue('3')
    expect((wrapper.find('#lab-random-seed').element as HTMLInputElement).value).toBe('4')
    expect(store.settings.randomSeed).toBe('4')
    expect(wrapper.emitted('generate')).toEqual([[shapeSequence('bst', 3, '4')]])
    await wrapper.setProps({ type: 'avl' })
    expect(store.settings.randomSeed).toBe('0')
    expect(wrapper.emitted('generate')).toHaveLength(2)
    expect(wrapper.emitted('generate')?.at(-1)).toEqual([shapeSequence('avl', 3, '0')])
    wrapper.unmount()
  })
  it('preserva sementes maiores que a precisão segura de Number', async () => {
    const lastSeed = (countTreeShapes('bst', 63) - 1n).toString()
    const { wrapper, store } = setup({ type: 'bst', count: 63, seed: '0' })
    await wrapper.find('#lab-random-seed').setValue(lastSeed)
    expect(store.settings.randomSeed).toBe(lastSeed)
    expect(wrapper.emitted('generate')?.at(-1)).toEqual([shapeSequence('bst', 63, lastSeed)])
    await nextTick()
    expect(JSON.parse(localStorage.getItem('treelab:settings')!).randomSeed).toBe(lastSeed)
    wrapper.unmount()
  })
  it('ajusta a semente quando aumentar os nós reduz a quantidade de formatos AVL', async () => {
    const { wrapper, store } = setup({ type: 'avl', count: 5, seed: '5' })
    await wrapper.find('#lab-random-count').setValue('6')
    expect(store.settings.randomSeed).toBe('3')
    expect(wrapper.emitted('generate')).toEqual([[shapeSequence('avl', 6, '3')]])
    wrapper.unmount()
  })
  it('a aba, a reprodução e a semente sobrevivem a uma nova sessão', async () => {
    const { wrapper, store } = setup()
    await wrapper.find('#lab-random-seed').setValue('3')
    await tab(wrapper, 'Opções')
    await wrapper.find('#lab-playback-speed').setValue('2')
    await wrapper.find('#lab-granularity').setValue('summary')
    await wrapper.find('[role="switch"][aria-label="Resposta tátil"]').trigger('click')
    await nextTick()
    expect(store.settings.haptics).toBe(false)
    wrapper.unmount()
    const restored = setup()
    expect(restored.store.settings).toMatchObject({ labMenuSection: 'options', speed: 2, granularity: 'summary', haptics: false, randomSeed: '3' })
    expect(restored.wrapper.find('#lab-playback-speed').exists()).toBe(true)
    await tab(restored.wrapper, 'Exemplos')
    expect((restored.wrapper.find('#lab-random-seed').element as HTMLInputElement).value).toBe('3')
    expect(restored.wrapper.emitted('generate')).toBeUndefined()
    restored.wrapper.unmount()
  })
  it('editar, começar do zero e exemplos enviam ações distintas', async () => {
    const { wrapper } = setup()
    await wrapper.findAll('.menu-start button')[0]!.trigger('click')
    await wrapper.findAll('.menu-start button')[1]!.trigger('click')
    await wrapper.find('.menu-presets button').trigger('click')
    expect(wrapper.emitted('sequence')).toHaveLength(1)
    expect(wrapper.emitted('clear')).toHaveLength(1)
    expect(wrapper.emitted('preset')?.[0]).toEqual([[{ t: 'i', k: 30 }, { t: 'i', k: 20 }, { t: 'i', k: 10 }], 'avl'])
    expect(wrapper.emitted('generate')).toBeUndefined()
    wrapper.unmount()
  })
  it('migra sementes numéricas antigas e ajusta ao tipo sem alterar a árvore na abertura', () => {
    localStorage.setItem('treelab:settings', JSON.stringify({ randomSeed: 42, randomCount: 3 }))
    const { wrapper, store } = setup({ type: 'bst' })
    expect(store.settings.randomSeed).toBe('4')
    expect(wrapper.emitted('generate')).toBeUndefined()
    wrapper.unmount()
  })
  it('preferências inválidas salvas voltam aos padrões utilizáveis', () => {
    localStorage.setItem('treelab:settings', JSON.stringify({ randomSeed: 'NaN', randomCount: 999, labMenuSection: 'unknown', speed: -1, haptics: 'false' }))
    const { wrapper, store } = setup({ type: 'bst' })
    expect(store.settings).toMatchObject({ randomSeed: '42', randomCount: 7, labMenuSection: 'examples', speed: 1, haptics: true })
    wrapper.unmount()
  })
})

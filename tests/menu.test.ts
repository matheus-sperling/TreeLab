// @vitest-environment happy-dom
import { beforeEach, describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { nextTick } from 'vue'
import Menu from '../app/components/lab/Menu.vue'
import { useSettingsStore } from '../app/stores/settings'
import { seededSequence } from '../app/engine/presets'

const stubs = {
  Icon: { props: ['name'], template: '<span aria-hidden="true" :data-icon="name" />' },
  NuxtLink: { props: ['to'], template: '<a :href="to"><slot /></a>' },
}
function setup() {
  const pinia = createPinia()
  setActivePinia(pinia)
  const store = useSettingsStore()
  store.load()
  const wrapper = mount(Menu, { props: { value: '10', type: 'avl' }, attachTo: document.body, global: { plugins: [pinia], stubs } })
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
    await wrapper.find('#lab-random-seed').setValue('43')
    expect(wrapper.emitted('generate')?.at(-1)).toEqual([seededSequence(7, 43)])
    expect(wrapper.find('#lab-random-seed').exists()).toBe(true)
    await wrapper.find('#lab-random-count').setValue('9')
    expect(wrapper.emitted('generate')?.at(-1)).toEqual([seededSequence(9, 43)])
    expect(store.settings.randomSeed).toBe(43)
    expect(store.settings.randomCount).toBe(9)
    expect(wrapper.emitted('preset')).toBeUndefined()
    wrapper.unmount()
  })
  it('campos incompletos ou inválidos preservam a árvore e a última semente válida', async () => {
    const { wrapper, store } = setup()
    await wrapper.find('#lab-random-seed').setValue('')
    expect(wrapper.emitted('generate')).toBeUndefined()
    expect(store.settings.randomSeed).toBe(42)
    expect(wrapper.find('.generate-button').attributes('disabled')).toBeDefined()
    await wrapper.find('#lab-random-seed').setValue('4294967296')
    expect(wrapper.emitted('generate')).toBeUndefined()
    await wrapper.find('#lab-random-count').setValue('0')
    await wrapper.find('#lab-random-seed').setValue('0')
    expect(wrapper.emitted('generate')).toBeUndefined()
    await wrapper.find('#lab-random-count').setValue('7')
    expect(wrapper.emitted('generate')?.at(-1)).toEqual([seededSequence(7, 0)])
    wrapper.unmount()
  })
  it('a aba, a reprodução e a semente sobrevivem a uma nova sessão', async () => {
    const { wrapper, store } = setup()
    await wrapper.find('#lab-random-seed').setValue('81')
    await tab(wrapper, 'Opções')
    await wrapper.find('#lab-playback-speed').setValue('2')
    await wrapper.find('#lab-granularity').setValue('summary')
    await wrapper.find('[role="switch"][aria-label="Resposta tátil"]').trigger('click')
    await nextTick()
    expect(store.settings.haptics).toBe(false)
    wrapper.unmount()
    const restored = setup()
    expect(restored.store.settings).toMatchObject({ labMenuSection: 'options', speed: 2, granularity: 'summary', haptics: false, randomSeed: 81 })
    expect(restored.wrapper.find('#lab-playback-speed').exists()).toBe(true)
    await tab(restored.wrapper, 'Exemplos')
    expect((restored.wrapper.find('#lab-random-seed').element as HTMLInputElement).value).toBe('81')
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
  it('preferências inválidas salvas voltam aos padrões utilizáveis', () => {
    localStorage.setItem('treelab:settings', JSON.stringify({ randomSeed: 'NaN', randomCount: 999, labMenuSection: 'unknown', speed: -1, haptics: 'false' }))
    const { wrapper, store } = setup()
    expect(store.settings).toMatchObject({ randomSeed: 42, randomCount: 7, labMenuSection: 'examples', speed: 1, haptics: true })
    wrapper.unmount()
  })
})

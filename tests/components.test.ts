// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { computed, ref } from 'vue'
import NumberPad from '../app/components/lab/NumberPad.vue'
import PlayerBar from '../app/components/lab/PlayerBar.vue'

const fixture = vi.hoisted(() => ({ cursor: 1, range: [0, 3], operations: [{ t: 'i', k: 10 }], result: { steps: [{}, {}, {}, {}] } }))
vi.mock('../app/stores/lab', () => ({ useLabStore: () => fixture }))
vi.mock('../app/stores/settings', () => ({ useSettingsStore: () => ({ settings: { haptics: false, reducedMotion: true, speed: 1 } }) }))
vi.mock('motion-v', () => ({ motion: { button: { template: '<button><slot /></button>' } } }))
const stubs = {
  Icon: { props: ['name'], template: '<span aria-hidden="true" :data-icon="name" />' },
  UiIconButton: { props: ['label', 'disabled'], template: '<button :aria-label="label" :disabled="disabled"><slot /></button>' },
  UiSlider: { props: ['modelValue', 'min', 'max', 'label'], emits: ['update:modelValue'], template: '<input type="range" :aria-label="label" :min="min" :max="max" :value="modelValue" @input="$emit(\'update:modelValue\', Number($event.target.value))">' },
}

describe('number pad interaction', () => {
  it('emits real number, sign and separator edits', async () => {
    const wrapper = mount(NumberPad, { props: { modelValue: '10', existing: [], haptics: false }, global: { stubs } })
    await wrapper.find('[aria-label="Alternar sinal"]').trigger('click')
    expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual(['-10'])
    await wrapper.setProps({ modelValue: '-10' })
    await wrapper.find('[aria-label="Separar valores"]').trigger('click')
    expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual(['-10, '])
    await wrapper.setProps({ modelValue: '-10, ' })
    await wrapper.find('[aria-label="7"]').trigger('click')
    expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual(['-10, 7'])
    wrapper.unmount()
  })
  it('clears on a long backspace press without a trailing delete', async () => {
    vi.useFakeTimers()
    const wrapper = mount(NumberPad, { props: { modelValue: '123', existing: [], haptics: false }, global: { stubs } })
    const backspace = wrapper.find('[aria-label="Apagar; segure para limpar"]')
    await backspace.trigger('pointerdown')
    await vi.advanceTimersByTimeAsync(550)
    await backspace.trigger('pointerup'); await backspace.trigger('click')
    expect(wrapper.emitted('update:modelValue')).toEqual([['']])
    wrapper.unmount(); vi.useRealTimers()
  })
  it('chooses an available key and exposes an explicit close action', async () => {
    const random = vi.spyOn(Math, 'random').mockReturnValue(0)
    const wrapper = mount(NumberPad, { props: { modelValue: '', existing: [1, 2, 3], haptics: false }, global: { stubs } })
    await wrapper.find('[aria-label="Valor aleatório livre"]').trigger('click')
    expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual(['4'])
    await wrapper.find('[aria-label="Recolher teclado"]').trigger('click')
    expect(wrapper.emitted('close')).toHaveLength(1)
    wrapper.unmount(); random.mockRestore()
  })
  it('keeps the list when suggesting a new distinct value and supports explicit clearing', async () => {
    const random = vi.spyOn(Math, 'random').mockReturnValue(0)
    const wrapper = mount(NumberPad, { props: { modelValue: '1, 4', existing: [2, 3], haptics: false }, global: { stubs } })
    await wrapper.find('[aria-label="Valor aleatório livre"]').trigger('click')
    expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual(['1, 4, 5'])
    await wrapper.find('[aria-label="Limpar valores"]').trigger('click')
    expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual([''])
    await wrapper.setProps({ modelValue: Array.from({ length: 20 }, (_, index) => index).join(',') })
    expect(wrapper.find('[aria-label="Valor aleatório livre"]').attributes('disabled')).toBeDefined()
    wrapper.unmount(); random.mockRestore()
  })
})

function playerFixture() {
  const playing = ref(false)
  return {
    playing, speed: ref(1), state: computed(() => playing.value ? 'playing' as const : 'paused' as const), summarized: ref(false), pauseKeyMoments: ref(false),
    play: vi.fn(() => { playing.value = !playing.value }), pause: vi.fn(), seek: vi.fn(), move: vi.fn(), previous: vi.fn(), next: vi.fn(),
    cycleSpeed: vi.fn(), append: vi.fn(), hold: vi.fn(), release: vi.fn(), visibility: vi.fn(),
  }
}
describe('player controls', () => {
  beforeEach(() => { fixture.cursor = 1; fixture.operations = [{ t: 'i', k: 10 }] })
  it('switches play and pause labels and forwards seeks', async () => {
    const player = playerFixture()
    const wrapper = mount(PlayerBar, { props: { player }, global: { stubs } })
    await wrapper.find('[aria-label="Reproduzir"]').trigger('click')
    expect(wrapper.find('[aria-label="Pausar"]').exists()).toBe(true)
    await wrapper.find('input[type="range"]').setValue('2')
    expect(player.seek).toHaveBeenCalledWith(2)
    await wrapper.find('[aria-label="Passo anterior"]').trigger('click')
    expect(player.move).toHaveBeenCalledWith(-1)
    wrapper.unmount()
  })
  it('disables playback for an empty sequence and supports speed and step repetition', async () => {
    fixture.operations = []
    const player = playerFixture()
    const wrapper = mount(PlayerBar, { props: { player }, global: { stubs } })
    expect(wrapper.find('[aria-label="Reproduzir"]').attributes('disabled')).toBeDefined()
    await wrapper.find('[aria-label="Velocidade 1 vezes; tocar para alterar"]').trigger('click')
    expect(player.cycleSpeed).toHaveBeenCalledOnce()
    const next = wrapper.find('[aria-label="Próximo passo"]')
    await next.trigger('pointerdown'); await next.trigger('pointerup')
    expect(player.hold).toHaveBeenCalledWith(1)
    expect(player.release).toHaveBeenCalledOnce()
    wrapper.unmount()
  })
})

// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { defineComponent } from 'vue'
import { createPinia, setActivePinia } from 'pinia'
import { useUrlSync } from '../app/composables/useUrlSync'
import { useLabStore } from '../app/stores/lab'

const Host = defineComponent({ setup() { useUrlSync(); return () => null } })
beforeEach(() => {
  setActivePinia(createPinia())
  localStorage.clear()
  history.replaceState({}, '', '/lab')
  vi.useFakeTimers()
})
afterEach(() => vi.useRealTimers())

describe('laboratory URL and session restoration', () => {
  it('starts a preset link at the beginning and preserves an explicit shared cursor', () => {
    history.replaceState({}, '', '/lab?t=avl&q=i30.i20.i10')
    let wrapper = mount(Host)
    let lab = useLabStore()
    expect(lab.cursor).toBe(0)
    expect(lab.tree.rootId).toBeNull()
    wrapper.unmount()
    setActivePinia(createPinia())
    history.replaceState({}, '', '/lab?t=avl&q=i30.i20.i10&c=6')
    wrapper = mount(Host)
    lab = useLabStore()
    expect(lab.cursor).toBe(6)
    wrapper.unmount()
  })

  it('persists the latest edit when leaving before debounce without altering the destination URL', async () => {
    const wrapper = mount(Host)
    const lab = useLabStore()
    lab.append([{ t: 'i', k: 42 }])
    history.replaceState({}, '', '/comparar')
    wrapper.unmount()
    expect(JSON.parse(localStorage.getItem('treelab-lab')!).ops).toEqual([{ t: 'i', k: 42 }])
    await vi.advanceTimersByTimeAsync(200)
    expect(location.pathname).toBe('/comparar')
    expect(location.search).toBe('')
    history.replaceState({}, '', '/lab')
    setActivePinia(createPinia())
    const restored = mount(Host)
    expect(useLabStore().operations).toEqual([{ t: 'i', k: 42 }])
    restored.unmount()
  })

  it('flushes immediately when the page is hidden and discards malformed saved operations', () => {
    localStorage.setItem('treelab-lab', JSON.stringify({ type: 'avl', ops: [{ t: 'i', k: null }], cursor: 100 }))
    const wrapper = mount(Host)
    const lab = useLabStore()
    expect(lab.operations).toEqual([])
    lab.append([{ t: 'i', k: -5 }])
    window.dispatchEvent(new Event('pagehide'))
    expect(JSON.parse(localStorage.getItem('treelab-lab')!).ops).toEqual([{ t: 'i', k: -5 }])
    expect(new URLSearchParams(location.search).get('q')).toBe('i-5')
    wrapper.unmount()
  })
})

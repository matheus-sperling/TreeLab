import { useLabStore } from '../stores/lab'
import { encodeOps } from '../engine'

export function useSheetStack() {
  const current = ref<string | null>(null)
  const lab = useLabStore()
  let pushed = false
  let closing = false
  function open(name: string) {
    if (!current.value) { history.pushState({ ...history.state, treeLabSheet: true }, '', `${location.pathname}${location.search}`); pushed = true }
    current.value = name
  }
  function close() {
    current.value = null
    if (pushed) { pushed = false; closing = true; history.back() }
  }
  function pop() {
    const wasSheet = pushed || closing
    current.value = null; pushed = false; closing = false
    if (wasSheet && location.pathname === '/lab') {
      const query = new URLSearchParams(location.search)
      query.set('t', lab.type); query.set('q', encodeOps(lab.operations)); query.set('c', String(lab.cursor)); query.delete('conceito')
      history.replaceState(history.state, '', `${location.pathname}?${query}`)
    }
  }
  function key(event: KeyboardEvent) { if (event.key === 'Escape' && current.value) close() }
  onMounted(() => { window.addEventListener('popstate', pop); window.addEventListener('keydown', key) })
  onBeforeUnmount(() => { window.removeEventListener('popstate', pop); window.removeEventListener('keydown', key) })
  return { current, open, close }
}

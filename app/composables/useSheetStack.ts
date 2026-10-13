export function useSheetStack() {
  const current = ref<string | null>(null)
  let pushed = false
  let closingUrl: string | undefined
  function open(name: string) {
    if (!current.value) { history.pushState({ ...history.state, treeLabSheet: true }, '', `${location.pathname}${location.search}`); pushed = true }
    current.value = name
  }
  function close() {
    current.value = null
    if (pushed) { closingUrl = `${location.pathname}${location.search}`; pushed = false; history.back() }
  }
  function pop() { current.value = null; pushed = false; if (closingUrl) { history.replaceState(history.state, '', closingUrl); closingUrl = undefined } }
  function key(event: KeyboardEvent) { if (event.key === 'Escape' && current.value) close() }
  onMounted(() => { window.addEventListener('popstate', pop); window.addEventListener('keydown', key) })
  onBeforeUnmount(() => { window.removeEventListener('popstate', pop); window.removeEventListener('keydown', key) })
  return { current, open, close }
}

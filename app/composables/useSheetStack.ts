export function useSheetStack() {
  const current = ref<string | null>(null)
  let pushed = false
  function open(name: string) {
    if (!current.value) { history.pushState({ treeLabSheet: true }, '', `${location.pathname}${location.search}#sheet`); pushed = true }
    current.value = name
  }
  function close() {
    current.value = null
    if (pushed) { pushed = false; history.back() }
  }
  function pop() { current.value = null; pushed = false }
  function key(event: KeyboardEvent) { if (event.key === 'Escape' && current.value) close() }
  onMounted(() => { window.addEventListener('popstate', pop); window.addEventListener('keydown', key) })
  onBeforeUnmount(() => { window.removeEventListener('popstate', pop); window.removeEventListener('keydown', key) })
  return { current, open, close }
}

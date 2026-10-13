import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useLabStore } from '../stores/lab'
import { decodeOps, encodeOps } from '../engine'
import type { TreeType } from '../engine/types'

export function useUrlSync() {
  const lab = useLabStore()
  const restored = ref(false)
  let saveTimer: ReturnType<typeof setTimeout> | undefined
  let labPath = '/lab'
  function persist(updateUrl = true) {
    if (!restored.value) return
    if (updateUrl && location.pathname === labPath) {
      const query = new URLSearchParams(location.search)
      query.set('t', lab.type); query.set('q', encodeOps(lab.operations)); query.set('c', String(lab.cursor))
      history.replaceState(history.state, '', `${labPath}?${query}${location.hash}`)
    }
    try { localStorage.setItem('treelab-lab', JSON.stringify({ type: lab.type, ops: lab.operations, cursor: lab.cursor })) } catch { /* A sessão continua sem armazenamento. */ }
  }
  function pageHidden() { persist() }
  const stop = watch(() => [lab.type, lab.operations, lab.cursor] as const, () => {
    if (!restored.value) return
    if (saveTimer) clearTimeout(saveTimer)
    saveTimer = setTimeout(() => persist(), 180)
  }, { deep: true })
  onMounted(() => {
    labPath = location.pathname
    window.addEventListener('pagehide', pageHidden)
    const params = new URLSearchParams(location.search)
    try {
      if (['bst', 'avl', 'rb'].includes(params.get('t') ?? '')) lab.type = params.get('t') as TreeType
      if (params.has('q')) {
        lab.replace(decodeOps(params.get('q') ?? ''), 'start')
        lab.seek(Number(params.get('c') ?? 0))
      }
      else {
        const saved: { type?: TreeType; ops?: Parameters<typeof lab.replace>[0]; cursor?: number } = JSON.parse(localStorage.getItem('treelab-lab') ?? '{}')
        if (saved?.ops && ['bst', 'avl', 'rb'].includes(saved.type ?? '')) {
          if (!params.has('t')) lab.type = saved.type!
          if (!lab.replace(saved.ops, saved.cursor ?? 0)) lab.replace([], 'start')
        }
      }
    }
    catch { lab.replace([]) }
    restored.value = true
    persist()
  })
  onBeforeUnmount(() => {
    stop()
    if (saveTimer) clearTimeout(saveTimer)
    // O navegador já pode estar na próxima rota: salve a sessão sem reescrever a URL dela.
    persist(false)
    window.removeEventListener('pagehide', pageHidden)
  })
  async function share() {
    const query = new URLSearchParams({ t: lab.type, q: encodeOps(lab.operations), c: String(lab.cursor) })
    const url = `${location.origin}/lab?${query}`
    if (navigator.share) { try { await navigator.share({ title: 'TreeLab — minha sequência', url }); return true } catch { return false } }
    await navigator.clipboard.writeText(url)
    return true
  }
  return { restored, share }
}

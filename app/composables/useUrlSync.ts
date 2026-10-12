import { useLabStore } from '../stores/lab'
import { decodeOps, encodeOps } from '../engine'
import type { TreeType } from '../engine/types'

export function useUrlSync() {
  const lab = useLabStore()
  const restored = ref(false)
  let saveTimer: ReturnType<typeof setTimeout> | undefined
  const stop = watch(() => [lab.type, lab.operations, lab.cursor] as const, () => {
    if (!restored.value) return
    if (saveTimer) clearTimeout(saveTimer)
    saveTimer = setTimeout(() => {
      const query = new URLSearchParams({ t: lab.type, q: encodeOps(lab.operations), c: String(lab.cursor) })
      history.replaceState(history.state, '', `${location.pathname}?${query}${location.hash}`)
      try { localStorage.setItem('treelab-lab', JSON.stringify({ type: lab.type, ops: lab.operations, cursor: lab.cursor })) } catch { /* A sessão continua sem armazenamento. */ }
    }, 180)
  }, { deep: true })
  onMounted(() => {
    const params = new URLSearchParams(location.search)
    try {
      if (['bst', 'avl', 'rb'].includes(params.get('t') ?? '')) lab.type = params.get('t') as TreeType
      if (params.has('q')) {
        lab.replace(decodeOps(params.get('q') ?? ''))
        lab.seek(Number(params.get('c') ?? lab.result.steps.length - 1))
      }
      else {
        const saved: { type?: TreeType; ops?: Parameters<typeof lab.replace>[0]; cursor?: number } = JSON.parse(localStorage.getItem('treelab-lab') ?? '{}')
        if (saved.ops && ['bst', 'avl', 'rb'].includes(saved.type ?? '')) { if (!params.has('t')) lab.type = saved.type!; lab.replace(saved.ops); lab.seek(saved.cursor ?? 0) }
      }
    }
    catch { lab.replace([]) }
    restored.value = true
  })
  onBeforeUnmount(() => { stop(); if (saveTimer) clearTimeout(saveTimer) })
  async function share() {
    const query = new URLSearchParams({ t: lab.type, q: encodeOps(lab.operations), c: String(lab.cursor) })
    const url = `${location.origin}/lab?${query}`
    if (navigator.share) { try { await navigator.share({ title: 'TreeLab — minha sequência', url }); return true } catch { return false } }
    await navigator.clipboard.writeText(url)
    return true
  }
  return { restored, share }
}

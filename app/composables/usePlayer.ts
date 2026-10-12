import { useLabStore } from '../stores/lab'
import { getMessage } from '../engine'
import { createPlayback, stepDwell } from '../components/lab/playerCore'
export { stepDwell } from '../components/lab/playerCore'
export const playerSpeeds = [.5, 1, 1.5, 2, 4]

export function usePlayer() {
  const lab = useLabStore()
  const playing = ref(false)
  const speed = ref(1)
  const summarized = ref(false)
  const pauseKeyMoments = ref(false)
  const batchEnd = ref<number | null>(null)
  let repeatTimer: ReturnType<typeof setTimeout> | undefined
  const core = createPlayback({
    cursor: () => lab.cursor, length: () => lab.result.steps.length, range: () => lab.range as [number, number],
    ranges: () => lab.result.opRanges, operation: () => lab.operationIndex,
    kind: index => lab.result.steps[index]?.kind ?? '', seek: (index, instant) => lab.seek(index, instant),
    dwell: () => stepDwell(lab.step ? getMessage(lab.step.msg).length : 0, speed.value, lab.step?.kind === 'rotate' ? 700 : 450),
    summary: () => summarized.value || batchEnd.value !== null && lab.operationIndex <= batchEnd.value,
    pauseOnKey: () => pauseKeyMoments.value, changed: value => { playing.value = value; if (!value && lab.cursor === lab.result.steps.length - 1) batchEnd.value = null }, batchEnd: () => batchEnd.value,
  })
  const state = computed(() => { void playing.value; void lab.cursor; void lab.operations; return core.state() })
  function cycleSpeed(delta = 1) {
    const index = playerSpeeds.indexOf(speed.value)
    speed.value = playerSpeeds[(index + delta + playerSpeeds.length) % playerSpeeds.length] ?? 1
  }
  function append(ops: Parameters<typeof lab.append>[0]) {
    core.pause(); lab.seek(lab.range[1] ?? 0); lab.append(ops)
    batchEnd.value = ops.length > 3 ? lab.operations.length - 1 : null
    core.play()
  }
  function hold(delta: number) {
    const tick = () => { core.move(delta); repeatTimer = setTimeout(tick, 167) }
    repeatTimer = setTimeout(tick, 450)
  }
  function release() { if (repeatTimer) clearTimeout(repeatTimer) }
  function keydown(event: KeyboardEvent) {
    if (event.target instanceof Element && event.target.closest('input,textarea,button,a,select,[contenteditable="true"],[role="slider"],[role="switch"],[role="tab"],[role="dialog"]')) return
    if (event.key === ' ') { event.preventDefault(); core.play() }
    else if (event.key === 'ArrowLeft') { event.preventDefault(); core.move(-1) }
    else if (event.key === 'ArrowRight') { event.preventDefault(); core.move(1) }
    else if (event.key === '[') cycleSpeed(-1)
    else if (event.key === ']') cycleSpeed()
  }
  function visibility() { core.visibility(document.hidden); if (document.hidden) release() }
  onMounted(() => { document.addEventListener('visibilitychange', visibility); window.addEventListener('keydown', keydown) })
  onBeforeUnmount(() => { core.pause(); release(); document.removeEventListener('visibilitychange', visibility); window.removeEventListener('keydown', keydown) })
  return { ...core, playing, speed, state, summarized, pauseKeyMoments, cycleSpeed, append, hold, release, seek: (index: number) => { batchEnd.value = null; core.seek(index) }, move: (delta: number) => { batchEnd.value = null; core.move(delta) }, previous: () => { batchEnd.value = null; core.previous() }, next: () => { core.next(); batchEnd.value = null } }
}

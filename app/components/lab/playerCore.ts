export interface PlaybackClock { now: () => number; after: (callback: () => void, delay: number) => () => void }
export interface PlaybackSource {
  cursor: () => number; length: () => number; range: () => readonly [number, number]; operation: () => number
  ranges: () => readonly (readonly [number, number])[]; kind: (index: number) => string
  seek: (index: number, instant: boolean) => void; dwell: () => number
  summary: () => boolean; pauseOnKey: () => boolean; changed: (playing: boolean) => void
  batchEnd: () => number | null
}
export const realPlaybackClock: PlaybackClock = {
  now: () => performance.now(),
  after: (callback, delay) => { const timer = setTimeout(callback, delay); return () => clearTimeout(timer) },
}
export function stepDwell(characters: number, speed: number, animation = 700) {
  return Math.max(Math.min(1800, Math.max(600, 350 + 18 * characters)) / speed, animation / speed)
}
export function createPlayback(source: PlaybackSource, clock: PlaybackClock = realPlaybackClock) {
  let playing = false
  let generation = 0
  let cancel: (() => void) | undefined
  let lastPrevious = -Infinity
  function pause() { playing = false; generation++; cancel?.(); cancel = undefined; source.changed(false) }
  function seek(index: number) { pause(); source.seek(Math.max(0, Math.min(index, source.length() - 1)), true) }
  function move(delta: number) { seek(source.cursor() + delta) }
  function previous() {
    const now = clock.now()
    const prior = source.ranges()[source.operation() - 1]
    seek(now - lastPrevious < 700 && prior ? prior[0] : source.range()[0])
    lastPrevious = now
  }
  function next() {
    const batch = source.batchEnd()
    const end = batch !== null && source.operation() <= batch ? source.ranges()[batch]?.[1] ?? source.range()[1] : source.range()[1]
    seek(source.cursor() < end ? end : source.ranges()[source.operation() + 1]?.[1] ?? end)
  }
  function schedule(token: number) {
    if (!playing || token !== generation) return
    const duration = source.dwell()
    const deadline = clock.now() + duration
    const advance = () => {
      if (!playing || token !== generation) return
      const remaining = deadline - clock.now()
      if (remaining > 8) { cancel = clock.after(advance, remaining); return }
      if (source.cursor() >= source.length() - 1) { pause(); return }
      let index = source.cursor() + 1
      if (source.summary()) while (index < source.length() - 1 && ['compare', 'descend'].includes(source.kind(index))) index++
      source.seek(index, false)
      if (source.pauseOnKey() && ['case', 'rotate-pre', 'recolor'].includes(source.kind(index))) pause()
      else schedule(token)
    }
    cancel = clock.after(advance, duration)
  }
  function play() {
    if (!source.length()) return
    if (playing) { pause(); return }
    if (source.cursor() === source.length() - 1) source.seek(source.range()[0], true)
    playing = true; source.changed(true); schedule(++generation)
  }
  function visibility(hidden: boolean) { if (hidden) pause() }
  function state() { return playing ? 'playing' : !source.length() ? 'idle' : source.cursor() === source.length() - 1 ? 'done' : 'paused' }
  return { play, pause, seek, move, previous, next, visibility, state }
}

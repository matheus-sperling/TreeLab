import { describe, expect, it } from 'vitest'
import { createPlayback, stepDwell } from '../app/components/lab/playerCore'
import type { PlaybackClock, PlaybackSource } from '../app/components/lab/playerCore'

function fixture(kinds = ['start', 'compare', 'attach', 'done', 'start', 'case', 'rotate', 'done']) {
  let now = 0
  let cursor = 0
  let summary = false
  let pauseOnKey = false
  let batchEnd: number | null = null
  const scheduled: { callback: () => void; at: number; canceled: boolean }[] = []
  const clock: PlaybackClock = { now: () => now, after(callback, delay) { const task = { callback, at: now + delay, canceled: false }; scheduled.push(task); return () => { task.canceled = true } } }
  const seeks: [number, boolean][] = []
  const source: PlaybackSource = {
    cursor: () => cursor, length: () => kinds.length, range: () => cursor < 4 ? [0, 3] : [4, 7], operation: () => cursor < 4 ? 0 : 1,
    ranges: () => [[0, 3], [4, 7]], kind: index => kinds[index] ?? '', seek(index, instant) { cursor = index; seeks.push([index, instant]) },
    dwell: () => 600, summary: () => summary, pauseOnKey: () => pauseOnKey, changed() {}, batchEnd: () => batchEnd,
  }
  const player = createPlayback(source, clock)
  function advance(ms = 600) {
    now += ms
    for (const task of [...scheduled]) if (!task.canceled && task.at <= now) { task.canceled = true; task.callback() }
  }
  return { player, scheduled, seeks, advance, cursor: () => cursor, summary: () => { summary = true }, keyPause: () => { pauseOnKey = true }, batch: () => { batchEnd = 1 } }
}

describe('controlled timeline', () => {
  it('handles empty, playing, paused and completed states', () => {
    expect(fixture([]).player.state()).toBe('idle')
    const f = fixture()
    f.player.play(); expect(f.player.state()).toBe('playing')
    f.advance(); expect(f.seeks).toEqual([[1, false]])
    f.player.pause(); expect(f.player.state()).toBe('paused')
    f.player.seek(100); expect(f.player.state()).toBe('done')
    f.player.play(); expect(f.cursor()).toBe(4)
  })
  it('cancels stale callbacks after seeking or hiding the tab', () => {
    const f = fixture()
    f.player.play()
    const stale = f.scheduled[0]!.callback
    f.player.seek(2); f.advance(2000); stale()
    expect(f.cursor()).toBe(2)
    f.player.play(); f.player.visibility(true); f.advance(2000)
    expect(f.player.state()).toBe('paused')
    expect(f.cursor()).toBe(2)
  })
  it('uses time deadlines even if a timer wakes early', () => {
    const f = fixture()
    f.player.play(); f.scheduled[0]!.canceled = true; f.scheduled[0]!.callback()
    expect(f.cursor()).toBe(0)
    f.advance(600); expect(f.cursor()).toBe(1)
  })
  it('seeks previous operation on a second fast tap and skips a batch', () => {
    const f = fixture()
    f.player.seek(6); f.player.previous(); expect(f.cursor()).toBe(4)
    f.advance(300); f.player.previous(); expect(f.cursor()).toBe(0)
    f.batch(); f.player.next(); expect(f.cursor()).toBe(7)
  })
  it('summarizes descent while preserving key moments', () => {
    const f = fixture(['start', 'compare', 'descend', 'attach', 'start', 'case', 'rotate', 'done'])
    f.summary(); f.player.play(); f.advance(); expect(f.cursor()).toBe(3)
    f.player.seek(4); f.keyPause(); f.player.play(); f.advance()
    expect(f.cursor()).toBe(5); expect(f.player.state()).toBe('paused')
  })
  it('keeps dwell within readable bounds and longer than motion', () => {
    expect(stepDwell(0, 1, 700)).toBe(700)
    expect(stepDwell(140, 1)).toBe(1800)
    expect(stepDwell(0, 4, 700)).toBe(175)
  })
})

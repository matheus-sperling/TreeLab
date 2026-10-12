import { describe, expect, it } from 'vitest'
import { clampScale, fitCamera } from '../app/composables/useCamera'
describe('safe camera fit', () => {
  it('fits centered nodes with padding and caps scale', () => {
    const result = fitCamera({ minX: -52, maxX: 52, minY: 0, maxY: 68 }, 412, 350)
    expect(result.scale).toBe(1.15)
    expect(result.x).toBe(206)
    expect(result.y + 34 * result.scale).toBeCloseTo(175)
  })
  it('keeps a large tree root visible at the minimum fit zoom', () => {
    const result = fitCamera({ minX: -1500, maxX: 1500, minY: 0, maxY: 1000 }, 360, 280, { x: 0, y: 0 })
    expect(result.scale).toBe(.5)
    expect(result.x).toBe(180)
    expect(result.y).toBe(140)
  })
  it('bounds manual zoom without blocking inspection', () => {
    expect(clampScale(.1)).toBe(.45)
    expect(clampScale(4)).toBe(2.5)
  })
})

import { describe, expect, it } from 'vitest'
import { clampScale, fitCamera } from '../app/composables/useCamera'
import { decodeOps, layoutTree, runSequence } from '../app/engine'
describe('safe camera fit', () => {
  it('fits centered nodes with padding and caps scale', () => {
    const result = fitCamera({ minX: -52, maxX: 52, minY: 0, maxY: 68 }, 412, 350)
    expect(result.scale).toBe(1.15)
    expect(result.x).toBe(206)
    expect(result.y + 34 * result.scale).toBeCloseTo(175)
  })
  it('fits the full large tree without cropping at a minimum zoom', () => {
    const result = fitCamera({ minX: -1500, maxX: 1500, minY: 0, maxY: 1000 }, 360, 280, { x: 0, y: 0 })
    expect(result.scale).toBeLessThan(.5)
    expect(result.x - 1500 * result.scale).toBeGreaterThan(0)
    expect(result.x + 1500 * result.scale).toBeLessThan(360)
    expect(result.x).toBe(180)
    expect(result.y).toBeGreaterThan(0)
    expect(result.y + 1000 * result.scale).toBeLessThan(280)
  })
  it('bounds manual zoom without blocking inspection', () => {
    expect(clampScale(.0001)).toBe(.001)
    expect(clampScale(4)).toBe(2.5)
  })
  it('mantém alvos de 48 px fora dos controles no canvas mínimo', () => {
    const layout = layoutTree(runSequence('avl', decodeOps('i1.i2.i3.i4.i5.i6.i7')).final)
    const canvasHeight = 283, top = 64, bottom = 80, right = 80
    const camera = fitCamera(layout.bounds, 360 - right, canvasHeight - top - bottom)
    for (const point of Object.values(layout.positions)) {
      const x = camera.x + point.x * camera.scale, y = camera.y + top + point.y * camera.scale
      expect(x - 24).toBeGreaterThanOrEqual(16)
      expect(x + 24).toBeLessThanOrEqual(360 - right)
      expect(y - 24).toBeGreaterThanOrEqual(top)
      expect(y + 24).toBeLessThanOrEqual(canvasHeight - bottom)
    }
  })
})

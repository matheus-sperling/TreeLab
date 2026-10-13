import { animate, useMotionValue, useMotionTemplate } from 'motion-v'
import { TREE_EASE } from '../components/lab/motion'
import type { Position } from '../engine/types'

export interface CameraBounds { minX: number; minY: number; maxX: number; maxY: number }
export function fitCamera(bounds: CameraBounds, width: number, height: number, root?: Position) {
  const boxWidth = Math.max(40, bounds.maxX - bounds.minX + 16)
  const boxHeight = Math.max(40, bounds.maxY - bounds.minY + 16)
  const rawScale = Math.min(Math.max(1, width) / boxWidth, Math.max(1, height) / boxHeight, 1.15)
  // Automatic framing must still fit a tall tree in a shortened mobile canvas.
  // The manual zoom floor remains larger, so inspection gestures stay useful.
  const scale = Math.max(.001, rawScale)
  const center = { x: (bounds.minX + bounds.maxX) / 2, y: (bounds.minY + bounds.maxY) / 2 }
  void root
  return { scale, x: width / 2 - center.x * scale, y: height / 2 - center.y * scale }
}
export function clampScale(value: number, minimum = .025) { return Math.max(minimum, Math.min(2.5, value)) }

export function useCamera(element: Ref<HTMLElement | null>, bounds: ComputedRef<CameraBounds>, reduced: ComputedRef<boolean>, resizing?: ComputedRef<boolean>) {
  const x = useMotionValue(0)
  const y = useMotionValue(0)
  const scale = useMotionValue(1)
  const transform = useMotionTemplate`translate(${x}px, ${y}px) scale(${scale})`
  const width = ref(412)
  const height = ref(350)
  const following = ref(true)
  const safeBottom = ref(8)
  const safeTop = 8
  const controls: ReturnType<typeof animate>[] = []
  const pointers = new Map<number, { x: number; y: number }>()
  let lastTap = 0
  let moved = false
  let initialDistance = 0
  let initialScale = 1
  let pinched = false
  let anchor = { x: 0, y: 0 }
  let previous = { x: 0, y: 0, t: 0 }
  let velocity = { x: 0, y: 0 }
  let observer: ResizeObserver | undefined
  let fittedRoot: Position | undefined
  let measured = false
  let destination: { x: number; y: number; scale?: number } | undefined
  function stop() { for (const control of controls.splice(0)) control.stop(); destination = undefined }
  function moveTo(next: { x: number; y: number; scale?: number }, instant = false) {
    if (!instant && !reduced.value && destination?.x === next.x && destination.y === next.y && destination.scale === next.scale) return
    stop(); destination = { ...next }
    if (instant || reduced.value) { x.set(next.x); y.set(next.y); if (next.scale !== undefined) scale.set(next.scale); return }
    controls.push(animate(x, next.x, { type: 'tween', duration: .55, ease: TREE_EASE }), animate(y, next.y, { type: 'tween', duration: .55, ease: TREE_EASE }))
    if (next.scale !== undefined) controls.push(animate(scale, next.scale, { type: 'tween', duration: .55, ease: TREE_EASE }))
  }
  function fit(root?: Position, instant = false) {
    following.value = true
    if (root) fittedRoot = root
    const next = fitCamera(bounds.value, Math.max(1, width.value - 32), Math.max(1, height.value - safeBottom.value - safeTop), root ?? fittedRoot)
    moveTo({ ...next, x: next.x + 16, y: next.y + safeTop }, instant)
  }
  function fitBounds(nextBounds: CameraBounds, root?: Position) {
    following.value = false
    const next = fitCamera(nextBounds, Math.max(1, width.value - 32), Math.max(1, height.value - safeBottom.value - safeTop), root)
    moveTo({ ...next, x: next.x + 16, y: next.y + safeTop })
  }
  function focus(point: Position, instant = false) {
    following.value = false
    moveTo({ x: width.value / 2 - point.x * scale.get(), y: safeTop + (height.value - safeBottom.value - safeTop) / 2 - point.y * scale.get() }, instant)
  }
  function follow(point: Position, force = false) {
    if ((!following.value && !force) || pointers.size) return
    const px = point.x * scale.get() + x.get()
    const py = point.y * scale.get() + y.get()
    const right = width.value - 32 - 56
    const bottom = height.value - safeBottom.value - 56
    const dx = px < 56 ? 56 - px : px > right ? right - px : 0
    const top = safeTop + 24
    const dy = py < top ? top - py : py > bottom ? bottom - py : 0
    if (dx || dy) moveTo({ x: x.get() + dx, y: y.get() + dy })
  }
  function zoom(factor: number, center = { x: width.value / 2, y: safeTop + (height.value - safeBottom.value - safeTop) / 2 }) {
    following.value = false
    const current = scale.get()
    // A tiny automatically fitted tree must not zoom in when the user zooms out.
    const next = clampScale(current * factor, current < .025 ? .001 : .025)
    const ratio = next / scale.get()
    moveTo({ x: center.x - (center.x - x.get()) * ratio, y: center.y - (center.y - y.get()) * ratio, scale: next })
  }
  function point(event: PointerEvent) {
    const rect = element.value?.getBoundingClientRect()
    return { x: event.clientX - (rect?.left ?? 0), y: event.clientY - (rect?.top ?? 0) }
  }
  function down(event: PointerEvent) {
    if (event.button !== 0 || (event.target as Element).closest('[data-node]')) return
    if (!pointers.size) { pinched = false; velocity = { x: 0, y: 0 } }
    stop(); moved = false
    element.value?.setPointerCapture(event.pointerId)
    const p = point(event)
    pointers.set(event.pointerId, p)
    previous = { ...p, t: performance.now() }
    if (pointers.size === 2) {
      pinched = true; velocity = { x: 0, y: 0 }
      const [a, b] = [...pointers.values()]
      if (!a || !b) return
      initialDistance = Math.hypot(a.x - b.x, a.y - b.y)
      initialScale = scale.get()
      anchor = { x: ((a.x + b.x) / 2 - x.get()) / initialScale, y: ((a.y + b.y) / 2 - y.get()) / initialScale }
    }
  }
  function drag(event: PointerEvent) {
    if (!pointers.has(event.pointerId)) return
    const p = point(event)
    const old = pointers.get(event.pointerId)!
    pointers.set(event.pointerId, p)
    if (Math.hypot(p.x - old.x, p.y - old.y) > 1) { moved = true; following.value = false }
    if (pointers.size === 2) {
      const [a, b] = [...pointers.values()]
      if (!a || !b) return
      const next = clampScale(initialScale * Math.hypot(a.x - b.x, a.y - b.y) / Math.max(1, initialDistance), initialScale < .025 ? .001 : .025)
      scale.set(next); x.set((a.x + b.x) / 2 - anchor.x * next); y.set((a.y + b.y) / 2 - anchor.y * next)
    }
    else {
      x.set(x.get() + p.x - old.x); y.set(y.get() + p.y - old.y)
      const now = performance.now()
      velocity = { x: (p.x - previous.x) / Math.max(1, now - previous.t), y: (p.y - previous.y) / Math.max(1, now - previous.t) }
      previous = { ...p, t: now }
    }
  }
  function up(event: PointerEvent) {
    if (!pointers.has(event.pointerId)) return
    pointers.delete(event.pointerId)
    if (pointers.size) return
    if (!moved) {
      const now = performance.now()
      if (now - lastTap < 300) fit()
      lastTap = now
    }
    else {
      const s = scale.get()
      const margin = 70
      const nextX = Math.max(margin - bounds.value.maxX * s, Math.min(width.value - 32 - margin - bounds.value.minX * s, x.get() + (pinched ? 0 : velocity.x * 80)))
      const nextY = Math.max(margin - bounds.value.maxY * s, Math.min(height.value - safeBottom.value - margin - bounds.value.minY * s, y.get() + (pinched ? 0 : velocity.y * 80)))
      moveTo({ x: nextX, y: nextY })
    }
  }
  function wheel(event: WheelEvent) { event.preventDefault(); zoom(event.deltaY > 0 ? .9 : 1.1, { x: event.offsetX, y: event.offsetY }) }
  watch(() => resizing?.value, active => {
    // Direct manipulation follows the finger without a second delayed tween.
    if (!active) return
    if (following.value) fit(undefined, true)
    else stop()
  })
  onMounted(() => {
    observer = new ResizeObserver(([entry]) => {
      if (!entry) return
      const next = entry.contentRect
      // Keep fractional CSS pixels: dropping the final resize fraction leaves
      // a stale viewport and shifts the inspected point on the next drag.
      if (measured && Math.abs(width.value - next.width) < .001 && Math.abs(height.value - next.height) < .001) return
      const previousWidth = width.value, previousHeight = height.value
      width.value = next.width; height.value = next.height
      if (following.value) fit(undefined, !measured || resizing?.value)
      else if (measured) {
        // Keep the inspected world point centered without undoing a manual zoom.
        moveTo({ x: (destination?.x ?? x.get()) + (next.width - previousWidth) / 2, y: (destination?.y ?? y.get()) + (next.height - previousHeight) / 2, scale: destination?.scale ?? scale.get() }, resizing?.value)
      }
      measured = true
    })
    if (element.value) observer.observe(element.value)
  })
  onBeforeUnmount(() => { observer?.disconnect(); stop() })
  return { x, y, scale, transform, width, height, following, safeBottom, fit, fitBounds, focus, follow, zoom, down, drag, up, wheel, moved: () => moved }
}

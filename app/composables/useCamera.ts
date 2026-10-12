import { animate, useMotionValue, useMotionTemplate } from 'motion-v'
import type { Position } from '../engine/types'

export interface CameraBounds { minX: number; minY: number; maxX: number; maxY: number }
export function fitCamera(bounds: CameraBounds, width: number, height: number, root?: Position) {
  const boxWidth = Math.max(40, bounds.maxX - bounds.minX + 88)
  const boxHeight = Math.max(40, bounds.maxY - bounds.minY + 88)
  const rawScale = Math.min(width / boxWidth, height / boxHeight, 1.15)
  const scale = Math.max(.5, rawScale)
  const center = rawScale < .5 && root ? root : { x: (bounds.minX + bounds.maxX) / 2, y: (bounds.minY + bounds.maxY) / 2 }
  return { scale, x: width / 2 - center.x * scale, y: height / 2 - center.y * scale }
}
export function clampScale(value: number) { return Math.max(.45, Math.min(2.5, value)) }

export function useCamera(element: Ref<HTMLElement | null>, bounds: ComputedRef<CameraBounds>, reduced: ComputedRef<boolean>) {
  const x = useMotionValue(0)
  const y = useMotionValue(0)
  const scale = useMotionValue(1)
  const transform = useMotionTemplate`translate(${x}px, ${y}px) scale(${scale})`
  const width = ref(412)
  const height = ref(350)
  const following = ref(true)
  const safeBottom = ref(0)
  const controls: ReturnType<typeof animate>[] = []
  const pointers = new Map<number, { x: number; y: number }>()
  let lastTap = 0
  let moved = false
  let initialDistance = 0
  let initialScale = 1
  let anchor = { x: 0, y: 0 }
  let previous = { x: 0, y: 0, t: 0 }
  let velocity = { x: 0, y: 0 }
  let observer: ResizeObserver | undefined
  function stop() { for (const control of controls.splice(0)) control.stop() }
  function moveTo(next: { x: number; y: number; scale?: number }, instant = false) {
    stop()
    if (instant || reduced.value) { x.set(next.x); y.set(next.y); if (next.scale !== undefined) scale.set(next.scale); return }
    controls.push(animate(x, next.x, { type: 'spring', duration: .35, bounce: .08 }), animate(y, next.y, { type: 'spring', duration: .35, bounce: .08 }))
    if (next.scale !== undefined) controls.push(animate(scale, next.scale, { type: 'spring', duration: .35, bounce: .08 }))
  }
  function fit(root?: Position, instant = false) {
    following.value = true
    moveTo(fitCamera(bounds.value, width.value, Math.max(100, height.value - safeBottom.value), root), instant)
  }
  function focus(point: Position, instant = false) {
    moveTo({ x: width.value / 2 - point.x * scale.get(), y: (height.value - safeBottom.value) / 2 - point.y * scale.get() }, instant)
  }
  function follow(point: Position) {
    if (!following.value || pointers.size) return
    const px = point.x * scale.get() + x.get()
    const py = point.y * scale.get() + y.get()
    const right = width.value - 56
    const bottom = height.value - safeBottom.value - 56
    const dx = px < 56 ? 56 - px : px > right ? right - px : 0
    const dy = py < 56 ? 56 - py : py > bottom ? bottom - py : 0
    if (dx || dy) moveTo({ x: x.get() + dx, y: y.get() + dy })
  }
  function zoom(factor: number, center = { x: width.value / 2, y: (height.value - safeBottom.value) / 2 }) {
    following.value = false
    const next = clampScale(scale.get() * factor)
    const ratio = next / scale.get()
    moveTo({ x: center.x - (center.x - x.get()) * ratio, y: center.y - (center.y - y.get()) * ratio, scale: next })
  }
  function point(event: PointerEvent) {
    const rect = element.value?.getBoundingClientRect()
    return { x: event.clientX - (rect?.left ?? 0), y: event.clientY - (rect?.top ?? 0) }
  }
  function down(event: PointerEvent) {
    if (event.button !== 0 || (event.target as Element).closest('[data-node]')) return
    stop(); moved = false
    element.value?.setPointerCapture(event.pointerId)
    const p = point(event)
    pointers.set(event.pointerId, p)
    previous = { ...p, t: performance.now() }
    if (pointers.size === 2) {
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
      const next = clampScale(initialScale * Math.hypot(a.x - b.x, a.y - b.y) / Math.max(1, initialDistance))
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
      const nextX = Math.max(margin - bounds.value.maxX * s, Math.min(width.value - margin - bounds.value.minX * s, x.get() + velocity.x * 80))
      const nextY = Math.max(margin - bounds.value.maxY * s, Math.min(height.value - margin - bounds.value.minY * s, y.get() + velocity.y * 80))
      moveTo({ x: nextX, y: nextY })
    }
  }
  function wheel(event: WheelEvent) { event.preventDefault(); zoom(event.deltaY > 0 ? .9 : 1.1, { x: event.offsetX, y: event.offsetY }) }
  onMounted(() => {
    observer = new ResizeObserver(([entry]) => { if (entry) { width.value = entry.contentRect.width; height.value = entry.contentRect.height; if (following.value) fit(undefined, true) } })
    if (element.value) observer.observe(element.value)
  })
  onBeforeUnmount(() => { observer?.disconnect(); stop() })
  return { x, y, scale, transform, width, height, following, safeBottom, fit, focus, follow, zoom, down, drag, up, wheel, moved: () => moved }
}

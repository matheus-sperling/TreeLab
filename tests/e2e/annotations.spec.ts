import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'
import { writeFile } from 'node:fs/promises'
import { decodeOps, runSequence } from '../../app/engine'
import type { Position, Snapshot, Step, TreeType } from '../../app/engine/types'

interface Box { left: number; right: number; top: number; bottom: number }
interface Label { name: string; key: number; text: string; kind: string; box: Box }
interface Disk { name: string; x: number; y: number; radius: number }
interface Outline { name: string; box: Box; stroke: number }
interface Arrow { points: Position[]; marker: Position[]; stroke: number }
interface Geometry { scale: number; labels: Label[]; disks: Disk[]; outlines: Outline[]; arrows: Arrow[] }

async function measure(page: Page): Promise<Geometry> {
  return page.evaluate(() => {
    const labels: Label[] = [], disks: Disk[] = [], outlines: Outline[] = [], arrows: Arrow[] = []
    function visible(element: Element) {
      let opacity = 1
      for (let current: Element | null = element; current && current.tagName.toLowerCase() !== 'svg'; current = current.parentElement) opacity *= Number(getComputedStyle(current).opacity)
      return opacity > .05
    }
    function project(bounds: DOMRect, matrix: DOMMatrix): Box {
      const points = [[bounds.x, bounds.y], [bounds.x + bounds.width, bounds.y], [bounds.x, bounds.y + bounds.height], [bounds.x + bounds.width, bounds.y + bounds.height]].map(([x, y]) => new DOMPoint(x, y).matrixTransform(matrix))
      return { left: Math.min(...points.map(p => p.x)), right: Math.max(...points.map(p => p.x)), top: Math.min(...points.map(p => p.y)), bottom: Math.max(...points.map(p => p.y)) }
    }
    function box(element: SVGGraphicsElement): Box {
      const bounds = project(element.getBBox(), element.getScreenCTM()!)
      for (let parent = element.parentElement; parent && parent.tagName.toLowerCase() !== 'svg'; parent = parent.parentElement) {
        const clip = parent.getAttribute('clip-path')?.match(/^url\(#(.+)\)$/)?.[1]
        const rect = clip ? document.getElementById(clip)?.querySelector<SVGRectElement>('rect') : undefined
        if (rect) {
          const clipped = project(rect.getBBox(), (parent as unknown as SVGGraphicsElement).getScreenCTM()!)
          bounds.left = Math.max(bounds.left, clipped.left); bounds.right = Math.min(bounds.right, clipped.right)
          bounds.top = Math.max(bounds.top, clipped.top); bounds.bottom = Math.min(bounds.bottom, clipped.bottom)
        }
      }
      return bounds
    }
    for (const node of document.querySelectorAll<SVGGElement>('.tree-svg [data-node]')) {
      const key = Number(node.querySelector(':scope > text')!.textContent)
      for (const text of node.querySelectorAll<SVGTextElement>('text')) if (visible(text)) {
        const kind = text.closest('.node-height') ? 'height' : text.matches('.node-level') ? 'level' : text.textContent === 'raiz' ? 'root' : 'text'
        const bounds = box(text)
        if (bounds.left < bounds.right && bounds.top < bounds.bottom) labels.push({ key, kind, text: text.textContent ?? '', name: `${key}: ${kind} ${text.textContent}`, box: bounds })
      }
      for (const circle of node.querySelectorAll<SVGCircleElement>('.node-body, .node-ring')) if (visible(circle)) {
        const matrix = circle.getScreenCTM()!, center = new DOMPoint(circle.cx.baseVal.value, circle.cy.baseVal.value).matrixTransform(matrix)
        const scale = Math.hypot(matrix.a, matrix.b), stroke = Number(getComputedStyle(circle).strokeWidth.replace('px', ''))
        disks.push({ name: `${key}: ${circle.matches('.node-ring') ? 'anel' : 'nó'}`, x: center.x, y: center.y, radius: (circle.r.baseVal.value + stroke / 2) * scale })
      }
    }
    for (const outline of document.querySelectorAll<SVGRectElement>('.subtree-outline')) {
      const matrix = outline.getScreenCTM()!
      outlines.push({ name: 'quadro da subárvore transferida', box: box(outline), stroke: Number(getComputedStyle(outline).strokeWidth.replace('px', '')) * Math.hypot(matrix.a, matrix.b) })
    }
    for (const path of document.querySelectorAll<SVGPathElement>('.rotation-arrow')) if (visible(path)) {
      const matrix = path.getScreenCTM()!, length = path.getTotalLength()
      const stroke = Number(getComputedStyle(path).strokeWidth.replace('px', ''))
      const points: Position[] = []
      for (let at = 0; at <= length; at += .25) {
        const point = path.getPointAtLength(at), screen = new DOMPoint(point.x, point.y).matrixTransform(matrix)
        points.push({ x: screen.x, y: screen.y })
      }
      const markerId = path.getAttribute('marker-end')?.match(/^url\(#(.+)\)$/)?.[1]
      const marker = markerId ? document.getElementById(markerId) as unknown as SVGMarkerElement : null
      const vertices: Position[] = []
      if (marker) {
        const end = path.getPointAtLength(length), previous = path.getPointAtLength(Math.max(0, length - .01))
        const angle = Math.atan2(end.y - previous.y, end.x - previous.x), cos = Math.cos(angle), sin = Math.sin(angle)
        const units = marker.getAttribute('markerUnits') === 'userSpaceOnUse' ? 1 : stroke
        const view = marker.viewBox.baseVal, ratio = Math.min(marker.markerWidth.baseVal.value / view.width, marker.markerHeight.baseVal.value / view.height)
        const commands = marker.querySelector('path')!.getAttribute('d')!.matchAll(/[ML]\s*([-+\d.e]+)[,\s]+([-+\d.e]+)/gi)
        for (const command of commands) {
          const x = (Number(command[1]) - marker.refX.baseVal.value) * ratio * units, y = (Number(command[2]) - marker.refY.baseVal.value) * ratio * units
          const point = new DOMPoint(end.x + x * cos - y * sin, end.y + x * sin + y * cos).matrixTransform(matrix)
          vertices.push({ x: point.x, y: point.y })
        }
      }
      arrows.push({ points, marker: vertices, stroke: stroke * Math.hypot(matrix.a, matrix.b) })
    }
    const camera = document.querySelector<SVGGElement>('.tree-svg > g')!.getScreenCTM()!
    return { labels, disks, outlines, arrows, scale: Math.hypot(camera.a, camera.b) }
  })
}

function intersects(a: Box, b: Box) { return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top }
function pointNearBox(point: Position, box: Box, radius: number) {
  const x = Math.max(box.left, Math.min(point.x, box.right)), y = Math.max(box.top, Math.min(point.y, box.bottom))
  return Math.hypot(point.x - x, point.y - y) < radius
}
function polygonIntersectsBox(polygon: Position[], box: Box) {
  if (!polygon.length) return false
  const corners = [{ x: box.left, y: box.top }, { x: box.right, y: box.top }, { x: box.right, y: box.bottom }, { x: box.left, y: box.bottom }]
  const axes = [{ x: 1, y: 0 }, { x: 0, y: 1 }, ...polygon.map((point, index) => ({ x: point.y - polygon[(index + 1) % polygon.length]!.y, y: polygon[(index + 1) % polygon.length]!.x - point.x }))]
  return axes.every(axis => {
    const a = polygon.map(point => point.x * axis.x + point.y * axis.y), b = corners.map(point => point.x * axis.x + point.y * axis.y)
    return Math.max(...a) > Math.min(...b) && Math.max(...b) > Math.min(...a)
  })
}
function polygonIntersectsDisk(polygon: Position[], disk: Disk) {
  if (!polygon.length) return false
  const signs: number[] = []
  for (let index = 0; index < polygon.length; index++) {
    const a = polygon[index]!, b = polygon[(index + 1) % polygon.length]!
    const dx = b.x - a.x, dy = b.y - a.y
    const progress = Math.max(0, Math.min(1, ((disk.x - a.x) * dx + (disk.y - a.y) * dy) / (dx * dx + dy * dy)))
    if (Math.hypot(a.x + progress * dx - disk.x, a.y + progress * dy - disk.y) < disk.radius) return true
    signs.push(dx * (disk.y - a.y) - dy * (disk.x - a.x))
  }
  return signs.every(value => value >= 0) || signs.every(value => value <= 0)
}
function collisions(geometry: Geometry) {
  const failures: string[] = []
  const annotations = geometry.labels.filter(label => ['height', 'level'].includes(label.kind))
  for (const label of annotations) {
    for (const other of geometry.labels) if (other !== label && intersects(label.box, other.box)) failures.push(`${label.name} sobre ${other.name}`)
    for (const disk of geometry.disks) {
      const x = Math.max(label.box.left, Math.min(disk.x, label.box.right)), y = Math.max(label.box.top, Math.min(disk.y, label.box.bottom))
      if (Math.hypot(x - disk.x, y - disk.y) < disk.radius) failures.push(`${label.name} sobre ${disk.name}`)
    }
    for (const outline of geometry.outlines) {
      const { left, right, top, bottom } = outline.box, half = outline.stroke / 2
      const strokes = [
        { left: left - half, right: right + half, top: top - half, bottom: top + half },
        { left: left - half, right: right + half, top: bottom - half, bottom: bottom + half },
        { left: left - half, right: left + half, top, bottom },
        { left: right - half, right: right + half, top, bottom },
      ]
      if (strokes.some(stroke => intersects(label.box, stroke))) failures.push(`${label.name} sobre ${outline.name}`)
    }
    for (const arrow of geometry.arrows) {
      if (arrow.points.some(point => pointNearBox(point, label.box, arrow.stroke / 2))) failures.push(`${label.name} sobre curva de rotação`)
      if (polygonIntersectsBox(arrow.marker, label.box)) failures.push(`${label.name} sobre ponta da seta de rotação`)
    }
  }
  for (const arrow of geometry.arrows) for (const outline of geometry.outlines) {
    const { left, right, top, bottom } = outline.box, half = outline.stroke / 2
    const strokes = [{ left: left - half, right: right + half, top: top - half, bottom: top + half }, { left: left - half, right: right + half, top: bottom - half, bottom: bottom + half }, { left: left - half, right: left + half, top, bottom }, { left: right - half, right: right + half, top, bottom }]
    if (strokes.some(stroke => arrow.points.some(point => pointNearBox(point, stroke, arrow.stroke / 2)) || polygonIntersectsBox(arrow.marker, stroke))) failures.push(`seta de rotação sobre ${outline.name}`)
  }
  for (const arrow of geometry.arrows) for (const disk of geometry.disks) {
    if (arrow.points.some(point => Math.hypot(point.x - disk.x, point.y - disk.y) < disk.radius + arrow.stroke / 2)) failures.push(`curva de rotação sobre ${disk.name}`)
    if (polygonIntersectsDisk(arrow.marker, disk)) failures.push(`ponta da seta de rotação sobre ${disk.name}`)
  }
  return failures
}

function checkValues(geometry: Geometry, tree: Snapshot) {
  for (const [id, node] of Object.entries(tree.nodes)) {
    const height = geometry.labels.filter(label => label.key === node.key && label.kind === 'height')
    const level = geometry.labels.filter(label => label.key === node.key && label.kind === 'level')
    let depth = 0, current = Number(id)
    while (tree.nodes[current]!.p !== null) { current = tree.nodes[current]!.p!; depth++ }
    expect(height.map(label => label.text), `altura do nó ${node.key}`).toEqual([`h=${node.h}`])
    expect(level.map(label => label.text), `nível do nó ${node.key}`).toEqual([`nível ${depth}`])
  }
}

async function inspectSnapshot(page: Page, type: TreeType, sequence: string, step: Step, onInitial?: (geometry: Geometry) => Promise<void>) {
  await page.goto(`/lab?t=${type}&q=${sequence}&c=${step.i}`)
  await expect(page.getByRole('slider', { name: 'Passo da operação atual' })).toHaveAttribute('aria-valuenow', String(step.i))
  await expect(page.locator('.node-height')).toHaveCount(Object.keys(step.tree.nodes).length)
  await page.evaluate(() => document.fonts.ready)
  await page.waitForTimeout(600)
  const initial = await measure(page)
  await onInitial?.(initial)
  checkValues(initial, step.tree)
  expect(collisions(initial), `${type} passo ${step.i} (${step.kind}), escala ajustada`).toEqual([])
  if (step.meta?.rotation?.movedSubtree && step.kind === 'rotate-pre') expect(initial.outlines).toHaveLength(1)

  const canvas = await page.locator('.tree-canvas').boundingBox()
  const x = canvas!.x + canvas!.width / 2, y = canvas!.y + canvas!.height - 24
  // Browser touch input exercises the actual two-finger camera gesture.
  const session = await page.context().newCDPSession(page)
  await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: x - 35, y, id: 1 }, { x: x + 35, y, id: 2 }] })
  await session.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x - 70, y, id: 1 }, { x: x + 70, y, id: 2 }] })
  await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
  await session.detach()
  await page.waitForTimeout(600)
  const zoomed = await measure(page)
  expect(zoomed.scale / initial.scale).toBeGreaterThan(1.9)
  checkValues(zoomed, step.tree)
  expect(collisions(zoomed), `${type} passo ${step.i} (${step.kind}), zoom 2×`).toEqual([])
}

test('RN preserva alturas e níveis legíveis na inserção e recoloração', async ({ page }) => {
  test.setTimeout(90_000)
  await page.addInitScript(() => localStorage.setItem('treelab:settings', JSON.stringify({ showHeights: true, showLevels: true, showNils: true })))
  const sequence = 'i4.i2.i6.i1', result = runSequence('rb', decodeOps(sequence))
  const snapshots = result.steps.filter(step => step.kind === 'done' && [1, 2].includes(step.op) || step.op === 3 && ['attach', 'recolor', 'done'].includes(step.kind))
  for (const step of snapshots) await inspectSnapshot(page, 'rb', sequence, step)
})

test('AVL separa alturas do halo e do quadro antes e depois do giro ao inserir 6', async ({ page }) => {
  test.setTimeout(90_000)
  await page.addInitScript(() => localStorage.setItem('treelab:settings', JSON.stringify({ showHeights: true, showLevels: true, showNils: true })))
  const sequence = 'i1.i2.i3.i4.i5.i6.i7', result = runSequence('avl', decodeOps(sequence))
  const prepare = result.steps.find(step => step.op === 5 && step.kind === 'rotate-pre' && step.meta?.rotation?.movedSubtree !== null)!
  expect(result.steps[prepare.i]!.tree.nodes[prepare.meta!.rotation!.movedSubtree!]!.key).toBe(3)
  const snapshots = [result.steps.find(step => step.op === 5 && step.kind === 'attach')!, prepare, result.steps[prepare.i + 1]!, result.steps[prepare.i + 2]!, result.steps.find(step => step.op === 5 && step.kind === 'done')!]
  for (const step of snapshots) await inspectSnapshot(page, 'avl', sequence, step)
})

test('as curvas e pontas da rotação RN preservam o texto dos níveis', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('treelab:settings', JSON.stringify({ showHeights: true, showLevels: true, showNils: true })))
  for (const sequence of ['i1.i2.i3', 'i3.i2.i1']) {
    const result = runSequence('rb', decodeOps(sequence)), step = result.steps.find(step => step.kind === 'rotate-pre')!
    await inspectSnapshot(page, 'rb', sequence, step)
    const geometry = await measure(page)
    expect(geometry.arrows).toHaveLength(2)
    expect(geometry.arrows.every(arrow => arrow.marker.length === 3)).toBe(true)
  }
})

for (const showNils of [true, false]) {
  test(`a rotação aninhada LR respeita os rótulos do ancestral com NIL ${showNils}`, async ({ page }, info) => {
    await page.addInitScript(showNils => localStorage.setItem('treelab:settings', JSON.stringify({ showHeights: true, showLevels: true, showNils })), showNils)
    const sequence = 'i6.i2.i7.i1.i4.i3.i5', result = runSequence('avl', decodeOps(sequence))
    const step = result.steps.find(step => step.kind === 'rotate-pre' && step.tree.nodes[step.meta!.rotation!.pivot]!.key === 2 && step.tree.nodes[step.meta!.rotation!.child]!.key === 4)!
    expect(step.tree.nodes[step.tree.rootId!]!.key).toBe(6)
    await inspectSnapshot(page, 'avl', sequence, step, async geometry => {
      const path = info.outputPath('nested-lr-geometry.json')
      await writeFile(path, JSON.stringify(geometry))
      await info.attach('nested-lr-geometry', { path, contentType: 'application/json' })
    })
  })
}

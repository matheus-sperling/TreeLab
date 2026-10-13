import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'
import { decodeOps, runSequence } from '../../app/engine'

async function nodeFill(page: Page, key: number) {
  return page.evaluate(key => {
    const node = [...document.querySelectorAll('[data-node]')].find(node => Number(node.querySelector(':scope > text')?.textContent) === key)
    return getComputedStyle(node!.querySelector('.node-body')!).fill
  }, key)
}

test('a comparação mantém nó, aresta e narração coerentes sem piscar e termina o fluxo', async ({ page }) => {
  const sequence = 'i40.i20.i60.s20', result = runSequence('bst', decodeOps(sequence))
  const step = result.steps.find(step => step.op === 3 && step.kind === 'compare' && step.msg.params.at === 20)!
  await page.goto(`/lab?t=bst&q=${sequence}&c=${step.i - 1}`)
  await expect(page.getByRole('slider', { name: 'Passo da operação atual' })).toHaveAttribute('aria-valuenow', String(step.i - 1))
  await page.getByRole('button', { name: 'Próximo passo', exact: true }).click()
  await expect(page.locator('.narration .phase')).toHaveAttribute('data-role', 'current')
  const samples = await page.evaluate(async () => {
    const frames: { opacity: number; stroke: string; edge: string; narration: string; offset: number | null }[] = []
    const ring = document.querySelector('[data-node][data-role="current"] .node-ring')!
    const edge = document.querySelector('[data-edge-role="current"] .tree-edge')!
    const icon = document.querySelector('.narration .phase')!
    const end = performance.now() + 750
    while (performance.now() < end) {
      await new Promise(requestAnimationFrame)
      const flow = document.querySelector('[data-edge-role="current"] .edge-flow')
      frames.push({ opacity: Number(getComputedStyle(ring).opacity), stroke: getComputedStyle(ring).stroke, edge: getComputedStyle(edge).stroke, narration: getComputedStyle(icon).color, offset: flow ? parseFloat(getComputedStyle(flow).strokeDashoffset) : null })
    }
    return frames
  })
  expect(samples.length).toBeGreaterThan(10)
  expect(Math.min(...samples.map(sample => sample.opacity))).toBeGreaterThanOrEqual(.99)
  expect(samples.every(sample => sample.stroke === sample.edge && sample.edge === sample.narration)).toBe(true)
  expect(samples.at(-1)!.offset).toBeNull()
  expect(samples.some(sample => sample.offset !== null && sample.offset > -.9 && sample.offset < 0)).toBe(true)
  await expect(page.locator('.edge-flow')).toHaveCount(0)
})

test('recolorir altera o preenchimento real suavemente sem duplicar nós nem mudar sua posição', async ({ page }) => {
  const sequence = 'i4.i2.i6.i1', result = runSequence('rb', decodeOps(sequence))
  const step = result.steps.find(step => step.op === 3 && step.kind === 'recolor' && step.msg.params.role === 'parent')!
  const key = Number(step.msg.params.key)
  await page.goto(`/lab?t=rb&q=${sequence}&c=${step.i - 1}`)
  await expect(page.getByRole('slider', { name: 'Passo da operação atual' })).toHaveAttribute('aria-valuenow', String(step.i - 1))
  const before = await nodeFill(page, key)
  await page.getByRole('button', { name: 'Próximo passo', exact: true }).click()
  await expect(page.locator('.narration .phase')).toHaveAttribute('data-role', 'current')
  const sample = await page.evaluate(async key => {
    const node = [...document.querySelectorAll<SVGGElement>('[data-node]')].find(node => Number(node.querySelector(':scope > text')?.textContent) === key)!
    const colors: string[] = [], positions: { x: number; y: number }[] = []
    const end = performance.now() + 550
    while (performance.now() < end) {
      await new Promise(requestAnimationFrame)
      colors.push(getComputedStyle(node.querySelector('.node-body')!).fill)
      // Inspect the node's local coordinates; the camera can still settle after opening the page.
      const position = new DOMMatrix(getComputedStyle(node).transform)
      positions.push({ x: position.e, y: position.f })
    }
    return { colors, positions, bodies: node.querySelectorAll('.node-body').length, text: node.querySelector(':scope > text')!.textContent }
  }, key)
  expect(sample.bodies).toBe(1)
  expect(sample.text).toBe(String(key))
  expect(new Set(sample.colors).size).toBeGreaterThan(2)
  expect(sample.colors.at(-1)).not.toBe(before)
  for (const axis of ['x', 'y'] as const) expect(Math.max(...sample.positions.map(position => position[axis])) - Math.min(...sample.positions.map(position => position[axis]))).toBeLessThan(.1)
  await expect(page.locator('.tree-svg [data-node]')).toHaveCount(Object.keys(step.tree.nodes).length)
})

test('reduzir movimento e viajar no tempo exibem o estado direto, sem fluxo residual', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('treelab:settings', JSON.stringify({ reducedMotion: true })))
  const sequence = 'i40.i20.i60.s20', result = runSequence('bst', decodeOps(sequence))
  const step = result.steps.find(step => step.op === 3 && step.kind === 'compare' && step.msg.params.at === 20)!
  await page.goto(`/lab?t=bst&q=${sequence}&c=${step.i - 1}`)
  await expect(page.getByRole('slider', { name: 'Passo da operação atual' })).toHaveAttribute('aria-valuenow', String(step.i - 1))
  await page.getByRole('button', { name: 'Próximo passo', exact: true }).click()
  await expect(page.locator('.narration .phase')).toHaveAttribute('data-role', 'current')
  await expect(page.locator('.edge-flow')).toHaveCount(0)
  await expect(page.locator('[data-node][data-role="current"] .node-ring')).toHaveCSS('stroke-width', '2.5px')
  await page.goto(`/lab?t=bst&q=${sequence}&c=${step.i}`)
  await expect(page.locator('.edge-flow')).toHaveCount(0)
})


test('a aresta preservada no giro passa a levar a busca do novo pai 4 ao filho 2', async ({ page }) => {
  const sequence = 'i2.i1.i4.i3.i5.i6.s2', result = runSequence('avl', decodeOps(sequence))
  const prepare = result.steps.find(step => step.kind === 'rotate-pre' && step.msg.params.key === 2 && step.msg.params.child === 4)!
  const compare = result.steps.find(step => step.op === 6 && step.kind === 'compare' && step.msg.params.at === 2)!
  await page.goto(`/lab?t=avl&q=${sequence}&c=${prepare.i}`)
  await expect(page.getByRole('slider', { name: 'Passo da operação atual' })).toHaveAttribute('aria-valuenow', String(prepare.i))
  await page.evaluate(() => {
    const center = (key: number) => {
      const node = [...document.querySelectorAll<SVGGElement>('[data-node]')].find(node => Number(node.querySelector(':scope > text')?.textContent) === key)!
      const matrix = node.getScreenCTM()!
      return { x: matrix.e, y: matrix.f }
    }
    const parent = center(2), child = center(4)
    const edge = [...document.querySelectorAll<SVGPathElement>('.tree-edge')].find(edge => {
      const point = edge.getPointAtLength(0), end = edge.getPointAtLength(edge.getTotalLength()), matrix = edge.getScreenCTM()!
      const a = new DOMPoint(point.x, point.y).matrixTransform(matrix), b = new DOMPoint(end.x, end.y).matrixTransform(matrix)
      return Math.hypot(a.x - parent.x, a.y - parent.y) < Math.hypot(a.x - child.x, a.y - child.y) && Math.hypot(b.x - child.x, b.y - child.y) < Math.hypot(b.x - parent.x, b.y - parent.y)
    })!
    ;(window as unknown as { retainedEdge: SVGPathElement }).retainedEdge = edge
  })
  await page.getByRole('button', { name: 'Próximo passo', exact: true }).click()
  await page.waitForTimeout(1100)
  for (let index = prepare.i + 1; index < compare.i; index++) await page.getByRole('button', { name: 'Próximo passo', exact: true }).click()
  await expect(page.getByRole('slider', { name: 'Passo da operação atual' })).toHaveAttribute('aria-valuenow', String(compare.i))
  const direction = await page.evaluate(() => {
    const edge = document.querySelector<SVGPathElement>('[data-edge-role="current"] .tree-edge')!
    const flow = document.querySelector<SVGPathElement>('[data-edge-role="current"] .edge-flow')!
    const center = (key: number) => {
      const node = [...document.querySelectorAll<SVGGElement>('[data-node]')].find(node => Number(node.querySelector(':scope > text')?.textContent) === key)!
      const matrix = node.getScreenCTM()!
      return { x: matrix.e, y: matrix.f }
    }
    const parent = center(4), child = center(2)
    const point = flow.getPointAtLength(0), end = flow.getPointAtLength(flow.getTotalLength()), matrix = flow.getScreenCTM()!
    const a = new DOMPoint(point.x, point.y).matrixTransform(matrix), b = new DOMPoint(end.x, end.y).matrixTransform(matrix)
    return {
      retained: edge === (window as unknown as { retainedEdge: SVGPathElement }).retainedEdge,
      startParent: Math.hypot(a.x - parent.x, a.y - parent.y), startChild: Math.hypot(a.x - child.x, a.y - child.y),
      endChild: Math.hypot(b.x - child.x, b.y - child.y), endParent: Math.hypot(b.x - parent.x, b.y - parent.y),
      parentClip: Math.hypot(a.x - parent.x, a.y - parent.y) / Math.hypot(matrix.a, matrix.b),
      childClip: Math.hypot(b.x - child.x, b.y - child.y) / Math.hypot(matrix.a, matrix.b),
    }
  })
  expect(direction.retained).toBe(true)
  expect(direction.startParent).toBeLessThan(direction.startChild)
  expect(direction.endChild).toBeLessThan(direction.endParent)
  expect(direction.parentClip).toBeCloseTo(20, 3)
  expect(direction.childClip).toBeCloseTo(20, 3)
})

for (const annotations of [false, true]) {
  test(`as setas dos giros espelhados deixam nós, irmãos e anotações livres (${annotations ? 'com' : 'sem'} anotações)`, async ({ page }) => {
    await page.addInitScript(annotations => localStorage.setItem('treelab:settings', JSON.stringify({ showHeights: annotations, showLevels: annotations, showNils: annotations })), annotations)
    for (const sequence of ['i2.i1.i4.i3.i5.i6', 'i5.i6.i3.i4.i2.i1']) {
      const result = runSequence('avl', decodeOps(sequence)), step = result.steps.find(step => step.kind === 'rotate-pre' && step.meta?.rotation?.movedSubtree !== null)!
      await page.goto(`/lab?t=avl&q=${sequence}&c=${step.i}`)
      await expect(page.getByRole('slider', { name: 'Passo da operação atual' })).toHaveAttribute('aria-valuenow', String(step.i))
      await expect(page.locator('.rotation-arrow')).toHaveCount(2)
      await page.evaluate(() => document.fonts.ready)
      const failures = await page.evaluate(() => {
        type Point = { x: number; y: number }
        type Box = { left: number; right: number; top: number; bottom: number }
        const failures: string[] = []
        const circles = [...document.querySelectorAll<SVGCircleElement>('[data-node] .node-body, [data-node] .node-ring')].map(circle => {
          const matrix = circle.getScreenCTM()!, point = new DOMPoint(0, 0).matrixTransform(matrix)
          return { x: point.x, y: point.y, radius: (circle.r.baseVal.value + parseFloat(getComputedStyle(circle).strokeWidth) / 2) * Math.hypot(matrix.a, matrix.b), key: circle.closest('[data-node]')?.querySelector(':scope > text')?.textContent }
        })
        const labels = [...document.querySelectorAll<SVGTextElement>('[data-node] text')].map(label => ({ text: label.textContent, box: label.getBoundingClientRect() }))
        const outlines = [...document.querySelectorAll<SVGRectElement>('.subtree-outline')].flatMap(outline => {
          const box = outline.getBoundingClientRect(), matrix = outline.getScreenCTM()!, half = parseFloat(getComputedStyle(outline).strokeWidth) / 2 * Math.hypot(matrix.a, matrix.b)
          return [
            { left: box.left - half, right: box.right + half, top: box.top - half, bottom: box.top + half },
            { left: box.left - half, right: box.right + half, top: box.bottom - half, bottom: box.bottom + half },
            { left: box.left - half, right: box.left + half, top: box.top, bottom: box.bottom },
            { left: box.right - half, right: box.right + half, top: box.top, bottom: box.bottom },
          ]
        })
        function nearBox(point: Point, box: Box, radius: number) { return Math.hypot(point.x - Math.max(box.left, Math.min(point.x, box.right)), point.y - Math.max(box.top, Math.min(point.y, box.bottom))) < radius }
        function insideTriangle(point: Point, triangle: Point[]) {
          const signs = triangle.map((a, index) => { const b = triangle[(index + 1) % 3]!; return (point.x - b.x) * (a.y - b.y) - (a.x - b.x) * (point.y - b.y) })
          return signs.every(sign => sign >= 0) || signs.every(sign => sign <= 0)
        }
        function triangleIntersectsBox(triangle: Point[], box: Box) {
          const corners = [{ x: box.left, y: box.top }, { x: box.right, y: box.top }, { x: box.left, y: box.bottom }, { x: box.right, y: box.bottom }]
          const axes = [{ x: 1, y: 0 }, { x: 0, y: 1 }, ...triangle.map((a, index) => { const b = triangle[(index + 1) % 3]!; return { x: a.y - b.y, y: b.x - a.x } })]
          return axes.every(axis => {
            const a = triangle.map(point => point.x * axis.x + point.y * axis.y), b = corners.map(point => point.x * axis.x + point.y * axis.y)
            return Math.max(...a) > Math.min(...b) && Math.max(...b) > Math.min(...a)
          })
        }
        function distanceToSegment(point: Point, a: Point, b: Point) {
          const dx = b.x - a.x, dy = b.y - a.y, t = Math.max(0, Math.min(1, ((point.x - a.x) * dx + (point.y - a.y) * dy) / (dx * dx + dy * dy)))
          return Math.hypot(point.x - a.x - t * dx, point.y - a.y - t * dy)
        }
        for (const [index, path] of [...document.querySelectorAll<SVGPathElement>('.rotation-arrow')].entries()) {
          const matrix = path.getScreenCTM()!, length = path.getTotalLength(), half = parseFloat(getComputedStyle(path).strokeWidth) / 2 * Math.hypot(matrix.a, matrix.b)
          const points: Point[] = []
          for (let at = 0; at <= length; at += .2) { const point = path.getPointAtLength(at); points.push(new DOMPoint(point.x, point.y).matrixTransform(matrix)) }
          const markerId = path.getAttribute('marker-end')!.match(/^url\(#(.+)\)$/)![1]!
          const marker = document.getElementById(markerId) as unknown as SVGMarkerElement
          const end = path.getPointAtLength(length), before = path.getPointAtLength(length - .01), angle = Math.atan2(end.y - before.y, end.x - before.x)
          const ratio = marker.markerWidth.baseVal.value / marker.viewBox.baseVal.width * parseFloat(getComputedStyle(path).strokeWidth)
          const triangle = [[0, 0], [10, 5], [0, 10]].map(([x = 0, y = 0]) => {
            const localX = (x - marker.refX.baseVal.value) * ratio, localY = (y - marker.refY.baseVal.value) * ratio
            return new DOMPoint(end.x + localX * Math.cos(angle) - localY * Math.sin(angle), end.y + localX * Math.sin(angle) + localY * Math.cos(angle)).matrixTransform(matrix)
          })
          for (const circle of circles) {
            if (points.some(point => Math.hypot(point.x - circle.x, point.y - circle.y) < circle.radius + half)) failures.push(`curva ${index} sobre nó ${circle.key}`)
            if (insideTriangle(circle, triangle) || triangle.some((point, i) => distanceToSegment(circle, point, triangle[(i + 1) % 3]!) < circle.radius)) failures.push(`ponta ${index} sobre nó ${circle.key}`)
          }
          for (const { text, box } of labels) {
            if (points.some(point => nearBox(point, box, half))) failures.push(`curva ${index} sobre texto ${text}`)
            if (triangleIntersectsBox(triangle, box)) failures.push(`ponta ${index} sobre texto ${text}`)
          }
          for (const outline of outlines) if (points.some(point => nearBox(point, outline, half)) || triangleIntersectsBox(triangle, outline)) failures.push(`seta ${index} sobre quadro`)
        }
        return failures
      })
      expect(failures, sequence).toEqual([])
    }
  })
}

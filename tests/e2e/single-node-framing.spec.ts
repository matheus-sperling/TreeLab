import { expect, test, type Page } from '@playwright/test'
import { decodeOps, runSequence } from '../../app/engine'

interface Box { left: number; right: number; top: number; bottom: number }

async function preferences(page: Page, showHeights = false, showLevels = false) {
  await page.addInitScript(options => {
    localStorage.setItem('treelab:settings', JSON.stringify({ ...options, showNils: true, speed: 4 }))
    localStorage.setItem('treelab:dock-height', '320')
  }, { showHeights, showLevels })
}

async function drawnFrame(page: Page) {
  return page.evaluate(() => {
    const svg = document.querySelector<SVGSVGElement>('.tree-svg')!
    const viewport = svg.getBoundingClientRect()
    const camera = svg.querySelector<SVGGElement>(':scope > g')!.getScreenCTM()!
    const project = (rect: DOMRect, matrix: DOMMatrix): Box => {
      const corners = [[rect.x, rect.y], [rect.x + rect.width, rect.y], [rect.x, rect.y + rect.height], [rect.x + rect.width, rect.y + rect.height]].map(([x, y]) => new DOMPoint(x, y).matrixTransform(matrix))
      return { left: Math.min(...corners.map(point => point.x)), right: Math.max(...corners.map(point => point.x)), top: Math.min(...corners.map(point => point.y)), bottom: Math.max(...corners.map(point => point.y)) }
    }
    const shapes = [...svg.querySelectorAll<SVGGraphicsElement>('.node-body, .node-ring, .node-halo, [data-node] text, [data-node] > g > rect, .nil-marker rect, .nil-edge')].flatMap(element => {
      let opacity = 1
      for (let parent: Element | null = element; parent && parent !== svg; parent = parent.parentElement) opacity *= Number(getComputedStyle(parent).opacity)
      if (opacity <= .01) return []
      const matrix = element.getScreenCTM()!
      const box = project(element.getBBox(), matrix)
      const stroke = getComputedStyle(element).stroke === 'none' ? 0 : parseFloat(getComputedStyle(element).strokeWidth) * Math.hypot(matrix.a, matrix.b) / 2
      box.left -= stroke; box.right += stroke; box.top -= stroke; box.bottom += stroke
      // Animated digits are clipped locally before the whole SVG is clipped.
      for (let parent: Element | null = element.parentElement; parent && parent !== svg; parent = parent.parentElement) {
        const clip = parent.getAttribute('clip-path')?.match(/^url\(#(.+)\)$/)?.[1]
        const rect = clip ? document.getElementById(clip)?.querySelector<SVGRectElement>('rect') : undefined
        if (!rect) continue
        const boundary = project(rect.getBBox(), (parent as unknown as SVGGraphicsElement).getScreenCTM()!)
        box.left = Math.max(box.left, boundary.left); box.right = Math.min(box.right, boundary.right)
        box.top = Math.max(box.top, boundary.top); box.bottom = Math.min(box.bottom, boundary.bottom)
      }
      if (box.right <= box.left || box.bottom <= box.top) return []
      const kind = element.closest('.nil-marker') ? 'NIL' : element.matches('.nil-edge') ? 'aresta NIL' : element.closest('.node-height') ? 'altura' : element.matches('.node-level') ? 'nível' : element.matches('[data-node] > g > rect') ? 'badge FB' : element.textContent || element.getAttribute('class') || element.tagName
      return [{ kind, box }]
    })
    const clipped = shapes.filter(({ box }) => box.left < viewport.left - .75 || box.right > viewport.right + .75 || box.top < viewport.top - .75 || box.bottom > viewport.bottom + .75)
    return { shapes, clipped, scale: Math.hypot(camera.a, camera.b), viewport: { left: viewport.left, right: viewport.right, top: viewport.top, bottom: viewport.bottom, width: viewport.width, height: viewport.height } }
  })
}

async function nextPaint(page: Page) {
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))))
}

async function settled(page: Page) {
  let signature = '', since = Date.now()
  await expect.poll(async () => {
    const frame = await drawnFrame(page)
    const next = `${frame.viewport.height.toFixed(3)}:${frame.scale.toFixed(6)}:${JSON.stringify(frame.shapes.map(shape => Object.values(shape.box).map(value => value.toFixed(3))))}`
    if (next !== signature) { signature = next; since = Date.now() }
    return Date.now() - since
  }, { intervals: [25, 50, 100] }).toBeGreaterThan(180)
  return drawnFrame(page)
}

async function pinchIn(page: Page) {
  const box = (await page.locator('.tree-canvas').boundingBox())!
  const x = box.x + box.width / 2, y = box.y + box.height / 2
  const touch = await page.context().newCDPSession(page)
  await touch.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: x - 35, y, id: 1 }, { x: x + 35, y, id: 2 }] })
  await touch.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x - 85, y, id: 1 }, { x: x + 85, y, id: 2 }] })
  await touch.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
  await touch.detach()
}

async function expectSingleContext(page: Page, showHeights: boolean, showLevels: boolean) {
  await expect(page.locator('.tree-svg [data-node]')).toHaveCount(1)
  const frame = await settled(page)
  expect(frame.shapes.filter(shape => shape.kind === 'NIL')).toHaveLength(2)
  expect(frame.shapes.filter(shape => shape.kind === 'badge FB')).toHaveLength(1)
  expect(frame.shapes.filter(shape => shape.kind === 'altura')).toHaveLength(showHeights ? 1 : 0)
  expect(frame.shapes.filter(shape => shape.kind === 'nível')).toHaveLength(showLevels ? 1 : 0)
  expect(frame.clipped, 'inclui o texto, badge FB, arestas e quadrados NIL completos').toEqual([])
  return frame
}

for (const [showHeights, showLevels] of [[false, false], [true, false], [false, true], [true, true]] as const) {
  test(`um nó AVL mantém todo o contexto após zoom, pan e dock maior; alturas=${showHeights}, níveis=${showLevels}`, async ({ page }) => {
    await page.setViewportSize({ width: showHeights ? 393 : 392, height: 725 })
    await preferences(page, showHeights, showLevels)
    await page.goto('/lab?t=avl&q=i60&c=99999')
    await expect(page.locator('.tree-svg')).toHaveAttribute('aria-label', /1 nós/)
    await page.evaluate(() => document.fonts.ready)
    const initial = await expectSingleContext(page, showHeights, showLevels)
    await pinchIn(page)
    const zoomed = await expectSingleContext(page, showHeights, showLevels)
    expect(zoomed.scale).toBeGreaterThan(initial.scale * 1.05)

    const canvas = (await page.locator('.tree-canvas').boundingBox())!
    await page.mouse.move(canvas.x + 10, canvas.y + 12)
    await page.mouse.down()
    await page.mouse.move(canvas.x + 10, canvas.y + canvas.height - 12, { steps: 6 })
    await page.mouse.up()
    await expectSingleContext(page, showHeights, showLevels)

    const handle = (await page.getByRole('separator', { name: 'Ajustar altura do painel de operações' }).boundingBox())!
    const x = handle.x + handle.width / 2, y = handle.y + handle.height / 2
    await page.mouse.move(x, y)
    await page.mouse.down()
    for (const delta of [20, 50, 90, 130]) {
      await page.mouse.move(x, y - delta)
      await nextPaint(page)
      expect((await drawnFrame(page)).clipped, `contexto completo durante resize de ${delta}px`).toEqual([])
    }
    await page.mouse.up()
    const resized = await expectSingleContext(page, showHeights, showLevels)
    expect(resized.viewport.height).toBeLessThan(initial.viewport.height - 50)
    expect(resized.scale).toBeLessThan(zoomed.scale)
  })
}

test('limpar uma árvore com câmera manual restaura o ajuste ao inserir a primeira raiz', async ({ page }) => {
  await page.setViewportSize({ width: 393, height: 725 })
  await preferences(page, true, true)
  await page.goto('/lab?t=avl&q=i40.i20.i60.i10.i30.i50.i70&c=99999')
  await expect(page.locator('.tree-svg [data-node]')).toHaveCount(7)
  const automatic = await settled(page)
  await pinchIn(page)
  expect((await settled(page)).scale).toBeGreaterThan(automatic.scale * 1.5)
  await page.getByRole('button', { name: 'Limpar toda a árvore e a sequência', exact: true }).click()
  await expect(page.locator('.tree-svg [data-node]')).toHaveCount(0)
  await page.getByRole('textbox', { name: 'Valor ou lista de inteiros' }).click()
  await page.getByRole('button', { name: '6', exact: true }).click()
  await page.getByRole('button', { name: '0', exact: true }).click()
  await page.getByRole('button', { name: 'Inserir valores', exact: true }).click()
  await expect(page.locator('.tree-svg')).toHaveAttribute('aria-label', /Raiz 60/)
  const root = await expectSingleContext(page, true, true)
  expect(root.scale).toBeCloseTo(1.15, 4)
})

test('a faixa de rotação reserva espaço por operação e devolve o espaço para uma árvore de um nó', async ({ page }) => {
  await page.setViewportSize({ width: 393, height: 725 })
  await preferences(page)
  const result = runSequence('avl', decodeOps('i1.i2.i3'))
  const [start, end] = result.opRanges[2]!
  await page.goto(`/lab?t=avl&q=i1.i2.i3&c=${start}`)
  await expect(page.getByRole('slider', { name: 'Passo da operação atual' })).toHaveAttribute('aria-valuenow', String(start))
  const bandHeight = () => page.locator('.rotation-band').evaluateAll(elements => elements[0]?.getBoundingClientRect().height ?? 0)
  await expect.poll(bandHeight).toBeCloseTo(32, 1)
  const canvasHeight = (await settled(page)).viewport.height
  for (let cursor = start + 1; cursor <= end; cursor++) {
    await page.getByRole('button', { name: 'Próximo passo', exact: true }).click()
    await expect(page.getByRole('slider', { name: 'Passo da operação atual' })).toHaveAttribute('aria-valuenow', String(cursor))
    expect(await bandHeight()).toBeCloseTo(32, 1)
    expect((await drawnFrame(page)).viewport.height).toBeCloseTo(canvasHeight, 1)
  }
  await page.goto('/lab?t=avl&q=i60&c=99999')
  await expectSingleContext(page, false, false)
  await expect.poll(bandHeight).toBe(0)
  const svg = (await page.locator('.tree-svg').boundingBox())!
  const dock = (await page.locator('.lab-dock').boundingBox())!
  expect(svg.y + svg.height, 'não há faixa vazia entre o diagrama e o dock').toBeCloseTo(dock.y, 1)
})

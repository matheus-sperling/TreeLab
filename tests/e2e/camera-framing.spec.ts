import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'
import { clampScale, fitCamera } from '../../app/composables/useCamera'
import { decodeOps, runSequence } from '../../app/engine'

const sequence = 'i70.i45.i90.i23.i63.i88.i306.i30.i60'
const result = runSequence('avl', decodeOps(sequence))

async function preferences(page: Page, reducedMotion = false) {
  await page.addInitScript(reduced => {
    localStorage.setItem('treelab-tour', 'seen')
    localStorage.setItem('treelab:settings', JSON.stringify({ showHeights: true, showLevels: true, speed: 4, granularity: 'summary', reducedMotion: reduced }))
  }, reducedMotion)
}
async function frame(page: Page) {
  return page.evaluate(() => {
    const canvas = document.querySelector('.tree-canvas')!.getBoundingClientRect()
    const camera = document.querySelector<SVGGElement>('.tree-svg > g')!.getScreenCTM()!
    const center = new DOMPoint(canvas.left + canvas.width / 2, canvas.top + canvas.height / 2).matrixTransform(camera.inverse())
    const nodes = [...document.querySelectorAll<SVGGElement>('.tree-svg [data-node]')].map(node => {
      const box = node.getBoundingClientRect()
      return { key: node.querySelector(':scope > text')?.textContent, left: box.left, right: box.right, top: box.top, bottom: box.bottom }
    })
    const clipped = nodes.filter(node => node.left < canvas.left - .5 || node.right > canvas.right + .5 || node.top < canvas.top - .5 || node.bottom > canvas.bottom + .5)
    return { width: canvas.width, height: canvas.height, nodes, clipped, scale: Math.hypot(camera.a, camera.b), center: { x: center.x, y: center.y } }
  })
}
async function framed(page: Page, count = 9) {
  await expect(page.locator('.tree-canvas')).toBeVisible()
  await expect(page.locator('.tree-svg > g')).toBeAttached()
  await expect.poll(async () => (await frame(page)).nodes.length).toBe(count)
  await expect.poll(async () => (await frame(page)).clipped).toEqual([])
}
async function nextPaint(page: Page) {
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))))
}
async function settledFrame(page: Page) {
  let signature = '', since = Date.now()
  await expect.poll(async () => {
    const current = await frame(page)
    const next = `${current.height.toFixed(3)}:${current.scale.toFixed(6)}:${current.center.x.toFixed(5)}:${current.center.y.toFixed(5)}`
    if (next !== signature) { signature = next; since = Date.now() }
    return Date.now() - since
  }, { intervals: [25, 50, 100] }).toBeGreaterThan(180)
  return frame(page)
}

test('o ajuste automático cabe na altura real de um canvas móvel estreito', () => {
  const bounds = { minX: -45, maxX: 45, minY: -45, maxY: 2818 }
  const camera = fitCamera(bounds, 361, 32)
  expect(camera.scale).toBeLessThan(.025)
  expect(camera.x + bounds.minX * camera.scale).toBeGreaterThanOrEqual(0)
  expect(camera.x + bounds.maxX * camera.scale).toBeLessThanOrEqual(361)
  expect(camera.y + bounds.minY * camera.scale).toBeGreaterThanOrEqual(0)
  expect(camera.y + bounds.maxY * camera.scale).toBeLessThanOrEqual(32)
  expect(clampScale(camera.scale * .9, .001)).toBeLessThan(camera.scale)
})

test('reprodução que começa com um nó termina com a árvore AVL inteira visível', async ({ page }) => {
  test.setTimeout(40_000)
  await page.setViewportSize({ width: 393, height: 680 })
  await preferences(page)
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  await page.goto(`/lab?t=avl&q=${sequence}&c=${result.opRanges[0]![1]}`)
  await framed(page, 1)
  await page.getByRole('button', { name: 'Reproduzir', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Pausar', exact: true })).toBeVisible()
  await expect.poll(() => new URL(page.url()).searchParams.get('c'), { timeout: 30_000 }).toBe(String(result.steps.length - 1))
  await framed(page)
  await expect(page.getByRole('button', { name: 'Reproduzir', exact: true })).toBeVisible()
  expect(errors).toEqual([])
})

test('a árvore continua dentro do canvas durante cada movimento da alça do painel', async ({ page }) => {
  await page.setViewportSize({ width: 393, height: 680 })
  await preferences(page)
  await page.goto(`/lab?t=avl&q=${sequence}&c=99999`)
  await framed(page)
  const handle = page.getByRole('separator', { name: 'Ajustar altura do painel de operações' })
  const box = (await handle.boundingBox())!
  const before = await frame(page)
  const x = box.x + box.width / 2, y = box.y + box.height / 2
  await page.mouse.move(x, y)
  await page.mouse.down()
  const heights: number[] = []
  for (const delta of [12, 28, 46, 65, 86, 108]) {
    await page.mouse.move(x, y - delta)
    await nextPaint(page)
    const current = await frame(page)
    heights.push(current.height)
    expect(current.nodes).toHaveLength(9)
    expect(current.clipped).toEqual([])
  }
  await page.mouse.up()
  expect(Math.min(...heights)).toBeLessThan(before.height - 30)
  await framed(page)
  await page.setViewportSize({ width: 393, height: 820 })
  await framed(page)
})

test('zoom manual conserva a escala e o ponto central após resize e avanço de passo', async ({ page }) => {
  await page.setViewportSize({ width: 393, height: 680 })
  await preferences(page)
  await page.goto(`/lab?t=avl&q=${sequence}&c=99999`)
  await framed(page)
  const auto = await settledFrame(page)
  const canvas = (await page.locator('.tree-canvas').boundingBox())!
  await page.mouse.move(canvas.x + canvas.width / 2, canvas.y + canvas.height / 2)
  await page.mouse.wheel(0, -100)
  await expect.poll(async () => (await frame(page)).scale).toBeCloseTo(auto.scale * 1.1, 4)
  const manual = await settledFrame(page)
  const handle = (await page.getByRole('separator', { name: 'Ajustar altura do painel de operações' }).boundingBox())!
  const x = handle.x + handle.width / 2, y = handle.y + handle.height / 2
  await page.mouse.move(x, y)
  await page.mouse.down()
  for (const delta of [8, 16, 28, 42, 58, 76]) {
    await page.mouse.move(x, y - delta)
    await nextPaint(page)
    const current = await frame(page)
    expect(current.scale).toBeCloseTo(manual.scale, 4)
    expect(current.center.x).toBeCloseTo(manual.center.x, 1)
    expect(current.center.y).toBeCloseTo(manual.center.y, 1)
  }
  await page.mouse.up()
  const dragged = await frame(page)
  await page.setViewportSize({ width: 393, height: 820 })
  await expect.poll(async () => (await frame(page)).height).toBeGreaterThan(dragged.height + 50)
  await expect.poll(async () => Math.abs((await frame(page)).center.y - manual.center.y)).toBeLessThan(.05)
  const resized = await frame(page)
  expect(resized.scale).toBeCloseTo(manual.scale, 4)
  expect(resized.center.x).toBeCloseTo(manual.center.x, 1)
  expect(resized.center.y).toBeCloseTo(manual.center.y, 1)
  await page.getByRole('button', { name: 'Passo anterior', exact: true }).click()
  await nextPaint(page)
  expect((await frame(page)).scale).toBeCloseTo(manual.scale, 4)
  await page.getByRole('button', { name: 'Ajustar árvore à tela', exact: true }).click()
  await framed(page)
  await page.getByRole('button', { name: 'Nó 23. Altura 1. Inspecionar.', exact: true }).click()
  await expect(page.getByRole('dialog')).toBeVisible()
  await page.getByRole('button', { name: 'Focar subárvore', exact: true }).click()
  await page.getByRole('button', { name: 'Fechar painel', exact: true }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await framed(page)
  // Grabbing the handle during a zoom freezes the visible transform rather
  // than applying the pending zoom destination on the first resized frame.
  const restored = await settledFrame(page)
  const zoomCanvas = (await page.locator('.tree-canvas').boundingBox())!
  const resizeHandle = (await page.getByRole('separator', { name: 'Ajustar altura do painel de operações' }).boundingBox())!
  await page.mouse.move(zoomCanvas.x + zoomCanvas.width / 2, zoomCanvas.y + zoomCanvas.height / 2)
  await page.mouse.wheel(0, -100)
  await page.waitForTimeout(80)
  const handleX = resizeHandle.x + resizeHandle.width / 2, handleY = resizeHandle.y + resizeHandle.height / 2
  await page.mouse.move(handleX, handleY)
  await page.mouse.down()
  await nextPaint(page)
  const frozen = await frame(page)
  expect(frozen.scale).toBeGreaterThan(restored.scale)
  expect(frozen.scale).toBeLessThan(restored.scale * 1.1 - .0001)
  await page.waitForTimeout(600)
  const held = await frame(page)
  expect(held.scale).toBeCloseTo(frozen.scale, 4)
  expect(held.center.x).toBeCloseTo(frozen.center.x, 1)
  expect(held.center.y).toBeCloseTo(frozen.center.y, 1)
  await page.mouse.move(handleX, handleY - 16)
  await nextPaint(page)
  const interrupted = await frame(page)
  expect(interrupted.scale).toBeCloseTo(frozen.scale, 4)
  expect(interrupted.center.x).toBeCloseTo(frozen.center.x, 1)
  expect(interrupted.center.y).toBeCloseTo(frozen.center.y, 1)
  await page.mouse.up()
})

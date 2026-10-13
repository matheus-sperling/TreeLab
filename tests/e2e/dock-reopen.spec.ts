import { expect, test, type Page } from '@playwright/test'
import { decodeOps, runSequence } from '../../app/engine'

async function startShort(page: Page, url: string) {
  await page.addInitScript(() => {
    if (!sessionStorage.getItem('dock-reopen-initialized')) {
      localStorage.setItem('treelab:dock-height', '128')
      sessionStorage.setItem('dock-reopen-initialized', 'true')
    }
  })
  await page.goto(url)
  await expect.poll(() => page.locator('.lab-dock').evaluate(element => element.getBoundingClientRect().height)).toBeCloseTo(128, 0)
}

async function expectFullControls(page: Page) {
  await expect(page.locator('.lab-playback')).toBeVisible()
  await expect.poll(() => page.evaluate(() => {
    const area = document.querySelector<HTMLElement>('.dock-scroll')!
    const bounds = area.getBoundingClientRect()
    const selectors = ['.narration', '.player', '#lab-values', '.lab-actions']
    return {
      top: area.scrollTop,
      overflow: Math.max(0, area.scrollHeight - area.clientHeight),
      contained: selectors.every(selector => {
        const box = document.querySelector(selector)!.getBoundingClientRect()
        return box.top >= bounds.top - 1 && box.bottom <= bounds.bottom + 1 && box.bottom <= innerHeight - 20
      }),
    }
  }), { intervals: [25, 50, 100] }).toEqual({ top: 0, overflow: 0, contained: true })
  for (const name of ['Buscar valores', 'Remover valores', 'Inserir valores']) {
    await expect(page.getByRole('button', { name, exact: true })).toBeVisible()
  }
}

async function camera(page: Page) {
  return page.evaluate(() => {
    const svg = document.querySelector('.tree-svg')!.getBoundingClientRect()
    const matrix = document.querySelector<SVGGElement>('.tree-svg > g')!.getScreenCTM()!
    return { x: matrix.e - svg.left, y: matrix.f - svg.top, scale: Math.hypot(matrix.a, matrix.b) }
  })
}

async function settledCamera(page: Page) {
  let signature = '', since = Date.now()
  await expect.poll(async () => {
    const current = await camera(page)
    const next = JSON.stringify(Object.values(current).map(value => value.toFixed(4)))
    if (next !== signature) { signature = next; since = Date.now() }
    return Date.now() - since
  }, { intervals: [25, 50, 100] }).toBeGreaterThan(180)
  return camera(page)
}

const sequence = 'i1.i2.i3'
const rotation = runSequence('rb', decodeOps(sequence)).steps.find(step => step.kind === 'rotate-pre')!
for (const scenario of [
  { viewport: { width: 393, height: 680 }, url: '/lab?t=rb', name: 'árvore vazia', diagram: false },
  { viewport: { width: 412, height: 915 }, url: `/lab?t=rb&q=${sequence}&c=${rotation.i}`, name: 'explicação de rotação', diagram: true },
]) {
  test(`reabrir mostra todos os controles de ${scenario.name} em ${scenario.viewport.width}×${scenario.viewport.height}`, async ({ page }) => {
    await page.setViewportSize(scenario.viewport)
    await startShort(page, scenario.url)
    let before: Awaited<ReturnType<typeof camera>> | undefined
    if (scenario.diagram) {
      await expect(page.locator('.step-reason')).toBeVisible()
      await settledCamera(page)
      const svg = (await page.locator('.tree-svg').boundingBox())!
      await page.mouse.move(svg.x + 12, svg.y + 12)
      await page.mouse.wheel(0, -400)
      before = await settledCamera(page)
    }
    await page.locator('.dock-scroll').evaluate(element => { element.scrollTop = element.scrollHeight })
    await page.getByRole('button', { name: 'Recolher controles', exact: true }).click()
    await expect(page.locator('.lab-dock')).toHaveClass(/collapsed/)
    await page.getByRole('button', { name: 'Expandir controles', exact: true }).click()
    await expectFullControls(page)
    await expect.poll(() => page.evaluate(() => localStorage.getItem('treelab:dock-height'))).toBeNull()
    if (before) {
      const after = await settledCamera(page)
      expect(after.x).toBeCloseTo(before.x, 4)
      expect(after.y).toBeCloseTo(before.y, 4)
      expect(after.scale).toBeCloseTo(before.scale, 5)
    }
    await page.reload()
    await expectFullControls(page)
  })
}

for (const close of ['Voltar à reprodução', 'Recolher teclado']) {
  test(`voltar do teclado por ${close} restaura as informações completas`, async ({ page }) => {
    await page.setViewportSize({ width: 393, height: 680 })
    await startShort(page, '/lab?t=rb&q=i4.i2&c=99999')
    const input = page.getByRole('textbox', { name: 'Valor ou lista de inteiros' })
    await input.scrollIntoViewIfNeeded()
    await input.click()
    await expect(page.locator('.operation-composer.editing')).toBeVisible()
    await expect.poll(() => page.locator('.dock-scroll').evaluate(element => element.scrollTop)).toBeGreaterThan(0)
    await page.getByRole('button', { name: close, exact: true }).click()
    await expectFullControls(page)
    await expect.poll(() => page.evaluate(() => localStorage.getItem('treelab:dock-height'))).toBeNull()
  })
}

test('arrastar ou ajustar o painel recolhido continua respeitando a altura escolhida', async ({ page }) => {
  await page.setViewportSize({ width: 393, height: 680 })
  await startShort(page, '/lab?t=rb')
  const handle = page.getByRole('separator', { name: 'Ajustar altura do painel de operações' })
  const dock = page.locator('.lab-dock')
  await page.getByRole('button', { name: 'Recolher controles', exact: true }).click()
  await handle.focus()
  await handle.press('Home')
  await expect(dock).not.toHaveClass(/collapsed/)
  await expect.poll(() => dock.evaluate(element => element.getBoundingClientRect().height)).toBeCloseTo(128, 0)
  await expect.poll(() => page.evaluate(() => localStorage.getItem('treelab:dock-height'))).toBe('128')

  await page.getByRole('button', { name: 'Recolher controles', exact: true }).click()
  let signature = '', since = Date.now()
  await expect.poll(async () => {
    const current = await dock.evaluate(element => element.getBoundingClientRect().height.toFixed(4))
    if (current !== signature) { signature = current; since = Date.now() }
    return Date.now() - since
  }, { intervals: [25, 50, 100] }).toBeGreaterThan(180)
  const bounds = (await handle.boundingBox())!
  const initial = (await dock.boundingBox())!.height
  const touch = await page.context().newCDPSession(page)
  const x = bounds.x + bounds.width / 2, y = bounds.y + bounds.height / 2
  await touch.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y, id: 1 }] })
  for (const distance of [12, 24, 40]) {
    await touch.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y: y - distance, id: 1 }] })
  }
  await touch.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
  await touch.detach()
  const expected = Math.max(128, initial + 40)
  await expect(dock).not.toHaveClass(/collapsed/)
  await expect.poll(() => dock.evaluate(element => element.getBoundingClientRect().height)).toBeCloseTo(expected, 0)
  await expect.poll(() => page.evaluate(() => Number(localStorage.getItem('treelab:dock-height')))).toBeCloseTo(expected, 0)
  await page.getByRole('button', { name: 'Recolher controles', exact: true }).click()
  await page.getByRole('button', { name: 'Expandir controles', exact: true }).click()
  await expectFullControls(page)
  await expect.poll(() => page.evaluate(() => localStorage.getItem('treelab:dock-height'))).toBeNull()
})

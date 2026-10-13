import { expect, test, type Page } from '@playwright/test'

async function touchResize(page: Page, distance: number) {
  const handle = page.getByRole('separator', { name: 'Ajustar altura do painel de operações' })
  const bounds = (await handle.boundingBox())!
  const touch = await page.context().newCDPSession(page)
  const x = bounds.x + bounds.width / 2, y = bounds.y + bounds.height / 2
  await touch.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y, id: 1 }] })
  const heights: number[] = []
  for (let step = 1; step <= 8; step++) {
    await touch.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y: y + distance * step / 8, id: 1 }] })
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(resolve)))
    heights.push(await page.locator('.lab-dock').evaluate(element => element.getBoundingClientRect().height))
  }
  await touch.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
  await touch.detach()
  return heights
}

async function expectReachable(page: Page, label: string) {
  const button = page.getByRole('button', { name: label, exact: true }).last()
  await button.scrollIntoViewIfNeeded()
  await expect.poll(() => button.evaluate(element => {
    const rect = element.getBoundingClientRect()
    const middle = document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2)
    return rect.top >= 0 && rect.bottom <= innerHeight - 20 && middle?.closest('button') === element
  })).toBe(true)
}

for (const viewport of [{ width: 412, height: 915 }, { width: 393, height: 680 }]) {
  test(`painel ajusta continuamente por toque e mantém ações acessíveis em ${viewport.width}×${viewport.height}`, async ({ page }) => {
    await page.setViewportSize(viewport)
    await page.goto('/lab?t=avl&q=i70.i45.i90.i23.i63.i88.i300.i30.i49&c=99999')
    const dock = page.locator('.lab-dock')
    await expect(page.locator('.tree-svg')).toHaveAttribute('aria-label', /9 nós/)
    await page.waitForTimeout(400)
    const initial = (await dock.boundingBox())!
    const initialCanvas = (await page.locator('.tree-svg').boundingBox())!
    const heights = await touchResize(page, 96)
    for (let frame = 0; frame < heights.length; frame++) expect(heights[frame]).toBeCloseTo(Math.max(128, initial.height - (frame + 1) * 12), 0)
    const resized = (await dock.boundingBox())!
    expect(resized.height).toBeLessThan(initial.height - 80)
    const canvas = (await page.locator('.tree-svg').boundingBox())!
    const workspace = (await page.locator('.lab-workspace').boundingBox())!
    expect(canvas.y + canvas.height).toBeCloseTo(workspace.y + workspace.height, 0)
    expect(canvas.height).toBeCloseTo(initialCanvas.height, 3)
    expect(canvas.y + canvas.height).toBeGreaterThan(resized.y + 100)
    expect(await page.locator('.lab-dock.collapsed').count()).toBe(0)
    await expectReachable(page, 'Reproduzir')
    await expectReachable(page, 'Inserir valores')

    await page.reload()
    await expect.poll(async () => (await dock.boundingBox())!.height).toBeCloseTo(resized.height, 0)
    const handle = page.getByRole('separator', { name: 'Ajustar altura do painel de operações' })
    await handle.focus(); await handle.press('ArrowUp')
    await expect.poll(async () => (await dock.boundingBox())!.height).toBeCloseTo(resized.height + 24, 0)
    const preferred = (await dock.boundingBox())!.height
    const input = page.getByRole('textbox', { name: 'Valor ou lista de inteiros' })
    await input.click()
    await expect.poll(() => input.evaluate(element => {
      const rect = element.getBoundingClientRect(), area = element.closest('.dock-scroll')!.getBoundingClientRect()
      return rect.top >= area.top && rect.bottom <= area.bottom
    })).toBe(true)
    await expectReachable(page, 'Valor aleatório livre')
    await expectReachable(page, 'Inserir valores')
    await page.getByRole('button', { name: 'Recolher teclado', exact: true }).last().click()
    await expect.poll(async () => (await dock.boundingBox())!.height).toBeCloseTo(preferred, 0)
  })
}

test('altura mínima preserva a alça e ações com margem inferior segura', async ({ page }) => {
  await page.setViewportSize({ width: 393, height: 680 })
  await page.goto('/lab?t=rb&q=i4.i2.i6.i1&c=99999')
  const handle = page.getByRole('separator', { name: 'Ajustar altura do painel de operações' })
  await handle.focus(); await handle.press('Home')
  await expect.poll(() => page.locator('.lab-dock').evaluate(element => element.getBoundingClientRect().height)).toBeCloseTo(128, 0)
  await expectReachable(page, 'Inserir valores')
  const before = (await handle.boundingBox())!
  await page.getByRole('button', { name: 'Inserir valores' }).scrollIntoViewIfNeeded()
  expect((await handle.boundingBox())!.y).toBeCloseTo(before.y, 0)
  await page.getByRole('textbox', { name: 'Valor ou lista de inteiros' }).click()
  await page.setViewportSize({ width: 393, height: 400 })
  await expectReachable(page, 'Buscar valores')
  await expectReachable(page, 'Remover valores')
  await expectReachable(page, 'Inserir valores')
})

import { expect, test, type Locator, type Page } from '@playwright/test'

// The shared configuration emulates a phone. These checks exercise a real
// desktop pointer and keyboard so that the mobile number pad cannot hide bugs.
test.use({ isMobile: false, hasTouch: false })

const labExample = '/lab?t=avl&q=i40.i20.i60&c=99999'

async function expectReachable(locator: Locator) {
  await expect(locator).toBeVisible()
  await expect.poll(() => locator.evaluate(element => {
    const rect = element.getBoundingClientRect()
    const target = document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2)
    return rect.left >= 0 && rect.top >= 0 && rect.right <= innerWidth && rect.bottom <= innerHeight
      && Boolean(target && element.contains(target))
  })).toBe(true)
}

async function expectNoHorizontalOverflow(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
}

for (const viewport of [{ width: 1080, height: 720 }, { width: 1280, height: 720 }, { width: 1440, height: 900 }, { width: 1920, height: 1080 }]) {
  test(`computador usa a janela inteira com controles acessíveis em ${viewport.width}×${viewport.height}`, async ({ page }) => {
    await page.setViewportSize(viewport)
    await page.goto(labExample)
    await expect(page.locator('.tree-svg')).toHaveAttribute('aria-label', /3 nós/)
    const screen = (await page.locator('.lab-screen').boundingBox())!
    expect(screen.x).toBe(0)
    expect(screen.width).toBe(viewport.width)
    const workspace = (await page.locator('.lab-workspace').boundingBox())!
    const dock = (await page.locator('.lab-dock').boundingBox())!
    expect(dock.x).toBeGreaterThan(viewport.width / 2)
    expect(dock.width).toBeGreaterThanOrEqual(340)
    expect(dock.width).toBeLessThanOrEqual(440)
    expect(dock.y).toBeCloseTo(workspace.y, 0)
    expect(dock.y + dock.height).toBeCloseTo(viewport.height, 0)
    await expectReachable(page.getByRole('button', { name: 'Reproduzir', exact: true }))
    expect(await page.locator('.play-button .iconify').evaluate(element => element.getBoundingClientRect().width)).toBeGreaterThanOrEqual(16)
    await expectReachable(page.getByRole('textbox', { name: 'Valor ou lista de inteiros' }))
    await expectReachable(page.getByRole('button', { name: 'Inserir valores', exact: true }))
    await expectNoHorizontalOverflow(page)
  })
}

test('teclado do computador edita valores e insere com Enter sem esconder a reprodução', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 })
  await page.goto(labExample)
  await expect(page.locator('.tree-svg')).toHaveAttribute('aria-label', /3 nós/)
  const input = page.getByRole('textbox', { name: 'Valor ou lista de inteiros' })
  await input.click()
  await expect(input).toBeEditable()
  await expectReachable(page.getByRole('button', { name: 'Reproduzir', exact: true }))
  await expect(page.locator('.entry-keyboard')).toHaveCount(0)
  await input.fill('10, 25, 7')
  await input.press('End')
  await input.press('Backspace')
  await input.pressSequentially('-7')
  await expect(input).toHaveValue('10, 25, -7')
  await input.press('ControlOrMeta+A')
  await input.pressSequentially('-12, 9')
  await expect(input).toHaveValue('-12, 9')
  await input.press('Enter')
  const operations = page.getByRole('group', { name: 'Sequência de operações' })
  await expect(operations.getByRole('button', { name: 'Inserir -12. Ver desde o início.', exact: true })).toBeVisible()
  await expect(operations.getByRole('button', { name: 'Inserir 9. Ver desde o início.', exact: true })).toBeVisible()
  await expect(page.getByRole('region', { name: 'Controle da reprodução', exact: true })).toBeVisible()
  await expect(page.locator('.entry-keyboard')).toHaveCount(0)
})

test('recolher o painel do computador libera espaço e reabrir devolve os controles completos', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto(labExample)
  const dock = page.getByRole('region', { name: 'Painel de operações', exact: true })
  await expect(page.locator('.tree-svg')).toHaveAttribute('aria-label', /3 nós/)
  const openWidth = (await dock.boundingBox())!.width
  await page.getByRole('button', { name: 'Recolher controles', exact: true }).click()
  await expect.poll(async () => (await dock.boundingBox())!.width).toBe(56)
  await expectReachable(page.getByRole('button', { name: 'Expandir controles', exact: true }))
  await page.getByRole('button', { name: 'Expandir controles', exact: true }).click()
  await expect.poll(async () => (await dock.boundingBox())!.width).toBe(openWidth)
  await expectReachable(page.getByRole('button', { name: 'Reproduzir', exact: true }))
  await expectReachable(page.getByRole('textbox', { name: 'Valor ou lista de inteiros' }))
  await expectReachable(page.getByRole('button', { name: 'Inserir valores', exact: true }))
})

test('painel de opções fica centralizado, cabe na janela e devolve o foco ao fechar', async ({ page }) => {
  for (const viewport of [{ width: 1280, height: 720 }, { width: 1920, height: 1080 }]) {
    await page.setViewportSize(viewport)
    await page.goto(labExample)
    const trigger = page.getByRole('button', { name: 'Abrir menu do laboratório', exact: true })
    await trigger.click()
    const dialog = page.getByRole('dialog', { name: 'Laboratório', exact: true })
    await expect(dialog).toBeVisible()
    await expect.poll(async () => {
      const rect = (await dialog.boundingBox())!
      return Math.max(Math.abs(rect.x + rect.width / 2 - viewport.width / 2), Math.abs(rect.y + rect.height / 2 - viewport.height / 2))
    }).toBeLessThan(.5)
    const box = (await dialog.boundingBox())!
    expect(box.width).toBeLessThan(viewport.width - 48)
    expect(box.height).toBeLessThanOrEqual(viewport.height - 32)
    expect(box.x + box.width / 2).toBeCloseTo(viewport.width / 2, 0)
    expect(box.y + box.height / 2).toBeCloseTo(viewport.height / 2, 0)
    await expectReachable(page.getByRole('button', { name: 'Fechar painel', exact: true }))
    await page.getByRole('tab', { name: 'Opções', exact: true }).click()
    await page.getByRole('link', { name: 'Tema, texto e outros ajustes', exact: true }).scrollIntoViewIfNeeded()
    await expectReachable(page.getByRole('button', { name: 'Fechar painel', exact: true }))
    await page.keyboard.press('Escape')
    await expect(dialog).toHaveCount(0)
    await expect(trigger).toBeFocused()
    await expectNoHorizontalOverflow(page)
  }
})

test('navegação do computador conecta laboratório e comparação com três árvores lado a lado', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto(labExample)
  await page.locator('.lab-appbar').getByRole('link', { name: /Comparar/ }).click()
  await expect(page).toHaveURL(/\/comparar/)
  const cards = page.locator('.comparison-card')
  await expect(cards).toHaveCount(3)
  const boxes = await cards.evaluateAll(elements => elements.map(element => {
    const rect = element.getBoundingClientRect()
    return { top: rect.top, left: rect.left, right: rect.right, width: rect.width }
  }))
  for (const box of boxes) {
    expect(box.top).toBeCloseTo(boxes[0]!.top, 0)
    expect(box.width).toBeGreaterThanOrEqual(240)
    expect(box.left).toBeGreaterThanOrEqual(0)
    expect(box.right).toBeLessThanOrEqual(1440)
  }
  await expectNoHorizontalOverflow(page)
  await cards.nth(1).click()
  await expect(page).toHaveURL(/\/lab\?/)
  await expect(page.locator('.tree-segment').getByRole('button', { name: 'AVL', exact: true })).toHaveAttribute('aria-pressed', 'true')
  await expect(page.locator('.lab-appbar').getByRole('link', { name: /Comparar/ })).toBeVisible()
})

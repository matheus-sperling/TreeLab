import { expect, test } from '@playwright/test'
import { decodeOps, runSequence } from '../../app/engine'

test('criar árvore vazia e editar a sequência com controles explícitos', async ({ page }) => {
  await page.goto('/')
  await page.waitForTimeout(400) // Capture the final entrance state.
  await expect(page.getByRole('navigation', { name: 'Navegação principal' })).toContainText('Comparar')
  await expect(page.getByRole('navigation', { name: 'Navegação principal' })).not.toContainText('Treinar')
  await page.screenshot({ path: 'docs/screenshots/redo-home-412.png' })
  await page.getByRole('link', { name: /Criar uma árvore/ }).click()
  await expect(page.locator('.tree-svg')).toHaveAttribute('aria-label', /Árvore vazia/)
  await page.waitForTimeout(300)
  await page.screenshot({ path: 'docs/screenshots/redo-empty-412.png' })
  await page.getByRole('button', { name: 'Inserir primeiro número' }).click()
  const input = page.getByRole('textbox', { name: 'Valor ou lista de inteiros' })
  await expect(input).toBeFocused()
  await input.pressSequentially('40,20,60,10')
  await page.getByRole('button', { name: 'Inserir valores' }).click()
  await page.getByRole('button', { name: 'Editar sequência de operações' }).click()
  await page.getByRole('textbox', { name: 'Número da operação 2' }).fill('25')
  await page.getByRole('textbox', { name: 'Número da operação 2' }).press('Tab')
  await page.getByRole('button', { name: 'Mover operação 2 para antes' }).click()
  await expect(page.getByRole('textbox', { name: 'Número da operação 1' })).toHaveValue('25')
  await page.getByRole('combobox', { name: 'Tipo da operação 2' }).selectOption('d')
  await page.getByRole('button', { name: 'Excluir operação 4' }).click()
  await page.waitForTimeout(350)
  await page.screenshot({ path: 'docs/screenshots/redo-sequence-412.png' })
  await page.getByRole('button', { name: 'Limpar tudo', exact: true }).click()
  await expect(page.locator('.tree-svg')).toHaveAttribute('aria-label', /Árvore vazia/)
  await page.getByRole('button', { name: 'Desfazer', exact: true }).click()
  await expect(page.locator('.operations-rail button')).toHaveCount(3)
})

test('dock, teclado, timeline e árvore cabem nas telas reais de uso', async ({ page }) => {
  const sizes = [{ width: 320, height: 640 }, { width: 360, height: 640 }, { width: 393, height: 680 }, { width: 412, height: 915 }, { width: 915, height: 412 }, { width: 1366, height: 900 }]
  for (const size of sizes) {
    await page.setViewportSize(size)
    await page.goto('/lab?t=rb&q=i40.i20.i60.i10&c=99999')
    await expect(page.locator('.tree-svg')).toHaveAttribute('aria-label', /4 nós/)
    await page.waitForTimeout(400) // Wait for layout/camera springs to settle before measuring.
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    const bounds = await page.locator('.node-target').evaluateAll(elements => elements.map(el => {
      const b = el.getBoundingClientRect(); return { left: b.left, right: b.right, top: b.top, bottom: b.bottom }
    }))
    const canvas = await page.locator('.tree-canvas').boundingBox()
    for (const b of bounds) { expect(b.left).toBeGreaterThanOrEqual(canvas!.x); expect(b.right).toBeLessThanOrEqual(canvas!.x + canvas!.width); expect(b.top).toBeGreaterThanOrEqual(canvas!.y); expect(b.bottom).toBeLessThanOrEqual(canvas!.y + canvas!.height) }
    const slider = await page.getByRole('slider', { name: 'Passo da operação atual' }).boundingBox()
    const controls = await page.locator('.player-buttons').boundingBox()
    expect(slider!.y + slider!.height).toBeLessThanOrEqual(controls!.y)
    await page.screenshot({ path: `docs/screenshots/redo-tree-${size.width}x${size.height}.png` })
    await page.getByRole('textbox', { name: 'Valor ou lista de inteiros' }).click()
    const insert = page.getByRole('button', { name: 'Inserir valores' })
    await expect.poll(() => insert.evaluate(el => { const b = el.getBoundingClientRect(); return b.bottom <= innerHeight - 20 && b.top >= 0 && document.elementFromPoint(b.x + b.width / 2, b.y + b.height / 2)?.closest('button') === el })).toBe(true)
    await page.waitForTimeout(400) // Capture the expanded dock after its spring.
    await page.screenshot({ path: `docs/screenshots/redo-keyboard-${size.width}x${size.height}.png` })
    if (size.width >= 1024) {
      await expect(page.getByRole('textbox', { name: 'Valor ou lista de inteiros' })).toBeEditable()
      await expect(page.locator('.entry-keyboard')).toHaveCount(0)
      await expect(page.locator('.lab-playback')).toBeVisible()
      await page.getByRole('textbox', { name: 'Valor ou lista de inteiros' }).press('Escape')
    } else {
      await page.getByRole('button', { name: 'Recolher teclado', exact: true }).last().click()
    }
    await page.getByRole('button', { name: 'Recolher controles', exact: true }).click()
    await expect(page.getByRole('textbox', { name: 'Valor ou lista de inteiros' })).toHaveCount(0)
    await page.getByRole('button', { name: 'Expandir controles', exact: true }).click()
    await expect(page.getByRole('button', { name: 'Reproduzir', exact: true })).toBeVisible()
  }
})

test('exemplos e conceitos partem do início e comparação atualiza semente', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('link', { name: 'Ver exemplo de AVL', exact: true }).click()
  await expect(page.locator('.tree-svg')).toHaveAttribute('aria-label', /Árvore vazia/)
  await page.getByRole('button', { name: 'Explorar um conceito' }).click()
  await expect(page.getByRole('dialog')).toContainText('Por que isso ajuda?')
  await page.getByRole('button', { name: 'Abrir experimento desde o início' }).click()
  await expect(page.locator('.tree-svg')).toHaveAttribute('aria-label', /Árvore vazia/)
  await page.goto('/comparar')
  const count = page.getByRole('spinbutton', { name: 'Quantidade de valores da comparação' })
  await expect(count).toHaveValue('15')
  await page.getByRole('textbox', { name: 'Semente do formato de ABB' }).fill('73')
  await expect(page.locator('.experiment-name')).toHaveText('Formato de ABB · semente 73')
  const sequence = await page.locator('.compare-operation-chips').textContent()
  await page.getByRole('textbox', { name: 'Semente do formato de ABB' }).fill('74')
  await expect(page.locator('.compare-operation-chips')).not.toHaveText(sequence!)
  await expect(page.locator('.compare-operation-chips button')).toHaveCount(15)
  await page.locator('.comparison-card').first().click()
  await expect(page.locator('.tree-svg')).toHaveAttribute('aria-label', /Árvore vazia/)
})

test('cada rotação e cor explica uma causa concreta sem repetir ação', async ({ page }) => {
  const avl = runSequence('avl', decodeOps('i30.i10.i20'))
  const index = avl.steps.findIndex(step => step.kind === 'rotate-pre')
  await page.goto(`/lab?t=avl&q=i30.i10.i20&c=${index}`)
  await expect(page.locator('.step-reason')).toContainText(/alinhar|zigue|prepara/i)
  await page.waitForTimeout(400) // Capture completed entrance animations.
  await page.screenshot({ path: 'docs/screenshots/redo-rotation.png' })
  await page.getByRole('button', { name: 'Detalhes', exact: true }).click()
  await expect(page.getByRole('dialog')).toContainText('Motivo deste passo')
  await expect(page.locator('.step-explanation')).toContainText('30')
  await page.waitForTimeout(300)
  await page.screenshot({ path: 'docs/screenshots/redo-details.png' })
  const rb = runSequence('rb', decodeOps('i4.i2.i6.i1'))
  const color = rb.steps.findIndex(step => step.kind === 'recolor' && step.msg.params.caseName === 'RB-I1')
  await page.goto(`/lab?t=rb&q=i4.i2.i6.i1&c=${color}`)
  await expect(page.locator('.step-reason')).not.toHaveText('')
  await page.getByRole('button', { name: 'Detalhes', exact: true }).click()
  await expect(page.locator('.color-change')).toContainText('vermelho')
  await expect(page.locator('.color-change')).toContainText('preto')
  await expect(page.locator('.step-explanation')).toContainText(/tio|pai/)
  await page.waitForTimeout(300)
  await page.screenshot({ path: 'docs/screenshots/redo-recolor.png' })
})

test('teclado do aparelho pausa e recolhe sem esconder ações', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('treelab:settings', JSON.stringify({ systemKeyboard: true })))
  await page.goto('/lab?q=i30.i20.i10')
  const input = page.getByRole('textbox', { name: 'Valor ou lista de inteiros' })
  await input.click()
  await page.setViewportSize({ width: 393, height: 400 })
  await expect(page.locator('.lab-playback')).toHaveCount(0)
  const insert = page.getByRole('button', { name: 'Inserir valores' })
  await expect.poll(() => insert.evaluate(el => el.getBoundingClientRect().bottom <= innerHeight - 20)).toBe(true)
  await input.fill('50'); await input.press('Enter')
  await expect(input).not.toBeFocused()
  await expect(page.locator('.lab-playback')).toBeVisible()
})

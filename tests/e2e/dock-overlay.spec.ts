import { expect, test, type Page } from '@playwright/test'

async function preferences(page: Page) {
  await page.addInitScript(() => {
    localStorage.setItem('treelab:settings', JSON.stringify({ showNils: true, showHeights: true, showLevels: true }))
    localStorage.setItem('treelab:dock-height', '320')
  })
}

async function scene(page: Page) {
  return page.evaluate(() => {
    const rect = (element: Element) => {
      const box = element.getBoundingClientRect()
      return { left: box.left, right: box.right, top: box.top, bottom: box.bottom, width: box.width, height: box.height }
    }
    const svg = rect(document.querySelector('.tree-svg')!)
    const dock = rect(document.querySelector('.lab-dock')!)
    const matrix = document.querySelector<SVGGElement>('.tree-svg > g')!.getScreenCTM()!
    return {
      svg, dock, workspace: rect(document.querySelector('.lab-workspace')!),
      root: rect(document.querySelector('.tree-svg .node-body')!),
      badge: rect(document.querySelector('.tree-svg [data-node] > g > rect')!),
      camera: { x: matrix.e - svg.left, y: matrix.f - svg.top, scale: Math.hypot(matrix.a, matrix.b) },
    }
  })
}

async function settled(page: Page) {
  let signature = '', since = Date.now()
  await expect.poll(async () => {
    const current = await scene(page)
    const next = JSON.stringify([current.svg, current.dock, current.camera].map(value => Object.values(value).map(number => number.toFixed(4))))
    if (next !== signature) { signature = next; since = Date.now() }
    return Date.now() - since
  }, { intervals: [25, 50, 100] }).toBeGreaterThan(180)
  return scene(page)
}

async function nextPaint(page: Page) {
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))))
}

async function pinchToMaximum(page: Page) {
  const current = await scene(page)
  const sidebar = current.dock.left > current.svg.left + 1
  const x = (current.svg.left + (sidebar ? current.dock.left : current.svg.right)) / 2
  const y = (current.svg.top + (sidebar ? current.svg.bottom - 32 : current.dock.top - 32)) / 2
  const touch = await page.context().newCDPSession(page)
  await touch.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: x - 35, y, id: 1 }, { x: x + 35, y, id: 2 }] })
  await touch.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x - 130, y, id: 1 }, { x: x + 130, y, id: 2 }] })
  await touch.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
  await touch.detach()
  await expect.poll(async () => (await scene(page)).camera.scale).toBeCloseTo(2.5, 5)
  return settled(page)
}

async function pan(page: Page, dx: number, dy: number) {
  const current = await scene(page)
  const x = current.svg.left + 8, y = current.svg.top + 12
  await page.mouse.move(x, y)
  await page.mouse.down()
  await page.mouse.move(x + dx, y + dy, { steps: 6 })
  // Finish with zero vertical velocity, so this checks the requested pan rather
  // than the amount of inertia produced by the automation's last fast move.
  await page.mouse.move(x + dx + .1, y + dy)
  await page.mouse.up()
  return settled(page)
}

function sameCamera(actual: Awaited<ReturnType<typeof scene>>['camera'], expected: Awaited<ReturnType<typeof scene>>['camera']) {
  expect(actual.x).toBeCloseTo(expected.x, 4)
  expect(actual.y).toBeCloseTo(expected.y, 4)
  expect(actual.scale).toBeCloseTo(expected.scale, 5)
}

for (const viewport of [{ width: 393, height: 725 }, { width: 412, height: 915 }]) {
  test(`dock cobre o SVG inteiro sem limitar zoom ou cortar a faixa acima dele em ${viewport.width}×${viewport.height}`, async ({ page }) => {
    await page.setViewportSize(viewport)
    await preferences(page)
    await page.goto('/lab?t=avl&q=i60&c=99999')
    await expect(page.locator('.tree-svg [data-node]')).toHaveCount(1)
    await page.evaluate(() => document.fonts.ready)
    const automatic = await settled(page)
    expect(automatic.svg.bottom).toBeCloseTo(automatic.workspace.bottom, 3)
    expect(automatic.svg.bottom).toBeGreaterThan(automatic.dock.top + 100)
    expect(automatic.svg.right).toBeCloseTo(automatic.workspace.right, 3)

    const zoomed = await pinchToMaximum(page)
    expect(zoomed.camera.scale).toBeGreaterThan(automatic.camera.scale * 2)
    const badgeCenter = (zoomed.badge.top + zoomed.badge.bottom) / 2
    const gap = await pan(page, 0, zoomed.dock.top - 16 - badgeCenter)
    expect((gap.badge.top + gap.badge.bottom) / 2).toBeCloseTo(gap.dock.top - 16, 0)
    expect(await page.evaluate(() => {
      const badge = document.querySelector('.tree-svg [data-node] > g > rect')!
      const box = badge.getBoundingClientRect()
      return document.elementFromPoint((box.left + box.right) / 2, (box.top + box.bottom) / 2) === badge
    }), 'o badge realmente aparece na antiga faixa de corte de 32px acima do dock').toBe(true)

    const rootCenter = (gap.root.top + gap.root.bottom) / 2
    const covered = await pan(page, 0, gap.dock.top + 36 - rootCenter)
    expect((covered.root.top + covered.root.bottom) / 2).toBeGreaterThan(covered.dock.top + 20)
    expect(covered.root.bottom).toBeLessThan(covered.svg.bottom)
    expect(await page.evaluate(() => {
      const root = document.querySelector('.tree-svg .node-body')!.getBoundingClientRect()
      return !!document.elementFromPoint((root.left + root.right) / 2, (root.top + root.bottom) / 2)?.closest('.lab-dock')
    }), 'o dock opaco fica à frente do nó que continua desenhado sob ele').toBe(true)

    const handle = (await page.getByRole('separator', { name: 'Ajustar altura do painel de operações' }).boundingBox())!
    const x = handle.x + handle.width / 2, y = handle.y + handle.height / 2
    await page.mouse.move(x, y)
    await page.mouse.down()
    for (const distance of [12, 30, 60]) {
      await page.mouse.move(x, y + distance)
      await nextPaint(page)
      sameCamera((await scene(page)).camera, covered.camera)
    }
    await page.mouse.up()
    const lowered = await settled(page)
    sameCamera(lowered.camera, covered.camera)
    expect(lowered.svg.height).toBeCloseTo(covered.svg.height, 3)
    expect(lowered.dock.top).toBeGreaterThan(covered.dock.top + 40)

    await page.getByRole('button', { name: 'Recolher controles', exact: true }).click()
    const collapsed = await settled(page)
    sameCamera(collapsed.camera, covered.camera)
    expect(collapsed.root.bottom).toBeLessThan(collapsed.dock.top)
    expect(await page.evaluate(() => {
      const root = document.querySelector('.tree-svg .node-body')!.getBoundingClientRect()
      const target = document.elementFromPoint((root.left + root.right) / 2, (root.top + root.bottom) / 2)
      return !!target?.closest('.tree-svg, .node-targets') && !target.closest('.lab-dock')
    }), 'recolher o dock revela o mesmo nó, sem reenquadrar a câmera').toBe(true)
    await page.getByRole('button', { name: 'Expandir controles', exact: true }).click()
    sameCamera((await settled(page)).camera, covered.camera)
  })
}

test('o painel lateral também cobre o SVG, preservando zoom e pan por baixo dele', async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 900 })
  await preferences(page)
  await page.goto('/lab?t=avl&q=i60&c=99999')
  await expect(page.locator('.tree-svg [data-node]')).toHaveCount(1)
  const automatic = await settled(page)
  expect(automatic.svg.right).toBeCloseTo(automatic.workspace.right, 3)
  expect(automatic.svg.right).toBeGreaterThan(automatic.dock.left + 300)
  expect(automatic.root.right).toBeLessThan(automatic.dock.left)
  const zoomed = await pinchToMaximum(page)
  const center = (zoomed.root.left + zoomed.root.right) / 2
  const covered = await pan(page, zoomed.dock.left + 60 - center, 0)
  expect((covered.root.left + covered.root.right) / 2).toBeGreaterThan(covered.dock.left + 30)
  expect(covered.root.right).toBeLessThan(covered.svg.right)
  expect(covered.camera.scale).toBeCloseTo(2.5, 5)
  expect(await page.evaluate(() => {
    const box = document.querySelector('.tree-svg .node-body')!.getBoundingClientRect()
    return !!document.elementFromPoint((box.left + box.right) / 2, (box.top + box.bottom) / 2)?.closest('.lab-dock')
  })).toBe(true)
  await page.getByRole('button', { name: 'Recolher controles', exact: true }).click()
  sameCamera((await settled(page)).camera, covered.camera)
})

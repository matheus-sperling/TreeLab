import { expect, test } from '@playwright/test'

const dimensions = [{ width: 360, height: 740 }, { width: 393, height: 852 }, { width: 412, height: 915 }, { width: 430, height: 932 }, { width: 915, height: 412 }]
test('todas as rotas cabem nas cinco telas suportadas', async ({ page }) => {
  test.setTimeout(120000)
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  for (const viewport of dimensions) {
    await page.setViewportSize(viewport)
    for (const route of ['/', '/lab', '/aprender', '/aprender/nos-raiz-e-subarvores', '/comparar', '/treinar', '/cola', '/glossario', '/ajustes', '/mais']) {
      await page.goto(route)
      await page.waitForLoadState('networkidle')
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${route} em ${viewport.width}`).toBe(true)
    }
  }
  expect(errors).toEqual([])
})

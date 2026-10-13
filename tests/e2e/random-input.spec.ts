import { expect, test } from '@playwright/test'

test('toques no sorteio preservam os números digitados e acrescentam novos valores distintos', async ({ page }) => {
  await page.goto('/lab?t=avl&q=i1.i2.i3&c=99999')
  const input = page.getByRole('textbox', { name: 'Valor ou lista de inteiros', exact: true })
  await input.tap()
  for (const digit of ['1', '0']) await page.getByRole('button', { name: digit, exact: true }).tap()
  await page.getByRole('button', { name: 'Separar valores', exact: true }).tap()
  for (const digit of ['2', '0']) await page.getByRole('button', { name: digit, exact: true }).tap()
  await expect(input).toHaveValue('10, 20')
  const random = page.getByRole('button', { name: 'Valor aleatório livre', exact: true })
  for (let count = 3; count <= 5; count++) {
    const before = await input.inputValue()
    await random.tap()
    await expect(input).toHaveValue(new RegExp(`^${before.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}, \\d+$`))
    const values = (await input.inputValue()).split(/[,\s]+/).map(Number)
    expect(values).toHaveLength(count)
    expect(values.slice(0, 2)).toEqual([10, 20])
    expect(new Set(values).size).toBe(count)
    expect(values.at(-1)).not.toBeLessThan(4)
  }
  const entered = (await input.inputValue()).split(/[,\s]+/).map(Number)
  await page.getByRole('button', { name: 'Inserir valores', exact: true }).tap()
  const expected = ['i1', 'i2', 'i3', ...entered.map(value => `i${value}`)].join('.')
  await expect.poll(() => new URL(page.url()).searchParams.get('q')).toBe(expected)
  await expect(input).toHaveValue(entered.join(', '))
  await input.tap()
  await random.tap()
  await expect(input).toHaveValue(new RegExp(`^${entered.join(', ')}, \\d+$`))
  await expect.poll(() => new URL(page.url()).searchParams.get('q')).toBe(expected)
})

test('sorteio mantém números negativos e aceita separador final sem substituir a lista', async ({ page }) => {
  await page.goto('/lab?t=rb&q=&c=0')
  const input = page.getByRole('textbox', { name: 'Valor ou lista de inteiros', exact: true })
  await input.tap()
  await input.pressSequentially('-8, 14, ')
  await page.getByRole('button', { name: 'Valor aleatório livre', exact: true }).tap()
  await expect(input).toHaveValue(/^-8, 14, \d+$/)
  await page.getByRole('button', { name: 'Recolher teclado', exact: true }).tap()
  await input.tap()
  const previous = await input.inputValue()
  await page.getByRole('button', { name: 'Valor aleatório livre', exact: true }).tap()
  expect((await input.inputValue()).startsWith(`${previous}, `)).toBe(true)
  expect((await input.inputValue()).split(/[,\s]+/).map(Number).slice(0, 2)).toEqual([-8, 14])
})

test('um burst de cliques nativos conserva todos os dígitos e sorteios sem valores repetidos', async ({ page }) => {
  await page.goto('/lab?t=avl&q=i1.i2.i3&c=99999')
  const input = page.getByRole('textbox', { name: 'Valor ou lista de inteiros', exact: true })
  await input.tap()
  // Dispare eventos DOM reais antes da próxima renderização do Vue, sem acessar o componente.
  await page.evaluate(() => {
    for (const label of ['1', '0', 'Separar valores', '2', '0', 'Valor aleatório livre', 'Valor aleatório livre', 'Valor aleatório livre']) {
      const button = document.querySelector<HTMLButtonElement>(`.number-pad button[aria-label="${label}"]`)
      if (!button) throw new Error(`Tecla não encontrada: ${label}`)
      button.click()
    }
  })
  await expect(input).toHaveValue(/^10, 20, \d+, \d+, \d+$/)
  const values = (await input.inputValue()).split(/[,\s]+/).map(Number)
  expect(values.slice(0, 2)).toEqual([10, 20])
  expect(new Set(values).size).toBe(5)
  await page.getByRole('button', { name: 'Inserir valores', exact: true }).tap()
  const expected = ['i1', 'i2', 'i3', ...values.map(value => `i${value}`)].join('.')
  await expect.poll(() => new URL(page.url()).searchParams.get('q')).toBe(expected)
})

test('edições rápidas de sinal, apagar e limpar usam sempre o último texto digitado', async ({ page }) => {
  await page.goto('/lab?t=avl&q=&c=0')
  const input = page.getByRole('textbox', { name: 'Valor ou lista de inteiros', exact: true })
  await input.tap()
  await input.pressSequentially('-8,14')
  await page.evaluate(() => {
    for (const label of ['7', 'Apagar; segure para limpar', 'Separar valores', 'Alternar sinal', '9', '9', 'Valor aleatório livre']) {
      document.querySelector<HTMLButtonElement>(`.number-pad button[aria-label="${label}"]`)!.click()
    }
  })
  await expect(input).toHaveValue(/^-8,14, -99, \d+$/)
  await page.evaluate(() => {
    for (const label of ['Limpar valores', '1', '2', 'Valor aleatório livre']) {
      document.querySelector<HTMLButtonElement>(`.number-pad button[aria-label="${label}"]`)!.click()
    }
  })
  await expect(input).toHaveValue(/^12, \d+$/)
})

test('sorteios rápidos respeitam vinte valores e nunca repetem um número no campo', async ({ page }) => {
  await page.goto('/lab?t=avl&q=&c=0')
  const input = page.getByRole('textbox', { name: 'Valor ou lista de inteiros', exact: true })
  await input.tap()
  await page.evaluate(() => {
    const random = document.querySelector<HTMLButtonElement>('.number-pad button[aria-label="Valor aleatório livre"]')!
    for (let index = 0; index < 25; index++) random.click()
  })
  await expect.poll(async () => (await input.inputValue()).split(/[,\s]+/).filter(Boolean).length).toBe(20)
  const values = (await input.inputValue()).split(/[,\s]+/).map(Number)
  expect(new Set(values).size).toBe(20)
  await expect(page.getByRole('button', { name: 'Valor aleatório livre', exact: true })).toBeDisabled()
})

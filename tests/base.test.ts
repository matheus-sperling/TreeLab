import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
describe('offline shell', () => {
  it('permite zoom e preserva a área segura', () => {
    const config = readFileSync('nuxt.config.ts', 'utf8')
    expect(config).toContain('viewport-fit=cover')
    expect(config).not.toContain('maximum-scale')
  })
})

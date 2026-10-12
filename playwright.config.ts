import { defineConfig } from '@playwright/test'
import { existsSync } from 'node:fs'
const chromiumPath = process.env.CHROMIUM_PATH || (existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : undefined)
export default defineConfig({
  testDir: './tests/e2e',
  use: { baseURL: 'http://localhost:3000', viewport: { width: 412, height: 915 }, isMobile: true, hasTouch: true, launchOptions: { executablePath: chromiumPath, args: ['--no-sandbox'] } },
  webServer: { command: 'pnpm dev', url: 'http://localhost:3000', reuseExistingServer: true, timeout: 120000 }
})

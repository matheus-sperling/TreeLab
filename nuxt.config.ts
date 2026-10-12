import tailwindcss from '@tailwindcss/vite'
import { lessons } from './app/content/lessons'

export default defineNuxtConfig({
  compatibilityDate: '2026-10-12',
  devtools: { enabled: false },
  experimental: { defaults: { nuxtLink: { prefetchOn: { visibility: false, interaction: true } } } },
  modules: ['motion-v/nuxt', '@pinia/nuxt', '@vueuse/nuxt', '@nuxt/fonts', '@nuxt/icon', '@nuxt/eslint', '@vite-pwa/nuxt'],
  pwa: {
    registerType: 'autoUpdate',
    manifest: { id: '/', name: 'TreeLab', short_name: 'TreeLab', description: 'Árvores de busca, passo a passo.', lang: 'pt-BR', start_url: '/', scope: '/', display: 'standalone', theme_color: '#0B0C10', background_color: '#0B0C10', icons: [{ src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' }, { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' }, { src: '/icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }] },
    workbox: { globPatterns: ['**/*.{js,css,html,json,woff2,png,svg}'], ignoreURLParametersMatching: [/^(t|q|c|rapido|semente|modulo)$/, /^utm_/, /^fbclid$/], navigateFallback: '/lab', cleanupOutdatedCaches: true },
    experimental: { enableWorkboxPayloadQueryParams: true },
    client: { registerPlugin: true }
  },
  css: ['~/assets/css/main.css'],
  vite: { plugins: [tailwindcss()] },
  typescript: { strict: true },
  spaLoadingTemplate: 'spa-loading-template.html',
  fonts: { provider: 'local', defaults: { preload: false }, families: [{ name: 'Inter Variable', src: '/fonts/inter-latin.woff2', weight: '100 900', style: 'normal', display: 'swap', global: true }, { name: 'JetBrains Mono', src: '/fonts/jetbrains-latin-400.woff2', weight: 400, style: 'normal', display: 'swap', global: true }, { name: 'JetBrains Mono', src: '/fonts/jetbrains-latin-600.woff2', weight: 600, style: 'normal', display: 'swap', global: true }] },
  nitro: { compressPublicAssets: true, prerender: { routes: ['/aprender', ...lessons.map(lesson => `/aprender/${lesson.slug}`)] } },
  icon: { provider: 'none', clientBundle: { scan: true, icons: ['lucide:arrow-down', 'lucide:arrow-left', 'lucide:arrow-right', 'lucide:arrow-up-right', 'lucide:book-a', 'lucide:book-open', 'lucide:chart-no-axes-column', 'lucide:chart-no-axes-combined', 'lucide:check', 'lucide:chevron-down', 'lucide:chevron-left', 'lucide:chevron-right', 'lucide:chevrons-left', 'lucide:chevrons-right', 'lucide:chevrons-up-down', 'lucide:circle', 'lucide:circle-check', 'lucide:circle-dashed', 'lucide:circle-dot', 'lucide:circle-help', 'lucide:circle-slash', 'lucide:clock-3', 'lucide:code', 'lucide:columns-3', 'lucide:copy', 'lucide:crosshair', 'lucide:delete', 'lucide:dices', 'lucide:ellipsis', 'lucide:equal', 'lucide:eraser', 'lucide:flask-conical', 'lucide:focus', 'lucide:git-branch', 'lucide:git-compare', 'lucide:hand', 'lucide:hash', 'lucide:help-circle', 'lucide:house', 'lucide:info', 'lucide:keyboard', 'lucide:layers', 'lucide:lightbulb', 'lucide:link', 'lucide:list', 'lucide:list-ordered', 'lucide:minus', 'lucide:move', 'lucide:move-horizontal', 'lucide:network', 'lucide:paintbrush', 'lucide:panel-bottom', 'lucide:pause', 'lucide:play', 'lucide:plus', 'lucide:rotate-ccw', 'lucide:rotate-cw', 'lucide:route', 'lucide:scale', 'lucide:scan', 'lucide:search', 'lucide:settings', 'lucide:share-2', 'lucide:shuffle', 'lucide:skip-back', 'lucide:skip-forward', 'lucide:sprout', 'lucide:target', 'lucide:triangle-alert', 'lucide:x', 'lucide:zoom-in'] } },
  routeRules: { '/fonts/**': { headers: { 'cache-control': 'public, max-age=31536000, immutable' } }, '/': { prerender: true }, '/aprender': { prerender: true }, '/cola': { prerender: true }, '/glossario': { prerender: true }, '/ajustes': { prerender: true }, '/mais': { prerender: true }, '/aprender/**': { prerender: true }, '/lab': { ssr: false, prerender: true }, '/comparar': { ssr: false, prerender: true }, '/treinar': { ssr: false, prerender: true }, '/treinar/**': { ssr: false } },
  app: { head: { htmlAttrs: { lang: 'pt-BR' }, title: 'TreeLab — entenda as árvores', meta: [{ name: 'viewport', content: 'width=device-width, initial-scale=1, viewport-fit=cover, interactive-widget=resizes-content' }, { name: 'description', content: 'Estude ABB, AVL e árvores Rubro-Negras com operações passo a passo. Sem conta, com controle do tempo e acesso offline.' }, { name: 'theme-color', content: '#0B0C10' }], link: [{ rel: 'preload', as: 'font', type: 'font/woff2', href: '/fonts/inter-latin.woff2', crossorigin: 'anonymous', fetchpriority: 'high', tagPriority: -10 }, { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' }], script: [{ innerHTML: "try{const s=JSON.parse(localStorage.getItem('treelab:settings')||'{}');const t=s.theme||'dark';document.documentElement.dataset.theme=t==='auto'?(matchMedia('(prefers-color-scheme: light)').matches?'light':'dark'):t}catch{document.documentElement.dataset.theme='dark'}", tagPosition: 'head' }] } }
})

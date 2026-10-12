import tailwindcss from '@tailwindcss/vite'

export default defineNuxtConfig({
  compatibilityDate: '2026-10-12',
  devtools: { enabled: false },
  modules: ['motion-v/nuxt', '@pinia/nuxt', '@vueuse/nuxt', '@nuxt/fonts', '@nuxt/icon', '@nuxt/eslint'],
  css: ['~/assets/css/main.css'],
  vite: { plugins: [tailwindcss()] },
  typescript: { strict: true },
  fonts: { provider: 'local' },
  icon: { provider: 'none', clientBundle: { scan: true, icons: ['lucide:house', 'lucide:flask-conical', 'lucide:book-open', 'lucide:target', 'lucide:ellipsis', 'lucide:arrow-left', 'lucide:arrow-right', 'lucide:plus', 'lucide:minus', 'lucide:search', 'lucide:play', 'lucide:pause', 'lucide:skip-back', 'lucide:skip-forward', 'lucide:chevron-left', 'lucide:chevron-right', 'lucide:x', 'lucide:check', 'lucide:focus', 'lucide:crosshair', 'lucide:shuffle', 'lucide:delete', 'lucide:chevron-down', 'lucide:rotate-ccw', 'lucide:git-branch', 'lucide:scale', 'lucide:circle-dot', 'lucide:settings', 'lucide:share-2', 'lucide:info', 'lucide:layers', 'lucide:code', 'lucide:list', 'lucide:keyboard', 'lucide:lightbulb', 'lucide:chart-no-axes-column', 'lucide:chevrons-left', 'lucide:chevrons-right', 'lucide:scan', 'lucide:dices', 'lucide:route', 'lucide:move', 'lucide:equal', 'lucide:rotate-cw', 'lucide:paintbrush', 'lucide:circle-dashed', 'lucide:list-ordered', 'lucide:copy', 'lucide:circle-slash', 'lucide:panel-bottom', 'lucide:zoom-in', 'lucide:help-circle', 'lucide:git-compare', 'lucide:hand', 'lucide:hash', 'lucide:chevrons-up-down', 'lucide:arrow-up-right'] } },
  routeRules: { '/': { prerender: true }, '/aprender/**': { prerender: true }, '/lab': { ssr: false }, '/comparar': { ssr: false }, '/treinar/**': { ssr: false } },
  app: { head: { htmlAttrs: { lang: 'pt-BR' }, title: 'TreeLab — entenda as árvores', meta: [{ name: 'viewport', content: 'width=device-width, initial-scale=1, viewport-fit=cover, interactive-widget=resizes-content' }, { name: 'description', content: 'Estude ABB, AVL e árvores Rubro-Negras com operações passo a passo. Sem conta, com controle do tempo e acesso offline.' }, { name: 'theme-color', content: '#0B0C10' }], link: [{ rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' }], script: [{ innerHTML: "try{const s=JSON.parse(localStorage.getItem('treelab:settings')||'{}');const t=s.theme||'dark';document.documentElement.dataset.theme=t==='auto'?(matchMedia('(prefers-color-scheme: light)').matches?'light':'dark'):t}catch{document.documentElement.dataset.theme='dark'}", tagPosition: 'head' }] } }
})

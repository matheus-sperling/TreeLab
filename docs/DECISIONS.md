# Decisões

- Base: versões estáveis consultadas em `npm view` em 12/10/2026, fixadas no manifest e lockfile. Node 24 LTS e pnpm 11.
- Fontes: Inter e JetBrains Mono empacotadas localmente via Fontsource, com `@nuxt/fonts` limitado ao provedor local. Nenhuma CDN é necessária em runtime.
- Renderização: conteúdo pré-renderizado; laboratório, comparação e treino são rotas cliente independentes. Sem backend ou variáveis de ambiente.
- TypeScript 7.0.2: `vue-tsc` 3.3.13 falha em `lib/tsc` e typescript-eslint declara incompatibilidade. Fixamos 6.0.3 (última 6.x estável consultada); strict permanece ligado.

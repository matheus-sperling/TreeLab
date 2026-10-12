# TreeLab

Um laboratório para entender ABB, AVL e Rubro-Negra. Nuxt 4, Vue 3, TypeScript, motion-v e Tailwind CSS 4. Mobile-first, sem conta e sem backend.

## Desenvolvimento

Use Node 24 LTS e pnpm 11.

```sh
pnpm install
pnpm dev
pnpm typecheck
pnpm lint
pnpm test
pnpm build
```

O motor puro em `app/engine` transforma operações em snapshots e passos. A interface reproduz os passos sem manter uma árvore mutável.

## Vercel

Import Git Repository → selecione TreeLab → framework Nuxt → Deploy. Sem variáveis de ambiente ou configuração adicional.

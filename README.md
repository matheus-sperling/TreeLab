# TreeLab

Estude ABB, AVL e Rubro-Negra com controle de cada comparação, transplante, rotação e recoloração. Feito para celulares, sem conta, backend, anúncios ou chamadas a serviços externos. Funciona offline depois da instalação do service worker.

## O que está disponível

- Início focado em criar uma árvore vazia, escolher ABB/AVL/RN ou abrir um experimento desde a primeira inserção. Uma abertura curta explica a relação entre altura e complexidade.
- Laboratório: inserir, remover e buscar valores; editor explícito para mudar chaves, trocar operações, reordenar e excluir; zerar a árvore com desfazer.
- Reprodução com rótulo, feedback tátil quando suportado, linha do tempo com área de toque independente dos botões e painel de entrada expansível por toque ou arrasto.
- Detalhes explicam o motivo de cada decisão, as mudanças reais no snapshot, a regra desejada, pseudocódigo e totais de trabalho.
- Todas as arestas têm inclinação absoluta de 45°. Subárvores ocupam intervalos separados; comprimentos verticais variam para evitar cruzamentos e manter o ângulo. A câmera enquadra a árvore inteira; pan e pinça permitem inspecionar árvores grandes.
- Rotações mostram o filho subindo e o pivô descendo; toda mudança de cor mostra a transição e o motivo específico do caso.
- Comparar na navegação principal: mesma sequência nas três estruturas, linha do tempo e atualização imediata ao editar a semente.
- Opções, seção do menu, semente e tamanho da sequência aleatória persistem no dispositivo.
- PWA, fontes e ícones locais, sem login ou backend. Movimento reduzido respeita a preferência do dispositivo e os ajustes do usuário.

As antigas rotas de lições, treino, cola e glossário redirecionam ao início. Os conceitos são apresentados nos experimentos e nos passos do laboratório.

## Rodar

Use Node 24 LTS e pnpm 11.25.0 (`corepack enable`, quando disponível).

```sh
pnpm install --frozen-lockfile
pnpm dev
```

Abra `http://localhost:3000`. Para conferir a versão de produção:

```sh
pnpm build
pnpm preview
```

O service worker é gerado no build de produção. Se preferir testar numa porta específica: `PORT=3001 node .output/server/index.mjs`.

## Qualidade

```sh
pnpm typecheck
pnpm lint
pnpm test
pnpm build
pnpm test:e2e
```

Os quatro primeiros são os checks obrigatórios da CI. Playwright usa Chromium do sistema quando disponível; em outro ambiente execute `pnpm exec playwright install chromium`, ou informe `CHROMIUM_PATH`.

Vitest valida 200 sequências de 80 operações por tipo, todos os snapshots intermediários, casos dirigidos e espelhados, limites de rotações, ids imutáveis, mensagens/código, codec, layout, conteúdo, geradores e controles. Testes de componentes usam Vue Test Utils. E2E cobre as cinco dimensões suportadas, lote, troca de tipo, seek e entrada inválida. Resultados de navegador e limitações estão em [docs/VERIFICATION.md](docs/VERIFICATION.md). A revisão de espaçamentos, teclado 4×4 e foco está em [docs/UI-SPACING.md](docs/UI-SPACING.md).

## Estrutura

```text
app/engine/           Motor TypeScript puro, snapshots, casos, layout e codec
app/stores/           Sequência/cursor, preferências e progresso
app/composables/      Reprodução, câmera, háptico, painéis e URL
app/components/      ui, lab, learn e train
app/content/         Lições, catálogo leve, glossário, cola e questões
app/pages/           Rotas Nuxt
tests/               Motor, componentes, conteúdo, treino e E2E
scripts/             Busca e redução de presets
public/              Fontes e ícones locais
docs/                Decisões e evidências de verificação
```

Arquitetura: `{ type, operations, cursor }` → `runSequence(type, operations)` → snapshots congelados e passos → layout → reprodução. A UI deriva a árvore do cursor, preserva o id dos nós e usa MotionValues compartilhadas por nós e arestas. O motor não importa Vue, Nuxt, DOM ou motion-v; ESLint aplica essa fronteira.

Convenções: chaves inteiras distintas de −999 a 999; no máximo 63 nós. Altura conta arestas, folha = 0 e NIL = −1. FB = altura esquerda − altura direita. Remoção com dois filhos move o sucessor por transplante. Uma rotação dupla conta duas primitivas no custo.

## Adicionar conteúdo

Adicione um objeto `Lesson` em `app/content/lessons.ts`: slug único, módulo, três ideias no TL;DR, blocos tipados, complexidade e armadilhas. Use `miniTree` com operações reais e `quickCheck` com explicação. Atualize `catalog.ts` para os módulos específicos de ABB/AVL/RN; os testes verificam a correspondência.

Adicione questões conceituais em `app/content/quiz.ts`, com alternativas, índice correto e explicação. Questões estruturais devem usar `app/engine/training.ts` e obter a resposta dos snapshots, metadados ou `validate`, nunca de um gabarito manual.

Para reexaminar os presets: `node --experimental-strip-types scripts/find-presets.ts`. Casos RN são buscados por número crescente de nós; exemplos AVL de remoção são reduzidos preservando a condição e travados em teste.

## Vercel

Import Git Repository → selecione `matheus-sperling/TreeLab` → framework **Nuxt** → Deploy. Use Node 24. Sem variáveis de ambiente e sem `vercel.json`.

Stack: Nuxt 4.6.1, Vue 3.5, TypeScript estrito, motion-v 2.6, Tailwind 4.3, Pinia, VueUse, Reka UI, Nuxt Fonts/Icon e Vite PWA. Versões exatas no manifest/lockfile. A exceção do TypeScript 6.0.3 e outras decisões estão em [docs/DECISIONS.md](docs/DECISIONS.md).

Licença MIT. Progresso e preferências ficam no dispositivo; limpar os dados do navegador apaga essas informações.

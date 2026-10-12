# Verificação do TreeLab

Verificado em 12/10/2026 com Chromium 154, Playwright 1.64, axe-core 4.13 e Lighthouse 13.5. Navegador com toque emulado; produção servida pelo Nitro em `localhost:3001`. Node 24.19 e pnpm 11.25.

## Entrega por fase

| Fase | Entrega | Commit |
| --- | --- | --- |
| 0 | Nuxt, módulos, tema, layouts, navegação, ESLint, Vitest e CI | `8daa4fb` |
| 1 | Motor ABB/AVL/RN, snapshots, validação, custos, mensagens, código, codec, layout e presets | `7a2f1fa` |
| 2 | SVG com MotionValues, arestas conectadas, câmera e vazio | `5d55fbb` |
| 3 | Agendador cancelável, player, narração, custos e seek | `328e093` |
| 4 | Dock, teclado, lotes, inspetor, consultas, sheets, tour, URL, persistência e paisagem | `0ca479f` |
| 5 | 16 lições M0–M6, glossário de 65 termos, cola e banco de 60 questões | `ab6a063` |
| 6 | Comparar, experimentos e Treinar com respostas estruturais calculadas pelo motor | `342990d` |
| 7 | PWA, acessibilidade, performance, 404, revisão didática, README e evidências | commit de acabamento na `main` |

Cada fase passou por typecheck, lint, test e build antes do commit/push. O workflow repete esses quatro checks no GitHub.

## Testes e fluxos

- **67 testes em 11 arquivos**, incluindo 200 sequências de 80 operações por tipo: 48.000 operações. Validação completa após cada operação; ordem, ponteiros e alturas conferidos em cada snapshot intermediário.
- Casos AVL e RN, espelhos, remoção em cascata, limites de rotações, CLRS, IDs, mensagens/pseudocódigo, codec, layout com NIL, conteúdo, geradores e controles.
- **4 E2E passaram**. A navegação cobre 10 rotas em cinco dimensões: 360×740, 393×852, 412×915, 430×932 e 915×412. Nas 50 navegações, não houve erro de JavaScript nem rolagem horizontal.
- **50 auditorias axe** cobriram as rotas e todas as 16 lições nos dois temas; os pontos encontrados foram corrigidos e retestados em 11 estados. Os relatórios originais preservam os achados; o relatório de reteste registra as correções. SVG exige revisão manual de contraste e equivalência textual; essa revisão não equivale a uma certificação de acessibilidade.

Fluxos exercitados: inserir 1 a 7 na AVL (raiz 4, altura 2), trocar para ABB mantendo a sequência (raiz 1, altura 6), voltar à AVL, inspecionar, buscar/remover, percursos, lote, seek, pan, pinça, zoom, seguir, Voltar fechando sheets, teclado físico/próprio, entradas inválidas e sessão completa de oito questões.

Os alvos dos nós selecionáveis no Treinar compensam a escala do SVG; o reteste mediu 50 px nos cinco formatos, sem violações axe ou erros, com resposta por toque funcionando. O toast mantém o player acessível. Espaço ativa controles nativos e funciona como atalho fora deles. As duas setas de preparação de rotação foram conferidas. MiniTree reproduz, pausa e avança passos. A tabela M5 e o gráfico M6 foram revisados; aos 31 nós, alturas crescente ABB/AVL/RN = 30/4/7 e aleatória com semente = 9/5/5.

## Produção, desempenho e offline

| Aferição | Resultado |
| --- | --- |
| Lighthouse mobile: desempenho / acessibilidade / boas práticas / SEO | **96 / 100 / 100 / 100** |
| LCP estimado pelo Lighthouse | **2,49 s** |
| FCP estimado / TBT / CLS no Lighthouse | 2,00 s / 51,5 ms / 0 |
| LCP observado com CDP: 1,6 Mbps, latência 150 ms, CPU 4× mais lenta | **0,78 s** |
| CLS observado com CDP | 0,000294 |
| JS inicial da Início, gzip | aproximadamente **156 KiB** |
| Requisições a serviços externos / erros de console no fluxo de produção | **0 / 0** |

O JS inicial considera os URLs únicos de `script[src]` e `link[rel=modulepreload]` no HTML original, sem contar prefetch ou a mesma entrada duas vezes. A meta de 170 kB foi atendida. Assets usam Brotli/gzip; o laboratório permanece em chunks sob demanda.

Lighthouse estima uma rede lenta a partir do trace; CDP aplica a restrição no navegador. **Esses resultados não são equivalentes. A meta LCP < 2 s não foi atingida no modelo do Lighthouse.**

No teste sintético de EventTiming com CPU 4× mais lenta, inserir um lote registrou 144 ms; trocar ABB/AVL, 160 ms; saltar ao fim de 20 inserções, **208 ms**. Isso não é INP de campo e não comprova a meta de INP < 200 ms para essa carga.

Service worker ativado e precache conferido. Quatro URLs com parâmetros funcionaram online após ativação; sete rotas abriram **offline**, incluindo Lab com sequência AVL, Comparar, Treinar, lição, módulos e glossário. Sem erro ou rolagem horizontal. O modo offline exige a primeira carga completa e a ativação do worker.

## Capturas

As imagens usam viewport de 412×915, salvo os nomes que indicam outra dimensão. Os resumos ABB/AVL terminam em 811 px e RN em 836 px, antes da tab bar em 851 px. O laboratório mantém canvas de pelo menos 280 px no mínimo suportado, inclusive com teclado aberto.

- [Início](screenshots/home-dark-412.png)
- [Lab no alvo](screenshots/lab-keyboard-dark-412x915.png), [mínimo](screenshots/lab-keyboard-dark-360x740.png) e [paisagem](screenshots/lab-keyboard-dark-915x412.png)
- [Tema claro](screenshots/lab-light-412.png) e [Rubro-Negra](screenshots/lab-rn-dark-412.png)
- [Tabela M5](screenshots/lesson-m5-table-412.png) e [experimento M6](screenshots/lesson-m6-height-ordered-412.png)
- [Cola RN](screenshots/cheat-rn-dark-412.png), [Comparar](screenshots/compare-dark-412.png) e [Treinar](screenshots/training-question-dark-412.png)

Relatórios brutos estão em `docs/reports/`; resultados e imagens são evidências desta execução, não garantias para qualquer aparelho.

## Limites e reprodução

Não foi possível testar POCO F7 físico, Xiaomi Browser, TalkBack, 120 Hz reais, safe-areas/gestos Android reais ou bateria. Não houve deployment na Vercel nem teste de atualização entre duas versões instaladas. A minimalidade global dos presets e o desempenho com históricos muito longos permanecem no [ROADMAP](../ROADMAP.md).

```sh
pnpm install --frozen-lockfile
pnpm typecheck && pnpm lint && pnpm test && pnpm build
pnpm test:e2e
PORT=3001 node .output/server/index.mjs
```

Em outro terminal, com Chromium instalado:

```sh
CHROME_PATH=/usr/bin/chromium pnpm exec lighthouse http://localhost:3001 \
  --chrome-flags="--headless --no-sandbox" --output=json --output-path=/tmp/treelab-lighthouse.json
```

Para repetir o offline: aguarde a ativação do service worker no painel Application do DevTools, ative Offline no painel Network e recarregue as rotas, incluindo URLs com sequência.

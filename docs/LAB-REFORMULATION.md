# Reformulação do laboratório — 2026-10-13

O fluxo principal é início → árvore vazia ou exemplo no passo zero → operações no motor local → snapshots narrados e diagrama. Não há API de dados, credenciais de aplicação ou migrações.

## Mudanças

- Foco em laboratório, comparação e uma breve explicação de complexidade. Rotas antigas de aprendizado e treino redirecionam ao início.
- Editor de sequência com alteração de chave/tipo, mover antes/depois, exclusão explícita e zerar com desfazer.
- Exemplos e links da comparação começam no passo zero; links compartilhados com cursor explícito preservam seu ponto.
- Sementes válidas atualizam imediatamente. Opções, seção do menu, semente e quantidade persistem localmente.
- Dock expansível por toque/arrasto, área de reprodução separada do slider, rótulo e háptico, proteção de área inferior e teclado compacto em paisagem.
- Arestas a 45°, intervalos de subárvores separados, alvos de nós proporcionais ao zoom e apenas um controle de enquadramento. Pinça e pan continuam disponíveis.
- Rotação com duas setas externas: filho sobe, pivô desce. Recoloração mostra cor anterior, próxima cor e justificativa do caso; Detalhes descreve mudanças efetivas e regras.
- Animações de páginas, painéis, botões, indicadores, nós, cores e arestas; respeito a movimento reduzido.

## Evidências

- `pnpm test`: 70 testes aprovados, incluindo oráculos dos três motores e geometria em sequências até 63 nós.
- `pnpm test:e2e`: 10 testes aprovados. Cobre edição/reordenação/exclusão, persistência, sementes, início de exemplos, narrativa e controles, além de rotas em cinco dimensões.
- `pnpm typecheck`, `pnpm lint` e `pnpm build`: aprovados.
- Capturas em `docs/screenshots/rework-*`: laboratório a 360×640, 393×680, 412×740 e 915×412; rotação, recoloração e Detalhes.

As dimensões são emulações Chromium. Não houve teste em um Xiaomi físico. Vibração depende do suporte do navegador. Árvores grandes usam enquadramento completo e podem exigir pinça para ler as chaves; profundidade é indicada nos nós porque arestas de comprimento variável não formam linhas horizontais uniformes.

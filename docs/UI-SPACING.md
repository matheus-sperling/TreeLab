# Revisão de espaçamentos e entrada

Rodada de 12/10/2026: campo mais largo, teclado próprio 4×4 e espaço preservado para a árvore. Abrir a entrada pausa o player; recolher restaura a narração e os controles no cursor atual.

## Antes e depois

| Área | Antes | Depois |
| --- | --- | --- |
| **Entrada** | Grade 3×5 e campo dividindo espaço com as ações. | Grade 4×4, campo em linha inteira, coluna de utilitários e margens laterais de 16 px. Buscar, Remover e Inserir têm uma linha própria. |
| **Edição** | Teclado, narração e player disputavam a altura. | Abrir o teclado próprio pausa e cancela repetição de passos. Narração/player ficam recolhidos durante a edição e retornam ao fechar. |
| **Paisagem** | As ações exigiam rolar o painel com teclado aberto. | Na edição com altura inferior a 500 px, faixa de operações e cabeçalho da entrada ficam ocultos; padding compacto preserva teclas de 48 px. A faixa retorna ao recolher. |
| **Início** | Atalhos juntos e títulos com pouco espaço. | Cards agrupam descrição, progresso e atalhos; links têm linhas de 48 px e intervalo de 8 px. Títulos podem quebrar sem corte. |
| **MiniTree** | Link isolado por quebra automática e espaço excessivo entre narração e legenda. | Três controles de 48×48 px e contador na mesma linha; link em linha inteira de 48 px. Controles passam de 120 para 112 px; narração/legenda usam 8–12 px. |
| **Tabela M5** | Palavras quebravam no meio em 360 px com texto aumentado. | Rolagem local focável, largura acompanhando a escala do texto e título fixo. Dados e cabeçalhos permanecem acessíveis, sem rolagem horizontal da página. |
| **Glossário** | Foco do input ultrapassava a superfície do campo. | Contorno interno, offset de −2 px e raio de 8 px; agrupamento dos termos relacionados preservado. |
| **Menu** | Seções comprimidas na navegação horizontal. | Grade de três colunas no retrato e seis em telas maiores/paisagem, com alvos de 48 px e itens de 56 px. |
| **Detalhes** | Rolagem do conteúdo deslocava os controles. | Player e abas permanecem acessíveis; Explicação, Código e Custo rolam internamente. |
| **Inspetor** | Vizinhos e ações disputavam largura. | Métricas em duas colunas; predecessor/sucessor em linha inteira; três ações com alvos de 48 px. |
| **Comparar** | Diagrama próximo ao cabeçalho e às métricas; scrubber pequeno. | Margem vertical de 8 px para o diagrama; scrubber e controles de 48 px. |
| **Treinar** | Trocar de questão podia deixar o enunciado fora da área visível. | Começar, Próxima questão e Nova sessão levam foco ao enunciado e mantêm o progresso visível. |

## Teclado e foco

Os números ficam em linhas `1 2 3`, `4 5 6`, `7 8 9`; a última contém sinal, zero e separador. A coluna de utilitários contém Apagar, Limpar, Aleatório e Recolher. No modo canhoto, essa coluna vai para a esquerda e as ações finais espelham a ordem.

**Aleatório acrescenta** um valor de 1 a 99, preservando a lista e excluindo chaves da árvore e valores já digitados. Desabilita ao atingir 20 valores ou esgotar opções. Apagar remove um caractere; segurar ou usar Limpar esvazia o campo. **Escape** recolhe e devolve foco a Reproduzir, ou a Inserir quando a reprodução está indisponível.

As ações mantêm 48 px e gap de 8 px. As teclas têm mínimo de 48 px; abaixo de 380 px, conservam a exceção de 44 px para telas menores. Na edição em paisagem, o dock usa padding superior de 0 px, o compositor começa com 4 px e as teclas usam padding interno de 2 px.

## Medições e validação

Medições de retrato no Chromium emulado, com tema escuro e texto padrão:

| Viewport | Canvas com teclado | Largura do campo | Fim das ações | Espaço inferior |
| --- | ---: | ---: | ---: | ---: |
| 360×740 | 302 px | 328 px | y = 724 px | 16 px |
| 412×915 | 420 px | 380 px | y = 895 px | 20 px |

O campo mede 50 px, incluindo bordas, com 16 px de margem em cada lateral. Esses valores usam safe-area emulada igual a zero; o CSS conserva os insets do navegador. A Cola padrão continua cabendo em 412×915; texto aumentado e telas menores permitem rolagem para preservar a leitura.

Em **915×412**, no tema claro com modo canhoto e texto de 125%, canvas e dock medem **356 px** de altura. As teclas mantêm **48 px** e as ações terminam em **y = 392,5 px**, deixando **19,5 px** livres. A edição cabe sem rolagem; o painel de reprodução em paisagem continua rolável.

- **69 testes Vitest e 5 E2E aprovados**, além de typecheck, lint e build.
- Cinco dimensões: **360×740, 393×852, 412×915, 430×932 e 915×412**; temas claro/escuro, texto de 125% e modo canhoto incluídos na revisão.
- Auditoria axe em **20 estados**, nos dois temas com texto de **125%**: **zero violações e zero rolagem horizontal da página**.
- Retestes de entrada, conteúdo, comparação e treino registram ausência de erros de JavaScript e de rolagem horizontal da página nos cenários exercitados. A tabela M5 mantém rolagem local intencional.

Os resultados de geometria, retorno dos controles e axe estão em [reports/ui-spacing.json](reports/ui-spacing.json). A validação usa navegador com viewport e toque emulados. A fluidez física a 120 Hz e os gestos do HyperOS ainda precisam de verificação no POCO F7.

## Capturas e reprodução

- [Teclado em 412×915](screenshots/ui-keyboard-412.png)
- [Teclado em 360×740](screenshots/ui-keyboard-360.png)
- [Teclado em paisagem](screenshots/ui-keyboard-landscape.png)
- [Início com texto de 125%](screenshots/ui-home-125.png)

Medições, capturas antes/depois e scripts auxiliares da sessão ficam em `/workspace/scratch/spacing-{keyboard,home,content,lab,qa}`. Os JSONs `measurements.json`, `after-metrics.json` e `retest.json` registram geometria, foco e erros; os scripts disponíveis nesses diretórios refletem a configuração local de Chromium.

Para repetir os checks: `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm build` e `pnpm test:e2e`. Instalação e execução estão no [README](../README.md).

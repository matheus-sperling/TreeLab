# Decisões

- Base: versões estáveis consultadas em `npm view` em 12/10/2026, fixadas no manifest e lockfile. Node 24 LTS e pnpm 11.
- Fontes: Inter e JetBrains Mono empacotadas localmente via Fontsource, com `@nuxt/fonts` limitado ao provedor local. Nenhuma CDN é necessária em runtime.
- Renderização: conteúdo pré-renderizado; laboratório, comparação e treino são rotas cliente independentes. Sem backend ou variáveis de ambiente.
- TypeScript 7.0.2: `vue-tsc` 3.3.13 falha em `lib/tsc` e typescript-eslint declara incompatibilidade. Fixamos 6.0.3 (última 6.x estável consultada); strict permanece ligado.
- PWA: a dependência efetivamente resolvida é `vite-plugin-pwa` 1.3.0, cujos peers incluem Vite 8. Mantivemos Nuxt 4.6.1/Vite 8.3.4; não foi necessário o fallback 4.4.x.
- Rotação AVL: os contadores medem primitivas; uma dupla custa 2. O limite de uma inserção é um evento de rebalanceamento simples ou duplo, conforme o domínio.
- Snapshots: congelados em runtime e readonly em TypeScript. O layout tidy por contornos passou nos testes de separação, lado, determinismo e espelho.
- Celulares menores: entrada inválida recolhe o teclado para mostrar a correção sem cortar o canvas. A câmera reserva 64 px no topo e 80 px à direita/base para métricas e controles com alvos de 48 px.
- Gestos e acessibilidade: botões frequentes têm alvos de 48 px; player e teclas de 44 px abaixo de 380 px seguem as exceções explícitas do briefing. Links dentro de parágrafos conservam o fluxo de leitura.
- Animação do dock: Motion usa FLIP por transform para acompanhar a mudança de tamanho; não interpolamos height/width. Seek e movimento reduzido conservam a ordem dos passos.
- Deploy: entregue pronto para importar na Vercel. A publicação de um deployment Vercel não foi solicitada; o repositório mantém sua visibilidade original privada.
- Acessibilidade do canvas: SVG mantém `role="img"`; botões HTML irmãos compartilham MotionValues e oferecem teclado e alvos de 48 px sem descendentes interativos dentro da imagem.
- Contraste: `border-strong` ajustado para #6B7384 no escuro e #747F91 no claro. Arestas e contornos essenciais atingem pelo menos 3:1 contra o fundo e o preenchimento dos nós.
- Offline: o precache ignora parâmetros de estado (`t/q/c`, treino e módulos). O fallback usa o shell SPA do laboratório para a URL real determinar a rota, sem devolver a Início em links de experimentos.
- Notificações: no laboratório, aparece uma por vez acima do dock, cuja altura é medida após montar. O player permanece acessível durante a reprodução e o aviso oferece Desfazer e dispensar.
- Presets: a busca RN minimiza inserções e operações dentro da família enumerada (inserções seguidas de até duas remoções). A redução AVL conserva o caso sem inserções individualmente dispensáveis; minimalidade global fica para verificação futura.
- Performance: Nitro gera Brotli/gzip para os assets públicos. Links antecipam chunks somente na interação, evitando que a Início carregue as rotas interativas por visibilidade; fontes locais usam cache de um ano.
- Fontes críticas: somente Inter recebe preload de alta prioridade; Mono carrega quando o CSS a utiliza. O skeleton SPA usa os mesmos tokens do tema escolhido antes da hidratação.
- Medidas: tab bar de 64 px e AppBar de até 56 px preservam alvos de 48 px e respiro; no mínimo de 360 px, a AppBar usa 48 px. São adaptações das medidas de referência do briefing.
- Treinar: a área invisível de toque dos nós compensa a escala do SVG e mantém 50 px nas cinco dimensões. O círculo visível permanece com raio 20 no diagrama; alternativas textuais continuam disponíveis.

- Teclado próprio: a revisão mudou a grade original 3×5 para 4×4, com coluna de utilitários e campo em linha inteira. A disposição facilita ler listas e evita teclas estreitas no mínimo de 360 px.
- Modo de edição: abrir a entrada própria pausa o player e oculta narração/player até recolher o teclado. A escolha mantém o canvas com pelo menos 280 px no retrato, sem alterar a sequência ou o cursor.
- Edição em paisagem: com altura inferior a 500 px, a faixa de operações e o cabeçalho da entrada ficam temporariamente ocultos, com padding compacto. Ao recolher, a faixa e os controles de reprodução retornam; as teclas mantêm 48 px.
- Margens do dock: a revisão fixou 16 px em cada lateral, incluindo a entrada e as ações, para respeitar a área de gestos do Android. As larguras úteis do campo ficam em 328 px no viewport de 360 e 380 px no de 412.

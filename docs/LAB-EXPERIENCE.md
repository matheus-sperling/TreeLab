# Experiência do laboratório

O fluxo começa com uma árvore vazia ou um exemplo no passo zero. Operações geram snapshots no motor local; o diagrama e a explicação mostram a mesma etapa.

- Início mantém a identidade visual do TreeLab e oferece criação, continuação e três exemplos. Conceitos de ordem, altura, rotações e cores ficam acessíveis no laboratório. Comparar integra a navegação; o treino foi retirado.
- Editor dedicado permite alterar qualquer tipo/chave, mover, apagar e adicionar operações. Entrada inválida não substitui o valor válido anterior. Operações sem efeito mostram o motivo. Limpar tudo oferece Desfazer.
- Menu reúne exemplos, exploração e opções. Semente e quantidade válidas atualizam a geração imediatamente. Preferências e seção aberta persistem; fechar pelo botão ou voltar do navegador conserva a sequência atual.
- Controles do diagrama ocupam uma faixa própria; há um único enquadramento. Pan e pinça permanecem. O dock recolhe/expande por toque ou arrasto. Slider e reprodução têm áreas distintas; há rótulo e resposta tátil quando suportada.
- Todas as arestas são a 45°. O layout separa os contornos ocupados e reserva espaço para as anotações ativadas. R/N e indicadores ficam dentro ou abaixo dos nós. A câmera usa os limites já calculados sem duplicar o espaço das ferramentas.
- Giros e cores têm ação curta e motivo. Detalhes usa chaves, cores e alturas reais, incluindo o diagnóstico antes da mudança, a alteração e a regra preservada. Recoloração mostra a cor anterior e a próxima. Notificações são suspensas enquanto um painel estiver aberto.
- Passos manuais também animam. Movimento reduzido respeita o dispositivo e a configuração local.

## Verificação

89 testes de unidade/componentes aprovados. Os testes de geometria incluem até 63 nós nas três estruturas, cadeias e zigue-zagues, cruzamentos, anotações opcionais, espelho e NILs. Os testes de explicação comparam as cores anteriores com o snapshot real.

12 testes de navegador aprovados. Incluem criação, edição/reordenação/exclusão, Desfazer, exemplos, conceitos, sementes imediatas, persistência ao fechar/voltar/recarregar, teclado próprio e do aparelho, slider e dock.

Capturas `docs/screenshots/redo-*` foram revisadas em 320×640, 360×640, 393×680, 412×915, 915×412 e 1366×900. A validação é em Chromium emulado; não houve teste em Xiaomi físico. A vibração depende do suporte do navegador.

Tipos, lint e build de produção foram verificados. As capturas mostram a apresentação e os fluxos, e não substituem o teste no aparelho físico.

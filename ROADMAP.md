# Verificações pendentes

O app, o motor e o conteúdo da v1 estão implementados. As próximas prioridades tratam de limites que não puderam ser comprovados neste ambiente.

1. **Margem de LCP:** reduzir o LCP estimado pelo Lighthouse de 2,49 s para menos de 2 s. O score mobile atingiu 96 e o LCP observado com CDP/4G ficou abaixo de 1 s; os dois métodos não são equivalentes.
2. **POCO F7 físico:** repetir os fluxos em Chrome e Xiaomi Browser, instalado e em aba. Conferir 120 Hz, TalkBack, teclado do sistema, gestos de voltar, safe-areas e consumo de bateria.
3. **Históricos longos:** medir tempo e memória com milhares de operações mantendo até 63 nós. Cada passo guarda um snapshot; avaliar checkpoints se necessário. O decoder limita links a 6.000 caracteres; conferir a experiência ao exceder esse tamanho.
4. **Presets mínimos:** ampliar a busca para inserções/remoções intercaladas e comprovar minimalidade global, especialmente na cascata AVL. A busca atual minimiza dentro da família enumerada; a redução AVL remove inserções individualmente dispensáveis.
5. **Vercel e atualização PWA:** importar o repositório, repetir as medições na URL hospedada e testar uma atualização entre duas versões instaladas. O build local e a navegação offline já foram verificados, mas não houve publicação na Vercel.
6. **Interação:** investigar o pico de 208 ms de EventTiming ao saltar um lote de 20 inserções com CPU 4× mais lenta, e medir INP em sessões no aparelho. Esse teste sintético não equivale a INP de campo. Conferir também armazenamento restrito ou removido pelo navegador.

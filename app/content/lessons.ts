export type ContentTreeType = 'bst' | 'avl' | 'rb'
export interface ContentOp { t: 'i' | 'd' | 's'; k: number }
export interface QuickCheck {
  id: string
  prompt: string
  options: readonly string[]
  answer: number
  explanation: string
}
export interface ComplexityEntry {
  label: string
  best: string
  average: string
  worst: string
  space: string
  note: string
}
export type LessonBlock =
  | { type: 'heading'; id: string; text: string }
  | { type: 'paragraph'; text: string }
  | { type: 'callout'; tone: 'key' | 'caution'; title: string; text: string }
  | { type: 'complexity'; title: string; entries: readonly ComplexityEntry[] }
  | { type: 'miniTree'; treeType: ContentTreeType; ops: ContentOp[]; caption: string }
  | { type: 'quickCheck'; questions: readonly QuickCheck[] }
export interface Lesson {
  slug: string
  moduleId: string
  title: string
  summary: string
  type: ContentTreeType
  readingMinutes: number
  tldr: readonly [string, string, string]
  blocks: LessonBlock[]
  pitfalls: readonly string[]
  nextSlug?: string
}
export interface LearningModule {
  id: string
  number: string
  title: string
  summary: string
  icon: string
}

export const modules: LearningModule[] = [
  { id: 'm0', number: '00', title: 'Comece pela raiz', summary: 'Nós, altura e maneiras de percorrer uma árvore.', icon: 'sprout' },
  { id: 'm1', number: '01', title: 'Árvore Binária de Busca', summary: 'Uma regra de ordem. Três casos de remoção.', icon: 'network' },
  { id: 'm2', number: '02', title: 'Por que balancear?', summary: 'Altura determina o trabalho. Rotações mudam a forma.', icon: 'move-horizontal' },
  { id: 'm3', number: '03', title: 'AVL, equilíbrio local', summary: 'Fator de balanceamento e os quatro casos.', icon: 'scale' },
  { id: 'm4', number: '04', title: 'Rubro-Negra', summary: 'Cor, altura negra e conserto passo a passo.', icon: 'circle-dot' },
  { id: 'm5', number: '05', title: 'Escolha com critério', summary: 'Compare garantias, memória e atualizações.', icon: 'columns-3' },
  { id: 'm6', number: '06', title: 'Complexidade na prática', summary: 'Entenda O, Ω e Θ com um experimento.', icon: 'chart-no-axes-combined' },
]

const h = (id: string, text: string): LessonBlock => ({ type: 'heading', id, text })
const p = (text: string): LessonBlock => ({ type: 'paragraph', text })
const key = (text: string): LessonBlock => ({ type: 'callout', tone: 'key', title: 'Ideia-chave', text })
const caution = (text: string): LessonBlock => ({ type: 'callout', tone: 'caution', title: 'Cuidado', text })
const insert = (...keys: number[]): ContentOp[] => keys.map(k => ({ t: 'i', k }))
const mini = (treeType: ContentTreeType, ops: ContentOp[], caption: string): LessonBlock => ({ type: 'miniTree', treeType, ops, caption })
const checks = (...questions: QuickCheck[]): LessonBlock => ({ type: 'quickCheck', questions })
const check = (id: string, prompt: string, options: string[], answer: number, explanation: string): QuickCheck => ({ id, prompt, options, answer, explanation })
const complexity = (title: string, ...entries: ComplexityEntry[]): LessonBlock => ({ type: 'complexity', title, entries })
const entry = (label: string, best: string, average: string, worst: string, space: string, note: string): ComplexityEntry => ({ label, best, average, worst, space, note })
const bstCost = entry('Busca na ABB', 'O(1)', 'O(log n)*', 'O(n)', 'O(n)', '*Em árvores formadas por inserções em ordem aleatória. O trabalho é Θ(h).')
const avlCost = entry('Busca na AVL', 'O(1)', 'O(log n)', 'O(log n)', 'O(n)', 'A AVL garante altura logarítmica; cada nó guarda altura ou FB.')
const rbCost = entry('Busca na RN', 'O(1)', 'O(log n)', 'O(log n)', 'O(n)', 'A RN garante altura logarítmica; cada nó precisa de um bit de cor.')
const traversalCost = entry('Percorrer todos os nós', 'Θ(n)', 'Θ(n)', 'Θ(n)', 'O(n)', 'Espaço auxiliar: pilha O(h), ou fila O(largura) no percurso em nível.')
const rotationCost = entry('Uma rotação', 'O(1)', 'O(1)', 'O(1)', 'O(1) auxiliar', 'Muda uma quantidade constante de ponteiros. Não percorre toda a subárvore.')

export const lessons: Lesson[] = [
  {
    slug: 'nos-raiz-e-subarvores', moduleId: 'm0', title: 'Nós, raiz e subárvores',
    summary: 'Aprenda a ler o diagrama antes de pensar no algoritmo.', type: 'bst', readingMinutes: 4,
    tldr: ['Cada nó tem até dois filhos.', 'A raiz tem profundidade 0 e não tem pai.', 'Uma subárvore começa em um nó e inclui seus descendentes.'],
    blocks: [
      h('anatomia', 'Uma árvore, peça por peça'),
      p('Um **nó** guarda uma chave. Uma **aresta** liga o pai a um filho. Em uma árvore binária, distinguimos filho esquerdo e filho direito; cada nó tem até dois filhos.'),
      p('A **raiz** é o ponto de partida. Uma **folha** não tem filhos. Um nó sem filho esquerdo pode ter filho direito, e vice-versa: a posição importa.'),
      mini('bst', insert(40, 20, 60, 10, 30), 'A raiz é 40. Os nós 10, 30 e 60 são folhas.'),
      h('relacoes', 'Relações entre os nós'),
      p('Os **ancestrais** de um nó ficam no caminho entre ele e a raiz. Seus **descendentes** estão abaixo dele. Dois nós com o mesmo pai são irmãos.'),
      p('Uma **subárvore** contém um nó e todos os seus descendentes. A subárvore esquerda de 40 começa em 20; ela contém 20, 10 e 30.'),
      key('Esquerda e direita fazem parte da estrutura. Um filho único nunca precisa ficar centralizado embaixo do pai.'),
      complexity('Custo de visitar a estrutura', traversalCost),
      checks(
        check('m0-nodes-1', 'Qual é a profundidade da raiz?', ['−1', '0', '1'], 1, 'A profundidade conta as arestas a partir da raiz. O caminho da raiz até ela mesma tem 0 arestas.'),
        check('m0-nodes-2', 'O que uma subárvore contém?', ['Só os filhos imediatos', 'Um nó e todos os seus descendentes', 'Todos os ancestrais do nó'], 1, 'O nó escolhido é a raiz da subárvore; todos os descendentes pertencem a ela.'),
      ),
    ],
    pitfalls: ['Não confunda árvore binária com ABB: ter até dois filhos não garante a ordem das chaves.', 'Um nó pode ter apenas o filho direito.'],
  },
  {
    slug: 'altura-e-profundidade', moduleId: 'm0', title: 'Altura não é profundidade',
    summary: 'Conte arestas, sem mudar de convenção no meio do caminho.', type: 'bst', readingMinutes: 4,
    tldr: ['Altura olha para baixo; profundidade olha para a raiz.', 'Folha tem altura 0; árvore vazia tem altura −1.', 'A altura de um nó é 1 + a maior altura entre seus filhos.'],
    blocks: [
      h('duas-medidas', 'Duas perguntas diferentes'),
      p('A **profundidade** conta as arestas da raiz até o nó. A raiz tem profundidade 0, seus filhos têm profundidade 1 e assim por diante.'),
      p('A **altura** conta as arestas do nó até a folha mais distante abaixo dele. A altura da árvore é a altura da raiz. No TreeLab, altura do vazio é **−1** e altura de uma folha é **0**.'),
      key('h(x) = 1 + max(h(esquerda), h(direita)). Como h(nulo) = −1, uma folha tem h = 0.'),
      mini('bst', insert(40, 20, 60, 10), '40 tem altura 2. O nó 20 tem altura 1 e profundidade 1.'),
      h('altura-custo', 'A altura limita a descida'),
      p('Busca, inserção e remoção seguem caminhos pela árvore. Uma árvore baixa reduz o número de níveis que esses caminhos podem atravessar.'),
      caution('Contar nós em vez de arestas aumenta todas as alturas em 1. Use a mesma convenção em cálculos, diagramas e respostas.'),
      complexity('Busca: a forma faz diferença', bstCost, avlCost, rbCost),
      checks(
        check('m0-height-1', 'Qual é a altura de uma árvore com só a raiz?', ['−1', '0', '1'], 1, 'A raiz também é uma folha. Não há aresta entre ela e a folha mais distante: altura 0.'),
        check('m0-height-2', 'Qual é a altura de uma lista de 7 nós?', ['6', '7', '3'], 0, 'O caminho da raiz até o último nó tem 6 arestas: h = n − 1.'),
      ),
    ],
    pitfalls: ['Altura e profundidade só coincidem por acaso em alguns nós.', 'O nó nulo tem altura −1; ele não é uma folha interna da árvore.'],
  },
  {
    slug: 'quatro-percursos', moduleId: 'm0', title: 'Quatro maneiras de percorrer',
    summary: 'A árvore é a mesma. A ordem de visita muda.', type: 'bst', readingMinutes: 5,
    tldr: ['Pré-ordem: nó, esquerda, direita.', 'In-ordem: esquerda, nó, direita; numa ABB, sai em ordem crescente.', 'Pós-ordem termina no nó; nível usa uma fila.'],
    blocks: [
      h('profundidade', 'Três percursos em profundidade'),
      p('Em **pré-ordem**, visite o nó, depois a subárvore esquerda e depois a direita. Em **in-ordem**, visite a esquerda, o nó e a direita. Em **pós-ordem**, visite esquerda, direita e por último o nó.'),
      mini('bst', insert(40, 20, 60, 10, 30, 50, 70), 'In-ordem: 10, 20, 30, 40, 50, 60, 70. Pré-ordem começa em 40.'),
      h('nivel', 'Em nível: perto da raiz primeiro'),
      p('O percurso **em nível** visita a raiz, depois seus filhos, depois os netos. Uma fila mantém os próximos nós na ordem certa.'),
      p('No exemplo, a saída em nível é 40, 20, 60, 10, 30, 50, 70. Na pós-ordem, 40 aparece por último.'),
      key('Todo percurso completo visita cada nó uma vez: tempo Θ(n), qualquer que seja a forma da árvore.'),
      complexity('Todos os percursos', traversalCost),
      checks(
        check('m0-traversal-1', 'Qual percurso de uma ABB produz chaves em ordem crescente?', ['Pré-ordem', 'In-ordem', 'Em nível'], 1, 'A regra esquerda < nó < direita faz a in-ordem produzir ordem crescente.'),
        check('m0-traversal-2', 'Qual é o espaço auxiliar do percurso em nível?', ['O(1) sempre', 'O(largura)', 'O(log n) sempre'], 1, 'A fila guarda os nós da fronteira do percurso. Seu tamanho depende da largura da árvore.'),
      ),
    ],
    pitfalls: ['In-ordem só garante ordem crescente se a propriedade de ABB valer.', 'Θ(n) de tempo não significa O(1) de memória auxiliar.'],
  },
  {
    slug: 'abb-busca-e-insercao', moduleId: 'm1', title: 'ABB: uma regra para decidir',
    summary: 'Compare, escolha um lado e repita.', type: 'bst', readingMinutes: 5,
    tldr: ['Todas as chaves da esquerda são menores; todas as da direita são maiores.', 'Busca compara uma chave por nó visitado.', 'Inserção cria uma folha; duplicatas não alteram a árvore.'],
    blocks: [
      h('regra-global', 'A regra vale para a subárvore inteira'),
      p('Em uma **Árvore Binária de Busca (ABB)**, toda chave da subárvore esquerda é menor que a chave do nó; toda chave da direita é maior. As chaves do TreeLab são inteiras e distintas.'),
      p('Não basta comparar um nó com seus filhos imediatos. A regra precisa valer também para os netos e todos os demais descendentes.'),
      h('busca', 'Busque eliminando um lado'),
      p('Comece na raiz. Se a chave procurada for igual, a busca terminou. Se for menor, desça à esquerda; se for maior, desça à direita. Chegar ao vazio significa que a chave não existe.'),
      mini('bst', [...insert(40, 20, 60, 10, 30), { t: 's', k: 30 }], 'Para buscar 30: compare com 40, depois 20, depois 30.'),
      h('insercao', 'Insira no lugar vazio'),
      p('A inserção faz a mesma descida. Ao encontrar um filho vazio, cria ali uma folha. Se encontrar uma chave igual, explica a duplicata e mantém a árvore.'),
      key('A descida é a mesma ideia em ABB, AVL e RN. O balanceamento acontece depois.'),
      complexity('Busca, inserção e remoção na ABB', entry('Uma operação', 'O(1)', 'O(log n)*', 'O(n)', 'O(n)', 'Custo Θ(h). *Médio para inserções em ordem aleatória; a ABB não garante altura.')),
      checks(
        check('m1-insert-1', 'Onde uma inserção na ABB cria o novo nó?', ['Sempre na raiz', 'Como uma folha', 'No nó de maior altura'], 1, 'A busca encontra um ponteiro de filho vazio. O nó nasce ali como folha.'),
        check('m1-insert-2', 'O que inserir uma chave já existente faz no TreeLab?', ['Cria outra cópia', 'Substitui a raiz', 'Mantém a árvore e explica a duplicata'], 2, 'As chaves são distintas. Uma duplicata é uma operação sem efeito.'),
      ),
    ],
    pitfalls: ['Verificar só pai e filhos não valida a ordem global da ABB.', 'Inserir na ABB não garante uma árvore baixa.'],
  },
  {
    slug: 'abb-remocao', moduleId: 'm1', title: 'Remoção: três casos, uma ordem',
    summary: 'Folha, um filho ou dois filhos: escolha o transplante certo.', type: 'bst', readingMinutes: 6,
    tldr: ['Folha: desconecte o nó.', 'Um filho: o filho assume o lugar.', 'Dois filhos: mova o sucessor in-ordem por transplante.'],
    blocks: [
      h('simples', 'Sem filho ou com um filho'),
      p('Para remover uma **folha**, substitua o vínculo do pai por vazio. Se o nó tem **um filho**, esse filho toma o lugar dele; se o removido era a raiz, o filho vira raiz.'),
      h('dois-filhos', 'Com dois filhos, encontre o sucessor'),
      p('O **sucessor in-ordem** é o mínimo da subárvore direita. Ele não tem filho esquerdo. No TreeLab, movemos esse nó inteiro: seu identificador permanece o mesmo.'),
      mini('bst', [...insert(40, 20, 70, 10, 30, 50, 80, 60), { t: 'd', k: 40 }], '50 sucede 40. Primeiro 60 ocupa o antigo lugar de 50; depois 50 assume o lugar de 40.'),
      h('transplante', 'Duas posições possíveis para o sucessor'),
      p('Se o sucessor é o **filho direito direto** do removido, ele assume o lugar e herda a subárvore esquerda. Seu filho direito continua onde estava.'),
      p('Se fica **mais fundo**, substitua o sucessor pelo seu filho direito no lugar original. Depois transplante o sucessor para o lugar do removido, herdando as duas subárvores dele.'),
      key('Mova o sucessor, sem trocar as chaves. Assim a animação mantém a identidade de cada nó.'),
      caution('Uma chave inexistente apenas produz uma descida e uma explicação. A árvore permanece igual.'),
      complexity('Remoção na ABB', entry('Encontrar e remover', 'O(1)', 'O(log n)*', 'O(n)', 'O(n)', 'O caminho até o nó e o sucessor cabe em Θ(h). *Sob ordem aleatória de inserção.')),
      checks(
        check('m1-delete-1', 'Quem ocupa o lugar de um nó com dois filhos?', ['Seu pai', 'O máximo da árvore toda', 'O mínimo da subárvore direita'], 2, 'Esse mínimo é o sucessor in-ordem: a próxima chave na ordem crescente.'),
        check('m1-delete-2', 'O sucessor escolhido pode ter filho esquerdo?', ['Sim, sempre', 'Não', 'Só se for a raiz'], 1, 'Se tivesse filho esquerdo, haveria uma chave menor na mesma subárvore; ele não seria o mínimo.'),
      ),
    ],
    pitfalls: ['O sucessor pode ter filho direito. Recoloque esse filho no lugar original do sucessor.', 'Transplantar exige atualizar pai, filhos e, quando necessário, a raiz.'],
  },
  {
    slug: 'abb-consultas-e-degeneracao', moduleId: 'm1', title: 'Extremos, vizinhos e a pior forma',
    summary: 'Use a ordem da ABB e descubra seu limite.', type: 'bst', readingMinutes: 5,
    tldr: ['Mínimo segue para a esquerda; máximo segue para a direita.', 'Sucessor e predecessor são os vizinhos na in-ordem.', 'Entrada ordenada pode transformar a ABB em uma lista.'],
    blocks: [
      h('extremos', 'Mínimo e máximo'),
      p('Para obter o **mínimo**, desça à esquerda até não haver mais filho esquerdo. Para o **máximo**, faça o mesmo à direita.'),
      h('vizinhos', 'O próximo e o anterior'),
      p('O **sucessor** é a menor chave maior que a atual. Se há subárvore direita, é o mínimo dela; caso contrário, suba até o primeiro ancestral cujo caminho veio da esquerda.'),
      p('O **predecessor** é a maior chave menor que a atual. A regra é espelhada: máximo da subárvore esquerda, ou primeiro ancestral cujo caminho veio da direita. Um extremo pode não ter vizinho.'),
      h('lista', 'A ordem de entrada muda a forma'),
      mini('bst', insert(1, 2, 3, 4, 5, 6, 7), 'Inserir 1 a 7 em ordem cria uma lista com altura 6 na ABB.'),
      p('A ABB não reorganiza a árvore para reduzir altura. Com n chaves em ordem crescente ou decrescente, a altura chega a **n − 1**.'),
      key('Com inserções em ordem aleatória, a profundidade média é aproximadamente 1,39 · log₂ n. Isso é uma média, não uma garantia.'),
      complexity('Consultas que seguem caminhos', bstCost, avlCost, rbCost),
      checks(
        check('m1-query-1', 'Como encontrar o mínimo de uma ABB não vazia?', ['Descer sempre à esquerda', 'Descer sempre à direita', 'Escolher a raiz'], 0, 'Todas as chaves menores ficam à esquerda. O último nó desse caminho é o mínimo.'),
        check('m1-query-2', 'Inserir 1, 2, 3, 4 e 5 em uma ABB vazia produz qual altura?', ['2', '4', '5'], 1, 'A entrada crescente cria uma lista de 5 nós, com 4 arestas da raiz até a última folha.'),
      ),
    ],
    pitfalls: ['Média logarítmica não protege uma ABB de uma entrada ordenada.', 'O maior nó não tem sucessor; o menor não tem predecessor.'],
  },
  {
    slug: 'rotacoes-preservam-a-ordem', moduleId: 'm2', title: 'Rotacionar sem perder a ordem',
    summary: 'Uma rotação muda a forma, preservando a in-ordem.', type: 'avl', readingMinutes: 5,
    tldr: ['Uma árvore baixa encurta os caminhos.', 'A rotação promove um filho e reorganiza poucos ponteiros.', 'A subárvore do meio troca de pai, mas a in-ordem permanece igual.'],
    blocks: [
      h('por-que', 'A forma custa tempo'),
      p('ABB, AVL e RN seguem a mesma regra de ordem. A diferença é a garantia de altura: a ABB pode virar lista; AVL e RN consertam a forma depois das atualizações.'),
      h('direita', 'Rotação à direita'),
      p('Considere um pivô z e seu filho esquerdo y. Na rotação à direita, **y sobe**, z passa a ser filho direito de y, e a antiga subárvore direita de y passa a ser esquerda de z.'),
      h('esquerda', 'Rotação à esquerda'),
      p('O movimento é espelhado. O filho direito y sobe, o pivô z vira filho esquerdo de y, e a antiga subárvore esquerda de y passa a ser direita de z.'),
      mini('avl', insert(30, 20, 10), 'Veja o caso LL: 20 sobe com uma rotação à direita em 30.'),
      key('A rotação custa O(1) e preserva a sequência in-ordem. Chaves não mudam; nós mudam de posição.'),
      h('quatro-momentos', 'Observe quatro momentos'),
      p('No laboratório, diagnóstico explica o problema, preparo destaca pivô e filho, movimento muda os vínculos, e atualização apresenta as novas alturas. Avance um passo por vez.'),
      complexity('Custo da transformação local', rotationCost),
      checks(
        check('m2-rotation-1', 'O que uma rotação preserva?', ['A raiz sempre', 'A sequência in-ordem', 'A altura de cada nó'], 1, 'A forma muda, mas as relações de ordem entre as chaves permanecem.'),
        check('m2-rotation-2', 'Na rotação à direita, qual nó sobe?', ['O filho esquerdo do pivô', 'O filho direito do pivô', 'O pai do pivô'], 0, 'O filho esquerdo sobe; o pivô passa a ser seu filho direito.'),
      ),
    ],
    pitfalls: ['Esquecer a subárvore do meio quebra a estrutura e pode perder nós.', 'Direção da rotação indica o movimento do pivô, não o lado em que o desequilíbrio surgiu.'],
  },
  {
    slug: 'avl-fb-e-quatro-casos', moduleId: 'm3', title: 'AVL: leia o fator de balanceamento',
    summary: 'Quatro casos explicam como recuperar o equilíbrio.', type: 'avl', readingMinutes: 6,
    tldr: ['FB = altura(esquerda) − altura(direita).', 'Uma AVL válida tem FB −1, 0 ou +1 em todos os nós.', 'LL e RR usam rotação simples; LR e RL usam duas rotações.'],
    blocks: [
      h('fb', 'O sinal aponta o lado mais alto'),
      p('O **fator de balanceamento (FB)** é h(esquerda) − h(direita). Positivo: esquerda mais alta. Negativo: direita mais alta. Zero: alturas iguais.'),
      p('O invariante AVL exige **|FB| ≤ 1** em todo nó. Quando surge +2 ou −2, encontramos o ancestral desbalanceado z, seu filho mais alto y e o filho mais alto de y.'),
      h('casos-simples', 'LL e RR'),
      p('**LL:** FB(z) = +2 e FB(y) ≥ 0. A solução é uma rotação à direita em z. **RR:** FB(z) = −2 e FB(y) ≤ 0. A solução é uma rotação à esquerda em z.'),
      mini('avl', insert(30, 20, 10), 'LL: 30 tem FB +2. A rotação à direita promove 20.'),
      h('casos-duplos', 'LR e RL'),
      p('**LR:** FB(z) = +2 e FB(y) = −1. Rotacione à esquerda em y, depois à direita em z. **RL:** FB(z) = −2 e FB(y) = +1. Rotacione à direita em y, depois à esquerda em z.'),
      mini('avl', insert(30, 10, 20), 'LR: primeiro 20 sobe sobre 10; depois sobe sobre 30.'),
      caution('FB(y) = 0 ocorre no conserto após remoção. Ele pertence ao caso simples, não ao caso duplo.'),
      complexity('Busca na AVL e rotação local', avlCost, rotationCost),
      checks(
        check('m3-fb-1', 'Altura esquerda 2 e direita 0: qual é o FB?', ['−2', '+2', '0'], 1, 'FB = h(esquerda) − h(direita) = 2 − 0 = +2.'),
        check('m3-fb-2', 'FB(z) = +2 e FB(y) = −1 indicam qual caso?', ['LL', 'LR', 'RL'], 1, 'A esquerda de z é mais alta, mas a direita de y é mais alta: esquerda-direita, LR.'),
      ),
    ],
    pitfalls: ['Não inverta a subtração do FB: o TreeLab usa esquerda menos direita.', 'Classifique o caso pelo caminho de z para y e x, não apenas pela chave inserida.'],
  },
  {
    slug: 'avl-insercao', moduleId: 'm3', title: 'AVL: inserir e subir',
    summary: 'Atualize alturas e conserte o primeiro ancestral desbalanceado.', type: 'avl', readingMinutes: 5,
    tldr: ['Insira uma folha seguindo a regra da ABB.', 'Suba atualizando alturas; pare se a altura não mudar.', 'O primeiro conserto simples ou duplo encerra o rebalanceamento.'],
    blocks: [
      h('folha', 'A descida ainda é de ABB'),
      p('Compare chaves até encontrar o espaço vazio. Insira a nova folha e comece a subir a partir do pai, recalculando altura e FB.'),
      h('subida', 'Pare quando nada mais muda'),
      p('Se a altura de um ancestral não mudou, os ancestrais acima dele não recebem aumento de altura: a subida pode parar.'),
      p('Se encontrar o primeiro z com |FB| = 2, aplique LL, RR, LR ou RL. Depois desse conserto, a altura da subárvore volta ao valor anterior à inserção.'),
      mini('avl', insert(10, 20, 30, 40, 50, 60, 70), 'Entrada crescente continua com altura baixa na AVL.'),
      key('Uma inserção precisa de no máximo um rebalanceamento, simples ou duplo. Uma rotação dupla contém dois movimentos de rotação.'),
      complexity('Inserção na AVL', entry('Inserir e atualizar', 'O(1)', 'O(log n)', 'O(log n)', 'O(n)', 'O pior caso inclui a descida e a atualização de alturas até a raiz. Há no máximo um conserto simples ou duplo.')),
      checks(
        check('m3-insert-1', 'Quando a subida pode parar sem rotacionar?', ['Quando a altura do ancestral não muda', 'Depois de exatamente dois níveis', 'Só na raiz'], 0, 'Sem aumento na altura da subárvore, os ancestrais acima não precisam receber esse aumento.'),
        check('m3-insert-2', 'Uma rotação dupla tem quantos movimentos de rotação?', ['1', '2', '3'], 1, 'LR e RL fazem duas rotações, dentro de um único rebalanceamento.'),
      ),
    ],
    pitfalls: ['Não conte uma rotação dupla como um único movimento no contador do laboratório.', 'A ausência de desequilíbrio num nó não significa que a altura dele ficou igual.'],
  },
  {
    slug: 'avl-remocao-e-altura', moduleId: 'm3', title: 'AVL: remover pode causar uma cascata',
    summary: 'A altura pode cair várias vezes no caminho até a raiz.', type: 'avl', readingMinutes: 6,
    tldr: ['Remova usando transplante, como na ABB.', 'Comece a subida no ancestral mais fundo cuja subárvore mudou.', 'Um conserto pode reduzir altura e exigir outro acima.'],
    blocks: [
      h('ponto-de-partida', 'Suba a partir do lugar certo'),
      p('Depois do transplante, a subárvore que perdeu um nó pode ficar mais baixa. Se o sucessor veio de mais fundo, comece no pai original dele. Se era filho direto do removido, comece no próprio sucessor.'),
      h('cascata', 'Um conserto pode não bastar'),
      p('Recalcule alturas e rebalanceie cada ancestral com |FB| = 2. Ao contrário da inserção, a altura pode continuar diminuindo depois de uma rotação; nesse caso, continue a subir.'),
      mini('avl', [...insert(4, 2, 6, 1, 3), { t: 'd', k: 6 }], 'Ao remover 6, o filho mais alto de 4 tem FB 0: uma rotação simples resolve.'),
      key('Se FB(y) = 0, use rotação simples. A altura não diminui após esse conserto, então a subida para.'),
      h('limite-altura', 'Por que a altura é logarítmica?'),
      p('O menor número de nós para altura h obedece **N(h) = N(h−1) + N(h−2) + 1**, com N(−1) = 0 e N(0) = 1. Essa recorrência é Fibonacci(h+3) − 1.'),
      p('O limite é **⌈log₂(n+1)⌉ − 1 ≤ h ≤ 1,4405 · log₂(n+2) − 1,3277**. Em comparações, usamos a aproximação h ≤ ~1,44 · log₂ n.'),
      complexity('Remoção na AVL', entry('Remover e rebalancear', 'O(1)', 'O(log n)', 'O(log n)', 'O(n)', 'A remoção pode exigir até O(log n) rotações ao longo da subida.')),
      checks(
        check('m3-delete-1', 'Por que a remoção AVL pode fazer várias rotações?', ['As chaves mudam de ordem', 'A altura pode continuar diminuindo após cada conserto', 'Toda remoção exige rotacionar a raiz'], 1, 'A redução pode se propagar até a raiz e desbalancear outros ancestrais.'),
        check('m3-delete-2', 'Na remoção, FB(z) = +2 e FB(y) = 0 pedem qual ação?', ['Rotação simples à direita', 'Rotação dupla LR', 'Nenhuma rotação'], 0, 'FB(y) ≥ 0 pertence a LL. Quando FB(y) = 0, a rotação simples não reduz a altura, e a subida para.'),
      ),
    ],
    pitfalls: ['Não pare após a primeira rotação sem verificar se a altura caiu.', 'Na remoção com sucessor distante, o ponto de partida é o pai original do sucessor.'],
  },
  {
    slug: 'rn-propriedades-e-altura-negra', moduleId: 'm4', title: 'RN: cinco regras de cor',
    summary: 'As cores limitam a altura sem exigir equilíbrio perfeito.', type: 'rb', readingMinutes: 6,
    tldr: ['Raiz e folhas NIL são pretas.', 'Um nó vermelho só tem filhos pretos.', 'Todos os caminhos até NIL têm a mesma contagem de pretos.'],
    blocks: [
      h('cinco-regras', 'As cinco propriedades'),
      p('**1.** Todo nó é vermelho ou preto. **2.** A raiz é preta. **3.** Toda folha NIL é preta. **4.** Filho de vermelho é preto. **5.** Os caminhos de um nó até os NIL descendentes têm a mesma quantidade de nós pretos.'),
      p('**NIL** representa um filho ausente. É preto por convenção. Um nó interno sem filhos ainda tem dois NIL abaixo dele, mesmo quando os quadradinhos não estão desenhados.'),
      mini('rb', insert(40, 20, 60, 10, 30, 50, 70), 'Ative os NIL no laboratório para visualizar os caminhos completos.'),
      h('altura-negra', 'Conte pretos com uma convenção precisa'),
      p('A **altura negra bh(x)** conta nós pretos do caminho, sem contar o próprio x e incluindo o NIL final. Pela quinta propriedade, qualquer caminho descendente dá o mesmo resultado.'),
      key('Não conte o nó de partida. Conte o NIL no fim. Isso vale mesmo se x for preto.'),
      h('altura-total', 'Como essas regras limitam a altura?'),
      p('Sem vermelhos consecutivos, o caminho mais longo tem no máximo duas vezes o comprimento do mais curto. Uma subárvore com altura negra bh tem pelo menos **2^bh − 1** nós internos.'),
      p('Disso vem a garantia **h ≤ 2 · log₂(n+1)**. A RN pode ser menos rasa que a AVL, mas mantém altura logarítmica.'),
      complexity('Busca na Rubro-Negra', rbCost),
      checks(
        check('m4-properties-1', 'Como a RN trata um filho ausente (NIL)?', ['Vermelho', 'Preto', 'Sem cor'], 1, 'Todo NIL é preto pela convenção CLRS usada no TreeLab.'),
        check('m4-properties-2', 'Na altura negra de x, o próprio x entra na contagem?', ['Sim, sempre', 'Só se x for preto', 'Não'], 2, 'A contagem exclui o nó inicial e inclui o NIL descendente no final.'),
      ),
    ],
    pitfalls: ['NIL preto não é o mesmo que um nó interno preto.', 'Não exigir vermelhos consecutivos é insuficiente: a igualdade de alturas negras também precisa valer.'],
  },
  {
    slug: 'rn-insercao', moduleId: 'm4', title: 'RN: tio vermelho, triângulo ou linha',
    summary: 'Três casos consertam uma inserção vermelha.', type: 'rb', readingMinutes: 6,
    tldr: ['Insira como ABB e pinte o novo nó de vermelho.', 'Pai vermelho exige examinar o tio.', 'Ao terminar, pinte a raiz de preto.'],
    blocks: [
      h('novo-vermelho', 'O problema é vermelho com vermelho'),
      p('A inserção cria uma folha vermelha. Enquanto o pai p for vermelho, examine o avô g e o tio u, irmão de p. Se o pai é preto, esse conflito não existe.'),
      h('tio-vermelho', 'Caso 1: tio vermelho'),
      p('Pinte pai e tio de preto, e avô de vermelho. Agora z passa a ser o avô: o conflito pode ter subido. Repita a verificação.'),
      mini('rb', insert(10, 5, 15, 1), 'Ao inserir 1, pai 5 e tio 15 ficam pretos. O avô 10 volta a preto por ser a raiz.'),
      h('triangulo', 'Caso 2: tio preto e triângulo'),
      p('Se z está no lado interno, forme uma linha: rotacione o pai. Com pai à esquerda e z à direita, rotacione à esquerda. O caso espelhado usa rotação à direita.'),
      h('linha', 'Caso 3: tio preto e linha'),
      p('Pinte o pai de preto e o avô de vermelho. Rotacione o avô no sentido oposto ao lado do pai: pai à esquerda pede direita; pai à direita pede esquerda. O conserto termina.'),
      mini('rb', insert(30, 10, 20), '20 forma um triângulo: caso 2 seguido de caso 3.'),
      key('A inserção RN usa até 2 rotações e O(log n) recolorações. No fim, a raiz é sempre preta.'),
      complexity('Inserção na RN', entry('Inserir e consertar', 'O(1)', 'O(log n)', 'O(log n)', 'O(n)', 'O caso 1 pode subir até a raiz. Os casos 2 e 3 usam no máximo 2 rotações no total.')),
      checks(
        check('m4-insert-1', 'Pai e tio vermelhos: qual caso aparece?', ['Caso 1', 'Caso 2', 'Caso 3'], 0, 'O caso 1 recolore pai e tio de preto, avô de vermelho e sobe para o avô.'),
        check('m4-insert-2', 'O triângulo do caso 2 se transforma em quê?', ['Uma árvore vazia', 'Uma linha para o caso 3', 'Um tio vermelho'], 1, 'A rotação no pai transforma a configuração interna em externa, permitindo o caso 3.'),
      ),
    ],
    pitfalls: ['O tio pode ser NIL; nesse caso, ele é preto.', 'Recolorir o avô pode criar outro conflito acima. O caso 1 precisa continuar a verificação.'],
  },
  {
    slug: 'rn-remocao-preto-extra', moduleId: 'm4', title: 'RN: o preto extra',
    summary: 'Entenda por que a remoção precisa de um conserto próprio.', type: 'rb', readingMinutes: 6,
    tldr: ['A remoção usa transplante e guarda a cor original de y.', 'Se y era preto, x carrega um preto extra.', 'O irmão w determina qual dos quatro casos aplicar.'],
    blocks: [
      h('quem-sai', 'Guarde a cor certa'),
      p('Se z tem até um filho, y = z. Se tem dois, y é o sucessor. Guarde a **cor original de y** antes do transplante. x é o filho que ocupa o lugar original de y e pode ser NIL.'),
      p('Se a cor original era preta, o caminho pode ter perdido um preto. Marcamos x com um **preto extra**, também chamado duplo-preto. Para x = NIL, guardamos explicitamente seu pai.'),
      mini('rb', [...insert(10, 5, 15, 1), { t: 'd', k: 15 }], 'Ao remover o 15 preto, o conserto acompanha o lugar NIL que ficou à direita.'),
      h('laco', 'Quando continuar'),
      p('Conserte enquanto x não for a raiz e x for preto. Chame de w o irmão de x. Os casos abaixo usam x como filho esquerdo; para x à direita, espelhe todas as direções.'),
      h('caso-1', 'Caso 1: irmão vermelho'),
      p('Pinte w de preto e o pai de vermelho. Rotacione o pai em direção a x: com x à esquerda, rotacione à esquerda. O novo irmão é preto; continue com os casos 2, 3 ou 4.'),
      h('caso-2', 'Caso 2: irmão e sobrinhos pretos'),
      p('Se w é preto e seus dois filhos são pretos, pinte w de vermelho e faça x receber o pai. O preto extra sobe. Se x agora é vermelho, pinte-o de preto e termine.'),
      key('Preto extra é uma marca do conserto, não uma terceira cor permanente dos nós.'),
      complexity('Remoção na RN', entry('Remover e consertar', 'O(1)', 'O(log n)', 'O(log n)', 'O(n)', 'A remoção usa até 3 rotações e O(log n) recolorações.')),
      checks(
        check('m4-delete-1', 'Qual cor decide se há conserto após o transplante?', ['A cor original de y', 'A cor da raiz apenas', 'A cor do irmão apenas'], 0, 'y é o nó retirado de sua posição original. Se sua cor original era preta, a contagem de pretos pode precisar de conserto.'),
        check('m4-delete-2', 'No caso 2, para onde vai o preto extra?', ['Para o irmão', 'Para o pai', 'Para a menor folha'], 1, 'Depois de recolorir o irmão, x recebe o pai: o preto extra sobe um nível.'),
      ),
    ],
    pitfalls: ['Não use apenas a cor de z quando um sucessor y foi transplantado.', 'Mesmo quando x é NIL, o algoritmo precisa saber quem é seu pai.'],
  },
  {
    slug: 'rn-remocao-casos-finais', moduleId: 'm4', title: 'RN: prepare e elimine o preto extra',
    summary: 'Os casos 3 e 4 usam os sobrinhos próximo e distante.', type: 'rb', readingMinutes: 5,
    tldr: ['Próximo e distante são definidos em relação a x.', 'Caso 3 prepara a configuração do caso 4.', 'Caso 4 elimina o preto extra; no fim, x fica preto.'],
    blocks: [
      h('sobrinhos', 'Quem está perto de x?'),
      p('Se x é filho esquerdo, o filho esquerdo de w é o **próximo** e o direito é o **distante**. Para x à direita, troque os lados. NIL também conta como preto.'),
      h('caso-3', 'Caso 3: próximo vermelho, distante preto'),
      p('Com w preto, pinte o filho próximo de preto e w de vermelho. Rotacione w no sentido oposto ao lado de x: se x está à esquerda, rotacione w à direita. Isso prepara o caso 4.'),
      h('caso-4', 'Caso 4: distante vermelho'),
      p('w recebe a cor do pai. O pai fica preto e o filho distante fica preto. Rotacione o pai em direção a x: com x à esquerda, use esquerda. O conserto termina.'),
      mini('rb', [...insert(10, 5, 15, 20), { t: 'd', k: 5 }], 'Ao remover 5, o irmão 15 tem o filho distante 20 vermelho: caso 4.'),
      key('Os quatro casos e seus espelhos preservam a ordem de ABB. Ao terminar, x fica preto.'),
      h('limites', 'Por que não vira uma cascata de rotações?'),
      p('O caso 2 pode propagar o preto extra sem rotacionar. Os casos que rotacionam conduzem aos casos finais: no total, a remoção RN usa até 3 rotações.'),
      complexity('Remoção na RN', entry('Remover e consertar', 'O(1)', 'O(log n)', 'O(log n)', 'O(n)', 'Até 3 rotações; recolorações e descida custam O(log n).')),
      checks(
        check('m4-final-1', 'O caso 3 prepara qual caso?', ['Caso 1', 'Caso 2', 'Caso 4'], 2, 'A rotação no irmão torna vermelho o filho distante do novo irmão, criando o caso 4.'),
        check('m4-final-2', 'Se x é filho direito, o filho distante de w fica de qual lado?', ['Esquerdo', 'Direito', 'Não há filho distante'], 0, 'Os casos são espelhados. Com x à direita, o filho esquerdo do irmão está distante de x.'),
      ),
    ],
    pitfalls: ['Próximo e distante mudam quando x muda de lado.', 'No caso 4, w recebe a cor anterior do pai antes de o pai ficar preto.'],
  },
  {
    slug: 'qual-arvore-escolher', moduleId: 'm5', title: 'Qual árvore escolher?',
    summary: 'Equilíbrio, atualizações e memória pedem decisões diferentes.', type: 'avl', readingMinutes: 6,
    tldr: ['ABB é a base para aprender, sem garantia de altura.', 'AVL costuma ser mais rasa e favorece muitas leituras.', 'RN limita rotações nas atualizações e serve bem a cargas mistas.'],
    blocks: [
      h('garantias', 'Compare garantias, não uma única imagem'),
      p('**ABB:** altura até n − 1, sem balanceamento. **AVL:** altura até aproximadamente 1,44 · log₂ n. **RN:** altura até 2 · log₂(n+1). Uma entrada pequena pode esconder essas diferenças.'),
      mini('avl', insert(1, 2, 3, 4, 5, 6, 7), 'Abra esta sequência em Comparar e observe as três alturas.'),
      h('tres-perguntas', 'Um guia em três perguntas'),
      p('**Quer aprender a regra de ordem ou aceitar dados aleatórios sem garantia?** Comece com ABB.'),
      p('**Há muitas leituras e pouca escrita?** Considere AVL.'),
      p('**Leitura e escrita são misturadas?** Considere RN ou a implementação da biblioteca padrão.'),
      h('atualizacoes-memoria', 'Atualizações e memória'),
      p('RN usa até 2 rotações na inserção e até 3 na remoção. AVL pode precisar de O(log n) rotações na remoção. AVL costuma oferecer caminhos de busca mais rasos.'),
      p('Metadados por nó: **ABB: nenhum extra**; **AVL: altura/FB**; **RN: 1 bit de cor**. Dificuldade de implementação: ABB < AVL < RN; a remoção RN é a mais difícil.'),
      h('bibliotecas', 'Exemplos e origem'),
      p('`TreeMap/TreeSet` de Java e `std::map/std::set` de C++ costumam usar árvores rubro-negras; isso pode variar por implementação. AVL aparece quando leituras dominam.'),
      p('Marcos históricos: AVL, 1962; Bayer, 1972; Guibas–Sedgewick, 1978. Esses marcos não alteram as convenções de altura e conserto usadas aqui.'),
      caution('Um cenário típico não é uma promessa de desempenho. Compare a implementação e o padrão de operações da sua aplicação.'),
      complexity('Busca nas três estruturas', bstCost, avlCost, rbCost),
      checks(
        check('m5-choice-1', 'Qual árvore tem garantia de altura mais restrita?', ['ABB', 'AVL', 'RN'], 1, 'A AVL mantém |FB| ≤ 1 em todo nó e limita a altura a aproximadamente 1,44 · log₂ n.'),
        check('m5-choice-2', 'Qual é o limite de rotações na remoção RN?', ['1', '3', 'O(n)'], 1, 'A remoção RN usa até 3 rotações, embora possa fazer O(log n) recolorações.'),
      ),
    ],
    pitfalls: ['RN não garante menos comparações em toda busca.', 'Um bit de cor descreve o metadado lógico, não o tamanho total de um objeto em uma linguagem.'],
  },
  {
    slug: 'complexidade-na-pratica', moduleId: 'm6', title: 'O, Ω e Θ: meça o que cresce',
    summary: 'Separe limites, casos e contadores de uma execução.', type: 'bst', readingMinutes: 6,
    tldr: ['O dá um limite superior; Ω, um inferior; Θ, ambos.', 'Melhor, médio e pior caso descrevem entradas diferentes.', 'Contadores medem esta execução; complexidade descreve o crescimento.'],
    blocks: [
      h('notacoes', 'Três notações, uma pergunta'),
      p('**O** expressa um limite superior de crescimento. **Ω** expressa um limite inferior. **Θ** expressa os dois quando a ordem de crescimento está determinada. Constantes não são o foco dessas notações.'),
      p('Na descida de uma ABB, custo **Θ(h)** liga diretamente o trabalho à altura. Nos percursos completos, custo **Θ(n)** significa visitar todos os nós, tanto numa árvore baixa quanto numa lista.'),
      h('casos', 'Melhor, médio e pior'),
      p('Uma busca encontra a raiz em O(1). Na ABB, a média pode ser O(log n) com inserções em ordem aleatória, mas o pior caso é O(n). AVL e RN garantem O(log n) no pior caso.'),
      h('experimento', 'Faça um experimento reproduzível'),
      mini('bst', insert(1, 2, 3, 4, 5, 6, 7), 'Compare a entrada ordenada e a entrada aleatória usando a mesma quantidade de nós.'),
      p('Em Comparar, use 1 a 31 em ordem e confira **h = n − 1** na ABB. Depois use a entrada aleatória com semente. A semente permite repetir o experimento com as mesmas chaves e a mesma ordem.'),
      key('Comparações, rotações e recolorações são contadores concretos. O(log n) explica como o limite cresce ao aumentar n.'),
      h('espaco', 'Tempo e espaço são medidas diferentes'),
      p('Todas as três árvores guardam O(n) nós. Um percurso em profundidade usa pilha auxiliar O(h); o percurso em nível usa fila O(largura). Uma rotação isolada usa trabalho O(1).'),
      complexity('Busca e percurso', bstCost, avlCost, rbCost, traversalCost),
      checks(
        check('m6-cost-1', 'Percorrer uma ABB em forma de lista custa quanto?', ['Θ(n)', 'O(1)', 'O(log n)'], 0, 'Um percurso completo visita os n nós, mesmo quando a forma é degenerada.'),
        check('m6-cost-2', 'Uma busca de 3 comparações prova custo O(1) para qualquer tamanho?', ['Sim', 'Não'], 1, 'Três comparações descrevem uma execução. A complexidade considera como o custo cresce com n e qual caso está sendo analisado.'),
      ),
    ],
    pitfalls: ['Não troque caso médio por garantia de pior caso.', 'Não confunda memória da árvore O(n) com memória auxiliar de um percurso.'],
  },
]

for (const [index, lesson] of lessons.entries()) {
  const next = lessons[index + 1]
  if (next) lesson.nextSlug = next.slug
}

export function getLesson(slug: string): Lesson | undefined {
  return lessons.find(lesson => lesson.slug === slug)
}

export function getModuleLessons(moduleId: string): Lesson[] {
  return lessons.filter(lesson => lesson.moduleId === moduleId)
}

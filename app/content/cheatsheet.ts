import type { ContentTreeType } from './lessons'

export interface TreeReference {
  type: ContentTreeType
  name: string
  fullName: string
  icon: string
  rule: string
  height: string
  metadata: string
  use: string
  operations: { title: string; description: string }[]
  caution: string
}
export const treeReferences: TreeReference[] = [
  {
    type: 'bst', name: 'ABB', fullName: 'Árvore Binária de Busca', icon: 'network',
    rule: 'Toda chave da esquerda < chave do nó < toda chave da direita.',
    height: 'Sem garantia: até n − 1.', metadata: 'Nenhum metadado extra por nó.',
    use: 'Aprender a regra de ordem ou trabalhar com dados aleatórios sem garantia de altura.',
    operations: [
      { title: 'Buscar e inserir', description: 'Compare: menor vai à esquerda, maior à direita. Igual encerra a busca. Inserção cria uma folha; duplicata não muda a árvore.' },
      { title: 'Remover', description: 'Folha: desconecte. Um filho: o filho sobe. Dois filhos: mova o mínimo da subárvore direita por transplante. Se o sucessor está mais fundo, seu filho direito ocupa primeiro o lugar original.' },
      { title: 'Consultar e percorrer', description: 'Mínimo segue à esquerda; máximo, à direita. Sucessor e predecessor são vizinhos na in-ordem. In-ordem produz ordem crescente.' },
    ],
    caution: 'Entrada ordenada pode virar lista. Custo por caminho: Θ(h); pior caso O(n).',
  },
  {
    type: 'avl', name: 'AVL', fullName: 'Árvore AVL', icon: 'scale',
    rule: 'Ordem de ABB e |FB| ≤ 1 em todo nó. FB = h(esquerda) − h(direita).',
    height: 'Até aproximadamente 1,44 · log₂ n.', metadata: 'Altura ou FB por nó.',
    use: 'Muitas leituras e poucas escritas; costuma oferecer buscas mais rasas.',
    operations: [
      { title: 'Os quatro casos', description: 'LL: direita em z. RR: esquerda em z. LR: esquerda no filho, direita em z. RL: direita no filho, esquerda em z. O sinal do FB escolhe o caso.' },
      { title: 'Inserir', description: 'Insira como ABB e suba atualizando alturas. Pare se a altura não mudar. O primeiro conserto simples ou duplo devolve a altura anterior da subárvore.' },
      { title: 'Remover', description: 'Após transplante, suba do ancestral mais fundo cuja subárvore mudou. Pode haver O(log n) rotações. Filho mais alto com FB 0 pede rotação simples; a altura não cai e a subida para.' },
    ],
    caution: 'Folha tem h = 0 e nulo tem h = −1. A remoção pode exigir vários consertos.',
  },
  {
    type: 'rb', name: 'RN', fullName: 'Árvore Rubro-Negra', icon: 'circle-dot',
    rule: 'Raiz e NIL pretos; sem vermelhos consecutivos; mesma contagem de pretos em todos os caminhos até NIL.',
    height: 'h ≤ 2 · log₂(n+1).', metadata: 'Um bit de cor por nó.',
    use: 'Leitura e escrita misturadas, ou a implementação da biblioteca padrão.',
    operations: [
      { title: 'Inserir: três casos', description: 'Novo nó vermelho. Tio vermelho: recolore e suba. Tio preto com triângulo: rotacione o pai. Linha: recolore pai e avô, rotacione o avô. Raiz preta no fim; até 2 rotações.' },
      { title: 'Remover: quatro casos', description: 'Guarde a cor original de y. Se preta, x recebe preto extra. Irmão vermelho: prepare. Irmão e filhos pretos: suba. Próximo vermelho e distante preto: prepare caso 4. Distante vermelho: recolore e rotacione o pai. Até 3 rotações.' },
      { title: 'Altura negra', description: 'bh conta pretos no caminho até NIL, excluindo o próprio nó e incluindo o NIL. Todos os caminhos descendentes precisam ter a mesma contagem.' },
    ],
    caution: 'NIL é preto. Quando x é NIL na remoção, seu pai continua necessário. Espelhe os casos se x está à direita.',
  },
]

export type ComplexityOperation = 'search' | 'insert' | 'delete' | 'traversal' | 'extremes' | 'space'
export interface ComplexityRow {
  type: ContentTreeType
  name: string
  best: string
  average: string
  worst: string
  note: string
}
export interface ComplexityReference {
  id: ComplexityOperation
  name: string
  rows: ComplexityRow[]
}
const pathRows = (): ComplexityRow[] => [
  { type: 'bst', name: 'ABB', best: 'O(1)', average: 'O(log n)*', worst: 'O(n)', note: '*Com inserções em ordem aleatória. Custo do caminho: Θ(h).' },
  { type: 'avl', name: 'AVL', best: 'O(1)', average: 'O(log n)', worst: 'O(log n)', note: 'Altura logarítmica garantida em todo estado concluído.' },
  { type: 'rb', name: 'RN', best: 'O(1)', average: 'O(log n)', worst: 'O(log n)', note: 'As cinco propriedades garantem altura logarítmica.' },
]
export const complexityReferences: ComplexityReference[] = [
  { id: 'search', name: 'Busca', rows: pathRows() },
  { id: 'insert', name: 'Inserção', rows: pathRows().map(row => ({ ...row, note: row.type === 'bst' ? row.note : row.type === 'avl' ? 'Até um rebalanceamento simples ou duplo por inserção.' : 'Até 2 rotações e O(log n) recolorações.' })) },
  { id: 'delete', name: 'Remoção', rows: pathRows().map(row => ({ ...row, note: row.type === 'bst' ? row.note : row.type === 'avl' ? 'Pode precisar de O(log n) rotações ao subir até a raiz.' : 'Até 3 rotações e O(log n) recolorações.' })) },
  { id: 'traversal', name: 'Percurso', rows: pathRows().map(row => ({ ...row, best: 'Θ(n)', average: 'Θ(n)', worst: 'Θ(n)', note: 'Pilha auxiliar O(h); em nível, fila O(largura).' })) },
  { id: 'extremes', name: 'Mín / Máx', rows: pathRows() },
  { id: 'space', name: 'Espaço', rows: pathRows().map(row => ({ ...row, best: 'O(n)', average: 'O(n)', worst: 'O(n)', note: row.type === 'bst' ? 'Sem metadado adicional por nó.' : row.type === 'avl' ? 'Cada nó guarda altura ou fator de balanceamento.' : 'Cada nó guarda um bit de cor.' })) },
]

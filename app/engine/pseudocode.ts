export interface CodeLine { n: number; text: string }
const code = (...lines: string[]): CodeLine[] => lines.map((text, i) => ({ n: i + 1, text }))
export const pseudocode: Record<string, CodeLine[]> = {
  'bst-search': code('Comece na raiz.', 'Compare a chave com o nó atual.', 'Siga à esquerda ou à direita.', 'Se chegar a NIL, a chave não existe.', 'Se a chave é igual, o nó foi encontrado.'),
  'bst-insert': code('Comece na raiz.', 'Compare a chave com o nó atual.', 'Se as chaves são iguais, termine sem alterar.', 'Desça pelo lado correto.', 'Crie uma folha no lugar de NIL.'),
  'bst-delete': code('Comece na raiz.', 'Compare a chave com o nó atual.', 'Desça pelo lado correto.', 'Se não encontrar, termine sem alterar.', 'Marque o nó a remover.', 'Sem dois filhos, transplante o filho ou NIL.', 'Com dois filhos, encontre o mínimo à direita.', 'Transplante o sucessor mantendo seu identificador.'),
  'bst-traversal': code('Escolha a ordem dos nós.', 'Visite o próximo nó e acrescente à saída.', 'Termine após visitar todos os nós.'),
  'bst-traversal-in': code('Recorra na subárvore esquerda antes de visitar a raiz.', 'Visite o nó e acrescente sua chave à saída.', 'Recorra à direita; ao fim, a saída é crescente.'),
  'bst-traversal-pre': code('Comece pela raiz da subárvore.', 'Visite o nó antes de recorrer à esquerda e à direita.', 'Termine após visitar todos os nós.'),
  'bst-traversal-post': code('Recorra à esquerda e à direita antes da raiz.', 'Visite o nó depois de visitar as duas subárvores.', 'Termine após visitar todos os nós.'),
  'bst-traversal-level': code('Coloque a raiz em uma fila.', 'Retire um nó, visite e enfileire seus filhos.', 'Termine quando a fila ficar vazia.'),
  'bst-query': code('Escolha a raiz da busca.', 'Siga o caminho até o candidato.', 'Mostre o resultado.'),
  'bst-neighbor': code('Busque a chave original como na ABB.', 'Se a subárvore apropriada existe, entre nela.', 'Sucessor: siga à esquerda; predecessor: à direita.', 'Sem a subárvore, suba até mudar de lado.', 'Sem candidato, não existe vizinho.', 'Mostre a chave do candidato.'),
  'avl-insert': code('Insira uma folha como na ABB.', 'Suba a partir do pai atualizando alturas e FB.', 'Pare quando a altura do ancestral não mudar.', 'No primeiro |FB| = 2, aplique LL, RR, LR ou RL.', 'A altura volta ao valor anterior; termine.'),
  'avl-delete': code('Remova como na ABB, transplantando o sucessor.', 'Comece no ancestral mais fundo cuja subárvore mudou.', 'Atualize altura e FB e rebalanceie |FB| = 2.', 'Se o filho tinha FB = 0, a altura não diminui: pare.', 'Continue subindo enquanto a altura diminuir.'),
  'avl-rebalance': code('Atualize altura e FB do ancestral.', 'Se |FB| ≤ 1, continue enquanto a altura mudar.', 'Com FB +2, escolha LL ou LR pelo filho.', 'Com FB −2, escolha RR ou RL pelo filho.', 'Aplique a rotação simples ou dupla.', 'Na inserção, termine após rebalancear.', 'Na remoção, continue se a altura diminuir.'),
  'rb-insert': code('Compare a chave com o nó atual.', 'Se igual, termine; senão, desça pelo lado correto.', 'Insira uma folha vermelha e execute o conserto.'),
  'rb-insert-fix': code('Enquanto o pai é vermelho, identifique pai, avô e tio.', 'Caso 1: o tio é vermelho.', 'Pinte pai e tio de preto, avô de vermelho; suba ao avô.', 'Caso 2: tio preto e nó interno formam um triângulo.', 'Gire o pai para transformar o triângulo em linha.', 'Caso 3: pinte pai de preto e avô de vermelho; gire o avô.', 'Ao fim, pinte a raiz de preto. Espelhe se o pai está à direita.'),
  'rb-delete': code('Busque a chave como na ABB.', 'Se encontrar, marque o nó a remover.', 'Com dois filhos, encontre o sucessor.', 'Transplante e guarde a cor original e xParent.', 'Se saiu um preto, examine o irmão de x.', 'Aplique os casos 1–4 e seus espelhos.', 'Ao fim, pinte x de preto.'),
  'rb-delete-fix': code('Enquanto x não é a raiz e é preto, examine o irmão w.', 'Caso 1: w é vermelho.', 'Pinte w de preto e pai de vermelho; gire o pai; atualize w.', 'Caso 2: w e ambos os seus filhos são pretos.', 'Pinte w de vermelho; x recebe o pai e o preto extra sobe.', 'Caso 3: sobrinho próximo vermelho e distante preto.', 'Pinte próximo de preto e w de vermelho; gire w.', 'Caso 4: o sobrinho distante é vermelho.', 'w recebe a cor do pai; pai e distante pretos; gire o pai.', 'Ao fim, pinte x de preto. Espelhe se x está à direita.'),
  'rb-recolor': code('Troque a cor do nó e conte somente mudanças reais.'),
  rotation: code('Diagnostique o pivô e o filho que sobe.', 'Prepare a subárvore do meio para trocar de pai.', 'Gire os ponteiros preservando a ordem in-ordem.', 'Atualize alturas e conclua a rotação.'),
  'bst-operation': code('Execute a operação solicitada.'),
  'avl-operation': code('Execute a operação e restaure o equilíbrio.'),
  'rb-operation': code('Execute a operação e restaure as propriedades Rubro-Negras.'),
}
export const PSEUDOCODE = pseudocode

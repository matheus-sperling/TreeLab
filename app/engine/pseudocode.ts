export interface CodeLine { n: number; text: string }
const code = (...lines: string[]): CodeLine[] => lines.map((text, i) => ({ n: i + 1, text }))
export const pseudocode: Record<string, CodeLine[]> = {
  'bst-search': code('Comece na raiz.', 'Compare a chave com o nó atual.', 'Siga à esquerda ou à direita.', 'Se chegar a NIL, a chave não existe.'),
  'bst-insert': code('Comece na raiz.', 'Compare a chave com o nó atual.', 'Se as chaves são iguais, termine sem alterar.', 'Desça pelo lado correto.', 'Crie uma folha no lugar de NIL.'),
  'bst-delete': code('Comece na raiz.', 'Compare a chave com o nó atual.', 'Desça pelo lado correto.', 'Se não encontrar, termine sem alterar.', 'Marque o nó a remover.', 'Sem dois filhos, transplante o filho ou NIL.', 'Com dois filhos, encontre o mínimo à direita.', 'Transplante o sucessor mantendo seu identificador.'),
  'bst-traversal': code('Escolha a ordem dos nós.', 'Visite o próximo nó e acrescente à saída.', 'Termine após visitar todos os nós.'),
  'bst-query': code('Escolha a raiz da busca.', 'Siga o caminho até o candidato.', 'Mostre o resultado.'),
  'avl-rebalance': code('Atualize altura e FB do ancestral.', 'Se |FB| ≤ 1, continue enquanto a altura mudar.', 'Com FB +2, escolha LL ou LR pelo filho.', 'Com FB −2, escolha RR ou RL pelo filho.', 'Aplique a rotação simples ou dupla.', 'Na inserção, termine após rebalancear.', 'Na remoção, continue se a altura diminuir.'),
  'rb-insert': code('Compare a chave e desça como na ABB.', 'Chave repetida não altera a árvore.', 'Insira uma folha vermelha.', 'Enquanto o pai é vermelho, examine o tio.', 'Tio vermelho: recolora e suba ao avô.', 'Triângulo: gire o pai; linha: recolora e gire o avô.', 'Ao fim, pinte a raiz de preto.'),
  'rb-delete': code('Busque a chave como na ABB.', 'Se encontrar, marque o nó a remover.', 'Com dois filhos, encontre o sucessor.', 'Transplante e guarde a cor original e xParent.', 'Se saiu um preto, examine o irmão de x.', 'Aplique os casos 1–4 e seus espelhos.', 'Ao fim, pinte x de preto.'),
  'rb-fix': code('Enquanto existir uma violação, examine parentes.', 'Caso 1: transforme o irmão/tio vermelho.', 'Caso 2: suba ou transforme o triângulo.', 'Casos 3 e 4: prepare e conclua a rotação.', 'Recolora somente os nós que mudam de cor.'),
  rotation: code('Diagnostique o pivô e o filho que sobe.', 'Prepare a subárvore do meio para trocar de pai.', 'Gire os ponteiros preservando a ordem in-ordem.', 'Atualize alturas e conclua a rotação.'),
  'bst-operation': code('Execute a operação solicitada.'),
  'avl-operation': code('Execute a operação e restaure o equilíbrio.'),
  'rb-operation': code('Execute a operação e restaure as propriedades Rubro-Negras.'),
}
export const PSEUDOCODE = pseudocode

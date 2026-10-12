/** Índice leve para o progresso da Início, sem carregar os textos das lições. */
export const treeLessonSlugs: Record<'bst' | 'avl' | 'rb', readonly string[]> = {
  bst: ['abb-busca-e-insercao', 'abb-remocao', 'abb-consultas-e-degeneracao'],
  avl: ['avl-fb-e-quatro-casos', 'avl-insercao', 'avl-remocao-e-altura'],
  rb: ['rn-propriedades-e-altura-negra', 'rn-insercao', 'rn-remocao-preto-extra', 'rn-remocao-casos-finais'],
}

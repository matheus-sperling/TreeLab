import { decodeOps } from './codec'
import type { CaseName, Op, TreeType } from './types'

export interface Preset { id: string; title: string; description: string; type: TreeType; ops: Op[]; cases?: CaseName[]; deletionZeroBalance?: boolean; cascade?: boolean }
const preset = (id: string, title: string, description: string, type: TreeType, sequence: string, cases?: CaseName[]): Preset => ({ id, title, description, type, ops: decodeOps(sequence), ...(cases ? { cases } : {}) })
export function seededSequence(n = 15, seed = 42): Op[] {
  const keys = Array.from({ length: 99 }, (_, i) => i + 1)
  let state = seed >>> 0
  for (let i = keys.length - 1; i > 0; i--) {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0
    const j = state % (i + 1)
    ;[keys[i], keys[j]] = [keys[j]!, keys[i]!]
  }
  return keys.slice(0, Math.max(0, Math.min(63, Math.floor(n)))).map(k => ({ t: 'i', k }))
}
export const presets: Preset[] = [
  preset('avl-ll', 'AVL · LL', 'Três inserções pedem uma rotação à direita.', 'avl', 'i30.i20.i10', ['LL']),
  preset('avl-rr', 'AVL · RR', 'Três inserções pedem uma rotação à esquerda.', 'avl', 'i10.i20.i30', ['RR']),
  preset('avl-lr', 'AVL · LR', 'Gire à esquerda no filho, depois à direita no pivô.', 'avl', 'i30.i10.i20', ['LR']),
  preset('avl-rl', 'AVL · RL', 'Gire à direita no filho, depois à esquerda no pivô.', 'avl', 'i10.i30.i20', ['RL']),
  { ...preset('avl-delete-zero', 'AVL · remoção, filho FB = 0', 'A rotação simples conserva a altura: a subida termina.', 'avl', 'i2.i1.i4.i3.i5.d1', ['RR']), deletionZeroBalance: true },
  { ...preset('avl-delete-cascade', 'AVL · remoção em cascata', 'Uma remoção rebalanceia duas subárvores.', 'avl', 'i7.i1.i5.i4.i11.i3.i10.i2.i12.i6.i9.i8.d4', ['LR', 'RL']), cascade: true },
  preset('rb-i1', 'RN · tio vermelho', 'Recolora pai, tio e avô.', 'rb', 'i4.i2.i6.i1', ['RB-I1']),
  preset('rb-i1-mirror', 'RN · tio vermelho, espelho', 'O pai fica à direita do avô.', 'rb', 'i4.i2.i6.i7', ['RB-I1-mirror']),
  preset('rb-i2', 'RN · triângulo e linha', 'Duas rotações corrigem o zigue-zague.', 'rb', 'i3.i1.i2', ['RB-I2', 'RB-I3']),
  preset('rb-i2-mirror', 'RN · triângulo e linha, espelho', 'Duas rotações corrigem o caso espelhado.', 'rb', 'i1.i3.i2', ['RB-I2-mirror', 'RB-I3-mirror']),
  preset('rb-i3', 'RN · linha', 'Recolora e gire o avô à direita.', 'rb', 'i3.i2.i1', ['RB-I3']),
  preset('rb-i3-mirror', 'RN · linha, espelho', 'Recolora e gire o avô à esquerda.', 'rb', 'i1.i2.i3', ['RB-I3-mirror']),
  preset('rb-d1', 'RN · irmão vermelho', 'Transforme o caso e examine o novo irmão.', 'rb', 'i1.i2.i3.i4.i5.i6.d1', ['RB-D1']),
  preset('rb-d1-mirror', 'RN · irmão vermelho, espelho', 'O preto extra fica à direita.', 'rb', 'i6.i5.i4.i3.i2.i1.d6', ['RB-D1-mirror']),
  preset('rb-d2', 'RN · irmão e sobrinhos pretos', 'O preto extra sobe ao pai.', 'rb', 'i1.i2.i3.i4.d4.d1', ['RB-D2']),
  preset('rb-d2-mirror', 'RN · irmão e sobrinhos pretos, espelho', 'O preto extra sobe no caso espelhado.', 'rb', 'i4.i3.i2.i1.d1.d4', ['RB-D2-mirror']),
  preset('rb-d3', 'RN · próximo vermelho', 'Prepare o irmão e conclua com o caso 4.', 'rb', 'i1.i2.i4.i3.d1', ['RB-D3', 'RB-D4']),
  preset('rb-d3-mirror', 'RN · próximo vermelho, espelho', 'Dois giros corrigem o preto extra à direita.', 'rb', 'i4.i3.i1.i2.d4', ['RB-D3-mirror', 'RB-D4-mirror']),
  preset('rb-d4', 'RN · distante vermelho', 'Uma rotação conclui o conserto.', 'rb', 'i1.i2.i3.i4.d1', ['RB-D4']),
  preset('rb-d4-mirror', 'RN · distante vermelho, espelho', 'Uma rotação conclui o caso espelhado.', 'rb', 'i4.i3.i2.i1.d4', ['RB-D4-mirror']),
  { id: 'ordered', title: '1 → 15 em ordem', description: 'A ABB vira lista; AVL e RN controlam a altura.', type: 'bst', ops: Array.from({ length: 15 }, (_, i) => ({ t: 'i', k: i + 1 })) },
  { id: 'descending', title: '15 → 1 em ordem', description: 'A lista cresce para a esquerda.', type: 'bst', ops: Array.from({ length: 15 }, (_, i) => ({ t: 'i', k: 15 - i })) },
  preset('zigzag', 'Zigue-zague', 'Alterne os lados e observe o balanceamento.', 'avl', 'i15.i1.i14.i2.i13.i3.i12.i4.i11.i5.i10.i6.i9.i7.i8'),
  preset('balanced', 'Exemplo balanceado', 'Sete nós em três níveis.', 'avl', 'i40.i20.i60.i10.i30.i50.i70'),
  { id: 'random', title: 'Aleatória · semente 42', description: 'A mesma semente gera a mesma sequência.', type: 'rb', ops: seededSequence() },
  preset('clrs', 'Clássica do livro', 'Observe os consertos da inserção RN.', 'rb', 'i41.i38.i31.i12.i19.i8'),
]
export const PRESETS = presets

import { createServer } from 'vite'
import type { CaseName, Op } from '../app/engine/types'

// Vite resolve os mesmos módulos TypeScript usados pelo Nuxt, sem um segundo transpiler.
const server = await createServer({ configFile: false, server: { middlewareMode: true } })
const engine = await server.ssrLoadModule('/app/engine/index.ts') as typeof import('../app/engine/index')
const targets = new Set<CaseName>(['LL', 'RR', 'LR', 'RL', 'RB-I1', 'RB-I2', 'RB-I3', 'RB-I1-mirror', 'RB-I2-mirror', 'RB-I3-mirror', 'RB-D1', 'RB-D2', 'RB-D3', 'RB-D4', 'RB-D1-mirror', 'RB-D2-mirror', 'RB-D3-mirror', 'RB-D4-mirror'])
const found = new Map<CaseName, Op[]>()
function* permutations(keys: number[]): Generator<number[]> {
  if (!keys.length) { yield []; return }
  for (const key of keys) for (const rest of permutations(keys.filter(k => k !== key))) yield [key, ...rest]
}
function collect(ops: Op[], type: 'avl' | 'rb'): void {
  for (const step of engine.runSequence(type, ops).steps) {
    const name = step.meta?.caseName
    if (name && targets.has(name)) {
      const candidate = ops.slice(0, step.op + 1), previous = found.get(name)
      const insertions = (sequence: Op[]) => sequence.filter(op => op.t === 'i').length
      if (!previous || insertions(candidate) < insertions(previous) || insertions(candidate) === insertions(previous) && candidate.length < previous.length) found.set(name, candidate)
    }
  }
}
try {
  // Busca por número crescente de nós; até dois deletes cobrem os casos RN nesta família.
  for (let n = 3; n <= 6 && found.size < targets.size; n++) {
    const keys = Array.from({ length: n }, (_, i) => i + 1)
    for (const order of permutations(keys)) {
      const inserts: Op[] = order.map(k => ({ t: 'i', k }))
      collect(inserts, 'avl'); collect(inserts, 'rb')
      for (const first of keys) {
        collect([...inserts, { t: 'd', k: first }], 'rb')
        for (const second of keys) if (first !== second) collect([...inserts, { t: 'd', k: first }, { t: 'd', k: second }], 'rb')
      }
    }
  }
  for (const [name, ops] of found) process.stdout.write(`${name}\t${engine.encodeOps(ops)}\n`)
  for (const preset of engine.presets.filter(p => p.deletionZeroBalance || p.cascade)) {
    const result = engine.runSequence(preset.type, preset.ops)
    if (!engine.validate(result.final, preset.type).valid) throw new Error(`Preset inválido: ${preset.id}`)
    // Reduz a sequência mantendo a condição; os presets travados não têm inserção dispensável.
    const matches = (ops: Op[]): boolean => {
      const steps = engine.runSequence('avl', ops).steps.filter(s => s.op === ops.length - 1)
      return preset.cascade ? steps.filter(s => s.kind === 'rotate' && s.meta?.rotation?.n === 1).length >= 2 : steps.some(s => s.kind === 'rotate' && s.meta?.childBalance === 0)
    }
    let minimal = preset.ops
    for (let i = 0; i < minimal.length - 1;) {
      const candidate = minimal.filter((_, index) => index !== i)
      if (matches(candidate)) { minimal = candidate; i = 0 } else i++
    }
    process.stdout.write(`${preset.id}\t${engine.encodeOps(minimal)}\n`)
  }
  if (found.size !== targets.size) throw new Error('A busca não cobriu todos os casos')
} finally { await server.close() }

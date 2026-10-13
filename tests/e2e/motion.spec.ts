import { expect, test } from '@playwright/test'
import type { Page, TestInfo } from '@playwright/test'
import { writeFile } from 'node:fs/promises'
import { decodeOps, layoutTree, runSequence } from '../../app/engine'
import type { Position, Snapshot, TreeType } from '../../app/engine/types'

interface Frame {
  t: number
  step: number
  height: number
  positions: Record<number, Position>
  screen: Record<number, Position>
  nilParentGaps: number[]
  nilCount: number
}

const annotations = { showNils: true, showLevels: true, showHeights: true }

async function openRotation(page: Page, type: TreeType, sequence: string, settings = {}) {
  const result = runSequence(type, decodeOps(sequence))
  const start = result.steps.findIndex(step => step.kind === 'rotate-pre')
  expect(start).toBeGreaterThan(-1)
  await page.addInitScript(preferences => {
    localStorage.setItem('treelab-tour', 'seen')
    localStorage.setItem('treelab:settings', JSON.stringify(preferences))
  }, { ...annotations, ...settings })
  await page.goto(`/lab?t=${type}&q=${sequence}&c=${start}`)
  await expect(page.getByRole('slider', { name: 'Passo da operação atual' })).toHaveAttribute('aria-valuenow', String(start))
  await expect(page.locator('.nil-marker')).not.toHaveCount(0)
  // The entrance and the initial camera fit finish before measuring the rotation.
  await page.waitForTimeout(650)
  const keys = Object.fromEntries(Object.entries(result.steps[start]!.tree.nodes).map(([id, node]) => [id, node.key]))
  return { result, start, keys }
}

/** Sample rendered geometry every frame, including the frame before the click. */
async function record(page: Page, keys: Record<string, number>, duration: number, action = 'Próximo passo', secondClick?: number): Promise<Frame[]> {
  await expect(page.getByRole('button', { name: action, exact: true })).toBeEnabled()
  return page.evaluate(({ keys, duration, action, secondClick }) => new Promise<Frame[]>(resolve => {
    const button = [...document.querySelectorAll<HTMLButtonElement>('button')].find(element => element.getAttribute('aria-label') === action)!
    const frames: Frame[] = []
    let start = 0
    let repeated = false
    function sample(t: number): Frame {
      const positions: Frame['positions'] = {}
      const screen: Frame['screen'] = {}
      const nodeByKey = new Map<number, SVGGElement>()
      for (const node of document.querySelectorAll<SVGGElement>('.tree-svg [data-node]')) {
        const key = Number(node.querySelector(':scope > text')?.textContent)
        nodeByKey.set(key, node)
      }
      for (const [id, key] of Object.entries(keys)) {
        const node = nodeByKey.get(key)!
        const matrix = node.getScreenCTM()!
        const point = new DOMPoint(0, 0).matrixTransform(matrix)
        const camera = (node.parentElement as unknown as SVGGElement).getScreenCTM()!
        const world = point.matrixTransform(camera.inverse())
        positions[Number(id)] = { x: world.x, y: world.y }
        screen[Number(id)] = { x: point.x, y: point.y }
      }
      const nilParentGaps = [...document.querySelectorAll<SVGGeometryElement>('.nil-edge')].filter(edge => {
        const group = edge.closest('[data-nil]')!
        return Number(getComputedStyle(group).opacity) >= .05
      }).map(edge => {
        const parent = screen[Number(edge.getAttribute('data-nil-parent'))]!
        const matrix = edge.getScreenCTM()!
        const point = edge.getPointAtLength(0)
        const origin = new DOMPoint(point.x, point.y).matrixTransform(matrix)
        // Normalize to tree coordinates so a smooth camera zoom cannot mask a detached edge.
        return Math.hypot(origin.x - parent.x, origin.y - parent.y) / Math.hypot(matrix.a, matrix.b)
      })
      return {
        t, positions, screen, nilParentGaps,
        nilCount: document.querySelectorAll('.nil-marker').length,
        step: Number(document.querySelector('[role="slider"][aria-label="Passo da operação atual"]')?.getAttribute('aria-valuenow')),
        height: document.querySelector('.tree-canvas')!.getBoundingClientRect().height,
      }
    }
    function tick(now: number) {
      const elapsed = now - start
      // Read after all animation callbacks for this frame have updated the DOM.
      setTimeout(() => {
        frames.push(sample(elapsed))
        if (secondClick !== undefined && !repeated && elapsed >= secondClick) { repeated = true; button.click() }
        if (elapsed >= duration) resolve(frames)
      }, 0)
      if (elapsed < duration) requestAnimationFrame(tick)
    }
    requestAnimationFrame(now => {
      start = now
      frames.push(sample(0))
      button.click()
      requestAnimationFrame(tick)
    })
  }), { keys, duration, action, secondClick })
}

function distance(a: Position, b: Position) { return Math.hypot(a.x - b.x, a.y - b.y) }
function error(frame: Frame, targets: Record<number, Position>) {
  return Math.max(...Object.entries(targets).map(([id, target]) => distance(frame.positions[Number(id)]!, target)))
}
function checkAttachments(frames: Frame[]) {
  expect(frames.length).toBeGreaterThan(10)
  expect(frames.every(frame => frame.nilParentGaps.length > 0)).toBe(true)
  expect(Math.max(...frames.flatMap(frame => frame.nilParentGaps.map(gap => Math.abs(gap - 20))))).toBeLessThan(.1)
}
function checkFinishedNils(frames: Frame[], tree: Snapshot) {
  expect(frames.at(-1)!.nilCount).toBe(layoutTree(tree, annotations).nils.length)
}
function checkHeight(frames: Frame[]) {
  const heights = frames.map(frame => frame.height)
  expect(Math.max(...heights) - Math.min(...heights)).toBeLessThanOrEqual(1)
}
async function attachFrames(info: TestInfo, frames: Frame[]) {
  const path = info.outputPath('rendered-motion-frames.json')
  await writeFile(path, JSON.stringify(frames))
  await info.attach('rendered-motion-frames', { path, contentType: 'application/json' })
}

test('o giro RN permanece contínuo quando avançamos novamente durante o movimento', async ({ page }, info) => {
  const { result, start, keys } = await openRotation(page, 'rb', 'i1.i2.i3')
  const before = layoutTree(result.steps[start]!.tree, annotations).positions
  const targets = layoutTree(result.steps[start + 1]!.tree, annotations).positions
  const frames = await record(page, keys, 1350, 'Próximo passo', 150)
  await attachFrames(info, frames)
  checkAttachments(frames)
  checkHeight(frames)
  checkFinishedNils(frames, result.steps[frames.at(-1)!.step]!.tree)
  expect(frames.at(-1)!.step).toBe(start + 2)
  expect(error(frames[0]!, before)).toBeLessThan(.2)
  expect(error(frames.at(-1)!, targets)).toBeLessThan(.2)
  const intermediate = frames.filter(frame => frame.t > 80 && frame.t < 800 && error(frame, before) > 3 && error(frame, targets) > 3)
  expect(intermediate.length).toBeGreaterThan(10)
  const settled = frames.find(frame => frame.t > 150 && error(frame, targets) < 1)!
  expect(settled.t).toBeGreaterThan(720)
  expect(settled.t).toBeLessThan(1150)
  for (let index = 1; index < frames.length; index++) {
    const frame = frames[index]!, previous = frames[index - 1]!
    const elapsed = Math.max(16, frame.t - previous.t)
    for (const id of Object.keys(targets)) {
      // A one-frame camera jump moves the whole diagram even if world coordinates stay smooth.
      expect(distance(frame.screen[Number(id)]!, previous.screen[Number(id)]!) / elapsed).toBeLessThan(.8)
    }
  }
})

test('movimento reduzido aplica o destino sem frames intermediários', async ({ page }, info) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  const { result, start, keys } = await openRotation(page, 'rb', 'i1.i2.i3', { reducedMotion: true })
  const targets = layoutTree(result.steps[start + 1]!.tree, annotations).positions
  const frames = await record(page, keys, 250)
  await attachFrames(info, frames)
  checkAttachments(frames)
  checkHeight(frames)
  checkFinishedNils(frames, result.steps[frames.at(-1)!.step]!.tree)
  for (const frame of frames.filter(frame => frame.t >= 50)) expect(error(frame, targets)).toBeLessThan(.2)
})

for (const example of [{ type: 'rb', sequence: 'i1.i2.i3', rotations: 1 }, { type: 'avl', sequence: 'i30.i10.i20', rotations: 2 }] as const) {
  test(`reprodução 4× conclui ${example.rotations} giro(s) ${example.type.toUpperCase()} antes do próximo passo`, async ({ page }, info) => {
    const { result, start, keys } = await openRotation(page, example.type, example.sequence, { speed: 4 })
    const frames = await record(page, keys, 2300, 'Reproduzir')
    await attachFrames(info, frames)
    checkAttachments(frames)
    checkFinishedNils(frames, result.steps[frames.at(-1)!.step]!.tree)
    const rotations = result.steps.filter(step => step.kind === 'rotate' && step.i > start)
    expect(rotations).toHaveLength(example.rotations)
    for (const rotation of rotations) {
      const before = layoutTree(result.steps[rotation.i - 1]!.tree, annotations).positions
      const targets = layoutTree(rotation.tree, annotations).positions
      const active = frames.filter(frame => frame.step === rotation.i)
      checkHeight(frames.filter(frame => frame.step >= rotation.i - 1 && frame.step <= rotation.i + 1))
      expect(active.length).toBeGreaterThan(6)
      expect(active.filter(frame => error(frame, before) > 1 && error(frame, targets) > 1).length).toBeGreaterThan(3)
      expect(error(active.at(-1)!, targets)).toBeLessThan(1)
      const update = frames.find(frame => frame.step === rotation.i + 1)!
      expect(error(update, targets)).toBeLessThan(1)
    }
  })
}

import type { StepKind } from '../../engine/types'

export const TREE_EASE: [number, number, number, number] = [.4, 0, .2, 1]
const moveSeconds = .55
const rotationSeconds = .95
const settleMilliseconds = 150

export function movementDuration(kind?: StepKind, speed = 1) {
  const pace = Number.isFinite(speed) && speed > 0 ? speed : 1
  return (kind === 'rotate' ? rotationSeconds : moveSeconds) / pace
}

/** Playback leaves enough time for Vue's render and the final motion frame. */
export function movementBudget(kind?: StepKind) {
  return movementDuration(kind) * 1000 + settleMilliseconds
}

import type { Role, StepKind } from '../../engine/types'

/** Structural RN colors stay in the node fill; these tokens describe the current action. */
export const ROLE_COLORS: Record<Role, string> = {
  current: 'var(--compare)', path: 'var(--accent)', new: 'var(--accent)', visited: 'var(--accent)',
  found: 'var(--success)', delete: 'var(--delete)', successor: 'var(--delete)',
  pivot: 'var(--rotation)', moved: 'var(--rotation)', 'extra-black': 'var(--rotation)', violation: 'var(--violation)',
}
export function roleColor(role?: Role): string | undefined { return role ? ROLE_COLORS[role] : undefined }

export function effectRole(kind?: StepKind, rotation = false, activeRole?: Role): Role | undefined {
  if (kind === 'case' || kind === 'imbalance') return 'violation'
  if (rotation) return 'pivot'
  if (kind === 'compare' || kind === 'recolor' || kind === 'update') return 'current'
  if (kind === 'descend' || kind === 'start') return 'path'
  if (kind === 'attach') return 'new'
  if (kind === 'found' || kind === 'duplicate' || kind === 'done') return 'found'
  if (kind === 'mark-delete' || kind === 'remove') return 'delete'
  if (kind === 'find-successor' || kind === 'transplant') return 'successor'
  if (kind === 'extra-black') return 'extra-black'
  if (kind === 'visit') return activeRole ?? 'visited'
  return undefined
}

export function effectDuration(seconds: number, speed = 1, seeking = false, reduced = false): number {
  if (seeking || reduced) return 0
  const pace = Number.isFinite(speed) && speed > 0 ? speed : 1
  return seconds / pace
}

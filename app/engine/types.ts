export type TreeType = 'bst' | 'avl' | 'rb'
export type NodeId = number
export type Color = 'R' | 'B'
export interface TreeNode { key: number; l: NodeId | null; r: NodeId | null; p: NodeId | null; h: number; c?: Color }
export interface Snapshot { readonly rootId: NodeId | null; readonly nodes: Readonly<Record<number, Readonly<TreeNode>>> }
/** Estado de trabalho privado do motor; nunca é retornado pela API pública. */
export interface MutableSnapshot { rootId: NodeId | null; nodes: Record<number, TreeNode> }
export type TraversalOrder = 'in' | 'pre' | 'post' | 'level'
export type Op = { t: 'i'; k: number } | { t: 'd'; k: number } | { t: 's'; k: number } | { t: 'walk'; order: TraversalOrder } | { t: 'min' } | { t: 'max' } | { t: 'succ'; k: number } | { t: 'pred'; k: number }
export type StepKind = 'start' | 'compare' | 'descend' | 'attach' | 'found' | 'not-found' | 'duplicate' | 'mark-delete' | 'find-successor' | 'transplant' | 'remove' | 'update' | 'imbalance' | 'case' | 'rotate-pre' | 'rotate' | 'recolor' | 'extra-black' | 'visit' | 'done'
export type Role = 'current' | 'path' | 'new' | 'found' | 'delete' | 'successor' | 'pivot' | 'moved' | 'violation' | 'extra-black' | 'visited'
export type CaseName = 'LL' | 'RR' | 'LR' | 'RL' | 'RB-I1' | 'RB-I2' | 'RB-I3' | 'RB-D1' | 'RB-D2' | 'RB-D3' | 'RB-D4' | 'RB-I1-mirror' | 'RB-I2-mirror' | 'RB-I3-mirror' | 'RB-D1-mirror' | 'RB-D2-mirror' | 'RB-D3-mirror' | 'RB-D4-mirror'
export interface Rotation { dir: 'left' | 'right'; pivot: NodeId; child: NodeId; movedSubtree: NodeId | null; n: number; of: number }
export interface StepMeta { caseName?: CaseName; rotation?: Rotation; order?: number[]; extraBlack?: { id: NodeId | null; parent: NodeId | null; side: 'L' | 'R' }; childBalance?: number; batch?: boolean }
export type MessageParams = Record<string, string | number | boolean | null>
export interface Step { i: number; op: number; kind: StepKind; tree: Snapshot; hl: Record<number, Role>; edges: { from: NodeId; to: NodeId; role: Role }[]; msg: { key: string; params: MessageParams }; code: { algo: string; line: number }; meta?: StepMeta }
export interface Cost { comparisons: number; rotations: number; recolorings: number; heightUpdates: number; visits: number }
export interface SequenceResult { steps: Step[]; opRanges: [number, number][]; cost: Cost[]; final: Snapshot }
export interface Validation { valid: boolean; errors: string[]; count: number; height: number; blackHeight?: number }
export interface Position { x: number; y: number }
export interface LayoutResult { positions: Record<number, Position>; bounds: { minX: number; minY: number; maxX: number; maxY: number }; nils: { id: string; parent: number; side: 'L' | 'R'; x: number; y: number }[] }

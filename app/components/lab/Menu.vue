<script setup lang="ts">
import { SwitchRoot, SwitchThumb } from 'reka-ui'
import { presets, seededSequence } from '../../engine/presets'
import type { Op, TreeType } from '../../engine/types'
import { useSettingsStore } from '../../stores/settings'
import { useLabStore } from '../../stores/lab'
const emit = defineEmits<{ preset: [ops: Op[], type?: TreeType]; generate: [ops: Op[]]; operation: [op: Op]; share: []; clear: []; help: []; legend: []; text: [] }>()
const props = defineProps<{ value: string }>()
const settings = useSettingsStore().settings
const lab = useLabStore()
const error = ref('')
const key = computed(() => Number(props.value.split(/[,\s]/).find(Boolean)))
const views = [['showHeights', 'Alturas dos nós'], ['showNils', 'Folhas NIL'], ['showColors', 'Letras das cores R/N'], ['showLevels', 'Guias de profundidade'], ['pauseOnKey', 'Pausar em rotações e cores'], ['haptics', 'Feedback tátil'], ['reducedMotion', 'Reduzir movimento'], ['systemKeyboard', 'Teclado do dispositivo']] as const
const sections = [['sequence', 'Minha árvore'], ['examples', 'Exemplos'], ['view', 'Opções'], ['explore', 'Explorar']] as const
function generate() {
  if (!Number.isInteger(settings.seed) || settings.seed < 0 || !Number.isInteger(settings.randomCount) || settings.randomCount < 1 || settings.randomCount > 63) return
  emit('generate', seededSequence(settings.randomCount, settings.seed))
}
watch(() => [settings.seed, settings.randomCount], generate)
function update(index: number, field: 'key' | 'action', event: Event) {
  const op = lab.operations[index]
  if (!op || !('k' in op)) return
  const value = (event.target as HTMLInputElement).value
  if (field === 'key') {
    const key = Number(value)
    if (!value.trim() || !Number.isInteger(key) || Math.abs(key) > 999) { error.value = 'Use um inteiro de −999 a 999.'; return }
    error.value = ''; lab.updateOperation(index, { ...op, k: key })
  } else lab.updateOperation(index, { t: value as 'i' | 'd' | 's', k: op.k })
}
function description(op: Op) { return op.t === 'walk' ? `Percurso ${op.order}` : op.t === 'min' ? 'Mínimo' : op.t === 'max' ? 'Máximo' : op.t === 'succ' ? `Sucessor de ${op.k}` : op.t === 'pred' ? `Predecessor de ${op.k}` : '' }
</script>
<template>
  <div class="lab-menu">
    <nav aria-label="Seções do menu"><button v-for="[id, label] in sections" :key="id" :class="{ active: settings.menuSection === id }" :aria-pressed="settings.menuSection === id" @click="settings.menuSection = id">{{ label }}</button></nav>
    <section v-if="settings.menuSection === 'sequence'" class="menu-list">
      <div class="menu-heading"><h3>Sua sequência · {{ lab.operations.length }}</h3><button aria-label="Limpar sequência" :disabled="!lab.operations.length" @click="emit('clear')"><Icon name="lucide:trash-2" /> Zerar árvore</button></div>
      <p>Edite um valor, troque a operação ou mova sua posição. A árvore é recalculada a partir da mudança.</p>
      <p v-if="!lab.operations.length">Tudo pronto para começar. Feche este painel e insira seu primeiro número.</p>
      <p v-if="error" role="alert" class="error">{{ error }}</p>
      <ol class="sequence-editor"><li v-for="(op, index) in lab.operations" :key="`${index}:${JSON.stringify(op)}`">
        <span class="operation-number">{{ index + 1 }}</span>
        <template v-if="['i', 'd', 's'].includes(op.t) && 'k' in op"><select :value="op.t" :aria-label="`Tipo da operação ${index + 1}`" @change="update(index, 'action', $event)"><option value="i">Inserir</option><option value="d">Remover</option><option value="s">Buscar</option></select><input :value="op.k" type="number" min="-999" max="999" :aria-label="`Valor da operação ${index + 1}`" @change="update(index, 'key', $event)"></template><span v-else class="query-label">{{ description(op) }}</span>
        <div class="row-actions"><button :disabled="index === 0" :aria-label="`Mover operação ${index + 1} para antes`" @click="lab.moveOperation(index, -1)"><Icon name="lucide:arrow-up" /></button><button :disabled="index === lab.operations.length - 1" :aria-label="`Mover operação ${index + 1} para depois`" @click="lab.moveOperation(index, 1)"><Icon name="lucide:arrow-down" /></button><button :aria-label="`Excluir operação ${index + 1}`" @click="lab.removeOperation(index)"><Icon name="lucide:x" /></button></div>
      </li></ol>
      <div class="generator"><h3>Experimentar com uma semente</h3><p>Cada semente gera os mesmos números. Alterar um campo atualiza a árvore imediatamente, desde o início.</p><div class="seed-inputs"><label>Nós<input v-model.number="settings.randomCount" type="number" min="1" max="63" aria-label="Quantidade de nós aleatórios"></label><label>Semente<input v-model.number="settings.seed" type="number" min="0" aria-label="Semente do laboratório"></label></div><button @click="generate"><Icon name="lucide:shuffle" />Gerar com estes valores</button></div>
      <button @click="emit('share')">Compartilhar esta sequência<Icon name="lucide:share-2" /></button><NuxtLink to="/comparar">Comparar nas três árvores<Icon name="lucide:chart-no-axes-column" /></NuxtLink>
    </section>
    <section v-else-if="settings.menuSection === 'examples'" class="menu-presets"><p>Observe desde a primeira inserção. Nenhum exemplo começa no resultado.</p><button v-for="preset in presets" :key="preset.id" @click="emit('preset', preset.ops, preset.type)"><div><strong>{{ preset.title }}</strong><span>{{ preset.description }}</span></div><Icon name="lucide:play" /></button></section>
    <section v-else-if="settings.menuSection === 'view'" class="menu-list"><p>As opções, a seção aberta e a semente ficam salvas neste dispositivo.</p><label class="switch-row">Tema<select v-model="settings.theme" aria-label="Tema do laboratório"><option value="dark">Escuro</option><option value="light">Claro</option><option value="auto">Dispositivo</option></select></label><label class="switch-row">Velocidade<select v-model.number="settings.speed" aria-label="Velocidade padrão"><option v-for="speed in [.5, 1, 1.5, 2, 4]" :key="speed" :value="speed">{{ speed }}×</option></select></label><label v-for="[field, label] in views" :key="field" class="switch-row">{{ label }}<SwitchRoot v-model="settings[field]" :aria-label="label" class="setting-switch"><SwitchThumb class="switch-thumb" /></SwitchRoot></label><button @click="emit('text')">Árvore como texto<Icon name="lucide:list" /></button></section>
    <section v-else class="menu-list"><h3>Percorrer</h3><p>Visite os nós e acompanhe a ordem da saída.</p><button v-for="[order, label] in [['in', 'In-ordem · esquerda, raiz, direita'], ['pre', 'Pré-ordem · raiz, esquerda, direita'], ['post', 'Pós-ordem · esquerda, direita, raiz'], ['level', 'Por profundidade']] as const" :key="order" @click="emit('operation', { t: 'walk', order })">{{ label }}<Icon name="lucide:list-ordered" /></button><h3>Consultar</h3><button @click="emit('operation', { t: 'min' })">Mínimo<Icon name="lucide:chevrons-left" /></button><button @click="emit('operation', { t: 'max' })">Máximo<Icon name="lucide:chevrons-right" /></button><p>Sucessor e predecessor usam o primeiro valor do campo.</p><button :disabled="!Number.isInteger(key) || !value.trim()" @click="emit('operation', { t: 'succ', k: key })">Sucessor de {{ value.trim() ? key : 'k' }}<Icon name="lucide:arrow-right" /></button><button :disabled="!Number.isInteger(key) || !value.trim()" @click="emit('operation', { t: 'pred', k: key })">Predecessor de {{ value.trim() ? key : 'k' }}<Icon name="lucide:arrow-left" /></button><button @click="emit('help')">Como usar<Icon name="lucide:help-circle" /></button><button @click="emit('legend')">Legenda<Icon name="lucide:info" /></button></section>
  </div>
</template>
<style scoped>
.lab-menu nav { display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:6px; padding-bottom:16px; position:sticky; top:0; background:var(--surface-1); z-index:1; }.lab-menu nav button { min-height:48px; border:1px solid var(--border); border-radius:10px; color:var(--muted); font-size:12px; }.lab-menu nav .active { background:var(--surface-3); color:var(--accent); border-color:var(--accent); }h3 { font-size:14px; margin:12px 0; }.lab-menu p { color:var(--muted); font-size:13px; line-height:1.6; margin:10px 0 16px; }.menu-heading { display:flex; align-items:center; justify-content:space-between; gap:8px; }.menu-heading button { color:var(--delete); min-height:48px; display:flex; align-items:center; gap:5px; font-size:12px; }.sequence-editor { display:grid; gap:8px; padding:0; list-style:none; }.sequence-editor li { display:grid; grid-template-columns:22px 1fr 70px; gap:6px; padding:8px; border:1px solid var(--border); border-radius:12px; background:var(--surface-2); align-items:center; }.operation-number { font:11px 'JetBrains Mono',monospace; color:var(--muted); }input,select { min-height:48px; min-width:0; width:100%; background:var(--bg); border:1px solid var(--border-strong); border-radius:8px; color:var(--text); padding:8px; font-size:14px; }.row-actions { grid-column:2/-1; display:flex; justify-content:flex-end; gap:8px; }.row-actions button { width:48px; height:44px; display:grid; place-items:center; border-radius:8px; border:1px solid var(--border); }.query-label { grid-column:2/-1; font-size:13px; }.menu-list>button,.menu-list>a,.generator>button { display:flex; align-items:center; justify-content:space-between; gap:12px; min-height:56px; width:100%; border-bottom:1px solid var(--border); font-size:14px; text-align:left; }.generator { padding:12px; margin-top:20px; border:1px solid var(--border); border-radius:12px; }.seed-inputs { display:grid; grid-template-columns:1fr 1fr; gap:12px; }.seed-inputs label { font-size:12px; color:var(--muted); }.seed-inputs input { margin-top:8px; }.switch-row { display:flex; align-items:center; justify-content:space-between; min-height:56px; gap:16px; font-size:14px; }.switch-row select { width:130px; }.setting-switch { flex-shrink:0; width:44px; height:26px; background:var(--surface-3); border:1px solid var(--border-strong); border-radius:999px; }.setting-switch[data-state='checked'] { background:var(--accent); }.switch-thumb { width:18px; height:18px; border-radius:999px; display:block; background:var(--text); margin-left:3px; transition:transform .2s; }.switch-thumb[data-state='checked'] { transform:translateX(18px); background:var(--bg); }.menu-presets>button { display:flex; align-items:center; justify-content:space-between; width:100%; gap:16px; text-align:left; padding:16px 8px; border-bottom:1px solid var(--border); }.menu-presets strong { display:block; font-size:14px; }.menu-presets span { display:block; font-size:12px; color:var(--muted); margin-top:6px; line-height:1.6; }button:disabled { opacity:.35; }.error { color:var(--delete)!important; }.lab-menu :deep(.iconify) { flex-shrink:0; width:18px; height:18px; }
@media(min-width:500px) { .sequence-editor li { grid-template-columns:22px 1fr 80px auto; }.row-actions { grid-column:auto; } }
</style>

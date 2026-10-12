<script setup lang="ts">
import { SwitchRoot, SwitchThumb } from 'reka-ui'
import { useSettingsStore } from '../stores/settings'
const { settings } = useSettingsStore()
const progressStore = useProgressStore()
const toast = useToast()
const resetting = ref(false)
const toggles = [
  { key: 'pauseOnKey', label: 'Pausar nos momentos-chave', description: 'Pare em casos, rotações e recolorações.' },
  { key: 'haptics', label: 'Resposta tátil', description: 'Vibração leve quando o aparelho permitir.' },
  { key: 'systemKeyboard', label: 'Teclado do sistema', description: 'Use o teclado do Android ou do computador.' },
  { key: 'keepKeyboard', label: 'Manter teclado aberto', description: 'Preserve o teclado após cada operação.' },
  { key: 'leftHanded', label: 'Modo canhoto', description: 'Ação principal mais perto do polegar esquerdo.' },
  { key: 'showNils', label: 'Mostrar folhas NIL', description: 'Folhas nulas pretas na Rubro-Negra.' },
  { key: 'showHeights', label: 'Mostrar alturas', description: 'Altura de cada nó, contada em arestas.' },
  { key: 'showColors', label: 'Letras R/N na Rubro-Negra', description: 'Uma indicação além da cor.' },
  { key: 'showLevels', label: 'Guias de nível', description: 'Veja a profundidade de cada camada.' },
  { key: 'reducedMotion', label: 'Reduzir movimento', description: 'Troque movimentos longos por realces curtos.' }
] as const
function resetProgress() { progressStore.reset(); resetting.value = false; toast.show('Progresso zerado. Suas sequências continuam disponíveis.') }
useSeoMeta({ title: 'Ajustes — TreeLab' })
</script>
<template>
  <div class="page-shell settings-page"><div class="page-header"><span class="eyebrow">DO SEU JEITO</span><h1>Ajustes</h1><p class="muted">Escolha como você prefere estudar.</p></div>
    <h2 class="section-title">Aparência</h2>
    <div class="setting-row"><label for="theme">Tema</label><select id="theme" v-model="settings.theme"><option value="dark">Escuro</option><option value="light">Claro</option><option value="auto">Sistema</option></select></div>
    <div class="setting-row"><label for="text-scale">Tamanho do texto</label><select id="text-scale" v-model="settings.textScale"><option :value=".9">Menor</option><option :value="1">Padrão</option><option :value="1.12">Maior</option><option :value="1.25">Bem maior</option></select></div>
    <h2 class="section-title">Reprodução</h2>
    <div class="setting-row"><label for="speed">Velocidade padrão</label><select id="speed" v-model="settings.speed"><option v-for="speed in [.5,1,1.5,2,4]" :key="speed" :value="speed">{{ speed }}×</option></select></div>
    <div class="setting-row"><label for="granularity">Granularidade</label><select id="granularity" v-model="settings.granularity"><option value="detailed">Detalhada</option><option value="summary">Resumida</option></select></div>
    <div v-for="toggle in toggles" :key="toggle.key" class="setting-row"><div><label :for="toggle.key">{{ toggle.label }}</label><p class="muted">{{ toggle.description }}</p></div><SwitchRoot :id="toggle.key" v-model="settings[toggle.key]" class="switch-root" :aria-label="toggle.label"><SwitchThumb class="switch-thumb" /></SwitchRoot></div>
    <h2 class="section-title">Seus dados</h2><p class="muted settings-note">Tudo fica neste dispositivo. Nenhuma conta, anúncio ou coleta de dados.</p><UiButton @click="resetting = true"><Icon name="lucide:rotate-ccw" /> Zerar progresso</UiButton>
    <div class="about panel"><Icon name="lucide:git-branch" size="26" /><h2>TreeLab <span class="mono muted">1.0.0</span></h2><p class="muted">Árvores, passo a passo. Feito para aprender.</p><a href="https://github.com/matheus-sperling/TreeLab" target="_blank" rel="noopener">Código-fonte no GitHub <Icon name="lucide:arrow-up-right" /></a></div>
    <UiBottomSheet v-model:open="resetting" title="Zerar o progresso?"><p class="muted settings-note">As lições concluídas, respostas e a sequência diária serão apagadas deste dispositivo.</p><UiButton variant="primary" @click="resetProgress">Zerar progresso</UiButton></UiBottomSheet>
  </div>
</template>
<style scoped>
.setting-row{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:16px 0;border-bottom:1px solid var(--border);min-height:72px}.setting-row label{font-size:.85rem;font-weight:550}.setting-row p{font-size:.73rem;line-height:1.6;margin-top:6px;max-width:270px}.setting-row select{max-width:155px;min-height:48px;padding:8px 12px;border:1px solid var(--border-strong);border-radius:12px;color:var(--text);background:var(--surface-2);font-size:.8rem}.switch-root{flex-shrink:0;min-width:56px;height:48px;border:0;background:transparent;padding:12px 2px;position:relative}.switch-root:before{content:'';position:absolute;inset:12px 2px;background:var(--border-strong);border-radius:99px}.switch-root[data-state='checked']:before{background:var(--accent)}.switch-thumb{display:block;position:relative;width:20px;height:20px;border-radius:50%;background:var(--text);transform:translateX(3px)}.switch-root[data-state='checked'] .switch-thumb{transform:translateX(29px);background:#0B0C10}.settings-note{font-size:.85rem;line-height:1.65;margin:12px 0 20px}.about{margin-top:32px;display:flex;flex-direction:column;gap:12px}.about>.iconify{color:var(--accent)}.about h2 span{font-size:.7rem;margin-left:8px}.about p{font-size:.8rem}.about a{min-height:48px;display:flex;align-items:center;gap:6px;font-size:.8rem;color:var(--accent)}
</style>

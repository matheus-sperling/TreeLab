<script setup lang="ts">
import type { usePlayer } from '../../composables/usePlayer'
import { computed } from 'vue'
import { useLabStore } from '../../stores/lab'
import { useSettingsStore } from '../../stores/settings'
import { useHaptics } from '../../composables/useHaptics'
import { motion } from 'motion-v'
const props = defineProps<{ player: ReturnType<typeof usePlayer>; compact?: boolean }>()
const lab = useLabStore(), settings = useSettingsStore().settings
const { tap } = useHaptics()
const value = computed({ get: () => lab.cursor, set: (value: number) => { tap(settings.haptics); props.player.seek(value) } })
function action(run: () => void) { tap(settings.haptics); run() }
function speed() { action(props.player.cycleSpeed); settings.speed = props.player.speed.value }
</script>
<template>
  <section class="player" :class="{ compact }" :aria-label="compact ? 'Reprodução nos detalhes do passo' : 'Controle da reprodução'">
    <div v-if="!compact && lab.operations.length" class="player-timeline"><UiSlider v-model="value" :min="lab.range[0] ?? 0" :max="lab.range[1] ?? 0" label="Passo da operação atual" /></div>
    <div class="player-buttons">
      <UiIconButton v-if="!compact" icon="skip-back" label="Início da operação; duas vezes para a anterior" :disabled="!lab.operations.length" @click="action(player.previous)" />
      <UiIconButton icon="chevron-left" label="Passo anterior" :disabled="lab.cursor <= 0" @pointerdown="player.hold(-1)" @pointerup="player.release" @pointerleave="player.release" @pointercancel="player.release" @click="action(() => player.move(-1))" />
      <motion.button class="play-button" type="button" :while-tap="settings.reducedMotion ? undefined : { scale: .94 }" :disabled="!lab.operations.length" :aria-label="player.playing.value ? 'Pausar' : 'Reproduzir'" @click="action(player.play)"><Icon :name="player.playing.value ? 'lucide:pause' : 'lucide:play'" /><span>{{ player.playing.value ? 'Pausar' : 'Reproduzir' }}</span></motion.button>
      <UiIconButton icon="chevron-right" label="Próximo passo" :disabled="lab.cursor >= lab.result.steps.length - 1" @pointerdown="player.hold(1)" @pointerup="player.release" @pointerleave="player.release" @pointercancel="player.release" @click="action(() => player.move(1))" />
      <UiIconButton v-if="!compact" icon="skip-forward" label="Fim da operação; novamente para a próxima" :disabled="!lab.operations.length" @click="action(player.next)" />
      <button v-if="!compact" class="speed-button" type="button" :aria-label="`Velocidade ${player.speed.value} vezes; tocar para alterar`" @click="speed">{{ player.speed.value }}×</button>
    </div>
  </section>
</template>
<style scoped>
.player { width:100%; padding:0; }.player-timeline { padding-inline:18px; }.player-timeline :deep(.ui-slider) { width:100%; margin:0; height:48px; min-height:48px; }.player-timeline :deep(.slider-thumb) { width:44px; height:44px; }.player-buttons { display:flex; align-items:center; gap:4px; height:56px; }.player-buttons :deep(.icon-button) { min-width:40px; width:40px; height:48px; flex-shrink:0; }.player-buttons :deep(.icon-button:hover:not(:disabled)) { background:var(--surface-2); color:var(--text); }.play-button { display:flex; align-items:center; justify-content:center; gap:6px; flex:1; min-width:76px; height:52px; border-radius:14px; background:var(--accent); color:var(--bg); font-size:12px; font-weight:650; }.play-button :deep(.iconify) { width:20px; height:20px; }.play-button:disabled { opacity:.4; }.speed-button { min-width:40px; height:44px; flex-shrink:0; border:1px solid var(--border); border-radius:10px; font:12px 'JetBrains Mono',monospace; color:var(--muted); }.compact .player-buttons { justify-content:center; }.compact .play-button { max-width:150px; }.compact { padding-top:8px; }
@media(max-width:379px) { .play-button { font-size:11px; gap:4px; }.player-buttons :deep(.icon-button) { min-width:36px; width:36px; }.speed-button { min-width:36px; } }
</style>

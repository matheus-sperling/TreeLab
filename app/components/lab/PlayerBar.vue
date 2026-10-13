<script setup lang="ts">
import type { usePlayer } from '../../composables/usePlayer'
import { computed } from 'vue'
import { useSettingsStore } from '../../stores/settings'
import { useHaptics } from '../../composables/useHaptics'
import { useLabStore } from '../../stores/lab'
import { motion } from 'motion-v'
const props = defineProps<{ player: ReturnType<typeof usePlayer>; compact?: boolean }>()
const lab = useLabStore()
const settings = useSettingsStore().settings
const haptics = useHaptics()
function feedback() { haptics.tap(settings.haptics) }
const value = computed({ get: () => lab.cursor, set: (value: number) => props.player.seek(value) })
</script>
<template>
  <section class="player" :class="{ compact }" :aria-label="compact ? 'Reprodução nos detalhes do passo' : 'Controle da reprodução'">
    <UiSlider v-if="!compact" v-model="value" :min="lab.range[0] ?? 0" :max="lab.range[1] ?? 0" label="Passo da operação atual" />
    <div class="player-buttons">
      <UiIconButton v-if="!compact" icon="skip-back" label="Início da operação; duas vezes para a anterior" :disabled="!lab.operations.length" @click="feedback(); player.previous()" />
      <UiIconButton icon="chevron-left" label="Passo anterior" :disabled="lab.cursor <= 0" @pointerdown="player.hold(-1)" @pointerup="player.release" @pointerleave="player.release" @pointercancel="player.release" @click="feedback(); player.move(-1)" />
      <motion.button class="play-button" type="button" :while-tap="{ scale: .96 }" :disabled="!lab.operations.length" :aria-label="player.playing.value ? 'Pausar' : 'Reproduzir'" @click="feedback(); player.play()"><Icon :name="player.playing.value ? 'lucide:pause' : 'lucide:play'" /><span>{{ player.playing.value ? 'Pausar' : 'Reproduzir' }}</span></motion.button>
      <UiIconButton icon="chevron-right" label="Próximo passo" :disabled="lab.cursor >= lab.result.steps.length - 1" @pointerdown="player.hold(1)" @pointerup="player.release" @pointerleave="player.release" @pointercancel="player.release" @click="feedback(); player.move(1)" />
      <UiIconButton v-if="!compact" icon="skip-forward" label="Fim da operação; novamente para a próxima" :disabled="!lab.operations.length" @click="feedback(); player.next()" />
      <button v-if="!compact" class="speed-button" type="button" :aria-label="`Velocidade ${player.speed.value} vezes; tocar para alterar`" @click="feedback(); player.cycleSpeed(); settings.speed = player.speed.value">{{ player.speed.value }}×</button>
    </div>
  </section>
</template>
<style scoped>
.player { width:100%; position:relative; padding-top:0; }.player :deep(.ui-slider) { position:relative; height:36px; margin:0; }.player-buttons { position: relative; }.player.compact { padding-top: 0; }.player-buttons { display: flex; justify-content: space-between; align-items: center; gap: 8px; height: 56px; }.play-button { height: 56px; width: 78px; flex-shrink: 0; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:3px; border-radius:14px; background: var(--accent); color: var(--bg); }.play-button :deep(.iconify) { width: 24px; height: 24px; }.play-button:disabled { opacity: .45; }.speed-button { min-width: 48px; min-height: 48px; font: 13px 'JetBrains Mono', monospace; color: var(--muted); border: 1px solid var(--border); border-radius: 12px; }.compact .player-buttons { justify-content: center; }@media (max-width: 379px) { .player-buttons { gap: 8px; }.player-buttons :deep(.icon-button) { min-width: 44px; width: 44px; }.speed-button { min-width: 44px; } }
.play-button span { font-size:10px; font-weight:600; }.player :deep(.slider-thumb) { width:18px; height:18px; }.player :deep(.slider-thumb)::before { content:""; position:absolute; inset:-13px; }.player-buttons { gap:4px; }.player-buttons :deep(.icon-button) { min-width:40px; width:40px; }.speed-button { min-width:40px; }
</style>

<script setup lang="ts">
import type { usePlayer } from '../../composables/usePlayer'
import { useLabStore } from '../../stores/lab'
import { motion } from 'motion-v'
const props = defineProps<{ player: ReturnType<typeof usePlayer>; compact?: boolean }>()
const lab = useLabStore()
const value = computed({ get: () => lab.cursor, set: (value: number) => props.player.seek(value) })
</script>
<template>
  <section class="player" :class="{ compact }" aria-label="Controle da reprodução">
    <UiSlider v-if="!compact" v-model="value" :min="lab.range[0] ?? 0" :max="lab.range[1] ?? 0" label="Passo da operação atual" />
    <div class="player-buttons">
      <UiIconButton v-if="!compact" icon="skip-back" label="Início da operação; duas vezes para a anterior" :disabled="!lab.operations.length" @click="player.previous" />
      <UiIconButton icon="chevron-left" label="Passo anterior" :disabled="lab.cursor <= 0" @pointerdown="player.hold(-1)" @pointerup="player.release" @pointerleave="player.release" @pointercancel="player.release" @click="player.move(-1)" />
      <motion.button class="play-button" type="button" :while-tap="{ scale: .96 }" :disabled="!lab.operations.length" :aria-label="player.playing.value ? 'Pausar' : 'Reproduzir'" @click="player.play"><Icon :name="player.playing.value ? 'lucide:pause' : 'lucide:play'" /></motion.button>
      <UiIconButton icon="chevron-right" label="Próximo passo" :disabled="lab.cursor >= lab.result.steps.length - 1" @pointerdown="player.hold(1)" @pointerup="player.release" @pointerleave="player.release" @pointercancel="player.release" @click="player.move(1)" />
      <UiIconButton v-if="!compact" icon="skip-forward" label="Fim da operação; novamente para a próxima" :disabled="!lab.operations.length" @click="player.next" />
      <button v-if="!compact" class="speed-button" type="button" :aria-label="`Velocidade ${player.speed.value} vezes; tocar para alterar`" @click="player.cycleSpeed()">{{ player.speed.value }}×</button>
    </div>
  </section>
</template>
<style scoped>
.player { width: 100%; position: relative; padding-top: 20px; }.player :deep(.ui-slider) { position: absolute; top: -12px; height: 44px; }.player-buttons { position: relative; }.player.compact { padding-top: 0; }.player-buttons { display: flex; justify-content: space-between; align-items: center; gap: 8px; height: 56px; }.play-button { height: 56px; width: 56px; flex-shrink: 0; display: grid; place-items: center; border-radius: 18px; background: var(--accent); color: var(--bg); }.play-button :deep(.iconify) { width: 24px; height: 24px; }.play-button:disabled { opacity: .45; }.speed-button { min-width: 48px; min-height: 48px; font: 13px 'JetBrains Mono', monospace; color: var(--muted); border: 1px solid var(--border); border-radius: 12px; }.compact .player-buttons { justify-content: center; }@media (max-width: 379px) { .player-buttons { gap: 4px; }.player-buttons :deep(.icon-button) { min-width: 44px; width: 44px; }.speed-button { min-width: 44px; } }
</style>

<script setup lang="ts">
import { SliderRoot, SliderTrack, SliderRange, SliderThumb } from 'reka-ui'
const model = defineModel<number>({ default: 0 })
withDefaults(defineProps<{ min?: number; max: number; label?: string }>(), { min: 0, label: 'Linha do tempo' })
</script>
<template><SliderRoot :model-value="[model]" :min="min" :max="Math.max(max, min + 1)" :step="1" class="ui-slider" @update:model-value="model = $event?.[0] ?? min"><SliderTrack class="slider-track"><SliderRange class="slider-range" /></SliderTrack><SliderThumb class="slider-thumb" :aria-label="label" /></SliderRoot></template>

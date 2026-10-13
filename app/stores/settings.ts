import { defineStore } from 'pinia'
import { reactive, ref, watch } from 'vue'
export interface Settings {
  theme: 'auto' | 'dark' | 'light'; textScale: number; speed: number; granularity: 'detailed' | 'summary'
  pauseOnKey: boolean; haptics: boolean; systemKeyboard: boolean; leftHanded: boolean; showNils: boolean
  showHeights: boolean; showColors: boolean; showLevels: boolean; reducedMotion: boolean; keepKeyboard: boolean
  labMenuSection: 'examples' | 'explore' | 'options'; randomSeed: number; randomCount: number
}
export const defaultSettings: Settings = {
  theme: 'dark', textScale: 1, speed: 1, granularity: 'detailed', pauseOnKey: false, haptics: true,
  systemKeyboard: false, leftHanded: false, showNils: false, showHeights: false, showColors: true,
  showLevels: false, reducedMotion: false, keepKeyboard: false, labMenuSection: 'examples', randomSeed: 42, randomCount: 7,
}
const booleanFields = ['pauseOnKey', 'haptics', 'systemKeyboard', 'leftHanded', 'showNils', 'showHeights', 'showColors', 'showLevels', 'reducedMotion', 'keepKeyboard'] as const
export const useSettingsStore = defineStore('settings', () => {
  const settings = reactive<Settings>({ ...defaultSettings })
  const ready = ref(false)
  function apply() {
    const theme = settings.theme === 'auto' ? (matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark') : settings.theme
    document.documentElement.dataset.theme = theme
    document.documentElement.dataset.reducedMotion = String(settings.reducedMotion)
    document.documentElement.style.setProperty('--text-scale', String(settings.textScale))
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' ? '#0B0C10' : '#F6F7FA')
  }
  function load() {
    if (ready.value) return
    try {
      const saved = JSON.parse(localStorage.getItem('treelab:settings') || '{}') as Partial<Settings> | null
      if (saved && typeof saved === 'object') {
        for (const field of booleanFields) if (typeof saved[field] === 'boolean') settings[field] = saved[field]
        if (saved.theme && ['auto', 'dark', 'light'].includes(saved.theme)) settings.theme = saved.theme
        if (saved.granularity && ['detailed', 'summary'].includes(saved.granularity)) settings.granularity = saved.granularity
        if (saved.labMenuSection && ['examples', 'explore', 'options'].includes(saved.labMenuSection)) settings.labMenuSection = saved.labMenuSection
        if (saved.speed !== undefined && [.5, 1, 1.5, 2, 4].includes(saved.speed)) settings.speed = saved.speed
        if (saved.textScale !== undefined && [.9, 1, 1.12, 1.25].includes(saved.textScale)) settings.textScale = saved.textScale
        if (typeof saved.randomSeed === 'number' && Number.isInteger(saved.randomSeed) && saved.randomSeed >= 0 && saved.randomSeed <= 4294967295) settings.randomSeed = saved.randomSeed
        if (typeof saved.randomCount === 'number' && Number.isInteger(saved.randomCount) && saved.randomCount >= 1 && saved.randomCount <= 63) settings.randomCount = saved.randomCount
      }
    } catch { /* Configurações antigas inválidas voltam ao padrão. */ }
    ready.value = true; apply()
    watch(settings, () => { try { localStorage.setItem('treelab:settings', JSON.stringify(settings)) } catch { /* As preferências continuam válidas durante esta sessão. */ } apply() }, { deep: true })
    matchMedia('(prefers-color-scheme: light)').addEventListener('change', apply)
  }
  function reset() { Object.assign(settings, defaultSettings) }
  return { settings, ready, load, reset }
})

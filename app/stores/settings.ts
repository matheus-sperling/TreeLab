import { defineStore } from 'pinia'
export interface Settings { theme: 'auto' | 'dark' | 'light'; textScale: number; speed: number; granularity: 'detailed' | 'summary'; pauseOnKey: boolean; haptics: boolean; systemKeyboard: boolean; leftHanded: boolean; showNils: boolean; showHeights: boolean; showColors: boolean; showLevels: boolean; reducedMotion: boolean; keepKeyboard: boolean }
export const defaultSettings: Settings = { theme: 'dark', textScale: 1, speed: 1, granularity: 'detailed', pauseOnKey: false, haptics: true, systemKeyboard: false, leftHanded: false, showNils: false, showHeights: false, showColors: true, showLevels: false, reducedMotion: false, keepKeyboard: false }
export const useSettingsStore = defineStore('settings', () => {
  const settings = reactive<Settings>({ ...defaultSettings })
  const ready = ref(false)
  function apply() {
    const theme = settings.theme === 'auto' ? (matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark') : settings.theme
    document.documentElement.dataset.theme = theme
    document.documentElement.style.setProperty('--text-scale', String(settings.textScale))
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' ? '#0B0C10' : '#F6F7FA')
  }
  function load() {
    if (ready.value) return
    try { const saved: Partial<Settings> = JSON.parse(localStorage.getItem('treelab:settings') || '{}'); Object.assign(settings, saved) } catch { /* Configurações antigas inválidas voltam ao padrão. */ }
    ready.value = true; apply()
    watch(settings, () => { localStorage.setItem('treelab:settings', JSON.stringify(settings)); apply() }, { deep: true })
    matchMedia('(prefers-color-scheme: light)').addEventListener('change', apply)
  }
  function reset() { Object.assign(settings, defaultSettings) }
  return { settings, ready, load, reset }
})

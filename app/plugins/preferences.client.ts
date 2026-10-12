import { useSettingsStore } from '../stores/settings'
import { useProgressStore } from '../stores/progress'
export default defineNuxtPlugin(nuxtApp => { nuxtApp.hook('app:mounted', () => { useSettingsStore().load(); useProgressStore().load() }) })

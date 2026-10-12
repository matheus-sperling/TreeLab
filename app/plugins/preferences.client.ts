import { useSettingsStore } from '../stores/settings'
import { useProgressStore } from '../stores/progress'
export default defineNuxtPlugin(() => { useSettingsStore().load(); useProgressStore().load() })

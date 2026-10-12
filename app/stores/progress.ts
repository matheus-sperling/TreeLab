import { defineStore } from 'pinia'
interface Progress { completedLessons: string[]; answers: number; correct: number; streak: number; lastDate: string; errors: Record<string, number> }
const fresh = (): Progress => ({ completedLessons: [], answers: 0, correct: 0, streak: 0, lastDate: '', errors: {} })
export const useProgressStore = defineStore('progress', () => {
  const progress = reactive<Progress>(fresh())
  const ready = ref(false)
  function save() { try { localStorage.setItem('treelab:progress', JSON.stringify(progress)) } catch { /* O estudo continua quando o navegador não permite persistência. */ } }
  function load() { if (ready.value) return; try { Object.assign(progress, JSON.parse(localStorage.getItem('treelab:progress') || '{}')) } catch { /* Dados corrompidos não impedem estudo. */ } ready.value = true }
  function complete(slug: string) { if (!progress.completedLessons.includes(slug)) { progress.completedLessons.push(slug); save() } }
  function answer(correct: boolean, topic: string) {
    progress.answers++; if (correct) progress.correct++; else progress.errors[topic] = (progress.errors[topic] || 0) + 1
    const today = new Date().toISOString().slice(0, 10)
    if (progress.lastDate !== today) { const previous = new Date(); previous.setUTCDate(previous.getUTCDate() - 1); progress.streak = progress.lastDate === previous.toISOString().slice(0, 10) ? progress.streak + 1 : 1; progress.lastDate = today }
    save()
  }
  function reset() { Object.assign(progress, fresh()); save() }
  return { progress, load, complete, answer, reset }
})

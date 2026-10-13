interface ToastItem { id: number; message: string; action?: { label: string; run: () => void } }
const toasts = ref<ToastItem[]>([])
const suspended = ref(false)
let nextId = 0
export function useToast() {
  function dismiss(id: number) { toasts.value = toasts.value.filter(t => t.id !== id) }
  function show(message: string, action?: ToastItem['action']) {
    const id = ++nextId
    toasts.value = [...toasts.value.slice(-2), { id, message, action }]
    setTimeout(() => dismiss(id), 3000)
  }
  return { toasts, show, dismiss, suspended }
}

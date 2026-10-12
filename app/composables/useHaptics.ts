export function useHaptics() {
  function tap(enabled = true) {
    if (enabled && typeof navigator !== 'undefined' && 'vibrate' in navigator) navigator.vibrate(8)
  }
  return { tap }
}

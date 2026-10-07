export const UPDATE_EVENT = 'api-cuaderno:update-available'

export function registerServiceWorker(): void {
  if (!('serviceWorker' in navigator)) return
  navigator.serviceWorker.register('./sw.js').then(reg => {
    if (reg.waiting) window.dispatchEvent(new Event(UPDATE_EVENT))
    reg.addEventListener('updatefound', () => {
      const worker = reg.installing
      if (!worker) return
      worker.addEventListener('statechange', () => {
        if (worker.state === 'installed' && navigator.serviceWorker.controller) window.dispatchEvent(new Event(UPDATE_EVENT))
      })
    })
  }).catch(() => undefined)
}

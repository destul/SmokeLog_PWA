import { registerSW } from 'virtual:pwa-register'

let updateServiceWorker: ((reloadPage?: boolean) => Promise<void>) | undefined

export function setupPwaUpdates(onReady: () => void): () => void {
  updateServiceWorker = registerSW({
    immediate: true,
    onNeedRefresh: onReady,
  })
  return () => {
    updateServiceWorker = undefined
  }
}

export async function applyPwaUpdate(): Promise<void> {
  await updateServiceWorker?.(true)
}

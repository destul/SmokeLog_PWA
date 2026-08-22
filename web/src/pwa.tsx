import { useEffect, useState } from 'react'
import { applyPwaUpdate, setupPwaUpdates } from './pwa-runtime'

type PwaUpdatePromptProps = {
  onUpdate: () => void
  onDismiss: () => void
}

export function PwaUpdatePrompt({ onUpdate, onDismiss }: PwaUpdatePromptProps) {
  return <section className="pwa-update" role="status"><p>Доступна нова версія</p><div className="form-actions"><button type="button" onClick={onUpdate}>Оновити</button><button type="button" className="text-button" onClick={onDismiss}>Пізніше</button></div></section>
}

export function PwaUpdateNotice() {
  const [available, setAvailable] = useState(false)

  useEffect(() => setupPwaUpdates(() => setAvailable(true)), [])
  if (!available) return null
  return <PwaUpdatePrompt onUpdate={() => void applyPwaUpdate()} onDismiss={() => setAvailable(false)} />
}

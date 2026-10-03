import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

try {
  document.documentElement.dataset.theme = localStorage.getItem('imperium-os:tema') || 'dark'
} catch {
  document.documentElement.dataset.theme = 'dark'
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// App instalable: el service worker solo en producción (en desarrollo estorba al recargar).
// Cuando hay una versión nueva publicada, la app se actualiza sola: la instalada en el
// iPhone casi nunca se cierra del todo, y sin esto se quedaba días con el código viejo.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  let recargando = false
  const habiaUno = !!navigator.serviceWorker.controller // la primera instalación no recarga
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (recargando || !habiaUno) return
    recargando = true
    location.reload()
  })
  window.addEventListener('load', async () => {
    const reg = await navigator.serviceWorker.register('/sw.js', { updateViaCache: 'none' })
    const revisar = () => void reg.update().catch(() => {})
    document.addEventListener('visibilitychange', () => document.visibilityState === 'visible' && revisar())
    setInterval(revisar, 5 * 60_000)
  })
}

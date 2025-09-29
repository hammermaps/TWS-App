import 'bootstrap/dist/css/bootstrap.min.css'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import './api' // initializes axios and axios-mock-adapter in dev

// Start MSW in development (browser only)
if (import.meta.env.DEV && typeof window !== 'undefined') {
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  import('./mocks/browser')
    .then(({ worker }) => {
      worker.start().then(() => console.log('[msw] worker started'))
    })
    .catch((err) => {
      console.warn('MSW failed to start', err)
    })
}

// PWA service worker registration (vite-plugin-pwa)
// Uses the runtime helper injected by VitePWA: 'virtual:pwa-register'
try {
  // Avoid top-level await: use dynamic import with then()
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  import('virtual:pwa-register')
    .then((mod) => {
      const { registerSW } = mod

      // Define callbacks as constants so static analysis sees they are used
      const onNeedRefresh = () => {
        // Simple update prompt
        if (confirm('Es gibt ein Update. Seite jetzt neu laden?')) {
          // reload to get the new version
          window.location.reload()
        }
      }

      const onOfflineReady = () => {
        console.log('App is ready to work offline')
      }

      registerSW({
        immediate: true,
        onNeedRefresh,
        onOfflineReady,
      })
    })
    .catch(() => {
      // no-op if registration fails
    })
} catch (e) {
  // no-op
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

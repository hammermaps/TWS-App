import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from './App.vue'
import router from './router'
import i18n from './i18n'

import CoreuiVue from '@coreui/vue'
import CIcon from '@coreui/icons-vue'
import { iconsSet as icons } from '@/assets/icons'

// PWA Service Worker Registration
import { registerSW } from 'virtual:pwa-register'

// Storage migration from localStorage to IndexedDB
import { migrateLocalStorageToIndexedDB } from '@/utils/StorageMigration.js'

// Online-Status-Store
import { useOnlineStatusStore } from '@/stores/OnlineStatus.js'

// CORS-Debug-Tool für Development-Modus einbinden
if (import.meta.env.DEV) {
  import('./utils/CorsDebugger.js').then(module => {
    window.corsDebugger = module.corsDebugger
    window.testCors = () => module.corsDebugger.diagnose()
    window.testAllEndpoints = () => module.corsDebugger.testAllEndpoints()
    window.testLogin = (username, password) => {
      if (username && password) {
        return module.corsDebugger.testLoginWithCredentials(username, password)
      }
      return module.corsDebugger.testLogin()
    }
    window.testHealthPing = () => module.corsDebugger.testHealthPing()
    window.testCheckToken = (token) => module.corsDebugger.testCheckToken(token)

    console.log('🔧 CORS-Debug-Tool geladen. Verfügbare Konsolen-Befehle:')
    console.log('  testCors()                    - Basis CORS-Test')
    console.log('  testAllEndpoints()            - Alle API-Endpunkte testen')
    console.log('  testLogin("user", "pass")     - Login testen')
    console.log('  testHealthPing()              - Health Ping testen')
    console.log('  testCheckToken("token")       - Token validieren')
    console.log('  corsDebugger.checkCookies()   - Cookie-Status anzeigen')
  })
}

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(router)
app.use(i18n)
app.use(CoreuiVue)
app.provide('icons', icons)
app.component('CIcon', CIcon)

// Run storage migration before mounting the app
migrateLocalStorageToIndexedDB().then((result) => {
  if (result.success) {
    if (result.alreadyMigrated) {
      console.log('✓ Storage already using IndexedDB')
    } else {
      console.log('✅ Successfully migrated from localStorage to IndexedDB:', result.migrated)
    }
  } else {
    console.warn('⚠️ Storage migration failed, app will continue with IndexedDB:', result.error)
  }
  
  // Mount the app after migration
  app.mount('#app')
  
  // PWA Service Worker registrieren
  const updateSW = registerSW({
    onNeedRefresh() {
      console.log('🔄 Neue Version verfügbar')
    },
    onOfflineReady() {
      console.log('📴 App ist offline-bereit')
    },
    immediate: true
  })
  
  // Online-Status-Store initialisieren (async)
  onlineStatusStore.initialize().catch(error => {
    console.error('❌ Error initializing online status store:', error)
  })
  
  // Cleanup beim Beenden
  window.addEventListener('beforeunload', () => {
    onlineStatusStore.cleanup()
  })
}).catch((error) => {
  console.error('❌ Critical error during storage migration:', error)
  // Still mount the app even if migration fails
  app.mount('#app')
})


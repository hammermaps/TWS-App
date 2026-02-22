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

// Config Storage
import configStorage from '@/stores/ConfigStorage.js'

// API Config Helper für In-Memory Cache
import { initApiConfigCache, refreshApiConfigCache } from '@/utils/ApiConfigHelper.js'

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
  }).catch(err => {
    console.warn('⚠️ CORS-Debug-Tool konnte nicht geladen werden:', err)
  })
}

// Global flag to prevent double mounting
let appMounted = false
let onlineStatusStoreInstance = null

// Async initialization function
async function initializeApp() {
  if (appMounted) {
    console.warn('⚠️ App is already mounted, skipping re-mount')
    return
  }

  try {
    // Step 1: Run storage migration
    const migrationResult = await migrateLocalStorageToIndexedDB()
    if (migrationResult.success) {
      if (migrationResult.alreadyMigrated) {
        console.log('✓ Storage already using IndexedDB')
      } else {
        console.log('✅ Successfully migrated from localStorage to IndexedDB:', migrationResult.migrated)
      }
    } else {
      console.warn('⚠️ Storage migration failed, app will continue with IndexedDB:', migrationResult.error)
    }

    // Step 1.5: Initialize ConfigStorage
    try {
      await configStorage.init()
    } catch (error) {
      console.warn('⚠️ ConfigStorage init failed:', error)
    }

    // Step 1.6: Initialize API Config Cache (für synchronen Zugriff)
    try {
      await initApiConfigCache()
      // Mache refreshApiConfigCache global verfügbar
      window.refreshApiConfigCache = refreshApiConfigCache
    } catch (error) {
      console.warn('⚠️ API Config Cache init failed:', error)
    }

    // Step 2: Create Vue app
    const app = createApp(App)
    const pinia = createPinia()

    // Step 3: Register plugins
    app.use(pinia)
    app.use(router)
    app.use(i18n)
    app.use(CoreuiVue)
    app.provide('icons', icons)
    app.component('CIcon', CIcon)

    // Step 4: Mount the app
    appMounted = true
    app.mount('#app')
    console.log('✅ App mounted successfully')

    // Step 5: Initialize online status store (after mount)
    try {
      onlineStatusStoreInstance = useOnlineStatusStore()
      await onlineStatusStoreInstance.initialize()
      console.log('✅ Online status store initialized')
    } catch (error) {
      console.error('❌ Error initializing online status store:', error)
    }

    // Step 6: Register PWA Service Worker
    try {
      const updateSW = registerSW({
        onNeedRefresh() {
          console.log('🔄 Neue Version verfügbar')
        },
        onOfflineReady() {
          console.log('📴 App ist offline-bereit')
        },
        immediate: true
      })
      console.log('✅ PWA Service Worker registered')
    } catch (error) {
      console.warn('⚠️ PWA Service Worker registration failed:', error)
    }

    // Step 7: Cleanup on page unload
    window.addEventListener('beforeunload', () => {
      if (onlineStatusStoreInstance) {
        onlineStatusStoreInstance.cleanup()
      }
    })

  } catch (error) {
    console.error('❌ Critical error during app initialization:', error)

    // Try to mount app anyway to show error page
    if (!appMounted) {
      try {
        const app = createApp(App)
        const pinia = createPinia()
        app.use(pinia)
        app.use(router)
        app.use(i18n)
        app.use(CoreuiVue)
        app.provide('icons', icons)
        app.component('CIcon', CIcon)

        appMounted = true
        app.mount('#app')
        console.log('✅ App mounted after error recovery')
      } catch (mountError) {
        console.error('❌ Failed to mount app even in error recovery:', mountError)
      }
    }
  }
}

// Start initialization
initializeApp()


<script setup>
import { onBeforeMount, onMounted, onUnmounted, watch } from 'vue'
import { useColorModes } from '@coreui/vue'

import { useThemeStore } from '@/stores/theme.js'
import BuildingStorage from '@/stores/BuildingStorage'
import { ApiBuilding } from '@/api/ApiBuilding'
import { useConfigStorage } from '@/stores/ConfigStorage.js'
import { useConfigSyncService } from '@/services/ConfigSyncService.js'
import { useAutoSyncService } from '@/services/AutoSyncService.js'
import { getToken } from '@/stores/GlobalToken.js'
import indexedDBHelper, { STORES } from '@/utils/IndexedDBHelper.js'
import { currentUser, initUserFromLocalStorage } from '@/stores/GlobalUser.js'
import { changeLanguage } from '@/i18n/index.js'

const { isColorModeSet, setColorMode } = useColorModes(
  'coreui-free-vue-admin-template-theme',
)
const currentTheme = useThemeStore()

// Preload Gebäude beim App-Start
const preloadBuildings = async () => {
  try {
    const apiBuilding = new ApiBuilding()
    const response = await apiBuilding.list({ timeout: 30000 })

    if (response.items && response.items.length > 0) {
      BuildingStorage.saveBuildings(response.items)
      await indexedDBHelper.set(STORES.METADATA, { key: 'buildings_timestamp', value: Date.now().toString() })
      console.log('✅ Gebäude erfolgreich vorgeladen:', response.items.length)
    }
  } catch (error) {
    // Fehler beim Preload sind nicht kritisch
    console.warn('⚠️ Gebäude-Preload fehlgeschlagen:', error.message)
  }
}

// Config-Synchronisation beim App-Start
const syncConfigOnStartup = async () => {
  try {
    const configStorage = useConfigStorage()
    const config = configStorage.loadConfig()

    // Prüfe ob syncOnStartup aktiviert ist
    if (config?.sync?.syncOnStartup && navigator.onLine) {
      console.log('🔄 Config-Synchronisation beim Start aktiviert')
      const configSync = useConfigSyncService()

      // Prüfe ob es ausstehende Änderungen gibt
      if (configSync.hasPending()) {
        console.log('📤 Synchronisiere ausstehende Config-Änderungen...')
        const result = await configSync.syncPending()

        if (result.success) {
          console.log(`✅ Config-Synchronisation erfolgreich: ${result.synced} Items`)
        } else {
          console.warn('⚠️ Config-Synchronisation teilweise fehlgeschlagen:', result)
        }
      } else {
        console.log('✅ Keine ausstehenden Config-Änderungen')
      }
    }
  } catch (error) {
    console.warn('⚠️ Fehler bei Config-Synchronisation beim Start:', error)
  }
}

// Auto-Sync Service starten
const autoSyncService = useAutoSyncService()

const startAutoSync = () => {
  try {
    const configStorage = useConfigStorage()
    const config = configStorage.loadConfig()

    // Prüfe ob autoSync aktiviert ist
    if (config?.sync?.autoSync && config?.sync?.syncInterval > 0) {
      console.log(`🔄 Starte automatische Synchronisation (Intervall: ${config.sync.syncInterval} Min.)`)
      autoSyncService.start(config.sync.syncInterval)
    }
  } catch (error) {
    console.warn('⚠️ Fehler beim Starten der automatischen Synchronisation:', error)
  }
}

// Farbschema und Sprache folgen der Einstellung des DKC-Benutzerprofils
// (users.data.theme_mode / users.language, siehe twsFmtUser() in api.php) -
// reagiert auf jede Änderung von currentUser (Login, oder beim App-Start aus
// IndexedDB geladener Cache via initUserFromLocalStorage() unten), damit
// nicht wie beim Header-Avatar erst eine andere Seite besucht werden muss.
watch(() => currentUser.value?.theme_mode, (mode) => {
  if (mode) setColorMode(mode)
})
watch(() => currentUser.value?.language, (lang) => {
  if (lang) changeLanguage(lang)
})

onBeforeMount(() => {
  // Gecachten Benutzer (falls vorhanden) laden, damit obige Watcher auch ohne
  // frischen Login-Aufruf greifen (bereits eingeloggte Sessions/Token).
  initUserFromLocalStorage()

  const urlParams = new URLSearchParams(window.location.href.split('?')[1])
  let theme = urlParams.get('theme')

  if (theme !== null && theme.match(/^[A-Za-z0-9\s]+/)) {
    theme = theme.match(/^[A-Za-z0-9\s]+/)[0]
  }

  if (theme) {
    setColorMode(theme)
    return
  }

  if (isColorModeSet()) {
    return
  }

  setColorMode(currentTheme.theme)

  // Starte Preloading im Hintergrund (non-blocking) nur wenn ein Token vorhanden ist
  try {
    if (getToken()) {
      preloadBuildings()
    } else {
      console.log('⏭️ Gebäude-Preload übersprungen: kein gültiges Login (Token fehlt)')
    }
  } catch (e) {
    console.warn('⚠️ Fehler beim Prüfen des Token-Status vor Preload:', e)
  }
})

onMounted(() => {
  // Config-Synchronisation beim Start (nach dem Mount)
  syncConfigOnStartup()

  // Starte automatische Synchronisation
  startAutoSync()
})

onUnmounted(() => {
  // Stoppe automatische Synchronisation beim Beenden
  autoSyncService.stop()
})
</script>

<template>
  <router-view />
</template>

<style lang="scss">
// Import Main styles for this application
@use 'styles/style';
// We use those styles to show code examples, you should remove them in your application.
@use 'styles/examples';
</style>

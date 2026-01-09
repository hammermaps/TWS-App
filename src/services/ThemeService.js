/**
 * ThemeService.js
 * Service zur Synchronisation des Design-Themes zwischen Header und Settings
 */

import { ref } from 'vue'
import { useColorModes } from '@coreui/vue'
import { useConfigStorage } from '@/stores/ConfigStorage.js'
import { useApiConfig } from '@/api/ApiConfig.js'
import { useOnlineStatusStore } from '@/stores/OnlineStatus.js'

class ThemeService {
  constructor() {
    this.currentTheme = ref('auto')
    this.isInitialized = ref(false)
    this.colorModeInstance = null
  }

  /**
   * Initialisiert den Theme-Service mit CoreUI ColorModes
   */
  initialize() {
    if (this.isInitialized.value) return

    // Lade Theme aus Konfiguration
    const configStorage = useConfigStorage()
    const config = configStorage.loadConfig()

    if (config && config.ui && config.ui.theme) {
      this.currentTheme.value = config.ui.theme
    }

    this.isInitialized.value = true
    console.log('🎨 ThemeService initialisiert mit Theme:', this.currentTheme.value)
  }

  /**
   * Setzt das Theme und synchronisiert es
   * @param {string} theme - 'light', 'dark', oder 'auto'
   * @param {Function} setColorMode - CoreUI setColorMode Funktion
   */
  async setTheme(theme, setColorMode = null) {
    if (!['light', 'dark', 'auto'].includes(theme)) {
      console.warn('⚠️ Ungültiges Theme:', theme)
      return false
    }

    console.log('🎨 Setze Theme auf:', theme)
    this.currentTheme.value = theme

    // Aktualisiere CoreUI ColorMode (falls übergeben)
    if (setColorMode) {
      setColorMode(theme)
    }

    // Speichere in Konfiguration und synchronisiere zum Server
    await this.syncThemeToServer(theme)

    return true
  }

  /**
   * Synchronisiert das Theme zur Server-Konfiguration
   */
  async syncThemeToServer(theme) {
    try {
      const configStorage = useConfigStorage()
      const onlineStatusStore = useOnlineStatusStore()
      const apiConfig = useApiConfig()

      // Lade aktuelle Konfiguration
      let config = configStorage.loadConfig()

      // Wenn keine Config vorhanden, erstelle Standard-Config
      if (!config) {
        config = {
          server: { apiTimeout: 5000, maxRetries: 3 },
          ui: { theme: 'auto', language: 'de', dateFormat: 'DD.MM.YYYY', compactMode: false },
          notifications: { enabled: true, sound: true, flushReminders: true, syncStatus: true },
          sync: { autoSync: true, syncInterval: 15, syncOnStartup: true, wifiOnly: false }
        }
      }

      // Aktualisiere Theme in Config
      if (!config.ui) config.ui = {}
      config.ui.theme = theme

      // Speichere lokal
      configStorage.saveConfig(config)
      console.log('💾 Theme lokal gespeichert:', theme)

      // Synchronisiere zum Server wenn online
      if (onlineStatusStore.isFullyOnline) {
        console.log('🔄 Synchronisiere Theme zum Server...')
        const result = await apiConfig.set(config)

        if (result) {
          console.log('✅ Theme erfolgreich zum Server synchronisiert')
          return { success: true, online: true }
        } else {
          console.warn('⚠️ Theme-Synchronisation fehlgeschlagen')
          return { success: false, online: true, error: 'API-Fehler' }
        }
      } else {
        console.log('📦 Offline - Theme wird bei nächster Verbindung synchronisiert')
        // Füge zur Sync-Queue hinzu (wird bei nächster Online-Verbindung synchronisiert)
        return { success: true, online: false }
      }
    } catch (error) {
      console.error('❌ Fehler bei Theme-Synchronisation:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * Lädt das Theme aus der Konfiguration
   */
  loadTheme() {
    const configStorage = useConfigStorage()
    const config = configStorage.loadConfig()

    if (config && config.ui && config.ui.theme) {
      this.currentTheme.value = config.ui.theme
      console.log('📖 Theme aus Konfiguration geladen:', this.currentTheme.value)
      return this.currentTheme.value
    }

    return 'auto'
  }

  /**
   * Gibt das aktuelle Theme zurück
   */
  getTheme() {
    return this.currentTheme.value
  }
}

// Singleton-Instanz
const themeService = new ThemeService()

/**
 * Vue Composable für Theme-Synchronisation
 */
export function useThemeSync() {
  const { colorMode, setColorMode } = useColorModes('coreui-free-vue-admin-template-theme')

  // Initialisiere Service
  if (!themeService.isInitialized.value) {
    themeService.initialize()

    // Setze initialen ColorMode
    const savedTheme = themeService.getTheme()
    if (savedTheme && savedTheme !== colorMode.value) {
      setColorMode(savedTheme)
    }
  }

  /**
   * Ändert das Theme und synchronisiert es
   */
  const changeTheme = async (theme) => {
    return await themeService.setTheme(theme, setColorMode)
  }

  /**
   * Lädt das Theme aus der Konfiguration und wendet es an
   */
  const loadAndApplyTheme = () => {
    const theme = themeService.loadTheme()
    if (theme !== colorMode.value) {
      setColorMode(theme)
    }
    return theme
  }

  /**
   * Synchronisiert das aktuelle ColorMode-Theme zur Config
   */
  const syncCurrentTheme = async () => {
    return await themeService.syncThemeToServer(colorMode.value)
  }

  return {
    colorMode,
    currentTheme: themeService.currentTheme,
    changeTheme,
    loadAndApplyTheme,
    syncCurrentTheme,
    setColorMode
  }
}

export default themeService


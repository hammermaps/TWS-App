/**
 * LanguageService.js
 * Service zur Verwaltung der Spracheinstellungen
 */

import { ref } from 'vue'
import i18n, { changeLanguage, availableLocales } from '@/i18n'
import { useConfigStorage } from '@/stores/ConfigStorage.js'
import { useApiConfig } from '@/api/ApiConfig.js'

const SUPPORTED_LOCALES = availableLocales.map(l => l.code)

export function useLanguageService() {
  const configStorage = useConfigStorage()
  const apiConfig = useApiConfig()

  const currentLanguage = ref(i18n.global.locale.value)
  const isChanging = ref(false)

  /**
   * Ändert die Sprache und synchronisiert zum Server
   * @param {string} newLanguage - Neue Sprache (Code aus availableLocales)
   * @param {boolean} syncToServer - Ob zum Server synchronisiert werden soll
   */
  const setLanguage = async (newLanguage, syncToServer = true) => {
    if (newLanguage === currentLanguage.value) {
      return true
    }

    if (!SUPPORTED_LOCALES.includes(newLanguage)) {
      console.warn('❌ Ungültige Sprache:', newLanguage)
      return false
    }

    isChanging.value = true

    try {
      console.log('🌐 Ändere Sprache:', currentLanguage.value, '→', newLanguage)

      // Sprache in i18n ändern
      const success = changeLanguage(newLanguage)
      if (!success) {
        throw new Error('Fehler beim Ändern der Sprache')
      }

      // In Config speichern
      const config = configStorage.loadConfig()
      if (config) {
        config.ui = config.ui || {}
        config.ui.language = newLanguage
        configStorage.saveConfig(config)

        // Zum Server synchronisieren (wenn online)
        if (syncToServer && navigator.onLine) {
          try {
            await apiConfig.set(config)
            console.log('✅ Sprache zum Server synchronisiert')
          } catch (error) {
            console.warn('⚠️ Sprache konnte nicht zum Server synchronisiert werden:', error)
            // Nicht kritisch, lokal gespeichert
          }
        }
      }

      currentLanguage.value = newLanguage
      console.log('✅ Sprache erfolgreich geändert:', newLanguage)

      return true
    } catch (error) {
      console.error('❌ Fehler beim Ändern der Sprache:', error)
      return false
    } finally {
      isChanging.value = false
    }
  }

  /**
   * Lädt die gespeicherte Sprache aus der Config
   */
  const loadLanguage = () => {
    try {
      const config = configStorage.loadConfig()
      if (config?.ui?.language) {
        const savedLanguage = config.ui.language
        if (SUPPORTED_LOCALES.includes(savedLanguage) && savedLanguage !== currentLanguage.value) {
          console.log('📦 Lade gespeicherte Sprache:', savedLanguage)
          changeLanguage(savedLanguage)
          currentLanguage.value = savedLanguage
        }
      }
    } catch (error) {
      console.warn('⚠️ Fehler beim Laden der gespeicherten Sprache:', error)
    }
  }

  /**
   * Gibt die aktuelle Sprache zurück
   */
  const getLanguage = () => {
    return currentLanguage.value
  }

  /**
   * Verfügbare Sprachen (siehe i18n/index.js, einzige Quelle)
   */
  const availableLanguages = availableLocales

  // Initial laden
  loadLanguage()

  return {
    currentLanguage,
    isChanging,
    setLanguage,
    loadLanguage,
    getLanguage,
    availableLanguages
  }
}


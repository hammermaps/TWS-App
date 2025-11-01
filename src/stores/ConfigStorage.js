/**
 * ConfigStorage.js - Store für Konfigurationsverwaltung mit Offline-Support
 */
import { ref } from 'vue'

export class ConfigStorage {
  constructor() {
    this.storageKey = 'wls_config_cache'
    this.lastUpdateKey = 'wls_config_last_update'
  }

  /**
   * Speichert die Konfiguration im LocalStorage
   */
  saveConfig(config) {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(config))
      localStorage.setItem(this.lastUpdateKey, new Date().toISOString())
      console.log('💾 Konfiguration im LocalStorage gespeichert')
      return true
    } catch (error) {
      console.error('❌ Fehler beim Speichern der Konfiguration:', error)
      return false
    }
  }

  /**
   * Lädt die Konfiguration aus dem LocalStorage
   */
  getConfig() {
    try {
      const configString = localStorage.getItem(this.storageKey)
      if (configString) {
        const config = JSON.parse(configString)
        console.log('📦 Konfiguration aus LocalStorage geladen')
        return config
      }
    } catch (error) {
      console.error('❌ Fehler beim Laden der Konfiguration:', error)
    }
    return null
  }

  /**
   * Gibt das Datum der letzten Aktualisierung zurück
   */
  getLastUpdateTime() {
    try {
      const timestamp = localStorage.getItem(this.lastUpdateKey)
      if (timestamp) {
        return new Date(timestamp)
      }
    } catch (error) {
      console.error('❌ Fehler beim Laden des Update-Timestamps:', error)
    }
    return null
  }

  /**
   * Prüft ob Konfiguration verfügbar ist
   */
  hasConfig() {
    return !!localStorage.getItem(this.storageKey)
  }

  /**
   * Löscht die gecachte Konfiguration
   */
  clearConfig() {
    try {
      localStorage.removeItem(this.storageKey)
      localStorage.removeItem(this.lastUpdateKey)
      console.log('🗑️ Konfiguration aus LocalStorage entfernt')
      return true
    } catch (error) {
      console.error('❌ Fehler beim Löschen der Konfiguration:', error)
      return false
    }
  }

  /**
   * Prüft ob die Konfiguration aktualisiert werden sollte (älter als X Stunden)
   */
  shouldRefreshConfig(maxAgeHours = 24) {
    const lastUpdate = this.getLastUpdateTime()
    if (!lastUpdate) return true

    const ageInHours = (Date.now() - lastUpdate.getTime()) / (1000 * 60 * 60)
    return ageInHours > maxAgeHours
  }

  /**
   * Gibt Statistiken über die gespeicherte Konfiguration zurück
   */
  getStats() {
    const config = this.getConfig()
    const lastUpdate = this.getLastUpdateTime()
    
    return {
      hasConfig: this.hasConfig(),
      lastUpdate: lastUpdate,
      lastUpdateFormatted: lastUpdate ? lastUpdate.toLocaleString('de-DE') : 'Nie',
      configKeys: config ? Object.keys(config).length : 0,
      shouldRefresh: this.shouldRefreshConfig()
    }
  }
}

// Singleton-Instanz
const configStorage = new ConfigStorage()

/**
 * Vue Composable für Config Storage
 */
export function useConfigStorage() {
  const config = ref(configStorage.getConfig())
  const lastUpdate = ref(configStorage.getLastUpdateTime())
  
  const saveConfig = (newConfig) => {
    const success = configStorage.saveConfig(newConfig)
    if (success) {
      config.value = newConfig
      lastUpdate.value = new Date()
    }
    return success
  }

  const loadConfig = () => {
    config.value = configStorage.getConfig()
    lastUpdate.value = configStorage.getLastUpdateTime()
    return config.value
  }

  const clearConfig = () => {
    const success = configStorage.clearConfig()
    if (success) {
      config.value = null
      lastUpdate.value = null
    }
    return success
  }

  const hasConfig = () => {
    return configStorage.hasConfig()
  }

  const shouldRefresh = (maxAgeHours = 24) => {
    return configStorage.shouldRefreshConfig(maxAgeHours)
  }

  const getStats = () => {
    return configStorage.getStats()
  }

  return {
    config,
    lastUpdate,
    saveConfig,
    loadConfig,
    clearConfig,
    hasConfig,
    shouldRefresh,
    getStats
  }
}

export default configStorage

/**
 * ConfigStorage.js - Store für Konfigurationsverwaltung mit Offline-Support
 * Verwendet IndexedDB statt localStorage für bessere Performance und Speicherkapazität
 */
import { ref } from 'vue'
import { toRaw } from 'vue'
import indexedDBHelper, { STORES } from '@/utils/IndexedDBHelper.js'

const CONFIG_KEY = 'wls_config_cache'
const LAST_UPDATE_KEY = 'wls_config_last_update'

/**
 * Serialisiert ein Objekt zu einem klonbaren Plain Object
 * Entfernt reactive refs, Promises, Funktionen etc.
 */
function serializeForIndexedDB(data) {
  try {
    // Konvertiere Vue-Proxys zu raw und mache tiefen JSON-Roundtrip
    const replacer = (key, value) => {
      if (value === null || value === undefined) return value
      if (typeof value === 'function') return undefined
      // Promise oder thenable erkennen
      if (value instanceof Promise) return undefined
      if (typeof value === 'object' && value !== null && typeof value.then === 'function') return undefined
      // Vue ref/reactive entfernen: Wenn es ein Proxy mit __v_isRef ist, extrahiere value
      if (typeof value === 'object' && value !== null && value.__v_isRef === true) {
        return value.value
      }
      return value
    }
    // Erst toRaw anwenden, dann JSON-Roundtrip
    const raw = toRaw(data)
    return JSON.parse(JSON.stringify(raw, replacer))
  } catch (e) {
    console.warn('⚠️ Fehler beim Serialisieren der Config (erster Versuch):', e.message)
    try {
      // Zweiter Versuch ohne toRaw
      return JSON.parse(JSON.stringify(data, (key, value) => {
        if (typeof value === 'function') return undefined
        if (value instanceof Promise) return undefined
        if (value !== null && typeof value === 'object' && typeof value.then === 'function') return undefined
        if (value !== null && typeof value === 'object' && value.__v_isRef) return value.value
        return value
      }))
    } catch (e2) {
      console.error('❌ Config konnte nicht serialisiert werden:', e2)
      // Letzter Notfallversuch: versuche manuell die Felder zu extrahieren
      try {
        if (data && typeof data === 'object') {
          const plain = {}
          for (const key of Object.keys(data)) {
            try {
              const val = data[key]
              if (val instanceof Promise || typeof val === 'function') continue
              if (val !== null && typeof val === 'object' && typeof val.then === 'function') continue
              if (val && typeof val === 'object') {
                plain[key] = JSON.parse(JSON.stringify(val))
              } else {
                plain[key] = val
              }
            } catch { /* skip problematic key */ }
          }
          return plain
        }
      } catch { /* ignore */ }
      return {}
    }
  }
}

export class ConfigStorage {
  constructor() {
    // No instance variables needed with IndexedDB
  }

  /**
   * Speichert die Konfiguration in IndexedDB
   */
  async saveConfig(config) {
    try {
      // Serialisiere die Config bevor sie gespeichert wird
      const serializedConfig = serializeForIndexedDB(config)

      await indexedDBHelper.set(STORES.CONFIG, {
        key: CONFIG_KEY,
        value: serializedConfig
      })
      await indexedDBHelper.set(STORES.CONFIG, {
        key: LAST_UPDATE_KEY,
        value: new Date().toISOString()
      })

      console.log('💾 Konfiguration in IndexedDB gespeichert')

      // ✅ Aktualisiere API-Config-Cache für sofortige Verwendung
      if (typeof window !== 'undefined' && window.refreshApiConfigCache) {
        try {
          await window.refreshApiConfigCache()
          console.log('✅ API-Config-Cache aktualisiert')
        } catch (error) {
          console.warn('⚠️ Konnte API-Config-Cache nicht aktualisieren:', error)
        }
      }

      return true
    } catch (error) {
      console.error('❌ Fehler beim Speichern der Konfiguration:', error)
      return false
    }
  }

  /**
   * Lädt die Konfiguration aus IndexedDB
   */
  async getConfig() {
    try {
      const result = await indexedDBHelper.get(STORES.CONFIG, CONFIG_KEY)
      if (result && result.value) {
        console.log('📦 Konfiguration aus IndexedDB geladen')

        return result.value
      }
    } catch (error) {
      console.error('❌ Fehler beim Laden der Konfiguration:', error)
    }
    return null
  }

  /**
   * Gibt das Datum der letzten Aktualisierung zurück
   */
  async getLastUpdateTime() {
    try {
      const result = await indexedDBHelper.get(STORES.CONFIG, LAST_UPDATE_KEY)
      if (result && result.value) {
        return new Date(result.value)
      }
    } catch (error) {
      console.error('❌ Fehler beim Laden des Update-Timestamps:', error)
    }
    return null
  }

  /**
   * Prüft ob Konfiguration verfügbar ist
   */
  async hasConfig() {
    try {
      const result = await indexedDBHelper.get(STORES.CONFIG, CONFIG_KEY)
      return !!result
    } catch (error) {
      console.error('❌ Fehler beim Prüfen der Konfiguration:', error)
      return false
    }
  }

  /**
   * Löscht die gecachte Konfiguration
   */
  async clearConfig() {
    try {
      await indexedDBHelper.delete(STORES.CONFIG, CONFIG_KEY)
      await indexedDBHelper.delete(STORES.CONFIG, LAST_UPDATE_KEY)
      console.log('🗑️ Konfiguration aus IndexedDB entfernt')
      return true
    } catch (error) {
      console.error('❌ Fehler beim Löschen der Konfiguration:', error)
      return false
    }
  }

  /**
   * Prüft ob die Konfiguration aktualisiert werden sollte (älter als X Stunden)
   */
  async shouldRefreshConfig(maxAgeHours = 24) {
    const lastUpdate = await this.getLastUpdateTime()
    if (!lastUpdate) return true

    const ageInHours = (Date.now() - lastUpdate.getTime()) / (1000 * 60 * 60)
    return ageInHours > maxAgeHours
  }

  /**
   * Gibt Statistiken über die gespeicherte Konfiguration zurück
   */
  async getStats() {
    const config = await this.getConfig()
    const lastUpdate = await this.getLastUpdateTime()

    return {
      hasConfig: await this.hasConfig(),
      lastUpdate: lastUpdate,
      lastUpdateFormatted: lastUpdate ? lastUpdate.toLocaleString('de-DE') : 'Nie',
      configKeys: config ? Object.keys(config).length : 0,
      shouldRefresh: await this.shouldRefreshConfig()
    }
  }

  /**
   * Initialisiert ConfigStorage beim App-Start
   * Lädt Config aus IndexedDB
   */
  async init() {
    try {
      console.log('🔧 Initialisiere ConfigStorage...')
      const config = await this.getConfig()

      if (config) {
        console.log('✅ ConfigStorage initialisiert')
      } else {
        console.log('⚠️ Keine Config in IndexedDB gefunden')
      }

      return true
    } catch (error) {
      console.error('❌ Fehler bei ConfigStorage-Initialisierung:', error)
      return false
    }
  }
}

// Singleton-Instanz
const configStorage = new ConfigStorage()

/**
 * Vue Composable für Config Storage
 * Alle Operationen sind jetzt async wegen IndexedDB
 */
export function useConfigStorage() {
  const config = ref(null)
  const lastUpdate = ref(null)
  const loading = ref(false)

  const saveConfig = async (newConfig) => {
    loading.value = true
    try {
      const success = await configStorage.saveConfig(newConfig)
      if (success) {
        config.value = newConfig
        lastUpdate.value = new Date()
      }
      return success
    } finally {
      loading.value = false
    }
  }

  const loadConfig = async () => {
    loading.value = true
    try {
      config.value = await configStorage.getConfig()
      lastUpdate.value = await configStorage.getLastUpdateTime()
      return config.value
    } finally {
      loading.value = false
    }
  }

  const clearConfig = async () => {
    loading.value = true
    try {
      const success = await configStorage.clearConfig()
      if (success) {
        config.value = null
        lastUpdate.value = null
      }
      return success
    } finally {
      loading.value = false
    }
  }

  const hasConfig = async () => {
    return await configStorage.hasConfig()
  }

  const shouldRefresh = async (maxAgeHours = 24) => {
    return await configStorage.shouldRefreshConfig(maxAgeHours)
  }

  const getStats = async () => {
    return await configStorage.getStats()
  }

  return {
    config,
    lastUpdate,
    loading,
    saveConfig,
    loadConfig,
    clearConfig,
    hasConfig,
    shouldRefresh,
    getStats
  }
}

export default configStorage

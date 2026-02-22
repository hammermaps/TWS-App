/**
 * ApiConfigHelper.js
 * Zentrale Stelle für API-Konfigurationswerte (Timeout, Retries)
 * mit Fallback-Mechanismus und Offline-Unterstützung
 * Verwendet IndexedDB für persistente Speicherung
 */

import indexedDBHelper, { STORES } from '@/utils/IndexedDBHelper.js'

const CONFIG_KEY = 'wls_config_cache'

/**
 * Standard-Fallback-Werte wenn keine Konfiguration verfügbar ist
 */
const DEFAULT_CONFIG = {
  apiTimeout: 5000,
  maxRetries: 3
}

/**
 * In-Memory Cache für synchronen Zugriff
 * Wird beim App-Start initialisiert
 */
let configCache = null

/**
 * Lädt die API-Konfiguration aus IndexedDB
 * @returns {Promise<Object>} Konfigurationsobjekt mit apiTimeout und maxRetries
 */
async function loadConfigFromIndexedDB() {
  try {
    const result = await indexedDBHelper.get(STORES.CONFIG, CONFIG_KEY)
    if (result && result.value && result.value.server) {
      return {
        apiTimeout: result.value.server.apiTimeout || DEFAULT_CONFIG.apiTimeout,
        maxRetries: result.value.server.maxRetries || DEFAULT_CONFIG.maxRetries
      }
    }
  } catch (error) {
    console.warn('⚠️ Fehler beim Laden der API-Konfiguration aus IndexedDB:', error)
  }
  return null
}

/**
 * Initialisiert den Config-Cache beim App-Start
 * Muss beim App-Start aufgerufen werden!
 */
export async function initApiConfigCache() {
  try {
    console.log('🔧 Initialisiere API-Config-Cache...')
    const config = await loadConfigFromIndexedDB()

    if (config) {
      configCache = config
      console.log('✅ API-Config-Cache initialisiert:', config)
    } else {
      configCache = { ...DEFAULT_CONFIG }
      console.log('⚠️ Keine Config in IndexedDB, verwende Defaults:', configCache)
    }

    return true
  } catch (error) {
    console.error('❌ Fehler bei API-Config-Cache-Initialisierung:', error)
    configCache = { ...DEFAULT_CONFIG }
    return false
  }
}

/**
 * Aktualisiert den Config-Cache
 * Sollte aufgerufen werden, wenn Config geändert wird
 */
export async function refreshApiConfigCache() {
  return await initApiConfigCache()
}

/**
 * Gibt die aktuellen API-Konfigurationswerte zurück (synchron)
 * Verwendet den In-Memory Cache
 *
 * @returns {Object} { apiTimeout: number, maxRetries: number }
 */
export function getApiConfig() {
  // Falls Cache noch nicht initialisiert, verwende Defaults
  if (!configCache) {
    console.warn('⚠️ API-Config-Cache noch nicht initialisiert, verwende Defaults')
    return { ...DEFAULT_CONFIG }
  }

  return { ...configCache }
}

/**
 * Gibt den API-Timeout-Wert zurück
 * @param {number|null} customTimeout - Optionaler benutzerdefinierter Timeout
 * @returns {number} Timeout in Millisekunden
 */
export function getApiTimeout(customTimeout = null) {
  if (customTimeout !== null && customTimeout > 0) {
    return customTimeout
  }

  const config = getApiConfig()
  return config.apiTimeout
}

/**
 * Gibt die maximale Anzahl von Retry-Versuchen zurück
 * @param {number|null} customRetries - Optional benutzerdefinierte Retry-Anzahl
 * @returns {number} Anzahl der Retries
 */
export function getMaxRetries(customRetries = null) {
  if (customRetries !== null && customRetries >= 0) {
    return customRetries
  }

  const config = getApiConfig()
  return config.maxRetries
}

/**
 * Prüft ob wir im Offline-Modus sind
 * @returns {boolean}
 */
export function isOfflineMode() {
  // Fallback auf Navigator-Online-Status
  return !navigator.onLine
}

/**
 * Gibt angepasste Request-Optionen für API-Calls zurück
 * Berücksichtigt Offline-Modus und Konfigurationswerte
 *
 * @param {Object} options - Optionale Überschreibungen
 * @param {number} options.timeout - Custom Timeout
 * @param {number} options.retries - Custom Retries
 * @param {boolean} options.skipOfflineCheck - Offline-Check überspringen
 * @returns {Object} { timeout, retries, isOffline }
 */
export function getRequestOptions(options = {}) {
  const {
    timeout: customTimeout = null,
    retries: customRetries = null,
    skipOfflineCheck = false
  } = options

  const isOffline = skipOfflineCheck ? false : isOfflineMode()
  const config = getApiConfig()

  return {
    timeout: customTimeout !== null ? customTimeout : config.apiTimeout,
    retries: customRetries !== null ? customRetries : config.maxRetries,
    isOffline
  }
}

/**
 * Vue Composable für API-Konfiguration
 * Kann in Vue-Komponenten verwendet werden
 */
export function useApiConfigHelper() {
  return {
    getApiConfig,
    getApiTimeout,
    getMaxRetries,
    getRequestOptions,
    isOfflineMode,
    initApiConfigCache,
    refreshApiConfigCache,
    DEFAULT_CONFIG
  }
}

export default {
  getApiConfig,
  getApiTimeout,
  getMaxRetries,
  getRequestOptions,
  isOfflineMode,
  initApiConfigCache,
  refreshApiConfigCache,
  useApiConfigHelper,
  DEFAULT_CONFIG
}


/**
 * ApiConfigHelper.js
 * Zentrale Stelle für API-Konfigurationswerte (Timeout, Retries)
 * mit Fallback-Mechanismus und Offline-Unterstützung
 */

/**
 * Standard-Fallback-Werte wenn keine Konfiguration verfügbar ist
 */
const DEFAULT_CONFIG = {
  apiTimeout: 5000,
  maxRetries: 3
}

/**
 * Lädt die API-Konfiguration aus dem LocalStorage
 * @returns {Object} Konfigurationsobjekt mit apiTimeout und maxRetries
 */
function loadConfigFromStorage() {
  try {
    const configString = localStorage.getItem('wls_config_cache')
    if (configString) {
      const config = JSON.parse(configString)
      if (config && config.server) {
        return {
          apiTimeout: config.server.apiTimeout || DEFAULT_CONFIG.apiTimeout,
          maxRetries: config.server.maxRetries || DEFAULT_CONFIG.maxRetries
        }
      }
    }
  } catch (error) {
    console.warn('⚠️ Fehler beim Laden der API-Konfiguration aus LocalStorage:', error)
  }
  return null
}

/**
 * Gibt die aktuellen API-Konfigurationswerte zurück
 * Fallback: DEFAULT_CONFIG wenn keine Konfiguration verfügbar ist
 *
 * @returns {Object} { apiTimeout: number, maxRetries: number }
 */
export function getApiConfig() {
  const storedConfig = loadConfigFromStorage()

  if (storedConfig) {
    console.log('📋 API-Config geladen:', storedConfig)
    return storedConfig
  }

  console.log('📋 API-Config Fallback verwendet:', DEFAULT_CONFIG)
  return { ...DEFAULT_CONFIG }
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
  try {
    const onlineStatusString = localStorage.getItem('wls_online_status')
    if (onlineStatusString) {
      const onlineStatus = JSON.parse(onlineStatusString)
      return !onlineStatus.isOnline
    }
  } catch (error) {
    console.warn('⚠️ Fehler beim Prüfen des Online-Status:', error)
  }

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
    DEFAULT_CONFIG
  }
}

export default {
  getApiConfig,
  getApiTimeout,
  getMaxRetries,
  getRequestOptions,
  isOfflineMode,
  useApiConfigHelper,
  DEFAULT_CONFIG
}


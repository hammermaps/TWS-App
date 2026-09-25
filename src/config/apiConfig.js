/**
 * Zentrale API-Konfiguration
 *
 * Diese Datei enthält alle URL-Konfigurationen für die API-Endpoints
 */

/**
 * Backend Base URL für Production
 *
 * Läuft über das DKC (ProxyServer), nicht mehr über den früheren
 * eigenständigen Backend-Host wls.dk-automation.de. Wichtig: der /api-Pfad
 * ist erforderlich - auf dkc.dk-automation.de liegen die TWS-REST-Endpunkte
 * unter /api/... (nginx rewrite auf /api.php/... mit PATH_INFO-Routing),
 * nicht auf der Domain-Wurzel wie beim früheren dedizierten Host. Ein
 * bereits lokal gespeicherter custom_api_url ohne /api-Suffix (z.B. manuell
 * in den Server-Einstellungen der Login-Seite eingetragen, bevor dieser
 * Rewrite existierte) muss dort zurückgesetzt oder korrigiert werden -
 * dieser Default greift nur, solange kein custom_api_url in localStorage
 * steht. /api.php/... (ohne Rewrite) funktioniert weiterhin unverändert.
 */
export const PRODUCTION_API_URL = 'https://dkc.dk-automation.de/api'

/**
 * Backend Base URL für Development (Vite Proxy)
 */
export const DEVELOPMENT_API_URL = '/api'

/**
 * Gibt die aktuelle API Base URL zurück basierend auf dem Environment
 * @returns {string} Die Base URL für API-Requests
 */
export function getApiBaseUrl() {
  if (!import.meta.env.DEV && typeof window !== 'undefined' && window.localStorage) {
    const customUrl = window.localStorage.getItem('custom_api_url')
    if (customUrl) {
      return customUrl
    }
  }
  return import.meta.env.DEV ? DEVELOPMENT_API_URL : PRODUCTION_API_URL
}

/**
 * Optional: Weitere API-spezifische Konfigurationen
 */
export const API_CONFIG = {
  // Base URLs
  baseUrl: getApiBaseUrl(),

  // Endpoints
  endpoints: {
    health: '/health',
    auth: '/auth',
    buildings: '/buildings',
    apartments: '/apartments',
    records: '/records',
    users: '/users',
    config: '/config'
  },

  // Default Timeouts (werden durch ApiConfigHelper überschrieben wenn konfiguriert)
  defaultTimeout: 50000,
  defaultRetries: 3
}

export default {
  PRODUCTION_API_URL,
  DEVELOPMENT_API_URL,
  getApiBaseUrl,
  API_CONFIG
}


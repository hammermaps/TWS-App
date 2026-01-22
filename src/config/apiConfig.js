/**
 * Zentrale API-Konfiguration
 *
 * Diese Datei enthält alle URL-Konfigurationen für die API-Endpoints
 */

/**
 * Backend Base URL für Production
 */
export const PRODUCTION_API_URL = 'https://wls.dk-automation.de'

/**
 * Backend Base URL für Development (Vite Proxy)
 */
export const DEVELOPMENT_API_URL = '/api'

/**
 * Gibt die aktuelle API Base URL zurück basierend auf dem Environment
 * @returns {string} Die Base URL für API-Requests
 */
export function getApiBaseUrl() {
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


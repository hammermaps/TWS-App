// useHealth.js - Vue Composable für Health Status API
import { ref } from 'vue'
import { ApiHealthClient } from './ApiHealth.js'
import { getApiBaseUrl } from '../config/apiConfig.js'

/**
 * Vue Composable für Health Status
 * @param {string} baseUrl - Base URL für den API-Client
 */
export function useHealth(baseUrl = null) {
  // Verwende zentrale API-Konfiguration
  const apiBaseUrl = baseUrl || getApiBaseUrl()

  const loading = ref(false)
  const error = ref(null)
  const status = ref(null)
  const pingResponse = ref(null)
  const client = new ApiHealthClient(apiBaseUrl)

  /**
   * Ruft den Health Status ab
   */
  const getStatus = async () => {
    loading.value = true
    error.value = null

    try {
      const response = await client.getStatus()

      if (response.isSuccess()) {
        status.value = response
        return response
      } else {
        error.value = response.error
        return response
      }
    } catch (err) {
      error.value = err.message || 'Fehler beim Abrufen des Health Status'
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Sendet einen Ping an den Server
   */
  const ping = async () => {
    loading.value = true
    error.value = null

    try {
      const response = await client.ping()

      if (response.isSuccess()) {
        pingResponse.value = response
        return response
      } else {
        error.value = response.error
        return response
      }
    } catch (err) {
      error.value = err.message || 'Fehler beim Ping'
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Prüft ob der Server healthy ist
   */
  const checkHealth = async () => {
    const response = await getStatus()
    return response?.isHealthy() ?? false
  }

  /**
   * Prüft ob der Server erreichbar ist
   */
  const checkReachability = async () => {
    const response = await ping()
    return response?.isPong() ?? false
  }

  return {
    // State
    loading,
    error,
    status,
    pingResponse,

    // Methods
    getStatus,
    ping,
    checkHealth,
    checkReachability,

    // Client (falls direkter Zugriff benötigt wird)
    client
  }
}

// useTokenStatus.js - Debug/Monitor Composable für Token-Status
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useUser } from './useUser.js'
import { ApiUser } from './ApiUser.js'
import { getToken } from '../stores/GlobalToken.js'
import { getApiBaseUrl } from '../config/apiConfig.js'

/**
 * Vue Composable für Token-Status-Monitoring
 * Nützlich für Debugging und Status-Anzeige
 */
export function useTokenStatus() {
  // Im Development-Mode verwenden wir den Vite-Proxy, in Production die direkte URL
  const apiBaseUrl = getApiBaseUrl()
  const { isAuthenticated, currentUser } = useUser(apiBaseUrl)
  const apiUser = new ApiUser(apiBaseUrl)

  const statusInterval = ref(null)
  const currentTime = ref(new Date())
  const lastManualValidation = ref(null)
  const isValidating = ref(false)

  // Token als reaktive Referenz - das hat gefehlt!
  const token = computed(() => getToken())

  // Computed Properties für Status-Anzeige
  const authStatus = computed(() => {
    return {
      authenticated: isAuthenticated.value,
      user: currentUser.value?.username || null,
      timestamp: currentTime.value.toLocaleString('de-DE'),
      tokenPresent: !!getToken()
    }
  })

  const validationStatus = computed(() => {
    return {
      isValidating: isValidating.value,
      lastValidation: lastManualValidation.value ? lastManualValidation.value.toLocaleString('de-DE') : 'Nie',
      tokenValid: isAuthenticated.value
    }
  })

  const formatTime = (seconds) => {
    if (!seconds) return '---'

    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60

    if (minutes > 0) {
      return `${minutes}m ${remainingSeconds}s`
    }
    return `${remainingSeconds}s`
  }

  /**
   * Manuelle Token-Validierung mit ApiUser
   */
  const validateTokenNow = async () => {
    const token = getToken()
    if (!token) {
      return { valid: false, error: 'Kein Token vorhanden' }
    }

    isValidating.value = true

    try {
      const result = await apiUser.checkToken(token)
      lastManualValidation.value = new Date()

      return {
        valid: result.valid,
        success: result.success,
        error: result.error,
        timestamp: lastManualValidation.value.toLocaleString('de-DE')
      }
    } catch (error) {
      return {
        valid: false,
        success: false,
        error: error.message || 'Validierung fehlgeschlagen',
        timestamp: new Date().toLocaleString('de-DE')
      }
    } finally {
      isValidating.value = false
    }
  }

  // Starte Clock für Live-Updates
  const startClock = () => {
    statusInterval.value = setInterval(() => {
      currentTime.value = new Date()
    }, 1000)
  }

  const stopClock = () => {
    if (statusInterval.value) {
      clearInterval(statusInterval.value)
      statusInterval.value = null
    }
  }

  onMounted(() => {
    startClock()
  })

  onUnmounted(() => {
    stopClock()
  })

  return {
    // Status
    authStatus,
    validationStatus,
    // Token-Referenz exportieren
    token,

    // Utilities
    formatTime,
    validateTokenNow
  }
}

export default useTokenStatus

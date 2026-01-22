// useTokenValidator.js - Automatische Token-Validierung
import { ref, onMounted, onUnmounted, readonly, watch } from 'vue'
import { useRouter } from 'vue-router'
import { getToken, clearToken } from '../stores/GlobalToken.js'
import { clearUser, updateSessionTime, updateUserData } from '../stores/GlobalUser.js'
import { ApiUser } from './ApiUser.js'
import { useOnlineStatusStore } from '../stores/OnlineStatus.js'
import { getApiBaseUrl } from '../config/apiConfig.js'

/**
 * Vue Composable für automatische Token-Validierung
 * Prüft alle 5 Minuten ob das Token noch gültig ist
 */
export function useTokenValidator() {
  // Verwende zentrale API-Konfiguration
  const apiBaseUrl = getApiBaseUrl()
  const router = useRouter()
  const apiUser = new ApiUser(apiBaseUrl)
  const onlineStatusStore = useOnlineStatusStore()

  const isValidating = ref(false)
  const lastValidation = ref(null)
  const validationInterval = ref(null)

  // Validierung alle 5 Minuten (300000ms)
  const VALIDATION_INTERVAL = 5 * 60 * 1000

  /**
   * Führt eine Token-Validierung durch
   */
  const performValidation = async () => {
    const token = getToken()

    if (!token) {
      return { valid: false, reason: 'Kein Token vorhanden' }
    }

    // Im Offline-Modus keine Token-Validierung durchführen
    if (!onlineStatusStore.isFullyOnline) {
      console.log('Token-Validierung übersprungen (Offline-Modus) - Login bleibt aktiv')
      return { valid: true, reason: 'Offline-Modus - Token-Prüfung pausiert', skipped: true }
    }

    isValidating.value = true

    try {
      const result = await apiUser.checkToken(token)
      lastValidation.value = new Date()

      if (!result.valid) {
        console.warn('Token ist ungültig, Benutzer wird abgemeldet')

        // Benutzer automatisch abmelden
        clearToken()
        clearUser()

        // Zur Login-Seite weiterleiten (außer wenn bereits dort)
        if (router.currentRoute.value.path !== '/login') {
          router.push('/login')
        }

        return { valid: false, reason: result.error || 'Token ungültig' }
      }

      // Aktualisiere session_time und user_data
      updateSessionTime(result.session_time)
      updateUserData(result.user_data)

      return { valid: true, reason: 'Token gültig' }
    } catch (error) {
      console.error('Fehler bei Token-Validierung:', error)
      return { valid: false, reason: error.message }
    } finally {
      isValidating.value = false
    }
  }

  /**
   * Startet die automatische Token-Validierung
   */
  const startValidation = () => {
    // Stoppe existierende Validierung
    stopValidation()

    const token = getToken()
    if (!token) {
      return
    }

    console.log('Starte automatische Token-Validierung (alle 5 Minuten)')

    // Erste Validierung sofort
    performValidation()

    // Dann alle 5 Minuten wiederholen
    validationInterval.value = setInterval(() => {
      performValidation()
    }, VALIDATION_INTERVAL)
  }

  /**
   * Stoppt die automatische Token-Validierung
   */
  const stopValidation = () => {
    if (validationInterval.value) {
      clearInterval(validationInterval.value)
      validationInterval.value = null
      console.log('Automatische Token-Validierung gestoppt')
    }
  }

  /**
   * Manuelle Token-Validierung
   */
  const checkTokenNow = async () => {
    return await performValidation()
  }

  /**
   * Berechnet die Zeit bis zur nächsten Validierung
   */
  const getTimeUntilNextValidation = () => {
    if (!lastValidation.value || !validationInterval.value) {
      return null
    }

    const nextValidation = new Date(lastValidation.value.getTime() + VALIDATION_INTERVAL)
    const now = new Date()
    const timeUntil = nextValidation - now

    return timeUntil > 0 ? timeUntil : 0
  }

  // Prüft ob ein Token vorhanden ist
  const isAuthenticated = () => {
    return !!getToken()
  }

  // Watch für Authentication-Status
  const watchAuth = () => {
    if (isAuthenticated() && !validationInterval.value) {
      startValidation()
    } else if (!isAuthenticated() && validationInterval.value) {
      stopValidation()
    }
  }

  // Lifecycle Hooks
  onMounted(() => {
    // Starte Validierung wenn authentifiziert
    if (isAuthenticated()) {
      startValidation()
    }
  })

  onUnmounted(() => {
    stopValidation()
  })

  // Watcher für Online-Status: Validierung pausieren/fortsetzen
  watch(() => onlineStatusStore.isFullyOnline, (isOnline) => {
    if (!isOnline) {
      console.log('🔴 Offline-Modus erkannt - Token-Validierung wird pausiert')
      // Validierung bleibt aktiv (Interval läuft weiter), aber performValidation()
      // überspringt die API-Anfrage und gibt ein gültiges Ergebnis zurück
    } else {
      console.log('🟢 Online-Modus wiederhergestellt - Token-Validierung aktiv')
      // Bei Wiederherstellung der Verbindung sofort validieren
      if (isAuthenticated() && validationInterval.value) {
        performValidation()
      }
    }
  })

  return {
    // Status
    isValidating: readonly(isValidating),
    lastValidation: readonly(lastValidation),

    // Methoden
    startValidation,
    stopValidation,
    checkTokenNow,
    getTimeUntilNextValidation,
    watchAuth,

    // Konfiguration
    validationInterval: VALIDATION_INTERVAL
  }
}

export default useTokenValidator

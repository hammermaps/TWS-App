// useFeatureAccess.js - Composable für Feature-Zugriffskontrolle basierend auf Online-Status
import { computed } from 'vue'
import { useOnlineStatusStore } from '@/stores/OnlineStatus.js'
import { useRouter } from 'vue-router'

export function useFeatureAccess() {
  const onlineStatusStore = useOnlineStatusStore()
  const router = useRouter()

  /**
   * Prüft ob ein Feature verfügbar ist
   */
  const isFeatureAvailable = (featureName) => {
    return onlineStatusStore.isFeatureAvailable(featureName)
  }

  /**
   * Online-only Features
   */
  const onlineOnlyFeatures = computed(() =>
    onlineStatusStore.requiresOnlineFeatures
  )

  /**
   * Prüft ob alle online Features verfügbar sind
   */
  const hasOnlineAccess = computed(() =>
    onlineStatusStore.isFullyOnline
  )

  /**
   * Feature-spezifische Checks
   */
  const canChangePassword = computed(() =>
    isFeatureAvailable('password-change')
  )

  const canViewStatistics = computed(() =>
    isFeatureAvailable('statistics')
  )

  const canManageUsers = computed(() =>
    isFeatureAvailable('user-management')
  )

  const canManageBuildings = computed(() =>
    isFeatureAvailable('building-management')
  )

  const canDoFlushings = computed(() =>
    isFeatureAvailable('flushings')
  )

  /**
   * Zeigt eine Warnung an, wenn Feature nicht verfügbar ist
   */
  const showFeatureUnavailableMessage = (featureName) => {
    const messages = {
      'password-change': 'Passwort ändern ist nur im Online-Modus verfügbar.',
      'statistics': 'Statistiken sind nur im Online-Modus verfügbar.',
      'user-management': 'Benutzerverwaltung ist nur im Online-Modus verfügbar.',
      'building-management': 'Gebäudeverwaltung ist nur im Online-Modus verfügbar.'
    }

    const message = messages[featureName] || 'Diese Funktion ist offline nicht verfügbar.'

    console.warn(`⚠️ ${message}`)

    // TODO: Integration mit Toast-Bibliothek
    if (window.showToast) {
      window.showToast(message, 'warning')
    } else {
      alert(message)
    }
  }

  /**
   * Wrapper für Feature-Ausführung mit Prüfung
   */
  const executeIfOnline = async (featureName, callback) => {
    if (!isFeatureAvailable(featureName)) {
      showFeatureUnavailableMessage(featureName)
      return false
    }

    try {
      await callback()
      return true
    } catch (error) {
      console.error(`Fehler bei Ausführung von ${featureName}:`, error)
      return false
    }
  }

  /**
   * Route Guard für geschützte Routes
   */
  const checkRouteAccess = (routeName) => {
    const routeFeatureMap = {
      'statistics': 'statistics',
      'user-profile': 'password-change',
      'users': 'user-management',
      'buildings': 'building-management'
    }

    const requiredFeature = routeFeatureMap[routeName]
    if (requiredFeature && !isFeatureAvailable(requiredFeature)) {
      return false
    }

    return true
  }

  /**
   * Navigiert mit Feature-Check
   */
  const navigateIfAllowed = (routeName, params = {}) => {
    if (checkRouteAccess(routeName)) {
      router.push({ name: routeName, params })
      return true
    } else {
      showFeatureUnavailableMessage(routeName)
      return false
    }
  }

  return {
    // State
    hasOnlineAccess,
    onlineOnlyFeatures,

    // Feature Checks
    isFeatureAvailable,
    canChangePassword,
    canViewStatistics,
    canManageUsers,
    canManageBuildings,
    canDoFlushings,

    // Methods
    showFeatureUnavailableMessage,
    executeIfOnline,
    checkRouteAccess,
    navigateIfAllowed
  }
}


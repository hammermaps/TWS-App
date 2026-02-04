// useUser.js - Vue 3 Composable für User-Management
import { ref, computed, readonly } from 'vue'
import { ApiUser } from './ApiUser.js'
import { setToken, clearToken, getToken } from '../stores/GlobalToken.js'
import { setUser, clearUser, setUserLoading, setUserError, UserItem } from '../stores/GlobalUser.js'
import indexedDBHelper, { STORES } from '@/utils/IndexedDBHelper.js'
import { getApiBaseUrl } from '../config/apiConfig.js'

/**
 * Vue Composable für User-Management
 * Verwendet die ApiUser-Klasse und stellt reaktive Zustände bereit
 */
export function useUser(baseUrl = null) {
  // Verwende zentrale API-Konfiguration
  const apiBaseUrl = baseUrl || getApiBaseUrl()

  // API-Client-Instanz
  const apiClient = new ApiUser(apiBaseUrl)

  // Reaktive Zustände
  const loading = ref(false)
  const error = ref(null)
  const user = ref(null)           // Aktueller Benutzer
  const users = ref([])            // Liste aller Benutzer (für Admin)
  const role = ref(null)           // Benutzerrolle
  const loginInfo = ref(null)      // Login-Informationen {token, user}

  // Computed Properties
  const isAuthenticated = computed(() => {
    return !!(loginInfo.value?.token || getToken())
  })

  const isLoading = computed(() => loading.value)
  const hasError = computed(() => !!error.value)
  const currentUser = computed(() => user.value)
  const userList = computed(() => users.value)
  const userRole = computed(() => role.value)

  // Helper-Funktionen
  const setAuthToken = (token) => {
    if (token) {
      setToken(token)
    } else {
      clearToken()
    }
  }

  const handleError = (err) => {
    error.value = err
    setUserError(err)
  }

  const clearError = () => {
    error.value = null
    setUserError(null)
  }

  /**
   * Benutzer registrieren
   */
  const register = async (userData = {}, options = {}) => {
    loading.value = true
    clearError()

    try {
      const result = await apiClient.register(userData, options)

      if (result instanceof UserItem) {
        return { success: true, user: result }
      } else {
        if (!result.success && result.error) {
          handleError(result.error)
        }
        return result
      }
    } catch (err) {
      handleError(err.message || 'Registrierung fehlgeschlagen')
      return { success: false, error: error.value }
    } finally {
      loading.value = false
    }
  }

  /**
   * Benutzer anmelden
   */
  const login = async (credentials = {}, options = {}) => {
    loading.value = true
    setUserLoading(true)
    clearError()

    try {
      const result = await apiClient.login(credentials, options)

      if (result.token && result.user) {
        // Token speichern
        setAuthToken(result.token)

        // Benutzer-Zustand aktualisieren
        user.value = result.user
        setUser(result.user)
        loginInfo.value = result

        // Benutzer und userId im LocalStorage speichern
        localStorage.setItem('user', JSON.stringify(result.user))
        localStorage.setItem('auth_token', result.token)

        // Wichtig: userId separat speichern für Dashboard und andere Komponenten
        if (result.user.id) {
          const userIdString = result.user.id.toString()
          localStorage.setItem('userId', userIdString)
          localStorage.setItem('wls_user_id', userIdString)

          // Auch in IndexedDB speichern für bessere Offline-Unterstützung
          try {
            await indexedDBHelper.set(STORES.CONFIG, {
              key: 'currentUserId',
              value: result.user.id
            })
            console.log('💾 User-ID in IndexedDB gespeichert:', result.user.id)
          } catch (error) {
            console.warn('⚠️ Fehler beim Speichern der User-ID in IndexedDB:', error)
          }
        }

        return {
          success: true,
          token: result.token,
          user: result.user
        }
      } else {
        handleError('Login fehlgeschlagen: Ungültige Anmeldedaten')
        return {
          success: false,
          error: 'Login fehlgeschlagen: Ungültige Anmeldedaten'
        }
      }
    } catch (err) {
      handleError(err.message || 'Login fehlgeschlagen')
      return {
        success: false,
        error: error.value
      }
    } finally {
      loading.value = false
      setUserLoading(false)
    }
  }

  /**
   * Benutzer abmelden
   */
  const logout = async (options = {}) => {
    loading.value = true
    clearError()

    try {
      // API-Call (optional, auch wenn er fehlschlägt)
      await apiClient.logout(options)
    } catch (err) {
      console.warn('Logout API-Call fehlgeschlagen:', err)
    } finally {
      // Lokalen Zustand immer zurücksetzen
      clearToken()
      clearUser()
      user.value = null
      users.value = []
      role.value = null
      loginInfo.value = null
      loading.value = false

      // Benutzer und Token aus LocalStorage entfernen
      localStorage.removeItem('user')
      localStorage.removeItem('auth_token')
      localStorage.removeItem('userId')
      localStorage.removeItem('wls_user_id')

      // Auch aus IndexedDB entfernen
      try {
        await indexedDBHelper.delete(STORES.CONFIG, 'currentUserId')
        console.log('🗑️ User-ID aus IndexedDB entfernt')
      } catch (error) {
        console.warn('⚠️ Fehler beim Entfernen der User-ID aus IndexedDB:', error)
      }
    }

    return { success: true }
  }

  /**
   * Aktuellen Benutzer abrufen
   */
  const getCurrentUser = async (options = {}) => {
    loading.value = true
    setUserLoading(true)
    clearError()

    try {
      const result = await apiClient.getCurrentUser(options)

      if (result) {
        user.value = result
        setUser(result)
        return result
      } else {
        return null
      }
    } catch (err) {
      const errorMsg = err.message || 'Benutzer konnte nicht geladen werden'
      handleError(errorMsg)
      return null
    } finally {
      loading.value = false
      setUserLoading(false)
    }
  }

  /**
   * Benutzer nach ID abrufen
   */
  const getUser = async (id, options = {}) => {
    loading.value = true
    clearError()

    try {
      const result = await apiClient.get(id, options)
      return result
    } catch (err) {
      const errorMsg = err.message || 'Benutzer konnte nicht geladen werden'
      handleError(errorMsg)
      return null
    } finally {
      loading.value = false
    }
  }

  /**
   * Alle Benutzer auflisten (Admin)
   */
  const getUserList = async (options = {}) => {
    loading.value = true
    clearError()

    try {
      const result = await apiClient.list(options)

      if (result.success) {
        users.value = result.items
        return result
      } else {
        if (result.error) handleError(result.error)
        return result
      }
    } catch (err) {
      const errorMsg = err.message || 'Benutzerliste konnte nicht geladen werden'
      handleError(errorMsg)
      return { success: false, error: errorMsg, items: [] }
    } finally {
      loading.value = false
    }
  }

  /**
   * Benutzer aktualisieren
   */
  const updateUser = async (id, userData = {}, options = {}) => {
    loading.value = true
    clearError()

    try {
      const result = await apiClient.update(id, userData, options)

      if (result) {
        // Liste aktualisieren falls vorhanden
        users.value = users.value.map(u => u.id === result.id ? result : u)

        // Aktuellen Benutzer aktualisieren falls es derselbe ist
        if (user.value?.id === result.id) {
          user.value = result
          setUser(result)
        }

        return { success: true, user: result }
      } else {
        return { success: false, error: 'Benutzer konnte nicht aktualisiert werden' }
      }
    } catch (err) {
      const errorMsg = err.message || 'Benutzer konnte nicht aktualisiert werden'
      handleError(errorMsg)
      return { success: false, error: errorMsg }
    } finally {
      loading.value = false
    }
  }

  /**
   * Benutzer löschen
   */
  const removeUser = async (id, options = {}) => {
    loading.value = true
    clearError()

    try {
      const result = await apiClient.remove(id, options)

      if (result.success) {
        // Aus der Liste entfernen
        users.value = users.value.filter(u => u.id !== Number(id))

        // Falls der aktuelle Benutzer gelöscht wurde
        if (user.value?.id === Number(id)) {
          user.value = null
          setUser(null)
        }

        return result
      } else {
        if (result.error) handleError(result.error)
        return result
      }
    } catch (err) {
      const errorMsg = err.message || 'Benutzer konnte nicht gelöscht werden'
      handleError(errorMsg)
      return { success: false, error: errorMsg }
    } finally {
      loading.value = false
    }
  }

  /**
   * Benutzerrolle abrufen
   */
  const getUserRole = async (options = {}) => {
    loading.value = true
    clearError()

    try {
      const result = await apiClient.getRole(options)
      role.value = result
      return result
    } catch (err) {
      const errorMsg = err.message || 'Benutzerrolle konnte nicht geladen werden'
      handleError(errorMsg)
      return null
    } finally {
      loading.value = false
    }
  }

  /**
   * Benutzerrolle setzen
   */
  const setUserRole = async (roleData = {}, options = {}) => {
    loading.value = true
    clearError()

    try {
      const result = await apiClient.setRole(roleData, options)

      if (result instanceof UserItem) {
        // Liste aktualisieren
        users.value = users.value.map(u => u.id === result.id ? result : u)

        // Aktuellen Benutzer aktualisieren falls es derselbe ist
        if (user.value?.id === result.id) {
          user.value = result
          setUser(result)
        }

        return { success: true, user: result }
      } else {
        if (!result.success && result.error) {
          handleError(result.error)
        }
        return result
      }
    } catch (err) {
      const errorMsg = err.message || 'Benutzerrolle konnte nicht gesetzt werden'
      handleError(errorMsg)
      return { success: false, error: errorMsg }
    } finally {
      loading.value = false
    }
  }

  /**
   * Passwort ändern
   */
  const changePassword = async (passwordData = {}, options = {}) => {
    loading.value = true
    clearError()

    try {
      const result = await apiClient.changePassword(passwordData, options)

      if (!result.success && result.error) {
        handleError(result.error)
      }

      return result
    } catch (err) {
      const errorMsg = err.message || 'Passwort konnte nicht geändert werden'
      handleError(errorMsg)
      return { success: false, error: errorMsg }
    } finally {
      loading.value = false
    }
  }

  /**
   * Token validieren
   */
  const validateToken = async (token = null, options = {}) => {
    const tokenToCheck = token || getToken()

    if (!tokenToCheck) {
      return { success: false, valid: false, error: 'Kein Token vorhanden' }
    }

    try {
      const result = await apiClient.checkToken(tokenToCheck, options)

      // Bei ungültigem Token lokalen Zustand zurücksetzen
      if (!result.valid) {
        clearToken()
        clearUser()
        user.value = null
        loginInfo.value = null
        role.value = null
      }

      return result
    } catch (err) {
      return { success: false, valid: false, error: err.message || 'Token-Validierung fehlgeschlagen' }
    }
  }

  /**
   * Prüft ob der Benutzer authentifiziert ist und lädt ggf. Benutzerdaten
   */
  const checkAuth = async () => {
    // Zuerst versuchen, Token aus dem Global State zu bekommen
    let token = getToken()

    // Wenn kein Token im Global State, versuche aus dem LocalStorage zu laden
    if (!token) {
      token = localStorage.getItem('auth_token')
      if (token) {
        setAuthToken(token)
      }
    }

    if (!token) {
      return { authenticated: false }
    }

    const tokenCheck = await validateToken(token)

    if (!tokenCheck.valid) {
      return { authenticated: false }
    }

    // Wenn Token gültig ist, versuche aktuellen Benutzer zu laden
    let currentUserData = await getCurrentUser()

    // Falls getCurrentUser fehlschlägt, versuche Benutzer aus LocalStorage zu laden
    if (!currentUserData) {
      const storedUser = localStorage.getItem('user')
      if (storedUser) {
        try {
          const parsedUser = JSON.parse(storedUser)
          currentUserData = new UserItem(parsedUser)
          user.value = currentUserData
          setUser(currentUserData)
        } catch (err) {
          console.error('Fehler beim Laden des Benutzers aus LocalStorage:', err)
        }
      }
    }

    return {
      authenticated: !!currentUserData,
      user: currentUserData
    }
  }

  // Return des Composables
  return {
    // API-Funktionen
    register,
    login,
    logout,
    getCurrentUser,
    getUser,
    getUserList,
    updateUser,
    removeUser,
    getUserRole,
    setUserRole,
    changePassword,
    validateToken,
    checkAuth,

    // Zustände
    loading: readonly(loading),
    error: readonly(error),
    user: readonly(user),
    users: readonly(users),
    role: readonly(role),
    loginInfo: readonly(loginInfo),

    // Computed Properties
    isAuthenticated,
    isLoading,
    hasError,
    currentUser,
    userList,
    userRole,

    // Utility-Funktionen
    clearError,
  }
}

// Default Export
export default useUser

// GlobalUser.js - Globale Benutzer-Verwaltung mit IndexedDB
import { ref, computed } from 'vue'
import indexedDBHelper, { STORES } from '@/utils/IndexedDBHelper.js'

const USER_KEY = 'wls_current_user'

// UserItem Klasse (aus der bestehenden API übernommen)
class UserItem {
  constructor({
    id,
    username,
    name,
    email,
    role,
    enabled,
    indent,
    last_login,
    last_logout,
    created_at,
    updated_at,
    logins_total,
    logins_failed,
    session_time
  } = {}) {
    this.id = typeof id === "string" ? parseInt(id, 10) : (Number.isFinite(id) ? id : 0)
    this.username = typeof username === "string" ? username : ""
    this.name = typeof name === "string" ? name : ""
    this.email = typeof email === "string" ? email : ""
    this.role = typeof role === "string" ? role : ""
    this.enabled = Boolean(enabled) // Explizit zu Boolean konvertieren
    this.indent = typeof indent === "string" ? indent : ""

    // Zusätzliche Felder aus der API
    this.last_login = last_login ? new Date(last_login) : null
    this.last_logout = last_logout ? new Date(last_logout) : null
    this.created_at = created_at ? new Date(created_at) : null
    this.updated_at = updated_at ? new Date(updated_at) : null
    this.logins_total = typeof logins_total === "string" ? parseInt(logins_total, 10) : (Number.isFinite(logins_total) ? logins_total : 0)
    this.logins_failed = typeof logins_failed === "string" ? parseInt(logins_failed, 10) : (Number.isFinite(logins_failed) ? logins_failed : 0)

    // Session-Zeit in Sekunden (Differenz zwischen aktueller Zeit und Erstellungszeit)
    this.session_time = typeof session_time === "string" ? parseInt(session_time, 10) : (Number.isFinite(session_time) ? session_time : 0)
  }

  // Getter für formatierte Datumsangaben
  get lastLoginFormatted() {
    return this.last_login ? this.last_login.toLocaleString('de-DE') : 'Nie'
  }

  get lastLogoutFormatted() {
    return this.last_logout ? this.last_logout.toLocaleString('de-DE') : 'Nie'
  }

  get createdAtFormatted() {
    return this.created_at ? this.created_at.toLocaleString('de-DE') : 'Unbekannt'
  }

  get updatedAtFormatted() {
    return this.updated_at ? this.updated_at.toLocaleString('de-DE') : 'Nie'
  }

  // Getter für Session-Zeit Formatierung
  get sessionTimeFormatted() {
    if (!this.session_time || this.session_time <= 0) return 'Keine Session'

    const seconds = this.session_time
    const minutes = Math.floor(seconds / 60)
    const hours = Math.floor(minutes / 60)
    const days = Math.floor(hours / 24)

    if (days > 0) {
      const remainingHours = hours % 24
      return `${days}d ${remainingHours}h`
    } else if (hours > 0) {
      const remainingMinutes = minutes % 60
      return `${hours}h ${remainingMinutes}m`
    } else if (minutes > 0) {
      const remainingSeconds = seconds % 60
      return `${minutes}m ${remainingSeconds}s`
    } else {
      return `${seconds}s`
    }
  }

  get sessionTimeInMinutes() {
    return Math.floor(this.session_time / 60)
  }

  get sessionTimeInHours() {
    return Math.floor(this.session_time / 3600)
  }

  // Getter für Statistiken
  get loginSuccess() {
    return Math.max(0, this.logins_total - this.logins_failed)
  }

  get loginSuccessRate() {
    if (this.logins_total === 0) return 0
    return ((this.loginSuccess / this.logins_total) * 100).toFixed(1)
  }

  // JSON-Serialisierung
  toJSON() {
    return {
      id: this.id,
      username: this.username,
      name: this.name,
      email: this.email,
      role: this.role,
      enabled: this.enabled,
      indent: this.indent,
      last_login: this.last_login,
      last_logout: this.last_logout,
      created_at: this.created_at,
      updated_at: this.updated_at,
      logins_total: this.logins_total,
      logins_failed: this.logins_failed,
      session_time: this.session_time
    }
  }
}

// Globaler User State
const currentUser = ref(null)
const userLoading = ref(false)
const userError = ref(null)

// Computed Properties
const isLoggedIn = computed(() => !!currentUser.value)
const userRole = computed(() => currentUser.value?.role || '')
const userName = computed(() => currentUser.value?.name || currentUser.value?.username || '')

// User setzen
const setUser = async (userData) => {
  if (userData) {
    currentUser.value = userData instanceof UserItem ? userData : new UserItem(userData)
    // Speichere User auch in IndexedDB für Offline-Zugriff
    try {
      await indexedDBHelper.set(STORES.USER, {
        key: USER_KEY,
        value: currentUser.value.toJSON()
      })
      console.log('💾 User in IndexedDB gespeichert:', currentUser.value.id)
    } catch (error) {
      console.error('❌ Fehler beim Speichern des Users in IndexedDB:', error)
    }
  } else {
    currentUser.value = null
    try {
      await indexedDBHelper.delete(STORES.USER, USER_KEY)
    } catch (error) {
      console.error('❌ Fehler beim Entfernen des Users aus IndexedDB:', error)
    }
  }
  userError.value = null
}

// User löschen
const clearUser = async () => {
  currentUser.value = null
  userError.value = null
  // Auch aus IndexedDB entfernen
  try {
    await indexedDBHelper.delete(STORES.USER, USER_KEY)
    console.log('🗑️ User aus IndexedDB entfernt')
  } catch (error) {
    console.error('❌ Fehler beim Entfernen des Users aus IndexedDB:', error)
  }
}

// Aktuellen User abrufen (mit IndexedDB-Fallback)
const getCurrentUser = async () => {
  // Wenn kein User im Memory, versuche aus IndexedDB zu laden
  if (!currentUser.value) {
    try {
      const result = await indexedDBHelper.get(STORES.USER, USER_KEY)
      if (result && result.value) {
        currentUser.value = new UserItem(result.value)
        console.log('📦 User aus IndexedDB geladen:', currentUser.value.id)
      }
    } catch (error) {
      console.error('❌ Fehler beim Laden des Users aus IndexedDB:', error)
    }
  }
  return currentUser.value
}

// User aus IndexedDB initialisieren (beim App-Start)
const initUserFromStorage = async () => {
  try {
    const result = await indexedDBHelper.get(STORES.USER, USER_KEY)
    if (result && result.value) {
      currentUser.value = new UserItem(result.value)
      console.log('🔄 User beim Start aus IndexedDB geladen:', currentUser.value.username)
      return true
    }
  } catch (error) {
    console.error('❌ Fehler beim Initialisieren des Users aus IndexedDB:', error)
  }
  return false
}

// Backward compatibility alias
const initUserFromLocalStorage = initUserFromStorage

// Session-Zeit des aktuellen Benutzers aktualisieren
const updateSessionTime = (sessionTime) => {
  if (currentUser.value && typeof sessionTime === 'number') {
    currentUser.value.session_time = sessionTime
    console.log(`🕒 Session-Zeit aktualisiert: ${sessionTime} Sekunden`)
  }
}

// User-Daten partiell aktualisieren (z.B. nach checkToken)
const updateUserData = (userData) => {
  if (currentUser.value && userData && typeof userData === 'object') {
    // Nur bestimmte Felder aktualisieren, um bestehende Daten nicht zu überschreiben
    if ('session_time' in userData) {
      currentUser.value.session_time = typeof userData.session_time === 'string'
        ? parseInt(userData.session_time, 10)
        : (Number.isFinite(userData.session_time) ? userData.session_time : 0)
    }

    // Weitere Felder können hier hinzugefügt werden
    if ('last_login' in userData && userData.last_login) {
      currentUser.value.last_login = new Date(userData.last_login)
    }

    if ('logins_total' in userData) {
      currentUser.value.logins_total = typeof userData.logins_total === 'string'
        ? parseInt(userData.logins_total, 10)
        : (Number.isFinite(userData.logins_total) ? userData.logins_total : 0)
    }

    console.log('👤 Benutzerdaten partiell aktualisiert:', userData)
  }
}

// Loading State setzen
const setUserLoading = (loading) => {
  userLoading.value = loading
}

// Error State setzen
const setUserError = (error) => {
  userError.value = error
}

// User Berechtigungen prüfen
const hasRole = (requiredRole) => {
  return currentUser.value?.role === requiredRole
}

// Hierarchische Rollenprüfung - Admin hat alle Rechte, Supervisor hat User-Rechte
const hasRoleOrHigher = (requiredRole) => {
  const role = currentUser.value?.role
  if (!role) return false

  const roleHierarchy = { 'user': 1, 'supervisor': 2, 'admin': 3 }
  const userLevel = roleHierarchy[role] || 0
  const requiredLevel = roleHierarchy[requiredRole] || 0

  return userLevel >= requiredLevel
}

const isSupervisor = computed(() => hasRole('supervisor'))
const isAdmin = computed(() => hasRole('admin'))
const isUser = computed(() => hasRole('user'))
const isEnabled = computed(() => currentUser.value?.enabled === true)

// Erweiterte Rollen-Prüfungen mit hierarchischer Logik
const canChangePassword = computed(() => {
  // Alle eingeloggten und aktivierten Benutzer können ihr Passwort ändern
  return !!currentUser.value && isEnabled.value
})

const canEditProfile = computed(() => {
  // Alle eingeloggten und aktivierten Benutzer können ihr Profil bearbeiten
  return !!currentUser.value && isEnabled.value
})

const canAccessDashboard = computed(() => {
  // Alle Rollen haben Dashboard-Zugriff
  return !!currentUser.value && isEnabled.value
})

const canAccessAdminArea = computed(() => {
  // Nur Supervisor und Admin haben Admin-Bereich Zugriff
  return (isAdmin.value || isSupervisor.value) && isEnabled.value
})

const canManageUsers = computed(() => {
  // Nur Admin kann Benutzer verwalten
  return isAdmin.value && isEnabled.value
})

const canViewReports = computed(() => {
  // Supervisor und Admin können Berichte einsehen
  return (isAdmin.value || isSupervisor.value) && isEnabled.value
})

const useChangePasswordMethod = computed(() => {
  // Admin und Supervisor verwenden changePassword (altes + neues Passwort)
  return isAdmin.value || isSupervisor.value
})

const useUpdateMethod = computed(() => {
  // Normale User verwenden update Methode
  return isUser.value
})

// User-Profil aktualisieren
const updateUserProfile = (updatedData) => {
  if (currentUser.value && updatedData) {
    // Merge mit bestehenden Daten
    const merged = {
      ...currentUser.value,
      ...updatedData,
      id: currentUser.value.id // ID darf nicht geändert werden
    }
    currentUser.value = new UserItem(merged)
  }
}

// User-Rolle aktualisieren
const updateUserRole = (newRole) => {
  if (currentUser.value) {
    updateUserProfile({ role: newRole })
  }
}

// Debug-Informationen
const getUserDebugInfo = () => {
  return {
    user: currentUser.value,
    role: userRole.value,
    permissions: {
      canChangePassword: canChangePassword.value,
      canEditProfile: canEditProfile.value,
      canAccessDashboard: canAccessDashboard.value,
      canAccessAdminArea: canAccessAdminArea.value,
      canManageUsers: canManageUsers.value,
      canViewReports: canViewReports.value,
      useChangePasswordMethod: useChangePasswordMethod.value,
      useUpdateMethod: useUpdateMethod.value,
      isAdmin: isAdmin.value,
      isSupervisor: isSupervisor.value,
      isUser: isUser.value,
      isEnabled: isEnabled.value
    }
  }
}

export {
  currentUser,
  userLoading,
  userError,
  isLoggedIn,
  userRole,
  userName,
  isSupervisor,
  isAdmin,
  isUser,
  isEnabled,
  canChangePassword,
  canEditProfile,
  canAccessDashboard,
  canAccessAdminArea,
  canManageUsers,
  canViewReports,
  useChangePasswordMethod,
  useUpdateMethod,
  setUser,
  clearUser,
  getCurrentUser,
  initUserFromLocalStorage,
  updateSessionTime,
  updateUserData,
  setUserLoading,
  setUserError,
  updateUserProfile,
  updateUserRole,
  hasRole,
  hasRoleOrHigher,
  getUserDebugInfo,
  UserItem
}

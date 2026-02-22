// useProfile.js - Composable für Profil-Management und Passwort-Änderung
import { ref, computed } from 'vue'
import { useUser } from './useUser.js'
import {
  currentUser,
  userRole,
  useChangePasswordMethod,
  useUpdateMethod,
  canChangePassword,
  canEditProfile,
  updateUserProfile,
  updateUserRole
} from '../stores/GlobalUser.js'
import { useOnlineStatusStore } from '../stores/OnlineStatus.js'

/**
 * Vue Composable für Profil-Management
 */
export function useProfile() {
  const {
    updateUser,
    changePassword: apiChangePassword,
    getUserRole,
    setUserRole,
    isLoading,
    error,
    clearError
  } = useUser()

  const onlineStatus = useOnlineStatusStore()

  const profileLoading = ref(false)
  const profileError = ref(null)
  const roleLoading = ref(false)
  const roleError = ref(null)

  // Computed Properties
  const canEdit = computed(() => canEditProfile.value)
  const canChangePass = computed(() => canChangePassword.value)
  const shouldUseChangePasswordAPI = computed(() => useChangePasswordMethod.value)
  const shouldUseUpdateAPI = computed(() => useUpdateMethod.value)

  /**
   * Profil-Daten aktualisieren
   */
  const updateProfile = async (profileData) => {
    if (!canEdit.value) {
      return { success: false, error: 'Keine Berechtigung zum Bearbeiten des Profils' }
    }

    profileLoading.value = true
    profileError.value = null

    try {
      const userId = currentUser.value?.id
      if (!userId) {
        throw new Error('Benutzer-ID nicht gefunden')
      }

      // Verwende update API-Methode
      const result = await updateUser(userId, profileData)

      if (result.success && result.user) {
        // Aktualisiere globalen User-State
        updateUserProfile(result.user)
        return { success: true, user: result.user }
      } else {
        profileError.value = result.error || 'Profil konnte nicht aktualisiert werden'
        return { success: false, error: profileError.value }
      }
    } catch (err) {
      profileError.value = err.message || 'Fehler beim Aktualisieren des Profils'
      return { success: false, error: profileError.value }
    } finally {
      profileLoading.value = false
    }
  }

  /**
   * Passwort ändern (rollen-basiert)
   */
  const changePassword = async (passwordData) => {
    if (!canChangePass.value) {
      return { success: false, error: 'Keine Berechtigung zum Ändern des Passworts' }
    }

    profileLoading.value = true
    profileError.value = null

    try {
      let result

      if (shouldUseChangePasswordAPI.value) {
        // Admin/Supervisor: Verwende changePassword API (oldPassword + newPassword)
        console.log('🔐 Admin/Supervisor: Verwende changePassword API')
        result = await apiChangePassword({
          oldPassword: passwordData.oldPassword,
          newPassword: passwordData.newPassword
        })
      } else {
        // Normale User: Verwende update API
        console.log('👤 User: Verwende update API für Passwort-Änderung')
        const userId = currentUser.value?.id
        if (!userId) {
          throw new Error('Benutzer-ID nicht gefunden')
        }

        result = await updateUser(userId, {
          password: passwordData.newPassword
        })
      }

      if (result.success) {
        return { success: true, message: 'Passwort erfolgreich geändert' }
      } else {
        profileError.value = result.error || 'Passwort konnte nicht geändert werden'
        return { success: false, error: profileError.value }
      }
    } catch (err) {
      profileError.value = err.message || 'Fehler beim Ändern des Passworts'
      return { success: false, error: profileError.value }
    } finally {
      profileLoading.value = false
    }
  }

  /**
   * Benutzer-Rolle abrufen
   */
  const fetchUserRole = async () => {
    // Offline-Modus: Rolle aus currentUser nehmen, kein API-Call
    if (!onlineStatus.isFullyOnline) {
      const offlineRole = currentUser.value?.role || 'user'
      console.log('📴 Offline-Modus: Verwende gespeicherte Rolle:', offlineRole)
      return { success: true, role: offlineRole, enabled: true }
    }

    roleLoading.value = true
    roleError.value = null

    try {
      const result = await getUserRole()
      if (result) {
        return { success: true, role: result.role, enabled: result.enabled }
      } else {
        roleError.value = 'Rolle konnte nicht abgerufen werden'
        return { success: false, error: roleError.value }
      }
    } catch (err) {
      roleError.value = err.message || 'Fehler beim Abrufen der Rolle'
      return { success: false, error: roleError.value }
    } finally {
      roleLoading.value = false
    }
  }

  /**
   * Benutzer-Rolle setzen (nur für Admins)
   */
  const changeUserRole = async (roleData) => {
    roleLoading.value = true
    roleError.value = null

    try {
      const result = await setUserRole(roleData)

      if (result.success && result.user) {
        // Aktualisiere globalen User-State
        updateUserRole(result.user.role)
        return { success: true, user: result.user }
      } else {
        roleError.value = result.error || 'Rolle konnte nicht geändert werden'
        return { success: false, error: roleError.value }
      }
    } catch (err) {
      roleError.value = err.message || 'Fehler beim Ändern der Rolle'
      return { success: false, error: roleError.value }
    } finally {
      roleLoading.value = false
    }
  }

  /**
   * Fehler zurücksetzen
   */
  const clearProfileError = () => {
    profileError.value = null
    clearError()
  }

  const clearRoleError = () => {
    roleError.value = null
  }

  /**
   * Validierung für Profil-Daten
   */
  const validateProfileData = (data) => {
    const errors = {}

    if (data.name && data.name.trim().length < 2) {
      errors.name = 'Name muss mindestens 2 Zeichen lang sein'
    }

    if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
      errors.email = 'Ungültige E-Mail-Adresse'
    }

    if (data.username && data.username.trim().length < 3) {
      errors.username = 'Benutzername muss mindestens 3 Zeichen lang sein'
    }

    return {
      isValid: Object.keys(errors).length === 0,
      errors
    }
  }

  /**
   * Validierung für Passwort-Änderung
   */
  const validatePasswordData = (data) => {
    const errors = {}

    if (shouldUseChangePasswordAPI.value && !data.oldPassword) {
      errors.oldPassword = 'Altes Passwort ist erforderlich'
    }

    if (!data.newPassword) {
      errors.newPassword = 'Neues Passwort ist erforderlich'
    } else if (data.newPassword.length < 6) {
      errors.newPassword = 'Neues Passwort muss mindestens 6 Zeichen lang sein'
    }

    if (data.confirmPassword && data.newPassword !== data.confirmPassword) {
      errors.confirmPassword = 'Passwörter stimmen nicht überein'
    }

    return {
      isValid: Object.keys(errors).length === 0,
      errors
    }
  }

  return {
    // State
    currentUser,
    userRole,
    profileLoading,
    profileError,
    roleLoading,
    roleError,
    isLoading,
    error,

    // Permissions
    canEdit,
    canChangePass,
    shouldUseChangePasswordAPI,
    shouldUseUpdateAPI,

    // Actions
    updateProfile,
    changePassword,
    fetchUserRole,
    changeUserRole,
    clearProfileError,
    clearRoleError,

    // Validation
    validateProfileData,
    validatePasswordData
  }
}

export default useProfile

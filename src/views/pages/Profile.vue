<template>
  <OnlineRequiredWrapper>
    <CRow style="padding-left: 9px;">
      <CCol :md="8">
        <!-- Profil bearbeiten -->
        <CCard class="mb-4">
          <CCardHeader>
            <h4>
              <CIcon icon="cil-user" class="me-2" />
              Profil bearbeiten
            </h4>
          </CCardHeader>
          <CCardBody>
            <!-- Profil Success Alert -->
            <CAlert
              v-if="profileSuccess"
              color="success"
              :visible="true"
              dismissible
              @close="profileSuccess = ''"
            >
              {{ profileSuccess }}
            </CAlert>

            <!-- Profil Error Alert -->
            <CAlert
              v-if="profileError"
              color="danger"
              :visible="true"
              dismissible
              @close="clearProfileError"
            >
              {{ profileError }}
            </CAlert>

            <CForm @submit.prevent="handleProfileUpdate">
              <CRow>
                <CCol :md="6">
                  <CFormInput
                    v-model="profileForm.username"
                    label="Benutzername"
                    placeholder="Benutzername eingeben"
                    :invalid="!!validationErrors.username"
                    :disabled="profileLoading"
                    readonly
                  />
                  <CFormFeedback :invalid="true">
                    {{ validationErrors.username }}
                  </CFormFeedback>
                </CCol>
                <CCol :md="6">
                  <CFormInput
                    v-model="profileForm.name"
                    label="Vollständiger Name"
                    placeholder="Name eingeben"
                    :invalid="!!validationErrors.name"
                    :disabled="profileLoading"
                  />
                  <CFormFeedback :invalid="true">
                    {{ validationErrors.name }}
                  </CFormFeedback>
                </CCol>
              </CRow>

              <CRow class="mt-3">
                <CCol :md="6">
                  <CFormInput
                    v-model="profileForm.email"
                    type="email"
                    label="E-Mail-Adresse"
                    placeholder="E-Mail eingeben"
                    :invalid="!!validationErrors.email"
                    :disabled="profileLoading"
                  />
                  <CFormFeedback :invalid="true">
                    {{ validationErrors.email }}
                  </CFormFeedback>
                </CCol>
                <CCol :md="6">
                  <CFormInput
                    v-model="profileForm.indent"
                    label="Identifikation"
                    placeholder="ID eingeben"
                    :disabled="profileLoading"
                    :readonly="!isAdmin"
                  />
                  <CFormText v-if="!isAdmin">
                    <small class="text-muted">Nur Administratoren können die Identifikation ändern</small>
                  </CFormText>
                </CCol>
              </CRow>

              <CRow class="mt-3">
                <CCol :md="6">
                  <CFormSelect
                    v-model="profileForm.role"
                    label="Benutzerrolle"
                    :disabled="profileLoading || !canChangeRole"
                    :invalid="!!validationErrors.role"
                  >
                    <option value="" disabled>Rolle auswählen</option>
                    <option
                      v-for="role in availableRoles"
                      :key="role.value"
                      :value="role.value"
                    >
                      {{ role.label }}
                    </option>
                  </CFormSelect>
                  <CFormFeedback :invalid="true">
                    {{ validationErrors.role }}
                  </CFormFeedback>
                  <CFormText>
                    <span v-if="!canChangeRole">
                      <small class="text-muted">
                        {{ getRoleChangePermissionText() }}
                      </small>
                    </span>
                    <span v-else>
                      Ihre aktuelle Rolle: <strong>{{ getRoleDisplayName(currentUser?.role) }}</strong>
                    </span>
                  </CFormText>
                </CCol>
                <CCol :md="6">
                  <div class="mb-3">
                    <CFormLabel>Status</CFormLabel>
                    <div>
                      <CBadge :color="currentUser?.enabled ? 'success' : 'danger'">
                        {{ currentUser?.enabled ? 'Aktiviert' : 'Deaktiviert' }}
                      </CBadge>
                    </div>
                  </div>
                </CCol>
              </CRow>

              <div class="d-grid gap-2 d-md-flex justify-content-md-end mt-4">
                <CButton
                  type="submit"
                  color="primary"
                  :disabled="!canEdit || profileLoading"
                >
                  <CSpinner
                    v-if="profileLoading"
                    size="sm"
                    class="me-2"
                  />
                  {{ profileLoading ? 'Speichern...' : 'Profil speichern' }}
                </CButton>
              </div>
            </CForm>
          </CCardBody>
        </CCard>

        <!-- Passwort ändern -->
        <CCard id="password">
          <CCardHeader>
            <h4>
              <CIcon icon="cil-lock-locked" class="me-2" />
              Passwort ändern
            </h4>
          </CCardHeader>
          <CCardBody>
            <!-- Password Success Alert -->
            <CAlert
              v-if="passwordSuccess"
              color="success"
              :visible="true"
              dismissible
              @close="passwordSuccess = ''"
            >
              {{ passwordSuccess }}
            </CAlert>

            <!-- Password Error Alert -->
            <CAlert
              v-if="profileError"
              color="danger"
              :visible="true"
              dismissible
              @close="clearProfileError"
            >
              {{ profileError }}
            </CAlert>

            <!-- Info über Passwort-Methode -->
            <CAlert
              color="info"
              :visible="true"
            >
              <strong>{{ shouldUseChangePasswordAPI ? 'Administrator/Supervisor' : 'Benutzer' }}:</strong>
              {{ shouldUseChangePasswordAPI
                ? 'Sie müssen Ihr aktuelles Passwort eingeben, um es zu ändern.'
                : 'Ihr Passwort wird über die Profil-Aktualisierung geändert.'
              }}
            </CAlert>

            <CForm @submit.prevent="handlePasswordChange">
              <!-- Altes Passwort (nur für Admin/Supervisor) -->
              <CRow v-if="shouldUseChangePasswordAPI">
                <CCol :md="12">
                  <CFormInput
                    v-model="passwordForm.oldPassword"
                    type="password"
                    label="Aktuelles Passwort"
                    placeholder="Aktuelles Passwort eingeben"
                    :invalid="!!passwordValidationErrors.oldPassword"
                    :disabled="profileLoading"
                    required
                  />
                  <CFormFeedback :invalid="true">
                    {{ passwordValidationErrors.oldPassword }}
                  </CFormFeedback>
                </CCol>
              </CRow>

              <CRow :class="shouldUseChangePasswordAPI ? 'mt-3' : ''">
                <CCol :md="6">
                  <CFormInput
                    v-model="passwordForm.newPassword"
                    type="password"
                    label="Neues Passwort"
                    placeholder="Neues Passwort eingeben"
                    :invalid="!!passwordValidationErrors.newPassword"
                    :disabled="profileLoading"
                    required
                  />
                  <CFormFeedback :invalid="true">
                    {{ passwordValidationErrors.newPassword }}
                  </CFormFeedback>
                </CCol>
                <CCol :md="6">
                  <CFormInput
                    v-model="passwordForm.confirmPassword"
                    type="password"
                    label="Passwort bestätigen"
                    placeholder="Neues Passwort wiederholen"
                    :invalid="!!passwordValidationErrors.confirmPassword"
                    :disabled="profileLoading"
                    required
                  />
                  <CFormFeedback :invalid="true">
                    {{ passwordValidationErrors.confirmPassword }}
                  </CFormFeedback>
                </CCol>
              </CRow>

              <div class="d-grid gap-2 d-md-flex justify-content-md-end mt-4">
                <CButton
                  type="button"
                  color="secondary"
                  variant="outline"
                  @click="resetPasswordForm"
                  :disabled="profileLoading"
                >
                  Zurücksetzen
                </CButton>
                <CButton
                  type="submit"
                  color="warning"
                  :disabled="!canChangePass || profileLoading"
                >
                  <CSpinner
                    v-if="profileLoading"
                    size="sm"
                    class="me-2"
                  />
                  {{ profileLoading ? 'Ändern...' : 'Passwort ändern' }}
                </CButton>
              </div>
            </CForm>
          </CCardBody>
        </CCard>
      </CCol>

      <!-- Sidebar mit Benutzer-Informationen -->
      <CCol :md="4">
        <CCard>
          <CCardHeader>
            <h5>
              <CIcon icon="cil-info" class="me-2" />
              Benutzer-Informationen
            </h5>
          </CCardHeader>
          <CCardBody>
            <div class="mb-3">
              <strong>ID:</strong> {{ currentUser?.id || 'N/A' }}
            </div>
            <div class="mb-3">
              <strong>Benutzername:</strong> {{ currentUser?.username || 'N/A' }}
            </div>
            <div class="mb-3">
              <strong>Rolle:</strong>
              <CBadge
                :color="getRoleColor(currentUser?.role)"
                class="ms-2"
              >
                {{ currentUser?.role || 'Unbekannt' }}
              </CBadge>
            </div>
            <div class="mb-3">
              <strong>Status:</strong>
              <CBadge
                :color="currentUser?.enabled ? 'success' : 'danger'"
                class="ms-2"
              >
                {{ currentUser?.enabled ? 'Aktiv' : 'Inaktiv' }}
              </CBadge>
            </div>
            <div class="mb-3">
              <strong>Berechtigungen:</strong>
              <ul class="list-unstyled mt-2">
                <li>
                  <CIcon
                    :icon="canEdit ? 'cil-check' : 'cil-x'"
                    :class="canEdit ? 'text-success' : 'text-danger'"
                    class="me-2"
                  />
                  Profil bearbeiten
                </li>
                <li>
                  <CIcon
                    :icon="canChangePass ? 'cil-check' : 'cil-x'"
                    :class="canChangePass ? 'text-success' : 'text-danger'"
                    class="me-2"
                  />
                  Passwort ändern
                </li>
              </ul>
            </div>

            <!-- Letzte Token-Prüfung -->
            <div class="mb-3">
              <strong>Letzte Token-Prüfung:</strong>
              <div>
                <CIcon icon="cil-clock" class="me-2" />
                {{ lastTokenCheckFormatted }}
              </div>
              <div class="small text-muted">
                {{ timeSinceLastCheck }}
              </div>
            </div>

            <!-- Debug-Button für Development -->
            <div v-if="isDev" class="mt-4">
              <CButton
                color="info"
                variant="outline"
                size="sm"
                @click="showDebugInfo"
              >
                Debug-Info
              </CButton>
            </div>
          </CCardBody>
        </CCard>
      </CCol>
    </CRow>
  </OnlineRequiredWrapper>
</template>

<script setup>
import { ref, reactive, computed, onMounted, watch } from 'vue'
import {
  CRow,
  CCol,
  CCard,
  CCardHeader,
  CCardBody,
  CForm,
  CFormInput,
  CFormLabel,
  CFormText,
  CFormFeedback,
  CButton,
  CAlert,
  CSpinner,
  CBadge,
  CFormSelect
} from '@coreui/vue'
import CIcon from '@coreui/icons-vue'
import OnlineRequiredWrapper from '@/components/OnlineRequiredWrapper.vue'
import { useProfile } from '../../api/useProfile.js'
import { getUserDebugInfo, setUser, currentUser as globalCurrentUser } from '../../stores/GlobalUser.js'
import { lastTokenCheck } from '../../stores/TokenManager.js'
import { ApiUser } from '../../api/ApiUser.js'

const {
  currentUser,
  userRole,
  profileLoading,
  profileError,
  canEdit,
  canChangePass,
  shouldUseChangePasswordAPI,
  updateProfile,
  changePassword,
  clearProfileError,
  validateProfileData,
  validatePasswordData
} = useProfile()

// API-Client für Daten-Reload
const apiUser = new ApiUser()
const loadingUserData = ref(false)
const userDataError = ref('')

// Form States
const profileForm = reactive({
  username: '',
  name: '',
  email: '',
  indent: ''
})

const passwordForm = reactive({
  oldPassword: '',
  newPassword: '',
  confirmPassword: ''
})

// Success Messages
const profileSuccess = ref('')
const passwordSuccess = ref('')

// Validation Errors
const validationErrors = ref({})
const passwordValidationErrors = ref({})

// Development Mode Check
const isDev = computed(() => import.meta.env.DEV)

// Admin-Berechtigung prüfen
const isAdmin = computed(() => {
  return currentUser.value?.role === 'admin'
})

// Supervisor-Berechtigung prüfen
const isSupervisor = computed(() => {
  return currentUser.value?.role === 'supervisor'
})

// Berechtigung zum Ändern von Rollen
const canChangeRole = computed(() => {
  return isAdmin.value || isSupervisor.value
})

// Verfügbare Rollen basierend auf Berechtigungen
const availableRoles = computed(() => {
  const roles = [
    { value: 'user', label: 'Benutzer' },
    { value: 'supervisor', label: 'Supervisor' },
    { value: 'admin', label: 'Administrator' }
  ]

  if (isAdmin.value) {
    // Admin kann alle Rollen setzen
    return roles
  } else if (isSupervisor.value) {
    // Supervisor kann nur Benutzer und Supervisor setzen
    return roles.filter(role => role.value !== 'admin')
  } else {
    // Normale Benutzer können keine Rollen ändern
    return []
  }
})

// Rolle-Anzeigename
const getRoleDisplayName = (role) => {
  switch (role) {
    case 'admin': return 'Administrator'
    case 'supervisor': return 'Supervisor'
    case 'user': return 'Benutzer'
    default: return 'Unbekannt'
  }
}

// Text für Rollenwechsel-Berechtigung
const getRoleChangePermissionText = () => {
  const userRole = currentUser.value?.role
  switch (userRole) {
    case 'user':
      return 'Nur Supervisoren und Administratoren können Rollen ändern'
    case 'supervisor':
      return 'Sie können Benutzer- und Supervisor-Rollen verwalten'
    case 'admin':
      return 'Sie können alle Rollen verwalten'
    default:
      return 'Keine Berechtigung zum Ändern von Rollen'
  }
}

// Computed für formatierte Token-Check-Zeit
const lastTokenCheckFormatted = computed(() => {
  if (!lastTokenCheck.value) {
    return 'Nie'
  }
  return lastTokenCheck.value.toLocaleString('de-DE', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
})

// Zeit seit letztem Token-Check berechnen
const timeSinceLastCheck = computed(() => {
  if (!lastTokenCheck.value) {
    return 'Nie'
  }

  const now = new Date()
  const diffMs = now.getTime() - lastTokenCheck.value.getTime()
  const diffMinutes = Math.floor(diffMs / 60000)
  const diffSeconds = Math.floor((diffMs % 60000) / 1000)

  if (diffMinutes > 0) {
    return `vor ${diffMinutes} Min ${diffSeconds} Sek`
  } else {
    return `vor ${diffSeconds} Sek`
  }
})

// Benutzerdaten laden wenn sie fehlen
const loadUserDataIfNeeded = async () => {
  // Prüfe ob Benutzerdaten vorhanden sind
  if (currentUser.value && currentUser.value.id) {
    console.log('👤 Benutzerdaten bereits vorhanden:', currentUser.value.username)
    loadProfileData() // Form mit vorhandenen Daten füllen
    return
  }

  console.log('🔄 Benutzerdaten fehlen auf Profil-Seite - lade über API nach...')
  loadingUserData.value = true
  userDataError.value = ''

  try {
    // Aktuelle Benutzerdaten über API laden
    const userData = await apiUser.getCurrentUser()

    if (userData && userData.id) {
      console.log('✅ Benutzerdaten erfolgreich für Profil-Seite geladen:', userData.username)

      // Benutzerdaten im globalen Store setzen
      setUser(userData)

      // Formular mit geladenen Daten füllen
      loadProfileData()

      // Optional: Toast-Benachrichtigung
      if (window.showToast) {
        window.showToast('Profildaten wurden geladen', 'success')
      }
    } else {
      console.warn('⚠️ Keine gültigen Benutzerdaten von API erhalten')
      userDataError.value = 'Benutzerdaten konnten nicht geladen werden'

      if (window.showToast) {
        window.showToast('Profildaten nicht verfügbar. Bitte laden Sie die Seite neu.', 'warning')
      }
    }
  } catch (error) {
    console.error('❌ Fehler beim Laden der Benutzerdaten auf Profil-Seite:', error)
    userDataError.value = `Fehler beim Laden: ${error.message || 'Unbekannter Fehler'}`

    if (window.showToast) {
      window.showToast('Fehler beim Laden der Profildaten', 'danger')
    }
  } finally {
    loadingUserData.value = false
  }
}

// Watcher für currentUser - laden wenn leer
watch(currentUser, (newUser) => {
  if (!newUser || !newUser.id) {
    console.log('👤 currentUser ist leer auf Profil-Seite - automatisches Nachladen...')
    loadUserDataIfNeeded()
  } else {
    // Wenn User-Daten vorhanden sind, Formular aktualisieren
    loadProfileData()
  }
}, { immediate: false })

// Profil-Formular mit aktuellen Daten füllen
const loadProfileData = () => {
  if (currentUser.value) {
    profileForm.username = currentUser.value.username || ''
    profileForm.name = currentUser.value.name || ''
    profileForm.email = currentUser.value.email || ''
    profileForm.indent = currentUser.value.indent || ''
    profileForm.role = currentUser.value.role || ''
    console.log('📝 Profil-Formular mit Benutzerdaten gefüllt')
  }
}

// Profil aktualisieren
const handleProfileUpdate = async () => {
  // Validierung
  const validation = validateProfileData(profileForm)
  validationErrors.value = validation.errors

  if (!validation.isValid) {
    return
  }

  // API-Call
  const result = await updateProfile({
    name: profileForm.name,
    email: profileForm.email,
    indent: profileForm.indent,
    role: profileForm.role
  })

  if (result.success) {
    profileSuccess.value = 'Profil erfolgreich aktualisiert!'
    // Aktualisiere Form mit neuen Daten
    loadProfileData()
  }
}

// Passwort ändern
const handlePasswordChange = async () => {
  // Validierung
  const validation = validatePasswordData(passwordForm)
  passwordValidationErrors.value = validation.errors

  if (!validation.isValid) {
    return
  }

  // API-Call
  const result = await changePassword({
    oldPassword: passwordForm.oldPassword,
    newPassword: passwordForm.newPassword,
    confirmPassword: passwordForm.confirmPassword
  })

  if (result.success) {
    passwordSuccess.value = result.message || 'Passwort erfolgreich geändert!'
    resetPasswordForm()
  }
}

// Passwort-Formular zurücksetzen
const resetPasswordForm = () => {
  passwordForm.oldPassword = ''
  passwordForm.newPassword = ''
  passwordForm.confirmPassword = ''
  passwordValidationErrors.value = {}
}

// Rollen-Farbe bestimmen
const getRoleColor = (role) => {
  switch (role) {
    case 'admin': return 'danger'
    case 'supervisor': return 'warning'
    case 'user': return 'primary'
    default: return 'secondary'
  }
}

// Debug-Informationen anzeigen
const showDebugInfo = () => {
  const debugInfo = getUserDebugInfo()
  console.log('👤 User Debug Info:', debugInfo)
}

// Lifecycle erweitern
onMounted(async () => {
  console.log('🔧 Profil-Bearbeitungsseite geladen')

  // Prüfe beim Mount ob Benutzerdaten vorhanden sind
  await loadUserDataIfNeeded()
})
</script>

<style scoped src="@/styles/views/Profile.css"></style>
